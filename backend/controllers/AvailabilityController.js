const Availability = require('../models/Availability');
const asyncHandler = require('express-async-handler');

// @desc    Get availability for range
// @route   GET /api/availability
// @access  Private
const getAvailability = asyncHandler(async (req, res) => {
    const { start, end, userId } = req.query;
    const orgId = req.organizationId;

    if (!orgId) {
        return res.status(400).json({ message: 'Organization context required' });
    }

    const query = {
        organization: orgId,
        date: {
            $gte: new Date(start),
            $lte: new Date(end),
        },
    };

    if (userId) {
        query.user = userId;
    }

    const availability = await Availability.find(query).populate('user', 'name email');
    res.json(availability);
});

// @desc    Set availability (Upsert)
// @route   POST /api/availability
// @access  Private
const setAvailability = asyncHandler(async (req, res) => {
    const { date, status, hours, notes } = req.body;
    const orgId = req.organizationId;

    // Use the logged in user OR allow admins to set for others (future)
    const userId = req.user._id;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const availability = await Availability.findOneAndUpdate(
        {
            user: userId,
            organization: orgId,
            date: startOfDay,
        },
        {
            status,
            hoursAvailable: hours,
            notes,
            user: userId,
            organization: orgId,
            date: startOfDay,
        },
        { new: true, upsert: true }
    );

    res.json(availability);
});

module.exports = {
    getAvailability,
    setAvailability,
};
