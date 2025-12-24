const express = require('express');
const router = express.Router();
const { register, login, getMe, agreeToTerms } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', protect, authorize('admin'), register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/agree-terms', protect, agreeToTerms);

module.exports = router;

