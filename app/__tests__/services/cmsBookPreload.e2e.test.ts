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
    expect(mockDownloadCalls.length).toBe(2);
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
});
