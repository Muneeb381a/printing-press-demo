import pool from '../../config/db.js';

// All attendance for a given date (join employee info)
export const findByDate = (date) =>
  pool.query(
    `SELECT a.id, a.employee_id, a.date, a.status, a.notes,
            e.name AS employee_name, e.role
     FROM   employees e
     LEFT   JOIN attendance a ON a.employee_id = e.id AND a.date = $1
     WHERE  e.status = 'active'
     ORDER  BY e.name ASC`,
    [date]
  );

// Monthly report for all active employees
export const findMonthly = (year, month) =>
  pool.query(
    `SELECT a.employee_id, a.date, a.status,
            e.name AS employee_name, e.role
     FROM   attendance a
     JOIN   employees  e ON e.id = a.employee_id
     WHERE  EXTRACT(YEAR  FROM a.date) = $1
       AND  EXTRACT(MONTH FROM a.date) = $2
     ORDER  BY e.name ASC, a.date ASC`,
    [year, month]
  );

// Summary per employee for a month
export const monthlySummary = (year, month) =>
  pool.query(
    `SELECT e.id, e.name, e.role, e.salary,
            COUNT(*) FILTER (WHERE a.status = 'present')  AS present,
            COUNT(*) FILTER (WHERE a.status = 'absent')   AS absent,
            COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_day,
            COUNT(*) FILTER (WHERE a.status = 'leave')    AS leave
     FROM   employees e
     LEFT   JOIN attendance a
             ON a.employee_id = e.id
            AND EXTRACT(YEAR  FROM a.date) = $1
            AND EXTRACT(MONTH FROM a.date) = $2
     WHERE  e.status = 'active'
     GROUP  BY e.id, e.name, e.role, e.salary
     ORDER  BY e.name ASC`,
    [year, month]
  );

// Upsert a single attendance record
export const upsert = ({ employeeId, date, status, notes }) =>
  pool.query(
    `INSERT INTO attendance (employee_id, date, status, notes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (employee_id, date)
     DO UPDATE SET status = $3, notes = $4, updated_at = NOW()
     RETURNING *`,
    [employeeId, date, status, notes || null]
  );

// Bulk upsert for an entire day
export const bulkUpsert = (records) => {
  const values = records.map((_, i) => {
    const b = i * 4;
    return `($${b+1},$${b+2},$${b+3},$${b+4})`;
  }).join(',');
  const params = records.flatMap((r) => [r.employeeId, r.date, r.status, r.notes || null]);
  return pool.query(
    `INSERT INTO attendance (employee_id, date, status, notes)
     VALUES ${values}
     ON CONFLICT (employee_id, date)
     DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
     RETURNING *`,
    params
  );
};
