jest.mock('../models', () => ({
  CmsBook: {
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Media: {
    find: jest.fn(),
    deleteMany: jest.fn(),
  },
}));
jest.mock('../services/s3.service', () => ({
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn((value) => value),
}));

const { CmsBook, Media } = require('../models');
const s3Service = require('../services/s3.service');
const service = require('../services/cmsBookAdmin.service');

function makeDoc(overrides = {}) {
  return {
    _id: 'book-1',
    status: 'draft',
    isArchived: false,
    title: 'Sample',
    pages: [],
    updatedBy: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('cmsBookAdmin.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates cms book with createdBy and updatedBy', async () => {
    CmsBook.create.mockResolvedValue({ _id: 'book-1', title: 'My Book' });

    const result = await service.createCmsBook({
      userId: 'admin-1',
      payload: { title: 'My Book', language: 'en', pages: [] },
    });

    expect(result).toMatchObject({ _id: 'book-1' });
    expect(CmsBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Book',
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
      })
    );
  });

  it('lists cms books with pagination', async () => {
    CmsBook.countDocuments.mockResolvedValue(2);
    CmsBook.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'book-1' }, { _id: 'book-2' }]),
    });

    const result = await service.listCmsBooks({ page: 1, limit: 10, search: 'animals' });
    expect(result.pagination.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(CmsBook.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        isArchived: false,
        $or: expect.any(Array),
      })
    );
  });

  it('updates draft cms book', async () => {
    const doc = makeDoc({ title: 'Old' });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.updateCmsBook({
      bookId: 'book-1',
      userId: 'admin-1',
      patch: { title: 'New Title' },
    });

    expect(result.title).toBe('New Title');
    expect(result.updatedBy).toBe('admin-1');
    expect(doc.save).toHaveBeenCalled();
  });

  it('updates published cms book', async () => {
    const doc = makeDoc({ status: 'published', title: 'Old Published' });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.updateCmsBook({
      bookId: 'book-1',
      userId: 'admin-1',
      patch: { title: 'Updated Published' },
    });

    expect(result.title).toBe('Updated Published');
    expect(result.updatedBy).toBe('admin-1');
    expect(doc.save).toHaveBeenCalled();
  });

  it('publishes book', async () => {
    const doc = makeDoc({ status: 'draft' });
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.publishCmsBook({ bookId: 'book-1', userId: 'admin-1' });
    expect(result.status).toBe('published');
    expect(doc.save).toHaveBeenCalled();
  });

  it('archives book', async () => {
    const doc = makeDoc();
    CmsBook.findById.mockResolvedValue(doc);

    const result = await service.archiveCmsBook({ bookId: 'book-1', userId: 'admin-1' });
    expect(result).toMatchObject({ id: 'book-1' });
    expect(doc.status).toBe('archived');
    expect(doc.isArchived).toBe(true);
    expect(doc.save).toHaveBeenCalled();
  });

  it('deletes book and cleans up attached media', async () => {
    CmsBook.findById.mockResolvedValue({
      _id: 'book-1',
      pages: [
        {
          media: {
            imageMediaId: 'm-1',
            guideImageMediaIds: ['m-2'],
          },
          interaction: {
            options: [
              { imageMediaId: 'm-3', audioMediaId: 'm-4' },
            ],
          },
        },
      ],
    });
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'm-1', filePath: 'media/images/1.png' },
        { _id: 'm-2', filePath: 'media/images/2.png' },
        { _id: 'm-3', filePath: 'media/images/3.png' },
        { _id: 'm-4', filePath: 'media/audio/4.mp3' },
      ]),
    });
    Media.deleteMany.mockResolvedValue({ deletedCount: 4 });
    CmsBook.findByIdAndDelete.mockResolvedValue({ _id: 'book-1' });
    s3Service.deleteByKey.mockResolvedValue(true);

    const result = await service.deleteCmsBook({ bookId: 'book-1', userId: 'admin-1' });

    expect(result).toMatchObject({ id: 'book-1', deletedMediaCount: 4 });
    expect(s3Service.deleteByKey).toHaveBeenCalledTimes(4);
    expect(Media.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['m-1', 'm-2', 'm-3', 'm-4'] } });
    expect(CmsBook.findByIdAndDelete).toHaveBeenCalledWith('book-1');
  });
});
