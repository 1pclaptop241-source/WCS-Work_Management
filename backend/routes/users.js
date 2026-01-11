const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  getEditors,
  getClients,
  deleteUser,
  getEditorStats,
  toggleBlockStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getUsers);
router.post('/', protect, authorize('admin'), createUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.put('/:id/block', protect, authorize('admin'), toggleBlockStatus);
router.get('/editors', protect, getEditors);
router.get('/editors/stats', protect, authorize('admin'), getEditorStats);
router.get('/clients', protect, authorize('admin'), getClients);

module.exports = router;

