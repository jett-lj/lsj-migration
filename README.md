# LSJ Migration Tool

Standalone CLI tool for migrating the legacy CATTLE database (SQL Server) to PostgreSQL for LSJ-HUB.

> **Migrating one customer onto their VPS?** Follow **[RUNBOOK-vps-single-farm.md](RUNBOOK-vps-single-farm.md)**
> — the end-to-end single-farm procedure (schema, migrate, validate, **required dedupe**,
> **system-DB bootstrap**, boot). The `Usage` list below is the command reference.

## What It Does

- **171 legacy tables** categorised into 3 strategies:
  - **20 mapped** — column-level transforms into normalised PostgreSQL tables
  - **105 raw** — preserved as JSONB in `legacy_raw` table
  - **46 excluded** — temp/system tables skipped with documented reasons
- Paginated reads (OFFSET/FETCH) for large tables (400K+ rows)
- SAVEPOINT per row to prevent transaction poisoning on individual failures
- Full FK integrity validation after migration
- Idempotent: safe to re-run (ON CONFLICT DO NOTHING)

## Setup

```bash
npm install
cp .env.example .env   # edit with your credentials
```

## Usage

```bash
# Full migration (mapped + raw tables)
node migrate.js

# Preview only (no writes)
node migrate.js --dry-run

# Migrate specific tables
node migrate.js --tables Breeds,Cattle

# Pre-flight audit (row counts, coverage check)
node migrate.js --audit

# Post-migration validation (FK integrity, data quality)
node migrate.js --validate

# Reconciliation report (source vs target row counts)
node migrate.js --reconcile

# Custom batch size
node migrate.js --batch-size 1000
```

## Testing

```bash
npm test
```

Requires a running PostgreSQL instance (creates/drops `lsj_migration_test` database automatically).

## File Structure

| File | Purpose |
|------|---------|
| `migrate.js` | CLI entry point |
| `config.js` | MSSQL connection config from env vars |
| `connections.js` | Pool management for MSSQL + PostgreSQL |
| `categories.js` | 171-table categorisation (mapped/raw/excluded) |
| `mappings.js` | Column-level mapping definitions + transform helpers |
| `runner.js` | Core migration engine (pagination, batching, validation) |
| `schema-farm-v6.sql` | PostgreSQL target farm-DB schema |
| `schema-system.sql` | PostgreSQL system-DB schema (users, farms, registry) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USER` | Yes | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | Yes | | PostgreSQL password |
| `DB_NAME` | No | `barmount` | Target database name |
| `MSSQL_HOST` | Yes | | SQL Server host |
| `MSSQL_PORT` | No | `1433` | SQL Server port |
| `MSSQL_USER` | Yes | | SQL Server login |
| `MSSQL_PASSWORD` | Yes | | SQL Server password (quote if it has `#`) |
| `MSSQL_DATABASE` | No | `CATTLE` | Source database name |
| `MIGRATION_BATCH_SIZE` | No | `500` | Rows per batch |
| `MIGRATION_LOG_LEVEL` | No | `info` | Log verbosity (debug/info/warn/error) |

## Recovery & partial-failure handling

The migration is **idempotent** — `ON CONFLICT DO NOTHING` on every INSERT means re-running the same source data against the same target produces the same end state, no duplicates. That gives you several knobs to recover from mid-run failures without starting over.

> **Caveat (LSJH-781):** the idempotency claim holds only when the per-run TRUNCATE runs. `finance.costs` (and `costs_feed_detail`) have SERIAL PKs and **no natural unique key**, so `ON CONFLICT` never fires for them — with `SKIP_TRUNCATE=1` (the multi-source second pass), re-loading the same source **silently doubles** those tables. Never re-run a source against a target under SKIP_TRUNCATE; the planned fix is a provenance guard + $-sum reconciliation (LSJH-783).

### Three failure modes (and what each one means)

| Symptom in log | What happened | Counted as | Aborts the table? |
|---|---|---|---|
| `[SKIP] {"reason":"junk", ...}` | `skipRow()` matched (header row, junk marker, blank PK) | `rowsSkipped` | No |
| `[SKIP] {"reason":"pg-conflict", ...}` | `ON CONFLICT DO NOTHING` — row already in target (re-run, dedup) | `rowsSkipped` | No |
| `[SKIP] {"reason":"pg-row-error", ...}` | PG rejected the INSERT (FK violation, type mismatch, CHECK fail) | `rowsErrored` | No — savepoint rolls back just that row, batch continues |
| `[SKIP_MORE] {"suppressed_after":25, ...}` | More than 25 of the same `(table, reason)` — output capped so logs stay readable | — | No |
| `Row insert error (table) [pk=..]` | First 50 row-level errors echo the full message; later ones suppressed | `rowsErrored` | No |
| `Failed to migrate <table>: <err>` | Whole-table abort (e.g. lost MSSQL connection, schema missing) | `status='failed'` | Yes (this table only) |

Skip reason cap = 25 per `(table, reason)` per run; row-error log cap = 50 per table per run. Counters are exact regardless of log caps.

### Which tables migrated successfully?

`system.migration_log` is the source of truth. Each table run inserts a row with its outcome:

```sql
SELECT source_table, status, rows_read, rows_written, rows_skipped, rows_errored, started_at, completed_at, error
  FROM system.migration_log
 ORDER BY started_at DESC;
```

`status` values: `running` · `completed` · `failed`. A `running` row that's older than your batch took is a sign the process crashed mid-table — see "Reset a stuck table" below.

For a quick sanity comparison against source row counts:

```bash
npm run migrate:reconcile -- --output reconcile-report.json
# Inspect: jq '.tables[] | select(.delta != 0)' reconcile-report.json
```

`delta = 0` for every mapped table means the migration matched the source row-for-row.

### Resume after a partial failure

Re-runs are safe — duplicates skip via `ON CONFLICT DO NOTHING`. Three common patterns:

```bash
# Re-run everything; previously-written rows skip cheaply, only missing rows write.
node migrate.js

# Re-run just the failed table(s).
node migrate.js --tables Drugs_Given,Costs

# Re-run just one table with verbose logging to diagnose row-level errors.
MIGRATION_LOG_LEVEL=debug node migrate.js --tables Drugs_Given
```

`--tables` accepts the **source** (legacy CATTLE) table name — see `categories.js` for the canonical list.

### Reset a stuck table

If `migration_log.status = 'running'` for a table that's no longer being processed (the previous run crashed before flipping it to `completed`/`failed`), clear the marker and the partially-written rows before re-running. The script doesn't auto-detect a stale `running` row.

```sql
-- Identify
SELECT * FROM system.migration_log WHERE status = 'running';

-- For each stuck table: clear the migration_log marker
DELETE FROM system.migration_log WHERE source_table = '<TableName>' AND status = 'running';

-- TRUNCATE the target tables for that source so the re-run is clean.
-- (Migration's own --tables re-run also wipes targets via the same TRUNCATE
--  block as the full run — see runner.js around line 286 — but only when
--  SKIP_TRUNCATE is unset, which is the default.)
```

Then re-run with `--tables <TableName>`. The full run path TRUNCATEs target + audit tables at start, so a fresh `node migrate.js` (no `--tables`) effectively resets the whole farm.

### Reset a farm DB from scratch

For a truly clean slate (use when iterating on `mappings.js` and you want zero stale rows):

```bash
# Drops + recreates the target DB. CAUTION: irreversible.
psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE)"
psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME"
psql -U $DB_USER -d $DB_NAME -f schema-farm-v6.sql

# Then re-run the migration
node migrate.js
```

For multi-farm runs (`migrate-all.js`), the loop drops + recreates each farm DB before processing. See the `_create_farm_dbs.js` and `_migrate_all_farms.js` helpers.

### Log files & where errors actually live

- **stdout** — the human-readable progress + `[SKIP]` / `[SKIP_MORE]` JSON lines + error summaries. Pipe to a file: `node migrate.js 2>&1 | tee migrate-$(date +%F-%H%M).log`.
- **`migrate-all-farms.log`** — written by `_migrate_all_farms.js` per-run.
- **`aggregate-users.log`** — written by `_aggregate_users.js` (cross-farm user reconciliation).
- **`system.migration_log` table** — structured per-table outcomes. Authoritative for "did this table finish".
- **`system.legacy_raw` table** — every raw-strategy row is stored as JSONB here. If a `mapped`-strategy row had to be dropped (rare), check the `_orphan_*` keys.

### SAVEPOINT semantics — what survives a row-level failure

Each batch (`MIGRATION_BATCH_SIZE` rows by default) opens one PG transaction. Inside that transaction:

1. A `SAVEPOINT batch_sp` wraps the multi-row INSERT attempt. If it fails (typical cause: one bad row poisons the batch), `ROLLBACK TO SAVEPOINT batch_sp` releases the savepoint and the migration falls back to **row-by-row** for that chunk.
2. Each row-by-row INSERT opens its own `SAVEPOINT sp`. If a single row errors, `ROLLBACK TO SAVEPOINT sp` releases the savepoint — the rest of the rows in the same batch can still commit.
3. After the chunk completes, the outer transaction COMMITs.

Effect: a malformed row never aborts an entire table run. It increments `rowsErrored`, emits a `[SKIP]` line, and the migration continues. Only an unrecoverable infrastructure error (lost connection, schema missing) aborts the table.

### When to suspect data drift vs. a migration bug

- `rowsErrored > 0` on a mapped table → almost always a `mappings.js` issue (transform produced a value the target column rejects). Check the first error message in the log; the fix usually lives in the `transform:` callback for the offending column.
- `rowsSkipped` dominated by `pg-conflict` on a fresh DB → suggests TRUNCATE didn't run (e.g. `SKIP_TRUNCATE=1` was set by `migrate-all.js --target-db` for a second source). Verify and re-run.
- `rowsSkipped` dominated by `junk` → expected for tables with sentinel rows. If the count seems too high, audit `skipRow()` for that table in `mappings.js`.
- `rows_written` < source count and `rows_errored` = 0 → check `pg-conflict` skips; if those are also 0, the source query may have an `OFFSET/FETCH` bug. Open an issue with the table name + the `OFFSET/FETCH` SQL from the debug log.
