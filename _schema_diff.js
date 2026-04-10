/**
 * Parse both schemas and produce a rename map showing all table/column differences.
 * Output: JSON file with { tableRenames, columnRenames } 
 */
'use strict';
const fs = require('fs');
const path = require('path');

function parseSchema(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  // Match CREATE TABLE [IF NOT EXISTS] schema.table_name (
  const tableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([\w.]+)\s*\(/gi;
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const startIdx = match.index + match[0].length;
    // Find matching closing paren by counting parens
    let depth = 1;
    let i = startIdx;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      if (sql[i] === ')') depth--;
      i++;
    }
    const body = sql.slice(startIdx, i - 1);
    // Extract column names (first word of each line that isn't a constraint/comment)
    const columns = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') ||
          trimmed.startsWith('PRIMARY') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('FOREIGN') ||
          trimmed.startsWith(')')) continue;
      const colMatch = trimmed.match(/^"?(\w+)"?\s+/);
      if (colMatch) {
        const colName = colMatch[1].toLowerCase();
        // Skip SQL keywords that look like columns
        if (['partition', 'like', 'inherits', 'tablespace'].includes(colName)) continue;
        columns.push(colName);
      }
    }
    tables[tableName] = columns;
  }
  return tables;
}

const optimized = parseSchema(path.join(__dirname, 'optimized_schema_postgres_v3.sql'));
const farmV3 = parseSchema(path.join(__dirname, 'schema-farm-v3.sql'));

console.log('=== OPTIMIZED SCHEMA ===');
console.log('Tables:', Object.keys(optimized).length);
console.log('\n=== SCHEMA-FARM-V3 ===');
console.log('Tables:', Object.keys(farmV3).length);

// Find table name differences
console.log('\n=== TABLES IN OPTIMIZED BUT NOT IN FARM-V3 ===');
const missingInFarmV3 = Object.keys(optimized).filter(t => !farmV3[t]);
for (const t of missingInFarmV3) {
  // Check if there's a table with same base name in different schema
  const baseName = t.split('.')[1];
  const candidates = Object.keys(farmV3).filter(f => f.endsWith('.' + baseName));
  if (candidates.length) {
    console.log(`  ${t} → possible match: ${candidates.join(', ')}`);
  } else {
    console.log(`  ${t} → NO MATCH`);
  }
}

console.log('\n=== TABLES IN FARM-V3 BUT NOT IN OPTIMIZED ===');
const missingInOptimized = Object.keys(farmV3).filter(t => !optimized[t]);
for (const t of missingInOptimized) {
  const baseName = t.split('.')[1];
  const candidates = Object.keys(optimized).filter(f => f.endsWith('.' + baseName));
  if (candidates.length) {
    console.log(`  ${t} → possible match: ${candidates.join(', ')}`);
  } else {
    console.log(`  ${t} → NO MATCH (farm-v3 only)`);
  }
}

// For tables that exist in BOTH schemas, compare columns
console.log('\n=== COLUMN DIFFERENCES (tables present in both) ===');
const commonTables = Object.keys(optimized).filter(t => farmV3[t]);
for (const t of commonTables) {
  const optCols = new Set(optimized[t]);
  const fv3Cols = new Set(farmV3[t]);
  const onlyOpt = [...optCols].filter(c => !fv3Cols.has(c));
  const onlyFv3 = [...fv3Cols].filter(c => !optCols.has(c));
  if (onlyOpt.length || onlyFv3.length) {
    console.log(`\n  ${t}:`);
    if (onlyOpt.length) console.log(`    Only in optimized: ${onlyOpt.join(', ')}`);
    if (onlyFv3.length) console.log(`    Only in farm-v3:   ${onlyFv3.join(', ')}`);
  }
}

// Specifically look at the cattle table rename
console.log('\n=== CATTLE TABLE COMPARISON ===');
if (optimized['cattle.cattle'] && farmV3['cattle.cows']) {
  const optCols = optimized['cattle.cattle'];
  const fv3Cols = farmV3['cattle.cows'];
  console.log(`cattle.cattle columns (${optCols.length}):`, optCols.join(', '));
  console.log(`cattle.cows columns (${fv3Cols.length}):`, fv3Cols.join(', '));
}

// Output the mapping tables for targetTable renames needed in mappings.js
console.log('\n=== TARGET TABLE RENAMES NEEDED ===');
// Get all targetTable values from mappings.js
const mappingsContent = fs.readFileSync(path.join(__dirname, 'mappings.js'), 'utf8');
const targetTableRegex = /targetTable:\s*'([^']+)'/g;
const targetTables = new Set();
let m;
while ((m = targetTableRegex.exec(mappingsContent)) !== null) {
  targetTables.add(m[1]);
}
console.log('Unique target tables in mappings.js:', targetTables.size);
for (const tt of [...targetTables].sort()) {
  const inFarmV3 = !!farmV3[tt];
  if (!inFarmV3) {
    // check for a rename candidate
    const baseName = tt.split('.')[1];
    const candidates = Object.keys(farmV3).filter(f => f.endsWith('.' + baseName) || f.split('.')[1].includes(baseName.replace(/_/g, '')));
    console.log(`  ${tt} → NOT in farm-v3${candidates.length ? ' (candidates: ' + candidates.join(', ') + ')' : ''}`);
  }
}
