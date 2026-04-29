'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SYSTEM_DB = process.env.SYSTEM_DB_NAME || 'lsj_system';
const base = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

(async () => {
  // 1. Ensure lsj_system DB exists
  const admin = new Pool({ ...base, database: 'postgres', max: 2 });
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [SYSTEM_DB]);
  if (!exists.rows.length) {
    console.log(`Creating database ${SYSTEM_DB}...`);
    await admin.query(`CREATE DATABASE ${SYSTEM_DB}`);
  } else {
    console.log(`Database ${SYSTEM_DB} already exists.`);
  }
  await admin.end();

  // 2. Apply schema
  const sys = new Pool({ ...base, database: SYSTEM_DB, max: 2 });
  console.log('Applying schema-system.sql...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema-system.sql'), 'utf8');
  await sys.query(schema);
  console.log('  schema applied.');

  // 3. Apply seed
  console.log('Applying seed-system.sql...');
  const seed = fs.readFileSync(path.join(__dirname, 'seed-system.sql'), 'utf8');
  await sys.query(seed);
  console.log('  seed applied.');

  // 4. Quick summary
  const counts = await sys.query(`
    SELECT 'users' AS t, COUNT(*)::INT AS n FROM users
    UNION ALL SELECT 'farms', COUNT(*) FROM farms
    UNION ALL SELECT 'subscription_plans', COUNT(*) FROM subscription_plans
    UNION ALL SELECT 'subscription_modules', COUNT(*) FROM subscription_modules
    UNION ALL SELECT 'farm_subscriptions', COUNT(*) FROM farm_subscriptions
    UNION ALL SELECT 'legacy_farm_users', COUNT(*) FROM legacy_farm_users
  `);
  console.log('\nSystem DB row counts:');
  for (const r of counts.rows) console.log(`  ${r.t.padEnd(22)} ${r.n}`);

  await sys.end();
})().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
