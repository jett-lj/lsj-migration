const { Pool } = require('pg');
const pool = new Pool({ host:'localhost', port:5432, database:'barmount', user:'lsj_admin', password:'lsj_password' });

(async () => {
  // Check row counts for key tables
  const tables = [
    'cattle.cows', 'health.drugs_given', 'weighing.weighing_events',
    'pen.penshistory', 'finance.costs', 'health.sick_beast_records'
  ];
  console.log('=== Post-migration row counts ===');
  for (const t of tables) {
    const r = await pool.query('SELECT count(*) FROM ' + t);
    console.log(t + ': ' + r.rows[0].count);
  }

  // Check triggers were created
  const trg = await pool.query("SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%_updated_at'");
  console.log('\n=== updated_at triggers created: ' + trg.rows[0].count);

  // Check partition tables for 2028/2029
  const parts = await pool.query("SELECT tablename FROM pg_tables WHERE tablename LIKE '%_y2028' OR tablename LIKE '%_y2029' ORDER BY tablename");
  console.log('\n=== 2028/2029 partitions ===');
  parts.rows.forEach(r => console.log(r.tablename));

  // Check FK integrity
  const fk = await pool.query("SELECT count(*) FROM cattle.cows WHERE ear_tag IS NULL");
  console.log('\nNull ear_tags: ' + fk.rows[0].count);

  const neg = await pool.query("SELECT count(*) FROM cattle.cows WHERE start_weight < 0");
  console.log('Negative weights: ' + neg.rows[0].count);

  // Check updated_at columns were added to OG tables
  const cols = await pool.query(`
    SELECT table_schema || '.' || table_name AS tbl
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY 1
  `);
  console.log('\n=== Tables with updated_at column: ' + cols.rows.length);

  await pool.end();
})();
