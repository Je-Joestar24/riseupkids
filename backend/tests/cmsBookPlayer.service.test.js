jest.mock('../models', () => ({
  CmsBook: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

const { CmsBook } = require('../models');
const service = require('../services/cmsBookPlayer.service');

describe('cmsBookPlayer.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects non-parent access for playable list', async () => {
    await expect(
      service.listPlayableCmsBooksForParent({ userRole: 'admin', page: 1, limit: 10 })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lists playable books for parent', async () => {
    CmsBook.countDocuments.mockResolvedValue(1);
    CmsBook.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'book-1',
          title: 'Animals 1',
          description: 'desc',
          language: 'en',
          version: 1,
          pages: [{ order: 1, type: 'cover', media: { imageMediaId: 'media-1' } }],
          updatedAt: new Date('2026-01-01'),
        },
      ]),
    });

    const result = await service.listPlayableCmsBooksForParent({ userRole: 'parent', page: 1, limit: 10 });
    expect(result.pagination.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'book-1',
      coverImageMediaId: 'media-1',
      totalPages: 1,
    });
  });

  it('returns ordered playable payload for parent', async () => {
    CmsBook.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'book-1',
        title: 'Animals 1',
        description: null,
        language: 'en',
        version: 2,
        pages: [
          { pageId: 'p2', order: 2, type: 'content', title: 'A', media: {}, interaction: null, navigation: {}, scoring: {} },
          { pageId: 'p1', order: 1, type: 'cover', title: 'Cover', media: { imageMediaId: 'm1' }, interaction: null, navigation: {}, scoring: {} },
        ],
      }),
    });

    const result = await service.getPlayableCmsBookForParent({ userRole: 'parent', bookId: 'book-1' });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageId).toBe('p1');
    expect(result.pages[1].pageId).toBe('p2');
  });

  it('rejects non-parent access for play by id', async () => {
    await expect(
      service.getPlayableCmsBookForParent({ userRole: 'teacher', bookId: 'book-1' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
