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
  'Location_Changes':       { strategy: 'mapped', target: 'location_changes' },
  'Drugs_Purchased':        { strategy: 'mapped', target: 'drug_purchases' },
  'Drug_Disposal':          { strategy: 'mapped', target: 'drug_disposals' },

  // ── Raw (JSONB bulk copy to legacy_raw) ────────────
  'Agistment_Transfer_Register':   { strategy: 'raw' },
  'Archiving_Log':                 { strategy: 'raw' },
  'Batch_Update_log':              { strategy: 'raw' },
  'Beast_Accumed_Feed_by_commodity': { strategy: 'raw' },
  'Beast_Breeding':                { strategy: 'raw' },
  'Beast_Cull_Reasons':            { strategy: 'raw' },
  'Beast_Ohead_Appl_History':      { strategy: 'raw' },
  'Beast_Sale_Types_RV':           { strategy: 'raw' },
  'BeastMovement':                 { strategy: 'raw' },
  'BodySystems':                   { strategy: 'raw' },
  'Breeding_Categories':           { strategy: 'raw' },
  'Breeding_Dams':                 { strategy: 'raw' },
  'Breeding_Sires':                { strategy: 'raw' },
  'Carc_Feedback_Compliance':      { strategy: 'raw' },
  'Carc_Feedback_Mth_Avgs':        { strategy: 'raw' },
  'Carc_Feedback_Report_data':     { strategy: 'raw' },
  'Carcase_DataType2':             { strategy: 'raw' },
  'Carcase_Grades':                { strategy: 'raw' },
  'Carcase_Grades_US':             { strategy: 'raw' },
  'Carcase_import_Data':           { strategy: 'raw' },
  'Carcase_Prices':                { strategy: 'raw' },
  'Cattle_by_Location_Table':      { strategy: 'raw' },
  'Cattle_DOF_and_DIP':            { strategy: 'raw' },
  'Cattle_Feed_Update':            { strategy: 'raw' },
  'Cattle_Photos':                 { strategy: 'raw', note: 'IMAGE column excluded from JSONB; re-import manually' },
  'Cattle_Program_Types':          { strategy: 'raw' },
  'Cattle_Query_Month_Report_TAB': { strategy: 'raw' },
  'Cattle_Specs':                  { strategy: 'raw' },
  'CattleProcessed':               { strategy: 'raw' },
  'Chemical_inventory':            { strategy: 'raw' },
  'Chemical_inventory_old':        { strategy: 'raw' },
  'Code_References_Index':         { strategy: 'raw' },
  'Company':                       { strategy: 'raw' },
  'Company_Settings':              { strategy: 'raw' },
  'ContactsContactTypes':          { strategy: 'raw' },
  'ContactTypes':                  { strategy: 'raw' },
  'Cust_Feed_Charges':             { strategy: 'raw' },
  'CustFeed_Invoices_list':        { strategy: 'raw' },
  'Custfeed_Lot_Summary':          { strategy: 'raw' },
  'Daily_Cattle_Inventory':        { strategy: 'raw' },
  'Drug_Category':                 { strategy: 'raw' },
  'Drug_HGP_Forms':                { strategy: 'raw' },
  'Drug_Stocktake_records':        { strategy: 'raw' },
  'Drug_Stocktakes':               { strategy: 'raw' },
  'Drug_Transfer_Records':         { strategy: 'raw' },
  'Drug_Transfers':                { strategy: 'raw' },
  'Drugs_Purchase_event':          { strategy: 'raw' },
  'Error_Log':                     { strategy: 'raw' },
  'Feed_Commodity_names':          { strategy: 'raw' },
  'Feed_Totals_By_Ration':         { strategy: 'raw' },
  'Feedlot_Staff':                 { strategy: 'raw' },
  'Grower_Groups':                 { strategy: 'raw' },
  'Head_By_Disease':               { strategy: 'raw' },
  'Instrument_Calibration_tests':  { strategy: 'raw' },
  'Instruments_needing_Calibration': { strategy: 'raw' },
  'KD1_Records':                   { strategy: 'raw' },
  'Last_7_Days_Pulls_Headcounts':  { strategy: 'raw' },
  'Livestock_Weighbridge_Dockets': { strategy: 'raw' },
  'LocationTypes':                 { strategy: 'raw' },
  'Month_End_StockOnHand':         { strategy: 'raw' },
  'Monthly_Adjustment_OB':         { strategy: 'raw' },
  'Monthly_Agistor_Movements':     { strategy: 'raw' },
  'Monthly_Feedlot_Reconciliation': { strategy: 'raw' },
  'Monthly_FL_Intake_Cost':        { strategy: 'raw' },
  'Monthly_Movements':             { strategy: 'raw' },
  'Monthly_RV_Agist_Reconciliation': { strategy: 'raw' },
  'Mort_Morb_triggers':            { strategy: 'raw' },
  'New_cattle_records_Log':        { strategy: 'raw' },
  'PackageCosts':                  { strategy: 'raw' },
  'Paddock_Feeding':               { strategy: 'raw' },
  'Pen_Data_From_FeedDB':          { strategy: 'raw' },
  'Pen_mort_morb_list':            { strategy: 'raw' },
  'Pen_Rider_Tolerances':          { strategy: 'raw' },
  'Pending_Feed_Data':             { strategy: 'raw' },
  'PenList_AsAt':                  { strategy: 'raw' },
  'PenRiders_log':                 { strategy: 'raw' },
  'PensFed':                       { strategy: 'raw' },
  'Price_adjustment_by_weight_range': { strategy: 'raw' },
  'Purch_Lot_Cattle':              { strategy: 'raw' },
  'Purchase_Regions':              { strategy: 'raw' },
  'Purchase_Totals':               { strategy: 'raw' },
  'RationNames':                   { strategy: 'raw' },
  'Resp_Disease_ReTreats':         { strategy: 'raw' },
  'Rudd_800_Traits':               { strategy: 'raw' },
  'RV_Scheduled_DOF':              { strategy: 'raw' },
  'SB_Rec_No_Booked':              { strategy: 'raw' },
  'SCU_RecData':                   { strategy: 'raw' },
  'Sick_Beast_BRD_Symptoms':       { strategy: 'raw' },
  'Sick_Beast_Temperature':        { strategy: 'raw' },
  'Sick_By_DOF':                   { strategy: 'raw' },
  'Sickness_Result_Codes':         { strategy: 'raw' },
  'Sickness_Result_Codes_RV':      { strategy: 'raw' },
  'Sire_Lines':                    { strategy: 'raw' },
  'SOH_by_Month':                  { strategy: 'raw' },
  'StockRecData':                  { strategy: 'raw' },
  'SubGroupNames':                 { strategy: 'raw' },
  'Tag_Bucket_File':               { strategy: 'raw' },
  'TandR_Buying_details':          { strategy: 'raw' },
  'TandR_Costs_Report':            { strategy: 'raw' },
  'Tax_Invoice_Bank_details':      { strategy: 'raw' },
  'Treatment_Regimes':             { strategy: 'raw' },
  'Trial_Description':             { strategy: 'raw' },
  'User_Log_Ons':                  { strategy: 'raw' },
  'Weighing_Types':                { strategy: 'raw' },
  'Weighing_Types_RV':             { strategy: 'raw' },

  // ── Excluded (not migrated — documented reasons) ───
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
