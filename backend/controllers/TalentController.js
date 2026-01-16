const TalentProfile = require('../models/TalentProfile');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get all talent profiles (with filter)
// @route   GET /api/talent
// @access  Private (Admin/Manager)
const getTalent = asyncHandler(async (req, res) => {
    const { skill, search } = req.query;
    // const orgId = req.organizationId; // Future: filter by org pool

    let query = {};

    if (skill) {
        query.skills = { $in: [new RegExp(skill, 'i')] };
    }

    // Basic implementation - returning all for now, populate user info
    let talent = await TalentProfile.find(query).populate('user', 'name email');

    if (search) {
        const regex = new RegExp(search, 'i');
        talent = talent.filter(t => t.user.name.match(regex) || t.title?.match(regex));
    }

    res.json(talent);
});

// @desc    Get my profile
// @route   GET /api/talent/me
// @access  Private
const getMyProfile = asyncHandler(async (req, res) => {
    const profile = await TalentProfile.findOne({ user: req.user._id });
    if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(profile);
});

// @desc    Update/Create my profile
// @route   POST /api/talent
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const { title, bio, skills, hourlyRate, portfolio, status } = req.body;

    const profile = await TalentProfile.findOneAndUpdate(
        { user: req.user._id },
        {
            user: req.user._id,
            title,
            bio,
            skills,
            hourlyRate,
            portfolio,
            status,
            updatedAt: Date.now(),
        },
        { new: true, upsert: true }
    );

    res.json(profile);
});

module.exports = {
    getTalent,
    getMyProfile,
    updateProfile,
};
