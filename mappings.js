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
    query: 'SELECT Pen_name, IsPaddock FROM dbo.FeedDB_Pens_File ORDER BY Pen_name',
    columns: [
      { source: 'Pen_name',  target: 'name',       transform: trimOrNull },
      { source: 'IsPaddock', target: 'is_paddock',  transform: toBool },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'Contacts',
    targetTable: 'contacts',
    query: `SELECT Contact_ID, Company, Last_Name, First_Name,
                   Tel_No, Email, Address_1, ABN, Notes
            FROM dbo.Contacts
            ORDER BY Contact_ID`,
    columns: [
      { source: 'Contact_ID', target: 'id' },
      { source: 'Company',    target: 'company',    transform: trimOrNull },
      { source: 'First_Name', target: 'first_name', transform: trimOrNull },
      { source: 'Last_Name',  target: 'last_name',  transform: trimOrNull },
      { source: 'Tel_No',     target: 'phone',      transform: trimOrNull },
      { source: 'Email',      target: 'email',      transform: trimOrNull },
      { source: 'Address_1',  target: 'address',    transform: trimOrNull },
      { source: 'ABN',        target: 'abn',        transform: trimOrNull },
      { source: 'Notes',      target: 'notes',      transform: trimOrNull },
    ],
  },

  {
    order: 10,
    sourceTable: 'Diseases',
    targetTable: 'diseases',
    query: `SELECT Disease_ID, Disease_Name, Symptoms, Treatment, No_longer_used
            FROM dbo.Diseases
            ORDER BY Disease_ID`,
    columns: [
      { source: 'Disease_ID',    target: 'id' },
      { source: 'Disease_Name',  target: 'name',      transform: trimOrNull },
      { source: 'Symptoms',      target: 'symptoms',   transform: trimOrNull },
      { source: 'Treatment',     target: 'treatment',  transform: trimOrNull },
      { source: 'No_longer_used', target: 'active',    transform: (v) => !toBool(v) },
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
                   HGP, Antibiotic, Supplier, Inactive
            FROM dbo.Drugs
            ORDER BY Drug_ID`,
    columns: [
      { source: 'Drug_ID',         target: 'id' },
      { source: 'Drug_Name',       target: 'name',          transform: trimOrNull },
      { source: 'Units',           target: 'unit',           transform: trimOrNull },
      { source: 'Cost_per_unit',   target: 'cost_per_unit',  transform: toNum },
      { source: 'WithHold_days_1', target: 'withhold_days',  transform: toNum },
      { source: 'WithHold_days_ESI', target: 'esi_days',     transform: toNum },
      { source: 'HGP',             target: 'is_hgp',         transform: toBool },
      { source: 'Antibiotic',      target: 'is_antibiotic',   transform: toBool },
      { source: 'Supplier',        target: 'supplier',        transform: trimOrNull },
      { source: 'Inactive',        target: 'active',          transform: (v) => !toBool(v) },
    ],
    validate: (row) => row.name !== null,
  },

  {
    order: 10,
    sourceTable: 'Cost_Codes',
    targetTable: 'cost_codes',
    query: `SELECT RevExp_Code, RevExp_Desc, Rev_Exp
            FROM dbo.Cost_Codes
            ORDER BY RevExp_Code`,
    columns: [
      { source: 'RevExp_Code', target: 'code' },
      { source: 'RevExp_Desc', target: 'description', transform: trimOrNull },
      { source: 'Rev_Exp',     target: 'type',        transform: mapCostType },
    ],
    validate: (row) => row.description !== null,
  },

  {
    order: 10,
    sourceTable: 'Market_Category',
    targetTable: 'market_categories',
    query: `SELECT Market_Cat_ID, Market_Category, Min_DOF, HGP_Free
            FROM dbo.Market_Category
            ORDER BY Market_Cat_ID`,
    columns: [
      { source: 'Market_Cat_ID',   target: 'id' },
      { source: 'Market_Category', target: 'name',     transform: trimOrNull },
      { source: 'Min_DOF',         target: 'min_dof',  transform: toNum },
      { source: 'HGP_Free',        target: 'hgp_free', transform: toBool },
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
                   Purchase_date, Vendor_ID, Agent_Code,
                   Number_Head, Total_Weight, Cost_of_Cattle,
                   Cattle_Freight_Cost, Lot_Notes
            FROM dbo.Purchase_Lots
            ORDER BY ID`,
    columns: [
      { source: 'Lot_Number',          target: 'lot_number',      transform: trimOrNull },
      { source: 'Purchase_date',       target: 'purchase_date',   transform: toDate },
      { source: 'Vendor_ID',           target: 'vendor_id',       transform: toFkId },
      { source: 'Agent_Code',          target: 'agent_id',        transform: toFkId },
      { source: 'Number_Head',         target: 'head_count',      transform: toNum },
      { source: 'Total_Weight',        target: 'total_weight_kg', transform: toNum },
      { source: 'Cost_of_Cattle',      target: 'total_cost',      transform: toNum },
      { source: 'Cattle_Freight_Cost', target: 'freight_cost',    transform: toNum },
      { source: 'Lot_Notes',           target: 'notes',           transform: trimOrNull },
    ],
    validate: (row) => row.lot_number !== null,
  },

  // ---- Order 30: Core cattle ----
  {
    order: 30,
    sourceTable: 'Cattle',
    targetTable: 'cows',
    query: `SELECT BeastID, Ear_Tag, EID, Breed, Sex, HGP, Died,
                   Start_Date, Start_Weight, Sale_Date, Sale_Weight,
                   DOB, Feedlot_Entry_Date, Feedlot_Entry_Wght,
                   Pen_Number, Notes, Purch_Lot_No, Date_Archived
            FROM dbo.Cattle
            ORDER BY BeastID`,
    columns: [
      { source: 'BeastID',             target: 'legacy_beast_id' },
      { source: 'Ear_Tag',             target: 'tag_number',      transform: (v) => trimOrNull(v) || 'UNKNOWN' },
      { source: 'EID',                 target: 'eid',              transform: trimOrNull },
      { source: 'Sex',                 target: 'sex',              transform: mapSex },
      { source: 'HGP',                 target: 'hgp',              transform: toBool },
      { source: 'Feedlot_Entry_Date',  target: 'entry_date',       transform: toDate },
      { source: 'Feedlot_Entry_Wght',  target: 'entry_weight_kg',  transform: toNum },
      { source: 'Sale_Date',           target: 'sale_date',         transform: (v) => { const d = toDate(v); return d && d > '1901-01-01' ? d : null; } },
      { source: 'DOB',                 target: 'dob',               transform: toDate },
      { source: 'Start_Date',           target: 'start_date',        transform: toDate },
      { source: 'Start_Weight',         target: 'start_weight_kg',   transform: toNum },
      { source: 'Sale_Weight',         target: 'sale_weight_kg',    transform: toNum },
      { source: 'Notes',               target: 'notes',             transform: trimOrNull },
      { source: 'Purch_Lot_No',        target: '_purch_lot_no',     transform: trimOrNull }, // resolved in post-processing
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
      legacy_beast_id: row.legacy_beast_id,
      tag_number:      row.tag_number,
      eid:             row.eid,
      breed:           row._breed || 'Unknown',
      sex:             row.sex,
      hgp:             row.hgp,
      status:          row._status,
      entry_date:      row.entry_date,
      entry_weight_kg: row.entry_weight_kg,
      dob:             row.dob,
      start_date:      row.start_date,
      start_weight_kg: row.start_weight_kg,
      sale_date:       row.sale_date,
      sale_weight_kg:  row.sale_weight_kg,
      notes:           row.notes,
      pen_id:          row._pen_id,
      purchase_lot_id: row._purchase_lot_id,
    }),
  },

  // ---- Order 40: Dependent event tables ----
  {
    order: 40,
    sourceTable: 'Weighing_Events',
    targetTable: 'weighing_events',
    query: `SELECT BeastID, Weighing_Type, Weigh_date, Weight, P8_Fat, Weigh_Note
            FROM dbo.Weighing_Events
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',       target: '_beast_id' },        // resolved to cow_id
      { source: 'Weighing_Type', target: 'weigh_type', transform: mapWeighType },
      { source: 'Weigh_date',    target: 'weighed_at', transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Weight',        target: 'weight_kg',  transform: toNum },
      { source: 'P8_Fat',        target: 'p8_fat',     transform: toNum },
      { source: 'Weigh_Note',    target: 'notes',      transform: trimOrNull },
    ],
    requiresLookup: 'cowIdMap',   // BeastID → cows.id
  },

  {
    order: 40,
    sourceTable: 'PensHistory',
    targetTable: 'pen_movements',
    query: `SELECT BeastID, MoveDate, Pen
            FROM dbo.PensHistory
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',  target: '_beast_id' },
      { source: 'MoveDate', target: 'moved_at', transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Pen',      target: '_pen_name', transform: trimOrNull },
    ],
    requiresLookup: 'cowIdMap',
  },

  {
    order: 40,
    sourceTable: 'Drugs_Given',
    targetTable: 'treatments',
    query: `SELECT BeastID, Drug_ID, Units_Given, Date_Given,
                   Withold_Until, SB_Rec_No, User_Initials
            FROM dbo.Drugs_Given
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',        target: '_beast_id' },
      { source: 'Drug_ID',        target: 'drug_id',         transform: toFkId },
      { source: 'Units_Given',    target: 'dose',            transform: toNum },
      { source: 'Date_Given',     target: 'administered_at', transform: (v) => toDate(v) || '1900-01-01T00:00:00.000Z' },
      { source: 'Withold_Until',  target: 'withhold_until',  transform: toDate },
      { source: 'SB_Rec_No',       target: '_sb_rec_no',      transform: toFkId },
      { source: 'User_Initials',  target: 'administered_by', transform: trimOrNull },
    ],
    requiresLookup: 'cowIdMap',
  },

  {
    order: 40,
    sourceTable: 'Costs',
    targetTable: 'costs',
    query: `SELECT BeastID, RevExp_Code, Trans_Date, Rev_Exp_per_Unit, Units, Extended_RevExp
            FROM dbo.Costs
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',       target: '_beast_id' },
      { source: 'RevExp_Code',   target: '_cost_code' },
      { source: 'Trans_Date',    target: 'trans_date',   transform: toDate },
      { source: 'Rev_Exp_per_Unit', target: '_unit_cost', transform: toNum },
      { source: 'Units',         target: 'units',        transform: (v) => toNum(v) ?? 1 },
      { source: 'Extended_RevExp', target: 'amount',     transform: toNum },
    ],
    requiresLookup: 'cowIdMap',
    validate: (row) => row.amount !== null,
    buildInsertValues: (row) => ({
      cow_id:       row.cow_id,
      cost_code_id: row.cost_code_id,
      trans_date:   row.trans_date,
      unit_cost:    row._unit_cost,
      units:        row.units,
      amount:       row.amount,
    }),
  },

  {
    order: 39,
    sourceTable: 'Sick_Beast_Records',
    targetTable: 'health_records',
    query: `SELECT Beast_ID, Ear_Tag_No, Date_Diagnosed, Disease_ID,
                   Diagnosed_By, Sick_Beast_Notes, Date_Recovered_Died, Result_Code,
                   SB_Rec_No
            FROM dbo.Sick_Beast_Records
            ORDER BY SB_Rec_No`,
    columns: [
      { source: 'Beast_ID',          target: '_beast_id' },
      { source: 'SB_Rec_No',         target: 'legacy_sb_rec_no' },
      { source: 'Date_Diagnosed',    target: 'date',        transform: toDate },
      { source: 'Disease_ID',        target: 'disease_id',  transform: toFkId },
      { source: 'Diagnosed_By',      target: 'vet_name',    transform: trimOrNull },
      { source: 'Sick_Beast_Notes',  target: 'description', transform: (v) => trimOrNull(v) || 'Sick beast record' },
      { source: 'Date_Recovered_Died', target: 'date_recovered', transform: toDate },
      { source: 'Result_Code',       target: 'result_code', transform: trimOrNull },
    ],
    requiresLookup: 'cowIdMap',
    // Fixed type since these are all treatment-type health records from the sick beast system
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
                   MSA_Index, Hump_cold, Boning_Group, Beast_Sale_Type, Boning_date
            FROM dbo.Carcase_data
            ORDER BY Beast_ID`,
    columns: [
      { source: 'Beast_ID',          target: '_beast_id' },
      { source: 'Beast_ID',          target: 'legacy_beast_id' },
      { source: 'Ear_Tag_No',        target: 'ear_tag',           transform: trimOrNull },
      { source: 'EID',               target: 'eid',               transform: trimOrNull },
      { source: 'Sold_To',           target: 'sold_to',           transform: trimOrNull },
      { source: 'Abattoir',          target: 'abattoir',          transform: trimOrNull },
      { source: 'Body_Number',       target: 'body_number',       transform: trimOrNull },
      { source: 'Kill_Date',         target: 'kill_date',         transform: toDate },
      { source: 'Carc_Wght_left',    target: 'carc_weight_left',  transform: toNum },
      { source: 'Carc_Wght_right',   target: 'carc_weight_right', transform: toNum },
      { source: 'Dress_Pcnt',        target: 'dress_pct',         transform: toNum },
      { source: 'Teeth',             target: 'teeth',             transform: toNum },
      { source: 'Grade',             target: 'grade',             transform: trimOrNull },
      { source: 'Price_$/Kg_Left',   target: 'price_per_kg_left', transform: toNum },
      { source: 'Price_$/Kg_Right',  target: 'price_per_kg_right', transform: toNum },
      { source: 'P8_fat',            target: 'p8_fat',            transform: toNum },
      { source: 'Rib_fat',           target: 'rib_fat',           transform: toNum },
      { source: 'Mscle_Score',       target: 'muscle_score',      transform: trimOrNull },
      { source: 'Eye_Mscle_Area',    target: 'eye_muscle_area',   transform: toNum },
      { source: 'PH_level',          target: 'ph_level',          transform: toNum },
      { source: 'Marbling',          target: 'marbling',          transform: toNum },
      { source: 'Fat_Colour',        target: 'fat_colour',        transform: toNum },
      { source: 'Mscle_Colour',      target: 'muscle_colour',     transform: trimOrNull },
      { source: 'Meat_Texture',      target: 'meat_texture',      transform: toNum },
      { source: 'Meat_Yield',        target: 'meat_yield',        transform: toNum },
      { source: 'Contract_No',       target: 'contract_no',       transform: trimOrNull },
      { source: 'Bruising_L',        target: 'bruising_l',        transform: trimOrNull },
      { source: 'Bruising_R',        target: 'bruising_r',        transform: trimOrNull },
      { source: '$/Kg_Deduction',    target: 'deduction_per_kg',  transform: toNum },
      { source: 'Dockage_Reason',    target: 'dockage_reason',    transform: trimOrNull },
      { source: 'Live_Weight_Shrink_Pcnt', target: 'live_weight_shrink_pct', transform: toNum },
      { source: 'Ossification',      target: 'ossification',      transform: toNum },
      { source: 'MSA_Index',         target: 'msa_index',         transform: toNum },
      { source: 'Hump_cold',         target: 'hump_cold',         transform: toNum },
      { source: 'Boning_Group',      target: 'boning_group',      transform: trimOrNull },
      { source: 'Beast_Sale_Type',   target: 'beast_sale_type',   transform: toNum },
      { source: 'Boning_date',       target: 'boning_date',       transform: toDate },
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
                   Additional_info
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
    sourceTable: 'Location_Changes',
    targetTable: 'location_changes',
    query: `SELECT BeastID, Ear_Tag, EID, Movement_Date,
                   From_location, To_Location, New_animal, Slaughtered
            FROM dbo.Location_Changes
            ORDER BY ID`,
    columns: [
      { source: 'BeastID',       target: '_beast_id' },
      { source: 'BeastID',       target: 'legacy_beast_id' },
      { source: 'Ear_Tag',       target: 'ear_tag',         transform: trimOrNull },
      { source: 'EID',           target: 'eid',             transform: trimOrNull },
      { source: 'Movement_Date', target: 'movement_date',   transform: toDate },
      { source: 'From_location', target: 'from_location',   transform: trimOrNull },
      { source: 'To_Location',   target: 'to_location',     transform: trimOrNull },
      { source: 'New_animal',    target: 'is_new_animal',   transform: toBool },
      { source: 'Slaughtered',   target: 'is_slaughtered',  transform: toBool },
    ],
    requiresLookup: 'cowIdMap',
  },

  {
    order: 50,
    sourceTable: 'Drugs_Purchased',
    targetTable: 'drug_purchases',
    query: `SELECT DrugID, Quantity_received, Purchase_Date, Batch_number, Expiry_date, Drug_cost
            FROM dbo.Drugs_Purchased
            ORDER BY ID`,
    columns: [
      { source: 'DrugID',            target: 'drug_id',       transform: toFkId },
      { source: 'Quantity_received',  target: 'quantity',      transform: toNum },
      { source: 'Purchase_Date',     target: 'purchase_date', transform: toDate },
      { source: 'Batch_number',      target: 'batch_number',  transform: trimOrNull },
      { source: 'Expiry_date',       target: 'expiry_date',   transform: toDate },
      { source: 'Drug_cost',         target: 'cost',          transform: toNum },
    ],
  },

  {
    order: 50,
    sourceTable: 'Drug_Disposal',
    targetTable: 'drug_disposals',
    query: `SELECT DrugID, Number_disposed, Date_disposed,
                   Disposal_reason, Disposal_method, Disposed_by, Notes
            FROM dbo.Drug_Disposal
            ORDER BY Disposal_ID`,
    columns: [
      { source: 'DrugID',          target: 'drug_id',          transform: toFkId },
      { source: 'Number_disposed', target: 'quantity',         transform: toNum },
      { source: 'Date_disposed',   target: 'disposal_date',   transform: toDate },
      { source: 'Disposal_reason', target: 'disposal_reason',  transform: trimOrNull },
      { source: 'Disposal_method', target: 'disposal_method',  transform: trimOrNull },
      { source: 'Disposed_by',     target: 'disposed_by',      transform: trimOrNull },
      { source: 'Notes',           target: 'notes',            transform: trimOrNull },
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
};
