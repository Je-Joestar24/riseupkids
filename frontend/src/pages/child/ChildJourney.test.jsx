/**
 * End to end for My Journey: the real page, hook, store and cards — only the network service is
 * replaced. Covers the first-load skeleton, the cached list staying on screen during refreshes, the
 * quiet tab-focus refresh, and the error screen with retry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer, { journeyFailed } from '../../store/slices/childJourneySlice';
import childModuleReducer from '../../store/slices/childModuleSlice';
import { HOVER_INTENT_MS } from '../../hooks/useCoursePrefetch';
import uiReducer from '../../store/slices/uiSlice';
import courseProgressService from '../../services/courseProgressService';
import { aspectRatioOf } from '../../test/aspectRatioOf';
import ChildJourney from './ChildJourney';

vi.mock('../../services/courseProgressService', () => ({
  default: { getChildCourses: vi.fn(), getCourseDetailsForChild: vi.fn() },
}));
vi.mock('../../services/videoWatchService', () => ({ default: {} }));
vi.mock('../../services/bookReadingService', () => ({ default: {} }));

const getCourses = courseProgressService.getChildCourses;

// jsdom has no PointerEvent, so a fired event would lose its pointer type (mouse, touch, pen).
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? '';
    }
  };
}

const course = (id, title, status = 'not_started') => ({
  course: { _id: id, title, description: `About ${title}` },
  status,
  accessible: true,
  missingPrerequisites: [],
});
const ok = (...items) => ({ success: true, data: items });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Each test gets its own child, so a request left hanging by one test cannot be shared with the next.
let childCounter = 0;
let childId;

const newStore = () =>
  configureStore({
    reducer: { childJourney: childJourneyReducer, childModule: childModuleReducer, ui: uiReducer },
  });

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

function mountOn(store) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/${childId}/journey`]}>
        <Routes>
          <Route path="/child/:id/journey" element={<><ChildJourney childId={childId} /><Where /></>} />
          <Route path="/child/:id/journey/:courseId" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

function mount() {
  const store = newStore();
  mountOn(store);
  return store;
}

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const skeleton = () => screen.queryByRole('status', { name: 'Loading your journey' });

describe('My Journey page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    childId = `kid${++childCounter}`;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  describe('first load', () => {
    it('shows no skeleton for a quick answer, then the courses', async () => {
      getCourses.mockResolvedValue(ok(course('c1', 'Alpha')));

      mount();
      await flush();

      expect(skeleton()).toBeNull();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('My Journey')).toBeInTheDocument();
    });

    it('shows the skeleton for a slow answer, and replaces it with the courses', async () => {
      const pending = deferred();
      getCourses.mockReturnValue(pending.promise);

      mount();
      await tick(200);
      expect(skeleton()).toBeInTheDocument();
      // The title and the summary labels never change, so they are already there; only the step,
      // the cards and the three counts are placeholders.
      expect(screen.getByText('My Journey')).toBeInTheDocument();
      expect(screen.getByText('Progress Summary')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.queryByText(/^Step \d+ of \d+$/)).toBeNull();
      expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6 * 3 + 1 + 3);

      pending.resolve(ok(course('c1', 'Alpha')));
      await flush();

      expect(skeleton()).toBeNull();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText(/^Step \d+ of \d+$/)).toBeInTheDocument();
      expect(document.querySelector('.MuiSkeleton-root')).toBeNull();
    });

    it('does not use a spinner', async () => {
      getCourses.mockReturnValue(new Promise(() => {}));

      mount();
      await tick(200);

      expect(screen.queryByRole('progressbar')).toBeNull();
    });
  });

  describe('returning to the page with a cached list', () => {
    it('shows the cached list at once and updates it when the refresh arrives, with no skeleton', async () => {
      getCourses.mockResolvedValueOnce(ok(course('c1', 'Alpha')));
      const store = mount();
      await flush();

      // Leave and come back: a second mount of the page on the same store.
      const refresh = deferred();
      getCourses.mockReturnValueOnce(refresh.promise);
      mountOn(store);
      await tick(500);

      expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
      expect(skeleton()).toBeNull();

      refresh.resolve(ok(course('c1', 'Alpha'), course('c2', 'Beta')));
      await flush();

      expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
    });

    it('keeps the list and shows no error or popup when a refresh fails', async () => {
      getCourses.mockResolvedValueOnce(ok(course('c1', 'Alpha')));
      const store = mount();
      await flush();

      getCourses.mockRejectedValueOnce('Server error');
      mountOn(store);
      await flush();

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
      expect(store.getState().ui.notification.open).toBeFalsy();
    });
  });

  describe('coming back to the browser tab', () => {
    it('refreshes quietly — the page never blanks while it does', async () => {
      getCourses.mockResolvedValueOnce(ok(course('c1', 'Alpha')));
      mount();
      await flush();

      const refresh = deferred();
      getCourses.mockReturnValueOnce(refresh.promise);
      await tick(31_000);
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(getCourses).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(skeleton()).toBeNull();
      expect(screen.queryByRole('progressbar')).toBeNull();

      refresh.resolve(ok(course('c1', 'Alpha', 'completed')));
      await flush();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('does not ask again within 30 seconds, however often the tab is focused', async () => {
      getCourses.mockResolvedValue(ok(course('c1', 'Alpha')));
      mount();
      await flush();

      await tick(10_000);
      act(() => {
        window.dispatchEvent(new Event('focus'));
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      });
      await flush();

      expect(getCourses).toHaveBeenCalledTimes(1);
    });

    it('stops listening once the page is closed', async () => {
      getCourses.mockResolvedValue(ok(course('c1', 'Alpha')));
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = mountOn(newStore());
      await flush();

      unmount();

      const added = add.mock.calls.filter(([type]) => type === 'focus').length;
      const removed = remove.mock.calls.filter(([type]) => type === 'focus').length;
      expect(removed).toBe(added);
      add.mockRestore();
      remove.mockRestore();
    });
  });

  describe('when the first load fails', () => {
    it('shows the message with a Try again button, and no popup', async () => {
      getCourses.mockRejectedValue('Network down');

      const store = mount();
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Network down');
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(store.getState().ui.notification.open).toBeFalsy();
    });

    it('Try again loads the courses', async () => {
      getCourses.mockRejectedValueOnce('Network down');
      mount();
      await flush();

      getCourses.mockResolvedValueOnce(ok(course('c1', 'Alpha')));
      await act(async () => screen.getByRole('button', { name: 'Try again' }).click());

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });
  });

  describe('cover pictures', () => {
    const withCover = (id) => ({
      ...course(id, `Course ${id}`),
      course: { _id: id, title: `Course ${id}`, coverImage: `/uploads/${id}.png` },
    });
    const six = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

    it('loads the first four covers at once, with high priority, from the full address', async () => {
      getCourses.mockResolvedValue(ok(...six.map(withCover)));

      mount();
      await flush();

      for (const id of six.slice(0, 4)) {
        const img = screen.getByAltText(`Course ${id}`);
        expect(img.getAttribute('src')).toMatch(new RegExp(`/uploads/${id}\\.png$`));
        expect(img).toHaveAttribute('fetchpriority', 'high');
        expect(img).toHaveAttribute('loading', 'eager');
      }
    });

    it('starts the later covers one after another, with low priority', async () => {
      getCourses.mockResolvedValue(ok(...six.map(withCover)));
      mount();
      await flush();
      expect(screen.queryByAltText('Course c5')).toBeNull();
      expect(screen.queryByAltText('Course c6')).toBeNull();

      await tick(150);
      expect(screen.getByAltText('Course c5')).toHaveAttribute('fetchpriority', 'low');
      expect(screen.getByAltText('Course c5')).toHaveAttribute('loading', 'lazy');
      expect(screen.queryByAltText('Course c6')).toBeNull();

      await tick(150);
      expect(screen.getByAltText('Course c6')).toBeInTheDocument();
    });

    it('keeps the cover box in place and invisible until the picture has loaded', async () => {
      getCourses.mockResolvedValue(ok(withCover('c1')));
      mount();
      await flush();

      const img = screen.getByAltText('Course c1');
      expect(img).toHaveStyle({ opacity: '0' });
      expect(aspectRatioOf(img.parentElement)).toBe('1 / 1');

      fireEvent.load(img);
      expect(img).toHaveStyle({ opacity: '1' });
    });

    it('shows the book symbol, and requests nothing, for a course without a cover', async () => {
      getCourses.mockResolvedValue(ok(course('c1', 'Plain')));

      mount();
      await flush();

      expect(screen.queryByAltText('Plain')).toBeNull();
      expect(screen.getByText('📚')).toBeInTheDocument();
    });
  });

  describe('an earlier background failure', () => {
    it('does not flash the error before the page has asked for itself', async () => {
      const store = newStore();
      store.dispatch(journeyFailed({ childId, error: 'Home could not load it' }));
      const pending = deferred();
      getCourses.mockReturnValue(pending.promise);

      mountOn(store);
      await tick(200);

      expect(screen.queryByRole('alert')).toBeNull();
      expect(skeleton()).toBeInTheDocument();

      pending.resolve(ok(course('c1', 'Alpha')));
      await flush();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('does not paint it on the very first render either', () => {
      // renderToString is the first render only (no effects have run yet), which is what the
      // child's browser paints before the page's request starts.
      const store = newStore();
      store.dispatch(journeyFailed({ childId, error: 'Home could not load it' }));

      const firstRender = renderToString(
        <Provider store={store}>
          <MemoryRouter>
            <ChildJourney childId={childId} />
          </MemoryRouter>
        </Provider>
      );

      expect(firstRender).not.toContain('Home could not load it');
    });

    it('shows the error when the page’s own request fails too', async () => {
      const store = newStore();
      store.dispatch(journeyFailed({ childId, error: 'Home could not load it' }));
      getCourses.mockRejectedValue('Network down');

      mountOn(store);
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Network down');
    });
  });

  describe('starting a course before its page opens', () => {
    const { getCourseDetailsForChild: getDetails } = courseProgressService;
    const pathNow = () => screen.getByTestId('where').textContent;
    const cardOf = (title) => screen.getByText(title).closest('.MuiCard-root');
    const list = () =>
      ok(
        course('c1', 'Alpha', 'in_progress'),
        { ...course('c2', 'Beta', 'locked'), accessible: false },
        course('c3', 'Gamma', 'completed')
      );

    let RealImage;
    let pictures;
    beforeEach(() => {
      getDetails.mockReturnValue(new Promise(() => {}));
      pictures = [];
      RealImage = globalThis.Image;
      globalThis.Image = class {
        constructor() {
          pictures.push(this);
        }
      };
    });
    afterEach(() => {
      globalThis.Image = RealImage;
    });

    async function mountList(items = list()) {
      getCourses.mockResolvedValue(items);
      const store = mount();
      await flush();
      return store;
    }

    it('pressing a card starts loading its course, while the page is still My Journey', async () => {
      await mountList();

      fireEvent.pointerDown(cardOf('Alpha'));

      expect(getDetails).toHaveBeenCalledTimes(1);
      expect(getDetails).toHaveBeenCalledWith('c1', childId);
      expect(pathNow()).toBe(`/child/${childId}/journey`);
    });

    it('pressing and then clicking asks once, and opens the course', async () => {
      await mountList();

      fireEvent.pointerDown(cardOf('Alpha'));
      fireEvent.click(cardOf('Alpha'));

      expect(getDetails).toHaveBeenCalledTimes(1);
      expect(pathNow()).toBe(`/child/${childId}/journey/c1`);
    });

    it('a click on its own (keyboard, assistive tools) also starts it, and opens the course', async () => {
      await mountList();

      fireEvent.click(cardOf('Gamma'));

      expect(getDetails).toHaveBeenCalledWith('c3', childId);
      expect(pathNow()).toBe(`/child/${childId}/journey/c3`);
    });

    it('a mouse resting on a card starts it after a short wait', async () => {
      await mountList();

      fireEvent.pointerEnter(cardOf('Alpha'), { pointerType: 'mouse' });
      await tick(HOVER_INTENT_MS - 1);
      expect(getDetails).not.toHaveBeenCalled();

      await tick(1);
      expect(getDetails).toHaveBeenCalledTimes(1);
      expect(getDetails).toHaveBeenCalledWith('c1', childId);
    });

    it('a mouse just passing over a card starts nothing', async () => {
      await mountList();

      fireEvent.pointerEnter(cardOf('Alpha'), { pointerType: 'mouse' });
      await tick(50);
      fireEvent.pointerLeave(cardOf('Alpha'), { pointerType: 'mouse' });
      await tick(500);

      expect(getDetails).not.toHaveBeenCalled();
    });

    it('moving from one card to the next starts only the one the mouse rests on', async () => {
      await mountList();

      fireEvent.pointerEnter(cardOf('Alpha'), { pointerType: 'mouse' });
      await tick(50);
      fireEvent.pointerLeave(cardOf('Alpha'), { pointerType: 'mouse' });
      fireEvent.pointerEnter(cardOf('Gamma'), { pointerType: 'mouse' });
      await tick(500);

      expect(getDetails).toHaveBeenCalledTimes(1);
      expect(getDetails).toHaveBeenCalledWith('c3', childId);
    });

    it('a touch or pen “hover” does not start anything (only a real press does)', async () => {
      await mountList();

      fireEvent.pointerEnter(cardOf('Alpha'), { pointerType: 'touch' });
      await tick(500);
      expect(getDetails).not.toHaveBeenCalled();

      fireEvent.pointerDown(cardOf('Alpha'), { pointerType: 'touch' });
      expect(getDetails).toHaveBeenCalledTimes(1);
    });

    it('stops waiting when the page is closed', async () => {
      await mountList();
      fireEvent.pointerEnter(cardOf('Alpha'), { pointerType: 'mouse' });

      cleanup();
      await tick(500);

      expect(getDetails).not.toHaveBeenCalled();
    });

    it('a locked card starts nothing and does not open', async () => {
      await mountList();

      fireEvent.pointerDown(cardOf('Locked Step'));
      fireEvent.pointerEnter(cardOf('Locked Step'), { pointerType: 'mouse' });
      await tick(500);
      fireEvent.click(cardOf('Locked Step'));

      expect(getDetails).not.toHaveBeenCalled();
      expect(pathNow()).toBe(`/child/${childId}/journey`);
    });

    it('also starts loading the card’s cover', async () => {
      const items = ok(
        ...['a', 'b', 'c', 'd', 'e'].map((letter) => ({
          ...course(`${childId}${letter}`, `Course ${letter}`, 'in_progress'),
          course: {
            _id: `${childId}${letter}`,
            title: `Course ${letter}`,
            coverImage: `/uploads/${childId}${letter}.png`,
          },
        }))
      );
      await mountList(items);
      // The first four covers were started when the list arrived; the fifth was not.
      expect(pictures).toHaveLength(4);

      await tick(150);
      fireEvent.pointerDown(cardOf('Course e'));

      expect(pictures).toHaveLength(5);
      expect(pictures[4].src).toMatch(new RegExp(`/uploads/${childId}e\\.png$`));
    });

    it('a failed start is silent: no popup, and My Journey is untouched', async () => {
      getDetails.mockRejectedValue('Server error');
      const store = await mountList();

      fireEvent.pointerDown(cardOf('Alpha'));
      await flush();

      expect(screen.queryByRole('alert')).toBeNull();
      expect(store.getState().ui.notification.open).toBeFalsy();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });
  });

  it('shows the empty message for a child with no courses', async () => {
    getCourses.mockResolvedValue({ success: true, data: [] });

    mount();
    await flush();

    expect(screen.getByText(/No courses available yet/)).toBeInTheDocument();
  });
});
