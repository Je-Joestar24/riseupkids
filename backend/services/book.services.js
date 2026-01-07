const { Book, Media, Badge } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Create Book Service
 * 
 * Creates a new book with SCORM file and cover image
 * Books are SCORM-powered and require 5 readings by default
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} bookData - Book data
 * @param {Array} files - Uploaded files (from multer)
 * @returns {Object} Created book with populated media
 * @throws {Error} If validation fails
 */
const createBook = async (userId, bookData, files = {}) => {
  const {
    title,
    description,
    language,
    readingLevel,
    estimatedReadingTime,
    requiredReadingCount,
    starsPerReading,
    totalStarsAwarded,
    badgeAwarded,
    tags,
    isPublished,
  } = bookData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a book title');
  }

  // Validate SCORM file is provided
  if (!files.scormFile || !Array.isArray(files.scormFile) || files.scormFile.length === 0) {
    throw new Error('Please provide a SCORM file (ZIP format) for the book');
  }

  const scormFile = files.scormFile[0];

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  // Process SCORM file and create Media record
  const relativePath = scormFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
  const scormFileUrl = `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
  
  const scormMedia = await Media.create({
    type: 'video', // Using 'video' type for SCORM files
    title: scormFile.originalname,
    filePath: scormFile.path,
    url: scormFileUrl,
    mimeType: scormFile.mimetype,
    size: scormFile.size,
    uploadedBy: userId,
  });

  // Process cover image if provided
  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
  }

  // Parse tags
  let parsedTags = [];
  if (tags) {
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (!Array.isArray(parsedTags)) {
        parsedTags = [];
      }
    } catch (error) {
      parsedTags = [];
    }
  }

  // Create book
  const book = await Book.create({
    title: title.trim(),
    description: description?.trim() || null,
    coverImage: coverImagePath,
    scormFile: scormMedia._id,
    scormFilePath: scormFile.path,
    scormFileUrl: scormFileUrl,
    scormFileSize: scormFile.size,
    language: language || 'en',
    readingLevel: readingLevel || 'beginner',
    estimatedReadingTime: estimatedReadingTime ? parseInt(estimatedReadingTime, 10) : null,
    requiredReadingCount: requiredReadingCount ? parseInt(requiredReadingCount, 10) : 5,
    starsPerReading: starsPerReading ? parseInt(starsPerReading, 10) : 10,
    totalStarsAwarded: totalStarsAwarded ? parseInt(totalStarsAwarded, 10) : 50,
    badgeAwarded: badgeAwarded || null,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
  });

  // Get created book with populated data
  const createdBook = await Book.findById(book._id)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return createdBook;
};

/**
 * Get All Books Service
 * 
 * Retrieves all books with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Boolean} [queryParams.isPublished] - Filter by published status
 * @param {String} [queryParams.language] - Filter by language
 * @param {String} [queryParams.readingLevel] - Filter by reading level
 * @param {String} [queryParams.search] - Search in title/description
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 10)
 * @returns {Object} Books with pagination info
 */
const getAllBooks = async (queryParams = {}) => {
  const {
    isPublished,
    language,
    readingLevel,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = {};

  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (language) {
    query.language = language;
  }

  if (readingLevel) {
    query.readingLevel = readingLevel;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get books
  const books = await Book.find(query)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await Book.countDocuments(query);

  return {
    books,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Book By ID Service
 * 
 * Retrieves a single book by ID
 * 
 * @param {String} bookId - Book's MongoDB ID
 * @returns {Object} Book with populated data
 * @throws {Error} If book not found
 */
const getBookById = async (bookId) => {
  const book = await Book.findById(bookId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!book) {
    throw new Error('Book not found');
  }

  return book;
};

/**
 * Update Book Service
 * 
 * Updates book fields: title, description, coverImage, language, readingLevel,
 * estimatedReadingTime, requiredReadingCount, starsPerReading, totalStarsAwarded, isPublished
 * SCORM file cannot be changed
 * 
 * @param {String} bookId - Book's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated book with populated data
 * @throws {Error} If book not found or validation fails
 */
const updateBook = async (bookId, userId, updateData, files = {}) => {
  const {
    title,
    description,
    language,
    readingLevel,
    estimatedReadingTime,
    requiredReadingCount,
    starsPerReading,
    totalStarsAwarded,
    isPublished,
  } = updateData;

  // Find book
  const book = await Book.findById(bookId);

  if (!book) {
    throw new Error('Book not found');
  }

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    book.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    book.description = description?.trim() || null;
  }

  // Update language
  if (language !== undefined) {
    book.language = language || 'en';
  }

  // Update reading level
  if (readingLevel !== undefined) {
    if (!['beginner', 'intermediate', 'advanced'].includes(readingLevel)) {
      throw new Error('Invalid reading level. Must be beginner, intermediate, or advanced');
    }
    book.readingLevel = readingLevel;
  }

  // Update estimated reading time
  if (estimatedReadingTime !== undefined) {
    book.estimatedReadingTime = estimatedReadingTime ? parseInt(estimatedReadingTime, 10) : null;
  }

  // Update required reading count
  if (requiredReadingCount !== undefined) {
    const count = parseInt(requiredReadingCount, 10);
    if (isNaN(count) || count < 1) {
      throw new Error('Required reading count must be at least 1');
    }
    book.requiredReadingCount = count;
  }

  // Update stars per reading
  if (starsPerReading !== undefined) {
    const stars = parseInt(starsPerReading, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Stars per reading must be a non-negative number');
    }
    book.starsPerReading = stars;
  }

  // Update total stars awarded
  if (totalStarsAwarded !== undefined) {
    const stars = parseInt(totalStarsAwarded, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Total stars awarded must be a non-negative number');
    }
    book.totalStarsAwarded = stars;
  }

  // Update published status
  if (isPublished !== undefined) {
    book.isPublished = isPublished === 'true' || isPublished === true;
  }

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
    book.coverImage = coverImagePath;
  }

  await book.save();

  // Get updated book with populated data
  const updatedBook = await Book.findById(bookId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return updatedBook;
};

/**
 * Delete Book Service
 * 
 * Deletes a book (hard delete - removes from database)
 * 
 * @param {String} bookId - Book's MongoDB ID
 * @returns {Object} Deleted book info
 * @throws {Error} If book not found
 */
const deleteBook = async (bookId) => {
  const book = await Book.findById(bookId);

  if (!book) {
    throw new Error('Book not found');
  }

  // Delete SCORM file if exists
  if (book.scormFile) {
    try {
      const scormMedia = await Media.findById(book.scormFile);
      if (scormMedia && scormMedia.filePath && fs.existsSync(scormMedia.filePath)) {
        fs.unlinkSync(scormMedia.filePath);
      }
      await Media.findByIdAndDelete(book.scormFile);
    } catch (error) {
      console.error('Error deleting SCORM file:', error);
    }
  }

  // Delete cover image if exists
  if (book.coverImage && fs.existsSync(path.join(__dirname, '../', book.coverImage.replace('/uploads', 'uploads')))) {
    try {
      fs.unlinkSync(path.join(__dirname, '../', book.coverImage.replace('/uploads', 'uploads')));
    } catch (error) {
      console.error('Error deleting cover image:', error);
    }
  }

  await Book.findByIdAndDelete(bookId);

  return { message: 'Book deleted successfully', id: bookId };
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
};

