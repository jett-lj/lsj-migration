#!/usr/bin/env node
/**
 * Web UI server for the LSJ Migration Tool.
 *
 * Provides a minimalist browser interface for running migrations,
 * with Server-Sent Events (SSE) for live progress streaming.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const { connectMssql, connectPostgres, closePools } = require('./connections');
const { runMigration, validateMigration, preFlightAudit, migrateRawTables, reconciliationReport, compareDatabases } = require('./runner');
const { getMssqlConfig, getMigrationOptions } = require('./config');
const { getCategorySummary } = require('./categories');

const app  = express();
const PORT = parseInt(process.env.UI_PORT || '3456', 10);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Read-only mode ──────────────────────────────────
// UI_READONLY=1 turns the dashboard into a pure monitor: every mutating
// endpoint (migrate, wipe, create-db, restore, abort, settings, …) returns
// 403 while SSE progress, status, logs and reports stay available.
const READONLY = ['1', 'true', 'yes'].includes(String(process.env.UI_READONLY || '').toLowerCase());

app.use((req, res, next) => {
  if (READONLY && req.method !== 'GET') {
    return res.status(403).json({ error: 'Dashboard is in read-only mode (UI_READONLY=1) — triggers are disabled.' });
  }
  next();
});

// ── State ───────────────────────────────────────────

let migrationRunning = false;
let migrationAbortRequested = false;
let sseClients = [];

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter(res => {
    try { res.write(msg); return true; }
    catch (_) { return false; }
  });
}

// ── SSE endpoint ────────────────────────────────────

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(':\n\n'); // keep-alive comment
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// ── Helpers ─────────────────────────────────────────

function pgConfig() {
  if (process.env.PG_CONNECTION_STRING) {
    return { connectionString: process.env.PG_CONNECTION_STRING };
  }
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'barmount',
  };
}

// Matches the v5 FK DO-block (idempotent DO $$ with _fks TEXT[][] array)
const FK_DO_BLOCK_RE = /DO \$\$\r?\nDECLARE\r?\n\s+_fk\b[\s\S]*?END\r?\n\$\$;/;

const ALL_SCHEMAS = [
  'breeding', 'carcase', 'cattle', 'commodity', 'contacts', 'digistar',
  'feed', 'finance', 'health', 'legacy', 'map', 'operations', 'pen', 'purchasing',
  'reporting', 'system', 'transport', 'weighing'
];

// ── Source-DB categorisation helpers ────────────────
// Legacy SQL Server farms ship as up to 3 companion DBs:
//   <Farm>            → main cattle DB        (category: cattle)
//   <Farm>_feed       → feed application data (category: cattle_feed)
//   <Farm>_Feedtrans  → feed transport data   (category: feed_transport)
// For the bare default deployment these are simply CATTLE / CATTLE_feed / CATTLE_Feedtrans.
function categorizeDb(name) {
  if (/_feedtrans$/i.test(name)) return 'feed_transport';
  if (/_feed$/i.test(name))      return 'cattle_feed';
  return 'cattle';
}
function farmPrefix(name) {
  return name.replace(/_feedtrans$/i, '').replace(/_feed$/i, '');
}
// runner.js looks up companion pools by these exact keys
function poolAlias(name) {
  if (/_feedtrans$/i.test(name)) return 'CATTLE_Feedtrans';
  if (/_feed$/i.test(name))      return 'CATTLE_feed';
  return 'CATTLE';
}

async function ensureSchema(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm-v5.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  // Strip FK DO-block — constraints are restored after data load by restoreForeignKeys()
  const schemaWithoutFks = schema.replace(FK_DO_BLOCK_RE, '-- [FK block deferred to post-load]');
  await pgPool.query(schemaWithoutFks);
}

async function dropAllForeignKeys(pgPool) {
  const schemaList = ALL_SCHEMAS.map(s => `'${s}'`).join(', ');
  const { rows } = await pgPool.query(`
    SELECT tc.table_schema, tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema IN (${schemaList})
    ORDER BY tc.table_schema, tc.table_name
  `);
  for (const { table_schema, table_name, constraint_name } of rows) {
    await pgPool.query(`ALTER TABLE "${table_schema}"."${table_name}" DROP CONSTRAINT IF EXISTS "${constraint_name}"`);
  }
  console.log(`[INFO] Dropped ${rows.length} FK constraints for clean data load.`);
}

/**
 * Restore FK constraints from the schema file using a per-FK
 * NOT VALID + VALIDATE pattern that tolerates legacy data variation
 * across farms (e.g. Barmount vs Rangers Valley).
 *
 * Strategy:
 *   1. Extract every FK ALTER from the FK DO-block in schema-farm-v5.sql
 *   2. Add each constraint with NOT VALID (skips existing-data check)
 *   3. For each constraint that exists, NULL-out orphan child column
 *      values (sentinel 0s, stale IDs from absent companion DBs, etc.)
 *   4. Run VALIDATE per-constraint — one failure does not block the rest
 *
 * Returns { added, validated, total, failures }.
 */
async function restoreForeignKeys(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm-v5.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Parse FK ALTER statements out of the DO-block(s)
  const fkBlocks = [...schema.matchAll(FK_DO_BLOCK_RE)];
  const fkStmts = [];
  for (const block of fkBlocks) {
    const re = /ARRAY\['([^']+)',\s*'(ALTER TABLE[^']+)'/g;
    let m;
    while ((m = re.exec(block[0])) !== null) {
      fkStmts.push({ name: m[1], sql: m[2] });
    }
  }
  if (fkStmts.length === 0) {
    console.warn('[WARN] No FK statements parsed from schema — skipping FK restore');
    return { added: 0, validated: 0, total: 0, failures: [] };
  }

  // 1) Add each FK as NOT VALID (idempotent: skip if already present)
  let added = 0;
  const addFailures = [];
  for (const { name, sql } of fkStmts) {
    const ex = await pgPool.query('SELECT 1 FROM pg_constraint WHERE conname=$1', [name]);
    if (ex.rowCount > 0) { added++; continue; }
    try {
      await pgPool.query(`${sql} NOT VALID`);
      added++;
    } catch (err) {
      addFailures.push({ name, error: err.message });
    }
  }
  console.log(`[INFO] FK constraints added (NOT VALID): ${added}/${fkStmts.length}`);
  for (const f of addFailures) console.warn(`[WARN] FK add failed: ${f.name} — ${f.error}`);

  // 2) Look up every NOT VALID FK with the metadata needed to NULL its orphans.
  //    Skip cleanup for NOT NULL columns (cannot NULL them safely) — those
  //    will simply fail validation and be reported.
  const { rows: notValidRows } = await pgPool.query(`
    SELECT
      con.conname                                AS name,
      ns.nspname                                 AS child_schema,
      cl.relname                                 AS child_table,
      att.attname                                AS child_col,
      att.attnotnull                             AS child_notnull,
      pns.nspname                                AS parent_schema,
      pcl.relname                                AS parent_table,
      patt.attname                               AS parent_col
    FROM pg_constraint con
    JOIN pg_class      cl  ON cl.oid  = con.conrelid
    JOIN pg_namespace  ns  ON ns.oid  = cl.relnamespace
    JOIN pg_attribute  att ON att.attrelid = cl.oid AND att.attnum  = con.conkey[1]
    JOIN pg_class      pcl ON pcl.oid = con.confrelid
    JOIN pg_namespace  pns ON pns.oid = pcl.relnamespace
    JOIN pg_attribute  patt ON patt.attrelid = pcl.oid AND patt.attnum = con.confkey[1]
    WHERE con.contype = 'f' AND NOT con.convalidated
      AND array_length(con.conkey, 1) = 1   -- only single-column FKs
  `);

  // 3) NULL orphan rows for each NOT VALID FK whose child col is nullable
  let cleaned = 0;
  for (const r of notValidRows) {
    if (r.child_notnull) continue;
    try {
      const upd = await pgPool.query(`
        UPDATE "${r.child_schema}"."${r.child_table}" ch
        SET "${r.child_col}" = NULL
        WHERE ch."${r.child_col}" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "${r.parent_schema}"."${r.parent_table}" p
            WHERE p."${r.parent_col}" = ch."${r.child_col}"
          )
      `);
      if (upd.rowCount > 0) {
        cleaned += upd.rowCount;
        console.log(`[INFO] Nulled ${upd.rowCount} orphan row(s) on ${r.child_schema}.${r.child_table}.${r.child_col} (FK ${r.name})`);
      }
    } catch (err) {
      console.warn(`[WARN] Orphan cleanup failed for ${r.name}: ${err.message}`);
    }
  }
  if (cleaned > 0) {
    console.log(`[INFO] Total orphan FK column values nulled: ${cleaned}`);
  }

  // 4) Validate each NOT VALID constraint individually
  const { rows: toValidate } = await pgPool.query(`
    SELECT conrelid::regclass::text AS table_name, conname AS constraint_name
    FROM pg_constraint WHERE contype='f' AND NOT convalidated
  `);
  let validated = 0;
  const valFailures = [];
  for (const { table_name, constraint_name } of toValidate) {
    try {
      await pgPool.query(`ALTER TABLE ${table_name} VALIDATE CONSTRAINT "${constraint_name}"`);
      validated++;
    } catch (err) {
      valFailures.push({ table: table_name, constraint: constraint_name, error: err.message });
    }
  }
  console.log(`[INFO] FK constraints validated: ${validated}/${toValidate.length}`);
  for (const f of valFailures) {
    console.warn(`[WARN] FK validation failed: ${f.table}.${f.constraint} — ${f.error}`);
  }

  // Final tally
  const { rows: tot } = await pgPool.query(`
    SELECT COUNT(*) FILTER (WHERE convalidated)     AS valid,
           COUNT(*) FILTER (WHERE NOT convalidated) AS not_valid,
           COUNT(*)                                 AS total
    FROM pg_constraint WHERE contype='f';
  `);
  console.log(`[INFO] FK constraints in place: ${tot[0].total} (valid: ${tot[0].valid}, not_valid: ${tot[0].not_valid})`);

  return {
    added,
    validated,
    total: fkStmts.length,
    failures: [...addFailures, ...valFailures.map(f => ({ name: f.constraint, error: f.error }))],
  };
}

/**
 * Hijack console.log/warn/error while migration runs
 * to also broadcast messages to SSE clients.
 */
function interceptConsole() {
  const origLog  = console.log;
  const origWarn = console.warn;
  const origErr  = console.error;

  console.log = (...args) => {
    origLog(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    // Parse progress from "[INFO]  [TableName] 5,000/10,000 (50%)"
    const pctMatch = msg.match(/\[(\w+)]\s+([\d,]+)\/([\d,]+)\s+\((\d+)%\)/);
    if (pctMatch) {
      broadcast('progress', {
        table: pctMatch[1],
        current: parseInt(pctMatch[2].replace(/,/g, '')),
        total: parseInt(pctMatch[3].replace(/,/g, '')),
        pct: parseInt(pctMatch[4]),
      });
    }
    // Parse "Migration starting" for table count
    const startMatch = msg.match(/Migration starting.*?(\d+) tables/);
    if (startMatch) {
      broadcast('table-count', { count: parseInt(startMatch[1]), phase: 'mapped' });
      broadcast('status', { step: `Migrating ${startMatch[1]} mapped tables...` });
    }
    // Parse "Raw migration" for table count
    const rawStartMatch = msg.match(/Raw migration:\s+(\d+) tables/);
    if (rawStartMatch) {
      broadcast('table-count', { count: parseInt(rawStartMatch[1]), phase: 'raw' });
    }
    // Parse per-table info
    const tableMatch = msg.match(/\[INFO]\s+(\w+):\s+([\d,]+)\s+rows to process/);
    if (tableMatch) {
      broadcast('table-start', {
        table: tableMatch[1],
        totalRows: parseInt(tableMatch[2].replace(/,/g, '')),
      });
    }
    // Parse done
    const doneMatch = msg.match(/Done:\s+(\d+)\s+written.*?(\d+)\s+skipped.*?(\d+)\s+errored/);
    if (doneMatch) {
      broadcast('table-done', {
        written: parseInt(doneMatch[1]),
        skipped: parseInt(doneMatch[2]),
        errored: parseInt(doneMatch[3]),
      });
    }
    // Parse structured skip reports — emitted by runner.reportSkip()
    const skipMatch = msg.match(/\[SKIP]\s+(\{.*\})/);
    if (skipMatch) {
      try { broadcast('skip-row', JSON.parse(skipMatch[1])); } catch (_) {}
    }
    const skipMoreMatch = msg.match(/\[SKIP_MORE]\s+(\{.*\})/);
    if (skipMoreMatch) {
      try { broadcast('skip-suppressed', JSON.parse(skipMoreMatch[1])); } catch (_) {}
    }
    broadcast('log', { level: 'info', message: msg });
  };
  console.warn = (...args) => {
    origWarn(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    broadcast('log', { level: 'warn', message: msg });
  };
  console.error = (...args) => {
    origErr(...args);
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    broadcast('log', { level: 'error', message: msg });
  };

  return () => {
    console.log  = origLog;
    console.warn = origWarn;
    console.error = origErr;
  };
}

// ── API Routes ──────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({ running: migrationRunning, readonly: READONLY });
});

app.get('/api/settings', (req, res) => {
  res.json({
    pg: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || '5432',
      user:     process.env.DB_USER     || '',
      password: process.env.DB_PASSWORD ? '••••••••' : '',
      database: process.env.DB_NAME     || 'barmount',
    },
    mssql: {
      host:     process.env.MSSQL_HOST     || '',
      port:     process.env.MSSQL_PORT     || '1433',
      user:     process.env.MSSQL_USER     || '',
      password: process.env.MSSQL_PASSWORD ? '••••••••' : '',
      database: process.env.MSSQL_DATABASE || 'CATTLE',
    },
    batchSize: process.env.MIGRATION_BATCH_SIZE || '500',
  });
});

app.post('/api/settings', (req, res) => {
  const { pg, mssql, batchSize } = req.body;
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  // Update process.env (runtime only)
  if (pg) {
    if (pg.host)     process.env.DB_HOST     = pg.host.trim();
    if (pg.port)     process.env.DB_PORT     = pg.port.trim();
    if (pg.user)     process.env.DB_USER     = pg.user.trim();
    if (pg.password && pg.password !== '••••••••') process.env.DB_PASSWORD = pg.password;
    if (pg.database) process.env.DB_NAME     = pg.database.trim().toLowerCase();
  }
  if (mssql) {
    if (mssql.host)     process.env.MSSQL_HOST     = mssql.host.trim();
    if (mssql.port)     process.env.MSSQL_PORT     = mssql.port.trim();
    if (mssql.user)     process.env.MSSQL_USER     = mssql.user.trim();
    if (mssql.password && mssql.password !== '••••••••') process.env.MSSQL_PASSWORD = mssql.password;
    if (mssql.database) process.env.MSSQL_DATABASE = mssql.database.trim();
  }
  if (batchSize) process.env.MIGRATION_BATCH_SIZE = batchSize;

  // Persist to .env file
  const envPath = path.join(__dirname, '.env');
  const lines = [
    `# ── Target PostgreSQL database ────────────────────────`,
    `DB_HOST=${process.env.DB_HOST || 'localhost'}`,
    `DB_PORT=${process.env.DB_PORT || '5432'}`,
    `DB_USER=${process.env.DB_USER || ''}`,
    `DB_PASSWORD=${process.env.DB_PASSWORD || ''}`,
    `DB_NAME=${process.env.DB_NAME || 'barmount'}`,
    ``,
    `# ── Legacy SQL Server (migration source) ─────────────`,
    `MSSQL_HOST=${process.env.MSSQL_HOST || ''}`,
    `MSSQL_PORT=${process.env.MSSQL_PORT || '1433'}`,
    `MSSQL_USER=${process.env.MSSQL_USER || ''}`,
    `MSSQL_PASSWORD="${process.env.MSSQL_PASSWORD || ''}"`,
    `MSSQL_DATABASE=${process.env.MSSQL_DATABASE || 'CATTLE'}`,
    ``,
    `# ── Migration options ────────────────────────────────`,
    `MIGRATION_BATCH_SIZE=${process.env.MIGRATION_BATCH_SIZE || '500'}`,
    `MIGRATION_LOG_LEVEL=${process.env.MIGRATION_LOG_LEVEL || 'info'}`,
    `PG_POOL_MAX=${process.env.PG_POOL_MAX || '10'}`,
    `MSSQL_POOL_MAX=${process.env.MSSQL_POOL_MAX || '10'}`,
  ];
  fs.writeFileSync(envPath, lines.join('\n') + '\n');

  res.json({ saved: true });
});

app.post('/api/test-connections', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  const results = { pg: null, mssql: null };

  // Test PG
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ ...pgConfig(), connectionTimeout: 5000, max: 1 });
    await pool.query('SELECT 1');
    await pool.end();
    results.pg = { ok: true };
  } catch (e) {
    results.pg = { ok: false, error: e.message };
  }

  // Test MSSQL
  try {
    const sql = require('mssql');
    const cfg = getMssqlConfig();
    cfg.options.connectionTimeout = 5000;
    const pool = await new sql.ConnectionPool(cfg).connect();
    await pool.request().query('SELECT 1');
    await pool.close();
    results.mssql = { ok: true };
  } catch (e) {
    results.mssql = { ok: false, error: e.message };
  }

  res.json(results);
});

app.post('/api/audit', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  try {
    const mssqlPool = await connectMssql();
    const report    = await preFlightAudit(mssqlPool);
    await closePools();
    res.json(report);
  } catch (e) {
    await closePools().catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/migrate', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration already running' });

  const { dryRun = false, databases = null, wipe = false } = req.body || {};
  broadcast('migration-start', { dryRun });
  broadcast('status', { step: dryRun ? 'Starting preview (dry-run)...' : 'Connecting...' });

  // Respond immediately — progress goes via SSE
  res.json({ started: true, dryRun });
  migrationRunning = true;
  migrationAbortRequested = false;

  const restore = interceptConsole();

  // ── Plan the run ──────────────────────────────────
  // If `databases` provided, group by farm prefix (each farm gets its own pass
  // with up to 3 companion DBs: CATTLE / CATTLE_feed / CATTLE_Feedtrans).
  // If not provided, fall back to legacy single-DB behaviour using
  // process.env.MSSQL_DATABASE.
  let farmPlan;
  if (Array.isArray(databases) && databases.length > 0) {
    const byFarm = new Map();
    for (const dbName of databases) {
      const farm = farmPrefix(dbName) || dbName;
      if (!byFarm.has(farm)) byFarm.set(farm, []);
      byFarm.get(farm).push(dbName);
    }
    farmPlan = [...byFarm.entries()].map(([farm, dbs]) => ({ farm, dbs }));
  } else {
    farmPlan = [{ farm: process.env.MSSQL_DATABASE || 'CATTLE', dbs: [process.env.MSSQL_DATABASE || 'CATTLE'] }];
  }

  const sql = require('mssql');

  try {
    const pgPool = connectPostgres(pgConfig());
    await pgPool.query('SELECT 1');
    broadcast('status', { step: 'Connected to PostgreSQL' });

    // Optional: full wipe before any migrations
    if (wipe && !dryRun) {
      console.log('[INFO] Wipe requested — dropping schemas before migration...');
      for (const s of ALL_SCHEMAS) {
        await pgPool.query(`DROP SCHEMA IF EXISTS "${s}" CASCADE`);
      }
      broadcast('status', { step: 'Target wiped — applying schema...' });
    }

    await ensureSchema(pgPool);
    broadcast('status', { step: 'Schema applied' });

    // Drop FK constraints once for the whole run
    if (!dryRun) {
      await dropAllForeignKeys(pgPool);
      broadcast('status', { step: 'FK constraints dropped for data load' });
    }

    const migOpts = getMigrationOptions();
    const opts = {
      batchSize: parseInt(req.body?.batchSize || migOpts.batchSize, 10),
      logLevel: migOpts.logLevel,
      dryRun,
    };

    const allMapped = [];
    const allRaw    = [];
    let fkRestored = false;

    try {
      // Iterate farms — each farm runs the full pipeline using its companion DBs
      for (let i = 0; i < farmPlan.length; i++) {
        if (migrationAbortRequested) {
          console.warn(`[WARN] Abort requested — stopping after ${i} farm(s)`);
          break;
        }
        const { farm, dbs } = farmPlan[i];
        console.log(`\n=== [${i + 1}/${farmPlan.length}] Farm: ${farm} (${dbs.join(', ')}) ===`);
        broadcast('farm-start', { index: i + 1, total: farmPlan.length, farm, dbs });
        broadcast('status', { step: `Migrating farm ${i + 1}/${farmPlan.length}: ${farm}` });

        // Build a pool map keyed by the runner's expected aliases
        const mssqlPools = {};
        const openedPools = [];
        const baseCfg = getMssqlConfig();
        for (const dbName of dbs) {
          try {
            const cfg = { ...baseCfg, database: dbName };
            const pool = await new sql.ConnectionPool(cfg).connect();
            mssqlPools[poolAlias(dbName)] = pool;
            openedPools.push(pool);
            console.log(`[INFO] Connected to ${dbName} (alias ${poolAlias(dbName)})`);
          } catch (err) {
            console.warn(`[WARN] Could not connect to ${dbName}: ${err.message}`);
          }
        }

        if (Object.keys(mssqlPools).length === 0) {
          console.warn(`[WARN] No source pools available for farm ${farm} — skipping`);
          continue;
        }

        // Mark this iteration so the runner doesn't truncate target tables on
        // 2nd+ farm passes (would wipe data loaded by prior farms).
        const prevSkipTrunc = process.env.SKIP_TRUNCATE;
        const prevMssqlDb   = process.env.MSSQL_DATABASE;
        if (i > 0) process.env.SKIP_TRUNCATE = '1';
        // Tell runner which alias is the "default" cattle pool
        process.env.MSSQL_DATABASE = mssqlPools['CATTLE'] ? 'CATTLE' : Object.keys(mssqlPools)[0];

        try {
          broadcast('status', { step: `[${farm}] Migrating mapped tables...` });
          const { results } = await runMigration(mssqlPools, pgPool, opts);
          allMapped.push(...results);

          broadcast('status', { step: `[${farm}] Migrating raw tables...` });
          const rawResults = await migrateRawTables(mssqlPools['CATTLE'] || Object.values(mssqlPools)[0], pgPool, {
            batchSize: opts.batchSize,
            logLevel: opts.logLevel,
            dryRun: opts.dryRun,
          });
          allRaw.push(...rawResults);
        } finally {
          // Restore env + close this farm's pools
          if (prevSkipTrunc === undefined) delete process.env.SKIP_TRUNCATE;
          else process.env.SKIP_TRUNCATE = prevSkipTrunc;
          if (prevMssqlDb === undefined) delete process.env.MSSQL_DATABASE;
          else process.env.MSSQL_DATABASE = prevMssqlDb;
          await Promise.all(openedPools.map(p => p.close().catch(() => {})));
        }
      }
    } finally {
      // Always attempt to restore FK constraints, even on partial failure.
      // This prevents the DB from being left in a "no FKs" state if a farm
      // load crashes mid-loop.
      if (!dryRun) {
        try {
          broadcast('status', { step: 'Restoring FK constraints...' });
          await restoreForeignKeys(pgPool);
          fkRestored = true;
        } catch (fkErr) {
          console.warn(`[WARN] FK restore failed in finally: ${fkErr.message}`);
        }
      }
    }

    // Validation — only meaningful for single-farm runs
    let checks = [];
    if (!dryRun && farmPlan.length === 1) {
      broadcast('status', { step: 'Validating...' });
      const cfg = { ...getMssqlConfig(), database: farmPlan[0].dbs[0] };
      const valPool = await new sql.ConnectionPool(cfg).connect();
      try {
        checks = await validateMigration(valPool, pgPool);
      } finally {
        await valPool.close().catch(() => {});
      }
    }

    broadcast('migration-complete', {
      mapped: allMapped,
      raw:    allRaw,
      checks,
      dryRun,
    });
    broadcast('status', { step: dryRun ? 'Preview complete' : 'Migration complete' });
  } catch (e) {
    broadcast('migration-error', { error: e.message });
    broadcast('status', { step: `Error: ${e.message}` });
  } finally {
    restore();
    await closePools().catch(() => {});
    migrationRunning = false;
    migrationAbortRequested = false;
  }
});

app.post('/api/abort', (req, res) => {
  if (!migrationRunning) return res.status(409).json({ error: 'No migration running' });
  migrationAbortRequested = true;
  broadcast('status', { step: 'Abort requested — finishing current farm…' });
  res.json({ aborting: true });
});

// ── List PostgreSQL databases ───────────────────────

app.get('/api/list-databases', async (req, res) => {
  const { Pool } = require('pg');
  const cfg = pgConfig();
  let maintCfg;
  if (cfg.connectionString) {
    try {
      const url = new URL(cfg.connectionString);
      url.pathname = '/postgres';
      maintCfg = { connectionString: url.toString(), max: 1 };
    } catch (_) {
      maintCfg = { ...cfg, database: 'postgres', max: 1 };
    }
  } else {
    maintCfg = { ...cfg, database: 'postgres', max: 1 };
  }
  const pool = new Pool(maintCfg);
  try {
    const result = await pool.query(
      `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
    );
    res.json({ databases: result.rows.map(r => r.datname) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

// ── Create PostgreSQL database ──────────────────────

app.post('/api/create-db', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  const { database } = req.body || {};

  // Validate: letters, digits, underscores only, must start with letter or underscore
  if (!database || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(database)) {
    return res.status(400).json({ error: 'Invalid database name. Use only letters, numbers, and underscores.' });
  }

  const { Pool } = require('pg');
  const cfg = pgConfig();

  // Build a config pointing at the 'postgres' maintenance database
  let maintCfg;
  if (cfg.connectionString) {
    try {
      const url = new URL(cfg.connectionString);
      url.pathname = '/postgres';
      maintCfg = { connectionString: url.toString(), max: 1 };
    } catch (_) {
      maintCfg = { ...cfg, database: 'postgres', max: 1 };
    }
  } else {
    maintCfg = { ...cfg, database: 'postgres', max: 1 };
  }

  const maintPool = new Pool(maintCfg);
  try {
    // Check if already exists
    const exists = await maintPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1', [database]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: `Database "${database}" already exists` });
    }
    // DDL cannot use parameterized values — name is validated by regex above
    await maintPool.query(`CREATE DATABASE "${database}"`);
    res.json({ created: true, database });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await maintPool.end().catch(() => {});
  }
});

// ── List source SQL Server databases (grouped) ──────

app.get('/api/list-source-databases', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });
  try {
    const sql = require('mssql');
    const cfg = { ...getMssqlConfig(), database: 'master' };
    cfg.options = { ...(cfg.options || {}), connectionTimeout: 5000 };
    const pool = await new sql.ConnectionPool(cfg).connect();
    try {
      const r = await pool.request().query(
        "SELECT name FROM sys.databases " +
        "WHERE name NOT IN ('master','tempdb','model','msdb') " +
        "ORDER BY name"
      );
      const groups = { cattle: [], cattle_feed: [], feed_transport: [] };
      for (const row of r.recordset) {
        const cat = categorizeDb(row.name);
        groups[cat].push({ name: row.name, farm: farmPrefix(row.name) });
      }
      res.json({ groups });
    } finally {
      await pool.close();
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Wipe target DB (DROP SCHEMA CASCADE + reapply) ──

app.post('/api/wipe', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  migrationRunning = true;
  res.json({ started: true });

  const restore = interceptConsole();

  try {
    const pgPool = connectPostgres(pgConfig());
    await pgPool.query('SELECT 1');
    broadcast('status', { step: 'Connected to PostgreSQL' });

    console.log(`[INFO] Dropping ${ALL_SCHEMAS.length} schemas with CASCADE...`);
    for (const s of ALL_SCHEMAS) {
      await pgPool.query(`DROP SCHEMA IF EXISTS "${s}" CASCADE`);
      console.log(`  [-] dropped schema ${s}`);
    }
    broadcast('status', { step: 'Schemas dropped — reapplying schema file...' });

    await ensureSchema(pgPool);
    console.log('[INFO] Schema reapplied (FK block deferred to next migration).');
    broadcast('status', { step: 'Wipe complete — target DB is fresh' });
    broadcast('wipe-complete', {});
  } catch (e) {
    broadcast('migration-error', { error: e.message });
    broadcast('status', { step: `Error: ${e.message}` });
  } finally {
    restore();
    await closePools().catch(() => {});
    migrationRunning = false;
  }
});

// ── Farms (multi-farm migration) ────────────────────
//
// Discovery: scans Cattle_databases/ for folders with .bak files.
// For each farm, exposes its slug (target PG db), .bak file inventory,
// whether the PG db exists, and the latest per-table migration_log summary.
//
// Triggers: /api/farm/restore and /api/farm/migrate-all spawn the existing
// CLI scripts (_restore_farm.js and _migrate_all_farms.js) as child processes
// and stream their stdout/stderr to the SSE channel as 'farm-log' events.

const { spawn: childSpawn } = require('child_process');

const FARMS_ROOT = path.join(__dirname, 'Cattle_databases');
const FARM_SKIP_FOLDERS = new Set(['RV_SQL_databases']);

// Mirrors slug rules in _migrate_all_farms.js / _create_farm_dbs.js — keep in sync.
function farmSlug(name) {
  let s = String(name).toLowerCase()
    .replace(/&/g, '_and_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (!/^[a-z_]/.test(s)) s = 'farm_' + s;
  if (s.length > 63) s = s.slice(0, 63).replace(/_+$/, '');
  return s;
}

function listFarms() {
  if (!fs.existsSync(FARMS_ROOT)) return [];
  return fs.readdirSync(FARMS_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !FARM_SKIP_FOLDERS.has(d.name))
    .map(d => {
      const dir = path.join(FARMS_ROOT, d.name);
      const baks = fs.readdirSync(dir).filter(f => /\.bak$/i.test(f)).sort();
      return { name: d.name, slug: farmSlug(d.name), baks };
    })
    .filter(f => f.baks.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function pgMaintenanceConfig() {
  const cfg = pgConfig();
  return cfg.connectionString
    ? (() => {
        const u = new URL(cfg.connectionString);
        u.pathname = '/postgres';
        return { connectionString: u.toString(), max: 1 };
      })()
    : { ...cfg, database: 'postgres', max: 1 };
}

let farmJob = null; // { type, farm, child, log:[] }

function streamChild(type, farm, cmd, args) {
  const child = childSpawn(cmd, args, {
    cwd: __dirname,
    env: {
      ...process.env,
      // Bump V8 heap so large farms (16M+ rows in parallel) don't OOM-crash
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=8192`.trim(),
    },
    // shell:false (default) — Windows path with spaces handled correctly
  });
  farmJob = { type, farm, child, log: [], startedAt: Date.now() };
  broadcast('farm-start', { type, farm });

  const onChunk = (stream) => (buf) => {
    const text = buf.toString();
    farmJob.log.push(text);
    if (farmJob.log.length > 2000) farmJob.log.splice(0, farmJob.log.length - 2000);
    broadcast('farm-log', { type, farm, stream, text });
  };
  child.stdout.on('data', onChunk('stdout'));
  child.stderr.on('data', onChunk('stderr'));

  child.on('close', (code) => {
    broadcast('farm-done', { type, farm, code, ms: Date.now() - farmJob.startedAt });
    farmJob = null;
  });
  child.on('error', (err) => {
    broadcast('farm-error', { type, farm, error: err.message });
    farmJob = null;
  });
}

app.get('/api/farms', async (req, res) => {
  try {
    const farms = listFarms();

    // Look up which PG databases exist (best-effort).
    const { Pool } = require('pg');
    const maintCfg = pgMaintenanceConfig();
    const pool = new Pool(maintCfg);
    let existing = new Set();
    try {
      const r = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
      existing = new Set(r.rows.map(x => x.datname));
    } finally {
      await pool.end().catch(() => {});
    }

    for (const f of farms) f.dbExists = existing.has(f.slug);

    // Best-effort: query each existing farm DB for migration_log summary.
    await Promise.all(farms.filter(f => f.dbExists).map(async (f) => {
      const fcfg = { ...pgConfig(), database: f.slug, max: 1, connectionTimeoutMillis: 3000 };
      delete fcfg.connectionString;
      const fpool = new Pool(fcfg);
      try {
        const r = await fpool.query(
          `WITH latest_per_table AS (
             SELECT DISTINCT ON (source_table)
                    source_table,
                    status,
                    completed_at
               FROM system.migration_log
              ORDER BY source_table, id DESC
           )
           SELECT COUNT(*) FILTER (WHERE status = 'completed') AS ok,
                  COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
                  COUNT(*) FILTER (WHERE status = 'running')   AS running,
                  MAX(completed_at)                            AS last_completed
             FROM latest_per_table`
        );
        const row = r.rows[0] || {};
        f.migration = {
          ok:           Number(row.ok || 0),
          failed:       Number(row.failed || 0),
          running:      Number(row.running || 0),
          lastCompleted: row.last_completed,
        };
      } catch (e) {
        f.migration = { error: e.message };
      } finally {
        await fpool.end().catch(() => {});
      }
    }));

    res.json({ farms, jobRunning: !!farmJob, currentJob: farmJob ? { type: farmJob.type, farm: farmJob.farm } : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/farm/create-missing-dbs', async (req, res) => {
  if (farmJob)          return res.status(409).json({ error: `Job already running: ${farmJob.type} ${farmJob.farm}` });
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  const { Pool } = require('pg');
  const pool = new Pool(pgMaintenanceConfig());
  try {
    const farms = listFarms();
    const allSlugs = farms.map(f => f.slug);
    const existingQ = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    const existing = new Set(existingQ.rows.map(r => r.datname));

    let created = 0;
    const failed = [];
    for (const slug of allSlugs) {
      if (existing.has(slug)) continue;
      try {
        await pool.query(`CREATE DATABASE "${slug}"`);
        created++;
      } catch (e) {
        failed.push({ db: slug, error: e.message });
      }
    }

    res.json({
      farms: farms.length,
      created,
      existed: allSlugs.length - created - failed.length,
      failed,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

app.post('/api/farm/clear-pg', async (req, res) => {
  if (farmJob)          return res.status(409).json({ error: `Job already running: ${farmJob.type} ${farmJob.farm}` });
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  const { Pool } = require('pg');
  const pool = new Pool(pgMaintenanceConfig());
  try {
    const farms = listFarms();
    const farmSlugs = farms.map(f => f.slug);
    const keep = new Set(['postgres', 'template0', 'template1', 'lsj_system']);

    const existingQ = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    const existing = new Set(existingQ.rows.map(r => r.datname));

    const dropped = [];
    const kept = [];
    const missing = [];
    const failed = [];

    for (const slug of farmSlugs) {
      if (keep.has(slug)) {
        kept.push(slug);
        continue;
      }
      if (!existing.has(slug)) {
        missing.push(slug);
        continue;
      }
      try {
        await pool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [slug]);
        await pool.query(`DROP DATABASE IF EXISTS "${slug}"`);
        dropped.push(slug);
      } catch (e) {
        failed.push({ db: slug, error: e.message });
      }
    }

    res.json({
      farms: farms.length,
      dropped,
      kept,
      missing,
      failed,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

app.get('/api/farm/migration-log', async (req, res) => {
  const db = String(req.query.db || '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(db)) {
    return res.status(400).json({ error: 'Invalid db name' });
  }
  const { Pool } = require('pg');
  const cfg = { ...pgConfig(), database: db, max: 1 };
  delete cfg.connectionString;
  const pool = new Pool(cfg);
  try {
    const r = await pool.query(
      `SELECT source_table,
              rows_read,
              rows_written,
              rows_skipped,
              rows_errored,
              started_at,
              completed_at AS finished_at
         FROM system.migration_log
        ORDER BY id DESC
        LIMIT 500`
    );
    res.json({ rows: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await pool.end().catch(() => {});
  }
});

app.post('/api/farm/restore', (req, res) => {
  if (farmJob)          return res.status(409).json({ error: `Job already running: ${farmJob.type} ${farmJob.farm}` });
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  const { farm } = req.body || {};
  if (!farm || typeof farm !== 'string') return res.status(400).json({ error: 'farm required' });

  const known = new Set(listFarms().map(f => f.name));
  if (!known.has(farm)) return res.status(404).json({ error: `Unknown farm: ${farm}` });

  streamChild('restore', farm, process.execPath, ['_restore_farm.js', farm]);
  res.json({ started: true, farm });
});

app.post('/api/farm/migrate-all', (req, res) => {
  if (farmJob)          return res.status(409).json({ error: `Job already running: ${farmJob.type} ${farmJob.farm}` });
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  const { resume, only, skip } = req.body || {};
  const args = ['_migrate_all_farms.js'];
  if (resume) args.push('--resume', String(resume));
  if (only)   args.push('--only',   String(only));
  if (Array.isArray(skip) && skip.length) args.push('--skip', skip.join(','));

  const label = resume ? `resume:${resume}` : (only || 'all');
  streamChild('migrate-all', label, process.execPath, args);
  res.json({ started: true, label });
});

app.post('/api/farm/abort', (req, res) => {
  if (!farmJob) return res.status(409).json({ error: 'No farm job running' });
  try { farmJob.child.kill(); } catch (_) {}
  res.json({ aborting: true });
});

// ── SPA fallback ────────────────────────────────────

app.post('/api/compare', async (req, res) => {
  if (migrationRunning) return res.status(409).json({ error: 'Migration is running' });

  migrationRunning = true;
  res.json({ started: true });

  const restore = interceptConsole();

  try {
    const mssqlPool = await connectMssql();
    const pgPool = connectPostgres(pgConfig());
    await pgPool.query('SELECT 1');

    broadcast('compare-start', {});
    broadcast('status', { step: 'Comparing databases...' });

    const results = await compareDatabases(mssqlPool, pgPool);

    broadcast('compare-complete', { results });
    broadcast('status', { step: 'Comparison complete' });
  } catch (e) {
    broadcast('compare-error', { error: e.message });
    broadcast('status', { step: `Error: ${e.message}` });
  } finally {
    restore();
    await closePools().catch(() => {});
    migrationRunning = false;
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ───────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Migration UI: http://localhost:${PORT}`);
});
