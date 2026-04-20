const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

(async () => {
  // 1. List all weight-related columns on cattle.cows
  const cols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'cattle' AND table_name = 'cows'
      AND column_name ILIKE '%weight%'
    ORDER BY ordinal_position
  `);
  console.log('=== Weight columns on cattle.cows ===');
  console.table(cols.rows);

  // 2. For each weight column, count non-null values
  if (cols.rows.length > 0) {
    const countExprs = cols.rows.map(c =>
      `COUNT(${c.column_name}) AS "${c.column_name}"`
    ).join(', ');
    const counts = await pool.query(`SELECT COUNT(*) AS total, ${countExprs} FROM cattle.cows`);
    console.log('=== Non-null counts ===');
    console.table(counts.rows);
  }

  // 3. Sample rows with any weight data
  if (cols.rows.length > 0) {
    const weightCols = cols.rows.map(c => c.column_name).join(', ');
    const orClause = cols.rows.map(c => `${c.column_name} IS NOT NULL`).join(' OR ');
    const sample = await pool.query(
      `SELECT id, ear_tag, ${weightCols} FROM cattle.cows WHERE ${orClause} LIMIT 10`
    );
    console.log('=== Sample rows with weight data ===');
    console.table(sample.rows);
  }

  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
