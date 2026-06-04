import pool from '../../config/db.js';

export const findAll = () =>
  pool.query(
    `SELECT id, name, phone, role, salary, join_date, status, created_at
     FROM   employees
     ORDER  BY name ASC`
  );

export const findById = (id) =>
  pool.query(`SELECT * FROM employees WHERE id = $1`, [id]);

export const create = ({ name, phone, role, salary, joinDate, status }) =>
  pool.query(
    `INSERT INTO employees (name, phone, role, salary, join_date, status)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, phone || null, role || 'Staff', salary || 0, joinDate || null, status || 'active']
  );

export const update = (id, { name, phone, role, salary, joinDate, status }) =>
  pool.query(
    `UPDATE employees
     SET name      = COALESCE($2, name),
         phone     = COALESCE($3, phone),
         role      = COALESCE($4, role),
         salary    = COALESCE($5, salary),
         join_date = COALESCE($6, join_date),
         status    = COALESCE($7, status),
         updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, name, phone, role, salary, joinDate, status]
  );

export const remove = (id) =>
  pool.query(`DELETE FROM employees WHERE id = $1 RETURNING id`, [id]);
