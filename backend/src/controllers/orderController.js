const pool = require('../database/db');
const { checkStock, deductInventory } = require('../services/inventoryService');
const { findReceipt, saveReceipt } = require('../services/offlineSyncService');

async function createOrder(req, res) {
  const { items, payment_method = 'cash', notes, client_operation_id: operationId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (operationId) {
      const receipt = await findReceipt(conn, operationId, req.user.id);
      if (receipt) {
        await conn.commit();
        if (receipt.operation_type !== 'order') {
          return res.status(409).json({ error: 'This operation ID was already used for a different record.' });
        }
        return res.status(200).json({ message: 'Order was already synced.', order_id: receipt.result_id });
      }
    }

    const stockCheck = await checkStock(conn, items);
    if (!stockCheck.ok) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Insufficient stock for one or more ingredients.',
        shortages: stockCheck.shortages,
      });
    }

    let totalAmount = 0;
    const enrichedItems = [];

    for (const item of items) {
      const [menuRows] = await conn.query('SELECT * FROM recipe_items WHERE id = ?', [item.recipe_item_id]);
      if (!menuRows.length) {
        await conn.rollback();
        return res.status(400).json({ error: `Menu item ${item.recipe_item_id} not found.` });
      }

      let unitPrice = parseFloat(menuRows[0].selling_price);
      if (item.variation_id) {
        const [varRows] = await conn.query('SELECT price_adjustment FROM variations WHERE id = ?', [item.variation_id]);
        if (varRows.length) unitPrice += parseFloat(varRows[0].price_adjustment);
      }

      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      enrichedItems.push({ ...item, unit_price: unitPrice, subtotal });
    }

    const [orderResult] = await conn.query(
      'INSERT INTO orders (total_amount, payment_method, notes, created_by) VALUES (?, ?, ?, ?)',
      [totalAmount, payment_method, notes || null, req.user.id || null]
    );
    const orderId = orderResult.insertId;

    for (const item of enrichedItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, recipe_item_id, variation_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.recipe_item_id, item.variation_id || null, item.quantity, item.unit_price, item.subtotal]
      );
    }

    await deductInventory(conn, items);
    if (operationId) {
      await saveReceipt(conn, operationId, 'order', orderId, req.user.id);
    }
    await conn.commit();

    const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json({
      message: 'Order placed successfully.',
      order: { ...orderRows[0], items: enrichedItems },
    });
  } catch (err) {
    await conn.rollback();
    if (operationId && err.code === 'ER_DUP_ENTRY') {
      const receipt = await findReceipt(pool, operationId, req.user.id);
      if (receipt?.operation_type === 'order') {
        return res.status(200).json({ message: 'Order was already synced.', order_id: receipt.result_id });
      }
    }
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to place order.' });
  } finally {
    conn.release();
  }
}

async function getOrders(req, res) {
  const { date, start_date, end_date, limit = 50, offset = 0 } = req.query;
  try {
    let where = '';
    const params = [];

    if (date) {
      where = 'WHERE DATE(o.order_date) = ?';
      params.push(date);
    } else if (start_date && end_date) {
      where = 'WHERE o.order_date >= ? AND o.order_date < ?';
      params.push(start_date, end_date);
    }

    const [rows] = await pool.query(
      `SELECT o.*, u.name AS created_by_name, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN users u ON u.id = o.created_by
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id, u.name
       ORDER BY o.order_date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getOrderById(req, res) {
  try {
    const [orderRows] = await pool.query(
      'SELECT o.*, u.name AS created_by_name FROM orders o LEFT JOIN users u ON u.id = o.created_by WHERE o.id = ?',
      [req.params.id]
    );
    if (!orderRows.length) return res.status(404).json({ error: 'Order not found.' });

    const [itemRows] = await pool.query(
      `SELECT oi.*, ri.name AS item_name, v.name AS variation_name, ri.category
       FROM order_items oi
       JOIN recipe_items ri ON ri.id = oi.recipe_item_id
       LEFT JOIN variations v ON v.id = oi.variation_id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({ ...orderRows[0], items: itemRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createOrder, getOrders, getOrderById };
