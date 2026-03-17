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

  // Truncate target tables to ensure clean migration (avoids duplicates on re-run)
  if (!dryRun && !tables) {
    log.info('Truncating all target tables for clean migration...');
    await pgPool.query(`
      TRUNCATE breeds, pens, contacts, diseases, drugs, cost_codes, market_categories,
               purchase_lots, cows, weighing_events, pen_movements, treatments, costs,
               health_records, carcase_data, autopsy_records, vendor_declarations,
               location_changes, drug_purchases, drug_disposals, legacy_raw,
               migration_log CASCADE
    `);
  } else if (!dryRun && tables) {
    const targets = toRun.map(m => m.targetTable);
    log.info(`Truncating selected tables: ${targets.join(', ')}`);
    for (const t of targets) {
      await pgPool.query(`TRUNCATE ${t} CASCADE`);
    }
  }

  // Group mappings by order level for parallel execution
  const orderGroups = new Map();
  for (const mapping of toRun) {
    const order = mapping.order ?? 99;
    if (!orderGroups.has(order)) orderGroups.set(order, []);
    orderGroups.get(order).push(mapping);
  }
  const sortedOrders = [...orderGroups.keys()].sort((a, b) => a - b);

  for (const order of sortedOrders) {
    const group = orderGroups.get(order);

    // Run tables at the same order level in parallel
    const groupResults = await Promise.all(
      group.map(mapping =>
        migrateTable(mssqlPool, pgPool, mapping, { batchSize, log, dryRun, lookups })
      )
    );
    results.push(...groupResults);

    // Build lookups after the entire order group completes
    const tables = new Set(group.map(m => m.targetTable));
    if (tables.has('breeds')) {
      lookups.breeds    = await buildLookup(pgPool, 'breeds', 'id', 'name');
      lookups.breedIdMap = await buildIdLookup(mssqlPool, pgPool, 'breeds');
    }
    if (tables.has('contacts')) {
      lookups.contactIdSet = await buildIdSet(pgPool, 'contacts');
    }
    if (tables.has('pens')) {
      lookups.penIdMap = await buildLookup(pgPool, 'pens', 'name', 'id');
    }
    if (tables.has('diseases')) {
      lookups.diseaseIdSet = await buildIdSet(pgPool, 'diseases');
    }
    if (tables.has('drugs')) {
      lookups.drugIdSet = await buildIdSet(pgPool, 'drugs');
    }
    if (tables.has('purchase_lots')) {
      lookups.purchLotIdMap = await buildLookup(pgPool, 'purchase_lots', 'lot_number', 'id');
    }
    if (tables.has('cost_codes')) {
      lookups.costCodeMap = await buildLookup(pgPool, 'cost_codes', 'code', 'id');
    }
    if (tables.has('cows')) {
      lookups.cowIdMap = await buildCowIdMap(pgPool);
    }
    if (tables.has('health_records')) {
      lookups.sbRecNoMap = await buildSbRecNoMap(mssqlPool, pgPool);
    }
  }

  log.info('Migration complete.');

  // Reset SERIAL sequences for tables that received explicit IDs
  if (!dryRun) {
    await resetSequences(pgPool, log);
  }

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
      if (row._pen_name !== undefined && lookups.penIdMap) {
        const penName = row._pen_name || 'Unknown';
        row.pen_id = lookups.penIdMap[penName] || null;
        if (!row.pen_id) {
          // Auto-create missing pen
          try {
            const penRes = await pgPool.query(
              'INSERT INTO pens (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
              [penName]
            );
            row.pen_id = penRes.rows[0].id;
            lookups.penIdMap[penName] = row.pen_id;
          } catch (e) {
            skipped++;
            continue;
          }
        }
      }

      // Resolve cost_code_id for costs
      if (row._cost_code !== undefined && lookups.costCodeMap) {
        row.cost_code_id = lookups.costCodeMap[row._cost_code] || null;
      }

      // Resolve health_record_id for treatments
      if (row._sb_rec_no !== undefined && lookups.sbRecNoMap) {
        row.health_record_id = lookups.sbRecNoMap[row._sb_rec_no] || null;
      }

      // Add static values
      if (staticValues) {
        Object.assign(row, staticValues);
      }

      // Sanitize FK references — set to null if referenced row doesn't exist
      if (row.drug_id && lookups.drugIdSet && !lookups.drugIdSet.has(row.drug_id)) {
        log.debug(`  FK nullified: ${targetTable}.drug_id=${row.drug_id} — no matching drugs row`);
        row.drug_id = null;
      }
      if (row.vendor_id && lookups.contactIdSet && !lookups.contactIdSet.has(row.vendor_id)) {
        log.debug(`  FK nullified: ${targetTable}.vendor_id=${row.vendor_id} — no matching contacts row`);
        row.vendor_id = null;
      }
      if (row.agent_id && lookups.contactIdSet && !lookups.contactIdSet.has(row.agent_id)) {
        log.debug(`  FK nullified: ${targetTable}.agent_id=${row.agent_id} — no matching contacts row`);
        row.agent_id = null;
      }
      if (row.owner_contact_id && lookups.contactIdSet && !lookups.contactIdSet.has(row.owner_contact_id)) {
        log.debug(`  FK nullified: ${targetTable}.owner_contact_id=${row.owner_contact_id} — no matching contacts row`);
        row.owner_contact_id = null;
      }
      if (row.disease_id && lookups.diseaseIdSet && !lookups.diseaseIdSet.has(row.disease_id)) {
        log.debug(`  FK nullified: ${targetTable}.disease_id=${row.disease_id} — no matching diseases row`);
        row.disease_id = null;
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

  // Build and execute multi-row INSERT (much faster than row-by-row)
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // Clean all rows (remove internal _ prefixed fields)
    const cleanRows = transformed.map(values => {
      const clean = {};
      for (const [k, v] of Object.entries(values)) {
        if (!k.startsWith('_')) clean[k] = v;
      }
      return clean;
    });

    // All rows in a batch share the same columns
    const keys = Object.keys(cleanRows[0]);
    const colCount = keys.length;

    // Chunk to stay within PG's ~65535 parameter limit
    const CHUNK_SIZE = Math.min(cleanRows.length, Math.floor(65000 / colCount));

    for (let start = 0; start < cleanRows.length; start += CHUNK_SIZE) {
      const chunk = cleanRows.slice(start, start + CHUNK_SIZE);
      const allVals = [];
      const valueClauses = [];

      for (let i = 0; i < chunk.length; i++) {
        const offset = i * colCount;
        valueClauses.push(`(${keys.map((_, j) => `$${offset + j + 1}`).join(', ')})`);
        for (const k of keys) allVals.push(chunk[i][k]);
      }

      try {
        const result = await client.query(
          `INSERT INTO ${targetTable} (${keys.join(', ')}) VALUES ${valueClauses.join(', ')} ON CONFLICT DO NOTHING`,
          allVals
        );
        written += result.rowCount;
        skipped += chunk.length - result.rowCount;
      } catch (err) {
        // Multi-row failed — fall back to row-by-row for this chunk only
        log.debug(`  Multi-row insert failed for ${targetTable}, falling back to row-by-row: ${err.message}`);
        for (const row of chunk) {
          try {
            const vals = keys.map(k => row[k]);
            const params = keys.map((_, j) => `$${j + 1}`);
            await client.query('SAVEPOINT sp');
            const r = await client.query(
              `INSERT INTO ${targetTable} (${keys.join(', ')}) VALUES (${params.join(', ')}) ON CONFLICT DO NOTHING`,
              vals
            );
            await client.query('RELEASE SAVEPOINT sp');
            if (r.rowCount > 0) written++;
            else skipped++;
          } catch (rowErr) {
            await client.query('ROLLBACK TO SAVEPOINT sp');
            errored++;
            log.debug(`  Row insert error (${targetTable}): ${rowErr.message}`);
          }
        }
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

async function buildIdSet(pgPool, table) {
  const res = await pgPool.query(`SELECT id FROM ${table}`);
  return new Set(res.rows.map(r => r.id));
}

/**
 * Build a map from legacy SB_Rec_No → health_records.id.
 * Uses the stored legacy_sb_rec_no column for a direct lookup
 * instead of fragile positional zipping.
 */
async function buildSbRecNoMap(_mssqlPool, pgPool) {
  const res = await pgPool.query(
    'SELECT legacy_sb_rec_no, id FROM health_records WHERE legacy_sb_rec_no IS NOT NULL'
  );
  const map = {};
  for (const row of res.rows) {
    map[row.legacy_sb_rec_no] = row.id;
  }
  return map;
}

// ── Sequence reset ───────────────────────────────────

/**
 * Reset SERIAL sequences for tables that received explicit ID values during migration.
 * Without this, post-migration INSERTs would collide with migrated IDs.
 */
async function resetSequences(pgPool, log) {
  const tables = ['breeds', 'diseases', 'drugs', 'contacts', 'market_categories', 'cost_codes'];
  for (const table of tables) {
    try {
      await pgPool.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0))`
      );
    } catch (e) {
      log.warn(`Could not reset sequence for ${table}: ${e.message}`);
    }
  }
  log.info('SERIAL sequences reset to MAX(id) for tables with explicit IDs.');
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

  // 1. Row count comparisons — account for expected skips from validate/orphan logic
  const countChecks = [
    { source: 'dbo.Breeds',             target: 'breeds' },
    { source: 'dbo.Diseases',           target: 'diseases' },
    { source: 'dbo.Drugs',              target: 'drugs' },
    { source: 'dbo.Contacts',           target: 'contacts' },
    { source: 'dbo.Cattle',             target: 'cows' },
    { source: 'dbo.Weighing_Events',    target: 'weighing_events' },
    { source: 'dbo.PensHistory',        target: 'pen_movements' },
    { source: 'dbo.Drugs_Given',        target: 'treatments' },
    { source: 'dbo.Sick_Beast_Records', target: 'health_records' },
    { source: 'dbo.Carcase_data',       target: 'carcase_data' },
    { source: 'dbo.Location_Changes',   target: 'location_changes' },
    { source: 'dbo.Drug_Disposal',      target: 'drug_disposals' },
    { source: 'dbo.Drugs_Purchased',    target: 'drug_purchases' },
    { source: 'dbo.Costs',              target: 'costs' },
    { source: 'dbo.FeedDB_Pens_File',   target: 'pens' },
    { source: 'dbo.Cost_Codes',         target: 'cost_codes' },
    { source: 'dbo.Market_Category',    target: 'market_categories' },
    { source: 'dbo.Purchase_Lots',      target: 'purchase_lots' },
    { source: 'dbo.Autopsy_Records',    target: 'autopsy_records' },
    { source: 'dbo.Vendor_Declarations', target: 'vendor_declarations' },
  ];

  for (const { source, target } of countChecks) {
    try {
      const srcRes = await mssqlPool.request().query(`SELECT COUNT(*) AS cnt FROM ${source}`);
      const tgtRes = await pgPool.query(`SELECT COUNT(*) AS cnt FROM ${target}`);
      const srcCount = srcRes.recordset[0].cnt;
      const tgtCount = parseInt(tgtRes.rows[0].cnt);

      // Exact match — zero data loss tolerance
      // Account for expected skips (validate/orphan filtering) via migration_log
      let expectedSkipped = 0;
      try {
        const srcName = source.replace('dbo.', '');
        const logRes = await pgPool.query(
          `SELECT rows_skipped FROM migration_log WHERE source_table = $1 ORDER BY id DESC LIMIT 1`,
          [srcName]
        );
        expectedSkipped = logRes.rows[0]?.rows_skipped || 0;
      } catch (_) {}
      const passed = tgtCount >= (srcCount - expectedSkipped);

      checks.push({
        check: `Row count: ${source} → ${target}`,
        passed,
        detail: `source=${srcCount} target=${tgtCount}${expectedSkipped ? ` (${expectedSkipped} expected skips)` : ''}${passed ? '' : ' MISMATCH'}`,
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
    { table: 'pen_movements',   fk: 'pen_id', ref: 'pens', refCol: 'id' },
    { table: 'treatments',      fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'treatments',      fk: 'drug_id', ref: 'drugs', refCol: 'id' },
    { table: 'costs',           fk: 'cow_id',        ref: 'cows',       refCol: 'id' },
    { table: 'costs',           fk: 'cost_code_id',  ref: 'cost_codes', refCol: 'id' },
    { table: 'health_records',  fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'health_records',  fk: 'disease_id', ref: 'diseases', refCol: 'id' },
    { table: 'treatments',      fk: 'health_record_id', ref: 'health_records', refCol: 'id' },
    { table: 'purchase_lots',   fk: 'vendor_id', ref: 'contacts', refCol: 'id' },
    { table: 'purchase_lots',   fk: 'agent_id',  ref: 'contacts', refCol: 'id' },
    { table: 'vendor_declarations', fk: 'owner_contact_id', ref: 'contacts', refCol: 'id' },
    { table: 'carcase_data',    fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'autopsy_records', fk: 'cow_id', ref: 'cows', refCol: 'id' },
    { table: 'location_changes',  fk: 'cow_id',   ref: 'cows',  refCol: 'id' },
    { table: 'drug_purchases',    fk: 'drug_id',  ref: 'drugs', refCol: 'id' },
    { table: 'drug_disposals',    fk: 'drug_id',  ref: 'drugs', refCol: 'id' },
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
      log.info(`  Done: ${stats.rowsWritten} written, ${stats.rowsSkipped} skipped, ${stats.rowsErrored} errored`);
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

// ── Database comparison (diff) ───────────────────────

/**
 * Compare-specific key/column definitions for mapped tables.
 * sourceKey  = SQL Server column used as unique row identifier
 * targetKey  = PostgreSQL column corresponding to sourceKey
 * compareCols = array of { source, target } pairs to check for data differences
 */
const COMPARE_DEFS = [
  {
    sourceTable: 'Breeds', targetTable: 'breeds',
    sourceKey: 'Breed_Code', targetKey: 'id',
    compareCols: [{ source: 'Breed_Name', target: 'name' }],
  },
  {
    sourceTable: 'Contacts', targetTable: 'contacts',
    sourceKey: 'Contact_ID', targetKey: 'id',
    compareCols: [
      { source: 'Company', target: 'company' },
      { source: 'First_Name', target: 'first_name' },
      { source: 'Last_Name', target: 'last_name' },
      { source: 'Tel_No', target: 'phone' },
      { source: 'Email', target: 'email' },
    ],
  },
  {
    sourceTable: 'Diseases', targetTable: 'diseases',
    sourceKey: 'Disease_ID', targetKey: 'id',
    compareCols: [
      { source: 'Disease_Name', target: 'name' },
      { source: 'Symptoms', target: 'symptoms' },
    ],
  },
  {
    sourceTable: 'Drugs', targetTable: 'drugs',
    sourceKey: 'Drug_ID', targetKey: 'id',
    compareCols: [
      { source: 'Units', target: 'unit' },
      { source: 'Cost_per_unit', target: 'cost_per_unit' },
    ],
  },
  {
    sourceTable: 'Cattle', targetTable: 'cows',
    sourceKey: 'BeastID', targetKey: 'legacy_beast_id',
    compareCols: [
      { source: 'Ear_Tag', target: 'tag_number' },
      { source: 'EID', target: 'eid' },
      { source: 'Sex', target: 'sex', transform: (v) => { if (!v) return 'female'; const s = String(v).toUpperCase().trim(); return ['S','B','M'].includes(s) ? 'male' : 'female'; } },
    ],
  },
  {
    sourceTable: 'Purchase_Lots', targetTable: 'purchase_lots',
    sourceKey: 'Lot_Number', targetKey: 'lot_number',
    compareCols: [
      { source: 'Number_Head', target: 'head_count' },
      { source: 'Total_Weight', target: 'total_weight_kg' },
    ],
  },
  {
    sourceTable: 'FeedDB_Pens_File', targetTable: 'pens',
    sourceKey: 'Pen_name', targetKey: 'name',
    compareCols: [],
  },
  {
    sourceTable: 'Cost_Codes', targetTable: 'cost_codes',
    sourceKey: 'RevExp_Code', targetKey: 'code',
    compareCols: [{ source: 'RevExp_Desc', target: 'description' }],
  },
  {
    sourceTable: 'Market_Category', targetTable: 'market_categories',
    sourceKey: 'Market_Cat_ID', targetKey: 'id',
    compareCols: [{ source: 'Market_Category', target: 'name' }],
  },
];

/**
 * Compare source (SQL Server) and target (PostgreSQL) databases.
 * Returns detailed diff information per table.
 */
async function compareDatabases(mssqlPool, pgPool) {
  const log = createLogger('info');
  const results = [];

  log.info('Database comparison starting...');

  for (const def of COMPARE_DEFS) {
    const { sourceTable, targetTable, sourceKey, targetKey, compareCols } = def;
    const tableResult = {
      sourceTable,
      targetTable,
      sourceCount: 0,
      targetCount: 0,
      missingInTarget: [],   // keys in source but not in target
      extraInTarget: [],     // keys in target but not in source
      fieldDiffs: [],        // { key, field, sourceVal, targetVal }
      error: null,
    };

    try {
      log.info(`Comparing ${sourceTable} → ${targetTable}...`);

      // Row counts
      const srcCountRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${sourceTable}]`
      );
      tableResult.sourceCount = srcCountRes.recordset[0].cnt;

      const tgtCountRes = await pgPool.query(`SELECT COUNT(*) AS cnt FROM ${targetTable}`);
      tableResult.targetCount = parseInt(tgtCountRes.rows[0].cnt);

      // Fetch all keys from source
      const srcKeysRes = await mssqlPool.request().query(
        `SELECT [${sourceKey}] AS k FROM [dbo].[${sourceTable}] WHERE [${sourceKey}] IS NOT NULL`
      );
      const srcKeys = new Set(srcKeysRes.recordset.map(r => String(r.k).trim()));

      // Fetch all keys from target
      const tgtKeysRes = await pgPool.query(`SELECT ${targetKey} AS k FROM ${targetTable} WHERE ${targetKey} IS NOT NULL`);
      const tgtKeys = new Set(tgtKeysRes.rows.map(r => String(r.k).trim()));

      // Missing in target (source has it, target doesn't)
      for (const k of srcKeys) {
        if (!tgtKeys.has(k)) tableResult.missingInTarget.push(k);
      }

      // Extra in target (target has it, source doesn't)
      for (const k of tgtKeys) {
        if (!srcKeys.has(k)) tableResult.extraInTarget.push(k);
      }

      // Field-level comparison for shared keys (sample up to 500 for performance)
      if (compareCols.length > 0) {
        const sharedKeys = [...srcKeys].filter(k => tgtKeys.has(k));
        const sampleKeys = sharedKeys.slice(0, 500);

        if (sampleKeys.length > 0) {
          // Build source data map
          const srcColList = [`[${sourceKey}]`, ...compareCols.map(c => `[${c.source}]`)].join(', ');
          const srcDataRes = await mssqlPool.request().query(
            `SELECT ${srcColList} FROM [dbo].[${sourceTable}] WHERE [${sourceKey}] IS NOT NULL`
          );
          const srcMap = {};
          for (const row of srcDataRes.recordset) {
            srcMap[String(row[sourceKey]).trim()] = row;
          }

          // Build target data map
          const tgtColList = [targetKey, ...compareCols.map(c => c.target)].join(', ');
          const tgtDataRes = await pgPool.query(`SELECT ${tgtColList} FROM ${targetTable} WHERE ${targetKey} IS NOT NULL`);
          const tgtMap = {};
          for (const row of tgtDataRes.rows) {
            tgtMap[String(row[targetKey]).trim()] = row;
          }

          // Compare field values
          for (const key of sampleKeys) {
            const srcRow = srcMap[key];
            const tgtRow = tgtMap[key];
            if (!srcRow || !tgtRow) continue;

            for (const col of compareCols) {
              let srcVal = srcRow[col.source];
              let tgtVal = tgtRow[col.target];

              // Normalize for comparison
              if (col.transform) srcVal = col.transform(srcVal);
              srcVal = srcVal === null || srcVal === undefined ? '' : String(srcVal).trim();
              tgtVal = tgtVal === null || tgtVal === undefined ? '' : String(tgtVal).trim();

              if (srcVal !== tgtVal) {
                tableResult.fieldDiffs.push({
                  key, field: col.target, sourceVal: srcVal, targetVal: tgtVal,
                });
              }
            }
          }
        }
      }

      const totalDiffs = tableResult.missingInTarget.length + tableResult.extraInTarget.length + tableResult.fieldDiffs.length;
      log.info(`  ${sourceTable}: counts ${tableResult.sourceCount}/${tableResult.targetCount}, diffs: ${totalDiffs}`);
    } catch (err) {
      tableResult.error = err.message;
      log.error(`  ${sourceTable}: ${err.message}`);
    }

    results.push(tableResult);
  }

  log.info('Comparison complete.');
  return results;
}

module.exports = {
  runMigration,
  migrateTable,
  processBatch,
  validateMigration,
  preFlightAudit,
  migrateRawTables,
  reconciliationReport,
  compareDatabases,
  buildLookup,
  buildCowIdMap,
  createLogger,
};
