/**
 * Fix column-type mismatches between the live database and schema-farm-v5.sql.
 * Old (v3/v4) schema created many columns as INTEGER that v5 defines as TEXT/VARCHAR.
 * CREATE TABLE IF NOT EXISTS doesn't fix existing column types, so we do it here.
 */
const { Client } = require('pg');

const FIXES = [
  ['carcase.carcase_data', 'teeth', 'TEXT'],
  ['carcase.carcase_feedback_report_data', 'record_type', 'TEXT'],
  ['cattle.cattle_processed', 'draft_gate', 'TEXT'],
  ['cattle.cows', 'teeth', 'TEXT'],
  ['cattle.cull_reasons', 'cull_reason_id', 'TEXT'],
  ['commodity.commodcontracts', 'contract_no', 'TEXT'],
  ['contacts.contacts', 'contact_type', 'TEXT'],
  ['digistar.digistar_users', 'user_id', 'TEXT'],
  ['feed.bunk_code_desc', 'code', 'TEXT'],
  ['feed.feedlot_staff', 'user_id', 'TEXT'],
  ['feed.penfeedsdata', 'batch_number', 'TEXT'],
  ['health.sick_beast_records', 'cause_of_death', 'TEXT'],
  ['health.sick_beast_records', 'result_code', 'TEXT'],
  ['operations.batch_pen_operations', 'user_id', 'TEXT'],
  ['operations.transport_dispatches', 'user_id', 'TEXT'],
  ['operations.weighbridge_dockets', 'user_id', 'TEXT'],
  ['transport.datakey_truck_allocation', 'truck_id', 'TEXT'],
  ['transport.deliverydockets', 'docket_number', 'TEXT'],
  ['transport.deliverydockets', 'truck_id', 'TEXT'],
  ['transport.loaddockages', 'docket_no', 'TEXT'],
  ['transport.truck_loads', 'batch_number', 'TEXT'],
  ['transport.truck_loads', 'truck_id', 'TEXT'],
  ['weighing.livestock_weighbridge_dockets', 'docket_type', 'TEXT'],
  ['weighing.weighing_events', 'p8_fat', 'TEXT'],
];

(async () => {
  const c = new Client({host:'localhost',port:5432,user:'lsj_admin',password:'lsj_password',database:'barmount'});
  await c.connect();

  // 1. Gather and drop ALL legacy views (they depend on the columns)
  const views = await c.query(`
    SELECT schemaname, viewname, definition
    FROM pg_views WHERE schemaname = 'legacy'
    ORDER BY viewname
  `);
  console.log(`Found ${views.rows.length} legacy views to temporarily drop`);

  const viewDefs = [];
  for (const v of views.rows) {
    viewDefs.push({ schema: v.schemaname, name: v.viewname, def: v.definition });
    await c.query(`DROP VIEW IF EXISTS ${v.schemaname}.${v.viewname}`);
  }
  console.log('All legacy views dropped');

  // 2. Fix column types (using cast to handle existing integer data → text)
  let fixed = 0;
  for (const [table, col, targetType] of FIXES) {
    try {
      // Check current type
      const [schema, tableName] = table.split('.');
      const cur = await c.query(`
        SELECT udt_name FROM information_schema.columns
        WHERE table_schema=$1 AND table_name=$2 AND column_name=$3
      `, [schema, tableName, col]);
      
      if (cur.rows.length === 0) {
        console.log(`  SKIP ${table}.${col} — column not found`);
        continue;
      }
      
      if (['text','varchar'].includes(cur.rows[0].udt_name)) {
        continue; // already correct
      }
      
      await c.query(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE ${targetType} USING ${col}::TEXT`);
      console.log(`  FIXED ${table}.${col}: ${cur.rows[0].udt_name} → ${targetType}`);
      fixed++;
    } catch (err) {
      console.error(`  ERROR fixing ${table}.${col}: ${err.message}`);
    }
  }
  console.log(`Fixed ${fixed} columns`);

  // 3. Recreate legacy views
  let recreated = 0;
  for (const v of viewDefs) {
    try {
      await c.query(`CREATE VIEW ${v.schema}.${v.name} AS ${v.def}`);
      recreated++;
    } catch (err) {
      console.error(`  ERROR recreating view ${v.schema}.${v.name}: ${err.message}`);
    }
  }
  console.log(`Recreated ${recreated}/${viewDefs.length} legacy views`);

  // 4. Verify — re-run the mismatch check
  const remaining = await c.query(`
    SELECT table_schema||'.'||table_name||'.'||column_name as col, udt_name
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema','legacy','system')
      AND udt_name IN ('int2','int4','int8')
      AND column_name IN (${FIXES.map(f => `'${f[1]}'`).join(',')})
      AND table_schema||'.'||table_name IN (${FIXES.map(f => `'${f[0]}'`).join(',')})
  `);
  if (remaining.rows.length > 0) {
    console.log('\nRemaining mismatches:');
    remaining.rows.forEach(r => console.log(`  ${r.col}: ${r.udt_name}`));
  } else {
    console.log('\nAll column types now match v5 schema!');
  }

  await c.end();
})();
