const express = require('express');
const router = express.Router();
const { getActivityLogs } = require('../controllers/activityLogController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getActivityLogs);

module.exports = router;
