# Legacy SQL Server → PostgreSQL Migration Checklist

> Every column from every legacy table must have a home. Mapped tables get structured columns;
> everything else is bulk-preserved in `legacy_raw` as JSONB. **Zero silent data loss.**

---

## 1. Mapped Tables (19 tables — structured column-level migration)

### 1.1 Breeds → `breeds` (27 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Breed_Code | ✅ | id | — |
| 2 | Breed_Name | ✅ | name | trimOrNull |

### 1.2 FeedDB_Pens_File → `pens` (90 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Pen_name | ✅ | name | trimOrNull |
| 2 | IsPaddock | ✅ | is_paddock | toBool |
| 3 | Include_in_Pen_List | ✅ | include_in_list | toBool |
| 4 | Current_exit_pen | ✅ | exit_pen | trimOrNull |

### 1.3 Contacts → `contacts` (903 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Contact_ID | ✅ | id | — |
| 2 | Company | ✅ | company | trimOrNull |
| 3 | Last_Name | ✅ | last_name | trimOrNull |
| 4 | First_Name | ✅ | first_name | trimOrNull |
| 5 | Salutation | ✅ | title | trimOrNull |
| 6 | Address_1 | ✅ | address | trimOrNull |
| 7 | Address_2 | ✅ | address_2 | trimOrNull |
| 8 | City | ✅ | city | trimOrNull |
| 9 | State | ✅ | state | trimOrNull |
| 10 | PostCode | ✅ | post_code | trimOrNull |
| 11 | Tel_No | ✅ | phone | trimOrNull |
| 12 | Mobile_No | ✅ | mobile | trimOrNull |
| 13 | Fax_No | ✅ | fax | trimOrNull |
| 14 | Email | ✅ | email | trimOrNull |
| 15 | Tail_Tag_No | ✅ | tail_tag | trimOrNull |
| 16 | Brand | ✅ | brand | trimOrNull |
| 17 | Contact_Type | ✅ | type | mapContactType |
| 18 | Notes | ✅ | notes | trimOrNull |
| 19 | ABN | ✅ | abn | trimOrNull |
| 20 | Bank_BSB | ✅ | bsb | trimOrNull |
| 21 | Bank_AC | ✅ | account_number | trimOrNull |
| 22 | Days_invoice_due | ✅ | payment_due_days | toNum |
| 23 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 24 | brand_drawing_filename | ✅ | brand_drawing_file | trimOrNull |
| 25 | Agistment_Paddock_Rate | ✅ | paddock_agistment_rate | toNum |
| 26 | Agistment_Feedlot_Rate | ✅ | feedlot_agistment_rate | toNum |
| 27 | Invoice_careof | ✅ | invoice_co | trimOrNull |
| 28 | Abattoir_Establishment_Number | ✅ | abattoir_est_no | trimOrNull |

> \* Column already exists in new `contacts` schema — needs mapping added

### 1.4 Diseases → `diseases` (38 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Disease_ID | ✅ | id | — |
| 2 | Disease_Name | ✅ | name | trimOrNull |
| 3 | Symptoms | ✅ | symptoms | trimOrNull |
| 4 | Treatment | ✅ | treatment | trimOrNull |
| 5 | Recoverable | ✅ | recoverable | toBool |
| 6 | BodySystemID | ✅ | body_system | trimOrNull |
| 7 | PenApp_Disease_name | ✅ | penapp_name | trimOrNull |
| 8 | Autopsy_disease | ✅ | autopsy_disease | toBool |
| 9 | No_longer_used | ✅ | active | !toBool |

> \* `body_system` column exists in new schema but not mapped. BodySystems (8 rows) is in raw.

### 1.5 Drugs → `drugs` (149 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Drug_ID | ✅ | id | — |
| 2 | Drug_Name | ✅ | name | trimOrNull |
| 3 | Units | ✅ | unit | trimOrNull |
| 4 | Cost_per_unit | ✅ | cost_per_unit | toNum |
| 5 | WithHold_days_1 | ✅ | withhold_days | toNum |
| 6 | WithHold_days_ESI | ✅ | esi_days | toNum |
| 7 | WithHold_days_3 | ✅ | withhold_days_3 | toNum |
| 8 | WithHold_days_4 | ✅ | withhold_days_4 | toNum |
| 9 | Supplier | ✅ | supplier | trimOrNull |
| 10 | Notes | ✅ | notes | trimOrNull |
| 11 | Drug_Category | ✅ | drug_category | trimOrNull |
| 12 | HGP | ✅ | is_hgp | toBool |
| 13 | Antibiotic | ✅ | is_antibiotic | toBool |
| 14 | Admin_units | ✅ | admin_units | trimOrNull |
| 15 | Admin_weight_Factor | ✅ | admin_weight_factor | toNum |
| 16 | Current_Batch_Numb | ✅ | current_batch | trimOrNull |
| 17 | Inactive | ✅ | active | !toBool |
| 18 | Cost_per_Unit_CF | ✅ | cost_per_unit_cf | toNum |
| 19 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 20 | Chemical_Mg_per_Ml | ✅ | chemical_mg_per_ml | toNum |
| 21 | Reorder_SOH_units_trigger | ✅ | reorder_trigger_units | toNum |
| 22 | Units_per_BoxOrBottle | ✅ | units_per_package | toNum |
| 23 | Units_on_hand | ✅ | units_on_hand | toNum |

### 1.6 Cost_Codes → `cost_codes` (24 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | RevExp_Code | ✅ | code | — |
| 2 | RevExp_Desc | ✅ | description | trimOrNull |
| 3 | Rev_Exp | ✅ | type | mapCostType |
| 4 | Include_in_Landed_Cost | ✅ | include_in_landed_cost | toBool |
| 5 | Last_Modified_timestamp | ❌ | — | audit field |
| 6 | Include_in_PL_expenses | ✅ | include_in_pl_expenses | toBool |
| 7 | Include_on_CF_Invoice | ✅ | include_on_cf_invoice | toBool |

### 1.7 Market_Category → `market_categories` (13 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Market_Cat_ID | ✅ | id | — |
| 2 | Market_Category | ✅ | name | trimOrNull |
| 3 | Min_DOF | ✅ | min_dof | toNum |
| 4 | Predicted_dressing_pcnt | ✅ | predicted_dressing_pct | toNum |
| 5 | HGP_Free | ✅ | hgp_free | toBool |
| 6 | Dispatch_Notes | ✅ | dispatch_notes | trimOrNull |

### 1.8 Purchase_Lots → `purchase_lots` (1,570 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Lot_Number | ✅ | lot_number | trimOrNull |
| 2 | Purchase_date | ✅ | purchase_date | toDate |
| 3 | Agent | ✅ | agent_name | trimOrNull |
| 4 | WBridge_Docket | ✅ | fl_weighbridge_docket | trimOrNull |
| 5 | Number_Head | ✅ | head_count | toNum |
| 6 | Total_Weight | ✅ | total_weight_kg | toNum |
| 7 | Cost_of_Cattle | ✅ | total_cost | toNum |
| 8 | DPI_Charges | ✅ | dpi_charges | toNum |
| 9 | Destination | ✅ | destination | trimOrNull |
| 10 | Agistor_Code | ✅ | agistor_id | toFkId |
| 11 | Cattle_Invoice_No | ✅ | cattle_invoice_no | trimOrNull |
| 12 | Invoice_Amount | ✅ | cattle_inv_amount | toNum |
| 13 | Date_Cattle_Inv_Approved | ✅ | cattle_inv_date_approved | toDate |
| 14 | Carrier | ✅ | carrier | trimOrNull |
| 15 | Freight_Invoice_No | ✅ | freight_invoice_no | trimOrNull |
| 16 | Cattle_Freight_Cost | ✅ | freight_cost | toNum |
| 17 | Date_Frght_Inv_Approved | ✅ | freight_inv_date_approved | toDate |
| 18 | Buyer_Commiss_per_Head | ✅ | commission_per_head | toNum |
| 19 | Buying_Fee | ✅ | buying_fee | toNum |
| 20 | Other_Buying_Costs | ✅ | other_buying_costs | toNum |
| 21 | Buyer | ✅ | buyer_id | toFkId |
| 22 | Purchase_Region | ✅ | purchase_region | trimOrNull |
| 23 | Risk_factor | ✅ | risk_factor | toNum |
| 24 | Total_Cost_per_Hd | ❌ | — | derived |
| 25 | Total_Cost_per_Kg | ❌ | — | derived |
| 26 | Lot_Notes | ✅ | notes | trimOrNull |
| 27 | Applied_To_Cattle_File | ✅ | applied_to_cattle | toBool |
| 28 | ID | ❌ | — | used in ORDER BY |
| 29 | Check_Box_Values | ❌ | — | UI state |
| 30 | Custom_Feed_Lot | ✅ | custom_feeding_lot | toBool |
| 31 | Feed_Charge_per_Ton | ✅ | cust_feed_charge_per_ton | toNum |
| 32 | Cattle_Owner_ID | ✅ | owner_of_cattle | trimOrNull |
| 33 | Agist_Rate_per_day | ✅ | daily_agist_charge_per_head | toNum |
| 34 | Vendor_ID | ✅ | vendor_id | toFkId |
| 35 | GrowerGroupCode | ✅ | grower_group_code | trimOrNull |
| 36 | RGTI_Lot | ❌ | — | — |
| 37 | RGTI_Done | ❌ | — | — |
| 38 | Weigh_bridge_weight | ✅ | weighbridge_weight | toNum |
| 39 | Prime_Cost | ❌ | — | derived |
| 40 | Market_Category | ✅ | market_category | trimOrNull |
| 41 | Adjusted_cost_of_cattle | ❌ | — | derived |
| 42 | RCGI_marbling_bonus_done | ❌ | — | — |
| 43 | Agent_Code | ✅ | agent_id | toFkId |
| 44 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 45 | NVD_scan_filename | ✅ | nvd_scan_file | trimOrNull |
| 46 | Weigh_ticket_scan_filename | ✅ | weigh_ticket_scan_file | trimOrNull |
| 47 | Optional_scan_filename1 | ✅ | scan_file_1 | trimOrNull |
| 48 | Optional_scan_filename2 | ✅ | scan_file_2 | trimOrNull |
| 49 | Customer_feedback_sent | ❌ | — | — |
| 50 | Marbling_bonus_lot | ✅ | marbling_bonus_lot | toBool |
| 51 | Weighbridge_Charges | ✅ | weighbridge_charges | toNum |
| 52 | Is_Financed | ✅ | financed | toBool |
| 53 | Finance_Rate | ✅ | finance_rate_pct | toNum |

> \* Column already exists in new `purchase_lots` schema — needs mapping added

### 1.9 Cattle → `cows` (93,985 rows — 85 legacy columns)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | BeastID | ✅ | legacy_beast_id | — |
| 2 | Ear_Tag | ✅ | tag_number | trimOrNull |
| 3 | EID | ✅ | eid | trimOrNull |
| 4 | Tail_Tag | ✅ | tail_tag | trimOrNull |
| 5 | Vendor_Ear_Tag | ✅ | vendor_ear_tag | trimOrNull |
| 6 | Group_Name | ✅ | group_name | trimOrNull |
| 7 | Sub_Group | ✅ | sub_group | trimOrNull |
| 8 | Breed | ✅ | breed | via lookup |
| 9 | Sex | ✅ | sex | mapSex |
| 10 | HGP | ✅ | hgp | toBool |
| 11 | Background_Doll_per_Kg | ✅ | background_cost_per_kg | toNum |
| 12 | Start_Date | ✅ | start_date | toDate |
| 13 | Start_Weight | ✅ | start_weight_kg | toNum |
| 14 | Sale_Date | ✅ | sale_date | toDate (>1901) |
| 15 | Sale_Weight | ✅ | sale_weight_kg | toNum |
| 16 | Weight_Gain | ❌ | — | derived |
| 17 | WG_per_Day | ❌ | — | derived |
| 18 | Profit_Loss | ❌ | — | derived |
| 19 | Carcase_Weight | ❌ | — | in carcase_data |
| 20 | BG_Fee | ✅ | bg_fee | toNum |
| 21 | Teeth | ✅ | teeth | toNum |
| 22 | WHold_Until | ✅ | withhold_until | toDate |
| 23 | Died | ✅ | status | deriveCowStatus |
| 24 | Date_died | ✅ | date_died | toDate |
| 25 | Notes | ✅ | notes | trimOrNull |
| 26 | Sire_Tag | ✅ | sire_tag | trimOrNull |
| 27 | Dam_Tag | ✅ | dam_tag | trimOrNull |
| 28 | Paddock_WG | ❌ | — | derived |
| 29 | Feedlot_WG | ❌ | — | derived |
| 30 | DOB | ✅ | dob | toDate |
| 31 | Last_Ohead_Update_date | ❌ | — | internal |
| 32 | EU_Dec_No | ✅ | eu_dec_no | trimOrNull |
| 33 | Feedlot_Entry_Date | ✅ | entry_date | toDate |
| 34 | Feedlot_Entry_Wght | ✅ | entry_weight_kg | toNum |
| 35 | Pen_Number | ✅ | pen_id | via penIdMap |
| 36 | Off_Feed | ✅ | off_feed | toBool |
| 37 | Purch_Lot_No | ✅ | purchase_lot_id | via purchLotIdMap |
| 38 | In_Hospital | ✅ | in_hospital | toBool |
| 39 | Buller | ✅ | buller | toBool |
| 40 | Non_Performer | ✅ | non_performer | toBool |
| 41 | Frame_Size | ✅ | frame_size | trimOrNull |
| 42 | Custom_Feeder | ✅ | custom_feeder | toBool |
| 43 | Date_Moved_Pen | ❌ | — | in pen_movements |
| 44 | DOF_in_prev_FL | ✅ | dof_in_prev_fl | toNum |
| 45 | Market_Category | ✅ | market_category | trimOrNull |
| 46 | In_Feedlot | ❌ | — | derived from status |
| 47 | Agist_Charged_Up_To_Date | ✅ | agist_charged_to_date | toDate |
| 48 | Cull_Reason | ✅ | cull_reason | trimOrNull |
| 49 | Agist_Lot_No | ✅ | agist_lot_no | trimOrNull |
| 50 | Current_LocType_ID | ✅ | current_loc_type_id | toNum |
| 51 | Old_RFID | ✅ | old_rfid | trimOrNull |
| 52 | Date_RFID_Changed | ✅ | date_rfid_changed | toDate |
| 53 | Trial_No_ID | ✅ | trial_no_id | toNum |
| 54 | NFAS_Decl_Numb | ✅ | nfas_decl_number | trimOrNull |
| 55 | GrowerGroupCode | ✅ | grower_group_code | trimOrNull |
| 56 | Date_culled | ✅ | date_culled | toDate |
| 57 | Date_Archived | ✅ | status | deriveCowStatus |
| 58 | Agistment_PIC | ✅ | agistment_pic | trimOrNull |
| 59 | Blood_vial_number | ✅ | blood_vial_number | trimOrNull |
| 60 | AP_Lot | ✅ | ap_lot | trimOrNull |
| 61 | LifeTime_Traceable | ✅ | lifetime_traceable | toBool |
| 62 | Pregnant | ✅ | pregnant | toBool |
| 63 | Planned_kill_date | ✅ | planned_kill_date | toDate |
| 64 | Beast_Sale_Type_ID | ✅ | beast_sale_type_id | toNum |
| 65 | ESI_Whold_until | ✅ | esi_withhold_until | toDate |
| 66 | PregTested | ✅ | preg_tested | toBool |
| 67 | CustomFeedOwnerID | ✅ | custom_feed_owner_id | toNum |
| 68 | Species | ✅ | species | trimOrNull |
| 69 | NLIS_tag_fail_at_induction | ✅ | nlis_tag_fail | toBool |
| 70 | DNA_or_Blood_Number | ✅ | dna_blood_number | trimOrNull |
| 71 | DOF_scheduled | ✅ | dof_scheduled | toNum |
| 72 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 73 | Marbling_bonus_lot | ✅ | marbling_bonus_lot | trimOrNull |
| 74 | Bovilus_Shots | ✅ | bovilus_shots | toNum |
| 75 | Agisted_animal | ✅ | agisted_animal | toBool |
| 76 | Program_ID | ✅ | program_id | toNum |
| 77 | Abattoir_Culled | ✅ | abattoir_culled | toBool |
| 78 | Abattoir_Condemned | ✅ | abattoir_condemned | toBool |
| 79 | last_oracle_costs | ✅ | last_oracle_costs | toNum |
| 80 | last_oracle_date | ✅ | last_oracle_date | toDate |
| 81 | Lot_closeout_date | ✅ | lot_closeout_date | toDate |
| 82 | VendorID | ✅ | vendor_id | toNum |
| 83 | AgentID | ✅ | agent_id | toNum |
| 84 | Outgoing_NVD | ✅ | outgoing_nvd | trimOrNull |
| 85 | Paddock_Tag | ✅ | paddock_tag | trimOrNull |
| 86 | EU | ✅ | eu | toBool |
| 87 | Vendor_Treated_Bovilus | ✅ | vendor_treated_bovilus | toBool |

### 1.10 Weighing_Events → `weighing_events` (235,320 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | BeastID | ✅ | cow_id | via cowIdMap |
| 2 | Ear_Tag | ✅ | ear_tag | trimOrNull |
| 3 | Weighing_Type | ✅ | weigh_type | mapWeighType |
| 4 | Weigh_date | ✅ | weighed_at | toDate |
| 5 | Weight | ✅ | weight_kg | toNum |
| 6 | Days_Owned | ✅ | days_owned | toNum |
| 7 | Intermed_WG_per_Day | ❌ | — | derived |
| 8 | Weigh_Note | ✅ | notes | trimOrNull |
| 9 | ID | ❌ | — | sequence |
| 10 | Last_Record_For_Beast | ❌ | — | flag |
| 11 | P8_Fat | ✅ | p8_fat | toNum |
| 12 | TimeWeighed | ✅ | time_weighed | trimOrNull |
| 13 | Agistor_ID | ✅ | agistor_id | toNum |
| 14 | BE_Agist_Lot_No | ✅ | be_agist_lot_no | trimOrNull |
| 15 | Cull_Reason_ID | ✅ | cull_reason_id | toNum |
| 16 | Beast_Sale_Type_ID | ✅ | beast_sale_type_id | toNum |
| 17 | To_Locn_Type_ID | ✅ | to_locn_type_id | toNum |
| 18 | User_Initials | ✅ | user_initials | trimOrNull |
| 19 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |

### 1.11 PensHistory → `pen_movements` (244,457 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | BeastID | ✅ | cow_id | via cowIdMap |
| 2 | MoveDate | ✅ | moved_at | toDate |
| 3 | Pen | ✅ | pen_id | via penIdMap |
| 4 | ID | ❌ | — | sequence |
| 5 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |

### 1.12 Drugs_Given → `treatments` (453,943 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | BeastID | ✅ | cow_id | via cowIdMap |
| 2 | Ear_Tag_No | ✅ | ear_tag | trimOrNull |
| 3 | Drug_ID | ✅ | drug_id | toFkId |
| 4 | Batch_No | ✅ | batch_no | trimOrNull |
| 5 | Date_Given | ✅ | administered_at | toDate |
| 6 | Time_Given | ✅ | time_given | trimOrNull |
| 7 | Units_Given | ✅ | dose | toNum |
| 8 | Drug_Cost | ✅ | drug_cost | toNum |
| 9 | Withold_Until | ✅ | withhold_until | toDate |
| 10 | Date_next_Dose | ✅ | date_next_dose | toDate |
| 11 | SB_Rec_No | ✅ | health_record_id | via sbRecNoMap |
| 12 | ID | ❌ | — | sequence |
| 13 | WithHold_date_ESI | ✅ | esi_withhold | toDate |
| 14 | User_Initials | ✅ | administered_by | trimOrNull |
| 15 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 16 | Where_given | ✅ | where_given | trimOrNull |
| 17 | Applied_to_StockOnHand | ❌ | — | inventory flag |

### 1.13 Costs → `costs` (426,094 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | BeastID | ✅ | cow_id | via cowIdMap |
| 2 | Ear_Tag | ✅ | ear_tag | trimOrNull |
| 3 | RevExp_Code | ✅ | cost_code_id | via costCodeMap |
| 4 | Trans_Date | ✅ | trans_date | toDate |
| 5 | Rev_Exp_per_Unit | ✅ | unit_cost | toNum |
| 6 | Units | ✅ | units | toNum |
| 7 | Extended_RevExp | ✅ | amount | toNum |
| 8 | ID | ❌ | — | sequence |
| 9 | Ration | ✅ | ration | trimOrNull |
| 10 | RCGI_induction_transaction | ❌ | — | — |
| 11 | RCGI_marbling_bonus | ❌ | — | — |
| 12 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |

### 1.14 Sick_Beast_Records → `health_records` (6,387 rows — 32 legacy columns)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Beast_ID | ✅ | cow_id | via cowIdMap |
| 2 | Ear_Tag_No | ✅ | ear_tag | trimOrNull |
| 3 | Date_Diagnosed | ✅ | date | toDate |
| 4 | Disease_ID | ✅ | disease_id | toFkId |
| 5 | Diagnosed_By | ✅ | vet_name | trimOrNull |
| 6 | Severity_Level | ✅ | severity_level | toNum |
| 7 | Date_Recovered_Died | ✅ | date_recovered | toDate |
| 8 | Result_Code | ✅ | result_code | trimOrNull |
| 9 | WHold_Until | ✅ | withhold_until | toDate |
| 10 | Sick_Beast_Notes | ✅ | description | trimOrNull |
| 11 | SB_Rec_No | ✅ | legacy_sb_rec_no | — |
| 12 | Date_to_sick_Pen | ✅ | date_to_sick_pen | toDate |
| 13 | Sick_Pen_Number | ✅ | sick_pen_number | trimOrNull |
| 14 | Date_Back_To_Pen | ✅ | date_back_to_pen | toDate |
| 15 | Back_To_Pen_Number | ✅ | back_to_pen_number | trimOrNull |
| 16 | Hosp_Tag_Number | ✅ | hosp_tag_number | trimOrNull |
| 17 | RatType | ✅ | rat_type | trimOrNull |
| 18 | Pen_Where_Found_Sick | ✅ | pen_where_found_sick | trimOrNull |
| 19 | Euthanased | ✅ | euthanased | toBool |
| 20 | Date_Last_Updated | ❌ | — | audit field |
| 21 | Too_Far_Gone | ✅ | too_far_gone | toBool |
| 22 | Insurance_Claim | ✅ | insurance_claim | toBool |
| 23 | Insurance_value | ✅ | insurance_value | toNum |
| 24 | Insurance_paid | ✅ | insurance_paid | toBool |
| 25 | DOF_when_sick | ✅ | dof_when_sick | toNum |
| 26 | Diagnoser_Empl_ID | ✅ | diagnoser_empl_id | toNum |
| 27 | User_Initials | ✅ | user_initials | trimOrNull |
| 28 | CustomFeedOwnerID | ✅ | custom_feed_owner_id | toNum |
| 29 | Purch_Lot_No | ✅ | purch_lot_no | trimOrNull |
| 30 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 31 | Cause_of_Death | ✅ | cause_of_death | trimOrNull |
| 32 | Autopsied | ✅ | autopsied | toBool |

### 1.15 Carcase_data → `carcase_data` (21,787 rows — 53 legacy columns)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Beast_ID | ✅ | cow_id + legacy_beast_id | via cowIdMap |
| 2 | Ear_Tag_No | ✅ | ear_tag | trimOrNull |
| 3 | EID | ✅ | eid | trimOrNull |
| 4 | Sold_To | ✅ | sold_to | trimOrNull |
| 5 | Abattoir | ✅ | abattoir | trimOrNull |
| 6 | Body_Number | ✅ | body_number | trimOrNull |
| 7 | Kill_Date | ✅ | kill_date | toDate |
| 8 | Carc_Wght_left | ✅ | carc_weight_left | toNum |
| 9 | Carc_Wght_right | ✅ | carc_weight_right | toNum |
| 10 | Dress_Pcnt | ✅ | dress_pct | toNum |
| 11 | Teeth | ✅ | teeth | toNum |
| 12 | Grade | ✅ | grade | trimOrNull |
| 13 | Price_$/Kg_Left | ✅ | price_per_kg_left | toNum |
| 14 | Price_$/Kg_Right | ✅ | price_per_kg_right | toNum |
| 15 | P8_fat | ✅ | p8_fat | toNum |
| 16 | Rib_fat | ✅ | rib_fat | toNum |
| 17 | Mscle_Score | ✅ | muscle_score | trimOrNull |
| 18 | Eye_Mscle_Area | ✅ | eye_muscle_area | toNum |
| 19 | PH_level | ✅ | ph_level | toNum |
| 20 | Marbling | ✅ | marbling | toNum |
| 21 | Fat_Colour | ✅ | fat_colour | toNum |
| 22 | Mscle_Colour | ✅ | muscle_colour | trimOrNull |
| 23 | Meat_Texture | ✅ | meat_texture | toNum |
| 24 | Meat_Yield | ✅ | meat_yield | toNum |
| 25 | Contract_No | ✅ | contract_no | trimOrNull |
| 26 | Bruising_L | ✅ | bruising_l | trimOrNull |
| 27 | Bruising_R | ✅ | bruising_r | trimOrNull |
| 28 | $/Kg_Deduction | ✅ | deduction_per_kg | toNum |
| 29 | Dockage_Reason | ✅ | dockage_reason | trimOrNull |
| 30 | Live_Weight_Shrink_Pcnt | ✅ | live_weight_shrink_pct | toNum |
| 31 | Marbling_Category | ✅ | marbling_category | trimOrNull |
| 32 | Marbling2 | ✅ | marbling2 | toNum |
| 33 | Ossification | ✅ | ossification | toNum |
| 34 | Firmness | ✅ | firmness | trimOrNull |
| 35 | Pricing_Method | ✅ | pricing_method | trimOrNull |
| 36 | ChillerNumber | ✅ | chiller_number | trimOrNull |
| 37 | Beast_Sale_Type | ✅ | beast_sale_type | toNum |
| 38 | Sold_To_Contact_ID | ✅ | sold_to_contact_id | toFkId |
| 39 | Abattoir_ID | ✅ | abattoir_contact_id | toFkId |
| 40 | Boning_Group | ✅ | boning_group | trimOrNull |
| 41 | Hump_cold | ✅ | hump_cold | toNum |
| 42 | Loin_temp | ✅ | loin_temp | toNum |
| 43 | Carc_damage_L | ✅ | carc_damage_l | trimOrNull |
| 44 | Carc_damage_R | ✅ | carc_damage_r | trimOrNull |
| 45 | MSA_Index | ✅ | msa_index | toNum |
| 46 | Marbling_bonus_rate | ✅ | marbling_bonus_rate | toNum |
| 47 | RCInvoice_Date | ✅ | rc_invoice_date | toDate |
| 48 | Marbling_bonus_value | ✅ | marbling_bonus_value | toNum |
| 49 | Last_Modified_timestamp | ✅ | legacy_modified_at | toDate |
| 50 | Hump_Height | ✅ | hump_height | toNum |
| 51 | MEQMSA | ✅ | meq_msa | toNum |
| 52 | MEQAUSMRB | ✅ | meq_aus_mrb | toNum |
| 53 | Boning_date | ✅ | boning_date | toDate |
| 54 | Abattoir_Establishment_Number | ✅ | abattoir_est_no | trimOrNull |

### 1.16 Autopsy_Records → `autopsy_records` (4 rows — 52 legacy columns)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | SB_Rec_No | ❌ | — | — |
| 2 | Ear_Tag_No | ✅ | ear_tag | trimOrNull |
| 3 | Date_Dead | ✅ | date_dead | toDate |
| 4 | Time_Dead | ✅ | time_dead | trimOrNull |
| 5 | Time_Autopsy | ❌ | — | — |
| 6 | Autopsy_By | ✅ | autopsy_by | trimOrNull |
| 7–49 | (42 anatomical bool fields) | ✅ | findings (JSONB) | toBool each |
| 50 | Notes | ✅ | notes | trimOrNull |
| 51 | Beast_ID | ✅ | cow_id + legacy_beast_id | via cowIdMap |
| 52 | Post_Autopsy_Diag | ✅ | post_autopsy_diag | trimOrNull |
| 53 | Date_Autopsy | ✅ | date_autopsy | toDate |
| — | Pre_Autopsy_Diag | ✅ | pre_autopsy_diag | trimOrNull |

### 1.17 Vendor_Declarations → `vendor_declarations` (2,485 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Vendor_Dec_Number | ✅ | vendor_dec_number | trimOrNull |
| 2 | Owner_Contact_ID | ✅ | owner_contact_id | toFkId |
| 3 | Form_Date | ✅ | form_date | toDate |
| 4 | Number_Cattle | ✅ | number_cattle | toNum |
| 5 | Cattle_Description | ✅ | cattle_description | trimOrNull |
| 6 | Tail_Tag | ✅ | tail_tag | trimOrNull |
| 7 | RFIDs_in_cattle | ✅ | rfids_in_cattle | toBool |
| 8 | HGP_Treated | ✅ | hgp_treated | toBool |
| 9 | QA_program | ✅ | qa_program | toBool |
| 10 | QA_Program_details | ✅ | qa_details | trimOrNull |
| 11 | Born_on_Vend_prop | ✅ | ownership_period | derived |
| 12 | Owned_LT_2months | ✅ | ownership_period | derived |
| 13 | Owned_2_6_months | ✅ | ownership_period | derived |
| 14 | Owned_6_12_months | ✅ | ownership_period | derived |
| 15 | Owned_GT_12_months | ✅ | ownership_period | derived |
| 16 | Fed_stockfeeds | ✅ | fed_stockfeeds | toBool |
| 17 | Chem_Res_restriction | ✅ | chem_restriction | toBool |
| 18 | Withholding_for_drugs | ✅ | withholding_drugs | toBool |
| 19 | Withholding_for_feed | ✅ | withholding_feed | toBool |
| 20 | Endosulfan_exposure | ✅ | endosulfan_exposure | toBool |
| 21 | Endosulfan_Date | ✅ | endosulfan_date | toDate |
| 22 | Additional_info | ✅ | additional_info | trimOrNull |
| 23 | ID | ❌ | — | sequence |
| 24 | Fed_Animal_Fats | ✅ | fed_animal_fats | toBool |

### 1.18 Drugs_Purchased → `drug_purchases` (429 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Receival_ID | ✅ | legacy_receival_id | toNum |
| 2 | DrugID | ✅ | drug_id | toFkId |
| 3 | Quantity_received | ✅ | quantity | toNum |
| 4 | Batch_number | ✅ | batch_number | trimOrNull |
| 5 | Expiry_date | ✅ | expiry_date | toDate |
| 6 | Drug_cost | ✅ | cost | toNum |
| 7 | Applied_to_SOH | ❌ | — | inventory flag |
| 8 | ID | ❌ | — | sequence |

> Note: `Purchase_Date` does NOT exist in the legacy source (confirmed via INFORMATION_SCHEMA).

### 1.19 Drug_Disposal → `drug_disposals` (9 rows)

| # | Legacy Column | Mapped | Target Column | Transform |
|---|---|---|---|---|
| 1 | Disposal_ID | ✅ | legacy_disposal_id | toNum |
| 2 | DrugID | ✅ | drug_id | toFkId |
| 3 | Number_disposed | ✅ | quantity | toNum |
| 4 | Date_disposed | ✅ | disposal_date | toDate |
| 5 | Disposal_reason | ✅ | disposal_reason | trimOrNull |
| 6 | Disposal_method | ✅ | disposal_method | trimOrNull |
| 7 | Disposed_by | ✅ | disposed_by | trimOrNull |
| 8 | Notes | ✅ | notes | trimOrNull |
| 9 | Applied_to_Inventory | ✅ | applied_to_inventory | toBool |

---

## 2. Raw Tables (~100 tables → `legacy_raw` JSONB bulk copy)

All tables below are copied row-by-row into `legacy_raw(source_table, row_data JSONB)`.
Every column from every row is preserved. Queryable via `SELECT row_data->>'column_name'`.

### 2.1 Lookup/Reference (should become structured tables)

| Legacy Table | Rows | Description | Candidate Target |
|---|---|---|---|
| BodySystems | 8 | Disease body system categories | diseases.body_system or new lookup |
| Beast_Cull_Reasons | 15 | Cull reason codes | cull_reasons (exists in schema) |
| Beast_Sale_Types_RV | 14 | Sale type codes | new lookup |
| Sickness_Result_Codes | 3 | Result code descriptions | new lookup |
| Sickness_Result_Codes_RV | 4 | Result code descriptions (alt) | merge w/ above |
| LocationTypes | 4 | Location type codes | location_types (exists in schema) |
| Weighing_Types | 4 | Weigh type descriptions | new lookup or enum |
| Weighing_Types_RV | 12 | Weigh type descriptions (alt) | merge w/ above |
| Purchase_Regions | 4 | Purchase region lookups | new lookup |
| Drug_Category | 20 | Drug category hierarchy | new lookup |
| ContactTypes | 12 | Contact type codes | contacts.type enum |
| SubGroupNames | ? | Sub-group names | new lookup |
| Breeding_Categories | ? | Breeding category codes | new lookup |
| RationNames | 3 | Ration name records | rations (exists in schema) |
| Carcase_Grades | 1 | Carcase grading codes | carcase_grades (exists in schema) |
| Carcase_Grades_US | 5 | US grading codes | merge w/ above |
| ScalesTypes | 28 | Weighing equipment config | excluded (hardware) |
| Cattle_Program_Types | ? | Program type codes | new lookup |

### 2.2 Operational Data (should become structured tables)

| Legacy Table | Rows | Description | Candidate Target |
|---|---|---|---|
| Feedlot_Staff | 44 | Staff/employee records | new `staff` table |
| Treatment_Regimes | 11 | Treatment protocol definitions | treatment_regimes (exists) |
| Chemical_inventory | 550 | Current drug stock records | new `drug_inventory` table |
| Chemical_inventory_old | 252 | Historical drug stock | merge w/ above |
| Drug_Stocktake_records | 987 | Individual stocktake entries | new `drug_stocktakes` table |
| Drug_Stocktakes | 29 | Stocktake event headers | new `drug_stocktake_events` table |
| Drug_HGP_Forms | 51 | HGP declaration forms | new table or JSONB |
| Drugs_Purchase_event | 156 | Purchase event headers | new `drug_purchase_events` table |
| Drug_Transfer_Records | ? | Drug transfers between locations | new `drug_transfers` table |
| Drug_Transfers | ? | Drug transfer headers | merge w/ above |
| Livestock_Weighbridge_Dockets | 224 | Weighbridge records | weighbridge_dockets (exists) |
| KD1_Records | 53 | KD1 compliance records | new table |
| Instrument_Calibration_tests | 48 | Equipment calibration logs | new table |
| Instruments_needing_Calibration | 5 | Calibration schedule | merge w/ above |

### 2.3 Beast Event/History Data (consider structured migration)

| Legacy Table | Rows | Description | Candidate Target |
|---|---|---|---|
| BeastMovement | 181 | Beast movement records | location_changes (exists) |
| CattleProcessed | 1,582 | Processed/inducted cattle | new or cows extension |
| Cattle_Feed_Update | 10,972 | Feed update records | new `feed_updates` table |
| Sick_Beast_Temperature | 3,575 | Temperature monitoring | new `health_temperatures` table |
| Sick_Beast_BRD_Symptoms | ? | BRD symptom records | extend health_records |
| Resp_Disease_ReTreats | ? | Re-treatment records | extend treatments |
| Purch_Lot_Cattle | 40 | Cattle per purchase lot | purchase_lots extension |
| Beast_Breeding | ? | Breeding records | new `breeding_records` table |
| Breeding_Dams | ? | Dam records | new table |
| Breeding_Sires | ? | Sire records | new table |
| Beast_Ohead_Appl_History | ? | Overhead cost application | costs extension |
| Cattle_DOF_and_DIP | ? | Days on feed tracking | derived/view |

### 2.4 Reporting/Snapshot Data

| Legacy Table | Rows | Description | Candidate Target |
|---|---|---|---|
| SOH_by_Month | 24,297 | Monthly stock-on-hand snapshots | new `monthly_snapshots` table |
| PenList_AsAt | 896 | Pen listing snapshots | view or snapshot table |
| CustFeed_Invoices_list | 7,567 | Custom feed invoices | new `feed_invoices` table |
| Pen_mort_morb_list | 527 | Pen morbidity/mortality summary | derived/view |
| Daily_Cattle_Inventory | ? | Daily inventory snapshots | snapshot table |
| Feed_Totals_By_Ration | 168 | Feed consumption by ration | snapshot table |
| Batch_Update_log | 3,370 | Internal batch update logs | audit table |
| User_Log_Ons | 989 | User activity log | audit table |
| Mort_Morb_triggers | 32 | Alert configurations | config table |

### 2.5 Financial/Invoice Data

| Legacy Table | Rows | Description | Candidate Target |
|---|---|---|---|
| Cust_Feed_Charges | ? | Custom feed charge rules | config table |
| Custfeed_Lot_Summary | ? | Custom feed lot summaries | reporting table |
| Monthly_FL_Intake_Cost | ? | Monthly intake costs | reporting table |
| TandR_Buying_details | ? | Trading buying details | reporting table |
| TandR_Costs_Report | ? | Trading costs report | reporting table |
| Purchase_Totals | ? | Purchase summary totals | derived/view |
| PackageCosts | ? | Package cost definitions | config table |
| Monthly_Adjustment_OB | ? | Opening balance adjustments | financial table |
| Monthly_Feedlot_Reconciliation | ? | Feedlot reconciliation | reporting table |

### 2.6 Company/Config Data

| Legacy Table | Rows | Description | Keep as |
|---|---|---|---|
| Company | 1 | Company details | system config |
| Company_Settings | 8 | Application settings | system config |
| Tax_Invoice_Bank_details | 1 | Bank details for invoicing | system config |
| Code_References_Index | ? | Reference code directory | metadata |
| Pen_Rider_Tolerances | ? | Pen rider alert thresholds | config |

---

## 3. Excluded Tables (~50 tables — not migrated)

| Category | Count | Reason |
|---|---|---|
| Per-user session keyfiles | 30 | Ephemeral UI session state |
| UI filter/state tables | 7 | Application filter state |
| Hardware config | 6 | Serial ports, scale types, machine names |
| Temp/staging | 1 | Drugs_Given_temp |
| Graph cache | 2 | Cached graph images |

---

## 4. Summary

| Metric | Count |
|---|---|
| Total legacy tables | 171 |
| Mapped (structured) | 19 |
| Raw (JSONB preserved) | ~100 |
| Excluded (documented) | ~50 |
| **Total legacy columns (mapped tables)** | **~510** |
| **Columns currently mapped** | **196** |
| **Columns unmapped (in mapped tables)** | **~314** |
| New schema columns with matching legacy data but no mapping* | ~35 |

> \* These columns exist in `schema-farm.sql` already (e.g. `contacts.mobile`, `purchase_lots.dpi_charges`) but have no mapping in `mappings.js`. They are the lowest-hanging fruit to wire up.
