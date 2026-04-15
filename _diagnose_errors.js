// Temporary diagnostic script — check data types for failing tables
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

(async () => {
  const mssqlCfg = getMssqlConfig();
  mssqlCfg.database = 'CATTLE_Feed';
  const pool = await sql.connect(mssqlCfg);

  // 1. CommodTrans non-numeric Contract_No
  const r1 = await pool.request().query(
    `SELECT TOP 20 Contract_No, CTR_ID FROM dbo.CommodTrans
     WHERE Contract_No IS NOT NULL AND ISNUMERIC(Contract_No) = 0`
  );
  console.log('=== CommodTrans non-numeric Contract_No ===');
  console.table(r1.recordset);

  // 2. CommodContracts Contract_No sample
  const r2 = await pool.request().query(
    `SELECT TOP 20 Contract_No, Supplier_AC_No FROM dbo.CommodContracts`
  );
  console.log('=== CommodContracts sample ===');
  console.table(r2.recordset);

  // 3. Manure_From_Locations
  const r3 = await pool.request().query(
    `SELECT TOP 20 * FROM dbo.Manure_From_Locations`
  );
  console.log('=== Manure_From_Locations ===');
  console.table(r3.recordset);

  // 4. Column data types
  const r4 = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME IN ('CommodTrans','CommodContracts','Manure_From_Locations')
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  console.log('=== Column data types ===');
  console.table(r4.recordset);

  // 5. How many CommodContracts have non-numeric Contract_No?
  const r5 = await pool.request().query(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN ISNUMERIC(Contract_No) = 0 THEN 1 ELSE 0 END) AS non_numeric
     FROM dbo.CommodContracts WHERE Contract_No IS NOT NULL`
  );
  console.log('=== CommodContracts Contract_No numeric check ===');
  console.table(r5.recordset);

  pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
