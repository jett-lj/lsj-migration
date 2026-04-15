require('dotenv').config();

const { Client } = require('pg');
const sql = require('mssql');
const { mappings } = require('./mappings');
const { getMssqlConfig } = require('./config');

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function pct(part, total) {
  if (!total) return '0.0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function pad(value, width, align = 'right') {
  const text = String(value);
  return align === 'left' ? text.padEnd(width) : text.padStart(width);
}

async function main() {
  const cattleMapping = mappings.find((mapping) => mapping.sourceTable === 'Cattle');
  if (!cattleMapping) throw new Error('Cattle mapping not found');

  const mssqlPool = await sql.connect(getMssqlConfig());
  const pg = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barmount',
  });
  await pg.connect();

  try {
    const sourceRowsResult = await mssqlPool.request().query(cattleMapping.query);
    const sourceRows = sourceRowsResult.recordset;
    const total = sourceRows.length;

    const breedLookupResult = await pg.query("SELECT code, name FROM system.lookups WHERE category = 'breed'");
    const breedMap = {};
    for (const row of breedLookupResult.rows) {
      breedMap[row.code] = row.name;
    }
    const lookups = { breedMap };

    const sourceCounts = new Map();
    const mappedCounts = new Map();
    for (const column of cattleMapping.columns) {
      sourceCounts.set(column.target, 0);
      mappedCounts.set(column.target, 0);
    }

    for (const rawRow of sourceRows) {
      const mappedRow = {};
      for (const column of cattleMapping.columns) {
        const rawValue = rawRow[column.source];
        if (isPresent(rawValue)) {
          sourceCounts.set(column.target, sourceCounts.get(column.target) + 1);
        }
        mappedRow[column.target] = column.transform ? column.transform(rawValue) : rawValue;
      }
      if (typeof cattleMapping.transformRow === 'function') {
        cattleMapping.transformRow(rawRow, mappedRow, lookups);
      }
      for (const column of cattleMapping.columns) {
        if (isPresent(mappedRow[column.target])) {
          mappedCounts.set(column.target, mappedCounts.get(column.target) + 1);
        }
      }
    }

    const targetExprs = cattleMapping.columns.map((column) => {
      const target = column.target;
      return `COUNT(*) FILTER (WHERE CASE WHEN pg_typeof("${target}")::text IN ('text','character varying','character') THEN NULLIF(BTRIM("${target}"::text), '') IS NOT NULL ELSE "${target}" IS NOT NULL END) AS "${target}"`;
    });
    const targetCountsResult = await pg.query(`SELECT ${targetExprs.join(', ')} FROM cattle.cows`);
    const targetCounts = targetCountsResult.rows[0];

    const report = cattleMapping.columns.map((column) => {
      const sourceFilled = sourceCounts.get(column.target);
      const mappedFilled = mappedCounts.get(column.target);
      const targetFilled = Number(targetCounts[column.target] || 0);
      return {
        source: column.source,
        target: column.target,
        sourceFilled,
        mappedFilled,
        targetFilled,
        sourcePct: pct(sourceFilled, total),
        mappedPct: pct(mappedFilled, total),
        targetPct: pct(targetFilled, total),
        lostInMapping: sourceFilled - mappedFilled,
        lostAfterMapping: mappedFilled - targetFilled,
      };
    });

    report.sort((a, b) => {
      const deltaA = Math.max(a.lostInMapping, a.lostAfterMapping);
      const deltaB = Math.max(b.lostInMapping, b.lostAfterMapping);
      return deltaB - deltaA || a.target.localeCompare(b.target);
    });

    console.log(`dbo.Cattle distinct rows used by migration: ${total.toLocaleString()}`);
    console.log('');
    console.log(
      pad('Source', 24, 'left') +
      pad('Target', 28, 'left') +
      pad('Raw', 9) +
      pad('Mapped', 9) +
      pad('Target', 9) +
      pad('MapLoss', 10) +
      pad('LoadLoss', 10)
    );
    console.log('-'.repeat(99));
    for (const row of report) {
      console.log(
        pad(row.source, 24, 'left') +
        pad(row.target, 28, 'left') +
        pad(row.sourceFilled.toLocaleString(), 9) +
        pad(row.mappedFilled.toLocaleString(), 9) +
        pad(row.targetFilled.toLocaleString(), 9) +
        pad(row.lostInMapping.toLocaleString(), 10) +
        pad(row.lostAfterMapping.toLocaleString(), 10)
      );
    }

    const notable = report.filter((row) => row.lostInMapping > 0 || row.lostAfterMapping > 0);
    console.log('');
    console.log('Notable mismatches:');
    if (notable.length === 0) {
      console.log('  none');
    } else {
      for (const row of notable.slice(0, 20)) {
        console.log(
          `  ${row.source} -> ${row.target}: raw=${row.sourceFilled.toLocaleString()} (${row.sourcePct}), ` +
          `mapped=${row.mappedFilled.toLocaleString()} (${row.mappedPct}), ` +
          `target=${row.targetFilled.toLocaleString()} (${row.targetPct})`
        );
      }
    }
  } finally {
    await pg.end();
    await mssqlPool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});