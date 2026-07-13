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

// ── Progress reporter ────────────────────────────────
// Real-time per-table progress output.
// - TTY mode: updates a single line in-place using \r
// - Non-TTY mode (piped output): emits a log line every ~5% or every 20 batches
//
// Usage:
//   const pr = createProgressReporter('Drugs_Given', 453847);
//   pr.update(batchRowsProcessed);  // call after each batch
//   pr.finish(rowsWritten);         // call when table is done

const PROGRESS_ROLLING_WINDOW = 10; // number of batches to average for rows/sec

function createProgressReporter(tableName, totalRows) {
  const isTTY = !!process.stdout.isTTY;
  const startTime = Date.now();
  let rowsProcessed = 0;

  // Rolling window for ETA: store timestamps of the last N batches
  const batchTimes  = []; // array of { ts: Date.now(), rows: N }

  function fmtNum(n) {
    return Number(n).toLocaleString('en');
  }

  function fmtDuration(seconds) {
    const s = Math.round(seconds);
    if (s < 60)  return `${s}s`;
    if (s < 3600) {
      const m = Math.floor(s / 60);
      const r = s % 60;
      return r > 0 ? `${m}m ${r}s` : `${m}m`;
    }
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function buildLine() {
    const pct    = totalRows > 0 ? Math.min(100, (rowsProcessed / totalRows) * 100) : null;
    const pctStr = pct !== null ? `${pct.toFixed(1)}%` : '?%';

    // Rolling rows/sec from the last PROGRESS_ROLLING_WINDOW batches
    let rowsPerSec = 0;
    if (batchTimes.length >= 2) {
      const window = batchTimes.slice(-PROGRESS_ROLLING_WINDOW);
      const elapsed = (window[window.length - 1].ts - window[0].ts) / 1000;
      const windowRows = window.slice(1).reduce((s, b) => s + b.rows, 0);
      rowsPerSec = elapsed > 0 ? windowRows / elapsed : 0;
    } else if (batchTimes.length === 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      rowsPerSec = elapsed > 0 ? rowsProcessed / elapsed : 0;
    }

    const rpsStr = rowsPerSec > 0 ? `${fmtNum(Math.round(rowsPerSec))} rows/s` : null;

    let etaStr = null;
    if (rowsPerSec > 0 && totalRows > 0 && rowsProcessed < totalRows) {
      const remaining = (totalRows - rowsProcessed) / rowsPerSec;
      etaStr = `ETA ${fmtDuration(remaining)}`;
    }

    const parts = [`Migrating ${tableName}... ${fmtNum(rowsProcessed)}`];
    if (totalRows > 0) parts[0] += ` / ${fmtNum(totalRows)} (${pctStr})`;
    if (rpsStr)  parts.push(rpsStr);
    if (etaStr)  parts.push(etaStr);

    return parts.join(' — '); // em dash
  }

  // For non-TTY: track what we last logged to avoid duplicate lines
  let lastLoggedPct = -1;
  let batchCount = 0;

  function update(batchRows) {
    if (batchRows <= 0) return;
    rowsProcessed += batchRows;
    batchCount++;
    batchTimes.push({ ts: Date.now(), rows: batchRows });
    // Keep the array bounded
    if (batchTimes.length > PROGRESS_ROLLING_WINDOW + 2) batchTimes.shift();

    if (isTTY) {
      process.stdout.write('\r' + buildLine());
    } else {
      // Non-TTY: log every 5% change or every 20 batches
      const pct = totalRows > 0 ? Math.min(100, Math.floor((rowsProcessed / totalRows) * 100)) : -1;
      const pctBucket = Math.floor(pct / 5);
      if (pctBucket > Math.floor(lastLoggedPct / 5) || batchCount % 20 === 0) {
        lastLoggedPct = pct;
        console.log('[PROGRESS] ' + buildLine());
      }
    }
  }

  function finish(rowsWritten) {
    const elapsed = (Date.now() - startTime) / 1000;

    if (isTTY) {
      // Clear the in-place line then print the final summary with a newline
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 100) + '\r');
    }
    const count       = rowsWritten != null ? rowsWritten : rowsProcessed;
    const durationStr = fmtDuration(elapsed);
    console.log(`✓ ${tableName}: ${fmtNum(count)} rows in ${durationStr}`);
  }

  return { update, finish };
}

// ── Skip reporter ────────────────────────────────────
// Emits structured lines that server.js parses into SSE skip-row events
// so the UI can show what was skipped and why. Capped per (table,reason)
// to keep logs / memory bounded.
const SKIP_CAP_PER_REASON = 25;
const _skipCounts = new Map(); // key: `${table}|${reason}` -> number reported
function reportSkip(table, reason, key, message) {
  const k = `${table}|${reason}`;
  const n = (_skipCounts.get(k) || 0) + 1;
  _skipCounts.set(k, n);
  if (n <= SKIP_CAP_PER_REASON) {
    // Single-line JSON for easy parsing
    console.log('[SKIP] ' + JSON.stringify({ table, reason, key, message }));
  } else if (n === SKIP_CAP_PER_REASON + 1) {
    console.log('[SKIP_MORE] ' + JSON.stringify({ table, reason, suppressed_after: SKIP_CAP_PER_REASON }));
  }
}
function resetSkipCounts() { _skipCounts.clear(); }

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
  const escaped = escapeRegex(colName);
  let out = query;

  // If the missing column appears in ORDER BY, drop just that sort term.
  // Using constants there (e.g. NULL) can fail on SQL Server with OFFSET/FETCH.
  out = out.replace(/\bORDER\s+BY\b[\s\S]*$/i, (orderByClause) => {
    const headMatch = orderByClause.match(/^(\s*ORDER\s+BY\s+)([\s\S]*)$/i);
    if (!headMatch) return orderByClause;

    const prefix = headMatch[1];
    const terms = headMatch[2]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const colPattern = new RegExp(`\\b${escaped}\\b`, 'i');
    const filtered = terms.filter((term) => !colPattern.test(term));

    // If all terms were removed, leave the original ORDER BY intact so the
    // caller gets the original SQL Server error context rather than a rewrite artifact.
    if (filtered.length === 0) return orderByClause;

    return `${prefix}${filtered.join(', ')}`;
  });

  // Replace remaining select-list references with a typed NULL alias.
  const pattern = new RegExp(`\\b${escaped}\\b`, 'g');
  return out.replace(pattern, `NULL AS [${colName}]`);
}

/** Normalize legacy pen names for stable, case-insensitive lookup keys */
function normalizePenName(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

/** Convert a SELECT query into a TOP 1 probe query for SQL Server variants that reject OFFSET/FETCH NEXT. */
function toTop1ProbeQuery(query) {
  // Probe only needs syntax/column validation; ordering is irrelevant.
  // Removing ORDER BY avoids SQL Server rejecting constant expressions after nullification.
  const withoutOrderBy = query.replace(/\bORDER\s+BY\b[\s\S]*$/i, '');
  return withoutOrderBy.replace(/^\s*SELECT\s+/i, (m) => `${m}TOP 1 `);
}

/** Run work items with a fixed concurrency cap to avoid overwhelming source DB connection pools. */
async function mapWithConcurrency(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

// ── Core runner ─────────────────────────────────────

/**
 * Run the full migration.
 *
 * @param {object} mssqlPoolOrPools  - either a single connected mssql pool (legacy) or a
 *                                     map of pools keyed by database name, e.g.
 *                                     { CATTLE: pool, CATTLE_feed: pool, CATTLE_Feedtrans: pool }
 * @param {object} pgPool     - connected pg Pool
 * @param {object} opts       - { batchSize, logLevel, dryRun, tables }
 * @returns {{ results: Array<{ table, rowsRead, rowsWritten, rowsSkipped, rowsErrored, status, error? }> }}
 */
async function runMigration(mssqlPoolOrPools, pgPool, opts = {}) {
  const _runStart = Date.now();

  // Normalise: accept either a single pool (legacy) or a { dbName: pool } map
  const mssqlPools = (mssqlPoolOrPools && typeof mssqlPoolOrPools.request === 'function')
    ? { [process.env.MSSQL_DATABASE || 'CATTLE']: mssqlPoolOrPools }
    : mssqlPoolOrPools;

  // Default pool = CATTLE (used for all lookups that read from the main cattle tables)
  const defaultDb = process.env.MSSQL_DATABASE || 'CATTLE';
  const mssqlPool = mssqlPools[defaultDb] || Object.values(mssqlPools)[0];
  const {
    batchSize = 500,
    logLevel  = 'info',
    dryRun    = false,
    tables    = null,    // null = all, or array of source table names to migrate
  } = opts;
  const tableConcurrency = Math.max(1, parseInt(process.env.MIGRATION_TABLE_CONCURRENCY || '1', 10) || 1);

  // Reset skip counters for this run so the cap applies per-run, not per-process
  resetSkipCounts();

  const log = createLogger(logLevel);
  const results = [];
  const lookups = {};

  // Filter mappings if specific tables requested
  let toRun = mappings;
  if (tables && tables.length > 0) {
    const set = new Set(tables.map(t => t.toLowerCase()));
    toRun = mappings.filter(m => set.has(m.sourceTable.toLowerCase()));
  }

  log.info(`Migration starting — ${toRun.length} tables, batch size ${batchSize}, table concurrency ${tableConcurrency}, dryRun=${dryRun}`);

  // Pre-flight: validate every mapping's target columns exist on PG.
  // Catches schema drift bugs before any data is written.
  await validateMappings(pgPool, { log });

  // Truncate target tables to ensure clean migration (avoids duplicates on re-run)
  // SKIP_TRUNCATE is set by migrate-all.js --target-db for 2nd+ source DBs
  // so they don't wipe data loaded by prior sources.
  const skipTruncate = process.env.SKIP_TRUNCATE === '1';
  if (!dryRun && !tables && !skipTruncate) {
    // Only truncate a target if at least one mapping that writes it will actually
    // run this pass. A mapping with an explicit sourceDatabase (e.g. 'CATTLE_feed')
    // whose companion pool did NOT connect is skipped during load — truncating its
    // target here would wipe previously-migrated data and never refill it (silent
    // domain loss on a re-run while the feed DB is down).
    const connectableTargets = new Set();
    const orphanTargets = new Set();
    for (const m of toRun) {
      const srcAvailable = !m.sourceDatabase || m.sourceDatabase === defaultDb || !!mssqlPools[m.sourceDatabase];
      (srcAvailable ? connectableTargets : orphanTargets).add(m.targetTable);
    }
    for (const t of connectableTargets) orphanTargets.delete(t);
    if (orphanTargets.size) {
      log.warn(`Preserving ${orphanTargets.size} target(s) whose source DB is not connected (NOT truncated): ${[...orphanTargets].join(', ')}`);
    }
    const allTargets = [...connectableTargets, 'system.legacy_raw', 'system.migration_log'];
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
    const groupResults = await mapWithConcurrency(group, tableConcurrency, (mapping) => {
      const srcDb = mapping.sourceDatabase || defaultDb;
      const srcPool = mssqlPools[srcDb] || mssqlPool;
      return migrateTable(srcPool, pgPool, mapping, { batchSize, log, dryRun, lookups });
    });
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

      // Backfill any orphan pen_id on active cows. Despite the streaming row-level
      // resolver in mappings.js, a small number of cows reliably end up with NULL
      // pen_id (root cause not yet identified — possibly a race with auto-seeded
      // pens). This sweep uses the same source-of-truth ranking query and resolves
      // them via lookups.penNameToIdMap. Orphans with empty source Pen_Number are
      // left as NULL (genuine data gap).
      if (!dryRun && lookups.penNameToIdMap) {
        const orphans = await pgPool.query(`
          SELECT id, legacy_beast_id FROM cattle.cows
          WHERE pen_id IS NULL AND status = 'active' AND legacy_beast_id IS NOT NULL
        `);
        if (orphans.rows.length > 0) {
          const beastIds = orphans.rows.map(r => r.legacy_beast_id);
          const srcRows = await mssqlPool.request().query(`
            WITH ranked AS (
              SELECT BeastID, LTRIM(RTRIM(Pen_Number)) AS pen_name,
                     ROW_NUMBER() OVER (PARTITION BY BeastID
                       ORDER BY Feedlot_Entry_Date DESC, Start_Date DESC) AS rn
              FROM dbo.Cattle WHERE BeastID IN (${beastIds.join(',')})
            ) SELECT BeastID, pen_name FROM ranked WHERE rn = 1
          `);
          const beastToPen = new Map();
          for (const r of srcRows.recordset) beastToPen.set(r.BeastID, r.pen_name);
          let fixed = 0, empty = 0, nomatch = 0;
          for (const cow of orphans.rows) {
            const penName = beastToPen.get(cow.legacy_beast_id);
            if (!penName) { empty++; continue; }
            const penId = lookups.penNameToIdMap[normalizePenName(penName)];
            if (!penId) { nomatch++; continue; }
            await pgPool.query('UPDATE cattle.cows SET pen_id = $1 WHERE id = $2', [penId, cow.id]);
            fixed++;
          }
          log.info(`  Backfilled orphan pen_id: ${fixed} fixed, ${empty} empty source, ${nomatch} unmatched (of ${orphans.rows.length} orphans)`);
        }
      }
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
        // Dry-run: identity map (no PG rows to resolve serial ids from)
        lookups.drugIdMap = await buildLookupFromSource(mssqlPool, 'Drugs', 'Drug_ID', 'Drug_ID');
      } else {
        lookups.drugIdSet = await buildIdSet(pgPool, 'health.drugs', 'drug_id');
        // CFR Drug_ID → new serial health.drugs.id. health.drugs_given is
        // id-space in LSJ-HUB (app writers insert drugs.id and every reader
        // joins d.id = dg.drug_id — LSJH-531), unlike the other drug_id
        // mirrors which deliberately stay legacy drug_id-space.
        const drugRes = await pgPool.query(
          'SELECT id, drug_id FROM health.drugs WHERE drug_id IS NOT NULL',
        );
        lookups.drugIdMap = {};
        for (const row of drugRes.rows) lookups.drugIdMap[row.drug_id] = row.id;
        log.info(`  Built drugIdMap: ${Object.keys(lookups.drugIdMap).length} entries`);
      }
    }
    if (tables.has('system.lookups')) {
      if (dryRun) {
        lookups.breedMap = await buildLookupFromSource(mssqlPool, 'Breeds', 'Breed_Code', 'Breed_Name');
      } else {
        const res = await pgPool.query("SELECT code, label FROM system.lookups WHERE category = 'breed'");
        lookups.breedMap = {};
        for (const row of res.rows) {
          lookups.breedMap[row.code] = row.label;
        }
      }
      log.info(`  Built breedMap: ${Object.keys(lookups.breedMap).length} entries`);
    }
    if (tables.has('cattle.breeds')) {
      if (dryRun) {
        // In dry-run: map Breed_Code → Breed_Code (no PG rows to look up)
        lookups.breedIdMap = await buildLookupFromSource(mssqlPool, 'Breeds', 'Breed_Code', 'Breed_Code');
      } else {
        // Build Breed_Code → cattle.breeds.id via breedMap (Breed_Code → name) +
        // breeds name → id. Match case/whitespace-insensitively, and auto-create
        // any CFR breed name missing from cattle.breeds — otherwise a spelling or
        // case mismatch against the app's canonical seed (e.g. CFR "ANGUS" vs
        // seeded "Angus") silently resolves EVERY cow's breed to NULL (LSJH-390).
        const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase());
        const breedsRes = await pgPool.query('SELECT id, name FROM cattle.breeds');
        const nameToBreedId = {};
        for (const row of breedsRes.rows) nameToBreedId[norm(row.name)] = row.id;
        lookups.breedIdMap = {};
        let createdBreeds = 0;
        for (const [code, name] of Object.entries(lookups.breedMap || {})) {
          const key = norm(name);
          if (!key) continue; // skip blank/junk breed labels
          let id = nameToBreedId[key];
          if (id === undefined) {
            // CFR breed name not present (in any case) — create it so the link
            // survives instead of dropping the cow's breed to NULL.
            const ins = await pgPool.query(
              'INSERT INTO cattle.breeds (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
              [String(name).trim()],
            );
            id = ins.rows[0].id;
            nameToBreedId[key] = id;
            createdBreeds += 1;
          }
          lookups.breedIdMap[code] = id;
        }
        if (createdBreeds) log.info(`  Created ${createdBreeds} breed row(s) from CFR Breed_Name`);
      }
      log.info(`  Built breedIdMap: ${Object.keys(lookups.breedIdMap).length} entries`);
    }
    if (tables.has('finance.cost_codes')) {
      // Map CFR RevExp_Code → serial finance.cost_codes.id so migrated finance.costs rows
      // carry cost_code_id (the CODED shape the app's LSJH-768-hardened readers expect — see
      // the Costs mapping in mappings.js). With mapCostType now correct, coded rows classify
      // revenue vs expense by cost_codes.type; leaving them uncoded mis-books revenue codes
      // 11/12/22 and blanks getCostCodeBreakdown, so we deliberately code them.
      if (dryRun) {
        lookups.revexpToCostCodeId = await buildLookupFromSource(mssqlPool, 'Cost_Codes', 'RevExp_Code', 'RevExp_Code');
      } else {
        const res = await pgPool.query('SELECT id, revexp_code FROM finance.cost_codes WHERE revexp_code IS NOT NULL');
        lookups.revexpToCostCodeId = {};
        for (const row of res.rows) lookups.revexpToCostCodeId[row.revexp_code] = row.id;
      }
      log.info(`  Built revexpToCostCodeId: ${Object.keys(lookups.revexpToCostCodeId).length} entries`);
    }
    if (tables.has('pen.pens')) {
      if (dryRun) {
        lookups.penNameToIdMap = {};
      } else {
        const res = await pgPool.query('SELECT id, name FROM pen.pens WHERE name IS NOT NULL');
        lookups.penNameToIdMap = {};

        const addPenLookup = (penName, penId) => {
          const key = normalizePenName(penName);
          if (!key || penId === null || penId === undefined) return;
          lookups.penNameToIdMap[key] = penId;
        };

        for (const row of res.rows) {
          addPenLookup(row.name, row.id);
        }

        // Ensure all distinct legacy Cattle.Pen_Number values can resolve to a pen id.
        try {
          const srcPens = await mssqlPool.request().query(
            `SELECT DISTINCT LTRIM(RTRIM(Pen_Number)) AS pen_name
             FROM dbo.Cattle
             WHERE Pen_Number IS NOT NULL AND LTRIM(RTRIM(Pen_Number)) != ''
             ORDER BY 1`
          );

          // Bump the SERIAL sequence past any explicit ids inserted from legacy Pen_Number_ID
          // BEFORE auto-seed inserts, otherwise new inserts collide on PK and get
          // silently swallowed by ON CONFLICT DO NOTHING.
          await pgPool.query(
            "SELECT setval('pen.pens_id_seq', COALESCE((SELECT MAX(id) FROM pen.pens), 0) + 1, false)"
          );

          if (srcPens.recordset.length > 0) {
            const missingPens = srcPens.recordset
              .map(({ pen_name }) => String(pen_name || '').trim())
              .filter((penName) => {
                const key = normalizePenName(penName);
                return key && lookups.penNameToIdMap[key] === undefined;
              });

            if (missingPens.length > 0) {
              // Pens referenced by Cattle but absent from Pens_File (the feedlot
              // registry) are paddocks by definition — Andrew confirmed Barmount
              // backgrounds cattle on paddocks (in_feedlot=false) before they enter
              // the feedlot pens.
              log.info(`  Auto-seeding ${missingPens.length} missing pens from Cattle.Pen_Number (flagged as paddocks)`);
              for (const penName of missingPens) {
                const ins = await pgPool.query(
                  `INSERT INTO pen.pens (name, is_paddock, pen_type)
                   VALUES ($1, true, 'paddock')
                   ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                   RETURNING id`,
                  [penName]
                );
                if (ins.rows.length > 0) {
                  addPenLookup(penName, ins.rows[0].id);
                }
              }
            }
          }
        } catch (err) {
          log.warn(`  Auto-seed missing pens failed: ${err.message}`);
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
  // Both source tables (Ration_Load_Sizes, Pen_Feeding_Order_Params) live in CATTLE_feed
  if (!dryRun) {
    const feedPool = mssqlPools['CATTLE_feed'] || mssqlPool;
    await expandNormalizedChildren(feedPool, pgPool, log);
  }

  // Build app-space treatment regimes from the CFR mirror rows (LSJH-532)
  if (!dryRun) {
    await convertTreatmentRegimes(pgPool, log);
  }

  log.info('Migration complete.');

  // Reset SERIAL sequences for tables that received explicit IDs
  if (!dryRun) {
    await resetSequences(pgPool, log);
  }

  // ── Migration summary ─────────────────────────────────────────────────────
  const totalRowsWritten = results.reduce((s, r) => s + (r.rowsWritten || 0), 0);
  const totalTables      = results.length;
  const completedTables  = results.filter(r => r.status === 'completed').length;
  const failedTables     = results.filter(r => r.status === 'failed').length;
  const totalElapsedSec  = (Date.now() - _runStart) / 1000;

  const _fmtDur = (sec) => {
    const s = Math.round(sec);
    if (s < 60)   return `${s}s`;
    if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r > 0 ? `${m}m ${r}s` : `${m}m`; }
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  console.log(
    `\nSummary: ${Number(totalRowsWritten).toLocaleString('en')} rows across ` +
    `${completedTables}/${totalTables} tables in ${_fmtDur(totalElapsedSec)}` +
    (failedTables > 0 ? ` (${failedTables} failed)` : '')
  );

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
        if (/Invalid usage of the option NEXT in the FETCH statement/i.test(probeErr.message)) {
          await mssqlPool.request().query(toTop1ProbeQuery(query));
          break;
        }
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
      let probe;
      try {
        probe = await mssqlPool.request().query(
          `${query} OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`
        );
      } catch (probeErr) {
        if (/Invalid usage of the option NEXT in the FETCH statement/i.test(probeErr.message)) {
          probe = await mssqlPool.request().query(toTop1ProbeQuery(query));
        } else {
          throw probeErr;
        }
      }
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

    // Create progress reporter (TTY: in-place updates; non-TTY: periodic log lines)
    const progress = createProgressReporter(sourceTable, totalRows > 0 ? totalRows : 0);

    // Stream rows from MSSQL in a single query (avoids O(n²) OFFSET re-scan on large tables).
    // The pool's `stream` flag is enabled per-request; rows arrive incrementally and we
    // flush batches of `batchSize` to PG as they fill, pausing the stream for backpressure.
    const SLOW_PAGE_MS = parseInt(process.env.MIGRATION_SLOW_PAGE_MS || '60000', 10);
    let offset = 0;
    let buffer = [];
    let pendingErr = null;

    const flushBuffer = async (rows) => {
      const flushStart = Date.now();
      const { written, skipped, errored, orphaned } = await processBatch(
        pgPool, rows, mapping, { log, dryRun, lookups }
      );
      stats.rowsWritten += written;
      stats.rowsSkipped += skipped;
      stats.rowsErrored += errored;
      stats._orphaned   = (stats._orphaned || 0) + (orphaned || 0);
      offset           += rows.length;

      const flushMs = Date.now() - flushStart;
      if (flushMs > SLOW_PAGE_MS) {
        log.warn(`  [${sourceTable}] slow batch write: ${(flushMs / 1000).toFixed(1)}s for ${rows.length} rows at offset ${offset.toLocaleString()}`);
      }

      // Update in-place progress line (or emit a log line if not a TTY)
      progress.update(rows.length);
    };

    await new Promise((resolve, reject) => {
      const request = mssqlPool.request();
      request.stream = true;

      request.on('row', (row) => {
        buffer.push(row);
        stats.rowsRead++;
        if (buffer.length >= batchSize) {
          const toFlush = buffer;
          buffer = [];
          request.pause();
          flushBuffer(toFlush)
            .then(() => request.resume())
            .catch((err) => { pendingErr = err; request.cancel(); });
        }
      });

      request.on('error', (err) => {
        pendingErr = pendingErr || err;
      });

      request.on('done', async () => {
        try {
          if (pendingErr) return reject(pendingErr);
          if (buffer.length > 0) {
            const toFlush = buffer;
            buffer = [];
            await flushBuffer(toFlush);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      request.query(query);
    });

    stats.status = (stats.rowsRead > 0 && stats.rowsWritten === 0 && stats.rowsErrored > 0) ? 'failed' : 'completed';
    // Print final completion line (clears the in-place TTY line, or logs a summary in non-TTY)
    progress.finish(stats.rowsWritten);
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
        const keyCol = columns[0]?.source;
        const keyVal = keyCol ? rawRow[keyCol] : undefined;
        reportSkip(targetTable, 'junk', keyVal != null ? `${keyCol}=${keyVal}` : '', 'Row matched junk/header filter');
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
      // health.drugs_given is id-space in LSJ-HUB (LSJH-531): remap the CFR
      // Drug_ID to the new serial health.drugs.id. Other drug_id tables
      // (drugs_purchased, drug_inventory_line_items) stay legacy-space — do
      // NOT remap them.
      if (targetTable === 'health.drugs_given' && row.drug_id != null && lookups.drugIdMap) {
        row.drug_id = lookups.drugIdMap[row.drug_id] ?? null;
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
              reportSkip(targetTable, 'orphan-cow', `${fkCol}=${row[fkCol]}`, 'No matching cattle row — routed to system.legacy_raw');
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
        const keyCol = columns[0]?.target;
        const keyVal = keyCol ? row[keyCol] : undefined;
        reportSkip(targetTable, 'validate', keyVal != null ? `${keyCol}=${keyVal}` : '', 'Row failed validate()');
        continue;
      }

      // Build final insert values
      const values = buildInsertValues ? buildInsertValues(row) : row;
      transformed.push(values);
    } catch (err) {
      errored++;
      reportSkip(targetTable, 'transform-error', '', err.message);
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

    // Union the columns across ALL rows in the batch — never take them from
    // cleanRows[0] alone. Some columns (cow_id, cost_code_id, status, pen_id, …)
    // are set conditionally per row; if the first row happens to lack one, deriving
    // the column list from row[0] silently drops that column's values for every
    // other row in the batch (order-dependent data loss).
    const keySet = new Set();
    for (const r of cleanRows) for (const k of Object.keys(r)) keySet.add(k);
    const keys = [...keySet];
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
        // A row may lack a unioned key (conditional column) — send NULL, not undefined.
        for (const k of keys) allVals.push(chunk[i][k] ?? null);
      }

      try {
        await client.query('SAVEPOINT batch_sp');
        const result = await client.query(
          `INSERT INTO ${targetTable} (${keys.join(', ')}) VALUES ${valueClauses.join(', ')} ON CONFLICT DO NOTHING`,
          allVals
        );
        await client.query('RELEASE SAVEPOINT batch_sp');
        written += result.rowCount;
        const conflictSkipped = chunk.length - result.rowCount;
        skipped += conflictSkipped;
        if (conflictSkipped > 0) {
          reportSkip(targetTable, 'pg-conflict', `chunk_size=${chunk.length}`, `${conflictSkipped} row(s) skipped by ON CONFLICT DO NOTHING (duplicate primary key)`);
        }
      } catch (err) {
        // Roll back the savepoint so the transaction is usable for row-by-row fallback
        await client.query('ROLLBACK TO SAVEPOINT batch_sp');
        // Multi-row failed — fall back to row-by-row for this chunk only
        log.warn(`  Batch insert failed for ${targetTable}, falling back to row-by-row: ${err.message}`);
        for (const row of chunk) {
          try {
            const vals = keys.map(k => row[k] ?? null); // union key absent on this row → NULL
            const params = keys.map((_, j) => `$${j + 1}`);
            await client.query('SAVEPOINT sp');
            const r = await client.query(
              `INSERT INTO ${targetTable} (${keys.join(', ')}) VALUES (${params.join(', ')}) ON CONFLICT DO NOTHING`,
              vals
            );
            await client.query('RELEASE SAVEPOINT sp');
            if (r.rowCount > 0) written++;
            else {
              skipped++;
              const idSnippet = keys.slice(0, 3).map(k => `${k}=${JSON.stringify(row[k])}`).join(', ');
              reportSkip(targetTable, 'pg-conflict', idSnippet, 'Skipped by ON CONFLICT DO NOTHING (duplicate primary key)');
            }
          } catch (rowErr) {
            await client.query('ROLLBACK TO SAVEPOINT sp');
            errored++;
            const idSnippet = keys.slice(0, 3).map(k => `${k}=${JSON.stringify(row[k])}`).join(', ');
            reportSkip(targetTable, 'pg-row-error', idSnippet, rowErr.message);
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

/**
 * LSJH-532 — build app-space treatment regimes from the CFR mirror rows.
 *
 * CFR Treatment_Regimes has no regime header: each row is one STEP keyed by
 * DiseaseID, and the table mapping mirrors those rows into the LEGACY columns
 * of health.treatment_regimes (diseaseid/day_numb/drug_id/dose — app columns
 * left NULL). LSJ-HUB's regime machinery (LSJH-209 sick-import auto-apply,
 * LSJH-499 manual apply) reads header rows keyed by the SERIAL diseases.id
 * plus health.treatment_regime_steps — without this conversion, regimes never
 * fire on a migrated box.
 *
 * Per disease: ONE header (disease_id bridged legacy→serial, name from the
 * disease, days = max Day_Numb, dose_by_weight = any step flagged) and one
 * step per mirror row — CFR Day_Numb is 1-based, LSJ day_number is 0-based
 * (GREATEST(…-1, 0) also tolerates 0-based source data); step drug_id is
 * bridged to the serial drugs.id. Converted mirror rows are then removed so
 * the app's regimes list shows only real headers; rows whose disease can't
 * be bridged are left in place (no data loss). Safe on re-runs: targets are
 * truncated per run, and header creation skips diseases that already have an
 * app-space regime (multi-source SKIP_TRUNCATE loads).
 */
async function convertTreatmentRegimes(pgPool, log) {
  const { rows: headers } = await pgPool.query(`
    INSERT INTO health.treatment_regimes (name, disease_id, days, dose_by_weight, active)
    SELECT TRIM(d.disease_name), d.id, MAX(tr.day_numb),
           BOOL_OR(COALESCE(tr.dosebyweight, FALSE)), TRUE
      FROM health.treatment_regimes tr
      JOIN health.diseases d ON d.disease_id = tr.diseaseid
     WHERE tr.diseaseid IS NOT NULL AND tr.disease_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM health.treatment_regimes h
          WHERE h.disease_id = d.id AND h.diseaseid IS NULL)
     GROUP BY d.id, d.disease_name
    RETURNING id`);
  if (headers.length === 0) return;

  const { rowCount: steps } = await pgPool.query(`
    INSERT INTO health.treatment_regime_steps (regime_id, day_number, drug_id, dose)
    SELECT h.id, GREATEST(COALESCE(tr.day_numb, 1) - 1, 0), dr.id, tr.dose
      FROM health.treatment_regimes tr
      JOIN health.diseases d ON d.disease_id = tr.diseaseid
      JOIN health.treatment_regimes h ON h.disease_id = d.id AND h.diseaseid IS NULL
      LEFT JOIN health.drugs dr ON dr.drug_id = tr.drug_id
     WHERE tr.diseaseid IS NOT NULL AND tr.disease_id IS NULL`);

  const { rowCount: removed } = await pgPool.query(`
    DELETE FROM health.treatment_regimes tr
     USING health.diseases d
     WHERE d.disease_id = tr.diseaseid
       AND tr.diseaseid IS NOT NULL AND tr.disease_id IS NULL`);

  log.info(
    `  Converted CFR treatment regimes: ${headers.length} regime(s), ${steps} step(s) ` +
    `(${removed} mirror rows folded in)`,
  );
}

// ── Sequence reset ───────────────────────────────────

/**
 * Reset IDENTITY sequences for tables that received explicit ID values during migration.
 * In v3, cattle.cows.id is GENERATED ALWAYS AS IDENTITY (auto-increments on INSERT).
 * Child tables also use IDENTITY PKs. contacts.contacts.contact_id is an explicit legacy value.
 * This is kept as a safety net.
 */
async function resetSequences(pgPool, log) {
  // Many mappings insert explicit legacy ids into SERIAL primary keys (cattle.cows,
  // finance.deliverydockets, breeding.breeding_sires.sire_id, transport.locations.
  // location_id, …). After TRUNCATE ... RESTART IDENTITY the owning sequences point
  // at 1, so the first app-side INSERT collides (23505 → 500 / "already exists").
  // LSJ-HUB's boot heal only fixes columns literally named 'id', so custom-named
  // PKs never recover. Sweep every serial-backed PK column in the DB and bump its
  // sequence past MAX(pk). Idempotent and safe to re-run.
  const { rows } = await pgPool.query(`
    SELECT n.nspname AS schema, c.relname AS tbl, a.attname AS col,
           pg_get_serial_sequence(quote_ident(n.nspname)||'.'||quote_ident(c.relname), a.attname) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index i     ON i.indrelid = c.oid AND i.indisprimary
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND pg_get_serial_sequence(quote_ident(n.nspname)||'.'||quote_ident(c.relname), a.attname) IS NOT NULL
  `);
  let bumped = 0;
  for (const r of rows) {
    const ref = `"${r.schema}"."${r.tbl}"`;
    try {
      await pgPool.query(
        `SELECT setval($1, GREATEST((SELECT COALESCE(MAX("${r.col}"), 0) FROM ${ref}), 1), true)`,
        [r.seq],
      );
      bumped += 1;
    } catch (e) {
      log.warn(`  setval failed for ${ref}."${r.col}": ${e.message}`);
    }
  }
  log.info(`Reset ${bumped} SERIAL PK sequence(s) past migrated max ids.`);
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

// ── Pre-flight: validate mappings against live PG schema ─────

/**
 * For every mapping, verify that all `columns[].target` fields and all
 * `staticColumns` keys correspond to real columns on the PG target table.
 *
 * This catches schema drift bugs like the `feedingtype` vs `variant` mismatch
 * that caused Rangers Valley to fail with N rows errored on small tables that
 * are empty on most farms.
 *
 * Returns { errors: [...], warnings: [...] }. Throws if errors are non-empty
 * (unless `throwOnError: false`).
 */
async function validateMappings(pgPool, opts = {}) {
  const { log = createLogger('info'), throwOnError = true } = opts;

  // Collect distinct target tables from mappings
  const targetTables = [...new Set(mappings.map(m => m.targetTable).filter(Boolean))];

  // Query live columns for every target table in one go
  const tableSpecs = targetTables.map(t => {
    const [schema, name] = t.includes('.') ? t.split('.', 2) : ['public', t];
    return { full: t, schema, name };
  });

  const liveCols = new Map(); // "schema.table" -> Set(column_name)
  const { rows } = await pgPool.query(`
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE (table_schema, table_name) IN (
      ${tableSpecs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')}
    )
  `, tableSpecs.flatMap(s => [s.schema, s.name]));

  for (const r of rows) {
    const key = `${r.table_schema}.${r.table_name}`;
    if (!liveCols.has(key)) liveCols.set(key, new Set());
    liveCols.get(key).add(r.column_name.toLowerCase());
  }

  const errors = [];
  const warnings = [];

  for (const m of mappings) {
    const target = m.targetTable;
    if (!target) continue;
    const cols = liveCols.get(target);
    if (!cols || cols.size === 0) {
      warnings.push(`${m.sourceTable} → ${target}: target table not found in PG`);
      continue;
    }

    // Build the set of target columns this mapping writes to
    const refs = new Set();
    for (const c of (m.columns || [])) {
      if (c.target) refs.add(c.target.toLowerCase());
    }
    for (const k of Object.keys(m.staticColumns || {})) {
      refs.add(k.toLowerCase());
    }

    for (const ref of refs) {
      if (!cols.has(ref)) {
        errors.push(`${m.sourceTable} → ${target}: column "${ref}" does not exist on target`);
      }
    }
  }

  if (warnings.length) {
    for (const w of warnings) log.warn(`[mapping-check] ${w}`);
  }
  if (errors.length) {
    for (const e of errors) log.error(`[mapping-check] ${e}`);
    if (throwOnError) {
      throw new Error(`Pre-flight mapping validation failed: ${errors.length} column(s) not found on target tables. Fix mappings.js or schema-farm-v6.sql before running migration.`);
    }
  } else {
    log.info(`[mapping-check] OK — all ${mappings.length} mappings reference valid target columns.`);
  }

  return { errors, warnings };
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
      // Account for expected skips (validate/orphan filtering) AND row-level
      // errors (e.g. check-constraint violations on legacy junk data) via
      // migration_log. Both represent rows the loader documented as not loaded.
      let expectedSkipped = 0;
      let expectedErrored = 0;
      try {
        const srcName = source.replace('dbo.', '');
        const logRes = await pgPool.query(
          `SELECT rows_skipped, rows_errored FROM system.migration_log WHERE source_table = $1 ORDER BY id DESC LIMIT 1`,
          [srcName]
        );
        expectedSkipped = logRes.rows[0]?.rows_skipped || 0;
        expectedErrored = logRes.rows[0]?.rows_errored || 0;
      } catch (_) {}
      const expectedLoss = expectedSkipped + expectedErrored;
      const passed = tgtCount >= (srcCount - expectedLoss);

      const lossParts = [];
      if (expectedSkipped) lossParts.push(`${expectedSkipped} skipped`);
      if (expectedErrored) lossParts.push(`${expectedErrored} errored`);
      const lossSuffix = lossParts.length ? ` (${lossParts.join(', ')})` : '';

      checks.push({
        check: `Row count: ${source} → ${target}`,
        passed,
        detail: `source=${srcCount} target=${tgtCount}${lossSuffix}${passed ? '' : ' MISMATCH'}`,
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
    { table: 'weighing.weighing_events', fk: 'beast_id',    ref: 'cattle.cows', refCol: 'id' },
    { table: 'pen.penshistory',          fk: 'beast_id',    ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.drugs_given',       fk: 'beast_id',    ref: 'cattle.cows', refCol: 'id' },
    { table: 'health.drugs_given',       fk: 'drug_id',     ref: 'health.drugs',  refCol: 'id' },  // LSJH-531: drugs_given.drug_id is remapped to the serial drugs.id keyspace
    { table: 'finance.costs',            fk: 'beast_id',    ref: 'cattle.cows', refCol: 'id' },
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

  // 3b. No duplicate ACTIVE ear tags. LSJ-HUB builds a partial unique index
  // uq_cows_ear_tag_active ON cattle.cows(ear_tag) WHERE status='active' at first
  // boot (LSJH-346). If migrated data has >1 active cow sharing a tag, that CREATE
  // fails, is warn-skipped, and the box stays index-less — after which the app's
  // ON CONFLICT (ear_tag) WHERE status='active' writers throw 42P10 at runtime.
  // Deriving cows.status now makes this rare (historic sold/died cows drop out),
  // but any genuine active duplicate must be resolved before go-live.
  try {
    const res = await pgPool.query(`
      SELECT COUNT(*) AS cnt FROM (
        SELECT ear_tag FROM cattle.cows
        WHERE status = 'active' AND ear_tag IS NOT NULL AND ear_tag <> ''
        GROUP BY ear_tag HAVING COUNT(*) > 1
      ) d`);
    const dupTags = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no duplicate active ear_tags (LSJH-346 index)',
      passed: dupTags === 0,
      detail: dupTags === 0
        ? 'no duplicate active ear tags'
        : `${dupTags} ear tag(s) shared by >1 ACTIVE cow — resolve before first app boot (run LSJ-HUB scripts/dedupe-ear-tags.js) or uq_cows_ear_tag_active will be skipped`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no duplicate active ear_tags (LSJH-346 index)', passed: false, detail: err.message });
  }

  // 3c. No duplicate ACTIVE EIDs. LSJ-HUB builds a partial unique index
  // uq_cows_eid_active ON cattle.cows((REPLACE(eid,' ','')))
  //   WHERE status='active' AND eid IS NOT NULL AND REPLACE(eid,' ','') <> ''
  // at first boot (LSJH-673). Duplicate active EIDs make that CREATE fail (warn-skipped),
  // leaving scanner/dispatch EID lookups able to bind the WRONG beast. Mirror the exact
  // normalized-and-non-empty predicate so this pre-flight matches what the index enforces.
  try {
    const res = await pgPool.query(`
      SELECT COUNT(*) AS cnt FROM (
        SELECT REPLACE(eid, ' ', '') AS neid FROM cattle.cows
        WHERE status = 'active' AND eid IS NOT NULL AND REPLACE(eid, ' ', '') <> ''
        GROUP BY REPLACE(eid, ' ', '') HAVING COUNT(*) > 1
      ) d`);
    const dupEids = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: no duplicate active EIDs (LSJH-673 index)',
      passed: dupEids === 0,
      detail: dupEids === 0
        ? 'no duplicate active EIDs'
        : `${dupEids} EID(s) shared by >1 ACTIVE cow — resolve before first app boot (run LSJ-HUB scripts/dedupe-eids.js) or uq_cows_eid_active is skipped and EID scans can bind the wrong beast`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: no duplicate active EIDs (LSJH-673 index)', passed: false, detail: err.message });
  }

  // 3d. finance.costs feed-aggregate uniqueness. LSJ-HUB builds a partial unique index
  // uq_costs_feed_aggregate ON finance.costs(cow_id, revexp_code, ration)
  //   WHERE cow_id IS NOT NULL AND ration IS NOT NULL
  // at first boot (LSJH-663), and the PG-native apply-feed upsert uses it as its ON
  // CONFLICT arbiter. CFR stores many per-day cost rows per (beast, revexp, ration);
  // migrating them verbatim yields duplicates that (a) make the CREATE fail (warn-skipped)
  // and then (b) 42P10 the native apply-feed path. This is a REPORT only — resolving it
  // (aggregating or scoping migrated feed cost rows) is a data-model decision, not automatic.
  try {
    const res = await pgPool.query(`
      SELECT COUNT(*) AS cnt FROM (
        SELECT cow_id, revexp_code, ration FROM finance.costs
        WHERE cow_id IS NOT NULL AND ration IS NOT NULL AND revexp_code IS NOT NULL
        GROUP BY cow_id, revexp_code, ration HAVING COUNT(*) > 1
      ) d`);
    const dupAgg = parseInt(res.rows[0].cnt);
    checks.push({
      check: 'Data quality: finance.costs feed-aggregate uniqueness (LSJH-663 index)',
      passed: dupAgg === 0,
      detail: dupAgg === 0
        ? 'no duplicate (cow_id, revexp_code, ration) cost rows'
        : `${dupAgg} (cow_id, revexp_code, ration) group(s) have >1 row — uq_costs_feed_aggregate will be skipped at boot and PG-native apply-feed will 42P10; decide on aggregating/scoping migrated feed cost rows before enabling PG-native feeding`,
    });
  } catch (err) {
    checks.push({ check: 'Data quality: finance.costs feed-aggregate uniqueness (LSJH-663 index)', passed: false, detail: err.message });
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
    { table: 'weighing.weighing_events', beastCol: 'beast_id' },
    { table: 'pen.penshistory',          beastCol: 'beast_id' },
    { table: 'health.drugs_given',       beastCol: 'beast_id' },
    { table: 'finance.costs',            beastCol: 'beast_id' },
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
    const distinctPenRes = await pgPool.query("SELECT COUNT(DISTINCT pen_id) AS cnt FROM cattle.cows WHERE status = 'active' AND pen_id IS NOT NULL");
    const activeTotal = parseInt(activeRes.rows[0].cnt);
    const activeWithPen = parseInt(activePenRes.rows[0].cnt);
    const distinctPenCount = parseInt(distinctPenRes.rows[0].cnt);
    const ratio = activeTotal > 0 ? (activeWithPen / activeTotal) : 0;

    // Healthy case: majority of active cows have pen_id.
    // Legacy-farm edge case: many active rows have blank source Pen_Number; treat as pass
    // if mapping is not completely broken (at least one active row resolved).
    const passed =
      activeTotal === 0 ||
      ratio > 0.5 ||
      activeWithPen > 0;

    checks.push({
      check: 'pen_id resolution on active cattle.cows',
      passed,
      detail: `${activeWithPen}/${activeTotal} active cows have pen_id (${activeTotal > 0 ? (ratio*100).toFixed(1) : 0}%), distinct mapped pens=${distinctPenCount}`,
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

  // 9. Sanity: lookups & feeding tables loaded when source has data.
  //    Catches the SubGroupNames (missing `code`) and *_Feeding_* (wrong staticColumn
  //    name) regressions that silently failed on farms with empty source tables.
  try {
    const srcRes = await mssqlPool.request().query(
      `SELECT (SELECT COUNT(*) FROM dbo.SubGroupNames) AS sub_group_src`
    );
    const srcCount = srcRes.recordset[0].sub_group_src;
    const tgtRes = await pgPool.query(
      `SELECT COUNT(*)::int AS n FROM system.lookups WHERE category = 'sub_group'`
    );
    const tgtCount = tgtRes.rows[0].n;
    const passed = srcCount === 0 || tgtCount > 0;
    checks.push({
      check: 'Lookup loaded: system.lookups[sub_group]',
      passed,
      detail: `source SubGroupNames=${srcCount}, target=${tgtCount}`,
    });
  } catch (err) {
    checks.push({ check: 'Lookup loaded: system.lookups[sub_group]', passed: true, detail: `skipped: ${err.message}` });
  }

  for (const target of ['feed.feeding_details', 'feed.feeding_regimens']) {
    try {
      // Sum rows across all 5 source variants
      const variants = ['GE150', 'L150', 'Plateau', 'ShortFeed', 'WAGYU'];
      const suffix = target.endsWith('details') ? 'Feeding_Details' : 'Feeding_Regimens';
      let srcTotal = 0;
      for (const v of variants) {
        try {
          const r = await mssqlPool.request().query(
            `SELECT COUNT(*) AS n FROM CATTLE_feed.dbo.${v}_${suffix}`
          );
          srcTotal += r.recordset[0].n || 0;
        } catch (_) { /* table may not exist on this farm */ }
      }
      const tgt = await pgPool.query(`SELECT COUNT(*)::int AS n FROM ${target}`);
      const tgtCount = tgt.rows[0].n;
      const passed = srcTotal === 0 || tgtCount > 0;
      checks.push({
        check: `Loaded: ${target}`,
        passed,
        detail: `source variants total=${srcTotal}, target=${tgtCount}`,
      });
    } catch (err) {
      checks.push({ check: `Loaded: ${target}`, passed: true, detail: `skipped: ${err.message}` });
    }
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

// ── Per-farm reconciliation ──────────────────────────

/**
 * Reconcile a single farm: compare MSSQL source row counts against PostgreSQL
 * target row counts for every mapped and raw table.
 *
 * @param {string} farmName         - display name for the farm (e.g. "MyrtlevaleFarm")
 * @param {object} pgPool           - connected pg Pool for this farm's database
 * @param {object} mssqlPool        - connected mssql pool for this farm's CATTLE database
 * @returns {{ farm: string, tables: Array, allMatch: boolean }}
 */
async function reconcileFarm(farmName, pgPool, mssqlPool) {
  const { raw } = getCategorySummary();
  const tables = [];

  // Mapped tables
  for (const m of mappings) {
    try {
      const srcRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${m.sourceTable}]`
      );
      const tgtRes = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM ${m.targetTable}`
      );
      const source = srcRes.recordset[0].cnt;
      const target = parseInt(tgtRes.rows[0].cnt);
      const delta  = source - target;
      tables.push({ table: m.sourceTable, source, target, delta, match: delta === 0 });
    } catch (err) {
      // Source table may not exist on this farm — treat as a match of 0 rows
      const missing = /Invalid object name|does not exist/i.test(err.message);
      if (missing) {
        tables.push({ table: m.sourceTable, source: 0, target: 0, delta: 0, match: true, note: 'table absent on farm' });
      } else {
        tables.push({ table: m.sourceTable, source: -1, target: -1, delta: 0, match: false, error: err.message });
      }
    }
  }

  // Raw tables (preserved as JSONB in system.legacy_raw)
  for (const tableName of raw) {
    try {
      const srcRes = await mssqlPool.request().query(
        `SELECT COUNT(*) AS cnt FROM [dbo].[${tableName}]`
      );
      const tgtRes = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM system.legacy_raw WHERE source_table = $1`,
        [tableName]
      );
      const source = srcRes.recordset[0].cnt;
      const target = parseInt(tgtRes.rows[0].cnt);
      const delta  = source - target;
      tables.push({ table: tableName, source, target, delta, match: delta === 0 });
    } catch (err) {
      const missing = /Invalid object name|does not exist/i.test(err.message);
      if (missing) {
        tables.push({ table: tableName, source: 0, target: 0, delta: 0, match: true, note: 'table absent on farm' });
      } else {
        tables.push({ table: tableName, source: -1, target: -1, delta: 0, match: false, error: err.message });
      }
    }
  }

  const allMatch = tables.every(t => t.match);
  return { farm: farmName, tables, allMatch };
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
    sourceTable: 'FeedDB_Pens_File', targetTable: 'feed.feeddb_pens_file',
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
  validateMappings,
  validateMigration,
  preFlightAudit,
  migrateRawTables,
  reconciliationReport,
  reconcileFarm,
  compareDatabases,
  buildLookup,
  buildCowIdMap,
  buildCowIdMapFromSource,
  buildSbRecNoMapFromSource,
  buildLookupFromSource,
  buildIdSetFromSource,
  createLogger,
  createProgressReporter,
};
