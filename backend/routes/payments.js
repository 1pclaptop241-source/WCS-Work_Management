const express = require('express');
const router = express.Router();
const {
  getEditorPayments,
  getClientPayments,
  getPaymentsByEditor,
  markPaymentPaid,
  markClientPaymentPaid,
  markPaymentReceived,
  markClientPaymentReceived,
  markBulkPaymentsPaid,
  markBulkClientPaymentsPaid,
  markBulkClientPaymentsReceived,
  markBulkPaymentsReceived,
  getPaymentStats,
  getPaymentHistory,
  createManualPayment,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/manual', protect, authorize('admin'), createManualPayment);
router.get('/admin/clients', protect, authorize('admin'), getClientPayments);
router.get('/client/:clientId?', protect, getClientPayments);
router.get('/editor/:editorId?', protect, getEditorPayments);
router.get('/admin/editor/:editorId', protect, authorize('admin'), getPaymentsByEditor);
router.put('/:id/pay', protect, authorize('admin'), upload.single('paymentScreenshot'), markPaymentPaid);
router.put('/:id/client-pay', protect, authorize('client'), upload.single('paymentScreenshot'), markClientPaymentPaid);
router.put('/:id/received', protect, authorize('editor'), markPaymentReceived);
router.put('/:id/client-received', protect, authorize('admin'), markClientPaymentReceived);

// Bulk Routes
router.put('/pay-bulk', protect, authorize('admin'), upload.single('paymentScreenshot'), markBulkPaymentsPaid);
router.put('/client-pay-bulk', protect, authorize('client'), upload.single('paymentScreenshot'), markBulkClientPaymentsPaid);
router.put('/client-received-bulk', protect, authorize('admin'), markBulkClientPaymentsReceived);
router.put('/received-bulk', protect, authorize('editor'), markBulkPaymentsReceived);

// Stats Route
router.get('/stats', protect, authorize('admin'), getPaymentStats);
router.get('/history', protect, authorize('admin'), getPaymentHistory);

module.exports = router;

