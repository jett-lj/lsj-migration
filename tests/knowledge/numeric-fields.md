# Numeric Fields

All fields that pass through `toNum` or other numeric transforms.
Each entry documents edge cases that tests must cover.

## toNum Fields (nullable — null in, null out)

| Table | Source Column | Target Column | Type | Edge Cases |
|---|---|---|---|---|
| drugs | Cost_per_unit | cost_per_unit | DOUBLE PRECISION | 0, null, negative, float |
| drugs | WithHold_days_1 | withhold_days | INTEGER (nullable) | null=unknown, 0=genuinely zero |
| drugs | WithHold_days_ESI | esi_days | INTEGER (nullable) | null=unknown, 0=genuinely zero |
| market_categories | Min_DOF | min_dof | INTEGER | 0, null |
| purchase_lots | Number_Head | head_count | INTEGER | 0, null |
| purchase_lots | Total_Weight | total_weight_kg | DOUBLE PRECISION | 0, null, float |
| purchase_lots | Cost_of_Cattle | total_cost | DOUBLE PRECISION | 0, null, negative (credit) |
| purchase_lots | Cattle_Freight_Cost | freight_cost | DOUBLE PRECISION | 0, null |
| cows | Feedlot_Entry_Wght | entry_weight_kg | DOUBLE PRECISION | 0, null, float |
| cows | Sale_Weight | sale_weight_kg | DOUBLE PRECISION | 0, null |
| cows | Start_Weight | start_weight_kg | DOUBLE PRECISION | 0, null |
| weighing_events | Weight | weight_kg | DOUBLE PRECISION (nullable) | null=missing, 0=valid |
| weighing_events | P8_Fat | p8_fat | SMALLINT | 0, null |
| treatments | Units_Given | dose | DOUBLE PRECISION | 0, null, float |
| costs | Rev_Exp_per_Unit | unit_cost | DOUBLE PRECISION | 0, null, negative |
| costs | Units | units | DOUBLE PRECISION | 0, null |
| costs | Extended_RevExp | amount | DOUBLE PRECISION | 0, null, negative (expense) |
| vendor_declarations | Number_Cattle | number_cattle | SMALLINT | 0, null |
| drug_purchases | Quantity_received | quantity | DOUBLE PRECISION | 0, null |
| drug_purchases | Drug_cost | cost | DOUBLE PRECISION | 0, null |
| drug_disposals | Number_disposed | quantity | DOUBLE PRECISION | 0, null |
| carcase_data | 20+ numeric columns | various | various | see column-audit.md |

## toFkId Fields (0 → null)

| Table | Source Column | Target Column | Notes |
|---|---|---|---|
| purchase_lots | Vendor_ID | vendor_id | 0 = no vendor |
| purchase_lots | Agent_Code | agent_id | 0 = no agent |
| treatments | Drug_ID | drug_id | 0 = unknown drug |
| treatments | SB_Rec_No | health_record_id (via sbRecNoMap) | 0 = no health record |
| health_records | Disease_ID | disease_id | 0 = no disease |
| drug_purchases | DrugID | drug_id | 0 = unknown |
| drug_disposals | DrugID | drug_id | 0 = unknown |
| vendor_declarations | Owner_Contact_ID | owner_contact_id | 0 = no contact |

## Sentinel Values

| Table | Column | Sentinel | Meaning |
|---|---|---|---|
| weighing_events | weighed_at | '1900-01-01T00:00:00.000Z' | Source date was null |
| pen_movements | moved_at | '1900-01-01T00:00:00.000Z' | Source date was null |
| treatments | administered_at | '1900-01-01T00:00:00.000Z' | Source date was null |

## Precision Notes

- All monetary values (cost, amount, total_cost, freight_cost, unit_cost, cost_per_unit) are DOUBLE PRECISION
- Weight values are DOUBLE PRECISION — no rounding should occur
- `toNum()` uses `Number()` which preserves IEEE 754 double precision
- Integer fields (teeth, fat_colour, etc.) are stored as SMALLINT — verify no truncation
