const bookService = require('../services/book.services');

const CONTENT_MANAGER_ROLES = ['admin', 'teacher', 'content_creator'];

function resolveErrorStatus(error, { notFound = 404, badRequest = 400, fallback = 500 } = {}) {
  if (error?.statusCode === 403) return 403;
  const message = String(error?.message || '');
  if (message.includes('not found')) return notFound;
  if (message.includes('Invalid') || message.includes('required') || message.includes('empty') || message.includes('already archived') || message.includes('not archived') || message.includes('must be archived')) {
    return badRequest;
  }
  return fallback;
}

/**
 * @desc    Create new book
 * @route   POST /api/books
 * @access  Private (Admin/Teacher/Content creator)
 */
const createBook = async (req, res) => {
  const packageType = (req.body && req.body.packageType) || 'scorm';
  console.log('[createBook] request received, packageType=', packageType);

  try {
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can create books',
      });
    }

    const book = await bookService.createBook(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book,
    });
  } catch (error) {
    console.error('[createBook] error:', error.message || error);
    res.status(resolveErrorStatus(error, { badRequest: 400 })).json({
      success: false,
      message: error.message || 'Failed to create book',
    });
  }
};

/**
 * @desc    Get all books
 * @route   GET /api/books
 * @access  Private (Admin/Teacher/Content creator)
 */
const getAllBooks = async (req, res) => {
  try {
    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access books',
      });
    }

    const result = await bookService.getAllBooks({ ...req.query, user: req.user });

    res.status(200).json({
      success: true,
      message: 'Books retrieved successfully',
      data: result.books,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve books',
    });
  }
};

/**
 * @desc    Get single book by ID
 * @route   GET /api/books/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access books',
      });
    }

    const book = await bookService.getBookById(id, req.user);

    res.status(200).json({
      success: true,
      message: 'Book retrieved successfully',
      data: book,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve book',
    });
  }
};

/**
 * @desc    Archive book (soft delete)
 * @route   PATCH /api/books/:id/archive
 * @access  Private (Admin/Teacher/Content creator)
 */
const archiveBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can archive books',
      });
    }

    const result = await bookService.archiveBook(id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    res.status(resolveErrorStatus(error, { badRequest: 400 })).json({
      success: false,
      message: error.message || 'Failed to archive book',
    });
  }
};

/**
 * @desc    Unarchive book (restore)
 * @route   PATCH /api/books/:id/unarchive
 * @access  Private (Admin/Teacher/Content creator)
 */
const unarchiveBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can unarchive books',
      });
    }

    const result = await bookService.unarchiveBook(id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    res.status(resolveErrorStatus(error, { badRequest: 400 })).json({
      success: false,
      message: error.message || 'Failed to unarchive book',
    });
  }
};

/**
 * @desc    Update book
 * @route   PUT /api/books/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can update books',
      });
    }

    const book = await bookService.updateBook(id, userId, req.body, req.files, req.user);

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: book,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error, { badRequest: 400 })).json({
      success: false,
      message: error.message || 'Failed to update book',
    });
  }
};

/**
 * @desc    Delete book
 * @route   DELETE /api/books/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can delete books',
      });
    }

    const result = await bookService.deleteBook(id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    res.status(resolveErrorStatus(error, { badRequest: 400 })).json({
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
  archiveBook,
  unarchiveBook,
  deleteBook,
};
