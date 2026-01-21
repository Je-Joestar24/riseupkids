const bookService = require('../services/book.services');

/**
 * @desc    Create new book
 * @route   POST /api/books
 * @access  Private (Admin/Teacher only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - language: String (optional, default: 'en')
 * - readingLevel: String (optional, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner')
 * - estimatedReadingTime: Number (optional) - in minutes
 * - requiredReadingCount: Number (optional, default: 5)
 * - starsPerReading: Number (optional, default: 10)
 * - totalStarsAwarded: Number (optional, default: 50)
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - isPublished: Boolean (optional, default: false)
 * - scormFile: File (required) - SCORM ZIP file
 * - coverImage: File (optional) - Cover image for the book
 */
const createBook = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can create books',
      });
    }

    const book = await bookService.createBook(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create book',
    });
  }
};

/**
 * @desc    Get all books
 * @route   GET /api/books
 * @access  Private (Admin/Teacher only)
 * 
 * Query parameters:
 * - isPublished: Filter by published status (true/false)
 * - language: Filter by language
 * - readingLevel: Filter by reading level (beginner/intermediate/advanced)
 * - search: Search in title/description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
const getAllBooks = async (req, res) => {
  try {
    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can access books',
      });
    }

    const result = await bookService.getAllBooks(req.query);

    res.status(200).json({
      success: true,
      message: 'Books retrieved successfully',
      data: result.books,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve books',
    });
  }
};

/**
 * @desc    Get single book by ID
 * @route   GET /api/books/:id
 * @access  Private (Admin/Teacher only)
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can access books',
      });
    }

    const book = await bookService.getBookById(id);

    res.status(200).json({
      success: true,
      message: 'Book retrieved successfully',
      data: book,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve book',
    });
  }
};

/**
 * @desc    Update book
 * @route   PUT /api/books/:id
 * @access  Private (Admin/Teacher only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - language: String (optional)
 * - readingLevel: String (optional)
 * - estimatedReadingTime: Number (optional)
 * - requiredReadingCount: Number (optional)
 * - starsPerReading: Number (optional)
 * - totalStarsAwarded: Number (optional)
 * - isPublished: Boolean (optional)
 * - coverImage: File (optional) - New cover image
 */
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can update books',
      });
    }

    const book = await bookService.updateBook(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: book,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update book',
    });
  }
};

/**
 * @desc    Delete book
 * @route   DELETE /api/books/:id
 * @access  Private (Admin/Teacher only)
 */
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can delete books',
      });
    }

    const result = await bookService.deleteBook(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete book',
    });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
};

