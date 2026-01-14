const express = require('express');
const router = express.Router();
const {
  getChildBookReadings,
  getBookReadingStatus,
} = require('../controllers/bookReading.controller');
const { protect } = require('../middleware/auth');

/**
 * Book Reading Routes
 * 
 * Base path: /api/book-reading
 * 
 * All routes require authentication (parent or admin)
 * 
 * Routes:
 * - GET    /child/:childId                 - Get all book reading statuses for a child
 * - GET    /:bookId/child/:childId         - Get book reading status for a specific book and child
 */

// All routes require authentication
router.use(protect);

// Get all book readings for a child
router.get('/child/:childId', getChildBookReadings);

// Get book reading status
router.get('/:bookId/child/:childId', getBookReadingStatus);

module.exports = router;
