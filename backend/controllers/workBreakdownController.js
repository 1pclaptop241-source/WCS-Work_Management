const WorkBreakdown = require('../models/WorkBreakdown');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const calculatePenalty = require('../utils/calculatePenalty');
const { createNotification } = require('../utils/notificationService');
const User = require('../models/User'); // Added for notifications
const logActivity = require('../utils/activityLogger');

// @desc    Get work breakdown for a project
// @route   GET /api/work-breakdown/project/:projectId
// @access  Private
exports.getWorkBreakdownByProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Authorization: Admin, project owner (client), or assigned editor
    const isClientOwner = project.client.toString() === req.user._id.toString();
    const isAssignedEditor = project.assignedEditor && project.assignedEditor.toString() === req.user._id.toString();

    // Editors might also be assigned to specific work items but not the whole project
    // So we'll fetch the WBs and then check if the editor is in any of them if the above fails.

    const workBreakdown = await WorkBreakdown.find({ project: req.params.projectId })
      .populate('assignedEditor', 'name email')
      .populate('approvedBy', 'name email')
      .populate('feedback.from', 'name role')
      .sort({ createdAt: 1 });

    const isWorker = workBreakdown.some(wb => wb.assignedEditor && wb.assignedEditor._id.toString() === req.user._id.toString());

    if (!(req.user.role === 'admin' || isClientOwner || isAssignedEditor || isWorker)) {
      return res.status(403).json({ message: 'Not authorized to view work breakdown for this project' });
    }

    res.json(workBreakdown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get work breakdown by editor
// @route   GET /api/work-breakdown/editor/:editorId
// @access  Private
exports.getWorkBreakdownByEditor = async (req, res) => {
  try {
    const editorId = req.params.editorId || req.user._id;

    // Check if user is requesting their own work or is admin
    if (req.user.role !== 'admin' && editorId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const workBreakdown = await WorkBreakdown.find({ assignedEditor: editorId })
      .populate('project', 'title client')
      .populate('assignedEditor', 'name email')
      .populate('feedback.from', 'name role')
      .sort({ deadline: 1 });

    res.json(workBreakdown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update work breakdown status
// @route   PUT /api/work-breakdown/:id
// @access  Private
exports.updateWorkBreakdown = async (req, res) => {
  try {
    const workBreakdown = await WorkBreakdown.findById(req.params.id)
      .populate('project');

    if (!workBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    const editorId = req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssignedEditor = workBreakdown.assignedEditor.toString() === editorId;

    if (!(isAdmin || (req.user.role === 'editor' && isAssignedEditor))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Admin updates (assignee, deadline, amount)
    if (isAdmin) {
      if (req.body.assignedEditor && req.body.assignedEditor !== workBreakdown.assignedEditor.toString()) {
        workBreakdown.assignedEditor = req.body.assignedEditor;
        // If reassigning, reset status if it was declined
        if (workBreakdown.status === 'declined') {
          workBreakdown.status = 'pending';
        }
        // RESET APPROVALS logic when reassigning
        workBreakdown.approvals = { client: false, admin: false };
        workBreakdown.approved = false;
        workBreakdown.approvedBy = null;
        workBreakdown.approvedAt = null;
      }
      if (req.body.deadline) workBreakdown.deadline = req.body.deadline;
      if (req.body.amount) workBreakdown.amount = req.body.amount;

      // Handle optional sharing details and links
      let detailsUpdated = false;
      if (req.body.shareDetails !== undefined && req.body.shareDetails !== workBreakdown.shareDetails) {
        workBreakdown.shareDetails = req.body.shareDetails;
        detailsUpdated = true;
      }
      if (req.body.links !== undefined) {
        workBreakdown.links = req.body.links;
        detailsUpdated = true;
      }

      // Notify editor if details were updated
      if (detailsUpdated) {
        await createNotification(
          workBreakdown.assignedEditor,
          'assignment_details_updated',
          'Assignment Details Updated',
          `The admin has updated the details/links for your assignment "${workBreakdown.workType}" in project "${workBreakdown.project.title}".`,
          workBreakdown.project._id
        );
      }
    }

    // Status updates (both admin and editor can update status in general, e.g. to in_progress)
    if (req.body.status) {
      workBreakdown.status = req.body.status;
    }

    await workBreakdown.save();
    await logActivity(req, 'USER_UPDATED', `Work breakdown updated: ${workBreakdown.workType} in Project "${workBreakdown.project?.title || ''}"`, workBreakdown._id, 'WorkBreakdown');

    // Sync changes to Payment record if Admin updated fields
    if (isAdmin) {
      const paymentUpdates = {};
      if (req.body.assignedEditor) {
        paymentUpdates.editor = req.body.assignedEditor;
        paymentUpdates.status = 'locked'; // Reset status to locked for new editor
        paymentUpdates.deadlineCrossed = false; // Reset penalty flags
        paymentUpdates.penaltyAmount = 0;
        paymentUpdates.daysLate = 0;
      }
      if (req.body.amount) {
        paymentUpdates.originalAmount = req.body.amount;
        // Reset finalAmount to new amount (clears penalties if any, assuming re-negotiation)
        paymentUpdates.finalAmount = req.body.amount;
      }
      if (req.body.deadline) paymentUpdates.deadline = req.body.deadline;

      if (Object.keys(paymentUpdates).length > 0) {
        await Payment.findOneAndUpdate(
          { workBreakdown: req.params.id },
          { $set: paymentUpdates }
        );
      }
    }

    const updated = await WorkBreakdown.findById(workBreakdown._id)
      .populate('assignedEditor', 'name email')
      .populate('project', 'title');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Decline work assignment
// @route   PUT /api/work-breakdown/:id/decline
// @access  Private (Editor only)
exports.declineWork = async (req, res) => {
  try {
    const workBreakdown = await WorkBreakdown.findById(req.params.id);

    if (!workBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    if (workBreakdown.assignedEditor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check time constraint: Cannot decline if < 20% time remaining
    // Assuming "time remaining" is calculated from (Now - CreatedAt) vs (Deadline - CreatedAt)
    // Or just (Deadline - Now) vs (Total Duration)?
    // The requirement says: "disable ... when the timeleft for deadline is under 80%."
    // This usually means 80% of time is USED, so 20% remains.
    // Let's implement: if (now > deadline - (totalDuration * 0.2)) then FAIL.

    const now = new Date();
    const deadline = new Date(workBreakdown.deadline);
    const created = new Date(workBreakdown.createdAt);
    const totalDuration = deadline - created;
    const timeRemaining = deadline - now;

    // strict check: if we are past deadline, definitely can't decline
    if (now > deadline) {
      return res.status(400).json({ message: 'Cannot decline work after deadline.' });
    }

    // Check if more than 80% time remains (less than 20% used)
    if (totalDuration > 0) {
      const percentageRemaining = timeRemaining / totalDuration;
      if (percentageRemaining < 0.8) {
        return res.status(400).json({ message: 'Cannot decline work when less than 80% of time remains. You can only decline in the early stages of the project.' });
      }
    }

    workBreakdown.status = 'declined';
    await workBreakdown.save();
    await logActivity(req, 'USER_UPDATED', `Work declined: ${workBreakdown.workType}`, workBreakdown._id, 'WorkBreakdown');

    // Ideally send notification to admin here (omitted for brevity as per plan)

    res.json(workBreakdown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve work type
// @route   PUT /api/work-breakdown/:id/approve
// @access  Private (Client or Admin)
exports.approveWorkType = async (req, res) => {
  try {
    const workBreakdown = await WorkBreakdown.findById(req.params.id)
      .populate('project');

    if (!workBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    // Check permissions
    const isClientOwner = workBreakdown.project.client.toString() === req.user._id.toString();
    if (!(isClientOwner || req.user.role === 'admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Use atomic update to set approval flag
    const updateData = {};
    if (req.user.role === 'client') {
      updateData['approvals.client'] = true;
    } else if (req.user.role === 'admin') {
      updateData['approvals.admin'] = true;
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedWorkBreakdown = await WorkBreakdown.findOneAndUpdate(
      { _id: req.params.id },
      { $set: updateData },
      { new: true }
    ).populate('project');

    if (!updatedWorkBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    // Mark approved ONLY if both are true AND it's not already approved
    if (updatedWorkBreakdown.approvals.client && updatedWorkBreakdown.approvals.admin && !updatedWorkBreakdown.approved) {
      updatedWorkBreakdown.approved = true;
      updatedWorkBreakdown.status = 'completed';
      updatedWorkBreakdown.approvedBy = req.user._id;
      updatedWorkBreakdown.approvedAt = new Date();
      await updatedWorkBreakdown.save();
      await logActivity(req, 'APPROVE_WORK', `Work approved: ${updatedWorkBreakdown.workType} in Project "${updatedWorkBreakdown.project?.title || ''}"`, updatedWorkBreakdown._id, 'WorkBreakdown');
    }

    // Update project approval dates when work is approved
    if (updatedWorkBreakdown.approved) {
      const project = updatedWorkBreakdown.project; // Already populated
      if (req.user.role === 'client') {
        project.clientApprovedAt = new Date();
      } else if (req.user.role === 'admin') {
        project.adminApprovedAt = new Date();
      }

      // Set both boolean flags if both approval dates exist
      if (project.adminApprovedAt && project.clientApprovedAt) {
        project.adminApproved = true;
        project.clientApproved = true;
      }
      await project.save();
    }

    // Create or update payment record only when fully approved by both
    if (updatedWorkBreakdown.approved) {
      const project = updatedWorkBreakdown.project; // Already populated
      const now = new Date();

      const penaltyResult = calculatePenalty(updatedWorkBreakdown.deadline, updatedWorkBreakdown.amount, now);

      const deadlineCrossed = penaltyResult.daysLate > 0;
      const finalAmount = penaltyResult.finalAmount;
      const penaltyAmount = penaltyResult.penaltyAmount;
      const daysLate = penaltyResult.daysLate;

      // Check if payment already exists
      let payment = await Payment.findOne({
        project: project._id,
        workBreakdown: updatedWorkBreakdown._id
      });

      if (!payment) {
        payment = await Payment.create({
          paymentType: 'editor_payout',
          project: project._id,
          workBreakdown: updatedWorkBreakdown._id,
          editor: updatedWorkBreakdown.assignedEditor,
          client: project.client,
          workType: updatedWorkBreakdown.workType,
          originalAmount: updatedWorkBreakdown.amount,
          finalAmount: finalAmount,
          deadline: updatedWorkBreakdown.deadline,
          deadlineCrossed: deadlineCrossed,
          daysLate: daysLate,
          penaltyAmount: penaltyAmount,
          status: 'calculated', // Stop the deadline counting now that it's approved
          calculatedAt: now,
        });
      } else {
        // Update existing payment
        payment.editor = updatedWorkBreakdown.assignedEditor; // SYNC EDITOR
        payment.paymentType = payment.paymentType || 'editor_payout';
        payment.originalAmount = updatedWorkBreakdown.amount;
        payment.finalAmount = finalAmount;
        payment.deadlineCrossed = deadlineCrossed;
        payment.daysLate = daysLate;
        payment.penaltyAmount = penaltyAmount;
        payment.status = 'calculated'; // Stop the deadline counting
        payment.calculatedAt = now;
        await payment.save();
      }

      // Notification Logic
      await createNotification(
        updatedWorkBreakdown.assignedEditor,
        'work_approved',
        'Work Approved',
        `Your work "${updatedWorkBreakdown.workType}" for project "${project.title}" has been approved!`,
        project._id
      );

      // If all work items are approved by both, mark project completed
      const allWork = await WorkBreakdown.find({ project: project._id });
      const allApproved = allWork.length === 0 ? false : allWork.every(w => w.approved === true);
      if (allApproved) {
        project.status = 'completed';
        project.completedAt = project.completedAt || new Date();
        await project.save();
      }
    }

    const updated = await WorkBreakdown.findById(updatedWorkBreakdown._id)
      .populate('assignedEditor', 'name email')
      .populate('approvedBy', 'name email')
      .populate('project', 'title');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add feedback to work breakdown
// @route   POST /api/work-breakdown/:id/feedback
// @access  Private (Admin or Client)
exports.addWorkFeedback = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Feedback content is required' });
    }

    const workBreakdown = await WorkBreakdown.findById(req.params.id).populate('project');
    if (!workBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    // Check permissions
    const isClientOwner = workBreakdown.project.client.toString() === req.user._id.toString();
    const isAssignedEditor = workBreakdown.assignedEditor && workBreakdown.assignedEditor.toString() === req.user._id.toString();
    if (!(isClientOwner || req.user.role === 'admin' || isAssignedEditor)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    workBreakdown.feedback.push({
      from: req.user._id,
      content,
      timestamp: new Date()
    });

    await workBreakdown.save();

    // Notify relevant parties
    const { createNotification } = require('../utils/notificationService');
    if (req.user.role === 'editor') {
      // Notify Admin
      await createNotification(
        null, // Admin notification usually handled by role if supported, else find admin
        'work_feedback',
        'Editor Feedback Received',
        `Editor ${req.user.name} replied to feedback for "${workBreakdown.workType}" in project "${workBreakdown.project.title}".`,
        workBreakdown.project._id,
        true // isAdminNotification
      );
      // Notify Client
      await createNotification(
        workBreakdown.project.client,
        'work_feedback',
        'Editor Feedback Received',
        `Editor ${req.user.name} replied to feedback for "${workBreakdown.workType}" in project "${workBreakdown.project.title}".`,
        workBreakdown.project._id
      );
    } else {
      // Notify editor
      await createNotification(
        workBreakdown.assignedEditor,
        'work_feedback',
        'New Feedback Received',
        `${req.user.name} provided feedback for "${workBreakdown.workType}" in project "${workBreakdown.project.title}".`,
        workBreakdown.project._id
      );
    }

    const updated = await WorkBreakdown.findById(workBreakdown._id)
      .populate('feedback.from', 'name role')
      .populate('assignedEditor', 'name email')
      .populate('project', 'title');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

