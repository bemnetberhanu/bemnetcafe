const pool = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory login attempt tracker (resets on server restart).
// For multi-instance deployments, move this to Redis.
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getAttemptRecord(email) {
  const key = email.toLowerCase().trim();
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 0, lockedUntil: null });
  }
  return loginAttempts.get(key);
}

async function login(req, res) {
  const { email, password } = req.body;

  const record = getAttemptRecord(email);

  // Check lockout
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({
      error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase().trim()]
    );

    // Always run bcrypt even if user not found — prevents timing attacks
    const dummyHash = '$2a$12$invalidhashfortimingattackprevention000000000000000000';
    const hashToCompare = rows.length ? rows[0].password_hash : dummyHash;
    const isMatch = rows.length
      ? await bcrypt.compare(password, hashToCompare)
      : (await bcrypt.compare(password, dummyHash), false);

    if (!rows.length || !isMatch) {
      record.count += 1;
      if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = Date.now() + LOCKOUT_MS;
        record.count = 0;
        return res.status(429).json({
          error: 'Too many failed attempts. Account locked for 15 minutes.',
        });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Success — reset attempt counter
    record.count = 0;
    record.lockedUntil = null;

    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { login, getMe, changePassword };
