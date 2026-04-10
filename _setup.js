const { Pool } = require('pg');
async function main() {
  const p = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'postgres', max:1 });
  await p.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'victoria_hill' AND pid <> pg_backend_pid()");
  await p.query('DROP DATABASE IF EXISTS victoria_hill');
  await p.query('CREATE DATABASE victoria_hill');
  console.log('Recreated victoria_hill');
  await p.end();
}
main().catch(e => console.error(e));
