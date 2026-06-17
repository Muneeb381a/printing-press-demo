import { randomUUID } from 'crypto';
import { signJwt } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { invalidateSessionCache } from '../middleware/requireAuth.js';
import * as Q from '../db/queries/auth.js';

// ── In-memory rate limiter (brute-force protection) ───────────
const attempts  = new Map();
const MAX_ATT   = 10;
const WINDOW_MS = 15 * 60 * 1000;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count++;
  return rec.count > MAX_ATT;
};
const clearAttempts = (ip) => attempts.delete(ip);

// ── POST /api/auth/login ──────────────────────────────────────
export const login = async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
  }

  // Accept { username } or legacy { email } — both work as the login identifier
  const { username = '', email = '', password = '' } = req.body;
  const loginId = (username || email).trim();

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (password.length > 1000) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { rows } = await Q.findByLogin(loginId);
  const user = rows[0];

  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  clearAttempts(ip);

  const sessionToken = randomUUID();
  await Q.setSessionToken(user.id, sessionToken);
  invalidateSessionCache();

  const token = signJwt({
    userId:       user.id,
    username:     user.username,
    role:         user.role,
    sessionToken,
  });

  return res.json({
    token,
    user: {
      id:       user.id,
      username: user.username,
      fullName: user.full_name,
      email:    user.email,
      role:     user.role,
    },
  });
};

// ── POST /api/auth/logout ─────────────────────────────────────
export const logout = async (req, res) => {
  if (req.user?.userId) {
    await Q.setSessionToken(req.user.userId, null);
  }
  invalidateSessionCache();
  res.json({ message: 'Logged out' });
};

// ── POST /api/auth/change-password ────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (newPassword.length > 1000) {
    return res.status(400).json({ error: 'Password must be under 1000 characters' });
  }

  const { rows } = await Q.findById(req.user.userId);
  if (!rows.length || !comparePassword(currentPassword, rows[0].password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = hashPassword(newPassword);
  await Q.updatePassword(req.user.userId, newHash);
  invalidateSessionCache();

  return res.json({ message: 'Password changed. Please log in again.' });
};

// ── GET /api/auth/me ──────────────────────────────────────────
export const me = (req, res) => {
  res.json({ user: req.user });
};
