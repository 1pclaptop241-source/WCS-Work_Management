const express = require('express');
const router = express.Router();
const {
  getWorkBreakdownByProject,
  getWorkBreakdownByEditor,
  updateWorkBreakdown,
  approveWorkType,
  declineWork,
  addWorkFeedback,
} = require('../controllers/workBreakdownController');
const { protect } = require('../middleware/auth');

router.get('/project/:projectId', protect, getWorkBreakdownByProject);
router.get('/editor/:editorId?', protect, getWorkBreakdownByEditor);
router.put('/:id', protect, updateWorkBreakdown);
router.put('/:id/decline', protect, declineWork);
router.put('/:id/approve', protect, approveWorkType);
router.post('/:id/feedback', protect, addWorkFeedback);

module.exports = router;

