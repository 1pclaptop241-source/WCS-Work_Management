const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide an organization name'],
        trim: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    logo: {
        type: String, // URL to logo
        default: '',
    },
    primaryColor: {
        type: String,
        default: '#2563eb', // Default blue
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    settings: {
        allowClientInvite: { type: Boolean, default: false },
        requireTwoFactor: { type: Boolean, default: false },
    }
});

module.exports = mongoose.model('Organization', organizationSchema);
