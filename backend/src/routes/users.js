const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/', authenticate, requireAdmin, ctrl.getAll);

router.post('/',
  authenticate, requireAdmin,
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'manager']),
  validate,
  ctrl.create
);

router.put('/:id',
  authenticate, requireAdmin,
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'manager']).withMessage('Role must be admin or manager'),
  body('is_active').isBoolean().withMessage('is_active must be a boolean'),
  validate,
  ctrl.update
);
router.patch('/:id/reset-password',
  authenticate, requireAdmin,
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  ctrl.resetPassword
);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
