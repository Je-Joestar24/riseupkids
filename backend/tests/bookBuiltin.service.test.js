jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn(),
  deleteByPrefix: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
}));

jest.mock('../services/html5handler.service', () => ({
  extractAndUploadToS3Only: jest.fn(),
}));

jest.mock('../services/scorm.service', () => ({
  uploadExtractedScormToS3: jest.fn(),
}));

jest.mock('../services/cloudfront.service', () => ({
  isConfigured: jest.fn(() => false),
  invalidate: jest.fn(),
}));

jest.mock('../models', () => ({
  Book: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  CmsBook: {
    findOne: jest.fn(),
  },
  Media: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Badge: {
    findById: jest.fn(),
  },
  Course: {
    updateMany: jest.fn(),
  },
}));

const { Book, CmsBook, Media, Badge } = require('../models');
const html5handlerService = require('../services/html5handler.service');
const s3Service = require('../services/s3.service');
const scormService = require('../services/scorm.service');
const bookService = require('../services/book.services');

const CMS_BOOK_ID = '507f1f77bcf86cd799439011';
const CMS_BOOK_ID_2 = '507f1f77bcf86cd799439012';
const USER_ID = '507f1f77bcf86cd7994390aa';
const LIB_BOOK_ID = '507f1f77bcf86cd7994390bb';

function mockPopulateLean(result) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

/** Matches CmsBook.findOne(...).select(...).lean() in book.services */
function mockCmsBookFindOneLean(docOrNull) {
  return {
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(docOrNull),
    }),
  };
}

describe('book.services – built-in (CMS) linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBook', () => {
    it('creates a builtin book without ZIP and links published CmsBook', async () => {
      CmsBook.findOne.mockReturnValue(mockCmsBookFindOneLean({ _id: CMS_BOOK_ID }));

      const createdShell = {
        _id: LIB_BOOK_ID,
        save: jest.fn().mockResolvedValue(true),
      };
      Book.create.mockResolvedValue(createdShell);

      const leanDoc = {
        _id: LIB_BOOK_ID,
        title: 'Library shell',
        packageType: 'builtin',
        cmsBookId: { _id: CMS_BOOK_ID, title: 'CMS Story', status: 'published' },
      };
      Book.findById.mockReturnValue(mockPopulateLean(leanDoc));

      const result = await bookService.createBook(
        USER_ID,
        {
          title: 'Library shell',
          packageType: 'builtin',
          cmsBookId: CMS_BOOK_ID,
        },
        {}
      );

      expect(CmsBook.findOne).toHaveBeenCalledWith({
        _id: CMS_BOOK_ID,
        status: 'published',
        isArchived: false,
      });
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          packageType: 'builtin',
          cmsBookId: CMS_BOOK_ID,
          scormFile: null,
          html5PackageId: null,
          html5BaseUrl: null,
          createdBy: USER_ID,
        })
      );
      expect(html5handlerService.extractAndUploadToS3Only).not.toHaveBeenCalled();
      expect(s3Service.uploadFileFromMulter).not.toHaveBeenCalled();
      expect(scormService.uploadExtractedScormToS3).not.toHaveBeenCalled();
      expect(result).toEqual(leanDoc);
    });

    it('rejects builtin create when cmsBookId is missing', async () => {
      await expect(
        bookService.createBook(
          USER_ID,
          { title: 'No link', packageType: 'builtin' },
          {}
        )
      ).rejects.toThrow(/cmsBookId/);

      expect(CmsBook.findOne).not.toHaveBeenCalled();
      expect(Book.create).not.toHaveBeenCalled();
    });

    it('rejects builtin create when CmsBook is not published', async () => {
      CmsBook.findOne.mockReturnValue(mockCmsBookFindOneLean(null));

      await expect(
        bookService.createBook(
          USER_ID,
          {
            title: 'Bad link',
            packageType: 'builtin',
            cmsBookId: CMS_BOOK_ID,
          },
          {}
        )
      ).rejects.toThrow(/not found, not published, or archived/);

      expect(Book.create).not.toHaveBeenCalled();
    });

    it('optional cover image still uploads for builtin books', async () => {
      CmsBook.findOne.mockReturnValue(mockCmsBookFindOneLean({ _id: CMS_BOOK_ID }));
      s3Service.uploadFileFromMulter.mockResolvedValue({ url: 'https://cdn.example/cover.png' });

      const createdShell = { _id: LIB_BOOK_ID, save: jest.fn().mockResolvedValue(true) };
      Book.create.mockResolvedValue(createdShell);

      const leanDoc = {
        _id: LIB_BOOK_ID,
        title: 'With cover',
        packageType: 'builtin',
        coverImage: 'https://cdn.example/cover.png',
        cmsBookId: { _id: CMS_BOOK_ID },
      };
      Book.findById.mockReturnValue(mockPopulateLean(leanDoc));

      await bookService.createBook(
        USER_ID,
        {
          title: 'With cover',
          packageType: 'builtin',
          cmsBookId: CMS_BOOK_ID,
        },
        {
          coverImage: [{ buffer: Buffer.from('x'), mimetype: 'image/png', originalname: 'c.png', size: 3 }],
        }
      );

      expect(s3Service.uploadFileFromMulter).toHaveBeenCalledTimes(1);
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          coverImage: 'https://cdn.example/cover.png',
        })
      );
    });

    it('creates an HTML5 book from ZIP plus optional cover without SCORM or CMS links', async () => {
      const zipFile = {
        originalname: 'html5-story.zip',
        mimetype: 'application/zip',
        size: 8192,
        buffer: Buffer.from('html5-package'),
      };
      const coverImage = {
        originalname: 'cover.png',
        mimetype: 'image/png',
        size: 256,
        buffer: Buffer.from('cover'),
      };
      const createdBook = { _id: LIB_BOOK_ID, save: jest.fn().mockResolvedValue(true) };
      const leanDoc = {
        _id: LIB_BOOK_ID,
        title: 'HTML5 Story',
        packageType: 'html5',
        html5PackageId: 'html5-pkg-1',
        html5EntryPoint: 'nested/index.html',
        html5BaseUrl: 'https://cdn.example/html5/html5-pkg-1',
        scormFile: null,
        cmsBookId: null,
        coverImage: 'https://cdn.example/covers/html5.png',
      };

      html5handlerService.extractAndUploadToS3Only.mockResolvedValue({
        id: 'html5-pkg-1',
        entryPoint: 'nested/index.html',
        baseUrl: 'https://cdn.example/html5/html5-pkg-1',
      });
      s3Service.uploadFileFromMulter.mockResolvedValue({ url: 'https://cdn.example/covers/html5.png' });
      Book.create.mockResolvedValue(createdBook);
      Book.findById.mockReturnValue(mockPopulateLean(leanDoc));

      const result = await bookService.createBook(
        USER_ID,
        {
          title: ' HTML5 Story ',
          description: ' Hosted HTML package ',
          packageType: 'html5',
          tags: JSON.stringify(['html', ' ', 'reader']),
          isPublished: 'true',
        },
        { scormFile: [zipFile], coverImage: [coverImage] }
      );

      expect(html5handlerService.extractAndUploadToS3Only).toHaveBeenCalledWith(zipFile.buffer);
      expect(s3Service.uploadFileFromMulter).toHaveBeenCalledTimes(1);
      expect(s3Service.uploadFileFromMulter).toHaveBeenCalledWith(coverImage, 'media/images');
      expect(Media.create).not.toHaveBeenCalled();
      expect(scormService.uploadExtractedScormToS3).not.toHaveBeenCalled();
      expect(CmsBook.findOne).not.toHaveBeenCalled();
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'HTML5 Story',
          description: 'Hosted HTML package',
          packageType: 'html5',
          cmsBookId: null,
          html5PackageId: 'html5-pkg-1',
          html5EntryPoint: 'nested/index.html',
          html5BaseUrl: 'https://cdn.example/html5/html5-pkg-1',
          scormFile: null,
          scormFilePath: null,
          scormFileUrl: null,
          scormFileSize: null,
          coverImage: 'https://cdn.example/covers/html5.png',
          tags: ['html', 'reader'],
          isPublished: true,
        })
      );
      expect(result).toEqual(leanDoc);
    });

    it('creates a SCORM book from ZIP and stores both source ZIP and extracted launch metadata', async () => {
      const zipFile = {
        originalname: 'scorm-story.zip',
        mimetype: 'application/zip',
        size: 16384,
        buffer: Buffer.from('scorm-package'),
      };
      const scormMedia = { _id: 'scorm-media-1' };
      const createdBook = { _id: LIB_BOOK_ID, save: jest.fn().mockResolvedValue(true) };
      const leanDoc = {
        _id: LIB_BOOK_ID,
        title: 'SCORM Story',
        packageType: 'scorm',
        scormFile: { _id: 'scorm-media-1', title: 'scorm-story.zip' },
        scormFilePath: 'activities/scorm/scorm-story.zip',
        scormFileUrl: 'https://cdn.example/scorm/scorm-story.zip',
        scormBaseUrl: 'https://cdn.example/scorm/book/lib-book',
        scormEntryPoint: 'launch.html',
        html5PackageId: null,
        cmsBookId: null,
      };

      s3Service.uploadFileFromMulter.mockResolvedValue({
        url: 'https://cdn.example/scorm/scorm-story.zip',
        s3Key: 'activities/scorm/scorm-story.zip',
      });
      Media.create.mockResolvedValue(scormMedia);
      Book.create.mockResolvedValue(createdBook);
      scormService.uploadExtractedScormToS3.mockResolvedValue({
        baseUrl: 'https://cdn.example/scorm/book/lib-book',
        entryPoint: 'launch.html',
      });
      Book.findById.mockReturnValue(mockPopulateLean(leanDoc));

      const result = await bookService.createBook(
        USER_ID,
        {
          title: 'SCORM Story',
          packageType: 'scorm',
          requiredReadingCount: '4',
          starsPerReading: '12',
          totalStarsAwarded: '48',
        },
        { scormFile: [zipFile] }
      );

      expect(s3Service.uploadFileFromMulter).toHaveBeenCalledWith(zipFile, 'activities/scorm');
      expect(Media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'video',
          title: 'scorm-story.zip',
          filePath: 'activities/scorm/scorm-story.zip',
          url: 'https://cdn.example/scorm/scorm-story.zip',
          mimeType: 'application/zip',
          size: 16384,
          uploadedBy: USER_ID,
        })
      );
      expect(html5handlerService.extractAndUploadToS3Only).not.toHaveBeenCalled();
      expect(CmsBook.findOne).not.toHaveBeenCalled();
      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          packageType: 'scorm',
          cmsBookId: null,
          scormFile: 'scorm-media-1',
          scormFilePath: 'activities/scorm/scorm-story.zip',
          scormFileUrl: 'https://cdn.example/scorm/scorm-story.zip',
          scormFileSize: 16384,
          html5PackageId: null,
          html5EntryPoint: null,
          requiredReadingCount: 4,
          starsPerReading: 12,
          totalStarsAwarded: 48,
        })
      );
      expect(scormService.uploadExtractedScormToS3).toHaveBeenCalledWith(
        zipFile.buffer,
        'book',
        LIB_BOOK_ID
      );
      expect(createdBook.scormBaseUrl).toBe('https://cdn.example/scorm/book/lib-book');
      expect(createdBook.scormEntryPoint).toBe('launch.html');
      expect(createdBook.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(leanDoc);
    });
  });

  describe('updateBook', () => {
    it('allows changing cmsBookId when packageType is builtin', async () => {
      const bookDoc = {
        _id: LIB_BOOK_ID,
        packageType: 'builtin',
        cmsBookId: CMS_BOOK_ID,
        title: 'Shell',
        save: jest.fn().mockResolvedValue(true),
      };

      CmsBook.findOne.mockReturnValue(mockCmsBookFindOneLean({ _id: CMS_BOOK_ID_2 }));

      Book.findById
        .mockResolvedValueOnce(bookDoc)
        .mockReturnValueOnce(
          mockPopulateLean({
            _id: LIB_BOOK_ID,
            packageType: 'builtin',
            cmsBookId: { _id: CMS_BOOK_ID_2, title: 'Other CMS' },
          })
        );

      const out = await bookService.updateBook(LIB_BOOK_ID, USER_ID, { cmsBookId: CMS_BOOK_ID_2 }, {});

      expect(bookDoc.save).toHaveBeenCalled();
      expect(bookDoc.cmsBookId).toBe(CMS_BOOK_ID_2);
      expect(out.cmsBookId._id).toBe(CMS_BOOK_ID_2);
    });

    it('rejects cmsBookId update when packageType is not builtin', async () => {
      const bookDoc = {
        _id: LIB_BOOK_ID,
        packageType: 'html5',
        html5PackageId: 'pkg1',
        save: jest.fn(),
      };
      Book.findById.mockResolvedValue(bookDoc);

      await expect(
        bookService.updateBook(LIB_BOOK_ID, USER_ID, { cmsBookId: CMS_BOOK_ID_2 }, {})
      ).rejects.toThrow(/only be changed for built-in books/);

      expect(CmsBook.findOne).not.toHaveBeenCalled();
      expect(bookDoc.save).not.toHaveBeenCalled();
    });

    it('rejects empty cmsBookId on builtin book', async () => {
      const bookDoc = {
        _id: LIB_BOOK_ID,
        packageType: 'builtin',
        cmsBookId: CMS_BOOK_ID,
        save: jest.fn(),
      };
      Book.findById.mockResolvedValue(bookDoc);

      await expect(
        bookService.updateBook(LIB_BOOK_ID, USER_ID, { cmsBookId: '' }, {})
      ).rejects.toThrow(/cannot be empty/);
    });
  });
});
