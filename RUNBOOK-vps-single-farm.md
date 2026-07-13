# Single-Farm VPS Migration Runbook (e.g. Barmount)

> Migrate ONE customer's legacy CFR (SQL Express) database into that customer's LSJ-HUB
> PostgreSQL, on the customer's own VPS, then boot LSJ-HUB against it.
> This is the `node migrate.js` CLI path — **not** `migrate-all.js` (batch) and **not** the web UI.

The tool runs on the **VPS host**, next to CFR SQL Express — it reaches CFR directly
(`localhost` / named instance), NOT via `host.docker.internal` (that address is only for the
LSJ-HUB app container). The tool uses its OWN `MSSQL_*` env — it does **not** read the app's
`CFR_SQL_CONNSTRING`.

---

## 0. Prerequisites

- Node.js installed on the VPS host.
- CFR SQL Express reachable locally, with a **read-only** login for the source `CATTLE` DB
  (and `CATTLE_feed` / `CATTLE_Feedtrans` if this customer has them).
- PostgreSQL reachable (the same PG the LSJ-HUB container will use), with a role that has
  `CREATEDB`.
- The tool copied onto the host; `npm install` run.

```bash
cd /path/to/lsj-migration
npm install
```

## 1. Configure `.env`

```bash
cp .env.example .env      # .env is gitignored — never commit it
```

Set (no plaintext defaults — the tool THROWS if MSSQL creds are missing):

```ini
# --- PostgreSQL target (same PG the app uses) ---
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=__set_me__
DB_NAME=barmount            # the per-farm DB name for THIS customer

# --- CFR SQL Express source (READ-ONLY login) ---
MSSQL_HOST=localhost\SQLEXPRESS   # named instance → SQL Browser resolves it (port is ignored)
# MSSQL_HOST=localhost            # …or a static-port instance, with:
# MSSQL_PORT=1433
MSSQL_USER=lsj_migrate
MSSQL_PASSWORD=__set_me__
MSSQL_DATABASE=CATTLE
```

## 2. Create a FRESH, EMPTY target database

```bash
psql -U "$DB_USER" -d postgres -c "CREATE DATABASE barmount"
```

> Do **not** pre-apply the schema — `migrate.js` applies `schema-farm-v6.sql` itself.
> The target MUST be empty: a full run TRUNCATEs every mapped target before reloading.
> As a safety net, the tool now **aborts** a full run against a non-empty target unless you
> pass `--force` (see §7).

## 3. Pre-flight (no writes)

```bash
# Source connectivity + coverage. Exits 1 if any source table is uncategorised.
node migrate.js --audit

# Assert every mapped target column exists in the schema.
node migrate.js --check-mappings

# Full dry run — no writes, no TRUNCATE, no FK drop.
node migrate.js --dry-run
```

## 4. Migrate

```bash
node migrate.js 2>&1 | tee "migrate-$(date +%F-%H%M).log"
```

This (a) applies the schema with FK blocks deferred, (b) drops FK constraints, (c) TRUNCATEs
every mapped target + `system.legacy_raw` / `system.migration_log`, (d) loads mapped then raw
tables, (e) restores FK constraints (partitioned-table FKs are added validating), (f) runs
post-migration validation.

## 5. Validate + reconcile

```bash
node migrate.js --validate
node migrate.js --reconcile --output "reconcile-$(date +%F).json"
```

Confirm: per-table delta = 0, FK-integrity checks pass, and **resolve every data-quality
warning** before first app boot (see §6). Do **not** trust exit code alone — scan the
`--validate` output for any `FAIL` and check `rows_errored` per table (partial loads can still
report green; see LSJH follow-ups in the review).

## 6. Resolve integrity warnings BEFORE first app boot (REQUIRED)

LSJ-HUB builds these partial-unique indexes on first boot; each is **skip-and-warned** if the
migrated data violates it, leaving the box index-less and its writers throwing `42P10`/binding
the wrong beast. `--validate` reports each; fix any non-zero count with the matching LSJ-HUB
script (run against the migrated farm DB), then re-check:

| Warning (from `--validate`)                         | Fix (run in LSJ-HUB) |
| --------------------------------------------------- | -------------------- |
| duplicate active **ear tags** (LSJH-346)            | `node server/scripts/dedupe-ear-tags.js` |
| duplicate active **EIDs** (LSJH-673)                | `node server/scripts/dedupe-eids.js` |
| duplicate **feed-aggregate** cost rows (LSJH-663)   | `node server/scripts/dedupe-feed-cost-aggregates.js` (or decide on aggregation) |

> ⚠️ **Barmount reality (measured):** ~**2,706 duplicate active ear tags** — this WILL trip the
> LSJH-346 index. Run `dedupe-ear-tags.js` before first boot. (EID and feed-aggregate dups
> measured **0** on Barmount, but re-check per customer.)

## 7. Bootstrap the system DB (REQUIRED for any login)

The farm migration above populates only the per-farm DB. LSJ-HUB also needs the **system DB**
(`lsj_system`: users, farms, plans). Without this there is no login and no farm registered.

```bash
node _bootstrap_system_db.js         # creates lsj_system + applies schema-system.sql + seed-system.sql
```

This seeds a bootstrap `admin` account (change its password immediately). To import the
customer's CFR staff as users (optional — they CANNOT log in until an admin sets a password;
alpha email is off):

```bash
node _aggregate_users.js --only barmount
```

## 8. Boot LSJ-HUB and verify convergence

Point the app at `DB_NAME=barmount` + `lsj_system` and start it. On first boot, `initFarmDb`
brings the migrated DB up to the live app schema and the LSJH-671 drift-checker runs.

Watch the boot logs for:
- `CREATE UNIQUE INDEX … skipped` → a §6 dedupe was missed; fix and reboot.
- drift-checker clean.

Then spot-check in the app: P&L (expenses positive, realistic net — see finance note below),
pen occupancy, a few animal records.

---

## Finance note (LSJH-768) — migrated ledgers are UNCODED, by design

Migrated `finance.costs` rows are written **uncoded** (`cost_code_id` NULL) with `revexp_code`
preserved. The app's P&L readers (`reports/cost-expr.js`) classify them by the numeric
`revexp_code`: 8/9 = live-sale revenue, **10 = carcase (dropped from the ledger; sourced from
`carcase_data` so it is not double-counted)**, everything else = expense at magnitude (so CFR's
negative expense sign reads correctly). This is why P&L comes out right without any sign
gymnastics. Do NOT "fix" this by coding the rows — that re-introduces the errors LSJH-768 killed.

## Safety notes

- **`--force`**: only needed to deliberately re-migrate onto an already-populated DB (it bypasses
  the empty-target guard, which TRUNCATEs). Never use it against a live customer DB you don't
  intend to wipe.
- **Web UI (`server.js`)**: unauthenticated destructive endpoints (`/api/wipe`, `/api/farm/clear-pg`,
  `/api/migrate`). It binds `127.0.0.1` by default — **keep it there** and reach it over an SSH
  tunnel if needed; never set `UI_HOST=0.0.0.0`. Prefer the CLI for this migration.
- **Credentials**: come from `.env` only. Rotate the `lsj_migrate` / PG creds if they were ever
  committed historically (code scrub ≠ rotation).
- **Migrated users**: cannot log in with legacy CFR passwords (placeholder hash + no alpha email).
  Use the seed `admin`, or have an admin set passwords manually.

## Known non-blockers for a single-farm test (tracked, not fixed here)

- `migrate-all.js` multi-farm bugs (shared cattle pool / feed pools not opened) — not on this path.
- `validateMigration` can report green on a partial load (errored rows absorbed as "expected
  loss") — read the per-table error counts, don't trust exit 0 alone.
- Migrated `chemical_inventory.chemical_drug_id` now remaps to the serial `drugs.id` keyspace.
