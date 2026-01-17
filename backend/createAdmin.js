const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB using the same connection string as your app
    const MONGODB_URI = process.env.MONGODB_URI;

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Removed console logs
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('Email already exists in database!');
    }
    process.exit(1);
  }
}

createAdmin();