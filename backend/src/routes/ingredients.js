const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/ingredientController');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);

router.post('/',
  authenticate, requireAdmin,
  body('name').notEmpty(),
  body('unit_of_measure').notEmpty(),
  body('reorder_level').isFloat({ min: 0 }),
  body('reorder_quantity').isFloat({ min: 0 }),
  body('cost_per_unit').isFloat({ min: 0 }),
  validate,
  ctrl.create
);

router.put('/:id',
  authenticate, requireAdmin,
  body('name').notEmpty(),
  body('unit_of_measure').notEmpty(),
  validate,
  ctrl.update
);

router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
