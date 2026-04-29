require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'thomas_foods',
    connectionTimeoutMillis: 5000,
  });

  const q = `
    SELECT id, source_table, rows_read, rows_written, rows_skipped, rows_errored,
           LEFT(COALESCE(error_details, ''), 400) AS error
    FROM system.migration_log
    WHERE status = 'failed'
    ORDER BY id
  `;
  const r = await pool.query(q);
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
})();
