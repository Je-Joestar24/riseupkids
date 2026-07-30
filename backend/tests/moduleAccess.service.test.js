/**
 * Admin Module Access service tests (mocked models).
 * @see docs/ADMIN_MODULE_ACCESS_CONTROL_PLAN.md
 */

jest.mock('../models', () => ({
  ChildProfile: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
  Course: {
    find: jest.fn(),
    findById: jest.fn(),
  },
  CourseProgress: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    distinct: jest.fn(),
  },
  User: {
    find: jest.fn(),
  },
}));

jest.mock('../services/courseProgress.services', () => ({
  checkCourseAccess: jest.fn(),
  MODULE_ACCESS_AUTO_KEEP_OPEN_PCT: 75,
  shouldKeepModuleOpenByProgress: jest.fn((progress) => {
    if (!progress || progress.status === 'completed') return false;
    if (progress.accessOverride === 'force_lock') return false;
    return (progress.progressPercentage || 0) >= 75;
  }),
}));

const { ChildProfile, Course, CourseProgress } = require('../models');
const { checkCourseAccess } = require('../services/courseProgress.services');
const {
  unlockModuleForChild,
  lockModuleForChild,
  clearModuleOverride,
  getChildModuleAccessDetail,
} = require('../services/moduleAccess.services');

const childId = '507f1f77bcf86cd799439011';
const courseId = '507f1f77bcf86cd799439012';
const adminId = '507f1f77bcf86cd799439013';

function mockProgressDoc(overrides = {}) {
  return {
    child: childId,
    course: courseId,
    status: 'locked',
    progressPercentage: 0,
    accessOverride: 'none',
    contentProgress: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function chainFindByIdLean(result) {
  return {
    select: () => ({
      lean: async () => result,
      populate: () => ({
        lean: async () => result,
      }),
    }),
  };
}

function mockDetailAfterMutation(progressSnapshot, courseOverrides = {}) {
  ChildProfile.findById.mockReturnValue(
    chainFindByIdLean({
      _id: childId,
      displayName: 'Ada',
      avatar: null,
      age: 7,
      parent: { _id: 'p1', name: 'Parent', email: 'p@test.com' },
    })
  );
  Course.find.mockReturnValue({
    select: () => ({
      lean: async () => [
        {
          _id: courseId,
          title: 'Week 3',
          stepOrder: 3,
          contents: courseOverrides.contents || [
            { contentId: 'c1', contentType: 'video', step: 1 },
            { contentId: 'c2', contentType: 'book', step: 1 },
          ],
          createdAt: new Date(),
          ...courseOverrides,
        },
      ],
    }),
  });
  CourseProgress.find.mockReturnValue({
    lean: async () => [progressSnapshot],
  });
  CourseProgress.findById.mockResolvedValue(null);
}

describe('moduleAccess.services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('unlockModuleForChild', () => {
    it('sets force_unlock and opens a locked module', async () => {
      const progress = mockProgressDoc({ status: 'locked' });
      ChildProfile.findById.mockReturnValueOnce(chainFindByIdLean({ _id: childId }));
      Course.findById.mockReturnValueOnce(
        chainFindByIdLean({
          _id: courseId,
          title: 'Week 3',
          isPublished: true,
          isArchived: false,
        })
      );
      CourseProgress.findOne.mockResolvedValue(progress);
      checkCourseAccess.mockResolvedValue({ accessible: true, reason: 'admin_override' });
      mockDetailAfterMutation({
        child: childId,
        course: courseId,
        status: 'in_progress',
        progressPercentage: 0,
        accessOverride: 'force_unlock',
        contentProgress: [],
      });

      const detail = await unlockModuleForChild(childId, courseId, adminId, 'support');

      expect(progress.accessOverride).toBe('force_unlock');
      expect(progress.status).toBe('in_progress');
      expect(progress.save).toHaveBeenCalled();
      expect(detail.modules[0].accessOverride).toBe('force_unlock');
      expect(detail.modules[0].canUnlock).toBe(false);
    });

    it('rejects completed modules', async () => {
      ChildProfile.findById.mockReturnValue(chainFindByIdLean({ _id: childId }));
      Course.findById.mockReturnValue(
        chainFindByIdLean({
          _id: courseId,
          isPublished: true,
          isArchived: false,
        })
      );
      CourseProgress.findOne.mockResolvedValue(
        mockProgressDoc({ status: 'completed', progressPercentage: 100 })
      );

      await expect(unlockModuleForChild(childId, courseId, adminId)).rejects.toThrow(
        /Completed modules/
      );
    });
  });

  describe('lockModuleForChild', () => {
    it('sets force_lock and preserves progress percentage', async () => {
      const contents = [
        { contentId: 'c1', contentType: 'video', step: 1 },
        { contentId: 'c2', contentType: 'book', step: 1 },
        { contentId: 'c3', contentType: 'activity', step: 1 },
        { contentId: 'c4', contentType: 'video', step: 1 },
        { contentId: 'c5', contentType: 'book', step: 1 },
      ];
      const contentProgress = [
        { contentId: 'c1', contentType: 'video', step: 1, status: 'completed' },
        { contentId: 'c2', contentType: 'book', step: 1, status: 'completed' },
      ];
      const progress = mockProgressDoc({
        status: 'in_progress',
        progressPercentage: 40,
        contentProgress,
      });
      ChildProfile.findById.mockReturnValueOnce(chainFindByIdLean({ _id: childId }));
      Course.findById.mockReturnValueOnce(
        chainFindByIdLean({
          _id: courseId,
          isPublished: true,
          isArchived: false,
        })
      );
      CourseProgress.findOne.mockResolvedValue(progress);
      checkCourseAccess.mockResolvedValue({ accessible: false, reason: 'admin_locked' });
      mockDetailAfterMutation(
        {
          child: childId,
          course: courseId,
          status: 'locked',
          progressPercentage: 40,
          accessOverride: 'force_lock',
          contentProgress,
        },
        { contents }
      );

      const detail = await lockModuleForChild(childId, courseId, adminId);

      expect(progress.accessOverride).toBe('force_lock');
      expect(progress.status).toBe('locked');
      expect(progress.progressPercentage).toBe(40);
      expect(detail.modules[0].canUnlock).toBe(true);
      expect(detail.modules[0].progressPercentage).toBe(40);
      expect(detail.modules[0].completedContent).toBe(2);
      expect(detail.modules[0].totalContent).toBe(5);
    });
  });

  describe('clearModuleOverride', () => {
    it('clears override and locks when prerequisites unmet and progress is low', async () => {
      const progress = mockProgressDoc({
        status: 'in_progress',
        accessOverride: 'force_unlock',
        progressPercentage: 10,
      });
      CourseProgress.findOne.mockResolvedValue(progress);
      checkCourseAccess.mockResolvedValue({
        accessible: false,
        reason: 'Prerequisites not completed',
      });
      mockDetailAfterMutation({
        child: childId,
        course: courseId,
        status: 'locked',
        progressPercentage: 10,
        accessOverride: 'none',
        contentProgress: [],
      });

      await clearModuleOverride(childId, courseId, adminId);
      expect(progress.accessOverride).toBe('none');
      expect(progress.status).toBe('locked');
      expect(progress.save).toHaveBeenCalled();
    });

    it('keeps module in_progress on Reset automatic when progress is already ≥75%', async () => {
      const progress = mockProgressDoc({
        status: 'in_progress',
        accessOverride: 'force_unlock',
        progressPercentage: 75,
        startedAt: new Date(),
      });
      CourseProgress.findOne.mockResolvedValue(progress);
      checkCourseAccess.mockResolvedValue({
        accessible: true,
        reason: 'substantial_progress',
      });
      mockDetailAfterMutation({
        child: childId,
        course: courseId,
        status: 'in_progress',
        progressPercentage: 75,
        accessOverride: 'none',
        contentProgress: [],
      });

      await clearModuleOverride(childId, courseId, adminId);
      expect(progress.accessOverride).toBe('none');
      expect(progress.status).toBe('in_progress');
      expect(progress.save).toHaveBeenCalled();
    });
  });

  describe('getChildModuleAccessDetail button flags', () => {
    it('marks completed modules as not lockable/unlockable', async () => {
      mockDetailAfterMutation(
        {
          _id: 'prog1',
          child: childId,
          course: courseId,
          status: 'completed',
          progressPercentage: 100,
          accessOverride: 'none',
          contentProgress: [
            { contentId: 'c1', contentType: 'video', step: 1, status: 'completed' },
          ],
        },
        {
          title: 'Week 1',
          stepOrder: 1,
          contents: [{ contentId: 'c1', contentType: 'video', step: 1 }],
        }
      );
      checkCourseAccess.mockResolvedValue({ accessible: true, reason: null });

      const detail = await getChildModuleAccessDetail(childId);
      expect(detail.modules[0].canLock).toBe(false);
      expect(detail.modules[0].canUnlock).toBe(false);
      expect(detail.modules[0].status).toBe('completed');
    });

    it('recomputes % from current contents when stored % is stale after CMS removals', async () => {
      const contents = [
        { contentId: 'c1', contentType: 'video', step: 1 },
        { contentId: 'c2', contentType: 'book', step: 1 },
        { contentId: 'c3', contentType: 'activity', step: 1 },
        { contentId: 'c4', contentType: 'video', step: 1 },
      ];
      const contentProgress = [
        { contentId: 'c1', contentType: 'video', step: 1, status: 'completed' },
        { contentId: 'c2', contentType: 'book', step: 1, status: 'completed' },
        // Orphans from removed items
        { contentId: 'old1', contentType: 'video', step: 1, status: 'completed' },
      ];
      const healedDoc = {
        _id: 'prog1',
        progressPercentage: 10,
        status: 'in_progress',
        contentProgress,
        updateProgressPercentage: jest.fn(function () {
          this.progressPercentage = 50;
          this.contentProgress = contentProgress.slice(0, 2);
        }),
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockDetailAfterMutation(
        {
          _id: 'prog1',
          child: childId,
          course: courseId,
          status: 'in_progress',
          progressPercentage: 10, // stale (was 1/10 before removals)
          accessOverride: 'none',
          contentProgress,
        },
        { title: 'Introduction', stepOrder: 10, contents }
      );
      CourseProgress.findById.mockResolvedValue(healedDoc);
      checkCourseAccess.mockResolvedValue({ accessible: true, reason: null });

      const detail = await getChildModuleAccessDetail(childId);

      expect(detail.modules[0].completedContent).toBe(2);
      expect(detail.modules[0].totalContent).toBe(4);
      expect(detail.modules[0].progressPercentage).toBe(50);
      expect(healedDoc.updateProgressPercentage).toHaveBeenCalled();
      expect(healedDoc.save).toHaveBeenCalled();
    });
  });
});
