/**
 * End to end, on the real components (react-test-renderer): how the covers and thumbnails are drawn —
 * cached, in loading order, and with a stand-in box until they start. Only the native image view,
 * the router and the module store are replaced.
 */
import React from 'react';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { RemoteImage } from '@/components/common/remote-image';
import { JourneyCards } from '@/components/child/journey/journey-cards';
import { ModuleVideos } from '@/components/child/module/module-videos';
import { ModuleBooks } from '@/components/child/module/module-books';
import { ModuleChants } from '@/components/child/module/module-chants';
import { ModuleAudioAssignments } from '@/components/child/module/module-audio-assignments';
import type { ChildCourseWithProgress } from '@/services/journeyService';

const mockPush = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
      prefetch: (urls: string[], policy: string) => mockPrefetch(urls, policy),
    }),
  };
});

jest.mock('@/store/moduleStore', () => ({
  useModuleStore: { getState: () => ({ prefetchModuleDetails: jest.fn() }) },
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

const nativeImages = (tree: ReactTestRenderer) =>
  tree.root.findAll((node: ReactTestInstance) => (node.type as unknown) === 'NativeImage');
const uris = (tree: ReactTestRenderer) => nativeImages(tree).map((node: ReactTestInstance) => node.props.source.uri);
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPrefetch.mockResolvedValue(true);
});

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
  jest.useRealTimers();
});

describe('RemoteImage', () => {
  it('shows the first pictures at once, cached on the phone, with high priority and a fade-in', () => {
    const tree = render(<RemoteImage uri="https://api.example.com/uploads/a.jpg" index={0} />);

    const [image] = nativeImages(tree);
    expect(image.props.source).toEqual({ uri: 'https://api.example.com/uploads/a.jpg' });
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.priority).toBe('high');
    expect(image.props.transition).toBeGreaterThan(0);
    expect(image.props.recyclingKey).toBe('https://api.example.com/uploads/a.jpg');
  });

  it('keeps a stand-in box in the same place until a later picture starts, then loads it with low priority', () => {
    const tree = render(<RemoteImage uri="https://api.example.com/uploads/b.jpg" index={8} style={{ width: 100, height: 50 }} />);

    expect(nativeImages(tree)).toHaveLength(0);
    const box = tree.toJSON() as { type: string; props: { style: unknown } };
    expect(JSON.stringify(box.props.style)).toContain('"width":100');

    advance(1500);

    const [image] = nativeImages(tree);
    expect(image.props.priority).toBe('low');
    expect(image.props.source.uri).toBe('https://api.example.com/uploads/b.jpg');
  });

  it('does not start a picture whose screen was closed before its turn, and leaves no timer behind', () => {
    const tree = render(<RemoteImage uri="https://api.example.com/uploads/c.jpg" index={9} />);

    act(() => {
      tree.unmount();
    });

    expect(jest.getTimerCount()).toBe(0);
  });

  it('passes the description through for screen readers', () => {
    const tree = render(<RemoteImage uri="https://api.example.com/uploads/d.jpg" accessibilityLabel="Course cover" />);

    expect(nativeImages(tree)[0].props.accessibilityLabel).toBe('Course cover');
  });
});

describe('My Journey — the cover cards', () => {
  const course = (n: number): ChildCourseWithProgress =>
    ({
      course: { _id: `c${n}`, title: `Course ${n}`, coverImagePath: `https://api.example.com/uploads/c${n}.jpg` },
      progress: null,
      status: 'not_started',
      accessible: true,
      missingPrerequisites: [],
      progressPercentage: 0,
    }) as unknown as ChildCourseWithProgress;
  const courses = Array.from({ length: 10 }, (_, n) => course(n));

  it('loads only the covers at the top at first, and the rest one after another', () => {
    const tree = render(<JourneyCards courses={courses} childId="kid1" />);

    expect(uris(tree)).toEqual(courses.slice(0, 4).map((c) => c.course.coverImagePath));

    advance(300);
    expect(nativeImages(tree).length).toBeGreaterThan(4);
    expect(nativeImages(tree).length).toBeLessThan(10);

    advance(2000);
    expect(nativeImages(tree)).toHaveLength(10);
  });

  it('the covers at the top have high priority and the rest low', () => {
    const tree = render(<JourneyCards courses={courses} childId="kid1" />);
    advance(2000);

    const priorities = nativeImages(tree).map((node: ReactTestInstance) => node.props.priority);
    expect(priorities.slice(0, 4).every((p: string) => p === 'high')).toBe(true);
    expect(priorities.slice(4).every((p: string) => p === 'low')).toBe(true);
  });

  it('opening a course fetches only that cover ahead of time, into the same cache, before moving on', () => {
    const tree = render(<JourneyCards courses={courses} childId="kid1" />);
    const card = tree.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Course 2') &&
        typeof node.props.onPress === 'function'
    )[0];

    act(() => {
      card.props.onPress();
    });

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith(['https://api.example.com/uploads/c2.jpg'], 'memory-disk');
    expect(mockPush).toHaveBeenCalledWith('/child/kid1/module?courseId=c2');
  });

  it('a course with no cover shows the book placeholder and loads no picture', () => {
    const noCover = { ...course(0), course: { _id: 'x', title: 'No cover' } } as unknown as ChildCourseWithProgress;
    const tree = render(<JourneyCards courses={[noCover]} childId="kid1" />);

    expect(nativeImages(tree)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('📚');
  });
});

describe('inside a module — video, book, chant and audio thumbnails', () => {
  const item = (kind: string, n: number) => ({
    _id: `${kind}${n}`,
    title: `${kind} ${n}`,
    thumbnail: `https://api.example.com/uploads/${kind}${n}.jpg`,
    coverImage: `https://api.example.com/uploads/${kind}${n}.jpg`,
  });
  const make = (kind: string, count: number) => Array.from({ length: count }, (_, n) => item(kind, n));
  const noop = () => {};

  const sections = (videos = 3, books = 3, chants = 2, audios = 2) => ({
    videos: make('v', videos),
    books: make('b', books),
    chants: make('ch', chants),
    audios: make('a', audios),
  });

  it('every section loads in order across the whole page: videos, then books, then chants, then audio', () => {
    const { videos, books, chants, audios } = sections();
    const tree = render(
      <>
        <ModuleVideos videos={videos as never} getProgressCircles={() => 0} isCompleted={() => false} imageOffset={1} />
        <ModuleBooks books={books as never} getProgressCircles={() => 0} isCompleted={() => false} imageOffset={1 + videos.length} />
        <ModuleChants chants={chants as never} isCompleted={() => false} imageOffset={1 + videos.length + books.length} />
        <ModuleAudioAssignments
          audioAssignments={audios as never}
          getStatus={(() => 'not_started') as never}
          imageOffset={1 + videos.length + books.length + chants.length}
          onAudioPress={noop}
        />
      </>
    );

    // Index 0 is the course cover at the top; here the lists start at 1, so only the first three
    // pictures (indexes 1-3) are immediate, and the rest wait their turn.
    expect(uris(tree)).toEqual(['v0', 'v1', 'v2'].map((id) => `https://api.example.com/uploads/${id}.jpg`));

    advance(5000);
    expect(nativeImages(tree)).toHaveLength(10);
  });

  it('a section on its own, with no offset, starts from the first picture', () => {
    const tree = render(
      <ModuleVideos videos={make('v', 6) as never} getProgressCircles={() => 0} isCompleted={() => false} />
    );

    expect(nativeImages(tree)).toHaveLength(4);
    advance(5000);
    expect(nativeImages(tree)).toHaveLength(6);
  });
});
