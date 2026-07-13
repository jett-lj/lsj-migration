/**
 * Create one PostgreSQL database per farm folder under Cattle_databases/.
 *
 * Naming: lowercased, non-alphanumeric → underscore, collapsed, trimmed.
 *   "Anna Plains Feedlot"  → anna_plains_feedlot
 *   "P&C and D&G Tuohey"   → p_c_and_d_g_tuohey
 *
 * Skips folders that look like SQL Server backup containers (e.g. RV_SQL_databases).
 * Idempotent: existing databases are reported and skipped.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'lsj_admin',
  password: process.env.DB_PASSWORD, // no plaintext fallback — set in .env (gitignored)
  database: 'postgres',
  max: 1,
};

const SKIP_FOLDERS = new Set(['RV_SQL_databases']);

function slugify(name) {
  let s = name.toLowerCase()
    .replace(/&/g, '_and_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  // PG identifiers must start with a letter or underscore
  if (!/^[a-z_]/.test(s)) s = 'farm_' + s;
  // PG identifier max length is 63 bytes
  if (s.length > 63) s = s.slice(0, 63).replace(/_+$/, '');
  return s;
}

async function main() {
  const root = path.join(__dirname, 'Cattle_databases');
  const folders = fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(n => !SKIP_FOLDERS.has(n))
    .sort();

  console.log(`Found ${folders.length} farm folder(s):\n`);
  const plan = folders.map(folder => ({ folder, db: slugify(folder) }));
  for (const { folder, db } of plan) {
    console.log(`  ${folder.padEnd(35)} → ${db}`);
  }

  // Detect duplicate slugs (should not happen but worth checking)
  const seen = new Map();
  for (const { folder, db } of plan) {
    if (seen.has(db)) {
      console.error(`\n[ERROR] Duplicate slug "${db}" from "${folder}" and "${seen.get(db)}"`);
      process.exit(1);
    }
    seen.set(db, folder);
  }

  console.log('\nConnecting to PostgreSQL...');
  const pool = new Pool(PG);
  try {
    let created = 0, existed = 0, failed = 0;
    for (const { folder, db } of plan) {
      const ex = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [db]);
      if (ex.rowCount > 0) {
        console.log(`  [SKIP]    ${db.padEnd(45)} already exists`);
        existed++;
        continue;
      }
      try {
        await pool.query(`CREATE DATABASE "${db}"`);
        console.log(`  [CREATED] ${db.padEnd(45)} (from "${folder}")`);
        created++;
      } catch (err) {
        console.error(`  [FAIL]    ${db.padEnd(45)} ${err.message}`);
        failed++;
      }
    }
    console.log(`\nDone. Created: ${created}, existed: ${existed}, failed: ${failed}, total: ${plan.length}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
