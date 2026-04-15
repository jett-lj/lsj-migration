require('dotenv').config();
const sql = require('mssql');
const { getMssqlConfig } = require('./config');

(async () => {
  const cfg = getMssqlConfig();
  cfg.database = 'master';
  const pool = await sql.connect(cfg);
  const r = await pool.request().query(
    "SELECT name FROM sys.databases WHERE name NOT IN ('master','tempdb','model','msdb') ORDER BY name"
  );
  console.log(`Found ${r.recordset.length} databases:\n`);
  r.recordset.forEach(x => console.log('  ' + x.name));
  await pool.close();
})().catch(e => { console.error(e.message); process.exit(1); });
