const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ host:'localhost', port:5432, database:'barmount', user:'lsj_admin', password:'lsj_password' });

// Parse all table names from unified_schema.sql
function parseUnifiedTables() {
  const sql = fs.readFileSync(path.join(__dirname, 'unified_schema.sql'), 'utf8');
  const tables = [];
  const regex = /^CREATE TABLE \[([^\]]+)\]/gm;
  let m;
  while ((m = regex.exec(sql)) !== null) {
    tables.push(m[1]);
  }
  return tables;
}

(async () => {
  const unifiedTables = parseUnifiedTables();
  console.log(`=== Unified schema declares ${unifiedTables.length} legacy tables ===\n`);

  // Get all tables that actually exist in the target PG database
  const allTables = await pool.query(`
    SELECT table_schema || '.' || table_name AS tbl
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name
  `);
  const pgTables = allTables.rows.map(r => r.tbl);

  // Row counts for all PG tables
  console.log(`=== Post-migration row counts (${pgTables.length} PG tables) ===`);
  for (const t of pgTables) {
    const r = await pool.query('SELECT count(*) FROM ' + t.split('.').map(p => '"' + p + '"').join('.'));
    console.log(t + ': ' + r.rows[0].count);
  }

  // Cross-reference: check which unified tables have a mapping target in PG
  // Build a lookup of PG table base names (lowercase, no schema prefix)
  const pgBaseNames = new Set(pgTables.map(t => t.split('.').pop().toLowerCase()));
  const unmapped = [];
  const mapped = [];
  for (const legacy of unifiedTables) {
    // Normalise legacy name to snake_case for comparison
    const snake = legacy.replace(/[\s]+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (pgBaseNames.has(snake)) {
      mapped.push(legacy);
    } else {
      unmapped.push(legacy);
    }
  }
  console.log(`\n=== Unified → PG coverage: ${mapped.length}/${unifiedTables.length} tables matched ===`);
  if (unmapped.length) {
    console.log(`\n=== ${unmapped.length} unified tables with NO PG match ===`);
    for (const t of unmapped) console.log('  ' + t);
  }

  // Check triggers were created
  const trg = await pool.query("SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_%_updated_at'");
  console.log('\n=== updated_at triggers created: ' + trg.rows[0].count);

  // Check partition tables for 2028/2029
  const parts = await pool.query("SELECT tablename FROM pg_tables WHERE tablename LIKE '%_y2028' OR tablename LIKE '%_y2029' ORDER BY tablename");
  console.log('\n=== 2028/2029 partitions ===');
  parts.rows.forEach(r => console.log(r.tablename));

  // Check FK integrity
  const fk = await pool.query("SELECT count(*) FROM cattle.cows WHERE ear_tag IS NULL");
  console.log('\nNull ear_tags: ' + fk.rows[0].count);

  const neg = await pool.query("SELECT count(*) FROM cattle.cows WHERE start_weight < 0");
  console.log('Negative weights: ' + neg.rows[0].count);

  // Check updated_at columns were added to OG tables
  const cols = await pool.query(`
    SELECT table_schema || '.' || table_name AS tbl
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY 1
  `);
  console.log('\n=== Tables with updated_at column: ' + cols.rows.length);

  await pool.end();
})();
