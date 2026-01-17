const express = require('express');
const dotenv = require('dotenv');

// Load env vars immediately
dotenv.config();

const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const checkDeadlines = require('./utils/checkDeadlines');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Serve report files
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/works', require('./routes/works'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reset', require('./routes/reset'));
app.use('/api/work-breakdown', require('./routes/workBreakdown'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/talent', require('./routes/talent'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // Server running...

  // Check deadlines every 5 minutes
  setInterval(checkDeadlines, 300000);
  // Run once after 5s to check initial state
  setTimeout(checkDeadlines, 5000);
});
