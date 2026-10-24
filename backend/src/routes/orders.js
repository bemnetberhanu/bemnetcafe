const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireManager } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.get('/', authenticate, ctrl.getOrders);
router.get('/:id', authenticate, ctrl.getOrderById);

router.post('/',
  authenticate, requireManager,
  body('items').isArray({ min: 1 }).withMessage('At least one order item is required'),
  body('items.*.recipe_item_id').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('client_operation_id').optional().isString().isLength({ min: 20, max: 100 }).matches(/^[A-Za-z0-9-]+$/),
  validate,
  ctrl.createOrder
);

module.exports = router;
