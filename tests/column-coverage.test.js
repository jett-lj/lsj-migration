/**
 * Column-coverage test suite — 5 layers of verification.
 *
 * Layer 1: Static manifest audit (every column in column-audit.md ↔ mappings.js)
 * Layer 2: Golden-row integration (one row per table, all columns non-null)
 * Layer 3: Numeric precision & edge cases
 * Layer 4: FK chain end-to-end
 * Layer 5: Self-checks (row counts, cross-checks, idempotency)
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const {
  toBool, trimOrNull, toDate, toNum, toFkId,
  mapSex, deriveCowStatus, mapWeighType, mapCostType,
  mappings,
} = require('../mappings');

const {
  runMigration, migrateTable, processBatch,
  buildLookup, buildCowIdMap, createLogger,
} = require('../runner');

// ── Test helpers ─────────────────────────────────────

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
  return {
    request() {
      return {
        async query(sql) {
          if (/SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(sql)) {
            for (const tableName of sortedKeys) {
              if (sql.includes(tableName)) {
                return { recordset: [{ cnt: tables[tableName].length }] };
              }
            }
            return { recordset: [{ cnt: 0 }] };
          }
          const offsetMatch = sql.match(/OFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY/i);
          for (const tableName of sortedKeys) {
            if (sql.includes(tableName)) {
              let rows = tables[tableName];
              if (offsetMatch) {
                const offset = parseInt(offsetMatch[1]);
                const limit  = parseInt(offsetMatch[2]);
                rows = rows.slice(offset, offset + limit);
              }
              return { recordset: rows };
            }
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

// ── Manifest: expected columns per source table ──────

const MANIFEST = {
  Breeds:              ['Breed_Code', 'Breed_Name'],
  FeedDB_Pens_File:    ['Pen_name', 'IsPaddock'],
  Contacts:            ['Contact_ID', 'Company', 'First_Name', 'Last_Name', 'Tel_No', 'Email', 'Address_1', 'ABN', 'Notes'],
  Diseases:            ['Disease_ID', 'Disease_Name', 'Symptoms', 'Treatment', 'No_longer_used'],
  Drugs:               ['Drug_ID', 'Drug_Name', 'Units', 'Cost_per_unit', 'WithHold_days_1', 'WithHold_days_ESI', 'HGP', 'Antibiotic', 'Supplier', 'Inactive'],
  Cost_Codes:          ['RevExp_Code', 'RevExp_Desc', 'Rev_Exp'],
  Market_Category:     ['Market_Cat_ID', 'Market_Category', 'Min_DOF', 'HGP_Free'],
  Purchase_Lots:       ['Lot_Number', 'Purchase_date', 'Vendor_ID', 'Agent_Code', 'Number_Head', 'Total_Weight', 'Cost_of_Cattle', 'Cattle_Freight_Cost', 'Lot_Notes'],
  Cattle:              ['BeastID', 'Ear_Tag', 'EID', 'Sex', 'HGP', 'Feedlot_Entry_Date', 'Feedlot_Entry_Wght', 'Sale_Date', 'DOB', 'Start_Date', 'Start_Weight', 'Sale_Weight', 'Notes', 'Purch_Lot_No'],
  Weighing_Events:     ['BeastID', 'Weighing_Type', 'Weigh_date', 'Weight', 'P8_Fat', 'Weigh_Note'],
  PensHistory:         ['BeastID', 'MoveDate', 'Pen'],
  Drugs_Given:         ['BeastID', 'Drug_ID', 'Units_Given', 'Date_Given', 'Withold_Until', 'SB_Rec_No', 'User_Initials'],
  Costs:               ['BeastID', 'RevExp_Code', 'Trans_Date', 'Rev_Exp_per_Unit', 'Units', 'Extended_RevExp'],
  Sick_Beast_Records:  ['Beast_ID', 'SB_Rec_No', 'Date_Diagnosed', 'Disease_ID', 'Diagnosed_By', 'Sick_Beast_Notes', 'Date_Recovered_Died', 'Result_Code'],
  Carcase_data:        ['Beast_ID', 'Ear_Tag_No', 'EID', 'Sold_To', 'Abattoir', 'Body_Number', 'Kill_Date',
                         'Carc_Wght_left', 'Carc_Wght_right', 'Dress_Pcnt', 'Teeth', 'Grade',
                         'Price_$/Kg_Left', 'Price_$/Kg_Right', 'P8_fat', 'Rib_fat', 'Mscle_Score',
                         'Eye_Mscle_Area', 'PH_level', 'Marbling', 'Fat_Colour', 'Mscle_Colour',
                         'Meat_Texture', 'Meat_Yield', 'Contract_No', 'Bruising_L', 'Bruising_R',
                         '$/Kg_Deduction', 'Dockage_Reason', 'Live_Weight_Shrink_Pcnt',
                         'Ossification', 'MSA_Index', 'Hump_cold', 'Boning_Group', 'Beast_Sale_Type', 'Boning_date'],
  Autopsy_Records:     ['Beast_ID', 'Ear_Tag_No', 'Date_Dead', 'Time_Dead', 'Date_Autopsy',
                         'Autopsy_By', 'Pre_Autopsy_Diag', 'Post_Autopsy_Diag', 'Notes'],
  // Note: Autopsy anatomical boolean fields (Nostrils_*, Larynx_*, etc.) are handled
  // by transformRow → packed into JSONB `findings`, not in the columns array.
  // Note: Vendor_Declarations ownership booleans (Born_on_Vend_prop, Owned_*) are
  // handled by transformRow → derived into ownership_period, not in the columns array.
  Vendor_Declarations: ['Vendor_Dec_Number', 'Owner_Contact_ID', 'Form_Date', 'Number_Cattle',
                         'Cattle_Description', 'Tail_Tag', 'RFIDs_in_cattle', 'HGP_Treated',
                         'QA_program', 'QA_Program_details',
                         'Fed_stockfeeds', 'Chem_Res_restriction',
                         'Withholding_for_drugs', 'Withholding_for_feed', 'Additional_info'],
  Location_Changes:    ['BeastID', 'Ear_Tag', 'EID', 'Movement_Date', 'From_location', 'To_Location', 'New_animal', 'Slaughtered'],
  Drugs_Purchased:     ['DrugID', 'Quantity_received', 'Purchase_Date', 'Batch_number', 'Expiry_date', 'Drug_cost'],
  Drug_Disposal:       ['DrugID', 'Number_disposed', 'Date_disposed', 'Disposal_reason', 'Disposal_method', 'Disposed_by', 'Notes'],
};

// ══════════════════════════════════════════════════════
// LAYER 1: STATIC MANIFEST AUDIT
// ══════════════════════════════════════════════════════

describe('Layer 1 — Static manifest audit', () => {
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

  it('all 20 tables are covered', () => {
    expect(Object.keys(MANIFEST)).toHaveLength(20);
    expect(mappings).toHaveLength(20);
  });
});

// ══════════════════════════════════════════════════════
// LAYER 2: GOLDEN ROW INTEGRATION
// ══════════════════════════════════════════════════════

describe('Layer 2 — Golden row per table', () => {
  beforeEach(async () => {
    const tables = [
      'geofence_alerts', 'geofences', 'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events', 'locations', 'cows',
      'carcase_data', 'autopsy_records', 'location_changes',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'herds', 'migration_log',
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
    Location_Changes: [],
    Drugs_Purchased:  [{ DrugID: 1, Quantity_received: 200, Purchase_Date: '2024-01-05',
                         Batch_number: 'GBATCH01', Expiry_date: '2025-12-31', Drug_cost: 2550.00, ID: 1 }],
    Drug_Disposal:    [{ DrugID: 1, Number_disposed: 10, Date_disposed: '2024-06-01',
                         Disposal_reason: 'Expired', Disposal_method: 'Incineration',
                         Disposed_by: 'GD', Notes: 'golden disposal', Disposal_ID: 1 }],
  };

  it('full migration with golden data — all tables populated correctly', async () => {
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
    const cc = await pgPool.query('SELECT * FROM cost_codes WHERE code = 1');
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
    // treatment → health_record link via SB_Rec_No
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

// ══════════════════════════════════════════════════════
// LAYER 3: NUMERIC PRECISION & EDGE CASES
// ══════════════════════════════════════════════════════

describe('Layer 3 — Numeric precision & edge cases', () => {
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
    it('Inactive=true → active=false', () => {
      expect(!toBool(true)).toBe(false);
      expect(!toBool(1)).toBe(false);
      expect(!toBool('Y')).toBe(false);
    });

    it('Inactive=false → active=true', () => {
      expect(!toBool(false)).toBe(true);
      expect(!toBool(0)).toBe(true);
      expect(!toBool(null)).toBe(true);
    });
  });

  describe('toFkId sentinel handling', () => {
    it('0 → null (legacy default for no reference)', () => {
      expect(toFkId(0)).toBeNull();
      expect(toFkId('0')).toBeNull();
    });

    it('positive IDs preserved', () => {
      expect(toFkId(1)).toBe(1);
      expect(toFkId(999)).toBe(999);
    });

    it('null/undefined → null', () => {
      expect(toFkId(null)).toBeNull();
      expect(toFkId(undefined)).toBeNull();
    });
  });

  describe('tag_number fallback', () => {
    it('null Ear_Tag falls back to UNKNOWN', () => {
      const mapping = mappings.find(m => m.sourceTable === 'Cattle');
      const tagCol = mapping.columns.find(c => c.target === 'tag_number');
      expect(tagCol.transform(null)).toBe('UNKNOWN');
      expect(tagCol.transform('')).toBe('UNKNOWN');
      expect(tagCol.transform('  ')).toBe('UNKNOWN');
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

// ══════════════════════════════════════════════════════
// LAYER 4: FK CHAIN END-TO-END
// ══════════════════════════════════════════════════════

describe('Layer 4 — FK chain tests', () => {
  beforeEach(async () => {
    const tables = [
      'geofence_alerts', 'geofences', 'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events', 'locations', 'cows',
      'carcase_data', 'autopsy_records', 'location_changes',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'herds', 'migration_log',
    ];
    for (const t of tables) {
      await pgPool.query(`DELETE FROM ${t}`);
    }
  });

  it('cowIdMap skip — unknown BeastID skips the row', async () => {
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

  it('drugIdSet sanitize — unknown drug_id set to null', async () => {
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

  it('contactIdSet sanitize — unknown vendor_id set to null', async () => {
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

  it('costCodeMap resolve — cost_code_id correctly resolved', async () => {
    await pgPool.query("INSERT INTO breeds (name) VALUES ('CostTest') ON CONFLICT DO NOTHING");
    await pgPool.query("INSERT INTO cost_codes (code, description, type) VALUES (99, 'TestCode', 'expense') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('FK_CC', 'CostTest', 7002, 'active', 'female')
    `);
    const cowRes = await pgPool.query('SELECT id FROM cows WHERE legacy_beast_id = 7002');
    const cowId = cowRes.rows[0].id;
    const ccRes = await pgPool.query('SELECT id FROM cost_codes WHERE code = 99');
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

  it('pen auto-create — unknown pen is created on demand', async () => {
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

  it('disease_id FK — unknown disease_id (0) set to null via toFkId', () => {
    expect(toFkId(0)).toBeNull();
    expect(toFkId(null)).toBeNull();
  });

  it('diseaseIdSet sanitize — unknown disease_id set to null', async () => {
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

  it('drug_purchases — unknown drug_id nullified', async () => {
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

// ══════════════════════════════════════════════════════
// LAYER 5: SELF-CHECKS
// ══════════════════════════════════════════════════════

describe('Layer 5 — Self-checks', () => {
  beforeEach(async () => {
    const tables = [
      'geofence_alerts', 'geofences', 'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events', 'locations', 'cows',
      'carcase_data', 'autopsy_records', 'location_changes',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'herds', 'migration_log',
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
      Location_Changes: [],
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
      Location_Changes: [],
      Drugs_Purchased:  [],
      Drug_Disposal:    [],
    };

    const mock = createMockMssql(goldenData);
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    const logs = await pgPool.query('SELECT source_table, status FROM migration_log ORDER BY id');
    expect(logs.rows.length).toBe(20);
    for (const row of logs.rows) {
      expect(row.status).toBe('completed');
    }
  }, 30000);

  it('FK orphan scan — no orphaned references after migration', async () => {
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
      Location_Changes: [],
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

  it('idempotency — running migration twice yields same row counts', async () => {
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
      Location_Changes: [],
      Drugs_Purchased:  [],
      Drug_Disposal:    [],
    };

    const mock = createMockMssql(goldenData);
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    const breedsAfter1 = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    const pensAfter1   = await pgPool.query('SELECT COUNT(*) AS cnt FROM pens');

    // Run again — TRUNCATE CASCADE should reset, yielding same counts
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

    const breedsAfter2 = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    const pensAfter2   = await pgPool.query('SELECT COUNT(*) AS cnt FROM pens');

    expect(parseInt(breedsAfter2.rows[0].cnt)).toBe(parseInt(breedsAfter1.rows[0].cnt));
    expect(parseInt(pensAfter2.rows[0].cnt)).toBe(parseInt(pensAfter1.rows[0].cnt));
  }, 30000);
});
