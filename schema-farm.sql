-- ═══════════════════════════════════════════════════════
-- Per-farm DB schema (PostgreSQL)
-- Each farm gets its own database with these tables.
--
-- Sections:
--   1. Lookup / reference tables
--   2. Core entities
--   3. Event / history tables
--   4. Operational tables
--   5. Legacy / migration tables
--   6. System tables
-- ═══════════════════════════════════════════════════════


-- ── 1. Lookup / reference tables ──────────────────────

CREATE TABLE IF NOT EXISTS breeds (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS rations (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  cost_per_ton   NUMERIC(12,2),
  dm_percentage  NUMERIC(5,2),
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed rations removed: real data comes from legacy RationNames migration.
-- INSERT INTO rations (name) VALUES ('Finisher'), ('Grower'), ('Starter'), ('Recovery')
-- ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS cost_codes (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  type                   TEXT NOT NULL CHECK(type IN ('revenue','expense')),
  include_in_landed_cost BOOLEAN DEFAULT FALSE,
  include_in_pl_expenses BOOLEAN DEFAULT FALSE,
  include_on_cf_invoice  BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS market_categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  min_dof  INTEGER,
  hgp_free               BOOLEAN DEFAULT FALSE,
  predicted_dressing_pct  NUMERIC(5,2),
  dispatch_notes          TEXT
);

CREATE TABLE IF NOT EXISTS diseases (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  symptoms      TEXT,
  treatment     TEXT,
  body_system   TEXT,
  recovery_days    INTEGER,
  active           BOOLEAN DEFAULT TRUE,
  recoverable      BOOLEAN DEFAULT TRUE,
  penapp_name      TEXT,
  autopsy_disease  BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS drugs (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  unit            TEXT,
  cost_per_unit   NUMERIC(12,2),
  withhold_days   INTEGER DEFAULT 0,
  esi_days        INTEGER DEFAULT 0,
  is_hgp          BOOLEAN DEFAULT FALSE,
  is_antibiotic   BOOLEAN DEFAULT FALSE,
  supplier        TEXT,
  active              BOOLEAN DEFAULT TRUE,
  notes               TEXT,
  drug_category       INTEGER,
  admin_units         TEXT,
  admin_weight_factor NUMERIC(10,4),
  withhold_days_3     INTEGER DEFAULT 0,
  withhold_days_4     INTEGER DEFAULT 0,
  current_batch       TEXT,
  cost_per_unit_cf    NUMERIC(12,2),
  chemical_mg_per_ml  NUMERIC(10,4),
  reorder_trigger_units NUMERIC(10,2),
  units_per_package   NUMERIC(10,2),
  units_on_hand       NUMERIC(10,2),
  legacy_modified_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS carcase_grades (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price_per_kg  NUMERIC(12,4)
);

CREATE TABLE IF NOT EXISTS cull_reasons (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  pay_rate_per_kg NUMERIC(12,4),
  induction_cull  BOOLEAN DEFAULT FALSE,
  later_cull      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treatment_regimes (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  disease_id    INTEGER REFERENCES diseases(id),
  description   TEXT,
  days          INTEGER,
  drug_ids      JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS location_types (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  category      TEXT DEFAULT 'feedlot' CHECK(category IN ('feedlot','paddock','agistor','custom')),
  description   TEXT
);


-- ── 2. Core entities ──────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id                     SERIAL PRIMARY KEY,
  type                   TEXT CHECK(type IN ('vendor','agent','buyer','abattoir','carrier','other')),
  company                TEXT,
  title                  TEXT,
  first_name             TEXT,
  last_name              TEXT,
  phone                  TEXT,
  mobile                 TEXT,
  fax                    TEXT,
  email                  TEXT,
  address                TEXT,
  address_2              TEXT,
  city                   TEXT,
  state                  TEXT,
  post_code              TEXT,
  pic                    TEXT,
  abn                    TEXT,
  bsb                    TEXT,
  account_number         TEXT,
  invoice_co             TEXT,
  payment_due_days       INTEGER DEFAULT 0,
  feedlot_agistment_rate NUMERIC(12,2),
  paddock_agistment_rate NUMERIC(12,2),
  tail_tag               TEXT,
  brand                  TEXT,
  brand_drawing_file     TEXT,
  abattoir_est_no        TEXT,
  notes                  TEXT,
  legacy_modified_at     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);

CREATE TABLE IF NOT EXISTS pens (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  is_paddock  BOOLEAN DEFAULT FALSE,
  is_hospital BOOLEAN DEFAULT FALSE,
  capacity    INTEGER,
  ration_id   INTEGER REFERENCES rations(id),
  active          BOOLEAN DEFAULT TRUE,
  include_in_list BOOLEAN DEFAULT TRUE,
  exit_pen        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pens_ration ON pens(ration_id);

CREATE TABLE IF NOT EXISTS purchase_lots (
  id              SERIAL PRIMARY KEY,
  lot_number      TEXT NOT NULL UNIQUE,
  purchase_date   DATE,
  vendor_id       INTEGER REFERENCES contacts(id),
  agent_id        INTEGER REFERENCES contacts(id),
  head_count      INTEGER,
  total_weight_kg NUMERIC(10,2),
  total_cost      NUMERIC(12,2),
  freight_cost    NUMERIC(12,2),
  notes           TEXT,
  status               TEXT DEFAULT 'active' CHECK(status IN ('active','sold','closed')),
  destination          TEXT,
  agistor_id           INTEGER REFERENCES contacts(id),
  supplier_pic         TEXT,
  vendor_dec_no        TEXT,
  cents_per_kg         NUMERIC(12,4),
  weighbridge_weight   NUMERIC(10,2),
  weighbridge_charges  NUMERIC(12,2),
  dpi_charges          NUMERIC(12,2),
  market_category      TEXT,
  cattle_invoice_no    TEXT,
  cattle_inv_amount    NUMERIC(12,2),
  cattle_inv_date_approved DATE,
  carrier              TEXT,
  freight_invoice_no   TEXT,
  freight_inv_amount   NUMERIC(12,2),
  buyer_id             INTEGER REFERENCES contacts(id),
  commission_per_head  NUMERIC(12,2),
  buying_fee           NUMERIC(12,2),
  other_buying_costs   NUMERIC(12,2),
  purchase_region      INTEGER,
  owner_of_cattle      TEXT,
  custom_feeding_lot   BOOLEAN DEFAULT FALSE,
  financed             BOOLEAN DEFAULT FALSE,
  cust_feed_charge_per_ton    NUMERIC(12,2),
  risk_factor          NUMERIC(5,2),
  daily_agist_charge_per_head NUMERIC(12,2),
  finance_rate_pct     NUMERIC(5,2),
  fl_weighbridge_docket    TEXT,
  agent_name               TEXT,
  freight_inv_date_approved DATE,
  grower_group_code        INTEGER,
  nvd_scan_file            TEXT,
  weigh_ticket_scan_file   TEXT,
  scan_file_1              TEXT,
  scan_file_2              TEXT,
  marbling_bonus_lot       BOOLEAN DEFAULT FALSE,
  applied_to_cattle        BOOLEAN DEFAULT FALSE,
  legacy_modified_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_status   ON purchase_lots(status);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_vendor   ON purchase_lots(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_date     ON purchase_lots(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_agent    ON purchase_lots(agent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_agistor  ON purchase_lots(agistor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_lots_buyer    ON purchase_lots(buyer_id);

CREATE TABLE IF NOT EXISTS cows (
  id              SERIAL PRIMARY KEY,
  tag_number      TEXT NOT NULL,
  eid             TEXT,
  breed           TEXT NOT NULL,
  sex             TEXT DEFAULT 'female' CHECK(sex IN ('female', 'male')),
  pen_id          INTEGER REFERENCES pens(id),
  purchase_lot_id INTEGER REFERENCES purchase_lots(id),
  hgp             BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'active' CHECK(status IN ('active','sold','died','archived')),
  entry_date      DATE,
  entry_weight_kg NUMERIC(10,2),
  sale_date       DATE,
  sale_weight_kg  NUMERIC(10,2),
  dob             DATE,
  start_date      DATE,
  start_weight_kg NUMERIC(10,2),
  notes           TEXT,
  photo_url       TEXT,
  legacy_beast_id    INTEGER UNIQUE,
  tail_tag           TEXT,
  vendor_ear_tag     TEXT,
  group_name         TEXT,
  sub_group          TEXT,
  background_cost_per_kg NUMERIC(12,4),
  bg_fee             NUMERIC(12,2),
  teeth              SMALLINT,
  withhold_until     DATE,
  date_died          DATE,
  sire_tag           TEXT,
  dam_tag            TEXT,
  off_feed           BOOLEAN DEFAULT FALSE,
  in_hospital        BOOLEAN DEFAULT FALSE,
  buller             BOOLEAN DEFAULT FALSE,
  non_performer      BOOLEAN DEFAULT FALSE,
  frame_size         TEXT,
  custom_feeder      BOOLEAN DEFAULT FALSE,
  dof_in_prev_fl     INTEGER,
  market_category    TEXT,
  cull_reason        TEXT,
  agist_lot_no       TEXT,
  current_loc_type_id INTEGER,
  old_rfid           TEXT,
  date_rfid_changed  DATE,
  trial_no_id        INTEGER,
  nfas_decl_number   TEXT,
  grower_group_code  INTEGER,
  date_culled        DATE,
  agistment_pic      TEXT,
  blood_vial_number  TEXT,
  ap_lot             TEXT,
  lifetime_traceable BOOLEAN DEFAULT FALSE,
  pregnant           BOOLEAN DEFAULT FALSE,
  planned_kill_date  DATE,
  beast_sale_type_id INTEGER,
  esi_withhold_until DATE,
  preg_tested        BOOLEAN DEFAULT FALSE,
  custom_feed_owner_id INTEGER,
  species            TEXT DEFAULT 'bovine',
  nlis_tag_fail      BOOLEAN DEFAULT FALSE,
  dna_blood_number   TEXT,
  dof_scheduled      INTEGER,
  eu                 BOOLEAN DEFAULT FALSE,
  eu_dec_no          TEXT,
  paddock_tag        TEXT,
  outgoing_nvd       TEXT,
  agisted_animal     BOOLEAN DEFAULT FALSE,
  vendor_id          INTEGER,
  agent_id           INTEGER,
  bovilus_shots      INTEGER,
  program_id         INTEGER,
  abattoir_culled    BOOLEAN DEFAULT FALSE,
  abattoir_condemned BOOLEAN DEFAULT FALSE,
  lot_closeout_date  DATE,
  vendor_treated_bovilus BOOLEAN DEFAULT FALSE,
  agist_charged_to_date DATE,
  last_oracle_costs  NUMERIC(12,2),
  last_oracle_date   DATE,
  marbling_bonus_lot TEXT,
  legacy_modified_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cows_tag       ON cows(tag_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cows_legacy_beast_id ON cows(legacy_beast_id);
CREATE INDEX IF NOT EXISTS idx_cows_eid       ON cows(eid);
CREATE INDEX IF NOT EXISTS idx_cows_status    ON cows(status);
CREATE INDEX IF NOT EXISTS idx_cows_pen       ON cows(pen_id);
CREATE INDEX IF NOT EXISTS idx_cows_purchase_lot ON cows(purchase_lot_id);


-- ── 3. Event / history tables ─────────────────────────

CREATE TABLE IF NOT EXISTS weighing_events (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER NOT NULL REFERENCES cows(id) ON DELETE RESTRICT,
  weigh_type  TEXT NOT NULL CHECK(weigh_type IN ('intake','interim','exit','sale')),
  weight_kg   NUMERIC(10,2) NOT NULL CHECK(weight_kg >= 0),
  p8_fat      SMALLINT,
  notes       TEXT,
  ear_tag            TEXT,
  days_owned         INTEGER,
  time_weighed       TEXT,
  agistor_id         INTEGER,
  be_agist_lot_no    TEXT,
  cull_reason_id     TEXT,
  beast_sale_type_id INTEGER,
  to_locn_type_id    INTEGER,
  user_initials      TEXT,
  legacy_modified_at TIMESTAMPTZ,
  weighed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weigh_cow  ON weighing_events(cow_id);
CREATE INDEX IF NOT EXISTS idx_weigh_date ON weighing_events(weighed_at DESC);

CREATE TABLE IF NOT EXISTS health_records (
  id               SERIAL PRIMARY KEY,
  cow_id           INTEGER NOT NULL REFERENCES cows(id) ON DELETE RESTRICT,
  type             TEXT NOT NULL CHECK(type IN ('checkup','vaccination','treatment','injury','other')),
  description      TEXT NOT NULL,
  date             DATE NOT NULL,
  vet_name         TEXT,
  cost             NUMERIC(12,2),
  disease_id       INTEGER REFERENCES diseases(id),
  date_recovered   DATE,
  result_code      TEXT,
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
CREATE INDEX IF NOT EXISTS idx_health_cow      ON health_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_date     ON health_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_cow_date ON health_records(cow_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_disease  ON health_records(disease_id);
CREATE INDEX IF NOT EXISTS idx_health_sb_rec_no ON health_records(legacy_sb_rec_no);

CREATE TABLE IF NOT EXISTS treatments (
  id               SERIAL PRIMARY KEY,
  cow_id           INTEGER NOT NULL REFERENCES cows(id) ON DELETE RESTRICT,
  health_record_id INTEGER REFERENCES health_records(id) ON DELETE SET NULL,
  drug_id          INTEGER REFERENCES drugs(id),
  disease_id       INTEGER REFERENCES diseases(id),
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
CREATE INDEX IF NOT EXISTS idx_treat_cow     ON treatments(cow_id);
CREATE INDEX IF NOT EXISTS idx_treat_drug    ON treatments(drug_id);
CREATE INDEX IF NOT EXISTS idx_treat_disease ON treatments(disease_id);
CREATE INDEX IF NOT EXISTS idx_treatments_health_record ON treatments(health_record_id);

CREATE TABLE IF NOT EXISTS pen_movements (
  id        SERIAL PRIMARY KEY,
  cow_id    INTEGER NOT NULL REFERENCES cows(id) ON DELETE RESTRICT,
  pen_id    INTEGER NOT NULL REFERENCES pens(id),
  moved_at  TIMESTAMPTZ DEFAULT NOW(),
  legacy_modified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pen_move_cow ON pen_movements(cow_id);
CREATE INDEX IF NOT EXISTS idx_pen_movements_pen ON pen_movements(pen_id);

CREATE TABLE IF NOT EXISTS batch_pen_operations (
  id             SERIAL PRIMARY KEY,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('transfer','sale')),
  from_pen_id    INTEGER REFERENCES pens(id),
  to_pen_id      INTEGER REFERENCES pens(id),
  head_count     INTEGER NOT NULL,
  avg_sale_weight NUMERIC(10,2),
  filter_field   TEXT,
  filter_value   TEXT,
  moved_at       TIMESTAMPTZ DEFAULT NOW(),
  recorded_by    TEXT,
  user_id        INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batch_pen_ops_date ON batch_pen_operations(moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_pen_ops_from_pen ON batch_pen_operations(from_pen_id);
CREATE INDEX IF NOT EXISTS idx_batch_pen_ops_to_pen   ON batch_pen_operations(to_pen_id);

CREATE TABLE IF NOT EXISTS costs (
  id            SERIAL PRIMARY KEY,
  cow_id        INTEGER NOT NULL REFERENCES cows(id) ON DELETE RESTRICT,
  cost_code_id  INTEGER REFERENCES cost_codes(id),
  amount        NUMERIC(12,2) NOT NULL,
  unit_cost     NUMERIC(12,2),
  units         NUMERIC(10,2) DEFAULT 1,
  description   TEXT,
  trans_date    DATE,
  ration        TEXT,
  ear_tag       TEXT,
  legacy_modified_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_costs_cow  ON costs(cow_id);
CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(trans_date DESC);
CREATE INDEX IF NOT EXISTS idx_costs_cost_code ON costs(cost_code_id);


-- ── 4. Operational tables ─────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_declarations (
  id                       SERIAL PRIMARY KEY,
  vendor_dec_number        TEXT,
  owner_contact_id         INTEGER REFERENCES contacts(id),
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
  -- Part A: movement details
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
  -- 8 NVD declaration questions (tristate: 'yes', 'no', 'nk' or NULL)
  q1_hgp                   TEXT,
  q2_animal_fats           TEXT,
  q3_ownership             TEXT,
  q3_ownership_period      TEXT,
  q4_stockfeeds            TEXT,
  q5_erp_restriction       TEXT,
  q6_withholding_drugs     TEXT,
  q7_withholding_feed      TEXT,
  q8_spray_risk            TEXT,
  -- Vendor declaration signature (Part A)
  vendor_full_name         TEXT,
  vendor_address           TEXT,
  vendor_date_signed       DATE,
  vendor_signature_status  TEXT,
  -- Transport details (Part B)
  transport_movement_date  DATE,
  transport_time           TEXT,
  transport_vehicle_reg    TEXT,
  transport_name           TEXT,
  transport_date_signed    DATE,
  transport_signature_status TEXT,
  -- Cattle description rows
  cattle_rows              JSONB DEFAULT '[]',
  endosulfan_exposure      BOOLEAN DEFAULT FALSE,
  endosulfan_date          DATE,
  fed_animal_fats          BOOLEAN DEFAULT FALSE,
  status                   TEXT DEFAULT 'draft',
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vd_status  ON vendor_declarations(status);
CREATE INDEX IF NOT EXISTS idx_vd_number  ON vendor_declarations(vendor_dec_number);
CREATE INDEX IF NOT EXISTS idx_vd_contact ON vendor_declarations(owner_contact_id);

CREATE TABLE IF NOT EXISTS nlis_transfers (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE SET NULL,
  transfer_type       TEXT NOT NULL CHECK(transfer_type IN ('movement_in','movement_out','sighting','deceased','device_reg','tag_replace')),
  from_pic            TEXT,
  to_pic              TEXT,
  eid                 TEXT,
  nlis_transaction_id TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','confirmed','rejected','error')),
  request_payload     JSONB,
  response_payload    JSONB,
  submitted_at        TIMESTAMPTZ,
  confirmed_at        TIMESTAMPTZ,
  error_message       TEXT,
  created_by          INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nlis_transfers_cow    ON nlis_transfers(cow_id);
CREATE INDEX IF NOT EXISTS idx_nlis_transfers_status ON nlis_transfers(status);
CREATE INDEX IF NOT EXISTS idx_nlis_transfers_type   ON nlis_transfers(transfer_type);

CREATE TABLE IF NOT EXISTS bunk_call_sessions (
  id             SERIAL PRIMARY KEY,
  call_date      DATE NOT NULL,
  session_type   TEXT NOT NULL CHECK(session_type IN ('AM','Midday','PM')),
  submitted_by   TEXT,
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_date, session_type)
);

CREATE TABLE IF NOT EXISTS bunk_call_entries (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES bunk_call_sessions(id) ON DELETE CASCADE,
  pen_id      INTEGER NOT NULL REFERENCES pens(id),
  score       SMALLINT CHECK(score >= 0 AND score <= 4),
  call_kg     NUMERIC(10,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, pen_id)
);
CREATE INDEX IF NOT EXISTS idx_bunk_entry_session ON bunk_call_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_bunk_entry_pen     ON bunk_call_entries(pen_id);

CREATE TABLE IF NOT EXISTS rfid_scan_sessions (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER,
  scanned_count       INTEGER NOT NULL DEFAULT 0,
  duplicates_ignored  INTEGER NOT NULL DEFAULT 0,
  file_name           TEXT,
  notes               TEXT,
  scanned_eids        JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_dispatches (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,
  head_count      INTEGER NOT NULL DEFAULT 0,
  sale_date       DATE,
  sub_group_name  TEXT,
  nvd_id          INTEGER REFERENCES vendor_declarations(id),
  nett_weight_kg  NUMERIC(10,2),
  weigh_note      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transport_dispatch_date ON transport_dispatches(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_transport_dispatches_nvd ON transport_dispatches(nvd_id);

CREATE TABLE IF NOT EXISTS transport_dispatch_items (
  id          SERIAL PRIMARY KEY,
  dispatch_id INTEGER NOT NULL REFERENCES transport_dispatches(id) ON DELETE CASCADE,
  cow_id      INTEGER NOT NULL REFERENCES cows(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON transport_dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_cow      ON transport_dispatch_items(cow_id);

CREATE TABLE IF NOT EXISTS weighbridge_dockets (
  id                SERIAL PRIMARY KEY,
  docket_number     TEXT NOT NULL,
  docket_type       TEXT NOT NULL CHECK(docket_type IN ('receival','dispatch')),
  weighperson       TEXT,
  docket_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  docket_time       TIME,
  exit_date         DATE,
  exit_time         TIME,
  carrier_id        INTEGER REFERENCES contacts(id),
  driver_name       TEXT,
  vehicle_rego      TEXT,
  origin_dest_id    INTEGER REFERENCES contacts(id),
  description       TEXT,
  nvd_number        TEXT,
  purchase_lot_id   INTEGER REFERENCES purchase_lots(id),
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
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_date ON weighbridge_dockets(docket_date DESC);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_type ON weighbridge_dockets(docket_type);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_carrier      ON weighbridge_dockets(carrier_id);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_origin_dest   ON weighbridge_dockets(origin_dest_id);
CREATE INDEX IF NOT EXISTS idx_wb_dockets_purchase_lot  ON weighbridge_dockets(purchase_lot_id);

CREATE TABLE IF NOT EXISTS drug_purchases (
  id                  SERIAL PRIMARY KEY,
  drug_id             INTEGER REFERENCES drugs(id),
  quantity            NUMERIC(10,2),
  batch_number        TEXT,
  expiry_date         DATE,
  cost                NUMERIC(12,2),
  legacy_receival_id  INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drug_purchases_drug ON drug_purchases(drug_id);

CREATE TABLE IF NOT EXISTS drug_disposals (
  id                  SERIAL PRIMARY KEY,
  drug_id             INTEGER REFERENCES drugs(id),
  quantity            NUMERIC(10,2),
  disposal_date       DATE,
  disposal_reason     TEXT,
  disposal_method     TEXT,
  disposed_by         TEXT,
  notes               TEXT,
  legacy_disposal_id  INTEGER,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drug_disposals_drug ON drug_disposals(drug_id);



-- ── 4b. Section 2: Legacy raw → structured tables ───


-- ═══════════════════════════════════════════════════════
-- Section 2: Legacy raw tables → structured PostgreSQL
-- Auto-generated from SQL Server INFORMATION_SCHEMA
-- ═══════════════════════════════════════════════════════

-- Source: Beast_Cull_Reasons (15 rows) — merged into cull_reasons

-- Source: Beast_Sale_Types_RV (14 rows)
CREATE TABLE IF NOT EXISTS beast_sale_types (
  id SERIAL PRIMARY KEY,
  sale_type_id INTEGER NOT NULL,
  sale_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: BodySystems (8 rows)
CREATE TABLE IF NOT EXISTS body_systems (
  id SERIAL PRIMARY KEY,
  bs_id INTEGER NOT NULL,
  body_system TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Breeding_Categories (0 rows)
CREATE TABLE IF NOT EXISTS breeding_categories (
  id SERIAL PRIMARY KEY,
  breed_category_id INTEGER NOT NULL,
  breed_category TEXT NOT NULL,
  breed_category_desc TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Carcase_Grades_US (5 rows)
CREATE TABLE IF NOT EXISTS carcase_grades_us (
  id SERIAL PRIMARY KEY,
  qual_grade TEXT NOT NULL,
  yg1_price NUMERIC(12,4),
  yg2_price NUMERIC(12,4),
  yg3_price NUMERIC(12,4),
  yg4_price NUMERIC(12,4),
  yg5_price NUMERIC(12,4),
  from_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_Program_Types (0 rows)
CREATE TABLE IF NOT EXISTS cattle_program_types (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL,
  program_code TEXT NOT NULL,
  dof INTEGER,
  program_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Code_References_Index (16 rows)
CREATE TABLE IF NOT EXISTS code_references (
  id SERIAL PRIMARY KEY,
  database_table TEXT,
  field_name TEXT,
  lookup_table_name TEXT,
  lut_descriptive_field_name TEXT,
  lut_code_field_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: ContactTypes (12 rows)
CREATE TABLE IF NOT EXISTS contact_types (
  id SERIAL PRIMARY KEY,
  contact_type_id INTEGER NOT NULL,
  contact_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drug_Category (20 rows)
CREATE TABLE IF NOT EXISTS drug_categories (
  id SERIAL PRIMARY KEY,
  drug_category INTEGER NOT NULL,
  category_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Feed_Commodity_names (0 rows)
CREATE TABLE IF NOT EXISTS feed_commodity_names (
  id SERIAL PRIMARY KEY,
  commodity_code INTEGER NOT NULL,
  commodity_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Grower_Groups (0 rows)
CREATE TABLE IF NOT EXISTS grower_groups (
  id SERIAL PRIMARY KEY,
  grower_group_code INTEGER NOT NULL,
  grower_group_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Purchase_Regions (4 rows)
CREATE TABLE IF NOT EXISTS purchase_regions (
  id SERIAL PRIMARY KEY,
  region_id INTEGER NOT NULL,
  region_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Sickness_Result_Codes (3 rows) + Sickness_Result_Codes_RV (4 rows) — merged
CREATE TABLE IF NOT EXISTS sickness_result_codes (
  id SERIAL PRIMARY KEY,
  sickness_result_code INTEGER NOT NULL,
  sickness_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Sire_Lines (0 rows)
CREATE TABLE IF NOT EXISTS sire_lines (
  id SERIAL PRIMARY KEY,
  sire_line_id INTEGER NOT NULL,
  sire_line TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: SubGroupNames (0 rows)
CREATE TABLE IF NOT EXISTS sub_group_names (
  id SERIAL PRIMARY KEY,
  sub_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Weighing_Types (4 rows) + Weighing_Types_RV (12 rows) — merged
CREATE TABLE IF NOT EXISTS weighing_types (
  id SERIAL PRIMARY KEY,
  weighing_type_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_Specs (0 rows)
CREATE TABLE IF NOT EXISTS cattle_specs (
  id SERIAL PRIMARY KEY,
  intake_fat_from INTEGER,
  intake_fat_to INTEGER,
  intake_wght_from INTEGER,
  intake_wght_to INTEGER,
  intake_teeth_from INTEGER,
  intake_teeth_to INTEGER,
  sale_wght_from INTEGER,
  sale_wght_to INTEGER,
  wg_per_day_from NUMERIC(10,2),
  wg_per_day_to NUMERIC(10,2),
  dressing_pct_from NUMERIC(5,2),
  dressing_pct_to NUMERIC(5,2),
  marbling_from INTEGER,
  carc_p8_from INTEGER,
  carc_p8_to INTEGER,
  ema_from INTEGER,
  ema_to INTEGER,
  fat_colour_from INTEGER,
  fat_colour_to INTEGER,
  meat_colour_from TEXT,
  meat_colour_to TEXT,
  paddock_wg_from NUMERIC(10,2),
  paddock_wg_to NUMERIC(10,2),
  dof_from INTEGER,
  dof_to INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Company (1 rows)
CREATE TABLE IF NOT EXISTS company (
  id SERIAL PRIMARY KEY,
  company_name TEXT,
  weight_units TEXT,
  key TEXT,
  user_tail_tag TEXT,
  rfid_space_removed TEXT,
  apply_feed_as_dm_kgs BOOLEAN NOT NULL DEFAULT FALSE,
  current_number_users INTEGER,
  data_collector_scales_type TEXT,
  scales_file_folder TEXT,
  units_per_ton INTEGER,
  date_db_last_updated DATE,
  last_ohead_application TIMESTAMPTZ,
  v11_database TEXT,
  dflt_wg_per_day NUMERIC(10,2),
  nsa_cust_id TEXT,
  nsa_email TEXT,
  nsa_client TEXT,
  user_logon TEXT,
  digistar_datalink TEXT,
  padd_tail_tag TEXT,
  date_last_feed_trans_compression DATE,
  digistar_datakey TEXT,
  password_complexity TEXT NOT NULL,
  abn TEXT,
  acn TEXT,
  address TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  logo BYTEA,
  titration_feeding TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Company_Settings (7 rows)
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  module_name TEXT NOT NULL,
  setting_name TEXT NOT NULL,
  setting_value TEXT,
  date_created DATE,
  date_modified DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cust_Feed_Charges (1 rows)
CREATE TABLE IF NOT EXISTS custom_feed_charges (
  id SERIAL PRIMARY KEY,
  purch_lot_no TEXT,
  ration TEXT,
  sum_of_units NUMERIC(12,2),
  avg_of_custom_feed_charge_ton NUMERIC(12,2),
  feed_charge NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Feedlot_Staff (44 rows)
CREATE TABLE IF NOT EXISTS feedlot_staff (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  surname TEXT NOT NULL,
  first_name TEXT,
  job_desc TEXT,
  start_date DATE,
  finish_date DATE,
  pass_word TEXT,
  cattle_data_entry TEXT,
  cattle_reports TEXT,
  cattle_utilities TEXT,
  cattle_lookup_tables TEXT,
  feed_system_data_entry TEXT,
  feed_system_reports TEXT,
  feed_system_utilities TEXT,
  pl_reports_allowed TEXT,
  pen_rider BOOLEAN DEFAULT FALSE,
  cattle_deletes TEXT,
  password_last_changed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Mort_Morb_triggers (32 rows)
CREATE TABLE IF NOT EXISTS mort_morb_triggers (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  cof_from INTEGER,
  cof_to INTEGER,
  pulls_actual INTEGER,
  deaths_actual INTEGER,
  level1_pulls_trigger INTEGER,
  level1_deaths_trigger INTEGER,
  level2_deaths_trigger INTEGER,
  level3_deaths_trigger INTEGER,
  include_in_report BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: PackageCosts (3 rows)
CREATE TABLE IF NOT EXISTS package_costs (
  id SERIAL PRIMARY KEY,
  country_code INTEGER NOT NULL,
  basic_package NUMERIC(12,2),
  price_per_thousand_head NUMERIC(12,2),
  basic_feeding NUMERIC(12,2),
  vet_records NUMERIC(12,2),
  vet_reporting NUMERIC(12,2),
  crush_side_proc NUMERIC(12,2),
  feed_commods_system NUMERIC(12,2),
  price_as_at_date DATE,
  upsize_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Pen_Rider_Tolerances (1 rows)
CREATE TABLE IF NOT EXISTS pen_rider_tolerances (
  id SERIAL PRIMARY KEY,
  pulls_le_45_dof_from INTEGER,
  pulls_le_45_dof_to INTEGER,
  pulls_46_120_dof_from INTEGER,
  pulls_46_120_dof_to INTEGER,
  pulls_121_200_dof_from INTEGER,
  pulls_121_200_dof_to INTEGER,
  pulls_gt_200_dof_from INTEGER,
  pulls_gt_200_dof_to INTEGER,
  pulls_total_from INTEGER,
  pulls_totals_to INTEGER,
  treat_success_pcnt_lt_45_dof_from INTEGER,
  treat_success_pcnt_lt_45_dof_to INTEGER,
  treat_success_pcnt_46_120_dof_from INTEGER,
  treat_success_pcnt_46_120_dof_to INTEGER,
  treat_success_pcnt_121_200_dof_from INTEGER,
  treat_success_pcnt_121_200_dof_to INTEGER,
  treat_success_pcnt_gt_200_dof_from INTEGER,
  treat_success_pcnt_gt_200_dof_to INTEGER,
  treat_success_totals_from INTEGER,
  treat_success_totals_to INTEGER,
  death_alloc_le_45_dof_from INTEGER,
  death_alloc_le_45_dof_to INTEGER,
  death_alloc_46_120_dof_from INTEGER,
  death_alloc_46_120_dof_to INTEGER,
  death_alloc_121_200_dof_from INTEGER,
  death_alloc_121_200_dof_to INTEGER,
  death_alloc_gt_200_dof_from INTEGER,
  death_alloc_gt_200_dof_to INTEGER,
  death_alloc_total_from INTEGER,
  death_alloc_total_to INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Price_adjustment_by_weight_range (0 rows)
CREATE TABLE IF NOT EXISTS price_adjustment_by_weight (
  id SERIAL PRIMARY KEY,
  lot_number TEXT NOT NULL,
  weight_from INTEGER,
  weight_to INTEGER,
  head INTEGER,
  dollars_per_kg_adjustment NUMERIC(12,4),
  applied_to_cattle_pricing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: RV_Scheduled_DOF (6 rows)
CREATE TABLE IF NOT EXISTS rv_scheduled_dof (
  id SERIAL PRIMARY KEY,
  dof INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Tax_Invoice_Bank_details (1 rows)
CREATE TABLE IF NOT EXISTS tax_invoice_bank_details (
  id SERIAL PRIMARY KEY,
  company_name TEXT,
  address TEXT,
  telephone TEXT,
  fax_number TEXT,
  abn TEXT,
  bank_ac_name TEXT,
  bank_name TEXT,
  bank_bsb TEXT,
  bank_ac_number TEXT,
  gst_rate NUMERIC(5,2),
  default_days_invoice_due INTEGER,
  account_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Carcase_DataType2 (0 rows) — excluded (unused alternative schema)

-- Source: Carcase_import_Data (50 rows)
CREATE TABLE IF NOT EXISTS carcase_import_data (
  id SERIAL PRIMARY KEY,
  col1 TEXT,
  col2 TEXT,
  col3 TEXT,
  col4 TEXT,
  col5 TEXT,
  col6 TEXT,
  col7 TEXT,
  col8 TEXT,
  col9 TEXT,
  col10 TEXT,
  col11 TEXT,
  col12 TEXT,
  col13 TEXT,
  col14 TEXT,
  col15 TEXT,
  col16 TEXT,
  col17 TEXT,
  col18 TEXT,
  col19 TEXT,
  col20 TEXT,
  col21 TEXT,
  col22 TEXT,
  col23 TEXT,
  col24 TEXT,
  col25 TEXT,
  warning TEXT,
  error TEXT,
  import_date DATE,
  session_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Carcase_Prices (0 rows)
CREATE TABLE IF NOT EXISTS carcase_prices (
  id SERIAL PRIMARY KEY,
  sold_to_id INTEGER NOT NULL,
  kill_date_from DATE NOT NULL,
  kill_date_to DATE NOT NULL,
  marbling_from NUMERIC(5,2) NOT NULL,
  marbling_to NUMERIC(5,2) NOT NULL,
  meat_colour_from TEXT NOT NULL,
  meat_colour_to TEXT NOT NULL,
  price_per_kg NUMERIC(12,4) NOT NULL,
  live_or_carc_wght TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Chemical_inventory (550 rows)
CREATE TABLE IF NOT EXISTS chemical_inventory (
  id SERIAL PRIMARY KEY,
  chemical_drug_id INTEGER NOT NULL,
  purchase_date DATE,
  purchase_quantity NUMERIC(10,2),
  units TEXT,
  supplier TEXT,
  batch_number TEXT,
  expiry_date DATE,
  disposal_comment TEXT,
  stocktake_date DATE,
  stocktake_qty NUMERIC(10,2),
  disposal_date DATE,
  disposal_qty NUMERIC(10,2),
  invoice_amount NUMERIC(12,2),
  invoice_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Chemical_inventory_old (252 rows)
CREATE TABLE IF NOT EXISTS chemical_inventory_old (
  id SERIAL PRIMARY KEY,
  chemical_drug_id INTEGER NOT NULL,
  purchase_date TEXT,
  purchase_quantity NUMERIC(10,2),
  units TEXT,
  supplier TEXT,
  batch_number TEXT,
  expiry_date TEXT,
  disposal_comment TEXT,
  stocktake_date TEXT,
  stocktake_qty NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drug_HGP_Forms (51 rows)
CREATE TABLE IF NOT EXISTS drug_hgp_forms (
  id SERIAL PRIMARY KEY,
  drug_receival_id INTEGER NOT NULL,
  hgp_decl_form_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drug_Stocktake_records (987 rows)
CREATE TABLE IF NOT EXISTS drug_stocktake_records (
  id SERIAL PRIMARY KEY,
  stocktake_id INTEGER NOT NULL,
  drug_id INTEGER NOT NULL,
  units_per_box_or_bottle INTEGER,
  on_hand_theoritical NUMERIC(10,2),
  counted NUMERIC(10,2),
  diffrence NUMERIC(10,2),
  reorder_soh_units_trigger INTEGER,
  applied_to_soh TEXT,
  box_bottles_on_hand NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drug_Stocktakes (29 rows)
CREATE TABLE IF NOT EXISTS drug_stocktakes (
  id SERIAL PRIMARY KEY,
  stocktake_id INTEGER NOT NULL,
  stock_date DATE NOT NULL,
  done_by TEXT,
  notes TEXT,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drug_Transfer_Records (0 rows)
CREATE TABLE IF NOT EXISTS drug_transfer_records (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL,
  drug_id INTEGER NOT NULL,
  units_per_box_or_bottle INTEGER,
  on_hand_theoretical NUMERIC(10,2),
  transferred NUMERIC(10,2),
  remaining NUMERIC(10,2),
  reorder_soh_units_trigger INTEGER,
  applied_to_soh TEXT,
  box_bottles_on_hand NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drug_Transfers (0 rows)
CREATE TABLE IF NOT EXISTS drug_transfers (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL,
  transfer_date DATE NOT NULL,
  transfer_location TEXT,
  done_by TEXT,
  notes TEXT,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Drugs_Purchase_event (156 rows)
CREATE TABLE IF NOT EXISTS drug_purchase_events (
  id SERIAL PRIMARY KEY,
  drug_receival_id INTEGER NOT NULL,
  date_received DATE NOT NULL,
  supplier_id INTEGER,
  order_ref_number TEXT,
  received_by TEXT,
  invoice_paid BOOLEAN DEFAULT FALSE,
  notes TEXT,
  applied_to_inventory BOOLEAN DEFAULT FALSE,
  hgp_form_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Instrument_Calibration_tests (48 rows)
CREATE TABLE IF NOT EXISTS instrument_calibration_tests (
  id SERIAL PRIMARY KEY,
  instrument_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  testing_method TEXT NOT NULL,
  tester_name TEXT,
  test_notes TEXT NOT NULL,
  data_applied_to_instruments BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Instruments_needing_Calibration (5 rows)
CREATE TABLE IF NOT EXISTS instruments_needing_calibration (
  id SERIAL PRIMARY KEY,
  instrument_name TEXT NOT NULL,
  testing_frequency TEXT NOT NULL,
  date_last_tested DATE NOT NULL,
  testing_method TEXT,
  inactive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: KD1_Records (53 rows)
CREATE TABLE IF NOT EXISTS kd1_records (
  id SERIAL PRIMARY KEY,
  ear_tag TEXT,
  weight NUMERIC(10,2),
  hash TEXT,
  ident TEXT,
  eid TEXT,
  error_mess TEXT,
  group_name TEXT,
  teeth TEXT,
  weigh_note TEXT,
  sex TEXT,
  pen_number TEXT,
  p8_fat TEXT,
  add_or_update TEXT,
  supplier_ear_tag TEXT,
  rudd800_traits TEXT,
  lot_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Livestock_Weighbridge_Dockets (224 rows) — merged into weighbridge_dockets

-- Source: Trial_Description (0 rows) — merged into trials

-- Source: Agistment_Transfer_Register (0 rows)
CREATE TABLE IF NOT EXISTS agistment_transfers (
  id SERIAL PRIMARY KEY,
  movement_date DATE,
  agist_lot_no TEXT,
  agistor_code INTEGER,
  numb_head INTEGER,
  numb_died INTEGER,
  w_bridge_docket TEXT,
  return_wght INTEGER,
  weight_cattle_sent INTEGER,
  agist_weight_gain INTEGER,
  weight_gain_dollarper_kg NUMERIC(19,4),
  inv_number TEXT,
  inv_amount NUMERIC(19,4),
  agist_inv_approved TIMESTAMPTZ,
  carrier TEXT,
  carrier_inv_no TEXT,
  freight_amount NUMERIC(19,4),
  frght_inv_approved TIMESTAMPTZ,
  applied_to_cattle_file BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  agistor_tail_tag TEXT,
  vendor_decl_numb TEXT,
  custom_fl_returns BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Beast_Accumed_Feed_by_commodity (0 rows)
CREATE TABLE IF NOT EXISTS beast_feed_by_commodity (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  commodity_code INTEGER NOT NULL,
  accumed_kgs NUMERIC(10,2) NOT NULL,
  accumed_cost NUMERIC(12,2) NOT NULL,
  accumed_cust_feed_charge NUMERIC(12,2) NOT NULL,
  date_last_updated DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Beast_Breeding (0 rows)
CREATE TABLE IF NOT EXISTS beast_breeding (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  birth_date DATE,
  birth_wght NUMERIC(10,2),
  sire INTEGER,
  dam INTEGER,
  genetics INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Beast_Ohead_Appl_History (0 rows)
CREATE TABLE IF NOT EXISTS beast_overhead_history (
  id SERIAL PRIMARY KEY,
  ohead_appl_month_end_date DATE,
  ohead_cost_per_hd_day NUMERIC(19,4),
  ohead_gross_value NUMERIC(19,4),
  ohead_head INTEGER,
  ohead_cost_per_hd_day_pen1 NUMERIC(19,4),
  ohead_gross_value_pen1 NUMERIC(19,4),
  ohead_head_pen1 INTEGER,
  ohead_cost_per_hd_day_pen2 NUMERIC(19,4),
  ohead_gross_value_pen2 NUMERIC(19,4),
  ohead_head_pen2 INTEGER,
  ohead_cost_per_hd_day_pen3 NUMERIC(19,4),
  ohead_gross_value_pen3 NUMERIC(19,4),
  ohead_head_pen3 INTEGER,
  ohead_cost_per_hd_day_pen4 NUMERIC(19,4),
  ohead_gross_value_pen4 NUMERIC(19,4),
  ohead_head_pen4 INTEGER,
  ohead_cost_per_hd_day_pen5 NUMERIC(19,4),
  ohead_gross_value_pen5 NUMERIC(19,4),
  ohead_head_pen5 INTEGER,
  ohead_cost_per_hd_day_oth NUMERIC(19,4),
  ohead_gross_value_oth NUMERIC(19,4),
  ohead_head_oth INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: BeastMovement (181 rows)
CREATE TABLE IF NOT EXISTS beast_movements (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  move_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Breeding_Dams (0 rows)
CREATE TABLE IF NOT EXISTS breeding_dams (
  id SERIAL PRIMARY KEY,
  dam_id INTEGER NOT NULL,
  dam_name TEXT NOT NULL,
  dam_supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Breeding_Sires (0 rows)
CREATE TABLE IF NOT EXISTS breeding_sires (
  id SERIAL PRIMARY KEY,
  sire_id INTEGER NOT NULL,
  sire_name TEXT NOT NULL,
  sire_supplier TEXT,
  sire_line_id INTEGER,
  awa_sire_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_DOF_and_DIP (0 rows)
CREATE TABLE IF NOT EXISTS cattle_dof_dip (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  dof INTEGER,
  dip INTEGER,
  date_calculated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_Feed_Update (10972 rows)
CREATE TABLE IF NOT EXISTS cattle_feed_updates (
  id SERIAL PRIMARY KEY,
  pen_number TEXT,
  feed_date DATE,
  head INTEGER,
  dollars_applied NUMERIC(12,2),
  kgs_feed_as_fed NUMERIC(10,2),
  ration_name TEXT,
  head_expected INTEGER,
  dollars_not_applied NUMERIC(12,2),
  kgs_not_applied NUMERIC(10,2),
  est_curr_wght BIGINT,
  date_applied DATE,
  run_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_Photos (0 rows)
CREATE TABLE IF NOT EXISTS cattle_photos (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  ear_tag TEXT,
  photo BYTEA,
  date_last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: CattleProcessed (4636 rows)
CREATE TABLE IF NOT EXISTS cattle_processed (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  weigh_date DATE,
  draft_gate INTEGER,
  saved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: ContactsContactTypes (0 rows)
CREATE TABLE IF NOT EXISTS contacts_contact_types (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL,
  contact_type_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: New_cattle_records_Log (0 rows)
CREATE TABLE IF NOT EXISTS new_cattle_records_log (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  date_record_added DATE,
  mod_ule TEXT,
  proceedure_name TEXT,
  user_number INTEGER,
  ear_tag TEXT,
  eid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Paddock_Feeding (0 rows)
CREATE TABLE IF NOT EXISTS paddock_feeding (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  paddock_feed_type TEXT,
  from_date DATE,
  to_date DATE,
  commodity_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Pen_Data_From_FeedDB (41 rows)
CREATE TABLE IF NOT EXISTS pen_data_from_feed_db (
  id SERIAL PRIMARY KEY,
  pen_number_id INTEGER NOT NULL,
  pen_name TEXT NOT NULL,
  mob_name TEXT,
  numb_head INTEGER NOT NULL,
  ration_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Pending_Feed_Data (0 rows)
CREATE TABLE IF NOT EXISTS pending_feed_data (
  id SERIAL PRIMARY KEY,
  feed_date DATE,
  pen_name TEXT,
  head INTEGER,
  ration_name TEXT,
  feed_weight NUMERIC(10,2),
  pen_feeds_rec_id INTEGER,
  apply_to_group TEXT,
  head_selected INTEGER,
  applied BOOLEAN DEFAULT FALSE,
  never_apply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: PenRiders_log (0 rows)
CREATE TABLE IF NOT EXISTS pen_riders_log (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  initials TEXT NOT NULL,
  date_pen_checked DATE NOT NULL,
  pen_name TEXT NOT NULL,
  head_in_pen INTEGER NOT NULL,
  diagnoser BOOLEAN NOT NULL DEFAULT FALSE,
  dof INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: PensFed (1 rows)
CREATE TABLE IF NOT EXISTS pens_fed (
  id SERIAL PRIMARY KEY,
  feed_date DATE NOT NULL,
  pen_number TEXT NOT NULL,
  ration_name TEXT NOT NULL,
  kilos_fed NUMERIC(10,2),
  feed_value NUMERIC(12,2),
  applied_to_cattle TEXT,
  dry_matter NUMERIC(10,2),
  last_modified_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Purch_Lot_Cattle (40 rows)
CREATE TABLE IF NOT EXISTS purchase_lot_cattle (
  id SERIAL PRIMARY KEY,
  lot_number TEXT,
  numb_head INTEGER,
  price_cnts_per_kg NUMERIC(12,4),
  weight NUMERIC(10,2),
  tail_tag TEXT,
  vndr_decl_no TEXT,
  agistment_pic TEXT,
  last_modified_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Resp_Disease_ReTreats (0 rows)
CREATE TABLE IF NOT EXISTS resp_disease_retreats (
  id SERIAL PRIMARY KEY,
  drug_count INTEGER NOT NULL,
  drugs TEXT,
  head INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Rudd_800_Traits (0 rows)
CREATE TABLE IF NOT EXISTS rudd_800_traits (
  id SERIAL PRIMARY KEY,
  db_fld_name TEXT,
  start_pos INTEGER,
  fld_len INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: SB_Rec_No_Booked (1 rows)
CREATE TABLE IF NOT EXISTS sb_rec_no_booked (
  id SERIAL PRIMARY KEY,
  sb_rec_no_booked INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: SCU_RecData (9 rows)
CREATE TABLE IF NOT EXISTS scu_rec_data (
  id SERIAL PRIMARY KEY,
  mth_seq INTEGER,
  month TEXT,
  scu_value NUMERIC(12,2),
  head_days NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Sick_Beast_BRD_Symptoms (0 rows)
CREATE TABLE IF NOT EXISTS sick_beast_brd_symptoms (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  runny_nose BOOLEAN DEFAULT FALSE,
  runny_eyes BOOLEAN DEFAULT FALSE,
  drool_slobber BOOLEAN DEFAULT FALSE,
  coughing BOOLEAN DEFAULT FALSE,
  increased_breathing_rate BOOLEAN DEFAULT FALSE,
  laboured_breathing BOOLEAN DEFAULT FALSE,
  reduced_gut_fill BOOLEAN DEFAULT FALSE,
  sb_rec_no INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Sick_Beast_Temperature (3575 rows)
CREATE TABLE IF NOT EXISTS sick_beast_temperatures (
  id SERIAL PRIMARY KEY,
  sb_rec_no INTEGER,
  temp_date DATE,
  temperature NUMERIC(5,2),
  beast_id INTEGER,
  weight NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: StockRecData (10 rows)
CREATE TABLE IF NOT EXISTS stock_rec_data (
  id SERIAL PRIMARY KEY,
  line_head TEXT,
  head NUMERIC(12,2),
  value NUMERIC(12,2),
  animal_cost NUMERIC(12,2),
  freight NUMERIC(12,2),
  agist_and_feed NUMERIC(12,2),
  other_costs NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Tag_Bucket_File (0 rows)
CREATE TABLE IF NOT EXISTS tag_bucket (
  id SERIAL PRIMARY KEY,
  rfid_number TEXT NOT NULL,
  nlis_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Archiving_Log (1 rows) — merged into archives

-- Source: Batch_Update_log (3582 rows)
CREATE TABLE IF NOT EXISTS batch_update_log (
  id SERIAL PRIMARY KEY,
  date_done DATE NOT NULL,
  username TEXT,
  user_id TEXT,
  logtext TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Carc_Feedback_Compliance (0 rows)
CREATE TABLE IF NOT EXISTS carcase_feedback_compliance (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  supplier_name TEXT,
  detail_lot_no TEXT,
  hist_lot_no TEXT,
  pref_intake_fat TEXT,
  intake_fat_group NUMERIC(10,2),
  intake_fat_hist NUMERIC(10,2),
  pref_intake_wght TEXT,
  intake_wght_group NUMERIC(10,2),
  intake_wght_hist NUMERIC(10,2),
  pref_intake_teeth TEXT,
  intake_teeth_group NUMERIC(10,2),
  intake_teeth_hist NUMERIC(10,2),
  pref_sale_wght TEXT,
  sale_wght_group NUMERIC(10,2),
  sale_wght_hist NUMERIC(10,2),
  pref_wgd TEXT,
  wgd_group NUMERIC(10,2),
  wgd_hist NUMERIC(10,2),
  pref_dress_pcnt TEXT,
  dress_pcnt_group NUMERIC(5,2),
  dress_pcnt_hist NUMERIC(5,2),
  pref_mrb TEXT,
  mrb_group NUMERIC(5,2),
  mrb_hist NUMERIC(5,2),
  pref_carc_p8 TEXT,
  carc_p8_group NUMERIC(10,2),
  carc_p8_hist NUMERIC(10,2),
  pref_ema TEXT,
  ema_group NUMERIC(10,2),
  ema_hist NUMERIC(10,2),
  pref_fat_col TEXT,
  fat_col_group NUMERIC(5,2),
  fat_col_hist NUMERIC(5,2),
  pref_meat_col TEXT,
  meat_col_group NUMERIC(5,2),
  meat_col_hist NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Carc_Feedback_Mth_Avgs (0 rows)
CREATE TABLE IF NOT EXISTS carcase_feedback_monthly_avgs (
  id SERIAL PRIMARY KEY,
  yr_mnth TEXT NOT NULL,
  sale_wght NUMERIC(10,2),
  dof NUMERIC(10,2),
  wg_day NUMERIC(10,2),
  carc_wght NUMERIC(10,2),
  dress_pcnt NUMERIC(5,2),
  carc_teeth NUMERIC(5,2),
  p8_fat NUMERIC(5,2),
  eye_mscle_area NUMERIC(10,2),
  marbling NUMERIC(5,2),
  fat_colour NUMERIC(5,2),
  meat_text NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Carc_Feedback_Report_data (0 rows)
CREATE TABLE IF NOT EXISTS carcase_feedback_report_data (
  id SERIAL PRIMARY KEY,
  record_type INTEGER,
  beast_id INTEGER,
  supplier_id INTEGER,
  ear_tag_no TEXT,
  yr_mnth TEXT,
  purch_date DATE,
  purch_wght NUMERIC(10,2),
  vendor_tag TEXT,
  fl_ent_date DATE,
  fl_ent_wght NUMERIC(10,2),
  sale_date DATE,
  sale_wght NUMERIC(10,2),
  wg_day NUMERIC(10,2),
  dof NUMERIC(10,2),
  carc_wght NUMERIC(10,2),
  dress_pcnt NUMERIC(5,2),
  carc_teeth NUMERIC(5,2),
  p8_fat NUMERIC(5,2),
  eye_mscle_area INTEGER,
  marbling NUMERIC(5,2),
  fat_colour NUMERIC(5,2),
  meat_colour NUMERIC(5,2),
  meat_text NUMERIC(5,2),
  died BOOLEAN NOT NULL DEFAULT FALSE,
  sickness_costs NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_by_Location_Table (0 rows)
CREATE TABLE IF NOT EXISTS cattle_by_location (
  id SERIAL PRIMARY KEY,
  entry_month TEXT,
  rv_count INTEGER,
  rv_prime_cost NUMERIC(12,2),
  rv_feed_cost NUMERIC(12,2),
  rv_other_costs NUMERIC(12,2),
  cust_fl_count INTEGER,
  cust_fl_prime_cost NUMERIC(12,2),
  cust_fl_feed_cost NUMERIC(12,2),
  cust_fl_other_costs NUMERIC(12,2),
  rv_fl_entry_wght NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Cattle_Query_Month_Report_TAB (0 rows)
CREATE TABLE IF NOT EXISTS cattle_query_month_report (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  current_loc_type_id INTEGER,
  start_date DATE,
  weigh_date DATE,
  weighing_type INTEGER,
  weight NUMERIC(10,2),
  to_locn_type_id INTEGER,
  to_from_agistor INTEGER,
  beast_sale_type_id INTEGER,
  cull_reason_id TEXT,
  be_agist_lot_no TEXT,
  lot_number TEXT,
  purchase_date DATE,
  prime_cost NUMERIC(12,2),
  feed_cost NUMERIC(12,2),
  oheads_cost NUMERIC(12,2),
  other_costs NUMERIC(12,2),
  mkt_cat TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: CustFeed_Invoices_list (7567 rows)
CREATE TABLE IF NOT EXISTS custom_feed_invoices (
  id SERIAL PRIMARY KEY,
  purch_lot_no TEXT,
  period_from TIMESTAMPTZ,
  period_to TIMESTAMPTZ,
  cattle_owner TEXT,
  invoice_number TEXT,
  total_charges NUMERIC(12,2),
  gst_rate NUMERIC(5,2),
  billing_company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Custfeed_Lot_Summary (1 rows)
CREATE TABLE IF NOT EXISTS custom_feed_lot_summary (
  id SERIAL PRIMARY KEY,
  purch_lot_no TEXT NOT NULL,
  date_started DATE,
  cattle_class TEXT,
  avg_in_wght NUMERIC(10,2),
  tag_range TEXT,
  head_in INTEGER,
  deads INTEGER,
  shipped INTEGER,
  current_hospital INTEGER,
  current_bullers INTEGER,
  current_non_performers INTEGER,
  current_head INTEGER,
  calender_days_on_feed_period INTEGER,
  calender_days_on_feed_to_date INTEGER,
  avg_days_in_feed_period INTEGER,
  avg_days_to_date INTEGER,
  avg_feed_cost_per_hd_per_day_period NUMERIC(12,2),
  avg_feed_cost_per_hd_per_day_to_date NUMERIC(12,2),
  feed_charges_period NUMERIC(12,2),
  feed_charges_to_date NUMERIC(12,2),
  head_days_period INTEGER,
  head_days_to_date INTEGER,
  kgs_feed_period NUMERIC(10,2),
  kgs_feed_to_date NUMERIC(10,2),
  induction_costs_period NUMERIC(12,2),
  induction_costs_to_date NUMERIC(12,2),
  other_costs_period NUMERIC(12,2),
  other_costs_to_date NUMERIC(12,2),
  cattle_owner TEXT,
  agist_rate_per_day NUMERIC(12,2),
  head_arrived_in_period NUMERIC(10,2) NOT NULL,
  head_shipped_in_period INTEGER NOT NULL,
  head_at_period_start INTEGER NOT NULL,
  died_in_period INTEGER NOT NULL,
  drugs_costs_in_period NUMERIC(12,2) NOT NULL,
  drugs_costs_to_date NUMERIC(12,2) NOT NULL,
  comments TEXT,
  cattle_owner_id INTEGER,
  cattle_owner_details TEXT,
  days_invoice_due INTEGER,
  agist_days_for_period INTEGER,
  agist_days_to_date INTEGER,
  dry_kgs_feed_period NUMERIC(10,2),
  dry_kgs_feed_to_date NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Daily_Cattle_Inventory (0 rows)
CREATE TABLE IF NOT EXISTS daily_cattle_inventory (
  id SERIAL PRIMARY KEY,
  inventory_date DATE NOT NULL,
  fl_entries INTEGER,
  x_rv_paddock INTEGER,
  fl_deaths INTEGER,
  fl_culls INTEGER,
  fl_sales INTEGER,
  calc_fl_head INTEGER,
  actual_fl_head INTEGER,
  accum_month_head_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Error_Log (42 rows)
CREATE TABLE IF NOT EXISTS error_log (
  id SERIAL PRIMARY KEY,
  event_date DATE,
  mod_ule TEXT,
  proceedure_name TEXT,
  error_code INTEGER,
  error_message TEXT,
  user_number INTEGER,
  e_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Feed_Totals_By_Ration (168 rows)
CREATE TABLE IF NOT EXISTS feed_totals_by_ration (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  ration TEXT,
  kgs_fed NUMERIC(10,2),
  feed_cost NUMERIC(12,2),
  units_dry_matter NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Head_By_Disease (0 rows)
CREATE TABLE IF NOT EXISTS head_by_disease (
  id SERIAL PRIMARY KEY,
  body_system TEXT,
  disease_name TEXT,
  total_head INTEGER,
  recovered INTEGER,
  paddock INTEGER,
  sold INTEGER,
  died INTEGER,
  treated_and_died INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Last_7_Days_Pulls_Headcounts (0 rows)
CREATE TABLE IF NOT EXISTS last_7_days_pulls (
  id SERIAL PRIMARY KEY,
  pen TEXT,
  head_at_start INTEGER,
  head_n_days_ago INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Month_End_StockOnHand (0 rows)
CREATE TABLE IF NOT EXISTS month_end_stock_on_hand (
  id SERIAL PRIMARY KEY,
  month_end_date DATE NOT NULL,
  soh_head INTEGER,
  soh_prime_cost NUMERIC(19,4),
  soh_feed_cost NUMERIC(19,4),
  soh_oheads_cost NUMERIC(19,4),
  total_costs NUMERIC(19,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Monthly_Adjustment_OB (0 rows)
CREATE TABLE IF NOT EXISTS monthly_adjustment_ob (
  id SERIAL PRIMARY KEY,
  month_end_date DATE NOT NULL,
  head INTEGER,
  prime_cost NUMERIC(19,4),
  feed_cost NUMERIC(19,4),
  other_costs NUMERIC(19,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Monthly_Agistor_Movements (0 rows)
CREATE TABLE IF NOT EXISTS monthly_agistor_movements (
  id SERIAL PRIMARY KEY,
  rec_id INTEGER NOT NULL,
  month_end_date DATE,
  agistor_id INTEGER,
  seq_no INTEGER,
  section_name TEXT,
  head INTEGER,
  prime_cost NUMERIC(19,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Monthly_Feedlot_Reconciliation (0 rows)
CREATE TABLE IF NOT EXISTS monthly_feedlot_reconciliation (
  id SERIAL PRIMARY KEY,
  rec_id INTEGER NOT NULL,
  month_end_date DATE,
  seq_no INTEGER,
  section_heading TEXT,
  section_name TEXT,
  head INTEGER,
  prime_cost NUMERIC(19,4),
  feed_cost NUMERIC(19,4),
  other_costs NUMERIC(19,4),
  total_costs NUMERIC(19,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Monthly_FL_Intake_Cost (0 rows)
CREATE TABLE IF NOT EXISTS monthly_fl_intake_cost (
  id SERIAL PRIMARY KEY,
  rec_id INTEGER NOT NULL,
  month_end_date DATE,
  group_no INTEGER,
  seq_no INTEGER,
  section_name TEXT,
  head INTEGER,
  prime_cost NUMERIC(19,4),
  intake_kgs INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Monthly_Movements (0 rows)
CREATE TABLE IF NOT EXISTS monthly_movements (
  id SERIAL PRIMARY KEY,
  rec_id INTEGER NOT NULL,
  month_end_date DATE,
  section_seq_number INTEGER,
  section_name TEXT,
  sub_section TEXT,
  culls_head INTEGER,
  culls_kgs INTEGER,
  culls_prime_cost NUMERIC(19,4),
  culls_feed_cost NUMERIC(19,4),
  culls_other_costs NUMERIC(19,4),
  rv_agist_head INTEGER,
  rv_agist_kgs INTEGER,
  rv_agist_prime_cost NUMERIC(19,4),
  rv_agist_feed_cost NUMERIC(19,4),
  rv_agist_other_costs NUMERIC(19,4),
  feed_lot_head INTEGER,
  feedlot_kgs INTEGER,
  feed_lot_prime_cost NUMERIC(19,4),
  feed_lot_feed_cost NUMERIC(19,4),
  feed_lot_other_costs NUMERIC(19,4),
  agist_head INTEGER,
  agist_kgs INTEGER,
  agist_prime_cost NUMERIC(19,4),
  agist_feed_cost NUMERIC(19,4),
  agist_other_costs NUMERIC(19,4),
  cust_feedlot_head INTEGER,
  cust_feedlot_kgs INTEGER,
  cust_feedlot_prime_cost NUMERIC(19,4),
  cust_feedlot_feed_cost NUMERIC(19,4),
  cust_feedlot_other_costs NUMERIC(19,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Monthly_RV_Agist_Reconciliation (0 rows)
CREATE TABLE IF NOT EXISTS monthly_rv_agist_reconciliation (
  id SERIAL PRIMARY KEY,
  rec_id INTEGER NOT NULL,
  month_end_date DATE,
  seq_no INTEGER,
  section_heading TEXT,
  section_name TEXT,
  head INTEGER,
  prime_cost NUMERIC(19,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Pen_mort_morb_list (444 rows)
CREATE TABLE IF NOT EXISTS pen_mort_morb (
  id SERIAL PRIMARY KEY,
  pen_number TEXT,
  dof INTEGER,
  purch_lot_no TEXT,
  count_of_ear_tag INTEGER,
  head_sick INTEGER,
  head_died INTEGER,
  entry_date TEXT,
  head_days INTEGER,
  feed_yesterday NUMERIC(10,2),
  feed_last_3_days NUMERIC(10,2),
  feed_last_7_days NUMERIC(10,2),
  average_entry_weight NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: PenList_AsAt (896 rows)
CREATE TABLE IF NOT EXISTS pen_list_snapshots (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  pen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Purchase_Totals (0 rows)
CREATE TABLE IF NOT EXISTS purchase_totals (
  id SERIAL PRIMARY KEY,
  tail_tag TEXT NOT NULL,
  start_date DATE NOT NULL,
  head INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: Sick_By_DOF (12 rows)
CREATE TABLE IF NOT EXISTS sick_by_dof (
  id SERIAL PRIMARY KEY,
  disease_id INTEGER,
  pre_fl_entry INTEGER,
  days_0_29 INTEGER,
  days_30_59 INTEGER,
  days_60_89 INTEGER,
  days_90_119 INTEGER,
  days_120_159 INTEGER,
  days_160_189 INTEGER,
  days_190_219 INTEGER,
  days_220_249 INTEGER,
  days_250_289 INTEGER,
  days_290_319 INTEGER,
  days_320_359 INTEGER,
  more_than360_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: SOH_by_Month (24297 rows)
CREATE TABLE IF NOT EXISTS stock_on_hand_monthly (
  id SERIAL PRIMARY KEY,
  mnth_yyy_ymmm TEXT NOT NULL,
  head INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: TandR_Buying_details (0 rows)
CREATE TABLE IF NOT EXISTS trading_buying_details (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER NOT NULL,
  agent_id INTEGER,
  buyer_id INTEGER,
  supplier_id INTEGER,
  sale_yard_pen TEXT,
  animal_grade TEXT,
  sale_yard_or_paddock TEXT,
  payment_status TEXT,
  date_purchased DATE,
  date_paid DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: TandR_Costs_Report (132 rows)
CREATE TABLE IF NOT EXISTS trading_costs_report (
  id SERIAL PRIMARY KEY,
  beast_id INTEGER,
  eid TEXT,
  group_name TEXT,
  col1 NUMERIC(12,2),
  col2 NUMERIC(12,2),
  col3 NUMERIC(12,2),
  col4 NUMERIC(12,2),
  col5 NUMERIC(12,2),
  col6 NUMERIC(12,2),
  col7 NUMERIC(12,2),
  col8 NUMERIC(12,2),
  col9 NUMERIC(12,2),
  col10 NUMERIC(12,2),
  dress_weight NUMERIC(10,2),
  doll_per_kg_dressed NUMERIC(12,4),
  ear_tag TEXT,
  purch_lot_no TEXT,
  fl_entry_date DATE,
  fl_entry_wght NUMERIC(10,2),
  dof INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source: User_Log_Ons (1220 rows)
CREATE TABLE IF NOT EXISTS user_logons (
  id SERIAL PRIMARY KEY,
  user_number INTEGER NOT NULL,
  log_on_date_time TIMESTAMPTZ NOT NULL,
  term_inal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);



-- ── Additions to existing tables for maps-to-existing legacy tables ──

-- carcase_grades: add effective_from_date for legacy Carcase_Grades data
ALTER TABLE carcase_grades ADD COLUMN IF NOT EXISTS effective_from_date DATE;
ALTER TABLE carcase_grades ADD COLUMN IF NOT EXISTS price_dollar_per_kg NUMERIC(12,4);

-- location_types: add legacy_id for mapping
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS legacy_id INTEGER;

-- rations: add legacy columns for mapping
ALTER TABLE rations ADD COLUMN IF NOT EXISTS ration_number INTEGER;
ALTER TABLE rations ADD COLUMN IF NOT EXISTS feed_cost_per_tonne NUMERIC(12,4);
ALTER TABLE rations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE rations ADD COLUMN IF NOT EXISTS custom_feed_charge_ton NUMERIC(12,4);

-- treatment_regimes: relax name constraint and add legacy columns
ALTER TABLE treatment_regimes ALTER COLUMN name DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE treatment_regimes DROP CONSTRAINT IF EXISTS treatment_regimes_name_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS legacy_regime_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS drug_1_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS drug_2_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS drug_3_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS drug_4_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS drug_5_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS day_numb INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS dose NUMERIC(10,2);
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS dose_by_weight TEXT;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS drug_id INTEGER;
ALTER TABLE treatment_regimes ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- chemical_inventory_old: relax NOT NULL on columns that have NULL legacy data
ALTER TABLE chemical_inventory_old ALTER COLUMN purchase_date DROP NOT NULL;
ALTER TABLE chemical_inventory_old ALTER COLUMN units DROP NOT NULL;
ALTER TABLE chemical_inventory_old ALTER COLUMN supplier DROP NOT NULL;
ALTER TABLE chemical_inventory_old ALTER COLUMN batch_number DROP NOT NULL;
ALTER TABLE chemical_inventory_old ALTER COLUMN expiry_date DROP NOT NULL;


-- ── 5. Legacy / migration tables ──────────────────────

CREATE TABLE IF NOT EXISTS locations (
  id            SERIAL PRIMARY KEY,
  cow_id        INTEGER REFERENCES cows(id) ON DELETE RESTRICT,
  latitude      NUMERIC(10,6) NOT NULL,
  longitude     NUMERIC(10,6) NOT NULL,
  label         TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_cow ON locations(cow_id);
CREATE INDEX IF NOT EXISTS idx_locations_recorded ON locations(recorded_at DESC);

CREATE TABLE IF NOT EXISTS carcase_data (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE RESTRICT,
  legacy_beast_id     INTEGER,
  ear_tag             TEXT,
  eid                 TEXT,
  sold_to             TEXT,
  abattoir            TEXT,
  body_number         TEXT,
  kill_date           DATE,
  carc_weight_left    NUMERIC(10,2),
  carc_weight_right   NUMERIC(10,2),
  dress_pct           NUMERIC(5,2),
  teeth               SMALLINT,
  grade               TEXT,
  grade_id            INTEGER REFERENCES carcase_grades(id),
  price_per_kg_left   NUMERIC(12,4),
  price_per_kg_right  NUMERIC(12,4),
  p8_fat              NUMERIC(5,2),
  rib_fat             NUMERIC(5,2),
  muscle_score        TEXT,
  eye_muscle_area     NUMERIC(10,2),
  ph_level            NUMERIC(5,2),
  marbling            NUMERIC(5,2),
  fat_colour          SMALLINT,
  muscle_colour       TEXT,
  meat_texture        SMALLINT,
  meat_yield          NUMERIC(5,2),
  contract_no         TEXT,
  bruising_l          TEXT,
  bruising_r          TEXT,
  deduction_per_kg    NUMERIC(12,4),
  dockage_reason      TEXT,
  live_weight_shrink_pct NUMERIC(5,2),
  ossification        SMALLINT,
  msa_index           NUMERIC(10,2),
  hump_cold           SMALLINT,
  boning_group        TEXT,
  beast_sale_type     SMALLINT,
  boning_date            DATE,
  marbling_category      TEXT,
  marbling2              NUMERIC(5,2),
  firmness               TEXT,
  pricing_method         TEXT,
  chiller_number         TEXT,
  sold_to_contact_id     INTEGER,
  abattoir_contact_id    INTEGER,
  loin_temp              NUMERIC(5,2),
  carc_damage_l          TEXT,
  carc_damage_r          TEXT,
  marbling_bonus_rate    NUMERIC(12,4),
  rc_invoice_date        DATE,
  marbling_bonus_value   NUMERIC(12,2),
  hump_height            NUMERIC(5,2),
  meq_msa                NUMERIC(10,2),
  meq_aus_mrb            NUMERIC(10,2),
  abattoir_est_no        TEXT,
  legacy_modified_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carcase_cow  ON carcase_data(cow_id);
CREATE INDEX IF NOT EXISTS idx_carcase_kill ON carcase_data(kill_date);
CREATE INDEX IF NOT EXISTS idx_carcase_grade ON carcase_data(grade_id);

-- carcase_data: drop FK constraints on contact columns (legacy data references contacts not in contacts table)
ALTER TABLE carcase_data DROP CONSTRAINT IF EXISTS carcase_data_sold_to_contact_id_fkey;
ALTER TABLE carcase_data DROP CONSTRAINT IF EXISTS carcase_data_abattoir_contact_id_fkey;

CREATE TABLE IF NOT EXISTS autopsy_records (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE RESTRICT,
  legacy_beast_id     INTEGER,
  ear_tag             TEXT,
  date_dead           DATE,
  time_dead           TEXT,
  date_autopsy        DATE,
  autopsy_by          TEXT,
  pre_autopsy_diag    TEXT,
  post_autopsy_diag   TEXT,
  findings            JSONB DEFAULT '{}',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_autopsy_cow ON autopsy_records(cow_id);

CREATE TABLE IF NOT EXISTS location_changes (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE RESTRICT,
  legacy_beast_id     INTEGER NOT NULL,
  ear_tag             TEXT,
  eid                 TEXT,
  movement_date       TIMESTAMPTZ,
  from_location       TEXT,
  to_location         TEXT,
  is_new_animal       BOOLEAN DEFAULT FALSE,
  is_slaughtered      BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loc_change_cow ON location_changes(cow_id);

CREATE TABLE IF NOT EXISTS legacy_raw (
  id              SERIAL PRIMARY KEY,
  source_table    TEXT NOT NULL,
  row_data        JSONB NOT NULL,
  migrated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legacy_raw_table ON legacy_raw(source_table);

CREATE TABLE IF NOT EXISTS migration_log (
  id              SERIAL PRIMARY KEY,
  source_table    TEXT NOT NULL,
  rows_read       INTEGER DEFAULT 0,
  rows_written    INTEGER DEFAULT 0,
  rows_skipped    INTEGER DEFAULT 0,
  rows_errored    INTEGER DEFAULT 0,
  status          TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
  error_details   TEXT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);


-- ── 6. System tables ──────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_issues (
  id              SERIAL PRIMARY KEY,
  run_id          INTEGER NOT NULL,
  agent_type      TEXT NOT NULL,
  category        TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
  entity_table    TEXT,
  entity_id       INTEGER,
  title           TEXT NOT NULL,
  detail          JSONB DEFAULT '{}',
  recommended_fix TEXT,
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_issues_run_id   ON agent_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_issues_type     ON agent_issues(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_issues_severity ON agent_issues(severity);
CREATE INDEX IF NOT EXISTS idx_agent_issues_resolved ON agent_issues(resolved);

CREATE INDEX IF NOT EXISTS idx_treatment_regimes_disease ON treatment_regimes(disease_id);

CREATE TABLE IF NOT EXISTS drafting_settings (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings   JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instrument_calibrations (
  id                SERIAL PRIMARY KEY,
  instrument_name   TEXT NOT NULL,
  method            TEXT,
  last_calibrated   DATE,
  next_due          DATE,
  notes             TEXT
);

CREATE TABLE IF NOT EXISTS trials (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  trial_no      INTEGER,
  purpose       TEXT,
  description   TEXT,
  start_date    DATE,
  end_date      DATE,
  head_count    INTEGER,
  results       TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archives (
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
  legacy_records_archived INTEGER,
  legacy_date_done        DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cross-table FK constraints (added after all tables created) ──

-- Drug purchase lifecycle: drug_purchase_events (parent) → drug_purchases + drug_hgp_forms (children)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dpe_receival_id ON drug_purchase_events(drug_receival_id);
ALTER TABLE drug_purchases DROP CONSTRAINT IF EXISTS fk_dp_purchase_event;
ALTER TABLE drug_purchases ADD CONSTRAINT fk_dp_purchase_event
  FOREIGN KEY (legacy_receival_id) REFERENCES drug_purchase_events(drug_receival_id);
ALTER TABLE drug_hgp_forms DROP CONSTRAINT IF EXISTS fk_dhf_purchase_event;
ALTER TABLE drug_hgp_forms ADD CONSTRAINT fk_dhf_purchase_event
  FOREIGN KEY (drug_receival_id) REFERENCES drug_purchase_events(drug_receival_id);
ALTER TABLE drug_purchase_events DROP CONSTRAINT IF EXISTS fk_dpe_supplier;
ALTER TABLE drug_purchase_events ADD CONSTRAINT fk_dpe_supplier
  FOREIGN KEY (supplier_id) REFERENCES contacts(id);

-- Drug stocktake hierarchy: drug_stocktakes (parent) → drug_stocktake_records (children)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_stocktake_id ON drug_stocktakes(stocktake_id);
ALTER TABLE drug_stocktake_records DROP CONSTRAINT IF EXISTS fk_dsr_stocktake;
ALTER TABLE drug_stocktake_records ADD CONSTRAINT fk_dsr_stocktake
  FOREIGN KEY (stocktake_id) REFERENCES drug_stocktakes(stocktake_id);
ALTER TABLE drug_stocktake_records DROP CONSTRAINT IF EXISTS fk_dsr_drug;
ALTER TABLE drug_stocktake_records ADD CONSTRAINT fk_dsr_drug
  FOREIGN KEY (drug_id) REFERENCES drugs(id);

-- Drug transfer hierarchy: drug_transfers (parent) → drug_transfer_records (children)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dt_transfer_id ON drug_transfers(transfer_id);
ALTER TABLE drug_transfer_records DROP CONSTRAINT IF EXISTS fk_dtr_transfer;
ALTER TABLE drug_transfer_records ADD CONSTRAINT fk_dtr_transfer
  FOREIGN KEY (transfer_id) REFERENCES drug_transfers(transfer_id);
ALTER TABLE drug_transfer_records DROP CONSTRAINT IF EXISTS fk_dtr_drug;
ALTER TABLE drug_transfer_records ADD CONSTRAINT fk_dtr_drug
  FOREIGN KEY (drug_id) REFERENCES drugs(id);

-- Chemical inventory → drugs
ALTER TABLE chemical_inventory DROP CONSTRAINT IF EXISTS fk_ci_drug;
ALTER TABLE chemical_inventory ADD CONSTRAINT fk_ci_drug
  FOREIGN KEY (chemical_drug_id) REFERENCES drugs(id);
ALTER TABLE chemical_inventory_old DROP CONSTRAINT IF EXISTS fk_cio_drug;
ALTER TABLE chemical_inventory_old ADD CONSTRAINT fk_cio_drug
  FOREIGN KEY (chemical_drug_id) REFERENCES drugs(id);

-- Contact-type join table → contacts + contact_types
ALTER TABLE contacts_contact_types DROP CONSTRAINT IF EXISTS fk_cct_contact;
ALTER TABLE contacts_contact_types ADD CONSTRAINT fk_cct_contact
  FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Health record hierarchy: sick_beast_temperatures + sick_beast_brd_symptoms → health_records
ALTER TABLE sick_beast_temperatures DROP CONSTRAINT IF EXISTS fk_sbt_health_record;
ALTER TABLE sick_beast_temperatures ADD CONSTRAINT fk_sbt_health_record
  FOREIGN KEY (sb_rec_no) REFERENCES health_records(legacy_sb_rec_no);
ALTER TABLE sick_beast_brd_symptoms DROP CONSTRAINT IF EXISTS fk_sbbs_health_record;
ALTER TABLE sick_beast_brd_symptoms ADD CONSTRAINT fk_sbbs_health_record
  FOREIGN KEY (sb_rec_no) REFERENCES health_records(legacy_sb_rec_no);

-- Instrument calibration hierarchy
CREATE UNIQUE INDEX IF NOT EXISTS idx_inc_instrument_name ON instruments_needing_calibration(instrument_name);
ALTER TABLE instrument_calibration_tests DROP CONSTRAINT IF EXISTS fk_ict_instrument;
ALTER TABLE instrument_calibration_tests ADD CONSTRAINT fk_ict_instrument
  FOREIGN KEY (instrument_name) REFERENCES instruments_needing_calibration(instrument_name);

-- Beast/cow FK references (legacy beast_id → cows.legacy_beast_id)
ALTER TABLE beast_feed_by_commodity DROP CONSTRAINT IF EXISTS fk_bfbc_cow;
ALTER TABLE beast_feed_by_commodity ADD CONSTRAINT fk_bfbc_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE beast_breeding DROP CONSTRAINT IF EXISTS fk_bb_cow;
ALTER TABLE beast_breeding ADD CONSTRAINT fk_bb_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE beast_movements DROP CONSTRAINT IF EXISTS fk_bm_cow;
ALTER TABLE beast_movements ADD CONSTRAINT fk_bm_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE cattle_dof_dip DROP CONSTRAINT IF EXISTS fk_cdd_cow;
ALTER TABLE cattle_dof_dip ADD CONSTRAINT fk_cdd_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE feed_totals_by_ration DROP CONSTRAINT IF EXISTS fk_ftbr_cow;
ALTER TABLE feed_totals_by_ration ADD CONSTRAINT fk_ftbr_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE pen_list_snapshots DROP CONSTRAINT IF EXISTS fk_pls_cow;
ALTER TABLE pen_list_snapshots ADD CONSTRAINT fk_pls_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE trading_buying_details DROP CONSTRAINT IF EXISTS fk_tbd_cow;
ALTER TABLE trading_buying_details ADD CONSTRAINT fk_tbd_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE sick_beast_temperatures DROP CONSTRAINT IF EXISTS fk_sbt_cow;
ALTER TABLE sick_beast_temperatures ADD CONSTRAINT fk_sbt_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE sick_beast_brd_symptoms DROP CONSTRAINT IF EXISTS fk_sbbs_cow;
ALTER TABLE sick_beast_brd_symptoms ADD CONSTRAINT fk_sbbs_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE paddock_feeding DROP CONSTRAINT IF EXISTS fk_pf_cow;
ALTER TABLE paddock_feeding ADD CONSTRAINT fk_pf_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);


-- ══════════════════════════════════════════════════════════
-- Category 1: Lookup table FK constraints
-- ══════════════════════════════════════════════════════════

-- Beast sale types (business key = sale_type_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bst_sale_type_id ON beast_sale_types(sale_type_id);
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_sale_type;
ALTER TABLE cows ADD CONSTRAINT fk_cows_sale_type
  FOREIGN KEY (beast_sale_type_id) REFERENCES beast_sale_types(sale_type_id);
ALTER TABLE weighing_events DROP CONSTRAINT IF EXISTS fk_we_sale_type;
ALTER TABLE weighing_events ADD CONSTRAINT fk_we_sale_type
  FOREIGN KEY (beast_sale_type_id) REFERENCES beast_sale_types(sale_type_id);

-- Location types (business key = legacy_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lt_legacy_id ON location_types(legacy_id);
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_loc_type;
ALTER TABLE cows ADD CONSTRAINT fk_cows_loc_type
  FOREIGN KEY (current_loc_type_id) REFERENCES location_types(legacy_id);
ALTER TABLE weighing_events DROP CONSTRAINT IF EXISTS fk_we_loc_type;
ALTER TABLE weighing_events ADD CONSTRAINT fk_we_loc_type
  FOREIGN KEY (to_locn_type_id) REFERENCES location_types(legacy_id);

-- Cattle program types (business key = program_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cpt_program_id ON cattle_program_types(program_id);
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_program;
ALTER TABLE cows ADD CONSTRAINT fk_cows_program
  FOREIGN KEY (program_id) REFERENCES cattle_program_types(program_id);

-- Contact types (business key = contact_type_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_contact_type_id ON contact_types(contact_type_id);
ALTER TABLE contacts_contact_types DROP CONSTRAINT IF EXISTS fk_cct_contact_type;
ALTER TABLE contacts_contact_types ADD CONSTRAINT fk_cct_contact_type
  FOREIGN KEY (contact_type_id) REFERENCES contact_types(contact_type_id);

-- Feed commodity names (business key = commodity_code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcn_commodity_code ON feed_commodity_names(commodity_code);
ALTER TABLE beast_feed_by_commodity DROP CONSTRAINT IF EXISTS fk_bfbc_commodity;
ALTER TABLE beast_feed_by_commodity ADD CONSTRAINT fk_bfbc_commodity
  FOREIGN KEY (commodity_code) REFERENCES feed_commodity_names(commodity_code);
ALTER TABLE paddock_feeding DROP CONSTRAINT IF EXISTS fk_pf_commodity;
ALTER TABLE paddock_feeding ADD CONSTRAINT fk_pf_commodity
  FOREIGN KEY (commodity_id) REFERENCES feed_commodity_names(commodity_code);

-- Sire lines (business key = sire_line_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sl_sire_line_id ON sire_lines(sire_line_id);
ALTER TABLE breeding_sires DROP CONSTRAINT IF EXISTS fk_bsires_sire_line;
ALTER TABLE breeding_sires ADD CONSTRAINT fk_bsires_sire_line
  FOREIGN KEY (sire_line_id) REFERENCES sire_lines(sire_line_id);

-- Body systems (TEXT lookup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bs_body_system ON body_systems(body_system);
ALTER TABLE diseases DROP CONSTRAINT IF EXISTS fk_diseases_body_system;
ALTER TABLE diseases ADD CONSTRAINT fk_diseases_body_system
  FOREIGN KEY (body_system) REFERENCES body_systems(body_system);
ALTER TABLE head_by_disease DROP CONSTRAINT IF EXISTS fk_hbd_body_system;
ALTER TABLE head_by_disease ADD CONSTRAINT fk_hbd_body_system
  FOREIGN KEY (body_system) REFERENCES body_systems(body_system);

-- Diseases: direct PK + TEXT name references
ALTER TABLE sick_by_dof DROP CONSTRAINT IF EXISTS fk_sbd_disease;
ALTER TABLE sick_by_dof ADD CONSTRAINT fk_sbd_disease
  FOREIGN KEY (disease_id) REFERENCES diseases(id);
ALTER TABLE head_by_disease DROP CONSTRAINT IF EXISTS fk_hbd_disease;
ALTER TABLE head_by_disease ADD CONSTRAINT fk_hbd_disease
  FOREIGN KEY (disease_name) REFERENCES diseases(name);

-- Breed and market category (TEXT → TEXT, parent already UNIQUE)
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_breed;
ALTER TABLE cows ADD CONSTRAINT fk_cows_breed
  FOREIGN KEY (breed) REFERENCES breeds(name);
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_market_cat;
ALTER TABLE cows ADD CONSTRAINT fk_cows_market_cat
  FOREIGN KEY (market_category) REFERENCES market_categories(name);


-- ══════════════════════════════════════════════════════════
-- Category 2: Additional beast_id → cows(legacy_beast_id)
-- ══════════════════════════════════════════════════════════

ALTER TABLE cattle_photos DROP CONSTRAINT IF EXISTS fk_cphoto_cow;
ALTER TABLE cattle_photos ADD CONSTRAINT fk_cphoto_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE cattle_processed DROP CONSTRAINT IF EXISTS fk_cproc_cow;
ALTER TABLE cattle_processed ADD CONSTRAINT fk_cproc_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE cattle_query_month_report DROP CONSTRAINT IF EXISTS fk_cqmr_cow;
ALTER TABLE cattle_query_month_report ADD CONSTRAINT fk_cqmr_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE new_cattle_records_log DROP CONSTRAINT IF EXISTS fk_ncrl_cow;
ALTER TABLE new_cattle_records_log ADD CONSTRAINT fk_ncrl_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE trading_costs_report DROP CONSTRAINT IF EXISTS fk_tcr_cow;
ALTER TABLE trading_costs_report ADD CONSTRAINT fk_tcr_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);
ALTER TABLE carcase_feedback_report_data DROP CONSTRAINT IF EXISTS fk_cfrd_cow;
ALTER TABLE carcase_feedback_report_data ADD CONSTRAINT fk_cfrd_cow
  FOREIGN KEY (beast_id) REFERENCES cows(legacy_beast_id);


-- ══════════════════════════════════════════════════════════
-- Category 3: Contact / supplier IDs → contacts(id)
-- ══════════════════════════════════════════════════════════

ALTER TABLE carcase_prices DROP CONSTRAINT IF EXISTS fk_cprice_sold_to;
ALTER TABLE carcase_prices ADD CONSTRAINT fk_cprice_sold_to
  FOREIGN KEY (sold_to_id) REFERENCES contacts(id);
ALTER TABLE carcase_feedback_compliance DROP CONSTRAINT IF EXISTS fk_cfc_supplier;
ALTER TABLE carcase_feedback_compliance ADD CONSTRAINT fk_cfc_supplier
  FOREIGN KEY (supplier_id) REFERENCES contacts(id);
ALTER TABLE carcase_feedback_report_data DROP CONSTRAINT IF EXISTS fk_cfrd_supplier;
ALTER TABLE carcase_feedback_report_data ADD CONSTRAINT fk_cfrd_supplier
  FOREIGN KEY (supplier_id) REFERENCES contacts(id);
ALTER TABLE custom_feed_lot_summary DROP CONSTRAINT IF EXISTS fk_cfls_owner;
ALTER TABLE custom_feed_lot_summary ADD CONSTRAINT fk_cfls_owner
  FOREIGN KEY (cattle_owner_id) REFERENCES contacts(id);
ALTER TABLE monthly_agistor_movements DROP CONSTRAINT IF EXISTS fk_mam_agistor;
ALTER TABLE monthly_agistor_movements ADD CONSTRAINT fk_mam_agistor
  FOREIGN KEY (agistor_id) REFERENCES contacts(id);
ALTER TABLE agistment_transfers DROP CONSTRAINT IF EXISTS fk_at_agistor;
ALTER TABLE agistment_transfers ADD CONSTRAINT fk_at_agistor
  FOREIGN KEY (agistor_code) REFERENCES contacts(id);
ALTER TABLE trading_buying_details DROP CONSTRAINT IF EXISTS fk_tbd_agent;
ALTER TABLE trading_buying_details ADD CONSTRAINT fk_tbd_agent
  FOREIGN KEY (agent_id) REFERENCES contacts(id);
ALTER TABLE trading_buying_details DROP CONSTRAINT IF EXISTS fk_tbd_buyer;
ALTER TABLE trading_buying_details ADD CONSTRAINT fk_tbd_buyer
  FOREIGN KEY (buyer_id) REFERENCES contacts(id);
ALTER TABLE trading_buying_details DROP CONSTRAINT IF EXISTS fk_tbd_supplier;
ALTER TABLE trading_buying_details ADD CONSTRAINT fk_tbd_supplier
  FOREIGN KEY (supplier_id) REFERENCES contacts(id);


-- ══════════════════════════════════════════════════════════
-- Category 4: Pen / lot TEXT references
-- ══════════════════════════════════════════════════════════

-- Pen name → pens(name)  [pens.name is already UNIQUE]
ALTER TABLE pen_data_from_feed_db DROP CONSTRAINT IF EXISTS fk_pdfd_pen;
ALTER TABLE pen_data_from_feed_db ADD CONSTRAINT fk_pdfd_pen
  FOREIGN KEY (pen_name) REFERENCES pens(name);
ALTER TABLE pen_riders_log DROP CONSTRAINT IF EXISTS fk_prl_pen;
ALTER TABLE pen_riders_log ADD CONSTRAINT fk_prl_pen
  FOREIGN KEY (pen_name) REFERENCES pens(name);
ALTER TABLE pens_fed DROP CONSTRAINT IF EXISTS fk_pfed_pen;
ALTER TABLE pens_fed ADD CONSTRAINT fk_pfed_pen
  FOREIGN KEY (pen_number) REFERENCES pens(name);
ALTER TABLE cattle_feed_updates DROP CONSTRAINT IF EXISTS fk_cfu_pen;
ALTER TABLE cattle_feed_updates ADD CONSTRAINT fk_cfu_pen
  FOREIGN KEY (pen_number) REFERENCES pens(name);
ALTER TABLE pending_feed_data DROP CONSTRAINT IF EXISTS fk_pendfeed_pen;
ALTER TABLE pending_feed_data ADD CONSTRAINT fk_pendfeed_pen
  FOREIGN KEY (pen_name) REFERENCES pens(name);
ALTER TABLE pen_mort_morb DROP CONSTRAINT IF EXISTS fk_pmm_pen;
ALTER TABLE pen_mort_morb ADD CONSTRAINT fk_pmm_pen
  FOREIGN KEY (pen_number) REFERENCES pens(name);

-- Lot number → purchase_lots(lot_number)  [purchase_lots.lot_number is already UNIQUE]
ALTER TABLE purchase_lot_cattle DROP CONSTRAINT IF EXISTS fk_plc_lot;
ALTER TABLE purchase_lot_cattle ADD CONSTRAINT fk_plc_lot
  FOREIGN KEY (lot_number) REFERENCES purchase_lots(lot_number);
ALTER TABLE price_adjustment_by_weight DROP CONSTRAINT IF EXISTS fk_pabw_lot;
ALTER TABLE price_adjustment_by_weight ADD CONSTRAINT fk_pabw_lot
  FOREIGN KEY (lot_number) REFERENCES purchase_lots(lot_number);
ALTER TABLE custom_feed_lot_summary DROP CONSTRAINT IF EXISTS fk_cfls_lot;
ALTER TABLE custom_feed_lot_summary ADD CONSTRAINT fk_cfls_lot
  FOREIGN KEY (purch_lot_no) REFERENCES purchase_lots(lot_number);
ALTER TABLE custom_feed_charges DROP CONSTRAINT IF EXISTS fk_cfc_lot;
ALTER TABLE custom_feed_charges ADD CONSTRAINT fk_cfc_lot
  FOREIGN KEY (purch_lot_no) REFERENCES purchase_lots(lot_number);
ALTER TABLE custom_feed_invoices DROP CONSTRAINT IF EXISTS fk_cfi_lot;
ALTER TABLE custom_feed_invoices ADD CONSTRAINT fk_cfi_lot
  FOREIGN KEY (purch_lot_no) REFERENCES purchase_lots(lot_number);
ALTER TABLE pen_mort_morb DROP CONSTRAINT IF EXISTS fk_pmm_lot;
ALTER TABLE pen_mort_morb ADD CONSTRAINT fk_pmm_lot
  FOREIGN KEY (purch_lot_no) REFERENCES purchase_lots(lot_number);
ALTER TABLE cattle_query_month_report DROP CONSTRAINT IF EXISTS fk_cqmr_lot;
ALTER TABLE cattle_query_month_report ADD CONSTRAINT fk_cqmr_lot
  FOREIGN KEY (lot_number) REFERENCES purchase_lots(lot_number);


-- ══════════════════════════════════════════════════════════
-- Category 5: Type-mismatch FK fixes
-- Ensure column types match before adding FKs (idempotent for re-runs)
-- ══════════════════════════════════════════════════════════

ALTER TABLE weighing_events        ALTER COLUMN cull_reason_id      TYPE TEXT USING cull_reason_id::TEXT;
ALTER TABLE cattle_query_month_report ALTER COLUMN cull_reason_id   TYPE TEXT USING cull_reason_id::TEXT;
ALTER TABLE drugs                  ALTER COLUMN drug_category       TYPE INTEGER USING drug_category::INTEGER;
ALTER TABLE purchase_lots          ALTER COLUMN purchase_region     TYPE INTEGER USING purchase_region::INTEGER;
ALTER TABLE purchase_lots          ALTER COLUMN grower_group_code   TYPE INTEGER USING grower_group_code::INTEGER;
ALTER TABLE cows                   ALTER COLUMN grower_group_code   TYPE INTEGER USING grower_group_code::INTEGER;

-- Cull reasons: code TEXT is already UNIQUE
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_cull_reason;
ALTER TABLE cows ADD CONSTRAINT fk_cows_cull_reason
  FOREIGN KEY (cull_reason) REFERENCES cull_reasons(code);
ALTER TABLE weighing_events DROP CONSTRAINT IF EXISTS fk_we_cull_reason;
ALTER TABLE weighing_events ADD CONSTRAINT fk_we_cull_reason
  FOREIGN KEY (cull_reason_id) REFERENCES cull_reasons(code);
ALTER TABLE cattle_query_month_report DROP CONSTRAINT IF EXISTS fk_cqmr_cull_reason;
ALTER TABLE cattle_query_month_report ADD CONSTRAINT fk_cqmr_cull_reason
  FOREIGN KEY (cull_reason_id) REFERENCES cull_reasons(code);

-- Sickness result codes: health_records.result_code is freeform TEXT (e.g. 'R','D'),
-- NOT the integer sickness_result_code — no FK relationship exists.

-- Drug categories
CREATE UNIQUE INDEX IF NOT EXISTS idx_dc_category ON drug_categories(drug_category);
ALTER TABLE drugs DROP CONSTRAINT IF EXISTS fk_drugs_category;
ALTER TABLE drugs ADD CONSTRAINT fk_drugs_category
  FOREIGN KEY (drug_category) REFERENCES drug_categories(drug_category);

-- Purchase regions
CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_region_id ON purchase_regions(region_id);
ALTER TABLE purchase_lots DROP CONSTRAINT IF EXISTS fk_pl_region;
ALTER TABLE purchase_lots ADD CONSTRAINT fk_pl_region
  FOREIGN KEY (purchase_region) REFERENCES purchase_regions(region_id);

-- Grower groups
CREATE UNIQUE INDEX IF NOT EXISTS idx_gg_code ON grower_groups(grower_group_code);
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_grower_group;
ALTER TABLE cows ADD CONSTRAINT fk_cows_grower_group
  FOREIGN KEY (grower_group_code) REFERENCES grower_groups(grower_group_code);
ALTER TABLE purchase_lots DROP CONSTRAINT IF EXISTS fk_pl_grower_group;
ALTER TABLE purchase_lots ADD CONSTRAINT fk_pl_grower_group
  FOREIGN KEY (grower_group_code) REFERENCES grower_groups(grower_group_code);

-- Sub-group names
CREATE UNIQUE INDEX IF NOT EXISTS idx_sgn_sub_group ON sub_group_names(sub_group);
ALTER TABLE cows DROP CONSTRAINT IF EXISTS fk_cows_sub_group;
ALTER TABLE cows ADD CONSTRAINT fk_cows_sub_group
  FOREIGN KEY (sub_group) REFERENCES sub_group_names(sub_group);
ALTER TABLE transport_dispatches DROP CONSTRAINT IF EXISTS fk_td_sub_group;
ALTER TABLE transport_dispatches ADD CONSTRAINT fk_td_sub_group
  FOREIGN KEY (sub_group_name) REFERENCES sub_group_names(sub_group);

-- Weighing types (cattle_query_month_report.weighing_type → weighing_types.weighing_type_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wt_type_id ON weighing_types(weighing_type_id);
ALTER TABLE cattle_query_month_report DROP CONSTRAINT IF EXISTS fk_cqmr_weigh_type;
ALTER TABLE cattle_query_month_report ADD CONSTRAINT fk_cqmr_weigh_type
  FOREIGN KEY (weighing_type) REFERENCES weighing_types(weighing_type_id);


-- ── Trigger: auto-set updated_at ──────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cows_updated_at ON cows;
CREATE TRIGGER trg_cows_updated_at
  BEFORE UPDATE ON cows FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_lots_updated_at ON purchase_lots;
CREATE TRIGGER trg_purchase_lots_updated_at
  BEFORE UPDATE ON purchase_lots FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pens_updated_at ON pens;
CREATE TRIGGER trg_pens_updated_at
  BEFORE UPDATE ON pens FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_drugs_updated_at ON drugs;
CREATE TRIGGER trg_drugs_updated_at
  BEFORE UPDATE ON drugs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
