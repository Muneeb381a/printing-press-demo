import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host: process.env.DB_HOST || 'localhost', port: 5432, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD }
);

const sql = readFileSync(join(__dirname, '../../database/add_inventory.sql'), 'utf8');

const client = await pool.connect();
try {
  await client.query(sql);
  console.log('✅ inventory tables created');
} catch (e) {
  // Already exists errors are fine to ignore individually
  if (e.code === '42P07' || e.message.includes('already exists')) {
    console.log('ℹ️ Some objects already exist, trying statement by statement…');
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { await client.query(stmt); } catch (err) {
        if (!err.message.includes('already exists')) console.warn('⚠️', err.message);
      }
    }
    console.log('✅ Done');
  } else {
    console.error('❌', e.message);
    process.exit(1);
  }
} finally {
  client.release();
  await pool.end();
}
