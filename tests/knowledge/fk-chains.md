# FK Chains

All foreign key relationships across the migrated schema.
Tests must verify each chain resolves correctly and handles missing parents gracefully.

## Chain List

| # | Child Table | FK Column | Parent Table | Parent Column | Resolution Method | On Missing Parent |
|---|---|---|---|---|---|---|
| 1 | purchase_lots | vendor_id | contacts | id | toFkId + contactIdSet sanitize | set null |
| 2 | purchase_lots | agent_id | contacts | id | toFkId + contactIdSet sanitize | set null |
| 3 | cows | purchase_lot_id | purchase_lots | id | Purch_Lot_No → lot_number lookup | set null |
| 4 | cows | pen_id | pens | id | Pen_Number → name lookup + auto-create | auto-create pen |
| 5 | weighing_events | cow_id | cows | id | BeastID → cowIdMap | skip row |
| 6 | pen_movements | cow_id | cows | id | BeastID → cowIdMap | skip row |
| 7 | pen_movements | pen_id | pens | id | Pen → penIdMap + auto-create | auto-create pen |
| 8 | treatments | cow_id | cows | id | BeastID → cowIdMap | skip row |
| 9 | treatments | drug_id | drugs | id | Drug_ID → toFkId + drugIdSet sanitize | set null |
| 10 | treatments | health_record_id | health_records | id | SB_Rec_No → sbRecNoMap | set null |
| 11 | costs | cow_id | cows | id | BeastID → cowIdMap | skip row |
| 12 | costs | cost_code_id | cost_codes | id | RevExp_Code → costCodeMap | set null |
| 13 | health_records | cow_id | cows | id | Beast_ID → cowIdMap | skip row |
| 14 | health_records | disease_id | diseases | id | Disease_ID → toFkId | set null (if 0 or missing) |
| 15 | carcase_data | cow_id | cows | id | Beast_ID → cowIdMap | skip row |
| 16 | autopsy_records | cow_id | cows | id | Beast_ID → cowIdMap | skip row |
| 17 | vendor_declarations | owner_contact_id | contacts | id | Owner_Contact_ID → toFkId + contactIdSet sanitize | set null |
| 18 | location_changes | cow_id | cows | id | BeastID → cowIdMap | skip row |
| 19 | drug_purchases | drug_id | drugs | id | DrugID → toFkId + drugIdSet sanitize | set null |
| 20 | drug_disposals | drug_id | drugs | id | DrugID → toFkId + drugIdSet sanitize | set null |

## Resolution Strategies

### skip row
Row is discarded if parent FK cannot be resolved. This applies to all tables
where `requiresLookup: 'cowIdMap'` — if the BeastID doesn't exist in cows,
the event/record is meaningless.

### set null
FK column is set to NULL. Row is still inserted. This applies to optional
relationships (e.g., a cost doesn't need a cost_code to be valid).

### auto-create
Parent record is created on-demand. Only used for pens — if a pen name
appears in PensHistory but wasn't in FeedDB_Pens_File, a new pen row is
created with just the name.

## Migration Order Dependencies

```
Order 10: breeds, pens, contacts, diseases, drugs, cost_codes, market_categories
Order 20: purchase_lots (needs contacts)
Order 30: cows (needs breeds, pens, purchase_lots)
Order 40: weighing_events, pen_movements, treatments, costs, health_records (need cows + lookups)
Order 50: carcase_data, autopsy_records, vendor_declarations, location_changes, drug_purchases, drug_disposals
```

Lookups are built after each table completes, so order 40 tables have access to
cowIdMap (built after cows), sbRecNoMap (built after health_records), etc.
