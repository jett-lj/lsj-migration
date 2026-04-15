/**
 * Probe cattle.cows — show which columns are populated vs empty/null
 */
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: 'localhost', port: 5432,
    user: 'lsj_admin', password: 'lsj_password',
    database: 'barmount',
  });
  await c.connect();

  // Total row count
  const total = await c.query('SELECT count(*) as n FROM cattle.cows');
  console.log(`cattle.cows: ${Number(total.rows[0].n).toLocaleString()} total rows\n`);

  // Get all columns
  const cols = await c.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'cattle' AND table_name = 'cows'
    ORDER BY ordinal_position
  `);

  // For each column, count populated values.
  // Text columns treat blank strings as empty so fill rates are meaningful.
  const results = [];
  for (const col of cols.rows) {
    const name = col.column_name;
    const isTextLike = ['text', 'varchar', 'bpchar'].includes(col.udt_name);
    const filledExpr = isTextLike
      ? `NULLIF(BTRIM("${name}"), '') IS NOT NULL`
      : `"${name}" IS NOT NULL`;
    const res = await c.query(`
      SELECT
        count(*) FILTER (WHERE ${filledExpr}) as filled,
        count(*) FILTER (WHERE NOT (${filledExpr})) as empty,
        count(*) as total
      FROM cattle.cows
    `);
    const filled = Number(res.rows[0].filled);
    const empty = Number(res.rows[0].empty);
    const totalN = Number(res.rows[0].total);
    const pct = totalN > 0 ? ((filled / totalN) * 100).toFixed(1) : '0.0';
    results.push({ name, type: col.udt_name, filled, empty, pct: parseFloat(pct) });
  }

  // Sort: filled columns first, then empty
  results.sort((a, b) => b.pct - a.pct);

  // Display
  const nameW = 40;
  const typeW = 15;
  console.log('Column'.padEnd(nameW) + 'Type'.padEnd(typeW) + 'Filled'.padStart(10) + 'Empty'.padStart(10) + '  Fill %');
  console.log('-'.repeat(nameW + typeW + 30));

  let filledCount = 0;
  let emptyCount = 0;
  for (const r of results) {
    const bar = r.pct > 0 ? (r.pct === 100 ? '████' : r.pct > 50 ? '███░' : r.pct > 0 ? '██░░' : '') : '';
    console.log(
      r.name.padEnd(nameW) +
      r.type.padEnd(typeW) +
      r.filled.toLocaleString().padStart(10) +
      r.empty.toLocaleString().padStart(10) +
      `  ${r.pct.toFixed(1).padStart(5)}%  ${bar}`
    );
    if (r.pct > 0) filledCount++;
    else emptyCount++;
  }

  console.log(`\n${filledCount} columns with data, ${emptyCount} completely empty (100% NULL)`);

  // Show sample of a few rows to see what's in key fields
  console.log('\n--- Sample rows (first 5) ---');
  const sample = await c.query(`
      SELECT id, legacy_beast_id, ear_tag, eid, breed, sex,
        pen_number, purch_lot_no, feedlot_entry_date,
        start_weight, sale_weight, status, teeth,
        vendorid, agentid
    FROM cattle.cows
    ORDER BY id
    LIMIT 5
  `);
  console.table(sample.rows);

  await c.end();
})();
