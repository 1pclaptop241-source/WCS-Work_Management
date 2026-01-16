const mongoose = require('mongoose');

const talentProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    title: {
        type: String, // e.g. "Senior VFX Artist"
        trim: true,
    },
    bio: {
        type: String,
        maxLength: 500,
    },
    skills: [{
        type: String, // e.g. "After Effects", "Color Grading"
        trim: true,
    }],
    hourlyRate: {
        type: Number,
        default: 0,
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    portfolio: {
        type: String, // URL
    },
    status: {
        type: String,
        enum: ['active', 'unavailable', 'open_to_work'],
        default: 'open_to_work',
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('TalentProfile', talentProfileSchema);
