const Project = require('../models/Project');
const Payment = require('../models/Payment');
const DeletionReport = require('../models/DeletionReport');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Reset all projects and payments (Admin only)
// @route   POST /api/reset/all
// @access  Private/Admin
exports.resetAll = async (req, res) => {
  try {
    const { deleteUsers } = req.body; // true to delete users, false to keep users
    // Fetch all projects and payments before deletion
    const projects = await Project.find({})
      .populate('client', 'name email')
      .populate('assignedEditor', 'name email');

    const payments = await Payment.find({})
      .populate('project', 'title')
      .populate('editor', 'name email')
      .populate('client', 'name email');

    // Prepare data for PDF
    const reportData = {
      projects: projects.map(p => ({
        title: p.title,
        description: p.description,
        client: {
          name: p.client?.name || 'N/A',
          email: p.client?.email || 'N/A',
        },
        assignedEditor: {
          name: p.assignedEditor?.name || 'Not Assigned',
          email: p.assignedEditor?.email || 'N/A',
        },
        status: p.status,
        deadline: p.deadline,
        createdAt: p.createdAt,
      })),
      payments: payments.map(p => ({
        projectTitle: p.project?.title || 'N/A',
        editor: {
          name: p.editor?.name || 'N/A',
          email: p.editor?.email || 'N/A',
        },
        client: {
          name: p.client?.name || 'N/A',
          email: p.client?.email || 'N/A',
        },
        baseAmount: p.baseAmount,
        finalAmount: p.finalAmount,
        deadline: p.deadline,
        daysLate: p.daysLate,
        penaltyAmount: p.penaltyAmount,
        status: p.status,
      })),
    };

    // Generate PDF
    const reportId = `report-${Date.now()}`;
    const pdfFileName = `${reportId}.pdf`;
    const reportsDir = path.join(__dirname, '../reports');

    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const pdfPath = path.join(reportsDir, pdfFileName);

    // Generate PDF asynchronously
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // PDF Content
      doc.fontSize(20).text('Data Deletion Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.text(`Deleted by: ${req.user.name} (${req.user.email})`, { align: 'center' });
      doc.moveDown(2);

      // Projects Section
      doc.fontSize(16).text('DELETED PROJECTS', { underline: true });
      doc.moveDown();

      if (reportData.projects.length === 0) {
        doc.fontSize(12).text('No projects were deleted.');
      } else {
        doc.fontSize(12).text(`Total Projects Deleted: ${reportData.projects.length}`);
        doc.moveDown();

        reportData.projects.forEach((project, index) => {
          doc.fontSize(14).text(`${index + 1}. ${project.title}`, { underline: true });
          doc.fontSize(11);
          doc.text(`Description: ${project.description || 'N/A'}`);
          doc.text(`Client: ${project.client.name} (${project.client.email})`);
          doc.text(`Assigned Editor: ${project.assignedEditor.name} (${project.assignedEditor.email})`);
          doc.text(`Status: ${project.status}`);
          doc.text(`Deadline: ${new Date(project.deadline).toLocaleString()}`);
          doc.text(`Created: ${new Date(project.createdAt).toLocaleString()}`);
          doc.moveDown();
        });
      }

      doc.addPage();

      // Payments Section
      doc.fontSize(16).text('DELETED PAYMENTS', { underline: true });
      doc.moveDown();

      if (reportData.payments.length === 0) {
        doc.fontSize(12).text('No payments were deleted.');
      } else {
        doc.fontSize(12).text(`Total Payments Deleted: ${reportData.payments.length}`);
        doc.moveDown();

        reportData.payments.forEach((payment, index) => {
          doc.fontSize(14).text(`${index + 1}. Payment for: ${payment.projectTitle}`, { underline: true });
          doc.fontSize(11);
          doc.text(`Editor: ${payment.editor.name} (${payment.editor.email})`);
          doc.text(`Client: ${payment.client.name} (${payment.client.email})`);
          doc.text(`Base Amount: $${(payment.baseAmount || 0).toFixed(2)}`);
          doc.text(`Final Amount: $${(payment.finalAmount || 0).toFixed(2)}`);
          doc.text(`Days Late: ${payment.daysLate || 0}`);
          doc.text(`Penalty Amount: $${(payment.penaltyAmount || 0).toFixed(2)}`);
          doc.text(`Deadline: ${new Date(payment.deadline).toLocaleString()}`);
          doc.text(`Status: ${payment.status}`);
          doc.moveDown();
        });
      }

      // Summary
      doc.addPage();
      doc.fontSize(16).text('SUMMARY', { underline: true });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Total Projects Deleted: ${reportData.projects.length}`);
      doc.text(`Total Payments Deleted: ${reportData.payments.length}`);
      doc.moveDown();
      doc.text('This report contains all the details of projects and payments that were deleted by the administrator.', { align: 'justify' });

      // Finalize PDF
      doc.end();

      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);
    });

    // Get all clients and editors for recipients
    const clients = await User.find({ role: 'client' });
    const editors = await User.find({ role: 'editor' });

    // Create recipients array
    const recipients = [
      ...clients.map(c => ({ user: c._id, role: 'client' })),
      ...editors.map(e => ({ user: e._id, role: 'editor' })),
    ];

    // Create deletion report record
    const deletionReport = await DeletionReport.create({
      reportId,
      pdfPath: `/reports/${pdfFileName}`,
      deletedProjects: reportData.projects,
      deletedPayments: reportData.payments,
      deletedBy: req.user._id,
      recipients,
    });

    // Delete all projects and payments
    await Project.deleteMany({});
    await Payment.deleteMany({});

    const WorkBreakdown = require('../models/WorkBreakdown');
    const WorkSubmission = require('../models/WorkSubmission');
    await WorkBreakdown.deleteMany({});
    await WorkSubmission.deleteMany({});

    // Delete all files in the uploads folder
    const uploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
        } catch (err) {
          console.error(`Error deleting file ${file}:`, err);
        }
      }
    }

    // Delete users if requested (except admin accounts)
    let usersDeleted = 0;
    if (deleteUsers === true) {
      const deletedResult = await User.deleteMany({ role: { $ne: 'admin' } });
      usersDeleted = deletedResult.deletedCount;
    }

    res.status(200).json({
      message: deleteUsers
        ? 'All data including user accounts have been deleted successfully'
        : 'All projects and payments have been deleted successfully',
      reportId: deletionReport.reportId,
      projectsDeleted: reportData.projects.length,
      paymentsDeleted: reportData.payments.length,
      usersDeleted: usersDeleted,
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get deletion reports for current user
// @route   GET /api/reset/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const reports = await DeletionReport.find({
      recipients: {
        $elemMatch: {
          user: req.user._id,
          viewed: false
        }
      }
    })
      .populate('deletedBy', 'name email')
      .sort({ deletedAt: -1 });

    // Mark as viewed
    for (const report of reports) {
      const recipient = report.recipients.find(
        r => r.user.toString() === req.user._id.toString()
      );
      if (recipient && !recipient.viewed) {
        recipient.viewed = true;
        recipient.viewedAt = new Date();
        await report.save();
      }
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download deletion report PDF
// @route   GET /api/reset/reports/:reportId/download
// @access  Private
exports.downloadReport = async (req, res) => {
  try {
    const report = await DeletionReport.findOne({
      reportId: req.params.reportId,
      'recipients.user': req.user._id,
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const pdfPath = path.join(__dirname, '..', report.pdfPath);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="deletion-report-${report.reportId}.pdf"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

