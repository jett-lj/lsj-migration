#!/usr/bin/env node
'use strict';
require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

async function go() {
  const cfg = { ...getMssqlConfig(), database: 'CATTLE_Feedtrans' };
  const pool = await new sql.ConnectionPool(cfg).connect();

  // Sample some data to understand column values
  const r = await pool.request().query(`
    SELECT TOP 10 BeastID, RevExp_Code, Date_Fed, Rev_Exp_per_Unit, Units,
           Extended_RevExp, Ration, Custom_Feed_Charge_Ton, PenWhenFed,
           Units_DryMatter, Paddock_Feed, Forced_Application
    FROM dbo.Costs_Feed_Detail
    ORDER BY ID
  `);
  console.log('Sample rows:');
  for (const row of r.recordset) {
    console.log(JSON.stringify(row));
  }

  // Check distinct Ration values
  const rations = await pool.request().query(`
    SELECT DISTINCT TOP 30 Ration, COUNT(*) as cnt 
    FROM dbo.Costs_Feed_Detail 
    GROUP BY Ration ORDER BY cnt DESC
  `);
  console.log('\nRation values (top 30):');
  for (const row of rations.recordset) {
    console.log(`  ${JSON.stringify(row.Ration)} → ${row.cnt}`);
  }

  // Check distinct Paddock_Feed
  const pf = await pool.request().query(`
    SELECT DISTINCT Paddock_Feed, COUNT(*) as cnt 
    FROM dbo.Costs_Feed_Detail 
    GROUP BY Paddock_Feed
  `);
  console.log('\nPaddock_Feed values:');
  for (const row of pf.recordset) {
    console.log(`  ${JSON.stringify(row.Paddock_Feed)} → ${row.cnt}`);
  }

  // Date range
  const dates = await pool.request().query(`
    SELECT MIN(Date_Fed) as min_date, MAX(Date_Fed) as max_date, COUNT(*) as total
    FROM dbo.Costs_Feed_Detail
  `);
  console.log('\nDate range:', dates.recordset[0]);

  await pool.close();
}
go().catch(e => { console.error(e.message); process.exit(1); });
