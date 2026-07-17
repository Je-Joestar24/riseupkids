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

function mockPlayableBookQuery(bookDoc, mediaDocs = []) {
  CmsBook.findOne.mockReturnValue({
    lean: jest.fn().mockResolvedValue(bookDoc),
  });
  Media.find.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(mediaDocs),
  });
}

describe('cmsBookPlayer.service — preload manifest E2E contract', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.AWS_S3_BASE_URL = 'https://cdn.riseupkids.test';
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    delete process.env.AWS_S3_BASE_URL;
  });

  it('returns mediaManifest with absolute CDN URLs for relative upload media', async () => {
    mockPlayableBookQuery(
      {
        _id: 'book-preload-1',
        title: 'Animals',
        description: null,
        language: 'en',
        version: 4,
        updatedAt: new Date('2026-07-08T10:00:00.000Z'),
        pages: [
          {
            pageId: 'cover-1',
            order: 1,
            type: 'cover',
            title: 'Cover',
            media: { imageMediaId: 'img-1', audioMediaId: 'audio-1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
          {
            pageId: 'content-1',
            order: 2,
            type: 'content',
            title: 'Page 1',
            media: { imageMediaId: 'img-2', audioMediaId: 'audio-2' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
        ],
      },
      [
        {
          _id: 'img-1',
          type: 'image',
          url: '/uploads/media/images/cover.png',
          cloudUrl: null,
          mimeType: 'image/png',
          updatedAt: new Date('2026-07-08T09:00:00.000Z'),
        },
        {
          _id: 'audio-1',
          type: 'audio',
          url: '/uploads/media/audio/intro.mp3',
          cloudUrl: 'https://cdn.riseupkids.test/media/audio/intro.mp3',
          mimeType: 'audio/mpeg',
          updatedAt: new Date('2026-07-08T09:01:00.000Z'),
        },
        {
          _id: 'img-2',
          type: 'image',
          url: '/uploads/media/images/page1.png',
          cloudUrl: null,
          mimeType: 'image/png',
          updatedAt: new Date('2026-07-08T09:02:00.000Z'),
        },
        {
          _id: 'audio-2',
          type: 'audio',
          url: '/uploads/media/audio/page1.mp3',
          cloudUrl: null,
          mimeType: 'audio/mpeg',
          updatedAt: new Date('2026-07-08T09:03:00.000Z'),
        },
      ]
    );

    const result = await service.getPlayableCmsBookForParent({
      userRole: 'parent',
      bookId: 'book-preload-1',
    });

    expect(result.mediaManifest).toBeDefined();
    expect(result.contentVersion).toBe('4:2026-07-08T10:00:00.000Z');
    expect(result.mediaManifest.contentVersion).toBe(result.contentVersion);
    expect(result.mediaManifest.assets.length).toBeGreaterThanOrEqual(4);

    result.mediaManifest.assets.forEach((asset) => {
      expect(asset.url).toMatch(/^https:\/\//);
      expect(asset.key).toMatch(/^pages\./);
    });

    expect(result.mediaManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'pages.cover-1.image',
          url: 'https://cdn.riseupkids.test/uploads/media/images/cover.png',
        }),
        expect.objectContaining({
          key: 'pages.cover-1.audio',
          url: 'https://cdn.riseupkids.test/media/audio/intro.mp3',
        }),
      ])
    );
  });

  it('keeps manifest asset URLs aligned with enriched page media URLs', async () => {
    mockPlayableBookQuery(
      {
        _id: 'book-preload-2',
        title: 'Cover Title',
        description: null,
        language: 'en',
        version: 1,
        updatedAt: new Date('2026-07-08T11:00:00.000Z'),
        pages: [
          {
            pageId: 'cover-1',
            order: 1,
            type: 'cover',
            title: 'Cover Title',
            media: { imageMediaId: 'img-1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
        ],
      },
      [
        {
          _id: 'img-1',
          type: 'image',
          url: '/uploads/media/images/cover.png',
          cloudUrl: null,
          mimeType: 'image/png',
          updatedAt: new Date('2026-07-08T09:00:00.000Z'),
        },
      ]
    );

    const result = await service.getPlayableCmsBookForParent({
      userRole: 'parent',
      bookId: 'book-preload-2',
    });

    const manifestImage = result.mediaManifest.assets.find(
      (asset) => asset.key === 'pages.cover-1.image'
    );
    const pageImage = result.pages[0].media.imageMedia.url;

    expect(manifestImage.url).toBe(pageImage);
    expect(manifestImage.url).toBe('https://cdn.riseupkids.test/uploads/media/images/cover.png');
  });

  it('exposes stable contentVersion for client pack invalidation', async () => {
    mockPlayableBookQuery(
      {
        _id: 'book-preload-3',
        title: 'Versioned Book',
        description: null,
        language: 'en',
        version: 7,
        updatedAt: new Date('2026-07-15T08:30:00.000Z'),
        pages: [
          {
            pageId: 'cover-1',
            order: 1,
            type: 'cover',
            title: 'Cover',
            media: { imageMediaId: 'img-1' },
            interaction: null,
            navigation: {},
            scoring: {},
          },
        ],
      },
      [
        {
          _id: 'img-1',
          type: 'image',
          url: 'https://cdn.riseupkids.test/images/cover.png',
          cloudUrl: 'https://cdn.riseupkids.test/images/cover.png',
          mimeType: 'image/png',
          updatedAt: new Date('2026-07-08T09:00:00.000Z'),
        },
      ]
    );

    const result = await service.getPlayableCmsBookForParent({
      userRole: 'parent',
      bookId: 'book-preload-3',
    });

    expect(result.contentVersion).toBe('7:2026-07-15T08:30:00.000Z');
    expect(result.mediaManifest.contentVersion).toBe('7:2026-07-15T08:30:00.000Z');
    expect(result.mediaManifest.bookId).toBe('book-preload-3');
  });
});
