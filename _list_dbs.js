const { Pool } = require('pg');
const p = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'postgres' });
(async () => {
  const r = await p.query("SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY datname");
  console.log(r.rows.map(x => x.datname).join('\n'));
  await p.end();
})();
