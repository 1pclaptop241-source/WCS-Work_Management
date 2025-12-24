const express = require('express');
const router = express.Router();
const {
  resetAll,
  getReports,
  downloadReport,
} = require('../controllers/resetController');
const { protect, authorize } = require('../middleware/auth');

router.post('/all', protect, authorize('admin'), resetAll);
router.get('/reports', protect, getReports);
router.get('/reports/:reportId/download', protect, downloadReport);

module.exports = router;

