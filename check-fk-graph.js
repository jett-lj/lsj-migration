// Analyse FK graph in the live barmount database and report detached tables
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'lsj_admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'barmount',
  });

  // Get all user tables
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  // Get all FK relationships
  const fks = await pool.query(`
    SELECT
      tc.table_name AS child_table,
      ccu.table_name AS parent_table,
      kcu.column_name AS fk_column,
      ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY child_table, parent_table
  `);

  // Build sets: tables that reference others (children) and tables referenced by others (parents)
  const references = new Set();    // tables that have FK pointing outward
  const referencedBy = new Set();  // tables that are pointed to by an FK
  const fkDetails = {};            // child → [{parent, fk_column, ref_column}]

  for (const fk of fks.rows) {
    references.add(fk.child_table);
    referencedBy.add(fk.parent_table);
    if (!fkDetails[fk.child_table]) fkDetails[fk.child_table] = [];
    fkDetails[fk.child_table].push({
      parent: fk.parent_table,
      fk_column: fk.fk_column,
      ref_column: fk.ref_column,
    });
  }

  // Detached = neither references anything nor is referenced by anything
  const detached = [];
  const connected = [];
  for (const t of tables.rows) {
    const name = t.table_name;
    const refs = references.has(name);
    const refd = referencedBy.has(name);
    if (!refs && !refd) {
      detached.push(name);
    } else {
      connected.push(name);
    }
  }

  // Get row counts for detached tables
  console.log(`\nTotal tables: ${tables.rows.length}`);
  console.log(`Connected (have FKs): ${connected.length}`);
  console.log(`Detached (no FKs): ${detached.length}\n`);

  console.log('=== DETACHED TABLES (no FK relationships) ===\n');
  for (const name of detached) {
    // Get column count
    const colRes = await pool.query(
      `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [name]
    );
    console.log(`  ${name} (${colRes.rows[0].count} cols)`);
  }

  console.log('\n=== CONNECTED TABLES ===\n');
  for (const name of connected) {
    const kids = fkDetails[name] || [];
    const parents = fks.rows.filter(f => f.parent_table === name).map(f => f.child_table);
    const uniqueParents = [...new Set(parents)];
    const outbound = kids.map(k => `→${k.parent}`).join(', ');
    const inbound = uniqueParents.length ? uniqueParents.map(p => `←${p}`).join(', ') : '';
    const parts = [outbound, inbound].filter(Boolean).join(' | ');
    console.log(`  ${name}: ${parts}`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
