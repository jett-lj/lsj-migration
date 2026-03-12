-- Per-farm DB schema (PostgreSQL)
-- Each farm gets its own database with these tables

-- ── Lookup / reference tables ─────────────────────────

CREATE TABLE IF NOT EXISTS breeds (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pens (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  is_paddock  BOOLEAN DEFAULT FALSE,
  is_hospital BOOLEAN DEFAULT FALSE,
  capacity    INTEGER,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id         SERIAL PRIMARY KEY,
  type       TEXT CHECK(type IN ('vendor','agent','buyer','abattoir','carrier','other')),
  company    TEXT,
  first_name TEXT,
  last_name  TEXT,
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  pic        TEXT,
  abn        TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diseases (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  symptoms  TEXT,
  treatment TEXT,
  body_system TEXT,
  active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS drugs (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  unit            TEXT,
  cost_per_unit   DOUBLE PRECISION,
  withhold_days   INTEGER DEFAULT 0,
  esi_days        INTEGER DEFAULT 0,
  is_hgp          BOOLEAN DEFAULT FALSE,
  is_antibiotic   BOOLEAN DEFAULT FALSE,
  supplier        TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_codes (
  id          SERIAL PRIMARY KEY,
  code        SMALLINT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('revenue','expense'))
);

CREATE TABLE IF NOT EXISTS market_categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  min_dof  INTEGER,
  hgp_free BOOLEAN DEFAULT FALSE
);

-- ── Core tables ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS herds (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_lots (
  id              SERIAL PRIMARY KEY,
  lot_number      TEXT NOT NULL UNIQUE,
  purchase_date   DATE,
  vendor_id       INTEGER REFERENCES contacts(id),
  agent_id        INTEGER REFERENCES contacts(id),
  head_count      INTEGER,
  total_weight_kg DOUBLE PRECISION,
  total_cost      DOUBLE PRECISION,
  freight_cost    DOUBLE PRECISION,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cows (
  id              SERIAL PRIMARY KEY,
  tag_number      TEXT NOT NULL,
  eid             TEXT,
  name            TEXT,
  breed_id        INTEGER REFERENCES breeds(id),
  breed           TEXT NOT NULL,
  date_of_birth   DATE,
  sex             TEXT DEFAULT 'female' CHECK(sex IN ('female', 'male')),
  herd_id         INTEGER REFERENCES herds(id),
  pen_id          INTEGER REFERENCES pens(id),
  purchase_lot_id INTEGER REFERENCES purchase_lots(id),
  hgp             BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'active' CHECK(status IN ('active','sold','died','archived')),
  entry_date      DATE,
  entry_weight_kg DOUBLE PRECISION,
  sale_date       DATE,
  sale_weight_kg  DOUBLE PRECISION,
  notes           TEXT,
  photo_url       TEXT,
  legacy_beast_id INTEGER UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cows_herd_id   ON cows(herd_id);
CREATE INDEX IF NOT EXISTS idx_cows_tag       ON cows(tag_number);
CREATE INDEX IF NOT EXISTS idx_cows_eid       ON cows(eid);
CREATE INDEX IF NOT EXISTS idx_cows_status    ON cows(status);
CREATE INDEX IF NOT EXISTS idx_cows_pen       ON cows(pen_id);
CREATE INDEX IF NOT EXISTS idx_cows_legacy_id ON cows(legacy_beast_id);

-- ── Event / history tables ────────────────────────────

CREATE TABLE IF NOT EXISTS locations (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  label       TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_cow_id     ON locations(cow_id);
CREATE INDEX IF NOT EXISTS idx_locations_recorded_at ON locations(recorded_at DESC);

CREATE TABLE IF NOT EXISTS weighing_events (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  weigh_type  TEXT NOT NULL CHECK(weigh_type IN ('intake','interim','exit','sale')),
  weight_kg   DOUBLE PRECISION NOT NULL,
  p8_fat      SMALLINT,
  notes       TEXT,
  weighed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weigh_cow  ON weighing_events(cow_id);
CREATE INDEX IF NOT EXISTS idx_weigh_date ON weighing_events(weighed_at DESC);

CREATE TABLE IF NOT EXISTS health_records (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK(type IN ('checkup','vaccination','treatment','injury','other')),
  description TEXT NOT NULL,
  date        DATE NOT NULL,
  vet_name    TEXT,
  cost        DOUBLE PRECISION,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_cow  ON health_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_date ON health_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_cow_date ON health_records(cow_id, date DESC);

CREATE TABLE IF NOT EXISTS treatments (
  id               SERIAL PRIMARY KEY,
  cow_id           INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  health_record_id INTEGER REFERENCES health_records(id) ON DELETE SET NULL,
  drug_id          INTEGER REFERENCES drugs(id),
  disease_id       INTEGER REFERENCES diseases(id),
  dose             DOUBLE PRECISION,
  withhold_until   DATE,
  administered_by  TEXT,
  administered_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_treat_cow ON treatments(cow_id);

CREATE TABLE IF NOT EXISTS pen_movements (
  id        SERIAL PRIMARY KEY,
  cow_id    INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  pen_id    INTEGER NOT NULL REFERENCES pens(id),
  moved_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pen_move_cow ON pen_movements(cow_id);

CREATE TABLE IF NOT EXISTS costs (
  id            SERIAL PRIMARY KEY,
  cow_id        INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  cost_code_id  INTEGER REFERENCES cost_codes(id),
  amount        DOUBLE PRECISION NOT NULL,
  units         DOUBLE PRECISION DEFAULT 1,
  description   TEXT,
  trans_date    DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_costs_cow ON costs(cow_id);

-- ── Geofencing ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geofences (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  center_lat     DOUBLE PRECISION NOT NULL,
  center_lng     DOUBLE PRECISION NOT NULL,
  radius_meters  DOUBLE PRECISION NOT NULL DEFAULT 500,
  color          TEXT DEFAULT '#e53e3e',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofence_alerts (
  id           SERIAL PRIMARY KEY,
  geofence_id  INTEGER NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  cow_id       INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL CHECK(alert_type IN ('exit','enter')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geoalert_created ON geofence_alerts(created_at DESC);

-- ── Additional data tables (legacy data) ──────────────

CREATE TABLE IF NOT EXISTS carcase_data (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE CASCADE,
  legacy_beast_id     INTEGER NOT NULL,
  ear_tag             TEXT,
  eid                 TEXT,
  sold_to             TEXT,
  abattoir            TEXT,
  body_number         TEXT,
  kill_date           DATE,
  carc_weight_left    DOUBLE PRECISION,
  carc_weight_right   DOUBLE PRECISION,
  dress_pct           DOUBLE PRECISION,
  teeth               SMALLINT,
  grade               TEXT,
  price_per_kg_left   DOUBLE PRECISION,
  price_per_kg_right  DOUBLE PRECISION,
  p8_fat              DOUBLE PRECISION,
  rib_fat             DOUBLE PRECISION,
  muscle_score        TEXT,
  eye_muscle_area     DOUBLE PRECISION,
  ph_level            DOUBLE PRECISION,
  marbling            DOUBLE PRECISION,
  fat_colour          SMALLINT,
  muscle_colour       TEXT,
  meat_texture        SMALLINT,
  meat_yield          DOUBLE PRECISION,
  contract_no         TEXT,
  bruising_l          TEXT,
  bruising_r          TEXT,
  deduction_per_kg    DOUBLE PRECISION,
  dockage_reason      TEXT,
  live_weight_shrink_pct DOUBLE PRECISION,
  ossification        SMALLINT,
  msa_index           DOUBLE PRECISION,
  hump_cold           SMALLINT,
  boning_group        TEXT,
  beast_sale_type     SMALLINT,
  boning_date         DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carcase_cow ON carcase_data(cow_id);
CREATE INDEX IF NOT EXISTS idx_carcase_kill ON carcase_data(kill_date);

CREATE TABLE IF NOT EXISTS autopsy_records (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE CASCADE,
  legacy_beast_id     INTEGER NOT NULL,
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

CREATE TABLE IF NOT EXISTS vendor_declarations (
  id                  SERIAL PRIMARY KEY,
  vendor_dec_number   TEXT,
  owner_contact_id    INTEGER REFERENCES contacts(id),
  form_date           DATE,
  number_cattle       SMALLINT,
  cattle_description  TEXT,
  tail_tag            TEXT,
  rfids_in_cattle     BOOLEAN,
  hgp_treated         BOOLEAN,
  qa_program          BOOLEAN,
  qa_details          TEXT,
  ownership_period    TEXT,
  fed_stockfeeds      BOOLEAN,
  chem_restriction    BOOLEAN,
  withholding_drugs   BOOLEAN,
  withholding_feed    BOOLEAN,
  additional_info     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_changes (
  id                  SERIAL PRIMARY KEY,
  cow_id              INTEGER REFERENCES cows(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS drug_purchases (
  id                  SERIAL PRIMARY KEY,
  drug_id             INTEGER REFERENCES drugs(id),
  quantity            DOUBLE PRECISION,
  batch_number        TEXT,
  expiry_date         DATE,
  cost                DOUBLE PRECISION,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drug_disposals (
  id                  SERIAL PRIMARY KEY,
  drug_id             INTEGER REFERENCES drugs(id),
  quantity            DOUBLE PRECISION,
  disposal_date       DATE,
  disposal_reason     TEXT,
  disposal_method     TEXT,
  disposed_by         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Legacy raw data (catch-all for unmapped tables) ───

CREATE TABLE IF NOT EXISTS legacy_raw (
  id              SERIAL PRIMARY KEY,
  source_table    TEXT NOT NULL,
  row_data        JSONB NOT NULL,
  migrated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legacy_raw_table ON legacy_raw(source_table);

-- ── Migration tracking ────────────────────────────────

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
