/**
 * Table mapping definitions — how legacy SQL Server tables map to PostgreSQL.
 *
 * Each mapping defines:
 *   sourceTable  — the SQL Server table name
 *   targetTable  — the PostgreSQL table name
 *   query        — SELECT query to read from source (can include JOINs / filtering)
 *   columns      — array of { source, target, transform? } column mappings
 *   order        — migration order (lower = first, for FK dependencies)
 *   validate     — optional row-level validation function
 */
'use strict';

// ── Helpers ──────────────────────────────────────────

/** Convert SQL Server bit/varchar(1) booleans to JS booleans */
function toBool(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v === '1' || v.toUpperCase() === 'Y' || v.toUpperCase() === 'TRUE';
  return false;
}

/** Trim strings, collapse empty to null, strip null bytes (invalid in PG text) */
function trimOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\0/g, '').trim();
  return s.length > 0 ? s : null;
}

/** Pass through binary/Buffer data for BYTEA columns, null if empty */
function toBytea(v) {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return v.length > 0 ? v : null;
  return null;
}

/** Parse SQL Server datetime to ISO string or null */
function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Parse numeric, return null for NaN / null */
function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Parse numeric FK id, treat 0 as null (legacy default for "no reference") */
function toFkId(v) {
  const n = toNum(v);
  return n === 0 ? null : n;
}

/** Normalise legacy time strings to HH:MM:SS for PostgreSQL TIME columns.
 *  Handles: "18.00" → "18:00:00", "4;00" → "04:00:00", "14:30" → "14:30:00" */
function toTime(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s.length === 0) return null;
  // Replace common separators (. ; ,) with :
  s = s.replace(/[.;,]/g, ':');
  // Split into parts
  const parts = s.split(':').map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length < 2) return null;
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  const ss = (parts[2] || '00').padStart(2, '0');
  // Validate ranges
  const h = Number(hh), m = Number(mm), sec = Number(ss);
  if (isNaN(h) || isNaN(m) || isNaN(sec) || h > 23 || m > 59 || sec > 59) return null;
  return `${hh}:${mm}:${ss}`;
}

/** Map legacy sex values ('S','H','B','C','M','F' etc.) to 'male'/'female' */
function mapSex(v) {
  if (!v) return 'female';
  const s = String(v).toUpperCase().trim();
  if (['S', 'B', 'M'].includes(s)) return 'male';   // Steer / Bull / Male
  return 'female';
}

/** Derive cow status from legacy flags */
function deriveCowStatus(row) {
  if (toBool(row.Died)) return 'died';
  const saleDate = toDate(row.Sale_Date);
  if (saleDate && saleDate > '1901-01-01') return 'sold';
  const archDate = toDate(row.Date_Archived);
  if (archDate && archDate > '1901-01-01') return 'archived';
  return 'active';
}

/** Map legacy weighing types to new enum */
function mapWeighType(v) {
  const n = Number(v);
  // Legacy: 1=intake, 2=interim, 3=exit/sale; default to interim
  if (n === 1) return 'intake';
  if (n === 3) return 'exit';
  if (n === 4) return 'sale';
  return 'interim';
}

/** Map legacy Rev_Exp code to revenue/expense */
function mapCostType(v) {
  if (!v) return 'expense';
  return String(v).toUpperCase() === 'R' ? 'revenue' : 'expense';
}

/** Junk breed names that should be excluded from migration */
const JUNK_BREEDS = new Set(['Breed Name']);

/** Map legacy contact type to new enum */
function mapContactType(v) {
  if (!v) return 'other';
  const s = String(v).toLowerCase().trim();
  if (s.includes('vendor') || s === 'v') return 'vendor';
  if (s.includes('agent') || s === 'a') return 'agent';
  if (s.includes('buyer') || s === 'b') return 'buyer';
  if (s.includes('abattoir') || s.includes('meatwork')) return 'abattoir';
  if (s.includes('carrier') || s.includes('transport')) return 'carrier';
  return 'other';
}

// ── Mapping definitions ─────────────────────────────

const mappings = [
  // ---- Order 10: Lookup tables (no dependencies) ----
  {
    order: 10,
    sourceTable: 'Breeds',
    targetTable: 'system.lookups',
    query: 'SELECT Breed_Code, Breed_Name FROM dbo.Breeds ORDER BY Breed_Code',
    columns: [
      { source: 'Breed_Code', target: 'code' },
      { source: 'Breed_Name', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'breed' },
    validate: (row) => row.name !== null && !JUNK_BREEDS.has(row.name),
  },

  {
    order: 10,
    sourceTable: 'Breeds',
    targetTable: 'cattle.breeds',
    query: 'SELECT Breed_Name FROM dbo.Breeds WHERE Breed_Name IS NOT NULL ORDER BY Breed_Code',
    columns: [
      { source: 'Breed_Name', target: 'name', transform: trimOrNull },
    ],
    validate: (row) => row.name !== null && !JUNK_BREEDS.has(row.name),
  },

  {
    order: 10,
    sourceTable: 'FeedDB_Pens_File',
    targetTable: 'feed.feeddb_pens_file',
    query: 'SELECT Pen_name, IsPaddock, Include_in_Pen_List, Current_exit_pen FROM dbo.FeedDB_Pens_File ORDER BY Pen_name',
    columns: [
      { source: 'Pen_name',           target: 'pen_name',            transform: trimOrNull },
      { source: 'IsPaddock',          target: 'ispaddock',            transform: toBool },
      { source: 'Include_in_Pen_List', target: 'include_in_pen_list', transform: toBool },
      { source: 'Current_exit_pen',   target: 'current_exit_pen',     transform: trimOrNull },
    ],
    validate: (row) => row.pen_name !== null,
  },

  {
    order: 10,
    sourceTable: 'Contacts',
    targetTable: 'contacts.contacts',
    query: `SELECT Contact_ID, Company, Last_Name, First_Name, Salutation,
                   Address_1, Address_2, City, State, PostCode,
                   Tel_No, Mobile_No, Fax_No, Email,
                   Contact_Type, Tail_Tag_No, Brand, Notes, ABN,
                   Bank_BSB, Bank_AC, Days_invoice_due,
                   Agistment_Paddock_Rate, Agistment_Feedlot_Rate,
                   Invoice_careof, brand_drawing_filename,
                   Abattoir_Establishment_Number, Last_Modified_timestamp
            FROM dbo.Contacts
            ORDER BY Contact_ID`,
    columns: [
      { source: 'Contact_ID',    target: 'contact_id' },
      { source: 'Company',       target: 'company',               transform: trimOrNull },
      { source: 'First_Name',    target: 'first_name',            transform: trimOrNull },
      { source: 'Last_Name',     target: 'last_name',             transform: trimOrNull },
      { source: 'Salutation',    target: 'salutation',            transform: trimOrNull },
      { source: 'Address_1',     target: 'address_1',             transform: trimOrNull },
      { source: 'Address_2',     target: 'address_2',             transform: trimOrNull },
      { source: 'City',          target: 'city',                  transform: trimOrNull },
      { source: 'State',         target: 'state',                 transform: trimOrNull },
      { source: 'PostCode',      target: 'postcode',              transform: trimOrNull },
      { source: 'Tel_No',        target: 'tel_no',                transform: trimOrNull },
      { source: 'Mobile_No',     target: 'mobile_no',             transform: trimOrNull },
      { source: 'Fax_No',        target: 'fax_no',                transform: trimOrNull },
      { source: 'Email',         target: 'email',                 transform: trimOrNull },
      { source: 'Contact_Type',  target: 'contact_type',          transform: toNum },
      { source: 'Tail_Tag_No',   target: 'tail_tag_no',           transform: trimOrNull },
      { source: 'Brand',         target: 'brand',                 transform: trimOrNull },
      { source: 'Notes',         target: 'notes',                 transform: trimOrNull },
      { source: 'ABN',           target: 'abn',                   transform: trimOrNull },
      { source: 'Bank_BSB',      target: 'bank_bsb',              transform: trimOrNull },
      { source: 'Bank_AC',       target: 'bank_ac',               transform: trimOrNull },
      { source: 'Days_invoice_due', target: 'days_invoice_due',   transform: toNum },
      { source: 'Agistment_Paddock_Rate', target: 'agistment_paddock_rate', transform: toNum },
      { source: 'Agistment_Feedlot_Rate', target: 'agistment_feedlot_rate', transform: toNum },
      { source: 'Invoice_careof', target: 'invoice_careof',       transform: trimOrNull },
      { source: 'brand_drawing_filename', target: 'brand_drawing_filename', transform: trimOrNull },
      { source: 'Abattoir_Establishment_Number', target: 'abattoir_establishment_number', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
  },

  {
    order: 10,
    sourceTable: 'Diseases',
    targetTable: 'health.diseases',
    query: `SELECT Disease_ID, Disease_Name, Symptoms, Treatment,
                   Recoverable, BodySystemID, PenApp_Disease_name,
                   Autopsy_disease, No_longer_used
            FROM dbo.Diseases
            ORDER BY Disease_ID`,
    columns: [
      { source: 'Disease_ID',         target: 'disease_id' },
      { source: 'Disease_Name',       target: 'disease_name',    transform: trimOrNull },
      { source: 'Symptoms',           target: 'symptoms',        transform: trimOrNull },
      { source: 'Treatment',          target: 'treatment',       transform: trimOrNull },
      { source: 'No_longer_used',     target: 'no_longer_used',  transform: toBool },
      { source: 'Recoverable',        target: 'recoverable',     transform: toBool },
      { source: 'BodySystemID',       target: 'bodysystemid',    transform: toNum },
      { source: 'PenApp_Disease_name', target: 'penapp_disease_name', transform: trimOrNull },
      { source: 'Autopsy_disease',    target: 'autopsy_disease', transform: toBool },
    ],
    validate: (row) => row.disease_name !== null,
  },

  {
    order: 10,
    sourceTable: 'Drugs',
    targetTable: 'health.drugs',
    query: `SELECT Drug_ID,
                   CASE WHEN COUNT(*) OVER (PARTITION BY LTRIM(RTRIM(Drug_Name))) > 1
                        THEN LTRIM(RTRIM(ISNULL(Drug_Name, 'Unknown'))) + ' (ID:' + CAST(Drug_ID AS VARCHAR) + ')'
                        ELSE ISNULL(LTRIM(RTRIM(Drug_Name)), 'Unknown Drug ' + CAST(Drug_ID AS VARCHAR))
                   END AS Drug_Name,
                   Units, Cost_per_unit,
                   WithHold_days_1, WithHold_days_ESI,
                   WithHold_days_3, WithHold_days_4,
                   HGP, Antibiotic, Supplier, Inactive,
                   Notes, Drug_Category, Admin_units,
                   Admin_weight_Factor, Current_Batch_Numb,
                   Cost_per_Unit_CF, Chemical_Mg_per_Ml,
                   Reorder_SOH_units_trigger, Units_per_BoxOrBottle,
                   Units_on_hand, Last_Modified_timestamp
            FROM dbo.Drugs
            ORDER BY Drug_ID`,
    columns: [
      { source: 'Drug_ID',         target: 'drug_id' },
      { source: 'Drug_Name',       target: 'name',                  transform: trimOrNull },
      { source: 'Drug_Name',       target: 'drug_name',             transform: trimOrNull },
      { source: 'Units',           target: 'units',                 transform: trimOrNull },
      { source: 'Cost_per_unit',   target: 'cost_per_unit',         transform: toNum },
      { source: 'WithHold_days_1', target: 'withhold_days_1',       transform: toNum },
      { source: 'WithHold_days_ESI', target: 'withhold_days_esi',   transform: toNum },
      { source: 'WithHold_days_3', target: 'withhold_days_3',       transform: toNum },
      { source: 'WithHold_days_4', target: 'withhold_days_4',       transform: toNum },
      { source: 'HGP',             target: 'hgp',                   transform: toBool },
      { source: 'Antibiotic',      target: 'antibiotic',            transform: toBool },
      { source: 'Supplier',        target: 'supplier',              transform: trimOrNull },
      { source: 'Inactive',        target: 'inactive',              transform: toBool },
      { source: 'Notes',           target: 'notes',                 transform: trimOrNull },
      { source: 'Drug_Category',   target: 'drug_category',         transform: toNum },
      { source: 'Admin_units',     target: 'admin_units',           transform: trimOrNull },
      { source: 'Admin_weight_Factor', target: 'admin_weight_factor', transform: toNum },
      { source: 'Current_Batch_Numb', target: 'current_batch_numb', transform: trimOrNull },
      { source: 'Cost_per_Unit_CF', target: 'cost_per_unit_cf',     transform: toNum },
      { source: 'Chemical_Mg_per_Ml', target: 'chemical_mg_per_ml', transform: toNum },
      { source: 'Reorder_SOH_units_trigger', target: 'reorder_soh_units_trigger', transform: toNum },
      { source: 'Units_per_BoxOrBottle', target: 'units_per_boxorbottle', transform: toNum },
      { source: 'Units_on_hand',   target: 'units_on_hand',         transform: toNum },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
    validate: (row) => row.drug_name !== null,
  },

  {
    order: 10,
    sourceTable: 'Cost_Codes',
    targetTable: 'finance.cost_codes',
    query: `SELECT RevExp_Code, RevExp_Desc, Rev_Exp,
                   Include_in_Landed_Cost, Include_in_PL_expenses,
                   Include_on_CF_Invoice
            FROM dbo.Cost_Codes
            ORDER BY RevExp_Code`,
    columns: [
      { source: 'RevExp_Code', target: 'revexp_code' },
      { source: 'RevExp_Desc', target: 'revexp_desc',          transform: trimOrNull },
      { source: 'Rev_Exp',     target: 'rev_exp',              transform: trimOrNull },
      { source: 'Include_in_Landed_Cost', target: 'include_in_landed_cost', transform: toBool },
      { source: 'Include_in_PL_expenses', target: 'include_in_pl_expenses', transform: toBool },
      { source: 'Include_on_CF_Invoice',  target: 'include_on_cf_invoice',  transform: toBool },
    ],
    validate: (row) => row.revexp_desc !== null,
  },

  {
    order: 10,
    sourceTable: 'Market_Category',
    targetTable: 'cattle.market_categories',
    query: `SELECT Market_Cat_ID, Market_Category, Min_DOF,
                   Predicted_dressing_pcnt, HGP_Free, Dispatch_Notes
            FROM dbo.Market_Category
            ORDER BY Market_Cat_ID`,
    columns: [
      { source: 'Market_Cat_ID',    target: 'market_cat_id' },
      { source: 'Market_Category',  target: 'market_category',        transform: trimOrNull },
      { source: 'Min_DOF',          target: 'min_dof',                transform: toNum },
      { source: 'HGP_Free',         target: 'hgp_free',               transform: toBool },
      { source: 'Predicted_dressing_pcnt', target: 'predicted_dressing_pcnt', transform: toNum },
      { source: 'Dispatch_Notes',   target: 'dispatch_notes',         transform: trimOrNull },
    ],
    validate: (row) => row.name !== null,
  },

  // ---- Order 20: Purchase lots (depends on contacts) ----
  {
    order: 20,
    sourceTable: 'Purchase_Lots',
    targetTable: 'purchasing.purchase_lots',
    query: `SELECT ID,
                   CASE WHEN LTRIM(RTRIM(ISNULL(Lot_Number, ''))) = ''
                        THEN 'LEGACY-' + CAST(ID AS VARCHAR)
                        ELSE Lot_Number
                   END AS Lot_Number,
                   Purchase_date, Vendor_ID, Agent_Code, Agent,
                   Number_Head, Total_Weight, Cost_of_Cattle,
                   Cattle_Freight_Cost, Lot_Notes,
                   WBridge_Docket, DPI_Charges, Destination,
                   Agistor_Code, Cattle_Invoice_No, Invoice_Amount,
                   Date_Cattle_Inv_Approved, Carrier,
                   Freight_Invoice_No, Date_Frght_Inv_Approved,
                   Buyer_Commiss_per_Head, Buying_Fee,
                   Other_Buying_Costs, Buyer,
                   Purchase_Region, Risk_factor,
                   Custom_Feed_Lot, Feed_Charge_per_Ton,
                   Cattle_Owner_ID, Agist_Rate_per_day,
                   Weigh_bridge_weight, Market_Category,
                   Weighbridge_Charges, Is_Financed, Finance_Rate,
                   GrowerGroupCode, Applied_To_Cattle_File,
                   NVD_scan_filename, Weigh_ticket_scan_filename,
                   Optional_scan_filename1, Optional_scan_filename2,
                   Marbling_bonus_lot, Last_Modified_timestamp
            FROM dbo.Purchase_Lots
            ORDER BY ID`,
    columns: [
      { source: 'Lot_Number',          target: 'lot_number',              transform: trimOrNull },
      { source: 'Purchase_date',       target: 'purchase_date',           transform: toDate },
      { source: 'Vendor_ID',           target: 'vendor_id',              transform: toFkId },
      { source: 'Agent_Code',          target: 'agent_code',             transform: toFkId },
      { source: 'Agent',               target: 'agent',                  transform: trimOrNull },
      { source: 'Number_Head',         target: 'number_head',            transform: toNum },
      { source: 'Total_Weight',        target: 'total_weight',           transform: toNum },
      { source: 'Cost_of_Cattle',      target: 'cost_of_cattle',         transform: toNum },
      { source: 'Cattle_Freight_Cost', target: 'cattle_freight_cost',    transform: toNum },
      { source: 'Lot_Notes',           target: 'lot_notes',              transform: trimOrNull },
      { source: 'WBridge_Docket',      target: 'wbridge_docket',         transform: trimOrNull },
      { source: 'DPI_Charges',         target: 'dpi_charges',            transform: toNum },
      { source: 'Destination',         target: 'destination',            transform: trimOrNull },
      { source: 'Agistor_Code',        target: 'agistor_code',           transform: toFkId },
      { source: 'Cattle_Invoice_No',   target: 'cattle_invoice_no',      transform: trimOrNull },
      { source: 'Invoice_Amount',      target: 'invoice_amount',         transform: toNum },
      { source: 'Date_Cattle_Inv_Approved', target: 'date_cattle_inv_approved', transform: toDate },
      { source: 'Carrier',             target: 'carrier',                transform: trimOrNull },
      { source: 'Freight_Invoice_No',  target: 'freight_invoice_no',     transform: trimOrNull },
      { source: 'Date_Frght_Inv_Approved', target: 'date_frght_inv_approved', transform: toDate },
      { source: 'Buyer_Commiss_per_Head', target: 'buyer_commiss_per_head', transform: toNum },
      { source: 'Buying_Fee',          target: 'buying_fee',             transform: toNum },
      { source: 'Other_Buying_Costs',  target: 'other_buying_costs',     transform: toNum },
      { source: 'Buyer',               target: 'buyer',                  transform: toFkId },
      { source: 'Purchase_Region',     target: 'purchase_region',        transform: toNum },
      { source: 'Risk_factor',         target: 'risk_factor',            transform: toNum },
      { source: 'Custom_Feed_Lot',     target: 'custom_feed_lot',        transform: toBool },
      { source: 'Feed_Charge_per_Ton', target: 'feed_charge_per_ton',    transform: toNum },
      { source: 'Cattle_Owner_ID',     target: 'cattle_owner_id',        transform: toNum },
      { source: 'Agist_Rate_per_day',  target: 'agist_rate_per_day',     transform: toNum },
      { source: 'Weigh_bridge_weight', target: 'weigh_bridge_weight',    transform: toNum },
      { source: 'Market_Category',     target: 'market_category',        transform: toNum },
      { source: 'Weighbridge_Charges', target: 'weighbridge_charges',    transform: toNum },
      { source: 'Is_Financed',         target: 'is_financed',            transform: toBool },
      { source: 'Finance_Rate',        target: 'finance_rate',           transform: toNum },
      { source: 'GrowerGroupCode',     target: 'growergroupcode',        transform: toNum },
      { source: 'Applied_To_Cattle_File', target: 'applied_to_cattle_file', transform: toBool },
      { source: 'NVD_scan_filename',   target: 'nvd_scan_filename',      transform: trimOrNull },
      { source: 'Weigh_ticket_scan_filename', target: 'weigh_ticket_scan_filename', transform: trimOrNull },
      { source: 'Optional_scan_filename1', target: 'optional_scan_filename1', transform: trimOrNull },
      { source: 'Optional_scan_filename2', target: 'optional_scan_filename2', transform: trimOrNull },
      { source: 'Marbling_bonus_lot',  target: 'marbling_bonus_lot',     transform: toBool },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
    validate: (row) => row.lot_number !== null,
  },

  // ---- Order 30: Core cattle ----
  {
    order: 30,
    sourceTable: 'Cattle',
    targetTable: 'cattle.cows',
    query: `;WITH ranked AS (
              SELECT *,
                     ROW_NUMBER() OVER (
                       PARTITION BY BeastID
                       ORDER BY Feedlot_Entry_Date DESC, Start_Date DESC
                     ) AS _rn
              FROM dbo.Cattle
            )
            SELECT BeastID, Ear_Tag, EID, Breed, Sex, HGP, Died,
                   Start_Date, Start_Weight, Sale_Date, Sale_Weight,
                   DOB, Feedlot_Entry_Date, Feedlot_Entry_Wght,
                   Pen_Number, Notes, Purch_Lot_No, Date_Archived,
                   Tail_Tag, Vendor_Ear_Tag, Group_Name, Sub_Group,
                   Background_Doll_per_Kg, BG_Fee, Teeth,
                   WHold_Until, Date_died, Sire_Tag, Dam_Tag,
                   Off_Feed, In_Hospital, Buller, Non_Performer,
                   Frame_Size, Custom_Feeder, DOF_in_prev_FL,
                   Market_Category, Cull_Reason, Agist_Lot_No,
                   Current_LocType_ID, Old_RFID, Date_RFID_Changed,
                   Trial_No_ID, NFAS_Decl_Numb, GrowerGroupCode,
                   Date_culled, Agistment_PIC, Blood_vial_number,
                   AP_Lot, LifeTime_Traceable, Pregnant,
                   Planned_kill_date, Beast_Sale_Type_ID,
                   ESI_Whold_until, PregTested, CustomFeedOwnerID,
                   Species, NLIS_tag_fail_at_induction,
                   DNA_or_Blood_Number, DOF_scheduled,
                   EU, EU_Dec_No, Paddock_Tag, Outgoing_NVD,
                   Agisted_animal, VendorID, AgentID,
                   Bovilus_Shots, Program_ID,
                   Abattoir_Culled, Abattoir_Condemned,
                   Lot_closeout_date, Vendor_Treated_Bovilus,
                   Agist_Charged_Up_To_Date,
                   last_oracle_costs, last_oracle_date,
                   Marbling_bonus_lot, Last_Modified_timestamp
            FROM ranked WHERE _rn = 1
            ORDER BY BeastID`,
    countQuery: `SELECT COUNT(DISTINCT BeastID) AS cnt FROM dbo.Cattle`,
    columns: [
      { source: 'BeastID',             target: 'legacy_beast_id' },
      { source: 'Ear_Tag',             target: 'ear_tag',                 transform: trimOrNull },
      { source: 'EID',                 target: 'eid',                     transform: trimOrNull },
      { source: 'Breed',               target: 'breed',                   transform: toNum },
      { source: 'Sex',                 target: 'sex',                     transform: mapSex },
      { source: 'HGP',                 target: 'hgp',                     transform: toBool },
      { source: 'Died',                target: 'died',                    transform: toBool },
      { source: 'Feedlot_Entry_Date',  target: 'feedlot_entry_date',      transform: toDate },
      { source: 'Feedlot_Entry_Wght',  target: 'feedlot_entry_wght',      transform: toNum },
      { source: 'Sale_Date',           target: 'sale_date',               transform: (v) => { const d = toDate(v); return d && d > '1901-01-01' ? d : null; } },
      { source: 'Sale_Weight',         target: 'sale_weight',             transform: toNum },
      { source: 'DOB',                 target: 'dob',                     transform: toDate },
      { source: 'Start_Date',          target: 'start_date',              transform: toDate },
      { source: 'Start_Weight',        target: 'start_weight',            transform: toNum },
      { source: 'Pen_Number',          target: 'pen_number',              transform: trimOrNull },
      { source: 'Notes',               target: 'notes',                   transform: trimOrNull },
      { source: 'Purch_Lot_No',        target: 'purch_lot_no',            transform: trimOrNull },
      { source: 'Date_Archived',       target: 'date_archived',           transform: toDate },
      { source: 'Tail_Tag',            target: 'tail_tag',                transform: trimOrNull },
      { source: 'Vendor_Ear_Tag',      target: 'vendor_ear_tag',          transform: trimOrNull },
      { source: 'Group_Name',          target: 'group_name',              transform: trimOrNull },
      { source: 'Sub_Group',           target: 'sub_group',               transform: trimOrNull },
      { source: 'Background_Doll_per_Kg', target: 'background_doll_per_kg', transform: toNum },
      { source: 'BG_Fee',              target: 'bg_fee',                  transform: toNum },
      { source: 'Teeth',               target: 'teeth',                   transform: toNum },
      { source: 'WHold_Until',         target: 'whold_until',             transform: toDate },
      { source: 'Date_died',           target: 'date_died',               transform: toDate },
      { source: 'Sire_Tag',            target: 'sire_tag',                transform: trimOrNull },
      { source: 'Dam_Tag',             target: 'dam_tag',                 transform: trimOrNull },
      { source: 'Off_Feed',            target: 'off_feed',                transform: toBool },
      { source: 'In_Hospital',         target: 'in_hospital',             transform: toBool },
      { source: 'Buller',              target: 'buller',                  transform: toBool },
      { source: 'Non_Performer',       target: 'non_performer',           transform: toBool },
      { source: 'Frame_Size',          target: 'frame_size',              transform: trimOrNull },
      { source: 'Custom_Feeder',       target: 'custom_feeder',           transform: toBool },
      { source: 'DOF_in_prev_FL',      target: 'dof_in_prev_fl',         transform: toNum },
      { source: 'Market_Category',     target: 'market_category',         transform: toNum },
      { source: 'Cull_Reason',         target: 'cull_reason',             transform: toNum },
      { source: 'Agist_Lot_No',        target: 'agist_lot_no',            transform: trimOrNull },
      { source: 'Current_LocType_ID',  target: 'current_loctype_id',      transform: toNum },
      { source: 'Old_RFID',            target: 'old_rfid',                transform: trimOrNull },
      { source: 'Date_RFID_Changed',   target: 'date_rfid_changed',       transform: toDate },
      { source: 'Trial_No_ID',         target: 'trial_no_id',             transform: toNum },
      { source: 'NFAS_Decl_Numb',      target: 'nfas_decl_numb',          transform: trimOrNull },
      { source: 'GrowerGroupCode',     target: 'growergroupcode',         transform: toNum },
      { source: 'Date_culled',         target: 'date_culled',             transform: toDate },
      { source: 'Agistment_PIC',       target: 'agistment_pic',           transform: trimOrNull },
      { source: 'Blood_vial_number',   target: 'blood_vial_number',       transform: trimOrNull },
      { source: 'AP_Lot',              target: 'ap_lot',                  transform: trimOrNull },
      { source: 'LifeTime_Traceable',  target: 'lifetime_traceable',      transform: toBool },
      { source: 'Pregnant',            target: 'pregnant',                transform: toBool },
      { source: 'Planned_kill_date',   target: 'planned_kill_date',       transform: toDate },
      { source: 'Beast_Sale_Type_ID',  target: 'beast_sale_type_id',      transform: toNum },
      { source: 'ESI_Whold_until',     target: 'esi_whold_until',         transform: toDate },
      { source: 'PregTested',          target: 'pregtested',              transform: toBool },
      { source: 'CustomFeedOwnerID',   target: 'customfeedownerid',       transform: toNum },
      { source: 'Species',             target: 'species',                 transform: trimOrNull },
      { source: 'NLIS_tag_fail_at_induction', target: 'nlis_tag_fail_at_induction', transform: toBool },
      { source: 'DNA_or_Blood_Number', target: 'dna_or_blood_number',     transform: trimOrNull },
      { source: 'DOF_scheduled',       target: 'dof_scheduled',           transform: toNum },
      { source: 'EU',                  target: 'eu',                      transform: toBool },
      { source: 'EU_Dec_No',           target: 'eu_dec_no',               transform: trimOrNull },
      { source: 'Paddock_Tag',         target: 'paddock_tag',             transform: trimOrNull },
      { source: 'Outgoing_NVD',        target: 'outgoing_nvd',            transform: trimOrNull },
      { source: 'Agisted_animal',      target: 'agisted_animal',          transform: toBool },
      { source: 'VendorID',            target: 'vendorid',                transform: toNum },
      { source: 'AgentID',             target: 'agentid',                 transform: toNum },
      { source: 'Bovilus_Shots',       target: 'bovilus_shots',           transform: toNum },
      { source: 'Program_ID',          target: 'program_id',              transform: toNum },
      { source: 'Abattoir_Culled',     target: 'abattoir_culled',         transform: toBool },
      { source: 'Abattoir_Condemned',  target: 'abattoir_condemned',      transform: toBool },
      { source: 'Lot_closeout_date',   target: 'lot_closeout_date',       transform: toDate },
      { source: 'Vendor_Treated_Bovilus', target: 'vendor_treated_bovilus', transform: toBool },
      { source: 'Agist_Charged_Up_To_Date', target: 'agist_charged_up_to_date', transform: toDate },
      { source: 'last_oracle_costs',   target: 'last_oracle_costs',       transform: toNum },
      { source: 'last_oracle_date',    target: 'last_oracle_date',        transform: toDate },
      { source: 'Marbling_bonus_lot',  target: 'marbling_bonus_lot',      transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
    transformRow(rawRow, row, lookups) {
      const breedCode = rawRow.Breed;
      const map = lookups.breedMap || {};
      const name = map[breedCode] || map[String(breedCode)] || null;
      row.breed = name && !JUNK_BREEDS.has(name) ? name : null;
    },
  },

  // ---- Order 40: Dependent event tables ----
  {
    order: 40,
    sourceTable: 'Weighing_Events',
    targetTable: 'weighing.weighing_events',
    query: `SELECT BeastID, Weighing_Type, Weigh_date, Weight, P8_Fat, Weigh_Note,
                   Ear_Tag, Days_Owned, TimeWeighed, Agistor_ID,
                   BE_Agist_Lot_No, Cull_Reason_ID, Beast_Sale_Type_ID,
                   To_Locn_Type_ID, User_Initials, Last_Modified_timestamp
            FROM dbo.Weighing_Events
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',            target: 'beastid' },
      { source: 'Weighing_Type',      target: 'weighing_type',      transform: toNum },
      { source: 'Weigh_date',         target: 'weigh_date',         transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Weight',             target: 'weight',             transform: toNum },
      { source: 'P8_Fat',             target: 'p8_fat',             transform: toNum },
      { source: 'Weigh_Note',         target: 'weigh_note',         transform: trimOrNull },
      { source: 'Ear_Tag',            target: 'ear_tag',            transform: trimOrNull },
      { source: 'Days_Owned',         target: 'days_owned',         transform: toNum },
      { source: 'TimeWeighed',        target: 'timeweighed',        transform: trimOrNull },
      { source: 'Agistor_ID',         target: 'agistor_id',         transform: toNum },
      { source: 'BE_Agist_Lot_No',    target: 'be_agist_lot_no',    transform: trimOrNull },
      { source: 'Cull_Reason_ID',     target: 'cull_reason_id',     transform: toNum },
      { source: 'Beast_Sale_Type_ID', target: 'beast_sale_type_id', transform: toNum },
      { source: 'To_Locn_Type_ID',    target: 'to_locn_type_id',    transform: toNum },
      { source: 'User_Initials',      target: 'user_initials',      transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
    validate: (row) => row.weight !== null,
  },

  {
    order: 40,
    sourceTable: 'PensHistory',
    targetTable: 'pen.penshistory',
    query: `SELECT BeastID, MoveDate, Pen, Last_Modified_timestamp
            FROM dbo.PensHistory
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',  target: 'beastid' },
      { source: 'MoveDate', target: 'movedate', transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Pen',      target: 'pen', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Drugs_Given',
    targetTable: 'health.drugs_given',
    query: `SELECT BeastID, Ear_Tag_No, Drug_ID, Batch_No, Date_Given,
                   Time_Given, Units_Given, Drug_Cost, Withold_Until,
                   Date_next_Dose, SB_Rec_No, WithHold_date_ESI,
                   User_Initials, Where_given, Last_Modified_timestamp
            FROM dbo.Drugs_Given
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',        target: 'beastid' },
      { source: 'Drug_ID',        target: 'drug_id',            transform: toFkId },
      { source: 'Units_Given',    target: 'units_given',        transform: (v) => { const n = toNum(v); return (n !== null && n < 0) ? null : n; } },
      { source: 'Date_Given',     target: 'date_given',         transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Withold_Until',  target: 'withold_until',      transform: toDate },
      { source: 'SB_Rec_No',      target: 'sb_rec_no',          transform: toNum },
      { source: 'User_Initials',  target: 'user_initials',      transform: trimOrNull },
      { source: 'Ear_Tag_No',     target: 'ear_tag_no',         transform: trimOrNull },
      { source: 'Batch_No',       target: 'batch_no',           transform: trimOrNull },
      { source: 'Time_Given',     target: 'time_given',         transform: trimOrNull },
      { source: 'Drug_Cost',      target: 'drug_cost',          transform: toNum },
      { source: 'Date_next_Dose', target: 'date_next_dose',     transform: toDate },
      { source: 'WithHold_date_ESI', target: 'withhold_date_esi', transform: toDate },
      { source: 'Where_given',    target: 'where_given',        transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Costs',
    targetTable: 'finance.costs',
    query: `SELECT BeastID, Ear_Tag, RevExp_Code, Trans_Date,
                   Rev_Exp_per_Unit, Units, Extended_RevExp,
                   Ration, Last_Modified_timestamp
            FROM dbo.Costs
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',       target: 'beastid' },
      { source: 'RevExp_Code',   target: 'revexp_code',        transform: toNum },
      { source: 'Trans_Date',    target: 'trans_date',         transform: toDate },
      { source: 'Rev_Exp_per_Unit', target: 'rev_exp_per_unit', transform: toNum },
      { source: 'Units',         target: 'units',              transform: (v) => toNum(v) ?? 1 },
      { source: 'Extended_RevExp', target: 'extended_revexp',   transform: toNum },
      { source: 'Ear_Tag',       target: 'ear_tag',            transform: trimOrNull },
      { source: 'Ration',        target: 'ration',             transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
    validate: (row) => row.extended_revexp !== null,
  },

  {
    order: 39,
    sourceTable: 'Sick_Beast_Records',
    targetTable: 'health.sick_beast_records',
    query: `SELECT Beast_ID, Ear_Tag_No, Date_Diagnosed, Disease_ID,
                   Diagnosed_By, Sick_Beast_Notes, Date_Recovered_Died, Result_Code,
                   SB_Rec_No, Severity_Level, WHold_Until,
                   Date_to_sick_Pen, Sick_Pen_Number,
                   Date_Back_To_Pen, Back_To_Pen_Number,
                   Hosp_Tag_Number, RatType, Pen_Where_Found_Sick,
                   Euthanased, Too_Far_Gone,
                   Insurance_Claim, Insurance_value, Insurance_paid,
                   DOF_when_sick, Diagnoser_Empl_ID, User_Initials,
                   CustomFeedOwnerID, Purch_Lot_No,
                   Cause_of_Death, Autopsied, Last_Modified_timestamp
            FROM dbo.Sick_Beast_Records
            ORDER BY SB_Rec_No`,
    columns: [
      { source: 'Beast_ID',          target: 'beast_id',               transform: toNum },
      { source: 'Date_Diagnosed',    target: 'date_diagnosed',         transform: toDate },
      { source: 'Diagnosed_By',      target: 'diagnosed_by',           transform: trimOrNull },
      { source: 'Sick_Beast_Notes',  target: 'sick_beast_notes',       transform: trimOrNull },
      { source: 'Disease_ID',        target: 'disease_id',             transform: toFkId },
      { source: 'Date_Recovered_Died', target: 'date_recovered_died',  transform: toDate },
      { source: 'Result_Code',       target: 'result_code',            transform: trimOrNull },
      { source: 'SB_Rec_No',         target: 'sb_rec_no' },
      { source: 'Ear_Tag_No',        target: 'ear_tag_no',             transform: trimOrNull },
      { source: 'Severity_Level',    target: 'severity_level',         transform: toNum },
      { source: 'WHold_Until',       target: 'whold_until',            transform: toDate },
      { source: 'Date_to_sick_Pen',  target: 'date_to_sick_pen',       transform: toDate },
      { source: 'Sick_Pen_Number',   target: 'sick_pen_number',        transform: trimOrNull },
      { source: 'Date_Back_To_Pen',  target: 'date_back_to_pen',       transform: toDate },
      { source: 'Back_To_Pen_Number', target: 'back_to_pen_number',    transform: trimOrNull },
      { source: 'Hosp_Tag_Number',   target: 'hosp_tag_number',        transform: trimOrNull },
      { source: 'RatType',           target: 'rattype',                transform: trimOrNull },
      { source: 'Pen_Where_Found_Sick', target: 'pen_where_found_sick', transform: trimOrNull },
      { source: 'Euthanased',        target: 'euthanased',             transform: toBool },
      { source: 'Too_Far_Gone',      target: 'too_far_gone',           transform: toBool },
      { source: 'Insurance_Claim',   target: 'insurance_claim',        transform: toBool },
      { source: 'Insurance_value',   target: 'insurance_value',        transform: toNum },
      { source: 'Insurance_paid',    target: 'insurance_paid',         transform: toBool },
      { source: 'DOF_when_sick',     target: 'dof_when_sick',          transform: toNum },
      { source: 'Diagnoser_Empl_ID', target: 'diagnoser_empl_id',     transform: toNum },
      { source: 'User_Initials',     target: 'user_initials',          transform: trimOrNull },
      { source: 'CustomFeedOwnerID', target: 'customfeedownerid',      transform: toNum },
      { source: 'Purch_Lot_No',      target: 'purch_lot_no',           transform: trimOrNull },
      { source: 'Cause_of_Death',    target: 'cause_of_death',         transform: trimOrNull },
      { source: 'Autopsied',         target: 'autopsied',              transform: toBool },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
    validate: (row) => row.date_diagnosed !== null,
  },

  // ---- Order 50: Additional data tables (new) ----

  {
    order: 50,
    sourceTable: 'Carcase_data',
    targetTable: 'carcase.carcase_data',
    query: `SELECT Beast_ID, Ear_Tag_No, EID, Sold_To, Abattoir, Body_Number,
                   Kill_Date, Carc_Wght_left, Carc_Wght_right, Dress_Pcnt,
                   Teeth, Grade, [Price_$/Kg_Left], [Price_$/Kg_Right],
                   P8_fat, Rib_fat, Mscle_Score, Eye_Mscle_Area, PH_level,
                   Marbling, Fat_Colour, Mscle_Colour, Meat_Texture, Meat_Yield,
                   Contract_No, Bruising_L, Bruising_R, [$/Kg_Deduction],
                   Dockage_Reason, Live_Weight_Shrink_Pcnt, Ossification,
                   MSA_Index, Hump_cold, Boning_Group, Beast_Sale_Type, Boning_date,
                   Marbling_Category, Marbling2, Firmness, Pricing_Method,
                   ChillerNumber, Sold_To_Contact_ID, Abattoir_ID,
                   Loin_temp, Carc_damage_L, Carc_damage_R,
                   Marbling_bonus_rate, RCInvoice_Date, Marbling_bonus_value,
                   Hump_Height, MEQMSA, MEQAUSMRB,
                   Abattoir_Establishment_Number, Last_Modified_timestamp
            FROM dbo.Carcase_data
            ORDER BY Beast_ID`,
    columns: [
      { source: 'Beast_ID',          target: 'beast_id',               transform: toNum },
      { source: 'Ear_Tag_No',        target: 'ear_tag_no',             transform: trimOrNull },
      { source: 'EID',               target: 'eid',                    transform: trimOrNull },
      { source: 'Sold_To',           target: 'sold_to',                transform: trimOrNull },
      { source: 'Abattoir',          target: 'abattoir',               transform: trimOrNull },
      { source: 'Body_Number',       target: 'body_number',            transform: trimOrNull },
      { source: 'Kill_Date',         target: 'kill_date',              transform: toDate },
      { source: 'Carc_Wght_left',    target: 'carc_wght_left',         transform: toNum },
      { source: 'Carc_Wght_right',   target: 'carc_wght_right',        transform: toNum },
      { source: 'Dress_Pcnt',        target: 'dress_pcnt',             transform: toNum },
      { source: 'Teeth',             target: 'teeth',                  transform: toNum },
      { source: 'Grade',             target: 'grade',                  transform: trimOrNull },
      { source: 'Price_$/Kg_Left',   target: 'price_doll_kg_left',     transform: toNum },
      { source: 'Price_$/Kg_Right',  target: 'price_doll_kg_right',    transform: toNum },
      { source: 'P8_fat',            target: 'p8_fat',                 transform: toNum },
      { source: 'Rib_fat',           target: 'rib_fat',                transform: toNum },
      { source: 'Mscle_Score',       target: 'mscle_score',            transform: trimOrNull },
      { source: 'Eye_Mscle_Area',    target: 'eye_mscle_area',         transform: toNum },
      { source: 'PH_level',          target: 'ph_level',               transform: toNum },
      { source: 'Marbling',          target: 'marbling',               transform: toNum },
      { source: 'Fat_Colour',        target: 'fat_colour',             transform: toNum },
      { source: 'Mscle_Colour',      target: 'mscle_colour',           transform: trimOrNull },
      { source: 'Meat_Texture',      target: 'meat_texture',           transform: toNum },
      { source: 'Meat_Yield',        target: 'meat_yield',             transform: toNum },
      { source: 'Contract_No',       target: 'contract_no',            transform: trimOrNull },
      { source: 'Bruising_L',        target: 'bruising_l',             transform: trimOrNull },
      { source: 'Bruising_R',        target: 'bruising_r',             transform: trimOrNull },
      { source: '$/Kg_Deduction',    target: 'doll_kg_deduction',      transform: toNum },
      { source: 'Dockage_Reason',    target: 'dockage_reason',         transform: trimOrNull },
      { source: 'Live_Weight_Shrink_Pcnt', target: 'live_weight_shrink_pcnt', transform: toNum },
      { source: 'Ossification',      target: 'ossification',           transform: toNum },
      { source: 'MSA_Index',         target: 'msa_index',              transform: toNum },
      { source: 'Hump_cold',         target: 'hump_cold',              transform: toNum },
      { source: 'Boning_Group',      target: 'boning_group',           transform: trimOrNull },
      { source: 'Beast_Sale_Type',   target: 'beast_sale_type',        transform: toNum },
      { source: 'Boning_date',       target: 'boning_date',            transform: toDate },
      { source: 'Marbling_Category', target: 'marbling_category',      transform: trimOrNull },
      { source: 'Marbling2',         target: 'marbling2',              transform: toNum },
      { source: 'Firmness',          target: 'firmness',               transform: trimOrNull },
      { source: 'Pricing_Method',    target: 'pricing_method',         transform: trimOrNull },
      { source: 'ChillerNumber',     target: 'chiller_number',         transform: trimOrNull },
      { source: 'Sold_To_Contact_ID', target: 'sold_to_contact_id',    transform: toFkId },
      { source: 'Abattoir_ID',       target: 'abattoir_id',            transform: toFkId },
      { source: 'Loin_temp',         target: 'loin_temp',              transform: toNum },
      { source: 'Carc_damage_L',     target: 'carc_damage_l',          transform: trimOrNull },
      { source: 'Carc_damage_R',     target: 'carc_damage_r',          transform: trimOrNull },
      { source: 'Marbling_bonus_rate', target: 'marbling_bonus_rate',  transform: toNum },
      { source: 'RCInvoice_Date',    target: 'rcinvoice_date',         transform: toDate },
      { source: 'Marbling_bonus_value', target: 'marbling_bonus_value', transform: toNum },
      { source: 'Hump_Height',       target: 'hump_height',            transform: toNum },
      { source: 'MEQMSA',            target: 'meqmsa',                 transform: toNum },
      { source: 'MEQAUSMRB',         target: 'meqausmrb',              transform: toNum },
      { source: 'Abattoir_Establishment_Number', target: 'abattoir_establishment_number', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
  },

  {
    order: 50,
    sourceTable: 'Autopsy_Records',
    targetTable: 'health.autopsy_records',
    query: `SELECT SB_Rec_No, Beast_ID, Ear_Tag_No, Date_Dead, Time_Dead, Date_Autopsy,
                   Autopsy_By, Pre_Autopsy_Diag, Post_Autopsy_Diag, Notes,
                   Nostrils_Erosions, Nostrils_Fluid, Nostrils_Froth,
                   Larynx_Normal, Larynx_Necrotic,
                   Trachea_Erosions, Tarchea_Fluid, Trachea_Froth,
                   Chest_Fluid, Chest_Fibrin, Chest_Adhesions,
                   Lungs_Spongy, Lungs_Firm, Lungs_Consolidate, Lungs_Abscess, Lungs_not_Collapsed,
                   Heart_Fluid, Heart_Haemorrhages,
                   Abdomen_Fluid, Abdomen_Fibrin, Abdomen_Adhesions,
                   Liver_Abscess, Liver_Cysts, Liver_Colour,
                   Rumen_Full, Rumen_Empty,
                   Intest_Normal, Intest_Red, Intest_Dark,
                   Kidneys_Abscess, Kidneys_Cyst, Kidneys_Calculi,
                   Bladder_Intact, Bladder_Ruptured, Bladder_Calculi,
                   Muscle_Bruising, Muscle_Abscess,
                   Legs_Bruising, Legs_Abscess,
                   Body_Cond_Fresh, Body_Cond_Bloated, Body_Cond_Putrid
            FROM dbo.Autopsy_Records
            ORDER BY SB_Rec_No`,
    columns: [
      { source: 'SB_Rec_No',        target: 'sb_rec_no' },
      { source: 'Beast_ID',         target: 'beast_id' },
      { source: 'Ear_Tag_No',       target: 'ear_tag_no',        transform: trimOrNull },
      { source: 'Date_Dead',        target: 'date_dead',         transform: toDate },
      { source: 'Time_Dead',        target: 'time_dead',         transform: trimOrNull },
      { source: 'Date_Autopsy',     target: 'date_autopsy',      transform: toDate },
      { source: 'Autopsy_By',       target: 'autopsy_by',        transform: trimOrNull },
      { source: 'Pre_Autopsy_Diag', target: 'pre_autopsy_diag',  transform: trimOrNull },
      { source: 'Post_Autopsy_Diag', target: 'post_autopsy_diag', transform: trimOrNull },
      { source: 'Notes',            target: 'notes',             transform: trimOrNull },
      { source: 'Nostrils_Erosions', target: 'nostrils_erosions', transform: toBool },
      { source: 'Nostrils_Fluid',   target: 'nostrils_fluid',    transform: toBool },
      { source: 'Nostrils_Froth',   target: 'nostrils_froth',    transform: toBool },
      { source: 'Larynx_Normal',    target: 'larynx_normal',     transform: toBool },
      { source: 'Larynx_Necrotic',  target: 'larynx_necrotic',   transform: toBool },
      { source: 'Trachea_Erosions', target: 'trachea_erosions',  transform: toBool },
      { source: 'Tarchea_Fluid',    target: 'tarchea_fluid',     transform: toBool },
      { source: 'Trachea_Froth',    target: 'trachea_froth',     transform: toBool },
      { source: 'Chest_Fluid',      target: 'chest_fluid',       transform: toBool },
      { source: 'Chest_Fibrin',     target: 'chest_fibrin',      transform: toBool },
      { source: 'Chest_Adhesions',  target: 'chest_adhesions',   transform: toBool },
      { source: 'Lungs_Spongy',     target: 'lungs_spongy',      transform: toBool },
      { source: 'Lungs_Firm',       target: 'lungs_firm',        transform: toBool },
      { source: 'Lungs_Consolidate', target: 'lungs_consolidate', transform: toBool },
      { source: 'Lungs_Abscess',    target: 'lungs_abscess',     transform: toBool },
      { source: 'Lungs_not_Collapsed', target: 'lungs_not_collapsed', transform: toBool },
      { source: 'Heart_Fluid',      target: 'heart_fluid',       transform: toBool },
      { source: 'Heart_Haemorrhages', target: 'heart_haemorrhages', transform: toBool },
      { source: 'Abdomen_Fluid',    target: 'abdomen_fluid',     transform: toBool },
      { source: 'Abdomen_Fibrin',   target: 'abdomen_fibrin',    transform: toBool },
      { source: 'Abdomen_Adhesions', target: 'abdomen_adhesions', transform: toBool },
      { source: 'Liver_Abscess',    target: 'liver_abscess',     transform: toBool },
      { source: 'Liver_Cysts',      target: 'liver_cysts',       transform: toBool },
      { source: 'Liver_Colour',     target: 'liver_colour',      transform: trimOrNull },
      { source: 'Rumen_Full',       target: 'rumen_full',        transform: toBool },
      { source: 'Rumen_Empty',      target: 'rumen_empty',       transform: toBool },
      { source: 'Intest_Normal',    target: 'intest_normal',     transform: toBool },
      { source: 'Intest_Red',       target: 'intest_red',        transform: toBool },
      { source: 'Intest_Dark',      target: 'intest_dark',       transform: toBool },
      { source: 'Kidneys_Abscess',  target: 'kidneys_abscess',   transform: toBool },
      { source: 'Kidneys_Cyst',     target: 'kidneys_cyst',      transform: toBool },
      { source: 'Kidneys_Calculi',  target: 'kidneys_calculi',   transform: toBool },
      { source: 'Bladder_Intact',   target: 'bladder_intact',    transform: toBool },
      { source: 'Bladder_Ruptured', target: 'bladder_ruptured',  transform: toBool },
      { source: 'Bladder_Calculi',  target: 'bladder_calculi',   transform: toBool },
      { source: 'Muscle_Bruising',  target: 'muscle_bruising',   transform: toBool },
      { source: 'Muscle_Abscess',   target: 'muscle_abscess',    transform: toBool },
      { source: 'Legs_Bruising',    target: 'legs_bruising',     transform: toBool },
      { source: 'Legs_Abscess',     target: 'legs_abscess',      transform: toBool },
      { source: 'Body_Cond_Fresh',  target: 'body_cond_fresh',   transform: toBool },
      { source: 'Body_Cond_Bloated', target: 'body_cond_bloated', transform: toBool },
      { source: 'Body_Cond_Putrid', target: 'body_cond_putrid',  transform: toBool },
    ],
  },

  {
    order: 50,
    sourceTable: 'Vendor_Declarations',
    targetTable: 'feed.vendor_declarations',
    query: `SELECT Vendor_Dec_Number, Owner_Contact_ID, Form_Date,
                   Number_Cattle, Cattle_Description, Tail_Tag,
                   RFIDs_in_cattle, HGP_Treated, QA_program, QA_Program_details,
                   Born_on_Vend_prop, Owned_LT_2months, Owned_2_6_months,
                   Owned_6_12_months, Owned_GT_12_months,
                   Fed_stockfeeds, Chem_Res_restriction,
                   Withholding_for_drugs, Withholding_for_feed,
                   Endosulfan_exposure, Endosulfan_Date,
                   Fed_Animal_Fats, Additional_info
            FROM dbo.Vendor_Declarations
            ORDER BY ID`,
    columns: [
      { source: 'Vendor_Dec_Number', target: 'vendor_dec_number', transform: trimOrNull },
      { source: 'Owner_Contact_ID',  target: 'owner_contact_id',  transform: toFkId },
      { source: 'Form_Date',         target: 'form_date',         transform: toDate },
      { source: 'Number_Cattle',     target: 'number_cattle',     transform: toNum },
      { source: 'Cattle_Description', target: 'cattle_description', transform: trimOrNull },
      { source: 'Tail_Tag',          target: 'tail_tag',          transform: trimOrNull },
      { source: 'RFIDs_in_cattle',   target: 'rfids_in_cattle',   transform: toBool },
      { source: 'HGP_Treated',       target: 'hgp_treated',       transform: toBool },
      { source: 'QA_program',        target: 'qa_program',         transform: toBool },
      { source: 'QA_Program_details', target: 'qa_program_details', transform: trimOrNull },
      { source: 'Born_on_Vend_prop', target: 'born_on_vend_prop', transform: toBool },
      { source: 'Owned_LT_2months', target: 'owned_lt_2months',  transform: toBool },
      { source: 'Owned_2_6_months', target: 'owned_2_6_months',  transform: toBool },
      { source: 'Owned_6_12_months', target: 'owned_6_12_months', transform: toBool },
      { source: 'Owned_GT_12_months', target: 'owned_gt_12_months', transform: toBool },
      { source: 'Fed_stockfeeds',    target: 'fed_stockfeeds',    transform: toBool },
      { source: 'Chem_Res_restriction', target: 'chem_res_restriction', transform: toBool },
      { source: 'Withholding_for_drugs', target: 'withholding_for_drugs', transform: toBool },
      { source: 'Withholding_for_feed',  target: 'withholding_for_feed',  transform: toBool },
      { source: 'Endosulfan_exposure', target: 'endosulfan_exposure', transform: toBool },
      { source: 'Endosulfan_Date',   target: 'endosulfan_date',   transform: toDate },
      { source: 'Fed_Animal_Fats',   target: 'fed_animal_fats',   transform: toBool },
      { source: 'Additional_info',   target: 'additional_info',   transform: trimOrNull },
    ],
  },

  {
    order: 50,
    sourceTable: 'Drugs_Purchased',
    targetTable: 'health.drugs_purchased',
    query: `SELECT Receival_ID, DrugID, Quantity_received, Batch_number, Expiry_date, Drug_cost
            FROM dbo.Drugs_Purchased
            ORDER BY ID`,
    columns: [
      { source: 'DrugID',            target: 'drugid',              transform: toFkId },
      { source: 'Quantity_received', target: 'quantity_received',    transform: toNum },
      { source: 'Batch_number',      target: 'batch_number',        transform: trimOrNull },
      { source: 'Expiry_date',       target: 'expiry_date',         transform: toDate },
      { source: 'Drug_cost',         target: 'drug_cost',           transform: toNum },
      { source: 'Receival_ID',       target: 'receival_id',         transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Drug_Disposal',
    targetTable: 'health.drug_disposals',
    query: `SELECT Disposal_ID, DrugID, Number_disposed, Date_disposed,
                   Disposal_reason, Disposal_method, Disposed_by, Notes,
                   Applied_to_Inventory
            FROM dbo.Drug_Disposal
            ORDER BY Disposal_ID`,
    columns: [
      { source: 'DrugID',              target: 'drugid',               transform: toFkId },
      { source: 'Number_disposed',     target: 'number_disposed',      transform: toNum },
      { source: 'Date_disposed',       target: 'date_disposed',        transform: toDate },
      { source: 'Disposal_reason',     target: 'disposal_reason',      transform: trimOrNull },
      { source: 'Disposal_method',     target: 'disposal_method',      transform: trimOrNull },
      { source: 'Disposed_by',         target: 'disposed_by',          transform: trimOrNull },
      { source: 'Notes',               target: 'notes',                transform: trimOrNull },
      { source: 'Disposal_ID',         target: 'disposal_id',          transform: toNum },
      { source: 'Applied_to_Inventory', target: 'applied_to_inventory', transform: toBool },
    ],
  },

  // ── Section 2: Legacy raw tables (structured migration) ──

  {
    order: 10,
    sourceTable: 'Beast_Cull_Reasons',
    targetTable: 'cattle.cull_reasons',
    query: `SELECT Cull_Reason_ID, Cull_Reason, PayRate_per_Kg, Induction_cull, Later_cull
            FROM dbo.Beast_Cull_Reasons
            ORDER BY Cull_Reason_ID`,
    columns: [
      { source: 'Cull_Reason_ID', target: 'cull_reason_id', transform: toNum },
      { source: 'Cull_Reason', target: 'cull_reason', transform: trimOrNull },
      { source: 'PayRate_per_Kg', target: 'payrate_per_kg', transform: toNum },
      { source: 'Induction_cull', target: 'induction_cull', transform: toBool },
      { source: 'Later_cull', target: 'later_cull', transform: toBool },
    ],
  },

  {
    order: 10,
    sourceTable: 'Beast_Sale_Types_RV',
    targetTable: 'system.lookups',
    lookupCategory: 'beast_sale_type',
    query: `SELECT Sale_Type_ID, Sale_Type
            FROM dbo.Beast_Sale_Types_RV
            ORDER BY Sale_Type_ID`,
    columns: [
      { source: 'Sale_Type_ID', target: 'code', transform: toNum },
      { source: 'Sale_Type', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'beast_sale_type' },
  },

  {
    order: 10,
    sourceTable: 'BodySystems',
    targetTable: 'system.lookups',
    lookupCategory: 'body_system',
    query: `SELECT BS_ID, BodySystem
            FROM dbo.BodySystems
            ORDER BY BS_ID`,
    columns: [
      { source: 'BS_ID', target: 'code', transform: toNum },
      { source: 'BodySystem', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'body_system' },
  },

  {
    order: 10,
    sourceTable: 'Breeding_Categories',
    targetTable: 'system.lookups',
    lookupCategory: 'breeding_category',
    query: `SELECT Breed_Category_ID, Breed_Category, Breed_Category_Desc
            FROM dbo.Breeding_Categories
            ORDER BY Breed_Category_ID`,
    columns: [
      { source: 'Breed_Category_ID', target: 'code', transform: toNum },
      { source: 'Breed_Category', target: 'name', transform: trimOrNull },
      { source: 'Breed_Category_Desc', target: 'description', transform: trimOrNull },
    ],
    staticColumns: { category: 'breeding_category' },
  },

  {
    order: 10,
    sourceTable: 'Carcase_Grades',
    targetTable: 'carcase.carcase_grades',
    query: `SELECT Grade_Code, Description, Price_doll_per_Kg, Effective_from_date
            FROM dbo.Carcase_Grades
            ORDER BY ID`,
    columns: [
      { source: 'Grade_Code', target: 'grade_code', transform: trimOrNull },
      { source: 'Description', target: 'description', transform: trimOrNull },
      { source: 'Price_doll_per_Kg', target: 'price_doll_per_kg', transform: toNum },
      { source: 'Effective_from_date', target: 'effective_from_date', transform: toDate },
    ],
  },

  {
    order: 10,
    sourceTable: 'Carcase_Grades_US',
    targetTable: 'carcase.carcase_grades_us',
    query: `SELECT ID, Qual_Grade, YG1_price, YG2_price, YG3_price, YG4_price, YG5_price, From_Date
            FROM dbo.Carcase_Grades_US
            ORDER BY ID`,
    columns: [
      { source: 'Qual_Grade', target: 'qual_grade', transform: trimOrNull },
      { source: 'YG1_price', target: 'yg1_price', transform: toNum },
      { source: 'YG2_price', target: 'yg2_price', transform: toNum },
      { source: 'YG3_price', target: 'yg3_price', transform: toNum },
      { source: 'YG4_price', target: 'yg4_price', transform: toNum },
      { source: 'YG5_price', target: 'yg5_price', transform: toNum },
      { source: 'From_Date', target: 'from_date', transform: toDate },
    ],
  },

  {
    order: 10,
    sourceTable: 'Cattle_Program_Types',
    targetTable: 'cattle.cattle_program_types',
    query: `SELECT Program_ID, Program_Code, DOF, Program_Description
            FROM dbo.Cattle_Program_Types
            ORDER BY Program_ID`,
    columns: [
      { source: 'Program_ID', target: 'program_id', transform: toNum },
      { source: 'Program_Code', target: 'program_code', transform: trimOrNull },
      { source: 'DOF', target: 'dof', transform: toNum },
      { source: 'Program_Description', target: 'program_description', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Code_References_Index',
    targetTable: 'system.code_references_index',
    query: `SELECT Database_Table, Field_Name, Lookup_Table_Name, LUT_Descriptive_FieldName, LUT_Code_FieldName, ID
            FROM dbo.Code_References_Index
            ORDER BY ID`,
    columns: [
      { source: 'Database_Table', target: 'database_table', transform: trimOrNull },
      { source: 'Field_Name', target: 'field_name', transform: trimOrNull },
      { source: 'Lookup_Table_Name', target: 'lookup_table_name', transform: trimOrNull },
      { source: 'LUT_Descriptive_FieldName', target: 'lut_descriptive_fieldname', transform: trimOrNull },
      { source: 'LUT_Code_FieldName', target: 'lut_code_fieldname', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'ContactTypes',
    targetTable: 'contacts.contacttypes',
    query: `SELECT Contact_Type_ID, Contact_Type, Description
            FROM dbo.ContactTypes
            ORDER BY Contact_Type_ID`,
    columns: [
      { source: 'Contact_Type_ID', target: 'contact_type_id', transform: toNum },
      { source: 'Contact_Type', target: 'contact_type', transform: trimOrNull },
      { source: 'Description', target: 'description', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Drug_Category',
    targetTable: 'system.lookups',
    lookupCategory: 'drug_category',
    query: `SELECT Drug_Category, Category_Description
            FROM dbo.Drug_Category
            ORDER BY Drug_Category`,
    columns: [
      { source: 'Drug_Category', target: 'code', transform: toNum },
      { source: 'Category_Description', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'drug_category' },
  },

  {
    order: 10,
    sourceTable: 'Feed_Commodity_names',
    targetTable: 'commodity.commodities',
    query: `SELECT Commodity_Code, Commodity_Name, ID
            FROM dbo.Feed_Commodity_names
            ORDER BY ID`,
    columns: [
      { source: 'Commodity_Code', target: 'commodity_code', transform: toNum },
      { source: 'Commodity_Name', target: 'commod_name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Grower_Groups',
    targetTable: 'system.lookups',
    lookupCategory: 'grower_group',
    query: `SELECT GrowerGroup_Code, GrowerGroup_Name
            FROM dbo.Grower_Groups
            ORDER BY GrowerGroup_Code`,
    columns: [
      { source: 'GrowerGroup_Code', target: 'code', transform: toNum },
      { source: 'GrowerGroup_Name', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'grower_group' },
  },

  {
    order: 10,
    sourceTable: 'LocationTypes',
    targetTable: 'system.lookups',
    lookupCategory: 'location_type',
    query: `SELECT Loc_Type_code, Location_Type
            FROM dbo.LocationTypes
            ORDER BY Loc_Type_code`,
    columns: [
      { source: 'Loc_Type_code', target: 'code', transform: toNum },
      { source: 'Location_Type', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'location_type' },
  },

  {
    order: 10,
    sourceTable: 'LocationTypes',
    targetTable: 'cattle.location_types',
    query: `SELECT Location_Type
            FROM dbo.LocationTypes
            WHERE Location_Type IS NOT NULL
            ORDER BY Loc_Type_code`,
    columns: [
      { source: 'Location_Type', target: 'name', transform: trimOrNull },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'Purchase_Regions',
    targetTable: 'system.lookups',
    lookupCategory: 'purchase_region',
    query: `SELECT Region_ID, Region_name
            FROM dbo.Purchase_Regions
            ORDER BY Region_ID`,
    columns: [
      { source: 'Region_ID', target: 'code', transform: toNum },
      { source: 'Region_name', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'purchase_region' },
  },

  {
    order: 10,
    sourceTable: 'RationNames',
    targetTable: 'feed.rations',
    query: `SELECT Ration_name, ValuePerTon, Notes, Custom_feed_charge_ton
            FROM dbo.RationNames
            ORDER BY Ration_name`,
    columns: [
      { source: 'Ration_name', target: 'ration_name', transform: trimOrNull },
      { source: 'ValuePerTon', target: 'valueperton', transform: toNum },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Custom_feed_charge_ton', target: 'custom_feed_charge_ton', transform: toNum },
    ],
  },

  {
    order: 10,
    sourceTable: 'Sickness_Result_Codes',
    targetTable: 'health.sickness_result_codes',
    query: `SELECT Sickness_Result_Code, Sickness_Result
            FROM dbo.Sickness_Result_Codes
            ORDER BY Sickness_Result_Code`,
    columns: [
      { source: 'Sickness_Result_Code', target: 'sickness_result_code', transform: toNum },
      { source: 'Sickness_Result', target: 'sickness_result', transform: trimOrNull },
    ],
    staticColumns: { variant: 'Standard' },
  },

  {
    order: 10,
    sourceTable: 'Sickness_Result_Codes_RV',
    targetTable: 'health.sickness_result_codes',
    query: `SELECT Sickness_Result_Code, Sickness_Result
            FROM dbo.Sickness_Result_Codes_RV
            ORDER BY Sickness_Result_Code`,
    columns: [
      { source: 'Sickness_Result_Code', target: 'sickness_result_code', transform: toNum },
      { source: 'Sickness_Result', target: 'sickness_result', transform: trimOrNull },
    ],
    staticColumns: { variant: 'RV' },
  },

  {
    order: 10,
    sourceTable: 'Sire_Lines',
    targetTable: 'system.lookups',
    lookupCategory: 'sire_line',
    query: `SELECT Sire_Line_ID, Sire_Line
            FROM dbo.Sire_Lines
            ORDER BY Sire_Line_ID`,
    columns: [
      { source: 'Sire_Line_ID', target: 'code', transform: toNum },
      { source: 'Sire_Line', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'sire_line' },
  },

  {
    order: 10,
    sourceTable: 'SubGroupNames',
    targetTable: 'system.lookups',
    lookupCategory: 'sub_group',
    query: `SELECT Sub_Group, ID
            FROM dbo.SubGroupNames
            ORDER BY ID`,
    columns: [
      { source: 'Sub_Group', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'sub_group' },
  },

  {
    order: 10,
    sourceTable: 'Weighing_Types',
    targetTable: 'weighing.weighing_types',
    query: `SELECT Weighing_Type, Weighing_Desc
            FROM dbo.Weighing_Types
            ORDER BY Weighing_Type`,
    columns: [
      { source: 'Weighing_Type', target: 'weighing_type_id', transform: toNum },
      { source: 'Weighing_Desc', target: 'weighing_type', transform: trimOrNull },
      { source: 'Weighing_Desc', target: 'weighing_desc', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Weighing_Types_RV',
    targetTable: 'weighing.weighing_types',
    query: `SELECT Weighing_Type_ID, Weighing_Type
            FROM dbo.Weighing_Types_RV
            ORDER BY Weighing_Type_ID`,
    columns: [
      { source: 'Weighing_Type_ID', target: 'weighing_type_id', transform: toNum },
      { source: 'Weighing_Type', target: 'weighing_type', transform: trimOrNull },
    ],
  },

  {
    order: 15,
    sourceTable: 'Cattle_Specs',
    targetTable: 'cattle.cattle_specs',
    query: `SELECT ID, [Intake Fat From], [Intake Fat To], [Intake Wght From], [Intake Wght To], [Intake Teeth From], [Intake Teeth To], [Sale Wght From], [Sale Wght To], [WG per Day From], [WG per Day To], [Dressing % From], [Dressing % To], [Marbling>=], [Carc P8 From], [Carc P8 To], [EMA From], [EMA To], [Fat Colour From], [Fat Colour To], [Meat Colour From], [Meat Colour To], [Paddock WG From], [Paddock WG To], [DOF From], [DOF To]
            FROM dbo.Cattle_Specs
            ORDER BY ID`,
    columns: [
      { source: 'Intake Fat From', target: 'intake_fat_from', transform: toNum },
      { source: 'Intake Fat To', target: 'intake_fat_to', transform: toNum },
      { source: 'Intake Wght From', target: 'intake_wght_from', transform: toNum },
      { source: 'Intake Wght To', target: 'intake_wght_to', transform: toNum },
      { source: 'Intake Teeth From', target: 'intake_teeth_from', transform: toNum },
      { source: 'Intake Teeth To', target: 'intake_teeth_to', transform: toNum },
      { source: 'Sale Wght From', target: 'sale_wght_from', transform: toNum },
      { source: 'Sale Wght To', target: 'sale_wght_to', transform: toNum },
      { source: 'WG per Day From', target: 'wg_per_day_from', transform: toNum },
      { source: 'WG per Day To', target: 'wg_per_day_to', transform: toNum },
      { source: 'Dressing % From', target: 'dressing_pct_from', transform: toNum },
      { source: 'Dressing % To', target: 'dressing_pct_to', transform: toNum },
      { source: 'Marbling>=', target: 'marbling_gte', transform: toNum },
      { source: 'Carc P8 From', target: 'carc_p8_from', transform: toNum },
      { source: 'Carc P8 To', target: 'carc_p8_to', transform: toNum },
      { source: 'EMA From', target: 'ema_from', transform: toNum },
      { source: 'EMA To', target: 'ema_to', transform: toNum },
      { source: 'Fat Colour From', target: 'fat_colour_from', transform: toNum },
      { source: 'Fat Colour To', target: 'fat_colour_to', transform: toNum },
      { source: 'Meat Colour From', target: 'meat_colour_from', transform: trimOrNull },
      { source: 'Meat Colour To', target: 'meat_colour_to', transform: trimOrNull },
      { source: 'Paddock WG From', target: 'paddock_wg_from', transform: toNum },
      { source: 'Paddock WG To', target: 'paddock_wg_to', transform: toNum },
      { source: 'DOF From', target: 'dof_from', transform: toNum },
      { source: 'DOF To', target: 'dof_to', transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Company',
    targetTable: 'contacts.company',
    query: `SELECT ID, [Company Name], Weight_Units, [Key], UserTailTag, RFID_Space_Removed, Apply_Feed_As_DM_Kgs, CurrentNumberUsers, Data_Collector_Scales_Type, Scales_File_Folder, Units_per_Ton, Date_DB_Last_Updated, Last_Ohead_Application, V11_Database, DFLT_WG_Per_day, NSA_Cust_ID, NSA_Email, NSA_Client, User_logon, Digistar_datalink, Padd_Tail_Tag, Date_Last_FeedTrans_Compression, Digistar_datakey, password_complexity, ABN, ACN, Address, Phone, Fax, Email, Logo, titration_feeding
            FROM dbo.Company
            ORDER BY ID`,
    columns: [
      { source: 'Company Name', target: 'company_name', transform: trimOrNull },
      { source: 'Weight_Units', target: 'weight_units', transform: trimOrNull },
      { source: 'Key', target: 'key', transform: trimOrNull },
      { source: 'UserTailTag', target: 'usertailtag', transform: trimOrNull },
      { source: 'RFID_Space_Removed', target: 'rfid_space_removed', transform: toBool },
      { source: 'Apply_Feed_As_DM_Kgs', target: 'apply_feed_as_dm_kgs', transform: toBool },
      { source: 'CurrentNumberUsers', target: 'currentnumberusers', transform: toNum },
      { source: 'Data_Collector_Scales_Type', target: 'data_collector_scales_type', transform: trimOrNull },
      { source: 'Scales_File_Folder', target: 'scales_file_folder', transform: trimOrNull },
      { source: 'Units_per_Ton', target: 'units_per_ton', transform: toNum },
      { source: 'Date_DB_Last_Updated', target: 'date_db_last_updated', transform: toDate },
      { source: 'Last_Ohead_Application', target: 'last_ohead_application', transform: toDate },
      { source: 'V11_Database', target: 'v11_database', transform: toBool },
      { source: 'DFLT_WG_Per_day', target: 'dflt_wg_per_day', transform: toNum },
      { source: 'NSA_Cust_ID', target: 'nsa_cust_id', transform: trimOrNull },
      { source: 'NSA_Email', target: 'nsa_email', transform: trimOrNull },
      { source: 'NSA_Client', target: 'nsa_client', transform: toBool },
      { source: 'User_logon', target: 'user_logon', transform: toBool },
      { source: 'Digistar_datalink', target: 'digistar_datalink', transform: toBool },
      { source: 'Padd_Tail_Tag', target: 'padd_tail_tag', transform: trimOrNull },
      { source: 'Date_Last_FeedTrans_Compression', target: 'date_last_feedtrans_compression', transform: toDate },
      { source: 'Digistar_datakey', target: 'digistar_datakey', transform: toBool },
      { source: 'password_complexity', target: 'password_complexity', transform: toBool },
      { source: 'ABN', target: 'abn', transform: trimOrNull },
      { source: 'ACN', target: 'acn', transform: trimOrNull },
      { source: 'Address', target: 'address', transform: trimOrNull },
      { source: 'Phone', target: 'phone', transform: trimOrNull },
      { source: 'Fax', target: 'fax', transform: trimOrNull },
      { source: 'Email', target: 'email', transform: trimOrNull },
      { source: 'Logo', target: 'logo', transform: toBytea },
      { source: 'titration_feeding', target: 'titration_feeding', transform: toBool },
    ],
  },

  {
    order: 15,
    sourceTable: 'Company_Settings',
    targetTable: 'contacts.company_settings',
    query: `SELECT ModuleName, SettingName, SettingValue, DateCreated, DateModified
            FROM dbo.Company_Settings
            ORDER BY ModuleName`,
    columns: [
      { source: 'ModuleName', target: 'modulename', transform: trimOrNull },
      { source: 'SettingName', target: 'settingname', transform: trimOrNull },
      { source: 'SettingValue', target: 'settingvalue', transform: trimOrNull },
      { source: 'DateCreated', target: 'datecreated', transform: toDate },
      { source: 'DateModified', target: 'datemodified', transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'Cust_Feed_Charges',
    targetTable: 'finance.custom_feed_charges',
    query: `SELECT Purch_Lot_No, Ration, SumOfUnits, AvgOfCustom_Feed_Charge_Ton, Feed_Charge
            FROM dbo.Cust_Feed_Charges
            ORDER BY Purch_Lot_No`,
    columns: [
      { source: 'Purch_Lot_No', target: 'purch_lot_no', transform: trimOrNull },
      { source: 'Ration', target: 'ration', transform: trimOrNull },
      { source: 'SumOfUnits', target: 'sum_of_units', transform: toNum },
      { source: 'AvgOfCustom_Feed_Charge_Ton', target: 'avg_of_custom_feed_charge_ton', transform: toNum },
      { source: 'Feed_Charge', target: 'feed_charge', transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Feedlot_Staff',
    targetTable: 'feed.feedlot_staff',
    query: `SELECT User_ID, Surname, FirstName, Job_Desc, Start_date, Finish_Date, Pass_word, Cattle_Data_Entry, Cattle_Reports, Cattle_Utilities, Cattle_Lookup_Tables, Feed_system_Data_Entry, Feed_system_reports, Feed_system_utilities, PL_Reports_Allowed, Pen_Rider, Cattle_Deletes, Password_Last_Changed_Date
            FROM dbo.Feedlot_Staff
            ORDER BY User_ID`,
    columns: [
      { source: 'User_ID', target: 'user_id', transform: toNum },
      { source: 'Surname', target: 'surname', transform: trimOrNull },
      { source: 'FirstName', target: 'firstname', transform: trimOrNull },
      { source: 'Job_Desc', target: 'job_desc', transform: trimOrNull },
      { source: 'Start_date', target: 'start_date', transform: toDate },
      { source: 'Finish_Date', target: 'finish_date', transform: toDate },
      { source: 'Pass_word', target: 'password_hash', transform: trimOrNull },
      { source: 'Cattle_Data_Entry', target: 'cattle_data_entry', transform: toBool },
      { source: 'Cattle_Reports', target: 'cattle_reports', transform: toBool },
      { source: 'Cattle_Utilities', target: 'cattle_utilities', transform: toBool },
      { source: 'Cattle_Lookup_Tables', target: 'cattle_lookup_tables', transform: toBool },
      { source: 'Feed_system_Data_Entry', target: 'feed_system_data_entry', transform: toBool },
      { source: 'Feed_system_reports', target: 'feed_system_reports', transform: toBool },
      { source: 'Feed_system_utilities', target: 'feed_system_utilities', transform: toBool },
      { source: 'PL_Reports_Allowed', target: 'pl_reports_allowed', transform: toBool },
      { source: 'Pen_Rider', target: 'pen_rider', transform: toBool },
      { source: 'Cattle_Deletes', target: 'cattle_deletes', transform: toBool },
      { source: 'Password_Last_Changed_Date', target: 'password_last_changed_date', transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'Mort_Morb_triggers',
    targetTable: 'health.mort_morb_triggers',
    query: `SELECT TableName, COF_From, COF_To, Pulls_actual, Deaths_actual, Level1_Pulls_trigger, Level1_Deaths_trigger, Level2_Deaths_trigger, Level3_Deaths_trigger, Include_in_report, ID
            FROM dbo.Mort_Morb_triggers
            ORDER BY ID`,
    columns: [
      { source: 'TableName', target: 'tablename', transform: trimOrNull },
      { source: 'COF_From', target: 'cof_from', transform: toNum },
      { source: 'COF_To', target: 'cof_to', transform: toNum },
      { source: 'Pulls_actual', target: 'pulls_actual', transform: toNum },
      { source: 'Deaths_actual', target: 'deaths_actual', transform: toNum },
      { source: 'Level1_Pulls_trigger', target: 'level1_pulls_trigger', transform: toNum },
      { source: 'Level1_Deaths_trigger', target: 'level1_deaths_trigger', transform: toNum },
      { source: 'Level2_Deaths_trigger', target: 'level2_deaths_trigger', transform: toNum },
      { source: 'Level3_Deaths_trigger', target: 'level3_deaths_trigger', transform: toNum },
      { source: 'Include_in_report', target: 'include_in_report', transform: toBool },
    ],
  },

  {
    order: 15,
    sourceTable: 'PackageCosts',
    targetTable: 'finance.packagecosts',
    query: `SELECT CountryCode, BasicPackage, PricePerThousandHead, BasicFeeding, VetRecords, VetReporting, CrushSideProc, FeedCommodsSystem, PriceAsAtDate
            FROM dbo.PackageCosts
            ORDER BY CountryCode`,
    columns: [
      { source: 'CountryCode', target: 'countrycode', transform: toNum },
      { source: 'BasicPackage', target: 'basicpackage', transform: toNum },
      { source: 'PricePerThousandHead', target: 'priceperthousandhead', transform: toNum },
      { source: 'BasicFeeding', target: 'basicfeeding', transform: toNum },
      { source: 'VetRecords', target: 'vetrecords', transform: toNum },
      { source: 'VetReporting', target: 'vetreporting', transform: toNum },
      { source: 'CrushSideProc', target: 'crushsideproc', transform: toNum },
      { source: 'FeedCommodsSystem', target: 'feedcommodssystem', transform: toNum },
      { source: 'PriceAsAtDate', target: 'priceasatdate', transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'Pen_Rider_Tolerances',
    targetTable: 'pen.pen_rider_tolerances',
    query: `SELECT Pulls_LE_45_dof_from, Pulls_LE_45_dof_to, Pulls_46_120_dof_from, Pulls_46_120_dof_to, Pulls_121_200_dof_from, Pulls_121_200_dof_to, Pulls_GT_200_dof_from, Pulls_GT_200_dof_to, Pulls_total_from, Pulls_totals_to, Treat_success_pcnt_LT_45_dof_from, Treat_success_pcnt_LT_45_dof_to, Treat_success_pcnt_46_120_dof_from, Treat_success_pcnt_46_120_dof_to, Treat_success_pcnt_121_200_dof_from, Treat_success_pcnt_121_200_dof_to, Treat_success_pcnt_GT_200_dof_from, Treat_success_pcnt_GT_200_dof_to, Treat_success_totals_from, Treat_success_totals_to, Death_alloc_LE_45_dof_from, Death_alloc_LE_45_dof_to, Death_alloc_46_120_dof_from, Death_alloc_46_120_dof_to, Death_alloc_121_200_dof_from, Death_alloc_121_200_dof_to, Death_alloc_GT_200_dof_from, Death_alloc_GT_200_dof_to, Death_alloc_total_from, Death_alloc_total_to, ID
            FROM dbo.Pen_Rider_Tolerances
            ORDER BY ID`,
    columns: [
      { source: 'Pulls_LE_45_dof_from', target: 'pulls_le_45_dof_from', transform: toNum },
      { source: 'Pulls_LE_45_dof_to', target: 'pulls_le_45_dof_to', transform: toNum },
      { source: 'Pulls_46_120_dof_from', target: 'pulls_46_120_dof_from', transform: toNum },
      { source: 'Pulls_46_120_dof_to', target: 'pulls_46_120_dof_to', transform: toNum },
      { source: 'Pulls_121_200_dof_from', target: 'pulls_121_200_dof_from', transform: toNum },
      { source: 'Pulls_121_200_dof_to', target: 'pulls_121_200_dof_to', transform: toNum },
      { source: 'Pulls_GT_200_dof_from', target: 'pulls_gt_200_dof_from', transform: toNum },
      { source: 'Pulls_GT_200_dof_to', target: 'pulls_gt_200_dof_to', transform: toNum },
      { source: 'Pulls_total_from', target: 'pulls_total_from', transform: toNum },
      { source: 'Pulls_totals_to', target: 'pulls_totals_to', transform: toNum },
      { source: 'Treat_success_pcnt_LT_45_dof_from', target: 'treat_success_pcnt_lt_45_dof_from', transform: toNum },
      { source: 'Treat_success_pcnt_LT_45_dof_to', target: 'treat_success_pcnt_lt_45_dof_to', transform: toNum },
      { source: 'Treat_success_pcnt_46_120_dof_from', target: 'treat_success_pcnt_46_120_dof_from', transform: toNum },
      { source: 'Treat_success_pcnt_46_120_dof_to', target: 'treat_success_pcnt_46_120_dof_to', transform: toNum },
      { source: 'Treat_success_pcnt_121_200_dof_from', target: 'treat_success_pcnt_121_200_dof_from', transform: toNum },
      { source: 'Treat_success_pcnt_121_200_dof_to', target: 'treat_success_pcnt_121_200_dof_to', transform: toNum },
      { source: 'Treat_success_pcnt_GT_200_dof_from', target: 'treat_success_pcnt_gt_200_dof_from', transform: toNum },
      { source: 'Treat_success_pcnt_GT_200_dof_to', target: 'treat_success_pcnt_gt_200_dof_to', transform: toNum },
      { source: 'Treat_success_totals_from', target: 'treat_success_totals_from', transform: toNum },
      { source: 'Treat_success_totals_to', target: 'treat_success_totals_to', transform: toNum },
      { source: 'Death_alloc_LE_45_dof_from', target: 'death_alloc_le_45_dof_from', transform: toNum },
      { source: 'Death_alloc_LE_45_dof_to', target: 'death_alloc_le_45_dof_to', transform: toNum },
      { source: 'Death_alloc_46_120_dof_from', target: 'death_alloc_46_120_dof_from', transform: toNum },
      { source: 'Death_alloc_46_120_dof_to', target: 'death_alloc_46_120_dof_to', transform: toNum },
      { source: 'Death_alloc_121_200_dof_from', target: 'death_alloc_121_200_dof_from', transform: toNum },
      { source: 'Death_alloc_121_200_dof_to', target: 'death_alloc_121_200_dof_to', transform: toNum },
      { source: 'Death_alloc_GT_200_dof_from', target: 'death_alloc_gt_200_dof_from', transform: toNum },
      { source: 'Death_alloc_GT_200_dof_to', target: 'death_alloc_gt_200_dof_to', transform: toNum },
      { source: 'Death_alloc_total_from', target: 'death_alloc_total_from', transform: toNum },
      { source: 'Death_alloc_total_to', target: 'death_alloc_total_to', transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Price_adjustment_by_weight_range',
    targetTable: 'finance.price_adjustment_by_weight_range',
    query: `SELECT Lot_Number, Weight_from, Weight_to, Head, Dollars_per_Kg_adjustment, Applied_to_Cattle_pricing, ID
            FROM dbo.Price_adjustment_by_weight_range
            ORDER BY ID`,
    columns: [
      { source: 'Lot_Number', target: 'lot_number', transform: trimOrNull },
      { source: 'Weight_from', target: 'weight_from', transform: toNum },
      { source: 'Weight_to', target: 'weight_to', transform: toNum },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Dollars_per_Kg_adjustment', target: 'dollars_per_kg_adjustment', transform: toNum },
      { source: 'Applied_to_Cattle_pricing', target: 'applied_to_cattle_pricing', transform: toBool },
    ],
  },

  {
    order: 15,
    sourceTable: 'RV_Scheduled_DOF',
    targetTable: 'system.rv_scheduled_dof',
    query: `SELECT DOF, ID
            FROM dbo.RV_Scheduled_DOF
            ORDER BY ID`,
    columns: [
      { source: 'DOF', target: 'dof', transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Tax_Invoice_Bank_details',
    targetTable: 'finance.tax_invoice_bank_details',
    query: `SELECT Company_name, Address, Telephone, Fax_number, ABN, Bank_AC_name, Bank_name, Bank_BSB, Bank_AC_number, ID, GST_rate, Default_Days_Invoice_Due, Account_Code
            FROM dbo.Tax_Invoice_Bank_details
            ORDER BY ID`,
    columns: [
      { source: 'Company_name', target: 'company_name', transform: trimOrNull },
      { source: 'Address', target: 'address', transform: trimOrNull },
      { source: 'Telephone', target: 'telephone', transform: trimOrNull },
      { source: 'Fax_number', target: 'fax_number', transform: trimOrNull },
      { source: 'ABN', target: 'abn', transform: trimOrNull },
      { source: 'Bank_AC_name', target: 'bank_ac_name', transform: trimOrNull },
      { source: 'Bank_name', target: 'bank_name', transform: trimOrNull },
      { source: 'Bank_BSB', target: 'bank_bsb', transform: trimOrNull },
      { source: 'Bank_AC_number', target: 'bank_ac_number', transform: trimOrNull },
      { source: 'GST_rate', target: 'gst_rate', transform: toNum },
      { source: 'Default_Days_Invoice_Due', target: 'default_days_invoice_due', transform: toNum },
      { source: 'Account_Code', target: 'account_code', transform: trimOrNull },
    ],
  },

  // Carcase_DataType2: excluded — 0 rows, unused alternative carcase schema

  {
    order: 20,
    sourceTable: 'Carcase_import_Data',
    targetTable: 'carcase.carcase_import_data',
    query: `SELECT Col1, Col2, Col3, Col4, Col5, Col6, Col7, Col8, Col9, Col10, Col11, Col12, Col13, Col14, Col15, Col16, Col17, Col18, Col19, Col20, Col21, Col22, Col23, Col24, Col25, Warning, Error, Import_Date, Session_ID, ID
            FROM dbo.Carcase_import_Data
            ORDER BY ID`,
    columns: [
      { source: 'Col1', target: 'col1', transform: trimOrNull },
      { source: 'Col2', target: 'col2', transform: trimOrNull },
      { source: 'Col3', target: 'col3', transform: trimOrNull },
      { source: 'Col4', target: 'col4', transform: trimOrNull },
      { source: 'Col5', target: 'col5', transform: trimOrNull },
      { source: 'Col6', target: 'col6', transform: trimOrNull },
      { source: 'Col7', target: 'col7', transform: trimOrNull },
      { source: 'Col8', target: 'col8', transform: trimOrNull },
      { source: 'Col9', target: 'col9', transform: trimOrNull },
      { source: 'Col10', target: 'col10', transform: trimOrNull },
      { source: 'Col11', target: 'col11', transform: trimOrNull },
      { source: 'Col12', target: 'col12', transform: trimOrNull },
      { source: 'Col13', target: 'col13', transform: trimOrNull },
      { source: 'Col14', target: 'col14', transform: trimOrNull },
      { source: 'Col15', target: 'col15', transform: trimOrNull },
      { source: 'Col16', target: 'col16', transform: trimOrNull },
      { source: 'Col17', target: 'col17', transform: trimOrNull },
      { source: 'Col18', target: 'col18', transform: trimOrNull },
      { source: 'Col19', target: 'col19', transform: trimOrNull },
      { source: 'Col20', target: 'col20', transform: trimOrNull },
      { source: 'Col21', target: 'col21', transform: trimOrNull },
      { source: 'Col22', target: 'col22', transform: trimOrNull },
      { source: 'Col23', target: 'col23', transform: trimOrNull },
      { source: 'Col24', target: 'col24', transform: trimOrNull },
      { source: 'Col25', target: 'col25', transform: trimOrNull },
      { source: 'Warning', target: 'warning', transform: trimOrNull },
      { source: 'Error', target: 'error', transform: trimOrNull },
      { source: 'Import_Date', target: 'import_date', transform: toDate },
      { source: 'Session_ID', target: 'session_id', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Carcase_Prices',
    targetTable: 'carcase.carcase_prices',
    query: `SELECT Sold_To_ID, Kill_Date_From, Kill_Date_To, Marbling_From, Marbling_To, Meat_Colour_From, Meat_Colour_To, Price_per_Kg, Live_or_carc_Wght, ID
            FROM dbo.Carcase_Prices
            ORDER BY ID`,
    columns: [
      { source: 'Sold_To_ID', target: 'sold_to_id', transform: toNum },
      { source: 'Kill_Date_From', target: 'kill_date_from', transform: toDate },
      { source: 'Kill_Date_To', target: 'kill_date_to', transform: toDate },
      { source: 'Marbling_From', target: 'marbling_from', transform: toNum },
      { source: 'Marbling_To', target: 'marbling_to', transform: toNum },
      { source: 'Meat_Colour_From', target: 'meat_colour_from', transform: trimOrNull },
      { source: 'Meat_Colour_To', target: 'meat_colour_to', transform: trimOrNull },
      { source: 'Price_per_Kg', target: 'price_per_kg', transform: toNum },
      { source: 'Live_or_carc_Wght', target: 'live_or_carc_wght', transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Chemical_inventory',
    targetTable: 'health.chemical_inventory',
    query: `SELECT Chemical_Drug_ID, Purchase_Date, Purchase_Quantity, Units, Supplier, Batch_Number, ExpiryDate, Disposal_Comment, Stocktake_date, Stocktake_Qty, ID, Disposal_date, Disposal_Qty, Invoice_Amount, Invoice_Paid
            FROM dbo.Chemical_inventory
            ORDER BY ID`,
    columns: [
      { source: 'Chemical_Drug_ID', target: 'chemical_drug_id', transform: toNum },
      { source: 'Purchase_Date', target: 'purchase_date', transform: toDate },
      { source: 'Purchase_Quantity', target: 'purchase_quantity', transform: toNum },
      { source: 'Units', target: 'units', transform: trimOrNull },
      { source: 'Supplier', target: 'supplier', transform: trimOrNull },
      { source: 'Batch_Number', target: 'batch_number', transform: trimOrNull },
      { source: 'ExpiryDate', target: 'expirydate', transform: toDate },
      { source: 'Disposal_Comment', target: 'disposal_comment', transform: trimOrNull },
      { source: 'Stocktake_date', target: 'stocktake_date', transform: toDate },
      { source: 'Stocktake_Qty', target: 'stocktake_qty', transform: toNum },
      { source: 'Disposal_date', target: 'disposal_date', transform: toDate },
      { source: 'Disposal_Qty', target: 'disposal_qty', transform: toNum },
      { source: 'Invoice_Amount', target: 'invoice_amount', transform: toNum },
      { source: 'Invoice_Paid', target: 'invoice_paid', transform: toBool },
    ],
  },

  {
    order: 20,
    sourceTable: 'Chemical_inventory_old',
    targetTable: 'health.chemical_inventory_old',
    query: `SELECT Chemical_Drug_ID, Purchase_Date, Purchase_Quantity, Units, Supplier, Batch_Number, ExpiryDate, Disposal_Comment, Stocktake_date, Stocktake_Qty, ID
            FROM dbo.Chemical_inventory_old
            ORDER BY ID`,
    columns: [
      { source: 'Chemical_Drug_ID', target: 'chemical_drug_id', transform: toNum },
      { source: 'Purchase_Date', target: 'purchase_date', transform: trimOrNull },
      { source: 'Purchase_Quantity', target: 'purchase_quantity', transform: toNum },
      { source: 'Units', target: 'units', transform: trimOrNull },
      { source: 'Supplier', target: 'supplier', transform: trimOrNull },
      { source: 'Batch_Number', target: 'batch_number', transform: trimOrNull },
      { source: 'ExpiryDate', target: 'expiry_date', transform: trimOrNull },
      { source: 'Disposal_Comment', target: 'disposal_comment', transform: trimOrNull },
      { source: 'Stocktake_date', target: 'stocktake_date', transform: trimOrNull },
      { source: 'Stocktake_Qty', target: 'stocktake_qty', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Drug_HGP_Forms',
    targetTable: 'health.drug_hgp_forms',
    query: `SELECT Drug_Receival_ID, HGP_Decl_Form_filename, ID
            FROM dbo.Drug_HGP_Forms
            ORDER BY ID`,
    columns: [
      { source: 'Drug_Receival_ID', target: 'drug_receival_id', transform: toNum },
      { source: 'HGP_Decl_Form_filename', target: 'hgp_decl_form_filename', transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Drug_Stocktake_records',
    targetTable: 'health.drug_inventory_line_items',
    query: `SELECT Stocktake_ID, DrugID, Units_per_BoxOrBottle, On_hand_theoritical, Counted, Diffrence, Reorder_SOH_units_trigger, Applied_to_SOH, ID, BoxBottles_OnHand
            FROM dbo.Drug_Stocktake_records
            ORDER BY ID`,
    columns: [
      { source: 'Stocktake_ID', target: 'event_id', transform: toNum },
      { source: 'DrugID', target: 'drugid', transform: toNum },
      { source: 'Units_per_BoxOrBottle', target: 'units_per_boxorbottle', transform: toNum },
      { source: 'On_hand_theoritical', target: 'on_hand_theoretical', transform: toNum },
      { source: 'Counted', target: 'quantity', transform: toNum },
      { source: 'Diffrence', target: 'balance', transform: toNum },
      { source: 'Reorder_SOH_units_trigger', target: 'reorder_soh_units_trigger', transform: toNum },
      { source: 'Applied_to_SOH', target: 'applied_to_soh', transform: toBool },
      { source: 'BoxBottles_OnHand', target: 'boxbottles_onhand', transform: toNum },
    ],
    staticColumns: { record_type: 'Stocktake' },
  },

  {
    order: 20,
    sourceTable: 'Drug_Stocktakes',
    targetTable: 'health.drug_inventory_events',
    query: `SELECT Stocktake_ID, Stock_Date, Done_By, Notes, Applied_to_inventory, ID
            FROM dbo.Drug_Stocktakes
            ORDER BY ID`,
    columns: [
      { source: 'Stocktake_ID', target: 'event_id', transform: toNum },
      { source: 'Stock_Date', target: 'event_date', transform: toDate },
      { source: 'Done_By', target: 'done_by', transform: trimOrNull },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Applied_to_inventory', target: 'applied_to_inventory', transform: toBool },
    ],
    staticColumns: { event_type: 'Stocktake' },
  },

  {
    order: 20,
    sourceTable: 'Drug_Transfer_Records',
    targetTable: 'health.drug_inventory_line_items',
    query: `SELECT Transfer_ID, DrugID, Units_per_BoxOrBottle, On_hand_theoretical, Transferred, Remaining, Reorder_SOH_units_trigger, Applied_to_SOH, ID, BoxBottles_OnHand
            FROM dbo.Drug_Transfer_Records
            ORDER BY ID`,
    columns: [
      { source: 'Transfer_ID', target: 'event_id', transform: toNum },
      { source: 'DrugID', target: 'drugid', transform: toNum },
      { source: 'Units_per_BoxOrBottle', target: 'units_per_boxorbottle', transform: toNum },
      { source: 'On_hand_theoretical', target: 'on_hand_theoretical', transform: toNum },
      { source: 'Transferred', target: 'quantity', transform: toNum },
      { source: 'Remaining', target: 'balance', transform: toNum },
      { source: 'Reorder_SOH_units_trigger', target: 'reorder_soh_units_trigger', transform: toNum },
      { source: 'Applied_to_SOH', target: 'applied_to_soh', transform: toBool },
      { source: 'BoxBottles_OnHand', target: 'boxbottles_onhand', transform: toNum },
    ],
    staticColumns: { record_type: 'Transfer' },
  },

  {
    order: 20,
    sourceTable: 'Drug_Transfers',
    targetTable: 'health.drug_inventory_events',
    query: `SELECT Transfer_ID, Transfer_Date, Transfer_Location, Done_By, Notes, Applied_to_inventory, ID
            FROM dbo.Drug_Transfers
            ORDER BY ID`,
    columns: [
      { source: 'Transfer_ID', target: 'event_id', transform: toNum },
      { source: 'Transfer_Date', target: 'event_date', transform: toDate },
      { source: 'Transfer_Location', target: 'transfer_location', transform: trimOrNull },
      { source: 'Done_By', target: 'done_by', transform: trimOrNull },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Applied_to_inventory', target: 'applied_to_inventory', transform: toBool },
    ],
    staticColumns: { event_type: 'Transfer' },
  },

  {
    order: 20,
    sourceTable: 'Drugs_Purchase_event',
    targetTable: 'health.drug_purchase_events',
    query: `SELECT Drug_Receival_ID, Date_received, Supplier_ID, Order_ref_number, Received_by, Invoice_paid, Notes, Applied_to_Inventory, ID, HGP_form_done
            FROM dbo.Drugs_Purchase_event
            ORDER BY ID`,
    columns: [
      { source: 'Drug_Receival_ID', target: 'drug_receival_id', transform: toNum },
      { source: 'Date_received', target: 'date_received', transform: toDate },
      { source: 'Supplier_ID', target: 'supplier_id', transform: toNum },
      { source: 'Order_ref_number', target: 'order_ref_number', transform: trimOrNull },
      { source: 'Received_by', target: 'received_by', transform: trimOrNull },
      { source: 'Invoice_paid', target: 'invoice_paid', transform: toBool },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Applied_to_Inventory', target: 'applied_to_inventory', transform: toBool },
      { source: 'HGP_form_done', target: 'hgp_form_done', transform: toBool },
    ],
  },

  {
    order: 20,
    sourceTable: 'Instrument_Calibration_tests',
    targetTable: 'feed.instrument_calibration_tests',
    query: `SELECT Instrument_name, Test_date, Testing_method, Tester_name, Test_Notes, Data_applied_to_instruments, ID
            FROM dbo.Instrument_Calibration_tests
            ORDER BY ID`,
    columns: [
      { source: 'Instrument_name', target: 'instrument_name', transform: trimOrNull },
      { source: 'Test_date', target: 'test_date', transform: toDate },
      { source: 'Testing_method', target: 'testing_method', transform: trimOrNull },
      { source: 'Tester_name', target: 'tester_name', transform: trimOrNull },
      { source: 'Test_Notes', target: 'test_notes', transform: trimOrNull },
      { source: 'Data_applied_to_instruments', target: 'data_applied_to_instruments', transform: toBool },
    ],
  },

  {
    order: 20,
    sourceTable: 'Instruments_needing_Calibration',
    targetTable: 'feed.instruments_needing_calibration',
    query: `SELECT Instrument_name, Testing_Frequency, Date_last_tested, Testing_method, Inactive, ID
            FROM dbo.Instruments_needing_Calibration
            ORDER BY ID`,
    columns: [
      { source: 'Instrument_name', target: 'instrument_name', transform: trimOrNull },
      { source: 'Testing_Frequency', target: 'testing_frequency', transform: trimOrNull },
      { source: 'Date_last_tested', target: 'date_last_tested', transform: toDate },
      { source: 'Testing_method', target: 'testing_method', transform: trimOrNull },
      { source: 'Inactive', target: 'inactive', transform: toBool },
    ],
  },

  {
    order: 20,
    sourceTable: 'KD1_Records',
    targetTable: 'cattle.kd1_records',
    query: `SELECT Ear_Tag, Weight, Hash, IDENT, EID, Error_Mess, [Group], ID, Teeth, Weigh_Note, Sex, Pen_Number, P8_Fat, Add_or_Update, Supplier_EarTag, Rudd800_Traits, Lot_Number
            FROM dbo.KD1_Records
            ORDER BY ID`,
    columns: [
      { source: 'Ear_Tag', target: 'ear_tag', transform: trimOrNull },
      { source: 'Weight', target: 'weight', transform: toNum },
      { source: 'Hash', target: 'hash', transform: trimOrNull },
      { source: 'IDENT', target: 'ident', transform: trimOrNull },
      { source: 'EID', target: 'eid', transform: trimOrNull },
      { source: 'Error_Mess', target: 'error_mess', transform: trimOrNull },
      { source: 'Group', target: 'group_name', transform: trimOrNull },
      { source: 'Teeth', target: 'teeth', transform: trimOrNull },
      { source: 'Weigh_Note', target: 'weigh_note', transform: trimOrNull },
      { source: 'Sex', target: 'sex', transform: trimOrNull },
      { source: 'Pen_Number', target: 'pen_number', transform: trimOrNull },
      { source: 'P8_Fat', target: 'p8_fat', transform: trimOrNull },
      { source: 'Add_or_Update', target: 'add_or_update', transform: trimOrNull },
      { source: 'Supplier_EarTag', target: 'supplier_eartag', transform: trimOrNull },
      { source: 'Rudd800_Traits', target: 'rudd800_traits', transform: trimOrNull },
      { source: 'Lot_Number', target: 'lot_number', transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Livestock_Weighbridge_Dockets',
    targetTable: 'weighing.livestock_weighbridge_dockets',
    query: `SELECT DocketID, Docket_Number, Docket_Type, Docket_Date, Docket_Time, Exit_Date, Exit_Time, WeighpersonID, CarrierID, Driver_Name, Vehicle_Rego, Origin_DestinationID, Description, NVD_No, Purch_Lot_No, Head_Count, Animal_Welfare, WeighUnits, Gross_Weight, Tare_Weight, Shrink_Percent, Notes
            FROM dbo.Livestock_Weighbridge_Dockets
            ORDER BY DocketID`,
    columns: [
      { source: 'DocketID', target: 'docketid', transform: toNum },
      { source: 'Docket_Number', target: 'docket_number', transform: trimOrNull },
      { source: 'Docket_Type', target: 'docket_type', transform: toNum },
      { source: 'Docket_Date', target: 'docket_date', transform: toDate },
      { source: 'Docket_Time', target: 'docket_time', transform: toTime },
      { source: 'Exit_Date', target: 'exit_date', transform: toDate },
      { source: 'Exit_Time', target: 'exit_time', transform: toTime },
      { source: 'WeighpersonID', target: 'weighpersonid', transform: toNum },
      { source: 'CarrierID', target: 'carrierid', transform: toFkId },
      { source: 'Driver_Name', target: 'driver_name', transform: trimOrNull },
      { source: 'Vehicle_Rego', target: 'vehicle_rego', transform: trimOrNull },
      { source: 'Origin_DestinationID', target: 'origin_destinationid', transform: toFkId },
      { source: 'Description', target: 'description', transform: trimOrNull },
      { source: 'NVD_No', target: 'nvd_no', transform: trimOrNull },
      { source: 'Purch_Lot_No', target: 'purch_lot_no', transform: trimOrNull },
      { source: 'Head_Count', target: 'head_count', transform: toNum },
      { source: 'Animal_Welfare', target: 'animal_welfare', transform: toBool },
      { source: 'WeighUnits', target: 'weighunits', transform: trimOrNull },
      { source: 'Gross_Weight', target: 'gross_weight', transform: toNum },
      { source: 'Tare_Weight', target: 'tare_weight', transform: toNum },
      { source: 'Shrink_Percent', target: 'shrink_percent', transform: toNum },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Treatment_Regimes',
    targetTable: 'health.treatment_regimes',
    query: `SELECT ID, DiseaseID, Day_Numb, Drug_Name, Dose, DoseByWeight, Drug_ID, UserID
            FROM dbo.Treatment_Regimes
            ORDER BY ID`,
    columns: [
      { source: 'DiseaseID', target: 'diseaseid', transform: toFkId },
      { source: 'Day_Numb', target: 'day_numb', transform: toNum },
      { source: 'Drug_Name', target: 'drug_name', transform: trimOrNull },
      { source: 'Dose', target: 'dose', transform: toNum },
      { source: 'DoseByWeight', target: 'dosebyweight', transform: trimOrNull },
      { source: 'Drug_ID', target: 'drug_id', transform: toFkId },
      { source: 'UserID', target: 'userid', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Trial_Description',
    targetTable: 'cattle.trial_description',
    query: `SELECT Trial_No, Name, Purpose, Description, Start_Date, End_Date, Total_Head, Results
            FROM dbo.Trial_Description
            ORDER BY Trial_No`,
    columns: [
      { source: 'Trial_No', target: 'trial_no', transform: toNum },
      { source: 'Name', target: 'name', transform: trimOrNull },
      { source: 'Purpose', target: 'purpose', transform: trimOrNull },
      { source: 'Description', target: 'description', transform: trimOrNull },
      { source: 'Start_Date', target: 'start_date', transform: toDate },
      { source: 'End_Date', target: 'end_date', transform: toDate },
      { source: 'Total_Head', target: 'total_head', transform: toNum },
      { source: 'Results', target: 'results', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Agistment_Transfer_Register',
    targetTable: 'cattle.agistment_transfer_register',
    query: `SELECT ID, Movement_Date, Agist_Lot_No, Agistor_Code, Numb_Head, Numb_Died, WBridge_Docket, Return_Wght, Weight_cattle_Sent, Agist_Weight_Gain, [WeightGain_$perKg], Inv_Number, Inv_Amount, Agist_Inv_Approved, Carrier, Carrier_Inv_No, Freight_Amount, Frght_Inv_Approved, Applied_To_Cattle_File, Notes, Agistor_TailTag, Vendor_Decl_Numb, Custom_FL_Returns
            FROM dbo.Agistment_Transfer_Register
            ORDER BY ID`,
    columns: [
      { source: 'Movement_Date', target: 'movement_date', transform: toDate },
      { source: 'Agist_Lot_No', target: 'agist_lot_no', transform: trimOrNull },
      { source: 'Agistor_Code', target: 'agistor_code', transform: toNum },
      { source: 'Numb_Head', target: 'numb_head', transform: toNum },
      { source: 'Numb_Died', target: 'numb_died', transform: toNum },
      { source: 'WBridge_Docket', target: 'w_bridge_docket', transform: trimOrNull },
      { source: 'Return_Wght', target: 'return_wght', transform: toNum },
      { source: 'Weight_cattle_Sent', target: 'weight_cattle_sent', transform: toNum },
      { source: 'Agist_Weight_Gain', target: 'agist_weight_gain', transform: toNum },
      { source: 'WeightGain_$perKg', target: 'weight_gain_dollarper_kg', transform: toNum },
      { source: 'Inv_Number', target: 'inv_number', transform: trimOrNull },
      { source: 'Inv_Amount', target: 'inv_amount', transform: toNum },
      { source: 'Agist_Inv_Approved', target: 'agist_inv_approved', transform: toDate },
      { source: 'Carrier', target: 'carrier', transform: trimOrNull },
      { source: 'Carrier_Inv_No', target: 'carrier_inv_no', transform: trimOrNull },
      { source: 'Freight_Amount', target: 'freight_amount', transform: toNum },
      { source: 'Frght_Inv_Approved', target: 'frght_inv_approved', transform: toDate },
      { source: 'Applied_To_Cattle_File', target: 'applied_to_cattle_file', transform: toBool },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Agistor_TailTag', target: 'agistor_tail_tag', transform: trimOrNull },
      { source: 'Vendor_Decl_Numb', target: 'vendor_decl_numb', transform: trimOrNull },
      { source: 'Custom_FL_Returns', target: 'custom_fl_returns', transform: toBool },
    ],
  },

  {
    order: 40,
    sourceTable: 'Location_Changes',
    targetTable: 'transport.location_changes',
    query: `SELECT BeastID, Ear_Tag, EID, Movement_Date, From_Location, To_Location, New_Animal, Slaughtered, Sent_To_Oracle, Sent_To_Oracle_Date, ID, Program_ID
            FROM dbo.Location_Changes
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Ear_Tag', target: 'ear_tag', transform: trimOrNull },
      { source: 'EID', target: 'eid', transform: trimOrNull },
      { source: 'Movement_Date', target: 'movement_date', transform: toDate },
      { source: 'From_Location', target: 'from_location', transform: trimOrNull },
      { source: 'To_Location', target: 'to_location', transform: trimOrNull },
      { source: 'New_Animal', target: 'new_animal', transform: toBool },
      { source: 'Slaughtered', target: 'slaughtered', transform: toBool },
      { source: 'Sent_To_Oracle', target: 'sent_to_oracle', transform: toBool },
      { source: 'Sent_To_Oracle_Date', target: 'sent_to_oracle_date', transform: toDate },
      { source: 'Program_ID', target: 'program_id', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Beast_Accumed_Feed_by_commodity',
    targetTable: 'finance.beast_accumed_feed_by_commodity',
    query: `SELECT BeastID, Commodity_Code, Accumed_Kgs, Accumed_Cost, Accumed_CustFeed_charge, Date_last_updated, ID
            FROM dbo.Beast_Accumed_Feed_by_commodity
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Commodity_Code', target: 'commodity_code', transform: toNum },
      { source: 'Accumed_Kgs', target: 'accumed_kgs', transform: toNum },
      { source: 'Accumed_Cost', target: 'accumed_cost', transform: toNum },
      { source: 'Accumed_CustFeed_charge', target: 'accumed_custfeed_charge', transform: toNum },
      { source: 'Date_last_updated', target: 'date_last_updated', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Beast_Breeding',
    targetTable: 'breeding.beast_breeding',
    query: `SELECT Beast_ID, Birth_Date, Birth_Wght, Sire, Dam, Genetics, Notes,
                   Breed, Sub_Breed, Breed_Pcnt, Sire_Line
            FROM dbo.Beast_Breeding
            ORDER BY Beast_ID`,
    columns: [
      { source: 'Beast_ID', target: 'beast_id', transform: toNum },
      { source: 'Birth_Date', target: 'birth_date', transform: toDate },
      { source: 'Birth_Wght', target: 'birth_wght', transform: toNum },
      { source: 'Sire', target: 'sire', transform: toNum },
      { source: 'Dam', target: 'dam', transform: toNum },
      { source: 'Genetics', target: 'genetics', transform: toNum },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Sub_Breed', target: 'sub_breed', transform: trimOrNull },
      { source: 'Breed_Pcnt', target: 'breed_pcnt', transform: toNum },
      { source: 'Sire_Line', target: 'sire_line', transform: trimOrNull },
    ],
    transformRow(rawRow, row, lookups) {
      const breedCode = rawRow.Breed;
      const map = lookups.breedMap || {};
      const name = map[breedCode] || map[String(breedCode)] || null;
      row.breed = name && !JUNK_BREEDS.has(name) ? name : null;
    },
  },

  {
    order: 40,
    sourceTable: 'Beast_Ohead_Appl_History',
    targetTable: 'cattle.overhead_application_history',
    query: `SELECT Ohead_Appl_Month_End_Date, [Ohead_$/Hd/Day], Ohead_Gross_Value, Ohead_Head, [Ohead_$/Hd/Day_Pen1], Ohead_Gross_Value_Pen1, Ohead_Head_Pen1, [Ohead_$/Hd/Day_Pen2], Ohead_Gross_Value_Pen2, Ohead_Head_Pen2, [Ohead_$/Hd/Day_Pen3], Ohead_Gross_Value_Pen3, Ohead_Head_Pen3, [Ohead_$/Hd/Day_Pen4], Ohead_Gross_Value_Pen4, Ohead_Head_Pen4, [Ohead_$/Hd/Day_Pen5], Ohead_Gross_Value_Pen5, Ohead_Head_Pen5, ID, [Ohead_$/Hd/Day_Oth], Ohead_Gross_Value_Oth, Ohead_Head_Oth
            FROM dbo.Beast_Ohead_Appl_History
            ORDER BY ID`,
    columns: [
      { source: 'Ohead_Appl_Month_End_Date', target: 'ohead_appl_month_end_date', transform: toDate },
      { source: 'Ohead_$/Hd/Day', target: 'ohead_cost_per_hd_day', transform: toNum },
      { source: 'Ohead_Gross_Value', target: 'ohead_gross_value', transform: toNum },
      { source: 'Ohead_Head', target: 'ohead_head', transform: toNum },
      { source: 'Ohead_$/Hd/Day_Pen1', target: 'ohead_cost_per_hd_day_pen1', transform: toNum },
      { source: 'Ohead_Gross_Value_Pen1', target: 'ohead_gross_value_pen1', transform: toNum },
      { source: 'Ohead_Head_Pen1', target: 'ohead_head_pen1', transform: toNum },
      { source: 'Ohead_$/Hd/Day_Pen2', target: 'ohead_cost_per_hd_day_pen2', transform: toNum },
      { source: 'Ohead_Gross_Value_Pen2', target: 'ohead_gross_value_pen2', transform: toNum },
      { source: 'Ohead_Head_Pen2', target: 'ohead_head_pen2', transform: toNum },
      { source: 'Ohead_$/Hd/Day_Pen3', target: 'ohead_cost_per_hd_day_pen3', transform: toNum },
      { source: 'Ohead_Gross_Value_Pen3', target: 'ohead_gross_value_pen3', transform: toNum },
      { source: 'Ohead_Head_Pen3', target: 'ohead_head_pen3', transform: toNum },
      { source: 'Ohead_$/Hd/Day_Pen4', target: 'ohead_cost_per_hd_day_pen4', transform: toNum },
      { source: 'Ohead_Gross_Value_Pen4', target: 'ohead_gross_value_pen4', transform: toNum },
      { source: 'Ohead_Head_Pen4', target: 'ohead_head_pen4', transform: toNum },
      { source: 'Ohead_$/Hd/Day_Pen5', target: 'ohead_cost_per_hd_day_pen5', transform: toNum },
      { source: 'Ohead_Gross_Value_Pen5', target: 'ohead_gross_value_pen5', transform: toNum },
      { source: 'Ohead_Head_Pen5', target: 'ohead_head_pen5', transform: toNum },
      { source: 'Ohead_$/Hd/Day_Oth', target: 'ohead_cost_per_hd_day_oth', transform: toNum },
      { source: 'Ohead_Gross_Value_Oth', target: 'ohead_gross_value_oth', transform: toNum },
      { source: 'Ohead_Head_Oth', target: 'ohead_head_oth', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'BeastMovement',
    targetTable: 'cattle.beast_movements',
    query: `SELECT BeastID, MoveDate
            FROM dbo.BeastMovement
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'MoveDate', target: 'movedate', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Breeding_Dams',
    targetTable: 'breeding.breeding_dams',
    query: `SELECT Dam_ID, Dam_Name, Dam_Supplier, Breed, EID, Notes
            FROM dbo.Breeding_Dams
            ORDER BY Dam_ID`,
    columns: [
      { source: 'Dam_ID', target: 'dam_id', transform: toNum },
      { source: 'Dam_Name', target: 'dam_name', transform: trimOrNull },
      { source: 'Dam_Supplier', target: 'dam_supplier', transform: trimOrNull },
      { source: 'EID', target: 'eid', transform: trimOrNull },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
    ],
    transformRow(rawRow, row, lookups) {
      const breedCode = rawRow.Breed;
      const map = lookups.breedMap || {};
      const name = map[breedCode] || map[String(breedCode)] || null;
      row.breed = name && !JUNK_BREEDS.has(name) ? name : null;
    },
  },

  {
    order: 40,
    sourceTable: 'Breeding_Sires',
    targetTable: 'breeding.breeding_sires',
    query: `SELECT Sire_ID, Sire_Name, Sire_Supplier, Sire_Line_ID, AWA_Sire_ID,
                   Breed, Sire_Line, EID, Notes
            FROM dbo.Breeding_Sires
            ORDER BY Sire_ID`,
    columns: [
      { source: 'Sire_ID', target: 'sire_id', transform: toNum },
      { source: 'Sire_Name', target: 'sire_name', transform: trimOrNull },
      { source: 'Sire_Supplier', target: 'sire_supplier', transform: trimOrNull },
      { source: 'Sire_Line_ID', target: 'sire_line_id', transform: toNum },
      { source: 'AWA_Sire_ID', target: 'awa_sire_id', transform: trimOrNull },
      { source: 'Sire_Line', target: 'sire_line', transform: trimOrNull },
      { source: 'EID', target: 'eid', transform: trimOrNull },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
    ],
    transformRow(rawRow, row, lookups) {
      const breedCode = rawRow.Breed;
      const map = lookups.breedMap || {};
      const name = map[breedCode] || map[String(breedCode)] || null;
      row.breed = name && !JUNK_BREEDS.has(name) ? name : null;
    },
  },

  {
    order: 40,
    sourceTable: 'Cattle_DOF_and_DIP',
    targetTable: 'cattle.cattle_dof_dip',
    query: `SELECT BeastID, DOF, DIP, Date_Calculated
            FROM dbo.Cattle_DOF_and_DIP
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'DOF', target: 'dof', transform: toNum },
      { source: 'DIP', target: 'dip', transform: toNum },
      { source: 'Date_Calculated', target: 'date_calculated', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Cattle_Feed_Update',
    targetTable: 'feed.cattle_feed_updates',
    query: `SELECT Pen_Number, Feed_Date, Head, Dollars_Applied, Kgs_Feed_As_Fed, ID, Ration_Name, Head_Expected, Dollars_not_Applied, Kgs_Not_Applied, EstCurrWght, DateApplied, Run_Number
            FROM dbo.Cattle_Feed_Update
            ORDER BY ID`,
    columns: [
      { source: 'Pen_Number', target: 'pen_number', transform: trimOrNull },
      { source: 'Feed_Date', target: 'feed_date', transform: toDate },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Dollars_Applied', target: 'dollars_applied', transform: toNum },
      { source: 'Kgs_Feed_As_Fed', target: 'kgs_feed_as_fed', transform: toNum },
      { source: 'Ration_Name', target: 'ration_name', transform: trimOrNull },
      { source: 'Head_Expected', target: 'head_expected', transform: toNum },
      { source: 'Dollars_not_Applied', target: 'dollars_not_applied', transform: toNum },
      { source: 'Kgs_Not_Applied', target: 'kgs_not_applied', transform: toNum },
      { source: 'EstCurrWght', target: 'est_curr_wght', transform: toNum },
      { source: 'DateApplied', target: 'date_applied', transform: toDate },
      { source: 'Run_Number', target: 'run_number', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Cattle_Photos',
    targetTable: 'cattle.cattle_photos',
    query: `SELECT BeastID, Ear_Tag, Photo, DateLastUpdated, ID
            FROM dbo.Cattle_Photos
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Ear_Tag', target: 'ear_tag', transform: trimOrNull },
      { source: 'Photo', target: 'photo', transform: trimOrNull },
      { source: 'DateLastUpdated', target: 'datelastupdated', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'CattleProcessed',
    targetTable: 'cattle.cattle_processed',
    query: `SELECT BeastID, WeighDate, ID, DraftGate, SavedDate
            FROM dbo.CattleProcessed
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'WeighDate', target: 'weighdate', transform: toDate },
      { source: 'DraftGate', target: 'draftgate', transform: toNum },
      { source: 'SavedDate', target: 'saveddate', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'ContactsContactTypes',
    targetTable: 'contacts.contactscontacttypes',
    query: `SELECT ID, Contact_ID, Contact_Type_ID
            FROM dbo.ContactsContactTypes
            ORDER BY ID`,
    columns: [
      { source: 'Contact_ID', target: 'contact_id', transform: toNum },
      { source: 'Contact_Type_ID', target: 'contact_type_id', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'New_cattle_records_Log',
    targetTable: 'cattle.new_cattle_records_log',
    query: `SELECT BeastID, Date_record_added, Mod_ule, Proceedure_Name, User_Number, ID, EarTag, EID
            FROM dbo.New_cattle_records_Log
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Date_record_added', target: 'date_record_added', transform: toDate },
      { source: 'Mod_ule', target: 'mod_ule', transform: trimOrNull },
      { source: 'Proceedure_Name', target: 'proceedure_name', transform: trimOrNull },
      { source: 'User_Number', target: 'user_number', transform: toNum },
      { source: 'EarTag', target: 'ear_tag', transform: trimOrNull },
      { source: 'EID', target: 'eid', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Paddock_Feeding',
    targetTable: 'feed.paddock_feeding',
    query: `SELECT BeastID, Paddock_Feed_Type, From_Date, To_Date, ID, Commodity_ID
            FROM dbo.Paddock_Feeding
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Paddock_Feed_Type', target: 'paddock_feed_type', transform: trimOrNull },
      { source: 'From_Date', target: 'from_date', transform: toDate },
      { source: 'To_Date', target: 'to_date', transform: toDate },
      { source: 'Commodity_ID', target: 'commodity_id', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Pen_Data_From_FeedDB',
    targetTable: 'feed.pen_data_from_feed_db',
    query: `SELECT Pen_Number_ID, Pen_Name, Mob_Name, Numb_Head, Ration_Name
            FROM dbo.Pen_Data_From_FeedDB
            ORDER BY Pen_Number_ID`,
    columns: [
      { source: 'Pen_Number_ID', target: 'pen_number_id', transform: toNum },
      { source: 'Pen_Name', target: 'pen_name', transform: trimOrNull },
      { source: 'Mob_Name', target: 'mob_name', transform: trimOrNull },
      { source: 'Numb_Head', target: 'numb_head', transform: toNum },
      { source: 'Ration_Name', target: 'ration_name', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Pending_Feed_Data',
    targetTable: 'feed.pending_feed_data',
    query: `SELECT Feed_date, PenName, Head, RationName, Feed_Weight, PenFeeds_RecID, Apply_to_Group, HeadSelected, Applied, Never_Apply, ID
            FROM dbo.Pending_Feed_Data
            ORDER BY ID`,
    columns: [
      { source: 'Feed_date', target: 'feed_date', transform: toDate },
      { source: 'PenName', target: 'pen_name', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'RationName', target: 'ration_name', transform: trimOrNull },
      { source: 'Feed_Weight', target: 'feed_weight', transform: toNum },
      { source: 'PenFeeds_RecID', target: 'pen_feeds_rec_id', transform: toNum },
      { source: 'Apply_to_Group', target: 'apply_to_group', transform: trimOrNull },
      { source: 'HeadSelected', target: 'head_selected', transform: toNum },
      { source: 'Applied', target: 'applied', transform: toBool },
      { source: 'Never_Apply', target: 'never_apply', transform: toBool },
    ],
  },

  {
    order: 40,
    sourceTable: 'PenRiders_log',
    targetTable: 'pen.penriders_log',
    query: `SELECT Employee_ID, Initials, Date_pen_checked, Pen_name, Head_in_pen, ID, Diagnoser, DOF
            FROM dbo.PenRiders_log
            ORDER BY ID`,
    columns: [
      { source: 'Employee_ID', target: 'employee_id', transform: toNum },
      { source: 'Initials', target: 'initials', transform: trimOrNull },
      { source: 'Date_pen_checked', target: 'date_pen_checked', transform: toDate },
      { source: 'Pen_name', target: 'pen_name', transform: trimOrNull },
      { source: 'Head_in_pen', target: 'head_in_pen', transform: toNum },
      { source: 'Diagnoser', target: 'diagnoser', transform: toBool },
      { source: 'DOF', target: 'dof', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'PensFed',
    targetTable: 'pen.pensfed',
    query: `SELECT FeedDate, Pen_Number, Ration_name, KilosFed, FeedValue, Applied_to_Cattle, ID, Dry_Matter, Last_Modified_timestamp
            FROM dbo.PensFed
            ORDER BY ID`,
    columns: [
      { source: 'FeedDate', target: 'feed_date', transform: toDate },
      { source: 'Pen_Number', target: 'pen_number', transform: trimOrNull },
      { source: 'Ration_name', target: 'ration_name', transform: trimOrNull },
      { source: 'KilosFed', target: 'kilos_fed', transform: toNum },
      { source: 'FeedValue', target: 'feed_value', transform: toNum },
      { source: 'Applied_to_Cattle', target: 'applied_to_cattle', transform: trimOrNull },
      { source: 'Dry_Matter', target: 'dry_matter', transform: toNum },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Purch_Lot_Cattle',
    targetTable: 'cattle.purchase_lot_cattle',
    query: `SELECT Lot_Number, Numb_Head, Price_Cnts_per_Kg, Weight, TailTag, Vndr_Decl_No, ID, Agistment_PIC, Last_Modified_timestamp
            FROM dbo.Purch_Lot_Cattle
            ORDER BY ID`,
    columns: [
      { source: 'Lot_Number', target: 'lot_number', transform: trimOrNull },
      { source: 'Numb_Head', target: 'numb_head', transform: toNum },
      { source: 'Price_Cnts_per_Kg', target: 'price_cnts_per_kg', transform: toNum },
      { source: 'Weight', target: 'weight', transform: toNum },
      { source: 'TailTag', target: 'tail_tag', transform: trimOrNull },
      { source: 'Vndr_Decl_No', target: 'vndr_decl_no', transform: trimOrNull },
      { source: 'Agistment_PIC', target: 'agistment_pic', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'last_modified_timestamp', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Resp_Disease_ReTreats',
    targetTable: 'health.resp_disease_retreats',
    query: `SELECT DrugCount, Drugs, Head, Deaths, ID
            FROM dbo.Resp_Disease_ReTreats
            ORDER BY ID`,
    columns: [
      { source: 'DrugCount', target: 'drug_count', transform: toNum },
      { source: 'Drugs', target: 'drugs', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Deaths', target: 'deaths', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Rudd_800_Traits',
    targetTable: 'breeding.rudd_800_traits',
    query: `SELECT Db_FldName, StartPos, FldLen, ID
            FROM dbo.Rudd_800_Traits
            ORDER BY ID`,
    columns: [
      { source: 'Db_FldName', target: 'db_fld_name', transform: trimOrNull },
      { source: 'StartPos', target: 'start_pos', transform: toNum },
      { source: 'FldLen', target: 'fld_len', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'SB_Rec_No_Booked',
    targetTable: 'health.sb_rec_no_booked',
    query: `SELECT SB_Rec_No_booked, ID
            FROM dbo.SB_Rec_No_Booked
            ORDER BY ID`,
    columns: [
      { source: 'SB_Rec_No_booked', target: 'sb_rec_no_booked', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'SCU_RecData',
    targetTable: 'reporting.scu_rec_data',
    query: `SELECT MthSeq, Month, SCU_Value, ID, HeadDays
            FROM dbo.SCU_RecData
            ORDER BY ID`,
    columns: [
      { source: 'MthSeq', target: 'mth_seq', transform: toNum },
      { source: 'Month', target: 'month', transform: trimOrNull },
      { source: 'SCU_Value', target: 'scu_value', transform: toNum },
      { source: 'HeadDays', target: 'head_days', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Sick_Beast_BRD_Symptoms',
    targetTable: 'health.sick_beast_brd_symptoms',
    query: `SELECT BeastID, Runny_Nose, Runny_eyes, Drool_slobber, Coughing, Increased_breathing_rate, Laboured_breathing, Reduced_gut_fill, SB_Rec_No
            FROM dbo.Sick_Beast_BRD_Symptoms
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Runny_Nose', target: 'runny_nose', transform: toBool },
      { source: 'Runny_eyes', target: 'runny_eyes', transform: toBool },
      { source: 'Drool_slobber', target: 'drool_slobber', transform: toBool },
      { source: 'Coughing', target: 'coughing', transform: toBool },
      { source: 'Increased_breathing_rate', target: 'increased_breathing_rate', transform: toBool },
      { source: 'Laboured_breathing', target: 'laboured_breathing', transform: toBool },
      { source: 'Reduced_gut_fill', target: 'reduced_gut_fill', transform: toBool },
      { source: 'SB_Rec_No', target: 'sb_rec_no', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Sick_Beast_Temperature',
    targetTable: 'health.sick_beast_temperatures',
    query: `SELECT SB_Rec_No, Temp_Date, Temperature, ID, BeastID, Weight
            FROM dbo.Sick_Beast_Temperature
            ORDER BY ID`,
    columns: [
      { source: 'SB_Rec_No', target: 'sb_rec_no', transform: toNum },
      { source: 'Temp_Date', target: 'temp_date', transform: toDate },
      { source: 'Temperature', target: 'temperature', transform: toNum },
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Weight', target: 'weight', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'StockRecData',
    targetTable: 'reporting.stock_rec_data',
    query: `SELECT LineHead, Head, Value, ID, AnimalCost, Freight, Agist_and_Feed, OtherCosts
            FROM dbo.StockRecData
            ORDER BY ID`,
    columns: [
      { source: 'LineHead', target: 'line_head', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Value', target: 'value', transform: toNum },
      { source: 'AnimalCost', target: 'animal_cost', transform: toNum },
      { source: 'Freight', target: 'freight', transform: toNum },
      { source: 'Agist_and_Feed', target: 'agist_and_feed', transform: toNum },
      { source: 'OtherCosts', target: 'other_costs', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Tag_Bucket_File',
    targetTable: 'cattle.tag_bucket',
    query: `SELECT RFID_Number, NLIS_Number
            FROM dbo.Tag_Bucket_File
            ORDER BY RFID_Number`,
    columns: [
      { source: 'RFID_Number', target: 'rfid_number', transform: trimOrNull },
      { source: 'NLIS_Number', target: 'nlis_number', transform: trimOrNull },
    ],
  },

  {
    order: 50,
    sourceTable: 'Archiving_Log',
    targetTable: 'operations.archiving_log',
    query: `SELECT Date_done, Reverse_Archive, Record_Selection, Records_Archived, ID
            FROM dbo.Archiving_Log
            ORDER BY ID`,
    columns: [
      { source: 'Date_done', target: 'date_done', transform: toDate },
      { source: 'Reverse_Archive', target: 'reverse_archive', transform: toBool },
      { source: 'Record_Selection', target: 'record_selection', transform: trimOrNull },
      { source: 'Records_Archived', target: 'records_archived', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Batch_Update_log',
    targetTable: 'cattle.batch_update_log',
    query: `SELECT Date_done, Username, UserID, Logtext, ID
            FROM dbo.Batch_Update_log
            ORDER BY ID`,
    columns: [
      { source: 'Date_done', target: 'date_done', transform: toDate },
      { source: 'Username', target: 'username', transform: trimOrNull },
      { source: 'UserID', target: 'user_id', transform: trimOrNull },
      { source: 'Logtext', target: 'logtext', transform: trimOrNull },
    ],
  },

  {
    order: 50,
    sourceTable: 'Carc_Feedback_Compliance',
    targetTable: 'carcase.carc_feedback_compliance',
    query: `SELECT SupplierID, SupplierName, Detail_Lot_No, Hist_Lot_No, Pref_Intake_Fat, Intake_Fat_Group, Intake_Fat_Hist, Pref_Intake_Wght, Intake_Wght_Group, Intake_Wght_Hist, Pref_Intake_Teeth, Intake_Teeth_Group, Intake_Teeth_Hist, Pref_SaleWght, SaleWght_Group, SaleWght_Hist, Pref_WGD, WGD_Group, WGD_Hist, Pref_Dress_Pcnt, Dress_Pcnt_Group, Dress_Pcnt_Hist, Pref_Mrb, Mrb_Group, Mrb_Hist, Pref_CarcP8, CarcP8_Group, CarcP8_Hist, Pref_EMA, EMA_Group, EMA_Hist, Pref_FatCol, FatCol_Group, FatCol_Hist, Pref_MeatCol, MeatCol_Group, MeatCol_Hist
            FROM dbo.Carc_Feedback_Compliance
            ORDER BY SupplierID`,
    columns: [
      { source: 'SupplierID', target: 'supplier_id', transform: toNum },
      { source: 'SupplierName', target: 'supplier_name', transform: trimOrNull },
      { source: 'Detail_Lot_No', target: 'detail_lot_no', transform: trimOrNull },
      { source: 'Hist_Lot_No', target: 'hist_lot_no', transform: trimOrNull },
      { source: 'Pref_Intake_Fat', target: 'pref_intake_fat', transform: trimOrNull },
      { source: 'Intake_Fat_Group', target: 'intake_fat_group', transform: toNum },
      { source: 'Intake_Fat_Hist', target: 'intake_fat_hist', transform: toNum },
      { source: 'Pref_Intake_Wght', target: 'pref_intake_wght', transform: trimOrNull },
      { source: 'Intake_Wght_Group', target: 'intake_wght_group', transform: toNum },
      { source: 'Intake_Wght_Hist', target: 'intake_wght_hist', transform: toNum },
      { source: 'Pref_Intake_Teeth', target: 'pref_intake_teeth', transform: trimOrNull },
      { source: 'Intake_Teeth_Group', target: 'intake_teeth_group', transform: toNum },
      { source: 'Intake_Teeth_Hist', target: 'intake_teeth_hist', transform: toNum },
      { source: 'Pref_SaleWght', target: 'pref_sale_wght', transform: trimOrNull },
      { source: 'SaleWght_Group', target: 'sale_wght_group', transform: toNum },
      { source: 'SaleWght_Hist', target: 'sale_wght_hist', transform: toNum },
      { source: 'Pref_WGD', target: 'pref_wgd', transform: trimOrNull },
      { source: 'WGD_Group', target: 'wgd_group', transform: toNum },
      { source: 'WGD_Hist', target: 'wgd_hist', transform: toNum },
      { source: 'Pref_Dress_Pcnt', target: 'pref_dress_pcnt', transform: trimOrNull },
      { source: 'Dress_Pcnt_Group', target: 'dress_pcnt_group', transform: toNum },
      { source: 'Dress_Pcnt_Hist', target: 'dress_pcnt_hist', transform: toNum },
      { source: 'Pref_Mrb', target: 'pref_mrb', transform: trimOrNull },
      { source: 'Mrb_Group', target: 'mrb_group', transform: toNum },
      { source: 'Mrb_Hist', target: 'mrb_hist', transform: toNum },
      { source: 'Pref_CarcP8', target: 'pref_carc_p8', transform: trimOrNull },
      { source: 'CarcP8_Group', target: 'carc_p8_group', transform: toNum },
      { source: 'CarcP8_Hist', target: 'carc_p8_hist', transform: toNum },
      { source: 'Pref_EMA', target: 'pref_ema', transform: trimOrNull },
      { source: 'EMA_Group', target: 'ema_group', transform: toNum },
      { source: 'EMA_Hist', target: 'ema_hist', transform: toNum },
      { source: 'Pref_FatCol', target: 'pref_fat_col', transform: trimOrNull },
      { source: 'FatCol_Group', target: 'fat_col_group', transform: toNum },
      { source: 'FatCol_Hist', target: 'fat_col_hist', transform: toNum },
      { source: 'Pref_MeatCol', target: 'pref_meat_col', transform: trimOrNull },
      { source: 'MeatCol_Group', target: 'meat_col_group', transform: toNum },
      { source: 'MeatCol_Hist', target: 'meat_col_hist', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Carc_Feedback_Mth_Avgs',
    targetTable: 'carcase.carc_feedback_mth_avgs',
    query: `SELECT YrMnth, Sale_Wght, DOF, WG_Day, Carc_Wght, Dress_Pcnt, Carc_Teeth, P8_fat, Eye_Mscle_Area, Marbling, Fat_Colour, Meat_Text
            FROM dbo.Carc_Feedback_Mth_Avgs
            ORDER BY YrMnth`,
    columns: [
      { source: 'YrMnth', target: 'yr_mnth', transform: trimOrNull },
      { source: 'Sale_Wght', target: 'sale_wght', transform: toNum },
      { source: 'DOF', target: 'dof', transform: toNum },
      { source: 'WG_Day', target: 'wg_day', transform: toNum },
      { source: 'Carc_Wght', target: 'carc_wght', transform: toNum },
      { source: 'Dress_Pcnt', target: 'dress_pcnt', transform: toNum },
      { source: 'Carc_Teeth', target: 'carc_teeth', transform: toNum },
      { source: 'P8_fat', target: 'p8_fat', transform: toNum },
      { source: 'Eye_Mscle_Area', target: 'eye_mscle_area', transform: toNum },
      { source: 'Marbling', target: 'marbling', transform: toNum },
      { source: 'Fat_Colour', target: 'fat_colour', transform: toNum },
      { source: 'Meat_Text', target: 'meat_text', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Carc_Feedback_Report_data',
    targetTable: 'carcase.carcase_feedback_report_data',
    query: `SELECT RecordType, Beast_ID, SupplierID, Ear_Tag_No, YrMnth, PurchDate, PurchWght, VendorTag, FL_Ent_Date, FL_Ent_Wght, Sale_Date, Sale_Wght, WG_Day, DOF, Carc_Wght, Dress_Pcnt, Carc_Teeth, P8_fat, Eye_Mscle_Area, Marbling, Fat_Colour, Meat_Colour, Meat_Text, Died, ID, Sickness_costs
            FROM dbo.Carc_Feedback_Report_data
            ORDER BY ID`,
    columns: [
      { source: 'RecordType', target: 'record_type', transform: toNum },
      { source: 'Beast_ID', target: 'beast_id', transform: toNum },
      { source: 'SupplierID', target: 'supplier_id', transform: toNum },
      { source: 'Ear_Tag_No', target: 'ear_tag_no', transform: trimOrNull },
      { source: 'YrMnth', target: 'yr_mnth', transform: trimOrNull },
      { source: 'PurchDate', target: 'purch_date', transform: toDate },
      { source: 'PurchWght', target: 'purch_wght', transform: toNum },
      { source: 'VendorTag', target: 'vendor_tag', transform: trimOrNull },
      { source: 'FL_Ent_Date', target: 'fl_ent_date', transform: toDate },
      { source: 'FL_Ent_Wght', target: 'fl_ent_wght', transform: toNum },
      { source: 'Sale_Date', target: 'sale_date', transform: toDate },
      { source: 'Sale_Wght', target: 'sale_wght', transform: toNum },
      { source: 'WG_Day', target: 'wg_day', transform: toNum },
      { source: 'DOF', target: 'dof', transform: toNum },
      { source: 'Carc_Wght', target: 'carc_wght', transform: toNum },
      { source: 'Dress_Pcnt', target: 'dress_pcnt', transform: toNum },
      { source: 'Carc_Teeth', target: 'carc_teeth', transform: toNum },
      { source: 'P8_fat', target: 'p8_fat', transform: toNum },
      { source: 'Eye_Mscle_Area', target: 'eye_mscle_area', transform: toNum },
      { source: 'Marbling', target: 'marbling', transform: toNum },
      { source: 'Fat_Colour', target: 'fat_colour', transform: toNum },
      { source: 'Meat_Colour', target: 'meat_colour', transform: toNum },
      { source: 'Meat_Text', target: 'meat_text', transform: toNum },
      { source: 'Died', target: 'died', transform: toBool },
      { source: 'Sickness_costs', target: 'sickness_costs', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Cattle_by_Location_Table',
    targetTable: 'reporting.cattle_by_location',
    query: `SELECT EntryMonth, RV_Count, RV_PrimeCost, RV_Feed_Cost, RV_OtherCosts, CustFL_Count, CustFL_PrimeCost, CustFL_Feed_Cost, CustFL_OtherCosts, RV_FL_Entry_Wght
            FROM dbo.Cattle_by_Location_Table
            ORDER BY EntryMonth`,
    columns: [
      { source: 'EntryMonth', target: 'entry_month', transform: trimOrNull },
      { source: 'RV_Count', target: 'rv_count', transform: toNum },
      { source: 'RV_PrimeCost', target: 'rv_prime_cost', transform: toNum },
      { source: 'RV_Feed_Cost', target: 'rv_feed_cost', transform: toNum },
      { source: 'RV_OtherCosts', target: 'rv_other_costs', transform: toNum },
      { source: 'CustFL_Count', target: 'cust_fl_count', transform: toNum },
      { source: 'CustFL_PrimeCost', target: 'cust_fl_prime_cost', transform: toNum },
      { source: 'CustFL_Feed_Cost', target: 'cust_fl_feed_cost', transform: toNum },
      { source: 'CustFL_OtherCosts', target: 'cust_fl_other_costs', transform: toNum },
      { source: 'RV_FL_Entry_Wght', target: 'rv_fl_entry_wght', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Cattle_Query_Month_Report_TAB',
    targetTable: 'reporting.cattle_query_month_report',
    query: `SELECT BeastID, Current_LocType_ID, Start_Date, Weigh_date, Weighing_Type, Weight, To_Locn_Type_ID, To_From_Agistor, Beast_sale_Type_ID, Cull_Reason_ID, BE_Agist_Lot_No, Lot_Number, Purchase_date, PRIME_COST, Feed_Cost, Oheads_Cost, Other_Costs, ID, Mkt_Cat
            FROM dbo.Cattle_Query_Month_Report_TAB
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Current_LocType_ID', target: 'current_loc_type_id', transform: toNum },
      { source: 'Start_Date', target: 'start_date', transform: toDate },
      { source: 'Weigh_date', target: 'weigh_date', transform: toDate },
      { source: 'Weighing_Type', target: 'weighing_type', transform: toNum },
      { source: 'Weight', target: 'weight', transform: toNum },
      { source: 'To_Locn_Type_ID', target: 'to_locn_type_id', transform: toNum },
      { source: 'To_From_Agistor', target: 'to_from_agistor', transform: toNum },
      { source: 'Beast_sale_Type_ID', target: 'beast_sale_type_id', transform: toNum },
      { source: 'Cull_Reason_ID', target: 'cull_reason_id', transform: toNum },
      { source: 'BE_Agist_Lot_No', target: 'be_agist_lot_no', transform: trimOrNull },
      { source: 'Lot_Number', target: 'lot_number', transform: trimOrNull },
      { source: 'Purchase_date', target: 'purchase_date', transform: toDate },
      { source: 'PRIME_COST', target: 'prime_cost', transform: toNum },
      { source: 'Feed_Cost', target: 'feed_cost', transform: toNum },
      { source: 'Oheads_Cost', target: 'oheads_cost', transform: toNum },
      { source: 'Other_Costs', target: 'other_costs', transform: toNum },
      { source: 'Mkt_Cat', target: 'mkt_cat', transform: trimOrNull },
    ],
  },

  {
    order: 50,
    sourceTable: 'CustFeed_Invoices_list',
    targetTable: 'finance.custfeed_invoices_list',
    query: `SELECT Purch_Lot_No, Period_from, Period_To, Cattle_Owner, Invoice_Number, Total_Charges, GST_rate, ID, Billing_Company
            FROM dbo.CustFeed_Invoices_list
            ORDER BY ID`,
    columns: [
      { source: 'Purch_Lot_No', target: 'purch_lot_no', transform: trimOrNull },
      { source: 'Period_from', target: 'period_from', transform: toDate },
      { source: 'Period_To', target: 'period_to', transform: toDate },
      { source: 'Cattle_Owner', target: 'cattle_owner', transform: trimOrNull },
      { source: 'Invoice_Number', target: 'invoice_number', transform: trimOrNull },
      { source: 'Total_Charges', target: 'total_charges', transform: toNum },
      { source: 'GST_rate', target: 'gst_rate', transform: toNum },
      { source: 'Billing_Company', target: 'billing_company', transform: trimOrNull },
    ],
  },

  {
    order: 50,
    sourceTable: 'Custfeed_Lot_Summary',
    targetTable: 'finance.custfeed_lot_summary',
    query: `SELECT Purch_Lot_No, Date_Started, Cattle_Class, Avg_In_Wght, Tag_Range, Head_In, Deads, Shipped, Current_Hospital, Current_Bullers, Current_Non_Performers, Current_Head, Calender_Days_On_Feed_period, Calender_Days_On_Feed_ToDate, Avg_Days_in_Feed_Period, Avg_Days_ToDate, Avg_FeedCost_per_Hd_per_Day_Period, Avg_FeedCost_per_Hd_per_Day_ToDate, Feed_Charges_Period, Feed_Charges_ToDate, Head_Days_Period, Head_Days_ToDate, Kgs_Feed_Period, Kgs_Feed_ToDate, Induction_Costs_Period, Induction_Costs_ToDate, OtherCosts_Period, OtherCosts_ToDate, Cattle_Owner, Agist_Rate_per_day, Head_Arrived_in_Period, Head_Shipped_in_Period, Head_at_Period_Start, Died_in_Period, Drugs_Costs_in_Period, Drugs_Costs_to_date, Comments, Cattle_owner_ID, Cattle_owner_details, Days_invoice_due, Agist_days_for_Period, Agist_days_to_date, Dry_Kgs_Feed_Period, Dry_Kgs_Feed_ToDate
            FROM dbo.Custfeed_Lot_Summary
            ORDER BY Purch_Lot_No`,
    columns: [
      { source: 'Purch_Lot_No', target: 'purch_lot_no', transform: trimOrNull },
      { source: 'Date_Started', target: 'date_started', transform: toDate },
      { source: 'Cattle_Class', target: 'cattle_class', transform: trimOrNull },
      { source: 'Avg_In_Wght', target: 'avg_in_wght', transform: toNum },
      { source: 'Tag_Range', target: 'tag_range', transform: trimOrNull },
      { source: 'Head_In', target: 'head_in', transform: toNum },
      { source: 'Deads', target: 'deads', transform: toNum },
      { source: 'Shipped', target: 'shipped', transform: toNum },
      { source: 'Current_Hospital', target: 'current_hospital', transform: toNum },
      { source: 'Current_Bullers', target: 'current_bullers', transform: toNum },
      { source: 'Current_Non_Performers', target: 'current_non_performers', transform: toNum },
      { source: 'Current_Head', target: 'current_head', transform: toNum },
      { source: 'Calender_Days_On_Feed_period', target: 'calender_days_on_feed_period', transform: toNum },
      { source: 'Calender_Days_On_Feed_ToDate', target: 'calender_days_on_feed_to_date', transform: toNum },
      { source: 'Avg_Days_in_Feed_Period', target: 'avg_days_in_feed_period', transform: toNum },
      { source: 'Avg_Days_ToDate', target: 'avg_days_to_date', transform: toNum },
      { source: 'Avg_FeedCost_per_Hd_per_Day_Period', target: 'avg_feed_cost_per_hd_per_day_period', transform: toNum },
      { source: 'Avg_FeedCost_per_Hd_per_Day_ToDate', target: 'avg_feed_cost_per_hd_per_day_to_date', transform: toNum },
      { source: 'Feed_Charges_Period', target: 'feed_charges_period', transform: toNum },
      { source: 'Feed_Charges_ToDate', target: 'feed_charges_to_date', transform: toNum },
      { source: 'Head_Days_Period', target: 'head_days_period', transform: toNum },
      { source: 'Head_Days_ToDate', target: 'head_days_to_date', transform: toNum },
      { source: 'Kgs_Feed_Period', target: 'kgs_feed_period', transform: toNum },
      { source: 'Kgs_Feed_ToDate', target: 'kgs_feed_to_date', transform: toNum },
      { source: 'Induction_Costs_Period', target: 'induction_costs_period', transform: toNum },
      { source: 'Induction_Costs_ToDate', target: 'induction_costs_to_date', transform: toNum },
      { source: 'OtherCosts_Period', target: 'other_costs_period', transform: toNum },
      { source: 'OtherCosts_ToDate', target: 'other_costs_to_date', transform: toNum },
      { source: 'Cattle_Owner', target: 'cattle_owner', transform: trimOrNull },
      { source: 'Agist_Rate_per_day', target: 'agist_rate_per_day', transform: toNum },
      { source: 'Head_Arrived_in_Period', target: 'head_arrived_in_period', transform: toNum },
      { source: 'Head_Shipped_in_Period', target: 'head_shipped_in_period', transform: toNum },
      { source: 'Head_at_Period_Start', target: 'head_at_period_start', transform: toNum },
      { source: 'Died_in_Period', target: 'died_in_period', transform: toNum },
      { source: 'Drugs_Costs_in_Period', target: 'drugs_costs_in_period', transform: toNum },
      { source: 'Drugs_Costs_to_date', target: 'drugs_costs_to_date', transform: toNum },
      { source: 'Comments', target: 'comments', transform: trimOrNull },
      { source: 'Cattle_owner_ID', target: 'cattle_owner_id', transform: toNum },
      { source: 'Cattle_owner_details', target: 'cattle_owner_details', transform: trimOrNull },
      { source: 'Days_invoice_due', target: 'days_invoice_due', transform: toNum },
      { source: 'Agist_days_for_Period', target: 'agist_days_for_period', transform: toNum },
      { source: 'Agist_days_to_date', target: 'agist_days_to_date', transform: toNum },
      { source: 'Dry_Kgs_Feed_Period', target: 'dry_kgs_feed_period', transform: toNum },
      { source: 'Dry_Kgs_Feed_ToDate', target: 'dry_kgs_feed_to_date', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Daily_Cattle_Inventory',
    targetTable: 'cattle.daily_cattle_inventory',
    query: `SELECT Inventory_Date, FL_Entries, X_RV_Paddock, FL_Deaths, FL_Culls, FL_Sales, Calc_FL_Head, Actual_FL_Head, Accum_Month_HeadDays
            FROM dbo.Daily_Cattle_Inventory
            ORDER BY Inventory_Date`,
    columns: [
      { source: 'Inventory_Date', target: 'inventory_date', transform: toDate },
      { source: 'FL_Entries', target: 'fl_entries', transform: toNum },
      { source: 'X_RV_Paddock', target: 'x_rv_paddock', transform: toNum },
      { source: 'FL_Deaths', target: 'fl_deaths', transform: toNum },
      { source: 'FL_Culls', target: 'fl_culls', transform: toNum },
      { source: 'FL_Sales', target: 'fl_sales', transform: toNum },
      { source: 'Calc_FL_Head', target: 'calc_fl_head', transform: toNum },
      { source: 'Actual_FL_Head', target: 'actual_fl_head', transform: toNum },
      { source: 'Accum_Month_HeadDays', target: 'accum_month_head_days', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Error_Log',
    targetTable: 'system.error_log',
    query: `SELECT Event_date, Mod_ule, Proceedure_Name, Error_Code, Error_message, User_Number, e_value, ID
            FROM dbo.Error_Log
            ORDER BY ID`,
    columns: [
      { source: 'Event_date', target: 'event_date', transform: toDate },
      { source: 'Mod_ule', target: 'mod_ule', transform: trimOrNull },
      { source: 'Proceedure_Name', target: 'proceedure_name', transform: trimOrNull },
      { source: 'Error_Code', target: 'error_code', transform: toNum },
      { source: 'Error_message', target: 'error_message', transform: trimOrNull },
      { source: 'User_Number', target: 'user_number', transform: toNum },
      { source: 'e_value', target: 'e_value', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Feed_Totals_By_Ration',
    targetTable: 'feed.feed_totals_by_ration',
    query: `SELECT BeastID, Ration, KgsFed, FeedCost, ID, Units_DryMatter
            FROM dbo.Feed_Totals_By_Ration
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Ration', target: 'ration', transform: trimOrNull },
      { source: 'KgsFed', target: 'kgs_fed', transform: toNum },
      { source: 'FeedCost', target: 'feed_cost', transform: toNum },
      { source: 'Units_DryMatter', target: 'units_dry_matter', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Head_By_Disease',
    targetTable: 'health.head_by_disease',
    query: `SELECT Body_System, Disease_name, Total_Head, Recovered, Paddock, Sold, Died, Treated_and_Died, ID
            FROM dbo.Head_By_Disease
            ORDER BY ID`,
    columns: [
      { source: 'Body_System', target: 'body_system', transform: trimOrNull },
      { source: 'Disease_name', target: 'disease_name', transform: trimOrNull },
      { source: 'Total_Head', target: 'total_head', transform: toNum },
      { source: 'Recovered', target: 'recovered', transform: toNum },
      { source: 'Paddock', target: 'paddock', transform: toNum },
      { source: 'Sold', target: 'sold', transform: toNum },
      { source: 'Died', target: 'died', transform: toNum },
      { source: 'Treated_and_Died', target: 'treated_and_died', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Last_7_Days_Pulls_Headcounts',
    targetTable: 'reporting.last_7_days_pulls',
    query: `SELECT Pen, HeadAtStart, Head_n_Days_Ago
            FROM dbo.Last_7_Days_Pulls_Headcounts
            ORDER BY Pen`,
    columns: [
      { source: 'Pen', target: 'pen', transform: trimOrNull },
      { source: 'HeadAtStart', target: 'head_at_start', transform: toNum },
      { source: 'Head_n_Days_Ago', target: 'head_n_days_ago', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Month_End_StockOnHand',
    targetTable: 'reporting.month_end_stockonhand',
    query: `SELECT Month_End_Date, SOH_Head, SOH_Prime_Cost, SOH_Feed_Cost, SOH_Oheads_Cost, Total_Costs
            FROM dbo.Month_End_StockOnHand
            ORDER BY Month_End_Date`,
    columns: [
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'SOH_Head', target: 'soh_head', transform: toNum },
      { source: 'SOH_Prime_Cost', target: 'soh_prime_cost', transform: toNum },
      { source: 'SOH_Feed_Cost', target: 'soh_feed_cost', transform: toNum },
      { source: 'SOH_Oheads_Cost', target: 'soh_oheads_cost', transform: toNum },
      { source: 'Total_Costs', target: 'total_costs', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Monthly_Adjustment_OB',
    targetTable: 'reporting.monthly_adjustment_ob',
    query: `SELECT Month_End_Date, Head, Prime_Cost, Feed_Cost, Other_Costs, ID
            FROM dbo.Monthly_Adjustment_OB
            ORDER BY ID`,
    columns: [
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Prime_Cost', target: 'prime_cost', transform: toNum },
      { source: 'Feed_Cost', target: 'feed_cost', transform: toNum },
      { source: 'Other_Costs', target: 'other_costs', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Monthly_Agistor_Movements',
    targetTable: 'reporting.monthly_agistor_movements',
    query: `SELECT Rec_ID, Month_End_Date, Agistor_ID, Seq_No, Section_Name, Head, Prime_Cost
            FROM dbo.Monthly_Agistor_Movements
            ORDER BY Rec_ID`,
    columns: [
      { source: 'Rec_ID', target: 'rec_id', transform: toNum },
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'Agistor_ID', target: 'agistor_id', transform: toNum },
      { source: 'Seq_No', target: 'seq_no', transform: toNum },
      { source: 'Section_Name', target: 'section_name', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Prime_Cost', target: 'prime_cost', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Monthly_Feedlot_Reconciliation',
    targetTable: 'reporting.monthly_reconciliation',
    query: `SELECT Rec_ID, Month_End_Date, Seq_No, Section_Heading, Section_Name, Head, Prime_Cost, Feed_Cost, Other_Costs, Total_Costs
            FROM dbo.Monthly_Feedlot_Reconciliation
            ORDER BY Rec_ID`,
    columns: [
      { source: 'Rec_ID', target: 'rec_id', transform: toNum },
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'Seq_No', target: 'seq_no', transform: toNum },
      { source: 'Section_Heading', target: 'section_heading', transform: trimOrNull },
      { source: 'Section_Name', target: 'section_name', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Prime_Cost', target: 'prime_cost', transform: toNum },
      { source: 'Feed_Cost', target: 'feed_cost', transform: toNum },
      { source: 'Other_Costs', target: 'other_costs', transform: toNum },
      { source: 'Total_Costs', target: 'total_costs', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Monthly_FL_Intake_Cost',
    targetTable: 'finance.monthly_fl_intake_cost',
    query: `SELECT Rec_ID, Month_End_Date, Group_No, Seq_No, Section_Name, Head, Prime_Cost, Intake_Kgs
            FROM dbo.Monthly_FL_Intake_Cost
            ORDER BY Rec_ID`,
    columns: [
      { source: 'Rec_ID', target: 'rec_id', transform: toNum },
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'Group_No', target: 'group_no', transform: toNum },
      { source: 'Seq_No', target: 'seq_no', transform: toNum },
      { source: 'Section_Name', target: 'section_name', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Prime_Cost', target: 'prime_cost', transform: toNum },
      { source: 'Intake_Kgs', target: 'intake_kgs', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Monthly_Movements',
    targetTable: 'reporting.monthly_movements',
    query: `SELECT Rec_ID, Month_End_Date, Section_Seq_Number, Section_Name, Sub_Section, Culls_Head, Culls_Kgs, Culls_PrimeCost, Culls_Feed_Cost, Culls_Other_Costs, RV_Agist_Head, RV_Agist_Kgs, RV_Agist_PrimeCost, RV_Agist_Feed_Cost, RV_Agist_Other_Costs, FeedLot_Head, Feedlot_Kgs, FeedLot_PrimeCost, FeedLot_Feed_Cost, FeedLot_Other_Costs, Agist_Head, Agist_Kgs, Agist_PrimeCost, Agist_Feed_Cost, Agist_Other_Costs, Cust_Feedlot_Head, Cust_Feedlot_Kgs, Cust_Feedlot_PrimeCost, Cust_Feedlot_Feed_Cost, Cust_Feedlot_Other_Costs
            FROM dbo.Monthly_Movements
            ORDER BY Rec_ID`,
    columns: [
      { source: 'Rec_ID', target: 'rec_id', transform: toNum },
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'Section_Seq_Number', target: 'section_seq_number', transform: toNum },
      { source: 'Section_Name', target: 'section_name', transform: trimOrNull },
      { source: 'Sub_Section', target: 'sub_section', transform: trimOrNull },
      { source: 'Culls_Head', target: 'culls_head', transform: toNum },
      { source: 'Culls_Kgs', target: 'culls_kgs', transform: toNum },
      { source: 'Culls_PrimeCost', target: 'culls_prime_cost', transform: toNum },
      { source: 'Culls_Feed_Cost', target: 'culls_feed_cost', transform: toNum },
      { source: 'Culls_Other_Costs', target: 'culls_other_costs', transform: toNum },
      { source: 'RV_Agist_Head', target: 'rv_agist_head', transform: toNum },
      { source: 'RV_Agist_Kgs', target: 'rv_agist_kgs', transform: toNum },
      { source: 'RV_Agist_PrimeCost', target: 'rv_agist_prime_cost', transform: toNum },
      { source: 'RV_Agist_Feed_Cost', target: 'rv_agist_feed_cost', transform: toNum },
      { source: 'RV_Agist_Other_Costs', target: 'rv_agist_other_costs', transform: toNum },
      { source: 'FeedLot_Head', target: 'feed_lot_head', transform: toNum },
      { source: 'Feedlot_Kgs', target: 'feedlot_kgs', transform: toNum },
      { source: 'FeedLot_PrimeCost', target: 'feed_lot_prime_cost', transform: toNum },
      { source: 'FeedLot_Feed_Cost', target: 'feed_lot_feed_cost', transform: toNum },
      { source: 'FeedLot_Other_Costs', target: 'feed_lot_other_costs', transform: toNum },
      { source: 'Agist_Head', target: 'agist_head', transform: toNum },
      { source: 'Agist_Kgs', target: 'agist_kgs', transform: toNum },
      { source: 'Agist_PrimeCost', target: 'agist_prime_cost', transform: toNum },
      { source: 'Agist_Feed_Cost', target: 'agist_feed_cost', transform: toNum },
      { source: 'Agist_Other_Costs', target: 'agist_other_costs', transform: toNum },
      { source: 'Cust_Feedlot_Head', target: 'cust_feedlot_head', transform: toNum },
      { source: 'Cust_Feedlot_Kgs', target: 'cust_feedlot_kgs', transform: toNum },
      { source: 'Cust_Feedlot_PrimeCost', target: 'cust_feedlot_prime_cost', transform: toNum },
      { source: 'Cust_Feedlot_Feed_Cost', target: 'cust_feedlot_feed_cost', transform: toNum },
      { source: 'Cust_Feedlot_Other_Costs', target: 'cust_feedlot_other_costs', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Monthly_RV_Agist_Reconciliation',
    targetTable: 'reporting.monthly_rv_agist_reconciliation',
    query: `SELECT Rec_ID, Month_End_Date, Seq_No, Section_Heading, Section_Name, Head, Prime_Cost
            FROM dbo.Monthly_RV_Agist_Reconciliation
            ORDER BY Rec_ID`,
    columns: [
      { source: 'Rec_ID', target: 'rec_id', transform: toNum },
      { source: 'Month_End_Date', target: 'month_end_date', transform: toDate },
      { source: 'Seq_No', target: 'seq_no', transform: toNum },
      { source: 'Section_Heading', target: 'section_heading', transform: trimOrNull },
      { source: 'Section_Name', target: 'section_name', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
      { source: 'Prime_Cost', target: 'prime_cost', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Pen_mort_morb_list',
    targetTable: 'pen.pen_mort_morb',
    query: `SELECT Pen_Number, DOF, Purch_Lot_No, CountOfEar_Tag, Head_Sick, Head_Died, Entry_Date, HeadDays, Feed_yesterday, Feed_last_3_days, Feed_last_7_days, average_entry_weight, ID
            FROM dbo.Pen_mort_morb_list
            ORDER BY ID`,
    columns: [
      { source: 'Pen_Number', target: 'pen_number', transform: trimOrNull },
      { source: 'DOF', target: 'dof', transform: toNum },
      { source: 'Purch_Lot_No', target: 'purch_lot_no', transform: trimOrNull },
      { source: 'CountOfEar_Tag', target: 'count_of_ear_tag', transform: toNum },
      { source: 'Head_Sick', target: 'head_sick', transform: toNum },
      { source: 'Head_Died', target: 'head_died', transform: toNum },
      { source: 'Entry_Date', target: 'entry_date', transform: trimOrNull },
      { source: 'HeadDays', target: 'head_days', transform: toNum },
      { source: 'Feed_yesterday', target: 'feed_yesterday', transform: toNum },
      { source: 'Feed_last_3_days', target: 'feed_last_3_days', transform: toNum },
      { source: 'Feed_last_7_days', target: 'feed_last_7_days', transform: toNum },
      { source: 'average_entry_weight', target: 'average_entry_weight', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'PenList_AsAt',
    targetTable: 'cattle.pen_list_snapshots',
    query: `SELECT BeastID, Pen
            FROM dbo.PenList_AsAt
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Pen', target: 'pen', transform: trimOrNull },
    ],
  },

  {
    order: 50,
    sourceTable: 'Purchase_Totals',
    targetTable: 'purchasing.purchase_totals',
    query: `SELECT Tail_Tag, Start_Date, Head
            FROM dbo.Purchase_Totals
            ORDER BY Tail_Tag`,
    columns: [
      { source: 'Tail_Tag', target: 'tail_tag', transform: trimOrNull },
      { source: 'Start_Date', target: 'start_date', transform: toDate },
      { source: 'Head', target: 'head', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Sick_By_DOF',
    targetTable: 'health.sick_by_dof',
    query: `SELECT Disease_ID, Pre_FL_Entry, [0-29_Days], [30-59_Days], [60-89_Days], [90-119_Days], [120-159_Days], [160-189_Days], [190-219_Days], [220-249_Days], [250-289_Days], [290-319_Days], [320-359_Days], MoreThan360Days, ID
            FROM dbo.Sick_By_DOF
            ORDER BY ID`,
    columns: [
      { source: 'Disease_ID', target: 'disease_id', transform: toNum },
      { source: 'Pre_FL_Entry', target: 'pre_fl_entry', transform: toNum },
      { source: '0-29_Days', target: 'days_0_29', transform: toNum },
      { source: '30-59_Days', target: 'days_30_59', transform: toNum },
      { source: '60-89_Days', target: 'days_60_89', transform: toNum },
      { source: '90-119_Days', target: 'days_90_119', transform: toNum },
      { source: '120-159_Days', target: 'days_120_159', transform: toNum },
      { source: '160-189_Days', target: 'days_160_189', transform: toNum },
      { source: '190-219_Days', target: 'days_190_219', transform: toNum },
      { source: '220-249_Days', target: 'days_220_249', transform: toNum },
      { source: '250-289_Days', target: 'days_250_289', transform: toNum },
      { source: '290-319_Days', target: 'days_290_319', transform: toNum },
      { source: '320-359_Days', target: 'days_320_359', transform: toNum },
      { source: 'MoreThan360Days', target: 'more_than360_days', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'SOH_by_Month',
    targetTable: 'reporting.soh_by_month',
    query: `SELECT MnthYYYYmmm, Head, ID
            FROM dbo.SOH_by_Month
            ORDER BY ID`,
    columns: [
      { source: 'MnthYYYYmmm', target: 'mnth_yyy_ymmm', transform: trimOrNull },
      { source: 'Head', target: 'head', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'TandR_Buying_details',
    targetTable: 'finance.tandr_buying_details',
    query: `SELECT BeastID, Agent_ID, Buyer_ID, Supplier_ID, Sale_yard_Pen, Animal_Grade, SaleYard_or_Paddock, Payment_Status, Date_Purchased, Date_paid
            FROM dbo.TandR_Buying_details
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beastid', transform: toNum },
      { source: 'Agent_ID', target: 'agent_id', transform: toNum },
      { source: 'Buyer_ID', target: 'buyer_id', transform: toNum },
      { source: 'Supplier_ID', target: 'supplier_id', transform: toNum },
      { source: 'Sale_yard_Pen', target: 'sale_yard_pen', transform: trimOrNull },
      { source: 'Animal_Grade', target: 'animal_grade', transform: trimOrNull },
      { source: 'SaleYard_or_Paddock', target: 'sale_yard_or_paddock', transform: trimOrNull },
      { source: 'Payment_Status', target: 'payment_status', transform: trimOrNull },
      { source: 'Date_Purchased', target: 'date_purchased', transform: toDate },
      { source: 'Date_paid', target: 'date_paid', transform: toDate },
    ],
  },

  {
    order: 50,
    sourceTable: 'TandR_Costs_Report',
    targetTable: 'finance.trading_costs_report',
    query: `SELECT BeastID, EID, [Group], Col1, Col2, Col3, Col4, Col5, Col6, Col7, Col8, Col9, Col10, Dress_Weight, Doll_per_Kg_dressed, ID, Ear_Tag, Purch_Lot_No, FL_entry_date, FL_entry_wght, DOF
            FROM dbo.TandR_Costs_Report
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'EID', target: 'eid', transform: trimOrNull },
      { source: 'Group', target: 'group_name', transform: trimOrNull },
      { source: 'Col1', target: 'col1', transform: toNum },
      { source: 'Col2', target: 'col2', transform: toNum },
      { source: 'Col3', target: 'col3', transform: toNum },
      { source: 'Col4', target: 'col4', transform: toNum },
      { source: 'Col5', target: 'col5', transform: toNum },
      { source: 'Col6', target: 'col6', transform: toNum },
      { source: 'Col7', target: 'col7', transform: toNum },
      { source: 'Col8', target: 'col8', transform: toNum },
      { source: 'Col9', target: 'col9', transform: toNum },
      { source: 'Col10', target: 'col10', transform: toNum },
      { source: 'Dress_Weight', target: 'dress_weight', transform: toNum },
      { source: 'Doll_per_Kg_dressed', target: 'doll_per_kg_dressed', transform: toNum },
      { source: 'Ear_Tag', target: 'ear_tag', transform: trimOrNull },
      { source: 'Purch_Lot_No', target: 'purch_lot_no', transform: trimOrNull },
      { source: 'FL_entry_date', target: 'fl_entry_date', transform: toDate },
      { source: 'FL_entry_wght', target: 'fl_entry_wght', transform: toNum },
      { source: 'DOF', target: 'dof', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'User_Log_Ons',
    targetTable: 'system.user_log_ons',
    query: `SELECT User_Number, Log_on_Date_time, Term_inal, ID
            FROM dbo.User_Log_Ons
            ORDER BY ID`,
    columns: [
      { source: 'User_Number', target: 'user_number', transform: toNum },
      { source: 'Log_on_Date_time', target: 'log_on_date_time', transform: toDate },
      { source: 'Term_inal', target: 'term_inal', transform: trimOrNull },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ──  FEED / BUNK / RATION DOMAIN  ────────────────────────────
  // ══════════════════════════════════════════════════════════════

  // ── Lookup-level feed tables (order 10) ─────────────────────

  {
    order: 10,
    sourceTable: 'Bunk_Code_Desc',
    targetTable: 'feed.bunk_code_desc',
    query: 'SELECT Ration_Type, Bunk_Code, Kgs_Head_Adj, ID FROM dbo.Bunk_Code_Desc ORDER BY ID',
    columns: [
      { source: 'Ration_Type', target: 'ration_type', transform: toNum },
      { source: 'Bunk_Code',   target: 'bunk_code',   transform: toNum },
      { source: 'Kgs_Head_Adj', target: 'kgs_head_adj', transform: toNum },
    ],
  },

  {
    order: 10,
    sourceTable: 'Ration_Types',
    targetTable: 'feed.ration_types',
    query: 'SELECT Ration_Type_ID, Ration_Type, Group_Name, Notes FROM dbo.Ration_Types ORDER BY Ration_Type_ID',
    columns: [
      { source: 'Ration_Type_ID', target: 'ration_type_id' },
      { source: 'Ration_Type',    target: 'ration_type', transform: trimOrNull },
      { source: 'Group_Name',     target: 'group_name',  transform: trimOrNull },
      { source: 'Notes',          target: 'notes',       transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Feed_Month_End_date',
    targetTable: 'feed.feed_month_end_date',
    query: 'SELECT Current_MonthEnd_Date, Current_MonthStart_Date, ID FROM dbo.Feed_Month_End_date ORDER BY ID',
    columns: [
      { source: 'Current_MonthEnd_Date',   target: 'current_monthend_date',   transform: toDate },
      { source: 'Current_MonthStart_Date', target: 'current_monthstart_date', transform: toDate },
      { source: 'ID',                      target: 'id' },
    ],
  },

  {
    order: 10,
    sourceTable: 'Transaction_Types',
    targetTable: 'system.transaction_types',
    query: 'SELECT Trans_Type_ID, Trans_Type_Short, Trans_Type_Long, Trans_Effect FROM dbo.Transaction_Types ORDER BY Trans_Type_ID',
    columns: [
      { source: 'Trans_Type_ID',    target: 'trans_type_id' },
      { source: 'Trans_Type_Short', target: 'trans_type_short', transform: trimOrNull },
      { source: 'Trans_Type_Long',  target: 'trans_type_long',  transform: trimOrNull },
      { source: 'Trans_Effect',     target: 'trans_effect',     transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'MMEC_Table',
    targetTable: 'system.mmec_table',
    query: 'SELECT DOF, Target_Multiplier, Max_Multiplier, Bump_If_Slick, ID FROM dbo.MMEC_Table ORDER BY ID',
    columns: [
      { source: 'DOF',               target: 'dof',               transform: toNum },
      { source: 'Target_Multiplier', target: 'target_multiplier', transform: toNum },
      { source: 'Max_Multiplier',    target: 'max_multiplier',    transform: toNum },
      { source: 'Bump_If_Slick',     target: 'bump_if_slick',     transform: toNum },
      { source: 'ID',                target: 'id' },
    ],
  },

  {
    order: 10,
    sourceTable: 'LoadDockageReasons',
    targetTable: 'system.lookups',
    query: 'SELECT Reason_ID, Dockage_Reason FROM dbo.LoadDockageReasons ORDER BY Reason_ID',
    columns: [
      { source: 'Reason_ID',      target: 'code' },
      { source: 'Dockage_Reason', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'dockage_reason' },
  },

  {
    order: 10,
    sourceTable: 'Manure_Types',
    targetTable: 'system.lookups',
    query: 'SELECT ID, Manure_Type FROM dbo.Manure_Types ORDER BY ID',
    columns: [
      { source: 'ID',          target: 'code' },
      { source: 'Manure_Type', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'manure_type' },
  },

  {
    order: 10,
    sourceTable: 'Reason_List',
    targetTable: 'system.lookups',
    query: 'SELECT Reason_ID, Reason_Description FROM dbo.Reason_List ORDER BY Reason_ID',
    columns: [
      { source: 'Reason_ID',          target: 'code' },
      { source: 'Reason_Description', target: 'name', transform: trimOrNull },
    ],
    staticColumns: { category: 'reason_list' },
  },

  // ── Order 15: Reference tables (light dependencies) ─────────

  {
    order: 15,
    sourceTable: 'Ration_Descriptions',
    targetTable: 'feed.ration_descriptions',
    query: `SELECT Ration_Code, Ration_Name, Ration_Type, Dry_Matter_Pcnt,
                   Current_Value_Kg, Date_Ration_Created, Date_Last_Modified,
                   Superceeded, Pcnt_FeedWeight_Tolerance, Custom_Feed_Charge_Ton,
                   Custom_Pcnt_Markup, NEm_KG, Ration_Density, ZoneName, Mixing_Time,
                   Minimum_Ration_value_ton, Custom_Feed_Markup_doll_per_ton,
                   WithHold_days, Liquids_premix_ration, Micro_nutrient_cost_per_ton,
                   Ration_Colour, delivered_to_bunk_cost_per_ton, interest_cost_per_ton,
                   Stationary_Mixer
            FROM dbo.Ration_Descriptions ORDER BY Ration_Code`,
    columns: [
      { source: 'Ration_Code',                    target: 'ration_code' },
      { source: 'Ration_Name',                    target: 'ration_name',                    transform: trimOrNull },
      { source: 'Ration_Type',                    target: 'ration_type',                    transform: toNum },
      { source: 'Dry_Matter_Pcnt',                target: 'dry_matter_pcnt',                transform: toNum },
      { source: 'Current_Value_Kg',               target: 'current_value_kg',               transform: toNum },
      { source: 'Date_Ration_Created',            target: 'date_ration_created',            transform: toDate },
      { source: 'Date_Last_Modified',             target: 'date_last_modified',             transform: toDate },
      { source: 'Superceeded',                    target: 'superceeded',                    transform: toBool },
      { source: 'Pcnt_FeedWeight_Tolerance',      target: 'pcnt_feedweight_tolerance',      transform: toNum },
      { source: 'Custom_Feed_Charge_Ton',         target: 'custom_feed_charge_ton',         transform: toNum },
      { source: 'Custom_Pcnt_Markup',             target: 'custom_pcnt_markup',             transform: toNum },
      { source: 'NEm_KG',                         target: 'nem_kg',                         transform: toNum },
      { source: 'Ration_Density',                 target: 'ration_density',                 transform: toNum },
      { source: 'ZoneName',                       target: 'zonename',                       transform: trimOrNull },
      { source: 'Mixing_Time',                    target: 'mixing_time',                    transform: trimOrNull },
      { source: 'Minimum_Ration_value_ton',       target: 'minimum_ration_value_ton',       transform: toNum },
      { source: 'Custom_Feed_Markup_doll_per_ton', target: 'custom_feed_markup_doll_per_ton', transform: toNum },
      { source: 'WithHold_days',                  target: 'withhold_days',                  transform: toNum },
      { source: 'Liquids_premix_ration',          target: 'liquids_premix_ration',          transform: toBool },
      { source: 'Micro_nutrient_cost_per_ton',    target: 'micro_nutrient_cost_per_ton',    transform: toNum },
      { source: 'Ration_Colour',                  target: 'ration_colour',                  transform: trimOrNull },
      { source: 'delivered_to_bunk_cost_per_ton',  target: 'delivered_to_bunk_cost_per_ton',  transform: toNum },
      { source: 'interest_cost_per_ton',           target: 'interest_cost_per_ton',           transform: toNum },
      { source: 'Stationary_Mixer',               target: 'stationary_mixer',               transform: toBool },
    ],
  },

  {
    order: 15,
    sourceTable: 'Ration_Calc_Constants',
    targetTable: 'feed.ration_calc_constants',
    query: `SELECT RationCode, RationName, BeastSex, MinNEM_Power_Raised,
                   MinNEm_Constant, Consumpt_Avg_Constant, Consumpt_Max_Constant,
                   BumpIfSlick_Constant, ID
            FROM dbo.Ration_Calc_Constants ORDER BY ID`,
    columns: [
      { source: 'RationCode',             target: 'rationcode',             transform: toNum },
      { source: 'RationName',             target: 'rationname',             transform: trimOrNull },
      { source: 'BeastSex',               target: 'beastsex',               transform: trimOrNull },
      { source: 'MinNEM_Power_Raised',    target: 'minnem_power_raised',    transform: toNum },
      { source: 'MinNEm_Constant',        target: 'minnem_constant',        transform: toNum },
      { source: 'Consumpt_Avg_Constant',  target: 'consumpt_avg_constant',  transform: toNum },
      { source: 'Consumpt_Max_Constant',  target: 'consumpt_max_constant',  transform: toNum },
      { source: 'BumpIfSlick_Constant',   target: 'bumpifslick_constant',   transform: toNum },
      { source: 'ID',                     target: 'id' },
    ],
  },

  {
    order: 15,
    sourceTable: 'Ration_Load_Sizes',
    targetTable: 'feed.ration_load_sizes',
    query: 'SELECT Ration_Type_ID FROM dbo.Ration_Load_Sizes ORDER BY Ration_Type_ID',
    columns: [
      { source: 'Ration_Type_ID', target: 'ration_type_id' },
    ],
  },

  {
    order: 15,
    sourceTable: 'Truck_names',
    targetTable: 'transport.truck_names',
    query: `SELECT Truck_Number, Truck_Name, Max_Kgs_Load_Value, Last_LoadOut_Rec, Last_FeedOut_Rec
            FROM dbo.Truck_names ORDER BY Truck_Number`,
    columns: [
      { source: 'Truck_Number',        target: 'truck_number' },
      { source: 'Truck_Name',          target: 'truck_name',          transform: trimOrNull },
      { source: 'Max_Kgs_Load_Value',  target: 'max_kgs_load_value',  transform: toNum },
      { source: 'Last_LoadOut_Rec',    target: 'last_loadout_rec',    transform: toNum },
      { source: 'Last_FeedOut_Rec',    target: 'last_feedout_rec',    transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Locations',
    targetTable: 'transport.locations',
    query: `SELECT Location_ID, Location_name, Location_Type, Commodity, Tons_stored, Value_stored, ID
            FROM dbo.Locations ORDER BY ID`,
    columns: [
      { source: 'Location_ID',    target: 'location_id' },
      { source: 'Location_name',  target: 'location_name',  transform: trimOrNull },
      { source: 'Location_Type',  target: 'location_type',  transform: trimOrNull },
      { source: 'Commodity',      target: 'commodity',      transform: trimOrNull },
      { source: 'Tons_stored',    target: 'tons_stored',    transform: toNum },
      { source: 'Value_stored',   target: 'value_stored',   transform: toNum },
      { source: 'ID',             target: 'id' },
    ],
  },

  {
    order: 15,
    sourceTable: 'Pens_File',
    targetTable: 'pen.pens_file',
    query: `SELECT Pen_Number_ID, Pen_Name, Mob_Name, Numb_Head, Ration_Code,
                   Kgs_Head, Feeding_System, Inc_in_Plateau_Feed, Notes, Excel_Cell,
                   DateEnteredFeedlot, Bunk_Volume, IsPaddock, Expected_WG_Day,
                   Date_last_cleaned, Ration_Code_PM, Exclude_from_feed_generation,
                   Titration_Regime, Titration_Regime_Start_date
            FROM dbo.Pens_File ORDER BY Pen_Number_ID`,
    columns: [
      { source: 'Pen_Number_ID',                 target: 'pen_number_id' },
      { source: 'Pen_Name',                      target: 'pen_name',                      transform: trimOrNull },
      { source: 'Mob_Name',                      target: 'mob_name',                      transform: trimOrNull },
      { source: 'Numb_Head',                     target: 'numb_head',                     transform: toNum },
      { source: 'Ration_Code',                   target: 'ration_code',                   transform: toNum },
      { source: 'Kgs_Head',                      target: 'kgs_head',                      transform: toNum },
      { source: 'Feeding_System',                target: 'feeding_system',                transform: toNum },
      { source: 'Inc_in_Plateau_Feed',           target: 'inc_in_plateau_feed',           transform: toBool },
      { source: 'Notes',                         target: 'notes',                         transform: trimOrNull },
      { source: 'Excel_Cell',                    target: 'excel_cell',                    transform: trimOrNull },
      { source: 'DateEnteredFeedlot',            target: 'dateenteredfeedlot',            transform: toDate },
      { source: 'Bunk_Volume',                   target: 'bunk_volume',                   transform: toNum },
      { source: 'IsPaddock',                     target: 'ispaddock',                     transform: toBool },
      { source: 'Expected_WG_Day',               target: 'expected_wg_day',               transform: toNum },
      { source: 'Date_last_cleaned',             target: 'date_last_cleaned',             transform: trimOrNull },
      { source: 'Ration_Code_PM',                target: 'ration_code_pm',                transform: toNum },
      { source: 'Exclude_from_feed_generation',  target: 'exclude_from_feed_generation',  transform: toBool },
      { source: 'Titration_Regime',              target: 'titration_regime',              transform: trimOrNull },
      { source: 'Titration_Regime_Start_date',   target: 'titration_regime_start_date',   transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'PenLaneOrder',
    targetTable: 'pen.penlaneorder',
    query: 'SELECT Pen_Number_ID, Pen_Name, LaneOrder, Zone_number FROM dbo.PenLaneOrder ORDER BY Pen_Number_ID',
    columns: [
      { source: 'Pen_Number_ID', target: 'pen_number_id' },
      { source: 'Pen_Name',      target: 'pen_name',      transform: trimOrNull },
      { source: 'LaneOrder',     target: 'laneorder',     transform: toNum },
      { source: 'Zone_number',   target: 'zone_number',   transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Pen_Print_Order',
    targetTable: 'pen.pen_print_order',
    query: 'SELECT Pen_Number_ID, Pen_name, PrintOrder FROM dbo.Pen_Print_Order ORDER BY Pen_Number_ID',
    columns: [
      { source: 'Pen_Number_ID', target: 'pen_number_id' },
      { source: 'Pen_name',      target: 'pen_name',      transform: trimOrNull },
      { source: 'PrintOrder',    target: 'printorder',    transform: toNum },
    ],
  },

  {
    order: 15,
    sourceTable: 'Digistar_Users',
    targetTable: 'digistar.digistar_users',
    query: 'SELECT User_ID, UserName, ID FROM dbo.Digistar_Users ORDER BY ID',
    columns: [
      { source: 'User_ID',  target: 'user_id',  transform: toNum },
      { source: 'UserName', target: 'username', transform: trimOrNull },
      { source: 'ID',       target: 'id' },
    ],
  },

  {
    order: 15,
    sourceTable: 'WbridgeCOMport',
    targetTable: 'transport.wbridgecomport',
    query: 'SELECT COMport, BaudRate, ScaleType, ID FROM dbo.WbridgeCOMport ORDER BY ID',
    columns: [
      { source: 'COMport',   target: 'comport',   transform: trimOrNull },
      { source: 'BaudRate',  target: 'baudrate',  transform: trimOrNull },
      { source: 'ScaleType', target: 'scaletype', transform: trimOrNull },
      { source: 'ID',        target: 'id' },
    ],
  },

  {
    order: 15,
    sourceTable: 'Computer_Names_old',
    targetTable: 'system.computer_names',
    query: 'SELECT Computer_number, Computer_name FROM dbo.Computer_Names_old ORDER BY Computer_number',
    columns: [
      { source: 'Computer_name', target: 'computer_name', transform: trimOrNull },
    ],
  },

  {
    order: 15,
    sourceTable: 'Marbling_bonus',
    targetTable: 'carcase.marbling_bonus',
    query: 'SELECT Marbling_score, Pay_rate_bonus_per_carcase_Kg, ID FROM dbo.Marbling_bonus ORDER BY ID',
    columns: [
      { source: 'Marbling_score',                    target: 'marbling_score',                    transform: toNum },
      { source: 'Pay_rate_bonus_per_carcase_Kg',     target: 'pay_rate_bonus_per_carcase_kg',     transform: toNum },
    ],
  },

  // ── Order 20: Ration / recipe / feeding regimen tables ──────

  {
    order: 20,
    sourceTable: 'Ration_Recipe_Records',
    targetTable: 'feed.ration_recipe_records',
    query: `SELECT Ration_Code, Commodity_Code, Pcnt_of_Ration, Tolerance_Kgs,
                   Rec_Id, Loading_Seq, Liquid_Ration_Component,
                   Total_CallWeight_Today_cycle1, Total_CallWeight_Today_cycle2,
                   Total_CallWeight_Today_cycle3, Total_CallWeight_Today_cycle4
            FROM dbo.Ration_Recipe_Records ORDER BY Rec_Id`,
    columns: [
      { source: 'Ration_Code',                    target: 'ration_code',                    transform: toNum },
      { source: 'Commodity_Code',                 target: 'commodity_code',                 transform: toNum },
      { source: 'Pcnt_of_Ration',                 target: 'pcnt_of_ration',                 transform: toNum },
      { source: 'Tolerance_Kgs',                  target: 'tolerance_kgs',                  transform: toNum },
      { source: 'Rec_Id',                         target: 'rec_id' },
      { source: 'Loading_Seq',                    target: 'loading_seq',                    transform: toNum },
      { source: 'Liquid_Ration_Component',        target: 'liquid_ration_component',        transform: toBool },
      { source: 'Total_CallWeight_Today_cycle1',  target: 'total_callweight_today_cycle1',  transform: toNum },
      { source: 'Total_CallWeight_Today_cycle2',  target: 'total_callweight_today_cycle2',  transform: toNum },
      { source: 'Total_CallWeight_Today_cycle3',  target: 'total_callweight_today_cycle3',  transform: toNum },
      { source: 'Total_CallWeight_Today_cycle4',  target: 'total_callweight_today_cycle4',  transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'CommodContracts',
    targetTable: 'commodity.commodcontracts',
    query: `SELECT Contract_No, Supplier_AC_No, Commod_Code, Start_date, End_date,
                   Price_ton, Frght_ton, Notes, Wght_contracted, Wght_delivered,
                   Road_Levy_ton, Contract_Complete, Pay_Suppliers_Weight, Specifications,
                   Value_Incr_Per_Month, Vendor_Dec, Kgs_Delivered_since_given_date,
                   Value_Delivered_since_given_date, RTCI_invoice, FarmGatePrice,
                   Attachment_CVD, Attachment_Contract
            FROM dbo.CommodContracts ORDER BY Contract_No`,
    columns: [
      { source: 'Contract_No',                       target: 'contract_no',                       transform: trimOrNull },
      { source: 'Supplier_AC_No',                    target: 'supplier_ac_no',                    transform: toNum },
      { source: 'Commod_Code',                       target: 'commod_code',                       transform: toNum },
      { source: 'Start_date',                        target: 'start_date',                        transform: toDate },
      { source: 'End_date',                          target: 'end_date',                          transform: toDate },
      { source: 'Price_ton',                         target: 'price_ton',                         transform: toNum },
      { source: 'Frght_ton',                         target: 'frght_ton',                         transform: toNum },
      { source: 'Notes',                             target: 'notes',                             transform: trimOrNull },
      { source: 'Wght_contracted',                   target: 'wght_contracted',                   transform: toNum },
      { source: 'Wght_delivered',                    target: 'wght_delivered',                    transform: toNum },
      { source: 'Road_Levy_ton',                     target: 'road_levy_ton',                     transform: toNum },
      { source: 'Contract_Complete',                 target: 'contract_complete',                 transform: toBool },
      { source: 'Pay_Suppliers_Weight',              target: 'pay_suppliers_weight',              transform: toBool },
      { source: 'Specifications',                    target: 'specifications',                    transform: trimOrNull },
      { source: 'Value_Incr_Per_Month',              target: 'value_incr_per_month',              transform: toNum },
      { source: 'Vendor_Dec',                        target: 'vendor_dec',                        transform: trimOrNull },
      { source: 'Kgs_Delivered_since_given_date',    target: 'kgs_delivered_since_given_date',    transform: toNum },
      { source: 'Value_Delivered_since_given_date',  target: 'value_delivered_since_given_date',  transform: toNum },
      { source: 'RTCI_invoice',                      target: 'rtci_invoice',                      transform: toBool },
      { source: 'FarmGatePrice',                     target: 'farmgateprice',                     transform: toNum },
      { source: 'Attachment_CVD',                    target: 'attachment_cvd',                    transform: trimOrNull },
      { source: 'Attachment_Contract',               target: 'attachment_contract',               transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Period_Stocks_Closing_Balance',
    targetTable: 'commodity.period_stocks_closing_balance',
    query: 'SELECT Commodity_Code, Commodity_Name, Stock_value, Stock_Tons_Weight FROM dbo.Period_Stocks_Closing_Balance ORDER BY Commodity_Code',
    columns: [
      { source: 'Commodity_Code',     target: 'commodity_code' },
      { source: 'Commodity_Name',     target: 'commodity_name',     transform: trimOrNull },
      { source: 'Stock_value',        target: 'stock_value',        transform: toNum },
      { source: 'Stock_Tons_Weight',  target: 'stock_tons_weight',  transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Pen_Feeding_Order_Params',
    targetTable: 'feed.pen_feeding_order_params',
    query: `SELECT Ration_Type, Truck_Size, [Extra_Feed_%Allowed], Feed_system_B_trigger,
                   Truck_Volume, TruckName
            FROM dbo.Pen_Feeding_Order_Params ORDER BY Ration_Type`,
    columns: [
      { source: 'Ration_Type',            target: 'ration_type' },
      { source: 'Truck_Size',             target: 'truck_size',             transform: toNum },
      { source: 'Extra_Feed_%Allowed',    target: 'extra_feed_pctallowed',  transform: toNum },
      { source: 'Feed_system_B_trigger',  target: 'feed_system_b_trigger',  transform: toNum },
      { source: 'Truck_Volume',           target: 'truck_volume',           transform: toNum },
      { source: 'TruckName',              target: 'truckname',              transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Titration_Ration_Regimes',
    targetTable: 'feed.titration_ration_regimes',
    query: `SELECT Titration_Regime_name, Date_defined, Start_day_Number, End_day_Number,
                   Ration_Name_Feed1, Ration_Code_Feed1, Ration_Pcnt_Feed1,
                   Ration_Name_Feed2, Ration_Code_Feed2, Ration_Pcnt_Feed2,
                   Ration_Name_Feed3, Ration_Code_Feed3, Ration_Pcnt_Feed3,
                   Ration_Name_Feed4, Ration_Code_Feed4, Ration_Pcnt_Feed4,
                   ID, ADG_expected
            FROM dbo.Titration_Ration_Regimes ORDER BY ID`,
    columns: [
      { source: 'Titration_Regime_name', target: 'titration_regime_name', transform: trimOrNull },
      { source: 'Date_defined',          target: 'date_defined',          transform: toDate },
      { source: 'Start_day_Number',      target: 'start_day_number',      transform: toNum },
      { source: 'End_day_Number',        target: 'end_day_number',        transform: toNum },
      { source: 'Ration_Name_Feed1',     target: 'ration_name_feed1',     transform: trimOrNull },
      { source: 'Ration_Code_Feed1',     target: 'ration_code_feed1',     transform: toNum },
      { source: 'Ration_Pcnt_Feed1',     target: 'ration_pcnt_feed1',     transform: toNum },
      { source: 'Ration_Name_Feed2',     target: 'ration_name_feed2',     transform: trimOrNull },
      { source: 'Ration_Code_Feed2',     target: 'ration_code_feed2',     transform: toNum },
      { source: 'Ration_Pcnt_Feed2',     target: 'ration_pcnt_feed2',     transform: toNum },
      { source: 'Ration_Name_Feed3',     target: 'ration_name_feed3',     transform: trimOrNull },
      { source: 'Ration_Code_Feed3',     target: 'ration_code_feed3',     transform: toNum },
      { source: 'Ration_Pcnt_Feed3',     target: 'ration_pcnt_feed3',     transform: toNum },
      { source: 'Ration_Name_Feed4',     target: 'ration_name_feed4',     transform: trimOrNull },
      { source: 'Ration_Code_Feed4',     target: 'ration_code_feed4',     transform: toNum },
      { source: 'Ration_Pcnt_Feed4',     target: 'ration_pcnt_feed4',     transform: toNum },
      { source: 'ID',                    target: 'id' },
      { source: 'ADG_expected',          target: 'adg_expected',          transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Pen_and_Bunk_Cleaning_Master',
    targetTable: 'feed.pen_and_bunk_cleaning',
    query: `SELECT Pen_name, Pen_type, Pen_ground_type, Days_between_cleaning,
                   Date_Pen_Cleaned, Days_since_pen_clean, Date_Bunk_Cleaned,
                   Days_since_bunk_clean, Comments, Date_water_cleaned,
                   Days_since_water_cleaned
            FROM dbo.Pen_and_Bunk_Cleaning_Master ORDER BY Pen_name`,
    columns: [
      { source: 'Pen_name',                 target: 'pen_name',                 transform: trimOrNull },
      { source: 'Pen_type',                 target: 'pen_type',                 transform: trimOrNull },
      { source: 'Pen_ground_type',          target: 'pen_ground_type',          transform: trimOrNull },
      { source: 'Days_between_cleaning',    target: 'days_between_cleaning',    transform: toNum },
      { source: 'Date_Pen_Cleaned',         target: 'date_pen_cleaned',         transform: toDate },
      { source: 'Days_since_pen_clean',     target: 'days_since_pen_clean',     transform: toNum },
      { source: 'Date_Bunk_Cleaned',        target: 'date_bunk_cleaned',        transform: toDate },
      { source: 'Days_since_bunk_clean',    target: 'days_since_bunk_clean',    transform: toNum },
      { source: 'Comments',                 target: 'comments',                 transform: trimOrNull },
      { source: 'Date_water_cleaned',       target: 'date_water_cleaned',       transform: toDate },
      { source: 'Days_since_water_cleaned', target: 'days_since_water_cleaned', transform: toNum },
    ],
  },

  // Fallback for 4 clients that only have the simpler Pen_and_Bunk_Cleaning table.
  // Runner auto-skips this when the source table does not exist.
  {
    order: 20,
    sourceTable: 'Pen_and_Bunk_Cleaning',
    targetTable: 'feed.pen_and_bunk_cleaning',
    query: `SELECT Pen_name, Pen_ground_type, Days_between_cleaning,
                   Date_Pen_Cleaned, Days_since_pen_clean, Date_Bunk_Cleaned,
                   Days_since_bunk_clean, Comments
            FROM dbo.Pen_and_Bunk_Cleaning ORDER BY Pen_name`,
    columns: [
      { source: 'Pen_name',              target: 'pen_name',              transform: trimOrNull },
      { source: 'Pen_ground_type',       target: 'pen_ground_type',       transform: trimOrNull },
      { source: 'Days_between_cleaning', target: 'days_between_cleaning', transform: toNum },
      { source: 'Date_Pen_Cleaned',      target: 'date_pen_cleaned',      transform: toDate },
      { source: 'Days_since_pen_clean',  target: 'days_since_pen_clean',  transform: toNum },
      { source: 'Date_Bunk_Cleaned',     target: 'date_bunk_cleaned',     transform: toDate },
      { source: 'Days_since_bunk_clean', target: 'days_since_bunk_clean', transform: toNum },
      { source: 'Comments',              target: 'comments',              transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'RCTI_payment_grid',
    targetTable: 'finance.rcti_payment_grid',
    query: `SELECT Mkt_Catgry, Sex, Row_sequence, Criteria, Range_from, Range_to,
                   Doll_per_Kg_deductn, Doll_per_Kg_paid, Doll_per_Kg_MRB_bonus
            FROM dbo.RCTI_payment_grid ORDER BY ID`,
    columns: [
      { source: 'Mkt_Catgry',           target: 'mkt_catgry',           transform: trimOrNull },
      { source: 'Sex',                  target: 'sex',                  transform: trimOrNull },
      { source: 'Row_sequence',         target: 'row_sequence',         transform: toNum },
      { source: 'Criteria',             target: 'criteria',             transform: trimOrNull },
      { source: 'Range_from',           target: 'range_from',           transform: trimOrNull },
      { source: 'Range_to',             target: 'range_to',             transform: trimOrNull },
      { source: 'Doll_per_Kg_deductn',  target: 'doll_per_kg_deductn',  transform: toNum },
      { source: 'Doll_per_Kg_paid',     target: 'doll_per_kg_paid',     transform: toNum },
      { source: 'Doll_per_Kg_MRB_bonus', target: 'doll_per_kg_mrb_bonus', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'TR_Payment_rates',
    targetTable: 'finance.tr_payment_rates',
    query: `SELECT Valid_From_date, Wght_FROM, Wght_TO, [0_to_2_Teeth],
                   [3_to_4_Teeth], [5_to_8_Teeth], Vendor_Bred_Adjust
            FROM dbo.TR_Payment_rates ORDER BY ID`,
    columns: [
      { source: 'Valid_From_date',    target: 'valid_from_date',    transform: toDate },
      { source: 'Wght_FROM',          target: 'wght_from',          transform: toNum },
      { source: 'Wght_TO',            target: 'wght_to',            transform: toNum },
      { source: '0_to_2_Teeth',       target: '0_to_2_teeth',       transform: toNum },
      { source: '3_to_4_Teeth',       target: '3_to_4_teeth',       transform: toNum },
      { source: '5_to_8_Teeth',       target: '5_to_8_teeth',       transform: toNum },
      { source: 'Vendor_Bred_Adjust', target: 'vendor_bred_adjust', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'TR_Payment_Breed_Adjust',
    targetTable: 'finance.tr_payment_breed_adjust',
    query: 'SELECT BreedName, Price_per_Kg_adjust FROM dbo.TR_Payment_Breed_Adjust ORDER BY ID',
    columns: [
      { source: 'BreedName',            target: 'breedname',            transform: trimOrNull },
      { source: 'Price_per_Kg_adjust',  target: 'price_per_kg_adjust',  transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Commodities',
    targetTable: 'commodity.commodities',
    query: `SELECT Commodity_Code, Commod_Name, Description, Kgs_on_hand, Value_on_hand,
                   Shrinkage_factor, Mth_Open_Value, Mth_Open_Kgs, Superceeded, ShortName,
                   NonStandard_Commodity, Tempering_litres_per_kg
            FROM dbo.Commodities ORDER BY Commodity_Code`,
    columns: [
      { source: 'Commodity_Code',         target: 'commodity_code' },
      { source: 'Commod_Name',            target: 'commod_name',            transform: trimOrNull },
      { source: 'Description',            target: 'description',            transform: trimOrNull },
      { source: 'Kgs_on_hand',            target: 'kgs_on_hand',            transform: toNum },
      { source: 'Value_on_hand',          target: 'value_on_hand',          transform: toNum },
      { source: 'Shrinkage_factor',       target: 'shrinkage_factor',       transform: toNum },
      { source: 'Mth_Open_Value',         target: 'mth_open_value',         transform: toNum },
      { source: 'Mth_Open_Kgs',           target: 'mth_open_kgs',           transform: toNum },
      { source: 'Superceeded',            target: 'superceeded',            transform: toBool },
      { source: 'ShortName',              target: 'shortname',              transform: trimOrNull },
      { source: 'NonStandard_Commodity',  target: 'nonstandard_commodity',  transform: toBool },
      { source: 'Tempering_litres_per_kg', target: 'tempering_litres_per_kg', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'MRB_AVG_Supplier_Years',
    targetTable: 'reporting.mrb_avg_supplier_years',
    query: `SELECT Supplier_ID, Supplier, MRB_Avg_YR1, MRB_Avg_YR2, MRB_Avg_YR3, MRB_Avg_YR4, ID
            FROM dbo.MRB_AVG_Supplier_Years ORDER BY ID`,
    columns: [
      { source: 'Supplier_ID',  target: 'supplier_id',  transform: toNum },
      { source: 'Supplier',     target: 'supplier',     transform: trimOrNull },
      { source: 'MRB_Avg_YR1',  target: 'mrb_avg_yr1',  transform: toNum },
      { source: 'MRB_Avg_YR2',  target: 'mrb_avg_yr2',  transform: toNum },
      { source: 'MRB_Avg_YR3',  target: 'mrb_avg_yr3',  transform: toNum },
      { source: 'MRB_Avg_YR4',  target: 'mrb_avg_yr4',  transform: toNum },
      { source: 'ID',           target: 'id' },
    ],
  },

  // ── Consolidated feeding detail tables (5 variants → 1 target) ──

  {
    order: 20,
    sourceTable: 'GE150_Feeding_Details',
    targetTable: 'feed.feeding_details',
    query: 'SELECT Feeding_Regimen_ID, Bunk_Codes_Total, Kgs_Head_Adj, Rec_ID FROM dbo.GE150_Feeding_Details ORDER BY Rec_ID',
    columns: [
      { source: 'Feeding_Regimen_ID', target: 'feeding_regimen_id', transform: toNum },
      { source: 'Bunk_Codes_Total',   target: 'bunk_codes_total',   transform: toNum },
      { source: 'Kgs_Head_Adj',       target: 'kgs_head_adj',       transform: toNum },
      { source: 'Rec_ID',             target: 'rec_id' },
    ],
    staticColumns: { feedingtype: 'GE150' },
  },

  {
    order: 20,
    sourceTable: 'L150_Feeding_Details',
    targetTable: 'feed.feeding_details',
    query: 'SELECT Feeding_Regimen_ID, Bunk_Codes_Total, Kgs_Head_Adj, Rec_ID FROM dbo.L150_Feeding_Details ORDER BY Rec_ID',
    columns: [
      { source: 'Feeding_Regimen_ID', target: 'feeding_regimen_id', transform: toNum },
      { source: 'Bunk_Codes_Total',   target: 'bunk_codes_total',   transform: toNum },
      { source: 'Kgs_Head_Adj',       target: 'kgs_head_adj',       transform: toNum },
      { source: 'Rec_ID',             target: 'rec_id' },
    ],
    staticColumns: { feedingtype: 'L150' },
  },

  {
    order: 20,
    sourceTable: 'Plateau_Feeding_Details',
    targetTable: 'feed.feeding_details',
    query: 'SELECT Feeding_Regimen_ID, Bunk_Codes_Total, Kgs_Head_Adj, Rec_ID FROM dbo.Plateau_Feeding_Details ORDER BY Rec_ID',
    columns: [
      { source: 'Feeding_Regimen_ID', target: 'feeding_regimen_id', transform: toNum },
      { source: 'Bunk_Codes_Total',   target: 'bunk_codes_total',   transform: toNum },
      { source: 'Kgs_Head_Adj',       target: 'kgs_head_adj',       transform: toNum },
      { source: 'Rec_ID',             target: 'rec_id' },
    ],
    staticColumns: { feedingtype: 'Plateau' },
  },

  {
    order: 20,
    sourceTable: 'ShortFeed_Feeding_Details',
    targetTable: 'feed.feeding_details',
    query: 'SELECT Feeding_Regimen_ID, Bunk_Codes_Total, Kgs_Head_Adj, Rec_ID FROM dbo.ShortFeed_Feeding_Details ORDER BY Rec_ID',
    columns: [
      { source: 'Feeding_Regimen_ID', target: 'feeding_regimen_id', transform: toNum },
      { source: 'Bunk_Codes_Total',   target: 'bunk_codes_total',   transform: toNum },
      { source: 'Kgs_Head_Adj',       target: 'kgs_head_adj',       transform: toNum },
      { source: 'Rec_ID',             target: 'rec_id' },
    ],
    staticColumns: { feedingtype: 'ShortFeed' },
  },

  {
    order: 20,
    sourceTable: 'WAGYU_Feeding_Details',
    targetTable: 'feed.feeding_details',
    query: 'SELECT Feeding_Regimen_ID, Bunk_Codes_Total, Kgs_Head_Adj, Rec_ID FROM dbo.WAGYU_Feeding_Details ORDER BY Rec_ID',
    columns: [
      { source: 'Feeding_Regimen_ID', target: 'feeding_regimen_id', transform: toNum },
      { source: 'Bunk_Codes_Total',   target: 'bunk_codes_total',   transform: toNum },
      { source: 'Kgs_Head_Adj',       target: 'kgs_head_adj',       transform: toNum },
      { source: 'Rec_ID',             target: 'rec_id' },
    ],
    staticColumns: { feedingtype: 'WAGYU' },
  },

  // ── Consolidated feeding regimen tables (5 variants → 1 target) ──

  {
    order: 20,
    sourceTable: 'GE150_Feeding_Regimens',
    targetTable: 'feed.feeding_regimens',
    query: 'SELECT Ration_Type, Consump_per_head_From, Consump_per_head_To, Accum_BunkCode_days, Feeding_Regimen_ID FROM dbo.GE150_Feeding_Regimens ORDER BY Feeding_Regimen_ID',
    columns: [
      { source: 'Ration_Type',            target: 'ration_type',            transform: toNum },
      { source: 'Consump_per_head_From',  target: 'consump_per_head_from',  transform: toNum },
      { source: 'Consump_per_head_To',    target: 'consump_per_head_to',    transform: toNum },
      { source: 'Accum_BunkCode_days',    target: 'accum_bunkcode_days',    transform: toNum },
      { source: 'Feeding_Regimen_ID',     target: 'feeding_regimen_id' },
    ],
    staticColumns: { feedingtype: 'GE150' },
  },

  {
    order: 20,
    sourceTable: 'L150_Feeding_Regimens',
    targetTable: 'feed.feeding_regimens',
    query: 'SELECT Ration_Type, Consump_per_head_From, Consump_per_head_To, Accum_BunkCode_days, Feeding_Regimen_ID FROM dbo.L150_Feeding_Regimens ORDER BY Feeding_Regimen_ID',
    columns: [
      { source: 'Ration_Type',            target: 'ration_type',            transform: toNum },
      { source: 'Consump_per_head_From',  target: 'consump_per_head_from',  transform: toNum },
      { source: 'Consump_per_head_To',    target: 'consump_per_head_to',    transform: toNum },
      { source: 'Accum_BunkCode_days',    target: 'accum_bunkcode_days',    transform: toNum },
      { source: 'Feeding_Regimen_ID',     target: 'feeding_regimen_id' },
    ],
    staticColumns: { feedingtype: 'L150' },
  },

  {
    order: 20,
    sourceTable: 'Plateau_Feeding_Regimens',
    targetTable: 'feed.feeding_regimens',
    query: 'SELECT Ration_Type, Consump_per_head_From, Consump_per_head_To, Accum_BunkCode_days, Feeding_Regimen_ID FROM dbo.Plateau_Feeding_Regimens ORDER BY Feeding_Regimen_ID',
    columns: [
      { source: 'Ration_Type',            target: 'ration_type',            transform: toNum },
      { source: 'Consump_per_head_From',  target: 'consump_per_head_from',  transform: toNum },
      { source: 'Consump_per_head_To',    target: 'consump_per_head_to',    transform: toNum },
      { source: 'Accum_BunkCode_days',    target: 'accum_bunkcode_days',    transform: toNum },
      { source: 'Feeding_Regimen_ID',     target: 'feeding_regimen_id' },
    ],
    staticColumns: { feedingtype: 'Plateau' },
  },

  {
    order: 20,
    sourceTable: 'ShortFeed_Feeding_Regimens',
    targetTable: 'feed.feeding_regimens',
    query: 'SELECT Ration_Type, Consump_per_head_From, Consump_per_head_To, Accum_BunkCode_days, Feeding_Regimen_ID FROM dbo.ShortFeed_Feeding_Regimens ORDER BY Feeding_Regimen_ID',
    columns: [
      { source: 'Ration_Type',            target: 'ration_type',            transform: toNum },
      { source: 'Consump_per_head_From',  target: 'consump_per_head_from',  transform: toNum },
      { source: 'Consump_per_head_To',    target: 'consump_per_head_to',    transform: toNum },
      { source: 'Accum_BunkCode_days',    target: 'accum_bunkcode_days',    transform: toNum },
      { source: 'Feeding_Regimen_ID',     target: 'feeding_regimen_id' },
    ],
    staticColumns: { feedingtype: 'ShortFeed' },
  },

  {
    order: 20,
    sourceTable: 'WAGYU_Feeding_Regimens',
    targetTable: 'feed.feeding_regimens',
    query: 'SELECT Ration_Type, Consump_per_head_From, Consump_per_head_To, Accum_BunkCode_days, Feeding_Regimen_ID FROM dbo.WAGYU_Feeding_Regimens ORDER BY Feeding_Regimen_ID',
    columns: [
      { source: 'Ration_Type',            target: 'ration_type',            transform: toNum },
      { source: 'Consump_per_head_From',  target: 'consump_per_head_from',  transform: toNum },
      { source: 'Consump_per_head_To',    target: 'consump_per_head_to',    transform: toNum },
      { source: 'Accum_BunkCode_days',    target: 'accum_bunkcode_days',    transform: toNum },
      { source: 'Feeding_Regimen_ID',     target: 'feeding_regimen_id' },
    ],
    staticColumns: { feedingtype: 'WAGYU' },
  },

  // ── Consolidated system info tables ─────────────────────────

  {
    order: 20,
    sourceTable: 'Date_Design_Last_Updated',
    targetTable: 'system.system_info',
    query: 'SELECT Date_Design_Last_Updated FROM dbo.Date_Design_Last_Updated WHERE ID = 1 ORDER BY 1',
    columns: [
      { source: 'Date_Design_Last_Updated', target: 'date_design_last_updated', transform: toDate },
    ],
  },

  {
    order: 20,
    sourceTable: 'PensFileIsOpen',
    targetTable: 'system.database_flags',
    query: 'SELECT Is_Open FROM dbo.PensFileIsOpen WHERE ID = 1 ORDER BY 1',
    columns: [
      { source: 'Is_Open', target: 'pens_file_is_open', transform: trimOrNull },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ──  ORDER 40: Transactional data (depend on lookups/refs)  ──
  // ══════════════════════════════════════════════════════════════

  {
    order: 40,
    sourceTable: 'Bunk_Readings',
    targetTable: 'feed.bunk_readings',
    query: `SELECT Pen_Number_ID, Date_Checked, Bunk_Reading, Feed_Alloc, No_Head,
                   [PF_Kgs/Head_Change?], BK_ID, Ration_Code, Early_Bunk_Reading,
                   MMEC_Kgs_Head, MMEC_MaxFeed, MMEC_Incr_If_Slick, MMEC_Ration,
                   Mob_name, Early_bunk_reading2, Kgs_feed_remaining,
                   Avg_Kgs_Fed_Today, Shovel_bunk, Notes
            FROM dbo.Bunk_Readings ORDER BY BK_ID`,
    columns: [
      { source: 'Pen_Number_ID',          target: 'pen_number_id',       transform: toNum },
      { source: 'Date_Checked',           target: 'date_checked',        transform: toDate },
      { source: 'Bunk_Reading',           target: 'bunk_reading',        transform: trimOrNull },
      { source: 'Feed_Alloc',             target: 'feed_alloc',          transform: toNum },
      { source: 'No_Head',                target: 'no_head',             transform: toNum },
      { source: 'PF_Kgs/Head_Change?',    target: 'pf_kgs_head_change',  transform: toBool },
      { source: 'BK_ID',                  target: 'bk_id' },
      { source: 'Ration_Code',            target: 'ration_code',         transform: toNum },
      { source: 'Early_Bunk_Reading',     target: 'early_bunk_reading',  transform: trimOrNull },
      { source: 'MMEC_Kgs_Head',          target: 'mmec_kgs_head',       transform: toNum },
      { source: 'MMEC_MaxFeed',           target: 'mmec_maxfeed',        transform: toNum },
      { source: 'MMEC_Incr_If_Slick',     target: 'mmec_incr_if_slick',  transform: toNum },
      { source: 'MMEC_Ration',            target: 'mmec_ration',         transform: toNum },
      { source: 'Mob_name',               target: 'mob_name',            transform: trimOrNull },
      { source: 'Early_bunk_reading2',    target: 'early_bunk_reading2', transform: trimOrNull },
      { source: 'Kgs_feed_remaining',     target: 'kgs_feed_remaining',  transform: toNum },
      { source: 'Avg_Kgs_Fed_Today',      target: 'avg_kgs_fed_today',   transform: toNum },
      { source: 'Shovel_bunk',            target: 'shovel_bunk',         transform: toBool },
      { source: 'Notes',                  target: 'notes',               transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Dual_Ration_Feeding',
    targetTable: 'feed.dual_ration_feeding',
    query: `SELECT Pen_Number_ID, Feed_date, Ration_Name_Feed1, Ration_Code_Feed1,
                   Ration_Pcnt_Feed1, Ration_Name_Feed2, Ration_Code_Feed2,
                   Ration_Pcnt_Feed2, Ration_Name_Feed3, Ration_Code_Feed3,
                   Ration_Pcnt_Feed3, ID
            FROM dbo.Dual_Ration_Feeding ORDER BY ID`,
    columns: [
      { source: 'Pen_Number_ID',      target: 'pen_number_id',      transform: toNum },
      { source: 'Feed_date',          target: 'feed_date',          transform: toDate },
      { source: 'Ration_Name_Feed1',  target: 'ration_name_feed1',  transform: trimOrNull },
      { source: 'Ration_Code_Feed1',  target: 'ration_code_feed1',  transform: toNum },
      { source: 'Ration_Pcnt_Feed1',  target: 'ration_pcnt_feed1',  transform: toNum },
      { source: 'Ration_Name_Feed2',  target: 'ration_name_feed2',  transform: trimOrNull },
      { source: 'Ration_Code_Feed2',  target: 'ration_code_feed2',  transform: toNum },
      { source: 'Ration_Pcnt_Feed2',  target: 'ration_pcnt_feed2',  transform: toNum },
      { source: 'Ration_Name_Feed3',  target: 'ration_name_feed3',  transform: trimOrNull },
      { source: 'Ration_Code_Feed3',  target: 'ration_code_feed3',  transform: toNum },
      { source: 'Ration_Pcnt_Feed3',  target: 'ration_pcnt_feed3',  transform: toNum },
      { source: 'ID',                 target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'Ration_Regimes',
    targetTable: 'feed.ration_regimes',
    query: `SELECT ID, Pen_ID, Feed_date, AM_Ration, AM_Ration_Code, PM_Ration, PM_Ration_Code
            FROM dbo.Ration_Regimes ORDER BY ID`,
    columns: [
      { source: 'ID',              target: 'id' },
      { source: 'Pen_ID',          target: 'pen_id',          transform: toNum },
      { source: 'Feed_date',       target: 'feed_date',       transform: toDate },
      { source: 'AM_Ration',       target: 'am_ration',       transform: trimOrNull },
      { source: 'AM_Ration_Code',  target: 'am_ration_code',  transform: toNum },
      { source: 'PM_Ration',       target: 'pm_ration',       transform: trimOrNull },
      { source: 'PM_Ration_Code',  target: 'pm_ration_code',  transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Pen_Split_Rations',
    targetTable: 'feed.ration_regimes',
    query: `SELECT ID, Pen_ID, Feed_date, AM_Ration, AM_Ration_Code, PM_Ration, PM_Ration_Code
            FROM dbo.Pen_Split_Rations ORDER BY ID`,
    columns: [
      { source: 'ID',              target: 'id' },
      { source: 'Pen_ID',          target: 'pen_id',          transform: toNum },
      { source: 'Feed_date',       target: 'feed_date',       transform: toDate },
      { source: 'AM_Ration',       target: 'am_ration',       transform: trimOrNull },
      { source: 'AM_Ration_Code',  target: 'am_ration_code',  transform: toNum },
      { source: 'PM_Ration',       target: 'pm_ration',       transform: trimOrNull },
      { source: 'PM_Ration_Code',  target: 'pm_ration_code',  transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'NSA_Bunk_Data',
    targetTable: 'feed.nsa_bunk_data',
    query: `SELECT TheDate, Lot_Number, Pen_name, HeadCount, MktCat, MktSubCat, Sex,
                   Avg_Current_Wght, Ration_ID, Feed_last_24_Hrs, Seven_Day_Avg,
                   Fourteen_Day_Avg, Implanted, ID, Dry_Matter_percent,
                   ME_MJ_kg_Dry, NEm_Dry, NEg_Dry, CP_Percentage_Dry,
                   Effective_from_date, Ration_Short_Name, Ration_Description, Bunk_call
            FROM dbo.NSA_Bunk_Data ORDER BY ID`,
    columns: [
      { source: 'TheDate',              target: 'thedate',              transform: toDate },
      { source: 'Lot_Number',           target: 'lot_number',           transform: trimOrNull },
      { source: 'Pen_name',             target: 'pen_name',             transform: trimOrNull },
      { source: 'HeadCount',            target: 'headcount',            transform: toNum },
      { source: 'MktCat',               target: 'mktcat',               transform: trimOrNull },
      { source: 'MktSubCat',            target: 'mktsubcat',            transform: trimOrNull },
      { source: 'Sex',                  target: 'sex',                  transform: trimOrNull },
      { source: 'Avg_Current_Wght',     target: 'avg_current_wght',     transform: toNum },
      { source: 'Ration_ID',            target: 'ration_id',            transform: toNum },
      { source: 'Feed_last_24_Hrs',     target: 'feed_last_24_hrs',     transform: toNum },
      { source: 'Seven_Day_Avg',        target: 'seven_day_avg',        transform: toNum },
      { source: 'Fourteen_Day_Avg',     target: 'fourteen_day_avg',     transform: toNum },
      { source: 'Implanted',            target: 'implanted',            transform: trimOrNull },
      { source: 'ID',                   target: 'id' },
      { source: 'Dry_Matter_percent',   target: 'dry_matter_percent',   transform: toNum },
      { source: 'ME_MJ_kg_Dry',         target: 'me_mj_kg_dry',         transform: toNum },
      { source: 'NEm_Dry',              target: 'nem_dry',              transform: toNum },
      { source: 'NEg_Dry',              target: 'neg_dry',              transform: toNum },
      { source: 'CP_Percentage_Dry',    target: 'cp_percentage_dry',    transform: toNum },
      { source: 'Effective_from_date',  target: 'effective_from_date',  transform: toDate },
      { source: 'Ration_Short_Name',    target: 'ration_short_name',    transform: trimOrNull },
      { source: 'Ration_Description',   target: 'ration_description',   transform: trimOrNull },
      { source: 'Bunk_call',            target: 'bunk_call',            transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Feeding_time_data',
    targetTable: 'feed.feeding_time_data',
    query: `SELECT ID, Feed_Date, First_pen_Fed, First_pen_Fed_time,
                   Ten_day_avg_start_time, Last_pen_Fed, Last_pen_Fed_time,
                   Ten_day_avg_End_time, Total_feeding_time, Total_Tons_Fed, Tons_per_hour
            FROM dbo.Feeding_time_data ORDER BY ID`,
    columns: [
      { source: 'ID',                      target: 'id' },
      { source: 'Feed_Date',               target: 'feed_date',               transform: toDate },
      { source: 'First_pen_Fed',           target: 'first_pen_fed',           transform: trimOrNull },
      { source: 'First_pen_Fed_time',      target: 'first_pen_fed_time',      transform: toDate },
      { source: 'Ten_day_avg_start_time',  target: 'ten_day_avg_start_time',  transform: toDate },
      { source: 'Last_pen_Fed',            target: 'last_pen_fed',            transform: trimOrNull },
      { source: 'Last_pen_Fed_time',       target: 'last_pen_fed_time',       transform: toDate },
      { source: 'Ten_day_avg_End_time',    target: 'ten_day_avg_end_time',    transform: toDate },
      { source: 'Total_feeding_time',      target: 'total_feeding_time',      transform: toDate },
      { source: 'Total_Tons_Fed',          target: 'total_tons_fed',          transform: toNum },
      { source: 'Tons_per_hour',           target: 'tons_per_hour',           transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Feeding_Time_Taken_By_Ration_Type',
    targetTable: 'feed.feeding_time_taken_by_ration_type',
    query: `SELECT Feed_date, Cycle, Ration_Type, SumOfWght_delivered,
                   First_Pen_fed, First_Pen_Feed_Time, Last_Pen_fed,
                   Last_Pen_Feed_Time, NumberPens, ID
            FROM dbo.Feeding_Time_Taken_By_Ration_Type ORDER BY ID`,
    columns: [
      { source: 'Feed_date',             target: 'feed_date',             transform: toDate },
      { source: 'Cycle',                 target: 'cycle',                 transform: trimOrNull },
      { source: 'Ration_Type',           target: 'ration_type',           transform: trimOrNull },
      { source: 'SumOfWght_delivered',   target: 'sumofwght_delivered',   transform: toNum },
      { source: 'First_Pen_fed',         target: 'first_pen_fed',         transform: trimOrNull },
      { source: 'First_Pen_Feed_Time',   target: 'first_pen_feed_time',   transform: trimOrNull },
      { source: 'Last_Pen_fed',          target: 'last_pen_fed',          transform: trimOrNull },
      { source: 'Last_Pen_Feed_Time',    target: 'last_pen_feed_time',    transform: trimOrNull },
      { source: 'NumberPens',            target: 'numberpens',            transform: toNum },
      { source: 'ID',                    target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'PenFeedsData',
    targetTable: 'feed.penfeedsdata',
    query: `SELECT Feed_Date, Truck_No, Load_Numb_for_Day, Pen_Number_ID, Mob_Name,
                   Number_Cattle, Feed_Weight, Time_Fed, Load_RecID, System_User_ID,
                   Applied_to_Cattle, ID, Ration_Code, Ration_Value_per_Ton,
                   Call_Wght, Batch_Number, Postpone_Feed_Application
            FROM dbo.PenFeedsData ORDER BY ID`,
    columns: [
      { source: 'Feed_Date',                  target: 'feed_date',                  transform: toDate },
      { source: 'Truck_No',                   target: 'truck_no',                   transform: trimOrNull },
      { source: 'Load_Numb_for_Day',          target: 'load_numb_for_day',          transform: toNum },
      { source: 'Pen_Number_ID',              target: 'pen_number_id',              transform: toNum },
      { source: 'Mob_Name',                   target: 'mob_name',                   transform: trimOrNull },
      { source: 'Number_Cattle',              target: 'number_cattle',              transform: toNum },
      { source: 'Feed_Weight',                target: 'feed_weight',                transform: toNum },
      { source: 'Time_Fed',                   target: 'time_fed',                   transform: trimOrNull },
      { source: 'Load_RecID',                 target: 'load_recid',                 transform: toNum },
      { source: 'System_User_ID',             target: 'system_user_id',             transform: toNum },
      { source: 'Applied_to_Cattle',          target: 'applied_to_cattle',          transform: toBool },
      { source: 'ID',                         target: 'id' },
      { source: 'Ration_Code',                target: 'ration_code',                transform: toNum },
      { source: 'Ration_Value_per_Ton',       target: 'ration_value_per_ton',       transform: toNum },
      { source: 'Call_Wght',                  target: 'call_wght',                  transform: toNum },
      { source: 'Batch_Number',               target: 'batch_number',               transform: toNum },
      { source: 'Postpone_Feed_Application',  target: 'postpone_feed_application',  transform: toBool },
    ],
  },

  {
    order: 40,
    sourceTable: 'Pen_Cleaning_dates',
    targetTable: 'pen.pen_cleaning_dates',
    query: 'SELECT Pen_name, Date_cleaned, Notes, ID FROM dbo.Pen_Cleaning_dates ORDER BY ID',
    columns: [
      { source: 'Pen_name',      target: 'pen_name',      transform: trimOrNull },
      { source: 'Date_cleaned',  target: 'date_cleaned',  transform: toDate },
      { source: 'Notes',         target: 'notes',         transform: trimOrNull },
      { source: 'ID',            target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'Log_Pens_File',
    targetTable: 'pen.log_pens_file',
    query: `SELECT LogID, ChangeType, ChangeDate, Pen_Number_ID, Pen_Name, Mob_Name,
                   Numb_Head, Ration_Code, Kgs_Head, Feeding_System, Inc_in_Plateau_Feed,
                   Excel_Cell, DateEnteredFeedlot, Bunk_Volume, IsPaddock, Expected_WG_Day,
                   Date_last_cleaned, Ration_Code_PM, Exclude_from_feed_generation,
                   Titration_Regime, Titration_Regime_Start_date
            FROM dbo.Log_Pens_File ORDER BY LogID`,
    columns: [
      { source: 'LogID',                        target: 'logid' },
      { source: 'ChangeType',                   target: 'changetype',                   transform: trimOrNull },
      { source: 'ChangeDate',                   target: 'changedate',                   transform: toDate },
      { source: 'Pen_Number_ID',                target: 'pen_number_id',                transform: toNum },
      { source: 'Pen_Name',                     target: 'pen_name',                     transform: trimOrNull },
      { source: 'Mob_Name',                     target: 'mob_name',                     transform: trimOrNull },
      { source: 'Numb_Head',                    target: 'numb_head',                    transform: toNum },
      { source: 'Ration_Code',                  target: 'ration_code',                  transform: toNum },
      { source: 'Kgs_Head',                     target: 'kgs_head',                     transform: toNum },
      { source: 'Feeding_System',               target: 'feeding_system',               transform: toNum },
      { source: 'Inc_in_Plateau_Feed',          target: 'inc_in_plateau_feed',          transform: toBool },
      { source: 'Excel_Cell',                   target: 'excel_cell',                   transform: trimOrNull },
      { source: 'DateEnteredFeedlot',           target: 'dateenteredfeedlot',           transform: toDate },
      { source: 'Bunk_Volume',                  target: 'bunk_volume',                  transform: toNum },
      { source: 'IsPaddock',                    target: 'ispaddock',                    transform: toBool },
      { source: 'Expected_WG_Day',              target: 'expected_wg_day',              transform: toNum },
      { source: 'Date_last_cleaned',            target: 'date_last_cleaned',            transform: trimOrNull },
      { source: 'Ration_Code_PM',               target: 'ration_code_pm',               transform: toNum },
      { source: 'Exclude_from_feed_generation', target: 'exclude_from_feed_generation', transform: toBool },
      { source: 'Titration_Regime',             target: 'titration_regime',             transform: trimOrNull },
      { source: 'Titration_Regime_Start_date',  target: 'titration_regime_start_date',  transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'CommodTrans',
    targetTable: 'commodity.commodtrans',
    query: `SELECT Commodity_Code, Trans_Date, Ref_No, Contract_No, Trans_Type,
                   Value, Commod_Mast_Value, Kgs, Commod_Mast_Kgs, Reason_Code,
                   Feed_Load_Record_No, Month_End_process, CTR_ID, Notes, StaffID,
                   Call_Weight, Tempered_weight_fed_Kgs
            FROM dbo.CommodTrans ORDER BY CTR_ID`,
    columns: [
      { source: 'Commodity_Code',           target: 'commodity_code',           transform: toNum },
      { source: 'Trans_Date',               target: 'trans_date',               transform: toDate },
      { source: 'Ref_No',                   target: 'ref_no',                   transform: trimOrNull },
      { source: 'Contract_No',              target: 'contract_no',              transform: trimOrNull },
      { source: 'Trans_Type',               target: 'trans_type',               transform: toNum },
      { source: 'Value',                    target: 'value',                    transform: toNum },
      { source: 'Commod_Mast_Value',        target: 'commod_mast_value',        transform: toNum },
      { source: 'Kgs',                      target: 'kgs',                      transform: toNum },
      { source: 'Commod_Mast_Kgs',          target: 'commod_mast_kgs',          transform: toNum },
      { source: 'Reason_Code',              target: 'reason_code',              transform: toNum },
      { source: 'Feed_Load_Record_No',      target: 'feed_load_record_no',      transform: toNum },
      { source: 'Month_End_process',        target: 'month_end_process',        transform: toBool },
      { source: 'CTR_ID',                   target: 'ctr_id' },
      { source: 'Notes',                    target: 'notes',                    transform: trimOrNull },
      { source: 'StaffID',                  target: 'staffid',                  transform: toNum },
      { source: 'Call_Weight',              target: 'call_weight',              transform: toNum },
      { source: 'Tempered_weight_fed_Kgs',  target: 'tempered_weight_fed_kgs',  transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Truck_Loads',
    targetTable: 'transport.truck_loads',
    query: `SELECT Load_Date, Truck_No, Load_Numb_for_Day, Driver_ID, Loader_ID,
                   Load_Time, Ration_Code, Target_Load_Weight, Applied_to_Cattle,
                   Load_RecID, Batch_Number, Ration_DM_Pcnt, StaffID, BatchBox
            FROM dbo.Truck_Loads ORDER BY Load_Date, Truck_No, Load_Numb_for_Day`,
    columns: [
      { source: 'Load_Date',           target: 'load_date',           transform: toDate },
      { source: 'Truck_No',            target: 'truck_no',            transform: trimOrNull },
      { source: 'Load_Numb_for_Day',   target: 'load_numb_for_day',   transform: toNum },
      { source: 'Driver_ID',           target: 'driver_id',           transform: toNum },
      { source: 'Loader_ID',           target: 'loader_id',           transform: toNum },
      { source: 'Load_Time',           target: 'load_time',           transform: trimOrNull },
      { source: 'Ration_Code',         target: 'ration_code',         transform: toNum },
      { source: 'Target_Load_Weight',  target: 'target_load_weight',  transform: toNum },
      { source: 'Applied_to_Cattle',   target: 'applied_to_cattle',   transform: toBool },
      { source: 'Load_RecID',          target: 'load_recid',          transform: toNum },
      { source: 'Batch_Number',        target: 'batch_number',        transform: toNum },
      { source: 'Ration_DM_Pcnt',      target: 'ration_dm_pcnt',      transform: toNum },
      { source: 'StaffID',             target: 'staffid',             transform: toNum },
      { source: 'BatchBox',            target: 'batchbox',            transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'TruckLoadChangesLog',
    targetTable: 'transport.truckloadchangeslog',
    query: `SELECT Truck_Name, Load_date, Load_Number_For_Day, Comod_or_Pen,
                   Old_Name, Old_Weight, New_Name, New_Weight, ID
            FROM dbo.TruckLoadChangesLog ORDER BY ID`,
    columns: [
      { source: 'Truck_Name',          target: 'truck_name',          transform: trimOrNull },
      { source: 'Load_date',           target: 'load_date',           transform: toDate },
      { source: 'Load_Number_For_Day', target: 'load_number_for_day', transform: toNum },
      { source: 'Comod_or_Pen',        target: 'comod_or_pen',        transform: trimOrNull },
      { source: 'Old_Name',            target: 'old_name',            transform: trimOrNull },
      { source: 'Old_Weight',          target: 'old_weight',          transform: toNum },
      { source: 'New_Name',            target: 'new_name',            transform: trimOrNull },
      { source: 'New_Weight',          target: 'new_weight',          transform: toNum },
      { source: 'ID',                  target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'Truck_Load_variation_data',
    targetTable: 'transport.truck_load_variation_data',
    query: 'SELECT Truck_Load_RecID, Commodity_name, Actual_Weight, Target_Weight, ID FROM dbo.Truck_Load_variation_data ORDER BY ID',
    columns: [
      { source: 'Truck_Load_RecID', target: 'truck_load_recid', transform: toNum },
      { source: 'Commodity_name',   target: 'commodity_name',   transform: trimOrNull },
      { source: 'Actual_Weight',    target: 'actual_weight',    transform: toNum },
      { source: 'Target_Weight',    target: 'target_weight',    transform: toNum },
      { source: 'ID',               target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'Datakey_truck_allocation',
    targetTable: 'transport.datakey_truck_allocation',
    query: `SELECT Load_Number, Ration_name, Feed_Cycle_No, Truck_load_weight,
                   Allocate_to_Datakey_number, ID
            FROM dbo.Datakey_truck_allocation ORDER BY ID`,
    columns: [
      { source: 'Load_Number',                 target: 'load_number',                 transform: toNum },
      { source: 'Ration_name',                 target: 'ration_name',                 transform: trimOrNull },
      { source: 'Feed_Cycle_No',               target: 'feed_cycle_no',               transform: toNum },
      { source: 'Truck_load_weight',           target: 'truck_load_weight',           transform: toNum },
      { source: 'Allocate_to_Datakey_number',  target: 'allocate_to_datakey_number',  transform: toNum },
      { source: 'ID',                          target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'DeliveryDockets',
    targetTable: 'transport.deliverydockets',
    query: `SELECT Docket_Number, Docket_Date, Docket_Time, Commodity_Code, Contract_No,
                   Carrier, DriverName, Vehicle_ID, Gross_Wght, Tare_Wght, Payment_Wght,
                   Grower, Load_value, Exit_date, Exit_time, Applied_to_Feed_System,
                   Load_Rejected, DocketNotes, Moisture, Test_Wght_Kgs, Screenings,
                   Field_Name, DM_Pcnt, WeighUnits, StaffID, Prch_or_Sale,
                   Road_Levy_per_ton, Risk_category, Non_Standard_Commodity, Invoice_paid,
                   Discount_value_per_ton, Contract_value_per_ton, Vendor_Dec, Silo_Used,
                   RTCI_invoice_done, Carrier_Code, Freight_Cost, RCTI_Freight_invoice_done,
                   RCTI_Freight_invoice_paid, Protein, No_of_bales, Freight_per_ton, ID,
                   Attachment
            FROM dbo.DeliveryDockets ORDER BY Docket_Number, ID`,
    columns: [
      { source: 'Docket_Number',            target: 'docket_number' },
      { source: 'Docket_Date',              target: 'docket_date',              transform: toDate },
      { source: 'Docket_Time',              target: 'docket_time',              transform: trimOrNull },
      { source: 'Commodity_Code',           target: 'commodity_code',           transform: toNum },
      { source: 'Contract_No',              target: 'contract_no',              transform: trimOrNull },
      { source: 'Carrier',                  target: 'carrier',                  transform: trimOrNull },
      { source: 'DriverName',               target: 'drivername',               transform: trimOrNull },
      { source: 'Vehicle_ID',               target: 'vehicle_id',               transform: trimOrNull },
      { source: 'Gross_Wght',               target: 'gross_wght',               transform: toNum },
      { source: 'Tare_Wght',                target: 'tare_wght',                transform: toNum },
      { source: 'Payment_Wght',             target: 'payment_wght',             transform: toNum },
      { source: 'Grower',                   target: 'grower',                   transform: trimOrNull },
      { source: 'Load_value',               target: 'load_value',               transform: toNum },
      { source: 'Exit_date',                target: 'exit_date',                transform: toDate },
      { source: 'Exit_time',                target: 'exit_time',                transform: trimOrNull },
      { source: 'Applied_to_Feed_System',   target: 'applied_to_feed_system',   transform: toBool },
      { source: 'Load_Rejected',            target: 'load_rejected',            transform: toBool },
      { source: 'DocketNotes',              target: 'docketnotes',              transform: trimOrNull },
      { source: 'Moisture',                 target: 'moisture',                 transform: toNum },
      { source: 'Test_Wght_Kgs',            target: 'test_wght_kgs',            transform: toNum },
      { source: 'Screenings',               target: 'screenings',               transform: toNum },
      { source: 'Field_Name',               target: 'field_name',               transform: trimOrNull },
      { source: 'DM_Pcnt',                  target: 'dm_pcnt',                  transform: toNum },
      { source: 'WeighUnits',               target: 'weighunits',               transform: toBool },
      { source: 'StaffID',                  target: 'staffid',                  transform: toNum },
      { source: 'Prch_or_Sale',             target: 'prch_or_sale',             transform: toNum },
      { source: 'Road_Levy_per_ton',        target: 'road_levy_per_ton',        transform: toNum },
      { source: 'Risk_category',            target: 'risk_category',            transform: toNum },
      { source: 'Non_Standard_Commodity',   target: 'non_standard_commodity',   transform: toBool },
      { source: 'Invoice_paid',             target: 'invoice_paid',             transform: toBool },
      { source: 'Discount_value_per_ton',   target: 'discount_value_per_ton',   transform: toNum },
      { source: 'Contract_value_per_ton',   target: 'contract_value_per_ton',   transform: toNum },
      { source: 'Vendor_Dec',               target: 'vendor_dec',               transform: trimOrNull },
      { source: 'Silo_Used',                target: 'silo_used',                transform: trimOrNull },
      { source: 'RTCI_invoice_done',        target: 'rtci_invoice_done',        transform: toBool },
      { source: 'Carrier_Code',             target: 'carrier_code',             transform: toNum },
      { source: 'Freight_Cost',             target: 'freight_cost',             transform: toNum },
      { source: 'RCTI_Freight_invoice_done', target: 'rcti_freight_invoice_done', transform: toBool },
      { source: 'RCTI_Freight_invoice_paid', target: 'rcti_freight_invoice_paid', transform: toBool },
      { source: 'Protein',                  target: 'protein',                  transform: toNum },
      { source: 'No_of_bales',              target: 'no_of_bales',              transform: toNum },
      { source: 'Freight_per_ton',          target: 'freight_per_ton',          transform: toNum },
      { source: 'ID',                       target: 'id' },
      { source: 'Attachment',               target: 'attachment',               transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'LoadDockages',
    targetTable: 'transport.loaddockages',
    query: `SELECT Docket_No, Reason_Code, Tons, Rate_per_Ton, Dockage_Value,
                   Dockage_Pcnt, Authorised_By, Notes, Commodity_code
            FROM dbo.LoadDockages ORDER BY Docket_No`,
    columns: [
      { source: 'Docket_No',      target: 'docket_no' },
      { source: 'Reason_Code',    target: 'reason_code',    transform: toNum },
      { source: 'Tons',           target: 'tons',           transform: toNum },
      { source: 'Rate_per_Ton',   target: 'rate_per_ton',   transform: toNum },
      { source: 'Dockage_Value',  target: 'dockage_value',  transform: toNum },
      { source: 'Dockage_Pcnt',   target: 'dockage_pcnt',   transform: toNum },
      { source: 'Authorised_By',  target: 'authorised_by',  transform: trimOrNull },
      { source: 'Notes',          target: 'notes',          transform: trimOrNull },
      { source: 'Commodity_code', target: 'commodity_code', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Location_Transactions',
    targetTable: 'transport.location_transactions',
    query: `SELECT Trans_Date, Delivery_docket_number, From_Location_code, Commodity,
                   To_Location_code, Trans_Tons, Trans_Value, Comments,
                   Applied_to_storage_totals, ID
            FROM dbo.Location_Transactions ORDER BY ID`,
    columns: [
      { source: 'Trans_Date',                target: 'trans_date',                transform: toDate },
      { source: 'Delivery_docket_number',    target: 'delivery_docket_number',    transform: trimOrNull },
      { source: 'From_Location_code',        target: 'from_location_code',        transform: toNum },
      { source: 'Commodity',                 target: 'commodity',                 transform: trimOrNull },
      { source: 'To_Location_code',          target: 'to_location_code',          transform: toNum },
      { source: 'Trans_Tons',                target: 'trans_tons',                transform: toNum },
      { source: 'Trans_Value',               target: 'trans_value',               transform: toNum },
      { source: 'Comments',                  target: 'comments',                  transform: trimOrNull },
      { source: 'Applied_to_storage_totals', target: 'applied_to_storage_totals', transform: toBool },
      { source: 'ID',                        target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'Manure_carting',
    targetTable: 'transport.manure_carting',
    query: `SELECT Load_Date, Truck_name, [Operator], From_location, To_Location,
                   Tons_Nett_weight, Number_of_loads, Notes, ID, Manure_type
            FROM dbo.Manure_carting ORDER BY ID`,
    columns: [
      { source: 'Load_Date',        target: 'load_date',        transform: toDate },
      { source: 'Truck_name',       target: 'truck_name',       transform: trimOrNull },
      { source: 'Operator',         target: 'operator',         transform: trimOrNull },
      { source: 'From_location',    target: 'from_location',    transform: trimOrNull },
      { source: 'To_Location',      target: 'to_location',      transform: trimOrNull },
      { source: 'Tons_Nett_weight', target: 'tons_nett_weight', transform: toNum },
      { source: 'Number_of_loads',  target: 'number_of_loads',  transform: toNum },
      { source: 'Notes',            target: 'notes',            transform: trimOrNull },
      { source: 'ID',               target: 'id' },
      { source: 'Manure_type',      target: 'manure_type',      transform: trimOrNull },
    ],
  },

  // Consolidated: Manure_From_Locations + Manure_To_Locations → transport.manure_locations
  {
    order: 40,
    sourceTable: 'Manure_From_Locations',
    targetTable: 'transport.manure_locations',
    query: 'SELECT From_Location, ID FROM dbo.Manure_From_Locations ORDER BY ID',
    columns: [
      { source: 'From_Location', target: 'from_location', transform: trimOrNull },
      { source: 'ID',            target: 'id' },
    ],
    staticColumns: { direction: 'from' },
  },

  {
    order: 40,
    sourceTable: 'Manure_To_Locations',
    targetTable: 'transport.manure_locations',
    query: 'SELECT To_Location, ID FROM dbo.Manure_To_Locations ORDER BY ID',
    columns: [
      { source: 'To_Location', target: 'to_location', transform: trimOrNull },
      { source: 'ID',          target: 'id' },
    ],
    staticColumns: { direction: 'to' },
  },

  {
    order: 40,
    sourceTable: 'Digistar_Data_History',
    targetTable: 'digistar.digistar_data_history',
    query: `SELECT Truck, Done, Ingred_Pen, Trck_Mill_loaded, Load_number,
                   Commod_Pen, Ration_Name, Call_Wght, Wght_delivered, Driver_ID,
                   Time_done, Date_format, Head_count, C15, Zone, Mix_time,
                   Truck_weight_now, ID, BatchBox, Feed_date, Last_Feed_for_pen
            FROM dbo.Digistar_Data_History ORDER BY ID`,
    columns: [
      { source: 'Truck',             target: 'truck',             transform: trimOrNull },
      { source: 'Done',              target: 'done',              transform: trimOrNull },
      { source: 'Ingred_Pen',        target: 'ingred_pen',        transform: trimOrNull },
      { source: 'Trck_Mill_loaded',  target: 'trck_mill_loaded',  transform: trimOrNull },
      { source: 'Load_number',       target: 'load_number',       transform: trimOrNull },
      { source: 'Commod_Pen',        target: 'commod_pen',        transform: trimOrNull },
      { source: 'Ration_Name',       target: 'ration_name',       transform: trimOrNull },
      { source: 'Call_Wght',         target: 'call_wght',         transform: toNum },
      { source: 'Wght_delivered',    target: 'wght_delivered',    transform: toNum },
      { source: 'Driver_ID',         target: 'driver_id',         transform: toNum },
      { source: 'Time_done',         target: 'time_done',         transform: trimOrNull },
      { source: 'Date_format',       target: 'date_format',       transform: trimOrNull },
      { source: 'Head_count',        target: 'head_count',        transform: toNum },
      { source: 'C15',               target: 'c15',               transform: trimOrNull },
      { source: 'Zone',              target: 'zone',              transform: trimOrNull },
      { source: 'Mix_time',          target: 'mix_time',          transform: trimOrNull },
      { source: 'Truck_weight_now',  target: 'truck_weight_now',  transform: toNum },
      { source: 'ID',                target: 'id' },
      { source: 'BatchBox',          target: 'batchbox',          transform: trimOrNull },
      { source: 'Feed_date',         target: 'feed_date',         transform: toDate },
      { source: 'Last_Feed_for_pen', target: 'last_feed_for_pen', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Costs_Feed_Detail',
    targetTable: 'finance.costs_feed_detail',
    query: `SELECT BeastID, RevExp_Code, Date_Fed, Rev_Exp_per_Unit, Units,
                   Extended_RevExp, Ration, Custom_Feed_Charge_Ton, PenWhenFed,
                   Units_DryMatter, Paddock_Feed, Forced_Application
            FROM dbo.Costs_Feed_Detail ORDER BY ID`,
    columns: [
      { source: 'BeastID',                target: 'beastid',                transform: toNum },
      { source: 'RevExp_Code',            target: 'revexp_code',            transform: toNum },
      { source: 'Date_Fed',               target: 'date_fed',               transform: toDate },
      { source: 'Rev_Exp_per_Unit',       target: 'rev_exp_per_unit',       transform: toNum },
      { source: 'Units',                  target: 'units',                  transform: toNum },
      { source: 'Extended_RevExp',        target: 'extended_revexp',        transform: toNum },
      { source: 'Ration',                 target: 'ration',                 transform: trimOrNull },
      { source: 'Custom_Feed_Charge_Ton', target: 'custom_feed_charge_ton', transform: toNum },
      { source: 'PenWhenFed',             target: 'penwhenfed',             transform: trimOrNull },
      { source: 'Units_DryMatter',        target: 'units_drymatter',        transform: toNum },
      { source: 'Paddock_Feed',           target: 'paddock_feed',           transform: toBool },
      { source: 'Forced_Application',     target: 'forced_application',     transform: toBool },
    ],
  },

  {
    order: 40,
    sourceTable: 'Overhead_application_history',
    targetTable: 'cattle.overhead_application_history',
    query: `SELECT Location_code, Period_from, Period_to, Doll_per_head_per_day,
                   Ohead_Gross_Value, Ohead_Head, ID
            FROM dbo.Overhead_application_history ORDER BY ID`,
    columns: [
      { source: 'Location_code',         target: 'location_code',         transform: toNum },
      { source: 'Period_from',           target: 'period_from',           transform: toDate },
      { source: 'Period_to',             target: 'period_to',             transform: toDate },
      { source: 'Doll_per_head_per_day', target: 'doll_per_head_per_day', transform: toNum },
      { source: 'Ohead_Gross_Value',     target: 'ohead_gross_value',     transform: toNum },
      { source: 'Ohead_Head',            target: 'ohead_head',            transform: toNum },
      { source: 'ID',                    target: 'id' },
    ],
  },

  {
    order: 40,
    sourceTable: 'RV_RCTI_data',
    targetTable: 'finance.rv_rcti_data',
    query: 'SELECT Head, Weight, Cost, cull_reason, ID, Notes FROM dbo.RV_RCTI_data ORDER BY ID',
    columns: [
      { source: 'Head',        target: 'head',        transform: toNum },
      { source: 'Weight',      target: 'weight',      transform: toNum },
      { source: 'Cost',        target: 'cost',        transform: toNum },
      { source: 'cull_reason', target: 'cull_reason', transform: trimOrNull },
      { source: 'ID',          target: 'id' },
      { source: 'Notes',       target: 'notes',       transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Despatched_RFIDs',
    targetTable: 'cattle.despatched_rfids',
    query: `SELECT EID, Despatch_mob_name, Ear_Tag, Group_Name, Group_colour,
                   Rejected, ProRata_weight, DOF, Date_and_time, Despatched
            FROM dbo.Despatched_RFIDs ORDER BY ID`,
    columns: [
      { source: 'EID',                target: 'eid',                transform: trimOrNull },
      { source: 'Despatch_mob_name',  target: 'despatch_mob_name',  transform: trimOrNull },
      { source: 'Ear_Tag',            target: 'ear_tag',            transform: trimOrNull },
      { source: 'Group_Name',         target: 'group_name',         transform: trimOrNull },
      { source: 'Group_colour',       target: 'group_colour',       transform: trimOrNull },
      { source: 'Rejected',           target: 'rejected',           transform: trimOrNull },
      { source: 'ProRata_weight',     target: 'prorata_weight',     transform: toNum },
      { source: 'DOF',                target: 'dof',                transform: toNum },
      { source: 'Date_and_time',      target: 'date_and_time',      transform: toDate },
      { source: 'Despatched',         target: 'despatched',         transform: toBool },
    ],
  },

  // ── Order 50: Carcase_DataType2 (large, many columns) ──────

  {
    order: 50,
    sourceTable: 'Carcase_DataType2',
    targetTable: 'carcase.carcase_datatype2',
    query: `SELECT keyPlantChainKillBody, species, eqsRef, plant, killDate, bodyNo,
                   vendorProducer, ownerProducer, plantBoningRun, coldGrader, hotGrader,
                   gradeDate, leftSideScanTime, rightSideScanTime, hangMethod, hgp, sex,
                   dentition, leftHscw, rightHscw, totalHscw, [operator], dest, p8Fat,
                   lot, epbi, humpCold, ema, ossificationCold, ausMarbling, msaMarbling,
                   meatColour, fatColour, ribFatCold, ph, loinTemp, mfv, rinse, saleyard,
                   rib, gradeCode, nlis, rfid, gradeMethod, humpHot, feedType,
                   ossificationHot, noDaysOnFeed, PlantBoneRunTemplate,
                   MSAVendorDecSerial, MSAVendorDecCount, NVDSerial, NVDSerialPrefix,
                   SaleyardNo, FatDistribution, ChainNo, HidePullerDamage, FailMisc,
                   CutCookAlgorithmVersionNumber, MSAIndex, OpportunityIndex,
                   ProcessorIndex, Boning_Date, ID, Date_Record_Added
            FROM dbo.Carcase_DataType2 ORDER BY ID`,
    columns: [
      { source: 'keyPlantChainKillBody',          target: 'keyplantchainkillbody',          transform: trimOrNull },
      { source: 'species',                        target: 'species',                        transform: trimOrNull },
      { source: 'eqsRef',                         target: 'eqsref',                         transform: trimOrNull },
      { source: 'plant',                          target: 'plant',                          transform: trimOrNull },
      { source: 'killDate',                       target: 'killdate',                       transform: toDate },
      { source: 'bodyNo',                         target: 'bodyno',                         transform: toNum },
      { source: 'vendorProducer',                 target: 'vendorproducer',                 transform: trimOrNull },
      { source: 'ownerProducer',                  target: 'ownerproducer',                  transform: trimOrNull },
      { source: 'plantBoningRun',                 target: 'plantboningrun',                 transform: trimOrNull },
      { source: 'coldGrader',                     target: 'coldgrader',                     transform: trimOrNull },
      { source: 'hotGrader',                      target: 'hotgrader',                      transform: trimOrNull },
      { source: 'gradeDate',                      target: 'gradedate',                      transform: toDate },
      { source: 'leftSideScanTime',               target: 'leftsidescanttime',               transform: trimOrNull },
      { source: 'rightSideScanTime',              target: 'rightsidescantime',              transform: trimOrNull },
      { source: 'hangMethod',                     target: 'hangmethod',                     transform: trimOrNull },
      { source: 'hgp',                            target: 'hgp',                            transform: trimOrNull },
      { source: 'sex',                            target: 'sex',                            transform: trimOrNull },
      { source: 'dentition',                      target: 'dentition',                      transform: trimOrNull },
      { source: 'leftHscw',                       target: 'lefthscw',                       transform: toNum },
      { source: 'rightHscw',                      target: 'righthscw',                      transform: toNum },
      { source: 'totalHscw',                      target: 'totalhscw',                      transform: toNum },
      { source: 'operator',                       target: 'operator',                       transform: trimOrNull },
      { source: 'dest',                           target: 'dest',                           transform: trimOrNull },
      { source: 'p8Fat',                          target: 'p8fat',                          transform: toNum },
      { source: 'lot',                            target: 'lot',                            transform: trimOrNull },
      { source: 'epbi',                           target: 'epbi',                           transform: trimOrNull },
      { source: 'humpCold',                       target: 'humpcold',                       transform: toNum },
      { source: 'ema',                            target: 'ema',                            transform: toNum },
      { source: 'ossificationCold',               target: 'ossificationcold',               transform: toNum },
      { source: 'ausMarbling',                    target: 'ausmarbling',                    transform: toNum },
      { source: 'msaMarbling',                    target: 'msamarbling',                    transform: toNum },
      { source: 'meatColour',                     target: 'meatcolour',                     transform: trimOrNull },
      { source: 'fatColour',                      target: 'fatcolour',                      transform: trimOrNull },
      { source: 'ribFatCold',                     target: 'ribfatcold',                     transform: toNum },
      { source: 'ph',                             target: 'ph',                             transform: toNum },
      { source: 'loinTemp',                       target: 'lointemp',                       transform: toNum },
      { source: 'mfv',                            target: 'mfv',                            transform: trimOrNull },
      { source: 'rinse',                          target: 'rinse',                          transform: trimOrNull },
      { source: 'saleyard',                       target: 'saleyard',                       transform: trimOrNull },
      { source: 'rib',                            target: 'rib',                            transform: toNum },
      { source: 'gradeCode',                      target: 'gradecode',                      transform: toNum },
      { source: 'nlis',                           target: 'nlis',                           transform: trimOrNull },
      { source: 'rfid',                           target: 'rfid',                           transform: trimOrNull },
      { source: 'gradeMethod',                    target: 'grademethod',                    transform: toNum },
      { source: 'humpHot',                        target: 'humphot',                        transform: toNum },
      { source: 'feedType',                       target: 'feedtype',                       transform: trimOrNull },
      { source: 'ossificationHot',                target: 'ossificationhot',                transform: toNum },
      { source: 'noDaysOnFeed',                   target: 'nodaysonfeed',                   transform: toNum },
      { source: 'PlantBoneRunTemplate',            target: 'plantboneruntemplate',            transform: trimOrNull },
      { source: 'MSAVendorDecSerial',              target: 'msavendordecserial',              transform: trimOrNull },
      { source: 'MSAVendorDecCount',               target: 'msavendordeccount',               transform: toNum },
      { source: 'NVDSerial',                       target: 'nvdserial',                       transform: trimOrNull },
      { source: 'NVDSerialPrefix',                 target: 'nvdserialprefix',                 transform: trimOrNull },
      { source: 'SaleyardNo',                      target: 'saleyardno',                      transform: trimOrNull },
      { source: 'FatDistribution',                 target: 'fatdistribution',                 transform: trimOrNull },
      { source: 'ChainNo',                         target: 'chainno',                         transform: trimOrNull },
      { source: 'HidePullerDamage',                target: 'hidepullerdamage',                transform: trimOrNull },
      { source: 'FailMisc',                        target: 'failmisc',                        transform: trimOrNull },
      { source: 'CutCookAlgorithmVersionNumber',   target: 'cutcookalgorithmversionnumber',   transform: trimOrNull },
      { source: 'MSAIndex',                        target: 'msaindex',                        transform: toNum },
      { source: 'OpportunityIndex',                target: 'opportunityindex',                transform: toNum },
      { source: 'ProcessorIndex',                  target: 'processorindex',                  transform: toNum },
      { source: 'Boning_Date',                     target: 'boning_date',                     transform: toDate },
      { source: 'ID',                              target: 'id' },
      { source: 'Date_Record_Added',               target: 'date_record_added',               transform: toDate },
    ],
  },


];

// ── Normalized child-table mappings ─────────────────────────
// These require custom row-expansion logic in runner.js:
// - Ration_Load_Sizes.Truck_Size_1..10 → feed.ration_load_size_entries (unpivot)
// - Pen_Feeding_Order_Params.DATA0..59 → feed.pen_feeding_order_data (unpivot)
//
// The parent rows are migrated by the standard mappings above.
// The child rows are generated by expandNormalizedChildren() in runner.js.

// Sort by order
mappings.sort((a, b) => a.order - b.order);

module.exports = {
  mappings,
  // Expose helpers for testing
  toBool,
  trimOrNull,
  toDate,
  toNum,
  toFkId,
  mapSex,
  deriveCowStatus,
  mapWeighType,
  mapCostType,
  mapContactType,
};
