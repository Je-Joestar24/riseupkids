const { BookReading, Book } = require('../models');

/**
 * Get all book reading statuses for a child
 * Returns reading counts and required counts for all books the child has read
 * 
 * @param {String} childId - Child's MongoDB ID
 * @returns {Array} Array of reading status objects
 */
const getChildBookReadings = async (childId) => {
  // Get all completed readings for this child
  const readings = await BookReading.find({
    child: childId,
    status: 'completed',
  }).populate('book', 'title requiredReadingCount totalStarsAwarded');

  // Group readings by book and count them
  const bookReadingsMap = {};
  
  readings.forEach((reading) => {
    const bookId = reading.book._id.toString();
    
    if (!bookReadingsMap[bookId]) {
      bookReadingsMap[bookId] = {
        bookId: bookId,
        bookTitle: reading.book.title,
        requiredReadingCount: reading.book.requiredReadingCount || 5,
        currentReadingCount: 0,
        starsAwarded: false,
      };
    }
    
    bookReadingsMap[bookId].currentReadingCount += 1;
  });

  // Check which books have stars awarded
  const bookIds = Object.keys(bookReadingsMap);
  for (const bookId of bookIds) {
    const readingCount = bookReadingsMap[bookId].currentReadingCount;
    const requiredCount = bookReadingsMap[bookId].requiredReadingCount;
    
    // Stars are awarded when requirement is met
    bookReadingsMap[bookId].starsAwarded = readingCount >= requiredCount;
  }

  // Convert map to array
  const result = Object.values(bookReadingsMap);

  return result;
};

/**
 * Get book reading status for a specific book and child
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} bookId - Book's MongoDB ID
 * @returns {Object} Reading status object
 */
const getBookReadingStatus = async (childId, bookId) => {
  // Verify book exists
  const book = await Book.findById(bookId);
  if (!book) {
    throw new Error('Book not found');
  }

  // Get reading count
  const readingCount = await BookReading.getCompletedReadingCount(childId, bookId);
  const requiredReadingCount = book.requiredReadingCount || 5;
  const starsAwarded = readingCount >= requiredReadingCount;

  return {
    bookId: bookId,
    bookTitle: book.title,
    requiredReadingCount,
    currentReadingCount: readingCount,
    starsAwarded,
  };
};

module.exports = {
  getChildBookReadings,
  getBookReadingStatus,
};
