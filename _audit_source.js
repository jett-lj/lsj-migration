#!/usr/bin/env node
/**
 * Pre-migration source data quality audit for legacy CATTLE (MSSQL) databases.
 *
 * Surfaces NULL spikes, duplicate PKs, bad date ranges, and orphan FK rows
 * before running the actual migration — preventing silent failures downstream.
 *
 * Usage:
 *   node _audit_source.js [--farm <farmName>] [--output audit.json]
 *
 * Required env vars (same as migrate.js):
 *   MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD
 *   MSSQL_DATABASE  (default: CATTLE)
 *
 * Exit code:
 *   0 — all tables PASS or WARN
 *   1 — one or more FAILs (duplicate PKs found, or FK orphan rate > 5%)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { connectMssql, closePools } = require('./connections');
const { getCategorySummary }       = require('./categories');

// ── CLI args ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { farm: null, output: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--farm'   && argv[i + 1]) args.farm   = argv[++i];
    if (argv[i] === '--output' && argv[i + 1]) args.output = argv[++i];
  }
  return args;
}

// ── Table metadata: PK and date columns for the 19 core structured tables ──
// Derived from mappings.js inspection. Only columns that actually appear in
// the source table are listed here — not the transformed target columns.

const TABLE_META = {
  Breeds:              { pk: 'Breed_Code',        dateColumns: [] },
  FeedDB_Pens_File:    { pk: 'Pen_name',           dateColumns: [] },
  Contacts:            { pk: 'Contact_ID',         dateColumns: ['Last_Modified_timestamp'] },
  Diseases:            { pk: 'Disease_ID',         dateColumns: [] },
  Drugs:               { pk: 'Drug_ID',            dateColumns: ['Last_Modified_timestamp'] },
  Cost_Codes:          { pk: 'RevExp_Code',        dateColumns: [] },
  Market_Category:     { pk: 'Market_Cat_ID',      dateColumns: [] },
  Purchase_Lots:       { pk: 'ID',                 dateColumns: ['Purchase_date', 'Last_Modified_timestamp'] },
  Cattle:              { pk: 'BeastID',            dateColumns: ['Start_Date', 'Sale_Date', 'DOB', 'Feedlot_Entry_Date', 'Date_Archived', 'Date_died'] },
  Weighing_Events:     { pk: null,                 dateColumns: ['Weigh_date'] },  // composite key — no single PK
  PensHistory:         { pk: null,                 dateColumns: ['MoveDate'] },    // composite key
  Drugs_Given:         { pk: null,                 dateColumns: ['Date_Given'] },  // composite key
  Costs:               { pk: 'ID',                 dateColumns: ['Cost_Date'] },
  Sick_Beast_Records:  { pk: 'SB_Rec_No',         dateColumns: ['Date_Diagnosed', 'Date_Recovered_Died'] },
  Carcase_data:        { pk: 'Beast_ID',           dateColumns: ['Kill_Date'] },
  Autopsy_Records:     { pk: 'SB_Rec_No',         dateColumns: ['Date_Dead', 'Date_Autopsy'] },
  Vendor_Declarations: { pk: 'Vendor_Dec_Number',  dateColumns: ['Form_Date'] },
  Drugs_Purchased:     { pk: 'Receival_ID',        dateColumns: ['Expiry_date'] },
  Drug_Disposal:       { pk: 'Disposal_ID',        dateColumns: ['Date_disposed'] },
};

// FK checks: { description, childTable, childCol, parentTable, parentCol }
const FK_CHECKS = [
  { description: 'Drugs_Given.BeastID → Cattle.BeastID',      childTable: 'Drugs_Given',     childCol: 'BeastID',   parentTable: 'Cattle',  parentCol: 'BeastID' },
  { description: 'PensHistory.BeastID → Cattle.BeastID',      childTable: 'PensHistory',     childCol: 'BeastID',   parentTable: 'Cattle',  parentCol: 'BeastID' },
  { description: 'Weighing_Events.BeastID → Cattle.BeastID',  childTable: 'Weighing_Events', childCol: 'BeastID',   parentTable: 'Cattle',  parentCol: 'BeastID' },
];

// NULL rate threshold for flagging columns (percentage, 0-100)
const NULL_WARN_THRESHOLD = 30;

// FK orphan rate threshold for FAIL (percentage, 0-100)
const FK_FAIL_THRESHOLD = 5;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Escape a SQL Server identifier with square brackets */
function esc(name) {
  return `[${name.replace(/]/g, ']]')}]`;
}

/** Right-pad a string to width */
function pad(str, width) {
  const s = String(str == null ? '' : str);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

/** Left-pad a string to width */
function lpad(str, width) {
  const s = String(str == null ? '' : str);
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

/** Format a float as a percentage string */
function pct(n) {
  return n == null ? 'N/A' : `${n.toFixed(1)}%`;
}

// ── Table checks ─────────────────────────────────────────────────────────────

/**
 * Fetch all column names for a table from INFORMATION_SCHEMA.
 */
async function getColumns(pool, tableName) {
  const result = await pool.request().query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = '${tableName.replace(/'/g, "''")}'
     AND TABLE_SCHEMA = 'dbo'
     ORDER BY ORDINAL_POSITION`
  );
  return result.recordset.map(r => r.COLUMN_NAME);
}

/**
 * Run row-count query. Returns 0 if table doesn't exist or is empty.
 */
async function getRowCount(pool, tableName) {
  try {
    const result = await pool.request().query(
      `SELECT COUNT(*) AS cnt FROM dbo.${esc(tableName)}`
    );
    return result.recordset[0].cnt;
  } catch {
    return null; // table may not exist in this farm's DB
  }
}

/**
 * Compute NULL rate (%) for each column in the table.
 * Returns { columnName: nullPct, ... }
 * Only queries tables that have > 0 rows (avoids division by zero).
 */
async function getNullRates(pool, tableName, columns, rowCount) {
  if (rowCount === 0 || columns.length === 0) return {};

  // Build a single query: SELECT (SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS col, ...
  const selects = columns.map(col =>
    `(SUM(CASE WHEN ${esc(col)} IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) AS ${esc(col)}`
  ).join(', ');

  const result = await pool.request().query(
    `SELECT ${selects} FROM dbo.${esc(tableName)}`
  );
  return result.recordset[0] || {};
}

/**
 * Get MIN/MAX for date columns. Returns { colName: { min, max }, ... }
 */
async function getDateRanges(pool, tableName, dateColumns) {
  if (dateColumns.length === 0) return {};

  const selects = dateColumns.flatMap(col => [
    `MIN(${esc(col)}) AS ${esc(`min_${col}`)}`,
    `MAX(${esc(col)}) AS ${esc(`max_${col}`)}`,
  ]).join(', ');

  try {
    const result = await pool.request().query(
      `SELECT ${selects} FROM dbo.${esc(tableName)}`
    );
    const row = result.recordset[0] || {};
    const ranges = {};
    for (const col of dateColumns) {
      ranges[col] = {
        min: row[`min_${col}`] ? new Date(row[`min_${col}`]).toISOString().split('T')[0] : null,
        max: row[`max_${col}`] ? new Date(row[`max_${col}`]).toISOString().split('T')[0] : null,
      };
    }
    return ranges;
  } catch {
    return {};
  }
}

/**
 * Count duplicate PK values (PK appearing more than once).
 * Returns { duplicateGroups: N, duplicateRows: N } or null if no PK.
 */
async function getDuplicatePkCount(pool, tableName, pkColumn) {
  if (!pkColumn) return null;

  try {
    const result = await pool.request().query(
      `SELECT
         COUNT(*) AS duplicate_groups,
         SUM(cnt - 1) AS excess_rows
       FROM (
         SELECT ${esc(pkColumn)}, COUNT(*) AS cnt
         FROM dbo.${esc(tableName)}
         GROUP BY ${esc(pkColumn)}
         HAVING COUNT(*) > 1
       ) AS dupes`
    );
    const row = result.recordset[0];
    return {
      duplicateGroups: row.duplicate_groups || 0,
      excessRows:      row.excess_rows      || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Check a single FK relationship: count orphan rows in child table.
 * An orphan is a child row whose FK value does not appear in the parent.
 */
async function checkFk(pool, fkCheck) {
  const { childTable, childCol, parentTable, parentCol } = fkCheck;
  try {
    const totalResult = await pool.request().query(
      `SELECT COUNT(*) AS cnt FROM dbo.${esc(childTable)} WHERE ${esc(childCol)} IS NOT NULL`
    );
    const total = totalResult.recordset[0].cnt;

    if (total === 0) return { total: 0, orphans: 0, orphanPct: 0 };

    const orphanResult = await pool.request().query(
      `SELECT COUNT(*) AS cnt
       FROM dbo.${esc(childTable)} c
       WHERE c.${esc(childCol)} IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM dbo.${esc(parentTable)} p
           WHERE p.${esc(parentCol)} = c.${esc(childCol)}
         )`
    );
    const orphans = orphanResult.recordset[0].cnt;
    return {
      total,
      orphans,
      orphanPct: total > 0 ? (orphans / total) * 100 : 0,
    };
  } catch (err) {
    return { total: null, orphans: null, orphanPct: null, error: err.message };
  }
}

// ── Core audit runner ────────────────────────────────────────────────────────

async function auditTable(pool, tableName) {
  const meta = TABLE_META[tableName];

  // Check if table exists at all
  const rowCount = await getRowCount(pool, tableName);
  if (rowCount === null) {
    return { tableName, exists: false, status: 'WARN', issues: ['Table not found in source DB'] };
  }

  const issues  = [];
  let   hasFail = false;

  // Fetch all columns for NULL analysis
  let columns = [];
  try {
    columns = await getColumns(pool, tableName);
  } catch (err) {
    issues.push(`Could not read column list: ${err.message}`);
  }

  // NULL rates
  let nullRates = {};
  if (rowCount > 0 && columns.length > 0) {
    try {
      nullRates = await getNullRates(pool, tableName, columns, rowCount);
    } catch (err) {
      issues.push(`NULL rate query failed: ${err.message}`);
    }
  }

  // Flag high-NULL columns
  const highNullCols = [];
  for (const [col, rate] of Object.entries(nullRates)) {
    if (rate != null && rate > NULL_WARN_THRESHOLD) {
      highNullCols.push({ col, rate: parseFloat(rate.toFixed(1)) });
    }
  }

  // Date ranges
  const dateRanges = rowCount > 0
    ? await getDateRanges(pool, tableName, meta.dateColumns)
    : {};

  // Duplicate PK check
  let dupResult = null;
  if (meta.pk) {
    dupResult = await getDuplicatePkCount(pool, tableName, meta.pk);
    if (dupResult && dupResult.duplicateGroups > 0) {
      hasFail = true;
      issues.push(`Duplicate PKs: ${dupResult.duplicateGroups} groups (${dupResult.excessRows} excess rows)`);
    }
  }

  // Determine status
  let status;
  if (hasFail) {
    status = 'FAIL';
  } else if (highNullCols.length > 0 || issues.length > 0) {
    status = 'WARN';
  } else {
    status = 'PASS';
  }

  return {
    tableName,
    exists: true,
    status,
    rowCount,
    nullRates: Object.fromEntries(
      Object.entries(nullRates).map(([k, v]) => [k, v != null ? parseFloat(v.toFixed(1)) : null])
    ),
    highNullCols,
    dateRanges,
    duplicatePk: dupResult,
    issues,
  };
}

// ── Console output ───────────────────────────────────────────────────────────

function printSummaryTable(tableResults, fkResults) {
  const divider = '─'.repeat(80);

  console.log('\n' + divider);
  console.log('  LSJ-HUB Pre-Migration Source Data Quality Audit');
  console.log(divider);

  // Table summary
  console.log('\n  TABLE AUDIT\n');
  console.log(
    '  ' + pad('Table', 26) + pad('Status', 8) + lpad('Rows', 10) +
    '  ' + pad('High-NULL columns', 30) + 'Issues'
  );
  console.log('  ' + '─'.repeat(76));

  for (const r of tableResults) {
    const statusLabel =
      r.status === 'FAIL' ? '[FAIL]' :
      r.status === 'WARN' ? '[WARN]' : '[PASS]';

    const highNull = r.highNullCols && r.highNullCols.length > 0
      ? r.highNullCols.map(c => `${c.col}(${pct(c.rate)})`).join(', ')
      : '';

    const issueText = (r.issues || []).join('; ');
    const rowsStr   = r.exists ? lpad(r.rowCount, 8) : lpad('N/A', 8);

    console.log(
      '  ' + pad(r.tableName, 26) + pad(statusLabel, 8) + rowsStr +
      '  ' + pad(highNull.substring(0, 28), 30) + issueText
    );
  }

  // Date ranges for tables that have them
  const withDates = tableResults.filter(r => r.exists && r.dateRanges && Object.keys(r.dateRanges).length > 0);
  if (withDates.length > 0) {
    console.log('\n  DATE RANGES\n');
    for (const r of withDates) {
      for (const [col, range] of Object.entries(r.dateRanges)) {
        if (range.min || range.max) {
          console.log(`  ${pad(r.tableName + '.' + col, 44)}  ${range.min || 'NULL'} → ${range.max || 'NULL'}`);
        }
      }
    }
  }

  // FK check results
  if (fkResults.length > 0) {
    console.log('\n  FK INTEGRITY CHECKS\n');
    console.log(
      '  ' + pad('Relationship', 50) + pad('Status', 8) +
      lpad('Total', 8) + lpad('Orphans', 10) + '  Rate'
    );
    console.log('  ' + '─'.repeat(76));

    for (const f of fkResults) {
      const statusLabel =
        f.status === 'FAIL' ? '[FAIL]' :
        f.status === 'WARN' ? '[WARN]' : '[PASS]';
      const total   = f.result.total   != null ? lpad(f.result.total,   6) : lpad('ERR', 6);
      const orphans = f.result.orphans != null ? lpad(f.result.orphans, 8) : lpad('ERR', 8);
      const rate    = f.result.orphanPct != null ? pct(f.result.orphanPct) : 'ERR';
      console.log(
        '  ' + pad(f.description, 50) + pad(statusLabel, 8) +
        total + orphans + '  ' + rate
      );
      if (f.result.error) {
        console.log(`  ${''.padEnd(50)} ERROR: ${f.result.error}`);
      }
    }
  }

  // Summary counts
  const passCnt  = tableResults.filter(r => r.status === 'PASS').length;
  const warnCnt  = tableResults.filter(r => r.status === 'WARN').length;
  const failCnt  = tableResults.filter(r => r.status === 'FAIL').length;
  const fkFails  = fkResults.filter(r => r.status === 'FAIL').length;

  console.log('\n' + divider);
  console.log(`  Tables: ${passCnt} PASS  ${warnCnt} WARN  ${failCnt} FAIL`);
  if (fkResults.length > 0) {
    const fkPassCnt = fkResults.filter(r => r.status === 'PASS').length;
    const fkWarnCnt = fkResults.filter(r => r.status === 'WARN').length;
    console.log(`  FK checks: ${fkPassCnt} PASS  ${fkWarnCnt} WARN  ${fkFails} FAIL`);
  }
  console.log(divider + '\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.farm) {
    // Allow --farm to override MSSQL_DATABASE
    process.env.MSSQL_DATABASE = args.farm;
  }

  const db = process.env.MSSQL_DATABASE || 'CATTLE';
  console.log(`\n[INFO] Connecting to MSSQL: ${process.env.MSSQL_HOST}\\${process.env.MSSQL_INSTANCE || ''} → database "${db}"`);

  let pool;
  try {
    pool = await connectMssql();
    console.log('[INFO] Connected.\n');
  } catch (err) {
    console.error(`[ERROR] Could not connect to MSSQL: ${err.message}`);
    process.exit(1);
  }

  // Derive the 19 structured (mapped) tables from categories.js
  const { mapped } = getCategorySummary();
  // Restrict to the tables we have metadata for (the core 19 in TABLE_META)
  const auditTables = Object.keys(TABLE_META).filter(t => mapped.includes(t));

  console.log(`[INFO] Auditing ${auditTables.length} structured tables...`);

  // Run table audits sequentially to avoid saturating the connection pool
  const tableResults = [];
  for (const tableName of auditTables) {
    process.stdout.write(`  Checking ${tableName}... `);
    try {
      const result = await auditTable(pool, tableName);
      tableResults.push(result);
      console.log(result.status);
    } catch (err) {
      tableResults.push({
        tableName, exists: false,
        status: 'WARN',
        issues: [`Audit query error: ${err.message}`],
      });
      console.log('WARN');
    }
  }

  // Run FK checks
  console.log(`\n[INFO] Running ${FK_CHECKS.length} FK integrity checks...`);
  const fkResults = [];
  for (const fkCheck of FK_CHECKS) {
    process.stdout.write(`  ${fkCheck.description}... `);
    try {
      const result = await checkFk(pool, fkCheck);
      const status =
        result.orphanPct == null      ? 'WARN' :
        result.orphanPct > FK_FAIL_THRESHOLD ? 'FAIL' :
        result.orphanPct > 0          ? 'WARN' : 'PASS';
      fkResults.push({ description: fkCheck.description, result, status });
      console.log(status);
    } catch (err) {
      fkResults.push({
        description: fkCheck.description,
        result: { error: err.message, total: null, orphans: null, orphanPct: null },
        status: 'WARN',
      });
      console.log('WARN');
    }
  }

  // Print console summary
  printSummaryTable(tableResults, fkResults);

  // Write JSON output if requested
  if (args.output) {
    const output = {
      auditDate:   new Date().toISOString(),
      farm:        db,
      mssqlHost:   process.env.MSSQL_HOST,
      tableAudit:  tableResults,
      fkChecks:    fkResults,
      summary: {
        tablesPass: tableResults.filter(r => r.status === 'PASS').length,
        tablesWarn: tableResults.filter(r => r.status === 'WARN').length,
        tablesFail: tableResults.filter(r => r.status === 'FAIL').length,
        fkPass:     fkResults.filter(r => r.status === 'PASS').length,
        fkWarn:     fkResults.filter(r => r.status === 'WARN').length,
        fkFail:     fkResults.filter(r => r.status === 'FAIL').length,
      },
    };

    const fs   = require('fs');
    const path = require('path');
    const outPath = path.isAbsolute(args.output)
      ? args.output
      : path.join(process.cwd(), args.output);

    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`[INFO] Full audit report written to: ${outPath}\n`);
  }

  await closePools();

  // Exit 1 if any table has duplicate PKs or any FK check exceeds the fail threshold
  const anyFail = tableResults.some(r => r.status === 'FAIL') ||
                  fkResults.some(r => r.status === 'FAIL');
  process.exit(anyFail ? 1 : 0);
}

main().catch(err => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
