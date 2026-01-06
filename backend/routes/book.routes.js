const express = require('express');
const router = express.Router();
const {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require('../controllers/book.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadBook, uploadBookUpdate } = require('../middleware/upload');

/**
 * Book Routes
 * 
 * Base path: /api/books
 * 
 * All routes require authentication and admin role
 * 
 * Routes:
 * - POST / - Create new book (with SCORM file and cover image upload)
 * - GET / - Get all books (with filtering and pagination)
 * - GET /:id - Get single book by ID
 * - PUT /:id - Update book (title, description, coverImage, reading settings, isPublished)
 * - DELETE /:id - Delete book (hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin role
router.use(authorize('admin'));

// Create new book (with SCORM file and cover image upload)
router.post('/', uploadBook, createBook);

// Get all books
router.get('/', getAllBooks);

// Get single book by ID
router.get('/:id', getBookById);

// Update book (with optional cover image upload, no SCORM file)
router.put('/:id', uploadBookUpdate, updateBook);

// Delete book
router.delete('/:id', deleteBook);

module.exports = router;

