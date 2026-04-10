/**
 * _patch_schema_v3.js — Patch schema-farm-v3.sql to be migration-compatible.
 *
 * 1. Replaces system.migration_log with runner.js-compatible version
 * 2. Replaces system.legacy_raw with runner.js-compatible version
 * 3. Inserts 10 missing tables
 * 4. Appends ALTER TABLE for 1004 missing columns
 *
 * Usage: node _patch_schema_v3.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema-farm-v3.sql');
let sql = fs.readFileSync(schemaPath, 'utf8');

// Normalize to \n for reliable matching; re-add \r\n on write
const originalLineEnding = sql.includes('\r\n') ? '\r\n' : '\n';
sql = sql.replace(/\r\n/g, '\n');

// ═══════════════════════════════════════════════════
// 1. Replace system.migration_log
// ═══════════════════════════════════════════════════
const oldMigrationLog = `CREATE TABLE IF NOT EXISTS system.migration_log (
  id           SERIAL PRIMARY KEY,
  version      TEXT NOT NULL,
  description  TEXT,
  applied_at   TIMESTAMPTZ DEFAULT NOW(),
  checksum     TEXT
);`;

const newMigrationLog = `CREATE TABLE IF NOT EXISTS system.migration_log (
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
);`;

if (sql.includes(oldMigrationLog)) {
  sql = sql.replace(oldMigrationLog, newMigrationLog);
  console.log('✓ Replaced system.migration_log');
} else {
  console.log('⚠ system.migration_log not found (may already be patched)');
}

// ═══════════════════════════════════════════════════
// 2. Replace system.legacy_raw
// ═══════════════════════════════════════════════════
const oldLegacyRaw = `CREATE TABLE IF NOT EXISTS system.legacy_raw (
  id          SERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   INTEGER,
  raw_data    JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);`;

const newLegacyRaw = `CREATE TABLE IF NOT EXISTS system.legacy_raw (
  id              SERIAL PRIMARY KEY,
  source_table    TEXT NOT NULL,
  row_data        JSONB NOT NULL,
  migrated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

if (sql.includes(oldLegacyRaw)) {
  sql = sql.replace(oldLegacyRaw, newLegacyRaw);
  console.log('✓ Replaced system.legacy_raw');
} else {
  console.log('⚠ system.legacy_raw not found (may already be patched)');
}

// ═══════════════════════════════════════════════════
// 3. Insert missing tables + ALTER columns BEFORE FK section
// ═══════════════════════════════════════════════════
const FK_MARKER = `-- ████████████████████████████████████████████████████████████████
-- ██  FOREIGN KEY CONSTRAINTS (cross-schema)
-- ██  Deferred to after all tables exist
-- ████████████████████████████████████████████████████████████████`;

const missingTables = `
-- ████████████████████████████████████████████████████████████████
-- ██  MISSING TABLES (from optimized schema, needed for migration)
-- ██  Adapted to farm-v3 style (SERIAL PK, IF NOT EXISTS)
-- ████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS feed.feed_totals_by_ration (
  id                  SERIAL PRIMARY KEY,
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

`;

// Read the ALTER statements
const alterPath = path.join(__dirname, '_add_missing_columns.sql');
const alterStatements = fs.readFileSync(alterPath, 'utf8')
  .replace(/\r\n/g, '\n')
  // Remove the header comments and the TODO lines at the bottom
  .split('\n')
  .filter(l => l.startsWith('ALTER TABLE'))
  .join('\n');

const legacyColumnsSection = `
-- ████████████████████████████████████████████████████████████████
-- ██  LEGACY MIGRATION COLUMNS
-- ██  Extra columns from optimized schema needed for data migration
-- ██  Added via ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotent)
-- ████████████████████████████████████████████████████████████████

${alterStatements}

`;

if (sql.includes(FK_MARKER)) {
  sql = sql.replace(FK_MARKER, missingTables + legacyColumnsSection + FK_MARKER);
  console.log('✓ Inserted 10 missing tables');
  console.log(`✓ Inserted ${alterStatements.split('\n').length} ALTER TABLE statements`);
} else {
  console.error('✗ Could not find FK section marker!');
  process.exit(1);
}

// ═══════════════════════════════════════════════════
// 4. Write the patched schema
// ═══════════════════════════════════════════════════
fs.writeFileSync(schemaPath, sql.replace(/\n/g, originalLineEnding), 'utf8');
console.log(`\n✓ schema-farm-v3.sql patched (${sql.split('\n').length} lines)`);
