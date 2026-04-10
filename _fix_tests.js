/**
 * _fix_tests.js — Update test files with renamed table names.
 */
const fs = require('fs');
const path = require('path');

const RENAMES = [
  // [regex, replacement] — order matters, most specific first
  [/cattle\.cattle(?!_)/g, 'cattle.cows'],
  [/cattle\.market_category(?!_|s)/g, 'cattle.market_categories'],
  [/health\.drug_disposal(?!_|s)/g, 'health.drug_disposals'],
  [/health\.drugs_purchase_event(?!_|s)/g, 'health.drug_purchase_events'],
];

const files = [
  path.join(__dirname, 'tests', 'migration.test.js'),
  path.join(__dirname, 'tests', 'column-coverage.test.js'),
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let totalFixes = 0;
  for (const [pattern, replacement] of RENAMES) {
    const matches = content.match(pattern);
    if (matches) {
      totalFixes += matches.length;
      content = content.replace(pattern, replacement);
    }
  }
  fs.writeFileSync(f, content, 'utf8');
  console.log(`${path.basename(f)}: ${totalFixes} replacements`);
}
