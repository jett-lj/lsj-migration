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
