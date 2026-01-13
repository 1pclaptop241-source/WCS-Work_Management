const mongoose = require('mongoose');

const workSubmissionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  workBreakdown: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkBreakdown',
    required: true,
  },
  editor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide a file URL'],
  },
  fileName: {
    type: String,
    required: [true, 'Please provide a file name'],
  },
  workFileUrl: {
    type: String,
    default: '',
  },
  workFileName: {
    type: String,
    default: '',
  },
  isWorkFileVisibleToClient: {
    type: Boolean,
    default: false,
  },
  workSubmissionType: {
    type: String,
    enum: ['file', 'link'],
    default: 'file',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  submissionType: {
    type: String,
    enum: ['file', 'link'],
    default: 'file',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'needs_revision'],
    default: 'pending',
  },
  adminApproved: {
    type: Boolean,
    default: false,
  },
  clientApproved: {
    type: Boolean,
    default: false,
  },
  clientFeedback: {
    type: String,
    default: '',
  },
  editorMessage: {
    type: String,
    default: '',
  },
  corrections: [{
    text: { type: String, default: '' },
    voiceFile: { type: String, default: '' },
    mediaFiles: [{ type: String }],
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: { type: Date, default: Date.now },
    done: { type: Boolean, default: false },
    doneBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    doneAt: { type: Date, default: null },
  }],
  correctionDone: {
    type: Boolean,
    default: false,
  },
  correctionDoneBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  version: {
    type: Number,
    required: true,
    default: 1,
  },
  changelog: {
    type: String,
    default: '',
  },
  correctionDoneAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('WorkSubmission', workSubmissionSchema);

