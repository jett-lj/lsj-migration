-- ═══════════════════════════════════════════════════════════════════════
-- LSJ-HUB V5 Farm Database Schema (PostgreSQL)
-- Combined OG web-app schema + V2 legacy schema (Cattle.NET)
--
-- Each farm gets its own database with this schema.
-- Multi-tenant: system DB (lsj_system) is separate.
--
-- Features:
--   * 17 PostgreSQL schemas for domain organization
--   * search_path resolves unqualified table names (zero route changes)
--   * SERIAL PKs (OG pattern), legacy_beast_id UNIQUE for ETL
--   * NUMERIC(12,4) money, NUMERIC(10,2) weights, TEXT strings
--   * Partitioned high-volume tables (yearly 2020–2027 + DEFAULT)
--   * Legacy views for ETL column-name mapping
--   * All V2 columns preserved — zero data loss
--   * All OG web-app tables preserved — zero functionality loss
--
-- search_path (set per farm pool connection in server/db/index.js):
--   SET search_path TO cattle, health, feed, pen, finance, carcase,
--     purchasing, commodity, transport, contacts, breeding, weighing,
--     reporting, operations, system, digistar, legacy, public;
--
-- Generated: 2026-04-10
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Create Schemas ───────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS breeding;
CREATE SCHEMA IF NOT EXISTS carcase;
CREATE SCHEMA IF NOT EXISTS cattle;
CREATE SCHEMA IF NOT EXISTS commodity;
CREATE SCHEMA IF NOT EXISTS contacts;
CREATE SCHEMA IF NOT EXISTS digistar;
CREATE SCHEMA IF NOT EXISTS feed;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS health;
CREATE SCHEMA IF NOT EXISTS legacy;
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS pen;
CREATE SCHEMA IF NOT EXISTS purchasing;
CREATE SCHEMA IF NOT EXISTS reporting;
CREATE SCHEMA IF NOT EXISTS system;
CREATE SCHEMA IF NOT EXISTS transport;
CREATE SCHEMA IF NOT EXISTS weighing;


-- ── Shared Functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ████████████████████████████████████████████████████████████████
-- ██  CATTLE CORE
-- ██  Core cattle records, IDs, movements, programs, and inventory
-- ████████████████████████████████████████████████████████████████

-- Lookup: breeds (OG)
CREATE TABLE IF NOT EXISTS cattle.breeds (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

-- Lookup: market_categories (OG + V2 merged)
CREATE TABLE IF NOT EXISTS cattle.market_categories (
  id                      SERIAL PRIMARY KEY,
  name                    TEXT NOT NULL UNIQUE,
  min_dof                 INTEGER,
  hgp_free                BOOLEAN DEFAULT FALSE,
  predicted_dressing_pct  NUMERIC(5,2),
  dispatch_notes          TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ
);

-- Lookup: cull_reasons (OG + V2 merged)
CREATE TABLE IF NOT EXISTS cattle.cull_reasons (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  pay_rate_per_kg NUMERIC(12,4),
  induction_cull  BOOLEAN DEFAULT FALSE,
  later_cull      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Lookup: cattle_program_types (V2: 15 clients)
CREATE TABLE IF NOT EXISTS cattle.cattle_program_types (
  id                  SERIAL PRIMARY KEY,
  program_id          INTEGER NOT NULL UNIQUE,
  program_code        TEXT NOT NULL,
  dof                 INTEGER,
  program_description TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- Lookup: cattle_specs (OG + V2 merged)
CREATE TABLE IF NOT EXISTS cattle.cattle_specs (
  id                 SERIAL PRIMARY KEY,
  intake_fat_from    INTEGER,
  intake_fat_to      INTEGER,
  intake_wght_from   INTEGER,
  intake_wght_to     INTEGER,
  intake_teeth_from  INTEGER,
  intake_teeth_to    INTEGER,
  sale_wght_from     INTEGER,
  sale_wght_to       INTEGER,
  wg_per_day_from    NUMERIC(10,2),
  wg_per_day_to      NUMERIC(10,2),
  dressing_pct_from  NUMERIC(5,2),
  dressing_pct_to    NUMERIC(5,2),
  marbling_gte       INTEGER,
  carc_p8_from       INTEGER,
  carc_p8_to         INTEGER,
  ema_from           INTEGER,
  ema_to             INTEGER,
  fat_colour_from    INTEGER,
  fat_colour_to      INTEGER,
  meat_colour_from   TEXT,
  meat_colour_to     TEXT,
  paddock_wg_from    NUMERIC(10,2),
  paddock_wg_to      NUMERIC(10,2),
  dof_from           INTEGER,
  dof_to             INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ
);

-- Lookup: trial_description (V2: 17 clients)
CREATE TABLE IF NOT EXISTS cattle.trial_description (
  id          SERIAL PRIMARY KEY,
  trial_no    INTEGER NOT NULL UNIQUE,
  name        TEXT,
  purpose     TEXT,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  total_head  INTEGER,
  results     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- Lookup: location_types (OG)
CREATE TABLE IF NOT EXISTS cattle.location_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  category    TEXT DEFAULT 'feedlot' CHECK(category IN ('feedlot','paddock','agistor','custom')),
  description TEXT
);

-- ── Core: cows (OG ~70 cols + V2 ~88 cols → ~95 cols merged) ──

CREATE TABLE IF NOT EXISTS cattle.cows (
  id                     SERIAL PRIMARY KEY,
  ear_tag                TEXT NOT NULL,
  eid                    TEXT,
  tail_tag               TEXT,
  previous_ear_tag       TEXT,
  group_name             TEXT,
  sub_group              TEXT,
  breed_id               INTEGER,
  sex                    TEXT DEFAULT 'heifer' CHECK (sex IN ('heifer', 'cow', 'steer', 'bull')),
  hgp                    BOOLEAN DEFAULT FALSE,
  -- Financials
  background_cost_per_kg NUMERIC(12,4),
  bg_fee                 NUMERIC(12,2),
  profit_loss            NUMERIC(12,4),
  last_oracle_costs      NUMERIC(12,2),
  last_oracle_date       DATE,
  lot_closeout_date      DATE,
  -- Dates
  start_date             DATE,
  sale_date              DATE,
  dob                    DATE,
  entry_date             DATE,
  date_died              DATE,
  date_culled            DATE,
  date_archived          DATE,
  planned_kill_date      DATE,
  date_rfid_changed      DATE,
  feedlot_entry_date     DATE,
  last_overhead_update_date TIMESTAMPTZ,
  -- Weights (NUMERIC, not REAL)
  start_weight_kg        NUMERIC(10,2),
  sale_weight_kg         NUMERIC(10,2),
  entry_weight_kg        NUMERIC(10,2),
  feedlot_entry_weight_kg NUMERIC(10,2),
  carcase_weight_kg      NUMERIC(10,2),
  weight_gain_kg         NUMERIC(10,2),
  wg_per_day             NUMERIC(10,2),
  paddock_weight_gain_kg NUMERIC(10,2),
  feedlot_weight_gain_kg NUMERIC(10,2),
  -- Status & location
  status                 TEXT DEFAULT 'active' CHECK(status IN ('active','sold','died','archived')),
  pen_id                 INTEGER,  -- FK added after pens table
  purchase_lot_id        INTEGER,  -- FK added after purchase_lots table
  off_feed               BOOLEAN DEFAULT FALSE,
  in_hospital            BOOLEAN DEFAULT FALSE,
  in_feedlot             BOOLEAN DEFAULT FALSE,
  buller                 BOOLEAN DEFAULT FALSE,
  non_performer          BOOLEAN DEFAULT FALSE,
  custom_feeder          BOOLEAN DEFAULT FALSE,
  frame_size             TEXT,
  market_category        TEXT,
  cull_reason            TEXT,
  teeth                  SMALLINT,
  -- Withholding
  withhold_until         DATE,
  esi_withhold_until     DATE,
  -- RFID & tags
  old_rfid               TEXT,
  paddock_tag            TEXT,
  nfas_decl_number       TEXT,
  eu_dec_no              TEXT,
  outgoing_nvd           TEXT,
  blood_vial_number      TEXT,
  dna_blood_number       TEXT,
  -- Breeding
  sire_tag               TEXT,
  dam_tag                TEXT,
  pregnant               BOOLEAN DEFAULT FALSE,
  preg_tested            BOOLEAN DEFAULT FALSE,
  lifetime_traceable     BOOLEAN DEFAULT FALSE,
  species                TEXT DEFAULT 'bovine',
  -- Agistment
  agist_lot_no           TEXT,
  agistment_pic          TEXT,
  agisted_animal         BOOLEAN DEFAULT FALSE,
  agist_charged_to_date  DATE,
  -- Programs & groups
  program_id             INTEGER,
  dof_in_prev_fl         INTEGER,
  dof_scheduled          INTEGER,
  grower_group_code      INTEGER,
  trial_no_id            INTEGER,
  beast_sale_type_id     INTEGER,
  current_loc_type_id    INTEGER,
  custom_feed_owner_id   INTEGER,
  -- Flags
  ap_lot                 TEXT,
  eu                     BOOLEAN DEFAULT FALSE,
  nlis_tag_fail          BOOLEAN DEFAULT FALSE,
  abattoir_culled        BOOLEAN DEFAULT FALSE,
  abattoir_condemned     BOOLEAN DEFAULT FALSE,
  marbling_bonus_lot     TEXT,
  bovilus_shots           INTEGER,
  vendor_treated_bovilus  BOOLEAN DEFAULT FALSE,
  date_moved_pen         DATE,
  -- Relationships
  vendor_id              INTEGER,
  agent_id               INTEGER,
  -- Legacy
  legacy_beast_id        INTEGER UNIQUE,
  photo_url              TEXT,
  notes                  TEXT,
  legacy_modified_at     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cows_tag ON cattle.cows(ear_tag);
CREATE INDEX IF NOT EXISTS idx_cows_eid ON cattle.cows(eid);
CREATE INDEX IF NOT EXISTS idx_cows_status ON cattle.cows(status);
CREATE INDEX IF NOT EXISTS idx_cows_pen ON cattle.cows(pen_id);
CREATE INDEX IF NOT EXISTS idx_cows_purchase_lot ON cattle.cows(purchase_lot_id);
CREATE INDEX IF NOT EXISTS idx_cows_vendor ON cattle.cows(vendor_id);
CREATE INDEX IF NOT EXISTS idx_cows_agent ON cattle.cows(agent_id);
CREATE INDEX IF NOT EXISTS idx_cows_legacy_beast_id ON cattle.cows(legacy_beast_id);

-- cattle_processed (V2: 17 clients)
CREATE TABLE IF NOT EXISTS cattle.cattle_processed (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER,
  weigh_date  TIMESTAMPTZ,
  draft_gate  SMALLINT,
  saved_date  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- cattle_photos (OG + V2 merged)
CREATE TABLE IF NOT EXISTS cattle.cattle_photos (
  id                SERIAL PRIMARY KEY,
  cow_id            INTEGER,
  ear_tag           TEXT,
  photo             BYTEA,
  photo_url         TEXT,
  date_last_updated TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- daily_cattle_inventory (V2: 16 clients)
CREATE TABLE IF NOT EXISTS cattle.daily_cattle_inventory (
  inventory_date         DATE NOT NULL PRIMARY KEY,
  fl_entries             INTEGER,
  x_rv_paddock           INTEGER,
  fl_deaths              SMALLINT,
  fl_culls               SMALLINT,
  fl_sales               INTEGER,
  calc_fl_head           INTEGER,
  actual_fl_head         INTEGER,
  accum_month_headdays   INTEGER,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ
);

-- kd1_records (V2: 17 clients — scale import staging)
CREATE TABLE IF NOT EXISTS cattle.kd1_records (
  id              SERIAL PRIMARY KEY,
  ear_tag         TEXT,
  weight          NUMERIC(10,2),
  hash            TEXT,
  ident           TEXT,
  eid             TEXT,
  error_mess      TEXT,
  group_name      TEXT,
  teeth           TEXT,
  weigh_note      TEXT,
  sex             TEXT,
  pen_number      TEXT,
  p8_fat          TEXT,
  add_or_update   TEXT,
  supplier_eartag TEXT,
  rudd800_traits  TEXT,
  lot_number      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- purchase_lot_cattle (OG + V2 merged)
CREATE TABLE IF NOT EXISTS cattle.purchase_lot_cattle (
  id                     SERIAL PRIMARY KEY,
  lot_number             TEXT,
  head_count             SMALLINT,
  price_cents_per_kg     NUMERIC(12,4),
  weight                 NUMERIC(10,2),
  tail_tag               TEXT,
  vendor_decl_no         TEXT,
  agistment_pic          TEXT,
  legacy_modified_at     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ
);

-- tag_bucket (OG: tag_bucket, V2: tag_bucket_file)
CREATE TABLE IF NOT EXISTS cattle.tag_bucket (
  rfid_number  TEXT NOT NULL PRIMARY KEY,
  nlis_number  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- batch_update_log (V2: 17 clients)
CREATE TABLE IF NOT EXISTS cattle.batch_update_log (
  id        SERIAL PRIMARY KEY,
  date_done DATE NOT NULL,
  username  TEXT,
  user_id   TEXT,
  log_text  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- despatched_rfids (V2: 2 clients — Midfield, Rangers Valley)
CREATE TABLE IF NOT EXISTS cattle.despatched_rfids (
  id               SERIAL PRIMARY KEY,
  eid              TEXT,
  despatch_mob_name TEXT,
  ear_tag          TEXT,
  group_name       TEXT,
  group_colour     TEXT,
  rejected         TEXT,
  prorata_weight   NUMERIC(10,2),
  dof              INTEGER,
  date_and_time    TIMESTAMPTZ,
  despatched       BOOLEAN,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- beast_movement (V2: 8 clients)
CREATE TABLE IF NOT EXISTS cattle.beast_movements (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER,
  move_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- overhead_application_history (V2: 17 clients)
CREATE TABLE IF NOT EXISTS cattle.overhead_application_history (
  id                      SERIAL PRIMARY KEY,
  ohead_appl_month_end_date DATE,
  ohead_doll_hd_day       NUMERIC(12,4),
  ohead_gross_value       NUMERIC(12,4),
  ohead_head              INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ
);

-- overhead_application_pens (V2 normalized child)
CREATE TABLE IF NOT EXISTS cattle.overhead_application_pens (
  id                  SERIAL PRIMARY KEY,
  history_id          INTEGER REFERENCES cattle.overhead_application_history(id),
  pen_number          TEXT,
  head_count          INTEGER,
  days                INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- agistment_transfer_register (V2: 17 clients)
CREATE TABLE IF NOT EXISTS cattle.agistment_transfer_register (
  id                        SERIAL PRIMARY KEY,
  movement_date             DATE,
  agist_lot_no              TEXT,
  agistor_code              INTEGER,
  numb_head                 SMALLINT,
  numb_died                 SMALLINT,
  wbridge_docket            TEXT,
  return_wght               INTEGER,
  weight_cattle_sent        INTEGER,
  agist_weight_gain         INTEGER,
  weightgain_doll_per_kg    NUMERIC(12,4),
  inv_number                TEXT,
  inv_amount                NUMERIC(12,4),
  agist_inv_approved        DATE,
  carrier                   TEXT,
  carrier_inv_no            TEXT,
  freight_amount            NUMERIC(12,4),
  frght_inv_approved        DATE,
  applied_to_cattle_file    BOOLEAN DEFAULT FALSE,
  notes                     TEXT,
  agistor_tailtag           TEXT,
  vendor_decl_numb          TEXT,
  custom_fl_returns         BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ
);

-- new_cattle_records_log (V2: 17 clients)
CREATE TABLE IF NOT EXISTS cattle.new_cattle_records_log (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,
  date_record_added DATE,
  module          TEXT,
  procedure_name  TEXT,
  user_number     INTEGER,
  ear_tag         TEXT,
  eid             TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- cattle_dof_dip (OG only — DOF/DIP calculations)
CREATE TABLE IF NOT EXISTS cattle.cattle_dof_dip (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER,
  dof         INTEGER,
  dip         INTEGER,
  calc_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- pen_list_snapshots (OG only — pen snapshot history)
CREATE TABLE IF NOT EXISTS cattle.pen_list_snapshots (
  id            SERIAL PRIMARY KEY,
  pen_id        INTEGER,
  snapshot_date DATE NOT NULL,
  head_count    INTEGER,
  snapshot_data JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  MAP / GEOSPATIAL  (LSJ feature)
-- ██  Pen polygons, paddock polygons, infrastructure pins, hazards
-- ██  Geometry stored as GeoJSON in JSONB — no PostGIS dependency,
-- ██  native MapLibre format, validated at the API boundary with Zod.
-- ████████████████████████████████████████████████████████████████

CREATE SCHEMA IF NOT EXISTS map;

-- map.paddocks — polygons covering both feedlot pens and grazing paddocks.
-- When type='pen', pen_id links back to pen.pens so we can join lot/ration data.
CREATE TABLE IF NOT EXISTS map.paddocks (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'paddock'
               CHECK (type IN ('pen','paddock','holding','quarantine','hospital','pasture','crop','laneway','other')),
  pen_id       INTEGER,
  geometry     JSONB NOT NULL,
  area_ha      NUMERIC(12,4),
  fill_color   TEXT,
  stroke_color TEXT,
  notes        TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_map_paddocks_type   ON map.paddocks(type);
CREATE INDEX IF NOT EXISTS idx_map_paddocks_pen    ON map.paddocks(pen_id) WHERE pen_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_paddocks_active ON map.paddocks(active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_map_paddocks_pen ON map.paddocks(pen_id) WHERE pen_id IS NOT NULL;

-- map.infrastructure — point features (mill, silos, troughs, yards, weighbridge, …)
CREATE TABLE IF NOT EXISTS map.infrastructure (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL
                CHECK (kind IN (
                  'mill','silo','silage_pit','water_trough','water_tank','dam','turkey_nest',
                  'yards','weighbridge','hospital','loadout','rubbish_tip','workshop','office',
                  'fuel_bay','gate','feed_bay','airstrip','other'
                )),
  geometry      JSONB NOT NULL,
  capacity      NUMERIC(14,2),
  capacity_unit TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','maintenance')),
  notes         TEXT,
  properties    JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_map_infra_kind   ON map.infrastructure(kind);
CREATE INDEX IF NOT EXISTS idx_map_infra_status ON map.infrastructure(status);

-- map.hazards — point or polygon flags (biosecurity, fence, hazard, weather)
CREATE TABLE IF NOT EXISTS map.hazards (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'medium'
               CHECK (severity IN ('low','medium','high','critical')),
  category     TEXT NOT NULL DEFAULT 'general'
               CHECK (category IN ('biosecurity','fence','water','infrastructure','wildlife','weather','general')),
  geometry     JSONB NOT NULL,
  description  TEXT,
  reported_by  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_map_hazards_severity ON map.hazards(severity);
CREATE INDEX IF NOT EXISTS idx_map_hazards_active   ON map.hazards(resolved_at) WHERE resolved_at IS NULL;

-- map.farm_boundary — single (or few) outer-boundary polygon used as default extent
CREATE TABLE IF NOT EXISTS map.farm_boundary (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  geometry   JSONB NOT NULL,
  area_ha    NUMERIC(12,2),
  centroid   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  HEALTH & VETERINARY
-- ██  Drugs, sickness records, autopsies, treatments, chemical inventory
-- ████████████████████████████████████████████████████████████████

-- body_systems (OG — lookup for disease body systems)
CREATE TABLE IF NOT EXISTS health.body_systems (
  id          SERIAL PRIMARY KEY,
  bs_id       INTEGER NOT NULL,
  body_system TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bs_body_system ON health.body_systems(body_system);

-- diseases (OG + V2 merged)
CREATE TABLE IF NOT EXISTS health.diseases (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  symptoms        TEXT,
  treatment       TEXT,
  body_system     TEXT,
  recovery_days   INTEGER,
  active          BOOLEAN DEFAULT TRUE,
  recoverable     BOOLEAN DEFAULT TRUE,
  penapp_name     TEXT,
  autopsy_disease BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- drugs (OG + V2 merged — superset of both)
CREATE TABLE IF NOT EXISTS health.drugs (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL UNIQUE,
  unit                  TEXT,
  cost_per_unit         NUMERIC(12,4),
  withhold_days         INTEGER DEFAULT 0,
  esi_days              INTEGER DEFAULT 0,
  withhold_days_3       INTEGER DEFAULT 0,
  withhold_days_4       INTEGER DEFAULT 0,
  is_hgp                BOOLEAN DEFAULT FALSE,
  is_antibiotic         BOOLEAN DEFAULT FALSE,
  supplier              TEXT,
  active                BOOLEAN DEFAULT TRUE,
  notes                 TEXT,
  drug_category         INTEGER,
  admin_units           TEXT,
  admin_weight_factor   NUMERIC(10,4),
  current_batch         TEXT,
  cost_per_unit_cf      NUMERIC(12,4),
  chemical_mg_per_ml    NUMERIC(10,4),
  reorder_trigger_units NUMERIC(10,2),
  units_per_package     NUMERIC(10,2),
  units_on_hand         NUMERIC(10,2),
  legacy_modified_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);

-- treatment_regimes (OG + V2 merged)
CREATE TABLE IF NOT EXISTS health.treatment_regimes (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  disease_id  INTEGER REFERENCES health.diseases(id),
  description TEXT,
  days        INTEGER,
  drug_ids    JSONB DEFAULT '[]',
  -- V2 fields
  dose        NUMERIC(10,2),
  dose_by_weight BOOLEAN,
  drug_id     INTEGER REFERENCES health.drugs(id),
  userid      SMALLINT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- health_records (OG web-app — CRUD for vet records)
CREATE TABLE IF NOT EXISTS health.health_records (
  id                   SERIAL PRIMARY KEY,
  cow_id               INTEGER,
  type                 TEXT NOT NULL CHECK(type IN ('checkup','vaccination','treatment','injury','other')),
  description          TEXT NOT NULL,
  date                 DATE NOT NULL,
  vet_name             TEXT,
  cost                 NUMERIC(12,2),
  disease_id           INTEGER REFERENCES health.diseases(id),
  date_recovered       DATE,
  result_code          TEXT,
  legacy_sb_rec_no     INTEGER UNIQUE,
  severity_level       SMALLINT,
  withhold_until       DATE,
  date_to_sick_pen     DATE,
  sick_pen_number      TEXT,
  date_back_to_pen     DATE,
  back_to_pen_number   TEXT,
  hosp_tag_number      TEXT,
  rat_type             TEXT,
  pen_where_found_sick TEXT,
  euthanased           BOOLEAN DEFAULT FALSE,
  too_far_gone         BOOLEAN DEFAULT FALSE,
  insurance_claim      BOOLEAN DEFAULT FALSE,
  insurance_value      NUMERIC(12,2),
  insurance_paid       BOOLEAN DEFAULT FALSE,
  dof_when_sick        INTEGER,
  diagnoser_empl_id    INTEGER,
  user_initials        TEXT,
  custom_feed_owner_id INTEGER,
  purch_lot_no         TEXT,
  cause_of_death       TEXT,
  autopsied            BOOLEAN DEFAULT FALSE,
  ear_tag              TEXT,
  legacy_modified_at   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_cow ON health.health_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_date ON health.health_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_type ON health.health_records(type);
CREATE INDEX IF NOT EXISTS idx_health_disease ON health.health_records(disease_id);
CREATE INDEX IF NOT EXISTS idx_health_sb_rec_no ON health.health_records(legacy_sb_rec_no);

-- treatments (OG web-app)
CREATE TABLE IF NOT EXISTS health.treatments (
  id               SERIAL PRIMARY KEY,
  cow_id           INTEGER,
  health_record_id INTEGER REFERENCES health.health_records(id) ON DELETE SET NULL,
  drug_id          INTEGER REFERENCES health.drugs(id),
  disease_id       INTEGER REFERENCES health.diseases(id),
  dose             NUMERIC(10,2),
  withhold_until   DATE,
  administered_by  TEXT,
  batch_no         TEXT,
  time_given       TEXT,
  drug_cost        NUMERIC(12,2),
  date_next_dose   DATE,
  esi_withhold     DATE,
  where_given      TEXT,
  ear_tag          TEXT,
  legacy_modified_at TIMESTAMPTZ,
  administered_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_treat_cow ON health.treatments(cow_id);
CREATE INDEX IF NOT EXISTS idx_treat_drug ON health.treatments(drug_id);

-- sick_beast_records (V2: 17 clients — comprehensive, absorbs BRD symptoms)
CREATE TABLE IF NOT EXISTS health.sick_beast_records (
  sb_rec_no            INTEGER NOT NULL PRIMARY KEY,
  cow_id               INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id             INTEGER,            -- OG legacy
  ear_tag_no           TEXT,
  date_diagnosed       DATE,
  disease_id           INTEGER,
  diagnosed_by         TEXT,
  severity_level       SMALLINT,
  date_recovered_died  DATE,
  result_code          SMALLINT,
  whold_until          TIMESTAMPTZ,
  sick_beast_notes     TEXT,
  date_to_sick_pen     DATE,
  sick_pen_number      TEXT,
  date_back_to_pen     DATE,
  back_to_pen_number   TEXT,
  hosp_tag_number      TEXT,
  rattype              TEXT,
  pen_where_found_sick TEXT,
  euthanased           BOOLEAN,
  date_last_updated    DATE,
  too_far_gone         BOOLEAN DEFAULT FALSE,
  insurance_claim      BOOLEAN DEFAULT FALSE,
  insurance_value      NUMERIC(12,4),
  insurance_paid       BOOLEAN DEFAULT FALSE,
  dof_when_sick        SMALLINT,
  diagnoser_empl_id    INTEGER,
  user_initials        TEXT,
  customfeedownerid    INTEGER,
  purch_lot_no         TEXT,
  legacy_modified_at   TIMESTAMPTZ,
  cause_of_death       SMALLINT,
  autopsied            BOOLEAN,
  -- BRD symptoms (consolidated from V2)
  brd_runny_nose               BOOLEAN,
  brd_runny_eyes               BOOLEAN,
  brd_drool_slobber            BOOLEAN,
  brd_coughing                 BOOLEAN,
  brd_increased_breathing_rate BOOLEAN,
  brd_laboured_breathing       BOOLEAN,
  brd_reduced_gut_fill         BOOLEAN,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sick_beast_beast ON health.sick_beast_records(beast_id);
CREATE INDEX IF NOT EXISTS idx_sick_beast_date ON health.sick_beast_records(date_diagnosed);

-- drugs_given (V2: 17 clients — PARTITIONED by date_given)
CREATE TABLE IF NOT EXISTS health.drugs_given (
  id                   SERIAL NOT NULL,
  cow_id               INTEGER,             -- OG FK (→ cattle.cows)
  beast_id             INTEGER,             -- V2 legacy FK (CFR BeastID, preserved for ETL)
  ear_tag_no           TEXT,
  drug_id              INTEGER,
  batch_no             TEXT,
  date_given           DATE,
  time_given           TEXT,
  units_given          NUMERIC(10,2),
  drug_cost            NUMERIC(12,4),
  withold_until        TIMESTAMPTZ,
  date_next_dose       DATE,
  sb_rec_no            INTEGER,
  withhold_date_esi    TIMESTAMPTZ,
  user_initials        TEXT,
  legacy_modified_at   TIMESTAMPTZ,
  where_given          TEXT,
  applied_to_stockonhand BOOLEAN,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ,
  PRIMARY KEY (id, date_given)
) PARTITION BY RANGE (date_given);

-- autopsy_records (V2: 17 clients — 72 pathology BOOLEANs + OG JSONB)
CREATE TABLE IF NOT EXISTS health.autopsy_records (
  id               SERIAL PRIMARY KEY,          -- OG PK
  sb_rec_no        INTEGER UNIQUE,              -- V2 PK (kept for ETL)
  cow_id           INTEGER,                     -- OG FK (→ cattle.cows)
  beast_id         INTEGER,                     -- V2 FK
  legacy_beast_id  INTEGER,                     -- OG
  ear_tag          TEXT,                        -- OG name
  ear_tag_no       TEXT,                        -- V2 name
  date_dead        DATE,
  time_dead        TEXT,
  time_autopsy     TEXT,
  autopsy_by       TEXT,
  date_autopsy     DATE,
  pre_autopsy_diag TEXT,
  post_autopsy_diag TEXT,
  notes            TEXT,
  findings         JSONB,  -- OG extensible field
  -- V2 explicit pathology columns
  body_cond_fresh          BOOLEAN DEFAULT FALSE,
  body_cond_bloated        BOOLEAN DEFAULT FALSE,
  body_cond_putrid         BOOLEAN DEFAULT FALSE,
  nostrils_erosions        BOOLEAN DEFAULT FALSE,
  nostrils_fluid           BOOLEAN DEFAULT FALSE,
  nostrils_froth           BOOLEAN DEFAULT FALSE,
  larynx_normal            BOOLEAN DEFAULT FALSE,
  larynx_necrotic          BOOLEAN DEFAULT FALSE,
  trachea_erosions         BOOLEAN DEFAULT FALSE,
  trachea_fluid            BOOLEAN DEFAULT FALSE,
  trachea_froth            BOOLEAN DEFAULT FALSE,
  chest_fluid              BOOLEAN DEFAULT FALSE,
  chest_fibrin             BOOLEAN DEFAULT FALSE,
  chest_adhesions          BOOLEAN DEFAULT FALSE,
  lungs_spongy             BOOLEAN DEFAULT FALSE,
  lungs_firm               BOOLEAN DEFAULT FALSE,
  lungs_consolidate        BOOLEAN DEFAULT FALSE,
  lungs_abscess            BOOLEAN DEFAULT FALSE,
  lungs_not_collapsed      BOOLEAN DEFAULT FALSE,
  heart_fluid              BOOLEAN DEFAULT FALSE,
  heart_haemorrhages       BOOLEAN DEFAULT FALSE,
  abdomen_fluid            BOOLEAN DEFAULT FALSE,
  abdomen_fibrin           BOOLEAN DEFAULT FALSE,
  abdomen_adhesions        BOOLEAN DEFAULT FALSE,
  liver_abscess            BOOLEAN DEFAULT FALSE,
  liver_cysts              BOOLEAN DEFAULT FALSE,
  liver_colour             BOOLEAN DEFAULT FALSE,
  rumen_full               BOOLEAN DEFAULT FALSE,
  rumen_empty              BOOLEAN DEFAULT FALSE,
  intest_normal            BOOLEAN DEFAULT FALSE,
  intest_red               BOOLEAN DEFAULT FALSE,
  intest_dark              BOOLEAN DEFAULT FALSE,
  kidneys_abscess          BOOLEAN DEFAULT FALSE,
  kidneys_cyst             BOOLEAN DEFAULT FALSE,
  kidneys_calculi          BOOLEAN DEFAULT FALSE,
  bladder_intact           BOOLEAN DEFAULT FALSE,
  bladder_ruptured         BOOLEAN DEFAULT FALSE,
  bladder_calculi          BOOLEAN DEFAULT FALSE,
  muscle_bruising          BOOLEAN DEFAULT FALSE,
  muscle_abscess           BOOLEAN DEFAULT FALSE,
  legs_bruising            BOOLEAN DEFAULT FALSE,
  legs_abscess             BOOLEAN DEFAULT FALSE,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ
);

-- chemical_inventory (OG + V2 merged)
CREATE TABLE IF NOT EXISTS health.chemical_inventory (
  id                SERIAL PRIMARY KEY,
  chemical_drug_id  INTEGER REFERENCES health.drugs(id),
  purchase_date     DATE,
  purchase_quantity NUMERIC(10,2),
  units             TEXT,
  supplier          TEXT,
  batch_number      TEXT,
  expiry_date       DATE,
  disposal_comment  TEXT,
  stocktake_date    DATE,
  stocktake_qty     NUMERIC(10,2),
  disposal_date     DATE,
  disposal_qty      NUMERIC(10,2),
  invoice_amount    NUMERIC(12,4),
  invoice_paid      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- drug_purchases (OG web-app)
CREATE TABLE IF NOT EXISTS health.drug_purchases (
  id                 SERIAL PRIMARY KEY,
  drug_id            INTEGER REFERENCES health.drugs(id),
  quantity           NUMERIC(10,2),
  batch_number       TEXT,
  expiry_date        DATE,
  cost               NUMERIC(12,2),
  legacy_receival_id INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- drug_disposals (OG web-app)
CREATE TABLE IF NOT EXISTS health.drug_disposals (
  id                   SERIAL PRIMARY KEY,
  drug_id              INTEGER REFERENCES health.drugs(id),
  quantity             NUMERIC(10,2),
  disposal_date        DATE,
  disposal_reason      TEXT,
  disposal_method      TEXT,
  disposed_by          TEXT,
  notes                TEXT,
  legacy_disposal_id   INTEGER,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- drug_hgp_forms (V2: 15 clients)
CREATE TABLE IF NOT EXISTS health.drug_hgp_forms (
  id                    SERIAL PRIMARY KEY,
  drug_receival_id      INTEGER,
  hgp_decl_form_filename TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);

-- drug_inventory_events (V2 consolidated: stocktakes + transfers)
CREATE TABLE IF NOT EXISTS health.drug_inventory_events (
  id                SERIAL PRIMARY KEY,
  event_type        TEXT NOT NULL,
  event_id          INTEGER NOT NULL,
  event_date        TIMESTAMPTZ NOT NULL,
  transfer_location TEXT,
  done_by           TEXT,
  notes             TEXT,
  applied_to_inventory BOOLEAN,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- drug_inventory_line_items (V2 consolidated)
CREATE TABLE IF NOT EXISTS health.drug_inventory_line_items (
  id                    SERIAL PRIMARY KEY,
  record_type           TEXT NOT NULL,
  event_id              INTEGER NOT NULL,
  drug_id               INTEGER,
  units_per_box_or_bottle INTEGER,
  on_hand_theoretical   NUMERIC(10,2),
  quantity              NUMERIC(10,2),
  balance               NUMERIC(10,2),
  reorder_soh_units_trigger INTEGER,
  applied_to_soh        BOOLEAN,
  box_bottles_onhand    NUMERIC(10,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);

-- drugs_purchase_event (V2: 15 clients)
CREATE TABLE IF NOT EXISTS health.drugs_purchase_event (
  id               SERIAL PRIMARY KEY,
  drug_receival_id INTEGER NOT NULL,
  date_received    DATE NOT NULL,
  supplier_id      INTEGER,
  order_ref_number TEXT,
  received_by      TEXT,
  invoice_paid     BOOLEAN,
  notes            TEXT,
  applied_to_inventory BOOLEAN,
  hgp_form_done    BOOLEAN,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- drugs_purchased (V2: 15 clients)
CREATE TABLE IF NOT EXISTS health.drugs_purchased (
  id               SERIAL PRIMARY KEY,
  receival_id      INTEGER,
  drug_id          INTEGER,
  quantity_received NUMERIC(10,2),
  batch_number     TEXT,
  expiry_date      DATE,
  drug_cost        NUMERIC(12,4),
  applied_to_soh   BOOLEAN,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- sick_beast_temperatures (OG + V2 merged)
CREATE TABLE IF NOT EXISTS health.sick_beast_temperatures (
  id        SERIAL PRIMARY KEY,
  sb_rec_no INTEGER,
  temp_date TIMESTAMPTZ,
  temperature NUMERIC(5,2),
  cow_id    INTEGER,              -- web-app FK (→ cattle.cows)
  beast_id  INTEGER,              -- OG legacy
  weight    NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- sickness_result_codes (V2 consolidated: Standard + RV variants)
CREATE TABLE IF NOT EXISTS health.sickness_result_codes (
  id                   SERIAL PRIMARY KEY,
  variant              TEXT NOT NULL DEFAULT 'standard',  -- standard, rv
  sickness_result_code INTEGER NOT NULL,
  sickness_result      TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- sb_rec_no_booked (V2: 17 clients — sequence tracker)
CREATE TABLE IF NOT EXISTS health.sb_rec_no_booked (
  id               SERIAL PRIMARY KEY,
  sb_rec_no_booked INTEGER NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- mort_morb_triggers (OG + V2 merged)
CREATE TABLE IF NOT EXISTS health.mort_morb_triggers (
  id                     SERIAL PRIMARY KEY,
  table_name             TEXT NOT NULL,
  cof_from               INTEGER,
  cof_to                 INTEGER,
  pulls_actual           INTEGER,
  deaths_actual          INTEGER,
  level1_pulls_trigger   INTEGER,
  level1_deaths_trigger  INTEGER,
  level2_deaths_trigger  INTEGER,
  level3_deaths_trigger  INTEGER,
  include_in_report      BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ
);

-- resp_disease_retreats (V2: 15 clients)
CREATE TABLE IF NOT EXISTS health.resp_disease_retreats (
  id         SERIAL PRIMARY KEY,
  drug_count INTEGER NOT NULL,
  drugs      TEXT,
  head       INTEGER NOT NULL,
  deaths     INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- OG web-app tables
CREATE TABLE IF NOT EXISTS health.drug_stocktakes (
  id          SERIAL PRIMARY KEY,
  stocktake_id INTEGER NOT NULL,
  stock_date  DATE NOT NULL,
  done_by     TEXT,
  notes       TEXT,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.drug_stocktake_records (
  id                  SERIAL PRIMARY KEY,
  stocktake_id        INTEGER NOT NULL,
  drug_id             INTEGER NOT NULL,
  units_per_box_or_bottle INTEGER,
  on_hand_theoretical NUMERIC(10,2),
  counted             NUMERIC(10,2),
  difference          NUMERIC(10,2),
  reorder_soh_units_trigger INTEGER,
  applied_to_soh      TEXT,
  box_bottles_on_hand NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.drug_transfers (
  id               SERIAL PRIMARY KEY,
  transfer_id      INTEGER NOT NULL,
  transfer_date    DATE NOT NULL,
  transfer_location TEXT,
  done_by          TEXT,
  notes            TEXT,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.drug_transfer_records (
  id                  SERIAL PRIMARY KEY,
  transfer_id         INTEGER NOT NULL,
  drug_id             INTEGER NOT NULL,
  units_per_box_or_bottle INTEGER,
  on_hand_theoretical NUMERIC(10,2),
  transferred         NUMERIC(10,2),
  remaining           NUMERIC(10,2),
  reorder_soh_units_trigger INTEGER,
  applied_to_soh      TEXT,
  box_bottles_on_hand NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.drug_purchase_events (
  id               SERIAL PRIMARY KEY,
  drug_receival_id INTEGER NOT NULL UNIQUE,
  date_received    DATE NOT NULL,
  supplier_id      INTEGER,
  order_ref_number TEXT,
  received_by      TEXT,
  invoice_paid     BOOLEAN DEFAULT FALSE,
  notes            TEXT,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  hgp_form_done    BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- sick_beast_brd_symptoms (OG web-app — kept for separate BRD detail)
CREATE TABLE IF NOT EXISTS health.sick_beast_brd_symptoms (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id        INTEGER,           -- OG legacy
  runny_nose      BOOLEAN DEFAULT FALSE,
  runny_eyes      BOOLEAN DEFAULT FALSE,
  drool_slobber   BOOLEAN DEFAULT FALSE,
  coughing        BOOLEAN DEFAULT FALSE,
  increased_breathing_rate BOOLEAN DEFAULT FALSE,
  laboured_breathing BOOLEAN DEFAULT FALSE,
  reduced_gut_fill BOOLEAN DEFAULT FALSE,
  sb_rec_no       INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  FEED & RATIONS
-- ██  Bunks, rations, feed records, digistar integration
-- ████████████████████████████████████████████████████████████████

-- ration_types (V2: 17 clients — e.g. "starter", "finisher")
CREATE TABLE IF NOT EXISTS feed.ration_types (
  ration_type_id  SMALLINT PRIMARY KEY,
  ration_type_desc TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- rations (single unified ration master — merged from legacy CFR Ration_Descriptions + RationNames)
-- ration_code SMALLINT is the legacy CFR identifier, referenced by penfeedsdata/truck_loads/etc.
-- id SERIAL is the OG-style surrogate key, referenced by pen.pens / ration_versions / transition steps.
CREATE TABLE IF NOT EXISTS feed.rations (
  id                              SERIAL PRIMARY KEY,
  ration_code                     SMALLINT UNIQUE NOT NULL,
  ration_name                     TEXT NOT NULL,
  ration_type                     SMALLINT REFERENCES feed.ration_types(ration_type_id),
  category                        TEXT,
  -- Operational state
  active                          BOOLEAN NOT NULL DEFAULT TRUE,
  superceeded                     BOOLEAN DEFAULT FALSE,
  -- Nutritional / formulation
  dry_matter_pcnt                 NUMERIC(5,2),
  megajoules_per_kg_dm            NUMERIC(10,4),
  nep                             NUMERIC(10,4),
  prot_pcnt                       NUMERIC(5,2),
  fat_pcnt                        NUMERIC(5,2),
  fibre_pcnt                      NUMERIC(5,2),
  nem_kg                          REAL,
  mmef                            NUMERIC(4,2),
  -- Cost
  cost_per_tonne                  NUMERIC(12,2),
  valueperton                     NUMERIC(12,4),
  current_value_kg                NUMERIC(12,4),
  custom_feed_charge_ton          NUMERIC(12,4),
  custom_feed_markup_doll_per_ton NUMERIC(12,4),
  custom_pcnt_markup              REAL,
  micro_nutrient_cost_per_ton     NUMERIC(12,4),
  delivered_to_bunk_cost_per_ton  NUMERIC(12,4),
  interest_cost_per_ton           NUMERIC(12,4),
  minimum_ration_value_ton        NUMERIC(12,4),
  -- Mill / mixing
  mixing_time                     VARCHAR(6),
  ration_density                  REAL,
  ration_colour                   VARCHAR(15),
  stationary_mixer                BOOLEAN,
  liquids_premix_ration           BOOLEAN,
  pcnt_feedweight_tolerance       REAL,
  -- Misc
  notes                           VARCHAR(50),
  withhold_days                   INTEGER,
  zonename                        VARCHAR(3),
  titration_start_trough_weight   NUMERIC(10,2),
  -- Timestamps
  date_ration_created             DATE,
  date_last_modified              DATE,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ
);
COMMENT ON COLUMN feed.rations.mmef IS 'Multiple of Maintenance Energy Factor (e.g. 2.0–3.5×). AU industry convention; per-ration metadata.';
CREATE INDEX IF NOT EXISTS idx_rations_ration_code ON feed.rations(ration_code);

-- ration_recipe_records (V2: 17 clients — recipe ingredients)
CREATE TABLE IF NOT EXISTS feed.ration_recipe_records (
  id              SERIAL PRIMARY KEY,
  ration_code     SMALLINT REFERENCES feed.rations(ration_code),
  commodity_code  SMALLINT,
  pcnt_of_ration  NUMERIC(5,2),
  commodity_name  TEXT,
  kg_per_tonne    NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- ration_regimes (V2: 17 clients — pen ration schedules, consolidated Standard + GL)
CREATE TABLE IF NOT EXISTS feed.ration_regimes (
  id              SERIAL PRIMARY KEY,
  variant         TEXT NOT NULL DEFAULT 'standard',  -- standard, gl
  pen_id          INTEGER,
  ration_code     SMALLINT,
  date_started    DATE NOT NULL,
  date_finished   DATE,
  days            INTEGER,
  starter_pen     BOOLEAN DEFAULT FALSE,
  finished        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- ration_load_sizes (V2: 17 clients — truck load weights per ration)
CREATE TABLE IF NOT EXISTS feed.ration_load_sizes (
  ration_type_id  SMALLINT PRIMARY KEY REFERENCES feed.ration_types(ration_type_id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- ration_load_size_entries (V2 normalized child — replaces truck_size_1..10)
CREATE TABLE IF NOT EXISTS feed.ration_load_size_entries (
  id              SERIAL PRIMARY KEY,
  ration_type_id  SMALLINT NOT NULL REFERENCES feed.ration_load_sizes(ration_type_id) ON DELETE CASCADE,
  truck_number    INTEGER NOT NULL CHECK (truck_number BETWEEN 1 AND 10),
  weight          SMALLINT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  UNIQUE(ration_type_id, truck_number)
);

-- ration_calc_constants (V2: 17 clients)
CREATE TABLE IF NOT EXISTS feed.ration_calc_constants (
  id           SERIAL PRIMARY KEY,
  constant     TEXT NOT NULL,
  value        NUMERIC(10,4),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- dual_ration_feeding (V2: 14 clients — dual ration support)
CREATE TABLE IF NOT EXISTS feed.dual_ration_feeding (
  id                SERIAL PRIMARY KEY,
  pen_id            INTEGER,
  pen_name          TEXT,
  num_head          SMALLINT,
  ration1_code      SMALLINT,
  ration2_code      SMALLINT,
  ration1_pcnt      NUMERIC(5,2),
  ration2_pcnt      NUMERIC(5,2),
  total_kgs_day     NUMERIC(10,2),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- titration_ration_regimes (V2: 3 clients — auto titration)
CREATE TABLE IF NOT EXISTS feed.titration_ration_regimes (
  id                SERIAL PRIMARY KEY,
  pen_id            INTEGER,
  pen_name          TEXT,
  ration_code       SMALLINT,
  date_started      DATE,
  days              INTEGER,
  trough_weight     NUMERIC(10,2),
  pcnt_of_bw        NUMERIC(5,2),
  rate_per_day      NUMERIC(10,2),
  aim_period       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- bunk_code_desc (V2: 17 clients — bunk score descriptions)
CREATE TABLE IF NOT EXISTS feed.bunk_code_desc (
  id          SERIAL PRIMARY KEY,
  code        SMALLINT NOT NULL,
  description TEXT,
  ration_type SMALLINT REFERENCES feed.ration_types(ration_type_id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- bunk_readings (V2: 17 clients — daily bunk score observations)
-- origin: 'cfr' = row mirrored from CFR by cfr-sync OR bulk-loaded by this
-- migration tool (both are CFR-sourced and may be refreshed by the live sync);
-- NULL = entered in LSJ-HUB after go-live (never touched by the sync). Migrated
-- rows are tagged 'cfr' via the Bunk_Readings mapping's staticColumns so the
-- LSJ-HUB cfr-sync owns them rather than the initFarmDb backfill heuristic
-- having to guess from which hub-only fields happen to be populated.
CREATE TABLE IF NOT EXISTS feed.bunk_readings (
  id                 SERIAL PRIMARY KEY,
  pen_number_id      INTEGER,
  observation_date   DATE NOT NULL,
  ration_code        SMALLINT,
  bunk_code          SMALLINT,
  employee_initials  TEXT,
  time_checked       TEXT,
  trough_weight      NUMERIC(10,2),
  pen_name           TEXT,
  origin             TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feed.bunk_call_settings (
  id                       SERIAL PRIMARY KEY,
  threshold_under_kg       NUMERIC(8,2),
  threshold_slick_kg       NUMERIC(8,2),
  threshold_dry_kg         NUMERIC(8,2),
  head_count_source        TEXT,
  variation_tolerance_pct  NUMERIC(6,2),
  default_session          TEXT,
  rounding_kg              NUMERIC(8,2),
  default_mmef             NUMERIC(8,4),
  use_bunk_scoring         BOOLEAN,
  show_window_7d           BOOLEAN,
  show_window_14d          BOOLEAN,
  show_window_30d          BOOLEAN,
  threshold_unit           TEXT,
  show_row_tabs            BOOLEAN,
  updated_at               TIMESTAMPTZ,
  updated_by               INTEGER
);
INSERT INTO feed.bunk_call_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- feeding_details (V2: 17 clients — load-level detail, consolidated from 5 feeding program tables)
CREATE TABLE IF NOT EXISTS feed.feeding_details (
  id              SERIAL PRIMARY KEY,
  variant         TEXT NOT NULL DEFAULT 'standard',  -- GE150, L150, Plateau, ShortFeed, WAGYU
  feed_date       DATE NOT NULL,
  pen_name        TEXT,
  pen_number_id   INTEGER,
  ration_code     SMALLINT,
  load_number     SMALLINT,
  truck_id        TEXT,
  planned_kg      NUMERIC(10,2),
  actual_kg       NUMERIC(10,2),
  driver_initials TEXT,
  load_weight     NUMERIC(10,2),
  feed_weight     NUMERIC(10,2),
  start_load_weight NUMERIC(10,2),
  gross_load_weight NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- feeding_regimens (V2: 17 clients — high-level feeding plan, consolidated from 5 feeding program tables)
CREATE TABLE IF NOT EXISTS feed.feeding_regimens (
  id            SERIAL PRIMARY KEY,
  variant       TEXT NOT NULL DEFAULT 'standard',  -- GE150, L150, Plateau, ShortFeed, WAGYU
  pen_number_id INTEGER,
  ration_code   SMALLINT,
  date_from     DATE,
  date_to       DATE,
  kgs_per_head  NUMERIC(10,2),
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- feeding_time_data (V2: 17 clients — feeding time records)
CREATE TABLE IF NOT EXISTS feed.feeding_time_data (
  id                    SERIAL PRIMARY KEY,
  feed_date             DATE NOT NULL,
  ration_type           SMALLINT,
  load_number           SMALLINT,
  time_start            TIMESTAMPTZ,
  time_end              TIMESTAMPTZ,
  truck_weight          NUMERIC(10,2),
  truck_id              TEXT,
  bunk_time             TEXT,
  driver_initials       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);

-- feeding_time_taken_by_ration_type (V2: 12 clients)
CREATE TABLE IF NOT EXISTS feed.feeding_time_taken_by_ration_type (
  id                    SERIAL PRIMARY KEY,
  feed_date             DATE NOT NULL,
  ration_type           SMALLINT,
  time_first_load_start TIMESTAMPTZ,
  time_last_load_end    TIMESTAMPTZ,
  duration_minutes      NUMERIC(10,2),
  driver_initials       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);

-- feedlot_staff (OG + V2 merged → moved to feed schema for V2 FK compat)
-- Holds per-farm staff records inc. legacy Cattle.NET login + permission flags.
-- Aggregated into the platform-wide system DB `system.users` via the
-- `system.farm_user_links` table (see schema-system-v5.sql).
CREATE TABLE IF NOT EXISTS feed.feedlot_staff (
  user_id                    INTEGER PRIMARY KEY,   -- legacy Feedlot_Staff.User_ID (stable across migrations)
  -- Modern web-app fields
  real_name                  TEXT,
  initials                   TEXT,
  active                     BOOLEAN DEFAULT TRUE,
  -- Legacy Cattle.NET identity (preserved verbatim for migration)
  surname                    TEXT,
  firstname                  TEXT,
  job_desc                   TEXT,
  start_date                 DATE,
  finish_date                DATE,
  password_hash              TEXT,                  -- legacy Pass_word (plaintext on source — rehash on first login)
  password_last_changed_date DATE,
  -- Legacy per-module permission flags (Y/N → boolean)
  cattle_data_entry          BOOLEAN,
  cattle_reports             BOOLEAN,
  cattle_utilities           BOOLEAN,
  cattle_lookup_tables       BOOLEAN,
  cattle_deletes             BOOLEAN,
  feed_system_data_entry     BOOLEAN,
  feed_system_reports        BOOLEAN,
  feed_system_utilities      BOOLEAN,
  pl_reports_allowed         BOOLEAN,
  pen_rider                  BOOLEAN DEFAULT FALSE,
  -- Audit
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_feedlot_staff_active ON feed.feedlot_staff(active);
CREATE INDEX IF NOT EXISTS idx_feedlot_staff_surname ON feed.feedlot_staff(surname);

-- penfeedsdata (V2: 17 clients — PARTITIONED by feed_date — core feed records)
CREATE TABLE IF NOT EXISTS feed.penfeedsdata (
  id                      SERIAL NOT NULL,
  pen_number_id           INTEGER,
  pen_number              TEXT,
  ration_code             SMALLINT,
  feed_date               DATE NOT NULL,
  head_fed                SMALLINT,
  kgs_fed                 NUMERIC(10,2),
  feed_value              NUMERIC(12,4),
  feed_value_per_hd       NUMERIC(12,4),
  applied_to_cattle       BOOLEAN DEFAULT FALSE,
  dry_matter              NUMERIC(10,2),
  adj_kgs                 NUMERIC(10,2),
  adj_value               NUMERIC(12,4),
  adj_dry_matter          NUMERIC(10,2),
  cost_per_tonne          NUMERIC(12,4),
  legacy_modified_at      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ,
  PRIMARY KEY (id, feed_date)
) PARTITION BY RANGE (feed_date);

-- feeddb_pens_file (V2: 14 clients — feed system pen mirror)
CREATE TABLE IF NOT EXISTS feed.feeddb_pens_file (
  id             SERIAL PRIMARY KEY,
  pen_number_id  INTEGER NOT NULL,
  pen_name       TEXT NOT NULL,
  mob_name       TEXT,
  numb_head      SMALLINT,
  ration_name    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- pen_feeding_order_params (V2: 15 clients)
CREATE TABLE IF NOT EXISTS feed.pen_feeding_order_params (
  ration_type  SMALLINT PRIMARY KEY REFERENCES feed.ration_types(ration_type_id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- pen_feeding_order_data (V2 normalized child)
CREATE TABLE IF NOT EXISTS feed.pen_feeding_order_data (
  id               SERIAL PRIMARY KEY,
  param_ration_type SMALLINT NOT NULL REFERENCES feed.pen_feeding_order_params(ration_type) ON DELETE CASCADE,
  slot             INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 59),
  value            REAL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,
  UNIQUE(param_ration_type, slot)
);

-- pen_and_bunk_cleaning (V2: 17 clients)
CREATE TABLE IF NOT EXISTS feed.pen_and_bunk_cleaning (
  id          SERIAL PRIMARY KEY,
  event_date  DATE NOT NULL,
  pen_id      INTEGER,
  pen_name    TEXT,
  clean_type  TEXT,
  done_by     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- paddock_feeding (V2 + OG merged)
CREATE TABLE IF NOT EXISTS feed.paddock_feeding (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id        INTEGER,           -- OG legacy
  paddock_feed_type TEXT,
  from_date       DATE,
  to_date         DATE,
  commodity_id    SMALLINT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- nsa_bunk_data (V2: 2 clients — NSA-specific bunk data)
CREATE TABLE IF NOT EXISTS feed.nsa_bunk_data (
  id      SERIAL PRIMARY KEY,
  pen_id  INTEGER,
  bunk_date DATE,
  bunk_code SMALLINT,
  notes   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- feed_month_end_date (V2: 17 clients — period boundary)
CREATE TABLE IF NOT EXISTS feed.feed_month_end_date (
  id              SERIAL PRIMARY KEY,
  end_date        DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- instrument_calibration_tests (OG + V2 merged)
CREATE TABLE IF NOT EXISTS feed.instrument_calibration_tests (
  id                SERIAL PRIMARY KEY,
  calibration_date  DATE NOT NULL,
  instrument_type   TEXT,
  test_weight       NUMERIC(10,2),
  actual_weight     NUMERIC(10,2),
  variance          NUMERIC(10,2),
  pass              BOOLEAN,
  tester_name       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- instruments_needing_calibration (OG + V2 merged)
CREATE TABLE IF NOT EXISTS feed.instruments_needing_calibration (
  id                      SERIAL PRIMARY KEY,
  instrument_type         TEXT NOT NULL,
  last_calibration_date   DATE,
  next_calibration_due    DATE,
  calibration_frequency_days INTEGER,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- vendor_declarations (OG + V2 merged)
CREATE TABLE IF NOT EXISTS feed.vendor_declarations (
  id                       SERIAL PRIMARY KEY,
  vendor_dec_number        TEXT,              -- OG name
  vndr_decl_no             TEXT,              -- V2 name
  owner_contact_id         INTEGER,
  owner_name               TEXT,
  property_of_origin       TEXT,
  pic_number               TEXT,
  date_signed              DATE,
  nlis_status              TEXT,
  cattletypeid             INTEGER,
  -- OG form fields
  form_date                DATE,
  number_cattle            SMALLINT,
  cattle_description       TEXT,
  tail_tag                 TEXT,
  rfids_in_cattle          BOOLEAN,
  hgp_treated              BOOLEAN,
  qa_program               BOOLEAN,
  qa_details               TEXT,
  ownership_period         TEXT,
  fed_stockfeeds           BOOLEAN,
  chem_restriction         BOOLEAN,
  withholding_drugs        BOOLEAN,
  withholding_feed         BOOLEAN,
  additional_info          TEXT,
  owner_pic                TEXT,
  property_address         TEXT,
  property_town            TEXT,
  property_state           TEXT,
  consigned_to             TEXT,
  dest_address             TEXT,
  dest_town                TEXT,
  dest_state               TEXT,
  dest_pic                 TEXT,
  movement_date            DATE,
  nlis_ear_tags            INTEGER,
  nlis_rumen_devices       INTEGER,
  q1_hgp                   TEXT,
  q2_animal_fats           TEXT,
  q3_ownership             TEXT,
  q3_ownership_period      TEXT,
  q4_stockfeeds            TEXT,
  q5_erp_restriction       TEXT,
  q6_withholding_drugs     TEXT,
  q7_withholding_feed      TEXT,
  q8_spray_risk            TEXT,
  vendor_full_name         TEXT,
  vendor_address           TEXT,
  vendor_date_signed       DATE,
  vendor_signature_status  TEXT,
  transport_movement_date  DATE,
  transport_time           TEXT,
  transport_vehicle_reg    TEXT,
  transport_name           TEXT,
  transport_date_signed    DATE,
  transport_signature_status TEXT,
  cattle_rows              JSONB,             -- OG
  status                   TEXT DEFAULT 'draft', -- OG
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ
);

-- OG web-app tables
CREATE TABLE IF NOT EXISTS feed.pending_feed_data (
  id            SERIAL PRIMARY KEY,
  feed_date     DATE,
  pen_name      TEXT,
  head          INTEGER,
  ration_name   TEXT,
  feed_weight   NUMERIC(10,2),
  pen_feeds_rec_id INTEGER,
  apply_to_group TEXT,
  head_selected INTEGER,
  applied       BOOLEAN DEFAULT FALSE,
  never_apply   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed.cattle_feed_updates (
  id            SERIAL PRIMARY KEY,
  cow_id        INTEGER,              -- web-app FK (→ cattle.cows)
  beast_id      INTEGER,              -- OG legacy
  pen_feeds_data_id INTEGER NOT NULL,
  feed_date     DATE NOT NULL,
  feed_value    NUMERIC(12,4),
  dry_matter    NUMERIC(10,2),
  kgs_fed_calc  NUMERIC(10,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  PEN MANAGEMENT
-- ██  Pens, pen history, pen riders, lane orders
-- ████████████████████████████████████████████████████████████████

-- pens (UNIFIED — merges V2 pens_file + OG pens into single master pen table)
-- Migration assigns id = legacy Pen_Number_ID so all migrated child FKs (cows.pen_id,
-- ration_regimes.pen_id, bunk_readings.pen_number_id, etc.) remain valid.
-- After migration: SELECT setval('pen.pens_id_seq', COALESCE(MAX(id),0)) FROM pen.pens;
CREATE TABLE IF NOT EXISTS pen.pens (
  id                            SERIAL PRIMARY KEY,
  name                          TEXT NOT NULL UNIQUE,
  -- Type / classification
  pen_type                      TEXT,
  is_paddock                    BOOLEAN DEFAULT FALSE,
  is_hospital                   BOOLEAN DEFAULT FALSE,
  buller_pen                    BOOLEAN DEFAULT FALSE,
  receiving_pen                 BOOLEAN DEFAULT FALSE,
  -- Capacity & physical
  capacity                      INTEGER,
  area_sqm                      NUMERIC(10,2),
  bunk_length                   NUMERIC(10,2),
  bunk_volume                   NUMERIC(10,2),
  -- Current state
  mob_name                      TEXT,
  current_head                  INTEGER DEFAULT 0,
  -- Ration
  ration_id                     INTEGER,           -- FK → feed.rations(id)
  current_ration_code           SMALLINT,          -- V2 legacy ration code
  ration_code_pm                SMALLINT,          -- V2 PM ration
  kgs_head                      NUMERIC(10,2),
  feeding_system                SMALLINT,
  inc_in_plateau_feed           BOOLEAN DEFAULT FALSE,
  exclude_from_feed_generation  BOOLEAN DEFAULT FALSE,
  expected_wg_day               NUMERIC(10,2),
  -- Cleaning / titration
  date_last_cleaned             DATE,
  titration_regime              TEXT,
  titration_regime_start_date   DATE,
  date_entered_feedlot          DATE,
  -- Display / list config
  active                        BOOLEAN DEFAULT TRUE,
  include_in_list               BOOLEAN DEFAULT TRUE,
  exit_pen                      TEXT,
  excel_cell                    TEXT,
  notes                         TEXT,
  -- Audit / legacy
  legacy_modified_at            TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pens_name ON pen.pens(name);
CREATE INDEX IF NOT EXISTS idx_pens_ration ON pen.pens(ration_id);

-- bunk_route — per-session pen visiting order
CREATE TABLE IF NOT EXISTS pen.bunk_route (
    session_type TEXT    NOT NULL CHECK (session_type IN ('AM','Midday','PM')),
    pen_id       INTEGER NOT NULL REFERENCES pen.pens(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by   TEXT    NULL,
    PRIMARY KEY (session_type, pen_id)
);
CREATE INDEX IF NOT EXISTS idx_bunk_route_session_pos
    ON pen.bunk_route (session_type, position);

-- pen_ration_history — audit log of ration assignments per pen
CREATE TABLE IF NOT EXISTS pen.pen_ration_history (
    id             SERIAL PRIMARY KEY,
    pen_id         INTEGER NOT NULL REFERENCES pen.pens(id) ON DELETE CASCADE,
    ration_id      INTEGER REFERENCES feed.rations(id) ON DELETE SET NULL,
    effective_from DATE NOT NULL,
    effective_to   DATE,
    changed_by     TEXT,
    changed_at     TIMESTAMPTZ DEFAULT NOW(),
    source         TEXT
);
CREATE INDEX IF NOT EXISTS idx_pen_ration_history_pen
    ON pen.pen_ration_history (pen_id, effective_from);

-- penshistory (V2: 17 clients — pen movement history)
CREATE TABLE IF NOT EXISTS pen.penshistory (
  id           SERIAL PRIMARY KEY,
  cow_id       INTEGER,            -- web-app FK (→ cattle.cows)
  beast_id     INTEGER,            -- OG legacy
  pen_name     TEXT,
  pen_number_id INTEGER,
  movedate     DATE NOT NULL,
  reason       TEXT,
  user_initials TEXT,
  legacy_modified_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_penshistory_beast ON pen.penshistory(beast_id);
CREATE INDEX IF NOT EXISTS idx_penshistory_date ON pen.penshistory(movedate);

-- pen_movements (OG web-app — pen movement log used by routes/services)
CREATE TABLE IF NOT EXISTS pen.pen_movements (
  id        SERIAL PRIMARY KEY,
  cow_id    INTEGER,    -- FK deferred (→ cattle.cows)
  pen_id    INTEGER,    -- FK deferred (→ pen.pens)
  moved_at  TIMESTAMPTZ DEFAULT NOW(),
  legacy_modified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pen_move_cow ON pen.pen_movements(cow_id);
CREATE INDEX IF NOT EXISTS idx_pen_movements_pen ON pen.pen_movements(pen_id);

-- pensfed (V2: 17 clients — daily pen feed summary)
CREATE TABLE IF NOT EXISTS pen.pensfed (
  id                SERIAL PRIMARY KEY,
  feeddate          DATE NOT NULL,
  pen_number        TEXT,
  ration_name       TEXT,
  kilos_fed         NUMERIC(10,2),
  feed_value        NUMERIC(12,2),
  applied_to_cattle TEXT,
  dry_matter        NUMERIC(10,2),
  legacy_modified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pensfed_date ON pen.pensfed(feeddate);

-- penlaneorder (V2: 17 clients — feed lane sequence, consolidated Standard + GL)
CREATE TABLE IF NOT EXISTS pen.penlaneorder (
  id             SERIAL PRIMARY KEY,
  variant        TEXT NOT NULL DEFAULT 'standard',  -- standard, gl
  pen_number_id  INTEGER REFERENCES pen.pens(id),
  lane_order     INTEGER,
  ration_type    SMALLINT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- penriders_log (V2: 17 clients — daily pen checks)
CREATE TABLE IF NOT EXISTS pen.penriders_log (
  id               SERIAL PRIMARY KEY,
  employee_id      INTEGER,
  initials         TEXT,
  date_pen_checked DATE NOT NULL,
  pen_name         TEXT,
  head_in_pen      INTEGER,
  diagnoser        BOOLEAN DEFAULT FALSE,
  dof              INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- pen_rider_tolerances (V2: 17 clients — variance thresholds)
CREATE TABLE IF NOT EXISTS pen.pen_rider_tolerances (
  id                  SERIAL PRIMARY KEY,
  brd_deaths_pcnt     NUMERIC(5,2),
  brd_pulls_pcnt      NUMERIC(5,2),
  monthly_mort_pcnt   NUMERIC(5,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- pen_cleaning_dates (V2: 11 clients)
CREATE TABLE IF NOT EXISTS pen.pen_cleaning_dates (
  id           SERIAL PRIMARY KEY,
  pen_id       INTEGER REFERENCES pen.pens(id),
  clean_date   DATE NOT NULL,
  clean_type   TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- pen_print_order (V2: 15 clients)
CREATE TABLE IF NOT EXISTS pen.pen_print_order (
  id            SERIAL PRIMARY KEY,
  pen_number_id INTEGER REFERENCES pen.pens(id),
  print_order   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- log_pens_file (V2: 17 clients — pen change audit)
CREATE TABLE IF NOT EXISTS pen.log_pens_file (
  id              SERIAL PRIMARY KEY,
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  action          TEXT,
  pen_number_id   INTEGER,
  old_values      JSONB,
  new_values      JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  FINANCE & COSTS
-- ██  Cost codes, costs, feed costs, invoicing, payments
-- ████████████████████████████████████████████████████████████████

-- cost_codes (V2 + OG merged)
CREATE TABLE IF NOT EXISTS finance.cost_codes (
  id              SERIAL PRIMARY KEY,          -- OG PK
  revexp_code     SMALLINT UNIQUE,             -- V2 PK (kept for ETL)
  code            TEXT UNIQUE,                 -- OG: short code label
  description     TEXT,                        -- OG: human description
  type            TEXT CHECK(type IN ('revenue','expense')),  -- OG
  revexp_desc     TEXT,                        -- V2 legacy name
  cost_type       TEXT,                        -- V2 legacy type
  revexp_unit     NUMERIC(12,4),               -- V2 unit cost
  include_in_landed_cost BOOLEAN DEFAULT FALSE, -- OG
  include_in_pl_expenses BOOLEAN DEFAULT FALSE, -- OG
  include_on_cf_invoice  BOOLEAN DEFAULT FALSE, -- OG
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- costs (V2 + OG merged — per-beast cost transactions)
CREATE TABLE IF NOT EXISTS finance.costs (
  id            SERIAL PRIMARY KEY,
  cow_id        INTEGER,           -- OG FK (→ cattle.cows)
  beast_id      INTEGER,           -- V2 FK
  cost_code_id  INTEGER,           -- OG FK (→ finance.cost_codes.id)
  cost_code     TEXT,              -- V2 code reference
  revexp_code   SMALLINT,          -- V2 FK (→ finance.cost_codes.revexp_code)
  amount        NUMERIC(12,2),     -- OG name
  unit_cost     NUMERIC(12,2),     -- OG
  total         NUMERIC(12,4),     -- V2 name
  units         NUMERIC(12,4),
  price_per_unit NUMERIC(12,4),    -- V2
  description   TEXT,              -- OG name
  notes         TEXT,              -- V2 name
  trans_date    DATE,
  ration        TEXT,              -- OG
  ear_tag       TEXT,
  applied       BOOLEAN DEFAULT FALSE,
  purch_lot_no  TEXT,
  legacy_modified_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_costs_cow ON finance.costs(cow_id);
CREATE INDEX IF NOT EXISTS idx_costs_beast ON finance.costs(beast_id);
CREATE INDEX IF NOT EXISTS idx_costs_date ON finance.costs(trans_date);
CREATE INDEX IF NOT EXISTS idx_costs_code ON finance.costs(revexp_code);
CREATE INDEX IF NOT EXISTS idx_costs_cost_code ON finance.costs(cost_code_id);

-- costs_feed_detail (V2: 17 clients — PARTITIONED by date_fed)
CREATE TABLE IF NOT EXISTS finance.costs_feed_detail (
  id               SERIAL NOT NULL,
  cow_id           INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id         INTEGER,           -- OG legacy
  revexp_code      SMALLINT,
  date_fed         DATE NOT NULL,
  head_in_pen      SMALLINT,
  kgs_fed          NUMERIC(10,2),
  feed_cost        NUMERIC(12,4),
  dry_matter       NUMERIC(10,2),
  pen_number       TEXT,
  ration_code      SMALLINT,
  purch_lot_no     TEXT,
  ear_tag          TEXT,
  legacy_modified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,
  PRIMARY KEY (id, date_fed)
) PARTITION BY RANGE (date_fed);

-- custfeed_invoices_list (V2: 17 clients — custom feeding invoices)
CREATE TABLE IF NOT EXISTS finance.custfeed_invoices_list (
  id            SERIAL PRIMARY KEY,
  purch_lot_no  TEXT,
  period_from   TIMESTAMPTZ,
  period_to     TIMESTAMPTZ,
  cattle_owner  TEXT,
  invoice_number TEXT,
  total_charges NUMERIC(12,2),
  gst_rate      NUMERIC(5,2),
  billing_company TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- custfeed_lot_summary (V2: 17 clients — lot period summaries)
CREATE TABLE IF NOT EXISTS finance.custfeed_lot_summary (
  id                      SERIAL PRIMARY KEY,
  purch_lot_no            TEXT NOT NULL,
  date_started            DATE,
  cattle_class            TEXT,
  avg_in_wght             NUMERIC(10,2),
  tag_range               TEXT,
  head_in                 INTEGER,
  deads                   INTEGER,
  shipped                 INTEGER,
  current_hospital        INTEGER,
  current_bullers         INTEGER,
  current_non_performers  INTEGER,
  current_head            INTEGER,
  calender_days_on_feed_period INTEGER,
  calender_days_on_feed_to_date INTEGER,
  avg_days_in_feed_period INTEGER,
  avg_days_to_date        INTEGER,
  avg_feed_cost_per_hd_per_day_period  NUMERIC(12,2),
  avg_feed_cost_per_hd_per_day_to_date NUMERIC(12,2),
  feed_charges_period     NUMERIC(12,2),
  feed_charges_to_date    NUMERIC(12,2),
  head_days_period        INTEGER,
  head_days_to_date       INTEGER,
  kgs_feed_period         NUMERIC(10,2),
  kgs_feed_to_date        NUMERIC(10,2),
  induction_costs_period  NUMERIC(12,2),
  induction_costs_to_date NUMERIC(12,2),
  other_costs_period      NUMERIC(12,2),
  other_costs_to_date     NUMERIC(12,2),
  cattle_owner            TEXT,
  agist_rate_per_day      NUMERIC(12,2),
  head_arrived_in_period  NUMERIC(10,2),
  head_shipped_in_period  INTEGER,
  head_at_period_start    INTEGER,
  died_in_period          INTEGER,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ
);

-- monthly_fl_intake_cost (V2: 15 clients)
CREATE TABLE IF NOT EXISTS finance.monthly_fl_intake_cost (
  id         SERIAL PRIMARY KEY,
  month_year TEXT,
  avg_cost   NUMERIC(12,4),
  head_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- packagecosts (V2: 6 clients — bundled cost packages)
CREATE TABLE IF NOT EXISTS finance.packagecosts (
  id            SERIAL PRIMARY KEY,
  package_name  TEXT,
  cost_per_head NUMERIC(12,4),
  cost_items    JSONB,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- price_adjustment_by_weight_range (V2: 17 clients)
CREATE TABLE IF NOT EXISTS finance.price_adjustment_by_weight_range (
  id           SERIAL PRIMARY KEY,
  lot_number   TEXT,
  from_weight  NUMERIC(10,2),
  to_weight    NUMERIC(10,2),
  price_adj    NUMERIC(12,4),
  adj_type     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- tax_invoice_bank_details (V2: 17 clients)
CREATE TABLE IF NOT EXISTS finance.tax_invoice_bank_details (
  id           SERIAL PRIMARY KEY,
  bank_name    TEXT,
  bsb          TEXT,
  acct_number  TEXT,
  acct_name    TEXT,
  abn          TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

-- rcti_payment_grid (V2: 15 clients)
CREATE TABLE IF NOT EXISTS finance.rcti_payment_grid (
  id                SERIAL PRIMARY KEY,
  vendor_id         INTEGER,
  purch_lot_no      TEXT,
  payment_type      TEXT,
  amount            NUMERIC(12,4),
  grid_data         JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- rv_rcti_data (V2: 10 clients — RCTI data records)
CREATE TABLE IF NOT EXISTS finance.rv_rcti_data (
  id               SERIAL PRIMARY KEY,
  rcti_number      TEXT,
  vendor_id        INTEGER,
  purch_lot_no     TEXT,
  payment_date     DATE,
  total_amount     NUMERIC(12,4),
  gst_amount       NUMERIC(12,4),
  status           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- tr_payment_rates (V2: 11 clients — transport payment rates)
CREATE TABLE IF NOT EXISTS finance.tr_payment_rates (
  id              SERIAL PRIMARY KEY,
  rate_desc       TEXT,
  rate_per_unit   NUMERIC(12,4),
  unit_type       TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- tr_payment_breed_adjust (V2: 3 clients)
CREATE TABLE IF NOT EXISTS finance.tr_payment_breed_adjust (
  id             SERIAL PRIMARY KEY,
  breed_code     TEXT,
  adjustment     NUMERIC(12,4),
  adj_type       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- tandr_buying_details (V2: 15 clients — T&R buying details)
CREATE TABLE IF NOT EXISTS finance.tandr_buying_details (
  id               SERIAL PRIMARY KEY,
  cow_id           INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id         INTEGER,           -- OG legacy
  agent_id         INTEGER,
  buyer_id         INTEGER,
  supplier_id      INTEGER,
  buying_price     NUMERIC(12,4),
  weight_bought    NUMERIC(10,2),
  purchase_date    DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- beast_accumed_feed_by_commodity (V2: 17 clients)
CREATE TABLE IF NOT EXISTS finance.beast_accumed_feed_by_commodity (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id        INTEGER,           -- OG legacy
  commodity_code  SMALLINT,
  total_kgs       NUMERIC(12,4),
  total_value     NUMERIC(12,4),
  total_dry_matter NUMERIC(12,4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);


-- ████████████████████████████████████████████████████████████████
-- ██  CARCASE & SLAUGHTER
-- ██  Carcase data, grading, feedback, pricing
-- ████████████████████████████████████████████████████████████████

-- carcase_data (V2: 17 clients — primary carcase table)
CREATE TABLE IF NOT EXISTS carcase.carcase_data (
  id                    SERIAL PRIMARY KEY,
  cow_id                INTEGER,           -- OG FK (→ cattle.cows)
  beast_id              INTEGER,           -- V2 FK
  legacy_beast_id       INTEGER,           -- OG
  ear_tag               TEXT,              -- OG name
  ear_tag_no            TEXT,              -- V2 name
  eid                   TEXT,
  lot_number            TEXT,
  body_number           TEXT,
  kill_date             DATE,
  kill_floor            TEXT,
  -- OG sale/abattoir (text-based)
  sold_to               TEXT,              -- OG
  abattoir              TEXT,              -- OG
  contract_no           TEXT,              -- OG
  grade                 TEXT,              -- OG
  grade_id              INTEGER,           -- OG FK (→ carcase_grades)
  -- V2 sale/abattoir (FK-based)
  sold_to_contact_id    INTEGER,
  abattoir_id           INTEGER,
  -- OG weight columns (split left/right)
  carc_weight_left      NUMERIC(10,2),     -- OG
  carc_weight_right     NUMERIC(10,2),     -- OG
  dress_pct             NUMERIC(5,2),      -- OG name
  price_per_kg_left     NUMERIC(12,4),     -- OG
  price_per_kg_right    NUMERIC(12,4),     -- OG
  deduction_per_kg      NUMERIC(12,4),     -- OG
  teeth                 SMALLINT,          -- OG name
  muscle_score          TEXT,              -- OG
  muscle_colour         TEXT,              -- OG name
  ph_level              NUMERIC(5,2),      -- OG name
  -- V2 columns (composite)
  hscw                  NUMERIC(10,2),
  dress_pcnt            NUMERIC(5,2),      -- V2 name
  rib_fat               NUMERIC(5,2),
  p8_fat                NUMERIC(5,2),
  eye_muscle_area       NUMERIC(10,2),
  marbling              NUMERIC(5,2),
  meat_colour           NUMERIC(5,2),      -- V2 name
  fat_colour            NUMERIC(5,2),
  ossification          INTEGER,
  msa_grade             TEXT,
  aus_meat_grade        TEXT,
  meat_texture          NUMERIC(5,2),
  butt_shape            SMALLINT,
  carc_teeth            SMALLINT,          -- V2 name
  bruising              TEXT,
  ph                    NUMERIC(5,2),      -- V2 name
  loin_temp             NUMERIC(5,2),
  carc_weight           NUMERIC(10,2),
  sale_weight           NUMERIC(10,2),
  live_weight_shrink_pcnt NUMERIC(5,2),
  live_weight_shrink_pct NUMERIC(5,2),       -- OG name
  price_per_kg          NUMERIC(12,4),
  total_value           NUMERIC(12,4),
  carc_msa_index        NUMERIC(10,2),
  hump_height           NUMERIC(5,2),
  tropical_breed_content NUMERIC(5,2),
  hormonal_growth_promotant TEXT,
  category              TEXT,
  chiller_assessment    TEXT,
  feedback_data         JSONB,
  notes                 TEXT,              -- OG
  -- Additional OG columns
  meat_yield             NUMERIC(5,2),
  bruising_l             TEXT,
  bruising_r             TEXT,
  dockage_reason         TEXT,
  msa_index              NUMERIC(10,2),
  hump_cold              SMALLINT,
  boning_group           TEXT,
  beast_sale_type        SMALLINT,
  boning_date            DATE,
  marbling_category      TEXT,
  marbling2              NUMERIC(5,2),
  firmness               TEXT,
  pricing_method         TEXT,
  chiller_number         TEXT,
  abattoir_contact_id    INTEGER,
  carc_damage_l          TEXT,
  carc_damage_r          TEXT,
  marbling_bonus_rate    NUMERIC(12,4),
  rc_invoice_date        DATE,
  marbling_bonus_value   NUMERIC(12,2),
  meq_msa                NUMERIC(10,2),
  meq_aus_mrb            NUMERIC(10,2),
  abattoir_est_no        TEXT,
  legacy_modified_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_carcase_cow ON carcase.carcase_data(cow_id);
CREATE INDEX IF NOT EXISTS idx_carcase_beast ON carcase.carcase_data(beast_id);
CREATE INDEX IF NOT EXISTS idx_carcase_kill_date ON carcase.carcase_data(kill_date);
CREATE INDEX IF NOT EXISTS idx_carcase_ear_tag ON carcase.carcase_data(ear_tag);
CREATE INDEX IF NOT EXISTS idx_carcase_eid ON carcase.carcase_data(eid);

-- carcase_datatype2 (V2: 10 clients — secondary/extended grading)
CREATE TABLE IF NOT EXISTS carcase.carcase_datatype2 (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id        INTEGER,           -- OG legacy
  ear_tag_no      TEXT,
  eid             TEXT,
  body_number     TEXT,
  kill_date       DATE,
  extra_data      JSONB,
  legacy_modified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- carcase_grades (V2: 17 clients — AUS-MEAT grade definitions)
CREATE TABLE IF NOT EXISTS carcase.carcase_grades (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price_per_kg  NUMERIC(12,4),
  -- V2 columns
  grade_code    TEXT UNIQUE,
  grade_desc    TEXT,
  min_weight    NUMERIC(10,2),
  max_weight    NUMERIC(10,2),
  min_fat       NUMERIC(5,2),
  max_fat       NUMERIC(5,2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- carcase_grades_us (V2: 6 clients — USDA grading system)
CREATE TABLE IF NOT EXISTS carcase.carcase_grades_us (
  id          SERIAL PRIMARY KEY,
  grade_code  TEXT NOT NULL UNIQUE,
  grade_desc  TEXT,
  min_marbling NUMERIC(5,2),
  max_marbling NUMERIC(5,2),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- carcase_prices (V2: 17 clients — pricing grids)
CREATE TABLE IF NOT EXISTS carcase.carcase_prices (
  id              SERIAL PRIMARY KEY,
  price_grid_name TEXT,
  grade_code      TEXT,
  price_per_kg    NUMERIC(12,4),
  effective_date  DATE,
  min_weight      NUMERIC(10,2),
  max_weight      NUMERIC(10,2),
  buyer_id        INTEGER,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- carc_feedback_compliance (V2: 3 clients — supplier compliance)
CREATE TABLE IF NOT EXISTS carcase.carc_feedback_compliance (
  id                  SERIAL PRIMARY KEY,
  supplier_id         INTEGER NOT NULL,
  supplier_name       TEXT,
  detail_lot_no       TEXT,
  hist_lot_no         TEXT,
  pref_intake_fat     TEXT,
  intake_fat_group    NUMERIC(10,2),
  intake_fat_hist     NUMERIC(10,2),
  pref_intake_wght    TEXT,
  intake_wght_group   NUMERIC(10,2),
  intake_wght_hist    NUMERIC(10,2),
  pref_intake_teeth   TEXT,
  intake_teeth_group  NUMERIC(10,2),
  intake_teeth_hist   NUMERIC(10,2),
  pref_sale_wght      TEXT,
  sale_wght_group     NUMERIC(10,2),
  sale_wght_hist      NUMERIC(10,2),
  pref_wgd            TEXT,
  wgd_group           NUMERIC(10,2),
  wgd_hist            NUMERIC(10,2),
  pref_dress_pcnt     TEXT,
  dress_pcnt_group    NUMERIC(5,2),
  dress_pcnt_hist     NUMERIC(5,2),
  pref_mrb            TEXT,
  mrb_group           NUMERIC(5,2),
  mrb_hist            NUMERIC(5,2),
  pref_carc_p8        TEXT,
  carc_p8_group       NUMERIC(10,2),
  carc_p8_hist        NUMERIC(10,2),
  pref_ema            TEXT,
  ema_group           NUMERIC(10,2),
  ema_hist            NUMERIC(10,2),
  pref_fat_col        TEXT,
  fat_col_group       NUMERIC(5,2),
  fat_col_hist        NUMERIC(5,2),
  pref_meat_col       TEXT,
  meat_col_group      NUMERIC(5,2),
  meat_col_hist       NUMERIC(5,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- carc_feedback_mth_avgs (V2: 2 clients — monthly averages)
CREATE TABLE IF NOT EXISTS carcase.carc_feedback_mth_avgs (
  id              SERIAL PRIMARY KEY,
  yr_mnth         TEXT NOT NULL,
  sale_wght       NUMERIC(10,2),
  dof             NUMERIC(10,2),
  wg_day          NUMERIC(10,2),
  carc_wght       NUMERIC(10,2),
  dress_pcnt      NUMERIC(5,2),
  carc_teeth      NUMERIC(5,2),
  p8_fat          NUMERIC(5,2),
  eye_mscle_area  NUMERIC(10,2),
  marbling        NUMERIC(5,2),
  fat_colour      NUMERIC(5,2),
  meat_text       NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- marbling_bonus (V2: 9 clients — marbling score bonuses)
CREATE TABLE IF NOT EXISTS carcase.marbling_bonus (
  id              SERIAL PRIMARY KEY,
  marbling_score  NUMERIC(5,2),
  bonus_per_kg    NUMERIC(12,4),
  buyer_id        INTEGER,
  effective_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- OG web-app: carcase_import_data (staging table)
CREATE TABLE IF NOT EXISTS carcase.carcase_import_data (
  id               SERIAL PRIMARY KEY,
  import_batch     TEXT,
  import_date      DATE,
  raw_data         JSONB,
  matched_beast_id INTEGER,
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- OG web-app: carcase_feedback_report_data
CREATE TABLE IF NOT EXISTS carcase.carcase_feedback_report_data (
  id                SERIAL PRIMARY KEY,
  record_type       INTEGER,
  cow_id            INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id          INTEGER,           -- OG legacy
  supplier_id       INTEGER,
  ear_tag_no        TEXT,
  yr_mnth           TEXT,
  purch_date        DATE,
  purch_wght        NUMERIC(10,2),
  vendor_tag        TEXT,
  fl_ent_date       DATE,
  fl_ent_wght       NUMERIC(10,2),
  sale_date         DATE,
  sale_wght         NUMERIC(10,2),
  wg_day            NUMERIC(10,2),
  dof               NUMERIC(10,2),
  carc_wght         NUMERIC(10,2),
  dress_pcnt        NUMERIC(5,2),
  carc_teeth        NUMERIC(5,2),
  p8_fat            NUMERIC(5,2),
  eye_mscle_area    INTEGER,
  marbling          NUMERIC(5,2),
  fat_colour        NUMERIC(5,2),
  meat_colour       NUMERIC(5,2),
  meat_text         NUMERIC(5,2),
  died              BOOLEAN DEFAULT FALSE,
  sickness_costs    NUMERIC(12,2),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  PURCHASING
-- ██  Purchase lots, lot cattle, purchase totals
-- ████████████████████████████████████████████████████████████████

-- purchase_lots (V2: 17 clients — OG: lots/purchase_lots merged)
CREATE TABLE IF NOT EXISTS purchasing.purchase_lots (
  id                  SERIAL PRIMARY KEY,       -- OG PK
  lot_number          TEXT NOT NULL UNIQUE,     -- V2 PK (kept for ETL FK refs)
  lot_desc            TEXT,
  -- OG web-app columns
  vendor_id           INTEGER,                 -- OG FK (→ contacts.id)
  agent_id            INTEGER,                 -- OG FK (→ contacts.id)
  head_count          INTEGER,                 -- OG name
  total_weight_kg     NUMERIC(10,2),           -- OG name
  total_cost          NUMERIC(12,2),           -- OG name
  freight_cost        NUMERIC(12,4),
  notes               TEXT,
  status              TEXT DEFAULT 'active' CHECK(status IN ('active','sold','closed')),
  destination         TEXT,                    -- OG
  agistor_id          INTEGER,                 -- OG FK
  supplier_pic        TEXT,                    -- OG
  vendor_dec_no       TEXT,                    -- OG
  cents_per_kg        NUMERIC(12,4),           -- OG
  weighbridge_weight  NUMERIC(10,2),           -- OG
  weighbridge_charges NUMERIC(12,2),           -- OG
  dpi_charges         NUMERIC(12,2),           -- OG
  buyer_id            INTEGER,                 -- OG FK (→ contacts.id)
  market_category     TEXT,                    -- OG (TEXT, V2 uses SMALLINT)
  cattle_invoice_no   TEXT,                    -- OG
  cattle_inv_amount   NUMERIC(12,2),           -- OG
  cattle_inv_date_approved DATE,               -- OG
  carrier             TEXT,                    -- OG
  freight_invoice_no  TEXT,                    -- OG
  -- V2 legacy columns
  cattle_owner_id     INTEGER,
  agent_code          INTEGER,
  numb_head           INTEGER,
  purchase_date       DATE,
  arrival_date        DATE,
  purchase_price_total NUMERIC(12,4),
  avg_purchase_weight NUMERIC(10,2),
  avg_price_per_kg    NUMERIC(12,4),
  commission          NUMERIC(12,4),
  yard_fees           NUMERIC(12,4),
  insurance           NUMERIC(12,4),
  other_costs         NUMERIC(12,4),
  pic_number          TEXT,
  vndr_decl_no        TEXT,
  agistment_pic       TEXT,
  closed              BOOLEAN DEFAULT FALSE,
  close_date          DATE,
  legacy_modified_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_purch_lots_vendor ON purchasing.purchase_lots(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purch_lots_date ON purchasing.purchase_lots(purchase_date);

-- purchase_totals (V2: 15 clients — summary totals for reporting)
CREATE TABLE IF NOT EXISTS purchasing.purchase_totals (
  id                 SERIAL PRIMARY KEY,
  lot_number         TEXT REFERENCES purchasing.purchase_lots(lot_number),
  total_head         INTEGER,
  total_weight       NUMERIC(12,2),
  total_value        NUMERIC(12,4),
  avg_weight         NUMERIC(10,2),
  avg_price_per_kg   NUMERIC(12,4),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ
);


-- ████████████████████████████████████████████████████████████████
-- ██  COMMODITY
-- ██  Feed commodities, contracts, transactions, period stocks
-- ████████████████████████████████████████████████████████████████

-- commodities (V2: 17 clients — commodity master)
CREATE TABLE IF NOT EXISTS commodity.commodities (
  commodity_code   SMALLINT PRIMARY KEY,
  commodity_name   TEXT NOT NULL,
  commod_category  TEXT,
  commod_unit      TEXT,
  current_price    NUMERIC(12,4),
  shrinkage_factor NUMERIC(5,4) CHECK (shrinkage_factor BETWEEN 0 AND 1),
  dry_matter_pcnt  NUMERIC(5,2),
  me_mj_per_kg     NUMERIC(10,4),
  nep              NUMERIC(10,4),
  protein_pcnt     NUMERIC(5,2),
  fibre_pcnt       NUMERIC(5,2),
  fat_pcnt         NUMERIC(5,2),
  ash_pcnt         NUMERIC(5,2),
  active           BOOLEAN DEFAULT TRUE,
  legacy_modified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- commodcontracts (V2: 17 clients — supplier contracts)
CREATE TABLE IF NOT EXISTS commodity.commodcontracts (
  id                SERIAL PRIMARY KEY,
  contract_no       VARCHAR(10),
  supplier_ac_no    INTEGER,
  commod_code       SMALLINT REFERENCES commodity.commodities(commodity_code),
  contract_date     DATE,
  quantity_ordered  NUMERIC(12,2),
  quantity_delivered NUMERIC(12,2),
  price_per_tonne   NUMERIC(12,4),
  delivery_from     DATE,
  delivery_to       DATE,
  notes             TEXT,
  contract_complete BOOLEAN DEFAULT FALSE,
  legacy_modified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- commodtrans (V2: 17 clients — PARTITIONED by trans_date)
CREATE TABLE IF NOT EXISTS commodity.commodtrans (
  id               SERIAL NOT NULL,
  commodity_code   SMALLINT,
  contract_no      TEXT,
  trans_date       DATE NOT NULL,
  trans_type       TEXT,
  quantity         NUMERIC(12,4),
  price_per_unit   NUMERIC(12,4),
  total_value      NUMERIC(12,4),
  docket_no        TEXT,
  supplier_id      INTEGER,
  notes            TEXT,
  legacy_modified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,
  PRIMARY KEY (id, trans_date)
) PARTITION BY RANGE (trans_date);

-- period_stocks_closing_balance (V2: 17 clients)
CREATE TABLE IF NOT EXISTS commodity.period_stocks_closing_balance (
  id              SERIAL PRIMARY KEY,
  commodity_code  SMALLINT REFERENCES commodity.commodities(commodity_code),
  period_end_date DATE NOT NULL,
  closing_qty     NUMERIC(12,4),
  closing_value   NUMERIC(12,4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);


-- ████████████████████████████████████████████████████████████████
-- ██  TRANSPORT & LOGISTICS
-- ██  Trucks, loads, dockets, locations, manure
-- ████████████████████████████████████████████████████████████████

-- truck_names (V2: 17 clients)
CREATE TABLE IF NOT EXISTS transport.truck_names (
  id          SERIAL PRIMARY KEY,
  truck_name  TEXT NOT NULL,
  truck_type  TEXT,
  capacity    NUMERIC(10,2),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- truck_loads (V2: 17 clients — feed truck load records)
CREATE TABLE IF NOT EXISTS transport.truck_loads (
  id               SERIAL PRIMARY KEY,
  load_date        DATE NOT NULL,
  truck_id         INTEGER,
  ration_code      SMALLINT,
  load_number      SMALLINT,
  gross_weight     NUMERIC(10,2),
  tare_weight      NUMERIC(10,2),
  net_weight       NUMERIC(10,2),
  driver_initials  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- truckloadchangeslog (V2: 17 clients)
CREATE TABLE IF NOT EXISTS transport.truckloadchangeslog (
  id              SERIAL PRIMARY KEY,
  change_date     TIMESTAMPTZ DEFAULT NOW(),
  truck_load_id   INTEGER,
  change_type     TEXT,
  old_values      JSONB,
  new_values      JSONB,
  user_initials   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- truck_load_variation_data (V2: 11 clients)
CREATE TABLE IF NOT EXISTS transport.truck_load_variation_data (
  id              SERIAL PRIMARY KEY,
  truck_load_id   INTEGER,
  variation_type  TEXT,
  variation_value NUMERIC(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- datakey_truck_allocation (V2: 2 clients)
CREATE TABLE IF NOT EXISTS transport.datakey_truck_allocation (
  id              SERIAL PRIMARY KEY,
  truck_id        INTEGER,
  data_key        TEXT,
  allocation_data JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- locations (V2: 17 clients — station/agistment locations)
CREATE TABLE IF NOT EXISTS transport.locations (
  location_id     SERIAL PRIMARY KEY,
  location_name   TEXT NOT NULL,
  location_type   TEXT,
  pic_number      TEXT,
  address         TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- location_changes (V2: 17 clients — beast location movements)
CREATE TABLE IF NOT EXISTS transport.location_changes (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id        INTEGER,           -- OG legacy
  from_location   TEXT,
  to_location     TEXT,
  movement_date   DATE NOT NULL,
  reason          TEXT,
  ear_tag         TEXT,
  transport_ref   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_locchanges_beast ON transport.location_changes(beast_id);
CREATE INDEX IF NOT EXISTS idx_locchanges_date ON transport.location_changes(movement_date);

-- location_transactions (V2: 17 clients)
CREATE TABLE IF NOT EXISTS transport.location_transactions (
  id                  SERIAL PRIMARY KEY,
  from_location_code  INTEGER REFERENCES transport.locations(location_id),
  to_location_code    INTEGER REFERENCES transport.locations(location_id),
  movement_date       DATE NOT NULL,
  head_count          INTEGER,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

-- deliverydockets (V2: 17 clients — commodity delivery records)
CREATE TABLE IF NOT EXISTS transport.deliverydockets (
  id              SERIAL PRIMARY KEY,
  docket_no       TEXT,
  docket_date     DATE NOT NULL,
  commodity_code  SMALLINT,
  supplier_id     INTEGER,
  truck_id        INTEGER,
  gross_weight    NUMERIC(10,2),
  tare_weight     NUMERIC(10,2),
  net_weight      NUMERIC(10,2),
  moisture_pcnt   NUMERIC(5,2),
  price_per_tonne NUMERIC(12,4),
  total_value     NUMERIC(12,4),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dockets_date ON transport.deliverydockets(docket_date);

-- manure_locations (V2: 6 clients)
CREATE TABLE IF NOT EXISTS transport.manure_locations (
  id            SERIAL PRIMARY KEY,
  location_name TEXT,
  direction     VARCHAR(4),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- manure_carting (V2: 6 clients)
CREATE TABLE IF NOT EXISTS transport.manure_carting (
  id               SERIAL PRIMARY KEY,
  cart_date        DATE NOT NULL,
  from_location_id INTEGER,
  to_location_id   INTEGER,
  loads            INTEGER,
  tonnes           NUMERIC(10,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- loaddockages (V2: 3 clients — load dockage records)
CREATE TABLE IF NOT EXISTS transport.loaddockages (
  id              SERIAL PRIMARY KEY,
  docket_id       INTEGER,
  dockage_type    TEXT,
  dockage_pcnt    NUMERIC(5,2),
  dockage_value   NUMERIC(12,4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- wbridgecomport (V2: 17 clients — weighbridge serial port config)
CREATE TABLE IF NOT EXISTS transport.wbridgecomport (
  id          SERIAL PRIMARY KEY,
  port_name   TEXT,
  baud_rate   INTEGER,
  data_bits   SMALLINT,
  stop_bits   SMALLINT,
  parity      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);


-- ████████████████████████████████████████████████████████████████
-- ██  CONTACTS
-- ██  Companies, contacts, contact types
-- ████████████████████████████████████████████████████████████████

-- company (V2: 17 clients — feedlot company details)
CREATE TABLE IF NOT EXISTS contacts.company (
  id            SERIAL PRIMARY KEY,
  company_name  TEXT NOT NULL,
  abn           TEXT,
  address_1     TEXT,
  address_2     TEXT,
  city          TEXT,
  state         TEXT,
  postcode      TEXT,
  phone         TEXT,
  fax           TEXT,
  email         TEXT,
  pic_number    TEXT,
  logo          BYTEA,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- company_settings (V2: 17 clients — feedlot config)
CREATE TABLE IF NOT EXISTS contacts.company_settings (
  id            SERIAL PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type  TEXT,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- contacts (V2: 17 clients — vendors, buyers, abattoirs, agents, etc.)
CREATE TABLE IF NOT EXISTS contacts.contacts (
  id              SERIAL PRIMARY KEY,          -- OG PK
  contact_id      INTEGER UNIQUE,              -- V2 PK (kept for ETL)
  -- OG web-app columns
  type            TEXT CHECK(type IN ('vendor','agent','buyer','abattoir','carrier','other')),
  company         TEXT,
  title           TEXT,
  first_name      TEXT,
  last_name       TEXT,
  phone           TEXT,
  mobile          TEXT,
  fax             TEXT,
  email           TEXT,
  address         TEXT,
  address_2       TEXT,
  city            TEXT,
  state           TEXT,
  post_code       TEXT,
  pic             TEXT,
  abn             TEXT,
  bsb             TEXT,
  account_number  TEXT,
  invoice_co      TEXT,
  payment_due_days INTEGER DEFAULT 0,
  feedlot_agistment_rate NUMERIC(12,2),
  paddock_agistment_rate NUMERIC(12,2),
  tail_tag        TEXT,
  brand           TEXT,
  notes           TEXT,
  -- V2 legacy columns
  name            TEXT,
  company_name    TEXT,
  account_code    TEXT,
  pic_number      TEXT,
  address_1       TEXT,
  postcode        TEXT,
  bank_bsb        TEXT,
  bank_acct       TEXT,
  bank_name       TEXT,
  payment_terms   TEXT,
  active          BOOLEAN DEFAULT TRUE,
  legacy_modified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts.contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts.contacts(account_code);

-- contacttypes (V2: 17 clients)
CREATE TABLE IF NOT EXISTS contacts.contacttypes (
  contact_type_id  SERIAL PRIMARY KEY,
  contact_type     TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- contactscontacttypes (V2: 17 clients — many-to-many)
CREATE TABLE IF NOT EXISTS contacts.contactscontacttypes (
  id              SERIAL PRIMARY KEY,
  contact_id      INTEGER NOT NULL REFERENCES contacts.contacts(id) ON DELETE RESTRICT,
  contact_type_id INTEGER NOT NULL REFERENCES contacts.contacttypes(contact_type_id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, contact_type_id)
);


-- ████████████████████████████████████████████████████████████████
-- ██  BREEDING
-- ██  Beast breeding, sires, dams, genetic traits
-- ████████████████████████████████████████████████████████████████

-- breeding_sires (V2: 17 clients)
CREATE TABLE IF NOT EXISTS breeding.breeding_sires (
  sire_id     SERIAL PRIMARY KEY,
  sire_name   TEXT,
  breed       TEXT,
  sire_line   TEXT,
  eid         TEXT,
  notes       TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- breeding_dams (V2: 17 clients)
CREATE TABLE IF NOT EXISTS breeding.breeding_dams (
  dam_id      SERIAL PRIMARY KEY,
  dam_name    TEXT,
  breed       TEXT,
  eid         TEXT,
  notes       TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- beast_breeding (V2: 17 clients — breeding record per beast)
CREATE TABLE IF NOT EXISTS breeding.beast_breeding (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER,            -- web-app FK (→ cattle.cows)
  beast_id    INTEGER,            -- OG legacy
  sire        INTEGER REFERENCES breeding.breeding_sires(sire_id),
  dam         INTEGER REFERENCES breeding.breeding_dams(dam_id),
  breed       TEXT,
  breed_pcnt  NUMERIC(5,2),
  sub_breed   TEXT,
  sire_line   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_breeding_beast ON breeding.beast_breeding(beast_id);

-- rudd_800_traits (V2: 3 clients — field mapping for data import)
CREATE TABLE IF NOT EXISTS breeding.rudd_800_traits (
  id           SERIAL PRIMARY KEY,
  db_fld_name  TEXT,
  start_pos    INTEGER,
  fld_len      INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);


-- ████████████████████████████████████████████████████████████████
-- ██  WEIGHING
-- ██  Weighing events, scales, weighbridge dockets
-- ████████████████████████████████████████████████████████████████

-- weighing_events (V2 + OG merged — per-beast weigh records)
CREATE TABLE IF NOT EXISTS weighing.weighing_events (
  id             SERIAL PRIMARY KEY,
  cow_id         INTEGER,          -- OG web-app FK (→ cattle.cows)
  beast_id       INTEGER,          -- V2 legacy FK
  weigh_type     TEXT CHECK(weigh_type IN ('intake','interim','exit','sale')), -- OG
  weigh_date     DATE,
  weight_kg      NUMERIC(10,2) CHECK (weight_kg >= 0),   -- OG name
  weight         NUMERIC(10,2) CHECK (weight >= 0),      -- V2 name
  weighing_type  INTEGER,          -- V2 FK → weighing_types
  p8_fat         SMALLINT,         -- OG
  rib_fat        SMALLINT,         -- OG
  draft_gate     TEXT,
  ear_tag        TEXT,
  pen_name       TEXT,
  days_owned     INTEGER,          -- OG
  time_weighed   TEXT,             -- OG
  agistor_id     INTEGER,          -- OG
  be_agist_lot_no TEXT,            -- OG
  cull_reason_id  TEXT,            -- OG
  beast_sale_type_id INTEGER,      -- OG
  to_locn_type_id INTEGER,         -- OG
  user_initials  TEXT,             -- OG/V2
  notes          TEXT,
  legacy_modified_at TIMESTAMPTZ,  -- OG
  weighed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- OG name
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_weighing_beast ON weighing.weighing_events(beast_id);
CREATE INDEX IF NOT EXISTS idx_weighing_date ON weighing.weighing_events(weigh_date);

-- weighing_types (OG + V2 merged — lookup)
CREATE TABLE IF NOT EXISTS weighing.weighing_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- scalestypes (V2: 17 clients — scale hardware config)
CREATE TABLE IF NOT EXISTS weighing.scalestypes (
  id          SERIAL PRIMARY KEY,
  scale_type  TEXT NOT NULL,
  description TEXT,
  port_config JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

-- livestock_weighbridge_dockets (OG web-app)
CREATE TABLE IF NOT EXISTS weighing.livestock_weighbridge_dockets (
  id                  SERIAL PRIMARY KEY,
  docket_number       TEXT,
  weigh_date          DATE NOT NULL,
  vehicle_rego        TEXT,
  gross_weight        NUMERIC(10,2),
  tare_weight         NUMERIC(10,2),
  net_weight          NUMERIC(10,2),
  head_count          INTEGER,
  lot_number          TEXT,
  destination         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  REPORTING
-- ██  Monthly stock-on-hand, reconciliation, period summaries
-- ████████████████████████████████████████████████████████████████

-- month_end_stockonhand (V2: 17 clients)
CREATE TABLE IF NOT EXISTS reporting.month_end_stockonhand (
  id                SERIAL PRIMARY KEY,
  period_date       DATE NOT NULL,
  head_count        INTEGER,
  total_value       NUMERIC(12,4),
  avg_price_per_hd  NUMERIC(12,4),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- soh_by_month (V2: 17 clients — stock-on-hand breakdown)
CREATE TABLE IF NOT EXISTS reporting.soh_by_month (
  id               SERIAL PRIMARY KEY,
  yr_mnth          TEXT NOT NULL,
  category         TEXT,
  head_count       INTEGER,
  total_weight     NUMERIC(12,2),
  total_value      NUMERIC(12,4),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- monthly_adjustment_ob (V2: 17 clients — period adjustments)
CREATE TABLE IF NOT EXISTS reporting.monthly_adjustment_ob (
  id              SERIAL PRIMARY KEY,
  adj_date        DATE NOT NULL,
  adj_type        TEXT,
  head_count      INTEGER,
  value           NUMERIC(12,4),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- monthly_agistor_movements (V2: 3 clients)
CREATE TABLE IF NOT EXISTS reporting.monthly_agistor_movements (
  id              SERIAL PRIMARY KEY,
  period_date     DATE NOT NULL,
  agistor_id      INTEGER,
  movement_type   TEXT,
  head_count      INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- monthly_reconciliation (V2: 17 clients)
CREATE TABLE IF NOT EXISTS reporting.monthly_reconciliation (
  id               SERIAL PRIMARY KEY,
  period_date      DATE NOT NULL,
  opening_head     INTEGER,
  arrivals         INTEGER,
  deaths           INTEGER,
  shipments        INTEGER,
  closing_head     INTEGER,
  variance         INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

-- monthly_movements (V2: 17 clients)
CREATE TABLE IF NOT EXISTS reporting.monthly_movements (
  id              SERIAL PRIMARY KEY,
  period_date     DATE NOT NULL,
  movement_type   TEXT,
  head_count      INTEGER,
  category        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- mrb_avg_supplier_years (V2: 3 clients)
CREATE TABLE IF NOT EXISTS reporting.mrb_avg_supplier_years (
  id              SERIAL PRIMARY KEY,
  supplier_id     INTEGER,
  year            INTEGER,
  avg_marbling    NUMERIC(5,2),
  head_count      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- OG web-app reporting tables
CREATE TABLE IF NOT EXISTS reporting.cattle_by_location (
  id              SERIAL PRIMARY KEY,
  entry_month     TEXT,
  rv_count        INTEGER,
  rv_prime_cost   NUMERIC(12,2),
  rv_feed_cost    NUMERIC(12,2),
  rv_other_costs  NUMERIC(12,2),
  cust_fl_count   INTEGER,
  cust_fl_prime_cost NUMERIC(12,2),
  cust_fl_feed_cost  NUMERIC(12,2),
  cust_fl_other_costs NUMERIC(12,2),
  rv_fl_entry_wght   NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting.cattle_query_month_report (
  id                SERIAL PRIMARY KEY,
  cow_id            INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id          INTEGER,           -- OG legacy
  current_loc_type_id INTEGER,
  start_date        DATE,
  weigh_date        DATE,
  weighing_type     INTEGER,
  weight            NUMERIC(10,2),
  to_locn_type_id   INTEGER,
  to_from_agistor   INTEGER,
  beast_sale_type_id INTEGER,
  cull_reason_id    TEXT,
  be_agist_lot_no   TEXT,
  lot_number        TEXT,
  purchase_date     DATE,
  prime_cost        NUMERIC(12,2),
  feed_cost         NUMERIC(12,2),
  oheads_cost       NUMERIC(12,2),
  other_costs       NUMERIC(12,2),
  mkt_cat           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting.stock_rec_data (
  id             SERIAL PRIMARY KEY,
  line_head      TEXT,
  head           NUMERIC(12,2),
  value          NUMERIC(12,2),
  animal_cost    NUMERIC(12,2),
  freight        NUMERIC(12,2),
  agist_and_feed NUMERIC(12,2),
  other_costs    NUMERIC(12,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting.scu_rec_data (
  id         SERIAL PRIMARY KEY,
  mth_seq    INTEGER,
  month      TEXT,
  scu_value  NUMERIC(12,2),
  head_days  NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  OPERATIONS (OG web-app domain)
-- ██  NLIS, bunks, scans, vendor decs, transport, archives, drafting
-- ████████████████████████████████████████████████████████████████

-- nlis_transfers (OG web-app)
CREATE TABLE IF NOT EXISTS operations.nlis_transfers (
  id              SERIAL PRIMARY KEY,
  cow_id          INTEGER,           -- OG FK (→ cattle.cows)
  beast_id        INTEGER,           -- V2 FK
  transfer_type   TEXT NOT NULL CHECK(transfer_type IN ('movement_in','movement_out','sighting','deceased','device_reg','tag_replace')),
  -- OG column names
  from_pic        TEXT,              -- OG name
  to_pic          TEXT,              -- OG name
  eid             TEXT,              -- OG
  nlis_transaction_id TEXT,          -- OG
  status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','confirmed','rejected','error')),
  request_payload JSONB,             -- OG
  response_payload JSONB,            -- OG
  submitted_at    TIMESTAMPTZ,       -- OG
  confirmed_at    TIMESTAMPTZ,       -- OG
  error_message   TEXT,              -- OG
  created_by      INTEGER,           -- OG
  -- V2 legacy columns
  nlis_number     TEXT,
  pic_from        TEXT,              -- V2 name (alias for from_pic)
  pic_to          TEXT,              -- V2 name (alias for to_pic)
  transfer_date   DATE,
  response        JSONB,
  ear_tag         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nlis_cow ON operations.nlis_transfers(cow_id);
CREATE INDEX IF NOT EXISTS idx_nlis_status ON operations.nlis_transfers(status);
CREATE INDEX IF NOT EXISTS idx_nlis_type ON operations.nlis_transfers(transfer_type);

-- bunk_call_sessions (OG web-app)
CREATE TABLE IF NOT EXISTS operations.bunk_call_sessions (
  id              SERIAL PRIMARY KEY,
  session_date    DATE NOT NULL,
  called_by       TEXT,
  status          TEXT DEFAULT 'in_progress',
  notes           TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- bunk_call_entries (OG web-app)
CREATE TABLE IF NOT EXISTS operations.bunk_call_entries (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER REFERENCES operations.bunk_call_sessions(id),
  pen_id          INTEGER,
  pen_name        TEXT,
  bunk_score      INTEGER,
  ration_name     TEXT,
  head_count      INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  remaining_kg    NUMERIC(10,2) NULL,
  shoveled        BOOLEAN NOT NULL DEFAULT FALSE,
  bunk_code       TEXT NULL CHECK (bunk_code IS NULL OR bunk_code IN ('U','S','D')),
  variation_pct   NUMERIC(5,2) NULL,
  alloc_kg        NUMERIC(10,2) NULL,
  other_notes     TEXT NULL
);

-- rfid_scan_sessions (OG web-app)
CREATE TABLE IF NOT EXISTS operations.rfid_scan_sessions (
  id              SERIAL PRIMARY KEY,
  session_type    TEXT NOT NULL,
  session_date    DATE NOT NULL,
  operator        TEXT,
  device          TEXT,
  status          TEXT DEFAULT 'in_progress',
  scan_count      INTEGER DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- transport_dispatches (OG web-app)
CREATE TABLE IF NOT EXISTS operations.transport_dispatches (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,
  head_count      INTEGER NOT NULL DEFAULT 0,
  sale_date       DATE,
  sub_group_name  TEXT,
  nvd_id          INTEGER,
  nett_weight_kg  NUMERIC(10,2),
  weigh_note      TEXT,
  -- V2 columns
  dispatch_date   DATE,
  destination     TEXT,
  carrier         TEXT,
  vehicle_rego    TEXT,
  driver_name     TEXT,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- transport_dispatch_items (OG web-app)
CREATE TABLE IF NOT EXISTS operations.transport_dispatch_items (
  id              SERIAL PRIMARY KEY,
  dispatch_id     INTEGER REFERENCES operations.transport_dispatches(id),
  cow_id          INTEGER,           -- web-app FK (→ cattle.cows)
  beast_id        INTEGER,           -- OG legacy
  ear_tag         TEXT,
  eid             TEXT,
  weight          NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- weighbridge_dockets (OG web-app — distinct from weighing.livestock_weighbridge_dockets)
CREATE TABLE IF NOT EXISTS operations.weighbridge_dockets (
  id                SERIAL PRIMARY KEY,
  docket_number     TEXT NOT NULL,
  docket_type       TEXT NOT NULL CHECK(docket_type IN ('receival','dispatch')),
  weighperson       TEXT,
  docket_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  docket_time       TIME,
  exit_date         DATE,
  exit_time         TIME,
  carrier_id        INTEGER,
  driver_name       TEXT,
  vehicle_rego      TEXT,
  origin_dest_id    INTEGER,
  description       TEXT,
  nvd_number        TEXT,
  purchase_lot_id   INTEGER,
  head_count        INTEGER,
  avg_weight_kg     NUMERIC(10,2),
  welfare_followed  BOOLEAN DEFAULT FALSE,
  weight_unit       TEXT DEFAULT 'tons' CHECK(weight_unit IN ('tons','kgs')),
  gross_weight      NUMERIC(10,2),
  gross_front       NUMERIC(10,2),
  gross_rear        NUMERIC(10,2),
  tare_weight       NUMERIC(10,2),
  tare_front        NUMERIC(10,2),
  tare_rear         NUMERIC(10,2),
  net_weight        NUMERIC(10,2),
  shrink_pct        NUMERIC(5,2),
  shrunk_weight     NUMERIC(10,2),
  avg_weight_shrunk NUMERIC(10,2),
  docket_notes      TEXT,
  user_id           INTEGER,
  legacy_docket_id  INTEGER,
  -- V2 columns
  weigh_date        DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_date ON operations.weighbridge_dockets(docket_date DESC);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_type ON operations.weighbridge_dockets(docket_type);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_carrier ON operations.weighbridge_dockets(carrier_id);

-- archives (OG web-app — archive events)
CREATE TABLE IF NOT EXISTS operations.archives (
  id                      SERIAL PRIMARY KEY,
  name                    TEXT,
  from_date               DATE,
  to_date                 DATE,
  categories              JSONB NOT NULL DEFAULT '[]',
  record_count            INTEGER DEFAULT 0,
  size_bytes              BIGINT DEFAULT 0,
  status                  TEXT DEFAULT 'stored' CHECK(status IN ('stored','restoring','restored')),
  data                    JSONB,
  restored_at             TIMESTAMPTZ,
  reverse_archive         BOOLEAN DEFAULT FALSE,
  record_selection        TEXT,
  -- V2 columns
  archive_date            DATE,
  archive_type            TEXT,
  notes                   TEXT,
  archived_by             TEXT,
  legacy_records_archived INTEGER,
  legacy_date_done        DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- archiving_log (V2 merged → moved here)
CREATE TABLE IF NOT EXISTS operations.archiving_log (
  id                SERIAL PRIMARY KEY,
  archive_date      DATE NOT NULL,
  table_name        TEXT,
  records_archived  INTEGER,
  from_date         DATE,
  to_date           DATE,
  done_by           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- drafting_settings (OG web-app)
CREATE TABLE IF NOT EXISTS operations.drafting_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- report_templates (Reports + Dockets designer)
-- Stores both Stimulsoft (template_json) and HTML (template_html/template_css) templates.
-- See server/services/reports/report-templates.js for usage.
CREATE TABLE IF NOT EXISTS operations.report_templates (
  id              SERIAL PRIMARY KEY,
  report_key      VARCHAR(100) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'report',
  template_format TEXT NOT NULL DEFAULT 'stimulsoft',
  template_json   JSONB,
  template_html   TEXT,
  template_css    TEXT,
  is_default      BOOLEAN DEFAULT false,
  created_by      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT report_templates_format_check CHECK (template_format IN ('stimulsoft', 'html')),
  CONSTRAINT report_templates_kind_check   CHECK (kind IN ('report', 'docket')),
  UNIQUE (report_key, is_default)
);
CREATE INDEX IF NOT EXISTS idx_report_templates_kind   ON operations.report_templates(kind);
CREATE INDEX IF NOT EXISTS idx_report_templates_format ON operations.report_templates(template_format);

-- dockets (printable docket records, optionally linked to a template)
CREATE TABLE IF NOT EXISTS operations.dockets (
  id              SERIAL PRIMARY KEY,
  docket_number   TEXT        NOT NULL,
  docket_type     TEXT        NOT NULL DEFAULT 'general',
  docket_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  template_id     INTEGER     REFERENCES operations.report_templates(id) ON DELETE SET NULL,
  data            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  rendered_html   TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'issued', 'voided')),
  notes           TEXT,
  created_by      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (docket_number)
);
CREATE INDEX IF NOT EXISTS idx_dockets_date   ON operations.dockets(docket_date DESC);
CREATE INDEX IF NOT EXISTS idx_dockets_type   ON operations.dockets(docket_type);
CREATE INDEX IF NOT EXISTS idx_dockets_status ON operations.dockets(status);

-- agent_issues (OG web-app)
CREATE TABLE IF NOT EXISTS operations.agent_issues (
  id              SERIAL PRIMARY KEY,
  issue_type      TEXT NOT NULL,
  description     TEXT,
  severity        TEXT,
  status          TEXT DEFAULT 'open',
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- batch_pen_operations (OG web-app — batch transfer/sale log)
CREATE TABLE IF NOT EXISTS operations.batch_pen_operations (
  id             SERIAL PRIMARY KEY,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('transfer','sale')),
  from_pen_id    INTEGER,   -- FK deferred (→ pen.pens)
  to_pen_id      INTEGER,   -- FK deferred (→ pen.pens)
  head_count     INTEGER NOT NULL,
  avg_sale_weight NUMERIC(10,2),
  filter_field   TEXT,
  filter_value   TEXT,
  moved_at       TIMESTAMPTZ DEFAULT NOW(),
  recorded_by    TEXT,
  user_id        INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_batch_pen_ops_date ON operations.batch_pen_operations(moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_pen_ops_from ON operations.batch_pen_operations(from_pen_id);
CREATE INDEX IF NOT EXISTS idx_batch_pen_ops_to   ON operations.batch_pen_operations(to_pen_id);


-- ████████████████████████████████████████████████████████████████
-- ██  SYSTEM & CONFIGURATION
-- ██  Lookups, error logs, user sessions, DB config
-- ████████████████████████████████████████████████████████████████

-- lookups (OG web-app — generic key-value lookups)
CREATE TABLE IF NOT EXISTS system.lookups (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,
  code        TEXT NOT NULL,
  label       TEXT,
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, code)
);

-- transaction_types (V2: 17 clients)
CREATE TABLE IF NOT EXISTS system.transaction_types (
  id            SERIAL PRIMARY KEY,
  trans_type_id SMALLINT NOT NULL UNIQUE,
  trans_desc    TEXT,
  trans_effect  TEXT CHECK (trans_effect IN ('+', '-')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- code_references_index (V2: 17 clients — code reference lookups)
CREATE TABLE IF NOT EXISTS system.code_references_index (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL,
  description TEXT,
  category   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- com_port_settings (V2: 17 clients)
CREATE TABLE IF NOT EXISTS system.com_port_settings (
  id         SERIAL PRIMARY KEY,
  port_name  TEXT NOT NULL,
  device_type TEXT,
  baud_rate  INTEGER,
  data_bits  SMALLINT,
  stop_bits  SMALLINT,
  parity     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- computer_names (V2: 17 clients)
CREATE TABLE IF NOT EXISTS system.computer_names (
  id            SERIAL PRIMARY KEY,
  computer_name TEXT NOT NULL,
  role          TEXT,
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- system_info (V2: 17 clients — system version/config flags)
CREATE TABLE IF NOT EXISTS system.system_info (
  id         SERIAL PRIMARY KEY,
  info_key   TEXT NOT NULL UNIQUE,
  info_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- database_flags (V2: 17 clients — feature toggles)
CREATE TABLE IF NOT EXISTS system.database_flags (
  id         SERIAL PRIMARY KEY,
  flag_name  TEXT NOT NULL UNIQUE,
  flag_value BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- error_log (V2: 17 clients)
CREATE TABLE IF NOT EXISTS system.error_log (
  id             SERIAL PRIMARY KEY,
  event_date     TIMESTAMPTZ DEFAULT NOW(),
  error_source   TEXT,
  error_message  TEXT,
  error_details  TEXT,
  user_name      TEXT,
  computer_name  TEXT,
  module_name    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_errorlog_date ON system.error_log(event_date);

-- field_names_foreign_conversion (V2: 3 clients)
CREATE TABLE IF NOT EXISTS system.field_names_foreign_conversion (
  id             SERIAL PRIMARY KEY,
  original_name  TEXT NOT NULL,
  converted_name TEXT,
  table_name     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- user_log_ons (V2: 17 clients — session audit)
CREATE TABLE IF NOT EXISTS system.user_log_ons (
  id               SERIAL PRIMARY KEY,
  user_number      INTEGER,
  log_on_date_time TIMESTAMPTZ DEFAULT NOW(),
  log_off_date_time TIMESTAMPTZ,
  computer_name    TEXT,
  app_version      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_userlogons_date ON system.user_log_ons(log_on_date_time);

-- mmec_table (V2: 11 clients)
CREATE TABLE IF NOT EXISTS system.mmec_table (
  id         SERIAL PRIMARY KEY,
  mmec_code  TEXT NOT NULL,
  mmec_desc  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- rv_scheduled_dof (V2 + OG merged — scheduled DOF processing)
CREATE TABLE IF NOT EXISTS system.rv_scheduled_dof (
  id            SERIAL PRIMARY KEY,
  dof_trigger   INTEGER,
  action_type   TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- OG web-app system tables
CREATE TABLE IF NOT EXISTS system.connected_systems (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT,
  connection  JSONB,
  status      TEXT DEFAULT 'disconnected',
  last_sync   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system.system_positions (
  id          SERIAL PRIMARY KEY,
  position    TEXT NOT NULL,
  department  TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system.migration_log (
  id              SERIAL PRIMARY KEY,
  source_table    TEXT NOT NULL,
  rows_read       INTEGER DEFAULT 0,
  rows_written    INTEGER DEFAULT 0,
  rows_skipped    INTEGER DEFAULT 0,
  rows_errored    INTEGER DEFAULT 0,
  status          VARCHAR(10) NOT NULL,
  error_details   TEXT NULL,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_migration_status CHECK (status IN ('running','completed','failed'))
);

CREATE TABLE IF NOT EXISTS system.legacy_raw (
  id              SERIAL PRIMARY KEY,
  source_table    TEXT NOT NULL,
  row_data        JSONB NOT NULL,
  migrated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  DIGISTAR INTEGRATION
-- ██  Digistar feed system data and users
-- ████████████████████████████████████████████████████████████████

-- digistar_data_history (V2: 6 clients — PARTITIONED by feed_date)
CREATE TABLE IF NOT EXISTS digistar.digistar_data_history (
  id              SERIAL NOT NULL,
  feed_date       DATE NOT NULL,
  pen_number      TEXT,
  ration_name     TEXT,
  load_number     SMALLINT,
  planned_weight  NUMERIC(10,2),
  actual_weight   NUMERIC(10,2),
  truck_id        TEXT,
  driver_initials TEXT,
  time_fed        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  PRIMARY KEY (id, feed_date)
) PARTITION BY RANGE (feed_date);

-- digistar_users (V2: 6 clients)
CREATE TABLE IF NOT EXISTS digistar.digistar_users (
  id              SERIAL PRIMARY KEY,
  user_name       TEXT NOT NULL,
  digistar_role   TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);


-- ████████████████████████████████████████████████████████████████
-- ██  TABLE PARTITIONS
-- ██  Yearly partitions for high-volume transaction tables (2020-2028 + DEFAULT)
-- ██  Wrapped in DO block for idempotency (PARTITION OF has no IF NOT EXISTS)
-- ████████████████████████████████████████████████████████████████

DO $$
DECLARE
    _parts TEXT[] := ARRAY[
        -- health.drugs_given partitions
        'CREATE TABLE health.drugs_given_default   PARTITION OF health.drugs_given DEFAULT',
        'CREATE TABLE health.drugs_given_y2020     PARTITION OF health.drugs_given FOR VALUES FROM (''2020-01-01'') TO (''2021-01-01'')',
        'CREATE TABLE health.drugs_given_y2021     PARTITION OF health.drugs_given FOR VALUES FROM (''2021-01-01'') TO (''2022-01-01'')',
        'CREATE TABLE health.drugs_given_y2022     PARTITION OF health.drugs_given FOR VALUES FROM (''2022-01-01'') TO (''2023-01-01'')',
        'CREATE TABLE health.drugs_given_y2023     PARTITION OF health.drugs_given FOR VALUES FROM (''2023-01-01'') TO (''2024-01-01'')',
        'CREATE TABLE health.drugs_given_y2024     PARTITION OF health.drugs_given FOR VALUES FROM (''2024-01-01'') TO (''2025-01-01'')',
        'CREATE TABLE health.drugs_given_y2025     PARTITION OF health.drugs_given FOR VALUES FROM (''2025-01-01'') TO (''2026-01-01'')',
        'CREATE TABLE health.drugs_given_y2026     PARTITION OF health.drugs_given FOR VALUES FROM (''2026-01-01'') TO (''2027-01-01'')',
        'CREATE TABLE health.drugs_given_y2027     PARTITION OF health.drugs_given FOR VALUES FROM (''2027-01-01'') TO (''2028-01-01'')',
        'CREATE TABLE health.drugs_given_y2028     PARTITION OF health.drugs_given FOR VALUES FROM (''2028-01-01'') TO (''2029-01-01'')',
        'CREATE TABLE health.drugs_given_y2029     PARTITION OF health.drugs_given FOR VALUES FROM (''2029-01-01'') TO (''2030-01-01'')',
        -- feed.penfeedsdata partitions
        'CREATE TABLE feed.penfeedsdata_default    PARTITION OF feed.penfeedsdata DEFAULT',
        'CREATE TABLE feed.penfeedsdata_y2020      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2020-01-01'') TO (''2021-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2021      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2021-01-01'') TO (''2022-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2022      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2022-01-01'') TO (''2023-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2023      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2023-01-01'') TO (''2024-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2024      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2024-01-01'') TO (''2025-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2025      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2025-01-01'') TO (''2026-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2026      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2026-01-01'') TO (''2027-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2027      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2027-01-01'') TO (''2028-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2028      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2028-01-01'') TO (''2029-01-01'')',
        'CREATE TABLE feed.penfeedsdata_y2029      PARTITION OF feed.penfeedsdata FOR VALUES FROM (''2029-01-01'') TO (''2030-01-01'')',
        -- finance.costs_feed_detail partitions
        'CREATE TABLE finance.costs_feed_detail_default PARTITION OF finance.costs_feed_detail DEFAULT',
        'CREATE TABLE finance.costs_feed_detail_y2020   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2020-01-01'') TO (''2021-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2021   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2021-01-01'') TO (''2022-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2022   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2022-01-01'') TO (''2023-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2023   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2023-01-01'') TO (''2024-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2024   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2024-01-01'') TO (''2025-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2025   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2025-01-01'') TO (''2026-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2026   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2026-01-01'') TO (''2027-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2027   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2027-01-01'') TO (''2028-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2028   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2028-01-01'') TO (''2029-01-01'')',
        'CREATE TABLE finance.costs_feed_detail_y2029   PARTITION OF finance.costs_feed_detail FOR VALUES FROM (''2029-01-01'') TO (''2030-01-01'')',
        -- commodity.commodtrans partitions
        'CREATE TABLE commodity.commodtrans_default     PARTITION OF commodity.commodtrans DEFAULT',
        'CREATE TABLE commodity.commodtrans_y2020       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2020-01-01'') TO (''2021-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2021       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2021-01-01'') TO (''2022-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2022       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2022-01-01'') TO (''2023-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2023       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2023-01-01'') TO (''2024-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2024       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2024-01-01'') TO (''2025-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2025       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2025-01-01'') TO (''2026-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2026       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2026-01-01'') TO (''2027-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2027       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2027-01-01'') TO (''2028-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2028       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2028-01-01'') TO (''2029-01-01'')',
        'CREATE TABLE commodity.commodtrans_y2029       PARTITION OF commodity.commodtrans FOR VALUES FROM (''2029-01-01'') TO (''2030-01-01'')',
        -- digistar.digistar_data_history partitions
        'CREATE TABLE digistar.digistar_data_history_default PARTITION OF digistar.digistar_data_history DEFAULT',
        'CREATE TABLE digistar.digistar_data_history_y2020   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2020-01-01'') TO (''2021-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2021   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2021-01-01'') TO (''2022-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2022   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2022-01-01'') TO (''2023-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2023   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2023-01-01'') TO (''2024-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2024   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2024-01-01'') TO (''2025-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2025   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2025-01-01'') TO (''2026-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2026   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2026-01-01'') TO (''2027-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2027   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2027-01-01'') TO (''2028-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2028   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2028-01-01'') TO (''2029-01-01'')',
        'CREATE TABLE digistar.digistar_data_history_y2029   PARTITION OF digistar.digistar_data_history FOR VALUES FROM (''2029-01-01'') TO (''2030-01-01'')'
    ];
    _sql TEXT;
    _tbl TEXT;
BEGIN
    FOREACH _sql IN ARRAY _parts LOOP
        -- Extract table name: "CREATE TABLE schema.name PARTITION..."
        _tbl := split_part(split_part(_sql, 'CREATE TABLE ', 2), ' ', 1);
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE n.nspname = split_part(_tbl, '.', 1) AND c.relname = split_part(_tbl, '.', 2))
        THEN
            EXECUTE _sql;
        END IF;
    END LOOP;
END
$$;


-- ████████████████████████████████████████████████████████████████
-- ██  CHECK CONSTRAINTS
-- ████████████████████████████████████████████████████████████████

-- sex CHECK is inline on cattle.cows CREATE TABLE (female/male) — no standalone needed
-- species has no fixed enum in OG — no standalone CHECK needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cows_start_weight') THEN
        ALTER TABLE cattle.cows ADD CONSTRAINT chk_cows_start_weight CHECK (start_weight_kg >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cows_sale_weight') THEN
        ALTER TABLE cattle.cows ADD CONSTRAINT chk_cows_sale_weight CHECK (sale_weight_kg >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cows_carcase_weight') THEN
        ALTER TABLE cattle.cows ADD CONSTRAINT chk_cows_carcase_weight CHECK (carcase_weight_kg >= 0);
    END IF;
    -- NOTE: dress_pcnt and live_weight_shrink_pcnt CHECKs removed — legacy data has values outside 0-100
    -- Application layer should enforce BETWEEN 0 AND 100 for new records
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ration_dry_matter') THEN
        ALTER TABLE feed.rations ADD CONSTRAINT chk_ration_dry_matter CHECK (dry_matter_pcnt BETWEEN 0 AND 100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recipe_pcnt') THEN
        ALTER TABLE feed.ration_recipe_records ADD CONSTRAINT chk_recipe_pcnt CHECK (pcnt_of_ration BETWEEN 0 AND 100);
    END IF;
END
$$;


-- ████████████████████████████████████████████████████████████████
-- ██  ADDITIONAL PERFORMANCE INDEXES
-- ██  Partial indexes for common filtered queries
-- ████████████████████████████████████████████████████████████████

-- Partial: active cattle
CREATE INDEX IF NOT EXISTS idx_cattle_active
    ON cattle.cows (id) WHERE status = 'active';

-- Partial: off-feed cattle
CREATE INDEX IF NOT EXISTS idx_cattle_off_feed
    ON cattle.cows (id) WHERE off_feed = TRUE;

-- Partial: hospital cattle
CREATE INDEX IF NOT EXISTS idx_cattle_in_hospital
    ON cattle.cows (id) WHERE in_hospital = TRUE;

-- Partial: unapplied feed data
CREATE INDEX IF NOT EXISTS idx_penfeedsdata_unapplied
    ON feed.penfeedsdata (id, feed_date) WHERE applied_to_cattle = FALSE;

-- Partial: active withhold drugs
CREATE INDEX IF NOT EXISTS idx_drugs_given_active_withhold
    ON health.drugs_given (cow_id, date_given, withold_until) WHERE withold_until IS NOT NULL;

-- Partial: active commodity contracts
CREATE INDEX IF NOT EXISTS idx_commodcontracts_active
    ON commodity.commodcontracts (contract_no) WHERE contract_complete = FALSE;

-- Composite: common join/filter patterns
CREATE INDEX IF NOT EXISTS idx_costs_beast_date        ON finance.costs (beast_id, trans_date);
CREATE INDEX IF NOT EXISTS idx_costs_cow_date          ON finance.costs (cow_id, trans_date);
CREATE INDEX IF NOT EXISTS idx_costs_feed_beast_date   ON finance.costs_feed_detail (beast_id, date_fed);
CREATE INDEX IF NOT EXISTS idx_costs_feed_cow_date     ON finance.costs_feed_detail (cow_id, date_fed);
CREATE INDEX IF NOT EXISTS idx_penfeedsdata_pen_date   ON feed.penfeedsdata (pen_number_id, feed_date);
CREATE INDEX IF NOT EXISTS idx_sick_beast_beast_date   ON health.sick_beast_records (beast_id, date_diagnosed);
CREATE INDEX IF NOT EXISTS idx_sick_beast_cow_date     ON health.sick_beast_records (cow_id, date_diagnosed);
CREATE INDEX IF NOT EXISTS idx_penshistory_beast_date  ON pen.penshistory (beast_id, movedate);
CREATE INDEX IF NOT EXISTS idx_penshistory_cow_date    ON pen.penshistory (cow_id, movedate);
CREATE INDEX IF NOT EXISTS idx_weighing_beast_date     ON weighing.weighing_events (beast_id, weigh_date);
CREATE INDEX IF NOT EXISTS idx_weighing_cow_date       ON weighing.weighing_events (cow_id, weigh_date);
CREATE INDEX IF NOT EXISTS idx_drugs_given_beast_date  ON health.drugs_given (cow_id, date_given);
CREATE INDEX IF NOT EXISTS idx_commodtrans_code_date   ON commodity.commodtrans (commodity_code, trans_date);
CREATE INDEX IF NOT EXISTS idx_locchanges_beast_date   ON transport.location_changes (beast_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_locchanges_cow_date     ON transport.location_changes (cow_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_carcase_kill_date_sold  ON carcase.carcase_data (kill_date, sold_to_contact_id);

-- FK-covering indexes (missing from earlier sections)
CREATE INDEX IF NOT EXISTS idx_treatment_regime_disease ON health.treatment_regimes(disease_id);
CREATE INDEX IF NOT EXISTS idx_treatment_regime_drug    ON health.treatment_regimes(drug_id);
CREATE INDEX IF NOT EXISTS idx_inv_line_drug            ON health.drug_inventory_line_items(drug_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ration            ON feed.ration_recipe_records(ration_code);
CREATE INDEX IF NOT EXISTS idx_breeding_sire            ON breeding.beast_breeding(sire);
CREATE INDEX IF NOT EXISTS idx_breeding_dam             ON breeding.beast_breeding(dam);
CREATE INDEX IF NOT EXISTS idx_dockets_supplier         ON transport.deliverydockets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_commodcontracts_supplier ON commodity.commodcontracts(supplier_ac_no);
CREATE INDEX IF NOT EXISTS idx_rcti_vendor              ON finance.rcti_payment_grid(vendor_id);
CREATE INDEX IF NOT EXISTS idx_truckloads_ration        ON transport.truck_loads(ration_code);
CREATE INDEX IF NOT EXISTS idx_accumfeed_commodity      ON finance.beast_accumed_feed_by_commodity(commodity_code);

-- Date range indexes on cattle.cows (common WHERE/ORDER BY)
CREATE INDEX IF NOT EXISTS idx_cows_start_date          ON cattle.cows(start_date);
CREATE INDEX IF NOT EXISTS idx_cows_entry_date          ON cattle.cows(entry_date);
CREATE INDEX IF NOT EXISTS idx_cows_sale_date           ON cattle.cows(sale_date);
CREATE INDEX IF NOT EXISTS idx_cows_date_died           ON cattle.cows(date_died);

-- Partial: non-performer / custom-feeder flags
CREATE INDEX IF NOT EXISTS idx_cows_non_performer       ON cattle.cows(id) WHERE non_performer = TRUE;
CREATE INDEX IF NOT EXISTS idx_cows_custom_feeder       ON cattle.cows(id) WHERE custom_feeder = TRUE;


-- ████████████████████████████████████████████████████████████████
-- ██  MISSING TABLES (from optimized schema, needed for migration)
-- ██  Adapted to farm-v3 style (SERIAL PK, IF NOT EXISTS)
-- ████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS feed.feed_totals_by_ration (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER,
  beast_id            INTEGER,
  ration              TEXT,
  kgs_fed             NUMERIC(12,4),
  feed_cost           NUMERIC(12,4),
  units_dry_matter    NUMERIC(12,4),
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed.pen_data_from_feed_db (
  id                  SERIAL PRIMARY KEY,
  pen_number_id       INTEGER,
  pen_name            TEXT,
  mob_name            TEXT,
  numb_head           INTEGER,
  ration_name         TEXT,
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.custom_feed_charges (
  id                  SERIAL PRIMARY KEY,
  purch_lot_no        TEXT,
  ration              TEXT,
  sum_of_units        NUMERIC(12,4),
  avg_of_custom_feed_charge_ton NUMERIC(12,4),
  feed_charge         NUMERIC(12,4),
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.trading_costs_report (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER,
  beast_id            INTEGER,
  eid                 TEXT,
  group_name          TEXT,
  col1                NUMERIC(12,4),
  col2                NUMERIC(12,4),
  col3                NUMERIC(12,4),
  col4                NUMERIC(12,4),
  col5                NUMERIC(12,4),
  col6                NUMERIC(12,4),
  col7                NUMERIC(12,4),
  col8                NUMERIC(12,4),
  col9                NUMERIC(12,4),
  col10               NUMERIC(12,4),
  dress_weight        NUMERIC(12,4),
  doll_per_kg_dressed NUMERIC(12,4),
  ear_tag             TEXT,
  purch_lot_no        TEXT,
  fl_entry_date       TIMESTAMPTZ,
  fl_entry_wght       NUMERIC(12,4),
  dof                 INTEGER,
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.chemical_inventory_old (
  id                  SERIAL PRIMARY KEY,
  chemical_drug_id    INTEGER,
  purchase_date       TEXT,
  purchase_quantity   NUMERIC(12,4),
  units               TEXT,
  supplier            TEXT,
  batch_number        TEXT,
  expiry_date         TEXT,
  disposal_comment    TEXT,
  stocktake_date      TEXT,
  stocktake_qty       NUMERIC(12,4),
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.head_by_disease (
  id                  SERIAL PRIMARY KEY,
  body_system         TEXT,
  disease_name        TEXT,
  total_head          INTEGER,
  recovered           INTEGER,
  paddock             INTEGER,
  sold                INTEGER,
  died                INTEGER,
  treated_and_died    INTEGER,
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health.sick_by_dof (
  id                  SERIAL PRIMARY KEY,
  disease_id          INTEGER,
  pre_fl_entry        INTEGER,
  days_0_29           INTEGER,
  days_30_59          INTEGER,
  days_60_89          INTEGER,
  days_90_119         INTEGER,
  days_120_159        INTEGER,
  days_160_189        INTEGER,
  days_190_219        INTEGER,
  days_220_249        INTEGER,
  days_250_289        INTEGER,
  days_290_319        INTEGER,
  days_320_359        INTEGER,
  more_than360_days   INTEGER,
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pen.pen_mort_morb (
  id                  SERIAL PRIMARY KEY,
  pen_number          TEXT,
  dof                 INTEGER,
  purch_lot_no        TEXT,
  count_of_ear_tag    INTEGER,
  head_sick           INTEGER,
  head_died           INTEGER,
  entry_date          TEXT,
  head_days           INTEGER,
  feed_yesterday      NUMERIC(12,4),
  feed_last_3_days    NUMERIC(12,4),
  feed_last_7_days    NUMERIC(12,4),
  average_entry_weight NUMERIC(12,4),
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting.last_7_days_pulls (
  id                  SERIAL PRIMARY KEY,
  pen                 TEXT,
  head_at_start       INTEGER,
  head_n_days_ago     INTEGER,
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting.monthly_rv_agist_reconciliation (
  id                  SERIAL PRIMARY KEY,
  rec_id              INTEGER,
  month_end_date      TIMESTAMPTZ,
  seq_no              INTEGER,
  section_heading     TEXT,
  section_name        TEXT,
  head                INTEGER,
  prime_cost          NUMERIC(12,4),
  legacy_raw          JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ████████████████████████████████████████████████████████████████
-- ██  LEGACY MIGRATION COLUMNS
-- ██  Extra columns from optimized schema needed for data migration
-- ██  Added via ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotent)
-- ████████████████████████████████████████████████████████████████

ALTER TABLE breeding.beast_breeding ADD COLUMN IF NOT EXISTS birth_date DATE NULL;
ALTER TABLE breeding.beast_breeding ADD COLUMN IF NOT EXISTS birth_wght REAL NULL;
ALTER TABLE breeding.beast_breeding ADD COLUMN IF NOT EXISTS genetics SMALLINT NULL;
ALTER TABLE breeding.breeding_dams ADD COLUMN IF NOT EXISTS dam_supplier VARCHAR(50) NULL;
ALTER TABLE breeding.breeding_sires ADD COLUMN IF NOT EXISTS awa_sire_id VARCHAR(50) NULL;
ALTER TABLE breeding.breeding_sires ADD COLUMN IF NOT EXISTS sire_line_id SMALLINT NULL;
ALTER TABLE breeding.breeding_sires ADD COLUMN IF NOT EXISTS sire_supplier VARCHAR(50) NULL;
-- cattle.cows raw legacy mirror columns (also normalized to purchase_lot_id / status / pen_id)
ALTER TABLE cattle.cows ADD COLUMN IF NOT EXISTS purch_lot_no VARCHAR(20) NULL;
ALTER TABLE cattle.cows ADD COLUMN IF NOT EXISTS died BOOLEAN NULL;
ALTER TABLE cattle.cows ADD COLUMN IF NOT EXISTS pen_number VARCHAR(20) NULL;
ALTER TABLE health.drugs_given ADD COLUMN IF NOT EXISTS beastid INTEGER NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS abattoir_establishment_number INTEGER NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS carc_wght_left REAL NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS carc_wght_right REAL NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS doll_kg_deduction NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS eye_mscle_area REAL NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS meqausmrb SMALLINT NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS meqmsa SMALLINT NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS mscle_colour VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS mscle_score VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS price_doll_kg_left NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS price_doll_kg_right NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_data ADD COLUMN IF NOT EXISTS rcinvoice_date DATE NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ausmarbling SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS bodyno SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS boning_date DATE NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS chainno VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS coldgrader VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS cutcookalgorithmversionnumber VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS date_record_added DATE NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS dentition VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS dest VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ema SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS epbi VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS eqsref VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS failmisc VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS fatcolour VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS fatdistribution VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS feedtype VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS gradecode SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS gradedate DATE NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS grademethod SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS hangmethod VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS hgp VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS hidepullerdamage VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS hotgrader VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS humpcold SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS humphot SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS keyplantchainkillbody VARCHAR(20) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS killdate TIMESTAMPTZ NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS lefthscw REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS leftsidescanttime VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS lointemp REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS lot VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS meatcolour VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS mfv VARCHAR(1) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS msaindex REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS msamarbling SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS msavendordeccount SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS msavendordecserial VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS nlis VARCHAR(16) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS nodaysonfeed SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS nvdserial VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS nvdserialprefix VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS operator VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS opportunityindex REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ossificationcold SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ossificationhot SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ownerproducer VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS p8fat SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ph REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS plant VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS plantboneruntemplate VARCHAR(50) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS plantboningrun VARCHAR(5) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS processorindex REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS rfid VARCHAR(16) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS rib SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS ribfatcold SMALLINT NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS righthscw REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS rightsidescantime VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS rinse VARCHAR(1) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS saleyard VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS saleyardno VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS sex VARCHAR(2) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS species VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS totalhscw REAL NULL;
ALTER TABLE carcase.carcase_datatype2 ADD COLUMN IF NOT EXISTS vendorproducer VARCHAR(10) NULL;
ALTER TABLE carcase.carcase_grades ADD COLUMN IF NOT EXISTS effective_from_date DATE NULL;
ALTER TABLE carcase.carcase_grades ADD COLUMN IF NOT EXISTS price_doll_per_kg NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS from_date DATE;
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS qual_grade VARCHAR(5);
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS yg1_price NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS yg2_price NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS yg3_price NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS yg4_price NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_grades_us ADD COLUMN IF NOT EXISTS yg5_price NUMERIC(12,4) NULL;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col1 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col10 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col11 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col12 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col13 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col14 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col15 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col16 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col17 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col18 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col19 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col2 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col20 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col21 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col22 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col23 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col24 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col25 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col3 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col4 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col5 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col6 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col7 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col8 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS col9 TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS session_id INTEGER;
ALTER TABLE carcase.carcase_import_data ADD COLUMN IF NOT EXISTS warning TEXT;
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS kill_date_from DATE;
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS kill_date_to DATE;
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS live_or_carc_wght VARCHAR(1);
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS marbling_from REAL;
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS marbling_to REAL;
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS meat_colour_from VARCHAR(2);
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS meat_colour_to VARCHAR(2);
ALTER TABLE carcase.carcase_prices ADD COLUMN IF NOT EXISTS sold_to_id SMALLINT;
ALTER TABLE carcase.marbling_bonus ADD COLUMN IF NOT EXISTS pay_rate_bonus_per_carcase_kg NUMERIC(12,4) NULL;
ALTER TABLE cattle.agistment_transfer_register ADD COLUMN IF NOT EXISTS agistor_tail_tag VARCHAR(10) NULL;
ALTER TABLE cattle.agistment_transfer_register ADD COLUMN IF NOT EXISTS w_bridge_docket VARCHAR(6) NULL;
ALTER TABLE cattle.agistment_transfer_register ADD COLUMN IF NOT EXISTS weight_gain_dollarper_kg NUMERIC(12,4) NULL;
ALTER TABLE cattle.batch_update_log ADD COLUMN IF NOT EXISTS logtext TEXT NULL;
ALTER TABLE cattle.beast_movements ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE cattle.beast_movements ADD COLUMN IF NOT EXISTS movedate DATE NULL;
ALTER TABLE cattle.cattle_dof_dip ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE cattle.cattle_dof_dip ADD COLUMN IF NOT EXISTS date_calculated TIMESTAMPTZ;
ALTER TABLE cattle.cattle_photos ADD COLUMN IF NOT EXISTS beastid INTEGER NULL;
ALTER TABLE cattle.cattle_photos ADD COLUMN IF NOT EXISTS datelastupdated TIMESTAMPTZ NULL;
ALTER TABLE cattle.cattle_processed ADD COLUMN IF NOT EXISTS beastid INTEGER NULL;
ALTER TABLE cattle.cattle_processed ADD COLUMN IF NOT EXISTS draftgate SMALLINT NULL;
ALTER TABLE cattle.cattle_processed ADD COLUMN IF NOT EXISTS saveddate TIMESTAMPTZ NULL;
ALTER TABLE cattle.cattle_processed ADD COLUMN IF NOT EXISTS weighdate TIMESTAMPTZ NULL;
ALTER TABLE cattle.cull_reasons ADD COLUMN IF NOT EXISTS cull_reason VARCHAR(15) NULL;
ALTER TABLE cattle.cull_reasons ADD COLUMN IF NOT EXISTS cull_reason_id SMALLINT;
ALTER TABLE cattle.cull_reasons ADD COLUMN IF NOT EXISTS payrate_per_kg NUMERIC(12,4) NULL;
ALTER TABLE cattle.daily_cattle_inventory ADD COLUMN IF NOT EXISTS accum_month_head_days INTEGER NULL;
ALTER TABLE cattle.market_categories ADD COLUMN IF NOT EXISTS market_cat_id SMALLINT;
ALTER TABLE cattle.market_categories ADD COLUMN IF NOT EXISTS market_category VARCHAR(10);
ALTER TABLE cattle.market_categories ADD COLUMN IF NOT EXISTS predicted_dressing_pcnt REAL NULL;
ALTER TABLE cattle.new_cattle_records_log ADD COLUMN IF NOT EXISTS beastid INTEGER NULL;
ALTER TABLE cattle.new_cattle_records_log ADD COLUMN IF NOT EXISTS mod_ule VARCHAR(100) NULL;
ALTER TABLE cattle.new_cattle_records_log ADD COLUMN IF NOT EXISTS proceedure_name VARCHAR(50) NULL;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS doll_per_head_per_day NUMERIC(12,4);
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS location_code SMALLINT NULL;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day_oth TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day_pen1 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day_pen2 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day_pen3 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day_pen4 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_cost_per_hd_day_pen5 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_gross_value_oth TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_gross_value_pen1 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_gross_value_pen2 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_gross_value_pen3 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_gross_value_pen4 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_gross_value_pen5 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_head_oth TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_head_pen1 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_head_pen2 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_head_pen3 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_head_pen4 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS ohead_head_pen5 TEXT;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS period_from DATE;
ALTER TABLE cattle.overhead_application_history ADD COLUMN IF NOT EXISTS period_to DATE;
ALTER TABLE cattle.pen_list_snapshots ADD COLUMN IF NOT EXISTS beast_id INTEGER;
ALTER TABLE cattle.pen_list_snapshots ADD COLUMN IF NOT EXISTS pen TEXT;
ALTER TABLE cattle.pen_list_snapshots ADD COLUMN IF NOT EXISTS cow_id INTEGER;
ALTER TABLE cattle.purchase_lot_cattle ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE cattle.purchase_lot_cattle ADD COLUMN IF NOT EXISTS numb_head SMALLINT NULL;
ALTER TABLE cattle.purchase_lot_cattle ADD COLUMN IF NOT EXISTS price_cnts_per_kg NUMERIC(12,4) NULL;
ALTER TABLE cattle.purchase_lot_cattle ADD COLUMN IF NOT EXISTS vndr_decl_no VARCHAR(15) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS attachment_contract TEXT NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS attachment_cvd TEXT NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS end_date DATE NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS farmgateprice NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS frght_ton NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS kgs_delivered_since_given_date REAL NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS pay_suppliers_weight BOOLEAN DEFAULT FALSE;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS price_ton NUMERIC(12,4);
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS road_levy_ton NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS rtci_invoice BOOLEAN DEFAULT FALSE;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS specifications VARCHAR(30) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS start_date DATE NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS value_delivered_since_given_date NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS value_incr_per_month NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS vendor_dec VARCHAR(15) NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS wght_contracted REAL NULL;
ALTER TABLE commodity.commodcontracts ADD COLUMN IF NOT EXISTS wght_delivered REAL NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS commod_name VARCHAR(15);
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS description VARCHAR(20) NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS kgs_on_hand REAL NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS mth_open_kgs REAL NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS mth_open_value NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS nonstandard_commodity BOOLEAN NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS shortname VARCHAR(6) NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS superceeded BOOLEAN DEFAULT FALSE;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS tempering_litres_per_kg REAL NULL;
ALTER TABLE commodity.commodities ADD COLUMN IF NOT EXISTS value_on_hand NUMERIC(12,4) NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS call_weight REAL NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS commod_mast_kgs REAL NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS commod_mast_value NUMERIC(15,4) NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS ctr_id INTEGER;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS feed_load_record_no INTEGER NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS kgs REAL NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS month_end_process BOOLEAN DEFAULT FALSE;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS reason_code SMALLINT NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS ref_no VARCHAR(8);
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS staffid SMALLINT NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS tempered_weight_fed_kgs REAL NULL;
ALTER TABLE commodity.commodtrans ADD COLUMN IF NOT EXISTS value NUMERIC(15,4) NULL;
ALTER TABLE commodity.period_stocks_closing_balance ADD COLUMN IF NOT EXISTS commodity_name VARCHAR(15) NULL;
ALTER TABLE commodity.period_stocks_closing_balance ADD COLUMN IF NOT EXISTS stock_tons_weight REAL;
ALTER TABLE commodity.period_stocks_closing_balance ADD COLUMN IF NOT EXISTS stock_value NUMERIC(12,4);
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS acn VARCHAR(15) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS address VARCHAR(100) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS apply_feed_as_dm_kgs BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS currentnumberusers SMALLINT NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS data_collector_scales_type VARCHAR(30) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS date_db_last_updated TIMESTAMPTZ NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS date_last_feedtrans_compression TIMESTAMPTZ NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS dflt_wg_per_day REAL NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS digistar_datakey BOOLEAN NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS digistar_datalink BOOLEAN NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS key VARCHAR(20) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS last_ohead_application TIMESTAMPTZ NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS nsa_client BOOLEAN NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS nsa_cust_id VARCHAR(8) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS nsa_email VARCHAR(50) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS padd_tail_tag VARCHAR(10) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS password_complexity BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS rfid_space_removed BOOLEAN NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS scales_file_folder VARCHAR(100) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS titration_feeding BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS units_per_ton INTEGER NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS user_logon BOOLEAN NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS usertailtag VARCHAR(10) NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS v11_database BOOLEAN NULL;
ALTER TABLE contacts.company ADD COLUMN IF NOT EXISTS weight_units VARCHAR(4) NULL;
ALTER TABLE contacts.company_settings ADD COLUMN IF NOT EXISTS datecreated TIMESTAMPTZ NULL;
ALTER TABLE contacts.company_settings ADD COLUMN IF NOT EXISTS datemodified TIMESTAMPTZ NULL;
ALTER TABLE contacts.company_settings ADD COLUMN IF NOT EXISTS modulename VARCHAR(100);
ALTER TABLE contacts.company_settings ADD COLUMN IF NOT EXISTS settingname VARCHAR(100);
ALTER TABLE contacts.company_settings ADD COLUMN IF NOT EXISTS settingvalue VARCHAR(255) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS abattoir_establishment_number TEXT NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS agistment_feedlot_rate NUMERIC(12,4) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS agistment_paddock_rate NUMERIC(12,4) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS bank_ac VARCHAR(12) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS brand_drawing_filename VARCHAR(255) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS contact_type SMALLINT NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS days_invoice_due SMALLINT NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS fax_no VARCHAR(15) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS invoice_careof VARCHAR(50) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS salutation VARCHAR(5) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS tail_tag_no VARCHAR(10) NULL;
ALTER TABLE contacts.contacts ADD COLUMN IF NOT EXISTS tel_no VARCHAR(15) NULL;
ALTER TABLE contacts.contacttypes ADD COLUMN IF NOT EXISTS description VARCHAR(70) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS batchbox VARCHAR(3) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS c15 VARCHAR(6) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS call_wght INTEGER NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS commod_pen VARCHAR(6) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS date_format VARCHAR(1) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS done VARCHAR(1) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS driver_id SMALLINT NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS head_count INTEGER NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS ingred_pen VARCHAR(1) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS last_feed_for_pen VARCHAR(1) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS mix_time VARCHAR(6) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS time_done VARCHAR(5) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS trck_mill_loaded VARCHAR(1) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS truck VARCHAR(6) NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS truck_weight_now INTEGER NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS wght_delivered INTEGER NULL;
ALTER TABLE digistar.digistar_data_history ADD COLUMN IF NOT EXISTS zone VARCHAR(1) NULL;
ALTER TABLE digistar.digistar_users ADD COLUMN IF NOT EXISTS user_id SMALLINT NULL;
ALTER TABLE digistar.digistar_users ADD COLUMN IF NOT EXISTS username VARCHAR(30) NULL;
ALTER TABLE feed.bunk_code_desc ADD COLUMN IF NOT EXISTS bunk_code SMALLINT NULL;
ALTER TABLE feed.bunk_code_desc ADD COLUMN IF NOT EXISTS kgs_head_adj REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS avg_kgs_fed_today REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS bk_id INTEGER;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS bunk_reading VARCHAR(2) NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS date_checked DATE NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS early_bunk_reading VARCHAR(2) NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS early_bunk_reading2 VARCHAR(2) NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS feed_alloc REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS kgs_feed_remaining SMALLINT NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS mmec_incr_if_slick REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS mmec_kgs_head REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS mmec_maxfeed REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS mmec_ration REAL NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS mob_name VARCHAR(8) NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS no_head SMALLINT NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS notes VARCHAR(250) NULL;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS pf_kgs_head_change BOOLEAN DEFAULT FALSE;
ALTER TABLE feed.bunk_readings ADD COLUMN IF NOT EXISTS shovel_bunk BOOLEAN NULL;
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS date_applied TIMESTAMPTZ;
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS dollars_applied NUMERIC(12,4);
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS dollars_not_applied NUMERIC(12,4);
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS est_curr_wght NUMERIC(12,4);
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS head INTEGER;
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS head_expected INTEGER;
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS kgs_feed_as_fed NUMERIC(12,4);
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS kgs_not_applied NUMERIC(12,4);
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS pen_number TEXT;
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS ration_name TEXT;
ALTER TABLE feed.cattle_feed_updates ADD COLUMN IF NOT EXISTS run_number INTEGER;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS feed_date DATE NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS pen_number_id SMALLINT NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_code_feed1 SMALLINT NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_code_feed2 SMALLINT NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_code_feed3 SMALLINT NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_name_feed1 VARCHAR(8) NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_name_feed2 VARCHAR(8) NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_name_feed3 VARCHAR(8) NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_pcnt_feed1 REAL NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_pcnt_feed2 REAL NULL;
ALTER TABLE feed.dual_ration_feeding ADD COLUMN IF NOT EXISTS ration_pcnt_feed3 REAL NULL;
ALTER TABLE feed.feed_month_end_date ADD COLUMN IF NOT EXISTS current_monthend_date DATE NULL;
ALTER TABLE feed.feed_month_end_date ADD COLUMN IF NOT EXISTS current_monthstart_date DATE NULL;
ALTER TABLE feed.feeddb_pens_file ADD COLUMN IF NOT EXISTS current_exit_pen BOOLEAN NULL;
ALTER TABLE feed.feeddb_pens_file ADD COLUMN IF NOT EXISTS include_in_pen_list BOOLEAN NULL;
ALTER TABLE feed.feeddb_pens_file ADD COLUMN IF NOT EXISTS ispaddock BOOLEAN NULL;
ALTER TABLE feed.feeding_details ADD COLUMN IF NOT EXISTS bunk_codes_total SMALLINT NULL;
ALTER TABLE feed.feeding_details ADD COLUMN IF NOT EXISTS feeding_regimen_id SMALLINT NULL;
ALTER TABLE feed.feeding_details ADD COLUMN IF NOT EXISTS kgs_head_adj REAL NULL;
ALTER TABLE feed.feeding_details ADD COLUMN IF NOT EXISTS rec_id INTEGER;
ALTER TABLE feed.feeding_regimens ADD COLUMN IF NOT EXISTS accum_bunkcode_days SMALLINT NULL;
ALTER TABLE feed.feeding_regimens ADD COLUMN IF NOT EXISTS consump_per_head_from REAL NULL;
ALTER TABLE feed.feeding_regimens ADD COLUMN IF NOT EXISTS consump_per_head_to REAL NULL;
ALTER TABLE feed.feeding_regimens ADD COLUMN IF NOT EXISTS feeding_regimen_id SMALLINT NULL;
ALTER TABLE feed.feeding_regimens ADD COLUMN IF NOT EXISTS ration_type SMALLINT;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS first_pen_fed VARCHAR(10) NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS first_pen_fed_time TIMESTAMPTZ NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS last_pen_fed VARCHAR(10) NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS last_pen_fed_time TIMESTAMPTZ NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS ten_day_avg_end_time TIMESTAMPTZ NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS ten_day_avg_start_time TIMESTAMPTZ NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS tons_per_hour REAL NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS total_feeding_time TIMESTAMPTZ NULL;
ALTER TABLE feed.feeding_time_data ADD COLUMN IF NOT EXISTS total_tons_fed REAL NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS cycle VARCHAR(1) NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS first_pen_fed VARCHAR(10) NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS first_pen_feed_time VARCHAR(5) NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS last_pen_fed VARCHAR(10) NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS last_pen_feed_time VARCHAR(5) NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS numberpens INTEGER NULL;
ALTER TABLE feed.feeding_time_taken_by_ration_type ADD COLUMN IF NOT EXISTS sumofwght_delivered INTEGER NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS cattle_data_entry BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS cattle_deletes BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS cattle_lookup_tables BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS cattle_reports BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS cattle_utilities BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS feed_system_data_entry BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS feed_system_reports BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS feed_system_utilities BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS finish_date DATE NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS firstname VARCHAR(20) NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS job_desc VARCHAR(50) NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS password_hash VARCHAR(72) NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS password_last_changed_date TIMESTAMPTZ NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS pen_rider BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS pl_reports_allowed BOOLEAN NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS start_date DATE NULL;
ALTER TABLE feed.feedlot_staff ADD COLUMN IF NOT EXISTS surname VARCHAR(20);
ALTER TABLE feed.instrument_calibration_tests ADD COLUMN IF NOT EXISTS data_applied_to_instruments BOOLEAN NULL;
ALTER TABLE feed.instrument_calibration_tests ADD COLUMN IF NOT EXISTS instrument_name VARCHAR(30);
ALTER TABLE feed.instrument_calibration_tests ADD COLUMN IF NOT EXISTS test_date DATE;
ALTER TABLE feed.instrument_calibration_tests ADD COLUMN IF NOT EXISTS test_notes VARCHAR(100);
ALTER TABLE feed.instrument_calibration_tests ADD COLUMN IF NOT EXISTS testing_method VARCHAR(50);
ALTER TABLE feed.instruments_needing_calibration ADD COLUMN IF NOT EXISTS date_last_tested DATE;
ALTER TABLE feed.instruments_needing_calibration ADD COLUMN IF NOT EXISTS inactive BOOLEAN NULL;
ALTER TABLE feed.instruments_needing_calibration ADD COLUMN IF NOT EXISTS instrument_name VARCHAR(30);
ALTER TABLE feed.instruments_needing_calibration ADD COLUMN IF NOT EXISTS testing_frequency VARCHAR(10);
ALTER TABLE feed.instruments_needing_calibration ADD COLUMN IF NOT EXISTS testing_method VARCHAR(50) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS avg_current_wght REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS bunk_call REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS cp_percentage_dry REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS dry_matter_percent REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS effective_from_date DATE NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS feed_last_24_hrs REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS fourteen_day_avg REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS headcount SMALLINT NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS implanted VARCHAR(1) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS lot_number VARCHAR(12) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS me_mj_kg_dry REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS mktcat VARCHAR(10) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS mktsubcat VARCHAR(10) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS neg_dry REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS nem_dry REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS pen_name VARCHAR(10) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS ration_description VARCHAR(10) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS ration_id SMALLINT NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS ration_short_name VARCHAR(10) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS seven_day_avg REAL NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS sex VARCHAR(3) NULL;
ALTER TABLE feed.nsa_bunk_data ADD COLUMN IF NOT EXISTS thedate TIMESTAMPTZ;
ALTER TABLE feed.paddock_feeding ADD COLUMN IF NOT EXISTS beastid INTEGER NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS comments VARCHAR(100) NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS date_bunk_cleaned DATE NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS date_pen_cleaned DATE NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS date_water_cleaned DATE NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS days_between_cleaning SMALLINT NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS days_since_bunk_clean SMALLINT NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS days_since_pen_clean SMALLINT NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS days_since_water_cleaned SMALLINT NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS pen_ground_type VARCHAR(15) NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ADD COLUMN IF NOT EXISTS pen_type VARCHAR(15) NULL;
ALTER TABLE feed.pen_feeding_order_params ADD COLUMN IF NOT EXISTS extra_feed_pctallowed SMALLINT NULL;
ALTER TABLE feed.pen_feeding_order_params ADD COLUMN IF NOT EXISTS feed_system_b_trigger SMALLINT NULL;
ALTER TABLE feed.pen_feeding_order_params ADD COLUMN IF NOT EXISTS truck_size INTEGER NULL;
ALTER TABLE feed.pen_feeding_order_params ADD COLUMN IF NOT EXISTS truck_volume REAL NULL;
ALTER TABLE feed.pen_feeding_order_params ADD COLUMN IF NOT EXISTS truckname VARCHAR(6) NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS batch_number SMALLINT NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS call_wght REAL NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS feed_weight REAL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS load_numb_for_day SMALLINT;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS load_recid INTEGER;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS mob_name VARCHAR(8) NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS number_cattle SMALLINT;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS postpone_feed_application BOOLEAN NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS ration_value_per_ton NUMERIC(12,4) NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS system_user_id SMALLINT NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS time_fed VARCHAR(5) NULL;
ALTER TABLE feed.penfeedsdata ADD COLUMN IF NOT EXISTS truck_no VARCHAR(6);
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS beastsex VARCHAR(1);
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS bumpifslick_constant REAL NULL;
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS consumpt_avg_constant REAL NULL;
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS consumpt_max_constant REAL NULL;
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS minnem_constant REAL NULL;
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS minnem_power_raised REAL NULL;
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS rationcode SMALLINT;
ALTER TABLE feed.ration_calc_constants ADD COLUMN IF NOT EXISTS rationname VARCHAR(15);
-- feed.rations columns are all defined inline in CREATE TABLE above (unified ration master)
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS liquid_ration_component BOOLEAN NULL;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS loading_seq SMALLINT NULL;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS rec_id INTEGER;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS tolerance_kgs SMALLINT NULL;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS total_callweight_today_cycle1 REAL NULL;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS total_callweight_today_cycle2 REAL NULL;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS total_callweight_today_cycle3 REAL NULL;
ALTER TABLE feed.ration_recipe_records ADD COLUMN IF NOT EXISTS total_callweight_today_cycle4 REAL NULL;
ALTER TABLE feed.ration_regimes ADD COLUMN IF NOT EXISTS am_ration VARCHAR(10) NULL;
ALTER TABLE feed.ration_regimes ADD COLUMN IF NOT EXISTS am_ration_code SMALLINT NULL;
ALTER TABLE feed.ration_regimes ADD COLUMN IF NOT EXISTS feed_date DATE NULL;
ALTER TABLE feed.ration_regimes ADD COLUMN IF NOT EXISTS pm_ration VARCHAR(10) NULL;
ALTER TABLE feed.ration_regimes ADD COLUMN IF NOT EXISTS pm_ration_code SMALLINT NULL;
ALTER TABLE feed.ration_types ADD COLUMN IF NOT EXISTS group_name VARCHAR(15) NULL;
ALTER TABLE feed.ration_types ADD COLUMN IF NOT EXISTS notes VARCHAR(50) NULL;
ALTER TABLE feed.ration_types ADD COLUMN IF NOT EXISTS ration_type VARCHAR(15);
-- feed.rations OG-style columns (notes, valueperton, custom_feed_charge_ton) are inline in CREATE TABLE
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS adg_expected REAL NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS date_defined DATE NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS end_day_number SMALLINT;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_code_feed1 SMALLINT NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_code_feed2 SMALLINT NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_code_feed3 SMALLINT NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_code_feed4 SMALLINT NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_name_feed1 VARCHAR(10) NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_name_feed2 VARCHAR(10) NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_name_feed3 VARCHAR(10) NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_name_feed4 VARCHAR(10) NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_pcnt_feed1 REAL NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_pcnt_feed2 REAL NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_pcnt_feed3 REAL NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS ration_pcnt_feed4 REAL NULL;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS start_day_number SMALLINT;
ALTER TABLE feed.titration_ration_regimes ADD COLUMN IF NOT EXISTS titration_regime_name VARCHAR(15);
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS born_on_vend_prop BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS chem_res_restriction BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS endosulfan_date DATE NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS endosulfan_exposure BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS fed_animal_fats BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS owned_2_6_months BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS owned_6_12_months BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS owned_gt_12_months BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS owned_lt_2months BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS qa_program_details VARCHAR(50) NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS withholding_for_drugs BOOLEAN NULL;
ALTER TABLE feed.vendor_declarations ADD COLUMN IF NOT EXISTS withholding_for_feed BOOLEAN NULL;
ALTER TABLE finance.beast_accumed_feed_by_commodity ADD COLUMN IF NOT EXISTS accumed_cost NUMERIC(12,4);
ALTER TABLE finance.beast_accumed_feed_by_commodity ADD COLUMN IF NOT EXISTS accumed_custfeed_charge NUMERIC(12,4);
ALTER TABLE finance.beast_accumed_feed_by_commodity ADD COLUMN IF NOT EXISTS accumed_kgs REAL;
ALTER TABLE finance.beast_accumed_feed_by_commodity ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE finance.beast_accumed_feed_by_commodity ADD COLUMN IF NOT EXISTS date_last_updated DATE;
ALTER TABLE finance.cost_codes ADD COLUMN IF NOT EXISTS rev_exp VARCHAR(1);
ALTER TABLE finance.costs ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE finance.costs ADD COLUMN IF NOT EXISTS extended_revexp NUMERIC(12,4) NULL;
ALTER TABLE finance.costs ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE finance.costs ADD COLUMN IF NOT EXISTS rev_exp_per_unit NUMERIC(12,4) NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS custom_feed_charge_ton NUMERIC(12,4) NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS extended_revexp NUMERIC(12,4) NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS forced_application BOOLEAN NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS paddock_feed BOOLEAN DEFAULT FALSE;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS penwhenfed VARCHAR(10) NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS ration VARCHAR(10) NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS rev_exp_per_unit NUMERIC(12,4) NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS units REAL NULL;
ALTER TABLE finance.costs_feed_detail ADD COLUMN IF NOT EXISTS units_drymatter REAL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS agist_days_for_period INTEGER NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS agist_days_to_date INTEGER NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS cattle_owner_details VARCHAR(150) NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS cattle_owner_id SMALLINT NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS comments VARCHAR(100) NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS days_invoice_due SMALLINT NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS drugs_costs_in_period NUMERIC(12,4);
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS drugs_costs_to_date NUMERIC(12,4);
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS dry_kgs_feed_period REAL NULL;
ALTER TABLE finance.custfeed_lot_summary ADD COLUMN IF NOT EXISTS dry_kgs_feed_to_date REAL NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS group_no SMALLINT NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS intake_kgs INTEGER NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS month_end_date DATE NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS prime_cost NUMERIC(12,4) NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS rec_id INTEGER GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS section_name VARCHAR(30) NULL;
ALTER TABLE finance.monthly_fl_intake_cost ADD COLUMN IF NOT EXISTS seq_no SMALLINT NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS basicfeeding REAL NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS basicpackage REAL NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS countrycode SMALLINT;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS crushsideproc REAL NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS feedcommodssystem REAL NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS priceasatdate DATE NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS priceperthousandhead REAL NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS vetrecords REAL NULL;
ALTER TABLE finance.packagecosts ADD COLUMN IF NOT EXISTS vetreporting REAL NULL;
ALTER TABLE finance.price_adjustment_by_weight_range ADD COLUMN IF NOT EXISTS applied_to_cattle_pricing BOOLEAN NULL;
ALTER TABLE finance.price_adjustment_by_weight_range ADD COLUMN IF NOT EXISTS dollars_per_kg_adjustment NUMERIC(12,4) NULL;
ALTER TABLE finance.price_adjustment_by_weight_range ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE finance.price_adjustment_by_weight_range ADD COLUMN IF NOT EXISTS weight_from INTEGER NULL;
ALTER TABLE finance.price_adjustment_by_weight_range ADD COLUMN IF NOT EXISTS weight_to INTEGER NULL;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS criteria VARCHAR(20);
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS doll_per_kg_deductn NUMERIC(12,4) NULL;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS doll_per_kg_mrb_bonus NUMERIC(12,4) NULL;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS doll_per_kg_paid NUMERIC(12,4) NULL;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS mkt_catgry VARCHAR(20);
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS range_from VARCHAR(4) NULL;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS range_to VARCHAR(4) NULL;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS row_sequence SMALLINT;
ALTER TABLE finance.rcti_payment_grid ADD COLUMN IF NOT EXISTS sex VARCHAR(1);
ALTER TABLE finance.rv_rcti_data ADD COLUMN IF NOT EXISTS cost NUMERIC(12,4) NULL;
ALTER TABLE finance.rv_rcti_data ADD COLUMN IF NOT EXISTS cull_reason VARCHAR(20) NULL;
ALTER TABLE finance.rv_rcti_data ADD COLUMN IF NOT EXISTS head SMALLINT NULL;
ALTER TABLE finance.rv_rcti_data ADD COLUMN IF NOT EXISTS notes VARCHAR(50) NULL;
ALTER TABLE finance.rv_rcti_data ADD COLUMN IF NOT EXISTS weight REAL NULL;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS animal_grade VARCHAR(3) NULL;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS date_paid DATE NULL;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS date_purchased DATE NULL;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS payment_status VARCHAR(9) NULL;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS sale_yard_or_paddock TEXT NULL;
ALTER TABLE finance.tandr_buying_details ADD COLUMN IF NOT EXISTS sale_yard_pen VARCHAR(5) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS account_code VARCHAR(4) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS address VARCHAR(100) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS bank_ac_name VARCHAR(50) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS bank_ac_number VARCHAR(16) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS bank_bsb VARCHAR(10) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS company_name VARCHAR(50) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS default_days_invoice_due SMALLINT NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS fax_number VARCHAR(16) NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS gst_rate REAL NULL;
ALTER TABLE finance.tax_invoice_bank_details ADD COLUMN IF NOT EXISTS telephone VARCHAR(16) NULL;
ALTER TABLE finance.tr_payment_breed_adjust ADD COLUMN IF NOT EXISTS breedname VARCHAR(20) NULL;
ALTER TABLE finance.tr_payment_breed_adjust ADD COLUMN IF NOT EXISTS price_per_kg_adjust NUMERIC(12,4) NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS "0_to_2_teeth" REAL NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS "3_to_4_teeth" REAL NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS "5_to_8_teeth" REAL NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS valid_from_date DATE NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS vendor_bred_adjust REAL NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS wght_from SMALLINT NULL;
ALTER TABLE finance.tr_payment_rates ADD COLUMN IF NOT EXISTS wght_to SMALLINT NULL;
ALTER TABLE health.autopsy_records ADD COLUMN IF NOT EXISTS tarchea_fluid BOOLEAN DEFAULT FALSE;
ALTER TABLE health.chemical_inventory ADD COLUMN IF NOT EXISTS expirydate DATE NULL;
ALTER TABLE health.diseases ADD COLUMN IF NOT EXISTS bodysystemid SMALLINT NULL;
ALTER TABLE health.diseases ADD COLUMN IF NOT EXISTS disease_id SMALLINT UNIQUE;
DROP INDEX IF EXISTS health.idx_diseases_disease_id CASCADE;
CREATE UNIQUE INDEX idx_diseases_disease_id ON health.diseases(disease_id);
ALTER TABLE health.diseases ADD COLUMN IF NOT EXISTS disease_name VARCHAR(25);
ALTER TABLE health.diseases ADD COLUMN IF NOT EXISTS no_longer_used BOOLEAN DEFAULT FALSE;
ALTER TABLE health.diseases ADD COLUMN IF NOT EXISTS penapp_disease_name VARCHAR(25) NULL;
ALTER TABLE health.drug_disposals ADD COLUMN IF NOT EXISTS date_disposed DATE;
ALTER TABLE health.drug_disposals ADD COLUMN IF NOT EXISTS disposal_id INTEGER GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE health.drug_disposals ADD COLUMN IF NOT EXISTS drugid INTEGER NULL;
ALTER TABLE health.drug_disposals ADD COLUMN IF NOT EXISTS number_disposed REAL NULL;
ALTER TABLE health.drug_inventory_line_items ADD COLUMN IF NOT EXISTS boxbottles_onhand REAL NULL;
ALTER TABLE health.drug_inventory_line_items ADD COLUMN IF NOT EXISTS drugid SMALLINT NULL;
ALTER TABLE health.drug_inventory_line_items ADD COLUMN IF NOT EXISTS units_per_boxorbottle INTEGER NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS antibiotic BOOLEAN NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS current_batch_numb VARCHAR(15) NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS drug_id SMALLINT UNIQUE;
DROP INDEX IF EXISTS health.idx_drugs_drug_id CASCADE;
CREATE UNIQUE INDEX idx_drugs_drug_id ON health.drugs(drug_id);
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS drug_name VARCHAR(50);
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS hgp BOOLEAN NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS inactive BOOLEAN NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS reorder_soh_units_trigger INTEGER NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS units VARCHAR(10) NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS units_per_boxorbottle INTEGER NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS withhold_days_1 SMALLINT NULL;
ALTER TABLE health.drugs ADD COLUMN IF NOT EXISTS withhold_days_esi SMALLINT NULL;
-- health.drugs_given.beast_id is defined inline in CREATE TABLE
ALTER TABLE health.drugs_given ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE health.drugs_purchased ADD COLUMN IF NOT EXISTS drugid SMALLINT NULL;
ALTER TABLE health.mort_morb_triggers ADD COLUMN IF NOT EXISTS tablename VARCHAR(10);
ALTER TABLE health.sick_beast_records ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE health.sick_beast_temperatures ADD COLUMN IF NOT EXISTS beastid INTEGER NULL;
ALTER TABLE health.treatment_regimes ADD COLUMN IF NOT EXISTS day_numb SMALLINT NULL;
ALTER TABLE health.treatment_regimes ADD COLUMN IF NOT EXISTS diseaseid SMALLINT NULL;
ALTER TABLE health.treatment_regimes ADD COLUMN IF NOT EXISTS dosebyweight BOOLEAN NULL;
ALTER TABLE health.treatment_regimes ADD COLUMN IF NOT EXISTS drug_name VARCHAR(20) NULL;
ALTER TABLE operations.archiving_log ADD COLUMN IF NOT EXISTS date_done DATE NULL;
ALTER TABLE operations.archiving_log ADD COLUMN IF NOT EXISTS record_selection TEXT NULL;
ALTER TABLE operations.archiving_log ADD COLUMN IF NOT EXISTS reverse_archive BOOLEAN NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS bunk_volume REAL NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS changedate TIMESTAMPTZ NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS changetype CHAR(15) NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS date_last_cleaned DATE NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS dateenteredfeedlot TIMESTAMPTZ NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS excel_cell VARCHAR(5) NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS exclude_from_feed_generation BOOLEAN NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS expected_wg_day REAL NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS feeding_system SMALLINT NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS inc_in_plateau_feed BOOLEAN DEFAULT FALSE;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS ispaddock BOOLEAN NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS kgs_head REAL NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS logid INTEGER;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS mob_name VARCHAR(8) NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS numb_head SMALLINT;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS pen_name VARCHAR(10);
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS ration_code INTEGER NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS ration_code_pm SMALLINT NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS titration_regime VARCHAR(15) NULL;
ALTER TABLE pen.log_pens_file ADD COLUMN IF NOT EXISTS titration_regime_start_date TIMESTAMPTZ NULL;
ALTER TABLE pen.pen_cleaning_dates ADD COLUMN IF NOT EXISTS date_cleaned DATE;
ALTER TABLE pen.pen_cleaning_dates ADD COLUMN IF NOT EXISTS pen_name VARCHAR(10);
ALTER TABLE pen.pen_print_order ADD COLUMN IF NOT EXISTS pen_name VARCHAR(10) NULL;
ALTER TABLE pen.pen_print_order ADD COLUMN IF NOT EXISTS printorder SMALLINT NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_121_200_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_121_200_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_46_120_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_46_120_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_gt_200_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_gt_200_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_le_45_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_le_45_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_total_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS death_alloc_total_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_121_200_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_121_200_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_46_120_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_46_120_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_gt_200_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_gt_200_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_le_45_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_le_45_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_total_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS pulls_totals_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_121_200_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_121_200_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_46_120_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_46_120_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_gt_200_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_gt_200_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_lt_45_dof_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_pcnt_lt_45_dof_to INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_totals_from INTEGER NULL;
ALTER TABLE pen.pen_rider_tolerances ADD COLUMN IF NOT EXISTS treat_success_totals_to INTEGER NULL;
ALTER TABLE pen.penlaneorder ADD COLUMN IF NOT EXISTS laneorder SMALLINT NULL;
ALTER TABLE pen.penlaneorder ADD COLUMN IF NOT EXISTS pen_name VARCHAR(10);
ALTER TABLE pen.penlaneorder ADD COLUMN IF NOT EXISTS zone_number SMALLINT NULL;
-- pen.pens_file ALTER block removed: table merged into pen.pens (all columns
-- declared inline in the unified CREATE TABLE pen.pens above).
ALTER TABLE pen.pensfed ADD COLUMN IF NOT EXISTS feed_date DATE;
ALTER TABLE pen.pensfed ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE pen.penshistory ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE pen.penshistory ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE pen.penshistory ADD COLUMN IF NOT EXISTS pen VARCHAR(10);
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS agent VARCHAR(30) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS agist_rate_per_day NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS agistor_code SMALLINT NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS applied_to_cattle_file BOOLEAN DEFAULT FALSE;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS buyer VARCHAR(30) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS buyer_commiss_per_head REAL NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS buying_fee NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS cattle_freight_cost NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS cost_of_cattle NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS custom_feed_lot BOOLEAN DEFAULT FALSE;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS date_cattle_inv_approved DATE NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS date_frght_inv_approved DATE NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS feed_charge_per_ton NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS finance_rate VARCHAR(10) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS growergroupcode SMALLINT NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS is_financed BOOLEAN DEFAULT FALSE;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS lot_notes TEXT NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS marbling_bonus_lot BOOLEAN NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS number_head SMALLINT NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS nvd_scan_filename VARCHAR(255) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS optional_scan_filename1 VARCHAR(255) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS optional_scan_filename2 VARCHAR(255) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS other_buying_costs NUMERIC(12,4) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS purchase_region SMALLINT NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS risk_factor SMALLINT NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS total_weight REAL NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS wbridge_docket VARCHAR(6) NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS weigh_bridge_weight REAL NULL;
ALTER TABLE purchasing.purchase_lots ADD COLUMN IF NOT EXISTS weigh_ticket_scan_filename VARCHAR(255) NULL;
ALTER TABLE purchasing.purchase_totals ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE purchasing.purchase_totals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE purchasing.purchase_totals ADD COLUMN IF NOT EXISTS tail_tag VARCHAR(10);
ALTER TABLE reporting.month_end_stockonhand ADD COLUMN IF NOT EXISTS month_end_date DATE;
ALTER TABLE reporting.month_end_stockonhand ADD COLUMN IF NOT EXISTS soh_feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.month_end_stockonhand ADD COLUMN IF NOT EXISTS soh_head INTEGER NULL;
ALTER TABLE reporting.month_end_stockonhand ADD COLUMN IF NOT EXISTS soh_oheads_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.month_end_stockonhand ADD COLUMN IF NOT EXISTS soh_prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.month_end_stockonhand ADD COLUMN IF NOT EXISTS total_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_adjustment_ob ADD COLUMN IF NOT EXISTS feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_adjustment_ob ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE reporting.monthly_adjustment_ob ADD COLUMN IF NOT EXISTS month_end_date DATE;
ALTER TABLE reporting.monthly_adjustment_ob ADD COLUMN IF NOT EXISTS other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_adjustment_ob ADD COLUMN IF NOT EXISTS prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_agistor_movements ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE reporting.monthly_agistor_movements ADD COLUMN IF NOT EXISTS month_end_date DATE NULL;
ALTER TABLE reporting.monthly_agistor_movements ADD COLUMN IF NOT EXISTS prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_agistor_movements ADD COLUMN IF NOT EXISTS rec_id INTEGER GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE reporting.monthly_agistor_movements ADD COLUMN IF NOT EXISTS section_name VARCHAR(30) NULL;
ALTER TABLE reporting.monthly_agistor_movements ADD COLUMN IF NOT EXISTS seq_no SMALLINT NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS agist_feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS agist_head INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS agist_kgs INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS agist_other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS agist_prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS culls_feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS culls_head INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS culls_kgs INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS culls_other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS culls_prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS cust_feedlot_feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS cust_feedlot_head INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS cust_feedlot_kgs INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS cust_feedlot_other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS cust_feedlot_prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS feed_lot_feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS feed_lot_head INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS feed_lot_other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS feed_lot_prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS feedlot_kgs INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS month_end_date DATE NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS rec_id INTEGER GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS rv_agist_feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS rv_agist_head INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS rv_agist_kgs INTEGER NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS rv_agist_other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS rv_agist_prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS section_name VARCHAR(30) NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS section_seq_number SMALLINT NULL;
ALTER TABLE reporting.monthly_movements ADD COLUMN IF NOT EXISTS sub_section VARCHAR(30) NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS feed_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS month_end_date DATE NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS other_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS prime_cost NUMERIC(12,4) NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS rec_id INTEGER GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS section_heading VARCHAR(30) NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS section_name VARCHAR(30) NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS seq_no SMALLINT NULL;
ALTER TABLE reporting.monthly_reconciliation ADD COLUMN IF NOT EXISTS total_costs NUMERIC(12,4) NULL;
ALTER TABLE reporting.mrb_avg_supplier_years ADD COLUMN IF NOT EXISTS mrb_avg_yr1 REAL NULL;
ALTER TABLE reporting.mrb_avg_supplier_years ADD COLUMN IF NOT EXISTS mrb_avg_yr2 REAL NULL;
ALTER TABLE reporting.mrb_avg_supplier_years ADD COLUMN IF NOT EXISTS mrb_avg_yr3 REAL NULL;
ALTER TABLE reporting.mrb_avg_supplier_years ADD COLUMN IF NOT EXISTS mrb_avg_yr4 REAL NULL;
ALTER TABLE reporting.mrb_avg_supplier_years ADD COLUMN IF NOT EXISTS supplier VARCHAR(25) NULL;
ALTER TABLE reporting.soh_by_month ADD COLUMN IF NOT EXISTS head INTEGER NULL;
ALTER TABLE reporting.soh_by_month ADD COLUMN IF NOT EXISTS mnth_yyy_ymmm VARCHAR(10) NULL;
ALTER TABLE system.code_references_index ADD COLUMN IF NOT EXISTS database_table VARCHAR(40) NULL;
ALTER TABLE system.code_references_index ADD COLUMN IF NOT EXISTS field_name VARCHAR(30) NULL;
ALTER TABLE system.code_references_index ADD COLUMN IF NOT EXISTS lookup_table_name VARCHAR(25) NULL;
ALTER TABLE system.code_references_index ADD COLUMN IF NOT EXISTS lut_code_fieldname VARCHAR(25) NULL;
ALTER TABLE system.code_references_index ADD COLUMN IF NOT EXISTS lut_descriptive_fieldname VARCHAR(25) NULL;
ALTER TABLE system.database_flags ADD COLUMN IF NOT EXISTS pens_file_is_open CHAR(1) NULL;
ALTER TABLE system.error_log ADD COLUMN IF NOT EXISTS e_value SMALLINT NULL;
ALTER TABLE system.error_log ADD COLUMN IF NOT EXISTS error_code INTEGER NULL;
ALTER TABLE system.error_log ADD COLUMN IF NOT EXISTS mod_ule VARCHAR(100) NULL;
ALTER TABLE system.error_log ADD COLUMN IF NOT EXISTS proceedure_name VARCHAR(50) NULL;
ALTER TABLE system.error_log ADD COLUMN IF NOT EXISTS user_number SMALLINT NULL;
ALTER TABLE system.lookups ADD COLUMN IF NOT EXISTS description TEXT NULL;
ALTER TABLE system.lookups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE system.mmec_table ADD COLUMN IF NOT EXISTS bump_if_slick REAL NULL;
ALTER TABLE system.mmec_table ADD COLUMN IF NOT EXISTS dof INTEGER NULL;
ALTER TABLE system.mmec_table ADD COLUMN IF NOT EXISTS max_multiplier REAL NULL;
ALTER TABLE system.mmec_table ADD COLUMN IF NOT EXISTS target_multiplier REAL NULL;
ALTER TABLE system.rv_scheduled_dof ADD COLUMN IF NOT EXISTS dof SMALLINT;
ALTER TABLE system.system_info ADD COLUMN IF NOT EXISTS date_design_last_updated DATE NULL;
ALTER TABLE system.transaction_types ADD COLUMN IF NOT EXISTS trans_type_long VARCHAR(15);
ALTER TABLE system.transaction_types ADD COLUMN IF NOT EXISTS trans_type_short VARCHAR(1);
ALTER TABLE system.user_log_ons ADD COLUMN IF NOT EXISTS term_inal VARCHAR(50) NULL;
ALTER TABLE transport.datakey_truck_allocation ADD COLUMN IF NOT EXISTS allocate_to_datakey_number SMALLINT NULL;
ALTER TABLE transport.datakey_truck_allocation ADD COLUMN IF NOT EXISTS feed_cycle_no SMALLINT NULL;
ALTER TABLE transport.datakey_truck_allocation ADD COLUMN IF NOT EXISTS load_number SMALLINT NULL;
ALTER TABLE transport.datakey_truck_allocation ADD COLUMN IF NOT EXISTS ration_name VARCHAR(15) NULL;
ALTER TABLE transport.datakey_truck_allocation ADD COLUMN IF NOT EXISTS truck_load_weight REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS applied_to_feed_system BOOLEAN DEFAULT FALSE;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS attachment TEXT NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS carrier VARCHAR(15) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS carrier_code INTEGER NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS contract_no VARCHAR(10) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS contract_value_per_ton NUMERIC(12,4) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS discount_value_per_ton NUMERIC(12,4) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS dm_pcnt REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS docket_number INTEGER;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS docket_time VARCHAR(5) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS docketnotes TEXT NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS drivername VARCHAR(15) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS exit_date DATE NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS exit_time VARCHAR(5) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS field_name VARCHAR(20) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS freight_cost NUMERIC(12,4) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS freight_per_ton NUMERIC(12,4) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS gross_wght REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS grower VARCHAR(15) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS invoice_paid BOOLEAN NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS load_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS load_value NUMERIC(12,4) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS moisture REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS no_of_bales REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS non_standard_commodity BOOLEAN DEFAULT FALSE;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS payment_wght REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS prch_or_sale SMALLINT;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS protein REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS rcti_freight_invoice_done BOOLEAN NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS rcti_freight_invoice_paid BOOLEAN NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS risk_category SMALLINT NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS road_levy_per_ton NUMERIC(12,4) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS rtci_invoice_done BOOLEAN DEFAULT FALSE;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS screenings REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS silo_used VARCHAR(10) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS staffid SMALLINT NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS tare_wght REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS test_wght_kgs REAL NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(7) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS vendor_dec VARCHAR(15) NULL;
ALTER TABLE transport.deliverydockets ADD COLUMN IF NOT EXISTS weighunits BOOLEAN NULL;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS authorised_by VARCHAR(5) NULL;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS commodity_code SMALLINT NULL;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS docket_no INTEGER;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS rate_per_ton NUMERIC(12,4) NULL;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS reason_code SMALLINT;
ALTER TABLE transport.loaddockages ADD COLUMN IF NOT EXISTS tons REAL NULL;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS eid VARCHAR(16) NULL;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS new_animal BOOLEAN NULL;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS program_id SMALLINT NULL;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS sent_to_oracle BOOLEAN NULL;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS sent_to_oracle_date TIMESTAMPTZ NULL;
ALTER TABLE transport.location_changes ADD COLUMN IF NOT EXISTS slaughtered BOOLEAN NULL;
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS applied_to_storage_totals BOOLEAN DEFAULT FALSE;
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS comments VARCHAR(50) NULL;
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS commodity VARCHAR(20);
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS delivery_docket_number VARCHAR(10) NULL;
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS trans_date DATE;
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS trans_tons REAL NULL;
ALTER TABLE transport.location_transactions ADD COLUMN IF NOT EXISTS trans_value NUMERIC(12,4) NULL;
ALTER TABLE transport.locations ADD COLUMN IF NOT EXISTS commodity VARCHAR(20) NULL;
ALTER TABLE transport.locations ADD COLUMN IF NOT EXISTS id SMALLINT;
ALTER TABLE transport.locations ADD COLUMN IF NOT EXISTS tons_stored REAL NULL;
ALTER TABLE transport.locations ADD COLUMN IF NOT EXISTS value_stored NUMERIC(12,4) NULL;
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS from_location VARCHAR(20);
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS load_date DATE;
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS manure_type VARCHAR(15) NULL;
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS number_of_loads SMALLINT;
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS operator VARCHAR(15) NULL;
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS to_location VARCHAR(20);
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS tons_nett_weight REAL;
ALTER TABLE transport.manure_carting ADD COLUMN IF NOT EXISTS truck_name VARCHAR(10) NULL;
ALTER TABLE transport.manure_locations ADD COLUMN IF NOT EXISTS from_location VARCHAR(20) NULL;
ALTER TABLE transport.manure_locations ADD COLUMN IF NOT EXISTS to_location VARCHAR(20) NULL;
ALTER TABLE transport.truck_load_variation_data ADD COLUMN IF NOT EXISTS actual_weight REAL NULL;
ALTER TABLE transport.truck_load_variation_data ADD COLUMN IF NOT EXISTS commodity_name VARCHAR(15) NULL;
ALTER TABLE transport.truck_load_variation_data ADD COLUMN IF NOT EXISTS target_weight REAL NULL;
ALTER TABLE transport.truck_load_variation_data ADD COLUMN IF NOT EXISTS truck_load_recid INTEGER NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS applied_to_cattle BOOLEAN DEFAULT FALSE;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS batch_number SMALLINT NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS batchbox VARCHAR(3) NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS driver_id SMALLINT NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS load_numb_for_day SMALLINT;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS load_recid INTEGER;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS load_time VARCHAR(5) NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS loader_id SMALLINT NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS ration_dm_pcnt REAL NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS staffid SMALLINT NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS target_load_weight REAL NULL;
ALTER TABLE transport.truck_loads ADD COLUMN IF NOT EXISTS truck_no VARCHAR(6);
ALTER TABLE transport.truck_names ADD COLUMN IF NOT EXISTS last_feedout_rec INTEGER NULL;
ALTER TABLE transport.truck_names ADD COLUMN IF NOT EXISTS last_loadout_rec INTEGER NULL;
ALTER TABLE transport.truck_names ADD COLUMN IF NOT EXISTS max_kgs_load_value INTEGER NULL;
ALTER TABLE transport.truck_names ADD COLUMN IF NOT EXISTS truck_number SMALLINT;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS comod_or_pen VARCHAR(2);
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS load_date DATE;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS load_number_for_day SMALLINT NULL;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS new_name VARCHAR(25) NULL;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS new_weight REAL NULL;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS old_name VARCHAR(25) NULL;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS old_weight REAL NULL;
ALTER TABLE transport.truckloadchangeslog ADD COLUMN IF NOT EXISTS truck_name VARCHAR(6) NULL;
ALTER TABLE transport.wbridgecomport ADD COLUMN IF NOT EXISTS baudrate VARCHAR(12) NULL;
ALTER TABLE transport.wbridgecomport ADD COLUMN IF NOT EXISTS comport VARCHAR(6) NULL;
ALTER TABLE transport.wbridgecomport ADD COLUMN IF NOT EXISTS scaletype VARCHAR(20) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS animal_welfare BOOLEAN NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS carrierid INTEGER NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS description VARCHAR(50) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS docket_date DATE NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS docket_time VARCHAR(8) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS docket_type INTEGER NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS docketid INTEGER;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS driver_name VARCHAR(30) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS exit_date DATE NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS exit_time VARCHAR(8) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS nvd_no VARCHAR(15) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS origin_destinationid INTEGER NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS purch_lot_no VARCHAR(15) NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS shrink_percent REAL NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS weighpersonid INTEGER NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS weighunits VARCHAR(5) NULL;
ALTER TABLE weighing.weighing_events ADD COLUMN IF NOT EXISTS beastid INTEGER;
ALTER TABLE weighing.weighing_events ADD COLUMN IF NOT EXISTS last_modified_timestamp TIMESTAMPTZ NULL;
ALTER TABLE weighing.weighing_events ADD COLUMN IF NOT EXISTS timeweighed VARCHAR(8) NULL;
ALTER TABLE weighing.weighing_events ADD COLUMN IF NOT EXISTS weigh_note VARCHAR(20) NULL;
ALTER TABLE weighing.weighing_types ADD COLUMN IF NOT EXISTS weighing_desc TEXT NULL;
ALTER TABLE weighing.weighing_types ADD COLUMN IF NOT EXISTS weighing_type VARCHAR(20);
ALTER TABLE weighing.weighing_types ADD COLUMN IF NOT EXISTS weighing_type_id SMALLINT;

-- Relax NOT NULL on farm-v3 columns that legacy mappings do not populate
ALTER TABLE feed.feeddb_pens_file ALTER COLUMN pen_number_id DROP NOT NULL;
ALTER TABLE health.diseases ALTER COLUMN name DROP NOT NULL;
ALTER TABLE health.drugs ALTER COLUMN name DROP NOT NULL;
ALTER TABLE cattle.market_categories ALTER COLUMN name DROP NOT NULL;
ALTER TABLE cattle.cull_reasons ALTER COLUMN code DROP NOT NULL;
ALTER TABLE carcase.carcase_grades ALTER COLUMN code DROP NOT NULL;
ALTER TABLE carcase.carcase_grades_us ALTER COLUMN grade_code DROP NOT NULL;
ALTER TABLE system.code_references_index ALTER COLUMN code DROP NOT NULL;
ALTER TABLE commodity.commodities ALTER COLUMN commodity_name DROP NOT NULL;
-- feed.rations.name column no longer exists (consolidated to ration_name)
ALTER TABLE weighing.weighing_types ALTER COLUMN name DROP NOT NULL;
ALTER TABLE feed.bunk_code_desc ALTER COLUMN code DROP NOT NULL;
ALTER TABLE feed.feed_month_end_date ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE system.mmec_table ALTER COLUMN mmec_code DROP NOT NULL;
ALTER TABLE contacts.company_settings ALTER COLUMN setting_key DROP NOT NULL;
ALTER TABLE health.mort_morb_triggers ALTER COLUMN table_name DROP NOT NULL;
ALTER TABLE feed.ration_calc_constants ALTER COLUMN constant DROP NOT NULL;
ALTER TABLE digistar.digistar_users ALTER COLUMN user_name DROP NOT NULL;
ALTER TABLE health.drug_inventory_line_items ALTER COLUMN record_type DROP NOT NULL;
ALTER TABLE health.drug_inventory_events ALTER COLUMN event_type DROP NOT NULL;
ALTER TABLE feed.instrument_calibration_tests ALTER COLUMN calibration_date DROP NOT NULL;
ALTER TABLE feed.instruments_needing_calibration ALTER COLUMN instrument_type DROP NOT NULL;
ALTER TABLE weighing.livestock_weighbridge_dockets ALTER COLUMN weigh_date DROP NOT NULL;
ALTER TABLE commodity.period_stocks_closing_balance ALTER COLUMN period_end_date DROP NOT NULL;
ALTER TABLE feed.pen_and_bunk_cleaning ALTER COLUMN event_date DROP NOT NULL;
ALTER TABLE feed.feeding_details ALTER COLUMN feed_date DROP NOT NULL;
ALTER TABLE system.system_info ALTER COLUMN info_key DROP NOT NULL;
ALTER TABLE system.database_flags ALTER COLUMN flag_name DROP NOT NULL;
ALTER TABLE cattle.cows ALTER COLUMN ear_tag DROP NOT NULL;
ALTER TABLE feed.cattle_feed_updates ALTER COLUMN pen_feeds_data_id DROP NOT NULL;
ALTER TABLE pen.pensfed ALTER COLUMN feeddate DROP NOT NULL;
ALTER TABLE feed.bunk_readings ALTER COLUMN observation_date DROP NOT NULL;
ALTER TABLE feed.ration_regimes ALTER COLUMN date_started DROP NOT NULL;
ALTER TABLE pen.pen_cleaning_dates ALTER COLUMN clean_date DROP NOT NULL;
ALTER TABLE transport.location_transactions ALTER COLUMN movement_date DROP NOT NULL;
ALTER TABLE transport.manure_carting ALTER COLUMN cart_date DROP NOT NULL;
ALTER TABLE operations.archiving_log ALTER COLUMN archive_date DROP NOT NULL;
ALTER TABLE reporting.month_end_stockonhand ALTER COLUMN period_date DROP NOT NULL;
ALTER TABLE reporting.monthly_adjustment_ob ALTER COLUMN adj_date DROP NOT NULL;
ALTER TABLE reporting.monthly_agistor_movements ALTER COLUMN period_date DROP NOT NULL;
ALTER TABLE reporting.monthly_reconciliation ALTER COLUMN period_date DROP NOT NULL;
ALTER TABLE reporting.monthly_movements ALTER COLUMN period_date DROP NOT NULL;
ALTER TABLE cattle.pen_list_snapshots ALTER COLUMN snapshot_date DROP NOT NULL;
ALTER TABLE reporting.soh_by_month ALTER COLUMN yr_mnth DROP NOT NULL;

-- ████████████████████████████████████████████████████████████████
-- ██  FOREIGN KEY CONSTRAINTS (cross-schema)
-- ██  Deferred to after all tables exist
-- ██  Wrapped in DO block for idempotency (ADD CONSTRAINT has no IF NOT EXISTS)
-- ████████████████████████████████████████████████████████████████

DO $$
DECLARE
    _fk RECORD;
    _fks TEXT[][] := ARRAY[
        -- cattle → pen, purchasing, contacts
        ARRAY['fk_map_paddocks_pen',      'ALTER TABLE map.paddocks ADD CONSTRAINT fk_map_paddocks_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_cows_pen',              'ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_cows_purchase_lot',     'ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_purchase_lot FOREIGN KEY (purchase_lot_id) REFERENCES purchasing.purchase_lots(id) ON DELETE SET NULL'],
        ARRAY['fk_cows_program_id',       'ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_program_id FOREIGN KEY (program_id) REFERENCES cattle.cattle_program_types(id) ON DELETE SET NULL'],
        ARRAY['fk_cows_vendor',           'ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_vendor FOREIGN KEY (vendor_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_cows_agent',            'ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_agent FOREIGN KEY (agent_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_cows_custom_feed_owner','ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_custom_feed_owner FOREIGN KEY (custom_feed_owner_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        -- cattle sub-tables → contacts, feed
        ARRAY['fk_agistment_agistor',     'ALTER TABLE cattle.agistment_transfer_register ADD CONSTRAINT fk_agistment_agistor FOREIGN KEY (agistor_code) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_new_cattle_log_user',   'ALTER TABLE cattle.new_cattle_records_log ADD CONSTRAINT fk_new_cattle_log_user FOREIGN KEY (user_number) REFERENCES feed.feedlot_staff(user_id) ON DELETE SET NULL'],
        -- health → cattle, contacts, feed
        ARRAY['fk_sick_beast_cow',        'ALTER TABLE health.sick_beast_records ADD CONSTRAINT fk_sick_beast_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_sick_beast_cattle',     'ALTER TABLE health.sick_beast_records ADD CONSTRAINT fk_sick_beast_cattle FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_sick_beast_disease',    'ALTER TABLE health.sick_beast_records ADD CONSTRAINT fk_sick_beast_disease FOREIGN KEY (disease_id) REFERENCES health.diseases(disease_id) ON DELETE SET NULL'],
        ARRAY['fk_sick_beast_diagnoser',  'ALTER TABLE health.sick_beast_records ADD CONSTRAINT fk_sick_beast_diagnoser FOREIGN KEY (diagnoser_empl_id) REFERENCES feed.feedlot_staff(user_id) ON DELETE SET NULL'],
        ARRAY['fk_sick_beast_custfeedowner','ALTER TABLE health.sick_beast_records ADD CONSTRAINT fk_sick_beast_custfeedowner FOREIGN KEY (customfeedownerid) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_drugs_given_drug',      'ALTER TABLE health.drugs_given ADD CONSTRAINT fk_drugs_given_drug FOREIGN KEY (drug_id) REFERENCES health.drugs(drug_id) ON DELETE SET NULL'],
        ARRAY['fk_drugs_given_sb',        'ALTER TABLE health.drugs_given ADD CONSTRAINT fk_drugs_given_sb FOREIGN KEY (sb_rec_no) REFERENCES health.sick_beast_records(sb_rec_no) ON DELETE SET NULL'],
        ARRAY['fk_autopsy_sb',            'ALTER TABLE health.autopsy_records ADD CONSTRAINT fk_autopsy_sb FOREIGN KEY (sb_rec_no) REFERENCES health.sick_beast_records(sb_rec_no) ON DELETE RESTRICT'],
        ARRAY['fk_autopsy_beast',         'ALTER TABLE health.autopsy_records ADD CONSTRAINT fk_autopsy_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_sbt_sb',               'ALTER TABLE health.sick_beast_temperatures ADD CONSTRAINT fk_sbt_sb FOREIGN KEY (sb_rec_no) REFERENCES health.sick_beast_records(sb_rec_no) ON DELETE SET NULL'],
        ARRAY['fk_sbt_cow',              'ALTER TABLE health.sick_beast_temperatures ADD CONSTRAINT fk_sbt_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_hgp_receival',          'ALTER TABLE health.drug_hgp_forms ADD CONSTRAINT fk_hgp_receival FOREIGN KEY (drug_receival_id) REFERENCES health.drug_purchase_events(drug_receival_id) ON DELETE RESTRICT'],
        ARRAY['fk_drugs_purchased_receival','ALTER TABLE health.drugs_purchased ADD CONSTRAINT fk_drugs_purchased_receival FOREIGN KEY (receival_id) REFERENCES health.drug_purchase_events(drug_receival_id) ON DELETE RESTRICT'],
        ARRAY['fk_drugs_purchased_drug',  'ALTER TABLE health.drugs_purchased ADD CONSTRAINT fk_drugs_purchased_drug FOREIGN KEY (drug_id) REFERENCES health.drugs(drug_id) ON DELETE RESTRICT'],
        ARRAY['fk_inv_line_drug',         'ALTER TABLE health.drug_inventory_line_items ADD CONSTRAINT fk_inv_line_drug FOREIGN KEY (drug_id) REFERENCES health.drugs(drug_id) ON DELETE RESTRICT'],
        -- feed → pen, commodity, cattle, contacts
        ARRAY['fk_bunk_pen',              'ALTER TABLE feed.bunk_readings ADD CONSTRAINT fk_bunk_pen FOREIGN KEY (pen_number_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_bunk_ration',           'ALTER TABLE feed.bunk_readings ADD CONSTRAINT fk_bunk_ration FOREIGN KEY (ration_code) REFERENCES feed.rations(ration_code) ON DELETE SET NULL'],
        ARRAY['fk_ration_regime_pen',     'ALTER TABLE feed.ration_regimes ADD CONSTRAINT fk_ration_regime_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_paddock_feed_commodity','ALTER TABLE feed.paddock_feeding ADD CONSTRAINT fk_paddock_feed_commodity FOREIGN KEY (commodity_id) REFERENCES commodity.commodities(commodity_code) ON DELETE RESTRICT'],
        ARRAY['fk_paddock_feed_cow',      'ALTER TABLE feed.paddock_feeding ADD CONSTRAINT fk_paddock_feed_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_cattle_feed_updates_cow','ALTER TABLE feed.cattle_feed_updates ADD CONSTRAINT fk_cattle_feed_updates_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_penfeedsdata_pen',      'ALTER TABLE feed.penfeedsdata ADD CONSTRAINT fk_penfeedsdata_pen FOREIGN KEY (pen_number_id) REFERENCES pen.pens(id) ON DELETE RESTRICT'],
        ARRAY['fk_penfeedsdata_ration',   'ALTER TABLE feed.penfeedsdata ADD CONSTRAINT fk_penfeedsdata_ration FOREIGN KEY (ration_code) REFERENCES feed.rations(ration_code) ON DELETE SET NULL'],
        ARRAY['fk_vendor_decl_owner',     'ALTER TABLE feed.vendor_declarations ADD CONSTRAINT fk_vendor_decl_owner FOREIGN KEY (owner_contact_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        -- pen → cattle, feed
        ARRAY['fk_penshistory_cow',       'ALTER TABLE pen.penshistory ADD CONSTRAINT fk_penshistory_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_penshistory_beast',     'ALTER TABLE pen.penshistory ADD CONSTRAINT fk_penshistory_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_penriders_employee',    'ALTER TABLE pen.penriders_log ADD CONSTRAINT fk_penriders_employee FOREIGN KEY (employee_id) REFERENCES feed.feedlot_staff(user_id) ON DELETE RESTRICT'],
        -- finance → cattle, contacts, purchasing, commodity
        ARRAY['fk_costs_cow',             'ALTER TABLE finance.costs ADD CONSTRAINT fk_costs_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_costs_beast',           'ALTER TABLE finance.costs ADD CONSTRAINT fk_costs_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_costs_code',            'ALTER TABLE finance.costs ADD CONSTRAINT fk_costs_code FOREIGN KEY (revexp_code) REFERENCES finance.cost_codes(revexp_code) ON DELETE RESTRICT'],
        ARRAY['fk_costsfeed_cow',         'ALTER TABLE finance.costs_feed_detail ADD CONSTRAINT fk_costsfeed_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_costsfeed_beast',       'ALTER TABLE finance.costs_feed_detail ADD CONSTRAINT fk_costsfeed_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_custfeed_inv_lot',      'ALTER TABLE finance.custfeed_invoices_list ADD CONSTRAINT fk_custfeed_inv_lot FOREIGN KEY (purch_lot_no) REFERENCES purchasing.purchase_lots(lot_number) ON DELETE SET NULL'],
        ARRAY['fk_priceadj_lot',          'ALTER TABLE finance.price_adjustment_by_weight_range ADD CONSTRAINT fk_priceadj_lot FOREIGN KEY (lot_number) REFERENCES purchasing.purchase_lots(lot_number) ON DELETE RESTRICT'],
        ARRAY['fk_tandr_cow',             'ALTER TABLE finance.tandr_buying_details ADD CONSTRAINT fk_tandr_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_tandr_beast',           'ALTER TABLE finance.tandr_buying_details ADD CONSTRAINT fk_tandr_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_tandr_agent',           'ALTER TABLE finance.tandr_buying_details ADD CONSTRAINT fk_tandr_agent FOREIGN KEY (agent_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_tandr_buyer',           'ALTER TABLE finance.tandr_buying_details ADD CONSTRAINT fk_tandr_buyer FOREIGN KEY (buyer_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_tandr_supplier',        'ALTER TABLE finance.tandr_buying_details ADD CONSTRAINT fk_tandr_supplier FOREIGN KEY (supplier_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_accumfeed_cow',         'ALTER TABLE finance.beast_accumed_feed_by_commodity ADD CONSTRAINT fk_accumfeed_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_accumfeed_beast',       'ALTER TABLE finance.beast_accumed_feed_by_commodity ADD CONSTRAINT fk_accumfeed_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_accumfeed_commod',      'ALTER TABLE finance.beast_accumed_feed_by_commodity ADD CONSTRAINT fk_accumfeed_commod FOREIGN KEY (commodity_code) REFERENCES commodity.commodities(commodity_code) ON DELETE RESTRICT'],
        -- carcase → cattle, contacts
        ARRAY['fk_carcase_cow',           'ALTER TABLE carcase.carcase_data ADD CONSTRAINT fk_carcase_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_carcase_beast',         'ALTER TABLE carcase.carcase_data ADD CONSTRAINT fk_carcase_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_carcase_sold_to',       'ALTER TABLE carcase.carcase_data ADD CONSTRAINT fk_carcase_sold_to FOREIGN KEY (sold_to_contact_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_carcase_abattoir',      'ALTER TABLE carcase.carcase_data ADD CONSTRAINT fk_carcase_abattoir FOREIGN KEY (abattoir_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_carcase_grade',         'ALTER TABLE carcase.carcase_data ADD CONSTRAINT fk_carcase_grade FOREIGN KEY (grade_id) REFERENCES carcase.carcase_grades(id) ON DELETE SET NULL'],
        -- purchasing → contacts
        ARRAY['fk_purch_lots_owner',      'ALTER TABLE purchasing.purchase_lots ADD CONSTRAINT fk_purch_lots_owner FOREIGN KEY (cattle_owner_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_purch_lots_vendor',     'ALTER TABLE purchasing.purchase_lots ADD CONSTRAINT fk_purch_lots_vendor FOREIGN KEY (vendor_id) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        ARRAY['fk_purch_lots_agent',      'ALTER TABLE purchasing.purchase_lots ADD CONSTRAINT fk_purch_lots_agent FOREIGN KEY (agent_code) REFERENCES contacts.contacts(contact_id) ON DELETE SET NULL'],
        -- commodity → contacts
        ARRAY['fk_commodcontracts_supplier','ALTER TABLE commodity.commodcontracts ADD CONSTRAINT fk_commodcontracts_supplier FOREIGN KEY (supplier_ac_no) REFERENCES contacts.contacts(contact_id) ON DELETE RESTRICT'],
        -- breeding → cattle, cattle.breeds
        ARRAY['fk_beast_breeding_cow',    'ALTER TABLE breeding.beast_breeding ADD CONSTRAINT fk_beast_breeding_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_beast_breeding_cattle', 'ALTER TABLE breeding.beast_breeding ADD CONSTRAINT fk_beast_breeding_cattle FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_beast_breeding_breed',  'ALTER TABLE breeding.beast_breeding ADD CONSTRAINT fk_beast_breeding_breed FOREIGN KEY (breed) REFERENCES cattle.breeds(name) ON DELETE SET NULL'],
        ARRAY['fk_sire_breed',            'ALTER TABLE breeding.breeding_sires ADD CONSTRAINT fk_sire_breed FOREIGN KEY (breed) REFERENCES cattle.breeds(name) ON DELETE SET NULL'],
        ARRAY['fk_dam_breed',             'ALTER TABLE breeding.breeding_dams ADD CONSTRAINT fk_dam_breed FOREIGN KEY (breed) REFERENCES cattle.breeds(name) ON DELETE SET NULL'],
        ARRAY['fk_cows_breed_id',         'ALTER TABLE cattle.cows ADD CONSTRAINT fk_cows_breed_id FOREIGN KEY (breed_id) REFERENCES cattle.breeds(id) ON DELETE SET NULL'],
        -- weighing → cattle
        ARRAY['fk_weighing_cow',          'ALTER TABLE weighing.weighing_events ADD CONSTRAINT fk_weighing_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_weighing_cattle',       'ALTER TABLE weighing.weighing_events ADD CONSTRAINT fk_weighing_cattle FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        -- transport → cattle, commodity, feed
        ARRAY['fk_truckloads_ration',     'ALTER TABLE transport.truck_loads ADD CONSTRAINT fk_truckloads_ration FOREIGN KEY (ration_code) REFERENCES feed.rations(ration_code) ON DELETE RESTRICT'],
        ARRAY['fk_dockets_commodity',     'ALTER TABLE transport.deliverydockets ADD CONSTRAINT fk_dockets_commodity FOREIGN KEY (commodity_code) REFERENCES commodity.commodities(commodity_code) ON DELETE SET NULL'],
        ARRAY['fk_locchanges_cow',        'ALTER TABLE transport.location_changes ADD CONSTRAINT fk_locchanges_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_locchanges_beast',      'ALTER TABLE transport.location_changes ADD CONSTRAINT fk_locchanges_beast FOREIGN KEY (beast_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        -- system → feed
        ARRAY['fk_userlogons_user',       'ALTER TABLE system.user_log_ons ADD CONSTRAINT fk_userlogons_user FOREIGN KEY (user_number) REFERENCES feed.feedlot_staff(user_id) ON DELETE RESTRICT'],
        -- OG web-app FK constraints
        ARRAY['fk_og_pens_ration',        'ALTER TABLE pen.pens ADD CONSTRAINT fk_og_pens_ration FOREIGN KEY (ration_id) REFERENCES feed.rations(id) ON DELETE SET NULL'],
        ARRAY['fk_pen_move_cow',          'ALTER TABLE pen.pen_movements ADD CONSTRAINT fk_pen_move_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_pen_move_pen',          'ALTER TABLE pen.pen_movements ADD CONSTRAINT fk_pen_move_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE CASCADE'],
        ARRAY['fk_batch_pen_from',        'ALTER TABLE operations.batch_pen_operations ADD CONSTRAINT fk_batch_pen_from FOREIGN KEY (from_pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_batch_pen_to',          'ALTER TABLE operations.batch_pen_operations ADD CONSTRAINT fk_batch_pen_to FOREIGN KEY (to_pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_nlis_cow',              'ALTER TABLE operations.nlis_transfers ADD CONSTRAINT fk_nlis_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE SET NULL'],
        ARRAY['fk_costs_cost_code',       'ALTER TABLE finance.costs ADD CONSTRAINT fk_costs_cost_code FOREIGN KEY (cost_code_id) REFERENCES finance.cost_codes(id) ON DELETE SET NULL'],
        ARRAY['fk_autopsy_cow',           'ALTER TABLE health.autopsy_records ADD CONSTRAINT fk_autopsy_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        -- cow_id FKs for remaining OG tables
        ARRAY['fk_brd_symptoms_cow',      'ALTER TABLE health.sick_beast_brd_symptoms ADD CONSTRAINT fk_brd_symptoms_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_carcase_dt2_cow',       'ALTER TABLE carcase.carcase_datatype2 ADD CONSTRAINT fk_carcase_dt2_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_carc_feedback_cow',     'ALTER TABLE carcase.carcase_feedback_report_data ADD CONSTRAINT fk_carc_feedback_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_cattle_qry_report_cow', 'ALTER TABLE reporting.cattle_query_month_report ADD CONSTRAINT fk_cattle_qry_report_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        ARRAY['fk_dispatch_item_cow',     'ALTER TABLE operations.transport_dispatch_items ADD CONSTRAINT fk_dispatch_item_cow FOREIGN KEY (cow_id) REFERENCES cattle.cows(id) ON DELETE RESTRICT'],
        -- pen_id FKs for previously orphaned columns — all → pen.pens(id) (unified table)
        ARRAY['fk_dual_ration_pen',       'ALTER TABLE feed.dual_ration_feeding ADD CONSTRAINT fk_dual_ration_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_titration_regime_pen',  'ALTER TABLE feed.titration_ration_regimes ADD CONSTRAINT fk_titration_regime_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_pen_bunk_cleaning_pen', 'ALTER TABLE feed.pen_and_bunk_cleaning ADD CONSTRAINT fk_pen_bunk_cleaning_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        ARRAY['fk_nsa_bunk_pen',          'ALTER TABLE feed.nsa_bunk_data ADD CONSTRAINT fk_nsa_bunk_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL'],
        -- OG web-app tables → pen.pens(id)
        ARRAY['fk_pen_snapshots_pen',     'ALTER TABLE cattle.pen_list_snapshots ADD CONSTRAINT fk_pen_snapshots_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE CASCADE'],
        ARRAY['fk_bunk_call_entry_pen',   'ALTER TABLE operations.bunk_call_entries ADD CONSTRAINT fk_bunk_call_entry_pen FOREIGN KEY (pen_id) REFERENCES pen.pens(id) ON DELETE SET NULL']
    ];
    _i INT;
BEGIN
    FOR _i IN 1..array_length(_fks, 1) LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = _fks[_i][1]) THEN
            EXECUTE _fks[_i][2];
        END IF;
    END LOOP;
END
$$;


-- ████████████████████████████████████████████████████████████████
-- ██  TRIGGERS — set_updated_at() on all tables with updated_at
-- ████████████████████████████████████████████████████████████████

DO $$
DECLARE
    _schema TEXT;
    _table  TEXT;
    _has_col BOOLEAN;
BEGIN
    FOR _schema, _table IN
        SELECT schemaname, tablename FROM pg_tables
        WHERE schemaname IN (
            'cattle','health','feed','pen','finance','carcase',
            'purchasing','commodity','transport','contacts',
            'breeding','weighing','reporting','operations',
            'system','digistar'
        )
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = _schema AND table_name = _table AND column_name = 'updated_at'
        ) INTO _has_col;

        IF _has_col THEN
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_%I_%I_updated_at ON %I.%I',
                _schema, _table, _schema, _table
            );
            EXECUTE format(
                'CREATE TRIGGER trg_%I_%I_updated_at BEFORE UPDATE ON %I.%I '
                'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
                _schema, _table, _schema, _table
            );
        END IF;
    END LOOP;
END
$$;


-- ████████████████████████████████████████████████████████████████
-- ██  LEGACY VIEWS
-- ██  Backward-compatible views for ETL and legacy queries
-- ██  OG table names → V4 schema-qualified tables
-- ████████████████████████████████████████████████████████████████

-- Primary entity views
CREATE OR REPLACE VIEW legacy.cows                AS SELECT * FROM cattle.cows;
CREATE OR REPLACE VIEW legacy.breeds              AS SELECT * FROM cattle.breeds;
CREATE OR REPLACE VIEW legacy.pens                AS SELECT * FROM pen.pens;
CREATE OR REPLACE VIEW legacy.pen_movements       AS SELECT * FROM pen.pen_movements;
CREATE OR REPLACE VIEW legacy.health_records      AS SELECT * FROM health.health_records;
CREATE OR REPLACE VIEW legacy.treatments          AS SELECT * FROM health.treatments;
CREATE OR REPLACE VIEW legacy.diseases            AS SELECT * FROM health.diseases;
CREATE OR REPLACE VIEW legacy.drugs               AS SELECT * FROM health.drugs;
CREATE OR REPLACE VIEW legacy.drug_purchases      AS SELECT * FROM health.drug_purchases;
CREATE OR REPLACE VIEW legacy.drug_disposals      AS SELECT * FROM health.drug_disposals;
CREATE OR REPLACE VIEW legacy.weighing_events     AS SELECT * FROM weighing.weighing_events;
CREATE OR REPLACE VIEW legacy.weighing_types      AS SELECT * FROM weighing.weighing_types;
CREATE OR REPLACE VIEW legacy.purchase_lots       AS SELECT * FROM purchasing.purchase_lots;
CREATE OR REPLACE VIEW legacy.purchase_lot_cattle  AS SELECT * FROM cattle.purchase_lot_cattle;
CREATE OR REPLACE VIEW legacy.lots                AS SELECT * FROM purchasing.purchase_lots;
CREATE OR REPLACE VIEW legacy.contacts            AS SELECT * FROM contacts.contacts;
CREATE OR REPLACE VIEW legacy.contact_types       AS SELECT * FROM contacts.contacttypes;
CREATE OR REPLACE VIEW legacy.rations             AS SELECT * FROM feed.rations;
CREATE OR REPLACE VIEW legacy.feedlot_staff       AS SELECT * FROM feed.feedlot_staff;
CREATE OR REPLACE VIEW legacy.carcase_data        AS SELECT * FROM carcase.carcase_data;
CREATE OR REPLACE VIEW legacy.cost_codes          AS SELECT * FROM finance.cost_codes;
CREATE OR REPLACE VIEW legacy.costs               AS SELECT * FROM finance.costs;

-- V2 legacy name aliases (for ETL scripts using V2 table names)
CREATE OR REPLACE VIEW legacy.cattle              AS SELECT * FROM cattle.cows;
CREATE OR REPLACE VIEW legacy.pens_file           AS
  SELECT id AS pen_number_id, name AS pen_name, pen_type, capacity, area_sqm,
         bunk_length, mob_name, current_head, current_ration_code,
         is_hospital AS hospital_pen, buller_pen, receiving_pen, active, notes,
         legacy_modified_at, created_at, updated_at
  FROM pen.pens;
CREATE OR REPLACE VIEW legacy.penshistory         AS SELECT * FROM pen.penshistory;
CREATE OR REPLACE VIEW legacy.pensfed             AS SELECT * FROM pen.pensfed;
CREATE OR REPLACE VIEW legacy.sick_beast_records  AS SELECT * FROM health.sick_beast_records;
CREATE OR REPLACE VIEW legacy.drugs_given         AS SELECT * FROM health.drugs_given;
CREATE OR REPLACE VIEW legacy.autopsy_records     AS SELECT * FROM health.autopsy_records;
CREATE OR REPLACE VIEW legacy.penfeedsdata        AS SELECT * FROM feed.penfeedsdata;
CREATE OR REPLACE VIEW legacy.bunk_readings       AS SELECT * FROM feed.bunk_readings;
CREATE OR REPLACE VIEW legacy.commodities         AS SELECT * FROM commodity.commodities;
CREATE OR REPLACE VIEW legacy.commodcontracts     AS SELECT * FROM commodity.commodcontracts;
CREATE OR REPLACE VIEW legacy.commodtrans         AS SELECT * FROM commodity.commodtrans;
CREATE OR REPLACE VIEW legacy.truck_loads         AS SELECT * FROM transport.truck_loads;
CREATE OR REPLACE VIEW legacy.deliverydockets     AS SELECT * FROM transport.deliverydockets;
CREATE OR REPLACE VIEW legacy.beast_breeding      AS SELECT * FROM breeding.beast_breeding;
CREATE OR REPLACE VIEW legacy.beastmovement       AS SELECT * FROM cattle.beast_movements;


-- ████████████████████████████████████████████████████████████████
-- ██  SEARCH PATH
-- ██  Set once per farm pool connection in server/db/index.js
-- ████████████████████████████████████████████████████████████████

-- For reference (not executed during schema creation):
-- SET search_path TO cattle, health, feed, pen, finance, carcase,
--   purchasing, commodity, transport, contacts, breeding, weighing,
--   reporting, operations, system, digistar, legacy, public;


-- ████████████████████████████████████████████████████████████████
-- ██  MISSING updated_at COLUMNS
-- ██  OG web-app tables that had created_at but no updated_at
-- ████████████████████████████████████████████████████████████████

ALTER TABLE health.health_records         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_purchases         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_disposals         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_stocktakes        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_stocktake_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_transfers         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_transfer_records  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE health.drug_purchase_events   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dpe_drug_receival_id ON health.drug_purchase_events(drug_receival_id);
ALTER TABLE health.sick_beast_brd_symptoms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE feed.pending_feed_data        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE feed.cattle_feed_updates      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE carcase.carcase_import_data   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE carcase.carcase_feedback_report_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE reporting.cattle_by_location          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE reporting.cattle_query_month_report   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE reporting.stock_rec_data              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE reporting.scu_rec_data                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE system.system_positions               ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE weighing.livestock_weighbridge_dockets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.bunk_call_sessions         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.bunk_call_entries          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ─── Bunk-call modernised columns (v2 service contract) ─────────
-- The OG schema used session_date / called_by / completed_at / bunk_score / head_count.
-- The current services (bunk-calls.js, farmer-overview.js, boards.js) use a more
-- normalised set of names; add them as additional columns and backfill from the
-- legacy ones so both sets stay in sync.

ALTER TABLE operations.bunk_call_sessions
    ADD COLUMN IF NOT EXISTS call_date     DATE,
    ADD COLUMN IF NOT EXISTS session_type  TEXT,
    ADD COLUMN IF NOT EXISTS submitted_by  TEXT,
    ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ;

UPDATE operations.bunk_call_sessions
   SET call_date    = COALESCE(call_date, session_date),
       session_type = COALESCE(session_type, 'AM'),
       submitted_by = COALESCE(submitted_by, called_by),
       submitted_at = COALESCE(submitted_at, completed_at)
 WHERE call_date IS NULL OR session_type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bunk_sessions_date_type
    ON operations.bunk_call_sessions(call_date, session_type);

ALTER TABLE operations.bunk_call_entries
    ADD COLUMN IF NOT EXISTS score   INTEGER,
    ADD COLUMN IF NOT EXISTS call_kg NUMERIC(10,2);

UPDATE operations.bunk_call_entries
   SET score = COALESCE(score, bunk_score)
 WHERE score IS NULL AND bunk_score IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bunk_entries_session_pen
    ON operations.bunk_call_entries(session_id, pen_id);

-- Drop NOT NULL on legacy columns so modernised INSERTs (which only populate
-- call_date / session_type / score) succeed.
DO $$
BEGIN
    BEGIN
        ALTER TABLE operations.bunk_call_sessions ALTER COLUMN session_date DROP NOT NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
END $$;

-- BEFORE-INSERT triggers keep legacy ↔ modern columns in sync both ways.
CREATE OR REPLACE FUNCTION operations.bunk_call_sessions_sync_legacy()
RETURNS TRIGGER AS $$
BEGIN
    NEW.session_date := COALESCE(NEW.session_date, NEW.call_date);
    NEW.called_by    := COALESCE(NEW.called_by,    NEW.submitted_by);
    NEW.completed_at := COALESCE(NEW.completed_at, NEW.submitted_at);
    NEW.call_date    := COALESCE(NEW.call_date,    NEW.session_date);
    NEW.submitted_by := COALESCE(NEW.submitted_by, NEW.called_by);
    NEW.submitted_at := COALESCE(NEW.submitted_at, NEW.completed_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bunk_call_sessions_sync_legacy ON operations.bunk_call_sessions;
CREATE TRIGGER trg_bunk_call_sessions_sync_legacy
    BEFORE INSERT OR UPDATE ON operations.bunk_call_sessions
    FOR EACH ROW EXECUTE FUNCTION operations.bunk_call_sessions_sync_legacy();

CREATE OR REPLACE FUNCTION operations.bunk_call_entries_sync_legacy()
RETURNS TRIGGER AS $$
BEGIN
    NEW.bunk_score := COALESCE(NEW.bunk_score, NEW.score);
    NEW.score      := COALESCE(NEW.score,      NEW.bunk_score);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bunk_call_entries_sync_legacy ON operations.bunk_call_entries;
CREATE TRIGGER trg_bunk_call_entries_sync_legacy
    BEFORE INSERT OR UPDATE ON operations.bunk_call_entries
    FOR EACH ROW EXECUTE FUNCTION operations.bunk_call_entries_sync_legacy();

ALTER TABLE operations.rfid_scan_sessions         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.transport_dispatches       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.transport_dispatch_items   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.archives                   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.archiving_log              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE operations.agent_issues               ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;


-- ████████████████████████████████████████████████████████████████
-- ██  updated_at TRIGGERS
-- ██  Auto-set updated_at = NOW() on every UPDATE for all tables
-- ██  that have the column. Uses DO block for idempotency.
-- ████████████████████████████████████████████████████████████████

DO $$
DECLARE
  _tbl TEXT;
  _tables TEXT[] := ARRAY[
    -- cattle
    'cattle.cows', 'cattle.market_categories', 'cattle.cull_reasons',
    'cattle.cattle_program_types', 'cattle.cattle_specs', 'cattle.trial_description',
    'cattle.cattle_processed', 'cattle.cattle_photos', 'cattle.daily_cattle_inventory',
    'cattle.kd1_records', 'cattle.purchase_lot_cattle', 'cattle.tag_bucket',
    'cattle.batch_update_log', 'cattle.despatched_rfids', 'cattle.beast_movements',
    'cattle.overhead_application_history', 'cattle.overhead_application_pens',
    'cattle.agistment_transfer_register', 'cattle.new_cattle_records_log',
    -- health
    'health.diseases', 'health.drugs', 'health.treatment_regimes',
    'health.health_records', 'health.sick_beast_records', 'health.autopsy_records',
    'health.chemical_inventory', 'health.drug_hgp_forms',
    'health.drug_inventory_events', 'health.drug_inventory_line_items',
    'health.drugs_purchase_event', 'health.drugs_purchased',
    'health.sick_beast_temperatures', 'health.sb_rec_no_booked',
    'health.mort_morb_triggers', 'health.resp_disease_retreats',
    'health.drug_purchases', 'health.drug_disposals',
    'health.drug_stocktakes', 'health.drug_stocktake_records',
    'health.drug_transfers', 'health.drug_transfer_records',
    'health.drug_purchase_events', 'health.sick_beast_brd_symptoms',
    -- feed
    'feed.ration_types', 'feed.rations', 'feed.ration_recipe_records',
    'feed.ration_regimes', 'feed.ration_load_sizes', 'feed.ration_load_size_entries',
    'feed.ration_calc_constants', 'feed.dual_ration_feeding',
    'feed.titration_ration_regimes', 'feed.bunk_code_desc', 'feed.bunk_readings',
    'feed.feeding_details', 'feed.feeding_regimens', 'feed.feeding_time_data',
    'feed.feeding_time_taken_by_ration_type', 'feed.feedlot_staff',
    'feed.feeddb_pens_file', 'feed.pen_feeding_order_params',
    'feed.pen_feeding_order_data', 'feed.pen_and_bunk_cleaning',
    'feed.paddock_feeding', 'feed.nsa_bunk_data',
    'feed.vendor_declarations', 'feed.pending_feed_data', 'feed.cattle_feed_updates',
    -- pen
    'pen.pens', 'pen.penshistory', 'pen.pen_movements',
    'pen.pensfed', 'pen.penlaneorder', 'pen.penriders_log',
    'pen.pen_rider_tolerances', 'pen.pen_cleaning_dates', 'pen.pen_print_order',
    -- finance
    'finance.cost_codes', 'finance.costs', 'finance.custfeed_invoices_list',
    'finance.custfeed_lot_summary', 'finance.monthly_fl_intake_cost',
    'finance.packagecosts', 'finance.price_adjustment_by_weight_range',
    'finance.tax_invoice_bank_details', 'finance.rcti_payment_grid',
    'finance.rv_rcti_data', 'finance.tr_payment_rates',
    'finance.tr_payment_breed_adjust', 'finance.tandr_buying_details',
    'finance.beast_accumed_feed_by_commodity',
    -- carcase
    'carcase.carcase_data', 'carcase.carcase_datatype2', 'carcase.carcase_grades',
    'carcase.carcase_grades_us', 'carcase.carcase_prices',
    'carcase.carc_feedback_compliance', 'carcase.carc_feedback_mth_avgs',
    'carcase.marbling_bonus', 'carcase.carcase_import_data',
    'carcase.carcase_feedback_report_data',
    -- purchasing
    'purchasing.purchase_lots', 'purchasing.purchase_totals',
    -- commodity
    'commodity.commodities', 'commodity.commodcontracts',
    'commodity.period_stocks_closing_balance',
    -- transport
    'transport.truck_names', 'transport.truck_loads',
    'transport.truck_load_variation_data', 'transport.datakey_truck_allocation',
    'transport.locations', 'transport.location_changes',
    'transport.location_transactions', 'transport.deliverydockets',
    'transport.manure_locations', 'transport.manure_carting',
    'transport.loaddockages', 'transport.wbridgecomport',
    -- contacts
    'contacts.company', 'contacts.company_settings', 'contacts.contacts',
    'contacts.contacttypes',
    -- breeding
    'breeding.breeding_sires', 'breeding.breeding_dams',
    'breeding.beast_breeding', 'breeding.rudd_800_traits',
    -- weighing
    'weighing.weighing_events', 'weighing.scalestypes',
    'weighing.livestock_weighbridge_dockets',
    -- reporting
    'reporting.month_end_stockonhand', 'reporting.soh_by_month',
    'reporting.monthly_adjustment_ob', 'reporting.monthly_agistor_movements',
    'reporting.monthly_reconciliation', 'reporting.monthly_movements',
    'reporting.mrb_avg_supplier_years', 'reporting.cattle_by_location',
    'reporting.cattle_query_month_report', 'reporting.stock_rec_data',
    'reporting.scu_rec_data',
    -- operations
    'operations.nlis_transfers', 'operations.bunk_call_sessions',
    'operations.bunk_call_entries', 'operations.rfid_scan_sessions',
    'operations.transport_dispatches', 'operations.transport_dispatch_items',
    'operations.weighbridge_dockets', 'operations.archives',
    'operations.archiving_log', 'operations.drafting_settings',
    'operations.report_templates', 'operations.agent_issues',
    'operations.batch_pen_operations',
    -- system
    'system.connected_systems', 'system.code_references_index',
    'system.com_port_settings', 'system.computer_names',
    'system.system_info', 'system.database_flags',
    'system.mmec_table', 'system.rv_scheduled_dof',
    'system.system_positions', 'system.migration_log', 'system.legacy_raw',
    -- digistar
    'digistar.digistar_data_history', 'digistar.digistar_users'
  ];
  _trg_name TEXT;
BEGIN
  FOREACH _tbl IN ARRAY _tables LOOP
    _trg_name := 'trg_' || replace(_tbl, '.', '_') || '_updated_at';
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = _trg_name) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        _trg_name, _tbl
      );
    END IF;
  END LOOP;
END
$$;


-- ████████████████████████████████████████████████████████████████
-- ██  NOTES FOR DEVELOPERS
-- ████████████████████████████████████████████████████████████████
--
-- DUPLICATE TABLE PAIRS (OG web-app vs V2 legacy — both exist intentionally):
--   pen.pens — UNIFIED (V2 pens_file + OG pens merged into single table; legacy
--              view legacy.pens_file aliases columns for any V2 ETL scripts)
--   health.drug_purchases (OG)         vs  health.drugs_purchased (V2)
--   health.drug_purchase_events (OG)   vs  health.drugs_purchase_event (V2)
--   weighing.livestock_weighbridge_dockets (OG) vs operations.weighbridge_dockets (V2)
--   The web-app should read/write to OG tables. V2 tables hold migrated legacy data.
--
-- REAL vs NUMERIC in ALTER TABLE legacy columns:
--   The core CREATE TABLE definitions use NUMERIC(10,2) for weights and NUMERIC(12,4) for money.
--   The ALTER TABLE legacy columns at the bottom use REAL (float4) to match SQL Server float types.
--   The web-app should ALWAYS write to the NUMERIC columns (the main ones), NOT the REAL aliases.
--   The REAL columns exist only for backward-compatible migration data.
--


COMMIT;

-- ████████████████████████████████████████████████████████████████
-- ██  END OF V5 FARM SCHEMA
-- ██  ~195 tables across 17 schemas + legacy views
-- ██  5 partitioned tables × 11 yearly partitions each (2020-2029)
-- ██  120+ indexes (FK, search, partial, composite)
-- ██  updated_at triggers on all tables with the column
-- ████████████████████████████████████████████████████████████████
