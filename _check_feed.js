const { Pool } = require('pg');
const p = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'cattle_feed' });

async function check() {
  try {
    const r = await p.query(`
      SELECT 'commodtrans' as tbl, count(*)::int as cnt FROM commodity.commodtrans
      UNION ALL SELECT 'commodcontracts', count(*)::int FROM commodity.commodcontracts
      UNION ALL SELECT 'manure_locations', count(*)::int FROM transport.manure_locations
    `);
    console.table(r.rows);

    // Check for any error patterns
    const ct = await p.query(`SELECT contract_no FROM commodity.commodtrans LIMIT 5`);
    console.log('\nSample commodtrans.contract_no:', ct.rows.map(r => r.contract_no));

    const cc = await p.query(`SELECT contract_no FROM commodity.commodcontracts LIMIT 5`);
    console.log('Sample commodcontracts.contract_no:', cc.rows.map(r => r.contract_no));

    const ml = await p.query(`SELECT direction, location_name FROM transport.manure_locations LIMIT 5`);
    console.log('Sample manure_locations:', ml.rows);
  } catch(e) {
    console.error('ERROR:', e.message);
  }
  await p.end();
}
check();
