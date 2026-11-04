/**
 * End to end across My Journey and the course page, with the real store, hooks and both pages; only
 * the network service and the heavy player/content components are replaced. Covers a press on a
 * card starting the course before the page opens, the page using that one request, and the course
 * being on screen at once the second time it is opened.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer from '../../store/slices/childJourneySlice';
import childModuleReducer from '../../store/slices/childModuleSlice';
import uiReducer from '../../store/slices/uiSlice';
import courseProgressService from '../../services/courseProgressService';
import ChildJourney from './ChildJourney';
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
vi.mock('../../components/child/module/ChildModuleLibrary', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChildModuleVideos', async () => {
  const React = await import('react');
  return { default: React.forwardRef(() => null) };
});
vi.mock('../../components/child/module/ChildModuleAudio', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChildModuleChants', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChildModuleFooter', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChildModulePrintables', () => ({ default: () => null }));

const { getChildCourses, getCourseDetailsForChild } = courseProgressService;

const ok = (data) => ({ success: true, data });
const journeyList = [
  { course: { _id: 'c1', title: 'First week', description: 'About it' }, status: 'in_progress', accessible: true },
];
const courseDetails = {
  accessible: true,
  course: { _id: 'c1', title: 'First week, in full', description: 'About it', contents: [] },
  progress: null,
};

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let childCounter = 0;

function mount() {
  const childId = `flowKid${++childCounter}`;
  const store = configureStore({
    reducer: { childJourney: childJourneyReducer, childModule: childModuleReducer, ui: uiReducer },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/${childId}/journey`]}>
        <Routes>
          <Route path="/child/:id/journey" element={<ChildJourney childId={childId} />} />
          <Route path="/child/:id/journey/:courseId" element={<ChildJourneyModule childId={childId} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { store, childId };
}

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const card = () => screen.getByText('First week').closest('.MuiCard-root');
const courseSkeleton = () => screen.queryByRole('status', { name: 'Loading the course' });

describe('Opening a course from My Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getChildCourses.mockResolvedValue(ok(journeyList));
  });
  afterEach(() => vi.useRealTimers());

  it('uses the one request the press started: the page opens, and fills when it arrives', async () => {
    const details = deferred();
    getCourseDetailsForChild.mockReturnValue(details.promise);
    mount();
    await flush();

    fireEvent.pointerDown(card());
    await tick(100); // a finger takes a moment between touching and lifting
    fireEvent.click(card());
    await flush();

    // The page is the course page now, and it did not ask a second time.
    expect(screen.queryByText('My Journey')).toBeNull();
    expect(getCourseDetailsForChild).toHaveBeenCalledTimes(1);

    details.resolve(ok(courseDetails));
    await flush();

    expect(screen.getByText('First week, in full')).toBeInTheDocument();
    expect(getCourseDetailsForChild).toHaveBeenCalledTimes(1);
  });

  it('the answer that arrived while the finger was down is on screen the moment the page opens', async () => {
    getCourseDetailsForChild.mockResolvedValue(ok(courseDetails));
    mount();
    await flush();

    fireEvent.pointerDown(card());
    await flush(); // the course arrives before the click
    fireEvent.click(card());

    expect(screen.getByText('First week, in full')).toBeInTheDocument();
    expect(courseSkeleton()).toBeNull();
  });

  it('opening the same course again shows it at once, then refreshes it quietly', async () => {
    getCourseDetailsForChild.mockResolvedValue(ok(courseDetails));
    mount();
    await flush();
    fireEvent.click(card());
    await flush();
    expect(screen.getByText('First week, in full')).toBeInTheDocument();

    // Back to My Journey, and wait out the 30 s a prefetch would be skipped for.
    fireEvent.click(screen.getAllByLabelText('Go back to journey')[0]);
    await flush();
    await tick(31_000);

    const refresh = deferred();
    getCourseDetailsForChild.mockReturnValue(refresh.promise);
    fireEvent.click(card());

    expect(screen.getByText('First week, in full')).toBeInTheDocument();
    await tick(500);
    expect(courseSkeleton()).toBeNull();
    expect(getCourseDetailsForChild).toHaveBeenCalledTimes(2);

    refresh.resolve(
      ok({ ...courseDetails, course: { ...courseDetails.course, title: 'First week, updated' } })
    );
    await flush();
    expect(screen.getByText('First week, updated')).toBeInTheDocument();
  });
});
