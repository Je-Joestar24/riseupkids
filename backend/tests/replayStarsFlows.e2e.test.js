/**
 * Replays end to end through the real controller and service (database mocked like the other star flow tests):
 *  - course videos: after the last required watch each further watch pays 2 stars, at most 5 times;
 *  - built-in (CMS) books: the same after the last required read, and a book closed before its last page earns nothing;
 *  - other books (SCORM / HTML5) and the first reads / watches are not changed.
 */
jest.mock('../services/badgeCheck.service', () => ({
  updateBadges: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../models', () => ({
  ChildProfile: { findById: jest.fn(), findOne: jest.fn() },
  Media: { findOne: jest.fn() },
  VideoWatch: { findOne: jest.fn(), create: jest.fn() },
  StarEarning: { findOne: jest.fn(), create: jest.fn(), countDocuments: jest.fn() },
  ChildStats: { getOrCreate: jest.fn(), findById: jest.fn() },
  Book: { findById: jest.fn() },
  Course: { findById: jest.fn() },
  BookReading: { getCompletedReadingCount: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  CourseProgress: { findOne: jest.fn(), create: jest.fn() },
}));

const models = require('../models');
const videoWatchService = require('../services/videoWatch.service');
const courseProgressController = require('../controllers/courseProgress.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mutableStats(initial = 0) {
  const stats = { totalStars: initial, save: jest.fn().mockResolvedValue(true) };
  stats.addStars = jest.fn(async (amount) => {
    stats.totalStars += amount;
    return stats;
  });
  return stats;
}

function watchDoc(overrides = {}) {
  const doc = {
    child: 'child1',
    video: 'video1',
    watchCount: 0,
    starsAwarded: false,
    starsAwardedAt: null,
    watchHistory: [],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue(true),
    toObject: () => ({ watchCount: doc.watchCount, starsAwarded: doc.starsAwarded }),
    ...overrides,
  };
  return doc;
}

const longAgo = () => new Date(Date.now() - 60000);

let stats;
beforeEach(async () => {
  await new Promise((resolve) => setImmediate(resolve));
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  stats = mutableStats(100);
  models.ChildStats.getOrCreate.mockResolvedValue(stats);
  models.ChildProfile.findById.mockResolvedValue({ _id: 'child1' });
  models.Media.findOne.mockResolvedValue({ _id: 'video1', title: 'Song', type: 'video', starsAwarded: 50, requiredWatchCount: 5 });
  models.StarEarning.findOne.mockResolvedValue(null);
  models.StarEarning.countDocuments.mockResolvedValue(0);
  models.StarEarning.create.mockImplementation(async (payload) => payload);
});

afterEach(async () => {
  await new Promise((resolve) => setImmediate(resolve));
  jest.restoreAllMocks();
});

describe('course videos', () => {
  const afterRequiredWatches = (extra = {}) =>
    watchDoc({
      watchCount: 5,
      starsAwarded: true,
      watchHistory: [{ watchedAt: longAgo(), completionPercentage: 100 }],
      ...extra,
    });

  it('the sixth watch (the first replay) pays 2 stars and says it is replay 1 of 5', async () => {
    models.VideoWatch.findOne.mockResolvedValue(afterRequiredWatches());
    const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);
    expect(result).toMatchObject({
      starsToAward: 2,
      starsEarnedThisSession: 2,
      starsAwarded: true,
      isReplay: true,
      replayNumber: 1,
      replaysLeft: 4,
      maxReplays: 5,
      isDuplicateWatch: false,
    });
    expect(stats.addStars).toHaveBeenCalledWith(2);
    expect(stats.totalStars).toBe(102);
    expect(models.StarEarning.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stars: 2,
        source: expect.objectContaining({
          type: 'video',
          contentType: 'Media',
          metadata: expect.objectContaining({ replay: true, replayNumber: 1, maxReplays: 5, title: 'Song' }),
        }),
      })
    );
  });

  it('the fifth replay is the last that pays (replay 5 of 5, none left)', async () => {
    models.StarEarning.countDocuments.mockResolvedValue(4);
    models.VideoWatch.findOne.mockResolvedValue(afterRequiredWatches({ watchCount: 9 }));
    const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);
    expect(result).toMatchObject({ starsToAward: 2, replayNumber: 5, replaysLeft: 0 });
  });

  it('after five paid replays a further watch pays nothing', async () => {
    models.StarEarning.countDocuments.mockResolvedValue(5);
    models.VideoWatch.findOne.mockResolvedValue(afterRequiredWatches({ watchCount: 10 }));
    const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);
    expect(result).toMatchObject({ starsToAward: 0, starsEarnedThisSession: 0, starsAwarded: false, isReplay: true, replaysLeft: 0 });
    expect(stats.addStars).not.toHaveBeenCalled();
    expect(models.StarEarning.create).not.toHaveBeenCalled();
  });

  it('a second submission within 5 seconds is a duplicate and pays nothing', async () => {
    models.VideoWatch.findOne.mockResolvedValue(
      afterRequiredWatches({ watchHistory: [{ watchedAt: new Date(), completionPercentage: 100 }] })
    );
    const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);
    expect(result).toMatchObject({ isDuplicateWatch: true, starsToAward: 0, isReplay: false });
    expect(models.StarEarning.create).not.toHaveBeenCalled();
  });

  it('the required watches are not replays: the fifth watch pays its share and is not a replay', async () => {
    models.VideoWatch.findOne.mockResolvedValue(
      watchDoc({ watchCount: 4, watchHistory: [{ watchedAt: longAgo(), completionPercentage: 100 }] })
    );
    const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);
    expect(result).toMatchObject({ starsToAward: 10, isReplay: false, replayNumber: 0, allStarsAwarded: true });
    expect(models.StarEarning.countDocuments).not.toHaveBeenCalled();
  });

  it('the first watch is unchanged too', async () => {
    models.VideoWatch.findOne.mockResolvedValue(watchDoc());
    const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);
    expect(result).toMatchObject({ starsToAward: 10, isReplay: false });
  });
});

describe('built-in (CMS) books', () => {
  const book = (overrides = {}) => ({
    _id: 'book1',
    title: 'Story Book',
    packageType: 'builtin',
    requiredReadingCount: 5,
    totalStarsAwarded: 50,
    ...overrides,
  });

  /** A book whose required reads are all done (`completionFlag`: the "complete" flag the last read saves). */
  function stubFinishedBook({ packageType = 'builtin', completionFlag = true, readingCount = 5 } = {}) {
    models.ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
    models.Book.findById.mockResolvedValue(book({ packageType }));
    models.Course.findById.mockResolvedValue({
      _id: 'course1',
      title: 'Course',
      contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
    });
    models.CourseProgress.findOne.mockResolvedValue({
      contentProgress: [
        { contentId: 'book1', contentType: 'book', step: 1, status: 'completed', scormProgress: { completion: { starsAwarded: completionFlag } } },
      ],
      save: jest.fn().mockResolvedValue(true),
    });
    models.BookReading.findOne.mockResolvedValue(null);
    models.BookReading.getCompletedReadingCount.mockResolvedValue(readingCount);
    models.BookReading.create.mockResolvedValue({ _id: 'br', starsEarned: 0, save: jest.fn().mockResolvedValue(true) });
  }

  const submit = async (body = {}) => {
    const res = mockRes();
    await courseProgressController.submitBookCompletion(
      {
        params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
        body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100, ...body },
        user: { role: 'admin', _id: 'admin1' },
      },
      res
    );
    return res;
  };

  describe('after the last required read (a replay)', () => {
    it('pays 2 stars and says it is replay 1 of 5', async () => {
      stubFinishedBook();
      const res = await submit({ reachedEnd: true });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Replay reward earned',
          data: expect.objectContaining({
            starsToAward: 2,
            starsAwarded: true,
            totalStars: 102,
            requirementMet: true,
            alreadyCompleted: true,
            isReplay: true,
            replayNumber: 1,
            replaysLeft: 4,
            maxReplays: 5,
          }),
        })
      );
      expect(stats.addStars).toHaveBeenCalledWith(2);
      expect(models.StarEarning.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stars: 2,
          source: expect.objectContaining({
            type: 'book',
            contentType: 'Book',
            metadata: expect.objectContaining({ replay: true, replayNumber: 1 }),
          }),
        })
      );
    });

    it('also pays when the app does not say anything about reachedEnd (older app versions)', async () => {
      stubFinishedBook();
      const res = await submit();
      expect(res.json.mock.calls[0][0].data).toMatchObject({ starsToAward: 2, isReplay: true });
    });

    it('pays nothing after five paid replays, and says there is none left', async () => {
      stubFinishedBook();
      models.StarEarning.countDocuments.mockResolvedValue(5);
      const res = await submit({ reachedEnd: true });
      expect(res.json.mock.calls[0][0]).toMatchObject({
        message: 'Book requirement already met',
        data: { starsToAward: 0, isReplay: true, replaysLeft: 0 },
      });
      expect(stats.addStars).not.toHaveBeenCalled();
      expect(models.StarEarning.create).not.toHaveBeenCalled();
    });

    it('a second submission within 5 seconds pays nothing', async () => {
      stubFinishedBook();
      models.StarEarning.findOne.mockResolvedValue({ _id: 'recent' });
      const res = await submit({ reachedEnd: true });
      expect(res.json.mock.calls[0][0].data.starsToAward).toBe(0);
      expect(models.StarEarning.create).not.toHaveBeenCalled();
    });

    it('five replays in a row (spaced out) pay 2 each: 10 stars, and the sixth pays 0', async () => {
      const paid = [];
      for (let replay = 0; replay <= 5; replay += 1) {
        jest.clearAllMocks();
        models.StarEarning.findOne.mockResolvedValue(null);
        models.StarEarning.create.mockImplementation(async (payload) => payload);
        models.ChildStats.getOrCreate.mockResolvedValue(stats);
        models.StarEarning.countDocuments.mockResolvedValue(replay);
        stubFinishedBook();
        const res = await submit({ reachedEnd: true });
        paid.push(res.json.mock.calls[0][0].data.starsToAward);
      }
      expect(paid).toEqual([2, 2, 2, 2, 2, 0]);
      expect(stats.totalStars).toBe(110);
    });

    it('a book with more reads than required but no "complete" flag yet also pays the replay', async () => {
      stubFinishedBook({ completionFlag: false, readingCount: 6 });
      models.BookReading.getCompletedReadingCount.mockResolvedValueOnce(5).mockResolvedValue(6);
      // The controller reads the child's total before the replay is added, so that copy is out of date by 2:
      // the answer must carry the total the replay itself returns.
      models.ChildStats.getOrCreate.mockResolvedValueOnce({ totalStars: 100, addStars: jest.fn() }).mockResolvedValue(stats);
      const res = await submit({ reachedEnd: true });
      expect(res.json.mock.calls[0][0].data).toMatchObject({
        starsToAward: 2,
        starsAwarded: true,
        totalStars: 102,
        isReplay: true,
        replayNumber: 1,
        requirementMet: true,
      });
      expect(stats.addStars).toHaveBeenCalledWith(2);
    });
  });

  describe('a book that is not finished', () => {
    it('is refused when the app says it was closed before the last page: no stars, nothing recorded', async () => {
      stubFinishedBook();
      const res = await submit({ reachedEnd: false });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, canComplete: false, code: 'BOOK_NOT_FINISHED' })
      );
      expect(models.BookReading.create).not.toHaveBeenCalled();
      expect(models.StarEarning.create).not.toHaveBeenCalled();
      expect(stats.addStars).not.toHaveBeenCalled();
    });

    it('is refused even on the very first read (nothing is earned for a book closed early)', async () => {
      stubFinishedBook({ completionFlag: false, readingCount: 0 });
      const res = await submit({ reachedEnd: false });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(models.StarEarning.create).not.toHaveBeenCalled();
    });

    it('only an explicit false is refused: true, a missing value and null are not', async () => {
      for (const reachedEnd of [true, undefined, null]) {
        jest.clearAllMocks();
        models.StarEarning.findOne.mockResolvedValue(null);
        models.StarEarning.countDocuments.mockResolvedValue(0);
        models.StarEarning.create.mockImplementation(async (payload) => payload);
        models.ChildStats.getOrCreate.mockResolvedValue(stats);
        stubFinishedBook();
        const res = await submit({ reachedEnd });
        expect(res.status).not.toHaveBeenCalledWith(400);
      }
    });
  });

  describe('the required reads are unchanged', () => {
    function stubReading(count, packageType = 'builtin', totalStarsAwarded = 50) {
      models.ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
      models.Book.findById.mockResolvedValue(book({ packageType, totalStarsAwarded }));
      models.Course.findById.mockResolvedValue({ _id: 'course1', title: 'C', contents: [{ contentId: 'book1', contentType: 'book', step: 1 }] });
      models.CourseProgress.findOne.mockResolvedValue({
        contentProgress: [{ contentId: 'book1', contentType: 'book', step: 1, scormProgress: { completion: {} } }],
        save: jest.fn().mockResolvedValue(true),
      });
      models.BookReading.findOne.mockResolvedValue(null);
      models.BookReading.getCompletedReadingCount.mockResolvedValueOnce(count - 1).mockResolvedValue(count);
      models.BookReading.create.mockResolvedValue({ _id: 'br', starsEarned: 0, save: jest.fn().mockResolvedValue(true) });
    }

    it('the first read pays its share (10 of 50) and is not a replay', async () => {
      stubReading(1);
      const res = await submit({ reachedEnd: true });
      const { data } = res.json.mock.calls[0][0];
      expect(data).toMatchObject({ starsToAward: 10, readingCount: 1, requirementMet: false });
      expect(data.isReplay).toBeUndefined();
      expect(models.StarEarning.countDocuments).not.toHaveBeenCalled();
    });

    it('the last required read pays the remainder (53 / 5 -> 13) and is not a replay', async () => {
      stubReading(5, 'builtin', 53);
      const res = await submit({ reachedEnd: true });
      const { data } = res.json.mock.calls[0][0];
      expect(data).toMatchObject({ starsToAward: 13, readingCount: 5, requirementMet: true });
      expect(data.isReplay).toBeUndefined();
    });
  });

  describe('other books are not changed', () => {
    it('an HTML5 book that is already complete still pays nothing and has no replay fields', async () => {
      stubFinishedBook({ packageType: 'html5' });
      const res = await submit();
      const { data } = res.json.mock.calls[0][0];
      expect(data).toMatchObject({ starsToAward: 0, alreadyCompleted: true });
      expect(data.isReplay).toBeUndefined();
      expect(stats.addStars).not.toHaveBeenCalled();
      expect(models.StarEarning.create).not.toHaveBeenCalled();
    });

    it('a SCORM book ignores reachedEnd (it is only for built-in books)', async () => {
      stubFinishedBook({ packageType: 'scorm' });
      models.Book.findById.mockResolvedValue(book({ packageType: 'scorm' }));
      const res = await submit({ reachedEnd: false, score: 1, maxScore: 1, timeSpent: 120 });
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });
});
