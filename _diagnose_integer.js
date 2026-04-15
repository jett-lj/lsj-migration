const sql = require('mssql');
(async () => {
  const pool = await sql.connect({
    server: 'localhost', port: 1433, user: 'lsj_migrate',
    password: 'M1grat3!Secure#2024', database: 'CATTLE_Feed',
    options: { trustServerCertificate: true, encrypt: false }
  });

  // Check column types for the relevant columns
  const schema = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='CommodTrans'
      AND COLUMN_NAME IN ('CTR_ID','Contract_No','Trans_Type','StaffID','Ref_No')
    ORDER BY ORDINAL_POSITION
  `);
  console.log('Column types:');
  schema.recordset.forEach(r => console.log(`  ${r.COLUMN_NAME}: ${r.DATA_TYPE}(${r.CHARACTER_MAXIMUM_LENGTH || ''})`));

  // Sample rows where Contract_No has alpha characters
  const sample = await pool.request().query(`
    SELECT TOP 10 CTR_ID, Contract_No, Trans_Type, StaffID, Ref_No
    FROM dbo.CommodTrans
    WHERE Contract_No LIKE '%[A-Z]%'
    ORDER BY CTR_ID DESC
  `);
  console.log('\nRows with alpha Contract_No:');
  sample.recordset.forEach(r => console.log('  ', JSON.stringify(r)));

  // Check if Trans_Type has alpha values
  const tt = await pool.request().query(`
    SELECT DISTINCT Trans_Type FROM dbo.CommodTrans WHERE ISNUMERIC(Trans_Type) = 0
  `);
  console.log('\nNon-numeric Trans_Type values:', tt.recordset.map(r => r.Trans_Type));

  await pool.close();
})();
