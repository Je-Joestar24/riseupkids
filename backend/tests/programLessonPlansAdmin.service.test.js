jest.mock('../models', () => ({
  Course: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  },
  ProgramLessonPlan: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
}));

const { Course, ProgramLessonPlan } = require('../models');
const s3Service = require('../services/s3.service');
const service = require('../services/programLessonPlansAdmin.service');

describe('programLessonPlansAdmin.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists modules with pagination and lesson plan counts', async () => {
    Course.countDocuments.mockResolvedValue(2);
    Course.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'c1', title: 'Alpha', description: '', coverImage: null, stepOrder: 1, contents: [], createdAt: new Date('2026-01-01') },
        { _id: 'c2', title: 'Beta', description: '', coverImage: null, stepOrder: 2, contents: [], createdAt: new Date('2026-01-02') },
      ]),
    });

    ProgramLessonPlan.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'lp1', course: 'c1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
        { _id: 'lp2', course: 'c1', createdAt: new Date('2026-01-02'), updatedAt: new Date('2026-01-02') },
      ]),
    });

    const result = await service.listModulesWithLessonPlans({ page: 1, limit: 10, search: 'a' });
    expect(result.pagination.total).toBe(2);
    expect(result.courses).toHaveLength(2);
    expect(result.courses[0]).toMatchObject({
      id: 'c1',
      lessonPlanCount: 2,
    });
  });

  it('lists lesson plans inside one module with pagination', async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'c1',
        title: 'Alpha',
        description: null,
        coverImage: null,
        stepOrder: 1,
      }),
    });
    ProgramLessonPlan.countDocuments.mockResolvedValue(1);
    ProgramLessonPlan.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'lp1',
          title: 'Week 1 Plan',
          description: null,
          coverImage: null,
          pdfUrl: 'https://cdn/lp1.pdf',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const result = await service.listCourseLessonPlans({ courseId: 'c1', page: 1, limit: 10 });
    expect(result.course.id).toBe('c1');
    expect(result.lessonPlans).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('adds new lesson plan to a module', async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'c1' }),
    });
    s3Service.uploadFileFromMulter
      .mockResolvedValueOnce({ url: 'https://cdn/lesson.pdf' })
      .mockResolvedValueOnce({ url: 'https://cdn/cover.png' });
    ProgramLessonPlan.create.mockResolvedValue({
      _id: 'lp1',
      course: 'c1',
      title: 'Week 1',
    });

    const result = await service.uploadModuleLessonPlan({
      courseId: 'c1',
      title: 'Week 1',
      description: 'Desc',
      pdfFile: { buffer: Buffer.from('x'), originalname: 'plan.pdf', mimetype: 'application/pdf' },
      coverImageFile: { buffer: Buffer.from('x'), originalname: 'c.png', mimetype: 'image/png' },
    });

    expect(result).toMatchObject({ _id: 'lp1' });
    expect(ProgramLessonPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        course: 'c1',
        title: 'Week 1',
        pdfUrl: 'https://cdn/lesson.pdf',
      })
    );
  });
});
