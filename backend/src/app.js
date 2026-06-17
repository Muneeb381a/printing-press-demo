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
