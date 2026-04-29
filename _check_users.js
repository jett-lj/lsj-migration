'use strict';
const { Pool } = require('pg');
(async () => {
  const p = new Pool({ host: 'localhost', user: 'lsj_admin', password: 'lsj_password', database: 'lsj_system' });
  const c = await p.query(`
    SELECT 'users' AS t, COUNT(*)::INT AS n FROM users
    UNION ALL SELECT 'farm_members', COUNT(*) FROM farm_members
    UNION ALL SELECT 'legacy_farm_users', COUNT(*) FROM legacy_farm_users
    UNION ALL SELECT 'reconciled', COUNT(*) FROM legacy_farm_users WHERE user_id IS NOT NULL
  `);
  console.table(c.rows);
  const s = await p.query(`
    SELECT f.db_name, COUNT(*)::INT AS users
      FROM legacy_farm_users l
      JOIN farms f ON f.id = l.farm_id
     GROUP BY f.db_name
     ORDER BY users DESC
  `);
  console.log('per-farm:');
  console.table(s.rows);
  const sample = await p.query(`
    SELECT u.username, u.email, u.first_name, u.last_name, u.must_reset_password,
           (SELECT COUNT(*) FROM farm_members fm WHERE fm.user_id = u.id) AS farms
      FROM users u WHERE imported_from_legacy = true ORDER BY u.id LIMIT 5
  `);
  console.log('sample reconciled users:');
  console.table(sample.rows);
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
