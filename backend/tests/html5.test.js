jest.mock('../services/s3.service', () => ({
  isConfigured: jest.fn(),
  getConfig: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
  getObjectBuffer: jest.fn(),
  putObjectBuffer: jest.fn(),
}));

// html5handler.service requires ../models/Book directly
jest.mock('../models/Book', () => ({
  findOne: jest.fn(),
}));

// courseProgress.controller requires ../models (index) directly; fully mock it so no Mongoose connects
jest.mock('../models', () => ({
  ChildProfile: { findOne: jest.fn() },
  Book: { findById: jest.fn() },
  Course: { findById: jest.fn() },
  BookReading: {
    getCompletedReadingCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  ChildStats: { getOrCreate: jest.fn() },
  StarEarning: { findOne: jest.fn() },
  CourseProgress: { findOne: jest.fn(), create: jest.fn() },
  // Unused in these tests but imported by controller
  StarEarning: { findOne: jest.fn() },
  ChildStats: { getOrCreate: jest.fn() },
  BookReading: {
    getCompletedReadingCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const s3Service = require('../services/s3.service');
const BookModel = require('../models/Book');
const models = require('../models');
const html5handlerService = require('../services/html5handler.service');
const courseProgressController = require('../controllers/courseProgress.controller');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('html5handler.service – getLaunchUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns CloudFront URL from book.html5BaseUrl when S3 configured', async () => {
    s3Service.isConfigured.mockReturnValue(true);
    const book = {
      html5BaseUrl: 'https://d357wyeb75n3iw.cloudfront.net/html5/b08fd4118824b7ea',
      html5EntryPoint: 'index.html',
    };
    // Mongoose-like chain: findOne().select().lean()
    BookModel.findOne.mockReturnValueOnce({
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(book),
      })),
    });

    const result = await html5handlerService.getLaunchUrl(
      'b08fd4118824b7ea',
      'http://localhost:5000',
      null
    );

    expect(result).toEqual({
      launchUrl: 'https://d357wyeb75n3iw.cloudfront.net/html5/b08fd4118824b7ea/index.html',
      entryPoint: 'index.html',
    });
  });

  it('falls back to s3 config baseUrl when book.html5BaseUrl is missing', async () => {
    s3Service.isConfigured.mockReturnValue(true);
    s3Service.getConfig.mockReturnValue({ baseUrl: 'https://cdn.example.com' });
    const book = {
      html5BaseUrl: null,
      html5EntryPoint: 'story.html',
    };
    BookModel.findOne.mockReturnValueOnce({
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(book),
      })),
    });

    const result = await html5handlerService.getLaunchUrl(
      'pkg123',
      'http://localhost:5000',
      null
    );

    expect(result).toEqual({
      launchUrl: 'https://cdn.example.com/html5/pkg123/story.html',
      entryPoint: 'story.html',
    });
  });
});

describe('html5handler.service – detectEntryPoint (nested folders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds index.html inside a nested folder and returns relative path', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ruk-html5-'));
    const nested = path.join(tmp, 'MyCaptivateExport');
    await fs.ensureDir(nested);
    await fs.writeFile(path.join(nested, 'index.html'), '<html><head></head><body>Hi</body></html>', 'utf8');

    const entry = html5handlerService.detectEntryPoint(tmp);
    expect(entry).toBe('MyCaptivateExport/index.html');

    await fs.remove(tmp);
  });
});

describe('html5handler.service – reinjectBridgeToS3 (legacy packages)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('overwrites entry HTML and uploads bridge JS to S3', async () => {
    s3Service.isConfigured.mockReturnValue(true);

    // getLaunchUrl path uses Book.findOne chain
    const book = {
      html5BaseUrl: 'https://d357wyeb75n3iw.cloudfront.net/html5/b08fd4118824b7ea',
      html5EntryPoint: 'index.html',
    };
    BookModel.findOne.mockReturnValueOnce({
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(book),
      })),
    });

    s3Service.getS3KeyFromUrl.mockReturnValue('html5/b08fd4118824b7ea/index.html');

    const originalHtml = '<html><head></head><body>Hello</body></html>';
    const updatedHtml = `${originalHtml}\n<script src="./ruk-html5-bridge.js"></script>\n`;

    // First read returns original html; second read returns updated html (verification read)
    s3Service.getObjectBuffer
      .mockResolvedValueOnce(Buffer.from(originalHtml, 'utf8'))
      .mockResolvedValueOnce(Buffer.from(updatedHtml, 'utf8'));

    s3Service.putObjectBuffer.mockResolvedValue({ url: 'https://cdn/x', s3Key: 'k' });

    const result = await html5handlerService.reinjectBridgeToS3('b08fd4118824b7ea', 'http://localhost:5000');

    expect(result.updated).toBe(true);
    expect(result.entryKey).toBe('html5/b08fd4118824b7ea/index.html');
    expect(result.bridgeKey).toBe('html5/b08fd4118824b7ea/ruk-html5-bridge.js');
    expect(result.hasBridgeAfter).toBe(true);

    // Should upload bridge JS and then overwrite index.html
    expect(s3Service.putObjectBuffer).toHaveBeenCalledTimes(2);
    const keys = s3Service.putObjectBuffer.mock.calls.map((c) => c[1]);
    expect(keys).toContain('html5/b08fd4118824b7ea/ruk-html5-bridge.js');
    expect(keys).toContain('html5/b08fd4118824b7ea/index.html');
  });
});

describe('courseProgress.controller – submitBookCompletion (HTML5 vs SCORM validation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Silence noisy console logs from controller during unit tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function stubModelsForFlow() {
    models.ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
    models.BookReading.getCompletedReadingCount.mockResolvedValue(0);
    models.ChildStats.getOrCreate.mockResolvedValue({ totalStars: 0 });
    models.StarEarning.findOne.mockResolvedValue(null);
    models.CourseProgress.findOne.mockResolvedValue(null);
    models.CourseProgress.create.mockResolvedValue({
      _id: 'cp1',
      contentProgress: [],
      save: jest.fn().mockResolvedValue(true),
    });
    models.BookReading.findOne.mockResolvedValue(null);
    models.BookReading.create.mockResolvedValue({ _id: 'br1' });
  }

  it(
    'allows HTML5 book completion attempt with null score and 0 timeSpent when status+progress are valid',
    async () => {
      stubModelsForFlow();

      // HTML5 book
      models.Book.findById.mockResolvedValue({
      _id: 'book1',
      title: 'HTML5 Book',
      packageType: 'html5',
      requiredReadingCount: 5,
      totalStarsAwarded: 50,
      });

      // Course must contain this book or controller returns 404 later; include it to pass that check.
      models.Course.findById.mockResolvedValue({
      _id: 'course1',
      title: 'Course',
      contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
      });

      const req = {
      params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
        body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
      user: { role: 'admin', _id: 'admin1' },
      };
      const res = mockRes();

      await courseProgressController.submitBookCompletion(req, res);

      // Should NOT fail validation with 400 "requirements not met"
      const statusCalls = res.status.mock.calls.map((c) => c[0]);
      expect(statusCalls).not.toContain(400);
    },
    15000
  );

  it('allows builtin (CMS-linked) book completion with same relaxed rules as HTML5', async () => {
    stubModelsForFlow();

    models.Book.findById.mockResolvedValue({
      _id: 'book1',
      title: 'Builtin shell',
      packageType: 'builtin',
      cmsBookId: '507f1f77bcf86cd799439011',
      requiredReadingCount: 5,
      totalStarsAwarded: 50,
    });

    models.Course.findById.mockResolvedValue({
      _id: 'course1',
      title: 'Course',
      contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
    });

    const req = {
      params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
      body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
      user: { role: 'admin', _id: 'admin1' },
    };
    const res = mockRes();

    await courseProgressController.submitBookCompletion(req, res);

    const statusCalls = res.status.mock.calls.map((c) => c[0]);
    expect(statusCalls).not.toContain(400);
  });

  it('rejects HTML5 completion when status is "completed" and score is 0 (not passed)', async () => {
    stubModelsForFlow();
    models.Book.findById.mockResolvedValue({
      _id: 'book1',
      title: 'HTML5 Book',
      packageType: 'html5',
      requiredReadingCount: 5,
      totalStarsAwarded: 50,
    });

    models.Course.findById.mockResolvedValue({
      _id: 'course1',
      title: 'Course',
      contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
    });

    const req = {
      params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
      body: { score: 0, maxScore: 100, status: 'completed', timeSpent: 0, progress: 100 },
      user: { role: 'admin', _id: 'admin1' },
    };
    const res = mockRes();

    await courseProgressController.submitBookCompletion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        canComplete: false,
      })
    );
  });

  it('rejects SCORM book completion attempt when score is null and timeSpent is 0', async () => {
    stubModelsForFlow();
    models.Book.findById.mockResolvedValue({
      _id: 'book1',
      title: 'SCORM Book',
      packageType: 'scorm',
      requiredReadingCount: 5,
      totalStarsAwarded: 50,
    });

    models.Course.findById.mockResolvedValue({
      _id: 'course1',
      title: 'Course',
      contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
    });

    const req = {
      params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
      body: { score: null, maxScore: null, status: 'completed', timeSpent: 0, progress: 100 },
      user: { role: 'admin', _id: 'admin1' },
    };
    const res = mockRes();

    await courseProgressController.submitBookCompletion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        canComplete: false,
        message: expect.stringContaining('Completion requirements not met'),
      })
    );
  });

  it('dryRun=1 returns score diagnostics without writing progress', async () => {
    stubModelsForFlow();
    models.Book.findById.mockResolvedValue({
      _id: 'book1',
      title: 'HTML5 Book',
      packageType: 'html5',
      requiredReadingCount: 5,
      totalStarsAwarded: 50,
    });

    models.Course.findById.mockResolvedValue({
      _id: 'course1',
      title: 'Course',
      contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
    });

    const req = {
      params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
      query: { dryRun: '1' },
      body: { score: 75, maxScore: 100, status: 'passed', timeSpent: 0, progress: 100 },
      user: { role: 'admin', _id: 'admin1' },
    };
    const res = mockRes();

    await courseProgressController.submitBookCompletion(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        canComplete: true,
        data: expect.objectContaining({
          score: 75,
          maxScore: 100,
          scoreRatio: 0.75,
          passedByScore: true,
        }),
      })
    );

    // Ensure we didn't write a BookReading in dry-run.
    expect(models.BookReading.create).not.toHaveBeenCalled();
  });
});
