const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['project_assigned', 'work_submitted', 'deadline_approaching', 'project_update', 'general', 'project_created', 'project_closed', 'work_uploaded', 'work_updated', 'correction_requested', 'correction_done', 'work_declined', 'assignment_details_updated', 'work_approved', 'deadline_warning'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  link: {
    type: String, // URL to redirect to (e.g., /projects/:id)
    default: ''
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
