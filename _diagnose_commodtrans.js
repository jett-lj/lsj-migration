const sql = require('mssql');
const config = { user:'lsj_migrate', password:'M1grat3!Secure#2024', server:'localhost', database:'CATTLE_Feed', options:{trustServerCertificate:true,encrypt:false} };

(async () => {
  await sql.connect(config);
  
  // Find extreme values in all numeric columns  
  const r = await sql.query(`
    SELECT 
      MAX(ABS(Value)) as max_value,
      MAX(ABS(Commod_Mast_Value)) as max_cmv,
      MAX(ABS(Kgs)) as max_kgs,
      MAX(ABS(Commod_Mast_Kgs)) as max_cmk,
      MAX(ABS(Call_Weight)) as max_cw,
      MAX(ABS(Tempered_weight_fed_Kgs)) as max_twfk,
      MAX(ABS(CTR_ID)) as max_ctrid
    FROM dbo.CommodTrans
  `);
  console.log('Max absolute values:');
  console.log(JSON.stringify(r.recordset[0], null, 2));
  
  // Find the actual rows exceeding NUMERIC(12,4) limits = 99999999.9999
  const extreme = await sql.query(`
    SELECT CTR_ID, Value, Commod_Mast_Value, Kgs, Commod_Mast_Kgs, Call_Weight, Tempered_weight_fed_Kgs
    FROM dbo.CommodTrans 
    WHERE ABS(Value) > 99999999 
       OR ABS(Commod_Mast_Value) > 99999999
       OR ABS(Kgs) > 99999999
       OR ABS(Commod_Mast_Kgs) > 99999999
  `);
  console.log('\nRows exceeding NUMERIC(12,4) range:');
  for (const row of extreme.recordset) console.log(JSON.stringify(row));
  console.log('Count:', extreme.recordset.length);

  // Also check REAL range — REAL is 4-byte float, max ~3.4e38, but PG REAL precision is ~6 digits
  // The issue might be precision, not range. Check for very large precision values
  const precision = await sql.query(`
    SELECT CTR_ID, Value, Kgs, Commod_Mast_Kgs, Commod_Mast_Value
    FROM dbo.CommodTrans 
    WHERE LEN(CAST(ABS(Value) AS VARCHAR(50))) > 12
       OR LEN(CAST(ABS(Kgs) AS VARCHAR(50))) > 12
       OR LEN(CAST(ABS(Commod_Mast_Value) AS VARCHAR(50))) > 12
       OR LEN(CAST(ABS(Commod_Mast_Kgs) AS VARCHAR(50))) > 12
  `);
  console.log('\nRows with very long numeric representations:');
  for (const row of precision.recordset) console.log(JSON.stringify(row));
  console.log('Count:', precision.recordset.length);
  
  // Get column types from source
  const cols = await sql.query(`
    SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'CommodTrans'
    ORDER BY ORDINAL_POSITION
  `);
  console.log('\nSource column types:');
  for (const c of cols.recordset) {
    console.log(`  ${c.COLUMN_NAME}: ${c.DATA_TYPE}(${c.NUMERIC_PRECISION || c.CHARACTER_MAXIMUM_LENGTH || ''},${c.NUMERIC_SCALE || ''})`);
  }
  
  await sql.close();
})();
