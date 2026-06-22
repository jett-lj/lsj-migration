#!/usr/bin/env node
'use strict';

/**
 * LSJH-390 breed backfill.
 *
 * The full migration left cattle.cows.breed_id NULL because the breed lookup
 * map was built from the (still-empty) target tables before the breed rows had
 * loaded. This re-reads CFR dbo.Cattle (BeastID, Breed) and resolves each
 * Breed_Code through system.lookups (code -> label) -> cattle.breeds (name -> id),
 * updating ONLY cows whose breed_id is still NULL.
 *
 * Safe: one transaction, temp table dropped on commit, idempotent (re-running
 * touches nothing once breed_id is set). Reads CFR, writes only cattle.cows.breed_id.
 *
 *   node backfill-breed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { connectMssql, connectPostgres, closePools } = require('./connections');

(async () => {
  const mssql = await connectMssql();
  const pg = connectPostgres({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'lsj_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'barmount',
  });
  const client = await pg.connect();
  try {
    const before = await client.query(
      'SELECT count(breed_id) AS n, count(*) AS total FROM cattle.cows',
    );
    console.log(`Before: ${before.rows[0].n}/${before.rows[0].total} cows have a breed.`);

    console.log('Reading CFR dbo.Cattle (BeastID, Breed)...');
    const src = await mssql
      .request()
      .query('SELECT BeastID, Breed FROM dbo.Cattle WHERE Breed IS NOT NULL');
    const rows = src.recordset.filter((r) => r.BeastID != null && r.Breed != null);
    console.log(`  ${rows.length} CFR cattle rows carry a Breed code.`);

    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE _bb (beast bigint, code text) ON COMMIT DROP');

    const B = 1000;
    for (let i = 0; i < rows.length; i += B) {
      const batch = rows.slice(i, i + B);
      const vals = batch.map((_, j) => `($${j * 2 + 1}::bigint, $${j * 2 + 2}::text)`).join(',');
      const params = batch.flatMap((r) => [String(r.BeastID), String(r.Breed).trim()]);
      await client.query(`INSERT INTO _bb (beast, code) VALUES ${vals}`, params);
    }

    const upd = await client.query(`
      UPDATE cattle.cows c
         SET breed_id = b.id
        FROM _bb
        JOIN system.lookups l
          ON l.category = 'breed' AND l.code::text = _bb.code
        JOIN cattle.breeds b
          ON lower(btrim(b.name)) = lower(btrim(l.label))
       WHERE c.legacy_beast_id = _bb.beast
         AND c.breed_id IS NULL
    `);

    const unresolved = await client.query(`
      SELECT DISTINCT _bb.code
        FROM _bb
        LEFT JOIN system.lookups l ON l.category = 'breed' AND l.code::text = _bb.code
       WHERE l.code IS NULL
       LIMIT 10
    `);

    await client.query('COMMIT');

    const after = await client.query(
      'SELECT count(breed_id) AS n, count(*) AS total FROM cattle.cows',
    );
    console.log(`Updated ${upd.rowCount} cows.`);
    console.log(`After: ${after.rows[0].n}/${after.rows[0].total} cows now have a breed.`);
    if (unresolved.rows.length) {
      console.log(
        'Note — CFR breed codes with no match in system.lookups (sample):',
        unresolved.rows.map((r) => r.code).join(', '),
      );
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await closePools();
  }
})();
