-- ═══════════════════════════════════════════════════════════════════════
-- seed.sql — Post-migration seed data for v5 tables with no legacy source
--
-- Run AFTER migration completes.  Populates:
--   1. health.body_systems — cloned from system.lookups (category='body_system')
--   2. weighing.scalestypes — common Australian feedlot scale types
--
-- NOTE: pen.pens is now populated DIRECTLY by the migration (Pens_File mapping
-- inserts with id = legacy Pen_Number_ID). No clone step required.
--
-- Tables intentionally LEFT EMPTY (OG web-app only, no legacy data):
--   operations.bunk_call_sessions, bunk_call_entries, rfid_scan_sessions,
--     transport_dispatches, transport_dispatch_items, weighbridge_dockets,
--     archives, drafting_settings, report_templates, agent_issues,
--     batch_pen_operations, nlis_transfers
--   health.health_records, treatments, drug_purchases,
--     drug_stocktakes, drug_stocktake_records,
--     drug_transfers, drug_transfer_records
--   cattle.gps_locations
--   system.connected_systems, system_positions, legacy_raw, migration_log
--
-- Tables intentionally LEFT EMPTY (per-site hardware config):
--   system.com_port_settings     — configured per feedlot crush/reader setup
--   system.field_names_foreign_conversion — UI label translations, rarely used
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. health.body_systems — seed from system.lookups ────────────────
-- Legacy BodySystems data was migrated into system.lookups (category='body_system').
-- The OG health module expects rows in health.body_systems.
INSERT INTO health.body_systems (bs_id, body_system)
SELECT
  code::INTEGER,
  name
FROM system.lookups
WHERE category = 'body_system'
  AND name IS NOT NULL
ON CONFLICT (body_system) DO NOTHING;

-- ── 2. weighing.scalestypes — common scale types ─────────────────────
-- Legacy ScalesTypes was excluded (serial protocol details).
-- Seed with known scale type names used across AU feedlots.
INSERT INTO weighing.scalestypes (scale_type, description) VALUES
  ('Gallagher W-0',   'Gallagher weigh-scale indicator'),
  ('Gallagher W-2',   'Gallagher W-2 series indicator'),
  ('Gallagher W-8',   'Gallagher W-8 series indicator'),
  ('Rinstrum R420',   'Rinstrum R420 indicator'),
  ('Rinstrum R320',   'Rinstrum R320 indicator'),
  ('Tru-Test XR5000', 'Tru-Test XR5000 load-bar system'),
  ('Tru-Test SR5000', 'Tru-Test SR5000 indicator'),
  ('Ruddweigh 600',   'Ruddweigh 600 series'),
  ('Ruddweigh 800',   'Ruddweigh 800 series'),
  ('Digistar',        'Digistar feed-truck scale system'),
  ('Manual',          'Manual/visual weight entry')
ON CONFLICT DO NOTHING;

COMMIT;
