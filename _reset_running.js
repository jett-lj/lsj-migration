'use strict';
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'barmount',
  });
  const r = await p.query(`
    UPDATE system.migration_log
       SET status = 'failed',
           completed_at = now(),
           error_details = COALESCE(error_details,'') || ' [marked failed on resume]'
     WHERE status = 'running'
     RETURNING id, source_table, started_at`);
  console.log('Marked ' + r.rowCount + ' row(s) failed:');
  for (const row of r.rows) console.log('  ' + JSON.stringify(row));
  await p.end();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
