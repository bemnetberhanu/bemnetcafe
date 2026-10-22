const pool = require('../database/db');

async function getAll(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT *, (current_quantity <= reorder_level) AS is_low_stock FROM ingredients ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getById(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM ingredients WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ingredient not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  const { name, unit_of_measure, current_quantity, reorder_level, reorder_quantity, cost_per_unit } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO ingredients (name, unit_of_measure, current_quantity, reorder_level, reorder_quantity, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?)',
      [name, unit_of_measure, current_quantity || 0, reorder_level, reorder_quantity, cost_per_unit]
    );
    const [rows] = await pool.query('SELECT * FROM ingredients WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  const { name, unit_of_measure, current_quantity, reorder_level, reorder_quantity, cost_per_unit } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE ingredients SET name=?, unit_of_measure=?, current_quantity=?, reorder_level=?, reorder_quantity=?, cost_per_unit=? WHERE id=?',
      [name, unit_of_measure, current_quantity, reorder_level, reorder_quantity, cost_per_unit, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ingredient not found.' });
    const [rows] = await pool.query('SELECT * FROM ingredients WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM ingredients WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Ingredient not found.' });
    res.json({ message: 'Ingredient deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
