const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireManager } = require('../middleware/auth');
const ctrl = require('../controllers/expenseController');

router.get('/', authenticate, ctrl.getAll);

router.post('/',
  authenticate, requireManager,
  body('category').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  validate,
  ctrl.create
);

router.put('/:id', authenticate, requireManager, validate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
