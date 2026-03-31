#!/usr/bin/env node
/**
 * Rebuild both PostgreSQL databases from scratch.
 *   - barmount      ← schema-farm.sql
 *   - rangersvalley ← schema-system.sql
 *
 * Usage:  node rebuild-dbs.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const ADMIN_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'lsj_admin',
  password: process.env.DB_PASSWORD || '',
  database: 'postgres',               // connect to maintenance DB
};

const FARM_DB   = process.env.DB_NAME || 'barmount';
const SYSTEM_DB = 'rangersvalley';

async function rebuildDb(admin, dbName, schemaFile, owner) {
  // Terminate existing connections
  await admin.query(
    `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [dbName]
  );

  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await admin.query(`CREATE DATABASE ${dbName} OWNER ${owner}`);
  console.log(`  [OK] ${dbName}: dropped & recreated`);

  // Apply schema
  const sql  = fs.readFileSync(path.join(__dirname, schemaFile), 'utf8');
  const pool = new Pool({ ...ADMIN_CONFIG, database: dbName });
  await pool.query(sql);
  await pool.end();
  console.log(`  [OK] ${dbName}: ${schemaFile} applied`);
}

async function main() {
  console.log('=== Rebuilding databases ===\n');

  const admin = new Pool(ADMIN_CONFIG);
  await admin.query('SELECT 1');  // verify connection
  console.log('[INFO] Connected to PostgreSQL.\n');

  const owner = ADMIN_CONFIG.user;

  await rebuildDb(admin, FARM_DB,   'schema-farm.sql',   owner);
  console.log('');
  await rebuildDb(admin, SYSTEM_DB, 'schema-system.sql', owner);

  await admin.end();

  // Quick verification — count tables in each DB
  for (const dbName of [FARM_DB, SYSTEM_DB]) {
    const pool = new Pool({ ...ADMIN_CONFIG, database: dbName });
    const res  = await pool.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    console.log(`\n  ${dbName}: ${res.rows[0].count} tables`);
    await pool.end();
  }

  console.log('\n=== Done — both databases rebuilt fresh ===');
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1); });
