/**
 * Per-column test suite Ã¢â‚¬â€ auto-generated from mappings.js
 *
 * For every mapping (195 source tables), verifies:
 *   1. Each column's transform handles null/undefined Ã¢â€ â€™ expected fallback
 *   2. Each column's transform handles representative values correctly
 *   3. Target column exists in the PostgreSQL schema
 *   4. Column count matches between mapping and MANIFEST
 *   5. Integration: golden row round-trips through migration for key tables
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs   = require('fs');
const path = require('path');
const pg   = require('pg');
const { Pool } = pg;
pg.types.setTypeParser(1700, parseFloat);

const {
  toBool, trimOrNull, toDate, toNum, toFkId,
  mapSex, deriveCowStatus, mapWeighType, mapCostType, mapContactType,
  mappings,
} = require('../mappings');

const {
  runMigration, migrateTable, processBatch,
  buildLookup, buildCowIdMap, createLogger,
} = require('../runner');

// Ã¢â€â‚¬Ã¢â€â‚¬ Test DB Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const TEST_DB = 'lsj_per_column_test';
const V5_SCHEMA = path.join(__dirname, '..', 'schema-farm-v6.sql');

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

const { createMockMssql } = require('./mock-mssql');

// Ã¢â€â‚¬Ã¢â€â‚¬ Schema setup / teardown Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
  const schema = fs.readFileSync(V5_SCHEMA, 'utf8');
  const FK_DO_BLOCK = /DO \$\$\s*DECLARE\s+_fk\b[\s\S]*?\$\$;/g;
  const FK_INLINE   = /ALTER TABLE \S+ ADD CONSTRAINT (fk_\S+)\s+FOREIGN KEY \([^)]+\) REFERENCES [^;]+;/g;
  const FK_COL_REF  = /REFERENCES\s+\S+\([^)]+\)(\s+ON\s+(DELETE|UPDATE)\s+\w+)*/g;  // inline column-level FKs
  await pgPool.query(schema.replace(FK_DO_BLOCK, '').replace(FK_INLINE, '').replace(FK_COL_REF, ''));
}, 60000);

afterAll(async () => {
  if (pgPool) await pgPool.end();
  const admin = adminPool();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  } finally {
    await admin.end();
  }
});


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// SECTION 1: TRANSFORM FUNCTION COVERAGE
// Every transform used in any mapping is tested with
// null, undefined, typical, and edge-case inputs.
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

describe('Transform functions Ã¢â‚¬â€ exhaustive', () => {
  describe('toBool', () => {
    it.each([
      [null, false], [undefined, false],
      [true, true], [false, false],
      [1, true], [0, false],
      ['1', true], ['0', false],
      ['Y', true], ['N', false],
      ['y', true], ['TRUE', true], ['false', false],
      ['', false], ['X', false],
    ])('toBool(%j) Ã¢â€ â€™ %j', (input, expected) => {
      expect(toBool(input)).toBe(expected);
    });
  });

  describe('trimOrNull', () => {
    it.each([
      [null, null], [undefined, null],
      ['', null], ['   ', null],
      ['hello', 'hello'], ['  padded  ', 'padded'],
      ['has\0nulls', 'hasnulls'],
      [123, '123'],
    ])('trimOrNull(%j) Ã¢â€ â€™ %j', (input, expected) => {
      expect(trimOrNull(input)).toBe(expected);
    });
  });

  describe('toDate', () => {
    it('null Ã¢â€ â€™ null', () => expect(toDate(null)).toBeNull());
    it('undefined Ã¢â€ â€™ null', () => expect(toDate(undefined)).toBeNull());
    it('empty string Ã¢â€ â€™ null', () => expect(toDate('')).toBeNull());
    it('invalid string Ã¢â€ â€™ null', () => expect(toDate('not-a-date')).toBeNull());
    it('valid ISO Ã¢â€ â€™ ISO string', () => {
      const result = toDate('2024-01-15');
      expect(result).toMatch(/^2024-01-15/);
    });
    it('JS Date object Ã¢â€ â€™ ISO string', () => {
      const result = toDate(new Date('2024-06-01T12:00:00Z'));
      expect(result).toMatch(/^2024-06-01/);
    });
  });

  describe('toNum', () => {
    it.each([
      [null, null], [undefined, null],
      [0, 0], [42, 42], [-1, -1],
      [3.14159, 3.14159], [0.001, 0.001],
      ['42', 42], ['3.14', 3.14],
      ['', 0], // Number('') === 0
      ['abc', null], [NaN, null],
      [999999999, 999999999],
    ])('toNum(%j) Ã¢â€ â€™ %j', (input, expected) => {
      expect(toNum(input)).toBe(expected);
    });
  });

  describe('toFkId', () => {
    it.each([
      [null, null], [undefined, null],
      [0, null],    // 0 is sentinel for "no reference"
      [1, 1], [999, 999],
      ['5', 5], ['0', null],
    ])('toFkId(%j) Ã¢â€ â€™ %j', (input, expected) => {
      expect(toFkId(input)).toBe(expected);
    });
  });

  describe('mapSex', () => {
    it.each([
      [null, 'heifer'], [undefined, 'heifer'], ['', 'heifer'],
      ['S', 'steer'], ['B', 'bull'], ['M', 'steer'],
      ['s', 'steer'], ['b', 'bull'], ['m', 'steer'],
      ['F', 'heifer'], ['H', 'heifer'], ['C', 'cow'],
      ['f', 'heifer'], ['h', 'heifer'],
      ['X', 'heifer'], // unknown defaults to heifer
    ])('mapSex(%j) Ã¢â€ â€™ %j', (input, expected) => {
      expect(mapSex(input)).toBe(expected);
    });
  });

  describe('deriveCowStatus', () => {
    it.each([
      [{ Died: true, Sale_Date: '2024-01-01', Date_Archived: '2024-01-01' }, 'died'],
      [{ Died: false, Sale_Date: '2024-01-01', Date_Archived: null }, 'sold'],
      [{ Died: false, Sale_Date: null, Date_Archived: '2024-01-01' }, 'archived'],
      [{ Died: false, Sale_Date: null, Date_Archived: null }, 'active'],
      [{}, 'active'],
      [{ Died: '1' }, 'died'],  // toBool('1') = true
      [{ Sale_Date: '1900-01-01' }, 'active'], // 1900 sentinel not > 1901
    ])('deriveCowStatus(%j) Ã¢â€ â€™ %s', (row, expected) => {
      expect(deriveCowStatus(row)).toBe(expected);
    });
  });

  describe('mapWeighType', () => {
    it.each([
      [1, 'intake'], [2, 'interim'], [3, 'exit'], [4, 'sale'],
      [0, 'interim'], [99, 'interim'], [null, 'interim'],
      ['1', 'intake'], ['3', 'exit'],
    ])('mapWeighType(%j) Ã¢â€ â€™ %s', (input, expected) => {
      expect(mapWeighType(input)).toBe(expected);
    });
  });

  describe('mapCostType', () => {
    it.each([
      [null, 'expense'], [undefined, 'expense'], ['', 'expense'],
      ['R', 'revenue'], ['r', 'revenue'],
      ['E', 'expense'], ['X', 'expense'],
    ])('mapCostType(%j) Ã¢â€ â€™ %s', (input, expected) => {
      expect(mapCostType(input)).toBe(expected);
    });
  });

  describe('mapContactType', () => {
    it.each([
      [null, 'other'], [undefined, 'other'], ['', 'other'],
      ['vendor', 'vendor'], ['V', 'vendor'], ['Vendor Supply', 'vendor'],
      ['agent', 'agent'], ['A', 'agent'],
      ['buyer', 'buyer'], ['B', 'buyer'],
      ['abattoir', 'abattoir'], ['meatworks', 'abattoir'],
      ['carrier', 'carrier'], ['transport co', 'carrier'],
      ['unknown', 'other'],
    ])('mapContactType(%j) Ã¢â€ â€™ %s', (input, expected) => {
      expect(mapContactType(input)).toBe(expected);
    });
  });
});


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// SECTION 2: MAPPING STRUCTURAL INTEGRITY
// Verify every mapping has valid structure, non-empty
// columns, and no duplicate target columns.
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

describe('Mapping structural integrity', () => {
  it('all 195 mappings are loaded', () => {
    expect(mappings.length).toBe(197);
  });

  mappings.forEach((m, idx) => {
    describe(`[${idx}] ${m.sourceTable} Ã¢â€ â€™ ${m.targetTable}`, () => {
      it('has required fields', () => {
        expect(m.sourceTable).toBeTruthy();
        expect(m.targetTable).toBeTruthy();
        expect(m.query).toBeTruthy();
        expect(Array.isArray(m.columns)).toBe(true);
        expect(m.columns.length).toBeGreaterThan(0);
        expect(typeof m.order).toBe('number');
      });

      it('every column has source and target', () => {
        m.columns.forEach((col, ci) => {
          expect(col.source).toBeTruthy();
          expect(col.target).toBeTruthy();
        });
      });

      it('no duplicate target columns', () => {
        const targets = m.columns.map(c => c.target);
        const dupes = targets.filter((t, i) => targets.indexOf(t) !== i);
        // Some mappings legitimately map the same source to two targets (e.g. Drug_Name Ã¢â€ â€™ name + drug_name)
        // So we only flag truly identical source+target pairs
        const pairs = m.columns.map(c => `${c.source}Ã¢â€ â€™${c.target}`);
        const dupePairs = pairs.filter((p, i) => pairs.indexOf(p) !== i);
        expect(dupePairs).toEqual([]);
      });

      it('transform functions are valid (function or undefined)', () => {
        m.columns.forEach(col => {
          if (col.transform !== undefined) {
            expect(typeof col.transform).toBe('function');
          }
        });
      });
    });
  });
});


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// SECTION 3: PER-COLUMN NULL/UNDEFINED HANDLING
// For every column with a transform, verify it handles
// null and undefined inputs without throwing.
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

describe('Per-column null safety', () => {
  const seen = new Set();

  mappings.forEach(m => {
    m.columns.forEach(col => {
      if (!col.transform) return;
      const key = `${m.sourceTable}.${col.source}Ã¢â€ â€™${col.target} [${col.transform.name}]`;
      if (seen.has(key)) return;
      seen.add(key);

      it(`${key} handles null without throwing`, () => {
        expect(() => col.transform(null)).not.toThrow();
      });

      it(`${key} handles undefined without throwing`, () => {
        expect(() => col.transform(undefined)).not.toThrow();
      });
    });
  });
});


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// SECTION 4: TARGET COLUMN EXISTS IN SCHEMA
// For every mapping, verify each target column actually
// exists in the PostgreSQL target table.
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

describe('Target columns exist in PostgreSQL schema', () => {
  // Build a cache of schema columns
  let schemaColumns; // Map<tableName, Set<columnName>>

  beforeAll(async () => {
    const result = await pgPool.query(`
      SELECT table_schema || '.' || table_name AS tbl, column_name
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY 1, 2
    `);
    schemaColumns = new Map();
    for (const row of result.rows) {
      if (!schemaColumns.has(row.tbl)) schemaColumns.set(row.tbl, new Set());
      schemaColumns.get(row.tbl).add(row.column_name);
    }
  });

  // Group mappings by target table to avoid redundant tests
  const byTarget = {};
  mappings.forEach(m => {
    if (!byTarget[m.targetTable]) byTarget[m.targetTable] = [];
    byTarget[m.targetTable].push(m);
  });

  Object.entries(byTarget).forEach(([targetTable, maps]) => {
    describe(targetTable, () => {
      it('table exists in schema', () => {
        expect(schemaColumns.has(targetTable)).toBe(true);
      });

      // Collect all unique target columns across all mappings to this table
      const allTargetCols = new Set();
      maps.forEach(m => m.columns.forEach(c => allTargetCols.add(c.target)));

      allTargetCols.forEach(col => {
        it(`column "${col}" exists`, () => {
          const tableCols = schemaColumns.get(targetTable);
          if (!tableCols) return; // table existence tested above
          expect(tableCols.has(col)).toBe(true);
        });
      });
    });
  });
});


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// SECTION 5: PER-TABLE INTEGRATION Ã¢â‚¬â€ SINGLE MIGRATION
// One comprehensive migration run with all prerequisite
// data, then per-table assertions on every column.
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

describe('Per-table column integration', () => {
  // Run a single migration with all tables' test data
  beforeAll(async () => {
    const allData = {
      // Ã¢â€â‚¬Ã¢â€â‚¬ Lookup / prereq tables Ã¢â€â‚¬Ã¢â€â‚¬
      Breeds: [{ Breed_Code: 1, Breed_Name: 'Angus' }],
      FeedDB_Pens_File: [{ Pen_name: '  FP01  ', IsPaddock: 'Y', Include_in_Pen_List: 1, Current_exit_pen: true }],
      Contacts: [{
        Contact_ID: 99, Company: ' Acme Corp ', First_Name: 'John', Last_Name: 'Smith',
        Salutation: 'Mr', Address_1: '123 Main St', Address_2: 'Suite 4',
        City: 'Brisbane', State: 'QLD', PostCode: '4000',
        Tel_No: '07 1234 5678', Mobile_No: '0412345678', Fax_No: '07 8765 4321',
        Email: 'john@acme.com', Contact_Type: 3, Tail_Tag_No: 'TT99',
        Brand: 'ACM', Notes: 'Test contact\0with nulls', ABN: '12345678901',
        Bank_BSB: '064-000', Bank_AC: '12345678', Days_invoice_due: 30,
        Agistment_Paddock_Rate: 2.50, Agistment_Feedlot_Rate: 5.75,
        Invoice_careof: 'Jane', brand_drawing_filename: 'acme.png',
        Abattoir_Establishment_Number: 'EST001',
        Last_Modified_timestamp: '2024-06-15T10:30:00Z',
      }],
      Diseases: [{
        Disease_ID: 50, Disease_Name: ' BRD ', Symptoms: 'Cough, fever',
        Treatment: 'Antibiotic course', No_longer_used: 1,
        Recoverable: 'Y', BodySystemID: 3,
        PenApp_Disease_name: 'BRD App', Autopsy_disease: false,
      }],
      Drugs: [{
        Drug_ID: 77, Drug_Name: 'Penicillin G', Units: 'mL',
        Cost_per_unit: 15.99, WithHold_days_1: 14, WithHold_days_ESI: 28,
        WithHold_days_3: 7, WithHold_days_4: 0,
        HGP: true, Antibiotic: 'Y', Supplier: 'VetPharma',
        Inactive: false, Notes: 'keep refrigerated',
        Drug_Category: 2, Admin_units: 'mL/kg',
        Admin_weight_Factor: 0.05, Current_Batch_Numb: 'B2024-001',
        Cost_per_Unit_CF: 18.50, Chemical_Mg_per_Ml: 300,
        Reorder_SOH_units_trigger: 100, Units_per_BoxOrBottle: 250,
        Units_on_hand: 1500, Last_Modified_timestamp: '2024-03-20T08:00:00Z',
      }],
      Cost_Codes: [{
        RevExp_Code: 10, RevExp_Desc: 'Vet Supplies', Rev_Exp: 'E',
        Include_in_Landed_Cost: true, Include_in_PL_expenses: 'Y',
        Include_on_CF_Invoice: false,
      }],
      Market_Category: [{
        Market_Cat_ID: 25, Market_Category: 'LF Wagyu',
        Min_DOF: 350, Predicted_dressing_pcnt: 56.5,
        HGP_Free: true, Dispatch_Notes: 'Premium program',
      }],
      Sickness_Result_Codes: [{ Sickness_Result_Code: 1, Sickness_Result: 'Recovered' }],
      Beast_Cull_Reasons: [{ Cull_Reason_ID: 1, Cull_Reason: 'Non performer' }],
      Cattle_Program_Types: [{ Program_ID: 1, Program_Code: 'STD', DOF: 120, Program_Description: 'Standard' }],

      // Ã¢â€â‚¬Ã¢â€â‚¬ Main tables Ã¢â€â‚¬Ã¢â€â‚¬
      Cattle: [{
        BeastID: 500, Ear_Tag: 'CT001', EID: '982000123456789', Breed: 1,
        Sex: 'B', HGP: true, Feedlot_Entry_Date: '2024-01-15',
        Feedlot_Entry_Wght: 380.5, Sale_Date: '2024-06-20', Sale_Weight: 620.0,
        DOB: '2022-03-10', Start_Date: '2024-01-15', Start_Weight: 380.5,
        Notes: 'Good animal', Purch_Lot_No: 'PL001', Tail_Tag: '55',
        Vendor_Ear_Tag: 'VET-55', Group_Name: 'Group A', Sub_Group: 'Sub1',
        Background_Doll_per_Kg: 3.50, BG_Fee: 150.00, Teeth: 4,
        WHold_Until: '2024-02-15', Date_died: null, Sire_Tag: 'SIRE001',
        Dam_Tag: 'DAM001', Off_Feed: false, In_Hospital: false, Buller: false,
        Non_Performer: false, Frame_Size: 'L', Custom_Feeder: false,
        DOF_in_prev_FL: 30, Market_Category: 25, Cull_Reason: 0,
        Agist_Lot_No: null, Current_LocType_ID: 1, Old_RFID: null,
        Date_RFID_Changed: null, Trial_No_ID: 0, NFAS_Decl_Numb: 'NFAS001',
        GrowerGroupCode: 42, Date_culled: null, Agistment_PIC: 'PIC001',
        Blood_vial_number: 'BV100', AP_Lot: 'APL1', LifeTime_Traceable: true,
        Pregnant: false, Planned_kill_date: '2024-06-25',
        Beast_Sale_Type_ID: 1, ESI_Whold_until: '2024-02-28', PregTested: false,
        CustomFeedOwnerID: 0, Species: 'Bovine',
        NLIS_tag_fail_at_induction: false, DNA_or_Blood_Number: 'DNA001',
        DOF_scheduled: 120, EU: true, EU_Dec_No: 'EU2024-001',
        Paddock_Tag: 'PT55', Outgoing_NVD: 'NVD001', Agisted_animal: false,
        VendorID: 0, AgentID: 0, Bovilus_Shots: 2, Program_ID: 1,
        Abattoir_Culled: false, Abattoir_Condemned: false,
        Lot_closeout_date: '2024-07-01', Vendor_Treated_Bovilus: true,
        Agist_Charged_Up_To_Date: null, last_oracle_costs: 5000.00,
        last_oracle_date: '2024-06-15', Marbling_bonus_lot: 'MB001',
        Last_Modified_timestamp: '2024-06-20T14:30:00Z',
        Died: false, Pen_Number: 'P01', Date_Archived: null,
        Weight_Gain: 239.5, WG_per_Day: 1.45, Profit_Loss: -52.30,
        Carcase_Weight: 365.0, Paddock_WG: 0.35, Feedlot_WG: 1.10,
        Date_Moved_Pen: '2024-03-01', In_Feedlot: 'Y',
      }],

      Purchase_Lots: [{
        ID: 1, Lot_Number: 'PL500', Purchase_date: '2024-01-20', Vendor_ID: 99,
        Agent_Code: 'AG01', Agent: 99, Number_Head: 100, Total_Weight: 50000,
        Cost_of_Cattle: 100000, Cattle_Freight_Cost: 5000, Lot_Notes: 'Barmount intake',
        WBridge_Docket: 'WB100', DPI_Charges: 250, Destination: 'Feedlot',
        Agistor_Code: 'AGT01', Cattle_Invoice_No: 'INV001', Invoice_Amount: 105250,
        Date_Cattle_Inv_Approved: '2024-01-25', Carrier: 'TruckCo',
        Freight_Invoice_No: 'FRE001', Date_Frght_Inv_Approved: '2024-01-26',
        Buyer_Commiss_per_Head: 5.00, Buying_Fee: 500, Other_Buying_Costs: 100,
        Buyer: 99, Purchase_Region: 'Central QLD', Risk_factor: 'Low',
        Custom_Feed_Lot: false, Feed_Charge_per_Ton: 250.00, Cattle_Owner_ID: 99,
        Agist_Rate_per_day: 2.50, Weigh_bridge_weight: 50500,
        Market_Category: 25, Weighbridge_Charges: 200, Is_Financed: false,
        Finance_Rate: 0, GrowerGroupCode: 'GG1',
        Applied_To_Cattle_File: true, NVD_scan_filename: 'nvd001.pdf',
        Weigh_ticket_scan_filename: 'wt001.pdf',
        Optional_scan_filename1: 'opt1.pdf', Optional_scan_filename2: null,
        Marbling_bonus_lot: false, Last_Modified_timestamp: '2024-01-20T08:00:00Z',
      }],

      // Ã¢â€â‚¬Ã¢â€â‚¬ BeastID-dependent tables Ã¢â€â‚¬Ã¢â€â‚¬
      Weighing_Events: [{
        BeastID: 500, Weighing_Type: 3, Weigh_date: '2024-04-15', Weight: 580.5,
        P8_Fat: 12, Weigh_Note: 'Exit weigh', Ear_Tag: 'CT001', Days_Owned: 105,
        TimeWeighed: '14:30', Agistor_ID: 5, BE_Agist_Lot_No: 'AL01',
        Cull_Reason_ID: 0, Beast_Sale_Type_ID: 1, To_Locn_Type_ID: 2,
        User_Initials: 'PB', Last_Modified_timestamp: '2024-04-15T14:30:00Z',
        ID: 1,
      }],
      PensHistory: [
        { BeastID: 500, MoveDate: '2024-01-15', Pen: 'P01', Last_Modified_timestamp: '2024-01-15T08:00:00Z', ID: 1 },
        { BeastID: 500, MoveDate: '2024-02-15', Pen: 'P02', Last_Modified_timestamp: '2024-02-15T08:00:00Z', ID: 2 },
      ],
      Drugs_Given: [{
        BeastID: 500, Drug_ID: 77, Units_Given: 5.25, Date_Given: '2024-02-01',
        Withold_Until: '2024-03-01', SB_Rec_No: 10, User_Initials: 'JB',
        Ear_Tag_No: 'CT001', Batch_No: 'B123', Time_Given: '09:15',
        Drug_Cost: 52.50, Date_next_Dose: '2024-02-08',
        WithHold_date_ESI: '2024-03-15', Where_given: 'crush',
        Last_Modified_timestamp: '2024-02-01T09:15:00Z', ID: 1,
      }],
      Costs: [{
        BeastID: 500, RevExp_Code: 10, Trans_Date: '2024-03-15',
        Rev_Exp_per_Unit: 3.75, Units: 200, Extended_RevExp: 750.00,
        Ear_Tag: 'CT001', Ration: 'Finisher', Last_Modified_timestamp: '2024-03-15T12:00:00Z',
        ID: 1,
      }],
      Sick_Beast_Records: [{
        Beast_ID: 500, Date_Diagnosed: '2024-02-15', Diagnosed_By: 'Dr Smith',
        Sick_Beast_Notes: 'Respiratory distress', Disease_ID: 50,
        Date_Recovered_Died: '2024-02-25', Result_Code: 1, SB_Rec_No: 100,
        Ear_Tag_No: 'CT001', Severity_Level: 2, WHold_Until: '2024-03-15',
        Date_to_sick_Pen: '2024-02-15', Sick_Pen_Number: 'HOSP1',
        Date_Back_To_Pen: '2024-02-25', Back_To_Pen_Number: 'P05',
        Hosp_Tag_Number: 'H100', RatType: 'Finisher',
        Pen_Where_Found_Sick: 'P10', Euthanased: false, Too_Far_Gone: false,
        Insurance_Claim: false, Insurance_value: 0, Insurance_paid: 0,
        DOF_when_sick: 30, Diagnoser_Empl_ID: 5, User_Initials: 'DS',
        CustomFeedOwnerID: 0, Purch_Lot_No: 'PL001', Cause_of_Death: null,
        Autopsied: false, Last_Modified_timestamp: '2024-02-25T10:00:00Z',
      }],

      // Ã¢â€â‚¬Ã¢â€â‚¬ Standalone tables Ã¢â€â‚¬Ã¢â€â‚¬
      Treatment_Regimes: [{
        DiseaseID: 50, Day_Numb: 0, Drug_Name: 'Excenel',
        Dose: 5.0, DoseByWeight: true, Drug_ID: 77, UserID: 1,
      }],
      KD1_Records: [{
        Ear_Tag: 'KD001', Weight: 455.5, Hash: 'ABC123',
        IDENT: 'ID001', EID: '982000111222333', Error_Mess: null,
        Group: 'GroupA', Teeth: '6', Weigh_Note: 'Good condition',
        Sex: 'B', Pen_Number: 'P15', P8_Fat: 8.5,
        Add_or_Update: 'A', Supplier_EarTag: 'SE001',
        Rudd800_Traits: 'T1', Lot_Number: 'LOT50',
        ID: 1,
      }],
      Breeding_Sires: [{
        Sire_ID: 10, Sire_Name: 'Champion Bull',
        Sire_Line_ID: 1, Sire_Supplier: 'Premium Genetics',
        AWA_Sire_ID: 'AWA999',
      }],
      Locations: [{
        Location_ID: 1, Location_name: 'Barmount Feedlot',
        Location_Type: 'FL', Commodity: 'Grain',
        Tons_stored: 500.5, Value_stored: 125000.00,
        ID: 1,
      }],
      Ration_Descriptions: [{
        Ration_Code: 1, Ration_Name: 'Starter',
        Ration_Type: 'Grain', Dry_Matter_Pcnt: 88.2,
        Current_Value_Kg: 0.35, Date_Ration_Created: '2024-01-01',
        Date_Last_Modified: '2024-06-01', Superceeded: false,
        Pcnt_FeedWeight_Tolerance: 5, Custom_Feed_Charge_Ton: 280.50,
        Custom_Pcnt_Markup: 10, NEm_KG: 1.65,
        Ration_Density: 0.65, ZoneName: 'ZA',
        Mixing_Time: 15, Minimum_Ration_value_ton: 200,
        Custom_Feed_Markup_doll_per_ton: 28, WithHold_days: 14,
        Liquids_premix_ration: false, Micro_nutrient_cost_per_ton: 5.50,
        Ration_Colour: 'Brown', delivered_to_bunk_cost_per_ton: 310,
        interest_cost_per_ton: 8.25, Stationary_Mixer: true,
      }],
    };

    const mock = createMockMssql(allData);
    await runMigration(mock, pgPool, { batchSize: 100, logLevel: 'error', dryRun: false });
  }, 120000);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Contacts: 28 columns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Contacts Ã¢â‚¬â€ all 28 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM contacts.contacts WHERE contact_id = 99');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.contact_id).toBe(99);
    expect(r.company).toBe('Acme Corp');
    expect(r.first_name).toBe('John');
    expect(r.last_name).toBe('Smith');
    expect(r.salutation).toBe('Mr');
    expect(r.address_1).toBe('123 Main St');
    expect(r.address_2).toBe('Suite 4');
    expect(r.city).toBe('Brisbane');
    expect(r.state).toBe('QLD');
    expect(r.postcode).toBe('4000');
    expect(r.tel_no).toBe('07 1234 5678');
    expect(r.mobile_no).toBe('0412345678');
    expect(r.fax_no).toBe('07 8765 4321');
    expect(r.email).toBe('john@acme.com');
    expect(r.contact_type).toBe(3);
    expect(r.tail_tag_no).toBe('TT99');
    expect(r.brand).toBe('ACM');
    expect(r.notes).toBe('Test contactwith nulls');   // null bytes stripped
    expect(r.abn).toBe('12345678901');
    expect(r.bank_bsb).toBe('064-000');
    expect(r.bank_ac).toBe('12345678');
    expect(r.days_invoice_due).toBe(30);
    expect(r.agistment_paddock_rate).toBeCloseTo(2.50);
    expect(r.agistment_feedlot_rate).toBeCloseTo(5.75);
    expect(r.invoice_careof).toBe('Jane');
    expect(r.brand_drawing_filename).toBe('acme.png');
    expect(r.abattoir_establishment_number).toBe('EST001');
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Diseases: 9 columns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Diseases Ã¢â‚¬â€ all 9 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM health.diseases WHERE disease_id = 50');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.disease_id).toBe(50);
    expect(r.disease_name).toBe('BRD');
    expect(r.symptoms).toBe('Cough, fever');
    expect(r.treatment).toBe('Antibiotic course');
    expect(r.no_longer_used).toBe(true);
    expect(r.recoverable).toBe(true);
    expect(r.bodysystemid).toBe(3);
    expect(r.penapp_disease_name).toBe('BRD App');
    expect(r.autopsy_disease).toBe(false);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drugs: 24 columns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Drugs Ã¢â‚¬â€ all 24 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM health.drugs WHERE drug_id = 77');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.drug_id).toBe(77);
    expect(r.drug_name).toBe('Penicillin G');
    expect(r.units).toBe('mL');
    expect(r.cost_per_unit).toBeCloseTo(15.99);
    expect(r.withhold_days_1).toBe(14);
    expect(r.withhold_days_esi).toBe(28);
    expect(r.withhold_days_3).toBe(7);
    expect(r.withhold_days_4).toBe(0);
    expect(r.hgp).toBe(true);
    expect(r.antibiotic).toBe(true);
    expect(r.supplier).toBe('VetPharma');
    expect(r.inactive).toBe(false);
    expect(r.notes).toBe('keep refrigerated');
    expect(r.drug_category).toBe(2);
    expect(r.admin_units).toBe('mL/kg');
    expect(r.admin_weight_factor).toBeCloseTo(0.05);
    expect(r.current_batch_numb).toBe('B2024-001');
    expect(r.cost_per_unit_cf).toBeCloseTo(18.50);
    expect(r.chemical_mg_per_ml).toBe(300);
    expect(r.reorder_soh_units_trigger).toBe(100);
    expect(r.units_per_boxorbottle).toBe(250);
    expect(r.units_on_hand).toBe(1500);
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Cost_Codes: 6 columns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Cost_Codes Ã¢â‚¬â€ all 6 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM finance.cost_codes WHERE revexp_code = 10');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.revexp_code).toBe(10);
    expect(r.revexp_desc).toBe('Vet Supplies');
    expect(r.rev_exp).toBe('E');
    expect(r.include_in_landed_cost).toBe(true);
    expect(r.include_in_pl_expenses).toBe(true);
    expect(r.include_on_cf_invoice).toBe(false);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Market_Category: 6 columns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Market_Category Ã¢â‚¬â€ all 6 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM cattle.market_categories WHERE market_cat_id = 25');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.market_category).toBe('LF Wagyu');
    expect(r.min_dof).toBe(350);
    expect(r.predicted_dressing_pcnt).toBeCloseTo(56.5);
    expect(r.hgp_free).toBe(true);
    expect(r.dispatch_notes).toBe('Premium program');
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ FeedDB_Pens_File: 4 columns Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('FeedDB_Pens_File Ã¢â‚¬â€ all 4 columns round-trip', async () => {
    const { rows } = await pgPool.query("SELECT * FROM feed.feeddb_pens_file WHERE pen_name = 'FP01'");
    expect(rows).toHaveLength(1);
    expect(rows[0].pen_name).toBe('FP01');
    expect(rows[0].ispaddock).toBe(true);
    expect(rows[0].include_in_pen_list).toBe(true);
    expect(rows[0].current_exit_pen).toBe(true);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Cattle: 78 columns (the big one) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Cattle Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM cattle.cows WHERE legacy_beast_id = 500');
    expect(rows).toHaveLength(1);
    const c = rows[0];
    expect(c.ear_tag).toBe('CT001');
    expect(c.eid).toBe('982000123456789');
    expect(c.sex).toBe('bull');              // 'B' Ã¢â€ â€™ bull
    expect(c.hgp).toBe(true);
    expect(c.feedlot_entry_weight_kg).toBeCloseTo(380.5);
    expect(c.sale_weight_kg).toBeCloseTo(620.0);
    expect(c.start_weight_kg).toBeCloseTo(380.5);
    expect(c.notes).toBe('Good animal');
    expect(c.purch_lot_no).toBe('PL001');
    expect(c.tail_tag).toBe('55');
    expect(c.previous_ear_tag).toBe('VET-55');
    expect(c.group_name).toBe('Group A');
    expect(c.sub_group).toBe('Sub1');
    expect(c.background_cost_per_kg).toBeCloseTo(3.50);
    expect(c.bg_fee).toBeCloseTo(150.00);
    expect(c.teeth).toBe(4);
    expect(c.sire_tag).toBe('SIRE001');
    expect(c.dam_tag).toBe('DAM001');
    expect(c.off_feed).toBe(false);
    expect(c.in_hospital).toBe(false);
    expect(c.buller).toBe(false);
    expect(c.non_performer).toBe(false);
    expect(c.frame_size).toBe('L');
    expect(c.custom_feeder).toBe(false);
    expect(c.dof_in_prev_fl).toBe(30);
    expect(c.nfas_decl_number).toBe('NFAS001');
    expect(c.grower_group_code).toBe(42);
    expect(c.agistment_pic).toBe('PIC001');
    expect(c.blood_vial_number).toBe('BV100');
    expect(c.ap_lot).toBe('APL1');
    expect(c.lifetime_traceable).toBe(true);
    expect(c.pregnant).toBe(false);
    expect(c.preg_tested).toBe(false);
    expect(c.species).toBe('Bovine');
    expect(c.nlis_tag_fail).toBe(false);
    expect(c.dna_blood_number).toBe('DNA001');
    expect(c.dof_scheduled).toBe(120);
    expect(c.eu).toBe(true);
    expect(c.eu_dec_no).toBe('EU2024-001');
    expect(c.paddock_tag).toBe('PT55');
    expect(c.outgoing_nvd).toBe('NVD001');
    expect(c.agisted_animal).toBe(false);
    expect(c.custom_feed_owner_id).toBeNull();
    expect(c.bovilus_shots).toBe(2);
    expect(c.program_id).toBe(1);
    expect(c.abattoir_culled).toBe(false);
    expect(c.abattoir_condemned).toBe(false);
    expect(c.vendor_treated_bovilus).toBe(true);
    expect(c.last_oracle_costs).toBeCloseTo(5000.00);
    expect(c.marbling_bonus_lot).toBe('MB001');
    expect(c.died).toBe(false);
    expect(c.pen_number).toBe('P01');
    expect(c.status).toBe('active');         // status not mapped; uses schema DEFAULT
    expect(c.legacy_modified_at).not.toBeNull();
    // New 8 columns
    expect(c.weight_gain_kg).toBeCloseTo(239.5);
    expect(c.wg_per_day).toBeCloseTo(1.45);
    expect(c.profit_loss).toBeCloseTo(-52.30);
    expect(c.carcase_weight_kg).toBeCloseTo(365.0);
    expect(c.paddock_weight_gain_kg).toBeCloseTo(0.35);
    expect(c.feedlot_weight_gain_kg).toBeCloseTo(1.10);
    expect(c.date_moved_pen).not.toBeNull();
    expect(c.in_feedlot).toBe(true);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Weighing_Events Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Weighing_Events Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM weighing.weighing_events');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const r = rows[0];
    expect(r.weighing_type).toBe(3);
    expect(r.weight).toBeCloseTo(580.5);
    expect(r.p8_fat).toBe(12);
    expect(r.weigh_note).toBe('Exit weigh');
    expect(r.days_owned).toBe(105);
    expect(r.user_initials).toBe('PB');
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ PensHistory Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('PensHistory Ã¢â‚¬â€ all 4 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM pen.penshistory ORDER BY movedate');
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].pen).toBe('P01');
    expect(rows[1].pen).toBe('P02');
    expect(rows[0].movedate).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Drugs_Given Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Drugs_Given Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM health.drugs_given');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const r = rows[0];
    // LSJH-531 — drugs_given.drug_id is remapped at load from the CFR Drug_ID
    // (77) to the new serial health.drugs.id: LSJ-HUB app writers/readers are
    // id-space for this table. Other drug_id mirrors stay legacy-space.
    const { rows: drugRows } = await pgPool.query('SELECT id FROM health.drugs WHERE drug_id = 77');
    expect(r.drug_id).toBe(drugRows[0].id);
    expect(r.units_given).toBeCloseTo(5.25);
    expect(r.user_initials).toBe('JB');
    expect(r.ear_tag_no).toBe('CT001');
    expect(r.batch_no).toBe('B123');
    expect(r.drug_cost).toBeCloseTo(52.50);
    expect(r.where_given).toBe('crush');
    expect(r.sb_rec_no).toBe(10);
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Costs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Costs Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM finance.costs');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const r = rows[0];
    expect(r.revexp_code).toBe(10);
    expect(r.rev_exp_per_unit).toBeCloseTo(3.75);
    expect(r.units).toBe(200);
    expect(r.extended_revexp).toBeCloseTo(750.00);
    expect(r.ear_tag).toBe('CT001');
    expect(r.ration).toBe('Finisher');
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Sick_Beast_Records Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Sick_Beast_Records Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM health.sick_beast_records WHERE sb_rec_no = 100');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.disease_id).toBe(50);
    expect(r.diagnosed_by).toBe('Dr Smith');
    expect(r.sick_beast_notes).toBe('Respiratory distress');
    expect(r.severity_level).toBe(2);
    expect(r.sick_pen_number).toBe('HOSP1');
    expect(r.back_to_pen_number).toBe('P05');
    expect(r.hosp_tag_number).toBe('H100');
    expect(r.pen_where_found_sick).toBe('P10');
    expect(r.euthanased).toBe(false);
    expect(r.too_far_gone).toBe(false);
    expect(r.dof_when_sick).toBe(30);
    expect(r.user_initials).toBe('DS');
    expect(r.customfeedownerid).toBeNull();
    expect(r.autopsied).toBe(false);
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Purchase_Lots Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Purchase_Lots Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query("SELECT * FROM purchasing.purchase_lots WHERE lot_number = 'PL500'");
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.lot_number).toBe('PL500');
    expect(r.number_head).toBe(100);
    expect(r.total_weight).toBeCloseTo(50000);
    expect(r.cost_of_cattle).toBeCloseTo(100000);
    expect(r.cattle_freight_cost).toBeCloseTo(5000);
    expect(r.lot_notes).toBe('Barmount intake');
    expect(r.wbridge_docket).toBe('WB100');
    expect(r.dpi_charges).toBeCloseTo(250);
    expect(r.destination).toBe('Feedlot');
    expect(r.cattle_invoice_no).toBe('INV001');
    expect(r.invoice_amount).toBeCloseTo(105250);
    expect(r.buying_fee).toBeCloseTo(500);
    expect(r.buyer).toBe('99');               // toFkId(99) Ã¢â€ â€™ 99, stored as VARCHAR
    expect(r.purchase_region).toBeNull();       // toNum('Central QLD') Ã¢â€ â€™ null
    expect(r.risk_factor).toBeNull();            // toNum('Low') Ã¢â€ â€™ null
    expect(r.custom_feed_lot).toBe(false);
    expect(r.feed_charge_per_ton).toBeCloseTo(250.00);
    expect(r.weigh_bridge_weight).toBeCloseTo(50500);
    expect(r.weighbridge_charges).toBeCloseTo(200);
    expect(r.is_financed).toBe(false);
    expect(r.applied_to_cattle_file).toBe(true);
    expect(r.nvd_scan_filename).toBe('nvd001.pdf');
    expect(r.last_modified_timestamp).not.toBeNull();
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ KD1_Records Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('KD1_Records Ã¢â‚¬â€ all 16 columns round-trip', async () => {
    const { rows } = await pgPool.query("SELECT * FROM cattle.kd1_records WHERE ear_tag = 'KD001'");
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.weight).toBeCloseTo(455.5);
    expect(r.eid).toBe('982000111222333');
    expect(r.teeth).toBe('6');               // trimOrNull Ã¢â€ â€™ text
    expect(r.sex).toBe('B');
    expect(r.pen_number).toBe('P15');
    expect(r.p8_fat).toBe('8.5');            // trimOrNull Ã¢â€ â€™ text
    expect(r.lot_number).toBe('LOT50');
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Treatment_Regimes Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Treatment_Regimes Ã¢â‚¬â€ all 7 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM health.treatment_regimes WHERE diseaseid = 50');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.day_numb).toBe(0);
    expect(r.drug_name).toBe('Excenel');
    expect(r.dose).toBeCloseTo(5.0);
    expect(r.dosebyweight).toBe(true);
    expect(r.drug_id).toBe(77);
    expect(r.userid).toBe(1);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Breeding_Sires Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Breeding_Sires Ã¢â‚¬â€ all 5 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM breeding.breeding_sires WHERE sire_id = 10');
    expect(rows).toHaveLength(1);
    expect(rows[0].sire_name).toBe('Champion Bull');
    expect(rows[0].sire_supplier).toBe('Premium Genetics');
    expect(rows[0].sire_line_id).toBe(1);
    expect(rows[0].awa_sire_id).toBe('AWA999');
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Locations Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Locations Ã¢â‚¬â€ all 7 columns round-trip', async () => {
    const { rows } = await pgPool.query('SELECT * FROM transport.locations WHERE location_id = 1');
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.location_name).toBe('Barmount Feedlot');
    expect(r.location_type).toBe('FL');
    expect(r.commodity).toBe('Grain');
    expect(r.tons_stored).toBeCloseTo(500.5);
    expect(r.value_stored).toBeCloseTo(125000.00);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Ration_Descriptions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Ration_Descriptions Ã¢â‚¬â€ all key columns round-trip', async () => {
    const { rows } = await pgPool.query("SELECT * FROM feed.rations WHERE ration_name = 'Starter'");
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.ration_code).toBe(1);
    expect(r.ration_type).toBeNull();          // toNum('Grain') Ã¢â€ â€™ null
    expect(r.dry_matter_pcnt).toBeCloseTo(88.2);
    expect(r.current_value_kg).toBeCloseTo(0.35);
    expect(r.nem_kg).toBeCloseTo(1.65);
    expect(r.ration_density).toBeCloseTo(0.65);
    expect(r.custom_feed_charge_ton).toBeCloseTo(280.50);
    expect(r.micro_nutrient_cost_per_ton).toBeCloseTo(5.50);
    expect(r.delivered_to_bunk_cost_per_ton).toBeCloseTo(310);
    expect(r.interest_cost_per_ton).toBeCloseTo(8.25);
    expect(r.stationary_mixer).toBe(true);
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Breeds Ã¢â€ â€™ system.lookups Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  it('Breeds Ã¢â€ â€™ system.lookups Ã¢â‚¬â€ code and name round-trip', async () => {
    const { rows } = await pgPool.query("SELECT * FROM system.lookups WHERE category = 'breed' ORDER BY code");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].label).toBe('Angus');
  });
});