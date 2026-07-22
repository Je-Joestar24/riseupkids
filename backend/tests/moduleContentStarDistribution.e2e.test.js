jest.mock('./badgeCheck.service', () => ({
  updateBadges: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock('../services/badgeCheck.service', () => ({
  updateBadges: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../models', () => ({
  ChildProfile: { findById: jest.fn(), findOne: jest.fn() },
  Media: { findOne: jest.fn() },
  VideoWatch: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  StarEarning: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  ChildStats: {
    getOrCreate: jest.fn(),
    findById: jest.fn(),
  },
  Book: { findById: jest.fn() },
  Course: { findById: jest.fn() },
  BookReading: {
    getCompletedReadingCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  CourseProgress: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const models = require('../models');
const videoWatchService = require('../services/videoWatch.service');
const courseProgressController = require('../controllers/courseProgress.controller');
const { getDistributionPlan } = require('../utils/contentStarDistribution.util');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function createMutableVideoWatch(overrides = {}) {
  const doc = {
    _id: 'vw1',
    child: 'child1',
    video: 'video1',
    watchCount: 0,
    starsAwarded: false,
    starsAwardedAt: null,
    watchHistory: [],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue(true),
    toObject: jest.fn(function toObject() {
      return {
        _id: doc._id,
        child: doc.child,
        video: doc.video,
        watchCount: doc.watchCount,
        starsAwarded: doc.starsAwarded,
        starsAwardedAt: doc.starsAwardedAt,
        watchHistory: doc.watchHistory,
      };
    }),
    ...overrides,
  };
  return doc;
}

function createMutableChildStats(initialStars = 0) {
  let totalStars = initialStars;
  return {
    _id: 'stats1',
    totalStars,
    addStars: jest.fn(async (amount) => {
      totalStars += amount;
    }),
    save: jest.fn().mockResolvedValue(true),
    get totalStarsValue() {
      return totalStars;
    },
  };
}

describe('module content star distribution — end-to-end flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    models.ChildProfile.findById.mockResolvedValue({ _id: 'child1' });
    models.Media.findOne.mockResolvedValue({
      _id: 'video1',
      title: 'Module Video',
      type: 'video',
      starsAwarded: 50,
      requiredWatchCount: 5,
    });
    models.StarEarning.findOne.mockResolvedValue(null);
    models.StarEarning.create.mockImplementation(async (payload) => ({
      _id: `earning-${payload.source.metadata.watchNumber || payload.source.metadata.readingNumber}`,
      ...payload,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('videoWatch.service — per-watch stars', () => {
    it('awards divided stars on each watch and remainder on the final watch (53 total / 5 watches)', async () => {
      const expectedPlan = getDistributionPlan(53, 5);
      models.Media.findOne.mockResolvedValue({
        _id: 'video1',
        title: 'Module Video',
        type: 'video',
        starsAwarded: 53,
        requiredWatchCount: 5,
      });
      const videoWatch = createMutableVideoWatch();
      models.VideoWatch.findOne.mockResolvedValue(videoWatch);

      const childStats = createMutableChildStats(100);
      models.ChildStats.getOrCreate.mockResolvedValue(childStats);
      models.ChildStats.findById.mockImplementation(async () => ({
        _id: 'stats1',
        totalStars: childStats.totalStarsValue,
        save: jest.fn().mockResolvedValue(true),
      }));

      let cumulativeStars = 100;
      const sessionAwards = [];

      for (let watch = 1; watch <= 5; watch += 1) {
        if (watch > 1) {
          videoWatch.watchHistory.push({
            watchedAt: new Date(Date.now() - 10000),
            completionPercentage: 100,
          });
        }

        const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);

        expect(result.starsToAward).toBe(expectedPlan[watch - 1]);
        expect(result.starsEarnedThisSession).toBe(expectedPlan[watch - 1]);
        expect(result.starsAwarded).toBe(expectedPlan[watch - 1] > 0);
        sessionAwards.push(result.starsToAward);
        cumulativeStars += result.starsToAward;

        expect(childStats.addStars).toHaveBeenCalledWith(expectedPlan[watch - 1]);
        expect(videoWatch.watchCount).toBe(watch);

        if (watch < 5) {
          expect(result.allStarsAwarded).toBe(false);
          expect(videoWatch.starsAwarded).toBe(false);
        } else {
          expect(result.allStarsAwarded).toBe(true);
          expect(videoWatch.starsAwarded).toBe(true);
        }
      }

      expect(sessionAwards).toEqual([10, 10, 10, 10, 13]);
      expect(sessionAwards.reduce((sum, value) => sum + value, 0)).toBe(53);
      expect(cumulativeStars).toBe(153);
      expect(models.StarEarning.create).toHaveBeenCalledTimes(5);
    });

    it('does not award stars on duplicate watch within 5 seconds', async () => {
      const videoWatch = createMutableVideoWatch({
        watchCount: 2,
        watchHistory: [{ watchedAt: new Date(), completionPercentage: 100 }],
      });
      models.VideoWatch.findOne.mockResolvedValue(videoWatch);

      const childStats = createMutableChildStats(20);
      models.ChildStats.getOrCreate.mockResolvedValue(childStats);
      models.ChildStats.findById.mockResolvedValue({ _id: 'stats1', totalStars: 20 });

      const result = await videoWatchService.markVideoWatched('child1', 'video1', 100);

      expect(result.isDuplicateWatch).toBe(true);
      expect(result.starsToAward).toBe(0);
      expect(videoWatch.watchCount).toBe(2);
      expect(models.StarEarning.create).not.toHaveBeenCalled();
    });
  });

  describe('courseProgress.controller — per-reading stars', () => {
    function stubBookFlow({ readingCountAfterCreate }) {
      models.ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
      models.Book.findById.mockResolvedValue({
        _id: 'book1',
        title: 'Story Book',
        packageType: 'html5',
        requiredReadingCount: 5,
        totalStarsAwarded: 50,
      });
      models.Course.findById.mockResolvedValue({
        _id: 'course1',
        title: 'Course',
        contents: [{ contentId: 'book1', contentType: 'book', step: 1 }],
      });
      models.CourseProgress.findOne.mockResolvedValue({
        _id: 'cp1',
        contentProgress: [{
          contentId: 'book1',
          contentType: 'book',
          step: 1,
          scormProgress: { completion: {} },
        }],
        save: jest.fn().mockResolvedValue(true),
      });
      models.BookReading.findOne.mockResolvedValue(null);
      models.BookReading.getCompletedReadingCount
        .mockResolvedValueOnce(readingCountAfterCreate - 1)
        .mockResolvedValue(readingCountAfterCreate);

      const readingRecord = {
        _id: `br-${readingCountAfterCreate}`,
        starsEarned: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      models.BookReading.create.mockResolvedValue(readingRecord);

      const childStats = createMutableChildStats(0);
      models.ChildStats.getOrCreate.mockResolvedValue(childStats);
      models.ChildStats.findById.mockImplementation(async () => ({
        _id: 'stats1',
        totalStars: childStats.totalStarsValue,
      }));

      return { readingRecord, childStats };
    }

    it('awards 10 stars on the first reading of a 50-star / 5-reading book', async () => {
      stubBookFlow({ readingCountAfterCreate: 1 });

      const req = {
        params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
        body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
        user: { role: 'admin', _id: 'admin1' },
      };
      const res = mockRes();

      await courseProgressController.submitBookCompletion(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            readingCount: 1,
            requiredReadingCount: 5,
            starsAwarded: true,
            starsToAward: 10,
            starsForNextReading: 10,
            requirementMet: false,
          }),
        })
      );
      expect(models.StarEarning.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stars: 10,
          source: expect.objectContaining({
            metadata: expect.objectContaining({ readingNumber: 1 }),
          }),
        })
      );
    });

    it('awards remainder stars on the fifth reading (53 total / 5 readings)', async () => {
      stubBookFlow({ readingCountAfterCreate: 5 });
      models.Book.findById.mockResolvedValue({
        _id: 'book1',
        title: 'Story Book',
        packageType: 'html5',
        requiredReadingCount: 5,
        totalStarsAwarded: 53,
      });

      const req = {
        params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
        body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
        user: { role: 'admin', _id: 'admin1' },
      };
      const res = mockRes();

      await courseProgressController.submitBookCompletion(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            readingCount: 5,
            starsToAward: 13,
            requirementMet: true,
            starsForNextReading: 0,
          }),
        })
      );
      expect(models.StarEarning.create).toHaveBeenCalledWith(
        expect.objectContaining({ stars: 13 })
      );
    });

    it('simulates full 5-reading book journey totalling exactly 50 stars', async () => {
      const expectedPlan = getDistributionPlan(50, 5);
      let totalAwarded = 0;

      for (let reading = 1; reading <= 5; reading += 1) {
        jest.clearAllMocks();
        models.StarEarning.findOne.mockResolvedValue(null);
        models.StarEarning.create.mockImplementation(async (payload) => payload);

        stubBookFlow({ readingCountAfterCreate: reading });

        const res = mockRes();
        await courseProgressController.submitBookCompletion(
          {
            params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
            body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
            user: { role: 'admin', _id: 'admin1' },
          },
          res
        );

        const payload = res.json.mock.calls[0][0];
        expect(payload.data.starsToAward).toBe(expectedPlan[reading - 1]);
        totalAwarded += payload.data.starsToAward;
      }

      expect(totalAwarded).toBe(50);
    });
  });
});
