#!/usr/bin/env node
'use strict';
// Read-only: breed-code histogram on CFR dbo.Cattle, joined to dbo.Breeds for
// the name. Tells us how many cows sit on real named breeds vs codes with no
// breed name (sentinels/orphans that legitimately stay NULL).
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { connectMssql, closePools } = require('./connections');

(async () => {
  const mssql = await connectMssql();
  const r = await mssql.request().query(
    'SELECT c.Breed AS code, COUNT(*) AS cows, MAX(b.Breed_Name) AS name ' +
      'FROM dbo.Cattle c LEFT JOIN dbo.Breeds b ON b.Breed_Code = c.Breed ' +
      'WHERE c.Breed IS NOT NULL GROUP BY c.Breed ORDER BY COUNT(*) DESC',
  );
  let named = 0;
  let orphan = 0;
  console.log('  code |   cows | breed name in dbo.Breeds');
  console.log('  -----+--------+-------------------------');
  for (const row of r.recordset) {
    const hasName = row.name != null && String(row.name).trim() !== '';
    if (hasName) named += row.cows;
    else orphan += row.cows;
    console.log(
      `  ${String(row.code).padStart(4)} | ${String(row.cows).padStart(6)} | ${hasName ? row.name : '(no name — stays NULL)'}`,
    );
  }
  console.log(
    `\n  ${named} cows on real named breeds · ${orphan} cows on codes with no breed name (legit NULL).`,
  );
  await closePools();
})();
