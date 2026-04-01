jest.mock('../models', () => ({
  ChildProfile: { findOne: jest.fn() },
  Course: { find: jest.fn() },
  CourseProgress: { find: jest.fn() },
  ProgramPrintable: { findOne: jest.fn(), find: jest.fn() },
}));

jest.mock('../services/courseProgress.services', () => ({
  checkCourseAccess: jest.fn(),
}));

const { ChildProfile, Course, CourseProgress, ProgramPrintable } = require('../models');
const { checkCourseAccess } = require('../services/courseProgress.services');

describe('programMaterials.service (module-based printables)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.PROGRAM_MATERIALS_MAX_STEP = '4';
    process.env.PROGRAM_MATERIALS_AHEAD_STEPS = '1';
    process.env.PROGRAM_MATERIALS_BASE_URL = '';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function buildChild({ id = 'child-1', parent = 'parent-1', language = 'en' } = {}) {
    return {
      _id: id,
      parent,
      displayName: 'Diego',
      avatar: null,
      preferences: { language },
    };
  }

  it('throws 401 when parentUserId missing', async () => {
    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    await expect(getProgramMaterialsForChild({ parentUserId: null, childId: 'c1' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws 403 when child not owned by parent', async () => {
    ChildProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    await expect(
      getProgramMaterialsForChild({ parentUserId: 'p1', childId: 'c1' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('unlocks current module + next module and includes module contents + progress', async () => {
    ChildProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(buildChild()),
    });

    const now = new Date();
    const courses = [
      {
        _id: 'course-1',
        title: 'Intro',
        description: 'Desc 1',
        coverImage: 'cover1',
        stepOrder: 1,
        createdAt: now,
        contents: [{ contentId: 'book-1', contentType: 'book', step: 1, order: 0 }],
      },
      {
        _id: 'course-2',
        title: 'Module 2',
        description: 'Desc 2',
        coverImage: 'cover2',
        stepOrder: 2,
        createdAt: now,
        contents: [{ contentId: 'video-2', contentType: 'video', step: 1, order: 0 }],
      },
      {
        _id: 'course-3',
        title: 'Module 3',
        description: 'Desc 3',
        coverImage: 'cover3',
        stepOrder: 3,
        createdAt: now,
        contents: [],
      },
      {
        _id: 'course-4',
        title: 'Module 4',
        description: 'Desc 4',
        coverImage: 'cover4',
        stepOrder: 4,
        createdAt: now,
        contents: [],
      },
    ];
    Course.find.mockReturnValue({
      // service calls: Course.find(...).select(...)
      select: jest.fn().mockResolvedValue(courses),
    });

    // Only course-1 has progress -> current module
    CourseProgress.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          course: 'course-1',
          status: 'in_progress',
          contentProgress: [
            {
              contentId: 'book-1',
              contentType: 'book',
              status: 'completed',
              completedAt: new Date(),
            },
          ],
        },
      ]),
    });

    checkCourseAccess.mockResolvedValue({ accessible: true });

    ProgramPrintable.findOne.mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(null),
    })); // full bundle + recipes absent

    ProgramPrintable.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            _id: 'p1',
            course: 'course-1',
            title: 'Printable Intro',
            description: 'Printable Desc 1',
            coverImage: 'printCover1',
            pdfUrl: 'pdf-intro',
            updatedAt: now,
          },
          {
            _id: 'p2',
            course: 'course-2',
            title: 'Printable 2',
            description: 'Printable Desc 2',
            coverImage: 'printCover2',
            pdfUrl: 'pdf-2',
            updatedAt: now,
          },
        ]),
      }),
    });

    const { getProgramMaterialsForChild } = require('../services/programMaterials.service');
    const result = await getProgramMaterialsForChild({ parentUserId: 'parent-1', childId: 'child-1' });

    expect(result.unlocking.currentStep).toBe(1);
    expect(result.unlocking.unlockThrough).toBe(2);

    const step1 = result.materialsByStep.find((s) => s.stepNumber === 1);
    const step2 = result.materialsByStep.find((s) => s.stepNumber === 2);
    const step3 = result.materialsByStep.find((s) => s.stepNumber === 3);

    expect(step1.isUnlocked).toBe(true);
    expect(step1.printable.pdfUrl).toBe('pdf-intro');
    expect(step1.printables).toEqual([
      expect.objectContaining({
        id: 'p1',
        pageNumber: 1,
        label: 'Printable Intro',
        fileUrl: 'pdf-intro',
      }),
    ]);
    expect(step1.contentsByType.library[0].progressStatus).toBe('completed');

    expect(step2.isUnlocked).toBe(true);
    expect(step2.printable.pdfUrl).toBe('pdf-2');
    expect(step2.printables).toEqual([
      expect.objectContaining({
        id: 'p2',
        pageNumber: 1,
        label: 'Printable 2',
        fileUrl: 'pdf-2',
      }),
    ]);
    expect(step2.contentsByType.videos[0].progressStatus).toBe('not_started');

    expect(step3.isUnlocked).toBe(false);
    expect(step3.printable.pdfUrl).toBe(null);
    expect(step3.printables).toEqual([]);
  });
});

