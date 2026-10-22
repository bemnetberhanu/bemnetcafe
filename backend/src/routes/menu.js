const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/menuController');

// Recipe Items
router.get('/', authenticate, ctrl.getAllItems);
router.get('/:id', authenticate, ctrl.getItemById);

router.post('/',
  authenticate, requireAdmin,
  body('name').notEmpty(),
  body('selling_price').isFloat({ min: 0 }),
  body('category').notEmpty(),
  validate,
  ctrl.createItem
);

router.put('/:id', authenticate, requireAdmin, ctrl.updateItem);
router.delete('/:id', authenticate, requireAdmin, ctrl.removeItem);

// Variations
router.post('/variations/create',
  authenticate, requireAdmin,
  body('name').notEmpty(),
  body('parent_recipe_id').isInt(),
  validate,
  ctrl.createVariation
);

router.put('/variations/:id', authenticate, requireAdmin, ctrl.updateVariation);
router.delete('/variations/:id', authenticate, requireAdmin, ctrl.removeVariation);

module.exports = router;
