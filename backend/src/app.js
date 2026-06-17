import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import customerRoutes   from './routes/customers.js';
import categoryRoutes    from './routes/categories.js';
import subcategoryRoutes from './routes/subcategories.js';
import productRoutes    from './routes/products.js';
import billRoutes       from './routes/bills.js';
import paymentRoutes    from './routes/payments.js';
import dashboardRoutes  from './routes/dashboard.js';
import ledgerRoutes     from './routes/ledger.js';
import pricingRoutes    from './routes/pricing.js';
import reportRoutes     from './routes/reports.js';
import settingsRoutes   from './routes/settings.js';
import inventoryRoutes  from './routes/inventory.js';
import expenseRoutes    from './routes/expenses.js';
import employeeRoutes   from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import payrollRoutes    from './routes/payroll.js';
import rateListRoutes   from './routes/rateList.js';
import userRoutes       from './routes/users.js';
import authRoutes       from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth }  from './middleware/requireAuth.js';
import { requireRole }  from './middleware/requireRole.js';
import { demoGuard }    from './middleware/demoGuard.js';
import pool             from './config/db.js';

const ownerOnly = requireRole('owner');

const app = express();

// ── Security & Parsing ────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (/^https:\/\/printing-press-demo[a-z0-9-]*\.vercel\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health Check (public, no demo guard) ─────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Demo Status (public — before demoGuard so it's always reachable) ─
app.get('/api/demo-status', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT demo_started_at, demo_expires_at FROM shop_settings WHERE id = 1'
    );
    const row    = rows[0] || {};
    const now    = new Date();
    const exp    = row.demo_expires_at ? new Date(row.demo_expires_at) : null;
    const started = row.demo_started_at ? new Date(row.demo_started_at) : null;
    const isExpired  = exp ? now > exp : false;
    const msLeft     = exp ? Math.max(0, exp.getTime() - now.getTime()) : null;
    const daysLeft   = msLeft != null ? Math.floor(msLeft / 86_400_000) : null;
    const hoursLeft  = msLeft != null ? Math.floor((msLeft % 86_400_000) / 3_600_000) : null;
    res.json({ expiresAt: exp, startedAt: started, isExpired, daysLeft, hoursLeft, notStarted: !started });
  } catch (_) {
    res.json({ expiresAt: null, startedAt: null, isExpired: false, daysLeft: null, hoursLeft: null, notStarted: true });
  }
});

// ── Demo expiry guard — applies to all API routes ─────────────
app.use('/api', demoGuard);

// ── Auth routes (public — no token required) ──────────────────
app.use('/api/auth', authRoutes);

// ── Protected API Routes ──────────────────────────────────────
app.use('/api/customers',     requireAuth, customerRoutes);
app.use('/api/categories',    requireAuth, categoryRoutes);
app.use('/api/subcategories', requireAuth, subcategoryRoutes);
app.use('/api/products',      requireAuth, productRoutes);
app.use('/api/bills',         requireAuth, billRoutes);
app.use('/api/attendance',    requireAuth, attendanceRoutes);
app.use('/api/settings',      requireAuth, settingsRoutes);

// Owner-only routes
app.use('/api/payments',      requireAuth, ownerOnly, paymentRoutes);
app.use('/api/dashboard',     requireAuth, ownerOnly, dashboardRoutes);
app.use('/api/ledger',        requireAuth, ownerOnly, ledgerRoutes);
app.use('/api/pricing',       requireAuth, ownerOnly, pricingRoutes);
app.use('/api/reports',       requireAuth, ownerOnly, reportRoutes);
app.use('/api/inventory',     requireAuth, ownerOnly, inventoryRoutes);
app.use('/api/expenses',      requireAuth, ownerOnly, expenseRoutes);
app.use('/api/employees',     requireAuth, ownerOnly, employeeRoutes);
app.use('/api/payroll',       requireAuth, ownerOnly, payrollRoutes);
app.use('/api/rate-list',     requireAuth, ownerOnly, rateListRoutes);
app.use('/api/users',         requireAuth, ownerOnly, userRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

export default app;
