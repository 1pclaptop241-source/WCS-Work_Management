const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB using the same connection string as your app
    // Priority: Command line arg -> Environment Variable -> Localhost default
    const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost:27017/wisecutstudios';

    console.log(`Connecting to: ${MONGODB_URI.includes('localhost') ? 'Localhost' : 'Remote Database'}...`);

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    let admin = await User.findOne({ role: 'admin' });
    const password = 'admin123'; // Change this to your desired password

    if (admin) {
      console.log('⚠️  Admin account already exists! Updating password...');
      admin.password = password; // Will be hashed by pre-save hook
      await admin.save();
      console.log('Password updated to: admin123');
    } else {
      // Create admin - password will be hashed automatically by the User model
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@wisecutstudios.com', // Change if needed
        password: password, // Will be automatically hashed
        role: 'admin'
      });
      console.log('\n🎉 Admin created successfully!');
    }


    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    ' + admin.email);
    console.log('Password: admin123'); // Change this message if you changed the password above
    console.log('Role:     ' + admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('Email already exists in database!');
    }
    process.exit(1);
  }
}

createAdmin();