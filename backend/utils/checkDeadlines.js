const Project = require('../models/Project');
const WorkBreakdown = require('../models/WorkBreakdown');
const User = require('../models/User');
const { createNotification } = require('./notificationService');

const checkDeadlines = async () => {
    try {
        const now = new Date();
        const admins = await User.find({ role: 'admin' });

        if (!admins.length) return;

        // 1. Check PROJECT deadlines for Admin
        const projects = await Project.find({
            status: { $nin: ['completed', 'closed'] },
            deadline: { $ne: null },
            accepted: true
        });

        for (const project of projects) {
            try {
                const deadline = new Date(project.deadline);
                const startTime = new Date(project.acceptedAt || project.createdAt);
                const totalDuration = deadline - startTime;
                const timeRemaining = deadline - now;

                if (totalDuration <= 0) continue;

                const percentageLeft = (timeRemaining / totalDuration) * 100;
                // Ensure warnings object exists and has default values
                if (!project.warnings) {
                    project.warnings = { warn_50: false, warn_25: false, warn_5: false, warn_crossed: false };
                }
                const warnings = project.warnings;

                let notificationToQueue = null;

                if (timeRemaining < 0 && !warnings.warn_crossed) {
                    notificationToQueue = {
                        type: 'deadline_crossed',
                        title: 'Project Deadline Crossed',
                        message: `Project "${project.title}" has crossed its deadline.`
                    };
                    warnings.warn_crossed = true;
                } else if (percentageLeft <= 5 && !warnings.warn_5) {
                    notificationToQueue = {
                        type: 'deadline_warning',
                        title: 'Project Deadline Critical',
                        message: `Less than 5% time remaining for project "${project.title}".`
                    };
                    warnings.warn_5 = true;
                } else if (percentageLeft <= 25 && !warnings.warn_25) {
                    notificationToQueue = {
                        type: 'deadline_warning',
                        title: 'Project Deadline Warning',
                        message: `Less than 25% time remaining for project "${project.title}".`
                    };
                    warnings.warn_25 = true;
                } else if (percentageLeft <= 50 && !warnings.warn_50) {
                    notificationToQueue = {
                        type: 'deadline_warning',
                        title: 'Project Deadline Warning',
                        message: `Less than 50% time remaining for project "${project.title}".`
                    };
                    warnings.warn_50 = true;
                }

                if (notificationToQueue) {
                    // CRITICAL: Save FIRST to prevent spamming if save fails
                    project.markModified('warnings'); // Ensure mongoose tracks the change
                    await project.save();

                    // Only send notification if save succeeded
                    for (const admin of admins) {
                        // Use try-catch for notification to prevent blocking subsequent logic (though unlikely here)
                        try {
                            await createNotification(admin._id, notificationToQueue.type, notificationToQueue.title, notificationToQueue.message, project._id);
                        } catch (notifErr) {
                            console.error(`Failed to send notification to admin ${admin._id}:`, notifErr);
                        }
                    }
                }
            } catch (projErr) {
                console.error(`Error processing deadline for project ${project._id}:`, projErr);
                // Continue to next project
            }
        }

        // 2. Check WORK BREAKDOWN deadlines for Editors
        const works = await WorkBreakdown.find({
            status: { $nin: ['completed', 'done'] },
            approved: false,
            deadline: { $ne: null }
        }).populate('project', 'title acceptedAt createdAt');

        for (const work of works) {
            try {
                if (!work.assignedEditor) continue;

                const deadline = new Date(work.deadline);
                const startTime = new Date(work.project.acceptedAt || work.project.createdAt);
                const totalDuration = deadline - startTime;
                const timeRemaining = deadline - now;

                if (totalDuration <= 0) continue;

                const percentageLeft = (timeRemaining / totalDuration) * 100;

                if (!work.warnings) {
                    work.warnings = { warn_50: false, warn_25: false, warn_5: false, warn_crossed: false };
                }
                const warnings = work.warnings;

                let notificationToQueue = null;

                if (timeRemaining < 0 && !warnings.warn_crossed) {
                    notificationToQueue = {
                        type: 'deadline_crossed',
                        title: 'Work Deadline Crossed',
                        messageEditor: `Deadline crossed for pending work in project "${work.project.title}".`,
                        messageAdmin: `Editor crossed deadline for work in project "${work.project.title}".`
                    };
                    warnings.warn_crossed = true;
                } else if (percentageLeft <= 5 && !warnings.warn_5) {
                    notificationToQueue = {
                        type: 'deadline_warning',
                        title: 'Work Deadline Critical',
                        messageEditor: `Less than 5% time remaining for work in project "${work.project.title}".`
                    };
                    warnings.warn_5 = true;
                } else if (percentageLeft <= 25 && !warnings.warn_25) {
                    notificationToQueue = {
                        type: 'deadline_warning',
                        title: 'Work Deadline Warning',
                        messageEditor: `Less than 25% time remaining for work in project "${work.project.title}".`
                    };
                    warnings.warn_25 = true;
                } else if (percentageLeft <= 50 && !warnings.warn_50) {
                    notificationToQueue = {
                        type: 'deadline_warning',
                        title: 'Work Deadline Warning',
                        messageEditor: `Less than 50% time remaining for work in project "${work.project.title}".`
                    };
                    warnings.warn_50 = true;
                }

                if (notificationToQueue) {
                    // CRITICAL: Save FIRST
                    work.markModified('warnings');
                    await work.save();

                    // Send to Editor
                    if (notificationToQueue.messageEditor) {
                        try {
                            await createNotification(work.assignedEditor, notificationToQueue.type, notificationToQueue.title, notificationToQueue.messageEditor, work.project._id);
                        } catch (err) { console.error('Failed to notify editor:', err); }
                    }

                    // Send to Admins (if applicable, e.g., crossed)
                    if (notificationToQueue.messageAdmin) {
                        for (const admin of admins) {
                            try {
                                await createNotification(admin._id, notificationToQueue.type, notificationToQueue.title, notificationToQueue.messageAdmin, work.project._id);
                            } catch (err) { console.error('Failed to notify admin:', err); }
                        }
                    }
                }
            } catch (workErr) {
                console.error(`Error processing work deadline ${work._id}:`, workErr);
            }
        }
    } catch (error) {
        console.error('Error checking deadlines:', error);
    }
};

module.exports = checkDeadlines;
