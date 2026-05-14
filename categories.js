/**
 * Categorisation of ALL legacy CATTLE database tables across 17 client databases.
 *
 * Every table is explicitly listed with a strategy:
 *   'mapped'   — has a structured mapping in mappings.js
 *   'raw'      — bulk-copied to system.legacy_raw as JSONB (data preserved, no transform)
 *   'excluded' — not migrated, with documented reason
 *
 * Target names are v3 schema-qualified (e.g. 'cattle.cattle', 'health.drugs').
 * Tables consolidated into system.lookups include a lookupCategory field.
 *
 * Dynamic per-user keyfile tables (BatchUpdate_Keyfile_*, BeastID_Keyfile_*)
 * are matched via TABLE_PATTERNS regex — not listed individually.
 *
 * This guarantees zero silent data loss: any source table NOT listed here
 * (and not matched by a pattern) triggers a hard error in the pre-flight audit.
 */
'use strict';

const TABLE_CATEGORIES = {
  // ── Core mapped tables (structured migration) ──────
  'Breeds':                 { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'breed' },
  'FeedDB_Pens_File':       { strategy: 'mapped', target: 'feed.feeddb_pens_file' },
  'Contacts':               { strategy: 'mapped', target: 'contacts.contacts' },
  'Diseases':               { strategy: 'mapped', target: 'health.diseases' },
  'Drugs':                  { strategy: 'mapped', target: 'health.drugs' },
  'Cost_Codes':             { strategy: 'mapped', target: 'finance.cost_codes' },
  'Market_Category':        { strategy: 'mapped', target: 'cattle.market_category' },
  'Purchase_Lots':          { strategy: 'mapped', target: 'purchasing.purchase_lots' },
  'Cattle':                 { strategy: 'mapped', target: 'cattle.cattle' },
  'Weighing_Events':        { strategy: 'mapped', target: 'weighing.weighing_events' },
  'PensHistory':            { strategy: 'mapped', target: 'pen.penshistory' },
  'Drugs_Given':            { strategy: 'mapped', target: 'health.drugs_given' },
  'Costs':                  { strategy: 'mapped', target: 'finance.costs' },
  'Sick_Beast_Records':     { strategy: 'mapped', target: 'health.sick_beast_records' },
  'Carcase_data':           { strategy: 'mapped', target: 'carcase.carcase_data' },
  'Autopsy_Records':        { strategy: 'mapped', target: 'health.autopsy_records' },
  'Vendor_Declarations':    { strategy: 'mapped', target: 'feed.vendor_declarations' },
  'Drugs_Purchased':        { strategy: 'mapped', target: 'health.drugs_purchased' },
  'Drug_Disposal':          { strategy: 'mapped', target: 'health.drug_disposal' },

  // ── Secondary mapped tables ────────────────────────
  'Agistment_Transfer_Register': { strategy: 'mapped', target: 'cattle.agistment_transfer_register' },
  'Archiving_Log': { strategy: 'mapped', target: 'system.archiving_log' },
  'Batch_Update_log': { strategy: 'mapped', target: 'cattle.batch_update_log' },
  'Beast_Accumed_Feed_by_commodity': { strategy: 'mapped', target: 'finance.beast_accumed_feed_by_commodity' },
  'Beast_Breeding': { strategy: 'mapped', target: 'breeding.beast_breeding' },
  'Beast_Cull_Reasons': { strategy: 'mapped', target: 'cattle.beast_cull_reasons' },
  'Beast_Ohead_Appl_History': { strategy: 'mapped', target: 'cattle.beast_ohead_appl_history' },
  'Beast_Sale_Types_RV': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'beast_sale_type' },
  'BeastMovement': { strategy: 'mapped', target: 'cattle.beastmovement' },
  'BodySystems': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'body_system' },
  'Breeding_Categories': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'breeding_category' },
  'Breeding_Dams': { strategy: 'mapped', target: 'breeding.breeding_dams' },
  'Breeding_Sires': { strategy: 'mapped', target: 'breeding.breeding_sires' },
  'Carc_Feedback_Compliance': { strategy: 'mapped', target: 'carcase.carc_feedback_compliance' },
  'Carc_Feedback_Mth_Avgs': { strategy: 'mapped', target: 'carcase.carc_feedback_mth_avgs' },
  'Carc_Feedback_Report_data': { strategy: 'raw', reason: 'No direct v3 table — report cache data' },
  'Carcase_DataType2': { strategy: 'mapped', target: 'carcase.carcase_datatype2' },
  'Carcase_Grades': { strategy: 'mapped', target: 'carcase.carcase_grades' },
  'Carcase_Grades_US': { strategy: 'mapped', target: 'carcase.carcase_grades_us' },
  'Carcase_import_Data': { strategy: 'raw', reason: 'No direct v3 table — import staging data' },
  'Carcase_Prices': { strategy: 'mapped', target: 'carcase.carcase_prices' },
  'Cattle_by_Location_Table': { strategy: 'raw', reason: 'No direct v3 table — computed view cache' },
  'Cattle_DOF_and_DIP': { strategy: 'raw', reason: 'No direct v3 table — computed DOF data' },
  'Cattle_Feed_Update': { strategy: 'mapped', target: 'feed.cattle_feed_updates' },
  'Cattle_Photos': { strategy: 'mapped', target: 'cattle.cattle_photos' },
  'Cattle_Program_Types': { strategy: 'mapped', target: 'cattle.cattle_program_types' },
  'Cattle_Query_Month_Report_TAB': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Cattle_Specs': { strategy: 'mapped', target: 'cattle.cattle_specs' },
  'CattleProcessed': { strategy: 'mapped', target: 'cattle.cattleprocessed' },
  'Chemical_inventory': { strategy: 'mapped', target: 'health.chemical_inventory' },
  'Chemical_inventory_old': { strategy: 'raw', reason: 'No direct v3 table — archived inventory' },
  'Code_References_Index': { strategy: 'mapped', target: 'system.code_references_index' },
  'Company': { strategy: 'mapped', target: 'contacts.company' },
  'Company_Settings': { strategy: 'mapped', target: 'contacts.company_settings' },
  'ContactsContactTypes': { strategy: 'mapped', target: 'contacts.contactscontacttypes' },
  'ContactTypes': { strategy: 'mapped', target: 'contacts.contacttypes' },
  'Cust_Feed_Charges': { strategy: 'raw', reason: 'No direct v3 table — computed charges' },
  'CustFeed_Invoices_list': { strategy: 'mapped', target: 'finance.custfeed_invoices_list' },
  'Custfeed_Lot_Summary': { strategy: 'mapped', target: 'finance.custfeed_lot_summary' },
  'Daily_Cattle_Inventory': { strategy: 'mapped', target: 'cattle.daily_cattle_inventory' },
  'Drug_Category': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'drug_category' },
  'Drug_HGP_Forms': { strategy: 'mapped', target: 'health.drug_hgp_forms' },
  'Drug_Stocktake_records': { strategy: 'mapped', target: 'health.drug_inventory_line_items' },
  'Drug_Stocktakes': { strategy: 'raw', reason: 'Consolidated into health.drug_inventory_events in v3' },
  'Drug_Transfer_Records': { strategy: 'raw', reason: 'Consolidated into health.drug_inventory_line_items in v3' },
  'Drug_Transfers': { strategy: 'raw', reason: 'Consolidated into health.drug_inventory_events in v3' },
  'Drugs_Purchase_event': { strategy: 'mapped', target: 'health.drugs_purchase_event' },
  'Error_Log': { strategy: 'mapped', target: 'system.error_log' },
  'Feed_Commodity_names': { strategy: 'mapped', target: 'commodity.commodities' },
  'Feed_Totals_By_Ration': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Feedlot_Staff': { strategy: 'mapped', target: 'feed.feedlot_staff' },
  'Grower_Groups': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'grower_group' },
  'Head_By_Disease': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Instrument_Calibration_tests': { strategy: 'mapped', target: 'feed.instrument_calibration_tests' },
  'Instruments_needing_Calibration': { strategy: 'mapped', target: 'feed.instruments_needing_calibration' },
  'KD1_Records': { strategy: 'mapped', target: 'cattle.kd1_records' },
  'Last_7_Days_Pulls_Headcounts': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Livestock_Weighbridge_Dockets': { strategy: 'mapped', target: 'weighing.livestock_weighbridge_dockets' },
  'LocationTypes': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'location_type' },
  'Month_End_StockOnHand': { strategy: 'mapped', target: 'reporting.month_end_stockonhand' },
  'Monthly_Adjustment_OB': { strategy: 'mapped', target: 'reporting.monthly_adjustment_ob' },
  'Monthly_Agistor_Movements': { strategy: 'mapped', target: 'reporting.monthly_agistor_movements' },
  'Monthly_Feedlot_Reconciliation': { strategy: 'mapped', target: 'reporting.monthly_reconciliation' },
  'Monthly_FL_Intake_Cost': { strategy: 'mapped', target: 'finance.monthly_fl_intake_cost' },
  'Monthly_Movements': { strategy: 'mapped', target: 'reporting.monthly_movements' },
  'Monthly_RV_Agist_Reconciliation': { strategy: 'raw', reason: 'No direct v3 table — agist reconciliation variant' },
  'Mort_Morb_triggers': { strategy: 'mapped', target: 'health.mort_morb_triggers' },
  'New_cattle_records_Log': { strategy: 'mapped', target: 'cattle.new_cattle_records_log' },
  'PackageCosts': { strategy: 'mapped', target: 'finance.packagecosts' },
  'Paddock_Feeding': { strategy: 'mapped', target: 'feed.paddock_feeding' },
  'Pen_Data_From_FeedDB': { strategy: 'raw', reason: 'No direct v3 table — feed system internal' },
  'Pen_mort_morb_list': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Pen_Rider_Tolerances': { strategy: 'mapped', target: 'pen.pen_rider_tolerances' },
  'Pending_Feed_Data': { strategy: 'raw', reason: 'No direct v3 table — temp staging' },
  'PenList_AsAt': { strategy: 'raw', reason: 'No direct v3 table — pen list snapshots' },
  'PenRiders_log': { strategy: 'mapped', target: 'pen.penriders_log' },
  'PensFed': { strategy: 'mapped', target: 'pen.pensfed' },
  'Price_adjustment_by_weight_range': { strategy: 'mapped', target: 'finance.price_adjustment_by_weight_range' },
  'Purch_Lot_Cattle': { strategy: 'mapped', target: 'cattle.purch_lot_cattle' },
  'Purchase_Regions': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'purchase_region' },
  'Purchase_Totals': { strategy: 'mapped', target: 'purchasing.purchase_totals' },
  'RationNames': { strategy: 'mapped', target: 'feed.rations' },
  'Resp_Disease_ReTreats': { strategy: 'mapped', target: 'health.resp_disease_retreats' },
  'Rudd_800_Traits': { strategy: 'mapped', target: 'breeding.rudd_800_traits' },
  'RV_Scheduled_DOF': { strategy: 'mapped', target: 'system.rv_scheduled_dof' },
  'SB_Rec_No_Booked': { strategy: 'mapped', target: 'health.sb_rec_no_booked' },
  'SCU_RecData': { strategy: 'raw', reason: 'No direct v3 table — serial comms data' },
  'Sick_Beast_BRD_Symptoms': { strategy: 'raw', reason: 'BRD columns merged into health.sick_beast_records in v3' },
  'Sick_Beast_Temperature': { strategy: 'mapped', target: 'health.sick_beast_temperature' },
  'Sick_By_DOF': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Sickness_Result_Codes': { strategy: 'mapped', target: 'health.sickness_result_codes' },
  'Sickness_Result_Codes_RV': { strategy: 'mapped', target: 'health.sickness_result_codes' },
  'Sire_Lines': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'sire_line' },
  'SOH_by_Month': { strategy: 'mapped', target: 'reporting.soh_by_month' },
  'StockRecData': { strategy: 'raw', reason: 'No direct v3 table — serial comms data' },
  'SubGroupNames': { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'sub_group' },
  'Tag_Bucket_File': { strategy: 'mapped', target: 'cattle.tag_bucket_file' },
  'TandR_Buying_details': { strategy: 'mapped', target: 'finance.tandr_buying_details' },
  'TandR_Costs_Report': { strategy: 'raw', reason: 'No direct v3 table — report cache' },
  'Tax_Invoice_Bank_details': { strategy: 'mapped', target: 'finance.tax_invoice_bank_details' },
  'Treatment_Regimes': { strategy: 'mapped', target: 'health.treatment_regimes' },
  'Trial_Description': { strategy: 'mapped', target: 'cattle.trial_description' },
  'User_Log_Ons': { strategy: 'mapped', target: 'system.user_log_ons' },
  'Weighing_Types': { strategy: 'mapped', target: 'weighing.weighing_types' },
  'Weighing_Types_RV': { strategy: 'mapped', target: 'weighing.weighing_types' },

  // ── Excluded (not migrated — documented reasons) ───
  'Location_Changes':                    { strategy: 'mapped', target: 'transport.location_changes' },
  // Per-user session/keyfile tables (14 per category; temporary UI state data)
  'BatchUpdate_Keyfile_Administrator':   { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_B_0021':          { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_BARSVR01':        { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_CattleRamp':      { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_Feeding':         { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_KathreneAsturias': { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_Livestock':       { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_LyniseConaghan':  { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_Mill':            { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_Office':          { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_PhilConaghan':    { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_RammieYlagan':    { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_ReganConaghan':   { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_TessaConaghan':   { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BatchUpdate_Keyfile_Yards':           { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_Administrator':       { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_B_0021':              { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_BARSVR01':            { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_CattleRamp':          { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_Feeding':             { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_KathreneAsturias':    { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_Livestock':           { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_LyniseConaghan':      { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_Mill':                { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_Office':              { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_PhilConaghan':        { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_RammieYlagan':        { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_ReganConaghan':       { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_TessaConaghan':       { strategy: 'excluded', reason: 'Per-user session keyfile' },
  'BeastID_Keyfile_Yards':               { strategy: 'excluded', reason: 'Per-user session keyfile' },

  // UI filter/state tables (ephemeral application state)
  'BeastID_Archive_Filter':  { strategy: 'excluded', reason: 'UI filter state' },
  'BeastID_BU_Filter':       { strategy: 'excluded', reason: 'UI filter state' },
  'BeastID_Feed_Keys':       { strategy: 'excluded', reason: 'UI filter state' },
  'BeastID_Filter':          { strategy: 'excluded', reason: 'UI filter state' },
  'BeastID_KeyFile':         { strategy: 'excluded', reason: 'Master keyfile session state' },
  'BeastID_Proj_KeyFile':    { strategy: 'excluded', reason: 'Projection filter state' },
  'StockRecFilter':          { strategy: 'excluded', reason: 'UI filter state' },

  // Hardware/system config (not portable)
  'Com_Port_Settings':   { strategy: 'excluded', reason: 'Serial port hardware config' },
  'Computer_Names':      { strategy: 'excluded', reason: 'Legacy machine names' },
  'Database_Flags':      { strategy: 'excluded', reason: 'Source DB internal flags' },
  'DB_Description':      { strategy: 'excluded', reason: 'Source DB metadata' },
  'ScalesTypes':         { strategy: 'excluded', reason: 'Scale hardware config' },
  'Field_Names_Foreign_Conversion': { strategy: 'excluded', reason: 'UI field label mapping' },

  // Temp/staging tables
  'Drugs_Given_temp': { strategy: 'excluded', reason: 'Temporary staging table' },

  // UI graph cache
  'GraphImage': { strategy: 'excluded', reason: 'Cached graph image blob' },
  'GraphTable': { strategy: 'excluded', reason: 'Cached graph data' },

  // ══════════════════════════════════════════════════════
  // ──  Feed system / Bunk / Ration domain  ─────────────
  // ══════════════════════════════════════════════════════
  'Bunk_Code_Desc':                    { strategy: 'mapped', target: 'feed.bunk_code_desc' },
  'Bunk_Readings':                     { strategy: 'mapped', target: 'feed.bunk_readings' },
  'Dual_Ration_Feeding':               { strategy: 'mapped', target: 'feed.dual_ration_feeding' },
  'Feed_Month_End_date':               { strategy: 'mapped', target: 'feed.feed_month_end_date' },
  'Feeding_time_data':                 { strategy: 'mapped', target: 'feed.feeding_time_data' },
  'Feeding_Time_Taken_By_Ration_Type': { strategy: 'mapped', target: 'feed.feeding_time_taken_by_ration_type' },
  'GE150_Feeding_Details':             { strategy: 'mapped', target: 'feed.feeding_details' },
  'GE150_Feeding_Regimens':            { strategy: 'mapped', target: 'feed.feeding_regimens' },
  'L150_Feeding_Details':              { strategy: 'mapped', target: 'feed.feeding_details' },
  'L150_Feeding_Regimens':             { strategy: 'mapped', target: 'feed.feeding_regimens' },
  'NSA_Bunk_Data':                     { strategy: 'mapped', target: 'feed.nsa_bunk_data' },
  'Pen_and_Bunk_Cleaning':             { strategy: 'mapped', target: 'feed.pen_and_bunk_cleaning' },
  'Pen_and_Bunk_Cleaning_Master':      { strategy: 'mapped', target: 'feed.pen_and_bunk_cleaning' },
  'Pen_Feeding_Order_Params':          { strategy: 'mapped', target: 'feed.pen_feeding_order_params' },
  'Pen_Split_Rations':                 { strategy: 'mapped', target: 'feed.ration_regimes' },
  'PenFeedsData':                      { strategy: 'mapped', target: 'feed.penfeedsdata' },
  'Plateau_Feeding_Details':           { strategy: 'mapped', target: 'feed.feeding_details' },
  'Plateau_Feeding_Regimens':          { strategy: 'mapped', target: 'feed.feeding_regimens' },
  'Ration_Calc_Constants':             { strategy: 'mapped', target: 'feed.ration_calc_constants' },
  'Ration_Descriptions':               { strategy: 'mapped', target: 'feed.rations' },
  'Ration_Load_Sizes':                 { strategy: 'mapped', target: 'feed.ration_load_sizes' },
  'Ration_Recipe_Records':             { strategy: 'mapped', target: 'feed.ration_recipe_records' },
  'Ration_Regimes':                    { strategy: 'mapped', target: 'feed.ration_regimes' },
  'Ration_Types':                      { strategy: 'mapped', target: 'feed.ration_types' },
  'ShortFeed_Feeding_Details':         { strategy: 'mapped', target: 'feed.feeding_details' },
  'ShortFeed_Feeding_Regimens':        { strategy: 'mapped', target: 'feed.feeding_regimens' },
  'Titration_Ration_Regimes':          { strategy: 'mapped', target: 'feed.titration_ration_regimes' },
  'WAGYU_Feeding_Details':             { strategy: 'mapped', target: 'feed.feeding_details' },
  'WAGYU_Feeding_Regimens':            { strategy: 'mapped', target: 'feed.feeding_regimens' },

  // ══════════════════════════════════════════════════════
  // ──  Pen domain  ─────────────────────────────────────
  // ══════════════════════════════════════════════════════
  'Log_Pens_File':      { strategy: 'mapped', target: 'pen.log_pens_file' },
  'Pen_Cleaning_dates': { strategy: 'mapped', target: 'pen.pen_cleaning_dates' },
  'Pen_Print_Order':    { strategy: 'mapped', target: 'pen.pen_print_order' },
  'PenLaneOrder':       { strategy: 'mapped', target: 'pen.penlaneorder' },
  'Pens_File':          { strategy: 'mapped', target: 'pen.pens' },

  // ══════════════════════════════════════════════════════
  // ──  Commodity domain  ───────────────────────────────
  // ══════════════════════════════════════════════════════
  'Commodities':                   { strategy: 'mapped', target: 'commodity.commodities' },
  'CommodContracts':               { strategy: 'mapped', target: 'commodity.commodcontracts' },
  'CommodTrans':                   { strategy: 'mapped', target: 'commodity.commodtrans' },
  'Period_Stocks_Closing_Balance': { strategy: 'mapped', target: 'commodity.period_stocks_closing_balance' },

  // ══════════════════════════════════════════════════════
  // ──  Transport / Truck domain  ───────────────────────
  // ══════════════════════════════════════════════════════
  'Datakey_truck_allocation':  { strategy: 'mapped', target: 'transport.datakey_truck_allocation' },
  'DeliveryDockets':           { strategy: 'mapped', target: 'transport.deliverydockets' },
  'LoadDockages':              { strategy: 'mapped', target: 'transport.loaddockages' },
  'Location_Transactions':     { strategy: 'mapped', target: 'transport.location_transactions' },
  'Locations':                 { strategy: 'mapped', target: 'transport.locations' },
  'Manure_carting':            { strategy: 'mapped', target: 'transport.manure_carting' },
  'Manure_From_Locations':     { strategy: 'mapped', target: 'transport.manure_locations' },
  'Manure_To_Locations':       { strategy: 'mapped', target: 'transport.manure_locations' },
  'Truck_Load_variation_data': { strategy: 'mapped', target: 'transport.truck_load_variation_data' },
  'Truck_Loads':               { strategy: 'mapped', target: 'transport.truck_loads' },
  'Truck_names':               { strategy: 'mapped', target: 'transport.truck_names' },
  'TruckLoadChangesLog':       { strategy: 'mapped', target: 'transport.truckloadchangeslog' },
  'WbridgeCOMport':            { strategy: 'mapped', target: 'transport.wbridgecomport' },

  // ══════════════════════════════════════════════════════
  // ──  Digistar integration  ───────────────────────────
  // ══════════════════════════════════════════════════════
  'Digistar_Data_History':     { strategy: 'mapped', target: 'digistar.digistar_data_history' },
  'Digistar_Users':            { strategy: 'mapped', target: 'digistar.digistar_users' },

  // ══════════════════════════════════════════════════════
  // ──  Finance domain  ─────────────────────────────────
  // ══════════════════════════════════════════════════════
  'Costs_Feed_Detail':              { strategy: 'mapped', target: 'finance.costs_feed_detail' },
  'Overhead_application_history':   { strategy: 'mapped', target: 'finance.overhead_application_history' },
  'RCTI_payment_grid':              { strategy: 'mapped', target: 'finance.rcti_payment_grid' },
  'RV_RCTI_data':                   { strategy: 'mapped', target: 'finance.rv_rcti_data' },
  'TR_Payment_Breed_Adjust':        { strategy: 'mapped', target: 'finance.tr_payment_breed_adjust' },
  'TR_Payment_rates':               { strategy: 'mapped', target: 'finance.tr_payment_rates' },

  // ══════════════════════════════════════════════════════
  // ──  Carcase / Reporting  ────────────────────────────
  // ══════════════════════════════════════════════════════
  'Marbling_bonus':            { strategy: 'mapped', target: 'carcase.marbling_bonus' },
  'MRB_AVG_Supplier_Years':   { strategy: 'mapped', target: 'reporting.mrb_avg_supplier_years' },

  // ══════════════════════════════════════════════════════
  // ──  Cattle domain  ──────────────────────────────────
  // ══════════════════════════════════════════════════════
  'Despatched_RFIDs':          { strategy: 'mapped', target: 'cattle.despatched_rfids' },

  // ══════════════════════════════════════════════════════
  // ──  System / Lookups  ───────────────────────────────
  // ══════════════════════════════════════════════════════
  'Computer_Names_old':        { strategy: 'mapped', target: 'system.computer_names' },
  'Date_Design_Last_Updated':  { strategy: 'mapped', target: 'system.system_info' },
  'LoadDockageReasons':        { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'dockage_reason' },
  'Manure_Types':              { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'manure_type' },
  'MMEC_Table':                { strategy: 'mapped', target: 'system.mmec_table' },
  'PensFileIsOpen':            { strategy: 'mapped', target: 'system.database_flags' },
  'Reason_List':               { strategy: 'mapped', target: 'system.lookups', lookupCategory: 'reason_list' },
  'Transaction_Types':         { strategy: 'mapped', target: 'system.transaction_types' },

  // ══════════════════════════════════════════════════════
  // ──  Raw (data preserved, no structured v3 target)  ─
  // ══════════════════════════════════════════════════════
  'Beast_days_in_pen_for_period':    { strategy: 'raw', reason: 'Computed beast-days-in-pen cache' },
  'Pen_DOF':                         { strategy: 'raw', reason: 'Computed days-on-feed per pen' },
  'PenLaneOrder_old':                { strategy: 'raw', reason: 'Historical backup of PenLaneOrder' },
  'Pen_Print_Order_old':             { strategy: 'raw', reason: 'Historical backup of Pen_Print_Order' },

  // ══════════════════════════════════════════════════════
  // ──  Excluded — report caches, crosstabs, staging  ──
  // ══════════════════════════════════════════════════════
  'BeastID_Filter_BatchUpdate':      { strategy: 'excluded', reason: 'UI filter state' },
  'Bunk_Sheet_Report':               { strategy: 'excluded', reason: 'Report cache' },
  'Bunks1203-IDS':                   { strategy: 'excluded', reason: 'Barmount-specific table' },
  'CommodTrans_Crosstab_Kgs':       { strategy: 'excluded', reason: 'Crosstab cache' },
  'CommodTrans_Crosstab_val':       { strategy: 'excluded', reason: 'Crosstab cache' },
  'Costings_for_oracle':            { strategy: 'excluded', reason: 'Oracle export staging' },
  'Costs_Feed_Detail_tmp':          { strategy: 'excluded', reason: 'Temporary staging table' },
  'DeliveryDockets_basic':          { strategy: 'excluded', reason: 'Subset of DeliveryDockets' },
  'Digistar_Datakey_Import_Table':  { strategy: 'excluded', reason: 'Import staging table' },
  'Digistar_Import_Table':          { strategy: 'excluded', reason: 'Import staging table' },
  'DigistarExportDataFile':         { strategy: 'excluded', reason: 'Export staging table' },
  'DocketsApplied':                 { strategy: 'excluded', reason: 'Docket staging' },
  'Drug_Usage_Analysis':            { strategy: 'excluded', reason: 'Analysis report cache' },
  'Feed_Card_Report_Data':          { strategy: 'excluded', reason: 'Report cache' },
  'Feeding_Order_for_day':          { strategy: 'excluded', reason: 'Daily computed table — regenerated' },
  'Head_by_pen_Comparison':         { strategy: 'excluded', reason: 'Comparison report cache' },
  'List of_Devices to be made Inactive': { strategy: 'excluded', reason: 'Device management cache' },
  'Pen_CallWeight_date_snapshot':   { strategy: 'excluded', reason: 'Snapshot cache' },
  'Pen_Feeds_Tab':                  { strategy: 'excluded', reason: 'Temp UI tab data' },
  'Pen_Feeds_Temp':                 { strategy: 'excluded', reason: 'Temporary staging table' },
  'Pen_Feeds_Temp_Cycles':          { strategy: 'excluded', reason: 'Temporary staging table' },
  'PenRiders_Report':               { strategy: 'excluded', reason: 'Report cache' },
  'PensFedByDay1_CrossTab':         { strategy: 'excluded', reason: 'Crosstab cache' },
  'PensFedByDayRV1_CrossTab':       { strategy: 'excluded', reason: 'Crosstab cache' },
  'Period_Crosstab_Kgs':            { strategy: 'excluded', reason: 'Crosstab cache' },
  'Period_Crosstab_val':            { strategy: 'excluded', reason: 'Crosstab cache' },
  'RFIDs':                          { strategy: 'excluded', reason: 'Single-column list, no PK' },
  'Transmitted_Pens_Fed_Datalink':  { strategy: 'excluded', reason: 'Data link transmission cache' },
  'Transmitted_PensFed':            { strategy: 'excluded', reason: 'Transmission cache' },
  'Transmitted_Truck_Loads':        { strategy: 'excluded', reason: 'Transmission cache' },
  'Transmitted_Truck_Loads_Datalink': { strategy: 'excluded', reason: 'Data link transmission cache' },
  'Transmitted_Truckdata_Report':   { strategy: 'excluded', reason: 'Transmission report cache' },
  'Vet_Summary_report':             { strategy: 'excluded', reason: 'Report cache' },
};

/**
 * Wildcard patterns for dynamically-named per-user/per-machine tables.
 * Each client database may have different usernames, producing unique table names.
 * These are matched by regex when a table is not found in TABLE_CATEGORIES.
 */
const TABLE_PATTERNS = [
  { pattern: /^BatchUpdate_Keyfile_/i, strategy: 'excluded', reason: 'Per-user session keyfile' },
  { pattern: /^BeastID_Keyfile_/i, strategy: 'excluded', reason: 'Per-user session keyfile' },
];

/**
 * Get the strategy for a table.
 * Checks explicit entries first, then falls back to wildcard patterns.
 * @returns {{ strategy: 'mapped'|'raw'|'excluded', target?: string, reason?: string } | null}
 */
function getTableCategory(tableName) {
  if (TABLE_CATEGORIES[tableName]) return TABLE_CATEGORIES[tableName];
  for (const p of TABLE_PATTERNS) {
    if (p.pattern.test(tableName)) {
      return { strategy: p.strategy, reason: p.reason };
    }
  }
  return null;
}

/**
 * Return all table names grouped by strategy.
 */
function getCategorySummary() {
  const mapped = [], raw = [], excluded = [];
  for (const [table, info] of Object.entries(TABLE_CATEGORIES)) {
    if (info.strategy === 'mapped')   mapped.push(table);
    else if (info.strategy === 'raw') raw.push(table);
    else                              excluded.push(table);
  }
  return { mapped, raw, excluded };
}

module.exports = { TABLE_CATEGORIES, TABLE_PATTERNS, getTableCategory, getCategorySummary };
