const pool = require('../database/db');
const { addInventory } = require('../services/inventoryService');

async function createPurchase(req, res) {
  const { supplier_name, notes, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Purchase must contain at least one item.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const totalCost = items.reduce(
      (sum, item) => sum + item.quantity_bought * item.cost_per_unit_at_time,
      0
    );

    const [result] = await conn.query(
      'INSERT INTO purchases (supplier_name, total_cost, notes, created_by) VALUES (?, ?, ?, ?)',
      [supplier_name || null, totalCost, notes || null, req.user.id || null]
    );
    const purchaseId = result.insertId;

    for (const item of items) {
      await conn.query(
        'INSERT INTO purchase_items (purchase_id, ingredient_id, quantity_bought, cost_per_unit_at_time) VALUES (?, ?, ?, ?)',
        [purchaseId, item.ingredient_id, item.quantity_bought, item.cost_per_unit_at_time]
      );
    }

    // Update inventory — also stops the daily nag for restocked ingredients
    await addInventory(conn, items);

    await conn.commit();

    const [purchaseRows] = await pool.query('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    res.status(201).json({
      message: 'Purchase recorded and inventory updated.',
      purchase: { ...purchaseRows[0], items },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Failed to record purchase.' });
  } finally {
    conn.release();
  }
}

async function getPurchases(req, res) {
  const { start_date, end_date, limit = 50, offset = 0 } = req.query;
  try {
    let where = '';
    const params = [];

    if (start_date && end_date) {
      where = 'WHERE p.purchase_date >= ? AND p.purchase_date < ?';
      params.push(start_date, end_date);
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.name AS created_by_name
       FROM purchases p
       LEFT JOIN users u ON u.id = p.created_by
       ${where}
       ORDER BY p.purchase_date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getPurchaseById(req, res) {
  try {
    const [pRows] = await pool.query(
      'SELECT p.*, u.name AS created_by_name FROM purchases p LEFT JOIN users u ON u.id = p.created_by WHERE p.id = ?',
      [req.params.id]
    );
    if (!pRows.length) return res.status(404).json({ error: 'Purchase not found.' });

    const [itemRows] = await pool.query(
      `SELECT pi.*, i.name AS ingredient_name, i.unit_of_measure
       FROM purchase_items pi
       JOIN ingredients i ON i.id = pi.ingredient_id
       WHERE pi.purchase_id = ?`,
      [req.params.id]
    );

    res.json({ ...pRows[0], items: itemRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createPurchase, getPurchases, getPurchaseById };
