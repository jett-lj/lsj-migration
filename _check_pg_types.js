const { Client } = require('pg');
(async () => {
  const c = new Client({host:'localhost',port:5432,user:'lsj_admin',password:'lsj_password',database:'barmount'});
  await c.connect();

  // Check actual column types in PG for commodtrans
  const res = await c.query(`
    SELECT column_name, data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'commodity' AND table_name = 'commodtrans'
    ORDER BY ordinal_position
  `);
  console.log('commodity.commodtrans column types:');
  res.rows.forEach(r => {
    const detail = r.character_maximum_length ? `(${r.character_maximum_length})` 
                 : r.numeric_precision ? `(${r.numeric_precision},${r.numeric_scale})`
                 : '';
    console.log(`  ${r.column_name.padEnd(30)} ${r.udt_name}${detail}`);
  });

  // Check for triggers
  const triggers = await c.query(`
    SELECT trigger_name, event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'commodity' AND event_object_table = 'commodtrans'
  `);
  console.log('\nTriggers:', triggers.rows.length > 0 ? triggers.rows : 'none');

  await c.end();
})();
