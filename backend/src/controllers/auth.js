import { signJwt } from '../utils/jwt.js';

// ── In-memory rate limiter ────────────────────────────────────
const attempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS    = 15 * 60 * 1000;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count++;
  return rec.count > MAX_ATTEMPTS;
};

const clearAttempts = (ip) => attempts.delete(ip);

// ── POST /api/auth/login ──────────────────────────────────────
export const login = (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
  }

  const { username = '', password = '' } = req.body;

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    console.error('[Auth] ADMIN_PASSWORD env var is not set!');
    return res.status(500).json({ error: 'Server is not configured correctly.' });
  }

  if (username.trim() !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  clearAttempts(ip);

  // userId: null so FK constraints are never violated in demo DB.
  // role: 'owner' ensures requireRole('owner') passes for all protected routes.
  // sessionToken: 'demo' is a fixed value — demo requireAuth doesn't validate it in DB.
  const token = signJwt({ userId: null, username: adminUser, role: 'owner', sessionToken: 'demo' });

  return res.json({
    token,
    user: { id: null, username: adminUser, fullName: 'Demo Owner', role: 'owner' },
  });
};

// ── POST /api/auth/logout ─────────────────────────────────────
export const logout = (_req, res) => {
  res.json({ message: 'Logged out' });
};

// ── POST /api/auth/change-password ────────────────────────────
export const changePassword = (_req, res) => {
  res.status(422).json({ error: 'Password changes are not available in the demo.' });
};

// ── GET /api/auth/me ──────────────────────────────────────────
export const me = (req, res) => {
  res.json({ user: req.user });
};
