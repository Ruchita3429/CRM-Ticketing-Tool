const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { seedUsers } = require('./db/seed');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://crm-ticketing-tool.vercel.app',
]);

if (process.env.FRONTEND_URL) {
  allowedOrigins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  return /^https:\/\/[\w-]+\.vercel\.app$/.test(origin);
}

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

// Explicit CORS - required for Vercel frontend to Render API, including Authorization preflight.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use(errorHandler);

async function startServer() {
  await seedUsers();

  app.listen(PORT, () => {
    console.log('-----------------------------------------');
    console.log(`  CRM API Server running`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Port        : ${PORT}`);
    console.log(`  Database    : Supabase PostgreSQL`);
    console.log(`  Auth        : POST /api/auth/register | /api/auth/login`);
    console.log(`  Tickets     : /api/tickets (protected)`);
    console.log('-----------------------------------------');
  });
}

startServer().catch((err) => {
  console.error('Failed to start CRM API server:', err);
  process.exit(1);
});

module.exports = app;
