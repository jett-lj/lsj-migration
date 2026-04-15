#!/usr/bin/env node
'use strict';
require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

async function go() {
  for (const db of ['CATTLE_Feed', 'CATTLE_Feedtrans']) {
    const cfg = { ...getMssqlConfig(), database: db };
    const pool = await new sql.ConnectionPool(cfg).connect();
    const r = await pool.request().query(`
      SELECT t.name AS tbl,
             SUM(p.rows) AS row_count
      FROM sys.tables t
      JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
      GROUP BY t.name
      HAVING SUM(p.rows) > 0
      ORDER BY SUM(p.rows) DESC
    `);
    console.log(`\n=== ${db} — tables with data ===`);
    for (const row of r.recordset) {
      console.log(`  ${row.tbl}: ${row.row_count.toLocaleString()} rows`);
    }
    if (r.recordset.length === 0) console.log('  (none)');
    await pool.close();
  }
}
go().catch(e => { console.error(e.message); process.exit(1); });
