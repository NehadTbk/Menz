const express = require('express');
const {
  register, login, me, logout, forgotPassword, resetPassword,
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const loginLimiter = require('../middleware/loginLimiter');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', auth, me);
router.post('/password/forgot', forgotPassword);
router.post('/password/reset', resetPassword);

module.exports = router;
