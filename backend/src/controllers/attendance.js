import * as Q from '../db/queries/attendance.js';

export const getByDate = async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const { rows } = await Q.findByDate(date);
  res.json({ data: rows, date });
};

export const getMonthly = async (req, res) => {
  const year  = Number(req.query.year)  || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const [{ rows: records }, { rows: summary }] = await Promise.all([
    Q.findMonthly(year, month),
    Q.monthlySummary(year, month),
  ]);
  res.json({ data: { records, summary }, year, month });
};

export const mark = async (req, res) => {
  const { employeeId, date, status, notes } = req.body;
  const { rows } = await Q.upsert({ employeeId, date, status, notes });
  res.json({ data: rows[0] });
};

export const markBulk = async (req, res) => {
  const { records } = req.body;           // [{ employeeId, date, status, notes }]
  if (!Array.isArray(records) || !records.length) {
    return res.json({ data: [] });
  }
  const { rows } = await Q.bulkUpsert(records);
  res.json({ data: rows });
};
