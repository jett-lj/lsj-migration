#!/usr/bin/env node
'use strict';
require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

async function go() {
  const cfg = { ...getMssqlConfig(), database: 'CATTLE_Feed' };
  const pool = await new sql.ConnectionPool(cfg).connect();

  // Test exact probe query format from runner.js
  const query = `SELECT Pen_Number_ID, Date_Checked, Bunk_Reading, Feed_Alloc, No_Head,
                   [PF_Kgs/Head_Change?], BK_ID, Ration_Code, Early_Bunk_Reading,
                   MMEC_Kgs_Head, MMEC_MaxFeed, MMEC_Incr_If_Slick, MMEC_Ration,
                   Mob_name, Early_bunk_reading2, Kgs_feed_remaining,
                   Avg_Kgs_Fed_Today, Shovel_bunk, Notes
            FROM dbo.Bunk_Readings ORDER BY BK_ID`;

  const probeQuery = `${query} OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`;

  try {
    const r = await pool.request().query(probeQuery);
    console.log('Probe OK:', r.recordset.length, 'rows');
    if (r.recordset[0]) console.log('Row:', JSON.stringify(r.recordset[0], null, 2));
  } catch (err) {
    console.log('Probe FAILED:', err.message);
    // Check what the runner would match
    const colMatch = err.message.match(/Invalid column name '([^']+)'/);
    const tableMatch = err.message.match(/Invalid object name '([^']+)'/);
    console.log('colMatch:', colMatch ? colMatch[1] : null);
    console.log('tableMatch:', tableMatch ? tableMatch[1] : null);
  }

  await pool.close();
}
go().catch(e => { console.error(e.message); process.exit(1); });
