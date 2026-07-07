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
    expect(result.title).toBe('Cover');
  });

  it('returns cover page title instead of stale document title for parent play', async () => {
    CmsBook.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'book-1',
        title: 'Wrong Stored Title',
        description: null,
        language: 'en',
        version: 2,
        pages: [
          {
            pageId: 'p1',
            order: 1,
            type: 'cover',
            title: 'Correct Cover Title',
            media: { imageMediaId: 'm1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
        ],
      }),
    });

    const result = await service.getPlayableCmsBookForParent({ userRole: 'parent', bookId: 'book-1' });
    expect(result.title).toBe('Correct Cover Title');
  });

  it('lists cover page title instead of stale document title in playable summaries', async () => {
    CmsBook.countDocuments.mockResolvedValue(1);
    CmsBook.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'book-1',
          title: 'Wrong Stored Title',
          description: 'desc',
          language: 'en',
          version: 1,
          pages: [
            {
              order: 1,
              type: 'cover',
              title: 'Correct Cover Title',
              media: { imageMediaId: 'media-1' },
            },
          ],
          updatedAt: new Date('2026-01-01'),
        },
      ]),
    });

    const result = await service.listPlayableCmsBooksForParent({ userRole: 'parent', page: 1, limit: 10 });
    expect(result.items[0].title).toBe('Correct Cover Title');
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

  it('resolves optional reward celebration audio on reward page for parent play', async () => {
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
            media: { imageMediaId: 'm1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
          {
            pageId: 'p2',
            order: 2,
            type: 'reward',
            title: 'Reward',
            media: { videoMediaId: 'reward-video', audioMediaId: 'reward-audio' },
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
        { _id: 'reward-video', type: 'video', url: 'https://cdn/video/reward.mp4', cloudUrl: null, mimeType: 'video/mp4' },
        { _id: 'reward-audio', type: 'audio', url: 'https://cdn/audio/reward.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
      ]),
    });

    const result = await service.getPlayableCmsBookForParent({ userRole: 'parent', bookId: 'book-1' });
    expect(result.pages[1].media.videoMedia).toMatchObject({
      id: 'reward-video',
      type: 'video',
      url: 'https://cdn/video/reward.mp4',
    });
    expect(result.pages[1].media.audioMedia).toMatchObject({
      id: 'reward-audio',
      type: 'audio',
      url: 'https://cdn/audio/reward.mp3',
    });
  });

  it('enriches interactive drop zone answer audio for parent play', async () => {
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
            media: { imageMediaId: 'm1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
          {
            pageId: 'p2',
            order: 2,
            type: 'content',
            title: 'Content',
            media: { imageMediaId: 'm2', audioMediaId: 'a-content' },
            reading: { text: 'Hello', durationSec: 2 },
            interaction: null,
            navigation: {},
            scoring: {},
          },
          {
            pageId: 'p3',
            order: 3,
            type: 'activity_drag_2x1',
            title: 'Interactive',
            media: { guideImageMediaId: 'g1' },
            interaction: {
              kind: 'drag_2x1',
              options: [
                { optionId: 'option_one', label: 'Option 1', imageMediaId: 'oi1', audioMediaId: 'oa1' },
                { optionId: 'option_two', label: 'Option 2', imageMediaId: 'oi2', audioMediaId: 'oa2' },
              ],
              dropZones: [
                {
                  zoneId: 'zone_one',
                  label: 'Answer 1',
                  correctOptionId: 'option_one',
                  audioMediaId: 'aa1',
                },
              ],
            },
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
        { _id: 'm2', type: 'image', url: 'https://cdn/images/content.png', cloudUrl: null, mimeType: 'image/png' },
        { _id: 'a-content', type: 'audio', url: 'https://cdn/audio/content.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
        { _id: 'g1', type: 'image', url: 'https://cdn/images/guide1.png', cloudUrl: null, mimeType: 'image/png' },
        { _id: 'oi1', type: 'image', url: 'https://cdn/images/opt1.png', cloudUrl: null, mimeType: 'image/png' },
        { _id: 'oi2', type: 'image', url: 'https://cdn/images/opt2.png', cloudUrl: null, mimeType: 'image/png' },
        { _id: 'oa1', type: 'audio', url: 'https://cdn/audio/opt1.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
        { _id: 'oa2', type: 'audio', url: 'https://cdn/audio/opt2.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
        { _id: 'aa1', type: 'audio', url: 'https://cdn/audio/answer1.mp3', cloudUrl: null, mimeType: 'audio/mpeg' },
      ]),
    });

    const result = await service.getPlayableCmsBookForParent({ userRole: 'parent', bookId: 'book-1' });
    const interactivePage = result.pages.find((page) => page.type === 'activity_drag_2x1');
    expect(interactivePage.interaction.dropZones[0].audioMedia).toMatchObject({
      id: 'aa1',
      type: 'audio',
      url: 'https://cdn/audio/answer1.mp3',
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
