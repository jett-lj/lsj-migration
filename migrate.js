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
 *   node migrate.js --reconcile     # post-migration reconciliation report
 *   node migrate.js --batch-size 1000
 *
 * Required env vars:
 *   MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD
 *   PG_CONNECTION_STRING  (or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { connectMssql, connectPostgres, closePools } = require('./connections');
const { runMigration, validateMigration, preFlightAudit, migrateRawTables, reconciliationReport } = require('./runner');
const { getMssqlConfig, getMigrationOptions } = require('./config');
const { getCategorySummary } = require('./categories');
const fs   = require('fs');
const path = require('path');

// ── Parse CLI args ──────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, tables: null, validateOnly: false, auditOnly: false, reconcileOnly: false, batchSize: null };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run')       args.dryRun = true;
    else if (arg === '--validate') args.validateOnly = true;
    else if (arg === '--audit')    args.auditOnly = true;
    else if (arg === '--reconcile') args.reconcileOnly = true;
    else if (arg === '--tables' && argv[i + 1]) {
      args.tables = argv[++i].split(',').map(s => s.trim());
    }
    else if (arg === '--batch-size' && argv[i + 1]) {
      args.batchSize = parseInt(argv[++i], 10);
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

const FK_BLOCK_REGEX = /ALTER TABLE (\S+) DROP CONSTRAINT IF EXISTS (\S+);\s*\nALTER TABLE \S+ ADD CONSTRAINT \S+\s*\n\s*FOREIGN KEY \([^)]+\) REFERENCES [^;]+;/g;

async function ensureSchema(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  // Strip FK constraint blocks — they are restored after data load by restoreForeignKeys()
  const schemaWithoutFks = schema.replace(FK_BLOCK_REGEX, '');
  await pgPool.query(schemaWithoutFks);
  console.log('[INFO] PostgreSQL schema applied (FKs deferred).');
}

// ── FK constraint helpers (drop before load, restore after) ──

async function dropAllForeignKeys(pgPool) {
  const { rows } = await pgPool.query(`
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  for (const { table_name, constraint_name } of rows) {
    await pgPool.query(`ALTER TABLE "${table_name}" DROP CONSTRAINT IF EXISTS "${constraint_name}"`);
  }
  console.log(`[INFO] Dropped ${rows.length} FK constraints for clean data load.`);
}

async function restoreForeignKeys(pgPool) {
  const schemaPath = path.join(__dirname, 'schema-farm.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Extract ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY blocks
  const fkBlocks = [...schema.matchAll(FK_BLOCK_REGEX)];

  // Add each FK constraint with NOT VALID (skips existing-data check)
  let added = 0;
  const failures = [];
  for (const match of fkBlocks) {
    const block = match[0];
    // Append NOT VALID before the final semicolon of the ADD CONSTRAINT
    const notValidBlock = block.replace(
      /(REFERENCES\s+[^;]+?)(;)\s*$/,
      '$1 NOT VALID$2'
    );
    try {
      await pgPool.query(notValidBlock);
      added++;
    } catch (err) {
      failures.push({ constraint: match[2], error: err.message });
    }
  }
  console.log(`[INFO] FK constraints added (NOT VALID): ${added}/${fkBlocks.length}`);

  // Now validate each constraint — this checks existing data and logs failures
  const { rows } = await pgPool.query(`
    SELECT conrelid::regclass AS table_name, conname AS constraint_name
    FROM pg_constraint
    WHERE contype = 'f' AND NOT convalidated AND connamespace = 'public'::regnamespace
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

  // Connect
  const mssqlPool = await connectMssql();
  console.log('[INFO] Connected to SQL Server.');

  const pgPool = connectPostgres(pgConfig());
  // Verify PG connection
  await pgPool.query('SELECT 1');
  console.log('[INFO] Connected to PostgreSQL.');

  // Apply schema
  await ensureSchema(pgPool);

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
    // Reconciliation report
    console.log('\n--- Post-Migration Reconciliation Report ---\n');
    const rows = await reconciliationReport(mssqlPool, pgPool);
    console.log('Source'.padEnd(40) + 'Target'.padEnd(20) + 'Type'.padEnd(10) +
                'Src'.padStart(10) + 'Tgt'.padStart(10) + 'Delta'.padStart(8) + '  Match');
    console.log('-'.repeat(105));

    let allMatch = true;
    for (const r of rows) {
      const matchIcon = r.match ? 'YES' : 'NO';
      if (!r.match) allMatch = false;
      console.log(
        r.source.padEnd(40) + r.target.padEnd(20) + r.strategy.padEnd(10) +
        String(r.sourceRows).padStart(10) + String(r.targetRows).padStart(10) +
        String(r.delta).padStart(8) + `  ${matchIcon}`
      );
    }
    console.log(allMatch ? '\nAll tables reconciled.' : '\nSome tables have mismatches.');
    await closePools();
    process.exit(allMatch ? 0 : 1);
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

  const { results } = await runMigration(mssqlPool, pgPool, opts);

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
  let hasFailures = false;
  if (!opts.dryRun) {
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
  console.log('\nDone.');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  closePools().finally(() => process.exit(1));
});
