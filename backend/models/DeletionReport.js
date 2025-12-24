const mongoose = require('mongoose');

const deletionReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
  },
  pdfPath: {
    type: String,
    required: true,
  },
  deletedProjects: [{
    title: String,
    description: String,
    client: {
      name: String,
      email: String,
    },
    assignedEditor: {
      name: String,
      email: String,
    },
    status: String,
    deadline: Date,
    createdAt: Date,
  }],
  deletedPayments: [{
    projectTitle: String,
    editor: {
      name: String,
      email: String,
    },
    client: {
      name: String,
      email: String,
    },
    baseAmount: Number,
    finalAmount: Number,
    deadline: Date,
    daysLate: Number,
    penaltyAmount: Number,
    status: String,
  }],
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['client', 'editor'],
      required: true,
    },
    viewed: {
      type: Boolean,
      default: false,
    },
    viewedAt: Date,
  }],
});

module.exports = mongoose.model('DeletionReport', deletionReportSchema);

