// Quick script to ensure the PG database exists
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const p = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  const res = await p.query("SELECT datname FROM pg_database WHERE datname = 'rangersvalley'");
  if (res.rows.length === 0) {
    await p.query('CREATE DATABASE rangersvalley');
    console.log('Created database: rangersvalley');
  } else {
    console.log('Database rangersvalley already exists');
  }
  await p.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
