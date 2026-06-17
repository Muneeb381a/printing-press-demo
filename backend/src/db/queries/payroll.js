import pool from '../../config/db.js';

/** Fetch payroll for a given month, joined with employee info */
export const findByMonth = (year, month) =>
  pool.query(
    `SELECT
       p.*,
       e.name AS employee_name,
       e.role AS employee_role,
       e.phone AS employee_phone
     FROM  payroll p
     JOIN  employees e ON e.id = p.employee_id
     WHERE p.year = $1 AND p.month = $2
     ORDER BY e.name ASC`,
    [year, month]
  );

/** Upsert one employee's payroll record (inside caller's transaction) */
export const upsert = (client, {
  employeeId, year, month,
  workingDays, presentDays, absentDays, leaveDays, halfDays,
  grossSalary, dailyRate, deduction, bonus, netSalary, notes,
}) =>
  client.query(
    `INSERT INTO payroll (
       employee_id, year, month,
       working_days, present_days, absent_days, leave_days, half_days,
       gross_salary, daily_rate, deduction, bonus, net_salary, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (employee_id, year, month) DO UPDATE SET
       working_days = EXCLUDED.working_days,
       present_days = EXCLUDED.present_days,
       absent_days  = EXCLUDED.absent_days,
       leave_days   = EXCLUDED.leave_days,
       half_days    = EXCLUDED.half_days,
       gross_salary = EXCLUDED.gross_salary,
       daily_rate   = EXCLUDED.daily_rate,
       deduction    = EXCLUDED.deduction,
       net_salary   = EXCLUDED.net_salary,
       notes        = EXCLUDED.notes,
       status       = 'draft',
       paid_at      = NULL,
       updated_at   = NOW()
     RETURNING *`,
    [
      employeeId, year, month,
      workingDays, presentDays, absentDays, leaveDays, halfDays,
      grossSalary, dailyRate, deduction, bonus, netSalary, notes,
    ]
  );

/** Update bonus (and recompute net) without resetting status */
export const updateBonus = (id, bonus, notes) =>
  pool.query(
    `UPDATE payroll
     SET  bonus      = $2,
          net_salary = gross_salary - deduction + $2,
          notes      = COALESCE($3, notes),
          updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, bonus, notes]
  );

/** Flip status to paid */
export const markPaid = (id) =>
  pool.query(
    `UPDATE payroll
     SET  status = 'paid', paid_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

/** Full payroll history for one employee */
export const findByEmployee = (employeeId) =>
  pool.query(
    `SELECT * FROM payroll
     WHERE employee_id = $1
     ORDER BY year DESC, month DESC`,
    [employeeId]
  );

/** Single payroll record by id */
export const findById = (id) =>
  pool.query(
    `SELECT p.*, e.name AS employee_name, e.role AS employee_role, e.phone AS employee_phone
     FROM payroll p JOIN employees e ON e.id = p.employee_id
     WHERE p.id = $1`,
    [id]
  );
