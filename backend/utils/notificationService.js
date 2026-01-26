const webpush = require('web-push');
const Notification = require('../models/Notification');
const User = require('../models/User');

const publicVapidKey = process.env.PUBLIC_VAPID_KEY || process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY || process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
    'mailto:support@wisecutstudios.com',
    publicVapidKey,
    privateVapidKey
);

/**
 * Send push notification to a user
 * @param {string} userId - User ID to send to
 * @param {object} payload - Notification payload { title, body, url }
 */
const sendPushNotification = async (userId, payload) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return;
        }

        const payloadString = JSON.stringify(payload);

        const subscriptions = [...user.pushSubscriptions];
        const invalidSubscriptions = [];

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(subscription, payloadString);
            } catch (error) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription has expired or is no longer valid
                    invalidSubscriptions.push(subscription);
                } else {
                    console.error('Error sending push notification:', error);
                }
            }
        }

        // Remove invalid subscriptions
        if (invalidSubscriptions.length > 0) {
            user.pushSubscriptions = user.pushSubscriptions.filter(
                sub => !invalidSubscriptions.some(inv => inv.endpoint === sub.endpoint)
            );
            await user.save();
        }

    } catch (error) {
        console.error('sPN error:', error);
    }
};

/**
 * Create a new notification (DB + Push + Socket)
 * @param {string} userId - Recipient user ID
 * @param {string} type - Notification type from enum
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 * @param {string|null} relatedProjectId - Related project ID (optional)
 * @param {object|null} io - Socket.io instance (optional)
 */
const createNotification = async (userId, type, title, message, relatedProjectId = null, link = null, io = null) => {
    try {
        if (!userId) {
            console.error('createNotification: No userId provided');
            return;
        }

        const notification = await Notification.create({
            recipient: userId,
            type,
            title,
            message,
            relatedProject: relatedProjectId,
            link: link || (relatedProjectId ? `/projects/${relatedProjectId}` : '') // Use provided link or default logic
        });

        // 1. Socket.io Real-time Emit
        if (io) {
            io.to(userId.toString()).emit('notification', notification);
        }

        // 2. Web Push Notification
        await sendPushNotification(userId, {
            title,
            body: message,
            url: relatedProjectId ? `/projects/${relatedProjectId}` : '/'
        });

        return notification;

    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

module.exports = { createNotification, sendPushNotification };
