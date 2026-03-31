/**
 * Column-coverage test suite â€” 5 layers of verification.
 *
 * Layer 1: Static manifest audit (every column in column-audit.md â†” mappings.js)
 * Layer 2: Golden-row integration (one row per table, all columns non-null)
 * Layer 3: Numeric precision & edge cases
 * Layer 4: FK chain end-to-end
 * Layer 5: Self-checks (row counts, cross-checks, idempotency)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs   = require('fs');
const path = require('path');
const pg   = require('pg');
const { Pool } = pg;
pg.types.setTypeParser(1700, parseFloat);   // NUMERIC → JS number

const {
  toBool, trimOrNull, toDate, toNum, toFkId,
  mapSex, deriveCowStatus, mapWeighType, mapCostType,
  mappings,
} = require('../mappings');

const {
  runMigration, migrateTable, processBatch,
  buildLookup, buildCowIdMap, createLogger,
} = require('../runner');

// â”€â”€ Test helpers 

const TEST_DB = 'lsj_column_coverage_test';
const FARM_SCHEMA = path.join(__dirname, '..', 'schema-farm.sql');

function adminPool() {
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres',
    max: 1,
  });
}

function testPool() {
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: TEST_DB,
    max: 5,
  });
}

function createMockMssql(tables) {
  const sortedKeys = Object.keys(tables).sort((a, b) => b.length - a.length);

  // Use regex with boundary check to avoid 'dbo.Cattle' matching 'dbo.Cattle_Program_Types'
  // Handles both dbo.Table and [dbo].[Table] formats
  function findTable(sql) {
    for (const tableName of sortedKeys) {
      const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\[?dbo\\]?\\.\\[?${escaped}\\]?(?![a-zA-Z0-9_])`);
      if (re.test(sql)) {
        return tableName;
      }
    }
    return null;
  }

  return {
    request() {
      return {
        async query(sql) {
          if (/SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(sql)) {
            const tbl = findTable(sql);
            if (tbl) return { recordset: [{ cnt: tables[tbl].length }] };
            return { recordset: [{ cnt: 0 }] };
          }
          const offsetMatch = sql.match(/OFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY/i);
          const tbl = findTable(sql);
          if (tbl) {
            let rows = tables[tbl];
            if (offsetMatch) {
              const offset = parseInt(offsetMatch[1]);
              const limit  = parseInt(offsetMatch[2]);
              rows = rows.slice(offset, offset + limit);
            }
            return { recordset: rows };
          }
          return { recordset: [] };
        },
      };
    },
    async close() {},
  };
}

let pgPool;

beforeAll(async () => {
  const admin = adminPool();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await admin.end();
  }
  pgPool = testPool();
  const schema = fs.readFileSync(FARM_SCHEMA, 'utf8');
  await pgPool.query(schema);
}, 30000);

afterAll(async () => {
  if (pgPool) await pgPool.end();
  const admin = adminPool();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  } finally {
    await admin.end();
  }
});

// â”€â”€ Manifest: expected columns per source table â”€â”€â”€â”€â”€â”€

const MANIFEST = {
  Breeds: ['Breed_Code', 'Breed_Name'],
  FeedDB_Pens_File: ['Pen_name', 'IsPaddock', 'Include_in_Pen_List', 'Current_exit_pen'],
  Contacts: [
    'Contact_ID',
    'Company',
    'First_Name',
    'Last_Name',
    'Salutation',
    'Address_1',
    'Address_2',
    'City',
    'State',
    'PostCode',
    'Tel_No',
    'Mobile_No',
    'Fax_No',
    'Email',
    'Contact_Type',
    'Tail_Tag_No',
    'Brand',
    'Notes',
    'ABN',
    'Bank_BSB',
    'Bank_AC',
    'Days_invoice_due',
    'Agistment_Paddock_Rate',
    'Agistment_Feedlot_Rate',
    'Invoice_careof',
    'brand_drawing_filename',
    'Abattoir_Establishment_Number',
    'Last_Modified_timestamp',
  ],
  Diseases: [
    'Disease_ID',
    'Disease_Name',
    'Symptoms',
    'Treatment',
    'No_longer_used',
    'Recoverable',
    'BodySystemID',
    'PenApp_Disease_name',
    'Autopsy_disease',
  ],
  Drugs: [
    'Drug_ID',
    'Drug_Name',
    'Units',
    'Cost_per_unit',
    'WithHold_days_1',
    'WithHold_days_ESI',
    'WithHold_days_3',
    'WithHold_days_4',
    'HGP',
    'Antibiotic',
    'Supplier',
    'Inactive',
    'Notes',
    'Drug_Category',
    'Admin_units',
    'Admin_weight_Factor',
    'Current_Batch_Numb',
    'Cost_per_Unit_CF',
    'Chemical_Mg_per_Ml',
    'Reorder_SOH_units_trigger',
    'Units_per_BoxOrBottle',
    'Units_on_hand',
    'Last_Modified_timestamp',
  ],
  Cost_Codes: [
    'RevExp_Code',
    'RevExp_Desc',
    'Rev_Exp',
    'Include_in_Landed_Cost',
    'Include_in_PL_expenses',
    'Include_on_CF_Invoice',
  ],
  Market_Category: [
    'Market_Cat_ID',
    'Market_Category',
    'Min_DOF',
    'HGP_Free',
    'Predicted_dressing_pcnt',
    'Dispatch_Notes',
  ],
  Beast_Cull_Reasons: [
    'Cull_Reason_ID',
    'Cull_Reason',
    'PayRate_per_Kg',
    'Induction_cull',
    'Later_cull',
  ],
  Beast_Sale_Types_RV: ['Sale_Type_ID', 'Sale_Type'],
  BodySystems: ['BS_ID', 'BodySystem'],
  Breeding_Categories: ['Breed_Category_ID', 'Breed_Category', 'Breed_Category_Desc'],
  Carcase_Grades: ['Grade_Code', 'Description', 'Price_doll_per_Kg', 'Effective_from_date'],
  Carcase_Grades_US: [
    'Qual_Grade',
    'YG1_price',
    'YG2_price',
    'YG3_price',
    'YG4_price',
    'YG5_price',
    'From_Date',
  ],
  Cattle_Program_Types: ['Program_ID', 'Program_Code', 'DOF', 'Program_Description'],
  Code_References_Index: [
    'Database_Table',
    'Field_Name',
    'Lookup_Table_Name',
    'LUT_Descriptive_FieldName',
    'LUT_Code_FieldName',
  ],
  ContactTypes: ['Contact_Type_ID', 'Contact_Type', 'Description'],
  Drug_Category: ['Drug_Category', 'Category_Description'],
  Feed_Commodity_names: ['Commodity_Code', 'Commodity_Name'],
  Grower_Groups: ['GrowerGroup_Code', 'GrowerGroup_Name'],
  LocationTypes: ['Loc_Type_code', 'Location_Type'],
  Purchase_Regions: ['Region_ID', 'Region_name'],
  RationNames: ['Ration_name', 'ValuePerTon', 'Notes', 'Custom_feed_charge_ton'],
  Sickness_Result_Codes: ['Sickness_Result_Code', 'Sickness_Result'],
  Sickness_Result_Codes_RV: ['Sickness_Result_Code', 'Sickness_Result'],
  Sire_Lines: ['Sire_Line_ID', 'Sire_Line'],
  SubGroupNames: ['Sub_Group'],
  Weighing_Types: ['Weighing_Type', 'Weighing_Desc'],
  Weighing_Types_RV: ['Weighing_Type_ID', 'Weighing_Type'],
  Cattle_Specs: [
    'Intake Fat From',
    'Intake Fat To',
    'Intake Wght From',
    'Intake Wght To',
    'Intake Teeth From',
    'Intake Teeth To',
    'Sale Wght From',
    'Sale Wght To',
    'WG per Day From',
    'WG per Day To',
    'Dressing % From',
    'Dressing % To',
    'Marbling>=',
    'Carc P8 From',
    'Carc P8 To',
    'EMA From',
    'EMA To',
    'Fat Colour From',
    'Fat Colour To',
    'Meat Colour From',
    'Meat Colour To',
    'Paddock WG From',
    'Paddock WG To',
    'DOF From',
    'DOF To',
  ],
  Company: [
    'Company Name',
    'Weight_Units',
    'Key',
    'UserTailTag',
    'RFID_Space_Removed',
    'Apply_Feed_As_DM_Kgs',
    'CurrentNumberUsers',
    'Data_Collector_Scales_Type',
    'Scales_File_Folder',
    'Units_per_Ton',
    'Date_DB_Last_Updated',
    'Last_Ohead_Application',
    'V11_Database',
    'DFLT_WG_Per_day',
    'NSA_Cust_ID',
    'NSA_Email',
    'NSA_Client',
    'User_logon',
    'Digistar_datalink',
    'Padd_Tail_Tag',
    'Date_Last_FeedTrans_Compression',
    'Digistar_datakey',
    'password_complexity',
    'ABN',
    'ACN',
    'Address',
    'Phone',
    'Fax',
    'Email',
    'Logo',
    'titration_feeding',
  ],
  Company_Settings: [
    'ModuleName',
    'SettingName',
    'SettingValue',
    'DateCreated',
    'DateModified',
  ],
  Cust_Feed_Charges: [
    'Purch_Lot_No',
    'Ration',
    'SumOfUnits',
    'AvgOfCustom_Feed_Charge_Ton',
    'Feed_Charge',
  ],
  Feedlot_Staff: [
    'User_ID',
    'Surname',
    'FirstName',
    'Job_Desc',
    'Start_date',
    'Finish_Date',
    'Pass_word',
    'Cattle_Data_Entry',
    'Cattle_Reports',
    'Cattle_Utilities',
    'Cattle_Lookup_Tables',
    'Feed_system_Data_Entry',
    'Feed_system_reports',
    'Feed_system_utilities',
    'PL_Reports_Allowed',
    'Pen_Rider',
    'Cattle_Deletes',
    'Password_Last_Changed_Date',
  ],
  Mort_Morb_triggers: [
    'TableName',
    'COF_From',
    'COF_To',
    'Pulls_actual',
    'Deaths_actual',
    'Level1_Pulls_trigger',
    'Level1_Deaths_trigger',
    'Level2_Deaths_trigger',
    'Level3_Deaths_trigger',
    'Include_in_report',
  ],
  PackageCosts: [
    'CountryCode',
    'BasicPackage',
    'PricePerThousandHead',
    'BasicFeeding',
    'VetRecords',
    'VetReporting',
    'CrushSideProc',
    'FeedCommodsSystem',
    'PriceAsAtDate',
  ],
  Pen_Rider_Tolerances: [
    'Pulls_LE_45_dof_from',
    'Pulls_LE_45_dof_to',
    'Pulls_46_120_dof_from',
    'Pulls_46_120_dof_to',
    'Pulls_121_200_dof_from',
    'Pulls_121_200_dof_to',
    'Pulls_GT_200_dof_from',
    'Pulls_GT_200_dof_to',
    'Pulls_total_from',
    'Pulls_totals_to',
    'Treat_success_pcnt_LT_45_dof_from',
    'Treat_success_pcnt_LT_45_dof_to',
    'Treat_success_pcnt_46_120_dof_from',
    'Treat_success_pcnt_46_120_dof_to',
    'Treat_success_pcnt_121_200_dof_from',
    'Treat_success_pcnt_121_200_dof_to',
    'Treat_success_pcnt_GT_200_dof_from',
    'Treat_success_pcnt_GT_200_dof_to',
    'Treat_success_totals_from',
    'Treat_success_totals_to',
    'Death_alloc_LE_45_dof_from',
    'Death_alloc_LE_45_dof_to',
    'Death_alloc_46_120_dof_from',
    'Death_alloc_46_120_dof_to',
    'Death_alloc_121_200_dof_from',
    'Death_alloc_121_200_dof_to',
    'Death_alloc_GT_200_dof_from',
    'Death_alloc_GT_200_dof_to',
    'Death_alloc_total_from',
    'Death_alloc_total_to',
  ],
  Price_adjustment_by_weight_range: [
    'Lot_Number',
    'Weight_from',
    'Weight_to',
    'Head',
    'Dollars_per_Kg_adjustment',
    'Applied_to_Cattle_pricing',
  ],
  RV_Scheduled_DOF: ['DOF'],
  Tax_Invoice_Bank_details: [
    'Company_name',
    'Address',
    'Telephone',
    'Fax_number',
    'ABN',
    'Bank_AC_name',
    'Bank_name',
    'Bank_BSB',
    'Bank_AC_number',
    'GST_rate',
    'Default_Days_Invoice_Due',
    'Account_Code',
  ],
  Purchase_Lots: [
    'Lot_Number',
    'Purchase_date',
    'Vendor_ID',
    'Agent_Code',
    'Agent',
    'Number_Head',
    'Total_Weight',
    'Cost_of_Cattle',
    'Cattle_Freight_Cost',
    'Lot_Notes',
    'WBridge_Docket',
    'DPI_Charges',
    'Destination',
    'Agistor_Code',
    'Cattle_Invoice_No',
    'Invoice_Amount',
    'Date_Cattle_Inv_Approved',
    'Carrier',
    'Freight_Invoice_No',
    'Date_Frght_Inv_Approved',
    'Buyer_Commiss_per_Head',
    'Buying_Fee',
    'Other_Buying_Costs',
    'Buyer',
    'Purchase_Region',
    'Risk_factor',
    'Custom_Feed_Lot',
    'Feed_Charge_per_Ton',
    'Cattle_Owner_ID',
    'Agist_Rate_per_day',
    'Weigh_bridge_weight',
    'Market_Category',
    'Weighbridge_Charges',
    'Is_Financed',
    'Finance_Rate',
    'GrowerGroupCode',
    'Applied_To_Cattle_File',
    'NVD_scan_filename',
    'Weigh_ticket_scan_filename',
    'Optional_scan_filename1',
    'Optional_scan_filename2',
    'Marbling_bonus_lot',
    'Last_Modified_timestamp',
  ],
  // Carcase_DataType2: excluded — 0 rows, unused alternative carcase schema
  Carcase_import_Data: [
    'Col1',
    'Col2',
    'Col3',
    'Col4',
    'Col5',
    'Col6',
    'Col7',
    'Col8',
    'Col9',
    'Col10',
    'Col11',
    'Col12',
    'Col13',
    'Col14',
    'Col15',
    'Col16',
    'Col17',
    'Col18',
    'Col19',
    'Col20',
    'Col21',
    'Col22',
    'Col23',
    'Col24',
    'Col25',
    'Warning',
    'Error',
    'Import_Date',
    'Session_ID',
  ],
  Carcase_Prices: [
    'Sold_To_ID',
    'Kill_Date_From',
    'Kill_Date_To',
    'Marbling_From',
    'Marbling_To',
    'Meat_Colour_From',
    'Meat_Colour_To',
    'Price_per_Kg',
    'Live_or_carc_Wght',
  ],
  Chemical_inventory: [
    'Chemical_Drug_ID',
    'Purchase_Date',
    'Purchase_Quantity',
    'Units',
    'Supplier',
    'Batch_Number',
    'ExpiryDate',
    'Disposal_Comment',
    'Stocktake_date',
    'Stocktake_Qty',
    'Disposal_date',
    'Disposal_Qty',
    'Invoice_Amount',
    'Invoice_Paid',
  ],
  Chemical_inventory_old: [
    'Chemical_Drug_ID',
    'Purchase_Date',
    'Purchase_Quantity',
    'Units',
    'Supplier',
    'Batch_Number',
    'ExpiryDate',
    'Disposal_Comment',
    'Stocktake_date',
    'Stocktake_Qty',
  ],
  Drug_HGP_Forms: ['Drug_Receival_ID', 'HGP_Decl_Form_filename'],
  Drug_Stocktake_records: [
    'Stocktake_ID',
    'DrugID',
    'Units_per_BoxOrBottle',
    'On_hand_theoritical',
    'Counted',
    'Diffrence',
    'Reorder_SOH_units_trigger',
    'Applied_to_SOH',
    'BoxBottles_OnHand',
  ],
  Drug_Stocktakes: [
    'Stocktake_ID',
    'Stock_Date',
    'Done_By',
    'Notes',
    'Applied_to_inventory',
  ],
  Drug_Transfer_Records: [
    'Transfer_ID',
    'DrugID',
    'Units_per_BoxOrBottle',
    'On_hand_theoretical',
    'Transferred',
    'Remaining',
    'Reorder_SOH_units_trigger',
    'Applied_to_SOH',
    'BoxBottles_OnHand',
  ],
  Drug_Transfers: [
    'Transfer_ID',
    'Transfer_Date',
    'Transfer_Location',
    'Done_By',
    'Notes',
    'Applied_to_inventory',
  ],
  Drugs_Purchase_event: [
    'Drug_Receival_ID',
    'Date_received',
    'Supplier_ID',
    'Order_ref_number',
    'Received_by',
    'Invoice_paid',
    'Notes',
    'Applied_to_Inventory',
    'HGP_form_done',
  ],
  Instrument_Calibration_tests: [
    'Instrument_name',
    'Test_date',
    'Testing_method',
    'Tester_name',
    'Test_Notes',
    'Data_applied_to_instruments',
  ],
  Instruments_needing_Calibration: [
    'Instrument_name',
    'Testing_Frequency',
    'Date_last_tested',
    'Testing_method',
    'Inactive',
  ],
  KD1_Records: [
    'Ear_Tag',
    'Weight',
    'Hash',
    'IDENT',
    'EID',
    'Error_Mess',
    'Group',
    'Teeth',
    'Weigh_Note',
    'Sex',
    'Pen_Number',
    'P8_Fat',
    'Add_or_Update',
    'Supplier_EarTag',
    'Rudd800_Traits',
    'Lot_Number',
  ],
  Livestock_Weighbridge_Dockets: [
    'DocketID',
    'Docket_Number',
    'Docket_Type',
    'Docket_Date',
    'Docket_Time',
    'Exit_Date',
    'Exit_Time',
    'WeighpersonID',
    'CarrierID',
    'Driver_Name',
    'Vehicle_Rego',
    'Origin_DestinationID',
    'Description',
    'NVD_No',
    'Purch_Lot_No',
    'Head_Count',
    'Animal_Welfare',
    'WeighUnits',
    'Gross_Weight',
    'Tare_Weight',
    'Shrink_Percent',
    'Notes',
  ],
  Treatment_Regimes: [
    'DiseaseID',
    'Day_Numb',
    'Drug_Name',
    'Dose',
    'DoseByWeight',
    'Drug_ID',
    'UserID',
  ],
  Trial_Description: [
    'Trial_No',
    'Name',
    'Purpose',
    'Description',
    'Start_Date',
    'End_Date',
    'Total_Head',
    'Results',
  ],
  Cattle: [
    'BeastID',
    'Ear_Tag',
    'EID',
    'Sex',
    'HGP',
    'Feedlot_Entry_Date',
    'Feedlot_Entry_Wght',
    'Sale_Date',
    'Sale_Weight',
    'DOB',
    'Start_Date',
    'Start_Weight',
    'Notes',
    'Purch_Lot_No',
    'Tail_Tag',
    'Vendor_Ear_Tag',
    'Group_Name',
    'Sub_Group',
    'Background_Doll_per_Kg',
    'BG_Fee',
    'Teeth',
    'WHold_Until',
    'Date_died',
    'Sire_Tag',
    'Dam_Tag',
    'Off_Feed',
    'In_Hospital',
    'Buller',
    'Non_Performer',
    'Frame_Size',
    'Custom_Feeder',
    'DOF_in_prev_FL',
    'Market_Category',
    'Cull_Reason',
    'Agist_Lot_No',
    'Current_LocType_ID',
    'Old_RFID',
    'Date_RFID_Changed',
    'Trial_No_ID',
    'NFAS_Decl_Numb',
    'GrowerGroupCode',
    'Date_culled',
    'Agistment_PIC',
    'Blood_vial_number',
    'AP_Lot',
    'LifeTime_Traceable',
    'Pregnant',
    'Planned_kill_date',
    'Beast_Sale_Type_ID',
    'ESI_Whold_until',
    'PregTested',
    'CustomFeedOwnerID',
    'Species',
    'NLIS_tag_fail_at_induction',
    'DNA_or_Blood_Number',
    'DOF_scheduled',
    'EU',
    'EU_Dec_No',
    'Paddock_Tag',
    'Outgoing_NVD',
    'Agisted_animal',
    'VendorID',
    'AgentID',
    'Bovilus_Shots',
    'Program_ID',
    'Abattoir_Culled',
    'Abattoir_Condemned',
    'Lot_closeout_date',
    'Vendor_Treated_Bovilus',
    'Agist_Charged_Up_To_Date',
    'last_oracle_costs',
    'last_oracle_date',
    'Marbling_bonus_lot',
    'Last_Modified_timestamp',
  ],
  Sick_Beast_Records: [
    'Beast_ID',
    'Date_Diagnosed',
    'Diagnosed_By',
    'Sick_Beast_Notes',
    'Disease_ID',
    'Date_Recovered_Died',
    'Result_Code',
    'SB_Rec_No',
    'Ear_Tag_No',
    'Severity_Level',
    'WHold_Until',
    'Date_to_sick_Pen',
    'Sick_Pen_Number',
    'Date_Back_To_Pen',
    'Back_To_Pen_Number',
    'Hosp_Tag_Number',
    'RatType',
    'Pen_Where_Found_Sick',
    'Euthanased',
    'Too_Far_Gone',
    'Insurance_Claim',
    'Insurance_value',
    'Insurance_paid',
    'DOF_when_sick',
    'Diagnoser_Empl_ID',
    'User_Initials',
    'CustomFeedOwnerID',
    'Purch_Lot_No',
    'Cause_of_Death',
    'Autopsied',
    'Last_Modified_timestamp',
  ],
  Weighing_Events: [
    'BeastID',
    'Weighing_Type',
    'Weigh_date',
    'Weight',
    'P8_Fat',
    'Weigh_Note',
    'Ear_Tag',
    'Days_Owned',
    'TimeWeighed',
    'Agistor_ID',
    'BE_Agist_Lot_No',
    'Cull_Reason_ID',
    'Beast_Sale_Type_ID',
    'To_Locn_Type_ID',
    'User_Initials',
    'Last_Modified_timestamp',
  ],
  PensHistory: ['BeastID', 'MoveDate', 'Pen', 'Last_Modified_timestamp'],
  Drugs_Given: [
    'BeastID',
    'Drug_ID',
    'Units_Given',
    'Date_Given',
    'Withold_Until',
    'SB_Rec_No',
    'User_Initials',
    'Ear_Tag_No',
    'Batch_No',
    'Time_Given',
    'Drug_Cost',
    'Date_next_Dose',
    'WithHold_date_ESI',
    'Where_given',
    'Last_Modified_timestamp',
  ],
  Costs: [
    'BeastID',
    'RevExp_Code',
    'Trans_Date',
    'Rev_Exp_per_Unit',
    'Units',
    'Extended_RevExp',
    'Ear_Tag',
    'Ration',
    'Last_Modified_timestamp',
  ],
  Agistment_Transfer_Register: [
    'Movement_Date',
    'Agist_Lot_No',
    'Agistor_Code',
    'Numb_Head',
    'Numb_Died',
    'WBridge_Docket',
    'Return_Wght',
    'Weight_cattle_Sent',
    'Agist_Weight_Gain',
    'WeightGain_$perKg',
    'Inv_Number',
    'Inv_Amount',
    'Agist_Inv_Approved',
    'Carrier',
    'Carrier_Inv_No',
    'Freight_Amount',
    'Frght_Inv_Approved',
    'Applied_To_Cattle_File',
    'Notes',
    'Agistor_TailTag',
    'Vendor_Decl_Numb',
    'Custom_FL_Returns',
  ],
  Beast_Accumed_Feed_by_commodity: [
    'BeastID',
    'Commodity_Code',
    'Accumed_Kgs',
    'Accumed_Cost',
    'Accumed_CustFeed_charge',
    'Date_last_updated',
  ],
  Beast_Breeding: [
    'Beast_ID',
    'Birth_Date',
    'Birth_Wght',
    'Sire',
    'Dam',
    'Genetics',
    'Notes',
  ],
  Beast_Ohead_Appl_History: [
    'Ohead_Appl_Month_End_Date',
    'Ohead_$/Hd/Day',
    'Ohead_Gross_Value',
    'Ohead_Head',
    'Ohead_$/Hd/Day_Pen1',
    'Ohead_Gross_Value_Pen1',
    'Ohead_Head_Pen1',
    'Ohead_$/Hd/Day_Pen2',
    'Ohead_Gross_Value_Pen2',
    'Ohead_Head_Pen2',
    'Ohead_$/Hd/Day_Pen3',
    'Ohead_Gross_Value_Pen3',
    'Ohead_Head_Pen3',
    'Ohead_$/Hd/Day_Pen4',
    'Ohead_Gross_Value_Pen4',
    'Ohead_Head_Pen4',
    'Ohead_$/Hd/Day_Pen5',
    'Ohead_Gross_Value_Pen5',
    'Ohead_Head_Pen5',
    'Ohead_$/Hd/Day_Oth',
    'Ohead_Gross_Value_Oth',
    'Ohead_Head_Oth',
  ],
  BeastMovement: ['BeastID', 'MoveDate'],
  Breeding_Dams: ['Dam_ID', 'Dam_Name', 'Dam_Supplier'],
  Breeding_Sires: [
    'Sire_ID',
    'Sire_Name',
    'Sire_Supplier',
    'Sire_Line_ID',
    'AWA_Sire_ID',
  ],
  Cattle_DOF_and_DIP: ['BeastID', 'DOF', 'DIP', 'Date_Calculated'],
  Cattle_Feed_Update: [
    'Pen_Number',
    'Feed_Date',
    'Head',
    'Dollars_Applied',
    'Kgs_Feed_As_Fed',
    'Ration_Name',
    'Head_Expected',
    'Dollars_not_Applied',
    'Kgs_Not_Applied',
    'EstCurrWght',
    'DateApplied',
    'Run_Number',
  ],
  Cattle_Photos: ['BeastID', 'Ear_Tag', 'Photo', 'DateLastUpdated'],
  CattleProcessed: ['BeastID', 'WeighDate', 'DraftGate', 'SavedDate'],
  ContactsContactTypes: ['Contact_ID', 'Contact_Type_ID'],
  New_cattle_records_Log: [
    'BeastID',
    'Date_record_added',
    'Mod_ule',
    'Proceedure_Name',
    'User_Number',
    'EarTag',
    'EID',
  ],
  Paddock_Feeding: [
    'BeastID',
    'Paddock_Feed_Type',
    'From_Date',
    'To_Date',
    'Commodity_ID',
  ],
  Pen_Data_From_FeedDB: [
    'Pen_Number_ID',
    'Pen_Name',
    'Mob_Name',
    'Numb_Head',
    'Ration_Name',
  ],
  Pending_Feed_Data: [
    'Feed_date',
    'PenName',
    'Head',
    'RationName',
    'Feed_Weight',
    'PenFeeds_RecID',
    'Apply_to_Group',
    'HeadSelected',
    'Applied',
    'Never_Apply',
  ],
  PenRiders_log: [
    'Employee_ID',
    'Initials',
    'Date_pen_checked',
    'Pen_name',
    'Head_in_pen',
    'Diagnoser',
    'DOF',
  ],
  PensFed: [
    'FeedDate',
    'Pen_Number',
    'Ration_name',
    'KilosFed',
    'FeedValue',
    'Applied_to_Cattle',
    'Dry_Matter',
    'Last_Modified_timestamp',
  ],
  Purch_Lot_Cattle: [
    'Lot_Number',
    'Numb_Head',
    'Price_Cnts_per_Kg',
    'Weight',
    'TailTag',
    'Vndr_Decl_No',
    'Agistment_PIC',
    'Last_Modified_timestamp',
  ],
  Resp_Disease_ReTreats: ['DrugCount', 'Drugs', 'Head', 'Deaths'],
  Rudd_800_Traits: ['Db_FldName', 'StartPos', 'FldLen'],
  SB_Rec_No_Booked: ['SB_Rec_No_booked'],
  SCU_RecData: ['MthSeq', 'Month', 'SCU_Value', 'HeadDays'],
  Sick_Beast_BRD_Symptoms: [
    'BeastID',
    'Runny_Nose',
    'Runny_eyes',
    'Drool_slobber',
    'Coughing',
    'Increased_breathing_rate',
    'Laboured_breathing',
    'Reduced_gut_fill',
    'SB_Rec_No',
  ],
  Sick_Beast_Temperature: [
    'SB_Rec_No',
    'Temp_Date',
    'Temperature',
    'BeastID',
    'Weight',
  ],
  StockRecData: [
    'LineHead',
    'Head',
    'Value',
    'AnimalCost',
    'Freight',
    'Agist_and_Feed',
    'OtherCosts',
  ],
  Tag_Bucket_File: ['RFID_Number', 'NLIS_Number'],
  Carcase_data: [
    'Beast_ID',
    'Ear_Tag_No',
    'EID',
    'Sold_To',
    'Abattoir',
    'Body_Number',
    'Kill_Date',
    'Carc_Wght_left',
    'Carc_Wght_right',
    'Dress_Pcnt',
    'Teeth',
    'Grade',
    'Price_$/Kg_Left',
    'Price_$/Kg_Right',
    'P8_fat',
    'Rib_fat',
    'Mscle_Score',
    'Eye_Mscle_Area',
    'PH_level',
    'Marbling',
    'Fat_Colour',
    'Mscle_Colour',
    'Meat_Texture',
    'Meat_Yield',
    'Contract_No',
    'Bruising_L',
    'Bruising_R',
    '$/Kg_Deduction',
    'Dockage_Reason',
    'Live_Weight_Shrink_Pcnt',
    'Ossification',
    'MSA_Index',
    'Hump_cold',
    'Boning_Group',
    'Beast_Sale_Type',
    'Boning_date',
    'Marbling_Category',
    'Marbling2',
    'Firmness',
    'Pricing_Method',
    'ChillerNumber',
    'Sold_To_Contact_ID',
    'Abattoir_ID',
    'Loin_temp',
    'Carc_damage_L',
    'Carc_damage_R',
    'Marbling_bonus_rate',
    'RCInvoice_Date',
    'Marbling_bonus_value',
    'Hump_Height',
    'MEQMSA',
    'MEQAUSMRB',
    'Abattoir_Establishment_Number',
    'Last_Modified_timestamp',
  ],
  Autopsy_Records: [
    'Beast_ID',
    'Ear_Tag_No',
    'Date_Dead',
    'Time_Dead',
    'Date_Autopsy',
    'Autopsy_By',
    'Pre_Autopsy_Diag',
    'Post_Autopsy_Diag',
    'Notes',
  ],
  Vendor_Declarations: [
    'Vendor_Dec_Number',
    'Owner_Contact_ID',
    'Form_Date',
    'Number_Cattle',
    'Cattle_Description',
    'Tail_Tag',
    'RFIDs_in_cattle',
    'HGP_Treated',
    'QA_program',
    'QA_Program_details',
    'Fed_stockfeeds',
    'Chem_Res_restriction',
    'Withholding_for_drugs',
    'Withholding_for_feed',
    'Endosulfan_exposure',
    'Endosulfan_Date',
    'Fed_Animal_Fats',
    'Additional_info',
  ],
  Drugs_Purchased: [
    'DrugID',
    'Quantity_received',
    'Batch_number',
    'Expiry_date',
    'Drug_cost',
    'Receival_ID',
  ],
  Drug_Disposal: [
    'DrugID',
    'Number_disposed',
    'Date_disposed',
    'Disposal_reason',
    'Disposal_method',
    'Disposed_by',
    'Notes',
    'Disposal_ID',
    'Applied_to_Inventory',
  ],
  Archiving_Log: ['Date_done', 'Reverse_Archive', 'Record_Selection', 'Records_Archived'],
  Batch_Update_log: ['Date_done', 'Username', 'UserID', 'Logtext'],
  Carc_Feedback_Compliance: [
    'SupplierID',
    'SupplierName',
    'Detail_Lot_No',
    'Hist_Lot_No',
    'Pref_Intake_Fat',
    'Intake_Fat_Group',
    'Intake_Fat_Hist',
    'Pref_Intake_Wght',
    'Intake_Wght_Group',
    'Intake_Wght_Hist',
    'Pref_Intake_Teeth',
    'Intake_Teeth_Group',
    'Intake_Teeth_Hist',
    'Pref_SaleWght',
    'SaleWght_Group',
    'SaleWght_Hist',
    'Pref_WGD',
    'WGD_Group',
    'WGD_Hist',
    'Pref_Dress_Pcnt',
    'Dress_Pcnt_Group',
    'Dress_Pcnt_Hist',
    'Pref_Mrb',
    'Mrb_Group',
    'Mrb_Hist',
    'Pref_CarcP8',
    'CarcP8_Group',
    'CarcP8_Hist',
    'Pref_EMA',
    'EMA_Group',
    'EMA_Hist',
    'Pref_FatCol',
    'FatCol_Group',
    'FatCol_Hist',
    'Pref_MeatCol',
    'MeatCol_Group',
    'MeatCol_Hist',
  ],
  Carc_Feedback_Mth_Avgs: [
    'YrMnth',
    'Sale_Wght',
    'DOF',
    'WG_Day',
    'Carc_Wght',
    'Dress_Pcnt',
    'Carc_Teeth',
    'P8_fat',
    'Eye_Mscle_Area',
    'Marbling',
    'Fat_Colour',
    'Meat_Text',
  ],
  Carc_Feedback_Report_data: [
    'RecordType',
    'Beast_ID',
    'SupplierID',
    'Ear_Tag_No',
    'YrMnth',
    'PurchDate',
    'PurchWght',
    'VendorTag',
    'FL_Ent_Date',
    'FL_Ent_Wght',
    'Sale_Date',
    'Sale_Wght',
    'WG_Day',
    'DOF',
    'Carc_Wght',
    'Dress_Pcnt',
    'Carc_Teeth',
    'P8_fat',
    'Eye_Mscle_Area',
    'Marbling',
    'Fat_Colour',
    'Meat_Colour',
    'Meat_Text',
    'Died',
    'Sickness_costs',
  ],
  Cattle_by_Location_Table: [
    'EntryMonth',
    'RV_Count',
    'RV_PrimeCost',
    'RV_Feed_Cost',
    'RV_OtherCosts',
    'CustFL_Count',
    'CustFL_PrimeCost',
    'CustFL_Feed_Cost',
    'CustFL_OtherCosts',
    'RV_FL_Entry_Wght',
  ],
  Cattle_Query_Month_Report_TAB: [
    'BeastID',
    'Current_LocType_ID',
    'Start_Date',
    'Weigh_date',
    'Weighing_Type',
    'Weight',
    'To_Locn_Type_ID',
    'To_From_Agistor',
    'Beast_sale_Type_ID',
    'Cull_Reason_ID',
    'BE_Agist_Lot_No',
    'Lot_Number',
    'Purchase_date',
    'PRIME_COST',
    'Feed_Cost',
    'Oheads_Cost',
    'Other_Costs',
    'Mkt_Cat',
  ],
  CustFeed_Invoices_list: [
    'Purch_Lot_No',
    'Period_from',
    'Period_To',
    'Cattle_Owner',
    'Invoice_Number',
    'Total_Charges',
    'GST_rate',
    'Billing_Company',
  ],
  Custfeed_Lot_Summary: [
    'Purch_Lot_No',
    'Date_Started',
    'Cattle_Class',
    'Avg_In_Wght',
    'Tag_Range',
    'Head_In',
    'Deads',
    'Shipped',
    'Current_Hospital',
    'Current_Bullers',
    'Current_Non_Performers',
    'Current_Head',
    'Calender_Days_On_Feed_period',
    'Calender_Days_On_Feed_ToDate',
    'Avg_Days_in_Feed_Period',
    'Avg_Days_ToDate',
    'Avg_FeedCost_per_Hd_per_Day_Period',
    'Avg_FeedCost_per_Hd_per_Day_ToDate',
    'Feed_Charges_Period',
    'Feed_Charges_ToDate',
    'Head_Days_Period',
    'Head_Days_ToDate',
    'Kgs_Feed_Period',
    'Kgs_Feed_ToDate',
    'Induction_Costs_Period',
    'Induction_Costs_ToDate',
    'OtherCosts_Period',
    'OtherCosts_ToDate',
    'Cattle_Owner',
    'Agist_Rate_per_day',
    'Head_Arrived_in_Period',
    'Head_Shipped_in_Period',
    'Head_at_Period_Start',
    'Died_in_Period',
    'Drugs_Costs_in_Period',
    'Drugs_Costs_to_date',
    'Comments',
    'Cattle_owner_ID',
    'Cattle_owner_details',
    'Days_invoice_due',
    'Agist_days_for_Period',
    'Agist_days_to_date',
    'Dry_Kgs_Feed_Period',
    'Dry_Kgs_Feed_ToDate',
  ],
  Daily_Cattle_Inventory: [
    'Inventory_Date',
    'FL_Entries',
    'X_RV_Paddock',
    'FL_Deaths',
    'FL_Culls',
    'FL_Sales',
    'Calc_FL_Head',
    'Actual_FL_Head',
    'Accum_Month_HeadDays',
  ],
  Error_Log: [
    'Event_date',
    'Mod_ule',
    'Proceedure_Name',
    'Error_Code',
    'Error_message',
    'User_Number',
    'e_value',
  ],
  Feed_Totals_By_Ration: [
    'BeastID',
    'Ration',
    'KgsFed',
    'FeedCost',
    'Units_DryMatter',
  ],
  Head_By_Disease: [
    'Body_System',
    'Disease_name',
    'Total_Head',
    'Recovered',
    'Paddock',
    'Sold',
    'Died',
    'Treated_and_Died',
  ],
  Last_7_Days_Pulls_Headcounts: ['Pen', 'HeadAtStart', 'Head_n_Days_Ago'],
  Month_End_StockOnHand: [
    'Month_End_Date',
    'SOH_Head',
    'SOH_Prime_Cost',
    'SOH_Feed_Cost',
    'SOH_Oheads_Cost',
    'Total_Costs',
  ],
  Monthly_Adjustment_OB: [
    'Month_End_Date',
    'Head',
    'Prime_Cost',
    'Feed_Cost',
    'Other_Costs',
  ],
  Monthly_Agistor_Movements: [
    'Rec_ID',
    'Month_End_Date',
    'Agistor_ID',
    'Seq_No',
    'Section_Name',
    'Head',
    'Prime_Cost',
  ],
  Monthly_Feedlot_Reconciliation: [
    'Rec_ID',
    'Month_End_Date',
    'Seq_No',
    'Section_Heading',
    'Section_Name',
    'Head',
    'Prime_Cost',
    'Feed_Cost',
    'Other_Costs',
    'Total_Costs',
  ],
  Monthly_FL_Intake_Cost: [
    'Rec_ID',
    'Month_End_Date',
    'Group_No',
    'Seq_No',
    'Section_Name',
    'Head',
    'Prime_Cost',
    'Intake_Kgs',
  ],
  Monthly_Movements: [
    'Rec_ID',
    'Month_End_Date',
    'Section_Seq_Number',
    'Section_Name',
    'Sub_Section',
    'Culls_Head',
    'Culls_Kgs',
    'Culls_PrimeCost',
    'Culls_Feed_Cost',
    'Culls_Other_Costs',
    'RV_Agist_Head',
    'RV_Agist_Kgs',
    'RV_Agist_PrimeCost',
    'RV_Agist_Feed_Cost',
    'RV_Agist_Other_Costs',
    'FeedLot_Head',
    'Feedlot_Kgs',
    'FeedLot_PrimeCost',
    'FeedLot_Feed_Cost',
    'FeedLot_Other_Costs',
    'Agist_Head',
    'Agist_Kgs',
    'Agist_PrimeCost',
    'Agist_Feed_Cost',
    'Agist_Other_Costs',
    'Cust_Feedlot_Head',
    'Cust_Feedlot_Kgs',
    'Cust_Feedlot_PrimeCost',
    'Cust_Feedlot_Feed_Cost',
    'Cust_Feedlot_Other_Costs',
  ],
  Monthly_RV_Agist_Reconciliation: [
    'Rec_ID',
    'Month_End_Date',
    'Seq_No',
    'Section_Heading',
    'Section_Name',
    'Head',
    'Prime_Cost',
  ],
  Pen_mort_morb_list: [
    'Pen_Number',
    'DOF',
    'Purch_Lot_No',
    'CountOfEar_Tag',
    'Head_Sick',
    'Head_Died',
    'Entry_Date',
    'HeadDays',
    'Feed_yesterday',
    'Feed_last_3_days',
    'Feed_last_7_days',
    'average_entry_weight',
  ],
  PenList_AsAt: ['BeastID', 'Pen'],
  Purchase_Totals: ['Tail_Tag', 'Start_Date', 'Head'],
  Sick_By_DOF: [
    'Disease_ID',
    'Pre_FL_Entry',
    '0-29_Days',
    '30-59_Days',
    '60-89_Days',
    '90-119_Days',
    '120-159_Days',
    '160-189_Days',
    '190-219_Days',
    '220-249_Days',
    '250-289_Days',
    '290-319_Days',
    '320-359_Days',
    'MoreThan360Days',
  ],
  SOH_by_Month: ['MnthYYYYmmm', 'Head'],
  TandR_Buying_details: [
    'BeastID',
    'Agent_ID',
    'Buyer_ID',
    'Supplier_ID',
    'Sale_yard_Pen',
    'Animal_Grade',
    'SaleYard_or_Paddock',
    'Payment_Status',
    'Date_Purchased',
    'Date_paid',
  ],
  TandR_Costs_Report: [
    'BeastID',
    'EID',
    'Group',
    'Col1',
    'Col2',
    'Col3',
    'Col4',
    'Col5',
    'Col6',
    'Col7',
    'Col8',
    'Col9',
    'Col10',
    'Dress_Weight',
    'Doll_per_Kg_dressed',
    'Ear_Tag',
    'Purch_Lot_No',
    'FL_entry_date',
    'FL_entry_wght',
    'DOF',
  ],
  User_Log_Ons: ['User_Number', 'Log_on_Date_time', 'Term_inal'],
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 1: STATIC MANIFEST AUDIT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe('Layer 1 â€” Static manifest audit', () => {
  it('every source table in MANIFEST has a mapping', () => {
    const mappedSources = new Set(mappings.map(m => m.sourceTable));
    for (const src of Object.keys(MANIFEST)) {
      expect(mappedSources.has(src)).toBe(true);
    }
  });

  it('every mapping source table appears in MANIFEST', () => {
    for (const m of mappings) {
      expect(MANIFEST).toHaveProperty(m.sourceTable);
    }
  });

  it('every MANIFEST column appears in the mapping columns', () => {
    for (const [src, expectedCols] of Object.entries(MANIFEST)) {
      const mapping = mappings.find(m => m.sourceTable === src);
      const mappedSources = mapping.columns.map(c => c.source);
      for (const col of expectedCols) {
        expect(mappedSources).toContain(col);
      }
    }
  });

  it('no mapping has columns outside the MANIFEST', () => {
    for (const m of mappings) {
      const expected = new Set(MANIFEST[m.sourceTable]);
      for (const col of m.columns) {
        expect(expected.has(col.source)).toBe(true);
      }
    }
  });

  it('all 19 tables are covered', () => {
    expect(Object.keys(MANIFEST)).toHaveLength(123);
    expect(mappings).toHaveLength(123);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 2: GOLDEN ROW INTEGRATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe('Layer 2 â€” Golden row per table', () => {
  beforeEach(async () => {
    const tables = [
      'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events',
      'carcase_data', 'autopsy_records',
      'cows',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'migration_log',
    ];
    for (const t of tables) {
      await pgPool.query(`DELETE FROM ${t}`);
    }
  });

  const goldenData = {
    Breeds:           [{ Breed_Code: 1, Breed_Name: 'Golden Angus' }],
    FeedDB_Pens_File: [{ Pen_name: 'GP01', IsPaddock: 'Y' }],
    Contacts:         [{ Contact_ID: 1, Company: 'Gold Corp', First_Name: 'Jane', Last_Name: 'Doe',
                         Tel_No: '0400111222', Email: 'jane@gold.com', Address_1: '1 Gold Rd',
                         ABN: '99000111222', Notes: 'golden contact' }],
    Diseases:         [{ Disease_ID: 1, Disease_Name: 'GoldenBRD', Symptoms: 'cough', Treatment: 'rest', No_longer_used: false }],
    Drugs:            [{ Drug_ID: 1, Drug_Name: 'GoldenDrug', Units: 'mL', Cost_per_unit: 12.75,
                         WithHold_days_1: 30, WithHold_days_ESI: 42, HGP: 'N', Antibiotic: 'Y',
                         Supplier: 'GoldPharma', Inactive: false }],
    Cost_Codes:       [{ RevExp_Code: 1, RevExp_Desc: 'Feed', Rev_Exp: 'E' }],
    Market_Category:  [{ Market_Cat_ID: 1, Market_Category: 'Grain Fed', Min_DOF: 100, HGP_Free: false }],
    Purchase_Lots:    [{ ID: 1, Lot_Number: 'GL001', Purchase_date: '2024-01-10', Vendor_ID: 1,
                         Agent_Code: null, Number_Head: 50, Total_Weight: 25000, Cost_of_Cattle: 50000,
                         Cattle_Freight_Cost: 2000, Lot_Notes: 'golden lot' }],
    Cattle:           [{ BeastID: 1, Ear_Tag: 'G001', EID: 'EID_G001', Breed: 1, Sex: 'S', HGP: true,
                         Died: false, Start_Date: '2024-01-10', Start_Weight: 350,
                         Sale_Date: null, Sale_Weight: null, DOB: '2022-06-15',
                         Feedlot_Entry_Date: '2024-01-10', Feedlot_Entry_Wght: 350,
                         Pen_Number: 'GP01', Notes: 'golden cow', Purch_Lot_No: 'GL001', Date_Archived: null }],
    Weighing_Events:  [{ BeastID: 1, Weighing_Type: 1, Weigh_date: '2024-01-10', Weight: 350,
                         P8_Fat: 6, Weigh_Note: 'intake golden', ID: 1 }],
    PensHistory:      [{ BeastID: 1, MoveDate: '2024-01-10', Pen: 'GP01', ID: 1 }],
    Drugs_Given:      [{ BeastID: 1, Drug_ID: 1, Units_Given: 3.5, Date_Given: '2024-01-11',
                         Withold_Until: '2024-02-10', SB_Rec_No: 1, User_Initials: 'GD', ID: 1 }],
    Costs:            [{ BeastID: 1, RevExp_Code: 1, Trans_Date: '2024-01-15',
                         Rev_Exp_per_Unit: 2.50, Units: 100, Extended_RevExp: 250.00, ID: 1 }],
    Sick_Beast_Records: [{ Beast_ID: 1, Ear_Tag_No: 'G001', Date_Diagnosed: '2024-02-01',
                           Disease_ID: 1, Diagnosed_By: 'Dr Gold', Sick_Beast_Notes: 'Golden illness',
                           Date_Recovered_Died: '2024-02-10', Result_Code: 'R', SB_Rec_No: 1 }],
    Carcase_data:     [],
    Autopsy_Records:  [],
    Vendor_Declarations: [],
    Drugs_Purchased:  [{ DrugID: 1, Quantity_received: 200,
                         Batch_number: 'GBATCH01', Expiry_date: '2025-12-31', Drug_cost: 2550.00, ID: 1 }],
    Drug_Disposal:    [{ DrugID: 1, Number_disposed: 10, Date_disposed: '2024-06-01',
                         Disposal_reason: 'Expired', Disposal_method: 'Incineration',
                         Disposed_by: 'GD', Notes: 'golden disposal', Disposal_ID: 1 }],
  };

  it('full migration with golden data â€” all tables populated correctly', async () => {
    const mock = createMockMssql(goldenData);
    const { results } = await runMigration(mock, pgPool, {
      batchSize: 100, logLevel: 'error', dryRun: false,
    });

    for (const r of results) {
      expect(r.status).toBe('completed');
    }

    // --- breeds ---
    const breeds = await pgPool.query('SELECT * FROM breeds ORDER BY id');
    expect(breeds.rows).toHaveLength(1);
    expect(breeds.rows[0].name).toBe('Golden Angus');

    // --- pens ---
    const pens = await pgPool.query("SELECT * FROM pens WHERE name = 'GP01'");
    expect(pens.rows).toHaveLength(1);
    expect(pens.rows[0].is_paddock).toBe(true);

    // --- contacts ---
    const contacts = await pgPool.query('SELECT * FROM contacts WHERE id = 1');
    expect(contacts.rows).toHaveLength(1);
    expect(contacts.rows[0].company).toBe('Gold Corp');
    expect(contacts.rows[0].first_name).toBe('Jane');
    expect(contacts.rows[0].phone).toBe('0400111222');
    expect(contacts.rows[0].email).toBe('jane@gold.com');
    expect(contacts.rows[0].notes).toBe('golden contact');

    // --- diseases ---
    const diseases = await pgPool.query('SELECT * FROM diseases WHERE id = 1');
    expect(diseases.rows).toHaveLength(1);
    expect(diseases.rows[0].name).toBe('GoldenBRD');
    expect(diseases.rows[0].active).toBe(true);

    // --- drugs ---
    const drugs = await pgPool.query('SELECT * FROM drugs WHERE id = 1');
    expect(drugs.rows).toHaveLength(1);
    expect(drugs.rows[0].name).toBe('GoldenDrug');
    expect(drugs.rows[0].cost_per_unit).toBe(12.75);
    expect(drugs.rows[0].withhold_days).toBe(30);
    expect(drugs.rows[0].esi_days).toBe(42);
    expect(drugs.rows[0].is_antibiotic).toBe(true);
    expect(drugs.rows[0].is_hgp).toBe(false);

    // --- cost_codes ---
    const cc = await pgPool.query("SELECT * FROM cost_codes WHERE code = '1'");
    expect(cc.rows).toHaveLength(1);
    expect(cc.rows[0].type).toBe('expense');

    // --- market_categories ---
    const mc = await pgPool.query('SELECT * FROM market_categories WHERE id = 1');
    expect(mc.rows).toHaveLength(1);
    expect(mc.rows[0].min_dof).toBe(100);
    expect(mc.rows[0].hgp_free).toBe(false);

    // --- purchase_lots ---
    const pl = await pgPool.query("SELECT * FROM purchase_lots WHERE lot_number = 'GL001'");
    expect(pl.rows).toHaveLength(1);
    expect(pl.rows[0].head_count).toBe(50);
    expect(pl.rows[0].total_cost).toBe(50000);
    expect(pl.rows[0].vendor_id).toBe(1);

    // --- cows ---
    const cows = await pgPool.query('SELECT * FROM cows WHERE legacy_beast_id = 1');
    expect(cows.rows).toHaveLength(1);
    const cow = cows.rows[0];
    expect(cow.tag_number).toBe('G001');
    expect(cow.eid).toBe('EID_G001');
    expect(cow.sex).toBe('male');
    expect(cow.hgp).toBe(true);
    expect(cow.status).toBe('active');
    expect(cow.entry_weight_kg).toBe(350);
    expect(cow.dob).not.toBeNull();
    expect(cow.start_date).not.toBeNull();
    expect(cow.start_weight_kg).toBe(350);
    expect(cow.notes).toBe('golden cow');
    expect(cow.pen_id).not.toBeNull();
    expect(cow.purchase_lot_id).not.toBeNull();

    // --- weighing_events ---
    const we = await pgPool.query('SELECT * FROM weighing_events');
    expect(we.rows).toHaveLength(1);
    expect(we.rows[0].weigh_type).toBe('intake');
    expect(we.rows[0].weight_kg).toBe(350);
    expect(we.rows[0].p8_fat).toBe(6);
    expect(we.rows[0].notes).toBe('intake golden');

    // --- pen_movements ---
    const pm = await pgPool.query('SELECT * FROM pen_movements');
    expect(pm.rows).toHaveLength(1);
    expect(pm.rows[0].pen_id).not.toBeNull();

    // --- health_records --- (queried before treatments for FK assertion)
    const hr = await pgPool.query('SELECT * FROM health_records');
    expect(hr.rows).toHaveLength(1);
    expect(hr.rows[0].type).toBe('treatment');
    expect(hr.rows[0].description).toBe('Golden illness');
    expect(hr.rows[0].disease_id).toBe(1);
    expect(hr.rows[0].date_recovered).not.toBeNull();
    expect(hr.rows[0].result_code).toBe('R');
    expect(hr.rows[0].vet_name).toBe('Dr Gold');
    expect(hr.rows[0].legacy_sb_rec_no).toBe(1);

    // --- treatments ---
    const tr = await pgPool.query('SELECT * FROM treatments');
    expect(tr.rows).toHaveLength(1);
    expect(tr.rows[0].drug_id).toBe(1);
    expect(tr.rows[0].dose).toBe(3.5);
    expect(tr.rows[0].administered_by).toBe('GD');
    expect(tr.rows[0].withhold_until).not.toBeNull();
    // treatment â†’ health_record link via SB_Rec_No
    expect(tr.rows[0].health_record_id).toBe(hr.rows[0].id);

    // --- costs ---
    const costs = await pgPool.query('SELECT * FROM costs');
    expect(costs.rows).toHaveLength(1);
    expect(costs.rows[0].amount).toBe(250);
    expect(costs.rows[0].unit_cost).toBe(2.5);
    expect(costs.rows[0].units).toBe(100);
    expect(costs.rows[0].cost_code_id).not.toBeNull();

    // --- drug_purchases ---
    const dp = await pgPool.query('SELECT * FROM drug_purchases');
    expect(dp.rows).toHaveLength(1);
    expect(dp.rows[0].drug_id).toBe(1);
    expect(dp.rows[0].quantity).toBe(200);
    expect(dp.rows[0].cost).toBe(2550);
    expect(dp.rows[0].batch_number).toBe('GBATCH01');

    // --- drug_disposals ---
    const dd = await pgPool.query('SELECT * FROM drug_disposals');
    expect(dd.rows).toHaveLength(1);
    expect(dd.rows[0].drug_id).toBe(1);
    expect(dd.rows[0].quantity).toBe(10);
    expect(dd.rows[0].disposal_reason).toBe('Expired');
    expect(dd.rows[0].disposed_by).toBe('GD');

    // --- SERIAL sequences reset ---
    // After migration, sequences should be advanced past MAX(id)
    // so new INSERTs don't collide with migrated IDs
    const seqCheck = await pgPool.query(
      "SELECT last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'breeds_id_seq'"
    );
    expect(parseInt(seqCheck.rows[0].last_value)).toBeGreaterThanOrEqual(1);
  }, 30000);
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 3: NUMERIC PRECISION & EDGE CASES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe('Layer 3 â€” Numeric precision & edge cases', () => {
  describe('withhold_days and esi_days nullable', () => {
    it('null withhold_days stays null (not coerced to 0)', () => {
      expect(toNum(null)).toBeNull();
      expect(toNum(undefined)).toBeNull();
    });

    it('zero withhold_days stays 0', () => {
      expect(toNum(0)).toBe(0);
    });

    it('positive withhold_days preserved', () => {
      expect(toNum(30)).toBe(30);
    });
  });

  describe('weight_kg nullable', () => {
    it('null weight stays null (not coerced to 0)', () => {
      expect(toNum(null)).toBeNull();
    });

    it('zero weight returns 0', () => {
      expect(toNum(0)).toBe(0);
    });

    it('decimal weight preserves precision', () => {
      expect(toNum(350.75)).toBeCloseTo(350.75);
      expect(toNum('380.123')).toBeCloseTo(380.123);
    });
  });

  describe('toNum precision', () => {
    it('handles very small decimals', () => {
      expect(toNum(0.001)).toBeCloseTo(0.001);
    });

    it('handles large numbers', () => {
      expect(toNum(999999.99)).toBe(999999.99);
    });

    it('handles string numbers', () => {
      expect(toNum('42')).toBe(42);
      expect(toNum('3.14')).toBeCloseTo(3.14);
    });

    it('returns null for non-numeric strings', () => {
      expect(toNum('abc')).toBeNull();
      expect(toNum('N/A')).toBeNull();
    });
  });

  describe('toBool inversion (active fields)', () => {
    it('Inactive=true â†’ active=false', () => {
      expect(!toBool(true)).toBe(false);
      expect(!toBool(1)).toBe(false);
      expect(!toBool('Y')).toBe(false);
    });

    it('Inactive=false â†’ active=true', () => {
      expect(!toBool(false)).toBe(true);
      expect(!toBool(0)).toBe(true);
      expect(!toBool(null)).toBe(true);
    });
  });

  describe('toFkId sentinel handling', () => {
    it('0 â†’ null (legacy default for no reference)', () => {
      expect(toFkId(0)).toBeNull();
      expect(toFkId('0')).toBeNull();
    });

    it('positive IDs preserved', () => {
      expect(toFkId(1)).toBe(1);
      expect(toFkId(999)).toBe(999);
    });

    it('null/undefined â†’ null', () => {
      expect(toFkId(null)).toBeNull();
      expect(toFkId(undefined)).toBeNull();
    });
  });

  describe('tag_number fallback', () => {
    it('null Ear_Tag falls back to UNKNOWN', () => {
      const mapping = mappings.find(m => m.sourceTable === 'Cattle');
      const tagCol = mapping.columns.find(c => c.target === 'tag_number');
      // Column transform returns null; buildInsertValues adds UNKNOWN-{id} fallback
      expect(tagCol.transform(null)).toBeNull();
      expect(tagCol.transform('')).toBeNull();
      expect(tagCol.transform('  ')).toBeNull();
      // Full pipeline fallback
      const vals = mapping.buildInsertValues({ tag_number: null, legacy_beast_id: 42 });
      expect(vals.tag_number).toBe('UNKNOWN-42');
    });

    it('valid Ear_Tag is preserved', () => {
      const mapping = mappings.find(m => m.sourceTable === 'Cattle');
      const tagCol = mapping.columns.find(c => c.target === 'tag_number');
      expect(tagCol.transform('A001')).toBe('A001');
      expect(tagCol.transform(' B002 ')).toBe('B002');
    });
  });

  describe('sentinel dates', () => {
    it('1900-01-01 fallback on null weigh_date', () => {
      const mapping = mappings.find(m => m.sourceTable === 'Weighing_Events');
      const dateCol = mapping.columns.find(c => c.target === 'weighed_at');
      expect(dateCol.transform(null)).toBe('1900-01-01T00:00:00.000Z');
      expect(dateCol.transform('')).toBe('1900-01-01T00:00:00.000Z');
    });

    it('valid date is passed through', () => {
      const result = toDate('2024-06-15T10:30:00');
      expect(result).toContain('2024-06-15');
    });
  });

  describe('deriveCowStatus priority', () => {
    it('died takes priority over sold', () => {
      expect(deriveCowStatus({ Died: true, Sale_Date: new Date(), Date_Archived: null })).toBe('died');
    });

    it('sold takes priority over archived', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: new Date(), Date_Archived: new Date() })).toBe('sold');
    });

    it('archived when only archived', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: null, Date_Archived: new Date() })).toBe('archived');
    });

    it('active when no flags', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: null, Date_Archived: null })).toBe('active');
    });
  });

  describe('mapWeighType edge cases', () => {
    it('unknown codes default to interim', () => {
      expect(mapWeighType(0)).toBe('interim');
      expect(mapWeighType(99)).toBe('interim');
      expect(mapWeighType(null)).toBe('interim');
      expect(mapWeighType(undefined)).toBe('interim');
    });
  });

  describe('mapCostType edge cases', () => {
    it('case-insensitive revenue detection', () => {
      expect(mapCostType('R')).toBe('revenue');
      expect(mapCostType('r')).toBe('revenue');
    });

    it('non-R values default to expense', () => {
      expect(mapCostType('E')).toBe('expense');
      expect(mapCostType('X')).toBe('expense');
      expect(mapCostType(null)).toBe('expense');
      expect(mapCostType('')).toBe('expense');
    });
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 4: FK CHAIN END-TO-END
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe('Layer 4 â€” FK chain tests', () => {
  beforeEach(async () => {
    const tables = [
      'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events',
      'carcase_data', 'autopsy_records',
      'cows',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'migration_log',
    ];
    for (const t of tables) {
      await pgPool.query(`DELETE FROM ${t}`);
    }
  });

  it('cowIdMap skip â€” unknown BeastID skips the row', async () => {
    const mock = createMockMssql({
      'Weighing_Events': [
        { BeastID: 9999, Weighing_Type: 1, Weigh_date: '2024-01-01', Weight: 300, P8_Fat: 5, Weigh_Note: 'orphan', ID: 1 },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'Weighing_Events');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap: {} },
    });
    expect(result.rowsSkipped).toBe(1);
    expect(result.rowsWritten).toBe(0);
  });

  it('drugIdSet sanitize â€” unknown drug_id set to null', async () => {
    // Seed a cow for the treatment to attach to
    await pgPool.query("INSERT INTO breeds (name) VALUES ('Test') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('FK_DRUG', 'Test', 7001, 'active', 'female')
    `);
    const cowRes = await pgPool.query('SELECT id FROM cows WHERE legacy_beast_id = 7001');
    const cowId = cowRes.rows[0].id;

    const mock = createMockMssql({
      'Drugs_Given': [
        { BeastID: 7001, Drug_ID: 9999, Units_Given: 1, Date_Given: '2024-01-01',
          Withold_Until: null, SB_Rec_No: null, User_Initials: 'X', ID: 1 },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'Drugs_Given');
    await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap: { 7001: cowId }, drugIdSet: new Set() },
    });

    const rows = await pgPool.query('SELECT drug_id FROM treatments');
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].drug_id).toBeNull();
  });

  it('contactIdSet sanitize â€” unknown vendor_id set to null', async () => {
    const mock = createMockMssql({
      'Purchase_Lots': [
        { ID: 1, Lot_Number: 'FK_VEN', Purchase_date: '2024-01-01', Vendor_ID: 8888,
          Agent_Code: null, Number_Head: 10, Total_Weight: 5000, Cost_of_Cattle: 10000,
          Cattle_Freight_Cost: 500, Lot_Notes: null },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'Purchase_Lots');
    await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { contactIdSet: new Set() },
    });

    const rows = await pgPool.query("SELECT vendor_id FROM purchase_lots WHERE lot_number = 'FK_VEN'");
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].vendor_id).toBeNull();
  });

  it('costCodeMap resolve â€” cost_code_id correctly resolved', async () => {
    await pgPool.query("INSERT INTO breeds (name) VALUES ('CostTest') ON CONFLICT DO NOTHING");
    await pgPool.query("INSERT INTO cost_codes (code, description, type) VALUES (99, 'TestCode', 'expense') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('FK_CC', 'CostTest', 7002, 'active', 'female')
    `);
    const cowRes = await pgPool.query('SELECT id FROM cows WHERE legacy_beast_id = 7002');
    const cowId = cowRes.rows[0].id;
    const ccRes = await pgPool.query("SELECT id FROM cost_codes WHERE code = '99'");
    const ccId = ccRes.rows[0].id;

    const mock = createMockMssql({
      'Costs': [
        { BeastID: 7002, RevExp_Code: 99, Trans_Date: '2024-01-01',
          Rev_Exp_per_Unit: 5, Units: 10, Extended_RevExp: 50, ID: 1 },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'Costs');
    await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap: { 7002: cowId }, costCodeMap: { 99: ccId } },
    });

    const rows = await pgPool.query('SELECT cost_code_id, unit_cost FROM costs');
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].cost_code_id).toBe(ccId);
    expect(rows.rows[0].unit_cost).toBe(5);
  });

  it('pen auto-create â€” unknown pen is created on demand', async () => {
    await pgPool.query("INSERT INTO breeds (name) VALUES ('PenTest') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('FK_PEN', 'PenTest', 7003, 'active', 'female')
    `);
    const cowRes = await pgPool.query('SELECT id FROM cows WHERE legacy_beast_id = 7003');
    const cowId = cowRes.rows[0].id;

    const mock = createMockMssql({
      'PensHistory': [
        { BeastID: 7003, MoveDate: '2024-01-01', Pen: 'AutoCreatedPen', ID: 1 },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'PensHistory');
    const penIdMap = {};
    await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap: { 7003: cowId }, penIdMap },
    });

    const penRows = await pgPool.query("SELECT * FROM pens WHERE name = 'AutoCreatedPen'");
    expect(penRows.rows).toHaveLength(1);

    const pmRows = await pgPool.query('SELECT pen_id FROM pen_movements WHERE cow_id = $1', [cowId]);
    expect(pmRows.rows).toHaveLength(1);
    expect(pmRows.rows[0].pen_id).toBe(penRows.rows[0].id);
  });

  it('disease_id FK â€” unknown disease_id (0) set to null via toFkId', () => {
    expect(toFkId(0)).toBeNull();
    expect(toFkId(null)).toBeNull();
  });

  it('diseaseIdSet sanitize â€” unknown disease_id set to null', async () => {
    await pgPool.query("INSERT INTO breeds (name) VALUES ('DiseaseTest') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('FK_DIS', 'DiseaseTest', 7004, 'active', 'female')
    `);
    const cowRes = await pgPool.query('SELECT id FROM cows WHERE legacy_beast_id = 7004');
    const cowId = cowRes.rows[0].id;

    const mock = createMockMssql({
      'Sick_Beast_Records': [
        { Beast_ID: 7004, Ear_Tag_No: 'FK_DIS', Date_Diagnosed: '2024-01-01',
          Disease_ID: 9999, Diagnosed_By: 'Vet', Sick_Beast_Notes: 'Test',
          Date_Recovered_Died: null, Result_Code: null, SB_Rec_No: 9001 },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'Sick_Beast_Records');
    await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap: { 7004: cowId }, diseaseIdSet: new Set() },
    });

    const rows = await pgPool.query('SELECT disease_id FROM health_records WHERE legacy_sb_rec_no = 9001');
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].disease_id).toBeNull();
  });

  it('drug_purchases â€” unknown drug_id nullified', async () => {
    const mock = createMockMssql({
      'Drugs_Purchased': [
        { DrugID: 7777, Quantity_received: 10, Purchase_Date: '2024-01-01',
          Batch_number: null, Expiry_date: null, Drug_cost: 100, ID: 1 },
      ],
    });
    const mapping = mappings.find(m => m.sourceTable === 'Drugs_Purchased');
    await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { drugIdSet: new Set() },
    });

    const rows = await pgPool.query('SELECT drug_id FROM drug_purchases ORDER BY id DESC LIMIT 1');
    expect(rows.rows[0].drug_id).toBeNull();
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LAYER 5: SELF-CHECKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

describe('Layer 5 â€” Self-checks', () => {
  beforeEach(async () => {
    const tables = [
      'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events',
      'carcase_data', 'autopsy_records',
      'cows',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'migration_log',
    ];
    for (const t of tables) {
      await pgPool.query(`DELETE FROM ${t}`);
    }
  });

  it('row counts match source after full migration', async () => {
    const goldenData = {
      Breeds:           [{ Breed_Code: 1, Breed_Name: 'Angus' }, { Breed_Code: 2, Breed_Name: 'Hereford' }],
      FeedDB_Pens_File: [{ Pen_name: 'P01', IsPaddock: 'N' }],
      Contacts:         [{ Contact_ID: 1, Company: 'Co', First_Name: 'A', Last_Name: 'B',
                           Tel_No: null, Email: null, Address_1: null, ABN: null, Notes: null }],
      Diseases:         [{ Disease_ID: 1, Disease_Name: 'BRD', Symptoms: null, Treatment: null, No_longer_used: false }],
      Drugs:            [{ Drug_ID: 1, Drug_Name: 'Drug1', Units: 'mL', Cost_per_unit: 5,
                           WithHold_days_1: 7, WithHold_days_ESI: 14, HGP: 'N', Antibiotic: 'N',
                           Supplier: null, Inactive: false }],
      Cost_Codes:       [{ RevExp_Code: 1, RevExp_Desc: 'Feed', Rev_Exp: 'E' }],
      Market_Category:  [{ Market_Cat_ID: 1, Market_Category: 'Standard', Min_DOF: 0, HGP_Free: false }],
      Purchase_Lots:    [{ ID: 1, Lot_Number: 'L001', Purchase_date: '2024-01-01', Vendor_ID: 1,
                           Agent_Code: null, Number_Head: 10, Total_Weight: 5000, Cost_of_Cattle: 10000,
                           Cattle_Freight_Cost: 500, Lot_Notes: null }],
      Cattle:           [{ BeastID: 1, Ear_Tag: 'RC01', EID: null, Breed: 1, Sex: 'S', HGP: false,
                           Died: false, Start_Date: null, Start_Weight: null,
                           Sale_Date: null, Sale_Weight: null, DOB: null,
                           Feedlot_Entry_Date: '2024-01-01', Feedlot_Entry_Wght: 300,
                           Pen_Number: 'P01', Notes: null, Purch_Lot_No: 'L001', Date_Archived: null }],
      Weighing_Events:  [{ BeastID: 1, Weighing_Type: 1, Weigh_date: '2024-01-01', Weight: 300,
                           P8_Fat: null, Weigh_Note: null, ID: 1 }],
      PensHistory:      [{ BeastID: 1, MoveDate: '2024-01-01', Pen: 'P01', ID: 1 }],
      Drugs_Given:      [{ BeastID: 1, Drug_ID: 1, Units_Given: 2, Date_Given: '2024-01-02',
                           Withold_Until: null, SB_Rec_No: null, User_Initials: null, ID: 1 }],
      Costs:            [{ BeastID: 1, RevExp_Code: 1, Trans_Date: '2024-01-01',
                           Rev_Exp_per_Unit: 2, Units: 10, Extended_RevExp: 20, ID: 1 }],
      Sick_Beast_Records: [{ Beast_ID: 1, Ear_Tag_No: 'RC01', Date_Diagnosed: '2024-02-01',
                             Disease_ID: 1, Diagnosed_By: 'Vet', Sick_Beast_Notes: 'Sick',
                             Date_Recovered_Died: null, Result_Code: null, SB_Rec_No: 1 }],
      Carcase_data:     [],
      Autopsy_Records:  [],
      Vendor_Declarations: [],
      Drugs_Purchased:  [],
      Drug_Disposal:    [],
    };

    const mock = createMockMssql(goldenData);
    const { results } = await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    // Verify row counts for tables with data
    const countChecks = [
      { target: 'breeds', expected: 2 },
      { target: 'pens', expected: 1 },
      { target: 'contacts', expected: 1 },
      { target: 'diseases', expected: 1 },
      { target: 'drugs', expected: 1 },
      { target: 'cost_codes', expected: 1 },
      { target: 'market_categories', expected: 1 },
      { target: 'purchase_lots', expected: 1 },
      { target: 'cows', expected: 1 },
      { target: 'weighing_events', expected: 1 },
      { target: 'pen_movements', expected: 1 },
      { target: 'treatments', expected: 1 },
      { target: 'costs', expected: 1 },
      { target: 'health_records', expected: 1 },
    ];

    for (const { target, expected } of countChecks) {
      const res = await pgPool.query(`SELECT COUNT(*) AS cnt FROM ${target}`);
      expect(parseInt(res.rows[0].cnt)).toBe(expected);
    }
  }, 30000);

  it('migration_log has entry for every migrated table', async () => {
    const goldenData = {
      Breeds:           [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      FeedDB_Pens_File: [],
      Contacts:         [],
      Diseases:         [],
      Drugs:            [],
      Cost_Codes:       [],
      Market_Category:  [],
      Purchase_Lots:    [],
      Cattle:           [],
      Weighing_Events:  [],
      PensHistory:      [],
      Drugs_Given:      [],
      Costs:            [],
      Sick_Beast_Records: [],
      Carcase_data:     [],
      Autopsy_Records:  [],
      Vendor_Declarations: [],
      Drugs_Purchased:  [],
      Drug_Disposal:    [],
    };

    const mock = createMockMssql(goldenData);
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    const logs = await pgPool.query('SELECT source_table, status FROM migration_log ORDER BY id');
    expect(logs.rows.length).toBe(123);
    for (const row of logs.rows) {
      expect(row.status).toBe('completed');
    }
  }, 30000);

  it('FK orphan scan â€” no orphaned references after migration', async () => {
    const goldenData = {
      Breeds:           [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      FeedDB_Pens_File: [{ Pen_name: 'P01', IsPaddock: 'N' }],
      Contacts:         [{ Contact_ID: 1, Company: 'Co', First_Name: 'A', Last_Name: 'B',
                           Tel_No: null, Email: null, Address_1: null, ABN: null, Notes: null }],
      Diseases:         [{ Disease_ID: 1, Disease_Name: 'BRD', Symptoms: null, Treatment: null, No_longer_used: false }],
      Drugs:            [{ Drug_ID: 1, Drug_Name: 'Drug1', Units: 'mL', Cost_per_unit: 5,
                           WithHold_days_1: 7, WithHold_days_ESI: 14, HGP: 'N', Antibiotic: 'N',
                           Supplier: null, Inactive: false }],
      Cost_Codes:       [{ RevExp_Code: 1, RevExp_Desc: 'Feed', Rev_Exp: 'E' }],
      Market_Category:  [],
      Purchase_Lots:    [{ ID: 1, Lot_Number: 'L001', Purchase_date: '2024-01-01', Vendor_ID: 1,
                           Agent_Code: null, Number_Head: 10, Total_Weight: 5000, Cost_of_Cattle: 10000,
                           Cattle_Freight_Cost: 500, Lot_Notes: null }],
      Cattle:           [{ BeastID: 1, Ear_Tag: 'O001', EID: null, Breed: 1, Sex: 'S', HGP: false,
                           Died: false, Start_Date: null, Start_Weight: null,
                           Sale_Date: null, Sale_Weight: null, DOB: null,
                           Feedlot_Entry_Date: '2024-01-01', Feedlot_Entry_Wght: 300,
                           Pen_Number: 'P01', Notes: null, Purch_Lot_No: 'L001', Date_Archived: null }],
      Weighing_Events:  [{ BeastID: 1, Weighing_Type: 1, Weigh_date: '2024-01-01', Weight: 300,
                           P8_Fat: null, Weigh_Note: null, ID: 1 }],
      PensHistory:      [],
      Drugs_Given:      [{ BeastID: 1, Drug_ID: 1, Units_Given: 2, Date_Given: '2024-01-02',
                           Withold_Until: null, SB_Rec_No: null, User_Initials: null, ID: 1 }],
      Costs:            [{ BeastID: 1, RevExp_Code: 1, Trans_Date: '2024-01-01',
                           Rev_Exp_per_Unit: 2, Units: 10, Extended_RevExp: 20, ID: 1 }],
      Sick_Beast_Records: [{ Beast_ID: 1, Ear_Tag_No: 'O001', Date_Diagnosed: '2024-02-01',
                             Disease_ID: 1, Diagnosed_By: 'Vet', Sick_Beast_Notes: 'Sick',
                             Date_Recovered_Died: null, Result_Code: null, SB_Rec_No: 1 }],
      Carcase_data:     [],
      Autopsy_Records:  [],
      Vendor_Declarations: [],
      Drugs_Purchased:  [{ DrugID: 1, Quantity_received: 50, Purchase_Date: '2024-01-01',
                           Batch_number: null, Expiry_date: null, Drug_cost: 250, ID: 1 }],
      Drug_Disposal:    [],
    };

    const mock = createMockMssql(goldenData);
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    // Check all FK relationships have no orphans
    const fkChecks = [
      { table: 'weighing_events', fk: 'cow_id', ref: 'cows' },
      { table: 'treatments',      fk: 'cow_id', ref: 'cows' },
      { table: 'treatments',      fk: 'drug_id', ref: 'drugs' },
      { table: 'costs',           fk: 'cow_id', ref: 'cows' },
      { table: 'costs',           fk: 'cost_code_id', ref: 'cost_codes' },
      { table: 'health_records',  fk: 'cow_id', ref: 'cows' },
      { table: 'health_records',  fk: 'disease_id', ref: 'diseases' },
      { table: 'drug_purchases',  fk: 'drug_id', ref: 'drugs' },
    ];

    for (const { table, fk, ref } of fkChecks) {
      const res = await pgPool.query(
        `SELECT COUNT(*) AS cnt FROM ${table} t
         WHERE t.${fk} IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM ${ref} r WHERE r.id = t.${fk})`
      );
      const orphans = parseInt(res.rows[0].cnt);
      expect(orphans).toBe(0);
    }
  }, 30000);

  it('idempotency â€” running migration twice yields same row counts', async () => {
    const goldenData = {
      Breeds:           [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      FeedDB_Pens_File: [{ Pen_name: 'P01', IsPaddock: 'N' }],
      Contacts:         [],
      Diseases:         [],
      Drugs:            [],
      Cost_Codes:       [],
      Market_Category:  [],
      Purchase_Lots:    [],
      Cattle:           [],
      Weighing_Events:  [],
      PensHistory:      [],
      Drugs_Given:      [],
      Costs:            [],
      Sick_Beast_Records: [],
      Carcase_data:     [],
      Autopsy_Records:  [],
      Vendor_Declarations: [],
      Drugs_Purchased:  [],
      Drug_Disposal:    [],
    };

    const mock = createMockMssql(goldenData);
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    const breedsAfter1 = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    const pensAfter1   = await pgPool.query('SELECT COUNT(*) AS cnt FROM pens');

    // Run again â€” TRUNCATE CASCADE should reset, yielding same counts
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    const breedsAfter2 = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    const pensAfter2   = await pgPool.query('SELECT COUNT(*) AS cnt FROM pens');

    expect(parseInt(breedsAfter2.rows[0].cnt)).toBe(parseInt(breedsAfter1.rows[0].cnt));
    expect(parseInt(pensAfter2.rows[0].cnt)).toBe(parseInt(pensAfter1.rows[0].cnt));
  }, 30000);
});
