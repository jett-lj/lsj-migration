/**
 * Categorisation of ALL 171 legacy CATTLE database tables.
 *
 * Every table is explicitly listed with a strategy:
 *   'mapped'   — has a structured mapping in mappings.js
 *   'raw'      — bulk-copied to legacy_raw as JSONB (data preserved, no transform)
 *   'excluded' — not migrated, with documented reason
 *
 * This guarantees zero silent data loss: any source table NOT listed here
 * triggers a hard error in the pre-flight audit.
 */
'use strict';

const TABLE_CATEGORIES = {
  // ── Mapped (structured migration) ──────────────────
  'Breeds':                 { strategy: 'mapped', target: 'breeds' },
  'FeedDB_Pens_File':       { strategy: 'mapped', target: 'pens' },
  'Contacts':               { strategy: 'mapped', target: 'contacts' },
  'Diseases':               { strategy: 'mapped', target: 'diseases' },
  'Drugs':                  { strategy: 'mapped', target: 'drugs' },
  'Cost_Codes':             { strategy: 'mapped', target: 'cost_codes' },
  'Market_Category':        { strategy: 'mapped', target: 'market_categories' },
  'Purchase_Lots':          { strategy: 'mapped', target: 'purchase_lots' },
  'Cattle':                 { strategy: 'mapped', target: 'cows' },
  'Weighing_Events':        { strategy: 'mapped', target: 'weighing_events' },
  'PensHistory':            { strategy: 'mapped', target: 'pen_movements' },
  'Drugs_Given':            { strategy: 'mapped', target: 'treatments' },
  'Costs':                  { strategy: 'mapped', target: 'costs' },
  'Sick_Beast_Records':     { strategy: 'mapped', target: 'health_records' },
  'Carcase_data':           { strategy: 'mapped', target: 'carcase_data' },
  'Autopsy_Records':        { strategy: 'mapped', target: 'autopsy_records' },
  'Vendor_Declarations':    { strategy: 'mapped', target: 'vendor_declarations' },
  'Drugs_Purchased':        { strategy: 'mapped', target: 'drug_purchases' },
  'Drug_Disposal':          { strategy: 'mapped', target: 'drug_disposals' },

  // ── Raw (JSONB bulk copy to legacy_raw) ────────────
  'Agistment_Transfer_Register': { strategy: 'mapped', target: 'agistment_transfers' },
  'Archiving_Log': { strategy: 'mapped', target: 'archives' },
  'Batch_Update_log': { strategy: 'mapped', target: 'batch_update_log' },
  'Beast_Accumed_Feed_by_commodity': { strategy: 'mapped', target: 'beast_feed_by_commodity' },
  'Beast_Breeding': { strategy: 'mapped', target: 'beast_breeding' },
  'Beast_Cull_Reasons': { strategy: 'mapped', target: 'cull_reasons' },
  'Beast_Ohead_Appl_History': { strategy: 'mapped', target: 'beast_overhead_history' },
  'Beast_Sale_Types_RV': { strategy: 'mapped', target: 'beast_sale_types' },
  'BeastMovement': { strategy: 'mapped', target: 'beast_movements' },
  'BodySystems': { strategy: 'mapped', target: 'body_systems' },
  'Breeding_Categories': { strategy: 'mapped', target: 'breeding_categories' },
  'Breeding_Dams': { strategy: 'mapped', target: 'breeding_dams' },
  'Breeding_Sires': { strategy: 'mapped', target: 'breeding_sires' },
  'Carc_Feedback_Compliance': { strategy: 'mapped', target: 'carcase_feedback_compliance' },
  'Carc_Feedback_Mth_Avgs': { strategy: 'mapped', target: 'carcase_feedback_monthly_avgs' },
  'Carc_Feedback_Report_data': { strategy: 'mapped', target: 'carcase_feedback_report_data' },
  'Carcase_DataType2': { strategy: 'excluded', reason: 'Unused alternative carcase schema (0 rows) — merged into carcase_data' },
  'Carcase_Grades': { strategy: 'mapped', target: 'carcase_grades' },
  'Carcase_Grades_US': { strategy: 'mapped', target: 'carcase_grades_us' },
  'Carcase_import_Data': { strategy: 'mapped', target: 'carcase_import_data' },
  'Carcase_Prices': { strategy: 'mapped', target: 'carcase_prices' },
  'Cattle_by_Location_Table': { strategy: 'mapped', target: 'cattle_by_location' },
  'Cattle_DOF_and_DIP': { strategy: 'mapped', target: 'cattle_dof_dip' },
  'Cattle_Feed_Update': { strategy: 'mapped', target: 'cattle_feed_updates' },
  'Cattle_Photos': { strategy: 'mapped', target: 'cattle_photos' },
  'Cattle_Program_Types': { strategy: 'mapped', target: 'cattle_program_types' },
  'Cattle_Query_Month_Report_TAB': { strategy: 'mapped', target: 'cattle_query_month_report' },
  'Cattle_Specs': { strategy: 'mapped', target: 'cattle_specs' },
  'CattleProcessed': { strategy: 'mapped', target: 'cattle_processed' },
  'Chemical_inventory': { strategy: 'mapped', target: 'chemical_inventory' },
  'Chemical_inventory_old': { strategy: 'mapped', target: 'chemical_inventory_old' },
  'Code_References_Index': { strategy: 'mapped', target: 'code_references' },
  'Company': { strategy: 'mapped', target: 'company' },
  'Company_Settings': { strategy: 'mapped', target: 'company_settings' },
  'ContactsContactTypes': { strategy: 'mapped', target: 'contacts_contact_types' },
  'ContactTypes': { strategy: 'mapped', target: 'contact_types' },
  'Cust_Feed_Charges': { strategy: 'mapped', target: 'custom_feed_charges' },
  'CustFeed_Invoices_list': { strategy: 'mapped', target: 'custom_feed_invoices' },
  'Custfeed_Lot_Summary': { strategy: 'mapped', target: 'custom_feed_lot_summary' },
  'Daily_Cattle_Inventory': { strategy: 'mapped', target: 'daily_cattle_inventory' },
  'Drug_Category': { strategy: 'mapped', target: 'drug_categories' },
  'Drug_HGP_Forms': { strategy: 'mapped', target: 'drug_hgp_forms' },
  'Drug_Stocktake_records': { strategy: 'mapped', target: 'drug_stocktake_records' },
  'Drug_Stocktakes': { strategy: 'mapped', target: 'drug_stocktakes' },
  'Drug_Transfer_Records': { strategy: 'mapped', target: 'drug_transfer_records' },
  'Drug_Transfers': { strategy: 'mapped', target: 'drug_transfers' },
  'Drugs_Purchase_event': { strategy: 'mapped', target: 'drug_purchase_events' },
  'Error_Log': { strategy: 'mapped', target: 'error_log' },
  'Feed_Commodity_names': { strategy: 'mapped', target: 'feed_commodity_names' },
  'Feed_Totals_By_Ration': { strategy: 'mapped', target: 'feed_totals_by_ration' },
  'Feedlot_Staff': { strategy: 'mapped', target: 'feedlot_staff' },
  'Grower_Groups': { strategy: 'mapped', target: 'grower_groups' },
  'Head_By_Disease': { strategy: 'mapped', target: 'head_by_disease' },
  'Instrument_Calibration_tests': { strategy: 'mapped', target: 'instrument_calibration_tests' },
  'Instruments_needing_Calibration': { strategy: 'mapped', target: 'instruments_needing_calibration' },
  'KD1_Records': { strategy: 'mapped', target: 'kd1_records' },
  'Last_7_Days_Pulls_Headcounts': { strategy: 'mapped', target: 'last_7_days_pulls' },
  'Livestock_Weighbridge_Dockets': { strategy: 'mapped', target: 'weighbridge_dockets' },
  'LocationTypes': { strategy: 'mapped', target: 'location_types' },
  'Month_End_StockOnHand': { strategy: 'mapped', target: 'month_end_stock_on_hand' },
  'Monthly_Adjustment_OB': { strategy: 'mapped', target: 'monthly_adjustment_ob' },
  'Monthly_Agistor_Movements': { strategy: 'mapped', target: 'monthly_agistor_movements' },
  'Monthly_Feedlot_Reconciliation': { strategy: 'mapped', target: 'monthly_feedlot_reconciliation' },
  'Monthly_FL_Intake_Cost': { strategy: 'mapped', target: 'monthly_fl_intake_cost' },
  'Monthly_Movements': { strategy: 'mapped', target: 'monthly_movements' },
  'Monthly_RV_Agist_Reconciliation': { strategy: 'mapped', target: 'monthly_rv_agist_reconciliation' },
  'Mort_Morb_triggers': { strategy: 'mapped', target: 'mort_morb_triggers' },
  'New_cattle_records_Log': { strategy: 'mapped', target: 'new_cattle_records_log' },
  'PackageCosts': { strategy: 'mapped', target: 'package_costs' },
  'Paddock_Feeding': { strategy: 'mapped', target: 'paddock_feeding' },
  'Pen_Data_From_FeedDB': { strategy: 'mapped', target: 'pen_data_from_feed_db' },
  'Pen_mort_morb_list': { strategy: 'mapped', target: 'pen_mort_morb' },
  'Pen_Rider_Tolerances': { strategy: 'mapped', target: 'pen_rider_tolerances' },
  'Pending_Feed_Data': { strategy: 'mapped', target: 'pending_feed_data' },
  'PenList_AsAt': { strategy: 'mapped', target: 'pen_list_snapshots' },
  'PenRiders_log': { strategy: 'mapped', target: 'pen_riders_log' },
  'PensFed': { strategy: 'mapped', target: 'pens_fed' },
  'Price_adjustment_by_weight_range': { strategy: 'mapped', target: 'price_adjustment_by_weight' },
  'Purch_Lot_Cattle': { strategy: 'mapped', target: 'purchase_lot_cattle' },
  'Purchase_Regions': { strategy: 'mapped', target: 'purchase_regions' },
  'Purchase_Totals': { strategy: 'mapped', target: 'purchase_totals' },
  'RationNames': { strategy: 'mapped', target: 'rations' },
  'Resp_Disease_ReTreats': { strategy: 'mapped', target: 'resp_disease_retreats' },
  'Rudd_800_Traits': { strategy: 'mapped', target: 'rudd_800_traits' },
  'RV_Scheduled_DOF': { strategy: 'mapped', target: 'rv_scheduled_dof' },
  'SB_Rec_No_Booked': { strategy: 'mapped', target: 'sb_rec_no_booked' },
  'SCU_RecData': { strategy: 'mapped', target: 'scu_rec_data' },
  'Sick_Beast_BRD_Symptoms': { strategy: 'mapped', target: 'sick_beast_brd_symptoms' },
  'Sick_Beast_Temperature': { strategy: 'mapped', target: 'sick_beast_temperatures' },
  'Sick_By_DOF': { strategy: 'mapped', target: 'sick_by_dof' },
  'Sickness_Result_Codes': { strategy: 'mapped', target: 'sickness_result_codes' },
  'Sickness_Result_Codes_RV': { strategy: 'mapped', target: 'sickness_result_codes' },
  'Sire_Lines': { strategy: 'mapped', target: 'sire_lines' },
  'SOH_by_Month': { strategy: 'mapped', target: 'stock_on_hand_monthly' },
  'StockRecData': { strategy: 'mapped', target: 'stock_rec_data' },
  'SubGroupNames': { strategy: 'mapped', target: 'sub_group_names' },
  'Tag_Bucket_File': { strategy: 'mapped', target: 'tag_bucket' },
  'TandR_Buying_details': { strategy: 'mapped', target: 'trading_buying_details' },
  'TandR_Costs_Report': { strategy: 'mapped', target: 'trading_costs_report' },
  'Tax_Invoice_Bank_details': { strategy: 'mapped', target: 'tax_invoice_bank_details' },
  'Treatment_Regimes': { strategy: 'mapped', target: 'treatment_regimes' },
  'Trial_Description': { strategy: 'mapped', target: 'trials' },
  'User_Log_Ons': { strategy: 'mapped', target: 'user_logons' },
  'Weighing_Types': { strategy: 'mapped', target: 'weighing_types' },
  'Weighing_Types_RV': { strategy: 'mapped', target: 'weighing_types' },

  // ── Excluded (not migrated — documented reasons) ───
  'Location_Changes':                    { strategy: 'excluded', reason: 'Not used — 0 rows, no target table' },
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
};

/**
 * Get the strategy for a table.
 * @returns {{ strategy: 'mapped'|'raw'|'excluded', target?: string, reason?: string } | null}
 */
function getTableCategory(tableName) {
  return TABLE_CATEGORIES[tableName] || null;
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

module.exports = { TABLE_CATEGORIES, getTableCategory, getCategorySummary };
