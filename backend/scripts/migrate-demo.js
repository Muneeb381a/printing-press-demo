/**
 * Demo DB migration — runs all missing migrations in order.
 * Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Run from backend/ directory:  node scripts/migrate-demo.js
 */
import 'dotenv/config';
import pool from '../src/config/db.js';

const steps = [
  {
    name: 'count_in_sqft on categories',
    sql: `ALTER TABLE categories
            ADD COLUMN IF NOT EXISTS count_in_sqft BOOLEAN NOT NULL DEFAULT TRUE`,
  },
  {
    name: 'priority on bills',
    sql: `ALTER TABLE bills
            ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('urgent', 'normal', 'low'));
          CREATE INDEX IF NOT EXISTS idx_bills_priority ON bills (priority)`,
  },
  {
    name: 'whatsapp_phone on shop_settings',
    sql: `ALTER TABLE shop_settings
            ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20) DEFAULT NULL`,
  },
  {
    name: 'shop location columns on shop_settings',
    sql: `ALTER TABLE shop_settings
            ADD COLUMN IF NOT EXISTS shop_lat            NUMERIC(10,7) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS shop_lng            NUMERIC(10,7) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS attendance_radius_m INTEGER       DEFAULT 100`,
  },
  {
    name: 'rate_list_categories table',
    sql: `CREATE TABLE IF NOT EXISTS rate_list_categories (
            id         SERIAL PRIMARY KEY,
            name       VARCHAR(100) NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`,
  },
  {
    name: 'rate_list_items table',
    sql: `CREATE TABLE IF NOT EXISTS rate_list_items (
            id          SERIAL PRIMARY KEY,
            category_id INTEGER REFERENCES rate_list_categories(id) ON DELETE CASCADE,
            name        VARCHAR(200) NOT NULL,
            name_ur     VARCHAR(200),
            description TEXT,
            unit        VARCHAR(50) DEFAULT 'sqft',
            price       NUMERIC(12,2) NOT NULL DEFAULT 0,
            min_order   VARCHAR(100),
            notes       TEXT,
            is_active   BOOLEAN DEFAULT TRUE,
            sort_order  INTEGER DEFAULT 0,
            created_at  TIMESTAMPTZ DEFAULT NOW()
          )`,
  },
  {
    name: 'category_inventory_map table',
    sql: `CREATE TABLE IF NOT EXISTS category_inventory_map (
            id                SERIAL PRIMARY KEY,
            category_id       INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
            qty_per_unit      NUMERIC(12,4) NOT NULL DEFAULT 1,
            use_sqft          BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE (category_id, inventory_item_id)
          );
          CREATE INDEX IF NOT EXISTS idx_cim_category ON category_inventory_map (category_id);
          CREATE INDEX IF NOT EXISTS idx_cim_item     ON category_inventory_map (inventory_item_id)`,
  },
  {
    name: 'payroll table',
    sql: `CREATE TABLE IF NOT EXISTS payroll (
            id            SERIAL PRIMARY KEY,
            employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            year          SMALLINT NOT NULL,
            month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
            working_days  INTEGER       NOT NULL DEFAULT 0,
            present_days  NUMERIC(5,2)  NOT NULL DEFAULT 0,
            absent_days   NUMERIC(5,2)  NOT NULL DEFAULT 0,
            leave_days    NUMERIC(5,2)  NOT NULL DEFAULT 0,
            half_days     NUMERIC(5,2)  NOT NULL DEFAULT 0,
            gross_salary  NUMERIC(10,2) NOT NULL DEFAULT 0,
            daily_rate    NUMERIC(10,4) NOT NULL DEFAULT 0,
            deduction     NUMERIC(10,2) NOT NULL DEFAULT 0,
            bonus         NUMERIC(10,2) NOT NULL DEFAULT 0,
            net_salary    NUMERIC(10,2) NOT NULL DEFAULT 0,
            notes         TEXT,
            status        VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'paid')),
            paid_at       TIMESTAMPTZ,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (employee_id, year, month)
          )`,
  },
];

let passed = 0;
let failed = 0;

for (const step of steps) {
  try {
    // Some steps contain multiple statements separated by ;
    for (const stmt of step.sql.split(';').map(s => s.trim()).filter(Boolean)) {
      await pool.query(stmt);
    }
    console.log(`  ✓ ${step.name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${step.name}: ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed.`);
await pool.end();
process.exit(failed > 0 ? 1 : 0);
