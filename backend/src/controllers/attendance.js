import pool from '../config/db.js';
import * as Q from '../db/queries/attendance.js';
import { createError } from '../middleware/errorHandler.js';

// Haversine distance in meters
const haversine = (lat1, lng1, lat2, lng2) => {
  const R    = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  const { records } = req.body;
  if (!Array.isArray(records) || !records.length) {
    return res.json({ data: [] });
  }
  const { rows } = await Q.bulkUpsert(records);
  res.json({ data: rows });
};

// ── POST /api/attendance/mark-self  (employee only, geo-fenced) ──
export const markSelf = async (req, res, next) => {
  const { lat, lng } = req.body;

  if (lat == null || lng == null) {
    return next(createError(400, 'lat and lng are required'));
  }
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  if (isNaN(userLat) || isNaN(userLng)) {
    return next(createError(400, 'Invalid lat/lng values'));
  }

  // Get linked employee_id for this user
  const { rows: userRows } = await pool.query(
    `SELECT employee_id FROM users WHERE id = $1`,
    [req.user.userId]
  );
  const employeeId = userRows[0]?.employee_id;
  if (!employeeId) {
    return next(createError(403, 'Your account is not linked to an employee record. Ask the owner to link your account.'));
  }

  // Get shop geo-fence settings
  const { rows: settings } = await pool.query(
    `SELECT shop_lat, shop_lng, attendance_radius_m FROM shop_settings WHERE id = 1`
  );
  const { shop_lat, shop_lng, attendance_radius_m } = settings[0] || {};

  // If shop location not configured — allow (owner hasn't set it yet)
  if (shop_lat != null && shop_lng != null) {
    const distance = haversine(userLat, userLng, parseFloat(shop_lat), parseFloat(shop_lng));
    const radius   = attendance_radius_m || 100;
    if (distance > radius) {
      return next(createError(403, `You are ${Math.round(distance)}m away from the shop. Must be within ${radius}m to mark attendance.`));
    }
  }

  const date = new Date().toISOString().split('T')[0];
  const { rows } = await Q.selfMark(employeeId, date, 'present');
  res.json({ data: rows[0], message: 'Attendance marked successfully' });
};
