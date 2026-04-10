/**
 * _find_notnull_conflicts.js — Find NOT NULL columns in farm-v3 that mappings skip.
 */
const fs = require('fs');
const { mappings } = require('./mappings');

const schema = fs.readFileSync('schema-farm-v3.sql', 'utf8');

// Parse all CREATE TABLE definitions
const tableRegex = /CREATE TABLE IF NOT EXISTS (\S+)\s*\(([\s\S]*?)\);/g;
const tables = {};
let match;
while ((match = tableRegex.exec(schema))) {
  const tableName = match[1];
  const body = match[2];
  const cols = {};
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') || trimmed.startsWith('PRIMARY KEY')) continue;
    // Parse column: name TYPE [NOT NULL] ...
    const colMatch = trimmed.match(/^(\w+)\s+(\S+)(.*)$/);
    if (colMatch) {
      const colName = colMatch[1].toLowerCase();
      const rest = colMatch[3] || '';
      const isNotNull = /\bNOT NULL\b/i.test(rest) && !/DEFAULT/i.test(rest);
      const hasDefault = /DEFAULT/i.test(rest);
      const isPK = /PRIMARY KEY/i.test(rest) || /SERIAL/i.test(colMatch[2]);
      cols[colName] = { notNull: isNotNull, hasDefault, isPK };
    }
  }
  tables[tableName] = cols;
}

// For each mapping, check if its target table has NOT NULL columns not in the mapping
const conflicts = [];
for (const m of mappings) {
  const tbl = m.targetTable;
  const tblDef = tables[tbl];
  if (!tblDef) continue;
  
  const mappedCols = new Set(m.columns.map(c => (typeof c.target === 'string' ? c.target : c.target).toLowerCase()));
  if (m.staticColumns) {
    for (const k of Object.keys(m.staticColumns)) mappedCols.add(k.toLowerCase());
  }
  
  for (const [col, info] of Object.entries(tblDef)) {
    if (info.isPK || info.hasDefault) continue; // Skip PK and DEFAULT columns
    if (info.notNull && !mappedCols.has(col)) {
      conflicts.push({ table: tbl, column: col, source: m.sourceTable });
    }
  }
}

console.log(`Found ${conflicts.length} NOT NULL conflicts:\n`);
for (const c of conflicts) {
  console.log(`  ${c.table}.${c.column} (mapping: ${c.source})`);
}

// Generate ALTER statements to fix
if (conflicts.length > 0) {
  console.log('\n-- Fix SQL:');
  const seen = new Set();
  for (const c of conflicts) {
    const key = `${c.table}.${c.column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`ALTER TABLE ${c.table} ALTER COLUMN ${c.column} DROP NOT NULL;`);
  }
}
