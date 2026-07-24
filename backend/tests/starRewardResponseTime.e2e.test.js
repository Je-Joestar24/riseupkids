/**
 * Ensures star-reward responses are not blocked by badge recomputation.
 * @jest-environment node
 */

jest.mock('../services/badgeCheck.service', () => ({
  updateBadges: jest.fn(),
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
const badgeCheck = require('../services/badgeCheck.service');
const videoWatchService = require('../services/videoWatch.service');
const courseProgressController = require('../controllers/courseProgress.controller');

function flushImmediate() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function drainScheduledBadges() {
  await flushImmediate();
  await flushImmediate();
}

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function createMutableChildStats(initialStars = 0) {
  const stats = {
    _id: 'stats1',
    totalStars: initialStars,
    save: jest.fn().mockResolvedValue(true),
  };
  stats.addStars = jest.fn(async (amount) => {
    stats.totalStars += amount;
    return stats;
  });
  return stats;
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

describe('star reward response time — badges off hot path', () => {
  beforeEach(async () => {
    await drainScheduledBadges();
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    models.ChildProfile.findById.mockResolvedValue({ _id: 'child1' });
    models.StarEarning.findOne.mockResolvedValue(null);
    models.StarEarning.create.mockImplementation(async (payload) => payload);
    badgeCheck.updateBadges.mockResolvedValue({ success: true, newBadges: [] });
  });

  afterEach(async () => {
    await drainScheduledBadges();
    jest.restoreAllMocks();
  });

  describe('submitBookCompletion', () => {
    function stubBookAward() {
      models.ChildProfile.findOne.mockResolvedValue({ _id: 'child1', parent: 'parent1' });
      models.Book.findById.mockResolvedValue({
        _id: 'book1',
        title: 'Story Book',
        packageType: 'builtin',
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
        .mockResolvedValueOnce(0)
        .mockResolvedValue(1);
      models.BookReading.create.mockResolvedValue({
        _id: 'br-1',
        starsEarned: 0,
        save: jest.fn().mockResolvedValue(true),
      });

      const childStats = createMutableChildStats(40);
      models.ChildStats.getOrCreate.mockResolvedValue(childStats);
      return childStats;
    }

    it('returns starsToAward before a slow badge check finishes', async () => {
      stubBookAward();

      let resolveBadges;
      const slowBadges = new Promise((resolve) => {
        resolveBadges = resolve;
      });
      badgeCheck.updateBadges.mockReturnValue(slowBadges);

      const callOrder = [];
      const res = mockRes();
      res.json.mockImplementation((payload) => {
        callOrder.push('response');
        return res;
      });
      badgeCheck.updateBadges.mockImplementation(() => {
        callOrder.push('badges');
        return slowBadges;
      });

      const req = {
        params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
        body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
        user: { role: 'admin', _id: 'admin1' },
      };

      await courseProgressController.submitBookCompletion(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            starsToAward: 10,
            totalStars: 50,
            starsAwarded: true,
          }),
        })
      );
      // Response must not wait for badges (still pending)
      expect(callOrder).toEqual(['response']);
      expect(badgeCheck.updateBadges).not.toHaveBeenCalled();

      await flushImmediate();
      expect(badgeCheck.updateBadges).toHaveBeenCalledWith('child1', { silent: false });
      expect(callOrder).toEqual(['response', 'badges']);

      resolveBadges({ success: true, newBadges: [] });
      await slowBadges;
    });

    it('uses in-memory totalStars without ChildStats.findById after award', async () => {
      const childStats = stubBookAward();
      badgeCheck.updateBadges.mockResolvedValue({ success: true, newBadges: [] });

      const res = mockRes();
      await courseProgressController.submitBookCompletion(
        {
          params: { courseId: 'course1', childId: 'child1', bookId: 'book1' },
          body: { score: null, maxScore: null, status: 'passed', timeSpent: 0, progress: 100 },
          user: { role: 'admin', _id: 'admin1' },
        },
        res
      );

      expect(childStats.addStars).toHaveBeenCalledWith(10);
      expect(models.ChildStats.findById).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].data.totalStars).toBe(50);
    });
  });

  describe('markVideoWatched', () => {
    it('returns watch stars before badge check runs', async () => {
      models.Media.findOne.mockResolvedValue({
        _id: 'video1',
        title: 'Module Video',
        type: 'video',
        starsAwarded: 50,
        requiredWatchCount: 5,
      });
      const videoWatch = createMutableVideoWatch();
      models.VideoWatch.findOne.mockResolvedValue(videoWatch);
      const childStats = createMutableChildStats(100);
      models.ChildStats.getOrCreate.mockResolvedValue(childStats);

      let resolveBadges;
      const slowBadges = new Promise((resolve) => {
        resolveBadges = resolve;
      });
      const callOrder = [];
      badgeCheck.updateBadges.mockImplementation(() => {
        callOrder.push('badges');
        return slowBadges;
      });

      const resultPromise = videoWatchService.markVideoWatched('child1', 'video1', 100);
      const result = await resultPromise;
      callOrder.unshift('response');

      expect(result.starsToAward).toBe(10);
      expect(result.starsEarnedThisSession).toBe(10);
      expect(badgeCheck.updateBadges).not.toHaveBeenCalled();
      expect(callOrder).toEqual(['response']);

      await flushImmediate();
      expect(badgeCheck.updateBadges).toHaveBeenCalledWith('child1', { silent: false });
      expect(callOrder).toEqual(['response', 'badges']);
      expect(models.ChildStats.findById).not.toHaveBeenCalled();

      resolveBadges({ success: true, newBadges: [] });
      await slowBadges;
    });
  });
});
