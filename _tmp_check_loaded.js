require('dotenv').config();
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, max: 1,
  });
  const r = await pool.query(`
    SELECT n.nspname || '.' || c.relname AS tbl,
           c.reltuples::bigint AS est_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema')
      AND c.reltuples > 0
    ORDER BY c.reltuples DESC
    LIMIT 40`);
  console.table(r.rows);
  const total = await pool.query(`SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')`);
  console.log('Total tables:', total.rows[0].count);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
