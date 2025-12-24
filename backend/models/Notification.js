const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'project_accepted',
      'project_closed',
      'payment_received',
      'correction_added',
      'work_approved',
      'work_assigned',
      'correction_requested',
      'payment_sent',
      'deadline_warning',
      'deadline_crossed',
      'project_created',
      'work_uploaded',
      'work_updated',
      'work_declined',
      'project_completed',
      'client_payment_received'
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);

