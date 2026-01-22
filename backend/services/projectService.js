const Project = require('../models/Project');
const Payment = require('../models/Payment');
const WorkBreakdown = require('../models/WorkBreakdown');
const { createNotification } = require('../utils/notificationService');

exports.closeProject = async (projectId, user) => {
    const project = await Project.findById(projectId)
        .populate('client', 'name email');

    if (!project) {
        throw new Error('Project not found');
    }

    // Ensure all work breakdown items are fully approved (both client+admin)
    const workItems = await WorkBreakdown.find({ project: project._id });
    const allApproved = workItems.length === 0 ? true : workItems.every(w => w.approved === true);

    if (!allApproved) {
        const error = new Error('All work items must have both approvals before closing');
        error.statusCode = 400;
        throw error;
    }

    // Implicitly approve project if all works are done and Admin is closing it
    project.clientApproved = true;
    project.adminApproved = true;

    project.status = 'closed';
    project.closed = true;
    project.closedAt = new Date();
    project.hiddenAt = new Date(); // Will be hidden after 2 days

    // Schedule deletion after 7 days
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);
    project.deletedAt = deleteDate;

    await project.save();

    // Create notifications
    await createNotification(
        project.client._id,
        'project_closed',
        'Project Closed',
        `Project "${project.title}" has been closed successfully.`,
        project._id
    );

    const workBreakdown = await WorkBreakdown.find({ project: project._id });
    const editorIds = [...new Set(workBreakdown.map(w => w.assignedEditor.toString()))];

    for (const editorId of editorIds) {
        await createNotification(
            editorId,
            'project_closed',
            'Project Closed',
            `Project "${project.title}" has been closed successfully.`,
            project._id
        );
    }

    // Create or update client charge payment (visible to admin & client) using client-entered amount
    const clientChargeAmount = (project.clientAmount && project.clientAmount > 0) ? project.clientAmount : project.amount;

    if (clientChargeAmount > 0) {
        // Find ALL existing client charges for this project
        const existingCharges = await Payment.find({
            project: project._id,
            paymentType: 'client_charge',
        });

        // To avoid double-billing from granular charges created in older versions:
        // We will keep/update the first one and delete the other unpaid ones.
        if (existingCharges.length > 0) {
            const primaryCharge = existingCharges[0];
            primaryCharge.originalAmount = clientChargeAmount;
            primaryCharge.finalAmount = clientChargeAmount;
            primaryCharge.deadline = project.closedAt || new Date();
            primaryCharge.workType = 'Project Charge'; // Ensure it's the total charge
            primaryCharge.workBreakdown = null; // Unlink from specific breakdown if it was granular
            await primaryCharge.save();

            if (existingCharges.length > 1) {
                // Delete other unpaid client charges for this project
                await Payment.deleteMany({
                    _id: { $in: existingCharges.slice(1).map(c => c._id) },
                    paid: false,
                    received: false
                });
            }
        } else {
            await Payment.create({
                paymentType: 'client_charge',
                project: project._id,
                client: project.client._id,
                originalAmount: clientChargeAmount,
                finalAmount: clientChargeAmount,
                workType: 'Project Charge',
                deadline: project.closedAt || new Date(),
                status: 'pending',
                currency: project.currency || 'INR'
            });
        }
    }

    const updatedProject = await Project.findById(project._id)
        .populate('client', 'name email');

    return updatedProject;
};
