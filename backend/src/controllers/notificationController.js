const {
  getUnreadNotifications,
  getAllNotifications,
  markAsRead,
  getUnreadCount,
  runDailyLowStockCheck,
} = require('../services/notificationService');

async function getNotifications(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const notifications = await getAllNotifications(parseInt(limit), parseInt(offset));
    const unreadCount = await getUnreadCount();
    res.json({ notifications, unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getUnread(req, res) {
  try {
    const notifications = await getUnreadNotifications();
    res.json({ notifications, count: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markRead(req, res) {
  const { id } = req.params;
  try {
    await markAsRead(id === 'all' ? null : parseInt(id));
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function triggerStockCheck(req, res) {
  try {
    const result = await runDailyLowStockCheck();
    res.json({ message: 'Stock check completed.', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotifications, getUnread, markRead, triggerStockCheck };
