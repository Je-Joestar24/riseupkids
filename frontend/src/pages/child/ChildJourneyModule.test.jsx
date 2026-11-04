/**
 * End to end for the course page: the real page, hook and store; the network service and the heavy
 * content/player components are replaced. Covers the parallel loading of the course and the courses
 * list, the step number, the first-load skeleton and the error screen with retry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer from '../../store/slices/childJourneySlice';
import childModuleReducer, {
  moduleKey,
  moduleReceived,
  prefetchChildModule,
} from '../../store/slices/childModuleSlice';
import uiReducer from '../../store/slices/uiSlice';
import courseProgressService from '../../services/courseProgressService';
import ChildJourneyModule from './ChildJourneyModule';

vi.mock('../../services/courseProgressService', () => ({
  default: { getChildCourses: vi.fn(), getCourseDetailsForChild: vi.fn() },
}));
vi.mock('../../services/videoWatchService', () => ({ default: {} }));
vi.mock('../../services/bookReadingService', () => ({ default: {} }));

// Heavy parts that are not under test
vi.mock('../../components/child/common/ScormPlayer', () => ({ default: () => null }));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({ default: () => null }));
vi.mock('../../components/child/module/AudioAssignmentRecordingModal', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChantRecordingModal', () => ({ default: () => null }));
// The sections only record what the page hands them, so the picture order can be checked.
const sectionProps = vi.hoisted(() => ({}));
vi.mock('../../components/child/module/ChildModuleLibrary', () => ({
  default: (props) => {
    sectionProps.library = props;
    return null;
  },
}));
vi.mock('../../components/child/module/ChildModuleVideos', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef((props) => {
      sectionProps.videos = props;
      return null;
    }),
  };
});
vi.mock('../../components/child/module/ChildModuleAudio', () => ({
  default: (props) => {
    sectionProps.audio = props;
    return null;
  },
}));
vi.mock('../../components/child/module/ChildModuleChants', () => ({
  default: (props) => {
    sectionProps.chants = props;
    return null;
  },
}));
vi.mock('../../components/child/module/ChildModuleFooter', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChildModulePrintables', () => ({ default: () => null }));

const { getChildCourses, getCourseDetailsForChild } = courseProgressService;

const listItem = (id) => ({ course: { _id: id, title: id }, status: 'not_started', accessible: true });
const details = (extra = {}) => ({
  accessible: true,
  course: { _id: 'c2', title: 'Second course', description: 'About it', contents: [] },
  progress: null,
  ...extra,
});
const ok = (data) => ({ success: true, data });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let childCounter = 0;

const newStore = () =>
  configureStore({
    reducer: { childJourney: childJourneyReducer, childModule: childModuleReducer, ui: uiReducer },
  });

function mount({ childId = `kid${++childCounter}`, store = newStore() } = {}) {
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/${childId}/journey/c2`]}>
        <Routes>
          <Route path="/child/:id/journey/:courseId" element={<ChildJourneyModule childId={childId} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { store, childId, ...view };
}

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));

describe('Course page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.keys(sectionProps).forEach((key) => delete sectionProps[key]);
  });
  afterEach(() => vi.useRealTimers());

  it('asks for the course and the courses list at the same moment', async () => {
    getChildCourses.mockReturnValue(new Promise(() => {}));
    getCourseDetailsForChild.mockReturnValue(new Promise(() => {}));

    mount();
    await flush();

    // Neither has answered yet, and both have been asked.
    expect(getChildCourses).toHaveBeenCalledTimes(1);
    expect(getCourseDetailsForChild).toHaveBeenCalledTimes(1);
  });

  it('does not wait for the courses list: the course opens as soon as its own details arrive', async () => {
    getChildCourses.mockReturnValue(new Promise(() => {}));
    getCourseDetailsForChild.mockResolvedValue(ok(details()));

    mount();
    await flush();

    expect(screen.getByText('Second course')).toBeInTheDocument();
  });

  it('numbers the step from the courses list when it arrives', async () => {
    const list = deferred();
    getChildCourses.mockReturnValue(list.promise);
    getCourseDetailsForChild.mockResolvedValue(ok(details()));
    mount();
    await flush();

    list.resolve(ok([listItem('c1'), listItem('c2'), listItem('c3')]));
    await flush();

    expect(screen.getAllByText(/Step\s*2/i).length).toBeGreaterThan(0);
  });

  it('still opens the course, with step 1, when the courses list fails — and shows no popup', async () => {
    getChildCourses.mockRejectedValue('Network down');
    getCourseDetailsForChild.mockResolvedValue(ok(details()));

    const { store } = mount();
    await flush();

    expect(screen.getByText('Second course')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(store.getState().ui.notification.open).toBeFalsy();
  });

  it('reuses a recently loaded courses list instead of asking again', async () => {
    getChildCourses.mockResolvedValue(ok([listItem('c1'), listItem('c2')]));
    getCourseDetailsForChild.mockResolvedValue(ok(details()));
    const { store, childId } = mount();
    await flush();
    expect(getChildCourses).toHaveBeenCalledTimes(1);

    // Open another course for the same child within 30 s.
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/child/${childId}/journey/c1`]}>
          <Routes>
            <Route path="/child/:id/journey/:courseId" element={<ChildJourneyModule childId={childId} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    await flush();

    expect(getChildCourses).toHaveBeenCalledTimes(1);
    expect(getCourseDetailsForChild).toHaveBeenCalledTimes(2);
  });

  describe('while the course loads', () => {
    it('shows a skeleton after a short wait, not a spinner, and no skeleton for a quick answer', async () => {
      const pending = deferred();
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockReturnValue(pending.promise);

      mount();
      await tick(100);
      expect(screen.queryByRole('status', { name: 'Loading the course' })).toBeNull();

      await tick(100);
      expect(screen.getByRole('status', { name: 'Loading the course' })).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).toBeNull();

      pending.resolve(ok(details()));
      await flush();

      expect(screen.queryByRole('status', { name: 'Loading the course' })).toBeNull();
      expect(screen.getByText('Second course')).toBeInTheDocument();
    });
  });

  describe('a course opened before, or started by a press on its card', () => {
    const cache = (store, childId, extra = {}) =>
      store.dispatch(
        moduleReceived({ key: moduleKey(childId, 'c2'), details: details(extra), at: Date.now() })
      );
    const skeleton = () => screen.queryByRole('status', { name: 'Loading the course' });

    it('shows the cached course at once, with no skeleton, while it refreshes quietly', async () => {
      const store = newStore();
      cache(store, 'cacheKidA');
      const refresh = deferred();
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockReturnValue(refresh.promise);

      mount({ childId: 'cacheKidA', store });
      expect(screen.getByText('Second course')).toBeInTheDocument();
      await tick(500);

      expect(skeleton()).toBeNull();
      expect(screen.getByText('Second course')).toBeInTheDocument();
      expect(getCourseDetailsForChild).toHaveBeenCalledTimes(1);
    });

    it('is on screen from the very first render, with no empty frame before the effects run', () => {
      // renderToString is the first render only (no effects have run yet), which is what the
      // child's browser paints before the request starts.
      const store = newStore();
      cache(store, 'cacheKidH');

      const firstRender = renderToString(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/child/cacheKidH/journey/c2']}>
            <Routes>
              <Route path="/child/:id/journey/:courseId" element={<ChildJourneyModule childId="cacheKidH" />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(firstRender).toContain('Second course');
    });

    it('replaces it with the fresh course when the refresh arrives', async () => {
      const store = newStore();
      cache(store, 'cacheKidB');
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(
        ok(details({ course: { _id: 'c2', title: 'Second course, updated', contents: [] } }))
      );

      mount({ childId: 'cacheKidB', store });
      await flush();

      expect(screen.getByText('Second course, updated')).toBeInTheDocument();
      expect(screen.queryByText('Second course')).toBeNull();
    });

    it('opening a course a second time shows it at once', async () => {
      const store = newStore();
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(ok(details()));
      const first = mount({ childId: 'cacheKidC', store });
      await flush();
      first.unmount();

      getCourseDetailsForChild.mockReturnValue(new Promise(() => {}));
      mount({ childId: 'cacheKidC', store });

      expect(screen.getByText('Second course')).toBeInTheDocument();
      expect(skeleton()).toBeNull();
    });

    it('keeps the cached course, with no popup and no error, when the refresh fails', async () => {
      const store = newStore();
      cache(store, 'cacheKidD');
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockRejectedValue('Server error');

      mount({ childId: 'cacheKidD', store });
      await flush();

      expect(screen.getByText('Second course')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(store.getState().ui.notification.open).toBeFalsy();
    });

    it('shows the locked message, and forgets the course, when the refresh finds it locked', async () => {
      const store = newStore();
      cache(store, 'cacheKidE');
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(ok(details({ accessible: false })));

      mount({ childId: 'cacheKidE', store });
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('This course is locked');
      expect(screen.queryByText('Second course')).toBeNull();
      expect(store.getState().childModule.detailsByKey[moduleKey('cacheKidE', 'c2')]).toBeUndefined();
    });

    it('joins a request a card already started instead of asking again', async () => {
      const store = newStore();
      const started = deferred();
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockReturnValue(started.promise);
      store.dispatch(prefetchChildModule('cacheKidF', 'c2'));

      mount({ childId: 'cacheKidF', store });
      await flush();
      expect(getCourseDetailsForChild).toHaveBeenCalledTimes(1);

      started.resolve(ok(details()));
      await flush();

      expect(getCourseDetailsForChild).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Second course')).toBeInTheDocument();
    });

    it('still shows the error with Try again when nothing is cached and the request fails', async () => {
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockRejectedValue('Server error');

      mount({ childId: 'cacheKidG' });
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
  });

  describe('pictures', () => {
    const item = (type, id) => ({ _id: id, _contentType: type, title: id });
    const withContents = (...contents) =>
      ok(details({ course: { _id: 'c2', title: 'Second course', coverImage: '/uploads/cover.png', contents } }));

    it('loads the course cover first, at once, with high priority', async () => {
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(withContents());

      mount();
      await flush();

      const cover = screen.getByAltText('Second course');
      expect(cover.getAttribute('src')).toMatch(/\/uploads\/cover\.png$/);
      expect(cover).toHaveAttribute('fetchpriority', 'high');
      expect(cover).toHaveStyle({ opacity: '0' });
      fireEvent.load(cover);
      expect(cover).toHaveStyle({ opacity: '1' });
    });

    it('counts the pictures down the page: cover, books, videos, chants, then audio', async () => {
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(
        withContents(
          item('book', 'b1'), item('book', 'b2'),
          item('video', 'v1'), item('video', 'v2'), item('video', 'v3'),
          item('chant', 'ch1'),
          item('audioAssignment', 'a1'), item('audioAssignment', 'a2')
        )
      );

      mount();
      await flush();

      expect(sectionProps.library.imageOffset).toBe(1);
      expect(sectionProps.videos.imageOffset).toBe(1 + 2);
      expect(sectionProps.chants.imageOffset).toBe(1 + 2 + 3);
      expect(sectionProps.audio.imageOffset).toBe(1 + 2 + 3 + 1);
    });

    it('leaves no gap for a section the course does not have', async () => {
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(
        withContents(item('video', 'v1'), item('video', 'v2'), item('audioAssignment', 'a1'))
      );

      mount();
      await flush();

      expect(sectionProps.library.imageOffset).toBe(1);
      expect(sectionProps.videos.imageOffset).toBe(1);
      expect(sectionProps.chants.imageOffset).toBe(1 + 2);
      expect(sectionProps.audio.imageOffset).toBe(1 + 2);
    });
  });

  describe('when the course cannot be shown', () => {
    it('a locked course shows the locked message', async () => {
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockResolvedValue(ok(details({ accessible: false })));

      mount();
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('This course is locked');
    });

    it('a failure shows the message with Try again, which loads the course', async () => {
      getChildCourses.mockResolvedValue(ok([]));
      getCourseDetailsForChild.mockRejectedValueOnce('Server error');

      mount();
      await flush();
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');

      getCourseDetailsForChild.mockResolvedValueOnce(ok(details()));
      await act(async () => screen.getByRole('button', { name: 'Try again' }).click());

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('Second course')).toBeInTheDocument();
    });
  });
});
