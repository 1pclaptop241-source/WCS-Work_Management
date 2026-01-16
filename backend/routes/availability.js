const express = require('express');
const router = express.Router();
const { getAvailability, setAvailability } = require('../controllers/AvailabilityController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAvailability);
router.post('/', protect, setAvailability);

module.exports = router;
