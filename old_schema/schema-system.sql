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
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

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
  farm_id     INTEGER,
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
