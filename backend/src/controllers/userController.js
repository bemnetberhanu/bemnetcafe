const pool = require('../database/db');
const bcrypt = require('bcryptjs');

async function getAll(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY role, name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase().trim(), hash, role]
    );
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // MySQL duplicate entry error code
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists.' });
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  const { name, email, role, is_active } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE users SET name=?, email=?, role=?, is_active=? WHERE id=?',
      [name, email.toLowerCase().trim(), role, is_active ? 1 : 0, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  const { new_password } = req.body;
  try {
    const hash = await bcrypt.hash(new_password, 12);
    const [result] = await pool.query(
      'UPDATE users SET password_hash=? WHERE id=?',
      [hash, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  // Soft delete — keeps order history intact
  try {
    const [result] = await pool.query(
      'UPDATE users SET is_active=0 WHERE id=?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deactivated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, resetPassword, remove };
