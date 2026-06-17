import pool from '../config/db.js';

// Cache expiry for 60 s so we don't hit the DB on every request
let _expiry  = undefined; // undefined = not yet loaded; null = no expiry set
let _cacheTs = 0;
const TTL    = 60_000;

export const demoGuard = async (_req, res, next) => {
  const now = Date.now();
  if (_expiry === undefined || now - _cacheTs > TTL) {
    try {
      const { rows } = await pool.query(
        'SELECT demo_expires_at FROM shop_settings WHERE id = 1'
      );
      _expiry  = rows[0]?.demo_expires_at ?? null;
      _cacheTs = now;
    } catch (_) {
      return next(); // DB unavailable — allow through
    }
  }

  if (_expiry && new Date() > new Date(_expiry)) {
    return res.status(403).json({ code: 'demo_expired', message: 'Demo period has ended.' });
  }
  next();
};

// Call this after setting demo_expires_at so the new value is picked up immediately
export const invalidateDemoCache = () => { _expiry = undefined; };
