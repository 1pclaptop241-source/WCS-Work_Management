const express = require('express');
const router = express.Router();
const {
  uploadWork,
  getWorkByProject,
  addCorrections,
  getWorkByEditor,
  getWorkByWorkBreakdown,
  markCorrectionDone,
  getAssignedWorkBreakdowns,

  updateWorkStatus,
  updateWorkDetails,
  toggleWorkFileVisibility,
} = require('../controllers/workController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/assigned-breakdowns', protect, getAssignedWorkBreakdowns);
router.put('/work-breakdown/:id/status', protect, authorize('editor'), updateWorkStatus);
router.put('/work-breakdown/:id/details', protect, authorize('editor'), updateWorkDetails);
router.post('/', protect, authorize('editor'), upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'workFile', maxCount: 1 }
]), uploadWork);
router.get('/project/:projectId', protect, getWorkByProject);
router.get('/editor/:editorId?', protect, getWorkByEditor);
router.get('/work-breakdown/:workBreakdownId', protect, getWorkByWorkBreakdown);
router.post('/:id/corrections', protect, authorize('client', 'admin'), upload.fields([
  { name: 'voiceFile', maxCount: 1 },
  { name: 'mediaFiles', maxCount: 5 }
]), addCorrections);
router.put('/:id/corrections/:correctionId/done', protect, markCorrectionDone);
router.put('/:id/admin-approve', protect, authorize('admin'), require('../controllers/workController').adminApprove);
router.put('/:id/client-approve', protect, authorize('client'), require('../controllers/workController').clientApprove);
router.put('/:id/toggle-visibility', protect, authorize('admin'), toggleWorkFileVisibility);

module.exports = router;

