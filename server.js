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

// ── State ───────────────────────────────────────────

let migrationRunning = false;
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

async function ensureSchema(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pgPool.query(schema);
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
  res.json({ running: migrationRunning });
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

  const { dryRun = false } = req.body || {};
  broadcast('migration-start', { dryRun });
  broadcast('status', { step: dryRun ? 'Starting preview (dry-run)...' : 'Connecting...' });

  // Respond immediately — progress goes via SSE
  res.json({ started: true, dryRun });
  migrationRunning = true;

  const restore = interceptConsole();

  try {
    const mssqlPool = await connectMssql();
    broadcast('status', { step: 'Connected to SQL Server' });

    const pgPool = connectPostgres(pgConfig());
    await pgPool.query('SELECT 1');
    broadcast('status', { step: 'Connected to PostgreSQL' });

    await ensureSchema(pgPool);
    broadcast('status', { step: 'Schema applied' });

    const migOpts = getMigrationOptions();
    const opts = {
      batchSize: parseInt(req.body?.batchSize || migOpts.batchSize, 10),
      logLevel: migOpts.logLevel,
      dryRun,
    };

    // Mapped tables
    broadcast('status', { step: 'Migrating mapped tables...' });
    const { results } = await runMigration(mssqlPool, pgPool, opts);

    // Raw tables
    broadcast('status', { step: 'Migrating raw tables...' });
    const rawResults = await migrateRawTables(mssqlPool, pgPool, {
      batchSize: opts.batchSize,
      logLevel: opts.logLevel,
      dryRun: opts.dryRun,
    });

    // Validation
    let checks = [];
    if (!dryRun) {
      broadcast('status', { step: 'Validating...' });
      checks = await validateMigration(mssqlPool, pgPool);
    }

    broadcast('migration-complete', {
      mapped: results,
      raw: rawResults,
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
  }
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
