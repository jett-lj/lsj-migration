#!/usr/bin/env node
'use strict';
require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

async function go() {
  const cfg = { ...getMssqlConfig(), database: 'CATTLE_Feed' };
  const pool = await new sql.ConnectionPool(cfg).connect();

  // Test a few tables: Bunk_Readings, Log_Pens_File, Digistar_Data_History
  const tests = [
    { table: 'Bunk_Readings', query: `SELECT TOP 1 * FROM dbo.Bunk_Readings` },
    { table: 'Log_Pens_File', query: `SELECT TOP 1 * FROM dbo.Log_Pens_File` },
    { table: 'CommodTrans',   query: `SELECT TOP 1 * FROM dbo.CommodTrans` },
    { table: 'Digistar_Data_History', query: `SELECT TOP 1 * FROM dbo.Digistar_Data_History` },
  ];

  for (const { table, query } of tests) {
    try {
      const r = await pool.request().query(query);
      const cols = r.recordset.columns ? Object.keys(r.recordset.columns) : Object.keys(r.recordset[0] || {});
      console.log(`\n=== ${table} — OK (${cols.length} columns) ===`);
      console.log(`  Columns: ${cols.join(', ')}`);
    } catch (err) {
      console.log(`\n=== ${table} — ERROR ===`);
      console.log(`  ${err.message}`);
    }
  }

  await pool.close();
}
go().catch(e => { console.error(e.message); process.exit(1); });
