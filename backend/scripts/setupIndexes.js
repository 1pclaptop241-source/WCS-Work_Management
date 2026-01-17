const mongoose = require('mongoose');
const dotenv = require('dotenv');

const path = require('path');
// Load env vars from parent directory (backend/.env)
dotenv.config({ path: path.join(__dirname, '../.env') });

const setupIndexes = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        // Removed logs
        process.exit();
    } catch (error) {
        console.error('Error setting up indexes:', error);
        process.exit(1);
    }
};

setupIndexes();
