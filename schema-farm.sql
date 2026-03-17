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
  withhold_days   INTEGER,
  esi_days        INTEGER,
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

CREATE TABLE IF NOT EXISTS purchase_lots (
  id              SERIAL PRIMARY KEY,
  lot_number      TEXT NOT NULL UNIQUE,
  purchase_date   DATE,
  vendor_id       INTEGER REFERENCES contacts(id) CHECK(vendor_id > 0),
  agent_id        INTEGER REFERENCES contacts(id) CHECK(agent_id > 0),
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
  breed           TEXT NOT NULL,
  sex             TEXT DEFAULT 'female' CHECK(sex IN ('female', 'male')),
  pen_id          INTEGER REFERENCES pens(id),
  purchase_lot_id INTEGER REFERENCES purchase_lots(id),
  hgp             BOOLEAN DEFAULT FALSE,
  status          TEXT DEFAULT 'active' CHECK(status IN ('active','sold','died','archived')),
  entry_date      DATE,
  entry_weight_kg DOUBLE PRECISION CHECK(entry_weight_kg >= 0),
  sale_date       DATE,
  sale_weight_kg  DOUBLE PRECISION CHECK(sale_weight_kg >= 0),
  notes           TEXT,
  dob             DATE,
  start_date      DATE,
  start_weight_kg DOUBLE PRECISION CHECK(start_weight_kg >= 0),
  photo_url       TEXT,
  legacy_beast_id INTEGER UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cows_tag       ON cows(tag_number);
CREATE INDEX IF NOT EXISTS idx_cows_eid       ON cows(eid);
CREATE INDEX IF NOT EXISTS idx_cows_status    ON cows(status);
CREATE INDEX IF NOT EXISTS idx_cows_pen       ON cows(pen_id);
CREATE INDEX IF NOT EXISTS idx_cows_legacy_id ON cows(legacy_beast_id);

-- ── Event / history tables ────────────────────────────

CREATE TABLE IF NOT EXISTS weighing_events (
  id          SERIAL PRIMARY KEY,
  cow_id      INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  weigh_type  TEXT NOT NULL CHECK(weigh_type IN ('intake','interim','exit','sale')),
  weight_kg   DOUBLE PRECISION CHECK(weight_kg >= 0),
  p8_fat      SMALLINT,
  notes       TEXT,
  weighed_at  TIMESTAMPTZ NOT NULL DEFAULT '1900-01-01T00:00:00Z'
);
CREATE INDEX IF NOT EXISTS idx_weigh_cow  ON weighing_events(cow_id);
CREATE INDEX IF NOT EXISTS idx_weigh_date ON weighing_events(weighed_at DESC);

CREATE TABLE IF NOT EXISTS health_records (
  id                SERIAL PRIMARY KEY,
  cow_id            INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK(type IN ('checkup','vaccination','treatment','injury','other')),
  description       TEXT NOT NULL,
  date              DATE NOT NULL,
  vet_name          TEXT,
  disease_id        INTEGER REFERENCES diseases(id) CHECK(disease_id > 0),
  date_recovered    DATE,
  result_code       TEXT,
  cost              DOUBLE PRECISION,
  legacy_sb_rec_no  INTEGER UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_cow  ON health_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_date ON health_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_health_cow_date ON health_records(cow_id, date DESC);

CREATE TABLE IF NOT EXISTS treatments (
  id               SERIAL PRIMARY KEY,
  cow_id           INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  health_record_id INTEGER REFERENCES health_records(id) ON DELETE SET NULL,
  drug_id          INTEGER REFERENCES drugs(id) CHECK(drug_id > 0),
  disease_id       INTEGER REFERENCES diseases(id) CHECK(disease_id > 0),
  dose             DOUBLE PRECISION CHECK(dose >= 0),
  withhold_until   DATE,
  administered_by  TEXT,
  administered_at  TIMESTAMPTZ DEFAULT '1900-01-01T00:00:00Z'
);
CREATE INDEX IF NOT EXISTS idx_treat_cow ON treatments(cow_id);
CREATE INDEX IF NOT EXISTS idx_treat_drug ON treatments(drug_id);

CREATE TABLE IF NOT EXISTS pen_movements (
  id        SERIAL PRIMARY KEY,
  cow_id    INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  pen_id    INTEGER NOT NULL REFERENCES pens(id),
  moved_at  TIMESTAMPTZ DEFAULT '1900-01-01T00:00:00Z'
);
CREATE INDEX IF NOT EXISTS idx_pen_move_cow ON pen_movements(cow_id);
CREATE INDEX IF NOT EXISTS idx_pen_move_pen ON pen_movements(pen_id);

CREATE TABLE IF NOT EXISTS costs (
  id            SERIAL PRIMARY KEY,
  cow_id        INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  cost_code_id  INTEGER REFERENCES cost_codes(id),
  amount        DOUBLE PRECISION NOT NULL,
  unit_cost     DOUBLE PRECISION,
  units         DOUBLE PRECISION DEFAULT 1,
  description   TEXT,
  trans_date    DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_costs_cow ON costs(cow_id);
CREATE INDEX IF NOT EXISTS idx_costs_code ON costs(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(trans_date);

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
  owner_contact_id    INTEGER REFERENCES contacts(id) CHECK(owner_contact_id > 0),
  form_date           DATE,
  number_cattle       SMALLINT,
  cattle_description  TEXT,
  tail_tag            TEXT,
  rfids_in_cattle     BOOLEAN DEFAULT FALSE,
  hgp_treated         BOOLEAN DEFAULT FALSE,
  qa_program          BOOLEAN DEFAULT FALSE,
  qa_details          TEXT,
  ownership_period    TEXT,
  fed_stockfeeds      BOOLEAN DEFAULT FALSE,
  chem_restriction    BOOLEAN DEFAULT FALSE,
  withholding_drugs   BOOLEAN DEFAULT FALSE,
  withholding_feed    BOOLEAN DEFAULT FALSE,
  additional_info     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_dec_owner ON vendor_declarations(owner_contact_id);

CREATE TABLE IF NOT EXISTS drug_purchases (
  id                  SERIAL PRIMARY KEY,
  drug_id             INTEGER REFERENCES drugs(id) CHECK(drug_id > 0),
  quantity            DOUBLE PRECISION CHECK(quantity >= 0),
  purchase_date       DATE,
  batch_number        TEXT,
  expiry_date         DATE,
  cost                DOUBLE PRECISION,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill: add purchase_date if table was created before this column existed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drug_purchases' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE drug_purchases ADD COLUMN purchase_date DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_drug_purch_drug ON drug_purchases(drug_id);

CREATE TABLE IF NOT EXISTS drug_disposals (
  id                  SERIAL PRIMARY KEY,
  drug_id             INTEGER REFERENCES drugs(id) CHECK(drug_id > 0),
  quantity            DOUBLE PRECISION CHECK(quantity >= 0),
  disposal_date       DATE,
  disposal_reason     TEXT,
  disposal_method     TEXT,
  disposed_by         TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drug_disp_drug ON drug_disposals(drug_id);

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

-- ── Trim trigger for UNIQUE text columns ──────────────
-- Ensures leading/trailing whitespace never pollutes UNIQUE constraints.

CREATE OR REPLACE FUNCTION trim_unique_text_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- breeds.name
  IF TG_TABLE_NAME = 'breeds' THEN
    NEW.name := BTRIM(NEW.name);
  END IF;
  -- pens.name
  IF TG_TABLE_NAME = 'pens' THEN
    NEW.name := BTRIM(NEW.name);
  END IF;
  -- drugs.name
  IF TG_TABLE_NAME = 'drugs' THEN
    NEW.name := BTRIM(NEW.name);
  END IF;
  -- diseases.name
  IF TG_TABLE_NAME = 'diseases' THEN
    NEW.name := BTRIM(NEW.name);
  END IF;
  -- market_categories.name
  IF TG_TABLE_NAME = 'market_categories' THEN
    NEW.name := BTRIM(NEW.name);
  END IF;
  -- purchase_lots.lot_number
  IF TG_TABLE_NAME = 'purchase_lots' THEN
    NEW.lot_number := BTRIM(NEW.lot_number);
  END IF;
  -- cost_codes.description
  IF TG_TABLE_NAME = 'cost_codes' THEN
    NEW.description := BTRIM(NEW.description);
  END IF;
  -- cows.tag_number, cows.eid
  IF TG_TABLE_NAME = 'cows' THEN
    NEW.tag_number := BTRIM(NEW.tag_number);
    IF NEW.eid IS NOT NULL THEN
      NEW.eid := BTRIM(NEW.eid);
    END IF;
  END IF;
  -- contacts.email, contacts.abn
  IF TG_TABLE_NAME = 'contacts' THEN
    IF NEW.email IS NOT NULL THEN
      NEW.email := BTRIM(NEW.email);
    END IF;
    IF NEW.abn IS NOT NULL THEN
      NEW.abn := BTRIM(NEW.abn);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trim_breeds ON breeds;
CREATE TRIGGER trg_trim_breeds BEFORE INSERT OR UPDATE ON breeds
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_pens ON pens;
CREATE TRIGGER trg_trim_pens BEFORE INSERT OR UPDATE ON pens
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_drugs ON drugs;
CREATE TRIGGER trg_trim_drugs BEFORE INSERT OR UPDATE ON drugs
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_diseases ON diseases;
CREATE TRIGGER trg_trim_diseases BEFORE INSERT OR UPDATE ON diseases
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_market_categories ON market_categories;
CREATE TRIGGER trg_trim_market_categories BEFORE INSERT OR UPDATE ON market_categories
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_purchase_lots ON purchase_lots;
CREATE TRIGGER trg_trim_purchase_lots BEFORE INSERT OR UPDATE ON purchase_lots
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_cost_codes ON cost_codes;
CREATE TRIGGER trg_trim_cost_codes BEFORE INSERT OR UPDATE ON cost_codes
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_cows ON cows;
CREATE TRIGGER trg_trim_cows BEFORE INSERT OR UPDATE ON cows
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

DROP TRIGGER IF EXISTS trg_trim_contacts ON contacts;
CREATE TRIGGER trg_trim_contacts BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION trim_unique_text_fields();

-- ── Schema migrations (add columns to existing tables) ──
-- These handle the case where tables already exist but are missing
-- columns added in later rounds. Safe to re-run (IF NOT EXISTS).

ALTER TABLE cows ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE cows ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE cows ADD COLUMN IF NOT EXISTS start_weight_kg DOUBLE PRECISION;
ALTER TABLE cows ADD COLUMN IF NOT EXISTS legacy_beast_id INTEGER;

ALTER TABLE health_records ADD COLUMN IF NOT EXISTS disease_id INTEGER;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS date_recovered DATE;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS result_code TEXT;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION;
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS legacy_sb_rec_no INTEGER;

ALTER TABLE costs ADD COLUMN IF NOT EXISTS unit_cost DOUBLE PRECISION;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS units DOUBLE PRECISION DEFAULT 1;

ALTER TABLE treatments ADD COLUMN IF NOT EXISTS health_record_id INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS disease_id INTEGER;

-- Add UNIQUE constraints if missing (safe — errors ignored if already present)
DO $$ BEGIN
  ALTER TABLE health_records ADD CONSTRAINT health_records_legacy_sb_rec_no_key UNIQUE (legacy_sb_rec_no);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE cows ADD CONSTRAINT cows_legacy_beast_id_key UNIQUE (legacy_beast_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Indexes on ALTER-added columns (must come after the ALTERs above)
CREATE INDEX IF NOT EXISTS idx_health_disease ON health_records(disease_id);
CREATE INDEX IF NOT EXISTS idx_treat_health_rec ON treatments(health_record_id);
CREATE INDEX IF NOT EXISTS idx_treat_disease ON treatments(disease_id);
