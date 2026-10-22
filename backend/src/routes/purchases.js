const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireManager } = require('../middleware/auth');
const ctrl = require('../controllers/purchaseController');

router.get('/', authenticate, ctrl.getPurchases);
router.get('/:id', authenticate, ctrl.getPurchaseById);

router.post('/',
  authenticate, requireManager,
  body('items').isArray({ min: 1 }),
  body('items.*.ingredient_id').isInt(),
  body('items.*.quantity_bought').isFloat({ min: 0.001 }),
  body('items.*.cost_per_unit_at_time').isFloat({ min: 0 }),
  validate,
  ctrl.createPurchase
);

module.exports = router;
