#!/usr/bin/env node
/**
 * Multi-database migration runner.
 *
 * Discovers all CATTLE* databases on the SQL Server, creates corresponding
 * PostgreSQL target databases, and runs the migration on each one sequentially.
 *
 * Usage:
 *   node migrate-all.js                  # migrate all discovered databases
 *   node migrate-all.js --dry-run        # preview only (no writes)
 *   node migrate-all.js --filter Barmount  # migrate only matching databases
 *   node migrate-all.js --list           # just list discovered databases, don't migrate
 *
 * Each source DB gets a PG database named after itself (lowercased, sanitised).
 * e.g. CATTLE → cattle, CATTLE_Feed → cattle_feed
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const sql           = require('mssql');
const { Pool }      = require('pg');
const { fork }      = require('child_process');
const path          = require('path');
const { getMssqlConfig } = require('./config');

// ── CLI args ────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, filter: null, listOnly: false, targetDb: null, extraArgs: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run')   args.dryRun = true;
    else if (a === '--list') args.listOnly = true;
    else if (a === '--filter' && argv[i + 1]) args.filter = argv[++i];
    else if (a === '--target-db' && argv[i + 1]) args.targetDb = argv[++i];
    else args.extraArgs.push(a);          // pass through to migrate.js
  }
  return args;
}

// ── Discover source databases ───────────────────────

async function discoverDatabases(filter) {
  const cfg = { ...getMssqlConfig(), database: 'master' };
  const pool = await new sql.ConnectionPool(cfg).connect();
  try {
    const r = await pool.request().query(
      "SELECT name FROM sys.databases " +
      "WHERE name NOT IN ('master','tempdb','model','msdb') " +
      "ORDER BY name"
    );
    let dbs = r.recordset.map(x => x.name);
    if (filter) {
      const pat = filter.toLowerCase();
      dbs = dbs.filter(d => d.toLowerCase().includes(pat));
    }
    return dbs;
  } finally {
    await pool.close();
  }
}

// ── Ensure PG database exists ───────────────────────

function pgDbName(mssqlName) {
  // Lowercase, replace non-alphanum with underscore, collapse multiples
  return mssqlName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function ensurePgDatabase(dbName) {
  // Connect to 'postgres' maintenance DB to create the target
  const adminPool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres',
  });
  try {
    const exists = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1', [dbName]
    );
    if (exists.rows.length === 0) {
      // CREATE DATABASE cannot run inside a transaction
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`  [+] Created PG database: ${dbName}`);
    } else {
      console.log(`  [=] PG database already exists: ${dbName}`);
    }
  } finally {
    await adminPool.end();
  }
}

// ── Run migration as child process ──────────────────

function runMigration(mssqlDb, pgDb, extraArgs, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const args = [...extraArgs, '--'];
    const env = {
      ...process.env,
      MSSQL_DATABASE: mssqlDb,
      DB_NAME:        pgDb,
      // Clear any connection string so individual vars take priority
      PG_CONNECTION_STRING: '',
      ...envOverrides,
    };
    const child = fork(path.join(__dirname, 'migrate.js'), args, {
      env,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`migrate.js exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// ── Main ────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  console.log('=== LSJ-HUB Multi-Database Migration ===\n');

  const dbs = await discoverDatabases(args.filter);
  console.log(`Discovered ${dbs.length} database(s):\n`);
  for (const db of dbs) {
    const target = args.targetDb || pgDbName(db);
    console.log(`  ${db}  →  PG: ${target}`);
  }
  if (args.targetDb) {
    console.log(`\n  [--target-db] All sources consolidate into: ${args.targetDb}`);
  }

  if (args.listOnly) {
    process.exit(0);
  }

  if (dbs.length === 0) {
    console.log('No databases match. Nothing to do.');
    process.exit(0);
  }

  console.log('');

  const results = [];
  const passthrough = [...args.extraArgs];
  if (args.dryRun) passthrough.push('--dry-run');

  // When --target-db is set, all source DBs consolidate into one PG database
  if (args.targetDb && !args.dryRun) {
    await ensurePgDatabase(args.targetDb);
  }

  for (let i = 0; i < dbs.length; i++) {
    const mssqlDb = dbs[i];
    const pgDb    = args.targetDb || pgDbName(mssqlDb);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  [${i + 1}/${dbs.length}] ${mssqlDb} → ${pgDb}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      if (!args.dryRun && !args.targetDb) {
        await ensurePgDatabase(pgDb);
      }

      // In --target-db mode: first DB truncates normally; subsequent DBs
      // must NOT truncate (would wipe data from prior sources) and should
      // skip FK restore (next source would need to drop them again anyway).
      const envOverrides = {};
      if (args.targetDb && i > 0) {
        envOverrides.SKIP_TRUNCATE = '1';
      }
      if (args.targetDb && i < dbs.length - 1) {
        envOverrides.SKIP_FK_RESTORE = '1';
      }

      await runMigration(mssqlDb, pgDb, passthrough, envOverrides);
      results.push({ db: mssqlDb, status: 'OK' });
      console.log(`\n  ✓ ${mssqlDb} completed successfully.`);
    } catch (err) {
      results.push({ db: mssqlDb, status: 'FAILED', error: err.message });
      console.error(`\n  ✗ ${mssqlDb} FAILED: ${err.message}`);
    }
  }

  // Final summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  FINAL SUMMARY');
  console.log(`${'═'.repeat(60)}\n`);
  console.log('Database'.padEnd(35) + 'Status');
  console.log('-'.repeat(50));
  for (const r of results) {
    console.log(r.db.padEnd(35) + r.status);
  }

  const failed = results.filter(r => r.status === 'FAILED');
  if (failed.length) {
    console.log(`\n${failed.length} database(s) FAILED.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} database(s) migrated successfully.`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
