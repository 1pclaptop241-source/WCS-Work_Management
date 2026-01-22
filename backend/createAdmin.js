const mongoose = require('mongoose');
const User = require('./models/User');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createAdmin() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const adminEmail = process.env.FROM_EMAIL;

    if (!adminEmail) {
      console.error('❌ FROM_EMAIL is not defined in .env');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Generate random password
    const password = crypto.randomBytes(8).toString('hex');
    let action = 'created';

    // Check if admin already exists
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log('Admin already exists. Resetting password...');
      adminUser.password = password;
      action = 'updated';
    } else {
      console.log('Creating new admin user...');
      adminUser = new User({
        name: 'Master Admin',
        email: adminEmail,
        password: password, // Will be hashed by pre-save hook
        role: 'admin',
        isBlocked: false,
        agreedToTerms: true,
        termsAgreementDate: new Date()
      });
    }

    await adminUser.save();

    const message = `
=========================================
      ADMIN CREDENTIALS (${action.toUpperCase()})
=========================================
Email:    ${adminEmail}
Password: ${password}
=========================================
`;

    console.log(message);

    // Write to file as backup
    fs.writeFileSync(path.join(__dirname, 'admin_credentials.txt'), message);
    console.log('Credentials saved to admin_credentials.txt');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
