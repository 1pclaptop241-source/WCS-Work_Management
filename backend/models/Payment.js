const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentType: {
    type: String,
    enum: ['editor_payout', 'client_charge', 'bonus', 'deduction'],
    default: 'editor_payout',
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  workBreakdown: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkBreakdown',
    default: null,
  },
  editor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  settlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
    default: null,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  workType: {
    type: String,
    default: 'General',
  },
  originalAmount: {
    type: Number,
    required: [true, 'Please provide an original amount'],
  },
  finalAmount: {
    type: Number,
    default: 0,
  },
  deadline: {
    type: Date,
    required: true,
  },
  deadlineCrossed: {
    type: Boolean,
    default: false,
  },
  daysLate: {
    type: Number,
    default: 0,
  },
  penaltyAmount: {
    type: Number,
    default: 0,
  },
  paymentScreenshot: {
    type: String,
    default: '',
  },
  paid: {
    type: Boolean,
    default: false,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  received: {
    type: Boolean,
    default: false,
  },
  receivedAt: {
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
  status: {
    type: String,
    enum: ['pending', 'calculated', 'paid', 'locked'],
    default: 'pending',
  },
  calculatedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

paymentSchema.index({ project: 1 });
paymentSchema.index({ editor: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ workBreakdown: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

