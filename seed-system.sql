-- ═══════════════════════════════════════════════════════════════════════
-- seed-system.sql — Bootstrap data for the LSJ-Hub platform DB
--
-- Run AFTER schema-system.sql against the system database (lsj_system).
--
--   psql -h localhost -U lsj_admin -d lsj_system -f seed-system.sql
--
-- Populates:
--   1. subscription_plans   — head-bracket tiers
--   2. subscription_modules — optional add-ons
--   3. users                — bootstrap platform admin
--   4. farms                — one row per legacy farm DB (idempotent)
--
-- The per-farm legacy users are imported separately by:
--   node _aggregate_users.js
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Subscription plans ───────────────────────────────────
-- Pricing in AUD. Adjust head brackets / prices to match commercial sheet.
INSERT INTO subscription_plans
  (code, name, description, head_min, head_max, monthly_price, annual_price, included_users, features, sort_order)
VALUES
  ('starter',     'Starter',     'Single small herd, web-only access',
   0,     500,    149.00,  1490.00,  2,
   '["cattle_records","pen_management","reports_basic"]'::jsonb,                                    10),
  ('grower',      'Grower',      'Mid-size operation with feed tracking',
   501,   2000,   349.00,  3490.00,  5,
   '["cattle_records","pen_management","feed_tracking","reports_full","health_basic"]'::jsonb,     20),
  ('feedlot',     'Feedlot',     'Commercial feedlot with full module access',
   2001,  10000,  799.00,  7990.00,  15,
   '["cattle_records","pen_management","feed_tracking","reports_full","health_full","weighbridge","carcase_feedback"]'::jsonb, 30),
  ('enterprise',  'Enterprise',  'Multi-site enterprise, unlimited head, premium support',
   10001, NULL,   1899.00, 18990.00, 50,
   '["cattle_records","pen_management","feed_tracking","reports_full","health_full","weighbridge","carcase_feedback","multi_site","priority_support","sso"]'::jsonb, 40)
ON CONFLICT (code) DO UPDATE SET
  name           = EXCLUDED.name,
  description    = EXCLUDED.description,
  head_min       = EXCLUDED.head_min,
  head_max       = EXCLUDED.head_max,
  monthly_price  = EXCLUDED.monthly_price,
  annual_price   = EXCLUDED.annual_price,
  included_users = EXCLUDED.included_users,
  features       = EXCLUDED.features,
  sort_order     = EXCLUDED.sort_order;


-- ── 2. Subscription modules (add-ons) ───────────────────────
INSERT INTO subscription_modules
  (code, name, description, category, monthly_price, annual_price, sort_order)
VALUES
  ('nlis_sync',         'NLIS Sync',          'Automatic NLIS movement upload',           'compliance',  49.00,  490.00,  10),
  ('xero',              'Xero Integration',   'Push purchase/sale invoices to Xero',      'finance',     59.00,  590.00,  20),
  ('myob',              'MYOB Integration',   'Push purchase/sale invoices to MYOB',      'finance',     59.00,  590.00,  21),
  ('bunk_call',         'Bunk-Call Module',   'Daily bunk score capture on mobile',       'feedlot',     39.00,  390.00,  30),
  ('rfid_scanner',      'RFID Scanner',       'Bluetooth EID reader integration',         'hardware',    29.00,  290.00,  40),
  ('weighbridge',       'Weighbridge Plus',   'Multi-axle weighbridge with auto-docket',  'hardware',    79.00,  790.00,  50),
  ('carcase_feedback',  'Carcase Feedback',   'Import processor kill-sheet PDFs/CSVs',    'reports',     49.00,  490.00,  60),
  ('agent_assistant',   'AI Assistant',       'In-app farm-management AI assistant',      'ai',          99.00,  990.00,  70),
  ('priority_support',  'Priority Support',   '24/7 phone + 1-hour SLA',                  'support',     149.00, 1490.00, 80)
ON CONFLICT (code) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  category      = EXCLUDED.category,
  monthly_price = EXCLUDED.monthly_price,
  annual_price  = EXCLUDED.annual_price,
  sort_order    = EXCLUDED.sort_order;


-- ── 3. Bootstrap platform admin ─────────────────────────────
-- Default password is 'change-me-now' (bcrypt $2b cost 10).
-- The `must_reset_password` flag forces a reset on first login.
-- Generate a fresh hash with:
--   node -e "console.log(require('bcryptjs').hashSync('your-pw',10))"
INSERT INTO users
  (username, email, password_hash, role,
   first_name, last_name, job_title,
   active, imported_from_legacy, must_reset_password)
VALUES
  ('admin', 'admin@lsj-hub.local',
   '$2b$10$wH8b2y0Xq4KmJ6Yc3xHnXuJ1J9r8sQwFfV5eD2nB0aL7zT4mC6oKy',
   'admin',
   'Platform', 'Admin', 'System Administrator',
   TRUE, FALSE, TRUE)
ON CONFLICT (username) DO NOTHING;


-- ── 4. Register every legacy farm DB ────────────────────────
-- Insert one row per farm. Add new entries as more farms are migrated.
-- `db_name` must match the PostgreSQL database name created by
-- _create_farm_dbs.js (slugified lower-case).
INSERT INTO farms (name, db_name, description) VALUES
  ('2DE',                     '2de',                    'Migrated from legacy CATTLE.NET'),
  ('AAMIG',                   'aamig',                  'Migrated from legacy CATTLE.NET'),
  ('Anna Plains Feedlot',     'anna_plains_feedlot',    'Migrated from legacy CATTLE.NET'),
  ('Avondale Feedlot',        'avondale_feedlot',       'Migrated from legacy CATTLE.NET'),
  ('Barmount',                'barmount',               'Migrated from legacy CATTLE.NET'),
  ('Bos Grazing',             'bos_grazing',            'Migrated from legacy CATTLE.NET'),
  ('BSN Trading',             'bsn_trading',            'Migrated from legacy CATTLE.NET'),
  ('Cadelga Cattle Co',       'cadelga_cattle_co',      'Migrated from legacy CATTLE.NET'),
  ('CH2 Pastoral',            'ch2_pastoral',           'Migrated from legacy CATTLE.NET'),
  ('Coggan Agriculture',      'coggan_agriculture',     'Migrated from legacy CATTLE.NET'),
  ('Conargo Feedlot',         'conargo_feedlot',        'Migrated from legacy CATTLE.NET'),
  ('Demonstration Database',  'demonstration_database', 'Demo / training tenant'),
  ('Freestone Feedlot',       'freestone_feedlot',      'Migrated from legacy CATTLE.NET'),
  ('Glen Avon',               'glen_avon',              'Migrated from legacy CATTLE.NET'),
  ('Hutchinson Grazing',      'hutchinson_grazing',     'Migrated from legacy CATTLE.NET'),
  ('KO Beef',                 'ko_beef',                'Migrated from legacy CATTLE.NET'),
  ('Kerrigan Valley Feedlot', 'kerrigan_valley_feedlot','Migrated from legacy CATTLE.NET'),
  ('Llanarth Pastoral Co',    'llanarth_pastoral_co',   'Migrated from legacy CATTLE.NET'),
  ('Lowlands Pastoral Co',    'lowlands_pastoral_co',   'Migrated from legacy CATTLE.NET'),
  ('Midfield Group',          'midfield_group',         'Migrated from legacy CATTLE.NET'),
  ('Mirambee Livestock',      'mirambee_livestock',     'Migrated from legacy CATTLE.NET'),
  ('Moruya Feedlot',          'moruya_feedlot',         'Migrated from legacy CATTLE.NET'),
  ('Myrtlevale Partnership',  'myrtlevale_partnership', 'Migrated from legacy CATTLE.NET'),
  ('P&C and D&G Tuohey',      'p_and_c_and_d_and_g_tuohey', 'Migrated from legacy CATTLE.NET'),
  ('Penna & Sons',            'penna_and_sons',         'Migrated from legacy CATTLE.NET'),
  ('Rangers Valley',          'rangers_valley',         'Migrated from legacy CATTLE.NET'),
  ('Reid River Export',       'reid_river_export',      'Migrated from legacy CATTLE.NET'),
  ('Semini',                  'semini',                 'Migrated from legacy CATTLE.NET'),
  ('Thomas Foods',            'thomas_foods',           'Migrated from legacy CATTLE.NET'),
  ('Thomas Foods Iranda',     'thomas_foods_iranda',    'Migrated from legacy CATTLE.NET'),
  ('Tonkin Farming',          'tonkin_farming',         'Migrated from legacy CATTLE.NET'),
  ('Victoria Hill Lamb',      'victoria_hill_lamb',     'Migrated from legacy CATTLE.NET'),
  ('Wanderribby Feedlot',     'wanderribby_feedlot',    'Migrated from legacy CATTLE.NET'),
  ('Willow Bend Feedlot',     'willow_bend_feedlot',    'Migrated from legacy CATTLE.NET'),
  ('Yarralinka Livestock Co', 'yarralinka_livestock_co','Migrated from legacy CATTLE.NET')
ON CONFLICT (db_name) DO UPDATE SET
  name = EXCLUDED.name;


-- ── 5. Default subscription per farm (trial on Feedlot tier) ─
-- Gives each migrated farm a 30-day trial on the Feedlot plan so the
-- app is usable immediately. Adjust per commercial agreement.
INSERT INTO farm_subscriptions
  (farm_id, plan_id, status, billing_cycle, trial_ends_at,
   current_period_start, current_period_end)
SELECT
  f.id,
  p.id,
  'trial',
  'monthly',
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM farms f
CROSS JOIN subscription_plans p
WHERE p.code = 'feedlot'
ON CONFLICT (farm_id) DO NOTHING;

COMMIT;
