/**
 * End to end, on the real components (react-test-renderer): the wide "Experience" button on the Explore
 * screen, the list of experiences with their covers that it opens, and the way back. The real screens, hook,
 * store, service, header, cards and cover component are used. Only the edges are replaced: the network (a fake
 * backend behind the API client), the router, the native image view, the icons, and the other Explore
 * sections (replays, collections, Star Cam: not under test here).
 *
 * What matters most:
 *  - the button is the first thing on Explore, needs no request, and opens this child's list;
 *  - the list shows every experience the server sent, in that order, each with its cover (or a placeholder);
 *  - the first visit shows placeholders, later visits show the last answer at once and refresh quietly;
 *  - a failure says so and Try again works; a failed refresh behind real content stays silent;
 *  - offline shows the placeholder (the global no-internet dialog is in charge) and reloads on reconnect.
 */
import React from 'react';
import { Text } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import ChildExploreScreen from '@/app/child/[id]/explore';
import ChildExploreExperienceScreen from '@/app/child/[id]/explore-experience';
import { getActiveFromPath } from '@/components/child/common/footer-navigation';
import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { useExperienceStore } from '@/store/experienceStore';
import { useNetworkStore } from '@/store/networkStore';
import { NETWORK_UNAVAILABLE_MESSAGE } from '@/utils/networkError';

const mockPush = jest.fn();
let mockChildId: string | undefined = 'child1';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockChildId }),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/child/child1/explore',
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

// The other Explore sections are markers, so the order of the page can be checked.
jest.mock('@/components/child/explore/explore-replays', () => {
  const { createElement } = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return { ExploreReplays: () => createElement(RNText, null, 'SECTION Watch Replays') };
});
jest.mock('@/components/child/explore/explore-something', () => {
  const { createElement } = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return { ExploreSomething: () => createElement(RNText, null, 'SECTION What Do You Want to Learn?') };
});
jest.mock('@/components/child/explore/explore-video-collection', () => {
  const { createElement } = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return { ExploreVideoCollection: () => createElement(RNText, null, 'SECTION Collections') };
});
jest.mock('@/components/child/explore/explore-starcam', () => {
  const { createElement } = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return { ExploreStarCam: () => createElement(RNText, null, 'SECTION Star Cam') };
});

// The network: what the server answers to GET /experiences.
const mockGet = jest.fn();
jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' || typeof children === 'number' ? String(children) : '';

/** Every visible text, in the order drawn. */
const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(Text).map((node: ReactTestInstance) => flat(node.props.children));
const hasText = (tree: ReactTestRenderer, text: string) => texts(tree).includes(text);

const byLabel = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === label && typeof node.type !== 'string');
const pressable = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll(
    (node: ReactTestInstance) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function'
  )[0];
function press(tree: ReactTestRenderer, label: string) {
  const target = pressable(tree, label);
  expect(target).toBeDefined();
  act(() => {
    target.props.onPress();
  });
}

const nativeImages = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'NativeImage');
const cards = (tree: ReactTestRenderer) => tree.root.findAll((node: ReactTestInstance) => node.props.testID === 'experience-card' && typeof node.type === 'string');
const placeholders = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => node.props.testID === 'experience-cover-placeholder' && typeof node.type === 'string');
const skeleton = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === 'Loading experiences' && typeof node.type === 'string');
const cardTitles = (tree: ReactTestRenderer) => cards(tree).map((card) => card.props.accessibilityLabel);

const card = (n: number, overrides: Record<string, unknown> = {}) => ({
  uuid: `00000000-0000-4000-8000-00000000000${n}`,
  title: `Experience ${n}`,
  description: `About experience ${n}`,
  coverImage: `https://cdn.test/experiences/images/${n}.png`,
  videoCount: n,
  ...overrides,
});

const backend: { reply: () => Promise<unknown>; calls: number } = { reply: async () => ({ success: true, data: [] }), calls: 0 };
const answer = (list: unknown) => ({ success: true, data: list });

beforeEach(() => {
  jest.clearAllMocks();
  mockChildId = 'child1';
  backend.calls = 0;
  backend.reply = async () => answer([]);
  mockGet.mockImplementation(async (url: string) => {
    if (url !== '/experiences') throw new Error(`unexpected request ${url}`);
    backend.calls += 1;
    return backend.reply();
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

describe('the button on the Explore screen', () => {
  it('is a wide button named Experience', async () => {
    const tree = await open(<ChildExploreScreen />);
    const button = pressable(tree, 'Experience');
    expect(button).toBeDefined();
    expect(button.props.accessibilityRole).toBe('button');
    expect(hasText(tree, 'Experience')).toBe(true);
  });

  it('is full width and tall enough to tap easily', async () => {
    const tree = await open(<ChildExploreScreen />);
    const style = [pressable(tree, 'Experience').props.style({ pressed: false })].flat(Infinity).filter(Boolean);
    const merged = Object.assign({}, ...style);
    expect(merged.width).toBe('100%');
    expect(merged.minHeight).toBeGreaterThanOrEqual(64);
  });

  it('is the first thing on the screen, above every other Explore section', async () => {
    const tree = await open(<ChildExploreScreen />);
    const order = texts(tree);
    const at = (text: string) => order.indexOf(text);
    expect(at('Experience')).toBeGreaterThanOrEqual(0);
    for (const section of ['SECTION Watch Replays', 'SECTION What Do You Want to Learn?', 'SECTION Collections', 'SECTION Star Cam']) {
      expect(at(section)).toBeGreaterThan(at('Experience'));
    }
  });

  it('asks the server for nothing until it is pressed', async () => {
    await open(<ChildExploreScreen />);
    expect(backend.calls).toBe(0);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens this child\'s list', async () => {
    const tree = await open(<ChildExploreScreen />);
    press(tree, 'Experience');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/child/child1/explore-experience');
  });

  it('opens the list for whichever child is signed in', async () => {
    mockChildId = 'kid-77';
    const tree = await open(<ChildExploreScreen />);
    press(tree, 'Experience');
    expect(mockPush).toHaveBeenCalledWith('/child/kid-77/explore-experience');
  });

  it('goes nowhere without a child id (never to /child/undefined)', async () => {
    mockChildId = undefined;
    const tree = await open(<ChildExploreScreen />);
    press(tree, 'Experience');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('can be pressed again and again (each press opens the list)', async () => {
    const tree = await open(<ChildExploreScreen />);
    press(tree, 'Experience');
    press(tree, 'Experience');
    expect(mockPush).toHaveBeenCalledTimes(2);
  });
});

describe('the list screen', () => {
  it('has the header: Back to Explore, the title and the welcome line', async () => {
    backend.reply = async () => answer([card(1)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(pressable(tree, 'Back to Explore')).toBeDefined();
    expect(hasText(tree, 'Experience')).toBe(true);
    expect(hasText(tree, 'Fun things to watch, make and learn!')).toBe(true);
  });

  it('Back to Explore goes to this child\'s Explore screen', async () => {
    mockChildId = 'kid-9';
    backend.reply = async () => answer([card(1)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    press(tree, 'Back to Explore');
    expect(mockPush).toHaveBeenCalledWith('/child/kid-9/explore');
  });

  it('shows nothing at all without a child id', async () => {
    mockChildId = undefined;
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(tree.toJSON()).toBeNull();
    expect(backend.calls).toBe(0);
  });

  it('shows every experience the server sent, in the server\'s order', async () => {
    backend.reply = async () => answer([card(3), card(1), card(2)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(cardTitles(tree)).toEqual(['Experience 3', 'Experience 1', 'Experience 2']);
  });

  it('asks the server once, for the whole list', async () => {
    backend.reply = async () => answer([card(1)]);
    await open(<ChildExploreExperienceScreen />);
    expect(backend.calls).toBe(1);
    expect(mockGet).toHaveBeenCalledWith('/experiences');
  });

  it('shows each experience with its cover picture', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(nativeImages(tree).map((image) => image.props.source.uri)).toEqual([
      'https://cdn.test/experiences/images/1.png',
      'https://cdn.test/experiences/images/2.png',
    ]);
    expect(nativeImages(tree).map((image) => image.props.accessibilityLabel)).toEqual(['Experience 1', 'Experience 2']);
  });

  it('keeps the covers cached on the phone and loads them in page order', async () => {
    backend.reply = async () => answer([card(1)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    const [image] = nativeImages(tree);
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.priority).toBe('high');
  });

  it('shows a picture placeholder, not a broken image, for an experience without a cover', async () => {
    backend.reply = async () => answer([card(1, { coverImage: null }), card(2)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(placeholders(tree)).toHaveLength(1);
    expect(nativeImages(tree)).toHaveLength(1);
    expect(nativeImages(tree)[0].props.source.uri).toBe('https://cdn.test/experiences/images/2.png');
  });

  it('resolves a cover path from our own server the way every other cover is resolved', async () => {
    backend.reply = async () => answer([card(1, { coverImage: '/uploads/experiences/images/one.png' })]);
    const tree = await open(<ChildExploreExperienceScreen />);
    const uri = nativeImages(tree)[0].props.source.uri as string;
    expect(uri).toBe(getCoverImageUrl('/uploads/experiences/images/one.png'));
    expect(uri.startsWith('http')).toBe(true);
    expect(uri.endsWith('/uploads/experiences/images/one.png')).toBe(true);
  });

  it('shows the title, the description and how many videos', async () => {
    backend.reply = async () => answer([card(1), card(3)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    for (const text of ['Experience 1', 'About experience 1', '1 video', 'Experience 3', 'About experience 3', '3 videos']) {
      expect(hasText(tree, text)).toBe(true);
    }
  });

  it('leaves out the description when there is none, and says so for an experience with no videos', async () => {
    backend.reply = async () => answer([card(1, { description: '', videoCount: 0 })]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(texts(tree).some((text) => text.startsWith('About'))).toBe(false);
    expect(hasText(tree, 'No videos yet')).toBe(true);
  });

  it('keeps a long title and description to two lines', async () => {
    const long = 'word '.repeat(100).trim();
    backend.reply = async () => answer([card(1, { title: long, description: long })]);
    const tree = await open(<ChildExploreExperienceScreen />);
    const clamped = tree.root.findAllByType(Text).filter((node) => flat(node.props.children) === long);
    expect(clamped).toHaveLength(2);
    clamped.forEach((node) => expect(node.props.numberOfLines).toBe(2));
  });

  it('copes with a lot of experiences', async () => {
    backend.reply = async () => answer(Array.from({ length: 30 }, (_, i) => card(i + 1, { uuid: `u-${i + 1}`, title: `Item ${i + 1}` })));
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(cards(tree)).toHaveLength(30);
    expect(cardTitles(tree)[29]).toBe('Item 30');
  });

  it('never shows an error over a list that is already on screen', async () => {
    useExperienceStore.setState({ experiences: [card(1), card(2)], loaded: true, error: 'Server exploded' });
    backend.reply = () => new Promise(() => {});
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(cards(tree)).toHaveLength(2);
    expect(hasText(tree, 'Could not load')).toBe(false);
    expect(pressable(tree, 'Try again')).toBeUndefined();
  });

  it('loads the first four covers at once and the rest a little later, one after another', async () => {
    jest.useFakeTimers();
    try {
      backend.reply = async () => answer(Array.from({ length: 7 }, (_, i) => card(i + 1)));
      const tree = await open(<ChildExploreExperienceScreen />);
      expect(cards(tree)).toHaveLength(7);
      expect(nativeImages(tree)).toHaveLength(4);
      expect(nativeImages(tree).every((image) => image.props.priority === 'high')).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(nativeImages(tree)).toHaveLength(7);
      expect(nativeImages(tree).slice(4).every((image) => image.props.priority === 'low')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('every card is a button named after its experience, next to Back to Explore', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    const buttons = tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityRole === 'button' && typeof node.type !== 'string');
    expect([...new Set(buttons.map((b) => b.props.accessibilityLabel))]).toEqual(['Back to Explore', 'Experience 1', 'Experience 2']);
  });

  it("pressing a card opens that experience for this child, by its own id", async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    const tree = await open(<ChildExploreExperienceScreen />);
    press(tree, 'Experience 2');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(`/child/child1/explore-experience-detail?uuid=${card(2).uuid}`);
  });

  it('the whole journey: Explore, the button, the list, back', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    const explore = await open(<ChildExploreScreen />);
    press(explore, 'Experience');
    expect(mockPush).toHaveBeenLastCalledWith('/child/child1/explore-experience');

    const list = await open(<ChildExploreExperienceScreen />);
    expect(cards(list)).toHaveLength(2);
    press(list, 'Back to Explore');
    expect(mockPush).toHaveBeenLastCalledWith('/child/child1/explore');
  });
});

describe('loading', () => {
  it('shows placeholders on the first visit, then the cards in their place', async () => {
    let release!: () => void;
    backend.reply = () => new Promise((resolve) => { release = () => resolve(answer([card(1)])); });
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(skeleton(tree)).toHaveLength(1);
    expect(cards(tree)).toHaveLength(0);
    expect(hasText(tree, 'No Experiences Yet')).toBe(false);

    await act(async () => release());
    expect(skeleton(tree)).toHaveLength(0);
    expect(cards(tree)).toHaveLength(1);
  });

  it('shows the header at once, while the list is still loading', async () => {
    backend.reply = () => new Promise(() => {});
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(pressable(tree, 'Back to Explore')).toBeDefined();
    expect(hasText(tree, 'Fun things to watch, make and learn!')).toBe(true);
  });

  it('a second visit shows the last answer at once, with no placeholder, then replaces it quietly', async () => {
    backend.reply = async () => answer([card(1)]);
    const first = await open(<ChildExploreExperienceScreen />);
    expect(cards(first)).toHaveLength(1);
    act(() => first.unmount());

    let release!: () => void;
    backend.reply = () => new Promise((resolve) => { release = () => resolve(answer([card(1), card(2, { title: 'Brand new' })])); });
    const second = render(<ChildExploreExperienceScreen />);
    // drawn from the store before the server has answered
    expect(cards(second)).toHaveLength(1);
    expect(skeleton(second)).toHaveLength(0);
    await settle();

    await act(async () => release());
    expect(cardTitles(second)).toEqual(['Experience 1', 'Brand new']);
  });

  it('an experience the admin took down is gone after the quiet refresh', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    const first = await open(<ChildExploreExperienceScreen />);
    act(() => first.unmount());

    backend.reply = async () => answer([card(2)]);
    const second = await open(<ChildExploreExperienceScreen />);
    expect(cardTitles(second)).toEqual(['Experience 2']);
  });
});

describe('nothing to show', () => {
  it('says there are no experiences yet (and it is not an error)', async () => {
    backend.reply = async () => answer([]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(hasText(tree, 'No Experiences Yet')).toBe(true);
    expect(hasText(tree, 'New experiences are coming soon. Check back later!')).toBe(true);
    expect(pressable(tree, 'Try again')).toBeUndefined();
    expect(cards(tree)).toHaveLength(0);
  });

  it('still has the way back', async () => {
    backend.reply = async () => answer([]);
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(pressable(tree, 'Back to Explore')).toBeDefined();
  });
});

describe('when it cannot be loaded', () => {
  it('says so with the reason and offers Try again', async () => {
    backend.reply = async () => { throw new Error('Server exploded'); };
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(hasText(tree, 'Could not load')).toBe(true);
    expect(hasText(tree, 'Server exploded')).toBe(true);
    expect(pressable(tree, 'Try again')).toBeDefined();
    expect(hasText(tree, 'No Experiences Yet')).toBe(false);
  });

  it('an answer that is not a list is a failed load, not an empty list', async () => {
    backend.reply = async () => '<html>Bad gateway</html>';
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(hasText(tree, 'We could not load the experiences. Please try again.')).toBe(true);
    expect(hasText(tree, 'No Experiences Yet')).toBe(false);
  });

  it('Try again loads the list and replaces the message with the cards', async () => {
    backend.reply = async () => { throw new Error('Server exploded'); };
    const tree = await open(<ChildExploreExperienceScreen />);

    backend.reply = async () => answer([card(1), card(2)]);
    press(tree, 'Try again');
    await settle();
    expect(pressable(tree, 'Try again')).toBeUndefined();
    expect(cards(tree)).toHaveLength(2);
    expect(backend.calls).toBe(2);
  });

  it('Try again that fails again keeps the message', async () => {
    backend.reply = async () => { throw new Error('Server exploded'); };
    const tree = await open(<ChildExploreExperienceScreen />);
    press(tree, 'Try again');
    await settle();
    expect(hasText(tree, 'Server exploded')).toBe(true);
    expect(backend.calls).toBe(2);
  });

  it('while Try again is under way the message gives way to the placeholder', async () => {
    backend.reply = async () => { throw new Error('Server exploded'); };
    const tree = await open(<ChildExploreExperienceScreen />);

    backend.reply = () => new Promise(() => {});
    press(tree, 'Try again');
    await settle();
    expect(skeleton(tree)).toHaveLength(1);
    expect(pressable(tree, 'Try again')).toBeUndefined();
  });

  it('a refresh that fails behind real content stays silent and keeps the cards', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    const first = await open(<ChildExploreExperienceScreen />);
    act(() => first.unmount());

    backend.reply = async () => { throw new Error('Server exploded'); };
    const second = await open(<ChildExploreExperienceScreen />);
    expect(cards(second)).toHaveLength(2);
    expect(hasText(second, 'Could not load')).toBe(false);
    expect(pressable(second, 'Try again')).toBeUndefined();
  });

  it('offline: shows the placeholder (the no-internet dialog is in charge), never a raw error', async () => {
    backend.reply = async () => { throw { code: 'ERR_NETWORK', message: 'Network Error' }; };
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(skeleton(tree)).toHaveLength(1);
    expect(hasText(tree, 'Could not load')).toBe(false);
    expect(hasText(tree, NETWORK_UNAVAILABLE_MESSAGE)).toBe(false);
  });

  it('offline then back online: the list loads again by itself', async () => {
    backend.reply = async () => { throw { code: 'ERR_NETWORK', message: 'Network Error' }; };
    const tree = await open(<ChildExploreExperienceScreen />);
    expect(cards(tree)).toHaveLength(0);

    backend.reply = async () => answer([card(1)]);
    act(() => useNetworkStore.setState({ reconnectGeneration: 1 }));
    await settle();
    expect(cards(tree)).toHaveLength(1);
    expect(backend.calls).toBe(2);
  });

  it('a first failure does not stop a later visit from loading', async () => {
    backend.reply = async () => { throw new Error('Server exploded'); };
    const first = await open(<ChildExploreExperienceScreen />);
    expect(hasText(first, 'Server exploded')).toBe(true);
    act(() => first.unmount());

    backend.reply = async () => answer([card(1)]);
    const second = await open(<ChildExploreExperienceScreen />);
    expect(cards(second)).toHaveLength(1);
  });
});

describe('the footer and the routes', () => {
  it('keeps Explore lit on the list screen', () => {
    expect(getActiveFromPath('/child/child1/explore-experience')).toBe('explore');
    expect(getActiveFromPath('/child/child1/explore')).toBe('explore');
  });

  it('the old iPhone Experience tab and its fixed page are gone (no screen, no registration, no tab)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const dir = path.join(__dirname, '..', '..', 'app', 'child', '[id]');
    expect(fs.existsSync(path.join(dir, 'experience.tsx'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, '_layout.tsx'), 'utf8')).not.toContain('name="experience"');
    expect(getActiveFromPath('/child/child1/experience')).toBe('home');
  });

  it('the screen is registered in the child layout', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'app', 'child', '[id]', '_layout.tsx'), 'utf8');
    expect(source).toContain('<Stack.Screen name="explore-experience" />');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(require('fs').existsSync(require('path').join(__dirname, '..', '..', 'app', 'child', '[id]', 'explore-experience.tsx'))).toBe(true);
  });
});
