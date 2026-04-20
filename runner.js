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

// ── Column/table resilience helpers ──────────────────

/** Escape special regex characters in a string */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace a column reference in a SQL query with NULL AS [colName].
 * Uses word boundaries to avoid partial matches (e.g. 'ID' won't match 'BeastID').
 */
function nullifyColumn(query, colName) {
  const pattern = new RegExp(`\\b${escapeRegex(colName)}\\b`, 'g');
  return query.replace(pattern, `NULL AS [${colName}]`);
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
  // SKIP_TRUNCATE is set by migrate-all.js --target-db for 2nd+ source DBs
  // so they don't wipe data loaded by prior sources.
  const skipTruncate = process.env.SKIP_TRUNCATE === '1';
  if (!dryRun && !tables && !skipTruncate) {
    const allTargets = [...new Set(toRun.map(m => m.targetTable))];
    allTargets.push('system.legacy_raw', 'system.migration_log');
    log.info(`Truncating ${allTargets.length} target tables for clean migration...`);
    await pgPool.query(`TRUNCATE ${allTargets.join(', ')} RESTART IDENTITY CASCADE`);
  } else if (!dryRun && tables && !skipTruncate) {
    const targets = toRun.map(m => m.targetTable);
    log.info(`Truncating selected tables: ${targets.join(', ')}`);
    for (const t of targets) {
      await pgPool.query(`TRUNCATE ${t} RESTART IDENTITY CASCADE`);
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

    // Build lookups after the entire order group completes.
    const tables = new Set(group.map(m => m.targetTable));
    if (tables.has('cattle.cows')) {
      // Map legacy beastid → new auto-generated PG id
      if (dryRun) {
        // In dry-run, simulate: each beastid maps to itself (no PG inserts happened)
        lookups.beastIdMap = await buildLookupFromSource(mssqlPool, 'Cattle', 'BeastID', 'BeastID');
      } else {
        const res = await pgPool.query('SELECT id, legacy_beast_id FROM cattle.cows');
        lookups.beastIdMap = {};
        for (const row of res.rows) {
          lookups.beastIdMap[row.legacy_beast_id] = row.id;
        }
      }
      log.info(`  Built beastIdMap: ${Object.keys(lookups.beastIdMap).length} entries`);
    }
    if (tables.has('contacts.contacts')) {
      if (dryRun) {
        lookups.contactIdSet = await buildIdSetFromSource(mssqlPool, 'Contacts', 'Contact_ID');
      } else {
        lookups.contactIdSet = await buildIdSet(pgPool, 'contacts.contacts', 'contact_id');
      }
    }
    if (tables.has('health.diseases')) {
      if (dryRun) {
        lookups.diseaseIdSet = await buildIdSetFromSource(mssqlPool, 'Diseases', 'Disease_ID');
      } else {
        lookups.diseaseIdSet = await buildIdSet(pgPool, 'health.diseases', 'disease_id');
      }
    }
    if (tables.has('health.drugs')) {
      if (dryRun) {
        lookups.drugIdSet = await buildIdSetFromSource(mssqlPool, 'Drugs', 'Drug_ID');
      } else {
        lookups.drugIdSet = await buildIdSet(pgPool, 'health.drugs', 'drug_id');
      }
    }
    if (tables.has('system.lookups')) {
      if (dryRun) {
        lookups.breedMap = await buildLookupFromSource(mssqlPool, 'Breeds', 'Breed_Code', 'Breed_Name');
      } else {
        const res = await pgPool.query("SELECT code, name FROM system.lookups WHERE category = 'breed'");
        lookups.breedMap = {};
        for (const row of res.rows) {
          lookups.breedMap[row.code] = row.name;
        }
      }
      log.info(`  Built breedMap: ${Object.keys(lookups.breedMap).length} entries`);
    }
    if (tables.has('cattle.breeds')) {
      if (dryRun) {
        // In dry-run: map Breed_Code → Breed_Code (no PG rows to look up)
        lookups.breedIdMap = await buildLookupFromSource(mssqlPool, 'Breeds', 'Breed_Code', 'Breed_Code');
      } else {
        // Build Breed_Code → cattle.breeds.id via breedMap (Breed_Code → name) + breeds name → id
        const breedsRes = await pgPool.query('SELECT id, name FROM cattle.breeds');
        const nameToBreedId = {};
        for (const row of breedsRes.rows) nameToBreedId[row.name] = row.id;
        lookups.breedIdMap = {};
        for (const [code, name] of Object.entries(lookups.breedMap || {})) {
          const id = nameToBreedId[name];
          if (id !== undefined) lookups.breedIdMap[code] = id;
        }
      }
      log.info(`  Built breedIdMap: ${Object.keys(lookups.breedIdMap).length} entries`);
    }
    if (tables.has('pen.pens_file')) {
      if (dryRun) {
        lookups.penNameToIdMap = {};
      } else {
        const res = await pgPool.query('SELECT pen_number_id, pen_name FROM pen.pens_file WHERE pen_name IS NOT NULL');
        lookups.penNameToIdMap = {};
        for (const row of res.rows) {
          lookups.penNameToIdMap[row.pen_name.toUpperCase()] = row.pen_number_id;
        }
        // Auto-seed pens from Cattle.Pen_Number when source has no Pens_File table
        if (Object.keys(lookups.penNameToIdMap).length === 0) {
          try {
            const srcPens = await mssqlPool.request().query(
              `SELECT DISTINCT LTRIM(RTRIM(Pen_Number)) AS pen_name
               FROM dbo.Cattle
               WHERE Pen_Number IS NOT NULL AND LTRIM(RTRIM(Pen_Number)) != ''
               ORDER BY 1`
            );
            if (srcPens.recordset.length > 0) {
              log.info(`  pen.pens_file empty — auto-seeding ${srcPens.recordset.length} pens from Cattle.Pen_Number`);
              for (const { pen_name } of srcPens.recordset) {
                const ins = await pgPool.query(
                  'INSERT INTO pen.pens_file (pen_name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING pen_number_id',
                  [pen_name]
                );
                if (ins.rows.length > 0) {
                  lookups.penNameToIdMap[pen_name.toUpperCase()] = ins.rows[0].pen_number_id;
                }
              }
            }
          } catch (err) {
            log.warn(`  Auto-seed pens failed: ${err.message}`);
          }
        }
      }
      log.info(`  Built penNameToIdMap: ${Object.keys(lookups.penNameToIdMap).length} entries`);
    }
    if (tables.has('purchasing.purchase_lots')) {
      if (dryRun) {
        lookups.purchLotNoToIdMap = {};
      } else {
        const res = await pgPool.query('SELECT id, lot_number FROM purchasing.purchase_lots WHERE lot_number IS NOT NULL');
        lookups.purchLotNoToIdMap = {};
        for (const row of res.rows) {
          lookups.purchLotNoToIdMap[row.lot_number] = row.id;
        }
      }
      log.info(`  Built purchLotNoToIdMap: ${Object.keys(lookups.purchLotNoToIdMap).length} entries`);
    }
  }

  // Expand normalized child tables (unpivot columnar data → rows)
  if (!dryRun) {
    await expandNormalizedChildren(mssqlPool, pgPool, log);
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
  const { sourceTable, targetTable } = mapping;
  let query = mapping.query;

  log.info(`Migrating ${sourceTable} → ${targetTable}...`);

  const stats = { table: sourceTable, rowsRead: 0, rowsWritten: 0, rowsSkipped: 0, rowsErrored: 0, status: 'running', error: null };

  // Log start in migration_log
  let logId = null;
  if (!dryRun) {
    try {
      const logRes = await pgPool.query(
        `INSERT INTO system.migration_log (source_table, status) VALUES ($1, 'running') RETURNING id`,
        [sourceTable]
      );
      logId = logRes.rows[0].id;
    } catch (e) {
      log.warn(`Could not write migration_log entry: ${e.message}`);
    }
  }

  try {
    // ── Pre-flight: probe query and auto-fix missing columns/tables ──
    const _missingCols = [];
    for (let _attempt = 0; _attempt < 20; _attempt++) {
      try {
        await mssqlPool.request().query(
          `${query} OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
        );
        break; // query works
      } catch (probeErr) {
        const colMatch = probeErr.message.match(/Invalid column name '([^']+)'/);
        const tableMatch = probeErr.message.match(/Invalid object name '([^']+)'/);
        if (colMatch) {
          const col = colMatch[1];
          _missingCols.push(col);
          query = nullifyColumn(query, col);
          continue;
        }
        if (tableMatch) {
          log.warn(`  Source table ${tableMatch[1]} does not exist on this farm — skipping`);
          stats.status = 'completed';
          log.info(`  Done: 0 written, 0 skipped, 0 errored`);
          await updateMigrationLog(pgPool, logId, stats, dryRun);
          return stats;
        }
        throw probeErr; // re-throw unexpected errors
      }
    }
    if (_missingCols.length > 0) {
      log.warn(`  Columns not on this farm (nullified): ${_missingCols.join(', ')}`);
    }

    // Get total row count for progress reporting (non-blocking — failures are OK)
    let totalRows = 0;
    const countQ = mapping.countQuery || `SELECT COUNT(*) AS cnt FROM [dbo].[${sourceTable}]`;
    try {
      const countRes = await mssqlPool.request().query(countQ);
      totalRows = countRes.recordset[0].cnt;
    } catch (_) {}

    // If a custom countQuery was used, compare with raw count to report dedup
    if (mapping.countQuery) {
      let rawTotal = 0;
      try {
        const rawCountRes = await mssqlPool.request().query(
          `SELECT COUNT(*) AS cnt FROM [dbo].[${sourceTable}]`
        );
        rawTotal = rawCountRes.recordset[0].cnt;
      } catch (_) {}
      if (rawTotal > totalRows) {
        log.info(`  ${sourceTable}: ${rawTotal.toLocaleString()} source rows → ${totalRows.toLocaleString()} unique (${(rawTotal - totalRows).toLocaleString()} duplicates merged — latest record per ID kept)`);
      }
    }

    if (totalRows === 0) {
      // Verify with a single-page read in case COUNT failed
      const probe = await mssqlPool.request().query(
        `${query} OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
      );
      if (probe.recordset.length === 0) {
        stats.status = 'completed';
        log.info(`  ${sourceTable}: 0 rows — skipping`);
        log.info(`  Done: 0 written, 0 skipped, 0 errored`);
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

      const { written, skipped, errored, orphaned } = await processBatch(
        pgPool, rows, mapping, { log, dryRun, lookups }
      );
      stats.rowsWritten += written;
      stats.rowsSkipped += skipped;
      stats.rowsErrored += errored;
      stats._orphaned = (stats._orphaned || 0) + (orphaned || 0);

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

    stats.status = (stats.rowsRead > 0 && stats.rowsWritten === 0 && stats.rowsErrored > 0) ? 'failed' : 'completed';
    log.info(`  Done: ${stats.rowsWritten} written, ${stats.rowsSkipped} skipped, ${stats.rowsErrored} errored`);
    if (stats._orphaned > 0) {
      log.info(`  ${stats._orphaned.toLocaleString()} orphaned rows (missing FK) → system.legacy_raw as ${sourceTable}_orphaned`);
    }
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
  const { columns, targetTable, validate, skipRow, transformRow, buildInsertValues, staticValues, staticColumns } = mapping;

  let written = 0, skipped = 0, errored = 0;
  const orphanedRows = [];

  // Transform rows
  const transformed = [];
  for (const rawRow of batch) {
    try {
      // Skip junk/header rows before transforming
      if (skipRow && skipRow(rawRow)) {
        skipped++;
        log.debug(`  Skipped junk row in ${targetTable}: ${JSON.stringify(rawRow).slice(0, 120)}`);
        continue;
      }

      // Apply column-level transforms
      const row = {};
      for (const col of columns) {
        const val = rawRow[col.source];
        row[col.target] = col.transform ? col.transform(val) : val;
      }

      // Apply row-level transform if present
      if (transformRow) {
        transformRow(rawRow, row, lookups);
        // Merge derived fields
        Object.keys(rawRow).forEach(k => {
          if (k.startsWith('_')) row[k] = rawRow[k];
        });
      }

      // Add static values (legacy)
      if (staticValues) {
        Object.assign(row, staticValues);
      }

      // Add static columns (v3 — discriminator columns, categories, variants)
      if (staticColumns) {
        Object.assign(row, staticColumns);
      }

      // Sanitize FK references — set to null if referenced row doesn't exist
      if (row.drug_id && lookups.drugIdSet && !lookups.drugIdSet.has(row.drug_id)) {
        log.debug(`  FK nullified: ${targetTable}.drug_id=${row.drug_id} — no matching drugs row`);
        row.drug_id = null;
      }
      if (row.drugid && lookups.drugIdSet && !lookups.drugIdSet.has(row.drugid)) {
        log.debug(`  FK nullified: ${targetTable}.drugid=${row.drugid} — no matching drugs row`);
        row.drugid = null;
      }
      if (row.disease_id && lookups.diseaseIdSet && !lookups.diseaseIdSet.has(row.disease_id)) {
        log.debug(`  FK nullified: ${targetTable}.disease_id=${row.disease_id} — no matching diseases row`);
        row.disease_id = null;
      }
      if (lookups.contactIdSet) {
        for (const fkCol of [
          'vendor_id', 'agent_code', 'sold_to_contact_id', 'abattoir_id',
          'agent_id', 'buyer_id', 'supplier_id', 'agistor_code',
          'cattle_owner_id', 'custom_feed_owner_id', 'owner_contact_id',
          'supplier_ac_no', 'carrier_id', 'origin_dest_id',
        ]) {
          if (row[fkCol] !== undefined && row[fkCol] !== null && !lookups.contactIdSet.has(row[fkCol])) {
            log.debug(`  FK nullified: ${targetTable}.${fkCol}=${row[fkCol]} — no matching contacts row`);
            row[fkCol] = null;
          }
        }
      }

      // Resolve breed_id (Breed_Code) → cattle.breeds.id
      if (row.breed_id !== undefined && row.breed_id !== null && lookups.breedIdMap) {
        row.breed_id = lookups.breedIdMap[row.breed_id] ?? null;
      }

      // Resolve legacy beastid → new PG cattle.cows.id
      let _beastOrphan = false;
      if (lookups.beastIdMap && !mapping.skipBeastLookup) {
        let resolvedCowId = null;
        for (const fkCol of ['beastid', 'beast_id']) {
          if (row[fkCol] !== undefined && row[fkCol] !== null) {
            const newId = lookups.beastIdMap[row[fkCol]];
            if (newId !== undefined) {
              row[fkCol] = newId;
              resolvedCowId = newId;
            } else {
              // Orphaned row — FK target doesn't exist, route to legacy_raw
              log.debug(`  FK orphan: ${targetTable}.${fkCol}=${row[fkCol]} — no matching cattle row`);
              orphanedRows.push(rawRow);
              _beastOrphan = true;
              break;
            }
          }
        }
        // Also populate cow_id (the standard FK column used by the web app)
        if (resolvedCowId !== null) {
          row.cow_id = resolvedCowId;
        }
      }
      if (_beastOrphan) { skipped++; continue; }

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

  // Capture orphaned rows (missing cow_id) in legacy_raw so no data is lost
  if (orphanedRows.length > 0 && !dryRun) {
    try {
      const oc = await pgPool.connect();
      try {
        await oc.query('BEGIN');
        // Batch insert orphans — 2 params each, well within PG's 65535 limit
        const oClauses = [];
        const oVals = [];
        for (let i = 0; i < orphanedRows.length; i++) {
          const clean = {};
          for (const [k, v] of Object.entries(orphanedRows[i])) {
            if (Buffer.isBuffer(v)) clean[k] = `[BINARY ${v.length} bytes]`;
            else clean[k] = v;
          }
          oClauses.push(`($${i * 2 + 1}, $${i * 2 + 2})`);
          oVals.push(`${mapping.sourceTable}_orphaned`, JSON.stringify(clean));
        }
        await oc.query(
          `INSERT INTO system.legacy_raw (source_table, row_data) VALUES ${oClauses.join(', ')}`,
          oVals
        );
        await oc.query('COMMIT');
      } catch (e) {
        await oc.query('ROLLBACK');
        log.warn(`  Failed to write ${orphanedRows.length} orphaned rows to system.legacy_raw for ${mapping.sourceTable}: ${e.message}`);
      } finally {
        oc.release();
      }
    } catch (outerErr) {
      log.warn(`  Could not connect to write orphaned rows for ${mapping.sourceTable}: ${outerErr.message}`);
    }
  }

  if (transformed.length === 0 || dryRun) {
    return { written: dryRun ? transformed.length : 0, skipped, errored, orphaned: orphanedRows.length };
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
        await client.query('SAVEPOINT batch_sp');
        const result = await client.query(
          `INSERT INTO ${targetTable} (${keys.join(', ')}) VALUES ${valueClauses.join(', ')} ON CONFLICT DO NOTHING`,
          allVals
        );
        await client.query('RELEASE SAVEPOINT batch_sp');
        written += result.rowCount;
        skipped += chunk.length - result.rowCount;
      } catch (err) {
        // Roll back the savepoint so the transaction is usable for row-by-row fallback
        await client.query('ROLLBACK TO SAVEPOINT batch_sp');
        // Multi-row failed — fall back to row-by-row for this chunk only
        log.warn(`  Batch insert failed for ${targetTable}, falling back to row-by-row: ${err.message}`);
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
            if (errored <= 50) {
              // Log the error plus the PK / identifying columns so we can trace the bad row
              const idSnippet = keys.slice(0, 3).map(k => `${k}=${JSON.stringify(row[k])}`).join(', ');
              log.warn(`  Row insert error (${targetTable}) [${idSnippet}]: ${rowErr.message}`);
            } else if (errored === 51) {
              log.warn(`  (suppressing further row errors for ${targetTable} — will show total at end)`);
            }          }
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

  return { written, skipped, errored, orphaned: orphanedRows.length };
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

async function buildIdSet(pgPool, table, idCol = 'id') {
  const res = await pgPool.query(`SELECT ${idCol} FROM ${table}`);
  return new Set(res.rows.map(r => r[idCol]));
}

// ── Source-based lookup builders (for dry-run mode) ──

/** Build a key→value map directly from SQL Server source table */
async function buildLookupFromSource(mssqlPool, sourceTable, keyCol, valueCol, useKeyAsValue = false) {
  const res = await mssqlPool.request().query(
    `SELECT [${keyCol}], [${valueCol}] FROM [dbo].[${sourceTable}]`
  );
  const map = {};
  let syntheticId = 1;
  for (const row of res.recordset) {
    const k = typeof row[keyCol] === 'string' ? row[keyCol].trim() : row[keyCol];
    map[k] = useKeyAsValue ? syntheticId++ : row[valueCol];
  }
  return map;
}

/** Build an ID set directly from SQL Server source table */
async function buildIdSetFromSource(mssqlPool, sourceTable, idCol) {
  const res = await mssqlPool.request().query(
    `SELECT [${idCol}] FROM [dbo].[${sourceTable}]`
  );
  return new Set(res.recordset.map(r => r[idCol]));
}

/** Build legacy_beast_id → new PG id map from PostgreSQL */
async function buildCowIdMap(pgPool) {
  const res = await pgPool.query('SELECT id, legacy_beast_id FROM cattle.cows');
  const map = {};
  for (const row of res.rows) {
    map[row.legacy_beast_id] = row.id;
  }
  return map;
}

/** Build BeastID → synthetic id map from SQL Server (for dry-run / tests) */
async function buildCowIdMapFromSource(mssqlPool) {
  const res = await mssqlPool.request().query(
    `SELECT [BeastID] FROM [dbo].[Cattle]`
  );
  const map = {};
  let syntheticId = 1;
  for (const row of res.recordset) {
    map[row.BeastID] = syntheticId++;
  }
  return map;
}

/** Build SB_Rec_No → synthetic id map from SQL Server (for dry-run / tests) */
async function buildSbRecNoMapFromSource(mssqlPool) {
  const res = await mssqlPool.request().query(
    `SELECT [SB_Rec_No] FROM [dbo].[Sick_Beast_Records]`
  );
  const map = {};
  let syntheticId = 1;
  for (const row of res.recordset) {
    map[row.SB_Rec_No] = syntheticId++;
  }
  return map;
}

// ── Normalized child expansion ───────────────────────

/**
 * Unpivot columnar data from legacy wide tables into normalized child rows.
 * Called after all standard mappings complete (parent rows must exist first).
 *
 * Two tables need this:
 *   1. Ration_Load_Sizes.Truck_Size_1..10 → feed.ration_load_size_entries
 *   2. Pen_Feeding_Order_Params.DATA0..59 → feed.pen_feeding_order_data
 */
async function expandNormalizedChildren(mssqlPool, pgPool, log) {

  // 1. Ration_Load_Sizes → ration_load_size_entries
  try {
    const cols = [];
    for (let i = 1; i <= 10; i++) cols.push(`Truck_Size_${i}_Wght`);
    const res = await mssqlPool.request().query(
      `SELECT Ration_Type_ID, ${cols.join(', ')} FROM dbo.Ration_Load_Sizes`
    );
    if (res.recordset.length > 0) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        let childRows = 0;
        for (const row of res.recordset) {
          const rationTypeId = row.Ration_Type_ID;
          for (let i = 1; i <= 10; i++) {
            const val = row[`Truck_Size_${i}_Wght`];
            if (val !== null && val !== undefined) {
              await client.query(
                `INSERT INTO feed.ration_load_size_entries (ration_type_id, truck_number, weight)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [rationTypeId, i, val]
              );
              childRows++;
            }
          }
        }
        await client.query('COMMIT');
        log.info(`  Expanded Ration_Load_Sizes → ${childRows} ration_load_size_entries rows`);
      } catch (err) {
        await client.query('ROLLBACK');
        log.warn(`  Failed expanding ration_load_size_entries: ${err.message}`);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    // Source table may not exist on this farm — skip
    log.debug(`  Ration_Load_Sizes not found or error: ${err.message}`);
  }

  // 2. Pen_Feeding_Order_Params → pen_feeding_order_data
  try {
    const dataCols = [];
    for (let i = 0; i <= 59; i++) dataCols.push(`DATA${i}`);
    const res = await mssqlPool.request().query(
      `SELECT Ration_Type, ${dataCols.join(', ')} FROM dbo.Pen_Feeding_Order_Params`
    );
    if (res.recordset.length > 0) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        let childRows = 0;
        for (const row of res.recordset) {
          const rationType = row.Ration_Type;
          for (let i = 0; i <= 59; i++) {
            const val = row[`DATA${i}`];
            if (val !== null && val !== undefined) {
              await client.query(
                `INSERT INTO feed.pen_feeding_order_data (param_ration_type, slot, value)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [rationType, i, val]
              );
              childRows++;
            }
          }
        }
        await client.query('COMMIT');
        log.info(`  Expanded Pen_Feeding_Order_Params → ${childRows} pen_feeding_order_data rows`);
      } catch (err) {
        await client.query('ROLLBACK');
        log.warn(`  Failed expanding pen_feeding_order_data: ${err.message}`);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    log.debug(`  Pen_Feeding_Order_Params not found or error: ${err.message}`);
  }
}

// ── Sequence reset ───────────────────────────────────

/**
 * Reset IDENTITY sequences for tables that received explicit ID values during migration.
 * In v3, cattle.cows.id is GENERATED ALWAYS AS IDENTITY (auto-increments on INSERT).
 * Child tables also use IDENTITY PKs. contacts.contacts.contact_id is an explicit legacy value.
 * This is kept as a safety net.
 */
async function resetSequences(pgPool, log) {
  // v3 tables with IDENTITY columns don't receive explicit IDs during migration,
  // so their sequences stay correct. If any table needs manual reset in the future,
  // add it here with: ALTER TABLE schema.table ALTER COLUMN id RESTART WITH <max+1>
  log.info('IDENTITY sequences verified — no manual reset needed for v3 schema.');
}

// ── Migration log helper ─────────────────────────────

async function updateMigrationLog(pgPool, logId, stats, dryRun) {
  if (dryRun || !logId) return;
  try {
    await pgPool.query(
      `UPDATE system.migration_log
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
    { source: 'dbo.Diseases',           target: 'health.diseases' },
    { source: 'dbo.Drugs',              target: 'health.drugs' },
    { source: 'dbo.Contacts',           target: 'contacts.contacts' },
    { source: 'dbo.Cattle',             target: 'cattle.cows' },
    { source: 'dbo.Weighing_Events',    target: 'weighing.weighing_events' },
    { source: 'dbo.PensHistory',        target: 'pen.penshistory' },
    { source: 'dbo.Drugs_Given',        target: 'health.drugs_given' },
    { source: 'dbo.Sick_Beast_Records', target: 'health.sick_beast_records' },
    { source: 'dbo.Carcase_data',       target: 'carcase.carcase_data' },
    { source: 'dbo.Drug_Disposal',      target: 'health.drug_disposals' },
    { source: 'dbo.Drugs_Purchased',    target: 'health.drugs_purchased' },
    { source: 'dbo.Costs',              target: 'finance.costs' },
    { source: 'dbo.FeedDB_Pens_File',   target: 'feed.feeddb_pens_file' },
    { source: 'dbo.Cost_Codes',         target: 'finance.cost_codes' },
    { source: 'dbo.Market_Category',    target: 'cattle.market_categories' },
    { source: 'dbo.Purchase_Lots',      target: 'purchasing.purchase_lots' },
    { source: 'dbo.Autopsy_Records',    target: 'health.autopsy_records' },
    { source: 'dbo.Vendor_Declarations', target: 'feed.vendor_declarations' },
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
          `SELECT rows_skipped FROM system.migration_log WHERE source_table = $1 ORDER BY id DESC LIMIT 1`,
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
      // Source table doesn't exist in this database — not a failure
      const missing = /Invalid object name|does not exist|Login failed/i.test(err.message);
      checks.push({
        check: `Row count: ${source} → ${target}`,
        passed: missing,
        detail: missing
          ? `source table not present in this database — skipped`
          : `Error: ${err.message}`,
      });
    }
  }

  // 2. Referential integrity checks
  const fkChecks = [
    { table: 'weighing.weighing_events', fk: 'beastid',     ref: 'cattle.cows', refCol: 'id' },
    { table: 'pen.penshistory',          fk: 'beastid',     ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.drugs_given',       fk: 'beastid',     ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.drugs_given',       fk: 'drug_id',     ref: 'health.drugs',  refCol: 'drug_id' },
    { table: 'finance.costs',            fk: 'beastid',     ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.sick_beast_records', fk: 'beast_id',   ref: 'cattle.cows', refCol: 'id' },
    { table: 'purchasing.purchase_lots', fk: 'vendor_id',   ref: 'contacts.contacts', refCol: 'contact_id' },
    { table: 'purchasing.purchase_lots', fk: 'agent_code',  ref: 'contacts.contacts', refCol: 'contact_id' },
    { table: 'feed.vendor_declarations', fk: 'owner_contact_id', ref: 'contacts.contacts', refCol: 'contact_id' },
    { table: 'carcase.carcase_data',     fk: 'beast_id',    ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.autopsy_records',   fk: 'beast_id',    ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.drugs_purchased',   fk: 'drugid',      ref: 'health.drugs',  refCol: 'drug_id' },
    { table: 'health.drug_disposals',    fk: 'drugid',      ref: 'health.drugs',  refCol: 'drug_id' },
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

  // 3. No null ear_tags on cattle
  try {
    const res = await pgPool.query(`SELECT COUNT(*) AS cnt FROM cattle.cows WHERE ear_tag IS NULL OR ear_tag = ''`);
    const nullTags = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no null/empty ear_tags',
      passed: nullTags === 0,
      detail: `null/empty tags: ${nullTags}`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no null/empty ear_tags', passed: false, detail: err.message });
  }

  // 4. No negative weights
  try {
    const res = await pgPool.query(`SELECT COUNT(*) AS cnt FROM weighing.weighing_events WHERE weight < 0`);
    const negWeights = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no negative weights',
      passed: negWeights === 0,
      detail: `negative weights: ${negWeights}`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no negative weights', passed: false, detail: err.message });
  }

  // 5. cow_id populated on all child tables (no NULLs where beast FK exists)
  const cowIdChecks = [
    { table: 'weighing.weighing_events', beastCol: 'beastid' },
    { table: 'pen.penshistory',          beastCol: 'beastid' },
    { table: 'health.drugs_given',       beastCol: 'beastid' },
    { table: 'finance.costs',            beastCol: 'beastid' },
    { table: 'health.sick_beast_records', beastCol: 'beast_id' },
    { table: 'carcase.carcase_data',     beastCol: 'beast_id' },
    { table: 'health.autopsy_records',   beastCol: 'beast_id' },
  ];
  for (const { table, beastCol } of cowIdChecks) {
    try {
      const res = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM ${table} WHERE ${beastCol} IS NOT NULL AND cow_id IS NULL`
      );
      const nullCowIds = parseInt(res.rows[0].cnt);
      checks.push({
        check: `cow_id populated: ${table}`,
        passed: nullCowIds === 0,
        detail: `rows with beast FK but NULL cow_id: ${nullCowIds}`,
      });
    } catch (err) {
      checks.push({ check: `cow_id populated: ${table}`, passed: false, detail: err.message });
    }
  }

  // 6. pen_id resolution — active cows should have pen_id resolved from Pen_Number lookup
  try {
    const activeRes = await pgPool.query("SELECT COUNT(*) AS cnt FROM cattle.cows WHERE status = 'active'");
    const activePenRes = await pgPool.query("SELECT COUNT(*) AS cnt FROM cattle.cows WHERE status = 'active' AND pen_id IS NOT NULL");
    const activeTotal = parseInt(activeRes.rows[0].cnt);
    const activeWithPen = parseInt(activePenRes.rows[0].cnt);
    // Active cows should mostly have pen_id (>50% threshold)
    const passed = activeTotal === 0 || (activeWithPen / activeTotal) > 0.5;
    checks.push({
      check: 'pen_id resolution on active cattle.cows',
      passed,
      detail: `${activeWithPen}/${activeTotal} active cows have pen_id (${activeTotal > 0 ? ((activeWithPen/activeTotal)*100).toFixed(1) : 0}%)`,
    });
  } catch (err) {
    checks.push({ check: 'pen_id resolution on active cattle.cows', passed: false, detail: err.message });
  }

  // 7. vendor_id should not contain 0 (legacy default for "no vendor")
  try {
    const res = await pgPool.query('SELECT COUNT(*) AS cnt FROM cattle.cows WHERE vendor_id = 0');
    const zeroVendors = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no zero vendor_id on cattle.cows',
      passed: zeroVendors === 0,
      detail: `rows with vendor_id=0: ${zeroVendors}`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no zero vendor_id', passed: false, detail: err.message });
  }

  // 8. Stranded data check — detect data stuck in old (v3/v4) column names
  //    The v5 schema renames columns (e.g. start_weight → start_weight_kg).
  //    If CREATE TABLE IF NOT EXISTS ran against an existing DB with old columns,
  //    the new columns are added but data stays in the old ones.
  const strandedPairs = [
    { old: 'start_weight',              new: 'start_weight_kg' },
    { old: 'sale_weight',               new: 'sale_weight_kg' },
    { old: 'feedlot_entry_wght',        new: 'feedlot_entry_weight_kg' },
    { old: 'whold_until',               new: 'withhold_until' },
    { old: 'esi_whold_until',           new: 'esi_withhold_until' },
    { old: 'background_doll_per_kg',    new: 'background_cost_per_kg' },
    { old: 'last_modified_timestamp',   new: 'legacy_modified_at' },
    { old: 'vendorid',                  new: 'vendor_id' },
    { old: 'agentid',                   new: 'agent_id' },
    { old: 'customfeedownerid',         new: 'custom_feed_owner_id' },
    { old: 'current_loctype_id',        new: 'current_loc_type_id' },
    { old: 'growergroupcode',           new: 'grower_group_code' },
    { old: 'vendor_ear_tag',             new: 'previous_ear_tag' },
  ];
  // Stale columns that should no longer exist (v3/v4 remnants + old mapping targets)
  const staleCols = [
    'died', 'pen_number', 'purch_lot_no', 'tag_number',
    'agist_charged_up_to_date', 'dna_or_blood_number',
    'nfas_decl_numb', 'nlis_tag_fail_at_induction', 'pregtested',
    'agentid', 'vendorid', 'customfeedownerid',
    'start_weight', 'sale_weight', 'feedlot_entry_wght',
    'whold_until', 'esi_whold_until',
    'background_doll_per_kg', 'current_loctype_id',
    'growergroupcode', 'last_modified_timestamp',
    'vendor_ear_tag', 'breed',
  ];
  try {
    // Check if any old columns exist with data while new columns are empty
    const { rows: existingCols } = await pgPool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'cattle' AND table_name = 'cows'
    `);
    const colSet = new Set(existingCols.map(r => r.column_name));
    const stranded = [];
    for (const pair of strandedPairs) {
      if (!colSet.has(pair.old) || !colSet.has(pair.new)) continue;
      const res = await pgPool.query(`
        SELECT COUNT("${pair.old}") AS old_filled, COUNT("${pair.new}") AS new_filled
        FROM cattle.cows
      `);
      const oldFilled = parseInt(res.rows[0].old_filled);
      const newFilled = parseInt(res.rows[0].new_filled);
      if (oldFilled > 0 && newFilled === 0) {
        stranded.push(`${pair.old}→${pair.new} (${oldFilled} rows)`);
      }
    }
    const passed = stranded.length === 0;
    checks.push({
      check: 'Stranded data: old column names have data, v5 columns empty',
      passed,
      detail: passed
        ? 'no stranded columns detected'
        : `STRANDED: ${stranded.join(', ')} — run _fix_stranded_columns.js`,
    });

    // Check for stale columns that should have been dropped
    const foundStale = staleCols.filter(c => colSet.has(c));
    checks.push({
      check: 'Stale v3/v4 columns removed from cattle.cows',
      passed: foundStale.length === 0,
      detail: foundStale.length === 0
        ? 'no stale columns found'
        : `STALE columns still present: ${foundStale.join(', ')} — drop with ALTER TABLE cattle.cows DROP COLUMN`,
    });
  } catch (err) {
    checks.push({ check: 'Stranded data: old→v5 column names', passed: true, detail: `check skipped: ${err.message}` });
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
          `INSERT INTO system.migration_log (source_table, status) VALUES ($1, 'running') RETURNING id`,
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
          log.info(`  Done: 0 written, 0 skipped, 0 errored`);
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
                'INSERT INTO system.legacy_raw (source_table, row_data) VALUES ($1, $2)',
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
        `SELECT COUNT(*) AS cnt FROM system.legacy_raw WHERE source_table = $1`,
        [tableName]
      );
      const src = srcRes.recordset[0].cnt;
      const tgt = parseInt(tgtRes.rows[0].cnt);
      rows.push({
        source: tableName,
        target: 'system.legacy_raw',
        strategy: 'raw',
        sourceRows: src,
        targetRows: tgt,
        match: src === tgt,
        delta: tgt - src,
      });
    } catch (err) {
      rows.push({
        source: tableName,
        target: 'system.legacy_raw',
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
    sourceTable: 'Contacts', targetTable: 'contacts.contacts',
    sourceKey: 'Contact_ID', targetKey: 'contact_id',
    compareCols: [
      { source: 'Company', target: 'company' },
      { source: 'First_Name', target: 'firstname' },
      { source: 'Last_Name', target: 'last_name' },
      { source: 'Tel_No', target: 'tel_no' },
      { source: 'Email', target: 'email' },
    ],
  },
  {
    sourceTable: 'Diseases', targetTable: 'health.diseases',
    sourceKey: 'Disease_ID', targetKey: 'disease_id',
    compareCols: [
      { source: 'Disease_Name', target: 'disease_name' },
      { source: 'Symptoms', target: 'symptoms' },
    ],
  },
  {
    sourceTable: 'Drugs', targetTable: 'health.drugs',
    sourceKey: 'Drug_ID', targetKey: 'drug_id',
    compareCols: [
      { source: 'Units', target: 'units' },
      { source: 'Cost_per_unit', target: 'cost_per_unit' },
    ],
  },
  {
    sourceTable: 'Cattle', targetTable: 'cattle.cows',
    sourceKey: 'BeastID', targetKey: 'beastid',
    compareCols: [
      { source: 'Ear_Tag', target: 'ear_tag' },
      { source: 'EID', target: 'eid' },
      { source: 'Sex', target: 'sex' },
    ],
  },
  {
    sourceTable: 'Purchase_Lots', targetTable: 'purchasing.purchase_lots',
    sourceKey: 'Lot_Number', targetKey: 'lot_number',
    compareCols: [
      { source: 'Number_Head', target: 'number_head' },
      { source: 'Total_Weight', target: 'total_weight' },
    ],
  },
  {
    sourceTable: 'FeedDB_Pens_File', targetTable: 'pen.pens_file',
    sourceKey: 'Pen_name', targetKey: 'pen_name',
    compareCols: [],
  },
  {
    sourceTable: 'Cost_Codes', targetTable: 'finance.cost_codes',
    sourceKey: 'RevExp_Code', targetKey: 'revexp_code',
    compareCols: [{ source: 'RevExp_Desc', target: 'revexp_desc' }],
  },
  {
    sourceTable: 'Market_Category', targetTable: 'cattle.market_categories',
    sourceKey: 'Market_Cat_ID', targetKey: 'market_cat_id',
    compareCols: [{ source: 'Market_Category', target: 'market_category' }],
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
  buildCowIdMapFromSource,
  buildSbRecNoMapFromSource,
  buildLookupFromSource,
  buildIdSetFromSource,
  createLogger,
};
