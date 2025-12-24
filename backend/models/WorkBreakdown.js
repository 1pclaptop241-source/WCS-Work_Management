const mongoose = require('mongoose');

const workBreakdownSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  workType: {
    type: String,
    required: true,
  },
  assignedEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'under_review', 'submitted', 'completed', 'declined'],
    default: 'pending',
  },
  approvals: {
    client: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
  },
  approved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  shareDetails: {
    type: String,
    default: '',
  },
  editorNotes: {
    type: String,
    default: '',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  startedAt: {
    type: Date,
    default: null,
  },
  links: [{
    title: String,
    url: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  warnings: {
    type: {
      warn_50: { type: Boolean, default: false },
      warn_25: { type: Boolean, default: false },
      warn_5: { type: Boolean, default: false },
      warn_crossed: { type: Boolean, default: false },
    },
    default: {
      warn_50: false,
      warn_25: false,
      warn_5: false,
      warn_crossed: false,
    },
  },
  feedback: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
});

workBreakdownSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WorkBreakdown', workBreakdownSchema);

