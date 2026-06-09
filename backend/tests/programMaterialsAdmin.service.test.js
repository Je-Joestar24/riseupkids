jest.mock('../models', () => ({
  Course: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
  },
  ProgramPrintable: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
}));

const { Course, ProgramPrintable } = require('../models');
const s3Service = require('../services/s3.service');
const service = require('../services/programMaterialsAdmin.service');

describe('programMaterialsAdmin.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists modules with pagination and printable counts', async () => {
    Course.countDocuments.mockResolvedValue(2);
    Course.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'c1', title: 'Alpha', description: '', coverImage: null, stepOrder: 1, contents: [], isPublished: true, createdAt: new Date('2026-01-01') },
        { _id: 'c2', title: 'Beta', description: '', coverImage: null, stepOrder: 2, contents: [], isPublished: false, createdAt: new Date('2026-01-02') },
      ]),
    });

    ProgramPrintable.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'p1', course: 'c1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') },
        { _id: 'p2', course: 'c1', createdAt: new Date('2026-01-02'), updatedAt: new Date('2026-01-02') },
      ]),
    });

    const result = await service.listModulesWithPrintables({ page: 1, limit: 10, search: 'a' });
    expect(result.pagination.total).toBe(2);
    expect(result.courses).toHaveLength(2);
    expect(result.courses[0]).toMatchObject({
      id: 'c1',
      isPublished: true,
      printableCount: 2,
    });
    expect(result.courses[1]).toMatchObject({
      id: 'c2',
      isPublished: false,
      printableCount: 0,
    });
    expect(Course.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        isArchived: false,
        $or: expect.any(Array),
      })
    );
    expect(Course.countDocuments).not.toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: true })
    );
  });

  it('lists printable materials inside one module with pagination', async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'c1',
        title: 'Alpha',
        description: null,
        coverImage: null,
        stepOrder: 1,
        isPublished: false,
      }),
    });
    ProgramPrintable.countDocuments.mockResolvedValue(1);
    ProgramPrintable.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'p1',
          title: 'Page 1',
          description: null,
          coverImage: null,
          pdfUrl: 'https://cdn/a.pdf',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const result = await service.listCoursePrintables({ courseId: 'c1', page: 1, limit: 10 });
    expect(result.course.id).toBe('c1');
    expect(result.course.isPublished).toBe(false);
    expect(result.printables).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(Course.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c1', isArchived: false })
    );
  });

  it('adds new printable material without deactivating previous ones', async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'c1' }),
    });
    s3Service.uploadFileFromMulter
      .mockResolvedValueOnce({ url: 'https://cdn/pdf1.pdf' })
      .mockResolvedValueOnce({ url: 'https://cdn/cover1.png' });
    ProgramPrintable.create.mockResolvedValue({
      _id: 'p1',
      course: 'c1',
      type: 'module',
      title: 'Printable 1',
    });

    const result = await service.uploadModulePrintable({
      courseId: 'c1',
      title: 'Printable 1',
      description: 'Desc',
      pdfFile: { buffer: Buffer.from('x'), originalname: 'p.pdf', mimetype: 'application/pdf' },
      coverImageFile: { buffer: Buffer.from('x'), originalname: 'c.png', mimetype: 'image/png' },
    });

    expect(result).toMatchObject({ _id: 'p1' });
    expect(ProgramPrintable.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'module',
        course: 'c1',
        title: 'Printable 1',
        pdfUrl: 'https://cdn/pdf1.pdf',
      })
    );
    expect(Course.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c1', isArchived: false })
    );
  });

  it('adds printable material to a draft module before publishing', async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'draft-1' }),
    });
    s3Service.uploadFileFromMulter.mockResolvedValueOnce({ url: 'https://cdn/draft.pdf' });
    ProgramPrintable.create.mockResolvedValue({
      _id: 'p-draft',
      course: 'draft-1',
      type: 'module',
      title: 'Draft Printable',
    });

    const result = await service.uploadModulePrintable({
      courseId: 'draft-1',
      title: 'Draft Printable',
      pdfFile: { buffer: Buffer.from('x'), originalname: 'p.pdf', mimetype: 'application/pdf' },
    });

    expect(result).toMatchObject({ _id: 'p-draft' });
    expect(Course.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'draft-1', isArchived: false })
    );
    expect(Course.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: true })
    );
  });

  it('filters modules by draft publish status', async () => {
    Course.countDocuments.mockResolvedValue(1);
    Course.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'draft-1',
          title: 'Draft Module',
          description: '',
          coverImage: null,
          stepOrder: 1,
          contents: [],
          isPublished: false,
          createdAt: new Date('2026-01-01'),
        },
      ]),
    });
    ProgramPrintable.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    await service.listModulesWithPrintables({ page: 1, limit: 10, isPublished: false });

    expect(Course.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ isArchived: false, isPublished: false })
    );
  });

  it('rejects upload when course is archived or missing', async () => {
    Course.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.uploadModulePrintable({
        courseId: 'archived-1',
        title: 'Printable',
        pdfFile: { buffer: Buffer.from('x'), originalname: 'p.pdf', mimetype: 'application/pdf' },
      })
    ).rejects.toThrow('Course not found');
  });
});

