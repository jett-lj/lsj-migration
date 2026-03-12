# LSJ Migration Tool

Standalone CLI tool for migrating the legacy CATTLE database (SQL Server) to PostgreSQL for LSJ-HUB.

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
| `schema-farm.sql` | PostgreSQL target schema |

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
