/**
 * End to end, on the real components (react-test-renderer): the page of one experience under Explore, opened
 * from the list. The real screen, hook, store, service, parts and the cover component are used. Only the edges
 * are replaced: the network (a fake backend behind the API client), the router, the in-app browser, the native
 * image view, the icons and the Bunny player (a marker that records its props).
 *
 * What matters most:
 *  - a card on the list opens exactly its own experience (one request, for that id);
 *  - the page shows the title, the description, every video in the admin's order (one player at a time, created
 *    only by a tap and stopped when the screen is covered), the printable with a button that opens the right
 *    address in the in-app browser, and the ways back and home;
 *  - nothing unsafe is ever opened or framed (a printable link off our domain, a video that is not Bunny);
 *  - the first visit shows a placeholder, later visits show the last answer at once and refresh quietly;
 *  - "not available" and "could not load" are different screens; offline reloads when the connection returns.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import ChildExploreExperienceScreen from '@/app/child/[id]/explore-experience';
import ChildExploreExperienceDetailScreen from '@/app/child/[id]/explore-experience-detail';
import { getActiveFromPath } from '@/components/child/common/footer-navigation';
import { ExperienceCards } from '@/components/child/experiences/experience-cards';
import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { useExperienceStore } from '@/store/experienceStore';
import { useNetworkStore } from '@/store/networkStore';
import { ApiRequestError } from '@/utils/networkError';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;
let mockChildId: string | undefined = 'child1';
let mockUuid: string | undefined;
// Focus handling: the screen registers a callback that runs when it comes to the front and returns a cleanup that
// runs when another screen covers it. The tests call these to simulate switching screens.
let mockFocusCallback: (() => void | (() => void)) | undefined;
let mockFocusCleanup: (() => void) | undefined;

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useLocalSearchParams: () => ({ id: mockChildId, uuid: mockUuid }),
    useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: () => mockCanGoBack }),
    usePathname: () => '/child/child1/explore-experience-detail',
    useFocusEffect: (callback: () => void | (() => void)) => {
      useEffect(() => {
        mockFocusCallback = callback;
        mockFocusCleanup = callback() as (() => void) | undefined;
      }, [callback]);
    },
  };
});

const mockOpenBrowser = jest.fn((_url: string) => Promise.resolve({ type: 'dismiss' }));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (url: string) => mockOpenBrowser(url),
}));

jest.mock('@expo/vector-icons', () => {
  const { createElement } = jest.requireActual('react');
  return { MaterialCommunityIcons: (props: object) => createElement('Icon', props) };
});

// The native image view: a marker element that records exactly what it was given.
jest.mock('expo-image', () => {
  const { createElement } = jest.requireActual('react');
  return {
    Image: Object.assign((props: object) => createElement('NativeImage', props), {
      prefetch: jest.fn(() => Promise.resolve(true)),
    }),
  };
});

// The real player is a native WebView; here it is a marker element that records its props.
jest.mock('@/components/child/common/bunny-embed-webview', () => {
  const { createElement } = jest.requireActual('react');
  return { BunnyEmbedWebView: (props: object) => createElement('BunnyPlayer', props) };
});

// The network: what the server answers to GET /experiences and GET /experiences/:uuid.
const mockGet = jest.fn();
jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const UUID_1 = '00000000-0000-4000-8000-000000000001';
const UUID_2 = '00000000-0000-4000-8000-000000000002';
const embed = (n: number) => `https://iframe.mediadelivery.net/embed/660084/video-${n}`;

const mounted: ReactTestRenderer[] = [];

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  mounted.push(tree);
  return tree;
}

const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};
const open = async (element: React.ReactElement) => {
  const tree = render(element);
  await settle();
  return tree;
};
const openDetail = (uuid: string | undefined = UUID_1) => {
  mockUuid = uuid;
  return open(<ChildExploreExperienceDetailScreen />);
};

const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' || typeof children === 'number' ? String(children) : '';
const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(Text).map((node: ReactTestInstance) => flat(node.props.children));
const hasText = (tree: ReactTestRenderer, text: string) => texts(tree).includes(text);

const pressable = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
function press(tree: ReactTestRenderer, label: string) {
  const target = pressable(tree, label);
  expect(target).toBeDefined();
  act(() => {
    target.props.onPress();
  });
}
const headers = (tree: ReactTestRenderer) =>
  tree.root
    .findAll((node: ReactTestInstance) => node.props.accessibilityRole === 'header' && node.type === Text)
    .map((node) => flat(node.props.children));

const players = (tree: ReactTestRenderer) => tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'BunnyPlayer');
const nativeImages = (tree: ReactTestRenderer) => tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'NativeImage');
const playButtons = (tree: ReactTestRenderer) =>
  [
    ...new Set(
      tree.root
        .findAll((node: ReactTestInstance) => typeof node.props.accessibilityLabel === 'string' && /^Play /.test(node.props.accessibilityLabel) && typeof node.props.onPress === 'function')
        .map((node) => node.props.accessibilityLabel as string)
    ),
  ];
const bands = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => typeof node.props.testID === 'string' && node.props.testID.startsWith('band-') && typeof node.type === 'string');
const bandNames = (tree: ReactTestRenderer) => bands(tree).map((band) => (band.props.testID as string).slice('band-'.length));
const bandColor = (tree: ReactTestRenderer, name: string) => {
  const band = bands(tree).find((node) => node.props.testID === `band-${name}`);
  return band ? (StyleSheet.flatten(band.props.style) as { backgroundColor?: string }).backgroundColor : undefined;
};
const skeleton = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === 'Loading experience' && typeof node.type === 'string');

const CREAM = '#f1ebd4';
const PALE = '#d1e2df';
const PEACH = '#fae6da';

const video = (n: number, overrides: Record<string, unknown> = {}) => ({ id: `v${n}`, title: `Video title ${n}`, embedUrl: embed(n), position: n, ...overrides });
const card = (uuid: string, n: number) => ({
  uuid,
  title: `Experience ${n}`,
  description: `About experience ${n}`,
  coverImage: `https://cdn.test/experiences/images/${n}.png`,
  videoCount: 2,
});
const detailOf = (uuid: string, overrides: Record<string, unknown> = {}) => ({
  uuid,
  title: 'Strawberry Banana Smoothie',
  description: 'Learn the fruit words, then cook along.',
  coverImage: 'https://cdn.test/experiences/images/1.png',
  videos: [video(1), video(2)],
  printable: {
    image: 'https://cdn.test/experiences/printable/recipe.png',
    kind: 'link',
    url: 'https://riseup.kids/downloads/recipe.pdf',
    fileName: '',
    button: 'Print recipe here',
  },
  ...overrides,
});
const withPrintable = (printable: unknown) => ({ printable });

const backend: { list: () => Promise<unknown>; detail: (uuid: string) => Promise<unknown>; requests: string[] } = {
  list: async () => ({ success: true, data: [] }),
  detail: async () => ({ success: true, data: {} }),
  requests: [],
};
const answerDetail = (data: unknown) => ({ success: true, data });
const notFoundError = () => new ApiRequestError('Experience not found.', { status: 404 });
const serverError = (message = 'Server exploded') => new ApiRequestError(message, { status: 500 });
const offlineError = () => ({ code: 'ERR_NETWORK', message: 'Network Error' });

beforeEach(() => {
  jest.clearAllMocks();
  mockChildId = 'child1';
  mockUuid = UUID_1;
  mockCanGoBack = true;
  mockFocusCallback = undefined;
  mockFocusCleanup = undefined;
  backend.requests = [];
  backend.list = async () => ({ success: true, data: [card(UUID_1, 1), card(UUID_2, 2)] });
  backend.detail = async (uuid) => answerDetail(detailOf(uuid));
  mockGet.mockImplementation(async (url: string) => {
    backend.requests.push(url);
    if (url === '/experiences') return backend.list();
    const match = /^\/experiences\/(.+)$/.exec(url);
    if (match) return backend.detail(decodeURIComponent(match[1]));
    throw new Error(`unexpected request ${url}`);
  });
  useExperienceStore.getState().reset();
  useNetworkStore.setState({ reconnectGeneration: 0 });
});

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((tree) => {
      try {
        tree.unmount();
      } catch {
        // already unmounted by the test
      }
    });
  });
});

describe('opening an experience from the list', () => {
  it('pressing a card opens that experience, and the page asks the server for that one only', async () => {
    const list = await open(<ChildExploreExperienceScreen />);
    press(list, 'Experience 2');
    expect(mockPush).toHaveBeenCalledWith(`/child/child1/explore-experience-detail?uuid=${UUID_2}`);

    backend.requests = [];
    await openDetail(UUID_2);
    expect(backend.requests).toEqual([`/experiences/${UUID_2}`]);
  });

  it('asks the server once, and never for the list', async () => {
    await openDetail();
    expect(backend.requests).toEqual([`/experiences/${UUID_1}`]);
  });

  it('shows nothing and asks for nothing without a child id or an experience id', async () => {
    mockChildId = undefined;
    const noChild = await openDetail();
    expect(noChild.toJSON()).toBeNull();

    mockChildId = 'child1';
    const noUuid = await openDetail('');
    expect(noUuid.toJSON()).toBeNull();
    expect(backend.requests).toEqual([]);
  });
});

describe('the list without a child', () => {
  it('has no pressable cards (nowhere to go, never /child/undefined)', async () => {
    const tree = await open(<ExperienceCards />);
    expect(tree.root.findAll((n: ReactTestInstance) => n.props.testID === 'experience-card' && typeof n.type === 'string')).toHaveLength(2);
    expect(tree.root.findAll((n: ReactTestInstance) => n.props.accessibilityLabel === 'Experience 1' && typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('the page', () => {
  it('has the title as a header', async () => {
    const tree = await openDetail();
    expect(headers(tree)).toContain('Strawberry Banana Smoothie');
  });

  it("shows the experience's own description under the title instead of the app's lines", async () => {
    const tree = await openDetail();
    expect(hasText(tree, 'Learn the fruit words, then cook along.')).toBe(true);
    expect(hasText(tree, 'Your child will be bilingual, naturally.')).toBe(false);
  });

  it("without a description it shows the app's own two lines", async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, { description: '' }));
    const tree = await openDetail();
    expect(hasText(tree, 'Your child will be bilingual, naturally.')).toBe(true);
    expect(hasText(tree, 'How? By living the English language.')).toBe(true);
  });

  it('ends with the closing message, the stars line and the Back to home button', async () => {
    const tree = await openDetail();
    expect(headers(tree)).toContain('You are learning, one step at a time.');
    expect(texts(tree).some((t) => t.includes('Reach for the stars'))).toBe(true);
    expect(pressable(tree, 'Back to home')).toBeDefined();
  });

  it("draws the sections in the app's order: title, videos, printable, closing", async () => {
    const tree = await openDetail();
    expect(bandNames(tree)).toEqual(['Title', 'Video title 1', 'Video title 2', 'Printable', 'Closing message']);
  });

  it('colours the bands like the client template: cream title, pale then cream videos, the next in turn, peach closing', async () => {
    const tree = await openDetail();
    expect(bandColor(tree, 'Title')).toBe(CREAM);
    expect(bandColor(tree, 'Video title 1')).toBe(PALE);
    expect(bandColor(tree, 'Video title 2')).toBe(CREAM);
    expect(bandColor(tree, 'Printable')).toBe(PALE);
    expect(bandColor(tree, 'Closing message')).toBe(PEACH);
  });

  it('keeps taking turns with three videos, and the printable gets cream', async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, { videos: [video(1), video(2), video(3)] }));
    const tree = await openDetail();
    expect(bandColor(tree, 'Video title 3')).toBe(PALE);
    expect(bandColor(tree, 'Printable')).toBe(CREAM);
  });
});

describe('the videos', () => {
  it('start as play buttons named after the video, and no player is created yet', async () => {
    const tree = await openDetail();
    expect(playButtons(tree)).toEqual(['Play Video title 1', 'Play Video title 2']);
    expect(players(tree)).toHaveLength(0);
  });

  it('keep the order the server sent', async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, { videos: [video(3), video(1), video(2)] }));
    const tree = await openDetail();
    expect(playButtons(tree)).toEqual(['Play Video title 3', 'Play Video title 1', 'Play Video title 2']);
  });

  it("a tap creates that video's player, with its own address, autoplay on and the interactive settings", async () => {
    const tree = await openDetail();
    press(tree, 'Play Video title 2');
    expect(players(tree)).toHaveLength(1);
    expect(players(tree)[0].props).toMatchObject({
      embedUrl: embed(2),
      autoplay: true,
      interactionMode: 'interactive',
      playbackPreset: 'default',
    });
    expect(playButtons(tree)).toEqual(['Play Video title 1']);
  });

  it('only one plays at a time: starting the other puts the first back to its play button', async () => {
    const tree = await openDetail();
    press(tree, 'Play Video title 1');
    press(tree, 'Play Video title 2');
    expect(players(tree)).toHaveLength(1);
    expect(players(tree)[0].props.embedUrl).toBe(embed(2));
    expect(playButtons(tree)).toEqual(['Play Video title 1']);
  });

  it('stops when another screen covers this one, and does not start again by itself on return', async () => {
    const tree = await openDetail();
    press(tree, 'Play Video title 1');
    expect(players(tree)).toHaveLength(1);

    act(() => mockFocusCleanup?.());
    expect(players(tree)).toHaveLength(0);

    act(() => {
      mockFocusCleanup = mockFocusCallback?.() as (() => void) | undefined;
    });
    expect(players(tree)).toHaveLength(0);
    expect(playButtons(tree)).toEqual(['Play Video title 1', 'Play Video title 2']);
  });

  it('a video with no title is called "Video N"', async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, { videos: [video(1, { title: '' }), video(2, { title: '   ' })] }));
    const tree = await openDetail();
    expect(playButtons(tree)).toEqual(['Play Video 1', 'Play Video 2']);
  });

  it('a video that is not a Bunny embed is never framed and cannot be pressed', async () => {
    backend.detail = async (uuid) =>
      answerDetail(
        detailOf(uuid, {
          videos: [
            video(1, { embedUrl: 'https://evil.example.com/embed/1' }),
            video(2, { embedUrl: 'javascript:alert(1)' }),
            video(3, { embedUrl: 'http://iframe.mediadelivery.net/embed/1/x' }),
            video(4),
          ],
        })
      );
    const tree = await openDetail();
    expect(playButtons(tree)).toEqual(['Play Video title 4']);
    press(tree, 'Play Video title 4');
    expect(players(tree)).toHaveLength(1);
    expect(players(tree)[0].props.embedUrl).toBe(embed(4));
  });

  it('an experience with no videos shows no video section, and the rest of the page', async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, { videos: [] }));
    const tree = await openDetail();
    expect(playButtons(tree)).toEqual([]);
    expect(bandNames(tree)).toEqual(['Title', 'Printable', 'Closing message']);
    expect(bandColor(tree, 'Printable')).toBe(PALE);
  });
});

describe('the printable', () => {
  it('a link: the button opens that address in the in-app browser, once per press', async () => {
    const tree = await openDetail();
    press(tree, 'Print recipe here');
    expect(mockOpenBrowser).toHaveBeenCalledTimes(1);
    expect(mockOpenBrowser).toHaveBeenCalledWith('https://riseup.kids/downloads/recipe.pdf');
  });

  it('an uploaded file: the same button, opening the file', async () => {
    backend.detail = async (uuid) =>
      answerDetail(
        detailOf(uuid, withPrintable({ image: null, kind: 'file', url: 'https://media.riseup.kids/experiences/files/recipe.pdf', fileName: 'recipe.pdf', button: 'Get the PDF' }))
      );
    const tree = await openDetail();
    press(tree, 'Get the PDF');
    expect(mockOpenBrowser).toHaveBeenCalledWith('https://media.riseup.kids/experiences/files/recipe.pdf');
  });

  it("shows the printable's picture above the button", async () => {
    const tree = await openDetail();
    const images = nativeImages(tree).filter((n) => n.props.source?.uri === 'https://cdn.test/experiences/printable/recipe.png');
    expect(images).toHaveLength(1);
    expect(images[0].props.contentFit).toBe('contain');
  });

  it('with no button text the button says "Print here"', async () => {
    backend.detail = async (uuid) =>
      answerDetail(detailOf(uuid, withPrintable({ image: null, kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: '' })));
    const tree = await openDetail();
    expect(pressable(tree, 'Print here')).toBeDefined();
  });

  it('a picture alone is shown, with no button (there is nothing to open)', async () => {
    backend.detail = async (uuid) =>
      answerDetail(detailOf(uuid, withPrintable({ image: 'https://cdn.test/p.png', kind: null, url: null, fileName: '', button: '' })));
    const tree = await openDetail();
    expect(bandNames(tree)).toContain('Printable');
    expect(nativeImages(tree).some((n) => n.props.source?.uri === 'https://cdn.test/p.png')).toBe(true);
    expect(pressable(tree, 'Print here')).toBeUndefined();
  });

  it("resolves a picture path that is not a full address, like every other picture in the app", async () => {
    backend.detail = async (uuid) =>
      answerDetail(detailOf(uuid, withPrintable({ image: '/uploads/experiences/p.png', kind: null, url: null, fileName: '', button: '' })));
    const tree = await openDetail();
    const resolved = getCoverImageUrl('/uploads/experiences/p.png');
    expect(resolved).toMatch(/^https?:\/\/.+\/uploads\/experiences\/p\.png$/);
    expect(nativeImages(tree).some((n) => n.props.source?.uri === resolved)).toBe(true);
  });

  it('with no printable there is no printable section', async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, withPrintable(null)));
    const tree = await openDetail();
    expect(bandNames(tree)).not.toContain('Printable');
  });

  it.each([
    ['an http address', 'link', 'http://riseup.kids/a.pdf'],
    ['a javascript address', 'link', 'javascript:alert(1)'],
    ['a data address', 'link', 'data:text/html,hi'],
    ['text that is not an address', 'link', 'not a link'],
    ['an empty address', 'link', ''],
    ['a link to a site that is not ours', 'link', 'https://evil.example.com/a.pdf'],
    ['a lookalike host', 'link', 'https://riseup.kids.evil.example.com/a.pdf'],
    ['an http file address', 'file', 'http://media.riseup.kids/a.pdf'],
    ['a javascript file address', 'file', 'javascript:alert(1)'],
  ])('never opens %s (the button is left out)', async (_name, kind, url) => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, withPrintable({ image: null, kind, url, fileName: '', button: 'Print' })));
    const tree = await openDetail();
    expect(pressable(tree, 'Print')).toBeUndefined();
    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });

  it('a browser that fails to open does not break the page', async () => {
    mockOpenBrowser.mockImplementationOnce(() => Promise.reject(new Error('no browser')));
    const tree = await openDetail();
    press(tree, 'Print recipe here');
    await settle();
    expect(headers(tree)).toContain('Strawberry Banana Smoothie');
  });
});

describe('the buttons', () => {
  it('the back arrow is there in every state: loading, not available and could not load', async () => {
    backend.detail = () => new Promise(() => {});
    const loading = render(<ChildExploreExperienceDetailScreen />);
    await settle();
    expect(loading.root.findAll((n: ReactTestInstance) => n.props.testID === 'experience-back-button' && typeof n.type === 'string')).toHaveLength(1);

    useExperienceStore.getState().reset();
    backend.detail = async () => { throw notFoundError(); };
    const gone = await openDetail();
    expect(gone.root.findAll((n: ReactTestInstance) => n.props.testID === 'experience-back-button' && typeof n.type === 'string')).toHaveLength(1);

    useExperienceStore.getState().reset();
    backend.detail = async () => { throw serverError(); };
    const failed = await openDetail();
    expect(failed.root.findAll((n: ReactTestInstance) => n.props.testID === 'experience-back-button' && typeof n.type === 'string')).toHaveLength(1);
  });

  it('Back to Experiences goes back to the list screen below this one', async () => {
    const tree = await openDetail();
    press(tree, 'Back to Experiences');
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opened with nothing below it, Back to Experiences goes to this child\'s list', async () => {
    mockCanGoBack = false;
    const tree = await openDetail();
    press(tree, 'Back to Experiences');
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/child/child1/explore-experience');
  });

  it("Back to home goes to this child's home", async () => {
    mockChildId = 'kid-77';
    const tree = await openDetail();
    press(tree, 'Back to home');
    expect(mockReplace).toHaveBeenCalledWith('/child/kid-77/home');
  });

  it('the page has no outside links: the only thing that opens a browser is the printable', async () => {
    const tree = await openDetail();
    press(tree, 'Back to home');
    press(tree, 'Back to Experiences');
    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });
});

describe('loading', () => {
  it('shows a placeholder on the first visit, with the way back already there, then the page', async () => {
    let release!: () => void;
    backend.detail = () => new Promise((resolve) => { release = () => resolve(answerDetail(detailOf(UUID_1))); });
    const tree = render(<ChildExploreExperienceDetailScreen />);
    await settle();
    expect(skeleton(tree)).toHaveLength(1);
    expect(pressable(tree, 'Back to Experiences')).toBeDefined();
    expect(headers(tree)).not.toContain('Strawberry Banana Smoothie');

    await act(async () => release());
    expect(skeleton(tree)).toHaveLength(0);
    expect(headers(tree)).toContain('Strawberry Banana Smoothie');
  });

  it('a second visit shows the last answer at once, then replaces it quietly', async () => {
    const first = await openDetail();
    act(() => first.unmount());

    let release!: () => void;
    backend.detail = () => new Promise((resolve) => { release = () => resolve(answerDetail(detailOf(UUID_1, { title: 'Changed by the admin' }))); });
    const second = render(<ChildExploreExperienceDetailScreen />);
    await settle();
    expect(headers(second)).toContain('Strawberry Banana Smoothie');
    expect(skeleton(second)).toHaveLength(0);

    await act(async () => release());
    expect(headers(second)).toContain('Changed by the admin');
  });

  it('keeps a separate answer for each experience', async () => {
    backend.detail = async (uuid) => answerDetail(detailOf(uuid, { title: `Title of ${uuid.slice(-1)}` }));
    const one = await openDetail(UUID_1);
    expect(headers(one)).toContain('Title of 1');
    act(() => one.unmount());
    const two = await openDetail(UUID_2);
    expect(headers(two)).toContain('Title of 2');
    expect(backend.requests).toEqual([`/experiences/${UUID_1}`, `/experiences/${UUID_2}`]);
  });

  it('two screens asking for the same experience at the same moment share one request', async () => {
    let release!: () => void;
    backend.detail = () => new Promise((resolve) => { release = () => resolve(answerDetail(detailOf(UUID_1))); });
    render(<ChildExploreExperienceDetailScreen />);
    render(<ChildExploreExperienceDetailScreen />);
    await settle();
    expect(backend.requests).toEqual([`/experiences/${UUID_1}`]);
    await act(async () => release());
  });
});

describe('an experience that is not available', () => {
  it('says it is not available, and does not offer Try again', async () => {
    backend.detail = async () => { throw notFoundError(); };
    const tree = await openDetail();
    expect(headers(tree)).toContain('This experience is not available');
    expect(pressable(tree, 'Try again')).toBeUndefined();
    expect(hasText(tree, 'Could not load')).toBe(false);
    expect(backend.requests).toHaveLength(1);
  });

  it('has the way back, and See all experiences, both going back to the list', async () => {
    backend.detail = async () => { throw notFoundError(); };
    const tree = await openDetail();
    press(tree, 'See all experiences');
    press(tree, 'Back to Experiences');
    expect(mockBack).toHaveBeenCalledTimes(2);
  });

  it('is not what a server error looks like', async () => {
    backend.detail = async () => { throw serverError(); };
    const tree = await openDetail();
    expect(headers(tree)).not.toContain('This experience is not available');
    expect(pressable(tree, 'Try again')).toBeDefined();
  });

  it('an experience taken down behind a cached page stays silent (the page keeps showing)', async () => {
    const first = await openDetail();
    act(() => first.unmount());
    backend.detail = async () => { throw notFoundError(); };
    const second = await openDetail();
    expect(headers(second)).toContain('Strawberry Banana Smoothie');
    expect(headers(second)).not.toContain('This experience is not available');
  });
});

describe('when it cannot be loaded', () => {
  it('says so with the reason and offers Try again, with the way back above it', async () => {
    backend.detail = async () => { throw serverError(); };
    const tree = await openDetail();
    expect(hasText(tree, 'Could not load')).toBe(true);
    expect(hasText(tree, 'Server exploded')).toBe(true);
    expect(pressable(tree, 'Try again')).toBeDefined();
    expect(pressable(tree, 'Back to Experiences')).toBeDefined();
  });

  it('an answer that is not an experience is a failed load', async () => {
    backend.detail = async () => '<html>Bad gateway</html>';
    const tree = await openDetail();
    expect(hasText(tree, 'We could not load this experience. Please try again.')).toBe(true);
  });

  it('Try again loads the page and replaces the message with it', async () => {
    backend.detail = async () => { throw serverError(); };
    const tree = await openDetail();

    backend.detail = async (uuid) => answerDetail(detailOf(uuid));
    press(tree, 'Try again');
    await settle();
    expect(pressable(tree, 'Try again')).toBeUndefined();
    expect(headers(tree)).toContain('Strawberry Banana Smoothie');
    expect(backend.requests).toHaveLength(2);
  });

  it('Try again that fails again keeps the message', async () => {
    backend.detail = async () => { throw serverError(); };
    const tree = await openDetail();
    press(tree, 'Try again');
    await settle();
    expect(hasText(tree, 'Server exploded')).toBe(true);
    expect(backend.requests).toHaveLength(2);
  });

  it('while Try again is under way the message gives way to the placeholder', async () => {
    backend.detail = async () => { throw serverError(); };
    const tree = await openDetail();
    backend.detail = () => new Promise(() => {});
    press(tree, 'Try again');
    await settle();
    expect(skeleton(tree)).toHaveLength(1);
    expect(pressable(tree, 'Try again')).toBeUndefined();
  });

  it('a refresh that fails behind real content stays silent and keeps the page', async () => {
    const first = await openDetail();
    act(() => first.unmount());
    backend.detail = async () => { throw serverError(); };
    const second = await openDetail();
    expect(headers(second)).toContain('Strawberry Banana Smoothie');
    expect(hasText(second, 'Could not load')).toBe(false);
  });

  it('offline: shows the placeholder (the no-internet dialog is in charge), never a raw error', async () => {
    backend.detail = async () => { throw offlineError(); };
    const tree = await openDetail();
    expect(skeleton(tree)).toHaveLength(1);
    expect(hasText(tree, 'Could not load')).toBe(false);
    expect(pressable(tree, 'Back to Experiences')).toBeDefined();
  });

  it('offline then back online: the page loads again by itself', async () => {
    backend.detail = async () => { throw offlineError(); };
    const tree = await openDetail();
    expect(headers(tree)).not.toContain('Strawberry Banana Smoothie');

    backend.detail = async (uuid) => answerDetail(detailOf(uuid));
    act(() => useNetworkStore.setState({ reconnectGeneration: 1 }));
    await settle();
    expect(headers(tree)).toContain('Strawberry Banana Smoothie');
    expect(backend.requests).toHaveLength(2);
  });

  it('a first failure does not stop a later visit from loading', async () => {
    backend.detail = async () => { throw serverError(); };
    const first = await openDetail();
    expect(hasText(first, 'Server exploded')).toBe(true);
    act(() => first.unmount());

    backend.detail = async (uuid) => answerDetail(detailOf(uuid));
    const second = await openDetail();
    expect(headers(second)).toContain('Strawberry Banana Smoothie');
  });
});

describe('the footer and the routes', () => {
  it('keeps Explore lit on the experience screen', () => {
    expect(getActiveFromPath('/child/child1/explore-experience-detail')).toBe('explore');
  });

  it('the screen is registered in the child layout, and its file exists', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const dir = path.join(__dirname, '..', '..', 'app', 'child', '[id]');
    expect(fs.readFileSync(path.join(dir, '_layout.tsx'), 'utf8')).toContain('<Stack.Screen name="explore-experience-detail" />');
    expect(fs.existsSync(path.join(dir, 'explore-experience-detail.tsx'))).toBe(true);
  });
});
