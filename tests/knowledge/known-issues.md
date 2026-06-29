# Known Issues & Transform Decisions

## Bugs Fixed (Phase 0)

| # | File | Bug | Fix Applied |
|---|---|---|---|
| 1 | schema-farm.sql | `CREATE INDEX idx_cows_herd_id ON cows(herd_id)` — column doesn't exist | Removed the index |
| 2 | mappings.js | Drugs `withhold_days`/`esi_days`: `toNum(v) \|\| 0` coerced null→0 | Changed to plain `toNum` (nullable) |
| 3 | mappings.js | Weighing_Events `weight_kg`: `n !== null ? n : 0` coerced null→0 | Changed to plain `toNum` (nullable) |
| 4 | mappings.js/schema | Costs `Rev_Exp_per_Unit` → `_unit_cost` had no target column | Added `unit_cost DOUBLE PRECISION` to costs + buildInsertValues |
| 5 | mappings.js | Sick_Beast_Records missing Disease_ID, Date_Recovered_Died, Result_Code | Added column mappings + schema columns |
| 6 | mappings.js/schema | Cattle DOB, Start_Date, Start_Weight selected but never mapped | Added `dob`, `start_date`, `start_weight_kg` to cows schema + columns[] + buildInsertValues |
| 7 | mappings.js/runner | Drugs_Given SB_Rec_No not mapped → treatments.health_record_id always NULL | Added `_sb_rec_no` column mapping + sbRecNoMap lookup + resolution in processBatch |

## Schema Changes Made

- `drugs.withhold_days` — removed `DEFAULT 0`, now nullable
- `drugs.esi_days` — removed `DEFAULT 0`, now nullable
- `cows` — added `dob DATE`, `start_date DATE`, `start_weight_kg DOUBLE PRECISION`
- `health_records` — added `disease_id INTEGER REFERENCES diseases(id)`, `date_recovered DATE`, `result_code TEXT`
- `costs` — added `unit_cost DOUBLE PRECISION`
- Removed `CREATE INDEX idx_cows_herd_id`

## Transform Decisions

| Transform | Decision | Rationale |
|---|---|---|
| null withhold_days | Keep as NULL | NULL = unknown, 0 = genuinely zero days withholding |
| null weight_kg | Keep as NULL | NULL = weight not recorded, 0 = impossible for live animal |
| null dates → sentinel '1900-01-01' | Keep sentinel | weighing_events.weighed_at is NOT NULL; sentinel distinguishes "unknown date" from truly missing record |
| Description fallback | `trimOrNull(v) \|\| 'Sick beast record'` | health_records.description is NOT NULL; fallback prevents validation failure |
| Breed text not ID | `cows.breed` stores text name, not FK to breeds.id | Design decision — avoids FK overhead; breeds table is still populated for reference |
| Ownership period compression | 5 bools → 1 text via priority | Lossy if multiple flags true; logged as MEDIUM risk |

## Bugs Fixed (Phase 1)

| # | File | Bug | Fix Applied |
|---|---|---|---|
| 8 | mappings.js | `Drugs_Purchased` query selected `Purchase_Date` which doesn't exist in source table → query failed with 0 rows FAIL | Changed to `NULL AS Purchase_Date`; target column is nullable |
| 9 | mappings.js | `Drugs_Given.Units_Given` had 2 rows with negative values → violated `treatments.dose CHECK(dose >= 0)` → 2 errors, source/target row count mismatch | Transform now maps negative dose to `null` (unknown, not zero) |

## Validation Gaps (now covered)

- `dbo.Sick_Beast_Records → health_records` was missing from row count validation — added
- `health_records.disease_id → diseases.id` was missing from FK integrity checks — added
- `treatments.health_record_id → health_records.id` was missing from FK integrity checks — added

## Bugs Fixed (Phase 2)

| # | File | Bug | Fix Applied |
|---|---|---|---|
| 10 | schema-farm-v6.sql | 20 `ALTER TABLE cattle.cows ADD COLUMN IF NOT EXISTS` statements added stale v3/v4 column names (`died`, `pen_number`, `purch_lot_no`, `agentid`, `vendorid`, `customfeedownerid`, `start_weight`, `sale_weight`, `feedlot_entry_wght`, `whold_until`, `esi_whold_until`, `background_doll_per_kg`, `current_loctype_id`, `growergroupcode`, `last_modified_timestamp`, `nfas_decl_numb`, `nlis_tag_fail_at_induction`, `dna_or_blood_number`, `pregtested`, `agist_charged_up_to_date`) alongside the correct v5 columns. Created 113 columns instead of 93. | Removed all 20 ALTER TABLE lines from schema-farm-v6.sql. Every column has a v5 equivalent already in the CREATE TABLE (e.g. `died`→`status`, `start_weight`→`start_weight_kg`, `vendorid`→`vendor_id`). |
| 11 | mappings.js | `Died` mapped to `died` (bool), `Pen_Number` to `pen_number` (text), `Purch_Lot_No` to `purch_lot_no` (text) — all targeting columns that don't exist in the v5 CREATE TABLE. Data went into stale ALTER TABLE columns instead of the proper v5 targets. | Removed 3 column mappings. Added `transformRow()` to cattle.cows mapping: derives `status` from `Died`/`Sale_Date`/`Date_Archived`, resolves `pen_id` via `penNameToIdMap` lookup, resolves `purchase_lot_id` via `purchLotNoToIdMap` lookup. |
| 12 | runner.js | No lookup maps for pen or purchase lot resolution. | Added `penNameToIdMap` (pen.pens_file: pen_name→pen_number_id) and `purchLotNoToIdMap` (purchasing.purchase_lots: lot_number→id) builders after their respective table migrations. |
| 13 | schema (v3/v4→v5) | `tag_number` (v3/v4 column name) existed alongside `ear_tag` (v5 name) — 21st stale column not in the original 20. DBs created with v3/v4 schema had `tag_number` in CREATE TABLE; v5 migration added `ear_tag` separately, resulting in 94 columns. | Added `tag_number→ear_tag` to `_fix_stale_columns.js` and `staleCols` list in runner.js validation. |

### Fix process for existing databases (pre-fix)

Databases created before the schema fix will have 21 extra stale columns on `cattle.cows` (20 ALTER TABLE + `tag_number`). To repair:

1. **Run** `node _fix_stale_columns.js <dbname>` — migrates data from stale→v5 columns, drops legacy views, drops stale columns, recreates views
2. **Verify** with `node _audit_stale_all_dbs.js` — all DBs should report CLEAN with 93 columns

The script:
- Migrates data from stale→v5 columns where v5 is empty (direct copy for renames, FK lookups for pen_id/purchase_lot_id, CASE logic for status)
- Handles FK columns with value 0 (converts to NULL via NULLIF — 0 is not a valid contact/pen/lot ID)
- Drops legacy views that depend on stale columns before dropping
- Recreates legacy views after (views referencing dropped columns are skipped)
- Refuses to drop columns if data would be lost and can't be migrated

**Status: RESOLVED** — all 12 databases verified clean at 93 columns on cattle.cows.

### Bug #14: Missed column renames — vendor_ear_tag + breed on cattle.cows
**Discovered:** Follow-up audit of all tables (not just ALTER TABLE additions).
**Root cause:** The v5 CREATE TABLE defines `previous_ear_tag` and `breed_id`, but on 8 v3/v4 databases the table already existed with the old column names `vendor_ear_tag` (TEXT) and `breed` (TEXT). Since `CREATE TABLE IF NOT EXISTS` is a no-op on existing tables, the new columns were never created. These weren't caught by the original fix because they weren't ALTER TABLE additions.

**Affected:** anna_plains, barmount3, bos_grazing, bsntrading, cattle, highlands, v4_schema_test, vichills

**Fix:** `_fix_cows_renames.js`
- `vendor_ear_tag` → `previous_ear_tag`: simple ALTER TABLE RENAME COLUMN
- `breed` (TEXT) → `breed_id` (INTEGER): add column, populate via cast (numeric codes) or lookup (text names via cattle.breeds), drop old column
- Handles dependent views (drop before rename, recreate after)
- `cattle` DB had text breed names (56,150 rows) → resolved via cattle.breeds lookup, 100% match
- `anna_plains` (3,520 rows) and `bos_grazing` (5,109 rows) had numeric breed codes → direct cast, -1/0 → NULL

**Status: RESOLVED** — all 8 databases fixed, all 12 databases at 93 columns.

### Remaining: Category B — rangers_valley / twode / victoria_hill schema gaps
23 tables on these 3 databases have stale columns from an older schema migration plus missing v5 columns. These DBs lack cattle.cows entirely. 64 unique extra columns across the 23 tables. Separate fix needed.

### Stale column → v5 column mapping (21 entries)

| Stale (old) | v5 (correct) | Transform |
|---|---|---|
| `tag_number` | `ear_tag` | Direct rename (v3/v4→v5 schema rename) |
| `died` | `status` | `deriveCowStatus()` → 'died'/'sold'/'archived'/'active' |
| `pen_number` | `pen_id` | Lookup via `penNameToIdMap` |
| `purch_lot_no` | `purchase_lot_id` | Lookup via `purchLotNoToIdMap` |
| `agentid` | `agent_id` | Direct rename |
| `vendorid` | `vendor_id` | Direct rename |
| `customfeedownerid` | `custom_feed_owner_id` | Direct rename |
| `start_weight` | `start_weight_kg` | Direct rename |
| `sale_weight` | `sale_weight_kg` | Direct rename |
| `feedlot_entry_wght` | `feedlot_entry_weight_kg` | Direct rename |
| `whold_until` | `withhold_until` | Direct rename |
| `esi_whold_until` | `esi_withhold_until` | Direct rename |
| `background_doll_per_kg` | `background_cost_per_kg` | Direct rename |
| `current_loctype_id` | `current_loc_type_id` | Direct rename |
| `growergroupcode` | `grower_group_code` | Direct rename |
| `last_modified_timestamp` | `legacy_modified_at` | Direct rename |
| `nfas_decl_numb` | `nfas_decl_number` | Direct rename |
| `nlis_tag_fail_at_induction` | `nlis_tag_fail` | Direct rename |
| `dna_or_blood_number` | `dna_blood_number` | Direct rename |
| `pregtested` | `preg_tested` | Direct rename |
| `agist_charged_up_to_date` | `agist_charged_to_date` | Direct rename |
