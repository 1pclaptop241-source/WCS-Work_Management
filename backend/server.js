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

// Attach io to req for use in controllers (MUST BE BEFORE ROUTES)
app.use((req, res, next) => {
  req.io = io;
  next();
});


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

const http = require('http');
const { Server } = require('socket.io');

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for now (or strictly set frontend URL)
    methods: ['GET', 'POST']
  }
});

// Socket connection logic
io.on('connection', (socket) => {
  // console.log('New client connected:', socket.id);

  // Join a room based on user ID for private notifications
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      // console.log(`User ${userId} joined room`);
    }
  });

  // Join a room for a specific work item (discussion)
  socket.on('join_work_room', (workId) => {
    if (workId) {
      socket.join(`work_${workId}`);
      // console.log(`Socket ${socket.id} joined work room: work_${workId}`);
    }
  });

  socket.on('disconnect', () => {
    // console.log('Client disconnected');
  });
});



const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  // Server running...

  // Check deadlines every 5 minutes
  setInterval(checkDeadlines, 300000);
  // Run once after 5s to check initial state
  setTimeout(checkDeadlines, 5000);
});
