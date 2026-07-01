const { Book, Media, Badge, Course, CmsBook } = require('../models');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const html5handlerService = require('./html5handler.service');
const s3Service = require('./s3.service');
const scormService = require('./scorm.service');
const cloudfrontService = require('./cloudfront.service');
const { applyCreatorOwnershipFilter, assertCreatorOwnsDocument } = require('../utils/contentOwnership');

/**
 * Create Book Service
 *
 * Creates a new book with either SCORM or HTML5 package (admin chooses via radio on form).
 * - packageType 'scorm': zip stored as SCORM, scormFile/Path/Url/Size set.
 * - packageType 'html5': zip sent to html5handler (extract + host), html5PackageId + html5EntryPoint set.
 * - packageType 'builtin': no zip; cmsBookId must reference a published, non-archived CmsBook.
 *
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} bookData - Book data (includes packageType: 'scorm' | 'html5' | 'builtin')
 * @param {Object} files - Uploaded files (from multer: scormFile = zip, coverImage optional)
 * @returns {Object} Created book
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
    packageType: rawPackageType,
  } = bookData;

  const rawLower = (rawPackageType && String(rawPackageType).toLowerCase()) || '';
  const packageType = rawLower === 'html5' ? 'html5' : rawLower === 'builtin' ? 'builtin' : 'scorm';

  if (!title || !title.trim()) {
    throw new Error('Please provide a book title');
  }

  let linkedCmsBookId = null;
  if (packageType === 'builtin') {
    const cmsId = bookData.cmsBookId;
    if (!cmsId || !String(cmsId).trim()) {
      throw new Error('Built-in book requires cmsBookId (select a built-in / CMS book)');
    }
    if (!mongoose.Types.ObjectId.isValid(cmsId)) {
      throw new Error('Invalid cmsBookId');
    }
    const cmsDoc = await CmsBook.findOne({
      _id: cmsId,
      status: 'published',
      isArchived: false,
    })
      .select('_id')
      .lean();
    if (!cmsDoc) {
      throw new Error('Built-in CMS book not found, not published, or archived');
    }
    linkedCmsBookId = cmsDoc._id;
  } else {
    if (!files.scormFile || !Array.isArray(files.scormFile) || files.scormFile.length === 0) {
      throw new Error('Please provide a package file (ZIP) for the book');
    }
  }

  const zipFile =
    files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0
      ? files.scormFile[0]
      : null;
  if (packageType !== 'builtin' && (!zipFile || !(zipFile.buffer || zipFile.path))) {
    throw new Error('Package file was not uploaded correctly. Please try again.');
  }

  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  let bookPayload = {
    title: title.trim(),
    description: description?.trim() || null,
    coverImage: null,
    packageType,
    cmsBookId: linkedCmsBookId,
    language: language || 'en',
    readingLevel: readingLevel || 'beginner',
    estimatedReadingTime: estimatedReadingTime ? parseInt(estimatedReadingTime, 10) : null,
    requiredReadingCount: requiredReadingCount ? parseInt(requiredReadingCount, 10) : 5,
    starsPerReading: starsPerReading ? parseInt(starsPerReading, 10) : 10,
    totalStarsAwarded: totalStarsAwarded ? parseInt(totalStarsAwarded, 10) : 50,
    badgeAwarded: badgeAwarded || null,
    tags: [],
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
  };

  if (packageType === 'builtin') {
    bookPayload.scormFile = null;
    bookPayload.scormFilePath = null;
    bookPayload.scormFileUrl = null;
    bookPayload.scormFileSize = null;
    bookPayload.scormBaseUrl = null;
    bookPayload.scormEntryPoint = 'index.html';
    bookPayload.html5PackageId = null;
    bookPayload.html5EntryPoint = 'index.html';
    bookPayload.html5BaseUrl = null;
  } else if (packageType === 'html5') {
    const zipInput = zipFile.buffer || zipFile.path;
    const { id, entryPoint, baseUrl } = await html5handlerService.extractAndUploadToS3Only(zipInput);
    bookPayload.html5PackageId = id;
    bookPayload.html5EntryPoint = entryPoint || 'index.html';
    bookPayload.html5BaseUrl = baseUrl || null;
    bookPayload.scormFile = null;
    bookPayload.scormFilePath = null;
    bookPayload.scormFileUrl = null;
    bookPayload.scormFileSize = null;
  } else {
    const { url: scormFileUrl, s3Key: scormS3Key } = await s3Service.uploadFileFromMulter(zipFile, 'activities/scorm');
    const scormMedia = await Media.create({
      type: 'video',
      title: zipFile.originalname,
      filePath: scormS3Key,
      url: scormFileUrl,
      mimeType: zipFile.mimetype,
      size: zipFile.size,
      uploadedBy: userId,
    });
    bookPayload.scormFile = scormMedia._id;
    bookPayload.scormFilePath = scormS3Key;
    bookPayload.scormFileUrl = scormFileUrl;
    bookPayload.scormFileSize = zipFile.size;
    bookPayload.html5PackageId = null;
    bookPayload.html5EntryPoint = null;
    bookPayload.cmsBookId = null;
  }

  if (tags) {
    try {
      const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
      bookPayload.tags = Array.isArray(parsed) ? parsed.filter(t => t && t.trim()).map(t => t.trim()) : [];
    } catch (e) {
      bookPayload.tags = [];
    }
  }

  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    bookPayload.coverImage = coverUrl;
  }

  const book = await Book.create(bookPayload);

  if (packageType === 'scorm' && zipFile && zipFile.buffer) {
    const extracted = await scormService.uploadExtractedScormToS3(zipFile.buffer, 'book', book._id);
    if (extracted) {
      book.scormBaseUrl = extracted.baseUrl;
      book.scormEntryPoint = extracted.entryPoint;
      await book.save();
    }
  }

  const createdBook = await Book.findById(book._id)
    .populate({ path: 'scormFile', select: 'type title url mimeType size', strictPopulate: false })
    .populate({
      path: 'cmsBookId',
      select: 'title description status language version isArchived',
      strictPopulate: false,
    })
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
    user,
    isPublished,
    isArchived,
    language,
    readingLevel,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = applyCreatorOwnershipFilter(user, {});

  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (isArchived !== undefined) {
    query.isArchived = isArchived === 'true' || isArchived === true;
  } else {
    query.isArchived = false;
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
    .populate('cmsBookId', 'title description status language version')
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
const getBookById = async (bookId, user = null) => {
  const book = await Book.findById(bookId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('cmsBookId', 'title description status language version isArchived')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!book) {
    throw new Error('Book not found');
  }

  assertCreatorOwnsDocument(user, book);

  return book;
};

/**
 * Archive Book Service
 *
 * Soft-deletes a book by setting isArchived=true and unpublishing it.
 *
 * @param {String} bookId - Book's MongoDB ID
 * @returns {Object} Archived book info
 * @throws {Error} If book not found or already archived
 */
const archiveBook = async (bookId, user = null) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new Error('Book not found');
  }

  assertCreatorOwnsDocument(user, book);

  if (book.isArchived) {
    throw new Error('Book is already archived');
  }

  book.isArchived = true;
  book.isPublished = false;
  await book.save();

  return { message: 'Book archived successfully', id: book._id };
};

/**
 * Unarchive Book Service
 *
 * Restores an archived book by setting isArchived=false.
 *
 * @param {String} bookId - Book's MongoDB ID
 * @returns {Object} Unarchived book info
 * @throws {Error} If book not found or not archived
 */
const unarchiveBook = async (bookId, user = null) => {
  const book = await Book.findById(bookId);
  if (!book) {
    throw new Error('Book not found');
  }

  assertCreatorOwnsDocument(user, book);

  if (!book.isArchived) {
    throw new Error('Book is not archived');
  }

  book.isArchived = false;
  await book.save();

  return { message: 'Book unarchived successfully', id: book._id };
};

/**
 * Update Book Service
 * 
 * Updates book fields: title, description, coverImage, language, readingLevel,
 * estimatedReadingTime, requiredReadingCount, starsPerReading, totalStarsAwarded, isPublished,
 * cmsBookId (only when packageType is builtin — re-link to another published CmsBook)
 * SCORM / HTML5 package files cannot be changed via this method
 * 
 * @param {String} bookId - Book's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated book with populated data
 * @throws {Error} If book not found or validation fails
 */
const updateBook = async (bookId, userId, updateData, files = {}, user = null) => {
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
    cmsBookId,
  } = updateData;

  // Find book
  const book = await Book.findById(bookId);

  if (!book) {
    throw new Error('Book not found');
  }

  assertCreatorOwnsDocument(user, book);

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

  // Re-link built-in CMS book (only for packageType=builtin)
  if (cmsBookId !== undefined) {
    if ((book.packageType || 'scorm') !== 'builtin') {
      throw new Error('cmsBookId can only be changed for built-in books (packageType=builtin)');
    }
    if (!cmsBookId || !String(cmsBookId).trim()) {
      throw new Error('cmsBookId cannot be empty for built-in books');
    }
    if (!mongoose.Types.ObjectId.isValid(cmsBookId)) {
      throw new Error('Invalid cmsBookId');
    }
    const linked = await CmsBook.findOne({
      _id: cmsBookId,
      status: 'published',
      isArchived: false,
    })
      .select('_id')
      .lean();
    if (!linked) {
      throw new Error('Linked built-in CMS book not found, not published, or archived');
    }
    book.cmsBookId = cmsBookId;
  }

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    book.coverImage = coverUrl;
  }

  // Replace package ZIP for scorm/html5 books (not builtin)
  if (files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0) {
    const packageType = book.packageType || 'scorm';
    if (packageType === 'builtin') {
      throw new Error('Package file cannot be replaced for built-in books; change cmsBookId instead');
    }

    const zipFile = files.scormFile[0];
    if (!zipFile || !(zipFile.buffer || zipFile.path)) {
      throw new Error('Package file was not uploaded correctly. Please try again.');
    }
    const zipInput = zipFile.buffer || zipFile.path;

    if (packageType === 'html5') {
      if (book.html5PackageId) {
        try {
          await s3Service.deleteByPrefix(`html5/${book.html5PackageId}`);
        } catch (error) {
          console.error('Error deleting previous HTML5 package:', error);
        }
      }
      const { id, entryPoint, baseUrl } = await html5handlerService.extractAndUploadToS3Only(zipInput);
      book.html5PackageId = id;
      book.html5EntryPoint = entryPoint || 'index.html';
      book.html5BaseUrl = baseUrl || null;
      book.scormFile = null;
      book.scormFilePath = null;
      book.scormFileUrl = null;
      book.scormFileSize = null;
      book.scormBaseUrl = null;
      book.scormEntryPoint = 'index.html';
    } else {
      if (book.scormFile) {
        try {
          const oldScormMedia = await Media.findById(book.scormFile);
          if (oldScormMedia && oldScormMedia.filePath) {
            await s3Service.deleteByKey(oldScormMedia.filePath);
          }
          await Media.findByIdAndDelete(book.scormFile);
        } catch (error) {
          console.error('Error deleting previous SCORM file:', error);
        }
      }
      try {
        await s3Service.deleteByPrefix(`scorm/book/${book._id}`);
      } catch (error) {
        console.error('Error deleting previous extracted SCORM package:', error);
      }

      const { url: scormFileUrl, s3Key: scormS3Key } = await s3Service.uploadFileFromMulter(zipFile, 'activities/scorm');
      const scormMedia = await Media.create({
        type: 'video',
        title: zipFile.originalname,
        filePath: scormS3Key,
        url: scormFileUrl,
        mimeType: zipFile.mimetype,
        size: zipFile.size,
        uploadedBy: userId,
      });
      book.scormFile = scormMedia._id;
      book.scormFilePath = scormS3Key;
      book.scormFileUrl = scormFileUrl;
      book.scormFileSize = zipFile.size;
      book.html5PackageId = null;
      book.html5EntryPoint = null;
      book.html5BaseUrl = null;

      if (zipFile.buffer) {
        const extracted = await scormService.uploadExtractedScormToS3(zipFile.buffer, 'book', book._id);
        if (extracted) {
          book.scormBaseUrl = extracted.baseUrl;
          book.scormEntryPoint = extracted.entryPoint;
        }
      }
    }
  }

  await book.save();

  // Get updated book with populated data
  const updatedBook = await Book.findById(bookId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('cmsBookId', 'title description status language version isArchived')
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
const deleteBook = async (bookId, user = null) => {
  const book = await Book.findById(bookId);

  if (!book) {
    throw new Error('Book not found');
  }

  assertCreatorOwnsDocument(user, book);

  if (!book.isArchived) {
    throw new Error('Book must be archived before permanent deletion');
  }

  // Detach book from all courses/collections before deleting.
  await Course.updateMany(
    { 'contents.contentId': book._id, 'contents.contentType': 'book' },
    { $pull: { contents: { contentId: book._id, contentType: 'book' } } }
  );

  // Delete SCORM file from S3 if exists
  if (book.scormFile) {
    try {
      const scormMedia = await Media.findById(book.scormFile);
      if (scormMedia && scormMedia.filePath) {
        await s3Service.deleteByKey(scormMedia.filePath);
      }
      await Media.findByIdAndDelete(book.scormFile);
    } catch (error) {
      console.error('Error deleting SCORM file:', error);
    }
  }

  // Delete extracted SCORM package directory from S3.
  try {
    await s3Service.deleteByPrefix(`scorm/book/${book._id}`);
  } catch (error) {
    console.error('Error deleting extracted SCORM package from S3:', error);
  }

  // Delete HTML5 package directory from S3 when this is an HTML5 book.
  if (book.html5PackageId) {
    try {
      await s3Service.deleteByPrefix(`html5/${book.html5PackageId}`);
    } catch (error) {
      console.error('Error deleting HTML5 package from S3:', error);
    }
  }

  // Delete cover image if exists
  if (
    book.coverImage &&
    !book.coverImage.startsWith('http') &&
    fs.existsSync(path.join(__dirname, '../', book.coverImage.replace('/uploads', 'uploads')))
  ) {
    try {
      fs.unlinkSync(path.join(__dirname, '../', book.coverImage.replace('/uploads', 'uploads')));
    } catch (error) {
      console.error('Error deleting cover image:', error);
    }
  }

  if (book.coverImage && book.coverImage.startsWith('http')) {
    try {
      const coverKey = s3Service.getS3KeyFromUrl(book.coverImage);
      if (coverKey) await s3Service.deleteByKey(coverKey);
    } catch (error) {
      console.error('Error deleting cover image from S3:', error);
    }
  }

  // Best-effort CloudFront invalidation for removed package paths.
  if (cloudfrontService.isConfigured()) {
    try {
      const invalidationPaths = [];
      if (book.html5PackageId) invalidationPaths.push(`/html5/${book.html5PackageId}/*`);
      if (book.scormBaseUrl || book.scormFilePath) invalidationPaths.push(`/scorm/book/${book._id}/*`);
      if (invalidationPaths.length > 0) {
        await cloudfrontService.invalidate(invalidationPaths);
      }
    } catch (error) {
      console.error('Error creating CloudFront invalidation for deleted book assets:', error);
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
  archiveBook,
  unarchiveBook,
  deleteBook,
};

