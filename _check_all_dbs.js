'use strict';
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const p0 = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  const dbs = await p0.query(`SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY datname`);
  console.log('Databases:');
  for (const d of dbs.rows) console.log('  ' + d.datname);
  await p0.end();

  for (const d of dbs.rows.filter(x => !['postgres','lsj_system'].includes(x.datname))) {
    const p = new Pool({
      host: process.env.DB_HOST, port: +process.env.DB_PORT,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      database: d.datname,
    });
    try {
      const r = await p.query(`SELECT count(*)::int AS n FROM pg_stat_user_tables WHERE n_live_tup > 0`);
      const tot = await p.query(`SELECT COALESCE(SUM(n_live_tup),0)::bigint AS total FROM pg_stat_user_tables`);
      console.log(`\n[${d.datname}] tables-with-rows=${r.rows[0].n}  total-rows=${tot.rows[0].total}`);
      if (r.rows[0].n > 0) {
        const top = await p.query(`SELECT schemaname||'.'||relname AS t, n_live_tup FROM pg_stat_user_tables WHERE n_live_tup>0 ORDER BY n_live_tup DESC LIMIT 10`);
        for (const row of top.rows) console.log('  ' + row.t.padEnd(50) + ' ' + row.n_live_tup);
      }
      // migration_run table?
      const mr = await p.query(`SELECT to_regclass('system.migration_run') AS r`);
      if (mr.rows[0].r) {
        const last = await p.query(`SELECT source_table, target_table, status, rows_loaded, rows_failed, started_at, finished_at FROM system.migration_run ORDER BY started_at DESC NULLS LAST LIMIT 8`);
        console.log('  Recent migration_run:');
        for (const row of last.rows) console.log('    ' + JSON.stringify(row));
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    await p.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
