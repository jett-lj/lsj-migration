# Column Audit — Full Source → Target Matrix

Every column from every mapped source table is listed below with its target,
transform, and migration status. This is the authoritative manifest for the
column-coverage tests.

## Breeds → breeds
| Source | Target | Transform | Status |
|---|---|---|---|
| Breed_Code | id | direct | ✓ |
| Breed_Name | name | trimOrNull | ✓ |

## FeedDB_Pens_File → pens
| Source | Target | Transform | Status |
|---|---|---|---|
| Pen_name | name | trimOrNull | ✓ |
| IsPaddock | is_paddock | toBool | ✓ |

## Contacts → contacts
| Source | Target | Transform | Status |
|---|---|---|---|
| Contact_ID | id | direct | ✓ |
| Company | company | trimOrNull | ✓ |
| First_Name | first_name | trimOrNull | ✓ |
| Last_Name | last_name | trimOrNull | ✓ |
| Tel_No | phone | trimOrNull | ✓ |
| Email | email | trimOrNull | ✓ |
| Address_1 | address | trimOrNull | ✓ |
| ABN | abn | trimOrNull | ✓ |
| Notes | notes | trimOrNull | ✓ |

## Diseases → diseases
| Source | Target | Transform | Status |
|---|---|---|---|
| Disease_ID | id | direct | ✓ |
| Disease_Name | name | trimOrNull | ✓ |
| Symptoms | symptoms | trimOrNull | ✓ |
| Treatment | treatment | trimOrNull | ✓ |
| No_longer_used | active | !toBool (inverted) | ✓ |

## Drugs → drugs
| Source | Target | Transform | Status |
|---|---|---|---|
| Drug_ID | id | direct | ✓ |
| Drug_Name | name | CASE+trimOrNull (dedup) | ✓ |
| Units | unit | trimOrNull | ✓ |
| Cost_per_unit | cost_per_unit | toNum | ✓ |
| WithHold_days_1 | withhold_days | toNum (nullable) | ✓ |
| WithHold_days_ESI | esi_days | toNum (nullable) | ✓ |
| HGP | is_hgp | toBool | ✓ |
| Antibiotic | is_antibiotic | toBool | ✓ |
| Supplier | supplier | trimOrNull | ✓ |
| Inactive | active | !toBool (inverted) | ✓ |

## Cost_Codes → cost_codes
| Source | Target | Transform | Status |
|---|---|---|---|
| RevExp_Code | code | direct | ✓ |
| RevExp_Desc | description | trimOrNull | ✓ |
| Rev_Exp | type | mapCostType | ✓ |

## Market_Category → market_categories
| Source | Target | Transform | Status |
|---|---|---|---|
| Market_Cat_ID | id | direct | ✓ |
| Market_Category | name | trimOrNull | ✓ |
| Min_DOF | min_dof | toNum | ✓ |
| HGP_Free | hgp_free | toBool | ✓ |

## Purchase_Lots → purchase_lots
| Source | Target | Transform | Status |
|---|---|---|---|
| Lot_Number | lot_number | CASE+trimOrNull | ✓ |
| Purchase_date | purchase_date | toDate | ✓ |
| Vendor_ID | vendor_id | toFkId | ✓ |
| Agent_Code | agent_id | toFkId | ✓ |
| Number_Head | head_count | toNum | ✓ |
| Total_Weight | total_weight_kg | toNum | ✓ |
| Cost_of_Cattle | total_cost | toNum | ✓ |
| Cattle_Freight_Cost | freight_cost | toNum | ✓ |
| Lot_Notes | notes | trimOrNull | ✓ |

## Cattle → cows
| Source | Target | Transform | Status |
|---|---|---|---|
| BeastID | legacy_beast_id | direct | ✓ |
| Ear_Tag | tag_number | trimOrNull | ✓ |
| EID | eid | trimOrNull | ✓ |
| Breed | breed (text) | breeds lookup | ✓ |
| Sex | sex | mapSex | ✓ |
| HGP | hgp | toBool | ✓ |
| Died | (status derivation) | deriveCowStatus | ✓ INTENTIONAL |
| DOB | dob | toDate | ✓ |
| Start_Date | start_date | toDate | ✓ |
| Start_Weight | start_weight_kg | toNum | ✓ |
| Sale_Date | sale_date | toDate | ✓ |
| Sale_Weight | sale_weight_kg | toNum | ✓ |
| Feedlot_Entry_Date | entry_date | toDate | ✓ |
| Feedlot_Entry_Wght | entry_weight_kg | toNum | ✓ |
| Pen_Number | pen_id | penIdMap | ✓ |
| Notes | notes | trimOrNull | ✓ |
| Purch_Lot_No | purchase_lot_id | purchLotIdMap | ✓ |
| Date_Archived | (status derivation) | deriveCowStatus | ✓ INTENTIONAL |

## Weighing_Events → weighing_events
| Source | Target | Transform | Status |
|---|---|---|---|
| BeastID | cow_id | cowIdMap | ✓ |
| Weighing_Type | weigh_type | mapWeighType | ✓ |
| Weigh_date | weighed_at | toDate \|\| '1900-01-01' | ✓ (sentinel) |
| Weight | weight_kg | toNum (nullable) | ✓ |
| P8_Fat | p8_fat | toNum | ✓ |
| Weigh_Note | notes | trimOrNull | ✓ |

## PensHistory → pen_movements
| Source | Target | Transform | Status |
|---|---|---|---|
| BeastID | cow_id | cowIdMap | ✓ |
| MoveDate | moved_at | toDate \|\| '1900-01-01' | ✓ (sentinel) |
| Pen | pen_id | penIdMap (auto-create) | ✓ |

## Drugs_Given → treatments
| Source | Target | Transform | Status |
|---|---|---|---|
| BeastID | cow_id | cowIdMap | ✓ |
| Drug_ID | drug_id | toFkId | ✓ |
| Units_Given | dose | toNum | ✓ |
| Date_Given | administered_at | toDate \|\| '1900-01-01' | ✓ (sentinel) |
| Withold_Until | withhold_until | toDate | ✓ |
| SB_Rec_No | health_record_id | sbRecNoMap | ✓ |
| User_Initials | administered_by | trimOrNull | ✓ |

## Costs → costs
| Source | Target | Transform | Status |
|---|---|---|---|
| BeastID | cow_id | cowIdMap | ✓ |
| RevExp_Code | cost_code_id | costCodeMap | ✓ |
| Trans_Date | trans_date | toDate | ✓ |
| Rev_Exp_per_Unit | unit_cost | toNum | ✓ |
| Units | units | toNum | ✓ |
| Extended_RevExp | amount | toNum | ✓ |

## Sick_Beast_Records → health_records
| Source | Target | Transform | Status |
|---|---|---|---|
| Beast_ID | cow_id | cowIdMap | ✓ |
| Date_Diagnosed | date | toDate | ✓ |
| Disease_ID | disease_id | toFkId | ✓ |
| Diagnosed_By | vet_name | trimOrNull | ✓ |
| Sick_Beast_Notes | description | trimOrNull \|\| fallback | ✓ |
| Date_Recovered_Died | date_recovered | toDate | ✓ |
| Result_Code | result_code | trimOrNull | ✓ |
| Ear_Tag_No | — | — | DROPPED (tag already on cow) |

## Carcase_data → carcase_data
| Source | Target | Transform | Status |
|---|---|---|---|
| Beast_ID | cow_id + legacy_beast_id | cowIdMap | ✓ |
| Ear_Tag_No | ear_tag | trimOrNull | ✓ |
| EID | eid | trimOrNull | ✓ |
| Sold_To | sold_to | trimOrNull | ✓ |
| Abattoir | abattoir | trimOrNull | ✓ |
| Body_Number | body_number | trimOrNull | ✓ |
| Kill_Date | kill_date | toDate | ✓ |
| Carc_Wght_left | carc_weight_left | toNum | ✓ |
| Carc_Wght_right | carc_weight_right | toNum | ✓ |
| Dress_Pcnt | dress_pct | toNum | ✓ |
| Teeth | teeth | toNum | ✓ |
| Grade | grade | trimOrNull | ✓ |
| Price_$/Kg_Left | price_per_kg_left | toNum | ✓ |
| Price_$/Kg_Right | price_per_kg_right | toNum | ✓ |
| P8_fat | p8_fat | toNum | ✓ |
| Rib_fat | rib_fat | toNum | ✓ |
| Mscle_Score | muscle_score | trimOrNull | ✓ |
| Eye_Mscle_Area | eye_muscle_area | toNum | ✓ |
| PH_level | ph_level | toNum | ✓ |
| Marbling | marbling | toNum | ✓ |
| Fat_Colour | fat_colour | toNum | ✓ |
| Mscle_Colour | muscle_colour | trimOrNull | ✓ |
| Meat_Texture | meat_texture | toNum | ✓ |
| Meat_Yield | meat_yield | toNum | ✓ |
| Contract_No | contract_no | trimOrNull | ✓ |
| Bruising_L | bruising_l | trimOrNull | ✓ |
| Bruising_R | bruising_r | trimOrNull | ✓ |
| $/Kg_Deduction | deduction_per_kg | toNum | ✓ |
| Dockage_Reason | dockage_reason | trimOrNull | ✓ |
| Live_Weight_Shrink_Pcnt | live_weight_shrink_pct | toNum | ✓ |
| Ossification | ossification | toNum | ✓ |
| MSA_Index | msa_index | toNum | ✓ |
| Hump_cold | hump_cold | toNum | ✓ |
| Boning_Group | boning_group | trimOrNull | ✓ |
| Beast_Sale_Type | beast_sale_type | toNum | ✓ |
| Boning_date | boning_date | toDate | ✓ |

## Autopsy_Records → autopsy_records
| Source | Target | Transform | Status |
|---|---|---|---|
| Beast_ID | cow_id + legacy_beast_id | cowIdMap | ✓ |
| Ear_Tag_No | ear_tag | trimOrNull | ✓ |
| Date_Dead | date_dead | toDate | ✓ |
| Time_Dead | time_dead | trimOrNull | ✓ |
| Date_Autopsy | date_autopsy | toDate | ✓ |
| Autopsy_By | autopsy_by | trimOrNull | ✓ |
| Pre_Autopsy_Diag | pre_autopsy_diag | trimOrNull | ✓ |
| Post_Autopsy_Diag | post_autopsy_diag | trimOrNull | ✓ |
| Notes | notes | trimOrNull | ✓ |
| (43 bool fields) | findings | JSONB pack | ✓ (restructured) |

## Vendor_Declarations → vendor_declarations
| Source | Target | Transform | Status |
|---|---|---|---|
| Vendor_Dec_Number | vendor_dec_number | trimOrNull | ✓ |
| Owner_Contact_ID | owner_contact_id | toFkId | ✓ |
| Form_Date | form_date | toDate | ✓ |
| Number_Cattle | number_cattle | toNum | ✓ |
| Cattle_Description | cattle_description | trimOrNull | ✓ |
| Tail_Tag | tail_tag | trimOrNull | ✓ |
| RFIDs_in_cattle | rfids_in_cattle | toBool | ✓ |
| HGP_Treated | hgp_treated | toBool | ✓ |
| QA_program | qa_program | toBool | ✓ |
| QA_Program_details | qa_details | trimOrNull | ✓ |
| Fed_stockfeeds | fed_stockfeeds | toBool | ✓ |
| Chem_Res_restriction | chem_restriction | toBool | ✓ |
| Withholding_for_drugs | withholding_drugs | toBool | ✓ |
| Withholding_for_feed | withholding_feed | toBool | ✓ |
| Additional_info | additional_info | trimOrNull | ✓ |
| Born_on_Vend_prop | ownership_period | priority bool→text | ✓ (lossy) |
| Owned_LT_2months | ownership_period | priority bool→text | ✓ (lossy) |
| Owned_2_6_months | ownership_period | priority bool→text | ✓ (lossy) |
| Owned_6_12_months | ownership_period | priority bool→text | ✓ (lossy) |
| Owned_GT_12_months | ownership_period | priority bool→text | ✓ (lossy) |

## Location_Changes → location_changes
| Source | Target | Transform | Status |
|---|---|---|---|
| BeastID | cow_id + legacy_beast_id | cowIdMap | ✓ |
| Ear_Tag | ear_tag | trimOrNull | ✓ |
| EID | eid | trimOrNull | ✓ |
| Movement_Date | movement_date | toDate | ✓ |
| From_location | from_location | trimOrNull | ✓ |
| To_Location | to_location | trimOrNull | ✓ |
| New_animal | is_new_animal | toBool | ✓ |
| Slaughtered | is_slaughtered | toBool | ✓ |

## Drugs_Purchased → drug_purchases
| Source | Target | Transform | Status |
|---|---|---|---|
| DrugID | drug_id | toFkId | ✓ |
| Quantity_received | quantity | toNum | ✓ |
| *(no source column — NULL)* | purchase_date | toDate | ⚠ Purchase_Date does not exist in source; mapped as NULL |
| Batch_number | batch_number | trimOrNull | ✓ |
| Expiry_date | expiry_date | toDate | ✓ |
| Drug_cost | cost | toNum | ✓ |

Actual source columns: `Receival_ID`, `DrugID`, `Quantity_received`, `Batch_number`, `Expiry_date`, `Drug_cost`, `Applied_to_SOH`, `ID`

## Drug_Disposal → drug_disposals
| Source | Target | Transform | Status |
|---|---|---|---|
| DrugID | drug_id | toFkId | ✓ |
| Number_disposed | quantity | toNum | ✓ |
| Date_disposed | disposal_date | toDate | ✓ |
| Disposal_reason | disposal_reason | trimOrNull | ✓ |
| Disposal_method | disposal_method | trimOrNull | ✓ |
| Disposed_by | disposed_by | trimOrNull | ✓ |
| Notes | notes | trimOrNull | ✓ |
