import pool from '../../config/db.js';

export const findAll = () =>
  pool.query(
    `SELECT id, username, full_name, email, role, is_active, employee_id, created_at
     FROM users
     WHERE role = 'employee'
     ORDER BY created_at ASC`
  );

// All HR employees with their login account (if any) — for the Employee Accounts page
export const findEmployeesWithAccounts = () =>
  pool.query(
    `SELECT
       e.id          AS employee_id,
       e.name        AS employee_name,
       e.role        AS hr_role,
       e.status      AS hr_status,
       u.id          AS user_id,
       u.username,
       u.full_name,
       u.is_active,
       u.created_at  AS account_created_at
     FROM   employees e
     LEFT   JOIN users u ON u.employee_id = e.id AND u.role = 'employee'
     WHERE  e.status = 'active'
     ORDER  BY e.name ASC`
  );

export const findById = (id) =>
  pool.query(
    `SELECT id, username, full_name, email, password_hash, role, is_active, employee_id, session_token
     FROM users WHERE id = $1`,
    [id]
  );

export const findByLogin = (login) =>
  pool.query(
    `SELECT id, username, full_name, email, password_hash, role, is_active, session_token
     FROM users
     WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1))
       AND is_active = true
     LIMIT 1`,
    [login]
  );

export const create = ({ username, fullName, passwordHash, employeeId, createdBy }) =>
  pool.query(
    `INSERT INTO users (username, full_name, password_hash, role, is_active, employee_id, created_by)
     VALUES ($1, $2, $3, 'employee', true, $4, $5)
     RETURNING id, username, full_name, role, is_active, employee_id`,
    [username, fullName ?? null, passwordHash, employeeId ?? null, createdBy ?? null]
  );

export const update = (id, { fullName, isActive }) =>
  pool.query(
    `UPDATE users
     SET full_name  = COALESCE($2, full_name),
         is_active  = COALESCE($3, is_active),
         updated_at = NOW()
     WHERE id = $1 AND role = 'employee'
     RETURNING id, username, full_name, role, is_active`,
    [id, fullName ?? null, isActive ?? null]
  );

export const updatePassword = (id, passwordHash) =>
  pool.query(
    `UPDATE users
     SET password_hash = $2, session_token = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, passwordHash]
  );

export const setSessionToken = (id, sessionToken) =>
  pool.query(
    `UPDATE users SET session_token = $2, updated_at = NOW() WHERE id = $1`,
    [id, sessionToken ?? null]
  );

export const deactivate = (id) =>
  pool.query(
    `UPDATE users
     SET is_active = false, session_token = NULL, updated_at = NOW()
     WHERE id = $1 AND role = 'employee'
     RETURNING id, username`,
    [id]
  );
