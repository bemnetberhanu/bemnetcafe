const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/analyticsController');

router.get('/financial', authenticate, ctrl.financialReport);
router.get('/ranking', authenticate, ctrl.salesRanking);
router.get('/patterns', authenticate, ctrl.dayOfWeekPatterns);
router.get('/daily-summary', authenticate, ctrl.dailySummary);

module.exports = router;
