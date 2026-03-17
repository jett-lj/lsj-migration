/**
 * Comprehensive tests for the legacy CATTLE → PostgreSQL migration system.
 *
 * Test suites:
 *   1. Transform helpers (unit tests — no DB required)
 *   2. Mapping definitions (structural validation)
 *   3. Migration runner (integration tests with real PostgreSQL + mock SQL Server)
 *   4. Validation checks
 *   5. Config & connections
 *   6. Edge cases & security
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Modules under test
const {
  toBool, trimOrNull, toDate, toNum,
  mapSex, deriveCowStatus, mapWeighType, mapCostType,
  mappings,
} = require('../mappings');

const {
  runMigration, migrateTable, processBatch,
  validateMigration, preFlightAudit, migrateRawTables, reconciliationReport,
  buildLookup, buildCowIdMap, createLogger,
} = require('../runner');

const { getMssqlConfig, getMigrationOptions } = require('../config');
const { TABLE_CATEGORIES, getTableCategory, getCategorySummary } = require('../categories');

// ── Test DB setup ────────────────────────────────────

const TEST_DB = 'lsj_migration_test';
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
});

afterAll(async () => {
  if (pgPool) await pgPool.end();
  const admin = adminPool();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  } finally {
    await admin.end();
  }
});

// ── Mock SQL Server pool ─────────────────────────────
// Creates a mock that behaves like mssql's ConnectionPool
// so we can test migration logic without a real SQL Server.

function createMockMssql(tables) {
  // Sort keys longest-first so 'Drugs_Given' matches before 'Drugs'
  const sortedKeys = Object.keys(tables).sort((a, b) => b.length - a.length);
  return {
    request() {
      return {
        async query(sql) {
          // Handle COUNT(*) queries (used by pagination for progress reporting)
          if (/SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(sql)) {
            for (const tableName of sortedKeys) {
              if (sql.includes(tableName)) {
                return { recordset: [{ cnt: tables[tableName].length }] };
              }
            }
            return { recordset: [{ cnt: 0 }] };
          }

          // Handle TOP N queries (used by raw table empty-check probe)
          const topMatch = sql.match(/SELECT\s+TOP\s+(\d+)/i);

          // Handle OFFSET/FETCH pagination queries
          const offsetMatch = sql.match(/OFFSET\s+(\d+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+)\s+ROWS\s+ONLY/i);

          for (const tableName of sortedKeys) {
            if (sql.includes(tableName)) {
              let rows = tables[tableName];
              if (offsetMatch) {
                const offset = parseInt(offsetMatch[1]);
                const limit = parseInt(offsetMatch[2]);
                rows = rows.slice(offset, offset + limit);
              } else if (topMatch) {
                rows = rows.slice(0, parseInt(topMatch[1]));
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

// ══════════════════════════════════════════════════════
// 1. TRANSFORM HELPER TESTS
// ══════════════════════════════════════════════════════

describe('Transform helpers', () => {
  describe('toBool', () => {
    it('converts truthy values correctly', () => {
      expect(toBool(true)).toBe(true);
      expect(toBool(1)).toBe(true);
      expect(toBool('1')).toBe(true);
      expect(toBool('Y')).toBe(true);
      expect(toBool('y')).toBe(true);
      expect(toBool('TRUE')).toBe(true);
    });

    it('converts falsy values correctly', () => {
      expect(toBool(false)).toBe(false);
      expect(toBool(0)).toBe(false);
      expect(toBool(null)).toBe(false);
      expect(toBool(undefined)).toBe(false);
      expect(toBool('0')).toBe(false);
      expect(toBool('N')).toBe(false);
      expect(toBool('')).toBe(false);
    });
  });

  describe('trimOrNull', () => {
    it('trims whitespace', () => {
      expect(trimOrNull('  hello  ')).toBe('hello');
    });

    it('returns null for empty strings', () => {
      expect(trimOrNull('')).toBe(null);
      expect(trimOrNull('   ')).toBe(null);
    });

    it('returns null for null/undefined', () => {
      expect(trimOrNull(null)).toBe(null);
      expect(trimOrNull(undefined)).toBe(null);
    });

    it('converts numbers to strings', () => {
      expect(trimOrNull(42)).toBe('42');
    });
  });

  describe('toDate', () => {
    it('converts valid dates to ISO strings', () => {
      const result = toDate('2024-06-15T10:30:00');
      expect(result).toContain('2024-06-15');
    });

    it('returns null for invalid dates', () => {
      expect(toDate(null)).toBe(null);
      expect(toDate('')).toBe(null);
      expect(toDate('not-a-date')).toBe(null);
    });
  });

  describe('toNum', () => {
    it('parses valid numbers', () => {
      expect(toNum(42)).toBe(42);
      expect(toNum('3.14')).toBeCloseTo(3.14);
      expect(toNum(0)).toBe(0);
    });

    it('returns null for non-numbers', () => {
      expect(toNum(null)).toBe(null);
      expect(toNum(undefined)).toBe(null);
      expect(toNum('abc')).toBe(null);
    });
  });

  describe('mapSex', () => {
    it('maps steer/bull/male codes to male', () => {
      expect(mapSex('S')).toBe('male');
      expect(mapSex('B')).toBe('male');
      expect(mapSex('M')).toBe('male');
      expect(mapSex('s')).toBe('male');
    });

    it('maps other values to female', () => {
      expect(mapSex('H')).toBe('female');
      expect(mapSex('C')).toBe('female');
      expect(mapSex('F')).toBe('female');
      expect(mapSex(null)).toBe('female');
      expect(mapSex('')).toBe('female');
    });
  });

  describe('deriveCowStatus', () => {
    it('returns died when Died flag is set', () => {
      expect(deriveCowStatus({ Died: true, Sale_Date: null, Date_Archived: null })).toBe('died');
      expect(deriveCowStatus({ Died: 1, Sale_Date: new Date(), Date_Archived: null })).toBe('died');
    });

    it('returns sold when Sale_Date is present', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: new Date(), Date_Archived: null })).toBe('sold');
    });

    it('returns active when Sale_Date is sentinel 1900-01-01', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: new Date('1900-01-01'), Date_Archived: null })).toBe('active');
    });

    it('returns archived when Date_Archived is present', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: null, Date_Archived: new Date() })).toBe('archived');
    });

    it('returns active when Date_Archived is sentinel 1900-01-01', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: null, Date_Archived: new Date('1900-01-01') })).toBe('active');
    });

    it('returns active by default', () => {
      expect(deriveCowStatus({ Died: false, Sale_Date: null, Date_Archived: null })).toBe('active');
    });
  });

  describe('mapWeighType', () => {
    it('maps legacy codes to new enum values', () => {
      expect(mapWeighType(1)).toBe('intake');
      expect(mapWeighType(3)).toBe('exit');
      expect(mapWeighType(4)).toBe('sale');
      expect(mapWeighType(2)).toBe('interim');
      expect(mapWeighType(99)).toBe('interim');
      expect(mapWeighType(null)).toBe('interim');
    });
  });

  describe('mapCostType', () => {
    it('maps R to revenue, everything else to expense', () => {
      expect(mapCostType('R')).toBe('revenue');
      expect(mapCostType('r')).toBe('revenue');
      expect(mapCostType('E')).toBe('expense');
      expect(mapCostType(null)).toBe('expense');
    });
  });
});

// ══════════════════════════════════════════════════════
// 2. MAPPING DEFINITION TESTS
// ══════════════════════════════════════════════════════

describe('Mapping definitions', () => {
  it('all mappings have required fields', () => {
    for (const m of mappings) {
      expect(m).toHaveProperty('sourceTable');
      expect(m).toHaveProperty('targetTable');
      expect(m).toHaveProperty('query');
      expect(m).toHaveProperty('columns');
      expect(m).toHaveProperty('order');
      expect(typeof m.sourceTable).toBe('string');
      expect(typeof m.targetTable).toBe('string');
      expect(typeof m.query).toBe('string');
      expect(Array.isArray(m.columns)).toBe(true);
      expect(typeof m.order).toBe('number');
    }
  });

  it('all columns have source and target', () => {
    for (const m of mappings) {
      for (const col of m.columns) {
        expect(col).toHaveProperty('source');
        expect(col).toHaveProperty('target');
        expect(typeof col.source).toBe('string');
        expect(typeof col.target).toBe('string');
      }
    }
  });

  it('mappings are sorted by order', () => {
    for (let i = 1; i < mappings.length; i++) {
      expect(mappings[i].order).toBeGreaterThanOrEqual(mappings[i - 1].order);
    }
  });

  it('lookup tables come before dependent tables', () => {
    const order = {};
    for (const m of mappings) {
      order[m.sourceTable] = m.order;
    }
    // Breeds, Pens, Contacts must come before Cattle
    expect(order['Breeds']).toBeLessThan(order['Cattle']);
    expect(order['FeedDB_Pens_File']).toBeLessThan(order['Cattle']);
    expect(order['Contacts']).toBeLessThan(order['Cattle']);
    // Cattle must come before event tables
    expect(order['Cattle']).toBeLessThan(order['Weighing_Events']);
    expect(order['Cattle']).toBeLessThan(order['Drugs_Given']);
    expect(order['Cattle']).toBeLessThan(order['PensHistory']);
  });

  it('queries do not contain dangerous SQL', () => {
    const dangerous = /\b(DROP|DELETE|UPDATE|ALTER|TRUNCATE|EXEC|EXECUTE|xp_|sp_)\b/i;
    for (const m of mappings) {
      expect(m.query).not.toMatch(dangerous);
    }
  });

  it('target tables match schema tables', () => {
    const schema = fs.readFileSync(FARM_SCHEMA, 'utf8');
    for (const m of mappings) {
      // Check that the target table exists in the schema
      const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS ${m.targetTable}\\b`, 'i');
      expect(schema).toMatch(pattern);
    }
  });
});

// ══════════════════════════════════════════════════════
// 3. INTEGRATION TESTS (mock SQL Server + real PostgreSQL)
// ══════════════════════════════════════════════════════

describe('Migration runner — integration', () => {
  beforeEach(async () => {
    // Clean all data tables before each test
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

  describe('Breeds migration', () => {
    it('migrates breeds correctly', async () => {
      const mock = createMockMssql({
        'Breeds': [
          { Breed_Code: 1, Breed_Name: 'Angus' },
          { Breed_Code: 2, Breed_Name: 'Hereford' },
          { Breed_Code: 3, Breed_Name: '  Brahman  ' },
        ],
      });

      const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
      const result = await migrateTable(mock, pgPool, breedMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.status).toBe('completed');
      expect(result.rowsRead).toBe(3);
      expect(result.rowsWritten).toBe(3);

      // Verify data
      const res = await pgPool.query('SELECT * FROM breeds ORDER BY id');
      expect(res.rows).toHaveLength(3);
      expect(res.rows[0].name).toBe('Angus');
      expect(res.rows[2].name).toBe('Brahman'); // trimmed
    });

    it('skips breeds with null names', async () => {
      const mock = createMockMssql({
        'Breeds': [
          { Breed_Code: 1, Breed_Name: 'Angus' },
          { Breed_Code: 2, Breed_Name: null },
          { Breed_Code: 3, Breed_Name: '   ' },
        ],
      });

      const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
      const result = await migrateTable(mock, pgPool, breedMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(1);
      expect(result.rowsSkipped).toBe(2);
    });
  });

  describe('Pens migration', () => {
    it('migrates pens with paddock flag', async () => {
      const mock = createMockMssql({
        'FeedDB_Pens_File': [
          { Pen_name: 'P01', IsPaddock: 'N' },
          { Pen_name: 'Paddock A', IsPaddock: 'Y' },
        ],
      });

      const penMapping = mappings.find(m => m.sourceTable === 'FeedDB_Pens_File');
      const result = await migrateTable(mock, pgPool, penMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(2);

      const res = await pgPool.query('SELECT * FROM pens ORDER BY name');
      expect(res.rows[0].name).toBe('P01');
      expect(res.rows[0].is_paddock).toBe(false);
      expect(res.rows[1].name).toBe('Paddock A');
      expect(res.rows[1].is_paddock).toBe(true);
    });
  });

  describe('Diseases migration', () => {
    it('migrates diseases with active flag inverted', async () => {
      const mock = createMockMssql({
        'Diseases': [
          { Disease_ID: 1, Disease_Name: 'BRD', Symptoms: 'cough', Treatment: 'antibiotics', No_longer_used: false },
          { Disease_ID: 2, Disease_Name: 'Pinkeye', Symptoms: null, Treatment: null, No_longer_used: true },
        ],
      });

      const diseaseMapping = mappings.find(m => m.sourceTable === 'Diseases');
      const result = await migrateTable(mock, pgPool, diseaseMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(2);

      const res = await pgPool.query('SELECT * FROM diseases ORDER BY id');
      expect(res.rows[0].active).toBe(true);
      expect(res.rows[1].active).toBe(false);
    });
  });

  describe('Drugs migration', () => {
    it('migrates drugs with boolean fields', async () => {
      const mock = createMockMssql({
        'Drugs': [
          {
            Drug_ID: 1, Drug_Name: 'Draxxin', Units: 'mL', Cost_per_unit: 5.50,
            WithHold_days_1: 30, WithHold_days_ESI: 42, HGP: 'N', Antibiotic: 'Y',
            Supplier: 'Zoetis', Inactive: false,
          },
        ],
      });

      const drugMapping = mappings.find(m => m.sourceTable === 'Drugs');
      const result = await migrateTable(mock, pgPool, drugMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(1);

      const res = await pgPool.query('SELECT * FROM drugs WHERE id = 1');
      expect(res.rows[0].name).toBe('Draxxin');
      expect(res.rows[0].is_antibiotic).toBe(true);
      expect(res.rows[0].is_hgp).toBe(false);
      expect(res.rows[0].withhold_days).toBe(30);
      expect(res.rows[0].esi_days).toBe(42);
    });
  });

  describe('Contacts migration', () => {
    it('migrates contacts with trimmed fields', async () => {
      const mock = createMockMssql({
        'Contacts': [
          {
            Contact_ID: 1, Company: '  Smith Cattle Co  ', Last_Name: 'Smith',
            First_Name: 'John', Tel_No: '0412345678', Email: 'john@test.com',
            Address_1: '123 Farm Rd', ABN: '123456789', Notes: null,
          },
        ],
      });

      const contactMapping = mappings.find(m => m.sourceTable === 'Contacts');
      const result = await migrateTable(mock, pgPool, contactMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(1);

      const res = await pgPool.query('SELECT * FROM contacts WHERE id = 1');
      expect(res.rows[0].company).toBe('Smith Cattle Co');
    });
  });

  describe('Full migration flow', () => {
    it('migrates lookup → cattle → events in correct order', async () => {
      const mock = createMockMssql({
        'Breeds': [
          { Breed_Code: 1, Breed_Name: 'Angus' },
        ],
        'FeedDB_Pens_File': [
          { Pen_name: 'P01', IsPaddock: 'N' },
        ],
        'Contacts': [
          { Contact_ID: 1, Company: 'Vendor Co', Last_Name: 'V', First_Name: 'A',
            Tel_No: null, Email: null, Address_1: null, ABN: null, Notes: null },
        ],
        'Diseases': [
          { Disease_ID: 1, Disease_Name: 'BRD', Symptoms: null, Treatment: null, No_longer_used: false },
        ],
        'Drugs': [
          { Drug_ID: 1, Drug_Name: 'Draxxin', Units: 'mL', Cost_per_unit: 5,
            WithHold_days_1: 30, WithHold_days_ESI: 42, HGP: 'N', Antibiotic: 'Y',
            Supplier: null, Inactive: false },
        ],
        'Cost_Codes': [
          { RevExp_Code: 1, RevExp_Desc: 'Feed', Rev_Exp: 'E' },
        ],
        'Market_Category': [
          { Market_Cat_ID: 1, Market_Category: 'Grain-fed', Min_DOF: 100, HGP_Free: false },
        ],
        'Purchase_Lots': [
          { Lot_Number: 'L001', Purchase_date: '2024-01-15', Vendor_ID: 1, Agent_Code: null,
            Number_Head: 50, Total_Weight: 25000, Cost_of_Cattle: 50000,
            Cattle_Freight_Cost: 2000, Lot_Notes: null, ID: 1 },
        ],
        'Cattle': [
          { BeastID: 100, Ear_Tag: 'A001', EID: 'EID001', Breed: 1, Sex: 'S', HGP: false,
            Died: false, Start_Date: '2024-01-15', Start_Weight: 300,
            Sale_Date: null, Sale_Weight: null, DOB: '2022-03-01',
            Feedlot_Entry_Date: '2024-01-15', Feedlot_Entry_Wght: 300,
            Pen_Number: 'P01', Notes: 'test', Purch_Lot_No: 'L001', Date_Archived: null },
        ],
        'Weighing_Events': [
          { BeastID: 100, Weighing_Type: 1, Weigh_date: '2024-01-15', Weight: 300,
            P8_Fat: 5, Weigh_Note: 'intake', ID: 1 },
          { BeastID: 100, Weighing_Type: 2, Weigh_date: '2024-03-15', Weight: 380,
            P8_Fat: 8, Weigh_Note: 'interim', ID: 2 },
        ],
        'PensHistory': [
          { BeastID: 100, MoveDate: '2024-01-15', Pen: 'P01', ID: 1 },
        ],
        'Drugs_Given': [
          { BeastID: 100, Drug_ID: 1, Units_Given: 2.5, Date_Given: '2024-01-16',
            Withold_Until: '2024-02-15', SB_Rec_No: 1, User_Initials: 'JB', ID: 1 },
        ],
        'Costs': [
          { BeastID: 100, RevExp_Code: 1, Trans_Date: '2024-01-15',
            Rev_Exp_per_Unit: 2.5, Units: 100, Extended_RevExp: 250, ID: 1 },
        ],
        'Sick_Beast_Records': [
          { Beast_ID: 100, Ear_Tag_No: 'A001', Date_Diagnosed: '2024-02-01',
            Disease_ID: 1, Diagnosed_By: 'Dr Smith', Sick_Beast_Notes: 'Coughing',
            Date_Recovered_Died: '2024-02-10', Result_Code: 1, SB_Rec_No: 1 },
        ],
        'Carcase_data': [],
        'Autopsy_Records': [],
        'Vendor_Declarations': [],
        'Location_Changes': [],
        'Drugs_Purchased': [],
        'Drug_Disposal': [],
      });

      const { results } = await runMigration(mock, pgPool, {
        batchSize: 100,
        logLevel: 'error',
        dryRun: false,
      });

      // All tables should complete
      for (const r of results) {
        expect(r.status).toBe('completed');
      }

      // Verify key data made it through
      const cows = await pgPool.query('SELECT * FROM cows');
      expect(cows.rows).toHaveLength(1);
      expect(cows.rows[0].tag_number).toBe('A001');
      expect(cows.rows[0].eid).toBe('EID001');
      expect(cows.rows[0].sex).toBe('male');
      expect(cows.rows[0].status).toBe('active');
      expect(cows.rows[0].legacy_beast_id).toBe(100);

      const weights = await pgPool.query('SELECT * FROM weighing_events ORDER BY weighed_at');
      expect(weights.rows).toHaveLength(2);
      expect(weights.rows[0].weigh_type).toBe('intake');
      expect(weights.rows[0].weight_kg).toBe(300);

      const healthRecs = await pgPool.query('SELECT * FROM health_records');
      expect(healthRecs.rows).toHaveLength(1);
      expect(healthRecs.rows[0].type).toBe('treatment');
      expect(healthRecs.rows[0].description).toBe('Coughing');

      const treatments = await pgPool.query('SELECT * FROM treatments');
      expect(treatments.rows.length).toBeGreaterThanOrEqual(1);
      if (treatments.rows.length > 0) {
        expect(treatments.rows[0].dose).toBe(2.5);
        // treatment → health_record link via SB_Rec_No
        expect(treatments.rows[0].health_record_id).toBe(healthRecs.rows[0].id);
      }

      const movements = await pgPool.query('SELECT * FROM pen_movements');
      expect(movements.rows).toHaveLength(1);
    });

    it('handles dead cattle status correctly', async () => {
      const mock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
        'FeedDB_Pens_File': [],
        'Contacts': [],
        'Diseases': [],
        'Drugs': [],
        'Cost_Codes': [],
        'Market_Category': [],
        'Purchase_Lots': [],
        'Cattle': [
          { BeastID: 200, Ear_Tag: 'D001', EID: null, Breed: 1, Sex: 'H', HGP: false,
            Died: true, Start_Date: null, Start_Weight: null,
            Sale_Date: null, Sale_Weight: null, DOB: null,
            Feedlot_Entry_Date: null, Feedlot_Entry_Wght: null,
            Pen_Number: null, Notes: 'found dead', Purch_Lot_No: null, Date_Archived: null },
        ],
        'Weighing_Events': [],
        'PensHistory': [],
        'Drugs_Given': [],
        'Costs': [],
        'Sick_Beast_Records': [],
        'Carcase_data': [],
        'Autopsy_Records': [],
        'Vendor_Declarations': [],
        'Location_Changes': [],
        'Drugs_Purchased': [],
        'Drug_Disposal': [],
      });

      await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

      const res = await pgPool.query("SELECT * FROM cows WHERE tag_number = 'D001'");
      expect(res.rows[0].status).toBe('died');
      expect(res.rows[0].sex).toBe('female');
    });

    it('handles sold cattle status correctly', async () => {
      const mock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Hereford' }],
        'FeedDB_Pens_File': [],
        'Contacts': [],
        'Diseases': [],
        'Drugs': [],
        'Cost_Codes': [],
        'Market_Category': [],
        'Purchase_Lots': [],
        'Cattle': [
          { BeastID: 300, Ear_Tag: 'S001', EID: 'EID300', Breed: 1, Sex: 'S', HGP: true,
            Died: false, Start_Date: '2024-01-01', Start_Weight: 350,
            Sale_Date: '2024-06-01', Sale_Weight: 550, DOB: '2022-01-01',
            Feedlot_Entry_Date: '2024-01-01', Feedlot_Entry_Wght: 350,
            Pen_Number: null, Notes: null, Purch_Lot_No: null, Date_Archived: null },
        ],
        'Weighing_Events': [],
        'PensHistory': [],
        'Drugs_Given': [],
        'Costs': [],
        'Sick_Beast_Records': [],
        'Carcase_data': [],
        'Autopsy_Records': [],
        'Vendor_Declarations': [],
        'Location_Changes': [],
        'Drugs_Purchased': [],
        'Drug_Disposal': [],
      });

      await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error' });

      const res = await pgPool.query("SELECT * FROM cows WHERE tag_number = 'S001'");
      expect(res.rows[0].status).toBe('sold');
      expect(res.rows[0].hgp).toBe(true);
      expect(res.rows[0].sale_weight_kg).toBe(550);
    });
  });

  describe('Dry run mode', () => {
    it('does not write data in dry-run', async () => {
      const mock = createMockMssql({
        'Breeds': [
          { Breed_Code: 1, Breed_Name: 'Angus' },
          { Breed_Code: 2, Breed_Name: 'Hereford' },
        ],
      });

      const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
      const result = await migrateTable(mock, pgPool, breedMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: true, lookups: {},
      });

      expect(result.rowsRead).toBe(2);
      expect(result.rowsWritten).toBe(2); // counts what would be written

      // But nothing actually in the DB
      const res = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
      expect(parseInt(res.rows[0].cnt)).toBe(0);
    });
  });

  describe('Batch processing', () => {
    it('handles large datasets in batches', async () => {
      // Create 150 breeds to test batching with batch size 50
      const breeds = [];
      for (let i = 1; i <= 150; i++) {
        breeds.push({ Breed_Code: i, Breed_Name: `Breed_${i}` });
      }

      const mock = createMockMssql({ 'Breeds': breeds });
      const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
      const result = await migrateTable(mock, pgPool, breedMapping, {
        batchSize: 50, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsRead).toBe(150);
      expect(result.rowsWritten).toBe(150);

      const res = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
      expect(parseInt(res.rows[0].cnt)).toBe(150);
    });
  });

  describe('Selective table migration', () => {
    it('migrates only requested tables', async () => {
      const mock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
        'Diseases': [{ Disease_ID: 1, Disease_Name: 'BRD', Symptoms: null, Treatment: null, No_longer_used: false }],
      });

      const { results } = await runMigration(mock, pgPool, {
        batchSize: 100,
        logLevel: 'error',
        tables: ['Breeds'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].table).toBe('Breeds');

      const breeds = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
      expect(parseInt(breeds.rows[0].cnt)).toBe(1);

      const diseases = await pgPool.query('SELECT COUNT(*) AS cnt FROM diseases');
      expect(parseInt(diseases.rows[0].cnt)).toBe(0);
    });

    it('does not truncate unrelated tables during selective migration', async () => {
      // Seed diseases first via full migration
      const seedMock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
        'FeedDB_Pens_File': [],
        'Contacts': [],
        'Diseases': [{ Disease_ID: 1, Disease_Name: 'BRD', Symptoms: null, Treatment: null, No_longer_used: false }],
        'Drugs': [],
        'Cost_Codes': [],
        'Market_Category': [],
        'Purchase_Lots': [],
        'Cattle': [],
        'Weighing_Events': [],
        'PensHistory': [],
        'Drugs_Given': [],
        'Costs': [],
        'Sick_Beast_Records': [],
        'Carcase_data': [],
        'Autopsy_Records': [],
        'Vendor_Declarations': [],
        'Location_Changes': [],
        'Drugs_Purchased': [],
        'Drug_Disposal': [],
      });
      await runMigration(seedMock, pgPool, { batchSize: 100, logLevel: 'error' });

      // Now run selective migration for breeds only
      const selectiveMock = createMockMssql({
        'Breeds': [{ Breed_Code: 2, Breed_Name: 'Hereford' }],
      });
      await runMigration(selectiveMock, pgPool, {
        batchSize: 100,
        logLevel: 'error',
        tables: ['Breeds'],
      });

      // Diseases should still have data (not truncated)
      const diseases = await pgPool.query('SELECT COUNT(*) AS cnt FROM diseases');
      expect(parseInt(diseases.rows[0].cnt)).toBe(1);
    });
  });

  describe('Migration logging', () => {
    it('writes migration_log entries', async () => {
      const mock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      });

      const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
      await migrateTable(mock, pgPool, breedMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      const res = await pgPool.query("SELECT * FROM migration_log WHERE source_table = 'Breeds'");
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].status).toBe('completed');
      expect(res.rows[0].rows_read).toBe(1);
      expect(res.rows[0].rows_written).toBe(1);
      expect(res.rows[0].completed_at).not.toBeNull();
    });
  });

  describe('Orphan handling', () => {
    it('skips weighing events for unknown BeastIDs', async () => {
      const mock = createMockMssql({
        'Weighing_Events': [
          { BeastID: 9999, Weighing_Type: 1, Weigh_date: '2024-01-01', Weight: 300,
            P8_Fat: 5, Weigh_Note: 'orphan', ID: 1 },
        ],
      });

      const weighMapping = mappings.find(m => m.sourceTable === 'Weighing_Events');
      const result = await migrateTable(mock, pgPool, weighMapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { cowIdMap: {} }, // empty map = no cattle migrated
      });

      expect(result.rowsRead).toBe(1);
      expect(result.rowsSkipped).toBe(1);
      expect(result.rowsWritten).toBe(0);
    });
  });

  describe('Idempotency', () => {
    it('ON CONFLICT DO NOTHING prevents duplicate inserts', async () => {
      const mock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      });

      const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
      const logOpts = { batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {} };

      // Run twice
      await migrateTable(mock, pgPool, breedMapping, logOpts);
      await migrateTable(mock, pgPool, breedMapping, logOpts);

      const res = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
      // Should still be 1, not 2
      expect(parseInt(res.rows[0].cnt)).toBe(1);
    });
  });

  describe('Costs migration', () => {
    it('migrates cost_codes with correct revenue/expense type', async () => {
      const mock = createMockMssql({
        'Cost_Codes': [
          { RevExp_Code: 1, RevExp_Desc: 'Feed',         Rev_Exp: 'E' },
          { RevExp_Code: 2, RevExp_Desc: 'Sale Revenue', Rev_Exp: 'R' },
          { RevExp_Code: 3, RevExp_Desc: 'Vet',          Rev_Exp: 'e' },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Cost_Codes');
      const result = await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(3);
      const rows = await pgPool.query('SELECT code, type FROM cost_codes ORDER BY code');
      expect(rows.rows[0]).toMatchObject({ code: 1, type: 'expense' });
      expect(rows.rows[1]).toMatchObject({ code: 2, type: 'revenue' });
      expect(rows.rows[2]).toMatchObject({ code: 3, type: 'expense' });
    });

    it('resolves cost_code_id when migrating costs rows', async () => {
      const mock = createMockMssql({
        'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
        'FeedDB_Pens_File': [],
        'Contacts': [],
        'Diseases': [],
        'Drugs': [],
        'Cost_Codes': [
          { RevExp_Code: 10, RevExp_Desc: 'Feed', Rev_Exp: 'E' },
        ],
        'Market_Category': [],
        'Purchase_Lots': [],
        'Cattle': [
          { BeastID: 501, Ear_Tag: 'COST001', EID: null, Breed: 1, Sex: 'S', HGP: false,
            Died: false, Start_Date: null, Start_Weight: null,
            Sale_Date: null, Sale_Weight: null, DOB: null,
            Feedlot_Entry_Date: '2024-01-01', Feedlot_Entry_Wght: 300,
            Pen_Number: null, Notes: null, Purch_Lot_No: null, Date_Archived: null },
        ],
        'Weighing_Events': [],
        'PensHistory': [],
        'Drugs_Given': [],
        'Costs': [
          { BeastID: 501, RevExp_Code: 10, Trans_Date: '2024-02-01',
            Rev_Exp_per_Unit: 5.00, Units: 50, Extended_RevExp: 250.00, ID: 1 },
        ],
        'Sick_Beast_Records': [],
        'Carcase_data': [],
        'Autopsy_Records': [],
        'Vendor_Declarations': [],
        'Location_Changes': [],
        'Drugs_Purchased': [],
        'Drug_Disposal': [],
      });

      await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error', dryRun: false });

      const costs = await pgPool.query('SELECT * FROM costs');
      expect(costs.rows).toHaveLength(1);
      expect(costs.rows[0].amount).toBe(250);
      expect(costs.rows[0].units).toBe(50);

      // cost_code_id must be resolved — never null
      const ccRes = await pgPool.query('SELECT id FROM cost_codes WHERE code = 10');
      expect(costs.rows[0].cost_code_id).toBe(ccRes.rows[0].id);
    });

    it('skips costs rows with null amount', async () => {
      const cowRes = await pgPool.query('SELECT id, legacy_beast_id FROM cows LIMIT 1');
      if (cowRes.rows.length === 0) {
        // Seed a minimal cow so the test can run standalone
        await pgPool.query("INSERT INTO breeds (name) VALUES ('Test') ON CONFLICT DO NOTHING");
        await pgPool.query(`
          INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
          VALUES ('NULL_AMT', 'Test', 88001, 'active', 'female')
        `);
      }
      const cow = (await pgPool.query('SELECT id, legacy_beast_id FROM cows WHERE legacy_beast_id = 88001')).rows[0]
                || (await pgPool.query('SELECT id, legacy_beast_id FROM cows LIMIT 1')).rows[0];

      const mock = createMockMssql({
        'Costs': [
          { BeastID: cow.legacy_beast_id, RevExp_Code: 99, Trans_Date: '2024-01-01',
            Rev_Exp_per_Unit: null, Units: 1, Extended_RevExp: null, ID: 99 },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Costs');
      const result = await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { cowIdMap: { [cow.legacy_beast_id]: cow.id } },
      });

      expect(result.rowsSkipped).toBe(1);
      expect(result.rowsWritten).toBe(0);
    });

    it('skips costs rows when cow_id cannot be resolved', async () => {
      const mock = createMockMssql({
        'Costs': [
          { BeastID: 99999, RevExp_Code: 1, Trans_Date: '2024-01-15',
            Rev_Exp_per_Unit: 10, Units: 5, Extended_RevExp: 50, ID: 77 },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Costs');
      const result = await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { cowIdMap: {} },
      });

      expect(result.rowsSkipped).toBe(1);
      expect(result.rowsWritten).toBe(0);
    });
  });
});


// ══════════════════════════════════════════════════════
// 4. DRUG PURCHASE / DISPOSAL TESTS
// ══════════════════════════════════════════════════════

describe('Drug purchases and disposals migration', () => {
  beforeEach(async () => {
    await pgPool.query('DELETE FROM drug_purchases');
    await pgPool.query('DELETE FROM drug_disposals');
    await pgPool.query('DELETE FROM drugs');
  });

  describe('Drug purchases', () => {
    it('migrates drug purchases with cost and purchase_date', async () => {
      await pgPool.query(`INSERT INTO drugs (id, name, unit, cost_per_unit, withhold_days, esi_days)
                          VALUES (1, 'Draxxin', 'mL', 5.50, 30, 42)
                          ON CONFLICT DO NOTHING`);

      const mock = createMockMssql({
        'Drugs_Purchased': [
          { DrugID: 1, Quantity_received: 100, Purchase_Date: '2024-03-01',
            Batch_number: 'B001', Expiry_date: '2025-06-01', Drug_cost: 550.00, ID: 1 },
          { DrugID: 1, Quantity_received: 50,  Purchase_Date: '2024-06-15',
            Batch_number: 'B002', Expiry_date: '2025-12-01', Drug_cost: 275.00, ID: 2 },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Drugs_Purchased');
      const result = await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { drugIdSet: new Set([1]) },
      });

      expect(result.rowsWritten).toBe(2);
      expect(result.rowsErrored).toBe(0);

      const rows = await pgPool.query('SELECT * FROM drug_purchases ORDER BY id');
      expect(rows.rows).toHaveLength(2);
      expect(rows.rows[0].drug_id).toBe(1);
      expect(rows.rows[0].quantity).toBe(100);
      expect(rows.rows[0].purchase_date).not.toBeNull();
      expect(rows.rows[0].cost).toBe(550);
      expect(rows.rows[0].batch_number).toBe('B001');
      expect(rows.rows[1].cost).toBe(275);
    });

    it('nulls drug_id when drug does not exist in lookup', async () => {
      const mock = createMockMssql({
        'Drugs_Purchased': [
          { DrugID: 9999, Quantity_received: 10, Purchase_Date: '2024-01-01',
            Batch_number: null, Expiry_date: null, Drug_cost: 100.00, ID: 3 },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Drugs_Purchased');
      await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { drugIdSet: new Set() },
      });

      const rows = await pgPool.query('SELECT drug_id, cost FROM drug_purchases ORDER BY id DESC LIMIT 1');
      expect(rows.rows[0].drug_id).toBeNull(); // sanitized to null
      expect(rows.rows[0].cost).toBe(100);     // cost still preserved
    });

    it('preserves null cost values without zeroing', async () => {
      await pgPool.query(`INSERT INTO drugs (id, name, unit, cost_per_unit, withhold_days, esi_days)
                          VALUES (1, 'Draxxin', 'mL', 5.50, 30, 42)
                          ON CONFLICT DO NOTHING`);

      const mock = createMockMssql({
        'Drugs_Purchased': [
          { DrugID: 1, Quantity_received: 20, Purchase_Date: '2024-01-01',
            Batch_number: 'B003', Expiry_date: null, Drug_cost: null, ID: 4 },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Drugs_Purchased');
      await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { drugIdSet: new Set([1]) },
      });

      const rows = await pgPool.query('SELECT cost FROM drug_purchases ORDER BY id DESC LIMIT 1');
      expect(rows.rows[0].cost).toBeNull(); // null, never coerced to 0
    });
  });

  describe('Drug disposals', () => {
    it('migrates drug disposals with all fields', async () => {
      await pgPool.query(`INSERT INTO drugs (id, name, unit, cost_per_unit, withhold_days, esi_days)
                          VALUES (2, 'Metacam', 'mL', 3.20, 0, 0)
                          ON CONFLICT DO NOTHING`);

      const mock = createMockMssql({
        'Drug_Disposal': [
          { DrugID: 2, Number_disposed: 15, Date_disposed: '2024-04-10',
            Disposal_reason: 'Expired', Disposal_method: 'Incineration',
            Disposed_by: 'JB', Notes: 'batch expired', Disposal_ID: 1 },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Drug_Disposal');
      const result = await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false,
        lookups: { drugIdSet: new Set([2]) },
      });

      expect(result.rowsWritten).toBe(1);

      const rows = await pgPool.query('SELECT * FROM drug_disposals');
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].drug_id).toBe(2);
      expect(rows.rows[0].quantity).toBe(15);
      expect(rows.rows[0].disposal_reason).toBe('Expired');
      expect(rows.rows[0].disposal_method).toBe('Incineration');
      expect(rows.rows[0].disposed_by).toBe('JB');
    });
  });

  describe('Drug cost_per_unit fidelity', () => {
    it('migrates cost_per_unit as-is without zeroing nulls', async () => {
      const mock = createMockMssql({
        'Drugs': [
          { Drug_ID: 10, Drug_Name: 'Vetdrug A', Units: 'mL', Cost_per_unit: 12.75,
            WithHold_days_1: 7, WithHold_days_ESI: 14, HGP: 'N', Antibiotic: 'N',
            Supplier: 'VetCo', Inactive: false },
          { Drug_ID: 11, Drug_Name: 'Vetdrug B', Units: 'tab', Cost_per_unit: null,
            WithHold_days_1: 0, WithHold_days_ESI: 0, HGP: 'N', Antibiotic: 'N',
            Supplier: null, Inactive: false },
          { Drug_ID: 12, Drug_Name: 'Vetdrug C', Units: 'mL', Cost_per_unit: 0,
            WithHold_days_1: 0, WithHold_days_ESI: 0, HGP: 'N', Antibiotic: 'N',
            Supplier: null, Inactive: false },
        ],
      });

      const mapping = mappings.find(m => m.sourceTable === 'Drugs');
      const result = await migrateTable(mock, pgPool, mapping, {
        batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
      });

      expect(result.rowsWritten).toBe(3);

      const a = await pgPool.query('SELECT cost_per_unit FROM drugs WHERE id = 10');
      expect(a.rows[0].cost_per_unit).toBe(12.75); // exact value preserved

      const b = await pgPool.query('SELECT cost_per_unit FROM drugs WHERE id = 11');
      expect(b.rows[0].cost_per_unit).toBeNull();  // null stays null, not zeroed

      const c = await pgPool.query('SELECT cost_per_unit FROM drugs WHERE id = 12');
      expect(c.rows[0].cost_per_unit).toBe(0);     // explicit 0 kept as 0
    });
  });
});

// ══════════════════════════════════════════════════════
// 5. VALIDATION TESTS
// ══════════════════════════════════════════════════════

describe('Post-migration validation', () => {
  it('passes all checks on clean migrated data', async () => {
    // Clean data from any prior tests
    const cleanTables = [
      'geofence_alerts', 'geofences', 'costs', 'pen_movements', 'treatments',
      'health_records', 'weighing_events', 'locations', 'cows',
      'carcase_data', 'autopsy_records', 'location_changes',
      'drug_purchases', 'drug_disposals', 'vendor_declarations', 'legacy_raw',
      'purchase_lots', 'market_categories', 'cost_codes', 'drugs',
      'diseases', 'contacts', 'pens', 'breeds', 'herds', 'migration_log',
    ];
    for (const t of cleanTables) {
      await pgPool.query(`DELETE FROM ${t}`);
    }

    // Seed some valid data
    await pgPool.query("INSERT INTO breeds (id, name) VALUES (1, 'Angus')");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('T001', 'Angus', 500, 'active', 'female')
    `);
    const cowRes = await pgPool.query("SELECT id FROM cows WHERE tag_number = 'T001'");
    const cowId = cowRes.rows[0].id;

    await pgPool.query(`
      INSERT INTO weighing_events (cow_id, weigh_type, weight_kg, weighed_at)
      VALUES ($1, 'intake', 300, NOW())
    `, [cowId]);

    // Create a mock MSSQL that returns matching counts
    const mock = createMockMssql({
      'Breeds':          [{ cnt: 1 }],
      'Diseases':        [],
      'Drugs':           [],
      'Contacts':        [],
      'Cattle':          [{ cnt: 1 }],
      'Weighing_Events': [{ cnt: 1 }],
      'PensHistory':     [],
      'Drugs_Given':     [],
    });

    // Override to return count queries properly
    mock.request = () => ({
      async query(sql) {
        if (sql.includes('COUNT')) {
          if (sql.includes('Breeds'))           return { recordset: [{ cnt: 1 }] };
          if (sql.includes('Diseases'))         return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Drugs_Purchased'))  return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Drugs_Given'))      return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Drug_Disposal'))    return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Drugs'))            return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Contacts'))         return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Cattle'))           return { recordset: [{ cnt: 1 }] };
          if (sql.includes('Weighing_Events'))  return { recordset: [{ cnt: 1 }] };
          if (sql.includes('PensHistory'))      return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Carcase_data'))     return { recordset: [{ cnt: 0 }] };
          if (sql.includes('Location_Changes')) return { recordset: [{ cnt: 0 }] };
        }
        return { recordset: [] };
      },
    });

    const checks = await validateMigration(mock, pgPool);

    // FK integrity and data quality checks should pass
    const fkChecks = checks.filter(c => c.check.includes('FK integrity'));
    for (const c of fkChecks) {
      expect(c.passed).toBe(true);
    }

    const dqChecks = checks.filter(c => c.check.includes('Data quality'));
    for (const c of dqChecks) {
      expect(c.passed).toBe(true);
    }
  });

  it('detects negative weights', async () => {
    await pgPool.query("INSERT INTO breeds (id, name) VALUES (99, 'Test') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('NEG001', 'Test', 999, 'active', 'female')
    `);
    const cowRes = await pgPool.query("SELECT id FROM cows WHERE tag_number = 'NEG001'");
    const cowId = cowRes.rows[0].id;

    // CHECK(weight_kg >= 0) prevents negative weights at the DB level
    await expect(pgPool.query(`
      INSERT INTO weighing_events (cow_id, weigh_type, weight_kg, weighed_at)
      VALUES ($1, 'intake', -50, NOW())
    `, [cowId])).rejects.toThrow(/check/i);
  });
});

// ══════════════════════════════════════════════════════
// 5. CONFIG & CONNECTION TESTS
// ══════════════════════════════════════════════════════

describe('Config', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    process.env = { ...origEnv };
  });

  it('getMssqlConfig throws when env vars are missing', () => {
    delete process.env.MSSQL_HOST;
    delete process.env.MSSQL_USER;
    delete process.env.MSSQL_PASSWORD;

    expect(() => getMssqlConfig()).toThrow(/MSSQL_HOST/);
  });

  it('getMssqlConfig builds config from env vars', () => {
    process.env.MSSQL_HOST = 'testhost';
    process.env.MSSQL_USER = 'testuser';
    process.env.MSSQL_PASSWORD = 'testpass';
    process.env.MSSQL_DATABASE = 'TESTDB';
    process.env.MSSQL_PORT = '1434';

    const config = getMssqlConfig();
    expect(config.server).toBe('testhost');
    expect(config.user).toBe('testuser');
    expect(config.password).toBe('testpass');
    expect(config.database).toBe('TESTDB');
    expect(config.port).toBe(1434);
  });

  it('getMssqlConfig defaults to CATTLE database', () => {
    process.env.MSSQL_HOST = 'h';
    process.env.MSSQL_USER = 'u';
    process.env.MSSQL_PASSWORD = 'p';
    delete process.env.MSSQL_DATABASE;

    const config = getMssqlConfig();
    expect(config.database).toBe('CATTLE');
  });

  it('getMigrationOptions has sensible defaults', () => {
    delete process.env.MIGRATION_BATCH_SIZE;
    delete process.env.MIGRATION_LOG_LEVEL;

    const opts = getMigrationOptions();
    expect(opts.batchSize).toBe(500);
    expect(opts.logLevel).toBe('info');
  });

  it('getMigrationOptions reads from env', () => {
    process.env.MIGRATION_BATCH_SIZE = '1000';
    process.env.MIGRATION_LOG_LEVEL = 'debug';

    const opts = getMigrationOptions();
    expect(opts.batchSize).toBe(1000);
    expect(opts.logLevel).toBe('debug');
  });
});

// ══════════════════════════════════════════════════════
// 6. EDGE CASES & SECURITY TESTS
// ══════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('handles empty source tables gracefully', async () => {
    const mock = createMockMssql({ 'Breeds': [] });
    const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
    const result = await migrateTable(mock, pgPool, breedMapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.status).toBe('completed');
    expect(result.rowsRead).toBe(0);
    expect(result.rowsWritten).toBe(0);
  });

  it('handles special characters in data', async () => {
    const mock = createMockMssql({
      'Breeds': [
        { Breed_Code: 50, Breed_Name: "Angus O'Brien" },
        { Breed_Code: 51, Breed_Name: 'Breed "Quoted"' },
        { Breed_Code: 52, Breed_Name: 'Breed; DROP TABLE breeds;--' },
      ],
    });

    const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
    const result = await migrateTable(mock, pgPool, breedMapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    // All should insert successfully (parameterised queries prevent injection)
    expect(result.rowsWritten).toBe(3);
    expect(result.rowsErrored).toBe(0);

    // SQL injection attempt should be stored verbatim, not executed
    const res = await pgPool.query("SELECT name FROM breeds WHERE id = 52");
    expect(res.rows[0].name).toBe('Breed; DROP TABLE breeds;--');

    // Verify breeds table still exists
    const check = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    expect(parseInt(check.rows[0].cnt)).toBeGreaterThanOrEqual(3);
  });

  it('handles unicode data correctly', async () => {
    const mock = createMockMssql({
      'Contacts': [
        {
          Contact_ID: 100, Company: '日本牧場', Last_Name: 'Müller',
          First_Name: 'José', Tel_No: null, Email: 'josé@example.com',
          Address_1: 'Straße 42', ABN: null, Notes: null,
        },
      ],
    });

    const contactMapping = mappings.find(m => m.sourceTable === 'Contacts');
    const result = await migrateTable(mock, pgPool, contactMapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM contacts WHERE id = 100');
    expect(res.rows[0].company).toBe('日本牧場');
    expect(res.rows[0].last_name).toBe('Müller');
    expect(res.rows[0].first_name).toBe('José');
  });

  it('handles extremely long text fields', async () => {
    const longNote = 'A'.repeat(10000);
    const mock = createMockMssql({
      'Contacts': [
        {
          Contact_ID: 200, Company: 'Long Co', Last_Name: 'Test',
          First_Name: 'Test', Tel_No: null, Email: null,
          Address_1: null, ABN: null, Notes: longNote,
        },
      ],
    });

    const contactMapping = mappings.find(m => m.sourceTable === 'Contacts');
    const result = await migrateTable(mock, pgPool, contactMapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.rowsWritten).toBe(1);
    const res = await pgPool.query('SELECT notes FROM contacts WHERE id = 200');
    expect(res.rows[0].notes.length).toBe(10000);
  });
});

describe('Logger', () => {
  it('creates loggers at different levels', () => {
    const debugLog = createLogger('debug');
    const errorLog = createLogger('error');
    // Just verify they are callable
    expect(typeof debugLog.debug).toBe('function');
    expect(typeof debugLog.info).toBe('function');
    expect(typeof errorLog.warn).toBe('function');
    expect(typeof errorLog.error).toBe('function');
  });
});

describe('Schema integrity', () => {
  it('all new tables exist in PostgreSQL', async () => {
    const expected = [
      'breeds', 'pens', 'contacts', 'diseases', 'drugs', 'cost_codes',
      'market_categories', 'herds', 'purchase_lots', 'cows', 'locations',
      'weighing_events', 'health_records', 'treatments', 'pen_movements',
      'costs', 'geofences', 'geofence_alerts', 'migration_log',
      'carcase_data', 'autopsy_records', 'vendor_declarations',
      'location_changes', 'drug_purchases', 'drug_disposals', 'legacy_raw',
    ];

    const res = await pgPool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const actual = res.rows.map(r => r.table_name);

    for (const t of expected) {
      expect(actual).toContain(t);
    }
  });

  it('foreign keys are properly defined', async () => {
    const res = await pgPool.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);

    const fks = res.rows;
    // Verify key FKs exist
    const hasFk = (table, col, ref) =>
      fks.some(f => f.table_name === table && f.column_name === col && f.foreign_table === ref);

    expect(hasFk('cows', 'pen_id', 'pens')).toBe(true);
    expect(hasFk('cows', 'purchase_lot_id', 'purchase_lots')).toBe(true);
    expect(hasFk('weighing_events', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('treatments', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('treatments', 'drug_id', 'drugs')).toBe(true);
    expect(hasFk('pen_movements', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('pen_movements', 'pen_id', 'pens')).toBe(true);
    expect(hasFk('costs', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('health_records', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('carcase_data', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('autopsy_records', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('location_changes', 'cow_id', 'cows')).toBe(true);
    expect(hasFk('drug_purchases', 'drug_id', 'drugs')).toBe(true);
    expect(hasFk('drug_disposals', 'drug_id', 'drugs')).toBe(true);
  });

  it('indexes exist on key columns', async () => {
    const res = await pgPool.query(`
      SELECT indexname, tablename FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    const idxNames = res.rows.map(r => r.indexname);

    expect(idxNames).toContain('idx_cows_tag');
    expect(idxNames).toContain('idx_cows_eid');
    expect(idxNames).toContain('idx_cows_status');
    expect(idxNames).toContain('idx_cows_legacy_id');
    expect(idxNames).toContain('idx_weigh_cow');
    expect(idxNames).toContain('idx_weigh_date');
    expect(idxNames).toContain('idx_treat_cow');
    expect(idxNames).toContain('idx_health_cow_date');
    expect(idxNames).toContain('idx_carcase_cow');
    expect(idxNames).toContain('idx_carcase_kill');
    expect(idxNames).toContain('idx_autopsy_cow');
    expect(idxNames).toContain('idx_loc_change_cow');
    expect(idxNames).toContain('idx_legacy_raw_table');
  });
});

// ══════════════════════════════════════════════════════
// 7. TABLE CATEGORIES TESTS
// ══════════════════════════════════════════════════════

describe('Table categories', () => {
  it('categorises all 171 legacy tables', () => {
    const total = Object.keys(TABLE_CATEGORIES).length;
    // Should have entries for all known tables
    expect(total).toBeGreaterThanOrEqual(170);
  });

  it('every entry has a valid strategy', () => {
    for (const [table, info] of Object.entries(TABLE_CATEGORIES)) {
      expect(['mapped', 'raw', 'excluded']).toContain(info.strategy);
    }
  });

  it('mapped tables have a target', () => {
    for (const [table, info] of Object.entries(TABLE_CATEGORIES)) {
      if (info.strategy === 'mapped') {
        expect(info.target).toBeTruthy();
      }
    }
  });

  it('excluded tables have a reason', () => {
    for (const [table, info] of Object.entries(TABLE_CATEGORIES)) {
      if (info.strategy === 'excluded') {
        expect(info.reason).toBeTruthy();
      }
    }
  });

  it('every mapped category has a matching mapping definition', () => {
    const mappingSourceTables = mappings.map(m => m.sourceTable);
    for (const [table, info] of Object.entries(TABLE_CATEGORIES)) {
      if (info.strategy === 'mapped') {
        expect(mappingSourceTables).toContain(table);
      }
    }
  });

  it('getCategorySummary returns correct groups', () => {
    const { mapped, raw, excluded } = getCategorySummary();
    expect(mapped.length).toBeGreaterThanOrEqual(14); // original + new
    expect(raw.length).toBeGreaterThan(0);
    expect(excluded.length).toBeGreaterThan(0);
    expect(mapped.length + raw.length + excluded.length).toBe(Object.keys(TABLE_CATEGORIES).length);
  });

  it('getTableCategory returns correct info', () => {
    const breeds = getTableCategory('Breeds');
    expect(breeds.strategy).toBe('mapped');
    expect(breeds.target).toBe('breeds');

    const keyfile = getTableCategory('BatchUpdate_Keyfile_Yards');
    expect(keyfile.strategy).toBe('excluded');
    expect(keyfile.reason).toContain('keyfile');

    const unknown = getTableCategory('NonExistentTable');
    expect(unknown).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// 8. NEW TABLE MAPPING TESTS
// ══════════════════════════════════════════════════════

describe('New table mappings', () => {
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

  it('migrates carcase data correctly', async () => {
    // Set up cow first
    await pgPool.query("INSERT INTO breeds (id, name) VALUES (1, 'Angus')");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('C001', 'Angus', 400, 'sold', 'male')
    `);
    const cowId = (await pgPool.query("SELECT id FROM cows WHERE tag_number = 'C001'")).rows[0].id;
    const cowIdMap = { 400: cowId };

    const mock = createMockMssql({
      'Carcase_data': [
        {
          Beast_ID: 400, Ear_Tag_No: 'C001', EID: 'EID400',
          Sold_To: 'JBS', Abattoir: 'Dinmore', Body_Number: '123',
          Kill_Date: '2024-06-01', Carc_Wght_left: 150.5, Carc_Wght_right: 151.2,
          Dress_Pcnt: 55.0, Teeth: 2, Grade: 'YG',
          'Price_$/Kg_Left': 7.50, 'Price_$/Kg_Right': 7.50,
          P8_fat: 12, Rib_fat: 8, Mscle_Score: 'C', Eye_Mscle_Area: 78.5,
          PH_level: 5.6, Marbling: 3, Fat_Colour: 2, Mscle_Colour: '1A',
          Meat_Texture: 1, Meat_Yield: 72.5, Contract_No: 'CT001',
          Bruising_L: '0', Bruising_R: '0', '$/Kg_Deduction': 0,
          Dockage_Reason: null, Live_Weight_Shrink_Pcnt: 3.5,
          Ossification: 180, MSA_Index: 57.2, Hump_cold: 80,
          Boning_Group: 'A', Beast_Sale_Type: 1, Boning_date: '2024-06-03',
        },
      ],
    });

    const mapping = mappings.find(m => m.sourceTable === 'Carcase_data');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap },
    });

    expect(result.status).toBe('completed');
    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM carcase_data');
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].abattoir).toBe('Dinmore');
    expect(res.rows[0].dress_pct).toBe(55.0);
    expect(res.rows[0].msa_index).toBeCloseTo(57.2);
    expect(res.rows[0].legacy_beast_id).toBe(400);
  });

  it('migrates autopsy records with findings JSONB', async () => {
    await pgPool.query("INSERT INTO breeds (id, name) VALUES (1, 'Angus') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('AP01', 'Angus', 500, 'died', 'male')
    `);
    const cowId = (await pgPool.query("SELECT id FROM cows WHERE tag_number = 'AP01'")).rows[0].id;
    const cowIdMap = { 500: cowId };

    const mock = createMockMssql({
      'Autopsy_Records': [{
        Beast_ID: 500, Ear_Tag_No: 'AP01', Date_Dead: '2024-03-15',
        Time_Dead: '14:30', Date_Autopsy: '2024-03-16', Autopsy_By: 'Dr Vet',
        Pre_Autopsy_Diag: 'BRD', Post_Autopsy_Diag: 'Pneumonia',
        Notes: 'Severe consolidation',
        Body_Cond_Fresh: true, Body_Cond_Bloated: false, Body_Cond_Putrid: false,
        Nostrils_Erosions: false, Nostrils_Fluid: true, Nostrils_Froth: true,
        Larynx_Normal: false, Larynx_Necrotic: true,
        Trachea_Erosions: false, Tarchea_Fluid: true, Trachea_Froth: false,
        Chest_Fluid: true, Chest_Fibrin: true, Chest_Adhesions: true,
        Lungs_Spongy: false, Lungs_Firm: true, Lungs_Consolidate: true,
        Lungs_Abscess: true, Lungs_not_Collapsed: false,
        Heart_Fluid: false, Heart_Haemorrhages: false,
        Abdomen_Fluid: false, Abdomen_Fibrin: false, Abdomen_Adhesions: false,
        Liver_Abscess: false, Liver_Cysts: false, Liver_Colour: false,
        Rumen_Full: true, Rumen_Empty: false,
        Intest_Normal: true, Intest_Red: false, Intest_Dark: false,
        Kidneys_Abscess: false, Kidneys_Cyst: false, Kidneys_Calculi: false,
        Bladder_Intact: true, Bladder_Ruptured: false, Bladder_Calculi: false,
        Muscle_Bruising: false, Muscle_Abscess: false,
        Legs_Bruising: false, Legs_Abscess: false,
        SB_Rec_No: 1,
      }],
    });

    const mapping = mappings.find(m => m.sourceTable === 'Autopsy_Records');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap },
    });

    expect(result.status).toBe('completed');
    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM autopsy_records');
    expect(res.rows[0].autopsy_by).toBe('Dr Vet');
    expect(res.rows[0].post_autopsy_diag).toBe('Pneumonia');
    // Anatomical findings should be stored as JSONB
    const findings = res.rows[0].findings;
    expect(findings.Lungs_Consolidate).toBe(true);
    expect(findings.Heart_Fluid).toBe(false);
    expect(findings.Chest_Adhesions).toBe(true);
  });

  it('migrates vendor declarations with ownership period', async () => {
    await pgPool.query("INSERT INTO contacts (id, company) VALUES (1, 'Smith Station')");

    const mock = createMockMssql({
      'Vendor_Declarations': [{
        Vendor_Dec_Number: 'NVD001', Owner_Contact_ID: 1,
        Form_Date: '2024-01-10', Number_Cattle: 50,
        Cattle_Description: '50 steers', Tail_Tag: 'T100',
        RFIDs_in_cattle: 'Y', HGP_Treated: 'N', QA_program: 'Y',
        QA_Program_details: 'PCAS', Born_on_Vend_prop: 'N',
        Owned_LT_2months: 'N', Owned_2_6_months: 'N',
        Owned_6_12_months: 'Y', Owned_GT_12_months: 'N',
        Fed_stockfeeds: 'N', Chem_Res_restriction: 'N',
        Withholding_for_drugs: 'N', Withholding_for_feed: 'N',
        Additional_info: null, ID: 1,
      }],
    });

    const mapping = mappings.find(m => m.sourceTable === 'Vendor_Declarations');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.status).toBe('completed');
    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM vendor_declarations');
    expect(res.rows[0].vendor_dec_number).toBe('NVD001');
    expect(res.rows[0].rfids_in_cattle).toBe(true);
    expect(res.rows[0].hgp_treated).toBe(false);
    expect(res.rows[0].ownership_period).toBe('6-12 months');
  });

  it('migrates location changes correctly', async () => {
    await pgPool.query("INSERT INTO breeds (id, name) VALUES (1, 'Angus') ON CONFLICT DO NOTHING");
    await pgPool.query(`
      INSERT INTO cows (tag_number, breed, legacy_beast_id, status, sex)
      VALUES ('LC01', 'Angus', 600, 'active', 'female')
    `);
    const cowId = (await pgPool.query("SELECT id FROM cows WHERE tag_number = 'LC01'")).rows[0].id;

    const mock = createMockMssql({
      'Location_Changes': [{
        BeastID: 600, Ear_Tag: 'LC01', EID: 'EID600',
        Movement_Date: '2024-02-01', From_location: 'Paddock A',
        To_Location: 'Pen 5', New_animal: false, Slaughtered: false, ID: 1,
      }],
    });

    const mapping = mappings.find(m => m.sourceTable === 'Location_Changes');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false,
      lookups: { cowIdMap: { 600: cowId } },
    });

    expect(result.status).toBe('completed');
    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM location_changes');
    expect(res.rows[0].from_location).toBe('Paddock A');
    expect(res.rows[0].to_location).toBe('Pen 5');
    expect(res.rows[0].is_new_animal).toBe(false);
  });

  it('migrates drug purchases', async () => {
    await pgPool.query(`INSERT INTO drugs (id, name, active) VALUES (1, 'TestDrug', true) ON CONFLICT DO NOTHING`);

    const mock = createMockMssql({
      'Drugs_Purchased': [{
        DrugID: 1, Quantity_received: 100, Batch_number: 'B2024-001',
        Expiry_date: '2025-06-01', Drug_cost: 550, ID: 1,
      }],
    });

    const mapping = mappings.find(m => m.sourceTable === 'Drugs_Purchased');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.status).toBe('completed');
    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM drug_purchases');
    expect(res.rows[0].batch_number).toBe('B2024-001');
    expect(res.rows[0].cost).toBe(550);
  });

  it('migrates drug disposals', async () => {
    await pgPool.query(`INSERT INTO drugs (id, name, active) VALUES (2, 'TestDrug2', true) ON CONFLICT DO NOTHING`);

    const mock = createMockMssql({
      'Drug_Disposal': [{
        DrugID: 2, Number_disposed: 10, Date_disposed: '2024-03-01',
        Disposal_reason: 'Expired', Disposal_method: 'Return to supplier',
        Disposed_by: 'JB', Notes: 'Batch expired',
      }],
    });

    const mapping = mappings.find(m => m.sourceTable === 'Drug_Disposal');
    const result = await migrateTable(mock, pgPool, mapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.status).toBe('completed');
    expect(result.rowsWritten).toBe(1);

    const res = await pgPool.query('SELECT * FROM drug_disposals');
    expect(res.rows[0].disposal_reason).toBe('Expired');
    expect(res.rows[0].disposed_by).toBe('JB');
    expect(res.rows[0].quantity).toBe(10);
  });
});

// ══════════════════════════════════════════════════════
// 9. RAW TABLE MIGRATION TESTS
// ══════════════════════════════════════════════════════

describe('Raw table migration', () => {
  beforeEach(async () => {
    await pgPool.query('DELETE FROM legacy_raw');
    await pgPool.query('DELETE FROM migration_log');
  });

  it('copies arbitrary data to legacy_raw as JSONB', async () => {
    const mock = createMockMssql({
      'Beast_Breeding': [
        { Beast_ID: 100, Birth_Date: '2022-01-15', Birth_Wght: 35, Sire: 1, Dam: 2, Genetics: 1, Notes: 'test' },
        { Beast_ID: 101, Birth_Date: '2022-02-01', Birth_Wght: 38, Sire: 1, Dam: 3, Genetics: 2, Notes: null },
      ],
    });

    // migrateRawTables migrates all 'raw' category tables
    // We need the mock to respond to SELECT * FROM [dbo].[tableName]
    // The existing mock matches by table name in query string
    const results = await migrateRawTables(mock, pgPool, {
      batchSize: 100, logLevel: 'error', dryRun: false,
    });

    // Find Beast_Breeding result
    const bbResult = results.find(r => r.table === 'Beast_Breeding');
    expect(bbResult).toBeTruthy();
    expect(bbResult.rowsRead).toBe(2);
    expect(bbResult.rowsWritten).toBe(2);

    // Verify JSONB data in legacy_raw
    const res = await pgPool.query(
      "SELECT * FROM legacy_raw WHERE source_table = 'Beast_Breeding' ORDER BY id"
    );
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].row_data.Beast_ID).toBe(100);
    expect(res.rows[0].row_data.Birth_Wght).toBe(35);
  });

  it('logs raw migrations to migration_log', async () => {
    const mock = createMockMssql({
      'BodySystems': [{ ID: 1, Name: 'Respiratory' }],
    });

    await migrateRawTables(mock, pgPool, {
      batchSize: 100, logLevel: 'error', dryRun: false,
    });

    const res = await pgPool.query("SELECT * FROM migration_log WHERE source_table = 'BodySystems'");
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    expect(res.rows[0].status).toBe('completed');
    expect(res.rows[0].rows_read).toBe(1);
  });

  it('dry-run does not write raw data', async () => {
    const mock = createMockMssql({
      'Sire_Lines': [{ ID: 1, Name: 'Test' }],
    });

    const results = await migrateRawTables(mock, pgPool, {
      batchSize: 100, logLevel: 'error', dryRun: true,
    });

    const slResult = results.find(r => r.table === 'Sire_Lines');
    expect(slResult.rowsRead).toBe(1);

    const res = await pgPool.query("SELECT COUNT(*) AS cnt FROM legacy_raw WHERE source_table = 'Sire_Lines'");
    expect(parseInt(res.rows[0].cnt)).toBe(0);
  });

  it('handles empty raw tables gracefully', async () => {
    const mock = createMockMssql({});

    const results = await migrateRawTables(mock, pgPool, {
      batchSize: 100, logLevel: 'error', dryRun: false,
    });

    // All raw tables should complete (with 0 rows)
    for (const r of results) {
      expect(r.status).toBe('completed');
    }
  });
});

// ══════════════════════════════════════════════════════
// 10. PRE-FLIGHT AUDIT & RECONCILIATION TESTS
// ══════════════════════════════════════════════════════

describe('Pre-flight audit', () => {
  it('reports source tables with row counts', async () => {
    const mock = {
      request() {
        return {
          async query(sql) {
            if (sql.includes('INFORMATION_SCHEMA.TABLES')) {
              return {
                recordset: [
                  { TABLE_NAME: 'Breeds' },
                  { TABLE_NAME: 'Cattle' },
                  { TABLE_NAME: 'NewUnknownTable' },
                ],
              };
            }
            if (sql.includes('COUNT')) {
              return { recordset: [{ cnt: 10 }] };
            }
            return { recordset: [] };
          },
        };
      },
    };

    const report = await preFlightAudit(mock);

    expect(report.summary.totalSourceTables).toBe(3);
    expect(report.tables.length).toBe(2); // Breeds and Cattle are categorised
    expect(report.uncategorised.length).toBe(1); // NewUnknownTable
    expect(report.uncategorised[0].table).toBe('NewUnknownTable');
    expect(report.summary.uncategorisedRows).toBe(10);
  });

  it('reports all clear when every table is categorised', async () => {
    const mock = {
      request() {
        return {
          async query(sql) {
            if (sql.includes('INFORMATION_SCHEMA.TABLES')) {
              return {
                recordset: [
                  { TABLE_NAME: 'Breeds' },
                  { TABLE_NAME: 'Cattle' },
                  { TABLE_NAME: 'BatchUpdate_Keyfile_Yards' },
                ],
              };
            }
            if (sql.includes('COUNT')) {
              return { recordset: [{ cnt: 5 }] };
            }
            return { recordset: [] };
          },
        };
      },
    };

    const report = await preFlightAudit(mock);
    expect(report.uncategorised.length).toBe(0);
  });
});

describe('Reconciliation report', () => {
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

  it('generates reconciliation with match/mismatch status', async () => {
    // Seed some data
    await pgPool.query("INSERT INTO breeds (id, name) VALUES (1, 'Angus')");

    const mock = {
      request() {
        return {
          async query(sql) {
            if (sql.includes('Breeds') && sql.includes('COUNT'))
              return { recordset: [{ cnt: 1 }] };
            if (sql.includes('COUNT'))
              return { recordset: [{ cnt: 0 }] };
            return { recordset: [] };
          },
        };
      },
    };

    const rows = await reconciliationReport(mock, pgPool);

    expect(rows.length).toBeGreaterThan(0);

    const breedsRow = rows.find(r => r.source === 'Breeds');
    expect(breedsRow.match).toBe(true);
    expect(breedsRow.sourceRows).toBe(1);
    expect(breedsRow.targetRows).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// 11. LARGE-DATASET STRESS TESTS (pagination bulletproofing)
// ══════════════════════════════════════════════════════

describe('Large-dataset pagination', () => {
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

  it('processes 2000 breeds across multiple pages with batch size 50', async () => {
    const breeds = [];
    for (let i = 1; i <= 2000; i++) {
      breeds.push({ Breed_Code: i, Breed_Name: `Breed_${i}` });
    }

    const mock = createMockMssql({ 'Breeds': breeds });
    const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
    const result = await migrateTable(mock, pgPool, breedMapping, {
      batchSize: 50, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.status).toBe('completed');
    expect(result.rowsRead).toBe(2000);
    expect(result.rowsWritten).toBe(2000);

    const res = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    expect(parseInt(res.rows[0].cnt)).toBe(2000);

    // Verify first and last entries
    const first = await pgPool.query('SELECT name FROM breeds WHERE id = 1');
    expect(first.rows[0].name).toBe('Breed_1');
    const last = await pgPool.query('SELECT name FROM breeds WHERE id = 2000');
    expect(last.rows[0].name).toBe('Breed_2000');
  });

  it('handles 1000 cattle → event chain across pages', async () => {
    // Generate 1000 cattle with corresponding weighing events
    const cattle = [];
    const weighEvents = [];
    for (let i = 1; i <= 1000; i++) {
      cattle.push({
        BeastID: i, Ear_Tag: `T${String(i).padStart(4, '0')}`, EID: `EID${i}`,
        Breed: 1, Sex: i % 2 === 0 ? 'S' : 'H', HGP: false,
        Died: false, Start_Date: '2024-01-01', Start_Weight: 300 + i,
        Sale_Date: null, Sale_Weight: null, DOB: '2022-01-01',
        Feedlot_Entry_Date: '2024-01-01', Feedlot_Entry_Wght: 300 + i,
        Pen_Number: null, Notes: null, Purch_Lot_No: null, Date_Archived: null,
      });
      weighEvents.push({
        BeastID: i, Weighing_Type: 1, Weigh_date: '2024-01-01',
        Weight: 300 + i, P8_Fat: 5, Weigh_Note: 'intake', ID: i,
      });
    }

    const mock = createMockMssql({
      'Breeds': [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      'FeedDB_Pens_File': [],
      'Contacts': [],
      'Diseases': [],
      'Drugs': [],
      'Cost_Codes': [],
      'Market_Category': [],
      'Purchase_Lots': [],
      'Cattle': cattle,
      'Weighing_Events': weighEvents,
      'PensHistory': [],
      'Drugs_Given': [],
      'Costs': [],
      'Sick_Beast_Records': [],
      'Carcase_data': [],
      'Autopsy_Records': [],
      'Vendor_Declarations': [],
      'Location_Changes': [],
      'Drugs_Purchased': [],
      'Drug_Disposal': [],
    });

    const { results } = await runMigration(mock, pgPool, {
      batchSize: 100, logLevel: 'error', dryRun: false,
    });

    // All tables should complete
    for (const r of results) {
      expect(r.status).toBe('completed');
    }

    // Verify cattle count
    const cowResult = results.find(r => r.table === 'Cattle');
    expect(cowResult.rowsRead).toBe(1000);
    expect(cowResult.rowsWritten).toBe(1000);

    const dbCows = await pgPool.query('SELECT COUNT(*) AS cnt FROM cows');
    expect(parseInt(dbCows.rows[0].cnt)).toBe(1000);

    // Verify all weighing events linked correctly
    const weighResult = results.find(r => r.table === 'Weighing_Events');
    expect(weighResult.rowsRead).toBe(1000);
    expect(weighResult.rowsWritten).toBe(1000);

    const dbWeigh = await pgPool.query('SELECT COUNT(*) AS cnt FROM weighing_events');
    expect(parseInt(dbWeigh.rows[0].cnt)).toBe(1000);

    // Verify no orphan weighing events
    const orphans = await pgPool.query(`
      SELECT COUNT(*) AS cnt FROM weighing_events w
      WHERE NOT EXISTS (SELECT 1 FROM cows c WHERE c.id = w.cow_id)
    `);
    expect(parseInt(orphans.rows[0].cnt)).toBe(0);
  });

  it('raw migration paginates large tables correctly', async () => {
    // Generate 500 rows for a raw table
    const rawRows = [];
    for (let i = 1; i <= 500; i++) {
      rawRows.push({ ID: i, Name: `Item_${i}`, Value: i * 1.5 });
    }

    const mock = createMockMssql({ 'Beast_Breeding': rawRows });

    const results = await migrateRawTables(mock, pgPool, {
      batchSize: 75, logLevel: 'error', dryRun: false,
    });

    const bbResult = results.find(r => r.table === 'Beast_Breeding');
    expect(bbResult).toBeTruthy();
    expect(bbResult.rowsRead).toBe(500);
    expect(bbResult.rowsWritten).toBe(500);
    expect(bbResult.status).toBe('completed');

    const res = await pgPool.query(
      "SELECT COUNT(*) AS cnt FROM legacy_raw WHERE source_table = 'Beast_Breeding'"
    );
    expect(parseInt(res.rows[0].cnt)).toBe(500);
  });

  it('pagination handles exact batch-size boundary correctly', async () => {
    // 200 rows with batch size 100 — exactly 2 full pages, no partial page
    const breeds = [];
    for (let i = 1; i <= 200; i++) {
      breeds.push({ Breed_Code: i, Breed_Name: `Breed_${i}` });
    }

    const mock = createMockMssql({ 'Breeds': breeds });
    const breedMapping = mappings.find(m => m.sourceTable === 'Breeds');
    const result = await migrateTable(mock, pgPool, breedMapping, {
      batchSize: 100, log: createLogger('error'), dryRun: false, lookups: {},
    });

    expect(result.rowsRead).toBe(200);
    expect(result.rowsWritten).toBe(200);

    const res = await pgPool.query('SELECT COUNT(*) AS cnt FROM breeds');
    expect(parseInt(res.rows[0].cnt)).toBe(200);
  });
});

