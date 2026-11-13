/**
 * The app's Experience pieces on their own: the Explore button, the screen header, one card and the placeholder.
 */
import React from 'react';
import { Text } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ExploreExperienceButton } from '@/components/child/explore/explore-experience-button';
import { ExperienceCard } from '@/components/child/experiences/experience-cards';
import { ExperiencesHeader } from '@/components/child/experiences/experiences-header';
import { ExperiencesSkeleton } from '@/components/child/experiences/experiences-skeletal-loading';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@expo/vector-icons', () => {
  const { createElement } = jest.requireActual('react');
  return { MaterialCommunityIcons: (props: object) => createElement('Icon', props) };
});
jest.mock('expo-image', () => {
  const { createElement } = jest.requireActual('react');
  return { Image: Object.assign((props: object) => createElement('NativeImage', props), { prefetch: jest.fn() }) };
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
  jest.clearAllMocks();
});

const flat = (children: unknown): string =>
  Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' || typeof children === 'number' ? String(children) : '';
const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(Text).map((node: ReactTestInstance) => flat(node.props.children));
const icons = (tree: ReactTestRenderer) => tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'Icon');
// The pressables as the user meets them: the ones that carry an accessibility label (not the component that was given onPress).
const pressables = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (node: ReactTestInstance) => typeof node.props.onPress === 'function' && typeof node.props.accessibilityLabel === 'string' && typeof node.type !== 'string'
  );

const data = (overrides = {}) => ({
  uuid: 'u1',
  title: 'Strawberry Banana Smoothie',
  description: 'Make a smoothie',
  coverImage: 'https://cdn.test/1.png',
  videoCount: 3,
  ...overrides,
});

describe('ExploreExperienceButton', () => {
  it('is a button named Experience with a sparkle and an arrow (the name is just the word)', () => {
    const tree = render(<ExploreExperienceButton onPress={jest.fn()} />);
    const [button] = pressables(tree);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Experience');
    expect(texts(tree)).toEqual(['Experience']);
    expect(icons(tree).map((icon) => icon.props.name)).toEqual(['star-four-points', 'arrow-right']);
  });

  it('calls onPress once per press', () => {
    const onPress = jest.fn();
    const tree = render(<ExploreExperienceButton onPress={onPress} />);
    act(() => pressables(tree)[0].props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is orange with white text, full width, and dims while pressed', () => {
    const tree = render(<ExploreExperienceButton onPress={jest.fn()} />);
    const [button] = pressables(tree);
    const rest = Object.assign({}, ...[button.props.style({ pressed: false })].flat(Infinity).filter(Boolean));
    const pressed = Object.assign({}, ...[button.props.style({ pressed: true })].flat(Infinity).filter(Boolean));
    expect(rest).toMatchObject({ width: '100%', backgroundColor: '#e98a68', flexDirection: 'row', justifyContent: 'space-between' });
    expect(rest.opacity).toBeUndefined();
    expect(pressed.opacity).toBeLessThan(1);
    icons(tree).forEach((icon) => expect(icon.props.color).toBe('#ffffff'));
  });
});

describe('ExperiencesHeader', () => {
  it('has a header-role title, a welcome line and a back button', () => {
    const tree = render(<ExperiencesHeader childId="kid1" />);
    expect(texts(tree)).toEqual(['Back to Explore', 'Experience', 'Fun things to watch, make and learn!']);
    const title = tree.root.findAllByType(Text).find((node: ReactTestInstance) => flat(node.props.children) === 'Experience');
    expect(title?.props.accessibilityRole).toBe('header');
  });

  it('Back to Explore goes to this child\'s Explore screen', () => {
    const tree = render(<ExperiencesHeader childId="kid9" />);
    act(() => pressables(tree)[0].props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/child/kid9/explore');
  });
});

describe('ExperienceCard', () => {
  it('shows the cover, the title, the description and the count', () => {
    const tree = render(<ExperienceCard experience={data()} coverUrl="https://cdn.test/1.png" index={0} />);
    expect(texts(tree)).toEqual(['Strawberry Banana Smoothie', 'Make a smoothie', '3 videos']);
    const [image] = tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'NativeImage');
    expect(image.props.source).toEqual({ uri: 'https://cdn.test/1.png' });
    expect(image.props.accessibilityLabel).toBe('Strawberry Banana Smoothie');
  });

  it.each([[null], ['']])('shows the placeholder (no image) for a cover url of %p', (coverUrl) => {
    const tree = render(<ExperienceCard experience={data({ coverImage: null })} coverUrl={coverUrl} index={0} />);
    expect(tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'NativeImage')).toHaveLength(0);
    expect(tree.root.findAll((node: ReactTestInstance) => node.props.testID === 'experience-cover-placeholder' && typeof node.type === 'string')).toHaveLength(1);
    // the cheerful illustration, not the old grey picture icon
    expect(icons(tree).map((icon) => icon.props.name)).not.toContain('image-outline');
  });

  it.each([[''], [null], [undefined]])('leaves out the description when it is %p', (description) => {
    const tree = render(<ExperienceCard experience={data({ description })} coverUrl={null} index={0} />);
    expect(texts(tree)).toEqual(['Strawberry Banana Smoothie', '3 videos']);
  });

  it('later cards start their picture a little later (the first four load at once)', () => {
    jest.useFakeTimers();
    try {
      const tree = render(<ExperienceCard experience={data()} coverUrl="https://cdn.test/1.png" index={6} />);
      const images = () => tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'NativeImage');
      expect(images()).toHaveLength(0);
      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(images()).toHaveLength(1);
      expect(images()[0].props.priority).toBe('low');
    } finally {
      jest.useRealTimers();
    }
  });

  it('is labelled with the experience title for screen readers', () => {
    const tree = render(<ExperienceCard experience={data()} coverUrl={null} index={0} />);
    const card = tree.root.findAll((node: ReactTestInstance) => node.props.testID === 'experience-card' && typeof node.type === 'string')[0];
    expect(card.props.accessibilityLabel).toBe('Strawberry Banana Smoothie');
  });
});

describe('ExperiencesSkeleton', () => {
  it('is a labelled progress indicator with three card-shaped placeholders by default', () => {
    const tree = render(<ExperiencesSkeleton />);
    const frame = tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === 'Loading experiences' && typeof node.type === 'string')[0];
    expect(frame.props.accessibilityRole).toBe('progressbar');
    expect((frame as unknown as { children: unknown[] }).children).toHaveLength(3);
  });

  it('can show another number', () => {
    const tree = render(<ExperiencesSkeleton count={5} />);
    const frame = tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === 'Loading experiences' && typeof node.type === 'string')[0];
    expect((frame as unknown as { children: unknown[] }).children).toHaveLength(5);
  });
});
