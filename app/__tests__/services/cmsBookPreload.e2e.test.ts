import type { CmsBookMediaAssetRef } from '@/services/cmsBookMediaManifest';
import {
  __resetCmsBookMediaCacheForTests,
  preloadCmsBookPackAssets,
} from '@/services/cmsBookMediaCache';
import {
  __resetCmsBookPackStorageForTests,
  loadBookPackForPreload,
  loadBookPackManifest,
} from '@/services/cmsBookPackStorage';

type MockFileEntry = {
  exists: boolean;
  isDirectory?: boolean;
  size?: number;
  contents?: string;
};

const mockFiles = new Map<string, MockFileEntry>();
const mockDownloadCalls: Array<{ remoteUrl: string; dest: string }> = [];
const mockMkdirCalls: string[] = [];

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-doc/',
  cacheDirectory: 'file:///mock-cache/',
  getInfoAsync: jest.fn(async (uri: string) => {
    const entry = mockFiles.get(uri);
    return {
      exists: Boolean(entry?.exists),
      isDirectory: Boolean(entry?.isDirectory),
      size: entry?.size ?? 0,
      uri,
    };
  }),
  makeDirectoryAsync: jest.fn(async (dir: string) => {
    mockMkdirCalls.push(dir);
    mockFiles.set(dir, { exists: true, isDirectory: true });
  }),
  downloadAsync: jest.fn(async (remoteUrl: string, dest: string) => {
    mockDownloadCalls.push({ remoteUrl, dest });
    mockFiles.set(dest, {
      exists: true,
      size: 1024,
    });
    return { status: 200, uri: dest };
  }),
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    mockFiles.set(uri, { exists: true, contents, size: contents.length });
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    const entry = mockFiles.get(uri);
    if (!entry?.exists || entry.contents == null) {
      throw new Error(`Missing file: ${uri}`);
    }
    return entry.contents;
  }),
  readDirectoryAsync: jest.fn(async () => []),
  deleteAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native', () => ({
  Image: {
    prefetch: jest.fn(async () => true),
  },
}));

jest.mock('@/config', () => ({
  BACKEND_ORIGIN: 'https://cdn.riseupkids.test',
}));

const sampleAssets: CmsBookMediaAssetRef[] = [
  {
    key: 'pages.cover-1.image',
    mediaId: 'img-1',
    url: 'https://cdn.riseupkids.test/uploads/media/images/cover.png',
    updatedAt: '2026-07-08T09:00:00.000Z',
    kind: 'image',
  },
  {
    key: 'pages.cover-1.audio',
    mediaId: 'audio-1',
    url: 'https://cdn.riseupkids.test/uploads/media/audio/intro.mp3',
    updatedAt: '2026-07-08T09:01:00.000Z',
    kind: 'audio',
  },
  {
    key: 'pages.demo-1.video',
    mediaId: 'video-1',
    url: 'https://cdn.riseupkids.test/uploads/media/videos/demo.mp4',
    updatedAt: '2026-07-08T09:02:00.000Z',
    kind: 'video',
  },
];

describe('CMS built-in book preload E2E (app pack storage)', () => {
  beforeEach(() => {
    mockFiles.clear();
    mockDownloadCalls.length = 0;
    mockMkdirCalls.length = 0;
    __resetCmsBookPackStorageForTests();
    __resetCmsBookMediaCacheForTests();

    mockFiles.set('file:///mock-doc/', { exists: true, isDirectory: true });
    mockFiles.set('file:///mock-cache/', { exists: true, isDirectory: true });
  });

  it('does not require external storage permissions — uses app sandbox documentDirectory', async () => {
    const result = await preloadCmsBookPackAssets({
      bookId: 'book-e2e-1',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: sampleAssets,
    });

    expect(result.usedDiskCache).toBe(true);
    expect(mockDownloadCalls.length).toBe(3);
    expect(mockDownloadCalls.every(({ dest }) => dest.startsWith('file:///mock-doc/cms-book-packs/'))).toBe(
      true
    );
  });

  it('creates the book pack directory before downloading assets (Star Cam parity)', async () => {
    await preloadCmsBookPackAssets({
      bookId: 'book-e2e-2',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: sampleAssets,
    });

    expect(
      mockMkdirCalls.some((dir) => dir.includes('file:///mock-doc/cms-book-packs/book-e2e-2/'))
    ).toBe(true);
    expect(mockDownloadCalls.length).toBeGreaterThan(0);
  });

  it('persists a pack manifest with local file URIs and restores on next open', async () => {
    const bookId = 'book-e2e-3';
    const contentVersion = '2:2026-07-08T10:00:00.000Z';

    const first = await preloadCmsBookPackAssets({
      bookId,
      contentVersion,
      assets: sampleAssets,
    });

    expect(first.restoredFromPack).toBe(false);
    expect(first.failed).toEqual([]);
    expect(first.uriMap[sampleAssets[0].url]).toMatch(/^file:\/\//);

    const saved = await loadBookPackManifest(bookId);
    expect(saved?.contentVersion).toBe(contentVersion);
    expect(saved?.assets['pages.cover-1.image'].localUri).toMatch(/^file:\/\//);
    expect(saved?.assets['pages.cover-1.image'].remoteUrl).toBe(sampleAssets[0].url);
    expect(saved?.assets['pages.demo-1.video'].localUri).toMatch(/\.mp4$/);

    mockDownloadCalls.length = 0;

    const restored = await loadBookPackForPreload(bookId, contentVersion);
    expect(restored.fullyRestored).toBe(true);
    expect(restored.uriMap[sampleAssets[0].url]).toMatch(/^file:\/\//);

    const second = await preloadCmsBookPackAssets({
      bookId,
      contentVersion,
      assets: sampleAssets,
    });

    expect(second.restoredFromPack).toBe(true);
    expect(mockDownloadCalls.length).toBe(0);
  });

  it('does not report fullyRestored when prior pack saved remote URLs instead of local files', async () => {
    const bookId = 'book-e2e-4';
    const contentVersion = '1:2026-07-08T10:00:00.000Z';
    const manifestUri = 'file:///mock-doc/cms-book-packs/book-e2e-4/pack-manifest.json';

    mockFiles.set(manifestUri, {
      exists: true,
      contents: JSON.stringify({
        bookId,
        contentVersion,
        savedAt: '2026-07-08T10:00:00.000Z',
        assets: {
          'pages.cover-1.image': {
            assetKey: 'pages.cover-1.image',
            remoteUrl: sampleAssets[0].url,
            localUri: sampleAssets[0].url,
            mediaId: 'img-1',
            mediaUpdatedAt: '2026-07-08T09:00:00.000Z',
            bytes: 0,
          },
        },
      }),
    });

    const restored = await loadBookPackForPreload(bookId, contentVersion);
    expect(restored.fullyRestored).toBe(false);
  });

  it('normalizes relative manifest URLs when saving and restoring packs', async () => {
    const relativeAssets: CmsBookMediaAssetRef[] = [
      {
        key: 'pages.cover-1.image',
        mediaId: 'img-1',
        url: '/uploads/media/images/cover.png',
        updatedAt: '2026-07-08T09:00:00.000Z',
        kind: 'image',
      },
    ];

    await preloadCmsBookPackAssets({
      bookId: 'book-e2e-5',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: relativeAssets,
    });

    const saved = await loadBookPackManifest('book-e2e-5');
    expect(saved?.assets['pages.cover-1.image'].remoteUrl).toBe(
      'https://cdn.riseupkids.test/uploads/media/images/cover.png'
    );

    const restored = await loadBookPackForPreload('book-e2e-5', '1:2026-07-08T10:00:00.000Z');
    expect(restored.uriMap['https://cdn.riseupkids.test/uploads/media/images/cover.png']).toMatch(
      /^file:\/\//
    );
  });

  it('reports disk unavailable without faking a restored pack', async () => {
    mockFiles.set('file:///mock-doc/', { exists: false });
    mockFiles.set('file:///mock-cache/', { exists: false });
    __resetCmsBookPackStorageForTests();
    __resetCmsBookMediaCacheForTests();

    const result = await preloadCmsBookPackAssets({
      bookId: 'book-e2e-6',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: sampleAssets,
    });

    expect(result.usedDiskCache).toBe(false);
    expect(result.failed.length).toBe(3);
    expect(result.restoredFromPack).toBe(false);
  });

  it('progressive mode: onPlayable fires after cover media before demo video finishes', async () => {
    const FileSystem = require('expo-file-system/legacy');
    const events: string[] = [];

    FileSystem.downloadAsync.mockImplementation(async (remoteUrl: string, dest: string) => {
      mockDownloadCalls.push({ remoteUrl, dest });
      if (String(remoteUrl).includes('demo.mp4')) {
        events.push('video-start');
        await new Promise((resolve) => setTimeout(resolve, 40));
        events.push('video-done');
      } else {
        events.push(`asset:${remoteUrl.includes('.png') ? 'image' : 'audio'}`);
      }
      mockFiles.set(dest, { exists: true, size: 1024 });
      return { status: 200, uri: dest };
    });

    const pages = [
      {
        pageId: 'cover-1',
        type: 'cover',
        order: 1,
        title: 'Cover',
        media: {
          imageMedia: { url: sampleAssets[0].url },
          audioMedia: { url: sampleAssets[1].url },
        },
      },
      {
        pageId: 'demo-1',
        type: 'demo',
        order: 2,
        title: 'Demo',
        media: {
          videoMedia: { url: sampleAssets[2].url },
        },
      },
    ];

    const playablePromise = new Promise<void>((resolve) => {
      void preloadCmsBookPackAssets({
        bookId: 'book-e2e-progressive',
        contentVersion: '1:2026-07-08T10:00:00.000Z',
        assets: sampleAssets,
        pages: pages as never,
        mode: 'progressive',
        concurrency: { imageAudio: 2, video: 1 },
        onPlayable: () => {
          events.push('playable');
          resolve();
        },
      }).then(() => {
        events.push('all-done');
      });
    });

    await playablePromise;
    expect(events).toContain('playable');
    expect(events.indexOf('playable')).toBeLessThan(events.indexOf('video-done') === -1
      ? events.length
      : events.indexOf('video-done'));

    // Allow remaining downloads to finish
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(events).toContain('all-done');
    expect(events.indexOf('playable')).toBeLessThan(events.indexOf('all-done'));
  });

  it('starts the next-page demo video before later-page images finish', async () => {
    const FileSystem = require('expo-file-system/legacy');
    const events: string[] = [];
    const laterUrl = 'https://cdn.riseupkids.test/uploads/media/images/later.png';

    FileSystem.downloadAsync.mockImplementation(async (remoteUrl: string, dest: string) => {
      mockDownloadCalls.push({ remoteUrl, dest });
      if (String(remoteUrl).includes('demo.mp4')) {
        events.push('video-start');
        await new Promise((resolve) => setTimeout(resolve, 20));
        events.push('video-done');
      } else if (String(remoteUrl).includes('later.png')) {
        events.push('later-start');
        await new Promise((resolve) => setTimeout(resolve, 80));
        events.push('later-done');
      } else {
        events.push('start-asset');
      }
      mockFiles.set(dest, { exists: true, size: 1024 });
      return { status: 200, uri: dest };
    });

    const laterAsset: CmsBookMediaAssetRef = {
      key: 'pages.later-1.image',
      mediaId: 'img-9',
      url: laterUrl,
      updatedAt: '2026-07-08T09:03:00.000Z',
      kind: 'image',
    };

    await preloadCmsBookPackAssets({
      bookId: 'book-e2e-near-video',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: [...sampleAssets, laterAsset],
      pages: [
        {
          pageId: 'cover-1',
          type: 'cover',
          order: 1,
          title: 'Cover',
          media: {
            imageMedia: { url: sampleAssets[0].url },
            audioMedia: { url: sampleAssets[1].url },
          },
        },
        {
          pageId: 'demo-1',
          type: 'demo',
          order: 2,
          title: 'Demo',
          media: { videoMedia: { url: sampleAssets[2].url } },
        },
        {
          pageId: 'later-1',
          type: 'content',
          order: 3,
          title: 'Later',
          media: { imageMedia: { url: laterUrl } },
        },
      ] as never,
      mode: 'progressive',
      concurrency: { imageAudio: 2, video: 1 },
    });

    expect(events.indexOf('video-start')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('later-done')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('video-start')).toBeLessThan(events.indexOf('later-done'));
  });

  it('lookahead prefetch skips distant pages and does not save a full pack', async () => {
    const laterUrl = 'https://cdn.riseupkids.test/uploads/media/images/later.png';
    const laterAsset: CmsBookMediaAssetRef = {
      key: 'pages.later-1.image',
      mediaId: 'img-9',
      url: laterUrl,
      updatedAt: '2026-07-08T09:03:00.000Z',
      kind: 'image',
    };

    await preloadCmsBookPackAssets({
      bookId: 'book-e2e-lookahead',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: [...sampleAssets, laterAsset],
      pages: [
        {
          pageId: 'cover-1',
          type: 'cover',
          order: 1,
          title: 'Cover',
          media: {
            imageMedia: { url: sampleAssets[0].url },
            audioMedia: { url: sampleAssets[1].url },
          },
        },
        {
          pageId: 'demo-1',
          type: 'demo',
          order: 2,
          title: 'Demo',
          media: { videoMedia: { url: sampleAssets[2].url } },
        },
        {
          pageId: 'later-1',
          type: 'content',
          order: 3,
          title: 'Later',
          media: { imageMedia: { url: laterUrl } },
        },
      ] as never,
      mode: 'progressive',
      maxPageLookahead: 1,
    });

    expect(mockDownloadCalls.some(({ remoteUrl }) => String(remoteUrl).includes('later.png'))).toBe(
      false
    );
    expect(mockDownloadCalls.some(({ remoteUrl }) => String(remoteUrl).includes('demo.mp4'))).toBe(
      true
    );
    const saved = await loadBookPackManifest('book-e2e-lookahead');
    expect(saved).toBeNull();
  });

  it('joins an in-flight pack session instead of downloading twice', async () => {
    const FileSystem = require('expo-file-system/legacy');
    FileSystem.downloadAsync.mockImplementation(async (remoteUrl: string, dest: string) => {
      mockDownloadCalls.push({ remoteUrl, dest });
      await new Promise((resolve) => setTimeout(resolve, 25));
      mockFiles.set(dest, { exists: true, size: 1024 });
      return { status: 200, uri: dest };
    });

    const options = {
      bookId: 'book-e2e-join',
      contentVersion: '1:2026-07-08T10:00:00.000Z',
      assets: sampleAssets,
    };

    const first = preloadCmsBookPackAssets(options);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = preloadCmsBookPackAssets(options);
    await Promise.all([first, second]);

    expect(mockDownloadCalls.length).toBe(3);
  });

  it('does not treat a cover-only pack as fully restored for the whole book', async () => {
    const bookId = 'book-e2e-partial-pack';
    const contentVersion = '1:2026-07-08T10:00:00.000Z';
    const coverDest = 'file:///mock-doc/cms-book-packs/book-e2e-partial-pack/pages.cover-1.image.png';
    mockFiles.set(coverDest, { exists: true, size: 1024 });
    mockFiles.set('file:///mock-doc/cms-book-packs/book-e2e-partial-pack/pack-manifest.json', {
      exists: true,
      contents: JSON.stringify({
        bookId,
        contentVersion,
        savedAt: '2026-07-08T10:00:00.000Z',
        assets: {
          'pages.cover-1.image': {
            assetKey: 'pages.cover-1.image',
            remoteUrl: sampleAssets[0].url,
            localUri: coverDest,
            mediaId: 'img-1',
            mediaUpdatedAt: '2026-07-08T09:00:00.000Z',
            bytes: 1024,
          },
        },
      }),
    });

    const result = await preloadCmsBookPackAssets({
      bookId,
      contentVersion,
      assets: sampleAssets,
    });

    expect(result.restoredFromPack).toBe(false);
    expect(mockDownloadCalls.some(({ remoteUrl }) => String(remoteUrl).includes('demo.mp4'))).toBe(
      true
    );
  });
});
