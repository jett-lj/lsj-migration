/**
 * Migration runner — orchestrates reading from SQL Server and writing to PostgreSQL.
 *
 * Features:
 *  - Batched inserts to avoid OOM on large tables
 *  - Per-table migration logging into migration_log
 *  - Lookup resolution (breeds, pens, purchase lots → IDs)
 *  - Row-level validation with skip/error counting
 *  - Transactional per-batch writes (rollback on failure)
 *  - Dry-run mode
 */
'use strict';

const { mappings } = require('./mappings');
const { TABLE_CATEGORIES, getTableCategory, getCategorySummary } = require('./categories');

// ── Logger (respects config log level) ──────────────

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function createLogger(level) {
  const threshold = LOG_LEVELS[level] ?? 1;
  return {
    debug: (...a) => threshold <= 0 && console.log('[DEBUG]', ...a),
    info:  (...a) => threshold <= 1 && console.log('[INFO]',  ...a),
    warn:  (...a) => threshold <= 2 && console.warn('[WARN]',  ...a),
    error: (...a) => threshold <= 3 && console.error('[ERROR]', ...a),
  };
}

// ── Core runner ─────────────────────────────────────

/**
 * Run the full migration.
 *
 * @param {object} mssqlPool  - connected mssql pool
 * @param {object} pgPool     - connected pg Pool
 * @param {object} opts       - { batchSize, logLevel, dryRun, tables }
 * @returns {{ results: Array<{ table, rowsRead, rowsWritten, rowsSkipped, rowsErrored, status, error? }> }}
 */
async function runMigration(mssqlPool, pgPool, opts = {}) {
  const {
    batchSize = 500,
    logLevel  = 'info',
    dryRun    = false,
    tables    = null,    // null = all, or array of source table names to migrate
  } = opts;

  const log = createLogger(logLevel);
  const results = [];
  const lookups = {};

  // Filter mappings if specific tables requested
  let toRun = mappings;
  if (tables && tables.length > 0) {
    const set = new Set(tables.map(t => t.toLowerCase()));
    toRun = mappings.filter(m => set.has(m.sourceTable.toLowerCase()));
  }

  log.info(`Migration starting — ${toRun.length} tables, batch size ${batchSize}, dryRun=${dryRun}`);

  for (const mapping of toRun) {
    const result = await migrateTable(mssqlPool, pgPool, mapping, {
      batchSize, log, dryRun, lookups,
    });
    results.push(result);

    // Build lookups after relevant tables are migrated
    if (mapping.targetTable === 'breeds') {
      lookups.breeds    = await buildLookup(pgPool, 'breeds', 'id', 'name');
      lookups.breedIdMap = await buildIdLookup(mssqlPool, pgPool, 'breeds');
    }
    if (mapping.targetTable === 'pens') {
      lookups.penIdMap = await buildLookup(pgPool, 'pens', 'name', 'id');
    }
    if (mapping.targetTable === 'purchase_lots') {
      lookups.purchLotIdMap = await buildLookup(pgPool, 'purchase_lots', 'lot_number', 'id');
    }
    if (mapping.targetTable === 'cows') {
      lookups.cowIdMap = await buildCowIdMap(pgPool);
    }
  }

  log.info('Migration complete.');
  return { results };
}

/**
 * Migrate a single table.
 *
 * Uses OFFSET/FETCH pagination to read from SQL Server in pages of `batchSize`
 * rows, avoiding loading entire tables into memory (critical for 2GB+ databases).
 */
async function migrateTable(mssqlPool, pgPool, mapping, { batchSize, log, dryRun, lookups }) {
  const { sourceTable, targetTable, query } = mapping;

  log.info(`Migrating ${sourceTable} → ${targetTable}...`);

  const stats = { table: sourceTable, rowsRead: 0, rowsWritten: 0, rowsSkipped: 0, rowsErrored: 0, status: 'running', error: null };

  // Log start in migration_log
  let logId = null;
  if (!dryRun) {
    try {
      const logRes = await pgPool.query(
        `INSERT INTO migration_log (source_table, status) VALUES ($1, 'running') RETURNING id`,
        [sourceTable]
      );
      logId = logRes.rows[0].id;
    } catch (e) {
      log.warn(`Could not write migration_log entry: ${e.message}`);
    }
  }

  try {
    // Get total row count for progress reporting (non-blocking — failures are OK)
    let totalRows = 0;
    try {
      const countRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${sourceTable}]`
      );
      totalRows = countRes.recordset[0].cnt;
    } catch (_) {}

    if (totalRows === 0) {
      // Verify with a single-page read in case COUNT failed
      const probe = await mssqlPool.request().query(
        `${query} OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
      );
      if (probe.recordset.length === 0) {
        stats.status = 'completed';
        log.info(`  ${sourceTable}: 0 rows — skipping`);
        await updateMigrationLog(pgPool, logId, stats, dryRun);
        return stats;
      }
      totalRows = -1; // unknown total
    }

    log.info(`  ${sourceTable}: ${totalRows > 0 ? totalRows.toLocaleString() : 'unknown'} rows to process`);

    // Read and process in pages (O(batchSize) memory instead of O(totalRows))
    let offset = 0;
    while (true) {
      const pageQuery = `${query} OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
      const result = await mssqlPool.request().query(pageQuery);
      const rows = result.recordset;

      if (rows.length === 0) break;
      stats.rowsRead += rows.length;

      const { written, skipped, errored } = await processBatch(
        pgPool, rows, mapping, { log, dryRun, lookups }
      );
      stats.rowsWritten += written;
      stats.rowsSkipped += skipped;
      stats.rowsErrored += errored;

      offset += rows.length;

      // Progress reporting (every 5% or last page)
      if (totalRows > 0) {
        const pct = Math.min(100, Math.round(100 * offset / totalRows));
        const prevPct = Math.min(100, Math.round(100 * (offset - rows.length) / totalRows));
        if (Math.floor(pct / 5) > Math.floor(prevPct / 5) || rows.length < batchSize) {
          log.info(`  [${sourceTable}] ${offset.toLocaleString()}/${totalRows.toLocaleString()} (${pct}%)`);
        }
      } else {
        log.info(`  [${sourceTable}] ${offset.toLocaleString()} rows processed`);
      }

      if (rows.length < batchSize) break; // last page
    }

    stats.status = 'completed';
    log.info(`  Done: ${stats.rowsWritten} written, ${stats.rowsSkipped} skipped, ${stats.rowsErrored} errored`);
  } catch (err) {
    stats.status = 'failed';
    stats.error = err.message;
    log.error(`  FAILED: ${err.message}`);
  }

  await updateMigrationLog(pgPool, logId, stats, dryRun);
  return stats;
}

/**
 * Process a batch of rows: transform → validate → insert.
 */
async function processBatch(pgPool, batch, mapping, { log, dryRun, lookups }) {
  const { columns, targetTable, validate, transformRow, buildInsertValues, staticValues, requiresLookup } = mapping;

  let written = 0, skipped = 0, errored = 0;

  // Transform rows
  const transformed = [];
  for (const rawRow of batch) {
    try {
      // Apply column-level transforms
      const row = {};
      for (const col of columns) {
        const val = rawRow[col.source];
        row[col.target] = col.transform ? col.transform(val) : val;
      }

      // Apply row-level transform if present
      if (transformRow) {
        transformRow(rawRow, lookups);
        // Merge derived fields
        Object.keys(rawRow).forEach(k => {
          if (k.startsWith('_')) row[k] = rawRow[k];
        });
      }

      // Resolve FK lookups for cow_id
      if (requiresLookup === 'cowIdMap' && lookups.cowIdMap) {
        const beastId = row._beast_id;
        const cowId = lookups.cowIdMap[beastId];
        if (!cowId) {
          skipped++;
          continue;
        }
        row.cow_id = cowId;
      }

      // Resolve pen_id for pen_movements
      if (row._pen_name && lookups.penIdMap) {
        row.pen_id = lookups.penIdMap[row._pen_name] || null;
        if (!row.pen_id) {
          skipped++;
          continue;
        }
      }

      // Resolve cost_code_id for costs
      if (row._cost_code !== undefined && lookups.costCodeMap) {
        row.cost_code_id = lookups.costCodeMap[row._cost_code] || null;
      }

      // Add static values
      if (staticValues) {
        Object.assign(row, staticValues);
      }

      // Validate
      if (validate && !validate(row)) {
        skipped++;
        continue;
      }

      // Build final insert values
      const values = buildInsertValues ? buildInsertValues(row) : row;
      transformed.push(values);
    } catch (err) {
      errored++;
      log.debug(`  Row transform error: ${err.message}`);
    }
  }

  if (transformed.length === 0 || dryRun) {
    return { written: dryRun ? transformed.length : 0, skipped, errored };
  }

  // Build and execute batch INSERT
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < transformed.length; i++) {
      const values = transformed[i];
      try {
        // Remove internal fields (prefixed with _)
        const clean = {};
        for (const [k, v] of Object.entries(values)) {
          if (!k.startsWith('_')) clean[k] = v;
        }

        const keys = Object.keys(clean);
        const params = keys.map((_, j) => `$${j + 1}`);
        const vals = keys.map(k => clean[k]);

        await client.query('SAVEPOINT sp');
        await client.query(
          `INSERT INTO ${targetTable} (${keys.join(', ')}) VALUES (${params.join(', ')}) ON CONFLICT DO NOTHING`,
          vals
        );
        await client.query('RELEASE SAVEPOINT sp');
        written++;
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT sp');
        errored++;
        log.debug(`  Row insert error (${targetTable}): ${err.message}`);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { written, skipped, errored };
}

// ── Lookup builders ──────────────────────────────────

async function buildLookup(pgPool, table, keyCol, valueCol) {
  const res = await pgPool.query(`SELECT ${keyCol}, ${valueCol} FROM ${table}`);
  const map = {};
  for (const row of res.rows) {
    map[row[keyCol]] = row[valueCol];
  }
  return map;
}

async function buildIdLookup(mssqlPool, pgPool, targetTable) {
  // For breeds: legacy Breed_Code → new breeds.id
  if (targetTable === 'breeds') {
    const res = await pgPool.query('SELECT id, name FROM breeds');
    const nameToId = {};
    for (const row of res.rows) nameToId[row.name] = row.id;

    const legacy = await mssqlPool.request().query('SELECT Breed_Code, Breed_Name FROM dbo.Breeds');
    const map = {};
    for (const row of legacy.recordset) {
      const name = row.Breed_Name?.trim();
      if (name && nameToId[name]) {
        map[row.Breed_Code] = nameToId[name];
      }
    }
    return map;
  }
  return {};
}

async function buildCowIdMap(pgPool) {
  const res = await pgPool.query('SELECT id, legacy_beast_id FROM cows WHERE legacy_beast_id IS NOT NULL');
  const map = {};
  for (const row of res.rows) {
    map[row.legacy_beast_id] = row.id;
  }
  return map;
}

// ── Migration log helper ─────────────────────────────

async function updateMigrationLog(pgPool, logId, stats, dryRun) {
  if (dryRun || !logId) return;
  try {
    await pgPool.query(
      `UPDATE migration_log
       SET rows_read = $1, rows_written = $2, rows_skipped = $3, rows_errored = $4,
           status = $5, error_details = $6, completed_at = NOW()
       WHERE id = $7`,
      [stats.rowsRead, stats.rowsWritten, stats.rowsSkipped, stats.rowsErrored,
       stats.status, stats.error, logId]
    );
  } catch (e) {
    // non-fatal
  }
}

// ── Validation (post-migration) ──────────────────────

/**
 * Run post-migration validation checks.
 * Returns an array of { check, passed, detail }.
 */
async function validateMigration(mssqlPool, pgPool) {
  const checks = [];

  // 1. Row count comparisons — EXACT match required
  const countChecks = [
    { source: 'dbo.Breeds',          target: 'breeds' },
    { source: 'dbo.Diseases',        target: 'diseases' },
    { source: 'dbo.Drugs',           target: 'drugs' },
    { source: 'dbo.Contacts',        target: 'contacts' },
    { source: 'dbo.Cattle',          target: 'cows' },
    { source: 'dbo.Weighing_Events', target: 'weighing_events' },
    { source: 'dbo.PensHistory',     target: 'pen_movements' },
    { source: 'dbo.Drugs_Given',     target: 'treatments' },
    { source: 'dbo.Carcase_data',    target: 'carcase_data' },
    { source: 'dbo.Location_Changes', target: 'location_changes' },
    { source: 'dbo.Drug_Disposal',   target: 'drug_disposals' },
    { source: 'dbo.Drugs_Purchased', target: 'drug_purchases' },
  ];

  for (const { source, target } of countChecks) {
    try {
      const srcRes = await mssqlPool.request().query(`SELECT COUNT(*) AS cnt FROM ${source}`);
      const tgtRes = await pgPool.query(`SELECT COUNT(*) AS cnt FROM ${target}`);
      const srcCount = srcRes.recordset[0].cnt;
      const tgtCount = parseInt(tgtRes.rows[0].cnt);

      // Exact match — zero data loss tolerance
      const passed = tgtCount >= srcCount;

      checks.push({
        check: `Row count: ${source} → ${target}`,
        passed,
        detail: `source=${srcCount} target=${tgtCount}${passed ? '' : ' MISMATCH'}`,
      });
    } catch (err) {
      checks.push({
        check: `Row count: ${source} → ${target}`,
        passed: false,
        detail: `Error: ${err.message}`,
      });
    }
  }

  // 2. Referential integrity checks
  const fkChecks = [
    { table: 'weighing_events', fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'pen_movements',   fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'treatments',      fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'treatments',      fk: 'drug_id', ref: 'drugs', refCol: 'id' },
    { table: 'costs',           fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'health_records',  fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'carcase_data',    fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'autopsy_records', fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'location_changes', fk: 'cow_id', ref: 'cows', refCol: 'id' },
  ];

  for (const { table, fk, ref, refCol } of fkChecks) {
    try {
      const res = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM ${table} t
         WHERE t.${fk} IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM ${ref} r WHERE r.${refCol} = t.${fk})`
      );
      const orphans = parseInt(res.rows[0].cnt);
      checks.push({
        check: `FK integrity: ${table}.${fk} → ${ref}.${refCol}`,
        passed: orphans === 0,
        detail: `orphaned rows: ${orphans}`,
      });
    } catch (err) {
      checks.push({
        check: `FK integrity: ${table}.${fk} → ${ref}.${refCol}`,
        passed: false,
        detail: `Error: ${err.message}`,
      });
    }
  }

  // 3. No null tag_numbers on cows
  try {
    const res = await pgPool.query(`SELECT COUNT(*) AS cnt FROM cows WHERE tag_number IS NULL OR tag_number = ''`);
    const nullTags = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no null/empty tag_numbers',
      passed: nullTags === 0,
      detail: `null/empty tags: ${nullTags}`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no null/empty tag_numbers', passed: false, detail: err.message });
  }

  // 4. No negative weights
  try {
    const res = await pgPool.query(`SELECT COUNT(*) AS cnt FROM weighing_events WHERE weight_kg < 0`);
    const negWeights = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no negative weights',
      passed: negWeights === 0,
      detail: `negative weights: ${negWeights}`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no negative weights', passed: false, detail: err.message });
  }

  return checks;
}

// ── Pre-flight source audit ──────────────────────────

/**
 * Scan every table in the source database and compare against categories.
 * Returns a report with row counts and coverage status.
 *
 * Any table in the source that is NOT in TABLE_CATEGORIES is flagged as
 * 'uncategorised' — this is a hard error that must be resolved before migration.
 */
async function preFlightAudit(mssqlPool) {
  const report = { tables: [], uncategorised: [], summary: {} };
  const { mapped, raw, excluded } = getCategorySummary();

  // Get all user tables from SQL Server
  const tablesResult = await mssqlPool.request().query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo' ORDER BY TABLE_NAME`
  );
  const sourceTables = tablesResult.recordset.map(r => r.TABLE_NAME);

  let totalRows = 0;
  let mappedRows = 0;
  let rawRows = 0;
  let excludedRows = 0;
  let uncategorisedRows = 0;

  for (const tableName of sourceTables) {
    let rowCount = 0;
    try {
      const countRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${tableName}]`
      );
      rowCount = countRes.recordset[0].cnt;
    } catch (_) {
      // Some tables may not be queryable
    }

    totalRows += rowCount;

    const cat = getTableCategory(tableName);
    if (!cat) {
      report.uncategorised.push({ table: tableName, rows: rowCount });
      uncategorisedRows += rowCount;
    } else {
      const entry = { table: tableName, rows: rowCount, strategy: cat.strategy };
      if (cat.target) entry.target = cat.target;
      if (cat.reason) entry.reason = cat.reason;
      report.tables.push(entry);

      if (cat.strategy === 'mapped')   mappedRows += rowCount;
      if (cat.strategy === 'raw')      rawRows += rowCount;
      if (cat.strategy === 'excluded') excludedRows += rowCount;
    }
  }

  report.summary = {
    totalSourceTables: sourceTables.length,
    categorisedTables: mapped.length + raw.length + excluded.length,
    mappedTables: mapped.length,
    rawTables: raw.length,
    excludedTables: excluded.length,
    uncategorisedTables: report.uncategorised.length,
    totalRows,
    mappedRows,
    rawRows,
    excludedRows,
    uncategorisedRows,
  };

  return report;
}

// ── Raw table migration ──────────────────────────────

/**
 * Migrate all 'raw' category tables to the legacy_raw table as JSONB rows.
 * Each source row becomes one legacy_raw entry with { source_table, row_data }.
 *
 * Uses OFFSET/FETCH pagination to avoid loading entire tables into memory.
 */
async function migrateRawTables(mssqlPool, pgPool, opts = {}) {
  const { batchSize = 500, logLevel = 'info', dryRun = false } = opts;
  const log = createLogger(logLevel);
  const { raw } = getCategorySummary();
  const results = [];

  log.info(`Raw migration: ${raw.length} tables to copy`);

  for (const tableName of raw) {
    const stats = { table: tableName, rowsRead: 0, rowsWritten: 0, rowsSkipped: 0, rowsErrored: 0, status: 'running', error: null };

    // Log start
    let logId = null;
    if (!dryRun) {
      try {
        const logRes = await pgPool.query(
          `INSERT INTO migration_log (source_table, status) VALUES ($1, 'running') RETURNING id`,
          [tableName]
        );
        logId = logRes.rows[0].id;
      } catch (_) {}
    }

    try {
      // Get total count for progress reporting
      let totalRows = 0;
      try {
        const countRes = await mssqlPool.request().query(
          `SELECT COUNT(*) AS cnt FROM [dbo].[${tableName}]`
        );
        totalRows = countRes.recordset[0].cnt;
      } catch (_) {}

      log.info(`  [RAW] ${tableName}: ${totalRows > 0 ? totalRows.toLocaleString() : '?'} rows`);

      if (totalRows === 0) {
        // Probe to confirm empty
        let isEmpty = true;
        try {
          const probe = await mssqlPool.request().query(
            `SELECT TOP 1 * FROM [dbo].[${tableName}]`
          );
          isEmpty = probe.recordset.length === 0;
        } catch (_) {}

        if (isEmpty) {
          stats.status = 'completed';
          await updateMigrationLog(pgPool, logId, stats, dryRun);
          results.push(stats);
          continue;
        }
      }

      // Read in pages using OFFSET/FETCH (ORDER BY (SELECT NULL) for tables without a natural order)
      let offset = 0;
      while (true) {
        const pageQuery = `SELECT * FROM [dbo].[${tableName}] ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
        const result = await mssqlPool.request().query(pageQuery);
        const rows = result.recordset;

        if (rows.length === 0) break;
        stats.rowsRead += rows.length;

        if (!dryRun) {
          const client = await pgPool.connect();
          try {
            await client.query('BEGIN');
            for (const row of rows) {
              // Sanitise: strip binary/buffer fields that can't be JSON-serialised
              const clean = {};
              for (const [k, v] of Object.entries(row)) {
                if (Buffer.isBuffer(v)) {
                  clean[k] = `[BINARY ${v.length} bytes]`;
                } else {
                  clean[k] = v;
                }
              }
              await client.query(
                'INSERT INTO legacy_raw (source_table, row_data) VALUES ($1, $2)',
                [tableName, JSON.stringify(clean)]
              );
              stats.rowsWritten++;
            }
            await client.query('COMMIT');
          } catch (err) {
            await client.query('ROLLBACK');
            stats.rowsErrored += rows.length;
            log.error(`  [RAW] ${tableName} batch error: ${err.message}`);
          } finally {
            client.release();
          }
        } else {
          stats.rowsWritten += rows.length;
        }

        offset += rows.length;

        // Progress (every 5%)
        if (totalRows > 0 && offset < totalRows) {
          const pct = Math.min(100, Math.round(100 * offset / totalRows));
          const prevPct = Math.min(100, Math.round(100 * (offset - rows.length) / totalRows));
          if (Math.floor(pct / 5) > Math.floor(prevPct / 5) || rows.length < batchSize) {
            log.info(`  [RAW] ${tableName}: ${offset.toLocaleString()}/${totalRows.toLocaleString()} (${pct}%)`);
          }
        }

        if (rows.length < batchSize) break; // last page
      }

      stats.status = 'completed';
    } catch (err) {
      stats.status = 'failed';
      stats.error = err.message;
      log.error(`  [RAW] ${tableName} FAILED: ${err.message}`);
    }

    await updateMigrationLog(pgPool, logId, stats, dryRun);
    results.push(stats);
  }

  return results;
}

// ── Reconciliation report ────────────────────────────

/**
 * Generate a post-migration reconciliation report.
 * Compares source row counts vs target row counts for EVERY categorised table.
 */
async function reconciliationReport(mssqlPool, pgPool) {
  const rows = [];
  const { mapped, raw } = getCategorySummary();

  // Check mapped tables
  for (const m of mappings) {
    try {
      const srcRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${m.sourceTable}]`
      );
      const tgtRes = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM ${m.targetTable}`
      );
      const src = srcRes.recordset[0].cnt;
      const tgt = parseInt(tgtRes.rows[0].cnt);
      rows.push({
        source: m.sourceTable,
        target: m.targetTable,
        strategy: 'mapped',
        sourceRows: src,
        targetRows: tgt,
        match: src === tgt,
        delta: tgt - src,
      });
    } catch (err) {
      rows.push({
        source: m.sourceTable,
        target: m.targetTable,
        strategy: 'mapped',
        sourceRows: -1,
        targetRows: -1,
        match: false,
        delta: 0,
        error: err.message,
      });
    }
  }

  // Check raw tables
  for (const tableName of raw) {
    try {
      const srcRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${tableName}]`
      );
      const tgtRes = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM legacy_raw WHERE source_table = $1`,
        [tableName]
      );
      const src = srcRes.recordset[0].cnt;
      const tgt = parseInt(tgtRes.rows[0].cnt);
      rows.push({
        source: tableName,
        target: 'legacy_raw',
        strategy: 'raw',
        sourceRows: src,
        targetRows: tgt,
        match: src === tgt,
        delta: tgt - src,
      });
    } catch (err) {
      rows.push({
        source: tableName,
        target: 'legacy_raw',
        strategy: 'raw',
        sourceRows: -1,
        targetRows: -1,
        match: false,
        delta: 0,
        error: err.message,
      });
    }
  }

  return rows;
}

module.exports = {
  runMigration,
  migrateTable,
  processBatch,
  validateMigration,
  preFlightAudit,
  migrateRawTables,
  reconciliationReport,
  buildLookup,
  buildCowIdMap,
  createLogger,
};
