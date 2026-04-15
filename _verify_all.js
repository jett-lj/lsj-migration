const { Pool } = require('pg');
const dbs = ['barmount', 'cattle', 'cattle_feed', 'cattle_feedtrans'];

(async () => {
  for (const db of dbs) {
    const pool = new Pool({ host:'localhost', port:5432, user:'lsj_admin', password:'lsj_password', database:db });
    console.log('\n' + '='.repeat(60));
    console.log(' ' + db.toUpperCase());
    console.log('='.repeat(60));

    const schemas = await pool.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
       ORDER BY 1`
    );

    let totalRows = 0;
    let populatedTables = 0;
    let emptyTables = 0;

    for (const s of schemas.rows) {
      const tables = await pool.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY 1`,
        [s.schema_name]
      );
      if (tables.rows.length === 0) continue;

      let schemaHasData = false;
      const lines = [];

      for (const t of tables.rows) {
        try {
          const cnt = await pool.query(
            `SELECT count(*)::int as c FROM ${s.schema_name}."${t.tablename}"`
          );
          const c = cnt.rows[0].c;
          if (c > 0) {
            lines.push(`    ${t.tablename.padEnd(42)} ${c.toLocaleString().padStart(12)}`);
            totalRows += c;
            populatedTables++;
            schemaHasData = true;
          } else {
            emptyTables++;
          }
        } catch (e) {
          lines.push(`    ${t.tablename.padEnd(42)} ERROR: ${e.message.slice(0,50)}`);
        }
      }

      if (schemaHasData) {
        console.log(`\n  Schema: ${s.schema_name}`);
        lines.forEach(l => console.log(l));
      }
    }

    console.log(`\n  SUMMARY: ${populatedTables} tables with data, ${emptyTables} empty | Total rows: ${totalRows.toLocaleString()}`);
    await pool.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
