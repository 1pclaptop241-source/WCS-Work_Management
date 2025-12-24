const ActivityLog = require('../models/ActivityLog');

/**
 * Log user activity
 * @param {Object} req - Express request object (to extract user, ip, agent)
 * @param {String} action - Action type from enum
 * @param {String} description - Human readable description
 * @param {Object} relatedId - (Optional) ID of related object
 * @param {String} relatedModel - (Optional) Name of related model
 */
const logActivity = async (req, action, description, relatedId = null, relatedModel = null) => {
    try {
        if (!req.user) return; // Only log authenticated actions

        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await ActivityLog.create({
            user: req.user._id,
            action,
            description,
            ipAddress,
            userAgent,
            relatedId,
            relatedModel
        });
    } catch (error) {
        console.error('Activity Log Error:', error);
        // Don't throw error to prevent blocking main flow
    }
};

module.exports = logActivity;
