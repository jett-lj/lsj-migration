require('dotenv').config();
const { Pool } = require('pg');

const TARGET = process.argv[2] || 'rangers_valley';

function maintCfg() {
  if (process.env.PG_CONNECTION_STRING) {
    const url = new URL(process.env.PG_CONNECTION_STRING);
    url.pathname = '/postgres';
    return { connectionString: url.toString(), max: 1 };
  }
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres',
    max: 1,
  };
}

(async () => {
  const pool = new Pool(maintCfg());
  await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [TARGET]);
  await pool.query(`DROP DATABASE IF EXISTS "${TARGET}"`);
  await pool.query(`CREATE DATABASE "${TARGET}"`);
  console.log(`Recreated database: ${TARGET}`);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
