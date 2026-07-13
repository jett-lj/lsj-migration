#!/usr/bin/env node
/**
 * Multi-farm migration runner — LSJ-HUB system-DB edition.
 *
 * Reads the list of active farms from lsj_system.farms, then runs the
 * migration engine against each farm's PostgreSQL database sequentially.
 *
 * Usage:
 *   node migrate-all.js                     # migrate all farms
 *   node migrate-all.js --dry-run           # list farms, no migration
 *   node migrate-all.js --farm "Barmount"   # migrate a single named farm
 *
 * Required env vars (MSSQL source):
 *   MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE
 *
 * Required env vars (system DB — farm registry):
 *   SYSTEM_DATABASE_URL  e.g. postgres://USER:PASSWORD@localhost:5433/lsj_system
 *
 * Per-farm PG target databases use:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD  (from env)
 *   DB_NAME is set per-farm from farms.db_name
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Pool }          = require('pg');
const { connectMssql, closePools } = require('./connections');
const { runMigration }  = require('./runner');
const { getMigrationOptions } = require('./config');

// ── CLI args ─────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, farmFilter: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--farm' && argv[i + 1]) {
      args.farmFilter = argv[++i];
    }
  }
  return args;
}

// ── System DB: read farms ────────────────────────────

async function loadFarms(farmFilter) {
  const systemUrl = process.env.SYSTEM_DATABASE_URL;
  if (!systemUrl) {
    throw new Error('SYSTEM_DATABASE_URL env var is required');
  }

  const systemPool = new Pool({ connectionString: systemUrl, max: 1 });
  try {
    const result = await systemPool.query(
      'SELECT id, name, db_name FROM farms ORDER BY name'
    );
    let farms = result.rows;
    if (farmFilter) {
      const needle = farmFilter.toLowerCase();
      farms = farms.filter(f => f.name.toLowerCase() === needle);
      if (farms.length === 0) {
        throw new Error(`No farm found with name "${farmFilter}" in lsj_system.farms`);
      }
    }
    return farms;
  } finally {
    await systemPool.end().catch(() => {});
  }
}

// ── Per-farm PG pool ─────────────────────────────────
// We create a fresh Pool per farm rather than reusing connectPostgres()
// because that helper caches a single module-level singleton.

function makeFarmPool(dbName) {
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5433', 10),
    user:     process.env.DB_USER     || 'lsj_admin',
    password: process.env.DB_PASSWORD, // no plaintext fallback — set in .env (gitignored)
    database: dbName,
    max:      parseInt(process.env.PG_POOL_MAX || '10', 10),
  });
}

// ── Summary table ────────────────────────────────────

function printSummary(results) {
  const COL_FARM = 35;
  const COL_DB   = 35;

  console.log(`\n${'='.repeat(80)}`);
  console.log('  MIGRATION SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  console.log(
    'Farm'.padEnd(COL_FARM) +
    'Database'.padEnd(COL_DB) +
    'Status'.padEnd(8) +
    'Duration'
  );
  console.log('-'.repeat(80));

  for (const r of results) {
    const tag   = r.ok ? 'OK' : 'FAILED';
    const dur   = r.secs != null ? `${r.secs}s` : '-';
    const note  = r.ok ? '' : `  (${r.error})`;
    console.log(
      r.name.padEnd(COL_FARM) +
      r.db_name.padEnd(COL_DB) +
      tag.padEnd(8) +
      dur +
      note
    );
  }

  const ok      = results.filter(r => r.ok).length;
  const failed  = results.filter(r => !r.ok).length;
  console.log(
    `\nTotal: ${results.length}  |  OK: ${ok}  |  Failed: ${failed}`
  );
}

// ── Main ─────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  console.log('=== LSJ-HUB Multi-Farm Migration ===\n');

  // Load farm list from system DB
  const farms = await loadFarms(args.farmFilter);

  if (farms.length === 0) {
    console.log('No farms found in lsj_system.farms. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${farms.length} farm(s):\n`);
  for (const f of farms) {
    console.log(`  ${f.name.padEnd(35)} → PG: ${f.db_name}`);
  }

  if (args.dryRun) {
    console.log('\n--dry-run specified. No migration performed.');
    process.exit(0);
  }

  console.log('');

  // Connect once to MSSQL — shared across all farm runs
  let mssqlPool;
  try {
    mssqlPool = await connectMssql();
    console.log('[INFO] Connected to SQL Server.\n');
  } catch (err) {
    console.error('[FATAL] Cannot connect to SQL Server:', err.message);
    process.exit(1);
  }

  const migrationOpts = getMigrationOptions();
  const results       = [];

  for (let i = 0; i < farms.length; i++) {
    const farm = farms[i];
    const t0   = Date.now();

    console.log(`\n${'='.repeat(70)}`);
    console.log(`  [${i + 1}/${farms.length}]  ${farm.name}  →  ${farm.db_name}`);
    console.log(`${'='.repeat(70)}\n`);

    const pgPool = makeFarmPool(farm.db_name);
    try {
      await runMigration(mssqlPool, pgPool, migrationOpts);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n  [OK] ${farm.name} completed in ${secs}s`);
      results.push({ name: farm.name, db_name: farm.db_name, ok: true, secs });
    } catch (err) {
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.error(`\n  [FAIL] ${farm.name} failed after ${secs}s: ${err.message}`);
      results.push({ name: farm.name, db_name: farm.db_name, ok: false, secs, error: err.message });
    } finally {
      await pgPool.end().catch(() => {});
    }
  }

  // Always close the shared MSSQL pool
  await closePools().catch(() => {});

  printSummary(results);

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
