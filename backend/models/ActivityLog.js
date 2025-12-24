const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true, // e.g., 'LOGIN', 'CREATE_PROJECT', 'PAYMENT_RECEIVED'
        enum: [
            'LOGIN',
            'LOGOUT',
            'CREATE_PROJECT',
            'ACCEPT_PROJECT',
            'CLOSE_PROJECT',
            'ASSIGN_EDITOR',
            'UPLOAD_WORK',
            'APPROVE_WORK',
            'PAYMENT_RECEIVED',
            'PAYMENT_SENT',
            'USER_CREATED',
            'USER_UPDATED',
            'USER_DELETED',
            'RESET_DATA'
        ]
    },
    description: {
        type: String,
        required: true,
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId, // Generic ID for related Project, Work, etc.
    },
    relatedModel: {
        type: String, // 'Project', 'User', 'Payment'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
