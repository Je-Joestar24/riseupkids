const bookReadingService = require('../services/bookReading.service');
const { ChildProfile, Book } = require('../models');

/**
 * @desc    Get all book reading statuses for a child
 * @route   GET /api/book-reading/child/:childId
 * @access  Private (Parent/Admin)
 */
const getChildBookReadings = async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const readings = await bookReadingService.getChildBookReadings(childId);

    res.status(200).json({
      success: true,
      data: readings,
      count: readings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get child book readings',
    });
  }
};

/**
 * @desc    Get book reading status for a specific book and child
 * @route   GET /api/book-reading/:bookId/child/:childId
 * @access  Private (Parent/Admin)
 */
const getBookReadingStatus = async (req, res) => {
  try {
    const { bookId, childId } = req.params;

    // Verify book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const status = await bookReadingService.getBookReadingStatus(childId, bookId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get book reading status',
    });
  }
};

module.exports = {
  getChildBookReadings,
  getBookReadingStatus,
};
