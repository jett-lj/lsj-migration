/**
 * Transform mappings.js — Phase 1: Table renames + safe universal column renames only.
 * 
 * Missing columns will be added to schema-farm-v3.sql in Phase 2.
 * 
 * Usage: node _transform_mappings_v2.js [--dry-run]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');

// ── Table renames (optimized → farm-v3) ─────────────────
const TABLE_RENAMES = {
  'cattle.cattle':                          'cattle.cows',
  'cattle.cattleprocessed':                 'cattle.cattle_processed',
  'cattle.beastmovement':                   'cattle.beast_movements',
  'cattle.beast_cull_reasons':              'cattle.cull_reasons',
  'cattle.market_category':                 'cattle.market_categories',
  'cattle.purch_lot_cattle':                'cattle.purchase_lot_cattle',
  'cattle.tag_bucket_file':                 'cattle.tag_bucket',
  'cattle.beast_ohead_appl_history':        'cattle.overhead_application_history',
  'cattle.nlis_transfers':                  'operations.nlis_transfers',
  'cattle.rfid_scan_sessions':              'operations.rfid_scan_sessions',
  'feed.rationnames':                       'feed.rations',
  'feed.bunk_call_sessions':                'operations.bunk_call_sessions',
  'feed.bunk_call_entries':                 'operations.bunk_call_entries',
  'health.drug_disposal':                   'health.drug_disposals',
  'health.sick_beast_temperature':          'health.sick_beast_temperatures',
  'health.drugs_purchase_event':            'health.drug_purchase_events',
  'finance.overhead_application_history':   'cattle.overhead_application_history',
  'finance.scu_rec_data':                   'reporting.scu_rec_data',
  'finance.stock_rec_data':                 'reporting.stock_rec_data',
  'pen.batch_pen_operations':               'operations.batch_pen_operations',
  'pen.pen_list_snapshots':                 'cattle.pen_list_snapshots',
  'weighing.weighbridge_dockets':           'operations.weighbridge_dockets',
  'transport.transport_dispatches':         'operations.transport_dispatches',
  'transport.transport_dispatch_items':     'operations.transport_dispatch_items',
  'system.archiving_log':                   'operations.archiving_log',
  'system.drafting_settings':               'operations.drafting_settings',
  'system.agent_issues':                    'operations.agent_issues',
  'system.archives':                        'operations.archives',
};

// ── Only SAFE column renames that won't cause cross-table conflicts ──
// These are columns whose name is unique enough to replace globally.
// We keep mappings.js column names AS-IS and add any missing columns to the schema.

function applyTransforms(content) {
  let result = content;
  let tableRenames = 0;

  // Apply table renames
  for (const [oldName, newName] of Object.entries(TABLE_RENAMES)) {
    const regex = new RegExp(`targetTable:\\s*'${oldName.replace(/\./g, '\\.')}'`, 'g');
    const newStr = `targetTable: '${newName}'`;
    const count = (result.match(regex) || []).length;
    if (count > 0) {
      result = result.replace(regex, newStr);
      tableRenames += count;
      console.log(`  TABLE: ${oldName} → ${newName} (${count})`);
    }
  }

  console.log(`\nTotal: ${tableRenames} table renames applied`);
  return result;
}

// ── Main ────────────────────────────────────────────────
const mappingsPath = path.join(__dirname, 'mappings.js');
const content = fs.readFileSync(mappingsPath, 'utf8');
const transformed = applyTransforms(content);

if (dryRun) {
  console.log('\n=== DRY RUN — no changes written ===');
} else {
  fs.writeFileSync(mappingsPath, transformed, 'utf8');
  console.log('\n✓ mappings.js updated');
}

// ── Validate and collect missing items ──────────────────
console.log('\n=== VALIDATION ===');

function parseSchema(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  const tableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([\w.]+)\s*\(/gi;
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const startIdx = match.index + match[0].length;
    let depth = 1, i = startIdx;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      if (sql[i] === ')') depth--;
      i++;
    }
    const body = sql.slice(startIdx, i - 1);
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
        if (['partition', 'like', 'inherits', 'tablespace'].includes(colName)) continue;
        columns.push(colName);
      }
    }
    tables[tableName] = columns;
  }
  return tables;
}

// Also parse optimized schema for column definitions
function parseSchemaWithTypes(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  const tableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([\w.]+)\s*\(/gi;
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const startIdx = match.index + match[0].length;
    let depth = 1, i = startIdx;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      if (sql[i] === ')') depth--;
      i++;
    }
    const body = sql.slice(startIdx, i - 1);
    const columns = {};
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') ||
          trimmed.startsWith('PRIMARY') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('FOREIGN') ||
          trimmed.startsWith(')')) continue;
      const colMatch = trimmed.match(/^"?(\w+)"?\s+(.+?)(?:,?\s*$)/);
      if (colMatch) {
        const colName = colMatch[1].toLowerCase();
        if (['partition', 'like', 'inherits', 'tablespace'].includes(colName)) continue;
        // Clean the type definition — remove trailing comma, inline REFERENCES
        let typeDef = colMatch[2].replace(/,\s*$/, '').trim();
        // Remove inline REFERENCES clauses for portability
        typeDef = typeDef.replace(/\s+REFERENCES\s+\S+\s*\([^)]*\)\s*(ON\s+\w+\s+\w+\s*)*/gi, '').trim();
        columns[colName] = typeDef;
      }
    }
    tables[tableName] = columns;
  }
  return tables;
}

const schema = parseSchema(path.join(__dirname, 'schema-farm-v3.sql'));
const optimizedSchema = parseSchemaWithTypes(path.join(__dirname, 'optimized_schema_postgres_v3.sql'));

// Reverse table rename map to find original table name
const REVERSE_RENAMES = {};
for (const [old, nw] of Object.entries(TABLE_RENAMES)) REVERSE_RENAMES[nw] = old;

const transformedContent = dryRun ? transformed : fs.readFileSync(mappingsPath, 'utf8');
const allBlocks = transformedContent.match(/\{\s*order:\s*\d+[\s\S]*?\n  \}/g) || [];
console.log(`Found ${allBlocks.length} mapping blocks`);

const missingTables = new Set();
const missingCols = {};  // table → Set<col>

for (const block of allBlocks) {
  const tableMatch = block.match(/targetTable:\s*'([^']+)'/);
  if (!tableMatch) continue;
  const table = tableMatch[1];

  if (!schema[table]) {
    missingTables.add(table);
    continue;
  }

  const colRegex = /target:\s*'([^']+)'/g;
  let cm;
  while ((cm = colRegex.exec(block)) !== null) {
    const col = cm[1];
    if (!schema[table].includes(col)) {
      if (!missingCols[table]) missingCols[table] = new Set();
      missingCols[table].add(col);
    }
  }

  const staticMatch = block.match(/staticColumns:\s*\{([^}]+)\}/);
  if (staticMatch) {
    const staticKeys = staticMatch[1].match(/(\w+)\s*:/g);
    if (staticKeys) {
      for (const sk of staticKeys) {
        const key = sk.replace(/\s*:$/, '');
        if (!schema[table].includes(key)) {
          if (!missingCols[table]) missingCols[table] = new Set();
          missingCols[table].add(key);
        }
      }
    }
  }
}

// Generate ALTER TABLE statements for missing columns
console.log('\n=== MISSING TABLES ===');
for (const t of [...missingTables].sort()) {
  console.log(`  ${t}`);
}

console.log('\n=== ALTER TABLE STATEMENTS FOR MISSING COLUMNS ===');
const alterStatements = [];
for (const [table, cols] of Object.entries(missingCols).sort()) {
  // Find the original table name (before rename) to look up column types
  const origTable = REVERSE_RENAMES[table] || table;
  const origCols = optimizedSchema[origTable] || {};
  
  for (const col of [...cols].sort()) {
    let typeDef = origCols[col];
    if (!typeDef) {
      // Try common types
      if (col.endsWith('_date') || col.startsWith('date_')) typeDef = 'TIMESTAMP';
      else if (col.endsWith('_id')) typeDef = 'INTEGER';
      else if (col === 'notes' || col === 'description') typeDef = 'TEXT';
      else typeDef = 'TEXT';  // default fallback
    }
    // Remove NOT NULL constraint for added columns (data may be null)
    typeDef = typeDef.replace(/\s+NOT\s+NULL/gi, '').trim();
    // Remove DEFAULT clauses with specific values that might not apply
    // Keep simple defaults like DEFAULT false, DEFAULT 0
    alterStatements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${typeDef};`);
  }
}

// Write the ALTER statements to a file
const alterPath = path.join(__dirname, '_add_missing_columns.sql');
const alterContent = `-- Auto-generated: add missing legacy columns to schema-farm-v3 tables
-- These columns exist in optimized_schema but not in schema-farm-v3.
-- They're needed to preserve all legacy data during migration.
-- Generated: ${new Date().toISOString()}

${alterStatements.join('\n')}

-- Missing tables need full CREATE TABLE statements (see below)
${[...missingTables].sort().map(t => `-- TODO: CREATE TABLE ${t} (...);`).join('\n')}
`;

fs.writeFileSync(alterPath, alterContent, 'utf8');
console.log(`\n✓ ${alterStatements.length} ALTER statements written to _add_missing_columns.sql`);
console.log(`✓ ${missingTables.size} missing tables noted`);
