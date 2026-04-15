// Find all columns where the live PG type doesn't match what schema-farm-v5.sql defines
const { Client } = require('pg');
const fs = require('fs');

(async () => {
  const c = new Client({host:'localhost',port:5432,user:'lsj_admin',password:'lsj_password',database:'barmount'});
  await c.connect();

  // Parse expected types from schema (CREATE TABLE statements)
  const schema = fs.readFileSync('schema-farm-v5.sql', 'utf8');
  
  // Get all columns that are TEXT/VARCHAR in v5 schema but might be integer in live DB
  const res = await c.query(`
    SELECT table_schema, table_name, column_name, udt_name, data_type
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema','legacy','system')
      AND udt_name IN ('int2','int4','int8')
    ORDER BY table_schema, table_name, column_name
  `);

  // Find text columns in schema that are integer in live DB
  // Check pattern: column_name followed by TEXT or VARCHAR in schema
  const textCols = new Map();
  const re = /^\s+(\w+)\s+(TEXT|VARCHAR\(\d+\))/gmi;
  let m;
  while ((m = re.exec(schema)) !== null) {
    textCols.set(m[1].toLowerCase(), m[2]);
  }

  console.log('Columns that are INTEGER in live DB but TEXT/VARCHAR in v5 schema:');
  let found = 0;
  for (const row of res.rows) {
    const schemaType = textCols.get(row.column_name.toLowerCase());
    if (schemaType) {
      console.log(`  ${row.table_schema}.${row.table_name}.${row.column_name}: live=${row.udt_name} schema=${schemaType}`);
      found++;
    }
  }
  if (found === 0) console.log('  (none found)');

  await c.end();
})();
