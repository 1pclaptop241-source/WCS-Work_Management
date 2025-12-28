const mongoose = require('mongoose');
const Project = require('./models/Project');
const WorkSubmission = require('./models/WorkSubmission');
const Payment = require('./models/Payment');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log('Mongo URI loaded:', process.env.MONGO_URI ? 'Yes' : 'No');

const verifyUploads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- Recent Projects (Script Files) ---');
        const projects = await Project.find({ scriptFile: { $exists: true, $ne: null } })
            .sort({ createdAt: -1 })
            .limit(3)
            .select('title scriptFile createdAt');

        projects.forEach(p => {
            console.log(`Project: ${p.title}`);
            console.log(`Script URL: ${p.scriptFile}`);
            console.log(`Is Cloudinary: ${p.scriptFile && p.scriptFile.includes('cloudinary.com')}`);
            console.log('-------------------');
        });

        console.log('\n--- Recent Submissions (Work Files) ---');
        const submissions = await WorkSubmission.find({ fileUrl: { $exists: true, $ne: null } })
            .sort({ submittedAt: -1 })
            .limit(3)
            .select('fileName fileUrl submittedAt submissionType');

        submissions.forEach(s => {
            console.log(`File: ${s.fileName} (${s.submissionType})`);
            console.log(`URL: ${s.fileUrl}`);
            console.log(`Is Cloudinary: ${s.fileUrl && s.fileUrl.includes('cloudinary.com')}`);
            console.log('-------------------');
        });

        console.log('\n--- Recent Payments (Screenshots) ---');
        const payments = await Payment.find({ paymentScreenshot: { $exists: true, $ne: null } })
            .sort({ createdAt: -1 })
            .limit(3)
            .select('project paymentScreenshot createdAt');

        payments.forEach(p => {
            console.log(`Payment for Project ID: ${p.project}`);
            console.log(`Screenshot URL: ${p.paymentScreenshot}`);
            console.log(`Is Cloudinary: ${p.paymentScreenshot && p.paymentScreenshot.includes('cloudinary.com')}`);
            console.log('-------------------');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

verifyUploads();
