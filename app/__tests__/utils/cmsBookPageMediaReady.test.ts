import type { CmsBookMediaAssetRef } from '@/services/cmsBookMediaManifest';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import {
  collectRequiredCmsPageMediaUrls,
  getCmsNextGateTimeoutMs,
  isCmsPageMediaReady,
  isCmsVideoHeavyPage,
  prioritizeCmsBookAssetsForProgressivePreload,
  CMS_NEXT_GATE_TIMEOUT_MS,
  CMS_NEXT_GATE_TIMEOUT_VIDEO_MS,
} from '@/utils/cmsBookPageMediaReady';

jest.mock('@/config', () => ({
  BACKEND_ORIGIN: 'https://cdn.riseupkids.test',
}));

function page(partial: Partial<CmsPlayablePage> & { pageId: string; type: string }): CmsPlayablePage {
  return {
    order: 1,
    title: partial.title || partial.pageId,
    ...partial,
  } as CmsPlayablePage;
}

describe('cmsBookPageMediaReady', () => {
  describe('isCmsVideoHeavyPage', () => {
    it('marks demo and reward pages as video-heavy', () => {
      expect(isCmsVideoHeavyPage(page({ pageId: 'd1', type: 'demo' }))).toBe(true);
      expect(isCmsVideoHeavyPage(page({ pageId: 'd2', type: 'activity_demo_video' }))).toBe(true);
      expect(isCmsVideoHeavyPage(page({ pageId: 'r1', type: 'reward' }))).toBe(true);
      expect(isCmsVideoHeavyPage(page({ pageId: 'e1', type: 'end' }))).toBe(true);
      expect(isCmsVideoHeavyPage(page({ pageId: 'c1', type: 'content' }))).toBe(false);
    });
  });

  describe('isCmsPageMediaReady', () => {
    it('requires local video before unlocking a demo page', () => {
      const demo = page({
        pageId: 'demo-1',
        type: 'demo',
        media: {
          videoMedia: { url: 'https://cdn.riseupkids.test/uploads/media/videos/demo.mp4' },
        },
      });
      const remote = 'https://cdn.riseupkids.test/uploads/media/videos/demo.mp4';

      expect(isCmsPageMediaReady(demo, {})).toBe(false);
      expect(isCmsPageMediaReady(demo, { [remote]: remote })).toBe(false);
      expect(
        isCmsPageMediaReady(demo, { [remote]: 'file:///mock-doc/cms-book-packs/demo.mp4' })
      ).toBe(true);
    });

    it('allows remote stream after gate timeout flag', () => {
      const demo = page({
        pageId: 'demo-1',
        type: 'demo',
        media: {
          videoMedia: { url: 'https://cdn.riseupkids.test/uploads/media/videos/demo.mp4' },
        },
      });
      const remote = 'https://cdn.riseupkids.test/uploads/media/videos/demo.mp4';
      expect(
        isCmsPageMediaReady(demo, { [remote]: remote }, { allowRemoteStream: true })
      ).toBe(true);
    });

    it('treats bunny embed URLs as ready without local cache', () => {
      const demo = page({
        pageId: 'demo-embed',
        type: 'demo',
        media: {
          videoMedia: {
            url: 'https://iframe.mediadelivery.net/embed/123/abc',
          },
        },
      });
      expect(isCmsPageMediaReady(demo, {})).toBe(true);
    });
  });

  describe('prioritizeCmsBookAssetsForProgressivePreload', () => {
    it('downloads page 0 images before later demo videos', () => {
      const pages = [
        page({
          pageId: 'cover-1',
          type: 'cover',
          media: { imageMedia: { url: 'https://cdn.riseupkids.test/img/cover.png' } },
        }),
        page({
          pageId: 'demo-1',
          type: 'demo',
          media: { videoMedia: { url: 'https://cdn.riseupkids.test/videos/demo.mp4' } },
        }),
      ];
      const assets: CmsBookMediaAssetRef[] = [
        {
          key: 'pages.demo-1.video',
          mediaId: 'v1',
          url: 'https://cdn.riseupkids.test/videos/demo.mp4',
          updatedAt: null,
          kind: 'video',
        },
        {
          key: 'pages.cover-1.image',
          mediaId: 'i1',
          url: 'https://cdn.riseupkids.test/img/cover.png',
          updatedAt: null,
          kind: 'image',
        },
      ];

      const ordered = prioritizeCmsBookAssetsForProgressivePreload(assets, pages, 0);
      expect(ordered[0].key).toBe('pages.cover-1.image');
      expect(ordered[1].key).toBe('pages.demo-1.video');
    });

    it('promotes next-page demo video when focus is on previous page', () => {
      const pages = [
        page({ pageId: 'intro-1', type: 'cover' }),
        page({ pageId: 'demo-1', type: 'demo' }),
        page({ pageId: 'act-1', type: 'content' }),
      ];
      const assets: CmsBookMediaAssetRef[] = [
        {
          key: 'pages.act-1.image',
          mediaId: 'i2',
          url: 'https://cdn.riseupkids.test/img/act.png',
          updatedAt: null,
          kind: 'image',
        },
        {
          key: 'pages.demo-1.video',
          mediaId: 'v1',
          url: 'https://cdn.riseupkids.test/videos/demo.mp4',
          updatedAt: null,
          kind: 'video',
        },
      ];

      const ordered = prioritizeCmsBookAssetsForProgressivePreload(assets, pages, 0);
      expect(ordered[0].key).toBe('pages.demo-1.video');
    });

    it('maxPageLookahead drops assets beyond the start window', () => {
      const pages = [
        page({ pageId: 'cover-1', type: 'cover' }),
        page({ pageId: 'demo-1', type: 'demo' }),
        page({ pageId: 'later-1', type: 'content' }),
      ];
      const assets: CmsBookMediaAssetRef[] = [
        {
          key: 'pages.cover-1.image',
          mediaId: 'i1',
          url: 'https://cdn.riseupkids.test/img/cover.png',
          updatedAt: null,
          kind: 'image',
        },
        {
          key: 'pages.demo-1.video',
          mediaId: 'v1',
          url: 'https://cdn.riseupkids.test/videos/demo.mp4',
          updatedAt: null,
          kind: 'video',
        },
        {
          key: 'pages.later-1.image',
          mediaId: 'i2',
          url: 'https://cdn.riseupkids.test/img/later.png',
          updatedAt: null,
          kind: 'image',
        },
      ];

      const ordered = prioritizeCmsBookAssetsForProgressivePreload(assets, pages, 0, 1);
      expect(ordered.map((asset) => asset.key)).toEqual([
        'pages.cover-1.image',
        'pages.demo-1.video',
      ]);
    });
  });

  describe('timeouts', () => {
    it('uses a longer next-gate timeout for video-heavy pages', () => {
      expect(getCmsNextGateTimeoutMs(page({ pageId: 'c', type: 'content' }))).toBe(
        CMS_NEXT_GATE_TIMEOUT_MS
      );
      expect(getCmsNextGateTimeoutMs(page({ pageId: 'd', type: 'demo' }))).toBe(
        CMS_NEXT_GATE_TIMEOUT_VIDEO_MS
      );
    });
  });

  describe('collectRequiredCmsPageMediaUrls', () => {
    it('collects intro image + bgm', () => {
      const intro = page({
        pageId: 'intro-1',
        type: 'cover',
        media: {
          imageMedia: { url: 'https://cdn.riseupkids.test/img/cover.png' },
          audioMedia: { url: 'https://cdn.riseupkids.test/audio/bgm.mp3' },
        },
      });
      const urls = collectRequiredCmsPageMediaUrls(intro);
      expect(urls.some((u) => u.includes('cover.png'))).toBe(true);
      expect(urls.some((u) => u.includes('bgm.mp3'))).toBe(true);
    });
  });
});
