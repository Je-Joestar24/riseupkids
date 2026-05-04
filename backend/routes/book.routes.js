const express = require('express');
const router = express.Router();
const {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  archiveBook,
  unarchiveBook,
  deleteBook,
} = require('../controllers/book.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadBook, uploadBookUpdate } = require('../middleware/upload');

/**
 * Book Routes
 * 
 * Base path: /api/books
 * 
 * All routes require authentication and admin/teacher role
 * 
 * Routes:
 * - POST / - Create book: ZIP for scorm/html5, or packageType=builtin + cmsBookId (no ZIP)
 * - GET / - Get all books (with filtering and pagination)
 * - GET /:id - Get single book by ID
 * - PUT /:id - Update book (title, description, coverImage, reading settings, isPublished)
 * - DELETE /:id - Delete book (hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin/teacher role
router.use(authorize('admin', 'teacher'));

// Create new book (with SCORM file and cover image upload). Wrap so async rejections are passed to error handler.
router.post('/', uploadBook, (req, res, next) => {
  createBook(req, res).catch(next);
});

// Get all books
router.get('/', getAllBooks);

// Get single book by ID
router.get('/:id', getBookById);

// Update book (with optional cover image upload, no SCORM file)
router.put('/:id', uploadBookUpdate, updateBook);

// Archive book (soft delete)
router.patch('/:id/archive', archiveBook);

// Unarchive book (restore)
router.patch('/:id/unarchive', unarchiveBook);

// Delete book
router.delete('/:id', deleteBook);

module.exports = router;

