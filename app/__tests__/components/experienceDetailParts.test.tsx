/**
 * The building blocks of the experience page on their own: the shared band, round button and video block, the
 * "not available" and "could not load" screens, the first-load placeholder, and the page itself when it is given
 * its data and callbacks directly.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Band, PillButton, VideoBlock } from '@/components/child/experience/experience-page-parts';
import {
  BackArrow,
  ExperienceDetailSkeleton,
  ExperienceLoadFailed,
  ExperienceNotFound,
} from '@/components/child/experiences/experience-detail-states';
import { ExperienceDetailView } from '@/components/child/experiences/experience-detail-view';

jest.mock('@expo/vector-icons', () => {
  const { createElement } = jest.requireActual('react');
  return { MaterialCommunityIcons: (props: object) => createElement('Icon', props) };
});
jest.mock('expo-image', () => {
  const { createElement } = jest.requireActual('react');
  return { Image: Object.assign((props: object) => createElement('NativeImage', props), { prefetch: jest.fn() }) };
});
jest.mock('@/components/child/common/bunny-embed-webview', () => {
  const { createElement } = jest.requireActual('react');
  return { BunnyEmbedWebView: (props: object) => createElement('BunnyPlayer', props) };
});

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
afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
});

const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' || typeof children === 'number' ? String(children) : '';
const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(Text).map((node: ReactTestInstance) => flat(node.props.children));
const pressable = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
const press = (tree: ReactTestRenderer, label: string) => {
  const target = pressable(tree, label);
  expect(target).toBeDefined();
  act(() => target.props.onPress());
};
const players = (tree: ReactTestRenderer) => tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'BunnyPlayer');

describe('Band', () => {
  const band = (tree: ReactTestRenderer) => tree.root.findAll((n: ReactTestInstance) => typeof n.type === 'string' && n.props.testID === 'band-Videos')[0];

  it('has the colour it is given, and names its section', () => {
    const tree = render(<Band color="#d1e2df" label="Videos"><Text>Inside</Text></Band>);
    expect(StyleSheet.flatten(band(tree).props.style).backgroundColor).toBe('#d1e2df');
    expect(band(tree).props.accessibilityLabel).toBe('Videos');
    expect(texts(tree)).toContain('Inside');
  });

  it('a compact band has less space above and below than a normal one', () => {
    const normal = render(<Band color="#fff" label="Videos"><Text>x</Text></Band>);
    const compact = render(<Band color="#fff" label="Videos" compact><Text>x</Text></Band>);
    const padding = (tree: ReactTestRenderer) => StyleSheet.flatten(band(tree).props.style).paddingVertical as number;
    expect(padding(compact)).toBeLessThan(padding(normal));
  });

  it('without a label it has no test id (a band without a section name draws none)', () => {
    const tree = render(<Band color="#fff"><Text>x</Text></Band>);
    expect(tree.root.findAll((n: ReactTestInstance) => typeof n.props.testID === 'string')).toHaveLength(0);
  });
});

describe('PillButton', () => {
  it('is a button named by its label that calls onPress', () => {
    const onPress = jest.fn();
    const tree = render(<PillButton icon="printer" color="#e98a68" label="Print here" onPress={onPress} />);
    expect(pressable(tree, 'Print here').props.accessibilityRole).toBe('button');
    press(tree, 'Print here');
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(texts(tree)).toContain('Print here');
  });
});

describe('VideoBlock', () => {
  const url = 'https://iframe.mediadelivery.net/embed/1/abc';

  it('with a link it is a play button named after the video, and no player yet', () => {
    const tree = render(<VideoBlock url={url} label="The story" playing={false} onPlay={() => {}} />);
    expect(pressable(tree, 'Play The story')).toBeDefined();
    expect(players(tree)).toHaveLength(0);
  });

  it('pressing play tells the page', () => {
    const onPlay = jest.fn();
    const tree = render(<VideoBlock url={url} label="The story" playing={false} onPlay={onPlay} />);
    press(tree, 'Play The story');
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('playing creates the player with autoplay and the interactive settings, and no play button', () => {
    const tree = render(<VideoBlock url={url} label="The story" playing onPlay={() => {}} />);
    expect(players(tree)).toHaveLength(1);
    expect(players(tree)[0].props).toMatchObject({ embedUrl: url, title: 'The story', autoplay: true, interactionMode: 'interactive', playbackPreset: 'default' });
    expect(pressable(tree, 'Play The story')).toBeUndefined();
  });

  it('with no link it shows the label but can never be pressed or played', () => {
    const tree = render(<VideoBlock url="" label="The story" playing onPlay={() => {}} />);
    expect(texts(tree)).toContain('The story');
    expect(pressable(tree, 'Play The story')).toBeUndefined();
    expect(players(tree)).toHaveLength(0);
  });
});

describe('the states', () => {
  it('BackArrow is an arrow-only button named Back to Experiences, in the page (not floating), as wide a column as the videos', () => {
    const onBack = jest.fn();
    const tree = render(<BackArrow onBack={onBack} />);
    expect(texts(tree)).toEqual([]);
    expect(pressable(tree, 'Back to Experiences').props.accessibilityRole).toBe('button');
    press(tree, 'Back to Experiences');
    expect(onBack).toHaveBeenCalledTimes(1);
    const styles = tree.root
      .findAll((n: ReactTestInstance) => typeof n.type === 'string' && n.props.testID === 'experience-back-button')[0].props.style;
    expect(StyleSheet.flatten(styles).position).not.toBe('absolute');
    const column = tree.root.findAll((n: ReactTestInstance) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.maxWidth === 620);
    expect(column).toHaveLength(1);
  });

  it('the placeholder has the way back and says it is loading', () => {
    const tree = render(<ExperienceDetailSkeleton onBack={() => {}} />);
    expect(pressable(tree, 'Back to Experiences')).toBeDefined();
    expect(tree.root.findAll((n: ReactTestInstance) => n.props.accessibilityLabel === 'Loading experience' && typeof n.type === 'string')).toHaveLength(1);
  });

  it('not available: says so, has no Try again, and both buttons go back to the list', () => {
    const onBack = jest.fn();
    const onSeeAll = jest.fn();
    const tree = render(<ExperienceNotFound onBack={onBack} onSeeAll={onSeeAll} />);
    expect(texts(tree)).toContain('This experience is not available');
    expect(pressable(tree, 'Try again')).toBeUndefined();
    press(tree, 'Back to Experiences');
    press(tree, 'See all experiences');
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('could not load: the reason, Try again that calls back, and the way back', () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();
    const tree = render(<ExperienceLoadFailed onBack={onBack} message="Server exploded" onRetry={onRetry} />);
    expect(texts(tree)).toContain('Could not load');
    expect(texts(tree)).toContain('Server exploded');
    press(tree, 'Try again');
    press(tree, 'Back to Experiences');
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ExperienceDetailView', () => {
  const experience = {
    uuid: 'u1',
    title: 'Smoothie',
    description: 'Make it',
    coverImage: null,
    videos: [
      { id: 'a', title: 'One', embedUrl: 'https://iframe.mediadelivery.net/embed/1/a', position: 1 },
      { id: 'b', title: 'Two', embedUrl: 'https://iframe.mediadelivery.net/embed/1/b', position: 2 },
    ],
    printable: { image: null, kind: 'link' as const, url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print' },
  };
  const props = () => ({ experience, getImageUrl: (p: string | null | undefined) => p ?? null, onBack: jest.fn(), onHome: jest.fn(), onPrint: jest.fn() });

  it('Print passes the checked address to onPrint, Home and Back call their callbacks', () => {
    const p = props();
    const tree = render(<ExperienceDetailView {...p} />);
    press(tree, 'Print');
    press(tree, 'Back to home');
    press(tree, 'Back to Experiences');
    expect(p.onPrint).toHaveBeenCalledWith('https://riseup.kids/a.pdf');
    expect(p.onHome).toHaveBeenCalledTimes(1);
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });

  it('a video does not play while the screen is not active, even after a tap', () => {
    const tree = render(<ExperienceDetailView {...props()} active={false} />);
    press(tree, 'Play One');
    expect(players(tree)).toHaveLength(0);
  });

  it('becoming inactive stops the playing video, and it does not start again on return', () => {
    const p = props();
    const tree = render(<ExperienceDetailView {...p} />);
    press(tree, 'Play One');
    expect(players(tree)).toHaveLength(1);
    act(() => tree.update(<ExperienceDetailView {...p} active={false} />));
    expect(players(tree)).toHaveLength(0);
    act(() => tree.update(<ExperienceDetailView {...p} active />));
    expect(players(tree)).toHaveLength(0);
  });

  const withAspect = (tree: ReactTestRenderer, ratio: number) =>
    tree.root.findAll((n: ReactTestInstance) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.aspectRatio === ratio);

  it('draws every video 16:9', () => {
    const tree = render(<ExperienceDetailView {...props()} />);
    expect(withAspect(tree, 16 / 9)).toHaveLength(2);
  });

  it("gives the printable's picture the template's shape (627 x 552), so every printable sits in the same space", () => {
    const withImage = { ...experience, printable: { ...experience.printable, image: 'https://cdn.test/p.png' } };
    const tree = render(<ExperienceDetailView {...props()} experience={withImage} />);
    expect(withAspect(tree, 627 / 552)).toHaveLength(1);
  });

  it('the printable band is shorter than the title band', () => {
    const tree = render(<ExperienceDetailView {...props()} />);
    const padding = (name: string) =>
      StyleSheet.flatten(tree.root.findAll((n: ReactTestInstance) => typeof n.type === 'string' && n.props.testID === `band-${name}`)[0].props.style).paddingVertical as number;
    expect(padding('Printable')).toBeLessThan(padding('Title'));
  });

  it('draws a new experience from scratch when it changes (no player carried over)', () => {
    const p = props();
    const tree = render(<ExperienceDetailView {...p} />);
    press(tree, 'Play One');
    act(() => tree.update(<ExperienceDetailView {...p} experience={{ ...experience, uuid: 'u2', videos: [{ id: 'c', title: 'Three', embedUrl: 'https://iframe.mediadelivery.net/embed/1/c', position: 1 }] }} />));
    expect(players(tree)).toHaveLength(0);
    expect(pressable(tree, 'Play Three')).toBeDefined();
  });
});
