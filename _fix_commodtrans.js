const { Client } = require('pg');
(async () => {
  const c = new Client({host:'localhost',port:5432,user:'lsj_admin',password:'lsj_password',database:'barmount'});
  await c.connect();

  // Get the view definition
  const vd = await c.query("SELECT pg_get_viewdef('legacy.commodtrans', true) as def");
  console.log('View definition:');
  console.log(vd.rows[0].def);

  // Drop view, alter columns, recreate view
  await c.query('DROP VIEW IF EXISTS legacy.commodtrans');
  console.log('Dropped legacy.commodtrans view');

  await c.query('ALTER TABLE commodity.commodtrans ALTER COLUMN value TYPE NUMERIC(15,4)');
  await c.query('ALTER TABLE commodity.commodtrans ALTER COLUMN commod_mast_value TYPE NUMERIC(15,4)');
  console.log('Widened value and commod_mast_value to NUMERIC(15,4)');

  // Recreate the view
  await c.query('CREATE VIEW legacy.commodtrans AS ' + vd.rows[0].def);
  console.log('Recreated legacy.commodtrans view');

  // Truncate commodtrans for re-insert
  await c.query('TRUNCATE TABLE commodity.commodtrans CASCADE');
  const r = await c.query('SELECT count(*) FROM commodity.commodtrans');
  console.log('commodtrans after truncate:', r.rows[0].count);

  await c.end();
})();
