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

/** Trim strings, collapse empty to null */
function trimOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
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
    targetTable: 'breeds',
    query: 'SELECT Breed_Code, Breed_Name FROM dbo.Breeds ORDER BY Breed_Code',
    columns: [
      { source: 'Breed_Code', target: 'id' },
      { source: 'Breed_Name', target: 'name', transform: trimOrNull },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'FeedDB_Pens_File',
    targetTable: 'pens',
    query: 'SELECT Pen_name, IsPaddock, Include_in_Pen_List, Current_exit_pen FROM dbo.FeedDB_Pens_File ORDER BY Pen_name',
    columns: [
      { source: 'Pen_name',           target: 'name',            transform: trimOrNull },
      { source: 'IsPaddock',          target: 'is_paddock',       transform: toBool },
      { source: 'Include_in_Pen_List', target: 'include_in_list', transform: toBool },
      { source: 'Current_exit_pen',   target: 'exit_pen',         transform: trimOrNull },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'Contacts',
    targetTable: 'contacts',
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
      { source: 'Contact_ID',    target: 'id' },
      { source: 'Company',       target: 'company',               transform: trimOrNull },
      { source: 'First_Name',    target: 'first_name',            transform: trimOrNull },
      { source: 'Last_Name',     target: 'last_name',             transform: trimOrNull },
      { source: 'Salutation',    target: 'title',                 transform: trimOrNull },
      { source: 'Address_1',     target: 'address',               transform: trimOrNull },
      { source: 'Address_2',     target: 'address_2',             transform: trimOrNull },
      { source: 'City',          target: 'city',                  transform: trimOrNull },
      { source: 'State',         target: 'state',                 transform: trimOrNull },
      { source: 'PostCode',      target: 'post_code',             transform: trimOrNull },
      { source: 'Tel_No',        target: 'phone',                 transform: trimOrNull },
      { source: 'Mobile_No',     target: 'mobile',                transform: trimOrNull },
      { source: 'Fax_No',        target: 'fax',                   transform: trimOrNull },
      { source: 'Email',         target: 'email',                 transform: trimOrNull },
      { source: 'Contact_Type',  target: 'type',                  transform: mapContactType },
      { source: 'Tail_Tag_No',   target: 'tail_tag',              transform: trimOrNull },
      { source: 'Brand',         target: 'brand',                 transform: trimOrNull },
      { source: 'Notes',         target: 'notes',                 transform: trimOrNull },
      { source: 'ABN',           target: 'abn',                   transform: trimOrNull },
      { source: 'Bank_BSB',      target: 'bsb',                   transform: trimOrNull },
      { source: 'Bank_AC',       target: 'account_number',        transform: trimOrNull },
      { source: 'Days_invoice_due', target: 'payment_due_days',   transform: toNum },
      { source: 'Agistment_Paddock_Rate', target: 'paddock_agistment_rate', transform: toNum },
      { source: 'Agistment_Feedlot_Rate', target: 'feedlot_agistment_rate', transform: toNum },
      { source: 'Invoice_careof', target: 'invoice_co',           transform: trimOrNull },
      { source: 'brand_drawing_filename', target: 'brand_drawing_file', transform: trimOrNull },
      { source: 'Abattoir_Establishment_Number', target: 'abattoir_est_no', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
  },

  {
    order: 10,
    sourceTable: 'Diseases',
    targetTable: 'diseases',
    query: `SELECT Disease_ID, Disease_Name, Symptoms, Treatment,
                   Recoverable, BodySystemID, PenApp_Disease_name,
                   Autopsy_disease, No_longer_used
            FROM dbo.Diseases
            ORDER BY Disease_ID`,
    columns: [
      { source: 'Disease_ID',         target: 'id' },
      { source: 'Disease_Name',       target: 'name',            transform: trimOrNull },
      { source: 'Symptoms',           target: 'symptoms',        transform: trimOrNull },
      { source: 'Treatment',          target: 'treatment',       transform: trimOrNull },
      { source: 'No_longer_used',     target: 'active',          transform: (v) => !toBool(v) },
      { source: 'Recoverable',        target: 'recoverable',     transform: toBool },
      { source: 'BodySystemID',       target: 'body_system',     transform: trimOrNull },
      { source: 'PenApp_Disease_name', target: 'penapp_name',    transform: trimOrNull },
      { source: 'Autopsy_disease',    target: 'autopsy_disease', transform: toBool },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'Drugs',
    targetTable: 'drugs',
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
      { source: 'Drug_ID',         target: 'id' },
      { source: 'Drug_Name',       target: 'name',                transform: trimOrNull },
      { source: 'Units',           target: 'unit',                transform: trimOrNull },
      { source: 'Cost_per_unit',   target: 'cost_per_unit',       transform: toNum },
      { source: 'WithHold_days_1', target: 'withhold_days',       transform: toNum },
      { source: 'WithHold_days_ESI', target: 'esi_days',          transform: toNum },
      { source: 'WithHold_days_3', target: 'withhold_days_3',     transform: toNum },
      { source: 'WithHold_days_4', target: 'withhold_days_4',     transform: toNum },
      { source: 'HGP',             target: 'is_hgp',              transform: toBool },
      { source: 'Antibiotic',      target: 'is_antibiotic',       transform: toBool },
      { source: 'Supplier',        target: 'supplier',            transform: trimOrNull },
      { source: 'Inactive',        target: 'active',              transform: (v) => !toBool(v) },
      { source: 'Notes',           target: 'notes',               transform: trimOrNull },
      { source: 'Drug_Category',   target: 'drug_category',       transform: toNum },
      { source: 'Admin_units',     target: 'admin_units',         transform: trimOrNull },
      { source: 'Admin_weight_Factor', target: 'admin_weight_factor', transform: toNum },
      { source: 'Current_Batch_Numb', target: 'current_batch',    transform: trimOrNull },
      { source: 'Cost_per_Unit_CF', target: 'cost_per_unit_cf',   transform: toNum },
      { source: 'Chemical_Mg_per_Ml', target: 'chemical_mg_per_ml', transform: toNum },
      { source: 'Reorder_SOH_units_trigger', target: 'reorder_trigger_units', transform: toNum },
      { source: 'Units_per_BoxOrBottle', target: 'units_per_package', transform: toNum },
      { source: 'Units_on_hand',   target: 'units_on_hand',       transform: toNum },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'Cost_Codes',
    targetTable: 'cost_codes',
    query: `SELECT RevExp_Code, RevExp_Desc, Rev_Exp,
                   Include_in_Landed_Cost, Include_in_PL_expenses,
                   Include_on_CF_Invoice
            FROM dbo.Cost_Codes
            ORDER BY RevExp_Code`,
    columns: [
      { source: 'RevExp_Code', target: 'code' },
      { source: 'RevExp_Desc', target: 'description',          transform: trimOrNull },
      { source: 'Rev_Exp',     target: 'type',                 transform: mapCostType },
      { source: 'Include_in_Landed_Cost', target: 'include_in_landed_cost', transform: toBool },
      { source: 'Include_in_PL_expenses', target: 'include_in_pl_expenses', transform: toBool },
      { source: 'Include_on_CF_Invoice',  target: 'include_on_cf_invoice',  transform: toBool },
    ],
    validate: (row) => row.description !== null,
  },

  {
    order: 10,
    sourceTable: 'Market_Category',
    targetTable: 'market_categories',
    query: `SELECT Market_Cat_ID, Market_Category, Min_DOF,
                   Predicted_dressing_pcnt, HGP_Free, Dispatch_Notes
            FROM dbo.Market_Category
            ORDER BY Market_Cat_ID`,
    columns: [
      { source: 'Market_Cat_ID',    target: 'id' },
      { source: 'Market_Category',  target: 'name',                   transform: trimOrNull },
      { source: 'Min_DOF',          target: 'min_dof',                transform: toNum },
      { source: 'HGP_Free',         target: 'hgp_free',               transform: toBool },
      { source: 'Predicted_dressing_pcnt', target: 'predicted_dressing_pct', transform: toNum },
      { source: 'Dispatch_Notes',   target: 'dispatch_notes',         transform: trimOrNull },
    ],
    validate: (row) => row.name !== null,
  },

  // ---- Order 20: Purchase lots (depends on contacts) ----
  {
    order: 20,
    sourceTable: 'Purchase_Lots',
    targetTable: 'purchase_lots',
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
      { source: 'Agent_Code',          target: 'agent_id',               transform: toFkId },
      { source: 'Agent',               target: 'agent_name',             transform: trimOrNull },
      { source: 'Number_Head',         target: 'head_count',             transform: toNum },
      { source: 'Total_Weight',        target: 'total_weight_kg',        transform: toNum },
      { source: 'Cost_of_Cattle',      target: 'total_cost',             transform: toNum },
      { source: 'Cattle_Freight_Cost', target: 'freight_cost',           transform: toNum },
      { source: 'Lot_Notes',           target: 'notes',                  transform: trimOrNull },
      { source: 'WBridge_Docket',      target: 'fl_weighbridge_docket',  transform: trimOrNull },
      { source: 'DPI_Charges',         target: 'dpi_charges',            transform: toNum },
      { source: 'Destination',         target: 'destination',            transform: trimOrNull },
      { source: 'Agistor_Code',        target: 'agistor_id',             transform: toFkId },
      { source: 'Cattle_Invoice_No',   target: 'cattle_invoice_no',      transform: trimOrNull },
      { source: 'Invoice_Amount',      target: 'cattle_inv_amount',      transform: toNum },
      { source: 'Date_Cattle_Inv_Approved', target: 'cattle_inv_date_approved', transform: toDate },
      { source: 'Carrier',             target: 'carrier',                transform: trimOrNull },
      { source: 'Freight_Invoice_No',  target: 'freight_invoice_no',     transform: trimOrNull },
      { source: 'Date_Frght_Inv_Approved', target: 'freight_inv_date_approved', transform: toDate },
      { source: 'Buyer_Commiss_per_Head', target: 'commission_per_head', transform: toNum },
      { source: 'Buying_Fee',          target: 'buying_fee',             transform: toNum },
      { source: 'Other_Buying_Costs',  target: 'other_buying_costs',     transform: toNum },
      { source: 'Buyer',               target: 'buyer_id',               transform: toFkId },
      { source: 'Purchase_Region',     target: 'purchase_region',        transform: toNum },
      { source: 'Risk_factor',         target: 'risk_factor',            transform: toNum },
      { source: 'Custom_Feed_Lot',     target: 'custom_feeding_lot',     transform: toBool },
      { source: 'Feed_Charge_per_Ton', target: 'cust_feed_charge_per_ton', transform: toNum },
      { source: 'Cattle_Owner_ID',     target: 'owner_of_cattle',        transform: trimOrNull },
      { source: 'Agist_Rate_per_day',  target: 'daily_agist_charge_per_head', transform: toNum },
      { source: 'Weigh_bridge_weight', target: 'weighbridge_weight',     transform: toNum },
      { source: 'Market_Category',     target: 'market_category',        transform: trimOrNull },
      { source: 'Weighbridge_Charges', target: 'weighbridge_charges',    transform: toNum },
      { source: 'Is_Financed',         target: 'financed',               transform: toBool },
      { source: 'Finance_Rate',        target: 'finance_rate_pct',       transform: toNum },
      { source: 'GrowerGroupCode',     target: 'grower_group_code',      transform: toNum },
      { source: 'Applied_To_Cattle_File', target: 'applied_to_cattle',   transform: toBool },
      { source: 'NVD_scan_filename',   target: 'nvd_scan_file',          transform: trimOrNull },
      { source: 'Weigh_ticket_scan_filename', target: 'weigh_ticket_scan_file', transform: trimOrNull },
      { source: 'Optional_scan_filename1', target: 'scan_file_1',        transform: trimOrNull },
      { source: 'Optional_scan_filename2', target: 'scan_file_2',        transform: trimOrNull },
      { source: 'Marbling_bonus_lot',  target: 'marbling_bonus_lot',     transform: toBool },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    validate: (row) => row.lot_number !== null,
  },

  // ---- Order 30: Core cattle ----
  {
    order: 30,
    sourceTable: 'Cattle',
    targetTable: 'cows',
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
      { source: 'Ear_Tag',             target: 'tag_number',              transform: trimOrNull },
      { source: 'EID',                 target: 'eid',                     transform: trimOrNull },
      { source: 'Sex',                 target: 'sex',                     transform: mapSex },
      { source: 'HGP',                 target: 'hgp',                     transform: toBool },
      { source: 'Feedlot_Entry_Date',  target: 'entry_date',              transform: toDate },
      { source: 'Feedlot_Entry_Wght',  target: 'entry_weight_kg',         transform: toNum },
      { source: 'Sale_Date',           target: 'sale_date',               transform: (v) => { const d = toDate(v); return d && d > '1901-01-01' ? d : null; } },
      { source: 'Sale_Weight',         target: 'sale_weight_kg',          transform: toNum },
      { source: 'DOB',                 target: 'dob',                     transform: toDate },
      { source: 'Start_Date',          target: 'start_date',              transform: toDate },
      { source: 'Start_Weight',        target: 'start_weight_kg',         transform: toNum },
      { source: 'Notes',               target: 'notes',                   transform: trimOrNull },
      { source: 'Purch_Lot_No',        target: '_purch_lot_no',           transform: trimOrNull },
      { source: 'Tail_Tag',            target: 'tail_tag',                transform: trimOrNull },
      { source: 'Vendor_Ear_Tag',      target: 'vendor_ear_tag',          transform: trimOrNull },
      { source: 'Group_Name',          target: 'group_name',              transform: trimOrNull },
      { source: 'Sub_Group',           target: 'sub_group',               transform: trimOrNull },
      { source: 'Background_Doll_per_Kg', target: 'background_cost_per_kg', transform: toNum },
      { source: 'BG_Fee',              target: 'bg_fee',                  transform: toNum },
      { source: 'Teeth',               target: 'teeth',                   transform: toNum },
      { source: 'WHold_Until',         target: 'withhold_until',          transform: toDate },
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
      { source: 'Market_Category',     target: 'market_category',         transform: trimOrNull },
      { source: 'Cull_Reason',         target: 'cull_reason',             transform: trimOrNull },
      { source: 'Agist_Lot_No',        target: 'agist_lot_no',            transform: trimOrNull },
      { source: 'Current_LocType_ID',  target: 'current_loc_type_id',     transform: toNum },
      { source: 'Old_RFID',            target: 'old_rfid',                transform: trimOrNull },
      { source: 'Date_RFID_Changed',   target: 'date_rfid_changed',       transform: toDate },
      { source: 'Trial_No_ID',         target: 'trial_no_id',             transform: toNum },
      { source: 'NFAS_Decl_Numb',      target: 'nfas_decl_number',        transform: trimOrNull },
      { source: 'GrowerGroupCode',     target: 'grower_group_code',       transform: toNum },
      { source: 'Date_culled',         target: 'date_culled',             transform: toDate },
      { source: 'Agistment_PIC',       target: 'agistment_pic',           transform: trimOrNull },
      { source: 'Blood_vial_number',   target: 'blood_vial_number',       transform: trimOrNull },
      { source: 'AP_Lot',              target: 'ap_lot',                  transform: trimOrNull },
      { source: 'LifeTime_Traceable',  target: 'lifetime_traceable',      transform: toBool },
      { source: 'Pregnant',            target: 'pregnant',                transform: toBool },
      { source: 'Planned_kill_date',   target: 'planned_kill_date',       transform: toDate },
      { source: 'Beast_Sale_Type_ID',  target: 'beast_sale_type_id',      transform: toNum },
      { source: 'ESI_Whold_until',     target: 'esi_withhold_until',      transform: toDate },
      { source: 'PregTested',          target: 'preg_tested',             transform: toBool },
      { source: 'CustomFeedOwnerID',   target: 'custom_feed_owner_id',    transform: toNum },
      { source: 'Species',             target: 'species',                 transform: trimOrNull },
      { source: 'NLIS_tag_fail_at_induction', target: 'nlis_tag_fail',    transform: toBool },
      { source: 'DNA_or_Blood_Number', target: 'dna_blood_number',        transform: trimOrNull },
      { source: 'DOF_scheduled',       target: 'dof_scheduled',           transform: toNum },
      { source: 'EU',                  target: 'eu',                      transform: toBool },
      { source: 'EU_Dec_No',           target: 'eu_dec_no',               transform: trimOrNull },
      { source: 'Paddock_Tag',         target: 'paddock_tag',             transform: trimOrNull },
      { source: 'Outgoing_NVD',        target: 'outgoing_nvd',            transform: trimOrNull },
      { source: 'Agisted_animal',      target: 'agisted_animal',          transform: toBool },
      { source: 'VendorID',            target: 'vendor_id',               transform: toNum },
      { source: 'AgentID',             target: 'agent_id',                transform: toNum },
      { source: 'Bovilus_Shots',       target: 'bovilus_shots',           transform: toNum },
      { source: 'Program_ID',          target: 'program_id',              transform: toNum },
      { source: 'Abattoir_Culled',     target: 'abattoir_culled',         transform: toBool },
      { source: 'Abattoir_Condemned',  target: 'abattoir_condemned',      transform: toBool },
      { source: 'Lot_closeout_date',   target: 'lot_closeout_date',       transform: toDate },
      { source: 'Vendor_Treated_Bovilus', target: 'vendor_treated_bovilus', transform: toBool },
      { source: 'Agist_Charged_Up_To_Date', target: 'agist_charged_to_date', transform: toDate },
      { source: 'last_oracle_costs',   target: 'last_oracle_costs',       transform: toNum },
      { source: 'last_oracle_date',    target: 'last_oracle_date',        transform: toDate },
      { source: 'Marbling_bonus_lot',  target: 'marbling_bonus_lot',      transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at',  transform: toDate },
    ],
    // breed is resolved from Breeds lookup; pen from Pens lookup
    // status is derived from flags
    transformRow: (row, lookups) => {
      // resolve breed
      const breedId = row.Breed;
      const breedName = lookups.breeds?.[breedId] || 'Unknown';
      row._breed = breedName;
      // breed_id removed — only the text breed name is stored

      // resolve pen
      const penName = trimOrNull(row.Pen_Number);
      row._pen_id = penName ? (lookups.penIdMap?.[penName] || null) : null;

      // resolve purchase lot
      const lotNo = trimOrNull(row.Purch_Lot_No);
      row._purchase_lot_id = lotNo ? (lookups.purchLotIdMap?.[lotNo] || null) : null;

      // derive status
      row._status = deriveCowStatus(row);

      return row;
    },
    buildInsertValues: (row) => ({
      legacy_beast_id:    row.legacy_beast_id,
      tag_number:         row.tag_number || `UNKNOWN-${row.legacy_beast_id}`,
      eid:                row.eid,
      breed:              row._breed || 'Unknown',
      sex:                row.sex,
      hgp:                row.hgp,
      status:             row._status,
      entry_date:         row.entry_date,
      entry_weight_kg:    row.entry_weight_kg,
      sale_date:          row.sale_date,
      sale_weight_kg:     row.sale_weight_kg,
      dob:                row.dob,
      start_date:         row.start_date,
      start_weight_kg:    row.start_weight_kg,
      notes:              row.notes,
      pen_id:             row._pen_id,
      purchase_lot_id:    row._purchase_lot_id,
      tail_tag:           row.tail_tag,
      vendor_ear_tag:     row.vendor_ear_tag,
      group_name:         row.group_name,
      sub_group:          row.sub_group,
      background_cost_per_kg: row.background_cost_per_kg,
      bg_fee:             row.bg_fee,
      teeth:              row.teeth,
      withhold_until:     row.withhold_until,
      date_died:          row.date_died,
      sire_tag:           row.sire_tag,
      dam_tag:            row.dam_tag,
      off_feed:           row.off_feed,
      in_hospital:        row.in_hospital,
      buller:             row.buller,
      non_performer:      row.non_performer,
      frame_size:         row.frame_size,
      custom_feeder:      row.custom_feeder,
      dof_in_prev_fl:     row.dof_in_prev_fl,
      market_category:    row.market_category,
      cull_reason:        row.cull_reason,
      agist_lot_no:       row.agist_lot_no,
      current_loc_type_id: row.current_loc_type_id,
      old_rfid:           row.old_rfid,
      date_rfid_changed:  row.date_rfid_changed,
      trial_no_id:        row.trial_no_id,
      nfas_decl_number:   row.nfas_decl_number,
      grower_group_code:  row.grower_group_code,
      date_culled:        row.date_culled,
      agistment_pic:      row.agistment_pic,
      blood_vial_number:  row.blood_vial_number,
      ap_lot:             row.ap_lot,
      lifetime_traceable: row.lifetime_traceable,
      pregnant:           row.pregnant,
      planned_kill_date:  row.planned_kill_date,
      beast_sale_type_id: row.beast_sale_type_id,
      esi_withhold_until: row.esi_withhold_until,
      preg_tested:        row.preg_tested,
      custom_feed_owner_id: row.custom_feed_owner_id,
      species:            row.species,
      nlis_tag_fail:      row.nlis_tag_fail,
      dna_blood_number:   row.dna_blood_number,
      dof_scheduled:      row.dof_scheduled,
      eu:                 row.eu,
      eu_dec_no:          row.eu_dec_no,
      paddock_tag:        row.paddock_tag,
      outgoing_nvd:       row.outgoing_nvd,
      agisted_animal:     row.agisted_animal,
      vendor_id:          row.vendor_id,
      agent_id:           row.agent_id,
      bovilus_shots:       row.bovilus_shots,
      program_id:         row.program_id,
      abattoir_culled:    row.abattoir_culled,
      abattoir_condemned: row.abattoir_condemned,
      lot_closeout_date:  row.lot_closeout_date,
      vendor_treated_bovilus: row.vendor_treated_bovilus,
      agist_charged_to_date: row.agist_charged_to_date,
      last_oracle_costs:  row.last_oracle_costs,
      last_oracle_date:   row.last_oracle_date,
      marbling_bonus_lot: row.marbling_bonus_lot,
      legacy_modified_at: row.legacy_modified_at,
    }),
  },

  // ---- Order 40: Dependent event tables ----
  {
    order: 40,
    sourceTable: 'Weighing_Events',
    targetTable: 'weighing_events',
    query: `SELECT BeastID, Weighing_Type, Weigh_date, Weight, P8_Fat, Weigh_Note,
                   Ear_Tag, Days_Owned, TimeWeighed, Agistor_ID,
                   BE_Agist_Lot_No, Cull_Reason_ID, Beast_Sale_Type_ID,
                   To_Locn_Type_ID, User_Initials, Last_Modified_timestamp
            FROM dbo.Weighing_Events
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',            target: '_beast_id' },
      { source: 'Weighing_Type',      target: 'weigh_type',          transform: mapWeighType },
      { source: 'Weigh_date',         target: 'weighed_at',          transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Weight',             target: 'weight_kg',           transform: toNum },
      { source: 'P8_Fat',             target: 'p8_fat',              transform: toNum },
      { source: 'Weigh_Note',         target: 'notes',               transform: trimOrNull },
      { source: 'Ear_Tag',            target: 'ear_tag',             transform: trimOrNull },
      { source: 'Days_Owned',         target: 'days_owned',          transform: toNum },
      { source: 'TimeWeighed',        target: 'time_weighed',        transform: trimOrNull },
      { source: 'Agistor_ID',         target: 'agistor_id',          transform: toNum },
      { source: 'BE_Agist_Lot_No',    target: 'be_agist_lot_no',     transform: trimOrNull },
      { source: 'Cull_Reason_ID',     target: 'cull_reason_id',      transform: v => v ? String(toNum(v)) : null },
      { source: 'Beast_Sale_Type_ID', target: 'beast_sale_type_id',  transform: toNum },
      { source: 'To_Locn_Type_ID',    target: 'to_locn_type_id',     transform: toNum },
      { source: 'User_Initials',      target: 'user_initials',       transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    validate: (row) => row.weight_kg !== null,
    requiresLookup: 'cowIdMap',
  },

  {
    order: 40,
    sourceTable: 'PensHistory',
    targetTable: 'pen_movements',
    query: `SELECT BeastID, MoveDate, Pen, Last_Modified_timestamp
            FROM dbo.PensHistory
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',  target: '_beast_id' },
      { source: 'MoveDate', target: 'moved_at', transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Pen',      target: '_pen_name', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    requiresLookup: 'cowIdMap',
  },

  {
    order: 40,
    sourceTable: 'Drugs_Given',
    targetTable: 'treatments',
    query: `SELECT BeastID, Ear_Tag_No, Drug_ID, Batch_No, Date_Given,
                   Time_Given, Units_Given, Drug_Cost, Withold_Until,
                   Date_next_Dose, SB_Rec_No, WithHold_date_ESI,
                   User_Initials, Where_given, Last_Modified_timestamp
            FROM dbo.Drugs_Given
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',        target: '_beast_id' },
      { source: 'Drug_ID',        target: 'drug_id',            transform: toFkId },
      { source: 'Units_Given',    target: 'dose',               transform: (v) => { const n = toNum(v); return (n !== null && n < 0) ? null : n; } },
      { source: 'Date_Given',     target: 'administered_at',    transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Withold_Until',  target: 'withhold_until',     transform: toDate },
      { source: 'SB_Rec_No',      target: '_sb_rec_no' },
      { source: 'User_Initials',  target: 'administered_by',    transform: trimOrNull },
      { source: 'Ear_Tag_No',     target: 'ear_tag',            transform: trimOrNull },
      { source: 'Batch_No',       target: 'batch_no',           transform: trimOrNull },
      { source: 'Time_Given',     target: 'time_given',         transform: trimOrNull },
      { source: 'Drug_Cost',      target: 'drug_cost',          transform: toNum },
      { source: 'Date_next_Dose', target: 'date_next_dose',     transform: toDate },
      { source: 'WithHold_date_ESI', target: 'esi_withhold',    transform: toDate },
      { source: 'Where_given',    target: 'where_given',        transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    requiresLookup: 'cowIdMap',
  },

  {
    order: 40,
    sourceTable: 'Costs',
    targetTable: 'costs',
    query: `SELECT BeastID, Ear_Tag, RevExp_Code, Trans_Date,
                   Rev_Exp_per_Unit, Units, Extended_RevExp,
                   Ration, Last_Modified_timestamp
            FROM dbo.Costs
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',       target: '_beast_id' },
      { source: 'RevExp_Code',   target: '_cost_code' },
      { source: 'Trans_Date',    target: 'trans_date',         transform: toDate },
      { source: 'Rev_Exp_per_Unit', target: '_unit_cost',      transform: toNum },
      { source: 'Units',         target: 'units',              transform: (v) => toNum(v) ?? 1 },
      { source: 'Extended_RevExp', target: 'amount',           transform: toNum },
      { source: 'Ear_Tag',       target: 'ear_tag',            transform: trimOrNull },
      { source: 'Ration',        target: 'ration',             transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    requiresLookup: 'cowIdMap',
    validate: (row) => row.amount !== null,
    buildInsertValues: (row) => ({
      cow_id:             row.cow_id,
      cost_code_id:       row.cost_code_id,
      trans_date:         row.trans_date,
      unit_cost:          row._unit_cost,
      units:              row.units,
      amount:             row.amount,
      ear_tag:            row.ear_tag,
      ration:             row.ration,
      legacy_modified_at: row.legacy_modified_at,
    }),
  },

  {
    order: 39,
    sourceTable: 'Sick_Beast_Records',
    targetTable: 'health_records',
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
      { source: 'Beast_ID',          target: '_beast_id' },
      { source: 'Date_Diagnosed',    target: 'date',                 transform: toDate },
      { source: 'Diagnosed_By',      target: 'vet_name',             transform: trimOrNull },
      { source: 'Sick_Beast_Notes',  target: 'description',          transform: (v) => trimOrNull(v) || 'Sick beast record' },
      { source: 'Disease_ID',        target: 'disease_id',           transform: toFkId },
      { source: 'Date_Recovered_Died', target: 'date_recovered',     transform: toDate },
      { source: 'Result_Code',       target: 'result_code',          transform: trimOrNull },
      { source: 'SB_Rec_No',         target: 'legacy_sb_rec_no' },
      { source: 'Ear_Tag_No',        target: 'ear_tag',              transform: trimOrNull },
      { source: 'Severity_Level',    target: 'severity_level',       transform: toNum },
      { source: 'WHold_Until',       target: 'withhold_until',       transform: toDate },
      { source: 'Date_to_sick_Pen',  target: 'date_to_sick_pen',     transform: toDate },
      { source: 'Sick_Pen_Number',   target: 'sick_pen_number',      transform: trimOrNull },
      { source: 'Date_Back_To_Pen',  target: 'date_back_to_pen',     transform: toDate },
      { source: 'Back_To_Pen_Number', target: 'back_to_pen_number',  transform: trimOrNull },
      { source: 'Hosp_Tag_Number',   target: 'hosp_tag_number',      transform: trimOrNull },
      { source: 'RatType',           target: 'rat_type',             transform: trimOrNull },
      { source: 'Pen_Where_Found_Sick', target: 'pen_where_found_sick', transform: trimOrNull },
      { source: 'Euthanased',        target: 'euthanased',           transform: toBool },
      { source: 'Too_Far_Gone',      target: 'too_far_gone',         transform: toBool },
      { source: 'Insurance_Claim',   target: 'insurance_claim',      transform: toBool },
      { source: 'Insurance_value',   target: 'insurance_value',      transform: toNum },
      { source: 'Insurance_paid',    target: 'insurance_paid',       transform: toBool },
      { source: 'DOF_when_sick',     target: 'dof_when_sick',        transform: toNum },
      { source: 'Diagnoser_Empl_ID', target: 'diagnoser_empl_id',   transform: toNum },
      { source: 'User_Initials',     target: 'user_initials',        transform: trimOrNull },
      { source: 'CustomFeedOwnerID', target: 'custom_feed_owner_id', transform: toNum },
      { source: 'Purch_Lot_No',      target: 'purch_lot_no',         transform: trimOrNull },
      { source: 'Cause_of_Death',    target: 'cause_of_death',       transform: trimOrNull },
      { source: 'Autopsied',         target: 'autopsied',            transform: toBool },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    requiresLookup: 'cowIdMap',
    staticValues: { type: 'treatment' },
    validate: (row) => row.date !== null,
  },

  // ---- Order 50: Additional data tables (new) ----

  {
    order: 50,
    sourceTable: 'Carcase_data',
    targetTable: 'carcase_data',
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
      { source: 'Beast_ID',          target: '_beast_id' },
      { source: 'Beast_ID',          target: 'legacy_beast_id' },
      { source: 'Ear_Tag_No',        target: 'ear_tag',                transform: trimOrNull },
      { source: 'EID',               target: 'eid',                    transform: trimOrNull },
      { source: 'Sold_To',           target: 'sold_to',                transform: trimOrNull },
      { source: 'Abattoir',          target: 'abattoir',               transform: trimOrNull },
      { source: 'Body_Number',       target: 'body_number',            transform: trimOrNull },
      { source: 'Kill_Date',         target: 'kill_date',              transform: toDate },
      { source: 'Carc_Wght_left',    target: 'carc_weight_left',       transform: toNum },
      { source: 'Carc_Wght_right',   target: 'carc_weight_right',      transform: toNum },
      { source: 'Dress_Pcnt',        target: 'dress_pct',              transform: toNum },
      { source: 'Teeth',             target: 'teeth',                  transform: toNum },
      { source: 'Grade',             target: 'grade',                  transform: trimOrNull },
      { source: 'Price_$/Kg_Left',   target: 'price_per_kg_left',      transform: toNum },
      { source: 'Price_$/Kg_Right',  target: 'price_per_kg_right',     transform: toNum },
      { source: 'P8_fat',            target: 'p8_fat',                 transform: toNum },
      { source: 'Rib_fat',           target: 'rib_fat',                transform: toNum },
      { source: 'Mscle_Score',       target: 'muscle_score',           transform: trimOrNull },
      { source: 'Eye_Mscle_Area',    target: 'eye_muscle_area',        transform: toNum },
      { source: 'PH_level',          target: 'ph_level',               transform: toNum },
      { source: 'Marbling',          target: 'marbling',               transform: toNum },
      { source: 'Fat_Colour',        target: 'fat_colour',             transform: toNum },
      { source: 'Mscle_Colour',      target: 'muscle_colour',          transform: trimOrNull },
      { source: 'Meat_Texture',      target: 'meat_texture',           transform: toNum },
      { source: 'Meat_Yield',        target: 'meat_yield',             transform: toNum },
      { source: 'Contract_No',       target: 'contract_no',            transform: trimOrNull },
      { source: 'Bruising_L',        target: 'bruising_l',             transform: trimOrNull },
      { source: 'Bruising_R',        target: 'bruising_r',             transform: trimOrNull },
      { source: '$/Kg_Deduction',    target: 'deduction_per_kg',       transform: toNum },
      { source: 'Dockage_Reason',    target: 'dockage_reason',         transform: trimOrNull },
      { source: 'Live_Weight_Shrink_Pcnt', target: 'live_weight_shrink_pct', transform: toNum },
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
      { source: 'Abattoir_ID',       target: 'abattoir_contact_id',    transform: toFkId },
      { source: 'Loin_temp',         target: 'loin_temp',              transform: toNum },
      { source: 'Carc_damage_L',     target: 'carc_damage_l',          transform: trimOrNull },
      { source: 'Carc_damage_R',     target: 'carc_damage_r',          transform: trimOrNull },
      { source: 'Marbling_bonus_rate', target: 'marbling_bonus_rate',  transform: toNum },
      { source: 'RCInvoice_Date',    target: 'rc_invoice_date',        transform: toDate },
      { source: 'Marbling_bonus_value', target: 'marbling_bonus_value', transform: toNum },
      { source: 'Hump_Height',       target: 'hump_height',            transform: toNum },
      { source: 'MEQMSA',            target: 'meq_msa',                transform: toNum },
      { source: 'MEQAUSMRB',         target: 'meq_aus_mrb',            transform: toNum },
      { source: 'Abattoir_Establishment_Number', target: 'abattoir_est_no', transform: trimOrNull },
      { source: 'Last_Modified_timestamp', target: 'legacy_modified_at', transform: toDate },
    ],
    requiresLookup: 'cowIdMap',
  },

  {
    order: 50,
    sourceTable: 'Autopsy_Records',
    targetTable: 'autopsy_records',
    query: `SELECT Beast_ID, Ear_Tag_No, Date_Dead, Time_Dead, Date_Autopsy,
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
      { source: 'Beast_ID',         target: '_beast_id' },
      { source: 'Beast_ID',         target: 'legacy_beast_id' },
      { source: 'Ear_Tag_No',       target: 'ear_tag',           transform: trimOrNull },
      { source: 'Date_Dead',        target: 'date_dead',         transform: toDate },
      { source: 'Time_Dead',        target: 'time_dead',         transform: trimOrNull },
      { source: 'Date_Autopsy',     target: 'date_autopsy',      transform: toDate },
      { source: 'Autopsy_By',       target: 'autopsy_by',        transform: trimOrNull },
      { source: 'Pre_Autopsy_Diag', target: 'pre_autopsy_diag',  transform: trimOrNull },
      { source: 'Post_Autopsy_Diag', target: 'post_autopsy_diag', transform: trimOrNull },
      { source: 'Notes',            target: 'notes',             transform: trimOrNull },
    ],
    transformRow: (row) => {
      // Pack all the anatomical findings into a JSONB field
      const findings = {};
      const boolFields = [
        'Nostrils_Erosions', 'Nostrils_Fluid', 'Nostrils_Froth',
        'Larynx_Normal', 'Larynx_Necrotic',
        'Trachea_Erosions', 'Tarchea_Fluid', 'Trachea_Froth',
        'Chest_Fluid', 'Chest_Fibrin', 'Chest_Adhesions',
        'Lungs_Spongy', 'Lungs_Firm', 'Lungs_Consolidate', 'Lungs_Abscess', 'Lungs_not_Collapsed',
        'Heart_Fluid', 'Heart_Haemorrhages',
        'Abdomen_Fluid', 'Abdomen_Fibrin', 'Abdomen_Adhesions',
        'Liver_Abscess', 'Liver_Cysts', 'Liver_Colour',
        'Rumen_Full', 'Rumen_Empty',
        'Intest_Normal', 'Intest_Red', 'Intest_Dark',
        'Kidneys_Abscess', 'Kidneys_Cyst', 'Kidneys_Calculi',
        'Bladder_Intact', 'Bladder_Ruptured', 'Bladder_Calculi',
        'Muscle_Bruising', 'Muscle_Abscess',
        'Legs_Bruising', 'Legs_Abscess',
        'Body_Cond_Fresh', 'Body_Cond_Bloated', 'Body_Cond_Putrid',
      ];
      for (const f of boolFields) {
        findings[f] = toBool(row[f]);
      }
      row._findings = JSON.stringify(findings);
      return row;
    },
    buildInsertValues: (row) => ({
      cow_id:            row.cow_id,
      legacy_beast_id:   row.legacy_beast_id,
      ear_tag:           row.ear_tag,
      date_dead:         row.date_dead,
      time_dead:         row.time_dead,
      date_autopsy:      row.date_autopsy,
      autopsy_by:        row.autopsy_by,
      pre_autopsy_diag:  row.pre_autopsy_diag,
      post_autopsy_diag: row.post_autopsy_diag,
      findings:          row._findings,
      notes:             row.notes,
    }),
    requiresLookup: 'cowIdMap',
  },

  {
    order: 50,
    sourceTable: 'Vendor_Declarations',
    targetTable: 'vendor_declarations',
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
      { source: 'QA_Program_details', target: 'qa_details',        transform: trimOrNull },
      { source: 'Fed_stockfeeds',    target: 'fed_stockfeeds',    transform: toBool },
      { source: 'Chem_Res_restriction', target: 'chem_restriction', transform: toBool },
      { source: 'Withholding_for_drugs', target: 'withholding_drugs', transform: toBool },
      { source: 'Withholding_for_feed',  target: 'withholding_feed',  transform: toBool },
      { source: 'Endosulfan_exposure', target: 'endosulfan_exposure', transform: toBool },
      { source: 'Endosulfan_Date',   target: 'endosulfan_date',   transform: toDate },
      { source: 'Fed_Animal_Fats',   target: 'fed_animal_fats',   transform: toBool },
      { source: 'Additional_info',   target: 'additional_info',   transform: trimOrNull },
    ],
    transformRow: (row) => {
      // Derive ownership period from boolean flags
      if (toBool(row.Owned_GT_12_months))     row._ownership = '>12 months';
      else if (toBool(row.Owned_6_12_months)) row._ownership = '6-12 months';
      else if (toBool(row.Owned_2_6_months))  row._ownership = '2-6 months';
      else if (toBool(row.Owned_LT_2months))  row._ownership = '<2 months';
      else if (toBool(row.Born_on_Vend_prop)) row._ownership = 'born on property';
      else                                     row._ownership = null;
      return row;
    },
    buildInsertValues: (row) => ({
      vendor_dec_number: row.vendor_dec_number,
      owner_contact_id:  row.owner_contact_id,
      form_date:         row.form_date,
      number_cattle:     row.number_cattle,
      cattle_description: row.cattle_description,
      tail_tag:          row.tail_tag,
      rfids_in_cattle:   row.rfids_in_cattle,
      hgp_treated:       row.hgp_treated,
      qa_program:        row.qa_program,
      qa_details:        row.qa_details,
      ownership_period:  row._ownership,
      fed_stockfeeds:    row.fed_stockfeeds,
      chem_restriction:  row.chem_restriction,
      withholding_drugs: row.withholding_drugs,
      withholding_feed:  row.withholding_feed,
      additional_info:   row.additional_info,
    }),
  },

  {
    order: 50,
    sourceTable: 'Drugs_Purchased',
    targetTable: 'drug_purchases',
    query: `SELECT Receival_ID, DrugID, Quantity_received, Batch_number, Expiry_date, Drug_cost
            FROM dbo.Drugs_Purchased
            ORDER BY ID`,
    columns: [
      { source: 'DrugID',            target: 'drug_id',            transform: toFkId },
      { source: 'Quantity_received', target: 'quantity',            transform: toNum },
      { source: 'Batch_number',      target: 'batch_number',        transform: trimOrNull },
      { source: 'Expiry_date',       target: 'expiry_date',         transform: toDate },
      { source: 'Drug_cost',         target: 'cost',                transform: toNum },
      { source: 'Receival_ID',       target: 'legacy_receival_id',  transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Drug_Disposal',
    targetTable: 'drug_disposals',
    query: `SELECT Disposal_ID, DrugID, Number_disposed, Date_disposed,
                   Disposal_reason, Disposal_method, Disposed_by, Notes,
                   Applied_to_Inventory
            FROM dbo.Drug_Disposal
            ORDER BY Disposal_ID`,
    columns: [
      { source: 'DrugID',              target: 'drug_id',              transform: toFkId },
      { source: 'Number_disposed',     target: 'quantity',             transform: toNum },
      { source: 'Date_disposed',       target: 'disposal_date',        transform: toDate },
      { source: 'Disposal_reason',     target: 'disposal_reason',      transform: trimOrNull },
      { source: 'Disposal_method',     target: 'disposal_method',      transform: trimOrNull },
      { source: 'Disposed_by',         target: 'disposed_by',          transform: trimOrNull },
      { source: 'Notes',               target: 'notes',                transform: trimOrNull },
      { source: 'Disposal_ID',         target: 'legacy_disposal_id',   transform: toNum },
      { source: 'Applied_to_Inventory', target: 'applied_to_inventory', transform: toBool },
    ],
  },

  // ── Section 2: Legacy raw tables (structured migration) ──

  {
    order: 10,
    sourceTable: 'Beast_Cull_Reasons',
    targetTable: 'cull_reasons',
    query: `SELECT Cull_Reason_ID, Cull_Reason, PayRate_per_Kg, Induction_cull, Later_cull
            FROM dbo.Beast_Cull_Reasons
            ORDER BY Cull_Reason_ID`,
    columns: [
      { source: 'Cull_Reason_ID', target: 'code', transform: v => String(toNum(v)) },
      { source: 'Cull_Reason', target: 'description', transform: trimOrNull },
      { source: 'PayRate_per_Kg', target: 'pay_rate_per_kg', transform: toNum },
      { source: 'Induction_cull', target: 'induction_cull', transform: toBool },
      { source: 'Later_cull', target: 'later_cull', transform: toBool },
    ],
  },

  {
    order: 10,
    sourceTable: 'Beast_Sale_Types_RV',
    targetTable: 'beast_sale_types',
    query: `SELECT Sale_Type_ID, Sale_Type
            FROM dbo.Beast_Sale_Types_RV
            ORDER BY Sale_Type_ID`,
    columns: [
      { source: 'Sale_Type_ID', target: 'sale_type_id', transform: toNum },
      { source: 'Sale_Type', target: 'sale_type', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'BodySystems',
    targetTable: 'body_systems',
    query: `SELECT BS_ID, BodySystem
            FROM dbo.BodySystems
            ORDER BY BS_ID`,
    columns: [
      { source: 'BS_ID', target: 'bs_id', transform: toNum },
      { source: 'BodySystem', target: 'body_system', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Breeding_Categories',
    targetTable: 'breeding_categories',
    query: `SELECT Breed_Category_ID, Breed_Category, Breed_Category_Desc
            FROM dbo.Breeding_Categories
            ORDER BY Breed_Category_ID`,
    columns: [
      { source: 'Breed_Category_ID', target: 'breed_category_id', transform: toNum },
      { source: 'Breed_Category', target: 'breed_category', transform: trimOrNull },
      { source: 'Breed_Category_Desc', target: 'breed_category_desc', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Carcase_Grades',
    targetTable: 'carcase_grades',
    query: `SELECT Grade_Code, Description, Price_doll_per_Kg, Effective_from_date
            FROM dbo.Carcase_Grades
            ORDER BY ID`,
    columns: [
      { source: 'Grade_Code', target: 'code', transform: trimOrNull },
      { source: 'Description', target: 'description', transform: trimOrNull },
      { source: 'Price_doll_per_Kg', target: 'price_per_kg', transform: toNum },
      { source: 'Effective_from_date', target: 'effective_from_date', transform: toDate },
    ],
  },

  {
    order: 10,
    sourceTable: 'Carcase_Grades_US',
    targetTable: 'carcase_grades_us',
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
    targetTable: 'cattle_program_types',
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
    targetTable: 'code_references',
    query: `SELECT Database_Table, Field_Name, Lookup_Table_Name, LUT_Descriptive_FieldName, LUT_Code_FieldName, ID
            FROM dbo.Code_References_Index
            ORDER BY ID`,
    columns: [
      { source: 'Database_Table', target: 'database_table', transform: trimOrNull },
      { source: 'Field_Name', target: 'field_name', transform: trimOrNull },
      { source: 'Lookup_Table_Name', target: 'lookup_table_name', transform: trimOrNull },
      { source: 'LUT_Descriptive_FieldName', target: 'lut_descriptive_field_name', transform: trimOrNull },
      { source: 'LUT_Code_FieldName', target: 'lut_code_field_name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'ContactTypes',
    targetTable: 'contact_types',
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
    targetTable: 'drug_categories',
    query: `SELECT Drug_Category, Category_Description
            FROM dbo.Drug_Category
            ORDER BY Drug_Category`,
    columns: [
      { source: 'Drug_Category', target: 'drug_category', transform: toNum },
      { source: 'Category_Description', target: 'category_description', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Feed_Commodity_names',
    targetTable: 'feed_commodity_names',
    query: `SELECT Commodity_Code, Commodity_Name, ID
            FROM dbo.Feed_Commodity_names
            ORDER BY ID`,
    columns: [
      { source: 'Commodity_Code', target: 'commodity_code', transform: toNum },
      { source: 'Commodity_Name', target: 'commodity_name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Grower_Groups',
    targetTable: 'grower_groups',
    query: `SELECT GrowerGroup_Code, GrowerGroup_Name
            FROM dbo.Grower_Groups
            ORDER BY GrowerGroup_Code`,
    columns: [
      { source: 'GrowerGroup_Code', target: 'grower_group_code', transform: toNum },
      { source: 'GrowerGroup_Name', target: 'grower_group_name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'LocationTypes',
    targetTable: 'location_types',
    query: `SELECT Loc_Type_code, Location_Type
            FROM dbo.LocationTypes
            ORDER BY Loc_Type_code`,
    columns: [
      { source: 'Loc_Type_code', target: 'legacy_id', transform: toNum },
      { source: 'Location_Type', target: 'name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Purchase_Regions',
    targetTable: 'purchase_regions',
    query: `SELECT Region_ID, Region_name
            FROM dbo.Purchase_Regions
            ORDER BY Region_ID`,
    columns: [
      { source: 'Region_ID', target: 'region_id', transform: toNum },
      { source: 'Region_name', target: 'region_name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'RationNames',
    targetTable: 'rations',
    query: `SELECT Ration_name, ValuePerTon, Notes, Custom_feed_charge_ton
            FROM dbo.RationNames
            ORDER BY Ration_name`,
    columns: [
      { source: 'Ration_name', target: 'name', transform: trimOrNull },
      { source: 'ValuePerTon', target: 'cost_per_ton', transform: toNum },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Custom_feed_charge_ton', target: 'custom_feed_charge_ton', transform: toNum },
    ],
  },

  {
    order: 10,
    sourceTable: 'Sickness_Result_Codes',
    targetTable: 'sickness_result_codes',
    query: `SELECT Sickness_Result_Code, Sickness_Result
            FROM dbo.Sickness_Result_Codes
            ORDER BY Sickness_Result_Code`,
    columns: [
      { source: 'Sickness_Result_Code', target: 'sickness_result_code', transform: toNum },
      { source: 'Sickness_Result', target: 'sickness_result', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Sickness_Result_Codes_RV',
    targetTable: 'sickness_result_codes',
    query: `SELECT Sickness_Result_Code, Sickness_Result
            FROM dbo.Sickness_Result_Codes_RV
            ORDER BY Sickness_Result_Code`,
    columns: [
      { source: 'Sickness_Result_Code', target: 'sickness_result_code', transform: toNum },
      { source: 'Sickness_Result', target: 'sickness_result', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Sire_Lines',
    targetTable: 'sire_lines',
    query: `SELECT Sire_Line_ID, Sire_Line
            FROM dbo.Sire_Lines
            ORDER BY Sire_Line_ID`,
    columns: [
      { source: 'Sire_Line_ID', target: 'sire_line_id', transform: toNum },
      { source: 'Sire_Line', target: 'sire_line', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'SubGroupNames',
    targetTable: 'sub_group_names',
    query: `SELECT Sub_Group, ID
            FROM dbo.SubGroupNames
            ORDER BY ID`,
    columns: [
      { source: 'Sub_Group', target: 'sub_group', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Weighing_Types',
    targetTable: 'weighing_types',
    query: `SELECT Weighing_Type, Weighing_Desc
            FROM dbo.Weighing_Types
            ORDER BY Weighing_Type`,
    columns: [
      { source: 'Weighing_Type', target: 'weighing_type_id', transform: toNum },
      { source: 'Weighing_Desc', target: 'name', transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Weighing_Types_RV',
    targetTable: 'weighing_types',
    query: `SELECT Weighing_Type_ID, Weighing_Type
            FROM dbo.Weighing_Types_RV
            ORDER BY Weighing_Type_ID`,
    columns: [
      { source: 'Weighing_Type_ID', target: 'weighing_type_id', transform: toNum },
      { source: 'Weighing_Type', target: 'name', transform: trimOrNull },
    ],
  },

  {
    order: 15,
    sourceTable: 'Cattle_Specs',
    targetTable: 'cattle_specs',
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
      { source: 'Marbling>=', target: 'marbling_from', transform: toNum },
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
    targetTable: 'company',
    query: `SELECT ID, [Company Name], Weight_Units, [Key], UserTailTag, RFID_Space_Removed, Apply_Feed_As_DM_Kgs, CurrentNumberUsers, Data_Collector_Scales_Type, Scales_File_Folder, Units_per_Ton, Date_DB_Last_Updated, Last_Ohead_Application, V11_Database, DFLT_WG_Per_day, NSA_Cust_ID, NSA_Email, NSA_Client, User_logon, Digistar_datalink, Padd_Tail_Tag, Date_Last_FeedTrans_Compression, Digistar_datakey, password_complexity, ABN, ACN, Address, Phone, Fax, Email, Logo, titration_feeding
            FROM dbo.Company
            ORDER BY ID`,
    columns: [
      { source: 'Company Name', target: 'company_name', transform: trimOrNull },
      { source: 'Weight_Units', target: 'weight_units', transform: trimOrNull },
      { source: 'Key', target: 'key', transform: trimOrNull },
      { source: 'UserTailTag', target: 'user_tail_tag', transform: trimOrNull },
      { source: 'RFID_Space_Removed', target: 'rfid_space_removed', transform: trimOrNull },
      { source: 'Apply_Feed_As_DM_Kgs', target: 'apply_feed_as_dm_kgs', transform: toBool },
      { source: 'CurrentNumberUsers', target: 'current_number_users', transform: toNum },
      { source: 'Data_Collector_Scales_Type', target: 'data_collector_scales_type', transform: trimOrNull },
      { source: 'Scales_File_Folder', target: 'scales_file_folder', transform: trimOrNull },
      { source: 'Units_per_Ton', target: 'units_per_ton', transform: toNum },
      { source: 'Date_DB_Last_Updated', target: 'date_db_last_updated', transform: toDate },
      { source: 'Last_Ohead_Application', target: 'last_ohead_application', transform: toDate },
      { source: 'V11_Database', target: 'v11_database', transform: trimOrNull },
      { source: 'DFLT_WG_Per_day', target: 'dflt_wg_per_day', transform: toNum },
      { source: 'NSA_Cust_ID', target: 'nsa_cust_id', transform: trimOrNull },
      { source: 'NSA_Email', target: 'nsa_email', transform: trimOrNull },
      { source: 'NSA_Client', target: 'nsa_client', transform: trimOrNull },
      { source: 'User_logon', target: 'user_logon', transform: trimOrNull },
      { source: 'Digistar_datalink', target: 'digistar_datalink', transform: trimOrNull },
      { source: 'Padd_Tail_Tag', target: 'padd_tail_tag', transform: trimOrNull },
      { source: 'Date_Last_FeedTrans_Compression', target: 'date_last_feed_trans_compression', transform: toDate },
      { source: 'Digistar_datakey', target: 'digistar_datakey', transform: trimOrNull },
      { source: 'password_complexity', target: 'password_complexity', transform: trimOrNull },
      { source: 'ABN', target: 'abn', transform: trimOrNull },
      { source: 'ACN', target: 'acn', transform: trimOrNull },
      { source: 'Address', target: 'address', transform: trimOrNull },
      { source: 'Phone', target: 'phone', transform: trimOrNull },
      { source: 'Fax', target: 'fax', transform: trimOrNull },
      { source: 'Email', target: 'email', transform: trimOrNull },
      { source: 'Logo', target: 'logo', transform: trimOrNull },
      { source: 'titration_feeding', target: 'titration_feeding', transform: trimOrNull },
    ],
  },

  {
    order: 15,
    sourceTable: 'Company_Settings',
    targetTable: 'company_settings',
    query: `SELECT ModuleName, SettingName, SettingValue, DateCreated, DateModified
            FROM dbo.Company_Settings
            ORDER BY ModuleName`,
    columns: [
      { source: 'ModuleName', target: 'module_name', transform: trimOrNull },
      { source: 'SettingName', target: 'setting_name', transform: trimOrNull },
      { source: 'SettingValue', target: 'setting_value', transform: trimOrNull },
      { source: 'DateCreated', target: 'date_created', transform: toDate },
      { source: 'DateModified', target: 'date_modified', transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'Cust_Feed_Charges',
    targetTable: 'custom_feed_charges',
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
    targetTable: 'feedlot_staff',
    query: `SELECT User_ID, Surname, FirstName, Job_Desc, Start_date, Finish_Date, Pass_word, Cattle_Data_Entry, Cattle_Reports, Cattle_Utilities, Cattle_Lookup_Tables, Feed_system_Data_Entry, Feed_system_reports, Feed_system_utilities, PL_Reports_Allowed, Pen_Rider, Cattle_Deletes, Password_Last_Changed_Date
            FROM dbo.Feedlot_Staff
            ORDER BY User_ID`,
    columns: [
      { source: 'User_ID', target: 'user_id', transform: toNum },
      { source: 'Surname', target: 'surname', transform: trimOrNull },
      { source: 'FirstName', target: 'first_name', transform: trimOrNull },
      { source: 'Job_Desc', target: 'job_desc', transform: trimOrNull },
      { source: 'Start_date', target: 'start_date', transform: toDate },
      { source: 'Finish_Date', target: 'finish_date', transform: toDate },
      { source: 'Pass_word', target: 'pass_word', transform: trimOrNull },
      { source: 'Cattle_Data_Entry', target: 'cattle_data_entry', transform: trimOrNull },
      { source: 'Cattle_Reports', target: 'cattle_reports', transform: trimOrNull },
      { source: 'Cattle_Utilities', target: 'cattle_utilities', transform: trimOrNull },
      { source: 'Cattle_Lookup_Tables', target: 'cattle_lookup_tables', transform: trimOrNull },
      { source: 'Feed_system_Data_Entry', target: 'feed_system_data_entry', transform: trimOrNull },
      { source: 'Feed_system_reports', target: 'feed_system_reports', transform: trimOrNull },
      { source: 'Feed_system_utilities', target: 'feed_system_utilities', transform: trimOrNull },
      { source: 'PL_Reports_Allowed', target: 'pl_reports_allowed', transform: trimOrNull },
      { source: 'Pen_Rider', target: 'pen_rider', transform: toBool },
      { source: 'Cattle_Deletes', target: 'cattle_deletes', transform: trimOrNull },
      { source: 'Password_Last_Changed_Date', target: 'password_last_changed_date', transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'Mort_Morb_triggers',
    targetTable: 'mort_morb_triggers',
    query: `SELECT TableName, COF_From, COF_To, Pulls_actual, Deaths_actual, Level1_Pulls_trigger, Level1_Deaths_trigger, Level2_Deaths_trigger, Level3_Deaths_trigger, Include_in_report, ID
            FROM dbo.Mort_Morb_triggers
            ORDER BY ID`,
    columns: [
      { source: 'TableName', target: 'table_name', transform: trimOrNull },
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
    targetTable: 'package_costs',
    query: `SELECT CountryCode, BasicPackage, PricePerThousandHead, BasicFeeding, VetRecords, VetReporting, CrushSideProc, FeedCommodsSystem, PriceAsAtDate
            FROM dbo.PackageCosts
            ORDER BY CountryCode`,
    columns: [
      { source: 'CountryCode', target: 'country_code', transform: toNum },
      { source: 'BasicPackage', target: 'basic_package', transform: toNum },
      { source: 'PricePerThousandHead', target: 'price_per_thousand_head', transform: toNum },
      { source: 'BasicFeeding', target: 'basic_feeding', transform: toNum },
      { source: 'VetRecords', target: 'vet_records', transform: toNum },
      { source: 'VetReporting', target: 'vet_reporting', transform: toNum },
      { source: 'CrushSideProc', target: 'crush_side_proc', transform: toNum },
      { source: 'FeedCommodsSystem', target: 'feed_commods_system', transform: toNum },
      { source: 'PriceAsAtDate', target: 'price_as_at_date', transform: toDate },
    ],
  },

  {
    order: 15,
    sourceTable: 'Pen_Rider_Tolerances',
    targetTable: 'pen_rider_tolerances',
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
    targetTable: 'price_adjustment_by_weight',
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
    targetTable: 'rv_scheduled_dof',
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
    targetTable: 'tax_invoice_bank_details',
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
    targetTable: 'carcase_import_data',
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
    targetTable: 'carcase_prices',
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
    targetTable: 'chemical_inventory',
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
      { source: 'ExpiryDate', target: 'expiry_date', transform: toDate },
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
    targetTable: 'chemical_inventory_old',
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
    targetTable: 'drug_hgp_forms',
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
    targetTable: 'drug_stocktake_records',
    query: `SELECT Stocktake_ID, DrugID, Units_per_BoxOrBottle, On_hand_theoritical, Counted, Diffrence, Reorder_SOH_units_trigger, Applied_to_SOH, ID, BoxBottles_OnHand
            FROM dbo.Drug_Stocktake_records
            ORDER BY ID`,
    columns: [
      { source: 'Stocktake_ID', target: 'stocktake_id', transform: toNum },
      { source: 'DrugID', target: 'drug_id', transform: toNum },
      { source: 'Units_per_BoxOrBottle', target: 'units_per_box_or_bottle', transform: toNum },
      { source: 'On_hand_theoritical', target: 'on_hand_theoritical', transform: toNum },
      { source: 'Counted', target: 'counted', transform: toNum },
      { source: 'Diffrence', target: 'diffrence', transform: toNum },
      { source: 'Reorder_SOH_units_trigger', target: 'reorder_soh_units_trigger', transform: toNum },
      { source: 'Applied_to_SOH', target: 'applied_to_soh', transform: trimOrNull },
      { source: 'BoxBottles_OnHand', target: 'box_bottles_on_hand', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Drug_Stocktakes',
    targetTable: 'drug_stocktakes',
    query: `SELECT Stocktake_ID, Stock_Date, Done_By, Notes, Applied_to_inventory, ID
            FROM dbo.Drug_Stocktakes
            ORDER BY ID`,
    columns: [
      { source: 'Stocktake_ID', target: 'stocktake_id', transform: toNum },
      { source: 'Stock_Date', target: 'stock_date', transform: toDate },
      { source: 'Done_By', target: 'done_by', transform: trimOrNull },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Applied_to_inventory', target: 'applied_to_inventory', transform: toBool },
    ],
  },

  {
    order: 20,
    sourceTable: 'Drug_Transfer_Records',
    targetTable: 'drug_transfer_records',
    query: `SELECT Transfer_ID, DrugID, Units_per_BoxOrBottle, On_hand_theoretical, Transferred, Remaining, Reorder_SOH_units_trigger, Applied_to_SOH, ID, BoxBottles_OnHand
            FROM dbo.Drug_Transfer_Records
            ORDER BY ID`,
    columns: [
      { source: 'Transfer_ID', target: 'transfer_id', transform: toNum },
      { source: 'DrugID', target: 'drug_id', transform: toNum },
      { source: 'Units_per_BoxOrBottle', target: 'units_per_box_or_bottle', transform: toNum },
      { source: 'On_hand_theoretical', target: 'on_hand_theoretical', transform: toNum },
      { source: 'Transferred', target: 'transferred', transform: toNum },
      { source: 'Remaining', target: 'remaining', transform: toNum },
      { source: 'Reorder_SOH_units_trigger', target: 'reorder_soh_units_trigger', transform: toNum },
      { source: 'Applied_to_SOH', target: 'applied_to_soh', transform: trimOrNull },
      { source: 'BoxBottles_OnHand', target: 'box_bottles_on_hand', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Drug_Transfers',
    targetTable: 'drug_transfers',
    query: `SELECT Transfer_ID, Transfer_Date, Transfer_Location, Done_By, Notes, Applied_to_inventory, ID
            FROM dbo.Drug_Transfers
            ORDER BY ID`,
    columns: [
      { source: 'Transfer_ID', target: 'transfer_id', transform: toNum },
      { source: 'Transfer_Date', target: 'transfer_date', transform: toDate },
      { source: 'Transfer_Location', target: 'transfer_location', transform: trimOrNull },
      { source: 'Done_By', target: 'done_by', transform: trimOrNull },
      { source: 'Notes', target: 'notes', transform: trimOrNull },
      { source: 'Applied_to_inventory', target: 'applied_to_inventory', transform: toBool },
    ],
  },

  {
    order: 20,
    sourceTable: 'Drugs_Purchase_event',
    targetTable: 'drug_purchase_events',
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
    targetTable: 'instrument_calibration_tests',
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
    targetTable: 'instruments_needing_calibration',
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
    targetTable: 'kd1_records',
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
      { source: 'Supplier_EarTag', target: 'supplier_ear_tag', transform: trimOrNull },
      { source: 'Rudd800_Traits', target: 'rudd800_traits', transform: trimOrNull },
      { source: 'Lot_Number', target: 'lot_number', transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Livestock_Weighbridge_Dockets',
    targetTable: 'weighbridge_dockets',
    query: `SELECT DocketID, Docket_Number, Docket_Type, Docket_Date, Docket_Time, Exit_Date, Exit_Time, WeighpersonID, CarrierID, Driver_Name, Vehicle_Rego, Origin_DestinationID, Description, NVD_No, Purch_Lot_No, Head_Count, Animal_Welfare, WeighUnits, Gross_Weight, Tare_Weight, Shrink_Percent, Notes
            FROM dbo.Livestock_Weighbridge_Dockets
            ORDER BY DocketID`,
    columns: [
      { source: 'DocketID', target: 'legacy_docket_id', transform: toNum },
      { source: 'Docket_Number', target: 'docket_number', transform: v => String(toNum(v) || '') },
      { source: 'Docket_Type', target: 'docket_type', transform: v => Number(v) === 1 ? 'receival' : 'dispatch' },
      { source: 'Docket_Date', target: 'docket_date', transform: toDate },
      { source: 'Docket_Time', target: 'docket_time', transform: toTime },
      { source: 'Exit_Date', target: 'exit_date', transform: toDate },
      { source: 'Exit_Time', target: 'exit_time', transform: toTime },
      { source: 'WeighpersonID', target: 'user_id', transform: toNum },
      { source: 'CarrierID', target: 'carrier_id', transform: toFkId },
      { source: 'Driver_Name', target: 'driver_name', transform: trimOrNull },
      { source: 'Vehicle_Rego', target: 'vehicle_rego', transform: trimOrNull },
      { source: 'Origin_DestinationID', target: 'origin_dest_id', transform: toFkId },
      { source: 'Description', target: 'description', transform: trimOrNull },
      { source: 'NVD_No', target: 'nvd_number', transform: trimOrNull },
      { source: 'Purch_Lot_No', target: 'purchase_lot_id', transform: toFkId },
      { source: 'Head_Count', target: 'head_count', transform: toNum },
      { source: 'Animal_Welfare', target: 'welfare_followed', transform: toBool },
      { source: 'WeighUnits', target: 'weight_unit', transform: v => { const s = trimOrNull(v); return s === 'T' || s === 'tons' ? 'tons' : 'kgs'; } },
      { source: 'Gross_Weight', target: 'gross_weight', transform: toNum },
      { source: 'Tare_Weight', target: 'tare_weight', transform: toNum },
      { source: 'Shrink_Percent', target: 'shrink_pct', transform: toNum },
      { source: 'Notes', target: 'docket_notes', transform: trimOrNull },
    ],
  },

  {
    order: 20,
    sourceTable: 'Treatment_Regimes',
    targetTable: 'treatment_regimes',
    query: `SELECT ID, DiseaseID, Day_Numb, Drug_Name, Dose, DoseByWeight, Drug_ID, UserID
            FROM dbo.Treatment_Regimes
            ORDER BY ID`,
    columns: [
      { source: 'DiseaseID', target: 'disease_id', transform: toFkId },
      { source: 'Day_Numb', target: 'day_numb', transform: toNum },
      { source: 'Drug_Name', target: 'name', transform: trimOrNull },
      { source: 'Dose', target: 'dose', transform: toNum },
      { source: 'DoseByWeight', target: 'dose_by_weight', transform: trimOrNull },
      { source: 'Drug_ID', target: 'drug_id', transform: toFkId },
      { source: 'UserID', target: 'user_id', transform: toNum },
    ],
  },

  {
    order: 20,
    sourceTable: 'Trial_Description',
    targetTable: 'trials',
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
      { source: 'Total_Head', target: 'head_count', transform: toNum },
      { source: 'Results', target: 'results', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Agistment_Transfer_Register',
    targetTable: 'agistment_transfers',
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
    sourceTable: 'Beast_Accumed_Feed_by_commodity',
    targetTable: 'beast_feed_by_commodity',
    query: `SELECT BeastID, Commodity_Code, Accumed_Kgs, Accumed_Cost, Accumed_CustFeed_charge, Date_last_updated, ID
            FROM dbo.Beast_Accumed_Feed_by_commodity
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Commodity_Code', target: 'commodity_code', transform: toNum },
      { source: 'Accumed_Kgs', target: 'accumed_kgs', transform: toNum },
      { source: 'Accumed_Cost', target: 'accumed_cost', transform: toNum },
      { source: 'Accumed_CustFeed_charge', target: 'accumed_cust_feed_charge', transform: toNum },
      { source: 'Date_last_updated', target: 'date_last_updated', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Beast_Breeding',
    targetTable: 'beast_breeding',
    query: `SELECT Beast_ID, Birth_Date, Birth_Wght, Sire, Dam, Genetics, Notes
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
    ],
  },

  {
    order: 40,
    sourceTable: 'Beast_Ohead_Appl_History',
    targetTable: 'beast_overhead_history',
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
    targetTable: 'beast_movements',
    query: `SELECT BeastID, MoveDate
            FROM dbo.BeastMovement
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'MoveDate', target: 'move_date', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Breeding_Dams',
    targetTable: 'breeding_dams',
    query: `SELECT Dam_ID, Dam_Name, Dam_Supplier
            FROM dbo.Breeding_Dams
            ORDER BY Dam_ID`,
    columns: [
      { source: 'Dam_ID', target: 'dam_id', transform: toNum },
      { source: 'Dam_Name', target: 'dam_name', transform: trimOrNull },
      { source: 'Dam_Supplier', target: 'dam_supplier', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Breeding_Sires',
    targetTable: 'breeding_sires',
    query: `SELECT Sire_ID, Sire_Name, Sire_Supplier, Sire_Line_ID, AWA_Sire_ID
            FROM dbo.Breeding_Sires
            ORDER BY Sire_ID`,
    columns: [
      { source: 'Sire_ID', target: 'sire_id', transform: toNum },
      { source: 'Sire_Name', target: 'sire_name', transform: trimOrNull },
      { source: 'Sire_Supplier', target: 'sire_supplier', transform: trimOrNull },
      { source: 'Sire_Line_ID', target: 'sire_line_id', transform: toNum },
      { source: 'AWA_Sire_ID', target: 'awa_sire_id', transform: trimOrNull },
    ],
  },

  {
    order: 40,
    sourceTable: 'Cattle_DOF_and_DIP',
    targetTable: 'cattle_dof_dip',
    query: `SELECT BeastID, DOF, DIP, Date_Calculated
            FROM dbo.Cattle_DOF_and_DIP
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'DOF', target: 'dof', transform: toNum },
      { source: 'DIP', target: 'dip', transform: toNum },
      { source: 'Date_Calculated', target: 'date_calculated', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'Cattle_Feed_Update',
    targetTable: 'cattle_feed_updates',
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
    targetTable: 'cattle_photos',
    query: `SELECT BeastID, Ear_Tag, Photo, DateLastUpdated, ID
            FROM dbo.Cattle_Photos
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Ear_Tag', target: 'ear_tag', transform: trimOrNull },
      { source: 'Photo', target: 'photo', transform: trimOrNull },
      { source: 'DateLastUpdated', target: 'date_last_updated', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'CattleProcessed',
    targetTable: 'cattle_processed',
    query: `SELECT BeastID, WeighDate, ID, DraftGate, SavedDate
            FROM dbo.CattleProcessed
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'WeighDate', target: 'weigh_date', transform: toDate },
      { source: 'DraftGate', target: 'draft_gate', transform: toNum },
      { source: 'SavedDate', target: 'saved_date', transform: toDate },
    ],
  },

  {
    order: 40,
    sourceTable: 'ContactsContactTypes',
    targetTable: 'contacts_contact_types',
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
    targetTable: 'new_cattle_records_log',
    query: `SELECT BeastID, Date_record_added, Mod_ule, Proceedure_Name, User_Number, ID, EarTag, EID
            FROM dbo.New_cattle_records_Log
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
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
    targetTable: 'paddock_feeding',
    query: `SELECT BeastID, Paddock_Feed_Type, From_Date, To_Date, ID, Commodity_ID
            FROM dbo.Paddock_Feeding
            ORDER BY ID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Paddock_Feed_Type', target: 'paddock_feed_type', transform: trimOrNull },
      { source: 'From_Date', target: 'from_date', transform: toDate },
      { source: 'To_Date', target: 'to_date', transform: toDate },
      { source: 'Commodity_ID', target: 'commodity_id', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'Pen_Data_From_FeedDB',
    targetTable: 'pen_data_from_feed_db',
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
    targetTable: 'pending_feed_data',
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
    targetTable: 'pen_riders_log',
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
    targetTable: 'pens_fed',
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
    targetTable: 'purchase_lot_cattle',
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
    targetTable: 'resp_disease_retreats',
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
    targetTable: 'rudd_800_traits',
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
    targetTable: 'sb_rec_no_booked',
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
    targetTable: 'scu_rec_data',
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
    targetTable: 'sick_beast_brd_symptoms',
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
    targetTable: 'sick_beast_temperatures',
    query: `SELECT SB_Rec_No, Temp_Date, Temperature, ID, BeastID, Weight
            FROM dbo.Sick_Beast_Temperature
            ORDER BY ID`,
    columns: [
      { source: 'SB_Rec_No', target: 'sb_rec_no', transform: toNum },
      { source: 'Temp_Date', target: 'temp_date', transform: toDate },
      { source: 'Temperature', target: 'temperature', transform: toNum },
      { source: 'BeastID', target: 'beast_id', transform: toNum },
      { source: 'Weight', target: 'weight', transform: toNum },
    ],
  },

  {
    order: 40,
    sourceTable: 'StockRecData',
    targetTable: 'stock_rec_data',
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
    targetTable: 'tag_bucket',
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
    targetTable: 'archives',
    query: `SELECT Date_done, Reverse_Archive, Record_Selection, Records_Archived, ID
            FROM dbo.Archiving_Log
            ORDER BY ID`,
    columns: [
      { source: 'Date_done', target: 'legacy_date_done', transform: toDate },
      { source: 'Reverse_Archive', target: 'reverse_archive', transform: toBool },
      { source: 'Record_Selection', target: 'record_selection', transform: trimOrNull },
      { source: 'Records_Archived', target: 'legacy_records_archived', transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Batch_Update_log',
    targetTable: 'batch_update_log',
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
    targetTable: 'carcase_feedback_compliance',
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
    targetTable: 'carcase_feedback_monthly_avgs',
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
    targetTable: 'carcase_feedback_report_data',
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
    targetTable: 'cattle_by_location',
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
    targetTable: 'cattle_query_month_report',
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
    targetTable: 'custom_feed_invoices',
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
    targetTable: 'custom_feed_lot_summary',
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
    targetTable: 'daily_cattle_inventory',
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
    targetTable: 'error_log',
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
    targetTable: 'feed_totals_by_ration',
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
    targetTable: 'head_by_disease',
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
    targetTable: 'last_7_days_pulls',
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
    targetTable: 'month_end_stock_on_hand',
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
    targetTable: 'monthly_adjustment_ob',
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
    targetTable: 'monthly_agistor_movements',
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
    targetTable: 'monthly_feedlot_reconciliation',
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
    targetTable: 'monthly_fl_intake_cost',
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
    targetTable: 'monthly_movements',
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
    targetTable: 'monthly_rv_agist_reconciliation',
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
    targetTable: 'pen_mort_morb',
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
    targetTable: 'pen_list_snapshots',
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
    targetTable: 'purchase_totals',
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
    targetTable: 'sick_by_dof',
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
    targetTable: 'stock_on_hand_monthly',
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
    targetTable: 'trading_buying_details',
    query: `SELECT BeastID, Agent_ID, Buyer_ID, Supplier_ID, Sale_yard_Pen, Animal_Grade, SaleYard_or_Paddock, Payment_Status, Date_Purchased, Date_paid
            FROM dbo.TandR_Buying_details
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID', target: 'beast_id', transform: toNum },
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
    targetTable: 'trading_costs_report',
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
    targetTable: 'user_logons',
    query: `SELECT User_Number, Log_on_Date_time, Term_inal, ID
            FROM dbo.User_Log_Ons
            ORDER BY ID`,
    columns: [
      { source: 'User_Number', target: 'user_number', transform: toNum },
      { source: 'Log_on_Date_time', target: 'log_on_date_time', transform: toDate },
      { source: 'Term_inal', target: 'term_inal', transform: trimOrNull },
    ],
  },


];

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
