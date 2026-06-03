jest.mock('../models', () => ({
  CmsBook: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  },
  Media: {
    find: jest.fn(),
  },
}));

const { CmsBook, Media } = require('../models');
const service = require('../services/cmsBookPlayer.service');

describe('cmsBookPlayer.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  it('allows admin access for playable list', async () => {
    CmsBook.countDocuments.mockResolvedValue(0);
    CmsBook.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    const result = await service.listPlayableCmsBooksForParent({ userRole: 'admin', page: 1, limit: 10 });
    expect(result).toMatchObject({
      items: [],
      pagination: expect.any(Object),
    });
  });

  it('rejects unauthorized access for playable list', async () => {
    await expect(
      service.listPlayableCmsBooksForParent({ userRole: 'child', page: 1, limit: 10 })
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

  it('resolves optional intro background music on cover page for parent play', async () => {
    CmsBook.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'book-1',
        title: 'Animals 1',
        description: null,
        language: 'en',
        version: 2,
        pages: [
          {
            pageId: 'p1',
            order: 1,
            type: 'cover',
            title: 'Cover',
            media: { imageMediaId: 'm1', audioMediaId: 'bgm-1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
        ],
      }),
    });

    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'm1', type: 'image', url: 'https://cdn/images/cover.png', cloudUrl: null, mimeType: 'image/png' },
        { _id: 'bgm-1', type: 'audio', url: 'https://cdn/audio/intro-bgm.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
      ]),
    });

    const result = await service.getPlayableCmsBookForParent({ userRole: 'parent', bookId: 'book-1' });
    expect(result.pages[0].media.imageMedia).toMatchObject({ id: 'm1', type: 'image' });
    expect(result.pages[0].media.audioMedia).toMatchObject({
      id: 'bgm-1',
      type: 'audio',
      url: 'https://cdn/audio/intro-bgm.mp3',
    });
  });

  it('lists introBackgroundMusicMediaId on playable book summaries when cover has bgm', async () => {
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
          pages: [
            {
              order: 1,
              type: 'cover',
              media: { imageMediaId: 'media-1', audioMediaId: 'bgm-1' },
            },
          ],
          updatedAt: new Date('2026-01-01'),
        },
      ]),
    });

    const result = await service.listPlayableCmsBooksForParent({ userRole: 'parent', page: 1, limit: 10 });
    expect(result.items[0]).toMatchObject({
      id: 'book-1',
      coverImageMediaId: 'media-1',
      introBackgroundMusicMediaId: 'bgm-1',
    });
  });

  it('returns reading metadata and auto-generates words when missing', async () => {
    CmsBook.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'book-1',
        title: 'Animals 1',
        description: null,
        language: 'en',
        version: 2,
        pages: [
          {
            pageId: 'p1',
            order: 1,
            type: 'content',
            title: 'Reading page',
            media: { audioMediaId: 'a1' },
            reading: { text: 'I am a starfish', durationSec: 4.2, fontSizePx: 44 },
            interaction: null,
            navigation: {},
            scoring: {},
          },
        ],
      }),
    });

    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'a1', type: 'audio', url: 'https://cdn/audio/page1.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
      ]),
    });

    const result = await service.getPlayableCmsBookForParent({ userRole: 'parent', bookId: 'book-1' });
    expect(result.pages[0].reading).toBeTruthy();
    expect(result.pages[0].reading.fontSizePx).toBe(44);
    expect(result.pages[0].reading.words).toHaveLength(4);
    expect(result.pages[0].media.audioMedia).toMatchObject({
      id: 'a1',
      type: 'audio',
      url: 'https://cdn/audio/page1.mp3',
    });
  });

  it('allows teacher access for play by id', async () => {
    CmsBook.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'book-1',
        title: 'Animals 1',
        description: null,
        language: 'en',
        version: 2,
        pages: [],
      }),
    });
    const result = await service.getPlayableCmsBookForParent({ userRole: 'teacher', bookId: 'book-1' });
    expect(result).toMatchObject({ id: 'book-1' });
  });

  it('rejects unauthorized access for play by id', async () => {
    await expect(
      service.getPlayableCmsBookForParent({ userRole: 'child', bookId: 'book-1' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
