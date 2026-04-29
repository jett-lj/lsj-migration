const { Pool } = require('pg');
(async () => {
  const p = new Pool({ host: 'localhost', user: 'lsj_admin', password: 'lsj_password', database: 'avondale_feedlot' });
  const r = await p.query(`
    SELECT source_table, rows_read, rows_written, rows_skipped, rows_errored
    FROM system.migration_log
    WHERE source_table IN ('Cattle','Carcase_data')
    ORDER BY id DESC
  `);
  console.table(r.rows);
  await p.end();
})().catch(e => { console.error(e); process.exit(1); });
