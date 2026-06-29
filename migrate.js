#!/usr/bin/env node
/**
 * CLI entry point for the legacy CATTLE → PostgreSQL migration.
 *
 * Usage:
 *   node migrate.js                 # full migration (mapped + raw tables)
 *   node migrate.js --dry-run       # preview only (no writes)
 *   node migrate.js --tables Breeds,Cattle   # migrate specific mapped tables
 *   node migrate.js --validate      # run post-migration validation only
 *   node migrate.js --audit         # pre-flight source audit (row counts + coverage)
 *   node migrate.js --reconcile     # per-farm reconciliation report
 *   node migrate.js --reconcile --farm MyrtlevaleFarm   # reconcile named farm
 *   node migrate.js --reconcile --output report.json   # write JSON report to file
 *   node migrate.js --batch-size 1000
 *
 * Required env vars:
 *   MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD
 *   PG_CONNECTION_STRING  (or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { connectMssql, connectPostgres, closePools } = require('./connections');
const { runMigration, validateMigration, validateMappings, preFlightAudit, migrateRawTables, reconciliationReport, reconcileFarm } = require('./runner');
const { getMssqlConfig, getMigrationOptions } = require('./config');
const { getCategorySummary } = require('./categories');
const sql  = require('mssql');
const fs   = require('fs');
const path = require('path');

// ── Parse CLI args ──────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, tables: null, validateOnly: false, auditOnly: false, reconcileOnly: false, checkMappings: false, batchSize: null, farm: null, output: null };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run')       args.dryRun = true;
    else if (arg === '--validate') args.validateOnly = true;
    else if (arg === '--audit')    args.auditOnly = true;
    else if (arg === '--reconcile') args.reconcileOnly = true;
    else if (arg === '--check-mappings') args.checkMappings = true;
    else if (arg === '--tables' && argv[i + 1]) {
      args.tables = argv[++i].split(',').map(s => s.trim());
    }
    else if (arg === '--batch-size' && argv[i + 1]) {
      args.batchSize = parseInt(argv[++i], 10);
    }
    else if (arg === '--farm' && argv[i + 1]) {
      args.farm = argv[++i];
    }
    else if (arg === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    }
  }

  return args;
}

// ── PostgreSQL connection config from env ───────────

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

// ── Apply schema before migration ───────────────────

// Matches v5 DO $$ FK blocks (containing _fk DECLARE) and any standalone FK ALTERs
const FK_DO_BLOCK = /DO \$\$\s*DECLARE\s+_fk\b[\s\S]*?\$\$;/g;
const FK_INLINE   = /ALTER TABLE \S+ ADD CONSTRAINT (fk_\S+)\s+FOREIGN KEY \([^)]+\) REFERENCES [^;]+;/g;

async function ensureSchema(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm-v6.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  // Strip FK constraint blocks — they are restored after data load by restoreForeignKeys()
  const schemaWithoutFks = schema.replace(FK_DO_BLOCK, '').replace(FK_INLINE, '');
  await pgPool.query(schemaWithoutFks);
  console.log('[INFO] PostgreSQL v5 schema applied (FKs deferred).');

  // Fix stale column types from older schema versions (v3/v4 created some TEXT cols as INT)
  await fixColumnTypes(pgPool);
}

/**
 * Detect columns whose live type doesn't match the v5 schema definition and fix them.
 * Old (v3/v4) schema created many TEXT/VARCHAR columns as INTEGER. CREATE TABLE IF NOT EXISTS
 * doesn't modify existing columns, so we fix them with ALTER COLUMN TYPE.
 */
async function fixColumnTypes(pgPool) {
  // Parse expected TEXT/VARCHAR columns from CREATE TABLE blocks in schema
  const schemaPath = path.join(__dirname, 'schema-farm-v6.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Extract columns defined as TEXT or VARCHAR in CREATE TABLE statements
  const expectedText = new Map(); // "schema.table.column" → "TEXT" | "VARCHAR(n)"
  const createRe = /CREATE TABLE IF NOT EXISTS (\S+)\s*\(([\s\S]*?)\)\s*(?:PARTITION|;)/g;
  let cm;
  while ((cm = createRe.exec(schemaSql)) !== null) {
    const tableFull = cm[1];
    const body = cm[2];
    const colRe = /^\s+(\w+)\s+(TEXT|VARCHAR\(\d+\))/gmi;
    let cc;
    while ((cc = colRe.exec(body)) !== null) {
      expectedText.set(`${tableFull}.${cc[1]}`.toLowerCase(), cc[2]);
    }
  }

  // Also parse ALTER TABLE ADD COLUMN IF NOT EXISTS ... TEXT|VARCHAR
  const alterRe = /ALTER TABLE (\S+) ADD COLUMN IF NOT EXISTS (\w+)\s+(TEXT|VARCHAR\(\d+\))/gi;
  while ((cm = alterRe.exec(schemaSql)) !== null) {
    expectedText.set(`${cm[1]}.${cm[2]}`.toLowerCase(), cm[3]);
  }

  // Query live columns that are integer but should be text
  const { rows: intCols } = await pgPool.query(`
    SELECT table_schema, table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema','legacy','system')
      AND udt_name IN ('int2','int4','int8')
  `);

  const toFix = intCols.filter(r =>
    expectedText.has(`${r.table_schema}.${r.table_name}.${r.column_name}`.toLowerCase())
  );

  if (toFix.length === 0) return;

  console.log(`[INFO] Fixing ${toFix.length} stale column types (old schema → v5 TEXT)...`);

  // Drop legacy views that may depend on the columns
  const { rows: views } = await pgPool.query(
    `SELECT schemaname, viewname, definition FROM pg_views WHERE schemaname = 'legacy' ORDER BY viewname`
  );
  for (const v of views) {
    await pgPool.query(`DROP VIEW IF EXISTS ${v.schemaname}.${v.viewname}`);
  }

  // Fix each column
  for (const r of toFix) {
    const table = `${r.table_schema}.${r.table_name}`;
    const targetType = expectedText.get(`${table}.${r.column_name}`.toLowerCase());
    try {
      await pgPool.query(`ALTER TABLE ${table} ALTER COLUMN ${r.column_name} TYPE ${targetType} USING ${r.column_name}::TEXT`);
    } catch (err) {
      console.warn(`[WARN] Could not fix ${table}.${r.column_name}: ${err.message}`);
    }
  }

  // Recreate legacy views
  for (const v of views) {
    try {
      await pgPool.query(`CREATE VIEW ${v.schemaname}.${v.viewname} AS ${v.definition}`);
    } catch (err) {
      console.warn(`[WARN] Could not recreate view ${v.schemaname}.${v.viewname}: ${err.message}`);
    }
  }
  console.log(`[INFO] Column type fixes applied. ${views.length} legacy views recreated.`);
}

// ── FK constraint helpers (drop before load, restore after) ──

const V3_SCHEMAS = [
  'breeding', 'carcase', 'cattle', 'commodity', 'contacts', 'digistar',
  'feed', 'finance', 'health', 'operations', 'pen', 'purchasing', 'reporting',
  'system', 'transport', 'weighing'
];

async function dropAllForeignKeys(pgPool) {
  const schemaList = V3_SCHEMAS.map(s => `'${s}'`).join(', ');
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

async function restoreForeignKeys(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm-v6.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Extract ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY blocks (inline + from DO blocks)
  // First extract from DO $$ blocks
  const doBlocks = [...schema.matchAll(FK_DO_BLOCK)];
  const fkStatements = [];
  for (const doBlock of doBlocks) {
    // Extract ARRAY['name', 'ALTER TABLE ...'] entries
    const arrayRe = /ARRAY\['([^']+)',\s*'(ALTER TABLE[^']+)'/g;
    let m;
    while ((m = arrayRe.exec(doBlock[0])) !== null) {
      fkStatements.push({ constraintName: m[1], sql: m[2] });
    }
  }
  // Also extract standalone FK ALTERs (from schema text without DO blocks to avoid duplicates)
  const schemaWithoutDoBlocks = schema.replace(FK_DO_BLOCK, '');
  const inlineMatches = [...schemaWithoutDoBlocks.matchAll(FK_INLINE)];
  for (const match of inlineMatches) {
    fkStatements.push({ constraintName: match[1], sql: match[0].replace(/;$/, '') });
  }

  // Add each FK constraint with NOT VALID (skips existing-data check)
  let added = 0;
  const failures = [];
  for (const { constraintName, sql } of fkStatements) {
    try {
      await pgPool.query(sql + ' NOT VALID');
      added++;
    } catch (err) {
      console.warn(`[WARN] FK add failed: ${constraintName} — ${err.message}`);
      failures.push({ constraint: constraintName, error: err.message });
    }
  }
  console.log(`[INFO] FK constraints added (NOT VALID): ${added}/${fkStatements.length}`);

  // Now validate each constraint — this checks existing data and logs failures
  const schemaList = V3_SCHEMAS.map(s => `'${s}'`).join(', ');
  const { rows } = await pgPool.query(`
    SELECT conrelid::regclass AS table_name, conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND NOT c.convalidated AND n.nspname IN (${schemaList})
  `);
  let validated = 0;
  for (const { table_name, constraint_name } of rows) {
    try {
      await pgPool.query(`ALTER TABLE ${table_name} VALIDATE CONSTRAINT "${constraint_name}"`);
      validated++;
    } catch (err) {
      console.warn(`[WARN] FK validation failed: ${table_name}.${constraint_name} — ${err.message}`);
      failures.push({ constraint: constraint_name, error: err.message });
    }
  }
  console.log(`[INFO] FK constraints validated: ${validated}/${rows.length}`);
  if (failures.length > 0) {
    console.warn(`[WARN] ${failures.length} FK constraint(s) have orphaned data — constraints added but not fully validated.`);
  }
}

// ── Main ────────────────────────────────────────────

async function main() {
  const cliArgs = parseArgs(process.argv);
  const migOpts = getMigrationOptions();

  console.log('=== LSJ-HUB Legacy Migration Tool ===\n');

  // Connect to primary CATTLE database
  const mssqlPool = await connectMssql();
  console.log('[INFO] Connected to SQL Server (CATTLE).');

  // Also connect to CATTLE_feed and CATTLE_Feedtrans if available
  const defaultDb = process.env.MSSQL_DATABASE || 'CATTLE';
  const mssqlPools = { [defaultDb]: mssqlPool };
  const extraPools = [];
  for (const feedDb of ['CATTLE_feed', 'CATTLE_Feedtrans']) {
    try {
      const cfg = { ...getMssqlConfig(), database: feedDb };
      const feedPool = await new sql.ConnectionPool(cfg).connect();
      mssqlPools[feedDb] = feedPool;
      extraPools.push(feedPool);
      console.log(`[INFO] Connected to SQL Server (${feedDb}).`);
    } catch (err) {
      console.log(`[INFO] ${feedDb} not available — its tables will be skipped.`);
    }
  }

  const pgPool = connectPostgres(pgConfig());
  // Verify PG connection
  await pgPool.query('SELECT 1');
  console.log('[INFO] Connected to PostgreSQL.');

  // Apply schema
  await ensureSchema(pgPool);

  if (cliArgs.checkMappings) {
    console.log('\n--- Pre-Flight Mapping Check ---\n');
    const { errors, warnings } = await validateMappings(pgPool, { throwOnError: false });
    console.log(`Errors:   ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    await closePools();
    process.exit(errors.length > 0 ? 1 : 0);
  }

  if (cliArgs.validateOnly) {
    // Validation only
    console.log('\n--- Post-Migration Validation ---\n');
    const checks = await validateMigration(mssqlPool, pgPool);
    let allPassed = true;
    for (const c of checks) {
      const icon = c.passed ? 'PASS' : 'FAIL';
      console.log(`  [${icon}] ${c.check} — ${c.detail}`);
      if (!c.passed) allPassed = false;
    }
    console.log(allPassed ? '\nAll checks passed.' : '\nSome checks FAILED.');
    await closePools();
    process.exit(allPassed ? 0 : 1);
  }

  if (cliArgs.auditOnly) {
    // Pre-flight audit
    console.log('\n--- Pre-Flight Source Audit ---\n');
    const report = await preFlightAudit(mssqlPool);
    const s = report.summary;
    console.log(`Source tables: ${s.totalSourceTables}`);
    console.log(`  Mapped:      ${s.mappedTables} (${s.mappedRows.toLocaleString()} rows)`);
    console.log(`  Raw (JSONB): ${s.rawTables} (${s.rawRows.toLocaleString()} rows)`);
    console.log(`  Excluded:    ${s.excludedTables} (${s.excludedRows.toLocaleString()} rows)`);
    console.log(`  TOTAL:       ${s.totalRows.toLocaleString()} rows\n`);

    if (report.uncategorised.length > 0) {
      console.log('  *** UNCATEGORISED TABLES (MUST be resolved before migration) ***');
      for (const t of report.uncategorised) {
        console.log(`    - ${t.table} (${t.rows} rows)`);
      }
      console.log('');
    }

    console.log('\nTable Details:');
    console.log('Table'.padEnd(45) + 'Strategy'.padStart(10) + 'Rows'.padStart(10) + '  Target/Reason');
    console.log('-'.repeat(90));
    for (const t of report.tables) {
      console.log(
        t.table.padEnd(45) +
        t.strategy.padStart(10) +
        String(t.rows).padStart(10) +
        `  ${t.target || t.reason || ''}`
      );
    }

    await closePools();
    process.exit(report.uncategorised.length > 0 ? 1 : 0);
  }

  if (cliArgs.reconcileOnly) {
    // Per-farm reconciliation report
    // Determine which farms to reconcile.
    // --farm <name>  → single farm (uses current connections, farm name from arg)
    // (default)      → single farm using current connections, named from MSSQL_DATABASE env
    const farmName = cliArgs.farm || process.env.MSSQL_DATABASE || process.env.MSSQL_HOST || 'default';

    console.log(`\n--- Per-Farm Reconciliation Report ---\n`);
    console.log(`Farm: ${farmName}`);

    const farmResult = await reconcileFarm(farmName, pgPool, mssqlPool);

    // Print table breakdown
    const COL_TABLE  = 25;
    const COL_NUM    = 10;
    console.log(
      '\n  ' + 'Table'.padEnd(COL_TABLE) +
      'Source'.padStart(COL_NUM) +
      'Target'.padStart(COL_NUM) +
      'Delta'.padStart(COL_NUM) +
      '  Status'
    );
    console.log('  ' + '-'.repeat(COL_TABLE + COL_NUM * 3 + 10));

    for (const t of farmResult.tables) {
      // Skip tables that are absent on this farm (0/0 match) to keep output concise
      if (t.note === 'table absent on farm') continue;

      const status = t.error
        ? `ERROR: ${t.error}`
        : t.match
          ? '✓ MATCH'
          : '✗ MISMATCH';
      console.log(
        '  ' + t.table.padEnd(COL_TABLE) +
        String(t.source).padStart(COL_NUM) +
        String(t.target).padStart(COL_NUM) +
        String(t.delta).padStart(COL_NUM) +
        `  ${status}`
      );
    }

    const presentTables = farmResult.tables.filter(t => t.note !== 'table absent on farm');
    const mismatches    = presentTables.filter(t => !t.match);
    console.log(`\n  ${presentTables.length} tables checked, ${mismatches.length} mismatch(es).`);
    console.log(farmResult.allMatch ? '\nAll tables reconciled.' : '\nSome tables have mismatches.');

    // JSON output
    if (cliArgs.output) {
      const report = {
        timestamp: new Date().toISOString(),
        farms: [farmResult],
        summary: {
          farms: 1,
          matching: farmResult.allMatch ? 1 : 0,
          mismatching: farmResult.allMatch ? 0 : 1,
        },
      };
      fs.writeFileSync(cliArgs.output, JSON.stringify(report, null, 2), 'utf8');
      console.log(`\n[INFO] JSON report written to ${cliArgs.output}`);
    }

    await closePools();
    process.exit(farmResult.allMatch ? 0 : 1);
  }

  // Run migration
  const opts = {
    batchSize: cliArgs.batchSize || migOpts.batchSize,
    logLevel:  migOpts.logLevel,
    dryRun:    cliArgs.dryRun,
    tables:    cliArgs.tables,
  };

  // Drop FK constraints so inserts don't fail on load order
  if (!opts.dryRun) {
    await dropAllForeignKeys(pgPool);
  }

  const { results } = await runMigration(mssqlPools, pgPool, opts);

  // Migrate raw tables (legacy_raw JSONB catch-all)
  let rawResults = [];
  if (!cliArgs.tables) {
    console.log('\n--- Migrating raw tables to legacy_raw ---\n');
    rawResults = await migrateRawTables(mssqlPool, pgPool, {
      batchSize: opts.batchSize,
      logLevel: opts.logLevel || 'info',
      dryRun: opts.dryRun,
    });
  }

  // Restore FK constraints after all data is loaded
  // SKIP_FK_RESTORE is set by migrate-all.js --target-db for non-final source DBs
  // so FKs are only restored once after the last source completes.
  let hasFailures = false;
  if (!opts.dryRun && process.env.SKIP_FK_RESTORE !== '1') {
    // Clean up orphaned FK references that would block constraint validation
    await pgPool.query(`
      UPDATE finance.custfeed_invoices_list SET purch_lot_no = NULL
      WHERE purch_lot_no IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM purchasing.purchase_lots pl WHERE pl.lot_number = purch_lot_no)
    `);
    try {
      await restoreForeignKeys(pgPool);
    } catch (err) {
      console.error('[ERROR] Failed to restore FK constraints:', err.message);
      hasFailures = true;
    }
  }

  // Summary
  console.log('\n=== Migration Summary — Mapped Tables ===\n');
  console.log('Table'.padEnd(25) + 'Read'.padStart(10) + 'Written'.padStart(10) +
              'Skipped'.padStart(10) + 'Errors'.padStart(10) + '  Status');
  console.log('-'.repeat(75));

  for (const r of results) {
    console.log(
      r.table.padEnd(25) +
      String(r.rowsRead).padStart(10) +
      String(r.rowsWritten).padStart(10) +
      String(r.rowsSkipped).padStart(10) +
      String(r.rowsErrored).padStart(10) +
      `  ${r.status}`
    );
    if (r.status === 'failed') hasFailures = true;
  }

  // Raw table summary
  if (rawResults.length > 0) {
    console.log('\n=== Migration Summary — Raw Tables (legacy_raw) ===\n');
    console.log('Table'.padEnd(45) + 'Read'.padStart(10) + 'Written'.padStart(10) +
                'Errors'.padStart(10) + '  Status');
    console.log('-'.repeat(85));
    for (const r of rawResults) {
      console.log(
        r.table.padEnd(45) +
        String(r.rowsRead).padStart(10) +
        String(r.rowsWritten).padStart(10) +
        String(r.rowsErrored).padStart(10) +
        `  ${r.status}`
      );
      if (r.status === 'failed') hasFailures = true;
    }
  }

  // Post-migration validation
  if (!cliArgs.dryRun) {
    console.log('\n--- Post-Migration Validation ---\n');
    const checks = await validateMigration(mssqlPool, pgPool);
    for (const c of checks) {
      const icon = c.passed ? 'PASS' : 'FAIL';
      console.log(`  [${icon}] ${c.check} — ${c.detail}`);
      if (!c.passed) hasFailures = true;
    }
  }

  await closePools();
  // Close extra feed DB pools
  for (const p of extraPools) {
    try { await p.close(); } catch (_) {}
  }
  console.log('\nDone.');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  closePools().finally(() => process.exit(1));
});
