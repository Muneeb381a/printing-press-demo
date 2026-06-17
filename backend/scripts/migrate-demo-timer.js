/**
 * Demo: adds demo_started_at + demo_expires_at to shop_settings.
 * Run from backend/:  node scripts/migrate-demo-timer.js
 */
import 'dotenv/config';
import pool from '../src/config/db.js';

const client = await pool.connect();
try {
  await client.query(`
    ALTER TABLE shop_settings
      ADD COLUMN IF NOT EXISTS demo_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS demo_expires_at  TIMESTAMPTZ
  `);
  console.log('✓ demo_started_at + demo_expires_at columns added to shop_settings');
} catch (err) {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
