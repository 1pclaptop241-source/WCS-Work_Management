const webpush = require('web-push');
const Notification = require('../models/Notification');
const User = require('../models/User');

const publicVapidKey = process.env.PUBLIC_VAPID_KEY || 'BNkFJo9qLIl4SwPzr5UkvVE74joxfzlfvTvdPHTo_GyW8n34uVmbIvInLyvnu3ACDMdOYmEi_7YCXecH3yXJvAg';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY || 'ux-0USM5rnetlGygKaADlCWHP2FPAzY9vq8YbbyfFjE';

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
 * Create a new notification (DB + Push)
 * @param {string} userId - Recipient user ID
 * @param {string} type - Notification type from enum
 * @param {string} title - Notification title
 * @param {string} message - Notification body
 * @param {string|null} relatedProjectId - Related project ID (optional)
 */
const createNotification = async (userId, type, title, message, relatedProjectId = null) => {
    try {
        if (!userId) {
            console.error('createNotification: No userId provided');
            return;
        }

        await Notification.create({
            user: userId,
            type,
            title,
            message,
            relatedProject: relatedProjectId,
        });

        // Send Push Notification
        await sendPushNotification(userId, {
            title,
            body: message,
            url: relatedProjectId ? `/projects/${relatedProjectId}` : '/' // Deep link logic (simplified)
            // Note: Frontend SW needs to handle 'url'
        });

    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

module.exports = { createNotification, sendPushNotification };
