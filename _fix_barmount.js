/**
 * Re-migrate tables that failed during initial barmount migration.
 * 
 * Fixes applied to optimized_schema_postgres_v3.sql:
 *   1. kd1_records: "group" → group_name
 *   2. treatment_regimes: user_id → userid
 *   3. livestock_weighbridge_dockets: docket_time/exit_time VARCHAR(5) → VARCHAR(8)
 *   4. weighing_events: CHECK weight > 0 → weight >= 0
 *   5. costs: removed chk_costs_units (legacy negative adjustments)
 *   6. drug_inventory_line_items: drugid NOT NULL → NULL
 */
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'barmount',
});

const DDL = [
  // 1. kd1_records — add group_name column
  `ALTER TABLE cattle.kd1_records ADD COLUMN IF NOT EXISTS group_name VARCHAR(8) NULL`,

  // 2. treatment_regimes — rename user_id → userid
  `DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='health' AND table_name='treatment_regimes' AND column_name='user_id')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='health' AND table_name='treatment_regimes' AND column_name='userid')
     THEN
       ALTER TABLE health.treatment_regimes RENAME COLUMN user_id TO userid;
     ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='health' AND table_name='treatment_regimes' AND column_name='userid')
     THEN
       ALTER TABLE health.treatment_regimes ADD COLUMN userid SMALLINT NULL;
     END IF;
   END $$`,

  // 3. livestock_weighbridge_dockets — widen time columns
  `ALTER TABLE weighing.livestock_weighbridge_dockets ALTER COLUMN docket_time TYPE VARCHAR(8)`,
  `ALTER TABLE weighing.livestock_weighbridge_dockets ALTER COLUMN exit_time TYPE VARCHAR(8)`,

  // 4. weighing_events — fix weight CHECK to allow zero
  `ALTER TABLE weighing.weighing_events DROP CONSTRAINT IF EXISTS chk_weighing_weight`,
  `ALTER TABLE weighing.weighing_events ADD CONSTRAINT chk_weighing_weight CHECK (weight >= 0)`,

  // 5. costs — remove units CHECK (legacy has negative adjustments)
  `ALTER TABLE finance.costs DROP CONSTRAINT IF EXISTS chk_costs_units`,

  // 6. drug_inventory_line_items — allow NULL drugid
  `ALTER TABLE health.drug_inventory_line_items ALTER COLUMN drugid DROP NOT NULL`,

  // 7. Truncate tables that need re-migration (they had errors)
  `TRUNCATE TABLE cattle.kd1_records`,
  `TRUNCATE TABLE health.treatment_regimes CASCADE`,
  `TRUNCATE TABLE weighing.livestock_weighbridge_dockets CASCADE`,
  `TRUNCATE TABLE health.drug_inventory_line_items`,
  // Don't truncate weighing_events/costs/penshistory — only a handful of rows were rejected
];

async function main() {
  console.log('Applying schema fixes to', process.env.DB_NAME, '...\n');
  for (const sql of DDL) {
    const label = sql.slice(0, 80).replace(/\n/g, ' ');
    try {
      await pool.query(sql);
      console.log('  OK:', label);
    } catch (e) {
      console.error('  FAIL:', label, '\n       ', e.message);
    }
  }
  console.log('\nDone. Now re-run: node migrate.js --tables KD1_Records,Treatment_Regimes,Livestock_Weighbridge_Dockets,Drug_Stocktake_records');
  await pool.end();
}
main();
