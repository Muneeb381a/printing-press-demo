import pool from '../config/db.js';
import * as Q from '../db/queries/payroll.js';
import { createError } from '../middleware/errorHandler.js';

// ── Helpers ──────────────────────────────────────────────────────

/** Count working days in a month, excluding Fridays (day=5). */
const workingDaysInMonth = (year, month) => {
  const days = new Date(year, month, 0).getDate(); // total days in month
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() !== 5) count++;
  }
  return count;
};

/** Round to 2 decimal places */
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Controllers ──────────────────────────────────────────────────

/**
 * GET /api/payroll?year=&month=
 * Return all payroll records for the requested month.
 */
export const getByMonth = async (req, res, next) => {
  const year  = Number(req.query.year)  || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1;

  if (month < 1 || month > 12) return next(createError(400, 'Invalid month'));

  const { rows } = await Q.findByMonth(year, month);
  const workingDays = workingDaysInMonth(year, month);

  res.json({ data: rows, year, month, workingDays });
};

/**
 * POST /api/payroll/calculate
 * Body: { year, month }
 * Calculates (or recalculates) payroll for every active employee using
 * their attendance records for the given month.
 * - Friday is the weekly off day (excluded from working_days)
 * - absent  → full day deduction
 * - half_day → half-day deduction (0.5)
 * - leave / present / unmarked → no deduction (benefit of doubt)
 */
export const calculate = async (req, res, next) => {
  const year  = Number(req.body.year)  || new Date().getFullYear();
  const month = Number(req.body.month) || new Date().getMonth() + 1;

  if (month < 1 || month > 12) return next(createError(400, 'Invalid month'));

  const workingDays = workingDaysInMonth(year, month);
  if (workingDays === 0) return next(createError(400, 'No working days in this month'));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch all active employees
    const { rows: employees } = await client.query(
      `SELECT id, name, salary FROM employees WHERE status = 'active' ORDER BY name ASC`
    );
    if (!employees.length) {
      await client.query('ROLLBACK');
      return res.json({ data: [], year, month, workingDays, message: 'No active employees' });
    }

    // Fetch attendance summary for the month for all active employees
    const { rows: attRows } = await client.query(
      `SELECT
         a.employee_id,
         COUNT(*) FILTER (WHERE a.status = 'present')  AS present,
         COUNT(*) FILTER (WHERE a.status = 'absent')   AS absent,
         COUNT(*) FILTER (WHERE a.status = 'leave')    AS leave,
         COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_day
       FROM attendance a
       WHERE EXTRACT(YEAR  FROM a.date) = $1
         AND EXTRACT(MONTH FROM a.date) = $2
         AND a.employee_id = ANY($3)
       GROUP BY a.employee_id`,
      [year, month, employees.map((e) => e.id)]
    );

    // Build a quick lookup map
    const attMap = {};
    for (const row of attRows) {
      attMap[row.employee_id] = {
        present:  parseFloat(row.present  || 0),
        absent:   parseFloat(row.absent   || 0),
        leave:    parseFloat(row.leave    || 0),
        half_day: parseFloat(row.half_day || 0),
      };
    }

    const results = [];

    for (const emp of employees) {
      const gross    = parseFloat(emp.salary || 0);
      const dailyRate = workingDays > 0 ? r2(gross / workingDays) : 0;

      const att = attMap[emp.id] || { present: 0, absent: 0, leave: 0, half_day: 0 };

      // Deduction: absent = 1 full day, half_day = 0.5 day
      const deductDays = att.absent + att.half_day * 0.5;
      const deduction  = r2(deductDays * dailyRate);
      const netSalary  = r2(gross - deduction); // bonus added later by admin

      const { rows: [record] } = await Q.upsert(client, {
        employeeId:  emp.id,
        year, month,
        workingDays,
        presentDays: att.present,
        absentDays:  att.absent,
        leaveDays:   att.leave,
        halfDays:    att.half_day,
        grossSalary: gross,
        dailyRate,
        deduction,
        bonus:       0,
        netSalary,
        notes:       null,
      });

      results.push({ ...record, employee_name: emp.name });
    }

    await client.query('COMMIT');

    // Return enriched rows (join with employee info)
    const { rows: enriched } = await Q.findByMonth(year, month);
    res.json({ data: enriched, year, month, workingDays });

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * PUT /api/payroll/:id
 * Update bonus and/or notes for a payroll record.
 */
export const updateRecord = async (req, res, next) => {
  const id    = Number(req.params.id);
  const bonus = req.body.bonus != null ? parseFloat(req.body.bonus) : 0;
  const notes = req.body.notes ?? null;

  if (isNaN(id) || id < 1) return next(createError(400, 'Invalid id'));
  if (isNaN(bonus) || bonus < 0) return next(createError(400, 'bonus must be >= 0'));

  const { rows } = await Q.updateBonus(id, bonus, notes);
  if (!rows.length) return next(createError(404, 'Payroll record not found'));

  res.json({ data: rows[0] });
};

/**
 * PUT /api/payroll/:id/pay
 * Mark a payroll record as paid.
 */
export const markPaid = async (req, res, next) => {
  const id = Number(req.params.id);
  if (isNaN(id) || id < 1) return next(createError(400, 'Invalid id'));

  const { rows } = await Q.markPaid(id);
  if (!rows.length) return next(createError(404, 'Payroll record not found'));

  res.json({ data: rows[0] });
};

/**
 * GET /api/payroll/employee/:employeeId
 * Full salary history for a single employee.
 */
export const getEmployeeHistory = async (req, res, next) => {
  const empId = Number(req.params.employeeId);
  if (isNaN(empId) || empId < 1) return next(createError(400, 'Invalid employeeId'));

  const { rows } = await Q.findByEmployee(empId);
  res.json({ data: rows });
};

/**
 * GET /api/payroll/:id
 * Single payroll record (used for salary-slip print).
 */
export const getById = async (req, res, next) => {
  const id = Number(req.params.id);
  if (isNaN(id) || id < 1) return next(createError(400, 'Invalid id'));

  const { rows } = await Q.findById(id);
  if (!rows.length) return next(createError(404, 'Payroll record not found'));
  res.json({ data: rows[0] });
};
