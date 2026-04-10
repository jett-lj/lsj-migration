const { Pool } = require('pg');
const fs = require('fs');

async function go() {
  const admin = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'postgres', max:1 });
  try { await admin.query('DROP DATABASE IF EXISTS purchtest'); } catch(e) {}
  await admin.query('CREATE DATABASE purchtest');
  await admin.end();

  const p = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'purchtest', max:1 });
  const sql = fs.readFileSync('schema-farm-v3.sql', 'utf8');
  await p.query(sql);

  try {
    await p.query(`INSERT INTO purchasing.purchase_lots
      (lot_number, purchase_date, vendor_id, agent_code, number_head, total_weight, cost_of_cattle, cattle_freight_cost, lot_notes)
      VALUES ('L001', '2024-01-15', 1, null, 50, 25000, 50000, 2000, null)`);
    console.log('INSERT OK');
  } catch(e) {
    console.log('ERR:', e.message);
  }

  await p.end();
  const c2 = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:'postgres', max:1 });
  await c2.query('DROP DATABASE IF EXISTS purchtest');
  await c2.end();
}

go().catch(console.error);
