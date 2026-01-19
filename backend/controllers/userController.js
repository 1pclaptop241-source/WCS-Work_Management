const User = require('../models/User');

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create user (admin only)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'client',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all editors (for assignment dropdown)
// @route   GET /api/users/editors
// @access  Private
exports.getEditors = async (req, res) => {
  try {
    const editors = await User.find({ role: 'editor' }).select('name email').sort({ name: 1 });
    res.json(editors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all clients
// @route   GET /api/users/clients
// @access  Private/Admin
exports.getClients = async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).select('name email').sort({ name: 1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protect Primary Admin
    const primaryAdminEmail = process.env.FROM_EMAIL || 'admin@wisecutstudios.com'; // Fallback just in case
    if (user.email === primaryAdminEmail && req.user.email !== primaryAdminEmail) {
      return res.status(403).json({ message: 'You are not authorized to edit the primary admin details.' });
    }

    const { name, email, role, password } = req.body;

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    if (password) {
      user.password = password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting the primary admin account
    // We only want to protect the main root admin, other admins can be deleted by another admin
    if (user.email === (process.env.FROM_EMAIL || 'admin@wisecutstudios.com')) {
      return res.status(403).json({ message: 'Cannot delete the primary admin account' });
    }

    // Check for associated data
    const Project = require('../models/Project');
    const Payment = require('../models/Payment');

    const hasProjects = await Project.exists({
      $or: [{ client: user._id }, { assignedEditor: user._id }]
    });

    const hasPayments = await Payment.exists({
      $or: [{ client: user._id }, { editor: user._id }]
    });

    if (hasProjects || hasPayments) {
      return res.status(400).json({
        message: 'Cannot delete user with associated projects or payments. Please archive/delete their data first.'
      });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get editor performance stats
// @route   GET /api/users/editors/stats
// @access  Private/Admin
exports.getEditorStats = async (req, res) => {
  try {
    const editors = await User.find({ role: 'editor' }).select('name email');
    const WorkBreakdown = require('../models/WorkBreakdown');
    const WorkSubmission = require('../models/WorkSubmission');

    const stats = await Promise.all(editors.map(async (editor) => {
      // 1. Active vs Completed Tasks
      const allTasks = await WorkBreakdown.find({ assignedEditor: editor._id });
      const activeTasks = allTasks.filter(t => !t.approved && t.status !== 'declined').length;
      const completedTasks = allTasks.filter(t => t.approved).length;

      // 2. Average Revisions (Submission Count)
      // A high average version count might indicate issues in quality or communication
      const submissions = await WorkSubmission.find({ editor: editor._id });

      // Group submissions by workBreakdown to see how many versions per task
      const taskSubmissionCounts = {};
      submissions.forEach(sub => {
        const wbId = sub.workBreakdown.toString();
        taskSubmissionCounts[wbId] = (taskSubmissionCounts[wbId] || 0) + 1;
      });

      const totalTasksSubmitted = Object.keys(taskSubmissionCounts).length;
      const avgVersions = totalTasksSubmitted > 0
        ? (submissions.length / totalTasksSubmitted).toFixed(1)
        : 0;

      // 3. Late submissions (Simple heuristic: submitted after deadline)
      let lateCount = 0;
      for (const sub of submissions) {
        const wb = allTasks.find(t => t._id.toString() === sub.workBreakdown.toString());
        if (wb && sub.version === 1 && sub.submittedAt > wb.deadline) {
          lateCount++;
        }
      }

      return {
        _id: editor._id,
        name: editor.name,
        email: editor.email,
        activeTasks,
        completedTasks,
        avgVersions,
        lateSubmissions: lateCount,
        totalAssigned: allTasks.length
      };
    }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle user block status (admin only)
// @route   PUT /api/users/:id/block
// @access  Private/Admin
exports.toggleBlockStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent blocking admin accounts (optional, but good practice)
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot block admin accounts' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
