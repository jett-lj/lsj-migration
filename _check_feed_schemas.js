#!/usr/bin/env node
'use strict';
require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

async function go() {
  const cfg = { ...getMssqlConfig(), database: 'CATTLE_Feed' };
  const pool = await new sql.ConnectionPool(cfg).connect();
  const r = await pool.request().query(`
    SELECT s.name AS schema_name, t.name AS table_name
    FROM sys.tables t
    JOIN sys.schemas s ON t.schema_id = s.schema_id
    ORDER BY s.name, t.name
  `);
  console.log('=== CATTLE_Feed — all tables with schema ===');
  for (const row of r.recordset) {
    console.log(`  ${row.schema_name}.${row.table_name}`);
  }
  await pool.close();
}
go().catch(e => { console.error(e.message); process.exit(1); });
