const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
  ctrl.login
);

router.get('/me', authenticate, ctrl.getMe);

router.post('/change-password',
  authenticate,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
  ctrl.changePassword
);

module.exports = router;
