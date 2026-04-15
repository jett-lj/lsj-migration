#!/usr/bin/env node
'use strict';
require('dotenv').config();
const { Pool } = require('pg');

async function go() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'cattle_feed',
  });

  // Check commodtrans columns and row count
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'commodity' AND table_name = 'commodtrans'
    ORDER BY ordinal_position
  `);
  console.log('=== commodity.commodtrans columns ===');
  for (const c of cols.rows) {
    console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(25)} ${c.is_nullable}`);
  }

  const cnt = await pool.query('SELECT COUNT(*) AS cnt FROM commodity.commodtrans');
  console.log(`\nRow count: ${cnt.rows[0].cnt}`);

  // Sample first row
  const sample = await pool.query('SELECT * FROM commodity.commodtrans LIMIT 1');
  if (sample.rows[0]) {
    console.log('\nSample row:', JSON.stringify(sample.rows[0], null, 2));
  }

  // Also check costs_feed_detail
  const cfd = await pool.query('SELECT COUNT(*) AS cnt FROM finance.costs_feed_detail');
  console.log(`\nfinance.costs_feed_detail row count (cattle_feed): ${cfd.rows[0].cnt}`);

  // Check in cattle_feedtrans
  const pool2 = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'cattle_feedtrans',
  });
  const cfd2 = await pool2.query('SELECT COUNT(*) AS cnt FROM finance.costs_feed_detail');
  console.log(`finance.costs_feed_detail row count (cattle_feedtrans): ${cfd2.rows[0].cnt}`);

  // Check legacy_raw for orphaned Costs_Feed_Detail
  const lr = await pool2.query(`SELECT COUNT(*) AS cnt FROM system.legacy_raw WHERE source_table = 'Costs_Feed_Detail'`);
  console.log(`legacy_raw Costs_Feed_Detail count (cattle_feedtrans): ${lr.rows[0].cnt}`);

  await pool.end();
  await pool2.end();
}
go().catch(e => { console.error(e.message); process.exit(1); });
