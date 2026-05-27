const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');

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

async function findUserByUsernameOrEmail(value) {
  const { data: byUsername, error: usernameError } = await supabase
    .from('users')
    .select('*')
    .eq('username', value)
    .maybeSingle();

  if (usernameError) throw usernameError;
  if (byUsername) return byUsername;

  const { data: byEmail, error: emailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', value)
    .maybeSingle();

  if (emailError) throw emailError;
  return byEmail;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
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

    const existing = (await findUserByUsernameOrEmail(username)) || (await findUserByUsernameOrEmail(email));
    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }

    const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ username, email, password_hash, role })
      .select('*')
      .single();

    if (error) throw error;

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
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'username and password are required.',
      });
    }

    const user = await findUserByUsernameOrEmail(username);

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
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: upgradedHash })
        .eq('id', user.id);

      if (updateError) throw updateError;
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
