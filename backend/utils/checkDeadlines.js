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
            const deadline = new Date(project.deadline);
            const startTime = new Date(project.acceptedAt || project.createdAt);
            const totalDuration = deadline - startTime;
            const timeRemaining = deadline - now;

            if (totalDuration <= 0) continue;

            const percentageLeft = (timeRemaining / totalDuration) * 100;
            const warnings = project.warnings || { warn_50: false, warn_25: false, warn_5: false, warn_crossed: false };
            let updated = false;

            if (timeRemaining < 0 && !warnings.warn_crossed) {
                for (const admin of admins) {
                    await createNotification(admin._id, 'deadline_crossed', 'Project Deadline Crossed', `Project "${project.title}" has crossed its deadline.`, project._id);
                }
                warnings.warn_crossed = true;
                updated = true;
            } else if (percentageLeft <= 5 && !warnings.warn_5) {
                for (const admin of admins) {
                    await createNotification(admin._id, 'deadline_warning', 'Project Deadline Critical', `Less than 5% time remaining for project "${project.title}".`, project._id);
                }
                warnings.warn_5 = true;
                updated = true;
            } else if (percentageLeft <= 25 && !warnings.warn_25) {
                for (const admin of admins) {
                    await createNotification(admin._id, 'deadline_warning', 'Project Deadline Warning', `Less than 25% time remaining for project "${project.title}".`, project._id);
                }
                warnings.warn_25 = true;
                updated = true;
            } else if (percentageLeft <= 50 && !warnings.warn_50) {
                for (const admin of admins) {
                    await createNotification(admin._id, 'deadline_warning', 'Project Deadline Warning', `Less than 50% time remaining for project "${project.title}".`, project._id);
                }
                warnings.warn_50 = true;
                updated = true;
            }

            if (updated) {
                project.warnings = warnings;
                await project.save();
            }
        }

        // 2. Check WORK BREAKDOWN deadlines for Editors
        const works = await WorkBreakdown.find({
            status: { $nin: ['completed', 'done'] },
            approved: false,
            deadline: { $ne: null }
        }).populate('project', 'title acceptedAt createdAt');

        for (const work of works) {
            if (!work.assignedEditor) continue;

            const deadline = new Date(work.deadline);
            const startTime = new Date(work.project.acceptedAt || work.project.createdAt);
            const totalDuration = deadline - startTime;
            const timeRemaining = deadline - now;

            if (totalDuration <= 0) continue;

            const percentageLeft = (timeRemaining / totalDuration) * 100;
            const warnings = work.warnings || { warn_50: false, warn_25: false, warn_5: false, warn_crossed: false };
            let updated = false;

            if (timeRemaining < 0 && !warnings.warn_crossed) {
                await createNotification(work.assignedEditor, 'deadline_crossed', 'Work Deadline Crossed', `Deadline crossed for pending work in project "${work.project.title}".`, work.project._id);
                for (const admin of admins) {
                    await createNotification(admin._id, 'deadline_crossed', 'Work Deadline Crossed', `Editor crossed deadline for work in project "${work.project.title}".`, work.project._id);
                }
                warnings.warn_crossed = true;
                updated = true;
            } else if (percentageLeft <= 5 && !warnings.warn_5) {
                await createNotification(work.assignedEditor, 'deadline_warning', 'Work Deadline Critical', `Less than 5% time remaining for work in project "${work.project.title}".`, work.project._id);
                warnings.warn_5 = true;
                updated = true;
            } else if (percentageLeft <= 25 && !warnings.warn_25) {
                await createNotification(work.assignedEditor, 'deadline_warning', 'Work Deadline Warning', `Less than 25% time remaining for work in project "${work.project.title}".`, work.project._id);
                warnings.warn_25 = true;
                updated = true;
            } else if (percentageLeft <= 50 && !warnings.warn_50) {
                await createNotification(work.assignedEditor, 'deadline_warning', 'Work Deadline Warning', `Less than 50% time remaining for work in project "${work.project.title}".`, work.project._id);
                warnings.warn_50 = true;
                updated = true;
            }

            if (updated) {
                work.warnings = warnings;
                await work.save();
            }
        }
    } catch (error) {
        console.error('Error checking deadlines:', error);
    }
};

module.exports = checkDeadlines;
