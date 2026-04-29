/**
 * Sequential per-farm migration orchestrator.
 *
 * For each farm with .bak files in Cattle_databases/:
 *   1. Restore CATTLE / CATTLE_feed / CATTLE_Feedtrans into SQL Server
 *      (drops any companion DB the farm doesn't ship)
 *   2. Run `node migrate.js` with DB_NAME=<farm_slug> pointing at the
 *      pre-created PG database
 *   3. Stop immediately on the first failure so it can be diagnosed
 *
 * Usage:
 *   node _migrate_all_farms.js                    # all farms with .bak files
 *   node _migrate_all_farms.js --skip Barmount,"Rangers Valley"
 *   node _migrate_all_farms.js --only "Anna Plains Feedlot"
 *   node _migrate_all_farms.js --resume "Cadelga Cattle Co"   # start from this farm
 *   node _migrate_all_farms.js --dry-run-list    # show what would run, don't execute
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, 'Cattle_databases');
const SKIP_FOLDERS = new Set(['RV_SQL_databases']);

// Mirror _create_farm_dbs.js slug rules exactly
function slugify(name) {
  let s = name.toLowerCase()
    .replace(/&/g, '_and_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (!/^[a-z_]/.test(s)) s = 'farm_' + s;
  if (s.length > 63) s = s.slice(0, 63).replace(/_+$/, '');
  return s;
}

function findFarmsWithBaks() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP_FOLDERS.has(d.name))
    .map(d => d.name)
    .filter(name => fs.readdirSync(path.join(ROOT, name)).some(f => /\.bak$/i.test(f)))
    .sort();
}

function parseArgs(argv) {
  const out = { skip: new Set(), only: null, resume: null, dryRunList: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip' && argv[i + 1])   { argv[++i].split(',').forEach(x => out.skip.add(x.trim())); }
    else if (a === '--only' && argv[i + 1])   { out.only = argv[++i]; }
    else if (a === '--resume' && argv[i + 1]) { out.resume = argv[++i]; }
    else if (a === '--dry-run-list') { out.dryRunList = true; }
  }
  return out;
}

function runStep(label, cmd, args, env) {
  console.log(`\n──── ${label} ────`);
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    // shell:false (default) avoids cmd.exe mangling node.exe path with spaces
  });
  if (r.status !== 0) {
    throw new Error(`${label} failed (exit ${r.status})`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  let farms = findFarmsWithBaks();

  if (args.only) {
    if (!farms.includes(args.only)) {
      console.error(`[ERROR] --only "${args.only}" not in list of farms with backups`);
      process.exit(1);
    }
    farms = [args.only];
  }
  if (args.resume) {
    const idx = farms.indexOf(args.resume);
    if (idx < 0) {
      console.error(`[ERROR] --resume "${args.resume}" not found`);
      process.exit(1);
    }
    farms = farms.slice(idx);
  }
  farms = farms.filter(f => !args.skip.has(f));

  console.log(`\nPlan: migrate ${farms.length} farm(s):\n`);
  for (const f of farms) {
    console.log(`  ${f.padEnd(35)} → ${slugify(f)}`);
  }

  if (args.dryRunList) {
    console.log('\n--dry-run-list specified; not running.');
    return;
  }

  const startedAt = Date.now();
  const results = [];

  for (let i = 0; i < farms.length; i++) {
    const farm = farms[i];
    const slug = slugify(farm);
    const t0 = Date.now();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[${i + 1}/${farms.length}]  ${farm}   →   PG db: ${slug}`);
    console.log(`${'='.repeat(70)}`);

    try {
      // Step 1 — restore .bak files
      runStep(
        `Restore .bak files for ${farm}`,
        process.execPath,
        ['_restore_farm.js', farm],
        {}
      );

      // Step 2 — run migration into farm-specific PG database
      // Bump V8 heap to 8GB: large farms (e.g. Barmount Costs_Feed_Detail at
      // 16M rows) run multiple big tables in parallel and exhaust the default
      // ~1.7GB heap, causing a silent crash with no stderr.
      runStep(
        `Migrate ${farm} → ${slug}`,
        process.execPath,
        ['migrate.js'],
        {
          DB_NAME: slug,
          NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=8192`.trim(),
        }
      );

      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n[OK] ${farm} complete in ${secs}s`);
      results.push({ farm, slug, ok: true, secs });
    } catch (err) {
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.error(`\n[FAIL] ${farm} after ${secs}s — ${err.message}`);
      results.push({ farm, slug, ok: false, secs, error: err.message });
      console.error(`\nStopping per --stop-on-error policy.`);
      console.error(`To resume after fix:  node _migrate_all_farms.js --resume "${farm}"`);
      break;
    }
  }

  const totalSecs = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Summary  (total: ${totalSecs}s)`);
  console.log(`${'='.repeat(70)}`);
  for (const r of results) {
    const tag = r.ok ? '[OK]  ' : '[FAIL]';
    console.log(`  ${tag} ${r.farm.padEnd(35)} → ${r.slug.padEnd(45)} ${r.secs}s`);
  }
  const okCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;
  const skipped = farms.length - results.length;
  console.log(`\nOK: ${okCount}, Failed: ${failCount}, Not attempted: ${skipped}`);

  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
