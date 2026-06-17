import { verifyJwt } from '../utils/jwt.js';

// No-op kept for compatibility with any caller that imports it
export const invalidateSessionCache = () => {};

// ── requireAuth middleware (demo version) ─────────────────────
// Verifies the JWT signature but does NOT hit the database.
// Demo uses a single env-var owner account (no users table required).
export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = verifyJwt(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session — please log in again' });
  }
};
