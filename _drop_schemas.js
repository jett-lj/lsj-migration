const { Pool } = require('pg');
const p = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'bos_grazing' });
(async () => {
  const schemas = ['cattle','pen','weighing','feed','health','finance','carcase','purchasing','dispatch','inventory','genetics','classification','compliance','system','digistar','infrastructure','legacy','breeding','commodity','contacts','operations','reporting','transport'];
  for (const s of schemas) await p.query('DROP SCHEMA IF EXISTS ' + s + ' CASCADE');
  const r = await p.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast','public') ORDER BY 1");
  console.log('Remaining schemas:', r.rows.map(x => x.schema_name));
  await p.end();
})();
