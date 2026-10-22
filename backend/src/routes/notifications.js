const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', authenticate, ctrl.getNotifications);
router.get('/unread', authenticate, ctrl.getUnread);
router.patch('/:id/read', authenticate, ctrl.markRead);

// Admin can manually trigger the daily stock check for testing
router.post('/trigger-stock-check', authenticate, requireAdmin, ctrl.triggerStockCheck);

module.exports = router;
