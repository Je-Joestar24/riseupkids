/**
 * What a book needs to download and which page needs what: built from the server's media list (the same one the
 * phone app uses), topped up from the pages themselves.
 */
import { describe, it, expect } from 'vitest';
import {
  buildCmsBookMediaPlan,
  compareCmsAssetPriority,
  CMS_NEXT_GATE_TIMEOUT_MS,
  CMS_NEXT_GATE_TIMEOUT_VIDEO_MS,
  getCmsNextGateTimeoutMs,
  getCmsPageBand,
  isCmsVideoHeavyPage,
  isStreamOnlyCmsMediaUrl,
  UNKNOWN_PAGE_INDEX,
} from './cmsBookMediaPlan';
import { collectCmsPageMediaUrls, collectCmsPlayerMediaUrls } from './cmsPlayerMedia';

const U = (name) => `https://cdn.test/${name}`;

const pages = [
  { pageId: 'cover', type: 'cover', order: 1, imageUrl: U('cover.jpg'), introBackgroundMusicUrl: U('music.mp3') },
  { pageId: 'p2', type: 'content', order: 2, imageUrl: U('p2.jpg'), audioUrl: U('p2.mp3') },
  { pageId: 'demo', type: 'activity_demo_video', order: 3, imageUrl: U('demo.jpg'), videoUrl: U('demo.mp4') },
  { pageId: 'drag', type: 'activity_drag_2x1', order: 4, imageUrl: U('drag.jpg'), answerAudioOne: U('a1.mp3'), answerAudioTwo: U('a2.mp3') },
  { pageId: 'end', type: 'end', order: 5, imageUrl: U('end.jpg'), videoUrl: U('reward.mp4'), rewardAudioUrl: U('cheer.mp3') },
];

describe('collecting what each page needs', () => {
  it('one page lists its own picture, sound and video', () => {
    expect(collectCmsPageMediaUrls(pages[1]).sort()).toEqual([U('p2.jpg'), U('p2.mp3')].sort());
    expect(collectCmsPageMediaUrls(pages[2]).sort()).toEqual([U('demo.jpg'), U('demo.mp4')].sort());
  });

  it('the intro page includes the intro music; the reward page its cheer', () => {
    expect(collectCmsPageMediaUrls(pages[0])).toContain(U('music.mp3'));
    expect(collectCmsPageMediaUrls(pages[4])).toEqual(expect.arrayContaining([U('reward.mp4'), U('cheer.mp3')]));
  });

  it('a missing page needs nothing', () => {
    expect(collectCmsPageMediaUrls(null)).toEqual([]);
    expect(collectCmsPageMediaUrls(undefined)).toEqual([]);
  });

  it('the whole-book list the admin tester uses is exactly the pages together (unchanged behaviour)', () => {
    const whole = collectCmsPlayerMediaUrls(pages, {});
    const perPage = new Set(pages.flatMap((p) => collectCmsPageMediaUrls(p)));
    expect(new Set(whole)).toEqual(perPage);
  });

  it('the whole-book list still adds the book-level music and cover picture', () => {
    const whole = collectCmsPlayerMediaUrls(pages, { introBackgroundMusicUrl: U('book-music.mp3'), coverImageUrl: U('card.jpg') });
    expect(whole).toEqual(expect.arrayContaining([U('book-music.mp3'), U('card.jpg')]));
  });
});

describe('the plan', () => {
  it('without a server list, it is built from the pages and every file knows its page', () => {
    const plan = buildCmsBookMediaPlan({ book: { id: 'b1' }, pages });

    expect(plan.bookId).toBe('b1');
    expect(plan.contentVersion).toBeNull();
    const demoVideo = plan.assets.find((a) => a.url === U('demo.mp4'));
    expect(demoVideo).toMatchObject({ kind: 'video', pageIndex: 2 });
    expect(plan.assets.find((a) => a.url === U('p2.mp3'))).toMatchObject({ kind: 'audio', pageIndex: 1 });
    expect(plan.assets.find((a) => a.url === U('cover.jpg'))).toMatchObject({ kind: 'image', pageIndex: 0 });
    expect(plan.pageUrls).toHaveLength(pages.length);
    expect(plan.pageUrls[2].sort()).toEqual([U('demo.jpg'), U('demo.mp4')].sort());
  });

  it('uses the server list: version, keys, last-change date and the type it declares', () => {
    const book = {
      id: 'b1',
      contentVersion: '3:2026-05-01T00:00:00.000Z',
      mediaManifest: {
        bookId: 'b1',
        contentVersion: '3:2026-05-01T00:00:00.000Z',
        assets: [
          { key: 'pages.p2.audio', url: U('p2.mp3'), kind: 'audio', updatedAt: '2026-04-01T00:00:00.000Z', mediaId: 'm1' },
          { key: 'pages.demo.video', url: U('demo.mp4'), kind: 'video', updatedAt: '2026-04-02T00:00:00.000Z', mediaId: 'm2' },
        ],
      },
    };
    const plan = buildCmsBookMediaPlan({ book, pages });

    expect(plan.contentVersion).toBe('3:2026-05-01T00:00:00.000Z');
    expect(plan.assets.find((a) => a.url === U('p2.mp3'))).toMatchObject({ key: 'pages.p2.audio', updatedAt: '2026-04-01T00:00:00.000Z', pageIndex: 1 });
    expect(plan.assets.find((a) => a.url === U('demo.mp4'))).toMatchObject({ key: 'pages.demo.video', pageIndex: 2 });
  });

  it('a file listed only by the server (not on the page data) is still downloaded and belongs to its page', () => {
    const book = {
      id: 'b1',
      mediaManifest: { assets: [{ key: 'pages.p2.options[a].audio', url: U('extra.mp3'), kind: 'audio' }] },
    };
    const plan = buildCmsBookMediaPlan({ book, pages });

    expect(plan.assets.find((a) => a.url === U('extra.mp3'))).toMatchObject({ pageIndex: 1, kind: 'audio' });
    expect(plan.pageUrls[1]).toContain(U('extra.mp3'));
  });

  it('a file only the page data names (the server list misses it) is still tracked', () => {
    const book = { id: 'b1', mediaManifest: { assets: [{ key: 'pages.p2.audio', url: U('p2.mp3'), kind: 'audio' }] } };
    const plan = buildCmsBookMediaPlan({ book, pages });

    expect(plan.assets.map((a) => a.url)).toContain(U('p2.jpg'));
    expect(plan.pageUrls[1]).toContain(U('p2.jpg'));
  });

  it('matches older keys made from the page order ("order-N")', () => {
    const book = { mediaManifest: { assets: [{ key: 'pages.order-4.audio', url: U('late.mp3'), kind: 'audio' }] } };
    const plan = buildCmsBookMediaPlan({ book, pages });

    expect(plan.assets.find((a) => a.url === U('late.mp3')).pageIndex).toBe(3);
  });

  it('a key that matches no page sorts after every real page and belongs to none', () => {
    const book = { mediaManifest: { assets: [{ key: 'pages.nope.audio', url: U('orphan.mp3'), kind: 'audio' }] } };
    const plan = buildCmsBookMediaPlan({ book, pages });

    expect(plan.assets[plan.assets.length - 1]).toMatchObject({ url: U('orphan.mp3'), pageIndex: UNKNOWN_PAGE_INDEX });
    plan.pageUrls.forEach((urls) => expect(urls).not.toContain(U('orphan.mp3')));
  });

  it('a file used by two pages is listed once, on the earlier page, and needed by both', () => {
    const shared = [
      { pageId: 'a', type: 'content', imageUrl: U('same.jpg') },
      { pageId: 'b', type: 'content', imageUrl: U('same.jpg') },
    ];
    const plan = buildCmsBookMediaPlan({ book: {}, pages: shared });

    expect(plan.assets.filter((a) => a.url === U('same.jpg'))).toHaveLength(1);
    expect(plan.assets[0].pageIndex).toBe(0);
    expect(plan.pageUrls[0]).toContain(U('same.jpg'));
    expect(plan.pageUrls[1]).toContain(U('same.jpg'));
  });

  it('when the server list puts a shared file on an earlier page than the page data does, the earlier page wins', () => {
    const shared = [
      { pageId: 'a', type: 'content' },
      { pageId: 'b', type: 'content' },
      { pageId: 'c', type: 'content', imageUrl: U('late.jpg') },
    ];
    const book = { mediaManifest: { assets: [{ key: 'pages.a.image', url: U('late.jpg'), kind: 'image' }] } };
    const plan = buildCmsBookMediaPlan({ book, pages: shared });

    expect(plan.assets.find((a) => a.url === U('late.jpg')).pageIndex).toBe(0);
    expect(plan.pageUrls[0]).toContain(U('late.jpg'));
    expect(plan.pageUrls[2]).toContain(U('late.jpg'));
  });

  it('a Bunny embed is never downloaded: the page data skips it, and if the server list names it, it is stream-only', () => {
    const embed = 'https://iframe.mediadelivery.net/embed/123/abc';
    const withEmbed = [{ pageId: 'v', type: 'activity_demo_video', videoUrl: embed }];

    expect(buildCmsBookMediaPlan({ book: {}, pages: withEmbed }).assets).toEqual([]);

    const listed = buildCmsBookMediaPlan({
      book: { mediaManifest: { assets: [{ key: 'pages.v.video', url: embed, kind: 'video' }] } },
      pages: withEmbed,
    });
    expect(listed.assets.find((a) => a.url === embed).streamOnly).toBe(true);
    expect(isStreamOnlyCmsMediaUrl(embed)).toBe(true);
    expect(isStreamOnlyCmsMediaUrl(U('demo.mp4'))).toBe(false);
    expect(isStreamOnlyCmsMediaUrl('')).toBe(false);
  });

  it('the declared type wins over a guess from the address; an unknown type falls back to the address', () => {
    const book = {
      mediaManifest: {
        assets: [
          { key: 'pages.p2.audio', url: U('no-extension'), kind: 'audio' },
          { key: 'pages.p2.image', url: U('thing.mp3'), kind: 'weird' },
        ],
      },
    };
    const plan = buildCmsBookMediaPlan({ book, pages });

    expect(plan.assets.find((a) => a.url === U('no-extension')).kind).toBe('audio');
    expect(plan.assets.find((a) => a.url === U('thing.mp3')).kind).toBe('audio');
  });

  it('handles no book and no pages', () => {
    expect(buildCmsBookMediaPlan()).toMatchObject({ assets: [], pageUrls: [], bookId: null, contentVersion: null });
    expect(buildCmsBookMediaPlan({ book: null, pages: null }).assets).toEqual([]);
  });
});

describe('what goes first', () => {
  it('bands: the page in view, the next, the one after, then the rest in order; pages already seen last', () => {
    expect(getCmsPageBand(4, 4)).toBe(0);
    expect(getCmsPageBand(5, 4)).toBe(1);
    expect(getCmsPageBand(6, 4)).toBe(2);
    expect(getCmsPageBand(7, 4)).toBeGreaterThan(2);
    expect(getCmsPageBand(9, 4)).toBeGreaterThan(getCmsPageBand(7, 4));
    expect(getCmsPageBand(2, 4)).toBeGreaterThan(getCmsPageBand(30, 4));
  });

  const asset = (pageIndex, kind) => ({ url: `${kind}-${pageIndex}`, kind, pageIndex });
  const order = (assets, focus) => [...assets].sort((a, b) => compareCmsAssetPriority(a, b, pages, focus)).map((a) => a.url);

  it('nearer pages first', () => {
    expect(order([asset(3, 'image'), asset(0, 'image'), asset(1, 'image')], 0)).toEqual(['image-0', 'image-1', 'image-3']);
  });

  it('on an ordinary page: picture, then sound, then video', () => {
    expect(order([asset(1, 'video'), asset(1, 'audio'), asset(1, 'image')], 0)).toEqual(['image-1', 'audio-1', 'video-1']);
  });

  it('on the page Next opens, when it is a video page, the video goes first', () => {
    // pages[2] is the demo page; with focus 1 it is "next"
    expect(order([asset(2, 'image'), asset(2, 'audio'), asset(2, 'video')], 1)).toEqual(['video-2', 'audio-2', 'image-2']);
  });

  it('moving ahead puts the new neighbourhood first', () => {
    const files = [asset(0, 'image'), asset(1, 'image'), asset(2, 'image'), asset(3, 'image')];
    expect(order(files, 0)).toEqual(['image-0', 'image-1', 'image-2', 'image-3']);
    expect(order(files, 2)).toEqual(['image-2', 'image-3', 'image-0', 'image-1']);
  });
});

describe('how long Next waits', () => {
  it('video pages are the demo and the reward', () => {
    expect(isCmsVideoHeavyPage(pages[2])).toBe(true);
    expect(isCmsVideoHeavyPage(pages[4])).toBe(true);
    expect(isCmsVideoHeavyPage(pages[1])).toBe(false);
    expect(isCmsVideoHeavyPage(null)).toBe(false);
  });

  it('10 s for an ordinary page, 12 s for a video page (the app\'s values)', () => {
    expect(CMS_NEXT_GATE_TIMEOUT_MS).toBe(10000);
    expect(CMS_NEXT_GATE_TIMEOUT_VIDEO_MS).toBe(12000);
    expect(getCmsNextGateTimeoutMs(pages[1])).toBe(10000);
    expect(getCmsNextGateTimeoutMs(pages[2])).toBe(12000);
    expect(getCmsNextGateTimeoutMs(null)).toBe(10000);
  });
});
