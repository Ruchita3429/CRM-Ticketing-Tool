const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

const router = express.Router();

const VALID_ROLES = ['admin', 'agent'];
const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...user } = row;
  return user;
}

// POST /api/auth/register
router.post('/register', (req, res, next) => {
  try {
    const { username, email, password, role = 'agent' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'username, email, and password are required.',
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'role must be admin or agent.' });
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(username, email);

    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);

    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, username, email, password_hash, role);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'username and password are required.',
      });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(username, username);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const looksHashed = user.password_hash.startsWith('$2');
    const isPasswordValid = looksHashed
      ? bcrypt.compareSync(password, user.password_hash)
      : password === user.password_hash;

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // One-time healing for legacy plain-text rows: replace with bcrypt hash on successful login.
    if (!looksHashed) {
      const upgradedHash = bcrypt.hashSync(password, SALT_ROUNDS);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(upgradedHash, user.id);
      user.password_hash = upgradedHash;
    }

    const token = signToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
