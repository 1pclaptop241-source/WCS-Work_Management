const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['available', 'booked', 'unavailable', 'partial'],
        default: 'available',
    },
    hoursAvailable: {
        type: Number,
        default: 8,
    },
    notes: {
        type: String,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Compound index to prevent duplicate entries for same user/date/org
availabilitySchema.index({ user: 1, organization: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
