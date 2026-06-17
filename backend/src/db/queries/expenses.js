import pool from '../../config/db.js';

export const findAll = ({ type = null, category = null, from = null, to = null, search = '', limit = 100, offset = 0 } = {}) =>
  pool.query(
    `SELECT e.id, e.title, e.amount, e.type, e.category, e.payment_method,
            e.expense_date, e.notes, e.created_at,
            COUNT(*) OVER() AS total_count
     FROM   expenses e
     WHERE  ($1::text IS NULL OR e.type = $1)
       AND  ($2::text IS NULL OR e.category = $2)
       AND  ($3::date IS NULL OR e.expense_date >= $3::date)
       AND  ($4::date IS NULL OR e.expense_date <= $4::date)
       AND  ($5 = '' OR e.title ILIKE $5 OR e.notes ILIKE $5)
     ORDER  BY e.expense_date DESC, e.id DESC
     LIMIT  $6 OFFSET $7`,
    [type, category, from, to, search ? `%${search}%` : '', limit, offset]
  );

export const findById = (id) =>
  pool.query(`SELECT * FROM expenses WHERE id = $1`, [id]);

export const create = ({ title, amount, type, category, paymentMethod, expenseDate, notes }) =>
  pool.query(
    `INSERT INTO expenses (title, amount, type, category, payment_method, expense_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, amount, type || 'OUT', category || null, paymentMethod || 'cash', expenseDate || new Date(), notes || null]
  );

export const update = (id, { title, amount, type, category, paymentMethod, expenseDate, notes }) =>
  pool.query(
    `UPDATE expenses
     SET title          = COALESCE($2, title),
         amount         = COALESCE($3, amount),
         type           = COALESCE($4, type),
         category       = COALESCE($5, category),
         payment_method = COALESCE($6, payment_method),
         expense_date   = COALESCE($7, expense_date),
         notes          = COALESCE($8, notes)
     WHERE id = $1
     RETURNING *`,
    [id, title, amount, type, category, paymentMethod, expenseDate, notes]
  );

export const remove = (id) =>
  pool.query(`DELETE FROM expenses WHERE id = $1 RETURNING id`, [id]);

export const getSummary = ({ from = null, to = null } = {}) =>
  pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE type = 'OUT'), 0)  AS total_out,
       COALESCE(SUM(amount) FILTER (WHERE type = 'IN'),  0)  AS total_in,
       COALESCE(SUM(CASE WHEN type='IN' THEN amount ELSE -amount END), 0) AS net_balance,
       COUNT(*) FILTER (WHERE type = 'OUT')                  AS out_count,
       COUNT(*) FILTER (WHERE type = 'IN')                   AS in_count,
       COUNT(*)                                               AS total_count,
       COALESCE(SUM(amount) FILTER (WHERE type='OUT' AND expense_date >= DATE_TRUNC('month', NOW())), 0) AS this_month_out,
       COALESCE(SUM(amount) FILTER (WHERE type='IN'  AND expense_date >= DATE_TRUNC('month', NOW())), 0) AS this_month_in,
       COALESCE(SUM(amount) FILTER (WHERE type='OUT' AND expense_date >= CURRENT_DATE), 0)               AS today_out,
       COALESCE(SUM(amount) FILTER (WHERE type='IN'  AND expense_date >= CURRENT_DATE), 0)               AS today_in
     FROM expenses
     WHERE ($1::date IS NULL OR expense_date >= $1::date)
       AND ($2::date IS NULL OR expense_date <= $2::date)`,
    [from, to]
  );

export const getByCategory = ({ from = null, to = null } = {}) =>
  pool.query(
    `SELECT
       COALESCE(category, 'Uncategorized') AS category,
       type,
       COUNT(*)                             AS count,
       COALESCE(SUM(amount), 0)            AS total
     FROM expenses
     WHERE ($1::date IS NULL OR expense_date >= $1::date)
       AND ($2::date IS NULL OR expense_date <= $2::date)
     GROUP BY category, type
     ORDER BY total DESC`,
    [from, to]
  );
