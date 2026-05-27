require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initSchema, dbPath } = require('./db/database');
const { seedUsers } = require('./db/seed');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://your-frontend.vercel.app',
    ],
    credentials: true,
  })
);
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

// Initialize database and seed
initSchema();
seedUsers();

app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  CRM API Server running`);
  console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Port        : ${PORT}`);
  console.log(`  Database    : ${dbPath}`);
  console.log(`  Auth        : POST /api/auth/register | /api/auth/login`);
  console.log(`  Tickets     : /api/tickets (protected)`);
  console.log('─────────────────────────────────────────');
});

module.exports = app;
