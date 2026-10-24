const pool = require('../database/db');
const { findReceipt, saveReceipt } = require('../services/offlineSyncService');

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
  const { expense_date, category, amount, description, client_operation_id: operationId } = req.body;
  let conn;
  let transactionStarted = false;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    transactionStarted = true;
    if (operationId) {
      const receipt = await findReceipt(conn, operationId, req.user.id);
      if (receipt) {
        await conn.commit();
        transactionStarted = false;
        if (receipt.operation_type !== 'expense') {
          return res.status(409).json({ error: 'This operation ID was already used for a different record.' });
        }
        const [rows] = await pool.query('SELECT * FROM operating_expenses WHERE id = ?', [receipt.result_id]);
        return res.status(200).json(rows[0]);
      }
    }

    const [result] = await conn.query(
      'INSERT INTO operating_expenses (expense_date, category, amount, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [expense_date || new Date().toISOString().split('T')[0], category, amount, description || null, req.user.id || null]
    );
    if (operationId) {
      await saveReceipt(conn, operationId, 'expense', result.insertId, req.user.id);
    }
    await conn.commit();
    transactionStarted = false;
    const [rows] = await pool.query('SELECT * FROM operating_expenses WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (transactionStarted) await conn.rollback();
    if (operationId && err.code === 'ER_DUP_ENTRY') {
      const receipt = await findReceipt(pool, operationId, req.user.id);
      if (receipt?.operation_type === 'expense') {
        const [rows] = await pool.query('SELECT * FROM operating_expenses WHERE id = ?', [receipt.result_id]);
        return res.status(200).json(rows[0]);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
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
