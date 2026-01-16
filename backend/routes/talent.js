const express = require('express');
const router = express.Router();
const { getTalent, getMyProfile, updateProfile } = require('../controllers/TalentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), getTalent);
router.get('/me', protect, getMyProfile);
router.post('/', protect, updateProfile);

module.exports = router;
