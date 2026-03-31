require('dotenv').config();
const sql = require('mssql');
const { Pool } = require('pg');

(async () => {
  const pool = await sql.connect({
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  const pg = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // How many cows actually made it into PG?
  const pgCows = await pg.query('SELECT COUNT(*) as cnt FROM cows');
  console.log('PG cows:', pgCows.rows[0].cnt);

  // How many distinct legacy_beast_ids?
  const pgBeastIds = await pg.query('SELECT COUNT(DISTINCT legacy_beast_id) as cnt FROM cows WHERE legacy_beast_id IS NOT NULL');
  console.log('PG distinct beast IDs:', pgBeastIds.rows[0].cnt);

  // Total Cattle rows in SQL Server
  const totalCattle = await pool.request().query('SELECT COUNT(*) as cnt FROM dbo.Cattle');
  console.log('MSSQL total Cattle:', totalCattle.recordset[0].cnt);

  // How many distinct BeastIDs
  const distinctIds = await pool.request().query('SELECT COUNT(DISTINCT BeastID) as cnt FROM dbo.Cattle');
  console.log('MSSQL distinct BeastIDs:', distinctIds.recordset[0].cnt);

  // Skip legacy_raw query, just check child tables directly
  const childTables = [
    ['Weighing_Events', 'BeastID'],
    ['PensHistory', 'BeastID'],
    ['Drugs_Given', 'BeastID'],
    ['Costs', 'BeastID'],
    ['Sick_Beast_Records', 'BeastID'],
    ['Carcase_data', 'BeastID'],
  ];

  // Create a temp table of PG cows beast_ids for comparison
  for (const [table, col] of childTables) {
    const total = await pool.request().query(`SELECT COUNT(*) as cnt FROM dbo.[${table}]`);
    const distinct = await pool.request().query(`SELECT COUNT(DISTINCT ${col}) as cnt FROM dbo.[${table}]`);
    console.log(`\n${table}: ${total.recordset[0].cnt} total rows, ${distinct.recordset[0].cnt} distinct BeastIDs`);
  }

  // Check: of the 93985 BeastIDs, how many have null/empty Ear_Tag?
  const nullTagCount = await pool.request().query(`
    SELECT COUNT(*) as cnt FROM dbo.Cattle 
    WHERE Ear_Tag IS NULL OR LTRIM(RTRIM(Ear_Tag)) = ''
  `);
  console.log('\nCattle with null/empty Ear_Tag:', nullTagCount.recordset[0].cnt);

  // Check: are there BeastIDs with Date_Archived set?
  const archivedCount = await pool.request().query(`
    SELECT COUNT(*) as cnt FROM dbo.Cattle 
    WHERE Date_Archived IS NOT NULL
  `);
  console.log('Cattle with Date_Archived set:', archivedCount.recordset[0].cnt);

  // Check: what does the ranked query actually return?
  const rankedCount = await pool.request().query(`
    ;WITH ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY BeastID ORDER BY Feedlot_Entry_Date DESC, Start_Date DESC) AS _rn
      FROM dbo.Cattle
    )
    SELECT COUNT(*) as cnt FROM ranked WHERE _rn = 1
  `);
  console.log('Ranked query (rn=1) count:', rankedCount.recordset[0].cnt);

  await pool.close();
  await pg.end();
})().catch(e => console.error(e.message));

