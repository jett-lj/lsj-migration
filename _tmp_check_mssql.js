require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');
(async () => {
  const cfg = getMssqlConfig();
  const pool = await sql.connect(cfg);
  // List tables w/ row counts in CATTLE
  const r = await pool.request().query(`
    SELECT TOP 25 s.name + '.' + t.name AS tbl, p.rows
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1)
    WHERE p.rows > 0
    ORDER BY p.rows DESC`);
  console.log('CATTLE top tables:');
  console.table(r.recordset);
  console.log('Connected DB:', cfg.database);
  await pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
