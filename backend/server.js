const express = require('express');
const http = require('http');
const dns = require('dns');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();
// Prefer IPv4 for DNS lookups — on some Windows networks IPv6 DNS (e.g. router ::1) refuses
// Node's SRV resolution while `nslookup` still works, causing querySrv ECONNREFUSED.
dns.setDefaultResultOrder('ipv4first');
const mailConfig = require('./config/mail');
const { startDeletionScheduler, stopDeletionScheduler } = require('./jobs/deletionScheduler');
const { startNotificationScheduler, stopNotificationScheduler } = require('./jobs/notificationScheduler');

// Import routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth.routes');
const parentsRoutes = require('./routes/parents.routes');
const teachersRoutes = require('./routes/teachers.routes');
const contentCreatorsRoutes = require('./routes/contentCreators.routes');
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
const html5handlerRoutes = require('./routes/html5handler.routes');
const kidsWallRoutes = require('./routes/kidsWall.routes');
const videoWatchRoutes = require('./routes/videoWatch.routes');
const bookReadingRoutes = require('./routes/bookReading.routes');
const exploreRoutes = require('./routes/explore.routes');
const exploreVideoWatchRoutes = require('./routes/exploreVideoWatch.routes');
const parentDashboardRoutes = require('./routes/parentDashboard.routes');
const contactSupportRoutes = require('./routes/contactSupport.routes');
const stripeRoutes = require('./routes/stripe.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const paypalRoutes = require('./routes/paypal.routes');
const pagseguroRoutes = require('./routes/pagseguro.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const accountDeletionRoutes = require('./routes/accountDeletion.routes');
const moduleAccessRoutes = require('./routes/moduleAccess.routes');
const adminNotificationsRoutes = require('./routes/adminNotifications.routes');
const badgeRoutes = require('./routes/badge.routes');
const googleMeetRoutes = require('./routes/googleMeet.routes');
const meetingRoutes = require('./routes/meeting.routes');
const youtubeLiveRoutes = require('./routes/youtubeLive.routes');
const cloudfrontRoutes = require('./routes/cloudfront.routes');
const invitationRoutes = require('./routes/invitationRoutes');
const schoolApplicationRoutes = require('./routes/schoolApplicationRoutes');
const leadRoutes = require('./routes/lead.routes');
const schoolProspectRoutes = require('./routes/schoolProspect.routes');
const mailRoutes = require('./routes/mail.routes');
const programMaterialsRoutes = require('./routes/programMaterials.routes');
const programMaterialsAdminRoutes = require('./routes/programMaterialsAdmin.routes');
const programLessonPlansAdminRoutes = require('./routes/programLessonPlansAdmin.routes');
const starCamRoutes = require('./routes/starCam.routes');
const starCamChildRoutes = require('./routes/starCamChild.routes');
const starCamMissionsAdminRoutes = require('./routes/starCamMissionsAdmin.routes');
const starCamLabelCatalogRoutes = require('./routes/starCamLabelCatalog.routes');
const cmsBookAdminRoutes = require('./routes/cmsBookAdmin.routes');
const cmsBookPlayerRoutes = require('./routes/cmsBookPlayer.routes');

// Import middleware
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Middleware
// CORS: enforced by browsers (Expo web, WebView). Native built apps (APK/IPA) often send no Origin or Origin: null.
// - Production with CORS_ORIGIN: allow listed origins + no origin / null (so native app builds are not blocked).
// - Development: allow localhost, 127.0.0.1, Expo origins, and no origin.
const corsOptions = {
  origin: (origin, callback) => {
    const noOrigin = origin === undefined || origin === null || origin === '' || String(origin) === 'null';
    if (process.env.CORS_ORIGIN) {
      const allowed = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (noOrigin || allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    }
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('CORS_ORIGIN must be set in production'), false);
    }
    const allowedDev =
      noOrigin ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      /^https:\/\/(.*\.)?(expo\.run|expo\.dev)$/.test(origin);
    callback(null, allowedDev);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Stripe webhook route needs raw body BEFORE express.json()
// This must be before other routes that use express.json()
// The raw body will be used by stripeWebhook middleware for signature verification
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Ensure body is a Buffer for webhook verification
    if (!Buffer.isBuffer(req.body)) {
      req.body = Buffer.from(JSON.stringify(req.body));
    }
    next();
  }
);

// PagBank webhooks need exact raw bytes for SHA256 x-authenticity-token (before express.json)
const {
  pagseguroRawBodyParser,
  attachPagseguroRawBodyString,
} = require('./middleware/pagseguroRawBody');
const pagseguroWebhook = require('./middleware/pagseguroWebhook');
const {
  handleCheckoutWebhook,
  handlePaymentWebhook,
} = require('./controllers/pagseguro.controller');

const pagseguroWebhookChain = [
  pagseguroRawBodyParser,
  attachPagseguroRawBodyString,
  pagseguroWebhook,
];

app.post('/api/pagseguro/webhooks/checkout', ...pagseguroWebhookChain, handleCheckoutWebhook);
app.post('/api/pagseguro/webhooks/payment', ...pagseguroWebhookChain, handlePaymentWebhook);

// Regular JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ignore favicon requests (browsers automatically request this)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Email assets (logo for emails – must be at public URL for email clients)
app.use('/email-assets', express.static(path.join(__dirname, 'assets', 'email')));
// Seeded CMS book UI assets (e.g., reward home button icon)
app.use('/book-seeds', express.static(path.join(__dirname, 'assets', 'seeds', 'books')));

// Serve extracted SCORM packages
app.use('/scorm', express.static(path.join(__dirname, 'uploads/scorm')));
// Serve HTML5 packages (Captivate etc.)
app.use('/html5', express.static(path.join(__dirname, 'uploads/html5')));

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/content-creators', contentCreatorsRoutes);
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
app.use('/api/html5handler', html5handlerRoutes);
app.use('/api/kids-wall', kidsWallRoutes);
app.use('/api/video-watch', videoWatchRoutes);
app.use('/api/book-reading', bookReadingRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/explore/videos', exploreVideoWatchRoutes);
app.use('/api/parent-dashboard', parentDashboardRoutes);
app.use('/api/contact-support', contactSupportRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/google', googleMeetRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/youtube', youtubeLiveRoutes);
app.use('/api/cloudfront', cloudfrontRoutes);
app.use('/api/invitation', invitationRoutes);
app.use('/api/school-application', schoolApplicationRoutes);
app.use('/api/admin/leads', leadRoutes);
app.use('/api/admin/school-prospects', schoolProspectRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/parent/program-materials', programMaterialsRoutes);
app.use('/api/admin/program-materials', programMaterialsAdminRoutes);
app.use('/api/admin/program-lesson-plans', programLessonPlansAdminRoutes);
app.use('/api/star-cam', starCamRoutes);
app.use('/api/child/star-cam', starCamChildRoutes);
app.use('/api/admin/star-cam/missions', starCamMissionsAdminRoutes);
app.use('/api/admin/star-cam/label-catalog', starCamLabelCatalogRoutes);
app.use('/api/admin/cms-books', cmsBookAdminRoutes);
app.use('/api/parent/cms-books', cmsBookPlayerRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/pagseguro', pagseguroRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/deletion-requests', accountDeletionRoutes);
app.use('/api/admin/module-access', moduleAccessRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);

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
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids');
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
  startDeletionScheduler();
  startNotificationScheduler();
  const server = http.createServer(app);
  // Node's default request timeout (~5m) aborts slow large multipart uploads (e.g. explore videos).
  const requestTimeoutMs = parseInt(process.env.HTTP_REQUEST_TIMEOUT_MS || '0', 10);
  server.requestTimeout = Number.isFinite(requestTimeoutMs) && requestTimeoutMs >= 0 ? requestTimeoutMs : 0;
  if (server.requestTimeout > 0) {
    server.headersTimeout = server.requestTimeout + 120000;
  }
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Backend is running.`);
    console.log(`  Local:   http://localhost:${PORT}/api`);
    console.log(`  Network: http://0.0.0.0:${PORT}/api`);
    console.log(`  Env:     ${process.env.NODE_ENV || 'development'}\n`);
    console.log('[Mail] Driver:', mailConfig.driver);
    console.log('[Mail] From:', mailConfig.from.address);
    if (mailConfig.driver === 'smtp') {
      console.log('[Mail] SMTP Host:', mailConfig.smtp.host);
      console.log('[Mail] SMTP Port:', mailConfig.smtp.port);
      console.log('[Mail] SMTP User configured:', Boolean(mailConfig.smtp.user));
      console.log('[Mail] SMTP Password configured:', Boolean(mailConfig.smtp.password));
    }
  });

  const shutdown = (signal) => {
    console.log(`[Server] ${signal} received — shutting down`);
    stopDeletionScheduler();
    stopNotificationScheduler();
    server.close(() => process.exit(0));
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
};

startServer();

module.exports = app;

