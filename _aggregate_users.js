#!/usr/bin/env node
/**
 * Aggregate per-farm legacy users into the platform-wide system DB.
 *
 *   For every farm DB in the cluster:
 *     1. Read feed.feedlot_staff
 *     2. UPSERT each row into system DB `legacy_farm_users`
 *        (one row per farm × legacy User_ID)
 *     3. Reconcile into `users` (deduped by email-or-synthetic-username)
 *        and `farm_members` (carrying legacy permission flags)
 *
 * Legacy `Pass_word` is plaintext, so:
 *   - It is stored verbatim in `legacy_farm_users.legacy_password`
 *     (kept for ops/triage only — never exposed to the app)
 *   - `users.password_hash` is set to a bcrypt hash of a random one-shot
 *     reset token, with `must_reset_password = TRUE`. The user is forced
 *     to set a real password on first login.
 *
 * Usage:
 *   node _aggregate_users.js                # all farms with PG DBs
 *   node _aggregate_users.js --only avondale_feedlot,barmount
 *   node _aggregate_users.js --dry-run      # show plan, don't write
 *
 * Required env:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
 *   SYSTEM_DB_NAME   (default: lsj_system)
 *
 * Optional:
 *   FARMS            comma-separated list of farm DB names to include
 *                    (overrides --only flag)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Pool } = require('pg');
const crypto   = require('crypto');
const bcrypt   = (() => {
  try { return require('bcryptjs'); }
  catch { return null; }
})();

// ── CLI ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { only: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only' && argv[i + 1]) {
      out.only = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    } else if (a === '--dry-run') {
      out.dryRun = true;
    }
  }
  return out;
}

// ── PG connection helpers ────────────────────────────────────

function pgBaseConfig() {
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

function systemDbName() {
  return process.env.SYSTEM_DB_NAME || 'lsj_system';
}

async function listFarmDbs(adminPool) {
  // Every non-template, non-system, non-postgres DB is treated as a farm DB.
  const sysDb = systemDbName();
  const { rows } = await adminPool.query(
    `SELECT datname FROM pg_database
      WHERE datistemplate = false
        AND datname NOT IN ('postgres', $1, 'template0', 'template1')
      ORDER BY datname`,
    [sysDb]
  );
  return rows.map(r => r.datname);
}

async function farmHasFeedlotStaff(pool) {
  const { rows } = await pool.query(`
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'feed'
       AND table_name   = 'feedlot_staff'
     LIMIT 1
  `);
  return rows.length > 0;
}

// ── Identity / reset-token helpers ───────────────────────────

function buildEmail(row, farmSlug) {
  // Legacy Feedlot_Staff has no email column. Synthesize a deterministic
  // placeholder so reconciliation is repeatable and admins can swap it
  // for the user's real email later.
  const first = (row.firstname || '').trim().toLowerCase().replace(/\s+/g, '');
  const last  = (row.surname   || '').trim().toLowerCase().replace(/\s+/g, '');
  const local = [first, last].filter(Boolean).join('.') || `user${row.user_id}`;
  return `${local}+${farmSlug}@legacy.lsj-hub.invalid`;
}

function buildUsername(row, farmSlug) {
  const first = (row.firstname || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const last  = (row.surname   || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base  = [first, last].filter(Boolean).join('.') || `user${row.user_id}`;
  return `${base}__${farmSlug}`;
}

function newResetToken() {
  return crypto.randomBytes(24).toString('base64url');
}

async function hashPlaceholder() {
  const token = newResetToken();
  if (!bcrypt) {
    // bcryptjs not installed — store an obviously-unusable hash.
    // The runner still sets must_reset_password=true so login will be blocked
    // until an admin / user resets via the email-invite flow.
    return `!unreset!${crypto.randomBytes(16).toString('hex')}`;
  }
  return bcrypt.hash(token, 10);
}

// ── Pull legacy staff from one farm DB ───────────────────────

async function pullFarmStaff(farmPool) {
  const { rows } = await farmPool.query(`
    SELECT user_id, surname, firstname, job_desc,
           start_date, finish_date,
           password_hash AS legacy_password,
           password_last_changed_date,
           cattle_data_entry, cattle_reports, cattle_utilities,
           cattle_lookup_tables, cattle_deletes,
           feed_system_data_entry, feed_system_reports,
           feed_system_utilities, pl_reports_allowed,
           pen_rider
      FROM feed.feedlot_staff
     ORDER BY user_id
  `);
  return rows;
}

// ── Upsert into system DB ────────────────────────────────────

async function ensureFarmRow(sysPool, farmDb) {
  // Make sure system.farms has a row for this farm DB.
  // If missing, create a placeholder using the db_name as both name and slug.
  const { rows } = await sysPool.query(
    `SELECT id FROM farms WHERE db_name = $1`, [farmDb]
  );
  if (rows.length) return rows[0].id;

  const { rows: ins } = await sysPool.query(
    `INSERT INTO farms (name, db_name, description)
          VALUES ($1, $1, 'Auto-created during user aggregation')
       RETURNING id`,
    [farmDb]
  );
  return ins[0].id;
}

async function upsertLegacyUser(sysPool, farmId, row) {
  await sysPool.query(`
    INSERT INTO legacy_farm_users (
      farm_id, legacy_user_id,
      surname, firstname, job_desc, start_date, finish_date,
      legacy_password, password_last_changed_date,
      cattle_data_entry, cattle_reports, cattle_utilities,
      cattle_lookup_tables, cattle_deletes,
      feed_system_data_entry, feed_system_reports,
      feed_system_utilities, pl_reports_allowed,
      pen_rider
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,
      $10,$11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    ON CONFLICT (farm_id, legacy_user_id) DO UPDATE SET
      surname                    = EXCLUDED.surname,
      firstname                  = EXCLUDED.firstname,
      job_desc                   = EXCLUDED.job_desc,
      start_date                 = EXCLUDED.start_date,
      finish_date                = EXCLUDED.finish_date,
      legacy_password            = EXCLUDED.legacy_password,
      password_last_changed_date = EXCLUDED.password_last_changed_date,
      cattle_data_entry          = EXCLUDED.cattle_data_entry,
      cattle_reports             = EXCLUDED.cattle_reports,
      cattle_utilities           = EXCLUDED.cattle_utilities,
      cattle_lookup_tables       = EXCLUDED.cattle_lookup_tables,
      cattle_deletes             = EXCLUDED.cattle_deletes,
      feed_system_data_entry     = EXCLUDED.feed_system_data_entry,
      feed_system_reports        = EXCLUDED.feed_system_reports,
      feed_system_utilities      = EXCLUDED.feed_system_utilities,
      pl_reports_allowed         = EXCLUDED.pl_reports_allowed,
      pen_rider                  = EXCLUDED.pen_rider,
      imported_at                = NOW()
  `, [
    farmId, row.user_id,
    row.surname, row.firstname, row.job_desc, row.start_date, row.finish_date,
    row.legacy_password, row.password_last_changed_date,
    row.cattle_data_entry, row.cattle_reports, row.cattle_utilities,
    row.cattle_lookup_tables, row.cattle_deletes,
    row.feed_system_data_entry, row.feed_system_reports,
    row.feed_system_utilities, row.pl_reports_allowed,
    row.pen_rider,
  ]);
}

async function reconcileToUsers(sysPool, farmId, farmDb, row) {
  const username = buildUsername(row, farmDb);
  const email    = buildEmail(row, farmDb);

  // Look up existing canonical user by synthetic email.
  let userId;
  const exist = await sysPool.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]
  );
  if (exist.rows.length) {
    userId = exist.rows[0].id;
  } else {
    const passwordHash = await hashPlaceholder();
    const ins = await sysPool.query(`
      INSERT INTO users (
        username, email, password_hash, role,
        first_name, last_name, job_title,
        active, imported_from_legacy, must_reset_password
      ) VALUES ($1,$2,$3,'user',$4,$5,$6,$7,TRUE,TRUE)
      RETURNING id
    `, [
      username, email, passwordHash,
      row.firstname, row.surname, row.job_desc,
      row.finish_date == null,
    ]);
    userId = ins.rows[0].id;
  }

  // Stamp the legacy row with the reconciled user_id
  await sysPool.query(`
    UPDATE legacy_farm_users
       SET user_id = $1, reconciled_at = NOW()
     WHERE farm_id = $2 AND legacy_user_id = $3
  `, [userId, farmId, row.user_id]);

  // Ensure farm_members row carrying the permission flags
  await sysPool.query(`
    INSERT INTO farm_members (
      farm_id, user_id, role,
      legacy_user_id,
      cattle_data_entry, cattle_reports, cattle_utilities,
      cattle_lookup_tables, cattle_deletes,
      feed_system_data_entry, feed_system_reports,
      feed_system_utilities, pl_reports_allowed, pen_rider
    ) VALUES ($1,$2,'stockman',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (farm_id, user_id) DO UPDATE SET
      legacy_user_id          = EXCLUDED.legacy_user_id,
      cattle_data_entry       = EXCLUDED.cattle_data_entry,
      cattle_reports          = EXCLUDED.cattle_reports,
      cattle_utilities        = EXCLUDED.cattle_utilities,
      cattle_lookup_tables    = EXCLUDED.cattle_lookup_tables,
      cattle_deletes          = EXCLUDED.cattle_deletes,
      feed_system_data_entry  = EXCLUDED.feed_system_data_entry,
      feed_system_reports     = EXCLUDED.feed_system_reports,
      feed_system_utilities   = EXCLUDED.feed_system_utilities,
      pl_reports_allowed      = EXCLUDED.pl_reports_allowed,
      pen_rider               = EXCLUDED.pen_rider
  `, [
    farmId, userId, row.user_id,
    row.cattle_data_entry, row.cattle_reports, row.cattle_utilities,
    row.cattle_lookup_tables, row.cattle_deletes,
    row.feed_system_data_entry, row.feed_system_reports,
    row.feed_system_utilities, row.pl_reports_allowed,
    row.pen_rider,
  ]);
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const base = pgBaseConfig();
  const sysDb = systemDbName();

  // Connect to maintenance DB to enumerate farm DBs
  const adminPool = new Pool({ ...base, database: 'postgres', max: 2 });
  let farms;
  try {
    if (process.env.FARMS) {
      farms = process.env.FARMS.split(',').map(s => s.trim()).filter(Boolean);
    } else if (args.only) {
      farms = args.only;
    } else {
      farms = await listFarmDbs(adminPool);
    }
  } finally {
    await adminPool.end();
  }

  if (!farms.length) {
    console.error('[ERROR] No farm databases found.');
    process.exit(1);
  }

  console.log(`Aggregating users from ${farms.length} farm DB(s) → ${sysDb}`);
  if (args.dryRun) console.log('(dry-run: no writes)');

  const sysPool = new Pool({ ...base, database: sysDb, max: 4 });

  const summary = [];
  try {
    for (const farmDb of farms) {
      const t0 = Date.now();
      const farmPool = new Pool({ ...base, database: farmDb, max: 2 });
      let count = 0;
      let skipped = false;
      try {
        if (!(await farmHasFeedlotStaff(farmPool))) {
          console.log(`  ${farmDb.padEnd(40)}  (no feed.feedlot_staff — skipped)`);
          skipped = true;
          continue;
        }
        const rows = await pullFarmStaff(farmPool);
        if (args.dryRun) {
          console.log(`  ${farmDb.padEnd(40)}  ${rows.length} legacy user(s) (dry-run)`);
          count = rows.length;
          continue;
        }

        const farmId = await ensureFarmRow(sysPool, farmDb);
        for (const row of rows) {
          await upsertLegacyUser(sysPool, farmId, row);
          await reconcileToUsers(sysPool, farmId, farmDb, row);
          count++;
        }
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  ${farmDb.padEnd(40)}  ${count} user(s) reconciled in ${secs}s`);
      } catch (err) {
        console.error(`  [ERROR] ${farmDb}: ${err.message}`);
        summary.push({ farmDb, count, ok: false, error: err.message });
        continue;
      } finally {
        await farmPool.end();
      }
      if (!skipped) summary.push({ farmDb, count, ok: true });
    }
  } finally {
    await sysPool.end();
  }

  const okCount = summary.filter(s => s.ok).length;
  const total   = summary.reduce((n, s) => n + (s.count || 0), 0);
  console.log(`\nDone. ${okCount}/${summary.length} farms processed, ${total} legacy users aggregated.`);
  if (summary.some(s => !s.ok)) process.exit(1);
}

main().catch(err => {
  console.error('FATAL:', err.stack || err.message);
  process.exit(1);
});
