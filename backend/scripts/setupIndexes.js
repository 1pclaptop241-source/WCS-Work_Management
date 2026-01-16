const mongoose = require('mongoose');
const dotenv = require('dotenv');

const path = require('path');
// Load env vars from parent directory (backend/.env)
dotenv.config({ path: path.join(__dirname, '../.env') });

const setupIndexes = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const db = mongoose.connection.db;

        console.log('--- Creating Indexes ---');

        // 1. Users
        // Already has email unique index, but adding organization index for fast switching
        console.log('Indexing Users...');
        await db.collection('users').createIndex({ currentOrganization: 1 });
        await db.collection('users').createIndex({ "memberships.organization": 1 });

        // 2. Projects
        // Critical for "Get All Projects" in dashboard
        console.log('Indexing Projects...');
        await db.collection('projects').createIndex({ organization: 1, status: 1 });
        await db.collection('projects').createIndex({ assignedTo: 1 });
        await db.collection('projects').createIndex({ createdAt: -1 }); // For sorting

        // 3. Availability
        // Critical for Calendar View (Range queries)
        console.log('Indexing Availability...');
        await db.collection('availabilities').createIndex({ user: 1, date: 1 }, { unique: true });
        await db.collection('availabilities').createIndex({ organization: 1, date: 1 });

        // 4. Talent Profiles
        // Critical for Directory Search
        console.log('Indexing Talent Profiles...');
        await db.collection('talentprofiles').createIndex({ skills: 1 });
        await db.collection('talentprofiles').createIndex({ hourlyRate: 1 });
        await db.collection('talentprofiles').createIndex({ rating: -1 });

        console.log('--- Indexing Complete ---');
        process.exit();
    } catch (error) {
        console.error('Error setting up indexes:', error);
        process.exit(1);
    }
};

setupIndexes();
