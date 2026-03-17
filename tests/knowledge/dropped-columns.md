# Dropped Columns

Columns from source tables that are intentionally NOT migrated to a target column.
Each entry documents the reason and risk level.

## Intentionally Dropped

| Source Table | Column | Reason | Risk |
|---|---|---|---|
| Cattle | Died | Used to derive `cows.status` via `deriveCowStatus()` — flag value is captured in the status enum, not needed as standalone column | LOW |
| Cattle | Date_Archived | Used to derive `cows.status` via `deriveCowStatus()` | LOW |
| Sick_Beast_Records | Ear_Tag_No | Tag is already stored on the `cows` record (via `tag_number`); joining `health_records.cow_id → cows.tag_number` provides same data | LOW |
| Autopsy_Records | 43 anatomical booleans | Packed into `findings` JSONB — all values preserved, just restructured | NONE |
| Vendor_Declarations | Born_on_Vend_prop, Owned_LT_2months, Owned_2_6_months, Owned_6_12_months, Owned_GT_12_months | Compressed into `ownership_period` TEXT via priority selection (longest period wins) | MEDIUM — lossy if multiple flags true |

## New Target Columns (no source equivalent)

| Target Table | Column | Default | Notes |
|---|---|---|---|
| pens | is_hospital | FALSE | New feature — no legacy data |
| pens | capacity | NULL | New feature |
| pens | active | TRUE | New feature |
| contacts | type | NULL | Will be classified post-migration |
| contacts | pic | NULL | Property Identification Code — new field |
| diseases | body_system | NULL | New classification field |
| cows | photo_url | NULL | New feature |
| cows | name | NULL | New feature (pet name) |
