const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function dropDbs() {
  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres',
  });

  for (const db of ['cattle_feed', 'cattle_feedtrans']) {
    try {
      // Terminate existing connections
      await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}' AND pid <> pg_backend_pid()`);
      await pool.query(`DROP DATABASE IF EXISTS "${db}"`);
      console.log(`Dropped: ${db}`);
    } catch(e) {
      console.error(`Error dropping ${db}:`, e.message);
    }
  }
  await pool.end();
}
dropDbs();
