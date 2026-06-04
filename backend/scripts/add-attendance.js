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
    : { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 5432, database: process.env.DB_NAME || 'printing_press', user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '' }
);

const sql = readFileSync(join(__dirname, '../../database/add_attendance.sql'), 'utf8');

const client = await pool.connect();
try {
  await client.query(sql);
  console.log('✅ employees + attendance tables created');
} catch (e) {
  console.error('❌', e.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
