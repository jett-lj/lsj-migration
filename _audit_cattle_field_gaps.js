require('dotenv').config();

const sql = require('mssql');
const { Client } = require('pg');
const { getMssqlConfig } = require('./config');

function normSourceNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function normSourceBreed(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normTargetText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function printSection(title) {
  console.log('');
  console.log(title);
  console.log('-'.repeat(title.length));
}

async function main() {
  const mssqlConfig = { ...getMssqlConfig(), database: 'CATTLE' };
  const mssqlPool = await sql.connect(mssqlConfig);
  const pg = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barmount',
  });
  await pg.connect();

  try {
    const sourceRowsResult = await mssqlPool.request().query(`
      ;WITH ranked AS (
        SELECT BeastID, Breed, CustomFeedOwnerID,
               ROW_NUMBER() OVER (
                 PARTITION BY BeastID
                 ORDER BY Feedlot_Entry_Date DESC, Start_Date DESC
               ) AS _rn
        FROM dbo.Cattle
      )
      SELECT BeastID, Breed, CustomFeedOwnerID
      FROM ranked
      WHERE _rn = 1
      ORDER BY BeastID
    `);

    const sourceBreedsResult = await mssqlPool.request().query(`
      SELECT Breed_Code, Breed_Name
      FROM dbo.Breeds
      ORDER BY Breed_Code
    `);

    const targetRowsResult = await pg.query(`
      SELECT legacy_beast_id, breed, customfeedownerid
      FROM cattle.cows
      ORDER BY legacy_beast_id
    `);

    const targetBreedLookupResult = await pg.query(`
      SELECT code, name
      FROM system.lookups
      WHERE category = 'breed'
      ORDER BY code
    `);

    const sourceBreedNames = new Map();
    for (const row of sourceBreedsResult.recordset) {
      sourceBreedNames.set(String(row.Breed_Code), row.Breed_Name);
    }

    const targetBreedLookup = new Map();
    for (const row of targetBreedLookupResult.rows) {
      targetBreedLookup.set(String(row.code), row.name);
    }

    const targetByBeastId = new Map();
    for (const row of targetRowsResult.rows) {
      targetByBeastId.set(Number(row.legacy_beast_id), row);
    }

    const customOwnerMismatches = [];
    const breedStats = new Map();

    for (const sourceRow of sourceRowsResult.recordset) {
      const beastId = Number(sourceRow.BeastID);
      const targetRow = targetByBeastId.get(beastId);
      const sourceOwner = normSourceNumber(sourceRow.CustomFeedOwnerID);
      const targetOwner = targetRow ? normSourceNumber(targetRow.customfeedownerid) : null;
      const sourceBreedCode = normSourceBreed(sourceRow.Breed);
      const targetBreed = targetRow ? normTargetText(targetRow.breed) : null;

      if (!targetRow || sourceOwner !== targetOwner) {
        customOwnerMismatches.push({
          beastId,
          sourceOwner,
          targetOwner,
          targetMissing: !targetRow,
        });
      }

      if (sourceBreedCode !== null) {
        const key = String(sourceBreedCode);
        if (!breedStats.has(key)) {
          breedStats.set(key, {
            code: key,
            sourceName: sourceBreedNames.get(key) || null,
            lookupName: targetBreedLookup.get(key) || null,
            total: 0,
            dropped: 0,
            mapped: 0,
          });
        }
        const stat = breedStats.get(key);
        stat.total += 1;
        if (targetBreed) stat.mapped += 1;
        else stat.dropped += 1;
      }
    }

    printSection('CustomFeedOwnerID mismatches');
    const ownerMissingAtTarget = customOwnerMismatches.filter((row) => row.sourceOwner !== null && row.targetOwner === null);
    const ownerValueDiffs = customOwnerMismatches.filter((row) => row.sourceOwner !== null && row.targetOwner !== null && row.sourceOwner !== row.targetOwner);
    const ownerUnexpectedValues = customOwnerMismatches.filter((row) => row.sourceOwner === null && row.targetOwner !== null);
    console.log(`source rows checked: ${sourceRowsResult.recordset.length.toLocaleString()}`);
    console.log(`source value present, target null: ${ownerMissingAtTarget.length.toLocaleString()}`);
    console.log(`source value present, target different: ${ownerValueDiffs.length.toLocaleString()}`);
    console.log(`source null, target populated: ${ownerUnexpectedValues.length.toLocaleString()}`);

    if (ownerMissingAtTarget.length > 0) {
      const topMissingValues = new Map();
      for (const row of ownerMissingAtTarget) {
        const key = String(row.sourceOwner);
        topMissingValues.set(key, (topMissingValues.get(key) || 0) + 1);
      }
      const topList = [...topMissingValues.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10);

      console.log('top missing source values:');
      for (const [value, count] of topList) {
        console.log(`  ${value}: ${count.toLocaleString()} rows`);
      }

      console.log('sample missing rows:');
      for (const row of ownerMissingAtTarget.slice(0, 12)) {
        console.log(`  BeastID ${row.beastId}: source=${row.sourceOwner}, target=null`);
      }
    }

    if (ownerValueDiffs.length > 0) {
      console.log('sample differing rows:');
      for (const row of ownerValueDiffs.slice(0, 12)) {
        console.log(`  BeastID ${row.beastId}: source=${row.sourceOwner}, target=${row.targetOwner}`);
      }
    }

    printSection('Dropped breed codes');
    const droppedBreeds = [...breedStats.values()]
      .filter((row) => row.dropped > 0)
      .sort((a, b) => b.dropped - a.dropped || a.code.localeCompare(b.code));

    console.log(`breed codes with dropped rows: ${droppedBreeds.length.toLocaleString()}`);
    for (const row of droppedBreeds.slice(0, 20)) {
      const reason = row.lookupName
        ? (row.lookupName === 'Breed Name' ? 'junk lookup name' : 'partially dropped')
        : 'missing breed lookup';
      console.log(
        `  code=${row.code} source_name=${row.sourceName || 'null'} lookup_name=${row.lookupName || 'null'} ` +
        `total=${row.total.toLocaleString()} mapped=${row.mapped.toLocaleString()} dropped=${row.dropped.toLocaleString()} reason=${reason}`
      );
    }

    const completelyDropped = droppedBreeds.filter((row) => row.mapped === 0);
    console.log('');
    console.log(`completely dropped breed codes: ${completelyDropped.length.toLocaleString()}`);
    for (const row of completelyDropped.slice(0, 20)) {
      console.log(
        `  code=${row.code} source_name=${row.sourceName || 'null'} lookup_name=${row.lookupName || 'null'} rows=${row.total.toLocaleString()}`
      );
    }
  } finally {
    await pg.end();
    await mssqlPool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});