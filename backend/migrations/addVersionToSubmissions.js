const mongoose = require('mongoose');
const WorkSubmission = require('../models/WorkSubmission');

// Hardcode URI for migration only since env loading is flaky
// Use process.env.MONGODB_URI - Ensure you run this script with dotenv loaded (e.g., node -r dotenv/config migrations/addVersionToSubmissions.js)
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("Please provide MONGODB_URI environment variable.");
    process.exit(1);
}

const migrate = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        // Logs removed
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
