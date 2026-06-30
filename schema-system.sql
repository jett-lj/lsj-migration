-- System DB schema (PostgreSQL)
-- Stores platform-wide data: users, farms, memberships, analytics, audit

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farms (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  db_name     TEXT NOT NULL UNIQUE,
  description TEXT,
  location    TEXT,
  pic         TEXT,
  latitude    NUMERIC(10,6),
  longitude   NUMERIC(10,6),
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- report_bundle (LSJH-511) — per-farm report allowlist
-- Shape: NULL                              → ALL reports enabled (default — existing
--                                            farms unchanged, nothing gated)
--        { "enabled": ["close-out", ...] } → ONLY the listed report_keys are visible
-- Enforced via server/lib/report-bundle.js (loaded onto req.farmReportBundle in
-- middleware/farm.js). DEFAULT NULL so going live for a new tenant is "set the
-- bundle", and every pre-existing farm keeps seeing every report.
ALTER TABLE farms ADD COLUMN IF NOT EXISTS report_bundle JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS farm_members (
  id        SERIAL PRIMARY KEY,
  farm_id   INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'stockman' CHECK(role IN ('owner','manager','vet','stockman','accountant')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(farm_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_farm_members_user ON farm_members(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_members_farm ON farm_members(farm_id);

CREATE TABLE IF NOT EXISTS page_views (
  id         SERIAL PRIMARY KEY,
  path       TEXT NOT NULL,
  method     TEXT DEFAULT 'GET',
  user_agent TEXT,
  ip_address TEXT,
  referrer   TEXT,
  user_id    INTEGER REFERENCES users(id),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_views_path       ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session    ON page_views(session_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id        SERIAL PRIMARY KEY,
  action    TEXT NOT NULL,
  entity    TEXT NOT NULL,
  entity_id INTEGER,
  user_id   INTEGER REFERENCES users(id),
  username  TEXT,
  details   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_log(entity);

-- ── Error tracking ────────────────────────────────────
-- Each distinct error (by fingerprint) gets one row.
-- Repeated occurrences increment `count` and refresh `last_seen`.
-- `request` stores the most-recent request snapshot so it can be replayed in tests.
CREATE TABLE IF NOT EXISTS error_log (
  id           SERIAL PRIMARY KEY,
  error_id     TEXT NOT NULL UNIQUE,          -- UUID assigned to first occurrence
  fingerprint  TEXT NOT NULL UNIQUE,          -- hash(name+message+first_app_frame) for grouping
  name         TEXT NOT NULL,                  -- e.g. TypeError, ReferenceError
  message      TEXT NOT NULL,
  stack        TEXT,
  request      JSONB,                          -- sanitized request snapshot (for replay)
  environment  JSONB,                          -- node version, NODE_ENV, timestamp
  user_context JSONB,                          -- userId, username, role, farmId
  count        INTEGER NOT NULL DEFAULT 1,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen   TIMESTAMPTZ DEFAULT NOW(),
  last_seen    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_log_fingerprint ON error_log(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_log_last_seen   ON error_log(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_resolved    ON error_log(resolved);

-- ── Refresh tokens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ── User-submitted bug reports (alpha feedback) ───────
CREATE TABLE IF NOT EXISTS bug_reports (
  id          SERIAL PRIMARY KEY,
  report_id   TEXT NOT NULL UNIQUE,       -- UUID surfaced back to the reporter
  description TEXT NOT NULL,              -- what the user says happened
  steps       TEXT,                       -- optional repro steps
  page_url    TEXT,                       -- window.location.href at time of report
  user_agent  TEXT,
  resolution  TEXT,                       -- screen resolution e.g. "1920x1080"
  screenshot  TEXT,                       -- filename in uploads/ (optional screenshot)
  breadcrumbs JSONB,                      -- last N client-side breadcrumbs
  app_version TEXT,                       -- client version at time of report
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username    TEXT,
  farm_id     INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK(status IN ('open','acknowledged','fixed','wontfix')),
  admin_note  TEXT,                       -- optional note from admin
  github_issue_url TEXT,                  -- link to created GitHub issue
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status     ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- ── Bug report comments (discussion thread) ──────────
CREATE TABLE IF NOT EXISTS bug_comments (
  id         SERIAL PRIMARY KEY,
  bug_id     INTEGER NOT NULL REFERENCES bug_reports(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username   TEXT,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bug_comments_bug_id ON bug_comments(bug_id);

-- ── Third-party integrations (Xero, MYOB, etc.) ──────
CREATE TABLE IF NOT EXISTS integrations (
  id            SERIAL PRIMARY KEY,
  farm_id       INTEGER REFERENCES farms(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK(provider IN ('xero','myob','nlis')),
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  tenant_id     TEXT,
  connected_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(farm_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_integrations_farm ON integrations(farm_id);

-- ── Login attempt tracking (account lockout) ─────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id         SERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  ip_address TEXT,
  success    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created  ON login_attempts(created_at);

-- ── Agent runs (cross-farm execution history) ─────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id           SERIAL PRIMARY KEY,
  farm_id      INTEGER REFERENCES farms(id) ON DELETE CASCADE,
  agent_type   TEXT NOT NULL CHECK(agent_type IN ('migration','quality','assistant')),
  status       TEXT NOT NULL CHECK(status IN ('running','completed','failed')),
  summary      JSONB DEFAULT '{}',
  issue_count  INTEGER DEFAULT 0,
  triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_farm_id ON agent_runs(farm_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_type    ON agent_runs(agent_type);

-- ── Farm invite codes (registration gating) ──────────
CREATE TABLE IF NOT EXISTS farm_invites (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  token       VARCHAR(64) NOT NULL UNIQUE,
  email       VARCHAR(255),
  role        TEXT NOT NULL DEFAULT 'stockman'
              CHECK(role IN ('manager','vet','stockman','accountant')),
  created_by  INTEGER NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  used_by     INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farm_invites_token   ON farm_invites(token);
CREATE INDEX IF NOT EXISTS idx_farm_invites_farm_id ON farm_invites(farm_id);

-- ── Subscription plans (head-bracket tiers) ──────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  head_min        INTEGER NOT NULL DEFAULT 0,
  head_max        INTEGER,
  monthly_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_users  INTEGER NOT NULL DEFAULT 1,
  features        JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Optional add-on modules ──────────────────────────
CREATE TABLE IF NOT EXISTS subscription_modules (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  monthly_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  annual_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Per-farm subscription record ─────────────────────
CREATE TABLE IF NOT EXISTS farm_subscriptions (
  id                SERIAL PRIMARY KEY,
  farm_id           INTEGER NOT NULL UNIQUE REFERENCES farms(id) ON DELETE CASCADE,
  plan_id           INTEGER NOT NULL REFERENCES subscription_plans(id),
  status            TEXT NOT NULL DEFAULT 'trial'
                    CHECK(status IN ('trial','active','past_due','cancelled','suspended')),
  billing_cycle     TEXT NOT NULL DEFAULT 'monthly'
                    CHECK(billing_cycle IN ('monthly','annual')),
  current_head_count INTEGER NOT NULL DEFAULT 0,
  trial_ends_at     TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farm_subscriptions_plan ON farm_subscriptions(plan_id);

-- ── Active add-on modules per farm ───────────────────
CREATE TABLE IF NOT EXISTS farm_subscription_modules (
  id              SERIAL PRIMARY KEY,
  farm_id         INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  module_id       INTEGER NOT NULL REFERENCES subscription_modules(id) ON DELETE CASCADE,
  activated_at    TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  UNIQUE(farm_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_farm_sub_modules_farm ON farm_subscription_modules(farm_id);

-- ── Plan/module change history (audit) ───────────────
CREATE TABLE IF NOT EXISTS subscription_events (
  id          SERIAL PRIMARY KEY,
  farm_id     INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscription_events_farm ON subscription_events(farm_id);

-- ═════════════════════════════════════════════════════════════════════
-- ██  LEGACY USER MIGRATION
-- ██  Pulls every per-farm `feed.feedlot_staff` row into one global
-- ██  table so the platform can deduplicate, re-issue credentials, and
-- ██  populate `users` + `farm_members` from a single source of truth.
-- ═════════════════════════════════════════════════════════════════════

-- Landing table: one row per (farm × legacy User_ID).
-- Populated by the migration runner after each farm DB is loaded.
-- The `user_id` column is NULL until the row is reconciled into `users`.
CREATE TABLE IF NOT EXISTS legacy_farm_users (
  id                          SERIAL PRIMARY KEY,
  farm_id                     INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  legacy_user_id              INTEGER NOT NULL,        -- Feedlot_Staff.User_ID
  -- Identity (verbatim from legacy Cattle.NET)
  surname                     TEXT,
  firstname                   TEXT,
  job_desc                    TEXT,
  start_date                  DATE,
  finish_date                 DATE,
  legacy_password             TEXT,                    -- Pass_word (plaintext on source)
  password_last_changed_date  DATE,
  -- Per-module permission flags (Y/N → boolean)
  cattle_data_entry           BOOLEAN,
  cattle_reports              BOOLEAN,
  cattle_utilities            BOOLEAN,
  cattle_lookup_tables        BOOLEAN,
  cattle_deletes              BOOLEAN,
  feed_system_data_entry      BOOLEAN,
  feed_system_reports         BOOLEAN,
  feed_system_utilities       BOOLEAN,
  pl_reports_allowed          BOOLEAN,
  pen_rider                   BOOLEAN DEFAULT FALSE,
  -- Reconciliation state
  user_id                     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reconciled_at               TIMESTAMPTZ,
  invite_sent_at              TIMESTAMPTZ,             -- when we asked them to set a real password
  notes                       TEXT,
  imported_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, legacy_user_id)
);
CREATE INDEX IF NOT EXISTS idx_legacy_farm_users_farm    ON legacy_farm_users(farm_id);
CREATE INDEX IF NOT EXISTS idx_legacy_farm_users_user    ON legacy_farm_users(user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_farm_users_surname ON legacy_farm_users(LOWER(surname));

-- Extend farm_members so the legacy permission flags carry through to
-- the active membership record (each user × farm carries its own perms).
ALTER TABLE farm_members
  ADD COLUMN IF NOT EXISTS legacy_user_id          INTEGER,
  ADD COLUMN IF NOT EXISTS cattle_data_entry       BOOLEAN,
  ADD COLUMN IF NOT EXISTS cattle_reports          BOOLEAN,
  ADD COLUMN IF NOT EXISTS cattle_utilities        BOOLEAN,
  ADD COLUMN IF NOT EXISTS cattle_lookup_tables    BOOLEAN,
  ADD COLUMN IF NOT EXISTS cattle_deletes          BOOLEAN,
  ADD COLUMN IF NOT EXISTS feed_system_data_entry  BOOLEAN,
  ADD COLUMN IF NOT EXISTS feed_system_reports     BOOLEAN,
  ADD COLUMN IF NOT EXISTS feed_system_utilities   BOOLEAN,
  ADD COLUMN IF NOT EXISTS pl_reports_allowed      BOOLEAN,
  ADD COLUMN IF NOT EXISTS pen_rider               BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_farm_members_legacy_user
  ON farm_members(farm_id, legacy_user_id);

-- Extend users so we can track the migration origin and force a
-- password reset on first login (legacy passwords are plaintext).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name           TEXT,
  ADD COLUMN IF NOT EXISTS last_name            TEXT,
  ADD COLUMN IF NOT EXISTS job_title            TEXT,
  ADD COLUMN IF NOT EXISTS active               BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS imported_from_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS must_reset_password  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_login_at        TIMESTAMPTZ;

