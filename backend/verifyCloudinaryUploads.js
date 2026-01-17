const mongoose = require('mongoose');
const Project = require('./models/Project');
const WorkSubmission = require('./models/WorkSubmission');
const Payment = require('./models/Payment');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const verifyUploads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const projects = await Project.find({ scriptFile: { $exists: true, $ne: null } })
            .sort({ createdAt: -1 })
            .limit(3)
            .select('title scriptFile createdAt');

        // Logic kept for structure but logs removed as requested
        projects.forEach(p => { });
        const submissions = await WorkSubmission.find({ fileUrl: { $exists: true, $ne: null } }).sort({ submittedAt: -1 }).limit(3).select('fileName fileUrl submittedAt submissionType');
        submissions.forEach(s => { });
        const payments = await Payment.find({ paymentScreenshot: { $exists: true, $ne: null } }).sort({ createdAt: -1 }).limit(3).select('project paymentScreenshot createdAt');
        payments.forEach(p => { });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

verifyUploads();
