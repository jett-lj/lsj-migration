const fs = require('fs');
for (const f of ['_add_missing_columns.sql', 'schema-farm-v3.sql']) {
  let sql = fs.readFileSync(f, 'utf8');
  const before = sql;
  // Quote column names starting with digits: EXISTS 0_to_2_teeth -> EXISTS "0_to_2_teeth"
  sql = sql.replace(/EXISTS (\d\w+)/g, 'EXISTS "$1"');
  const fixes = (before.match(/EXISTS \d\w+/g) || []).length;
  fs.writeFileSync(f, sql, 'utf8');
  console.log(f + ': quoted ' + fixes + ' digit-starting column names');
}
