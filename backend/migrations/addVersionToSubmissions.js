const mongoose = require('mongoose');
const WorkSubmission = require('../models/WorkSubmission');

// Hardcode URI for migration only since env loading is flaky
const MONGO_URI = "mongodb+srv://vivek:vivek123@cluster0.z5imn.mongodb.net/wcs?retryWrites=true&w=majority&appName=Cluster0";

const migrate = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const submissions = await WorkSubmission.find({ version: { $exists: false } });
        console.log(`Found ${submissions.length} submissions to migrate.`);

        for (const submission of submissions) {
            // Check if there are other submissions for this WB
            const siblings = await WorkSubmission.find({ workBreakdown: submission.workBreakdown })
                .sort({ submittedAt: 1 });

            // Determine version based on order
            const index = siblings.findIndex(s => s._id.toString() === submission._id.toString());
            submission.version = index + 1;
            submission.changelog = submission.editorMessage || 'Initial submission';

            await submission.save();
            console.log(`Migrated submission ${submission._id} to version ${submission.version}`);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
