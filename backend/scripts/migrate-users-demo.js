/**
 * Demo: creates users table + seeds the demo owner account.
 * Run from backend/:  node scripts/migrate-users-demo.js
 */
import 'dotenv/config';
import { randomBytes, pbkdf2Sync } from 'crypto';
import pool from '../src/config/db.js';

const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const client = await pool.connect();
try {
  await client.query('BEGIN');

  // 1. Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      full_name     VARCHAR(100),
      email         VARCHAR(255),
      password_hash TEXT NOT NULL,
      role          VARCHAR(20) NOT NULL DEFAULT 'employee'
                      CHECK (role IN ('owner', 'employee')),
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      session_token UUID,
      employee_id   INTEGER REFERENCES employees(id) ON DELETE SET NULL,
      created_by    INTEGER REFERENCES users(id)     ON DELETE SET NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users (employee_id)`);
  console.log('✓ users table created');

  // 2. Add created_by to bills
  await client.query(`
    ALTER TABLE bills
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills (created_by)`);
  console.log('✓ bills.created_by column added');

  // 3. Seed demo owner (printing / printing123)
  const adminUser = process.env.ADMIN_USERNAME || 'printing';
  const adminPass = process.env.ADMIN_PASSWORD || 'printing123';
  const passwordHash = hashPassword(adminPass);

  await client.query(`
    INSERT INTO users (username, full_name, password_hash, role, is_active)
    VALUES ($1, 'Demo Owner', $2, 'owner', true)
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role          = 'owner',
      is_active     = true
  `, [adminUser, passwordHash]);
  console.log(`✓ Demo owner account seeded (username: ${adminUser})`);

  await client.query('COMMIT');
  console.log('\n✅ Done — demo now supports full multi-user auth.');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
