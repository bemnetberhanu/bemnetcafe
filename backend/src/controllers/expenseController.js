const pool = require('../database/db');

async function getAll(req, res) {
  const { start_date, end_date, category } = req.query;
  try {
    let where = '';
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      conditions.push('e.expense_date >= ? AND e.expense_date <= ?');
      params.push(start_date, end_date);
    }
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }

    if (conditions.length) where = 'WHERE ' + conditions.join(' AND ');

    const [rows] = await pool.query(
      `SELECT e.*, u.name AS created_by_name
       FROM operating_expenses e
       LEFT JOIN users u ON u.id = e.created_by
       ${where}
       ORDER BY e.expense_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  const { expense_date, category, amount, description } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO operating_expenses (expense_date, category, amount, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [expense_date || new Date().toISOString().split('T')[0], category, amount, description || null, req.user.id || null]
    );
    const [rows] = await pool.query('SELECT * FROM operating_expenses WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  const { expense_date, category, amount, description } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE operating_expenses SET expense_date=?, category=?, amount=?, description=? WHERE id=?',
      [expense_date, category, amount, description || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found.' });
    const [rows] = await pool.query('SELECT * FROM operating_expenses WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM operating_expenses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove };
