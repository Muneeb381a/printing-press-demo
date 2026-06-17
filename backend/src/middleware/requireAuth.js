import { verifyJwt } from '../utils/jwt.js';
import pool from '../config/db.js';

// No-op: kept so auth controller callers don't need to change
export const invalidateSessionCache = () => {};

// ── requireAuth middleware ────────────────────────────────────
export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyJwt(header.slice(7));

    // Reject old-format tokens (pre-migration) that have no userId.
    // These had role:'admin' and no per-user session tracking.
    // Force the client to clear its token and re-login with the new system.
    if (!payload.userId) {
      return res.status(401).json({
        error: 'Session format updated — please log in again.',
        code:  'SESSION_REPLACED',
      });
    }

    // Single-device enforcement: validate session token and active status from DB.
    const { rows } = await pool.query(
      'SELECT session_token, is_active FROM users WHERE id = $1',
      [payload.userId]
    );
    const row = rows[0];

    if (!row?.is_active) {
      return res.status(401).json({
        error: 'Your account has been deactivated. Contact the owner.',
        code:  'ACCOUNT_INACTIVE',
      });
    }

    if (payload.sessionToken !== row.session_token) {
      return res.status(401).json({
        error: 'آپ کا سیشن ختم ہو گیا — دوبارہ لاگ ان کریں۔',
        code:  'SESSION_REPLACED',
      });
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session — please log in again' });
  }
};
