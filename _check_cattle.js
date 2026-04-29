const sql = require('mssql');
(async () => {
  const m = await new sql.ConnectionPool({
    server: 'localhost', database: 'CATTLE',
    user: 'lsj_migrate', password: 'M1grat3!Secure#2024',
    options: { encrypt: false, trustServerCertificate: true, instanceName: 'SQLEXPRESS' },
  }).connect();
  const r = await m.request().query(
    "SELECT Beast_no, ear_tag, EID, Sale_weight FROM dbo.Cattle WHERE Beast_no IN (122100, 122109)"
  );
  console.table(r.recordset);
  await m.close();
})().catch(e => { console.error(e); process.exit(1); });
