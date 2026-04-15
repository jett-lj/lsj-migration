const { Client } = require('pg');

async function verify() {
  const c = new Client({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'barmount' });
  await c.connect();

  const checks = [
    ['cattle.cows', 'CATTLE'],
    ['health.drugs_given', 'CATTLE'],
    ['health.drugs', 'CATTLE'],
    ['finance.costs', 'CATTLE'],
    ['contacts.contacts', 'CATTLE'],
    ['purchasing.purchase_lots', 'CATTLE'],
    ['carcase.carcase_data', 'CATTLE'],
    ['commodity.commodtrans', 'CATTLE_Feed'],
    ['feed.bunk_readings', 'CATTLE_Feed'],
    ['pen.log_pens_file', 'CATTLE_Feed'],
    ['digistar.digistar_data_history', 'CATTLE_Feed'],
    ['finance.costs_feed_detail', 'CATTLE_Feedtrans'],
  ];

  console.log('TABLE'.padEnd(45) + 'SOURCE'.padEnd(20) + 'ROWS');
  console.log('-'.repeat(80));
  for (const [tbl, src] of checks) {
    try {
      const r = await c.query('SELECT count(*) FROM ' + tbl);
      console.log(tbl.padEnd(45) + src.padEnd(20) + Number(r.rows[0].count).toLocaleString());
    } catch(e) {
      console.log(tbl.padEnd(45) + src.padEnd(20) + 'ERROR: ' + e.message.split('\n')[0]);
    }
  }

  const tblCount = await c.query("SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')");
  console.log('\nTotal tables in barmount: ' + tblCount.rows[0].count);

  const totalRows = await c.query("SELECT sum(n_live_tup) as total FROM pg_stat_user_tables");
  console.log('Total rows (approx): ' + Number(totalRows.rows[0].total).toLocaleString());

  await c.end();
}
verify().catch(e => { console.error(e); process.exit(1); });
