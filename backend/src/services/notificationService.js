const pool = require('../database/db');
const { getLowStockIngredients } = require('./inventoryService');

async function createLowStockNotification(ingredient) {
  const message = `Alert: "${ingredient.name}" is low. Current stock: ${ingredient.current_quantity} ${ingredient.unit_of_measure}. Please buy ${ingredient.reorder_quantity} ${ingredient.unit_of_measure}.`;

  await pool.query(
    'INSERT INTO notifications (type, message, ingredient_id) VALUES (?, ?, ?)',
    ['low_stock', message, ingredient.id]
  );

  return message;
}

async function runDailyLowStockCheck() {
  const lowStockItems = await getLowStockIngredients();

  if (lowStockItems.length === 0) {
    console.log('✅ Daily stock check: All ingredients are sufficiently stocked.');
    return { notificationsCreated: 0 };
  }

  console.log(`⚠️  Daily stock check: ${lowStockItems.length} ingredient(s) low on stock.`);
  const created = [];

  for (const ingredient of lowStockItems) {
    const message = await createLowStockNotification(ingredient);
    created.push(message);
    console.log(`  📢 ${message}`);
  }

  return { notificationsCreated: created.length, notifications: created };
}

async function getUnreadNotifications() {
  const [rows] = await pool.query(
    `SELECT n.*, i.name AS ingredient_name, i.unit_of_measure, i.current_quantity, i.reorder_level
     FROM notifications n
     LEFT JOIN ingredients i ON i.id = n.ingredient_id
     WHERE n.is_read = 0
     ORDER BY n.created_at DESC`
  );
  return rows;
}

async function getAllNotifications(limit = 50, offset = 0) {
  const [rows] = await pool.query(
    `SELECT n.*, i.name AS ingredient_name, i.unit_of_measure, i.current_quantity, i.reorder_level
     FROM notifications n
     LEFT JOIN ingredients i ON i.id = n.ingredient_id
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

async function markAsRead(notificationId = null) {
  if (notificationId) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
  } else {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  }
}

async function getUnreadCount() {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM notifications WHERE is_read = 0');
  return parseInt(rows[0].cnt);
}

module.exports = {
  runDailyLowStockCheck,
  getUnreadNotifications,
  getAllNotifications,
  markAsRead,
  getUnreadCount,
  createLowStockNotification,
};
