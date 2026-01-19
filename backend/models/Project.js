const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedEditor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'submitted', 'under_review', 'completed', 'closed', 'rejected'],
    default: 'assigned',
  },
  roadmap: {
    type: {
      roughcut: {
        status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
      broll: {
        status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
      colorCorrection: {
        status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
      motionGraphics: {
        status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
      memes: {
        status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
      musicSfx: {
        status: { type: String, enum: ['not_started', 'in_progress', 'done'], default: 'not_started' },
        notes: { type: String, default: '' },
        updatedAt: { type: Date, default: null },
      },
    },
    default: {
      roughcut: {},
      broll: {},
      colorCorrection: {},
      motionGraphics: {},
      memes: {},
      musicSfx: {},
    },
  },
  deadline: {
    type: Date,
    required: [true, 'Please provide a deadline'],
  },
  projectDetails: {
    type: String,
    default: '',
  },
  rawFootageLinks: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
  }],
  currency: {
    type: String,
    enum: ['INR', 'USD', 'EUR'],
    default: 'INR',
  },
  amount: {
    type: Number,
    default: 0,
    required: true,
    min: [0, 'Amount cannot be negative'],
  },
  clientAmount: {
    type: Number,
    default: 0,
    min: [0, 'Amount cannot be negative'],
  },
  scriptFile: {
    type: String,
    default: '',
  },
  accepted: {
    type: Boolean,
    default: false,
  },
  acceptedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  finalRenderLink: {
    type: String,
    default: '',
  },
  adminApproved: {
    type: Boolean,
    default: false,
  },
  adminApprovedAt: {
    type: Date,
    default: null,
  },
  clientApproved: {
    type: Boolean,
    default: false,
  },
  clientApprovedAt: {
    type: Date,
    default: null,
  },
  closed: {
    type: Boolean,
    default: false,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  hiddenAt: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  approvals: {
    type: {
      client: { type: Boolean, default: false },
      admin: { type: Boolean, default: false },
    },
    default: undefined,
  },
  published: {
    type: Boolean,
    default: false,
  },
  hasClientEdits: {
    type: Boolean,
    default: false,
  },
  editedFields: {
    type: {
      title: { type: Boolean, default: false },
      description: { type: Boolean, default: false },
      deadline: { type: Boolean, default: false },
      rawFootageLinks: { type: Boolean, default: false },
      projectDetails: { type: Boolean, default: false },
    },
    default: {},
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
});

projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

projectSchema.index({ client: 1 });
projectSchema.index({ assignedEditor: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ accepted: 1 });

module.exports = mongoose.model('Project', projectSchema);

