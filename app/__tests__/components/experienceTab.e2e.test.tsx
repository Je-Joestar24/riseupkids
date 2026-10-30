/**
 * End to end, on the real components (react-test-renderer; no testing-library is installed): the
 * footer's Experience tab on iPhone, the Experience screen it opens, and the buttons on that screen.
 * Only the edges are replaced — the router, the in-app browser and the Bunny player.
 */
import React from 'react';
import { Image, Platform, StyleSheet, Text } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import ChildExperienceScreen from '@/app/child/[id]/experience';
import { FooterNavigation } from '@/components/child/common/footer-navigation';
import { ExperienceView } from '@/components/child/experience/experience-view';
import { getCurrentExperience, type Experience } from '@/config/experiences';

import { withCleanKidsWallEnv } from '../helpers/kidsWallEnv';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockPathname = '/child/child1/home';
// Focus handling: the screen registers a callback that runs when it comes to the front and returns a
// cleanup that runs when another tab covers it. The tests call these to simulate switching tabs.
let mockFocusCallback: (() => void | (() => void)) | undefined;
let mockFocusCleanup: (() => void) | undefined;

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useLocalSearchParams: () => ({ id: 'child1' }),
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    usePathname: () => mockPathname,
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const { createElement } = jest.requireActual('react');
  return { MaterialCommunityIcons: (props: object) => createElement('Icon', props) };
});

// The real player is a native WebView; here it is a marker element that records its props.
jest.mock('@/components/child/common/bunny-embed-webview', () => {
  const { createElement } = jest.requireActual('react');
  return { BunnyEmbedWebView: (props: object) => createElement('BunnyPlayer', props) };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

withCleanKidsWallEnv();

const mounted: ReactTestRenderer[] = [];

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  mounted.push(tree);
  return tree;
}

const textOf = (tree: ReactTestRenderer) => JSON.stringify(tree.toJSON());

/** How many visible text elements show exactly this text (not counting accessibility labels). */
const countVisibleText = (tree: ReactTestRenderer, text: string) =>
  tree.root.findAllByType(Text).filter((node: ReactTestInstance) => node.props.children === text).length;

function pressByLabel(tree: ReactTestRenderer, label: string) {
  const target = tree.root.findAll(
    (node: ReactTestInstance) =>
      node.props.accessibilityLabel === label && typeof node.props.onPress === 'function'
  )[0];
  expect(target).toBeDefined();
  act(() => {
    target.props.onPress();
  });
}

const players = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'BunnyPlayer');

const withVideos: Experience = {
  ...getCurrentExperience(),
  video1: 'https://iframe.mediadelivery.net/embed/1/first',
  video2: 'https://iframe.mediadelivery.net/embed/1/second',
};
const noop = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/child/child1/home';
  mockFocusCallback = undefined;
  mockFocusCleanup = undefined;
  jest.replaceProperty(Platform, 'OS', 'ios');
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
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('footer — Experience tab', () => {
  it("iPhone shows four tabs with Experience in place of Kid's Wall", () => {
    const text = textOf(render(<FooterNavigation childId="child1" />));

    for (const label of ['Home', 'My Journey', 'Explore', 'Experience']) {
      expect(text).toContain(label);
    }
    expect(text).not.toContain("Kid's Wall");
  });

  it("tapping Experience opens the child's Experience page", () => {
    const tree = render(<FooterNavigation childId="child1" />);

    pressByLabel(tree, 'Experience');

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/child/child1/experience');
  });

  it('the other tabs still go where they went before', () => {
    const tree = render(<FooterNavigation childId="child1" />);

    pressByLabel(tree, 'Home');
    pressByLabel(tree, 'My Journey');
    pressByLabel(tree, 'Explore');

    expect(mockPush.mock.calls.map((call) => call[0])).toEqual([
      '/child/child1/home',
      '/child/child1/journey',
      '/child/child1/explore',
    ]);
  });
});

describe('Experience screen (iPhone)', () => {
  it('shows the whole page in order, with placeholders until the real videos are added', () => {
    const tree = render(<ChildExperienceScreen />);
    const text = textOf(tree);

    const order = [
      'Strawberry Banana Smoothie',
      'Your child will be bilingual, naturally.',
      'How? By living the English language.',
      'Vocabulary, verbs and pronunciation',
      'The story',
      'Print recipe here',
      'You are learning, one step at a time.',
      'Reach for the stars',
      'Back to home',
    ];
    const positions = order.map((part) => text.indexOf(part));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(players(tree)).toHaveLength(0);
    // Empty video frames show a play circle and the video's name — no "goes here" wording.
    expect(text).not.toMatch(/Video goes here/i);
    expect(countVisibleText(tree, 'Vocabulary, verbs and pronunciation')).toBe(1);
    expect(countVisibleText(tree, 'The story')).toBe(1);
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  it("Print opens the printable from our own domain in the phone's built-in viewer", () => {
    const tree = render(<ChildExperienceScreen />);

    pressByLabel(tree, 'Print recipe here');

    expect(mockOpenBrowser).toHaveBeenCalledTimes(1);
    const [url] = mockOpenBrowser.mock.calls[0];
    expect(new URL(url).hostname).toBe('riseup.kids');
    expect(url).toMatch(/\.pdf$/);
  });

  it('a failure to open the printable does not crash the page', async () => {
    mockOpenBrowser.mockImplementationOnce(() => Promise.reject(new Error('no viewer')));
    const tree = render(<ChildExperienceScreen />);

    pressByLabel(tree, 'Print recipe here');
    await act(async () => {
      await Promise.resolve();
    });

    expect(textOf(tree)).toContain('Print recipe here');
  });

  it("Back to home goes to the child's home screen inside the app, and opens nothing outside", () => {
    const tree = render(<ChildExperienceScreen />);

    pressByLabel(tree, 'Back to home');

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/child/child1/home');
    expect(mockOpenBrowser).not.toHaveBeenCalled();
  });

  it('has no social media or outside link anywhere on the page', () => {
    const text = textOf(render(<ChildExperienceScreen />));

    expect(text).not.toMatch(/instagram|facebook|tiktok|pinterest|youtube|whatsapp/i);
    expect(text).not.toMatch(/https?:\/\//);
  });
});

describe('Experience screen — the printable picture takes only the space it needs', () => {
  it('the shape is on a wrapper and the picture fills it, so no tall empty box is left around it', () => {
    const tree = render(<ChildExperienceScreen />);

    const image = tree.root.findAllByType(Image)[0];
    const picture = StyleSheet.flatten(image.props.style);
    const wrapper = StyleSheet.flatten(image.parent?.props.style);

    // React Native ignores an Image's own aspectRatio, so it must not be the Image that carries it.
    expect(picture.aspectRatio).toBeUndefined();
    expect(picture.width).toBe('100%');
    expect(picture.height).toBe('100%');
    expect(wrapper.aspectRatio).toBeGreaterThan(1);
    expect(wrapper.aspectRatio).toBeLessThan(1.3);
    expect(wrapper.maxWidth).toBeLessThanOrEqual(240);
  });
});

describe('Experience screen (Android and Web for now)', () => {
  it('shows nothing and sends the visitor straight to Home', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const tree = render(<ChildExperienceScreen />);

    expect(tree.toJSON()).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/child/child1/home');
  });

  it('is available on any platform with the QA preview flag, so it can be checked off an iPhone', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    const tree = render(<ChildExperienceScreen />);

    expect(textOf(tree)).toContain('Strawberry Banana Smoothie');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('Experience page — playing the videos', () => {
  const play = (tree: ReactTestRenderer, label: string) => pressByLabel(tree, `Play ${label}`);
  const hasPlayButton = (tree: ReactTestRenderer, label: string) =>
    tree.root.findAll(
      (node: ReactTestInstance) =>
        node.props.accessibilityLabel === `Play ${label}` && typeof node.props.onPress === 'function'
    ).length > 0;

  it('shows a play button on each video and loads no player until one is tapped', () => {
    const tree = render(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} />);

    expect(players(tree)).toHaveLength(0);
    expect(hasPlayButton(tree, 'Vocabulary, verbs and pronunciation')).toBe(true);
    expect(hasPlayButton(tree, 'The story')).toBe(true);
  });

  it('tapping play on Video 1 starts Video 1 straight away, with the normal player controls', () => {
    const tree = render(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} />);

    play(tree, 'Vocabulary, verbs and pronunciation');

    const started = players(tree);
    expect(started).toHaveLength(1);
    expect(started[0].props.embedUrl).toBe(withVideos.video1);
    expect(started[0].props.autoplay).toBe(true);
    expect(started[0].props.interactionMode).toBe('interactive');
    expect(started[0].props.playbackPreset).toBe('default');
  });

  it('tapping play on Video 2 starts Video 2', () => {
    const tree = render(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} />);

    play(tree, 'The story');

    expect(players(tree).map((player: ReactTestInstance) => player.props.embedUrl)).toEqual([withVideos.video2]);
  });

  it('only one video plays at a time: starting the other puts the first back to its play button', () => {
    const tree = render(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} />);

    play(tree, 'Vocabulary, verbs and pronunciation');
    play(tree, 'The story');

    expect(players(tree).map((player: ReactTestInstance) => player.props.embedUrl)).toEqual([withVideos.video2]);
    expect(hasPlayButton(tree, 'Vocabulary, verbs and pronunciation')).toBe(true);
    expect(hasPlayButton(tree, 'The story')).toBe(false);
  });

  it('a video with no link yet shows the play circle but it cannot be pressed', () => {
    const tree = render(<ExperienceView experience={{ ...withVideos, video1: '' }} onPrint={noop} onHome={noop} />);

    expect(hasPlayButton(tree, 'Vocabulary, verbs and pronunciation')).toBe(false);
    expect(countVisibleText(tree, 'Vocabulary, verbs and pronunciation')).toBe(1);
    expect(hasPlayButton(tree, 'The story')).toBe(true);
  });
});

describe('Experience page — nothing keeps playing behind another tab', () => {
  const blur = () =>
    act(() => {
      mockFocusCleanup?.();
    });
  const refocus = () =>
    act(() => {
      mockFocusCleanup = mockFocusCallback?.() as (() => void) | undefined;
    });
  const isActive = (tree: ReactTestRenderer) => tree.root.findAllByType(ExperienceView)[0].props.active;

  it('tells the page to stop when another tab covers it, and to resume when it is back in front', () => {
    const tree = render(<ChildExperienceScreen />);
    expect(isActive(tree)).toBe(true);

    blur();
    expect(isActive(tree)).toBe(false);

    refocus();
    expect(isActive(tree)).toBe(true);
  });

  it('stops a playing video when the page is not active, and does not restart it by itself', () => {
    const tree = render(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} />);
    pressByLabel(tree, 'Play The story');
    expect(players(tree)).toHaveLength(1);

    act(() => {
      tree.update(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} active={false} />);
    });
    expect(players(tree)).toHaveLength(0);

    act(() => {
      tree.update(<ExperienceView experience={withVideos} onPrint={noop} onHome={noop} active />);
    });
    expect(players(tree)).toHaveLength(0);
    pressByLabel(tree, 'Play The story');
    expect(players(tree)).toHaveLength(1);
  });
});

describe('the whole flow on an iPhone', () => {
  it('tab -> Experience page -> print -> back to home', () => {
    const footer = render(<FooterNavigation childId="child1" />);
    pressByLabel(footer, 'Experience');
    expect(mockPush).toHaveBeenCalledWith('/child/child1/experience');

    mockPathname = '/child/child1/experience';
    const screen = render(<ChildExperienceScreen />);
    expect(textOf(screen)).toContain('Strawberry Banana Smoothie');

    pressByLabel(screen, 'Print recipe here');
    expect(mockOpenBrowser).toHaveBeenCalledTimes(1);

    pressByLabel(screen, 'Back to home');
    expect(mockReplace).toHaveBeenCalledWith('/child/child1/home');
  });
});
