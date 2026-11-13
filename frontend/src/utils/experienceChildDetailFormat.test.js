/**
 * The pure helpers behind the experience detail page: its addresses, the autoplay address of a video, what the
 * printable button opens (and what it refuses to open), and the page's view of one experience.
 */
import { describe, it, expect } from 'vitest';
import {
  experienceListPath,
  explorePath,
  experienceDetailPath,
  homePath,
  withAutoplay,
  printableAction,
  toExperienceView,
  EXPERIENCE_COLORS,
  EXPERIENCE_COPY,
} from './experienceChildFormat';

describe('colours', () => {
  it("are the phone app's, exactly (the app's experience page and the admin preview use the same ones)", () => {
    expect(EXPERIENCE_COLORS).toMatchObject({
      cream: '#f1ebd4',
      pale: '#d1e2df',
      peach: '#fae6da',
      ink: '#3e7f76',
      orange: '#e98a68',
      accent: '#f2af10',
      primary: '#85c2b9',
    });
  });
});

describe('detail and home paths', () => {
  it('one experience lives under the list', () => {
    expect(experienceDetailPath('kid1', 'abc')).toBe('/child/kid1/explore/experience/abc');
  });

  it('the detail path starts with the list path and the Explore path, so the bottom bar keeps Explore lit', () => {
    expect(experienceDetailPath('kid1', 'abc').startsWith(experienceListPath('kid1'))).toBe(true);
    expect(experienceDetailPath('kid1', 'abc').startsWith(explorePath('kid1'))).toBe(true);
  });

  it('home', () => {
    expect(homePath('kid1')).toBe('/child/kid1/home');
  });
});

describe('withAutoplay', () => {
  it('turns autoplay on and keeps the address and the other settings', () => {
    const url = new URL(withAutoplay('https://iframe.mediadelivery.net/embed/1/abc?token=t'));
    expect(url.origin + url.pathname).toBe('https://iframe.mediadelivery.net/embed/1/abc');
    expect(url.searchParams.get('autoplay')).toBe('true');
    expect(url.searchParams.get('token')).toBe('t');
  });

  it('replaces an autoplay=false that is already there', () => {
    expect(new URL(withAutoplay('https://iframe.mediadelivery.net/embed/1/abc?autoplay=false')).searchParams.getAll('autoplay')).toEqual(['true']);
  });

  it('returns something that is not an address as it was', () => {
    expect(withAutoplay('nope')).toBe('nope');
  });
});

describe('printableAction', () => {
  const link = { image: null, kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print recipe here' };

  it("is the address, the kind and the server's button text", () => {
    expect(printableAction(link)).toEqual({ url: 'https://riseup.kids/a.pdf', kind: 'link', fileName: '', label: 'Print recipe here' });
  });

  it('keeps the file name of an uploaded file', () => {
    expect(printableAction({ ...link, kind: 'file', fileName: 'recipe.pdf' })).toMatchObject({ kind: 'file', fileName: 'recipe.pdf' });
  });

  it.each([[''], ['   '], [undefined], [null]])('falls back to "Print here" for the button text %j', (button) => {
    expect(printableAction({ ...link, button }).label).toBe(EXPERIENCE_COPY.defaultPrintButton);
    expect(EXPERIENCE_COPY.defaultPrintButton).toBe('Print here');
  });

  it('trims the button text and the address', () => {
    expect(printableAction({ ...link, button: '  Print  ', url: '  https://riseup.kids/a.pdf ' })).toMatchObject({
      label: 'Print',
      url: 'https://riseup.kids/a.pdf',
    });
  });

  it.each([
    ['nothing', null],
    ['no kind (a picture alone)', { ...link, kind: null }],
    ['an http address', { ...link, url: 'http://riseup.kids/a.pdf' }],
    ['a javascript address', { ...link, url: 'javascript:alert(1)' }],
    ['a data address', { ...link, url: 'data:text/html,hi' }],
    ['text that is not an address', { ...link, url: 'not a link' }],
    ['an empty address', { ...link, url: '' }],
    ['a missing address', { ...link, url: null }],
    ['an address that is not text', { ...link, url: 42 }],
  ])('is null for %s', (_name, printable) => {
    expect(printableAction(printable)).toBeNull();
  });
});

describe('toExperienceView', () => {
  const bunny = (n) => `https://iframe.mediadelivery.net/embed/1/v${n}`;
  const detail = (overrides = {}) => ({
    title: ' Smoothie ',
    description: ' Make it ',
    videos: [
      { id: 'a', title: 'One', embedUrl: bunny(1) },
      { id: 'b', title: 'Two', embedUrl: bunny(2) },
    ],
    printable: { image: 'https://cdn.test/p.png', kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print' },
    ...overrides,
  });

  it('trims the title and the description', () => {
    expect(toExperienceView(detail())).toMatchObject({ title: 'Smoothie', description: 'Make it' });
  });

  it('keeps the videos in the order sent, each with its own key, title and address', () => {
    const { videos } = toExperienceView(detail());
    expect(videos.map((v) => [v.key, v.title, v.url, v.playable])).toEqual([
      ['a', 'One', bunny(1), true],
      ['b', 'Two', bunny(2), true],
    ]);
  });

  it('colours the videos pale, cream, pale, cream, and the printable the next one in turn', () => {
    const three = { videos: [1, 2, 3].map((n) => ({ id: `v${n}`, title: `V${n}`, embedUrl: bunny(n) })) };
    const view = toExperienceView(detail(three));
    expect(view.videos.map((v) => v.band)).toEqual([EXPERIENCE_COLORS.pale, EXPERIENCE_COLORS.cream, EXPERIENCE_COLORS.pale]);
    expect(view.printable.band).toBe(EXPERIENCE_COLORS.cream);
    expect(toExperienceView(detail()).printable.band).toBe(EXPERIENCE_COLORS.pale);
    expect(toExperienceView(detail({ videos: [] })).printable.band).toBe(EXPERIENCE_COLORS.pale);
  });

  it('names a video with no title "Video N" (by its place)', () => {
    const { videos } = toExperienceView(detail({ videos: [{ id: 'a', title: '', embedUrl: bunny(1) }, { id: 'b', embedUrl: bunny(2) }] }));
    expect(videos.map((v) => v.title)).toEqual(['Video 1', 'Video 2']);
  });

  it('gives a video with no id a key from its place', () => {
    const { videos } = toExperienceView(detail({ videos: [{ title: 'x', embedUrl: bunny(1) }, { title: 'y', embedUrl: bunny(2) }] }));
    expect(videos.map((v) => v.key)).toEqual(['video-0', 'video-1']);
  });

  it.each([
    ['another host', 'https://evil.example.com/embed/1/x'],
    ['http', 'http://iframe.mediadelivery.net/embed/1/x'],
    ['javascript', 'javascript:alert(1)'],
    ['not an embed path', 'https://iframe.mediadelivery.net/other/1/x'],
    ['empty', ''],
    ['missing', undefined],
  ])('marks a video with %s as not playable', (_name, embedUrl) => {
    expect(toExperienceView(detail({ videos: [{ id: 'a', title: 'x', embedUrl }] })).videos[0].playable).toBe(false);
  });

  it('accepts both Bunny hosts', () => {
    const { videos } = toExperienceView(detail({ videos: [{ id: 'a', title: 'x', embedUrl: 'https://player.mediadelivery.net/embed/1/x' }] }));
    expect(videos[0].playable).toBe(true);
  });

  it('has a printable for a picture and a button, a picture alone, or a button alone', () => {
    expect(toExperienceView(detail()).printable).toMatchObject({ imageUrl: 'https://cdn.test/p.png', action: { label: 'Print' } });
    expect(toExperienceView(detail({ printable: { image: 'https://cdn.test/p.png', kind: null, url: null, button: '' } })).printable).toMatchObject({
      imageUrl: 'https://cdn.test/p.png',
      action: null,
    });
    expect(toExperienceView(detail({ printable: { image: null, kind: 'link', url: 'https://riseup.kids/a.pdf', button: '' } })).printable).toMatchObject({
      imageUrl: null,
      action: { label: 'Print here' },
    });
  });

  it('has no printable when there is no picture and nothing safe to open', () => {
    expect(toExperienceView(detail({ printable: null })).printable).toBeNull();
    expect(toExperienceView(detail({ printable: { image: null, kind: 'link', url: 'http://x.test/a', button: 'Print' } })).printable).toBeNull();
    expect(toExperienceView(detail({ printable: { image: null, kind: null, url: null, button: '' } })).printable).toBeNull();
  });

  it.each([[null], [undefined], [{}]])('does not break on %j', (data) => {
    expect(toExperienceView(data)).toEqual({ title: '', description: '', videos: [], printable: null });
  });

  it('does not break when the videos are not a list', () => {
    expect(toExperienceView(detail({ videos: 'nope' })).videos).toEqual([]);
  });
});
