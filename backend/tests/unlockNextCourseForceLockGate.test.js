/**
 * Admin force_lock must gate the journey — do not skip to later modules.
 */
jest.mock('../models', () => ({
  Course: {
    findById: jest.fn(),
    find: jest.fn(),
  },
  CourseProgress: {
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
  ChildProfile: {},
  Activity: {},
  Book: {},
  Media: {},
  AudioAssignment: {},
  Chant: {},
  VideoWatch: {},
}));

const { Course, CourseProgress } = require('../models');
const { unlockNextCourse } = require('../services/courseProgress.services');

/** Supports both `await findOne()` and `findOne().select().lean()`. */
function mockFindOneDoc(doc) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(doc),
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
  };
  return chain;
}

describe('unlockNextCourse admin force_lock gate', () => {
  const childId = 'c1';
  const course10 = {
    _id: 'm10',
    stepOrder: 10,
    createdAt: new Date('2024-01-01'),
    isSequential: false,
    prerequisites: [],
  };
  const course20 = {
    _id: 'm20',
    stepOrder: 20,
    createdAt: new Date('2024-01-02'),
    isSequential: false,
    prerequisites: [],
  };
  const course30 = {
    _id: 'm30',
    stepOrder: 30,
    createdAt: new Date('2024-01-03'),
    isSequential: false,
    prerequisites: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    CourseProgress.countDocuments.mockResolvedValue(0);
    Course.findById.mockImplementation(async (id) => {
      const all = [course10, course20, course30];
      return all.find((c) => c._id === String(id)) || null;
    });
    Course.find.mockReturnValue({
      sort: () => Promise.resolve([course10, course20, course30]),
    });
  });

  it('does not unlock modules after a force_locked next module', async () => {
    CourseProgress.findOne.mockReturnValue(
      mockFindOneDoc({
        accessOverride: 'force_lock',
        status: 'locked',
        progressPercentage: 0,
        save: jest.fn(),
      })
    );

    await unlockNextCourse(childId, course10._id);

    expect(CourseProgress.create).not.toHaveBeenCalled();
    expect(CourseProgress.findOne).toHaveBeenCalledWith({
      child: childId,
      course: course20._id,
    });
  });

  it('still unlocks the immediate next module when it is not force_locked', async () => {
    const progress20 = {
      accessOverride: 'none',
      status: 'locked',
      progressPercentage: 0,
      save: jest.fn().mockResolvedValue(undefined),
    };
    CourseProgress.findOne.mockReturnValue(mockFindOneDoc(progress20));

    await unlockNextCourse(childId, course10._id);

    expect(progress20.status).toBe('in_progress');
    expect(progress20.save).toHaveBeenCalled();
    expect(CourseProgress.create).not.toHaveBeenCalled();
  });
});
