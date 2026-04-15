const { Client } = require('pg');
(async () => {
  const c = new Client({host:'localhost',port:5432,user:'lsj_admin',password:'lsj_password',database:'barmount'});
  await c.connect();

  // Get view definition
  const vd = await c.query("SELECT pg_get_viewdef('legacy.commodtrans', true) as def");
  console.log('View def captured');

  // Drop view, fix column type, recreate view
  await c.query('DROP VIEW IF EXISTS legacy.commodtrans');
  console.log('Dropped legacy.commodtrans view');

  await c.query('ALTER TABLE commodity.commodtrans ALTER COLUMN contract_no TYPE TEXT');
  console.log('Fixed contract_no: int4 -> TEXT');

  await c.query('CREATE VIEW legacy.commodtrans AS ' + vd.rows[0].def);
  console.log('Recreated legacy.commodtrans view');

  // Truncate for re-insert
  await c.query('TRUNCATE TABLE commodity.commodtrans CASCADE');
  console.log('Truncated commodtrans');

  // Verify
  const res = await c.query(`
    SELECT column_name, udt_name FROM information_schema.columns
    WHERE table_schema='commodity' AND table_name='commodtrans' AND column_name='contract_no'
  `);
  console.log('Verified contract_no type:', res.rows[0].udt_name);

  await c.end();
})();
