const WorkSubmission = require('../models/WorkSubmission');
const Project = require('../models/Project');
const WorkBreakdown = require('../models/WorkBreakdown');
const Payment = require('../models/Payment');
const calculatePenalty = require('../utils/calculatePenalty');

const User = require('../models/User');
const { createNotification } = require('../utils/notificationService');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Upload work submission
// @route   POST /api/works
// @access  Private/Editor
exports.uploadWork = async (req, res) => {
  try {
    const { projectId, workBreakdownId, linkUrl } = req.body;

    if (!req.file && !linkUrl) {
      return res.status(400).json({ message: 'Please upload a file or provide a link' });
    }

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    let isAuthorized = false;

    // Check if user is assigned to the specific work breakdown
    if (workBreakdownId) {
      const workBreakdown = await WorkBreakdown.findById(workBreakdownId);
      if (workBreakdown && workBreakdown.assignedEditor.toString() === req.user._id.toString()) {
        isAuthorized = true;
      }
    }

    // Fallback: Check if user is the main project editor
    if (!isAuthorized && project.assignedEditor?.toString() === req.user._id.toString()) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to submit work for this project' });
    }

    let fileUrl, fileName, submissionType;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-works/submissions');
        fileUrl = uploadResult.secure_url;
        fileName = req.file.originalname;
        submissionType = 'file';
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading work file: ' + uploadError.message });
      }
    } else {
      fileUrl = linkUrl;
      fileName = req.body.fileName || 'External Link';
      submissionType = 'link';
    }

    // Determine Version Number
    const existingSubmissions = await WorkSubmission.find({ workBreakdown: workBreakdownId }).countDocuments();
    const version = existingSubmissions + 1;

    const workSubmission = await WorkSubmission.create({
      project: projectId,
      workBreakdown: workBreakdownId,
      editor: req.user._id,
      fileUrl,
      fileName,
      submissionType,
      version: version,
      changelog: req.body.editorMessage || `Version ${version} submission`,
      status: 'pending',
      editorMessage: req.body.editorMessage || '',
    });

    // Update project status
    project.status = 'submitted';
    await project.save();

    // Update work breakdown status
    if (workBreakdownId) {
      const workBreakdown = await WorkBreakdown.findById(workBreakdownId);
      if (workBreakdown) {
        workBreakdown.status = 'under_review'; // STRICT TRANSITION
        await workBreakdown.save();
      }
    }

    // NOTIFICATIONS
    const notifType = project.status === 'needs_revision' ? 'work_updated' : 'work_uploaded'; // Simple heuristic
    const notifTitle = notifType === 'work_updated' ? 'Work Updated' : 'Work Uploaded';
    const notifMsgClient = notifType === 'work_updated' ? 'Editor has updated the work after corrections.' : 'Editor has uploaded new work.';
    const notifMsgAdmin = `Editor ${req.user.name} uploaded work for project "${project.title}".`;

    // 1. Notify Client
    await createNotification(
      project.client,
      notifType,
      notifTitle,
      notifMsgClient,
      project._id
    );

    // 2. Notify Admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'work_uploaded', // Always use work_uploaded/updated for admin tracking
        'Work Uploaded',
        notifMsgAdmin,
        project._id
      );
    }

    const populatedWork = await WorkSubmission.findById(workSubmission._id)
      .populate('project', 'title')
      .populate('editor', 'name email');

    res.status(201).json(populatedWork);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get work submissions for a project
// @route   GET /api/works/project/:projectId
// @access  Private
exports.getWorkByProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check access permissions
    if (req.user.role === 'client' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'editor' && (!project.assignedEditor || project.assignedEditor.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const works = await WorkSubmission.find({ project: req.params.projectId })
      .populate('editor', 'name email')
      .populate('project', 'title')
      .sort({ submittedAt: -1 });

    res.json(works);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add corrections/feedback (Client or Admin)
// @route   POST /api/works/:id/corrections
// @access  Private/Client|Admin
exports.addCorrections = async (req, res) => {
  try {
    const { text } = req.body;

    const work = await WorkSubmission.findById(req.params.id).populate('project');

    if (!work) {
      return res.status(404).json({ message: 'Work submission not found' });
    }

    // Authorization: client (owner) or admin
    const isClientOwner = work.project.client.toString() === req.user._id.toString();
    if (!(isClientOwner || req.user.role === 'admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let voiceFilePath = '';
    let mediaFilePaths = [];

    if (req.files) {
      if (req.files['voiceFile']) {
        try {
          const result = await uploadToCloudinary(req.files['voiceFile'][0].buffer, 'wcs-works/corrections/voice');
          voiceFilePath = result.secure_url;
        } catch (err) {
          return res.status(500).json({ message: 'Error uploading voice file: ' + err.message });
        }
      }
      if (req.files['mediaFiles']) {
        try {
          const uploadPromises = req.files['mediaFiles'].map(file =>
            uploadToCloudinary(file.buffer, 'wcs-works/corrections/media')
          );
          const results = await Promise.all(uploadPromises);
          mediaFilePaths = results.map(r => r.secure_url);
        } catch (err) {
          return res.status(500).json({ message: 'Error uploading media files: ' + err.message });
        }
      }
    }

    // Add new correction
    const newCorrection = {
      text: text || '',
      voiceFile: voiceFilePath,
      mediaFiles: mediaFilePaths,
      addedBy: req.user._id,
      addedAt: new Date(),
      done: false,
    };

    work.corrections.push(newCorrection);
    work.status = 'needs_revision';

    // Update work breakdown status to reflect revisions needed
    if (work.workBreakdown) {
      await WorkBreakdown.findByIdAndUpdate(work.workBreakdown, { status: 'in_progress' });
    }

    // Update project status
    const project = await Project.findById(work.project._id);
    project.status = 'under_review';
    await project.save();

    // NOTIFICATIONS
    // 1. Notify Editor
    await createNotification(
      work.editor,
      'correction_requested',
      'Correction Requested',
      `Correction requested for work in project "${project.title}".`,
      project._id
    );

    // 2. If Client requested, Notify Admin
    if (req.user.role === 'client') {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          'correction_requested',
          'Client Requested Correction',
          `Client requested correction for project "${project.title}".`,
          project._id
        );
      }
    }

    await work.save();

    const updatedWork = await WorkSubmission.findById(work._id)
      .populate('editor', 'name email')
      .populate('project', 'title')
      .populate('corrections.addedBy', 'name email');

    res.json(updatedWork);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark correction as done (Editor, Admin, or Client)
// @route   PUT /api/works/:id/corrections/:correctionId/done
// @access  Private/Editor|Admin|Client
exports.markCorrectionDone = async (req, res) => {
  try {
    const work = await WorkSubmission.findById(req.params.id).populate('project');

    if (!work) {
      return res.status(404).json({ message: 'Work submission not found' });
    }

    const correction = work.corrections.id(req.params.correctionId);
    if (!correction) {
      return res.status(404).json({ message: 'Correction not found' });
    }

    // Authorization: assigned editor, admin, or client (project owner)
    const isAssignedEditor = work.editor.toString() === req.user._id.toString();
    const isClientOwner = work.project.client.toString() === req.user._id.toString();
    if (!(isAssignedEditor || req.user.role === 'admin' || isClientOwner)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    correction.done = true;
    correction.doneBy = req.user._id;
    correction.doneAt = new Date();

    // Check if all corrections are done
    const allDone = work.corrections.every(c => c.done);
    if (allDone) {
      work.correctionDone = true;
      work.correctionDoneBy = req.user._id;
      work.correctionDoneAt = new Date();
    }
    await work.save();

    // NOTIFICATIONS
    if (req.user.role === 'editor') {
      // Notify Client and Admin that editor fixed something
      await createNotification(
        work.project.client,
        'correction_done',
        'Correction Marked Done',
        `Editor has marked a correction as done for project "${work.project.title}".`,
        work.project._id
      );

      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          'correction_done',
          'Correction Marked Done',
          `Editor marked a correction as done for project "${work.project.title}".`,
          work.project._id
        );
      }
    } else if (req.user.role === 'admin' || req.user.role === 'client') {
      // Notify Editor that their work fix was acknowledged/marked done by admin/client
      await createNotification(
        work.editor,
        'correction_done',
        'Correction Acknowledged',
        `Your correction fix for project "${work.project.title}" has been marked as done by ${req.user.role}.`,
        work.project._id
      );
    }

    const updatedWork = await WorkSubmission.findById(work._id)
      .populate('editor', 'name email')
      .populate('project', 'title')
      .populate('corrections.addedBy', 'name email')
      .populate('corrections.doneBy', 'name email');

    res.json(updatedWork);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get work submissions by work breakdown
// @route   GET /api/works/work-breakdown/:workBreakdownId
// @access  Private
exports.getWorkByWorkBreakdown = async (req, res) => {
  try {
    const wb = await WorkBreakdown.findById(req.params.workBreakdownId).populate('project');
    if (!wb) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    // Authorization: Admin, project owner (client), or assigned editor
    const isClientOwner = wb.project.client.toString() === req.user._id.toString();
    const isAssignedEditor = wb.assignedEditor && wb.assignedEditor.toString() === req.user._id.toString();

    if (!(req.user.role === 'admin' || isClientOwner || isAssignedEditor)) {
      return res.status(403).json({ message: 'Not authorized to view submissions for this work' });
    }

    const works = await WorkSubmission.find({ workBreakdown: req.params.workBreakdownId })
      .populate('editor', 'name email')
      .populate('project', 'title')
      .populate('corrections.addedBy', 'name email')
      .populate('corrections.doneBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json(works);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get work submissions by editor
// @route   GET /api/works/editor/:editorId
// @access  Private
exports.getWorkByEditor = async (req, res) => {
  try {
    const editorId = req.params.editorId || req.user._id;

    // Check if user is requesting their own works or is admin
    if (req.user.role !== 'admin' && editorId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const works = await WorkSubmission.find({ editor: editorId })
      .populate('project', 'title deadline')
      .populate('editor', 'name email')
      .sort({ submittedAt: -1 });

    res.json(works);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Admin approve work submission
// @route   PUT /api/works/:id/admin-approve
// @access  Private/Admin
exports.adminApprove = async (req, res) => {
  try {
    const work = await WorkSubmission.findById(req.params.id).populate('project');

    if (!work) {
      return res.status(404).json({ message: 'Work submission not found' });
    }

    work.adminApproved = true;

    // Check if both approved
    if (work.clientApproved) {
      work.status = 'approved';
      if (work.workBreakdown) {
        const wb = await WorkBreakdown.findById(work.workBreakdown);
        if (wb) {
          const now = new Date();
          // Use approval time for penalty calculation
          const penaltyResult = calculatePenalty(wb.deadline, wb.amount, now);

          // Update breakdown
          wb.status = 'completed';
          wb.approved = true;
          wb.approvedAt = now;
          wb.approvals.admin = true;
          wb.approvals.client = true;
          await wb.save();

          // Update or Create Payment record
          let payment = await Payment.findOne({
            project: work.project._id,
            workBreakdown: wb._id
          });

          const paymentData = {
            editor: wb.assignedEditor,
            client: work.project.client,
            paymentType: 'editor_payout',
            originalAmount: wb.amount,
            finalAmount: penaltyResult.finalAmount,
            deadline: wb.deadline,
            deadlineCrossed: penaltyResult.daysLate > 0,
            daysLate: penaltyResult.daysLate,
            penaltyAmount: penaltyResult.penaltyAmount,
            status: 'calculated',
            calculatedAt: now
          };

          if (payment) {
            Object.assign(payment, paymentData);
            await payment.save();
          } else {
            await Payment.create({
              ...paymentData,
              project: work.project._id,
              workBreakdown: wb._id,
              workType: wb.workType
            });
          }
        }
      }
    } else {
      // Just Update admin approval on breakdown
      if (work.workBreakdown) {
        const WorkBreakdown = require('../models/WorkBreakdown');
        await WorkBreakdown.findByIdAndUpdate(work.workBreakdown, {
          'approvals.admin': true
        });
      }
    }

    // ... (notification code remains similar but moved inside the block if needed, or kept separate)
    if (work.status === 'approved') {
      // Notify Editor
      await createNotification(
        work.editor,
        'work_approved',
        'Work Approved',
        `Your work for project "${work.project.title}" has been approved by both Admin and Client.`,
        work.project._id
      );
    }

    await work.save();
    res.json(work);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... clientApprove ...
exports.clientApprove = async (req, res) => {
  try {
    const work = await WorkSubmission.findById(req.params.id).populate('project');

    if (!work) {
      return res.status(404).json({ message: 'Work submission not found' });
    }

    if (work.project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    work.clientApproved = true;

    // Check if both approved
    if (work.adminApproved) {
      work.status = 'approved';
      if (work.workBreakdown) {
        const wb = await WorkBreakdown.findById(work.workBreakdown);
        if (wb) {
          const now = new Date();
          // Use approval time for penalty calculation
          const penaltyResult = calculatePenalty(wb.deadline, wb.amount, now);

          // Update breakdown
          wb.status = 'completed';
          wb.approved = true;
          wb.approvedAt = now;
          wb.approvals.admin = true;
          wb.approvals.client = true;
          await wb.save();

          // Update or Create Payment record
          let payment = await Payment.findOne({
            project: work.project._id,
            workBreakdown: wb._id
          });

          const paymentData = {
            editor: wb.assignedEditor,
            client: work.project.client,
            paymentType: 'editor_payout',
            originalAmount: wb.amount,
            finalAmount: penaltyResult.finalAmount,
            deadline: wb.deadline,
            deadlineCrossed: penaltyResult.daysLate > 0,
            daysLate: penaltyResult.daysLate,
            penaltyAmount: penaltyResult.penaltyAmount,
            status: 'calculated',
            calculatedAt: now
          };

          if (payment) {
            Object.assign(payment, paymentData);
            await payment.save();
          } else {
            await Payment.create({
              ...paymentData,
              project: work.project._id,
              workBreakdown: wb._id,
              workType: wb.workType
            });
          }
        }
      }
    } else {
      // Just Update client approval on breakdown
      if (work.workBreakdown) {
        const WorkBreakdown = require('../models/WorkBreakdown');
        await WorkBreakdown.findByIdAndUpdate(work.workBreakdown, {
          'approvals.client': true
        });
      }
    }

    if (work.status === 'approved') {
      // Notify Editor
      await createNotification(
        work.editor,
        'work_approved',
        'Work Approved',
        `Your work for project "${work.project.title}" has been approved by both Admin and Client.`,
        work.project._id
      );
    }

    await work.save();
    res.json(work);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};


// @desc    Get work breakdowns assigned to editor
// @route   GET /api/works/assigned-breakdowns
// @access  Private/Editor
exports.getAssignedWorkBreakdowns = async (req, res) => {
  try {
    const workBreakdowns = await WorkBreakdown.find({ assignedEditor: req.user._id })
      .populate('project', 'title client deadline status currency scriptFile') // Added currency for price display and scriptFile for editor access
      .sort({ deadline: 1 });

    // Enhance each work breakdown with submission stats and payment status
    const enhancedBreakdowns = await Promise.all(
      workBreakdowns.map(async (wb) => {
        const [submissions, payment] = await Promise.all([
          WorkSubmission.find({ workBreakdown: wb._id }).sort({ submittedAt: -1 }),
          Payment.findOne({ workBreakdown: wb._id, paymentType: 'editor_payout' })
        ]);

        const latestSubmission = submissions[0] || null;
        const pendingCorrections = latestSubmission
          ? latestSubmission.corrections.filter(c => !c.done).length
          : 0;

        return {
          ...wb.toObject(),
          isPaid: payment ? payment.paid : false,
          submissionStats: {
            hasSubmission: !!latestSubmission,
            latestSubmissionDate: latestSubmission?.submittedAt,
            pendingCorrections,
            totalCorrections: latestSubmission?.corrections.length || 0,
            needsResubmission: pendingCorrections > 0,
            latestVersion: latestSubmission?.version || 0,
            submissionCount: submissions.length
          }
        };
      })
    );

    res.json(enhancedBreakdowns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Update work status (e.g. Start Working)
// @route   PUT /api/works/work-breakdown/:id/status
// @access  Private/Editor
exports.updateWorkStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const workBreakdown = await WorkBreakdown.findById(req.params.id);

    if (!workBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    // Check authorization
    if (workBreakdown.assignedEditor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    workBreakdown.status = status;

    if (status === 'in_progress' && !workBreakdown.startedAt) {
      workBreakdown.startedAt = new Date();
    }

    await workBreakdown.save();

    // NOTIFICATION: Editor declined work
    if (status === 'declined') {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          'work_declined',
          'Work Declined',
          `Editor ${req.user.name} declined work for project.`,
          workBreakdown.project // Ensure project ID is available, might need populate or fetching
        );
      }
    }
    res.json(workBreakdown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update work details (Notes, Priority)
// @route   PUT /api/works/work-breakdown/:id/details
// @access  Private/Editor
exports.updateWorkDetails = async (req, res) => {
  try {
    const { editorNotes, priority } = req.body;
    const workBreakdown = await WorkBreakdown.findById(req.params.id);

    if (!workBreakdown) {
      return res.status(404).json({ message: 'Work breakdown not found' });
    }

    // Check authorization
    if (workBreakdown.assignedEditor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (editorNotes !== undefined) workBreakdown.editorNotes = editorNotes;
    if (priority !== undefined) workBreakdown.priority = priority;

    await workBreakdown.save();
    res.json(workBreakdown);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

