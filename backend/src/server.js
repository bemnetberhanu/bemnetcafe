require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { startScheduler } = require('./scheduler/cronJobs');

const app = express();
app.set('trust proxy', 1);

// ─── Security Headers (helmet) ───────────────────────────────────────────────
// Sets Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
// Strict-Transport-Security, X-XSS-Protection, and more automatically.
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parser — 1 MB cap to prevent oversized payload attacks ──────────────
app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiters ───────────────────────────────────────────────────────────

// Login: max 10 attempts per 15 minutes per IP — prevents brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// General API: max 300 requests per minute per IP — prevents scraping/DoS
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/', generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);          // tighter limit on login only
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ingredients', require('./routes/ingredients'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Habesha Restaurant API',
  });
});

// ─── 404 & Global Error Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Habesha Restaurant API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  startScheduler();
});

module.exports = app;
