jest.mock('../models/ChildProfile', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/CourseProgress', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/Course', () => ({
  findById: jest.fn(),
}));

const ChildProfile = require('../models/ChildProfile');
const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');

describe('programMaterials.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.PROGRAM_MATERIALS_COURSE_ID = process.env.PROGRAM_MATERIALS_COURSE_ID || 'course-123';
    process.env.PROGRAM_MATERIALS_MAX_STEP = '4';
    process.env.PROGRAM_MATERIALS_BASE_URL = 'https://cdn.example.com/program-materials/v1';
    process.env.PROGRAM_MATERIALS_AHEAD_STEPS = '1';
    process.env.PROGRAM_MATERIALS_PAGES_PER_STEP = '3';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function buildChild({ id = 'child-1', parent = 'parent-1', language = 'en' } = {}) {
    return {
      _id: id,
      parent,
      displayName: 'Emma',
      avatar: null,
      preferences: { language },
    };
  }

  function mockSelectResolved(model, value) {
    model.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(value),
    });
  }

  function mockCourseSelectResolved(value) {
    Course.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(value),
    });
  }

  it('throws 401 when parentUserId missing', async () => {
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    await expect(getProgramMaterialsForChild({ parentUserId: null, childId: 'c1' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws 400 when childId missing', async () => {
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    await expect(getProgramMaterialsForChild({ parentUserId: 'p1', childId: '' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws 403 when child not owned by parent', async () => {
    mockSelectResolved(ChildProfile, null);
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    await expect(getProgramMaterialsForChild({ parentUserId: 'p1', childId: 'c1' })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('defaults currentStep to 1 when CourseProgress missing', async () => {
    mockSelectResolved(ChildProfile, buildChild());
    mockSelectResolved(CourseProgress, null);
    mockCourseSelectResolved(null);
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');

    const result = await getProgramMaterialsForChild({ parentUserId: 'parent-1', childId: 'child-1' });
    expect(result.unlocking.currentStep).toBe(1);
    expect(result.unlocking.unlockThrough).toBe(2);

    const unlocked = result.materialsByStep.filter((s) => s.isUnlocked).map((s) => s.stepNumber);
    expect(unlocked).toEqual([1, 2]);
  });

  it('unlocks current and next steps from CourseProgress.currentStep', async () => {
    mockSelectResolved(ChildProfile, buildChild());
    mockSelectResolved(CourseProgress, {
      currentStep: 3,
      course: 'course-123',
      contentProgress: [{ contentId: 'x1', contentType: 'video', step: 3, status: 'completed', completedAt: null }],
    });
    mockCourseSelectResolved({
      _id: 'course-123',
      title: 'Core Program',
      description: 'Main learning path',
      contents: [{ contentId: 'x1', contentType: 'video', step: 3, order: 0 }],
    });
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');

    const result = await getProgramMaterialsForChild({ parentUserId: 'parent-1', childId: 'child-1' });
    expect(result.unlocking.currentStep).toBe(3);
    expect(result.unlocking.unlockThrough).toBe(4);
    expect(Array.isArray(result.unlocking.modules)).toBe(true);
    expect(result.unlocking.modules[0]).toMatchObject({
      id: 'course-123',
      title: 'Core Program',
    });

    const unlocked = result.materialsByStep.filter((s) => s.isUnlocked).map((s) => s.stepNumber);
    expect(unlocked).toEqual([3, 4]);
    expect(result.materialsByStep.find((s) => s.stepNumber === 2).fileUrl).toBeNull();
    expect(result.materialsByStep.find((s) => s.stepNumber === 3).fileUrl).toContain('/steps/step-03/page-01.pdf');
    expect(result.materialsByStep.find((s) => s.stepNumber === 3).printables).toEqual([
      expect.objectContaining({
        label: 'Page 1',
        pageNumber: 1,
        isUnlocked: true,
        fileUrl: expect.stringContaining('/steps/step-03/page-01.pdf'),
      }),
      expect.objectContaining({
        label: 'Page 2',
        pageNumber: 2,
        isUnlocked: true,
        fileUrl: expect.stringContaining('/steps/step-03/page-02.pdf'),
      }),
      expect.objectContaining({
        label: 'Page 3',
        pageNumber: 3,
        isUnlocked: true,
        fileUrl: expect.stringContaining('/steps/step-03/page-03.pdf'),
      }),
    ]);
    expect(result.materialsByStep.find((s) => s.stepNumber === 2).printables).toEqual([
      expect.objectContaining({ pageNumber: 1, isUnlocked: false, fileUrl: null }),
      expect.objectContaining({ pageNumber: 2, isUnlocked: false, fileUrl: null }),
      expect.objectContaining({ pageNumber: 3, isUnlocked: false, fileUrl: null }),
    ]);
    expect(result.materialsByStep.find((s) => s.stepNumber === 3).contents).toEqual([
      {
        contentId: 'x1',
        contentType: 'video',
        order: 0,
        progressStatus: 'completed',
        completedAt: null,
      },
    ]);
    expect(result.materialsByStep.find((s) => s.stepNumber === 3).contentsByType.videos).toHaveLength(1);
    expect(result.materialsByStep.find((s) => s.stepNumber === 3).contentsByType.library).toHaveLength(0);
  });

  it('caps nextStep when currentStep is maxStep', async () => {
    mockSelectResolved(ChildProfile, buildChild());
    mockSelectResolved(CourseProgress, { currentStep: 4, course: 'course-123' });
    mockCourseSelectResolved({
      _id: 'course-123',
      title: 'Core Program',
      description: 'Main learning path',
      contents: [{ contentId: 'x1', contentType: 'video', step: 4, order: 0 }],
    });
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');

    const result = await getProgramMaterialsForChild({ parentUserId: 'parent-1', childId: 'child-1' });
    expect(result.unlocking.currentStep).toBe(4);
    expect(result.unlocking.unlockThrough).toBe(4);

    const unlocked = result.materialsByStep.filter((s) => s.isUnlocked).map((s) => s.stepNumber);
    expect(unlocked).toEqual([4]); // only current; unlockThrough capped at max
  });

  it('falls back to latest CourseProgress when PROGRAM_MATERIALS_COURSE_ID is not set', async () => {
    delete process.env.PROGRAM_MATERIALS_COURSE_ID;
    mockSelectResolved(ChildProfile, buildChild());
    CourseProgress.findOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({
        currentStep: 2,
        course: 'course-xyz',
        contentProgress: [{ contentId: 'a', contentType: 'activity', step: 2, status: 'in_progress', completedAt: null }],
      }),
    });
    mockCourseSelectResolved({
      _id: 'course-xyz',
      title: 'Core Program',
      description: 'Main learning path',
      contents: [{ contentId: 'a', contentType: 'activity', step: 2, order: 0 }],
    });

    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    const result = await getProgramMaterialsForChild({ parentUserId: 'parent-1', childId: 'child-1' });
    expect(result.unlocking.currentStep).toBe(2);
    expect(result.unlocking.unlockThrough).toBe(3);
    expect(result.materialsByStep.find((s) => s.stepNumber === 2).contents[0].progressStatus).toBe('in_progress');
  });
});

