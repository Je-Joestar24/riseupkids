const {
  buildCmsBookContentVersion,
  buildCmsBookMediaManifest,
  collectCmsBookMediaAssetsFromPages,
} = require('../utils/cmsBookMediaManifest.util');

describe('cmsBookMediaManifest.util', () => {
  it('buildCmsBookContentVersion combines version and updatedAt', () => {
    const version = buildCmsBookContentVersion({
      version: 3,
      updatedAt: '2026-07-08T10:00:00.000Z',
    });
    expect(version).toBe('3:2026-07-08T10:00:00.000Z');
  });

  it('collectCmsBookMediaAssetsFromPages uses stable page keys', () => {
    const mediaMap = new Map([
      [
        'media-1',
        {
          id: 'media-1',
          type: 'image',
          url: 'https://cdn.example.com/cover.jpg',
          updatedAt: '2026-07-08T09:00:00.000Z',
        },
      ],
    ]);

    const assets = collectCmsBookMediaAssetsFromPages(
      [
        {
          pageId: 'cover-1',
          order: 1,
          media: { imageMediaId: 'media-1' },
        },
      ],
      mediaMap
    );

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      key: 'pages.cover-1.image',
      mediaId: 'media-1',
      url: 'https://cdn.example.com/cover.jpg',
    });
  });

  it('buildCmsBookMediaManifest dedupes assets by key', () => {
    const manifest = buildCmsBookMediaManifest(
      {
        _id: 'book-1',
        version: 2,
        updatedAt: '2026-07-08T10:00:00.000Z',
        pages: [{ pageId: 'p1', order: 1, media: { audioMediaId: 'a1' } }],
      },
      [
        {
          _id: 'a1',
          type: 'audio',
          url: 'https://cdn.example.com/narration.mp3',
          updatedAt: '2026-07-08T08:00:00.000Z',
        },
      ]
    );

    expect(manifest.bookId).toBe('book-1');
    expect(manifest.contentVersion).toBe('2:2026-07-08T10:00:00.000Z');
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0].key).toBe('pages.p1.audio');
  });
});
