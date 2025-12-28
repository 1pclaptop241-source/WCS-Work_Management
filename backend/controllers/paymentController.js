const Payment = require('../models/Payment');
const Project = require('../models/Project');
const WorkBreakdown = require('../models/WorkBreakdown');
const Settlement = require('../models/Settlement');
const calculatePenalty = require('../utils/calculatePenalty');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationService');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Get payments for an editor
// @route   GET /api/payments/editor/:editorId
// @access  Private
exports.getEditorPayments = async (req, res) => {
  try {
    const editorId = req.params.editorId || req.user._id;

    if (req.user.role !== 'admin' && editorId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // 1. First, find all WorkBreakdowns for this editor to correlate payments
    const assignedWBs = await WorkBreakdown.find({ assignedEditor: editorId }).select('_id');
    const assignedWBIds = assignedWBs.map(wb => wb._id);

    // 2. Query for payments belonging to this editor
    // Ownership criteria: (explicit editor field) OR (linked to an assigned work breakdown)
    const ownershipQuery = {
      $or: [
        { editor: editorId },
        { workBreakdown: { $in: assignedWBIds } }
      ]
    };

    // Filter criteria: (Not locked) AND (Not hidden) AND (Ownership)
    const query = {
      $and: [
        { paymentType: { $in: ['editor_payout', 'bonus', 'deduction', null] } },
        { status: { $ne: 'locked' } },
        ownershipQuery,
        {
          $or: [
            { hiddenAt: null },
            { hiddenAt: { $gt: twoDaysAgo } }
          ]
        }
      ]
    };

    let payments = await Payment.find(query)
      .populate({
        path: 'workBreakdown',
        select: 'workType assignedEditor approvals status approved',
        populate: { path: 'assignedEditor', select: 'name email' }
      })
      .populate('project', 'title deadline status assignedEditor adminApprovedAt clientApprovedAt currency')
      .populate('client', 'name email')
      .populate('editor', 'name email')
      .sort({ createdAt: -1 });

    // 3. Auto-calculate penalties for pending payments
    for (const payment of payments) {
      // Stop the deadline counting for completed or approved works
      const isCompleted = payment.workBreakdown && (payment.workBreakdown.status === 'completed' || payment.workBreakdown.approved);

      if (payment.paymentType === 'editor_payout' && payment.status === 'pending' && !isCompleted) {
        const deadline = new Date(payment.deadline);
        const now = new Date();

        if (now > deadline) {
          const penaltyResult = calculatePenalty(deadline, payment.originalAmount, now);
          if (penaltyResult.penaltyAmount > 0) {
            payment.penaltyAmount = penaltyResult.penaltyAmount;
            payment.finalAmount = penaltyResult.finalAmount;
            payment.deadlineCrossed = true;
            payment.daysLate = penaltyResult.daysLate;
            await payment.save();
          }
        }
      }
    }

    // 4. Final filter to hide non-approved editor payouts & ensure current ownership
    payments = payments.filter(p => {
      // Bonus/Deduction/Settlements are always visible if they match ownership query
      if (p.paymentType !== 'editor_payout' && p.paymentType !== null) return true;

      // Project assignment payments (Legacy/Direct) with no workBreakdown
      if (!p.workBreakdown) return true;

      // 1. Ownership Validation (Crucial to hide stale payments after reassignment)
      if (p.workBreakdown.assignedEditor) {
        const currentAssignedId = p.workBreakdown.assignedEditor._id
          ? p.workBreakdown.assignedEditor._id.toString()
          : p.workBreakdown.assignedEditor.toString();

        if (currentAssignedId !== editorId) {
          return false; // Stale payment! Belongs to someone else now.
        }
      }

      // 2. Approval Validation
      // Work breakdown payments must be approved by BOTH
      const wb = p.workBreakdown;
      const bothApproved = wb.approvals?.admin && wb.approvals?.client;
      return bothApproved || wb.approved || wb.status === 'under_review';
    });

    // 5. Ensure the editor field reflects CURRENT assignment for accurate display
    const refinedPayments = payments.map(p => {
      const paymentObj = p.toObject();
      if (paymentObj.workBreakdown && paymentObj.workBreakdown.assignedEditor) {
        paymentObj.editor = paymentObj.workBreakdown.assignedEditor;
      }
      return paymentObj;
    });

    res.json(refinedPayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get payments for a client

// @desc    Get payments for a client
// @route   GET /api/payments/client/:clientId
// @access  Private
exports.getClientPayments = async (req, res) => {
  try {
    const clientId = req.params.clientId || req.user._id;

    // Check if user is requesting their own payments or is admin
    if (req.user.role !== 'admin' && clientId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Filter out hidden payments
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const baseQuery = {
      paymentType: 'client_charge',
      $or: [
        { hiddenAt: null },
        { hiddenAt: { $gt: twoDaysAgo } }
      ]
    };

    if (req.user.role === 'admin' && !req.params.clientId) {
      // Admin without clientId: fetch all client charges
    } else {
      baseQuery.client = clientId;
    }

    const payments = await Payment.find(baseQuery)
      .populate('project', 'title clientAmount currency closed closedAt clientApprovedAt')
      .populate('client', 'name email')
      .sort({ createdAt: -1 });

    // Filter: only show payments for closed projects if it's a client charge and still pending
    // This addresses the user request to not show projects that are not closed in the payment page.
    const filteredPayments = payments.filter(p => {
      if (p.paymentType === 'client_charge' && !p.paid && !p.received) {
        return p.project && p.project.closed;
      }
      return true;
    });

    res.json(filteredPayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payments by editor for admin
// @route   GET /api/payments/admin/editor/:editorId
// @access  Private/Admin
exports.getPaymentsByEditor = async (req, res) => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // 1. Get all WorkBreakdowns assigned to this editor to find related payments regardless of stale payment.editor field
    const WorkBreakdown = require('../models/WorkBreakdown');
    let assignedWBIds = [];

    // Only fetch WBs if we are filtering by a specific editor
    if (req.params.editorId && req.params.editorId !== 'all') {
      const assignedWBs = await WorkBreakdown.find({ assignedEditor: req.params.editorId }).select('_id');
      assignedWBIds = assignedWBs.map(wb => wb._id);
    }

    let query = {
      paymentType: { $in: ['editor_payout', 'bonus', 'deduction', null] },
      status: { $ne: 'locked' },
      paid: false,
      $or: [
        { hiddenAt: null },
        { hiddenAt: { $gt: twoDaysAgo } }
      ]
    };

    if (req.params.editorId !== 'all') {
      // Find payments that either:
      // A) Are explicitly assigned to this editor (legacy or direct)
      // B) Are linked to a WorkBreakdown that is currently assigned to this editor (Dynamic)
      query.$or = [
        ...query.$or, // Keep hiddenAt check logic merged? No, this is tricky structure.
      ];

      // Re-structuring query for complex OR condition combining hiddenAt AND (editor OR workBreakdown)
      // We need: (HiddenCheck) AND ( (EditorCheck) OR (WBCheck) )

      query = {
        $and: [
          {
            paymentType: { $in: ['editor_payout', 'bonus', 'deduction', null] },
            status: { $ne: 'locked' },
            paid: false,
            $or: [
              { hiddenAt: null },
              { hiddenAt: { $gt: twoDaysAgo } }
            ]
          },
          {
            $or: [
              { editor: req.params.editorId },
              { workBreakdown: { $in: assignedWBIds } }
            ]
          }
        ]
      };
    }

    const payments = await Payment.find(query)
      .populate('project', 'title deadline currency')
      .populate({
        path: 'workBreakdown',
        select: 'workType status approved approvals assignedEditor',
        populate: { path: 'assignedEditor', select: 'name email' }
      })
      .populate('client', 'name email')
      .populate('editor', 'name email')
      .sort({ createdAt: -1 });

    // 3rd step: Auto-calculate penalties for pending payments
    for (const payment of payments) {
      const isCompleted = payment.workBreakdown && (payment.workBreakdown.status === 'completed' || payment.workBreakdown.approved);

      if (payment.paymentType === 'editor_payout' && !payment.paid && !isCompleted) {
        const deadline = new Date(payment.deadline);
        const now = new Date();

        if (now > deadline) {
          const penaltyResult = calculatePenalty(deadline, payment.originalAmount, now);
          if (penaltyResult.penaltyAmount > 0) {
            payment.penaltyAmount = penaltyResult.penaltyAmount;
            payment.finalAmount = penaltyResult.finalAmount;
            payment.deadlineCrossed = true;
            payment.daysLate = penaltyResult.daysLate;
            await payment.save();
          }
        }
      }
    }

    const filteredPayments = payments.filter(p => {
      // 1. Ownership Validation (Crucial for Admin view to hide stale payments)
      // If the WB is assigned to someone else, hide it from THIS editor's view
      if (req.params.editorId !== 'all' && p.workBreakdown) {
        if (p.workBreakdown.assignedEditor) {
          const currentAssignedId = p.workBreakdown.assignedEditor._id
            ? p.workBreakdown.assignedEditor._id.toString()
            : p.workBreakdown.assignedEditor.toString();

          if (currentAssignedId !== req.params.editorId) {
            return false;
          }
        }
      }

      const isEditorPayout = p.paymentType === 'editor_payout' || p.paymentType === null || p.paymentType === undefined;

      if (p.workBreakdown && isEditorPayout) {
        const wb = p.workBreakdown;
        const adminApproved = wb.approvals?.admin;
        const clientApproved = wb.approvals?.client;
        const bothApproved = adminApproved && clientApproved;

        if (!bothApproved && !wb.approved) {
          return false;
        }
      }
      return true;
    });

    // Ensure the editor field reflects CURRENT assignment for accurate display
    const refinedPayments = filteredPayments.map(p => {
      const paymentObj = p.toObject();
      if (paymentObj.workBreakdown && paymentObj.workBreakdown.assignedEditor) {
        paymentObj.editor = paymentObj.workBreakdown.assignedEditor;
      }
      return paymentObj;
    });

    res.json(refinedPayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload payment screenshot and mark as paid
// @route   PUT /api/payments/:id/pay
// @access  Private/Admin
exports.markPaymentPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentType !== 'editor_payout') {
      return res.status(400).json({ message: 'Only editor payouts can be marked as paid here' });
    }

    // Handle payment screenshot upload
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-payments/screenshots');
        payment.paymentScreenshot = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading screenshot: ' + uploadError.message });
      }
    }

    payment.paymentType = payment.paymentType || 'editor_payout';
    payment.paid = true;
    payment.paidAt = new Date();
    payment.status = 'paid';

    // Sync editor before saving if workBreakdown exists
    if (payment.workBreakdown) {
      const wb = await WorkBreakdown.findById(payment.workBreakdown);
      if (wb && wb.assignedEditor) {
        payment.editor = wb.assignedEditor;
      }
    }

    await payment.save();

    // Notify Editor
    await createNotification(
      payment.editor,
      'payment_sent',
      'Payment Sent',
      `Admin has sent payment for project: ${payment.project ? payment.project.title : 'Unknown Project'}`,
      payment.project ? payment.project._id : null
    );

    const updatedPayment = await Payment.findById(payment._id)
      .populate('project', 'title')
      .populate('workBreakdown', 'workType')
      .populate('editor', 'name email');

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark payment as received by editor
// @route   PUT /api/payments/:id/received
// @access  Private/Editor
exports.markPaymentReceived = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentType !== 'editor_payout') {
      return res.status(400).json({ message: 'Only editor payouts can be marked as received by editors' });
    }

    // Check if editor is authorized
    if (payment.editor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!payment.paid) {
      return res.status(400).json({ message: 'Payment must be marked as paid first' });
    }

    payment.received = true;
    payment.receivedAt = new Date();
    payment.hiddenAt = new Date(); // Will be hidden after 2 days
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);
    payment.deletedAt = deleteDate;
    await payment.save();

    // Notify Admin: Editor received payment
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'payment_received',
        'Editor Received Payment',
        `Editor ${req.user.name} has marked payment as received for project: ${payment.project ? payment.project.title : 'Unknown Project'}`,
        payment.project ? payment.project._id : null
      );
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate('project', 'title')
      .populate('workBreakdown', 'workType');

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark client payment as received by admin
// @route   PUT /api/payments/:id/client-received
// @access  Private/Admin
exports.markClientPaymentReceived = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentType !== 'client_charge') {
      return res.status(400).json({ message: 'Only client charges can be marked as received by admin' });
    }

    payment.received = true;
    payment.receivedAt = new Date();
    payment.hiddenAt = new Date();
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);
    payment.deletedAt = deleteDate;
    await payment.save();

    // Notify Client
    await createNotification(
      payment.client,
      'payment_received',
      'Payment Received',
      `Admin has received your payment for project: ${payment.project ? payment.project.title : 'Unknown Project'}`,
      payment.project ? payment.project._id : null
    );

    const updatedPayment = await Payment.findById(payment._id)
      .populate('project', 'title')
      .populate('client', 'name email');

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark client payment as paid (Client uploads proof)
// @route   PUT /api/payments/:id/client-pay
// @access  Private/Client
exports.markClientPaymentPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentType !== 'client_charge') {
      return res.status(400).json({ message: 'Only client charges can be marked as paid by client' });
    }

    // Check if client is authorized
    if (payment.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Handle payment screenshot upload
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-payments/screenshots');
        payment.paymentScreenshot = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading screenshot: ' + uploadError.message });
      }
    } else {
      return res.status(400).json({ message: 'Payment screenshot is required' });
    }

    payment.paid = true;
    payment.paidAt = new Date();
    await payment.save();

    // Notify Admin: Client sent payment (uploaded proof)
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'client_payment_received',
        'Client Sent Payment',
        `Client ${req.user.name} sent payment for project "${payment.project ? payment.project.title : 'Unknown'}"`,
        payment.project ? payment.project._id : null
      );
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate('project', 'title')
      .populate('client', 'name email');

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark bulk editor payments as paid (Admin)
// @route   PUT /api/payments/pay-bulk
// @access  Private/Admin
exports.markBulkPaymentsPaid = async (req, res) => {
  try {
    const { paymentIds } = req.body;
    const ids = JSON.parse(paymentIds);
    const bonusAmount = parseFloat(req.body.bonusAmount) || 0;
    const deductionAmount = parseFloat(req.body.deductionAmount) || 0;
    const bonusNote = req.body.bonusNote || 'Bonus';
    const deductionNote = req.body.deductionNote || 'Deduction';
    // We need an editor ID to assign the bonus/deduction to. 
    // We can infer it from the payments or it can be passed passed. 
    // Since we are paying bulk, we assume they belong to the same editor context.
    // Let's find one payment to get the editor ID if not passed.

    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'No payment IDs provided' });
    }

    // Find the editor from the first payment if possible, or query it.
    // Ideally the frontend passes editorId, but let's be robust.
    const firstPayment = await Payment.findById(ids[0]).populate('project');
    const editorId = req.body.editorId || (firstPayment ? firstPayment.editor : null);
    const contextCurrency = firstPayment?.currency || firstPayment?.project?.currency || 'INR';
    const contextProjectId = firstPayment?.project?._id || firstPayment?.project || null;

    const updateData = {
      status: 'paid',
      paid: true,
      paidAt: new Date(),
    };

    if (editorId) {
      updateData.editor = editorId;
    }

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-payments/screenshots');
        updateData.paymentScreenshot = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading screenshot: ' + uploadError.message });
      }
    }

    // Create Bonus Payment if applicable
    if (bonusAmount > 0 && editorId) {
      await Payment.create({
        paymentType: 'bonus',
        editor: editorId,
        project: contextProjectId,
        currency: contextCurrency,
        originalAmount: bonusAmount,
        finalAmount: bonusAmount,
        workType: bonusNote,
        status: 'paid',
        paid: true,
        paidAt: new Date(),
        deadline: new Date(),
        paymentScreenshot: updateData.paymentScreenshot
      });
    }

    // Create Deduction Payment if applicable
    if (deductionAmount > 0 && editorId) {
      await Payment.create({
        paymentType: 'deduction',
        editor: editorId,
        project: contextProjectId,
        currency: contextCurrency,
        originalAmount: -Math.abs(deductionAmount), // Store as negative
        finalAmount: -Math.abs(deductionAmount),
        workType: deductionNote,
        status: 'paid',
        paid: true,
        paidAt: new Date(),
        deadline: new Date(),
        paymentScreenshot: updateData.paymentScreenshot
      });
    }

    await Payment.updateMany(
      { _id: { $in: ids }, paymentType: { $in: ['editor_payout', 'bonus', 'deduction', null] } },
      { $set: updateData }
    );

    // Notify Editors (Fetch payments to know who to notify)
    const payments = await Payment.find({ _id: { $in: ids }, paymentType: { $in: ['editor_payout', 'bonus', 'deduction', null] } }).populate('project', 'title');
    for (const payment of payments) {
      if (payment.editor) {
        await createNotification(
          payment.editor,
          'payment_sent',
          'Payment Sent',
          `Admin has sent payment for project: ${payment.project ? payment.project.title : 'Unknown Project'}`,
          payment.project ? payment.project._id : null
        );
      }
    }

    res.json({ message: 'Payments marked as paid successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark bulk client payments as paid (Client)
// @route   PUT /api/payments/client-pay-bulk
// @access  Private/Client
exports.markBulkClientPaymentsPaid = async (req, res) => {
  try {
    const { paymentIds } = req.body;
    const ids = JSON.parse(paymentIds);

    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: 'No payment IDs provided' });
    }

    const updateData = {
      paid: true,
      paidAt: new Date(),
    };

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-payments/screenshots');
        updateData.paymentScreenshot = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading screenshot: ' + uploadError.message });
      }
    } else {
      return res.status(400).json({ message: 'Screenshot is required' });
    }

    // Ensure client owns these payments
    await Payment.updateMany(
      { _id: { $in: ids }, client: req.user._id, paymentType: 'client_charge' },
      { $set: updateData }
    );

    res.json({ message: 'Payments marked as paid successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark bulk client payments as received (Admin)
// @route   PUT /api/payments/client-received-bulk
// @access  Private/Admin
exports.markBulkClientPaymentsReceived = async (req, res) => {
  try {
    const { paymentIds } = req.body;

    if (!paymentIds || paymentIds.length === 0) {
      return res.status(400).json({ message: 'No payment IDs provided' });
    }

    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);

    await Payment.updateMany(
      { _id: { $in: paymentIds }, paymentType: 'client_charge' },
      {
        $set: {
          received: true,
          receivedAt: new Date(),
          hiddenAt: new Date(),
          deletedAt: deleteDate
        }
      }
    );

    res.json({ message: 'Payments marked as received successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark bulk editor payments as received (Editor)
// @route   PUT /api/payments/received-bulk
// @access  Private/Editor
exports.markBulkPaymentsReceived = async (req, res) => {
  try {
    const { paymentIds } = req.body;

    if (!paymentIds || paymentIds.length === 0) {
      return res.status(400).json({ message: 'No payment IDs provided' });
    }

    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);

    await Payment.updateMany(
      { _id: { $in: paymentIds }, editor: req.user._id, paymentType: 'editor_payout' },
      {
        $set: {
          received: true,
          receivedAt: new Date(),
          hiddenAt: new Date(),
          deletedAt: deleteDate
        }
      }
    );

    res.json({ message: 'Payments marked as received successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// @desc    Create manual payment adjustment (bonus/deduction)
// @route   POST /api/payments/manual
// @access  Private/Admin
exports.createManualPayment = async (req, res) => {
  try {
    const { paymentType, amount, description, editorId, clientId, projectId, markAsPaid } = req.body;

    if (!['bonus', 'deduction', 'editor_payout', 'client_charge'].includes(paymentType)) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }

    const payload = {
      paymentType,
      originalAmount: paymentType === 'deduction' ? -Math.abs(amount) : Math.abs(amount),
      finalAmount: paymentType === 'deduction' ? -Math.abs(amount) : Math.abs(amount),
      workType: description || (paymentType === 'bonus' ? 'Bonus' : 'Deduction'),
      editor: editorId || null,
      client: clientId || null,
      project: projectId || null,
      status: markAsPaid ? 'paid' : 'pending',
      paid: !!markAsPaid,
      paidAt: markAsPaid ? new Date() : null,
      deadline: new Date(), // Manual adjustments are immediate
    };

    if (projectId) {
      const Project = require('../models/Project');
      const proj = await Project.findById(projectId);
      if (proj) payload.currency = proj.currency;
    }

    const payment = await Payment.create(payload);

    // Notification
    const targetUserId = editorId || clientId;
    if (targetUserId) {
      await createNotification(
        targetUserId,
        'payment_update',
        'Payment Adjustment',
        `Admin has added a ${paymentType}: ${description || ''}`,
        projectId || null
      );
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment statistics (Revenue, Expenses, etc.)
// @route   GET /api/payments/stats
// @access  Private/Admin
exports.getPaymentStats = async (req, res) => {
  try {
    const now = new Date();
    const queryMonth = req.query.month ? parseInt(req.query.month) : (now.getMonth() + 1); // 1-12
    const queryYear = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const startOfMonth = new Date(queryYear, queryMonth - 1, 1);
    const endOfMonth = new Date(queryYear, queryMonth, 0, 23, 59, 59);

    const allPayments = await Payment.find({})
      .populate('project', 'currency')
      .populate('workBreakdown', 'status approved');

    // Grouping stats by currency to "strictly tally" as requested
    const statsByCurrency = {};

    const getStats = (currency) => {
      if (!statsByCurrency[currency]) {
        statsByCurrency[currency] = {
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalExpenses: 0,
          monthlyExpenses: 0,
          pendingClientIncome: 0,
          pendingEditorPayout: 0,
          netProfit: 0,
          monthlyNetProfit: 0
        };
      }
      return statsByCurrency[currency];
    };

    allPayments.forEach(p => {
      const currency = p.currency || (p.project && p.project.currency) || 'INR'; // Check direct field first
      const s = getStats(currency);
      const amount = p.finalAmount || p.originalAmount || 0;

      if (p.paymentType === 'client_charge') {
        if (p.received) {
          s.totalRevenue += amount;
          const receivedDate = new Date(p.receivedAt);
          if (receivedDate >= startOfMonth && receivedDate <= endOfMonth) {
            s.monthlyRevenue += amount;
          }
        } else {
          s.pendingClientIncome += amount;
        }
      } else if (['editor_payout', 'bonus', 'deduction'].includes(p.paymentType)) {
        if (p.paid) {
          s.totalExpenses += amount;
          const paidDate = new Date(p.paidAt);
          if (paidDate >= startOfMonth && paidDate <= endOfMonth) {
            s.monthlyExpenses += amount;
          }
        } else {
          let isPendingVisible = true;
          if (p.status === 'locked') isPendingVisible = false;
          if (p.paymentType === 'editor_payout' && p.workBreakdown) {
            if (!p.workBreakdown.approved && p.workBreakdown.status !== 'completed') {
              isPendingVisible = false;
            }
          }

          if (isPendingVisible) {
            s.pendingEditorPayout += amount;
          }
        }
      }
    });

    // Calculate profit for each currency
    Object.keys(statsByCurrency).forEach(curr => {
      const s = statsByCurrency[curr];
      s.netProfit = s.totalRevenue - s.totalExpenses;
      s.monthlyNetProfit = s.monthlyRevenue - s.monthlyExpenses;
    });

    // For backward compatibility with frontend, return INR if it's the primary, 
    // but ideally the frontend should handle multiple currencies.
    // Let's return the full object and the primary currency as flat fields.
    const result = {
      ...statsByCurrency['INR'],
      currencies: statsByCurrency
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payment history with filters
// @route   GET /api/payments/history
// @access  Private/Admin
exports.getPaymentHistory = async (req, res) => {
  try {
    const { period, type } = req.query; // period: 'week', 'month', 'year', 'all' | type: 'all', 'income', 'expense'

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const now = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0); // All time
    }

    let query = { $or: [] };

    // Income Condition (Client Charges Received)
    const incomeCondition = {
      paymentType: 'client_charge',
      received: true,
      receivedAt: { $gte: startDate }
    };

    // Expense Condition (Editor Payouts Paid)
    const expenseCondition = {
      paymentType: { $in: ['editor_payout', 'bonus', 'deduction'] },
      paid: true,
      paidAt: { $gte: startDate }
    };

    if (type === 'income') {
      query = incomeCondition;
    } else if (type === 'expense') {
      query = expenseCondition;
    } else {
      query.$or = [incomeCondition, expenseCondition];
    }

    const history = await Payment.find(query)
      .populate('project', 'title')
      .populate('client', 'name email')
      .populate('editor', 'name email')
      .populate({
        path: 'workBreakdown',
        select: 'assignedEditor',
        populate: { path: 'assignedEditor', select: 'name email' }
      })
      .sort({ createdAt: -1 });

    // sorting in JS by actual transaction date
    const sortedHistory = history.sort((a, b) => {
      const dateA = a.paymentType === 'client_charge' ? a.receivedAt : a.paidAt;
      const dateB = b.paymentType === 'client_charge' ? b.receivedAt : b.paidAt;
      return new Date(dateB) - new Date(dateA);
    });

    // Ensure editor name reflects current assignment for history consistency
    const refinedHistory = sortedHistory.map(p => {
      const paymentObj = p.toObject();
      if (paymentObj.workBreakdown && paymentObj.workBreakdown.assignedEditor) {
        paymentObj.editor = paymentObj.workBreakdown.assignedEditor;
      }
      return paymentObj;
    });

    res.json(refinedHistory);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};