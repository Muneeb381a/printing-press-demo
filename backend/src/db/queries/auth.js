import pool from '../../config/db.js';

export const findByLogin = (login) =>
  pool.query(
    `SELECT id, username, full_name, email, password_hash, role, is_active, session_token
     FROM users
     WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
       AND is_active = true
     LIMIT 1`,
    [login]
  );

export const findById = (id) =>
  pool.query(
    `SELECT id, password_hash, role, is_active FROM users WHERE id = $1`,
    [id]
  );

export const setSessionToken = (userId, sessionToken) =>
  pool.query(
    `UPDATE users SET session_token = $2, updated_at = NOW() WHERE id = $1`,
    [userId, sessionToken ?? null]
  );

export const updatePassword = (userId, passwordHash) =>
  pool.query(
    `UPDATE users SET password_hash = $2, session_token = NULL, updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [userId, passwordHash]
  );
