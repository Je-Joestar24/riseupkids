const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth.routes');
const parentsRoutes = require('./routes/parents.routes');
const childrenRoutes = require('./routes/children.routes');
const courseRoutes = require('./routes/course.routes');
const contentCollectionRoutes = require('./routes/contentCollection.routes');
const courseProgressRoutes = require('./routes/courseProgress.routes');
const activityRoutes = require('./routes/activity.routes');
const bookRoutes = require('./routes/book.routes');
const videoRoutes = require('./routes/video.routes');
const audioAssignmentRoutes = require('./routes/audioAssignment.routes');
const chantRoutes = require('./routes/chant.routes');
const scormRoutes = require('./routes/scorm.routes');
const kidsWallRoutes = require('./routes/kidsWall.routes');
const videoWatchRoutes = require('./routes/videoWatch.routes');
const bookReadingRoutes = require('./routes/bookReading.routes');
const exploreRoutes = require('./routes/explore.routes');

// Import middleware
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Ignore favicon requests (browsers automatically request this)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve extracted SCORM packages
app.use('/scorm', express.static(path.join(__dirname, 'uploads/scorm')));

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/children', childrenRoutes);
// Course routes: /api/courses/activity-groups (existing activity groups)
app.use('/api/courses', courseRoutes);
// Content Collection routes: /api/courses (root - create, list, get, update, delete courses)
app.use('/api/courses', contentCollectionRoutes);
// Course Progress routes: /api/course-progress
app.use('/api/course-progress', courseProgressRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/audio-assignments', audioAssignmentRoutes);
app.use('/api/chants', chantRoutes);
app.use('/api/scorm', scormRoutes);
app.use('/api/kids-wall', kidsWallRoutes);
app.use('/api/video-watch', videoWatchRoutes);
app.use('/api/book-reading', bookReadingRoutes);
app.use('/api/explore', exploreRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Rise Up Kids API',
    version: '1.0.0',
    status: 'running',
      endpoints: {
      api: '/api',
      auth: '/api/auth',
      parents: '/api/parents',
      children: '/api/children',
      courses: '/api/courses',
      courseProgress: '/api/course-progress',
      activities: '/api/activities',
      books: '/api/books',
      videos: '/api/videos',
      audioAssignments: '/api/audio-assignments',
      chants: '/api/chants',
      scorm: '/api/scorm',
      kidsWall: '/api/kids-wall',
      videoWatch: '/api/video-watch',
      bookReading: '/api/book-reading',
      explore: '/api/explore'
    }
  });
});

// 404 handler (must be after all routes)
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API endpoint: http://localhost:${PORT}/api`);
  });
};

startServer();

module.exports = app;

