const Project = require('../models/Project');
const Payment = require('../models/Payment');
const calculatePenalty = require('../utils/calculatePenalty');
const WorkSubmission = require('../models/WorkSubmission');
const WorkBreakdown = require('../models/WorkBreakdown');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationService');
const logActivity = require('../utils/activityLogger');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Get all projects (role-based filtering)
// @route   GET /api/projects

// @access  Private
exports.getProjects = async (req, res) => {
  try {
    let query = {};
    const andConditions = [];

    // Filter based on user role
    const roleConditions = [];
    if (req.user.role === 'client') {
      query.client = req.user._id;
    } else if (req.user.role === 'editor') {
      // Find projects where user is assigned editor OR has work breakdown assigned
      const WorkBreakdown = require('../models/WorkBreakdown');
      const workBreakdowns = await WorkBreakdown.find({ assignedEditor: req.user._id });
      const projectIdsFromWork = workBreakdowns.map(wb => wb.project);

      roleConditions.push({
        $or: [
          { assignedEditor: req.user._id },
          { _id: { $in: projectIdsFromWork } }
        ]
      });
    }

    if (roleConditions.length > 0) {
      andConditions.push({ $and: roleConditions });
    }

    // Admin sees all projects

    // hide published projects for everyone
    query.published = false;

    // Filter by accepted status if provided
    if (req.query.accepted !== undefined) {
      query.accepted = req.query.accepted === 'true';
    }

    // Filter out hidden projects (hidden more than 2 days ago)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    andConditions.push({
      $or: [
        { hiddenAt: null },
        { hiddenAt: { $gt: twoDaysAgo } }
      ]
    });

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const projects = await Project.find(query)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Close a project
// @route   PUT /api/projects/:id/close
// @access  Private/Admin
exports.closeProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to close projects' });
    }

    if (project.closed) {
      return res.status(400).json({ message: 'Project is already closed' });
    }

    project.closed = true;
    project.closedAt = new Date();
    await project.save();

    // Notify client
    await createNotification(
      project.client,
      'project_closed',
      'Project Closed',
      `Your project "${project.title}" has been closed by the admin.`,
      project._id
    );

    await logActivity(req, 'CLOSE_PROJECT', `Project closed: ${project.title}`, project._id, 'Project');
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk delete projects
// @route   POST /api/projects/bulk-delete
// @access  Private/Admin
exports.bulkDeleteProjects = async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({ message: 'Please provide an array of project IDs' });
    }

    const projects = await Project.find({ _id: { $in: projectIds } });

    // Delete related records for each
    for (const project of projects) {
      await Payment.deleteMany({ project: project._id });
      await WorkBreakdown.deleteMany({ project: project._id });
      await WorkSubmission.deleteMany({ project: project._id });
      await Notification.deleteMany({ relatedProject: project._id });
      await project.deleteOne();
    }

    await logActivity(req, 'RESET_DATA', `Bulk deleted ${projects.length} projects`);

    res.json({ message: `Successfully deleted ${projects.length} projects` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk close projects
// @route   POST /api/projects/bulk-close
// @access  Private/Admin
exports.bulkCloseProjects = async (req, res) => {
  try {
    const { projectIds } = req.body;
    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({ message: 'Please provide an array of project IDs' });
    }

    const projects = await Project.find({ _id: { $in: projectIds }, closed: false });
    const now = new Date();

    for (const project of projects) {
      project.closed = true;
      project.closedAt = now;
      await project.save();

      // Notify client
      await createNotification(
        project.client,
        'project_closed',
        'Project Closed',
        `Your project "${project.title}" has been closed by the admin.`,
        project._id
      );
    }

    await logActivity(req, 'CLOSE_PROJECT', `Bulk closed ${projects.length} projects`);

    res.json({ message: `Successfully closed ${projects.length} projects` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check access permissions
    if (req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }

    if (req.user.role === 'editor' && (!project.assignedEditor || project.assignedEditor._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin or Client creating own project)
exports.createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      client,
      assignedEditor,
      deadline,
      projectDetails,
      rawFootageLinks,
      currency,
      amount
    } = req.body;

    const newProjectPayload = {
      title,
      description,
      client: req.user.role === 'client' ? req.user._id : client,
      assignedEditor: assignedEditor || null,
      deadline,
      projectDetails: projectDetails || '',
      status: assignedEditor ? 'assigned' : 'pending',
      accepted: false,
    };

    // Handle raw footage links
    if (rawFootageLinks) {
      try {
        newProjectPayload.rawFootageLinks = typeof rawFootageLinks === 'string'
          ? JSON.parse(rawFootageLinks)
          : rawFootageLinks;
      } catch (e) {
        newProjectPayload.rawFootageLinks = [];
      }
    } else {
      newProjectPayload.rawFootageLinks = [];
    }

    // Handle currency and amounts
    if (currency) newProjectPayload.currency = currency;

    // Explicitly handle clientAmount and amount
    if (req.body.clientAmount) {
      newProjectPayload.clientAmount = Math.round(parseFloat(req.body.clientAmount) * 100) / 100;
    }

    // If amount is provided, use it. If not, fallback to clientAmount (initial value)
    if (amount) {
      newProjectPayload.amount = Math.round(parseFloat(amount) * 100) / 100;
      if (!newProjectPayload.clientAmount) {
        newProjectPayload.clientAmount = newProjectPayload.amount;
      }
    } else if (newProjectPayload.clientAmount) {
      newProjectPayload.amount = newProjectPayload.clientAmount;
    }

    // Handle script file upload
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-projects/scripts');
        newProjectPayload.scriptFile = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading script file: ' + uploadError.message });
      }
    }

    // Clients cannot set assignedEditor or client to someone else
    if (req.user.role === 'client') {
      newProjectPayload.assignedEditor = null;
    }

    const project = await Project.create(newProjectPayload);

    // Create payment record if editor is assigned (initial placeholder payout)
    if (assignedEditor && req.body.baseAmount) {
      await Payment.create({
        paymentType: 'editor_payout',
        project: project._id,
        editor: assignedEditor,
        client: project.client,
        workType: 'Project Assignment',
        originalAmount: parseFloat(req.body.baseAmount),
        finalAmount: parseFloat(req.body.baseAmount),
        deadline: deadline,
      });
    }

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    // Notify Admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'project_created',
        'New Project Created',
        `Client ${req.user.name} created a new project: ${title}`,
        project._id
      );
    }

    await logActivity(req, 'CREATE_PROJECT', `Project created: ${title}`, project._id, 'Project');

    res.status(201).json(populatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions
    if (req.user.role === 'client') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this project' });
      }
    } else if (req.user.role === 'editor') {
      // Editors generally shouldn't use this route, but if they do, we must ensure they are assigned.
      // However, project update (title, amount, etc.) is usually for Client/Admin.
      // We'll block Editors from general project updates here. 
      // Individual work updates should go through work-breakdown or work-submission routes.
      return res.status(403).json({ message: 'Editors are not authorized to perform general project updates' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Clients can update details
    if (req.user.role === 'client') {
      project.hasClientEdits = true;

      // Initialize editedFields if it doesn't exist
      if (!project.editedFields) {
        project.editedFields = {};
      }

      // Track which fields were edited (only if project was accepted)
      if (project.accepted) {
        if (req.body.title && req.body.title !== project.title) {
          project.editedFields.title = true;
        }
        if (req.body.description && req.body.description !== project.description) {
          project.editedFields.description = true;
        }
        if (req.body.deadline && new Date(req.body.deadline).getTime() !== new Date(project.deadline).getTime()) {
          project.editedFields.deadline = true;
        }
        if (req.body.projectDetails !== undefined && req.body.projectDetails !== project.projectDetails) {
          project.editedFields.projectDetails = true;
        }
        if (req.body.rawFootageLinks) {
          project.editedFields.rawFootageLinks = true;
        }
      }

      // Fields allowed to update
      if (req.body.title) project.title = req.body.title;
      if (req.body.description) project.description = req.body.description;
      if (req.body.projectDetails !== undefined) project.projectDetails = req.body.projectDetails;
      if (req.body.deadline) project.deadline = req.body.deadline;

      // Handle raw footage links
      if (req.body.rawFootageLinks) {
        try {
          project.rawFootageLinks = typeof req.body.rawFootageLinks === 'string'
            ? JSON.parse(req.body.rawFootageLinks)
            : req.body.rawFootageLinks;
        } catch (e) {
          project.rawFootageLinks = [];
        }
      }

      // Handle currency and amount - ONLY if not accepted
      if (!project.accepted) {
        if (req.body.currency) project.currency = req.body.currency;
        if (req.body.amount) project.amount = Math.round(parseFloat(req.body.amount) * 100) / 100;
      }
    } else if (req.user.role === 'admin') {
      // Admin can update everything, but let's be explicit and safe
      const allowedAdminFields = [
        'title', 'description', 'client', 'assignedEditor', 'status', 'deadline',
        'projectDetails', 'currency', 'amount', 'accepted', 'acceptedAt',
        'completedAt', 'finalRenderLink', 'adminApproved', 'adminApprovedAt',
        'clientApproved', 'clientApprovedAt', 'closed', 'closedAt', 'published',
        'hasClientEdits', 'clientAmount'
      ];

      allowedAdminFields.forEach(key => {
        if (req.body[key] !== undefined) {
          project[key] = req.body[key];
        }
      });
    }

    // Handle script file update (for both client and admin)
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'wcs-projects/scripts');
        project.scriptFile = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading script file: ' + uploadError.message });
      }
    }

    await project.save();

    await logActivity(req, 'USER_UPDATED', `Project updated: ${project.title}`, project._id, 'Project');

    // Sync changes to Project Assignment Payment if Admin updated assignedEditor
    if (req.user.role === 'admin' && req.body.assignedEditor) {
      await Payment.updateMany(
        {
          project: project._id,
          workType: 'Project Assignment',
          workBreakdown: { $exists: false }
        },
        { $set: { editor: req.body.assignedEditor } }
      );
    }

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization: Admin can delete any project, Client can only delete their own
    if (req.user.role === 'admin') {
      // Proceed (Admin can delete)
    } else if (req.user.role === 'client') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this project' });
      }

      // Client cannot delete if accepted
      if (project.accepted) {
        return res.status(400).json({ message: 'Cannot delete an accepted project. Please contact admin.' });
      }
    } else {
      // Editors and others cannot delete projects
      return res.status(403).json({ message: 'Not authorized to delete projects' });
    }

    // Delete related records
    await Payment.deleteMany({ project: project._id });
    await WorkBreakdown.deleteMany({ project: project._id });
    await WorkSubmission.deleteMany({ project: project._id });
    await Notification.deleteMany({ relatedProject: project._id });

    await project.deleteOne();
    await logActivity(req, 'USER_DELETED', `Project deleted: ${project.title}`, project._id, 'Project');

    res.json({ message: 'Project removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign work to editor
// @route   PUT /api/projects/:id/assign
// @access  Private/Admin
exports.assignEditor = async (req, res) => {
  try {
    const { editorId, baseAmount } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.assignedEditor = editorId;
    project.status = 'assigned';

    // Create or update payment record
    if (baseAmount) {
      let payment = await Payment.findOne({ project: project._id, paymentType: 'editor_payout' });
      if (payment) {
        payment.editor = editorId;
        payment.originalAmount = parseFloat(baseAmount);
        payment.finalAmount = parseFloat(baseAmount);
        payment.deadline = project.deadline;
      } else {
        payment = await Payment.create({
          paymentType: 'editor_payout',
          project: project._id,
          editor: editorId,
          client: project.client,
          workType: 'Project Assignment',
          originalAmount: parseFloat(baseAmount),
          finalAmount: parseFloat(baseAmount),
          deadline: project.deadline,
        });
      }
    }

    await project.save();
    await logActivity(req, 'ASSIGN_EDITOR', `Editor ${editorId} assigned to project: ${project.title}`, project._id, 'Project');

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Share project details
// @route   PUT /api/projects/:id/share-details
// @access  Private/Admin
exports.shareProjectDetails = async (req, res) => {
  try {
    const { projectDetails } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.projectDetails = projectDetails || '';

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve project (requires client AND admin approvals)
// @route   PUT /api/projects/:id/approve
// @access  Private (client or admin)
exports.approveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Track approvals on project doc (both required)
    if (!project.approvals) project.approvals = { client: false, admin: false };

    if (req.user.role === 'client') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      project.approvals.client = true;
      project.clientApproved = true;
      project.clientApprovedAt = new Date();
    } else if (req.user.role === 'admin') {
      project.approvals.admin = true;
      project.adminApproved = true;
      project.adminApprovedAt = new Date();
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // If both approved, mark project completed
    if (project.approvals.client && project.approvals.admin) {
      project.status = 'completed';
      project.completedAt = project.completedAt || new Date();

      // Notify Admins of 100% progress/completion
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          'project_completed',
          'Project Completed',
          `Project "${project.title}" has been fully approved and is 100% complete.`,
          project._id
        );
      }

      // Notify Editor: work approved (when both editor and admin approved the work)
      // We notify the main assigned editor if exists, and all editors from work breakdown
      const editorsToNotify = new Set();
      if (project.assignedEditor) {
        editorsToNotify.add(project.assignedEditor.toString());
      }

      const workBreakdown = await WorkBreakdown.find({ project: project._id });
      workBreakdown.forEach(w => {
        if (w.assignedEditor) {
          editorsToNotify.add(w.assignedEditor.toString());
        }
      });

      for (const editorId of editorsToNotify) {
        await createNotification(
          editorId,
          'work_approved',
          'Project Completed',
          `Project "${project.title}" has been fully approved by both Admin and Client.`,
          project._id
        );
      }
    }

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Publish project (client or admin)
// @route   PUT /api/projects/:id/publish
// @access  Private (client or admin)
exports.publishProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (req.user.role === 'client') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    project.published = true;
    // ensure status consistent
    if (project.approvals?.client && project.approvals?.admin) {
      project.status = 'completed';
    }

    await project.save();

    res.json({ message: 'Published' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project roadmap
// @route   GET /api/projects/:id/roadmap
// @access  Private
exports.getRoadmap = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Access control: client (owner), assigned editor, or admin
    if (
      req.user.role === 'client' && project.client._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (
      req.user.role === 'editor' && (!project.assignedEditor || project.assignedEditor._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(project.roadmap || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project roadmap (per-stage)
// @route   PUT /api/projects/:id/roadmap
// @access  Private (admin or assigned editor)
exports.updateRoadmap = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only admin or assigned editor can update
    const isAssignedEditor = project.assignedEditor && project.assignedEditor.toString() === req.user._id.toString();
    if (!(req.user.role === 'admin' || (req.user.role === 'editor' && isAssignedEditor))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowedStages = ['roughcut', 'broll', 'colorCorrection', 'motionGraphics', 'memes', 'musicSfx'];
    const { stage, status, notes } = req.body;

    if (!allowedStages.includes(stage)) {
      return res.status(400).json({ message: 'Invalid stage' });
    }
    if (status && !['not_started', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const current = project.roadmap?.[stage] || {};
    if (status) current.status = status;
    if (notes !== undefined) current.notes = notes;
    current.updatedAt = new Date();

    project.roadmap = {
      ...(project.roadmap || {}),
      [stage]: current,
    };

    await project.save();

    const updated = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    res.json(updated.roadmap || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept project and create work breakdown
// @route   POST /api/projects/:id/accept
// @access  Private/Admin
exports.acceptProject = async (req, res) => {
  try {
    const { workBreakdown, totalAmount } = req.body;

    // First fetch the existing project to preserve Client Price
    const existingProject = await Project.findById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (existingProject.accepted) {
      return res.status(400).json({ message: 'Project already accepted' });
    }

    // Determine the true Client Price (revenue)
    // If clientAmount is set, use it. Else fall back to 'amount' (which was client price before this)
    const clientPrice = existingProject.clientAmount || existingProject.amount;

    // Use atomic update to prevent race conditions
    // Set 'amount' to the Allocation/Editor Budget (totalAmount)
    // Ensure 'clientAmount' is set to the true revenue
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, accepted: false },
      {
        $set: {
          accepted: true,
          acceptedAt: new Date(),
          amount: totalAmount ? parseFloat(totalAmount) : undefined,
          clientAmount: clientPrice, // Strictly preserve client price
        }
      },
      { new: true }
    );

    // Create work breakdown entries
    const workBreakdownEntries = [];
    const Payment = require('../models/Payment'); // Ensure Payment model is required

    // Delete existing placeholder payments (e.g. from initial project assignment) 
    // to avoid duplication with work breakdown payments
    await Payment.deleteMany({
      project: project._id,
      paymentType: 'editor_payout',
      workBreakdown: { $exists: false }, // Only delete those NOT linked to work breakdown (if any exist)
      paid: false // Safety: don't delete paid ones
    });

    for (const work of workBreakdown) {
      const amount = (parseFloat(totalAmount) * parseFloat(work.percentage)) / 100;
      const workEntry = await WorkBreakdown.create({
        project: project._id,
        workType: work.workType,
        assignedEditor: work.assignedEditor,
        deadline: work.deadline,
        percentage: work.percentage,
        amount: amount,
        status: 'pending',
        shareDetails: work.shareDetails || '',
        links: work.links || [],
      });
      workBreakdownEntries.push(workEntry);

      // 2. Create Editor Payout (What editor earns)
      // Use totalAmount (Allocated Budget) linked to this acceptance
      const editorWorkAmount = (parseFloat(totalAmount) * parseFloat(work.percentage)) / 100;

      if (work.assignedEditor) {
        await Payment.create({
          paymentType: 'editor_payout',
          project: project._id,
          editor: work.assignedEditor,
          client: project.client,
          workBreakdown: workEntry._id,
          workType: work.workType,
          originalAmount: editorWorkAmount,
          finalAmount: editorWorkAmount,
          deadline: work.deadline,
          status: 'locked' // Locked until work is approved by client and admin
        });
      }
    }

    await project.save();

    // Create notifications for assigned editors
    const editorIds = [...new Set(workBreakdown.map(w => w.assignedEditor))];
    for (const editorId of editorIds) {
      await createNotification(
        editorId,
        'project_accepted', // or 'work_assigned' for editor specific
        'Project Assigned',
        `You have been assigned to work on project: ${project.title}`,
        project._id
      );
    }

    // Create notification for client
    await createNotification(
      project.client,
      'project_accepted',
      'Project Accepted',
      `Your project "${project.title}" has been accepted and work has been assigned.`,
      project._id
    );

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    await logActivity(req, 'ACCEPT_PROJECT', `Project accepted: ${project.title}`, project._id, 'Project');

    res.status(200).json({
      project: populatedProject,
      workBreakdown: workBreakdownEntries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload final render link
// @route   PUT /api/projects/:id/final-render
// @access  Private/Editor
exports.uploadFinalRender = async (req, res) => {
  try {
    const { finalRenderLink } = req.body;
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is assigned editor for final render work
    const workBreakdown = await WorkBreakdown.find({
      project: project._id,
      workType: 'Final Render'
    });

    const finalRenderWork = workBreakdown.find(w =>
      w.assignedEditor.toString() === req.user._id.toString()
    );

    if (!finalRenderWork && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to upload final render' });
    }

    // Check if all corrections are done
    const allWorkBreakdown = await WorkBreakdown.find({ project: project._id });

    let allCorrectionsDone = true;
    for (const work of allWorkBreakdown) {
      if (work.workType === 'Final Render') continue;

      const submissions = await WorkSubmission.find({ workBreakdown: work._id });
      for (const submission of submissions) {
        if (submission.corrections && submission.corrections.length > 0) {
          const notDone = submission.corrections.some(c => !c.done);
          if (notDone) {
            allCorrectionsDone = false;
            break;
          }
        }
      }
      if (!allCorrectionsDone) break;
    }

    if (!allCorrectionsDone) {
      return res.status(400).json({ message: 'All corrections must be completed before uploading final render' });
    }

    project.finalRenderLink = finalRenderLink;
    await project.save();

    // Create notification for client
    await createNotification(
      project.client._id,
      'work_approved',
      'Final Render Uploaded',
      `Final render has been uploaded for project: ${project.title}`,
      project._id
    );

    // Notify Admins: Editor uploaded work (final render)
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'work_uploaded',
        'Final Render Uploaded',
        `Editor uploaded final render for project: ${project.title}`,
        project._id
      );
    }

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Client approve project
// @route   PUT /api/projects/:id/client-approve
// @access  Private/Client
exports.clientApproveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    project.clientApproved = true;
    project.clientApprovedAt = new Date();
    project.approvals = project.approvals || { client: false, admin: false };
    project.approvals.client = true;

    if (project.approvals.admin) {
      project.status = 'completed';
      project.completedAt = project.completedAt || new Date();

      // Notify Admins of 100% progress/completion
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          'project_completed',
          'Project Completed',
          `Project "${project.title}" has been fully approved and is 100% complete.`,
          project._id
        );
      }

      // Notify Editor
      if (project.assignedEditor) {
        await createNotification(
          project.assignedEditor,
          'work_approved',
          'Project Completed',
          `Project "${project.title}" has been fully approved by both Admin and Client.`,
          project._id
        );
      }
    }
    await project.save();

    // Create notifications
    const workBreakdown = await WorkBreakdown.find({ project: project._id });
    const editorIds = [...new Set(workBreakdown
      .filter(w => w.assignedEditor)
      .map(w => w.assignedEditor.toString())
    )];

    for (const editorId of editorIds) {
      await createNotification(
        editorId,
        'work_approved',
        'Project Approved by Client',
        `Project "${project.title}" has been approved by the client.`,
        project._id
      );
    }

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin close project
// @route   PUT /api/projects/:id/close
// @access  Private/Admin
exports.closeProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Ensure all work breakdown items are fully approved (both client+admin)
    const workItems = await WorkBreakdown.find({ project: project._id });
    const allApproved = workItems.length === 0 ? true : workItems.every(w => w.approved === true);

    if (!allApproved) {
      return res.status(400).json({ message: 'All work items must have both approvals before closing' });
    }

    // Implicitly approve project if all works are done and Admin is closing it
    project.clientApproved = true;
    project.adminApproved = true;

    project.status = 'closed';
    project.closed = true;
    project.closedAt = new Date();
    project.hiddenAt = new Date(); // Will be hidden after 2 days

    // Schedule deletion after 7 days
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);
    project.deletedAt = deleteDate;

    await project.save();

    // Create notifications
    await createNotification(
      project.client._id,
      'project_closed',
      'Project Closed',
      `Project "${project.title}" has been closed successfully.`,
      project._id
    );

    const workBreakdown = await WorkBreakdown.find({ project: project._id });
    const editorIds = [...new Set(workBreakdown.map(w => w.assignedEditor.toString()))];

    for (const editorId of editorIds) {
      await createNotification(
        editorId,
        'project_closed',
        'Project Closed',
        `Project "${project.title}" has been closed successfully.`,
        project._id
      );
    }

    // Create or update client charge payment (visible to admin & client) using client-entered amount
    const clientChargeAmount = (project.clientAmount && project.clientAmount > 0) ? project.clientAmount : project.amount;

    if (clientChargeAmount > 0) {
      // Find ALL existing client charges for this project
      const existingCharges = await Payment.find({
        project: project._id,
        paymentType: 'client_charge',
      });

      // To avoid double-billing from granular charges created in older versions:
      // We will keep/update the first one and delete the other unpaid ones.
      if (existingCharges.length > 0) {
        const primaryCharge = existingCharges[0];
        primaryCharge.originalAmount = clientChargeAmount;
        primaryCharge.finalAmount = clientChargeAmount;
        primaryCharge.deadline = project.closedAt || new Date();
        primaryCharge.workType = 'Project Charge'; // Ensure it's the total charge
        primaryCharge.workBreakdown = null; // Unlink from specific breakdown if it was granular
        await primaryCharge.save();

        if (existingCharges.length > 1) {
          // Delete other unpaid client charges for this project
          await Payment.deleteMany({
            _id: { $in: existingCharges.slice(1).map(c => c._id) },
            paid: false,
            received: false
          });
        }
      } else {
        await Payment.create({
          paymentType: 'client_charge',
          project: project._id,
          client: project.client._id,
          originalAmount: clientChargeAmount,
          finalAmount: clientChargeAmount,
          workType: 'Project Charge',
          deadline: project.closedAt || new Date(),
          status: 'pending',
          currency: project.currency || 'INR'
        });
      }
    }

    const updatedProject = await Project.findById(project._id)
      .populate('client', 'name email');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

