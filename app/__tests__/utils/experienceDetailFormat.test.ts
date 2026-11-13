/**
 * The pure helpers behind the experience page: its routes, what the printable button may open (and what it
 * refuses to open), and the page's view of one experience.
 */
import {
  EXPERIENCE_DETAIL_COPY,
  experienceDetailRoute,
  experienceListRoute,
  exploreRoute,
  homeRoute,
  printableAction,
  toExperienceView,
} from '@/utils/experienceFormat';

describe('routes', () => {
  it('one experience is a sibling screen of explore, named explore-experience-detail, with its id in the query', () => {
    expect(experienceDetailRoute('kid1', 'abc')).toBe('/child/kid1/explore-experience-detail?uuid=abc');
  });

  it('encodes the id so it can never change the route', () => {
    expect(experienceDetailRoute('kid1', 'a&b=c d')).toBe('/child/kid1/explore-experience-detail?uuid=a%26b%3Dc%20d');
  });

  it('the detail route contains /explore and no /experience, so the footer keeps Explore lit', () => {
    const path = experienceDetailRoute('kid1', 'abc').split('?')[0];
    expect(path).toContain('/explore');
    expect(path).not.toContain('/experience');
    expect(path.startsWith(exploreRoute('kid1'))).toBe(true);
  });

  it('home, and the list', () => {
    expect(homeRoute('kid1')).toBe('/child/kid1/home');
    expect(experienceListRoute('kid1')).toBe('/child/kid1/explore-experience');
  });
});

describe('printableAction', () => {
  const link = { image: null, kind: 'link' as const, url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print recipe here' };

  it("is the address, the kind and the server's button text", () => {
    expect(printableAction(link)).toEqual({ url: 'https://riseup.kids/a.pdf', kind: 'link', fileName: '', label: 'Print recipe here' });
  });

  it('keeps the file name of an uploaded file', () => {
    const file = { ...link, kind: 'file' as const, url: 'https://media.riseup.kids/f/recipe.pdf', fileName: 'recipe.pdf' };
    expect(printableAction(file)).toMatchObject({ kind: 'file', fileName: 'recipe.pdf' });
  });

  it.each([[''], ['   '], [undefined], [null]])('falls back to "Print here" for the button text %j', (button) => {
    expect(printableAction({ ...link, button: button as string })?.label).toBe(EXPERIENCE_DETAIL_COPY.defaultPrintButton);
    expect(EXPERIENCE_DETAIL_COPY.defaultPrintButton).toBe('Print here');
  });

  it('trims the button text and the address', () => {
    expect(printableAction({ ...link, button: '  Print  ', url: '  https://riseup.kids/a.pdf ' })).toMatchObject({
      label: 'Print',
      url: 'https://riseup.kids/a.pdf',
    });
  });

  it.each(['riseup.kids', 'www.riseup.kids', 'app.riseup.kids', 'RISEUP.KIDS'])('a link may point at %s', (host) => {
    expect(printableAction({ ...link, url: `https://${host}/a.pdf` })).not.toBeNull();
  });

  it.each([
    ['another site', 'https://evil.example.com/a.pdf'],
    ['a lookalike host', 'https://riseup.kids.evil.example.com/a.pdf'],
    ['a host that only ends the same way', 'https://notriseup.kids/a.pdf'],
    ['an unknown subdomain', 'https://media.riseup.kids/a.pdf'],
    ['a name in the path only', 'https://evil.example.com/riseup.kids/a.pdf'],
    ['an address with a user name', 'https://riseup.kids@evil.example.com/a.pdf'],
  ])('a link may not point at %s', (_name, url) => {
    expect(printableAction({ ...link, url })).toBeNull();
  });

  it('an uploaded file is served by our own server, so any https address of it is opened', () => {
    expect(printableAction({ ...link, kind: 'file', url: 'https://media.riseup.kids/f/a.pdf' })).not.toBeNull();
    expect(printableAction({ ...link, kind: 'file', url: 'https://d111.cloudfront.net/f/a.pdf' })).not.toBeNull();
  });

  it.each([
    ['nothing', null],
    ['no kind (a picture alone)', { ...link, kind: null }],
    ['an unknown kind', { ...link, kind: 'other' }],
    ['an http address', { ...link, url: 'http://riseup.kids/a.pdf' }],
    ['a javascript address', { ...link, url: 'javascript:alert(1)' }],
    ['a data address', { ...link, url: 'data:text/html,hi' }],
    ['text that is not an address', { ...link, url: 'not a link' }],
    ['an empty address', { ...link, url: '' }],
    ['a missing address', { ...link, url: null }],
    ['an address that is not text', { ...link, url: 42 }],
    ['an http file address', { ...link, kind: 'file', url: 'http://media.riseup.kids/a.pdf' }],
  ])('is null for %s', (_name, printable) => {
    expect(printableAction(printable as never)).toBeNull();
  });
});

describe('toExperienceView', () => {
  const bunny = (n: number) => `https://iframe.mediadelivery.net/embed/1/v${n}`;
  const same = (path: string | null | undefined) => path ?? null;
  const detail = (overrides: Record<string, unknown> = {}) =>
    ({
      title: ' Smoothie ',
      description: ' Make it ',
      videos: [
        { id: 'a', title: 'One', embedUrl: bunny(1) },
        { id: 'b', title: 'Two', embedUrl: bunny(2) },
      ],
      printable: { image: 'https://cdn.test/p.png', kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print' },
      ...overrides,
    }) as never;

  it('trims the title and the description', () => {
    expect(toExperienceView(detail(), same)).toMatchObject({ title: 'Smoothie', description: 'Make it' });
  });

  it('keeps the videos in the order sent, each with its own key, title and address', () => {
    const { videos } = toExperienceView(detail(), same);
    expect(videos.map((v) => [v.key, v.title, v.url, v.playable])).toEqual([
      ['a', 'One', bunny(1), true],
      ['b', 'Two', bunny(2), true],
    ]);
  });

  it('bands take turns pale, cream, pale, and the printable gets the next one', () => {
    const three = { videos: [1, 2, 3].map((n) => ({ id: `v${n}`, title: `V${n}`, embedUrl: bunny(n) })) };
    const view = toExperienceView(detail(three), same);
    expect(view.videos.map((v) => v.band)).toEqual(['pale', 'cream', 'pale']);
    expect(view.printable?.band).toBe('cream');
    expect(toExperienceView(detail(), same).printable?.band).toBe('pale');
    expect(toExperienceView(detail({ videos: [] }), same).printable?.band).toBe('pale');
  });

  it('names a video with no title "Video N" (by its place)', () => {
    const { videos } = toExperienceView(detail({ videos: [{ id: 'a', title: '', embedUrl: bunny(1) }, { id: 'b', embedUrl: bunny(2) }] }), same);
    expect(videos.map((v) => v.title)).toEqual(['Video 1', 'Video 2']);
  });

  it('gives a video with no id a key from its place', () => {
    const { videos } = toExperienceView(detail({ videos: [{ title: 'x', embedUrl: bunny(1) }, { title: 'y', embedUrl: bunny(2) }] }), same);
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
    expect(toExperienceView(detail({ videos: [{ id: 'a', title: 'x', embedUrl }] }), same).videos[0].playable).toBe(false);
  });

  it('accepts both Bunny hosts', () => {
    const { videos } = toExperienceView(detail({ videos: [{ id: 'a', title: 'x', embedUrl: 'https://player.mediadelivery.net/embed/1/x' }] }), same);
    expect(videos[0].playable).toBe(true);
  });

  it("turns the printable's picture path into an address with the resolver it is given", () => {
    const resolve = jest.fn((p: string | null | undefined) => (p ? `https://resolved.test${p}` : null));
    const view = toExperienceView(detail({ printable: { image: '/uploads/p.png', kind: null, url: null, button: '' } }), resolve);
    expect(resolve).toHaveBeenCalledWith('/uploads/p.png');
    expect(view.printable?.imageUrl).toBe('https://resolved.test/uploads/p.png');
  });

  it('has a printable for a picture and a button, a picture alone, or a button alone', () => {
    expect(toExperienceView(detail(), same).printable).toMatchObject({ imageUrl: 'https://cdn.test/p.png', action: { label: 'Print' } });
    expect(toExperienceView(detail({ printable: { image: 'https://cdn.test/p.png', kind: null, url: null, button: '' } }), same).printable).toMatchObject({
      imageUrl: 'https://cdn.test/p.png',
      action: null,
    });
    expect(
      toExperienceView(detail({ printable: { image: null, kind: 'link', url: 'https://riseup.kids/a.pdf', button: '' } }), same).printable
    ).toMatchObject({ imageUrl: null, action: { label: 'Print here' } });
  });

  it('has no printable when there is no picture and nothing safe to open', () => {
    expect(toExperienceView(detail({ printable: null }), same).printable).toBeNull();
    expect(toExperienceView(detail({ printable: { image: null, kind: 'link', url: 'http://x.test/a', button: 'Print' } }), same).printable).toBeNull();
    expect(toExperienceView(detail({ printable: { image: null, kind: 'link', url: 'https://evil.example.com/a', button: 'Print' } }), same).printable).toBeNull();
    expect(toExperienceView(detail({ printable: { image: null, kind: null, url: null, button: '' } }), same).printable).toBeNull();
  });

  it.each([[null], [undefined], [{}]])('does not break on %j', (data) => {
    expect(toExperienceView(data as never, same)).toEqual({ title: '', description: '', videos: [], printable: null });
  });

  it('does not break when the videos are not a list', () => {
    expect(toExperienceView(detail({ videos: 'nope' }), same).videos).toEqual([]);
  });
});
