const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  assignEditor,
  shareProjectDetails,
  getRoadmap,
  updateRoadmap,
  approveProject,
  publishProject,
  acceptProject,
  uploadFinalRender,
  clientApproveProject,
  closeProject,
  rejectProject,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, getProjects)
  .post(protect, authorize('admin', 'client'), upload.single('scriptFile'), createProject);

router.route('/:id')
  .get(protect, getProject)
  .put(protect, upload.single('scriptFile'), updateProject)
  .delete(protect, deleteProject);

router.put('/:id/assign', protect, authorize('admin'), assignEditor);
router.put('/:id/share-details', protect, authorize('admin'), shareProjectDetails);
router.get('/:id/roadmap', protect, getRoadmap);
router.put('/:id/roadmap', protect, updateRoadmap);
router.put('/:id/approve', protect, authorize('client', 'admin'), approveProject);
router.put('/:id/publish', protect, authorize('client', 'admin'), publishProject);
router.post('/:id/accept', protect, authorize('admin'), acceptProject);
router.put('/:id/final-render', protect, authorize('editor', 'admin'), uploadFinalRender);
router.put('/:id/client-approve', protect, authorize('client'), clientApproveProject);
router.put('/:id/close', protect, authorize('admin'), closeProject);
router.put('/:id/reject', protect, authorize('admin'), rejectProject);
module.exports = router;

