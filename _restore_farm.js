/**
 * Restore a farm's .bak files into SQL Server as CATTLE / CATTLE_feed / CATTLE_Feedtrans.
 *
 * Uses sqlcmd -E (Windows authentication = sysadmin) for all DDL.
 * After restoring, repairs the orphaned `lsj_migrate` user mapping in each
 * restored database and grants db_datareader so the migration tool can read it.
 *
 * Usage:
 *   node _restore_farm.js "Barmount"
 *   node _restore_farm.js "Anna Plains Feedlot"
 *   node _restore_farm.js --list                # show available farms + their .bak files
 *
 * Env vars (optional):
 *   MSSQL_SERVER       SQL Server target for sqlcmd, default '.\SQLEXPRESS'
 *   MSSQL_USER_LOGIN   SQL login to attach to restored DBs, default 'lsj_migrate'
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, 'Cattle_databases');
const SERVER = process.env.MSSQL_SERVER || '.\\SQLEXPRESS';
const APP_LOGIN = process.env.MSSQL_USER_LOGIN || 'lsj_migrate';

function listFarms() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'RV_SQL_databases')
    .map(d => d.name)
    .sort();
}

function findBaks(farmDir) {
  const files = fs.readdirSync(farmDir).filter(f => /\.bak$/i.test(f));
  const out = { CATTLE: null, CATTLE_feed: null, CATTLE_Feedtrans: null };
  for (const f of files) {
    if (/^CATTLE_Feedtrans/i.test(f))      out.CATTLE_Feedtrans = path.join(farmDir, f);
    else if (/^CATTLE_feed/i.test(f))      out.CATTLE_feed      = path.join(farmDir, f);
    else if (/^CATTLE[-._]/i.test(f) || /^CATTLE\.bak$/i.test(f)) out.CATTLE = path.join(farmDir, f);
  }
  return out;
}

/** Run a query via sqlcmd -E. Returns { stdout, stderr, code }. */
function runSqlcmd(query, extraArgs = []) {
  const args = ['-S', SERVER, '-E', '-b', '-h', '-1', '-W', ...extraArgs, '-Q', query];
  const r = spawnSync('sqlcmd', args, { encoding: 'utf8' });
  return { stdout: r.stdout || '', stderr: r.stderr || '', code: r.status };
}

function expectOk(label, res) {
  if (res.code !== 0) {
    throw new Error(`${label} failed (exit ${res.code}):\n${res.stdout}\n${res.stderr}`);
  }
}

function getDefaultPaths() {
  const res = runSqlcmd(
    "SET NOCOUNT ON; " +
    "SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(512)) + '|' + " +
    "CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS NVARCHAR(512))"
  );
  expectOk('Get default paths', res);
  const line = res.stdout.split(/\r?\n/).map(s => s.trim()).find(s => s.includes('|'));
  if (!line) throw new Error(`Could not parse paths from sqlcmd output:\n${res.stdout}`);
  const [dataPath, logPath] = line.split('|');
  return { dataPath, logPath };
}

function dbExists(dbName) {
  const res = runSqlcmd(
    `SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = '${dbName.replace(/'/g, "''")}'`
  );
  expectOk(`Check if ${dbName} exists`, res);
  return /[1-9]/.test(res.stdout);
}

function dropDb(dbName) {
  const q = `IF DB_ID('${dbName}') IS NOT NULL BEGIN ` +
            `ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; ` +
            `DROP DATABASE [${dbName}]; END`;
  expectOk(`Drop ${dbName}`, runSqlcmd(q));
}

function fileListOnly(bakPath) {
  const res = runSqlcmd(
    `SET NOCOUNT ON; RESTORE FILELISTONLY FROM DISK = N'${bakPath.replace(/'/g, "''")}'`,
    ['-s', '|']
  );
  expectOk(`FILELISTONLY ${path.basename(bakPath)}`, res);
  // Headers are suppressed by '-h -1', so use known FILELISTONLY column order:
  //   0:LogicalName  1:PhysicalName  2:Type  3:FileGroup  ...
  const lines = res.stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  for (const ln of lines) {
    if (/affected/i.test(ln)) continue;
    const parts = ln.split('|');
    if (parts.length < 3) continue;
    rows.push({ logical: parts[0], type: parts[2] });
  }
  if (rows.length === 0) throw new Error(`Parsed 0 file rows from FILELISTONLY:\n${res.stdout}`);
  return rows;
}

function restoreBak(bakPath, targetDb, dataPath, logPath) {
  const files = fileListOnly(bakPath);
  const moves = files.map(f => {
    const isLog  = (f.type || '').toUpperCase() === 'L';
    const ext    = isLog ? '.ldf' : '.mdf';
    const dir    = isLog ? logPath : dataPath;
    const safe   = f.logical.replace(/[^A-Za-z0-9_]/g, '_');
    const phys   = path.join(dir, `${targetDb}_${safe}${ext}`);
    return `MOVE N'${f.logical.replace(/'/g, "''")}' TO N'${phys.replace(/'/g, "''")}'`;
  }).join(', ');

  const q = `RESTORE DATABASE [${targetDb}] FROM DISK = N'${bakPath.replace(/'/g, "''")}' ` +
            `WITH ${moves}, REPLACE, RECOVERY, STATS = 10`;
  // Restores can take a while — bump query timeout to 30 minutes
  const res = runSqlcmd(q, ['-t', '1800']);
  expectOk(`RESTORE ${targetDb}`, res);
}

/**
 * After RESTORE, the database user `lsj_migrate` is orphaned (its SID inside
 * the restored DB doesn't match the server login of the same name).
 * This re-syncs the mapping and ensures read access.
 */
function repairAppLogin(dbName) {
  const q = `
    USE [${dbName}];
    IF DATABASE_PRINCIPAL_ID('${APP_LOGIN}') IS NULL
      CREATE USER [${APP_LOGIN}] FOR LOGIN [${APP_LOGIN}];
    ELSE
      ALTER USER [${APP_LOGIN}] WITH LOGIN = [${APP_LOGIN}];
    EXEC sp_addrolemember 'db_datareader', '${APP_LOGIN}';
  `;
  expectOk(`Repair ${APP_LOGIN} mapping in ${dbName}`, runSqlcmd(q));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list') || args.length === 0) {
    console.log('Available farm folders:\n');
    for (const farm of listFarms()) {
      const baks = findBaks(path.join(ROOT, farm));
      const have = ['CATTLE', 'CATTLE_feed', 'CATTLE_Feedtrans']
        .filter(k => baks[k]).join(', ') || '(no .bak files)';
      console.log(`  ${farm.padEnd(35)} → ${have}`);
    }
    if (args.length === 0) {
      console.log('\nUsage: node _restore_farm.js "<Farm Name>"');
    }
    return;
  }

  const farmName = args.join(' ').trim();
  const farmDir  = path.join(ROOT, farmName);
  if (!fs.existsSync(farmDir)) {
    console.error(`[ERROR] Folder not found: ${farmDir}`);
    process.exit(1);
  }

  const baks = findBaks(farmDir);
  const present = Object.entries(baks).filter(([, p]) => p);
  if (present.length === 0) {
    console.error(`[ERROR] No .bak files in ${farmDir}`);
    process.exit(1);
  }

  console.log(`Farm: ${farmName}`);
  console.log(`Server: ${SERVER}  (Windows auth)`);
  console.log('Backups found:');
  for (const [k, v] of present) {
    const sizeMb = (fs.statSync(v).size / 1024 / 1024).toFixed(1);
    console.log(`  ${k.padEnd(20)} ${path.basename(v)} (${sizeMb} MB)`);
  }
  const missing = Object.entries(baks).filter(([, p]) => !p).map(([k]) => k);
  if (missing.length > 0) {
    console.log(`Companion DBs without .bak (will be dropped if present): ${missing.join(', ')}`);
  }
  console.log('');

  const { dataPath, logPath } = getDefaultPaths();
  console.log(`Default data path: ${dataPath}`);
  console.log(`Default log path:  ${logPath}\n`);

  for (const [target, bakPath] of present) {
    console.log(`→ Restoring ${target} from ${path.basename(bakPath)}...`);
    const t0 = Date.now();
    if (dbExists(target)) {
      console.log(`  Dropping existing ${target}...`);
      dropDb(target);
    }
    restoreBak(bakPath, target, dataPath, logPath);
    repairAppLogin(target);
    console.log(`  [OK] ${target} restored + ${APP_LOGIN} mapped in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  }

  for (const target of missing) {
    if (dbExists(target)) {
      console.log(`→ Dropping stale ${target} (no .bak in this farm)...`);
      dropDb(target);
      console.log(`  [OK] ${target} dropped\n`);
    }
  }

  console.log('Restored databases now present:');
  const res = runSqlcmd(
    `SET NOCOUNT ON; SELECT name FROM sys.databases ` +
    `WHERE name IN ('CATTLE','CATTLE_feed','CATTLE_Feedtrans') ORDER BY name`
  );
  expectOk('List final DBs', res);
  for (const ln of res.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    if (/affected/i.test(ln)) continue;
    console.log(`  ${ln}`);
  }
}

try {
  main();
} catch (err) {
  console.error('FATAL:', err.message);
  process.exit(1);
}
