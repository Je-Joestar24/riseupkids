/**
 * End to end for the Profile page: the real page and its four sections; only the network service is
 * replaced. Covers the three requests starting together, the first-visit placeholder (after a short
 * delay, never on a repeat visit), a failed refresh staying silent, Try again, and children never
 * seeing each other's cached profile.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childProfileService from '../../services/childProfileService';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import { SKELETON_DELAY_MS } from '../../components/child/common/ChildSkeleton';
import ChildProfile from './ChildProfile';

vi.mock('../../services/childProfileService', () => ({
  default: { getChildProfile: vi.fn(), getAllBadges: vi.fn(), getChildLatestBadges: vi.fn() },
}));

const profile = (extra = {}) => ({
  _id: 'kid1',
  displayName: 'Alex',
  stats: { level: 'Rising Star', totalStars: 60, currentStreak: 2, totalBadges: 1, nextLevel: 'Super Learner', starsNeededForNextLevel: 40, badges: ['b1'] },
  ...extra,
});
const badges = [
  { _id: 'b1', name: 'First Steps', order: 1 },
  { _id: 'b2', name: 'Story Fan', order: 2 },
];
const latest = [{ _id: 'b1', name: 'First Steps' }];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const newStore = () => configureStore({ reducer: { childPageCache: childPageCacheReducer } });

const tree = (store, childId = 'kid1') => (
  <Provider store={store}>
    <MemoryRouter initialEntries={[`/child/${childId}/profile`]}>
      <Routes>
        <Route path="/child/:id/profile" element={<ChildProfile />} />
      </Routes>
    </MemoryRouter>
  </Provider>
);

const mount = (store = newStore(), childId = 'kid1') => ({ store, ...render(tree(store, childId)) });

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const placeholder = () => screen.queryByRole('status', { name: 'Loading your profile' });

const answerAll = (overrides = {}) => {
  childProfileService.getChildProfile.mockResolvedValue({ data: profile(overrides.profile) });
  childProfileService.getAllBadges.mockResolvedValue({ data: overrides.badges ?? badges });
  childProfileService.getChildLatestBadges.mockResolvedValue({ data: overrides.latest ?? latest });
};

describe('Profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    answerAll();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('first visit', () => {
    it('asks for the profile, all badges and the latest badges together, for the child in the address', async () => {
      const gates = [deferred(), deferred(), deferred()];
      childProfileService.getChildProfile.mockReturnValue(gates[0].promise);
      childProfileService.getAllBadges.mockReturnValue(gates[1].promise);
      childProfileService.getChildLatestBadges.mockReturnValue(gates[2].promise);

      mount();
      await flush();

      expect(childProfileService.getChildProfile).toHaveBeenCalledWith('kid1');
      expect(childProfileService.getAllBadges).toHaveBeenCalledTimes(1);
      expect(childProfileService.getChildLatestBadges).toHaveBeenCalledWith('kid1');
    });

    it('shows no placeholder at first, so a quick answer never flashes one', async () => {
      childProfileService.getChildProfile.mockReturnValue(deferred().promise);
      mount();
      await flush();

      expect(placeholder()).toBeNull();
      await tick(SKELETON_DELAY_MS - 1);
      expect(placeholder()).toBeNull();
    });

    it('shows the placeholder once the delay has passed, and no profile content yet', async () => {
      childProfileService.getChildProfile.mockReturnValue(deferred().promise);
      mount();
      await flush();

      await tick(SKELETON_DELAY_MS);

      expect(placeholder()).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText(/Alex the/)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('replaces the placeholder with the profile, the badges and the latest wins', async () => {
      const gate = deferred();
      childProfileService.getChildProfile.mockReturnValue(gate.promise);
      mount();
      await flush();
      await tick(SKELETON_DELAY_MS);
      expect(placeholder()).toBeInTheDocument();

      await act(async () => gate.resolve({ data: profile() }));

      expect(placeholder()).toBeNull();
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
      expect(screen.getByText('Next Level: Super Learner!')).toBeInTheDocument();
      expect(screen.getByText('Your Amazing Badges!')).toBeInTheDocument();
      expect(screen.getByText('Story Fan')).toBeInTheDocument();
      expect(screen.getByText('Unlocked First Steps!')).toBeInTheDocument();
    });

    it('keeps waiting for the slowest of the three requests before drawing', async () => {
      const slow = deferred();
      childProfileService.getChildLatestBadges.mockReturnValue(slow.promise);
      mount();
      await flush();
      await tick(SKELETON_DELAY_MS);

      expect(placeholder()).toBeInTheDocument();
      expect(screen.queryByText(/Alex the/)).toBeNull();

      await act(async () => slow.resolve({ data: latest }));
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
    });

    it('draws nothing at all in the very first frame (no placeholder, no error, no content)', () => {
      const html = renderToString(tree(newStore()));

      expect(html).not.toContain('Loading your profile');
      expect(html).not.toContain('Alex');
      expect(html).not.toContain('role="alert"');
    });
  });

  describe('repeat visit', () => {
    it('draws the last profile at once, with no placeholder, and swaps in the refreshed numbers', async () => {
      const store = newStore();
      const first = mount(store);
      await flush();
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
      first.unmount();

      const refresh = deferred();
      childProfileService.getChildProfile.mockReturnValue(refresh.promise);
      mount(store);

      // before anything has been answered, and long after the placeholder delay
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
      await tick(SKELETON_DELAY_MS * 3);
      expect(placeholder()).toBeNull();

      await act(async () =>
        refresh.resolve({ data: profile({ displayName: 'Alexander', stats: { ...profile().stats, level: 'Super Learner' } }) })
      );
      expect(screen.getByText('Alexander the Super Learner!')).toBeInTheDocument();
      expect(screen.queryByText('Alex the Rising Star!')).toBeNull();
    });

    it('stays silent when the refresh fails: the old profile stays, with no error and no Try again', async () => {
      const store = newStore();
      const first = mount(store);
      await flush();
      first.unmount();

      childProfileService.getChildProfile.mockRejectedValue('Server is down');
      mount(store);
      await flush();
      await tick(SKELETON_DELAY_MS * 3);

      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
      expect(placeholder()).toBeNull();
    });

    it('never shows one child\'s cached profile to another child', async () => {
      const store = newStore();
      const first = mount(store, 'kid1');
      await flush();
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
      first.unmount();

      childProfileService.getChildProfile.mockReturnValue(deferred().promise);
      mount(store, 'kid2');
      await tick(SKELETON_DELAY_MS);

      expect(screen.queryByText(/Alex the/)).toBeNull();
      expect(placeholder()).toBeInTheDocument();
      expect(childProfileService.getChildProfile).toHaveBeenLastCalledWith('kid2');
    });
  });

  describe('when the first load fails', () => {
    it('shows the reason with a Try again button instead of the placeholder', async () => {
      childProfileService.getChildProfile.mockRejectedValue({ message: 'Child not found' });
      mount();
      await flush();
      await tick(SKELETON_DELAY_MS);

      expect(screen.getByRole('alert')).toHaveTextContent('Child not found');
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(placeholder()).toBeNull();
    });

    it.each([
      ['a plain text rejection', 'Network Error', 'Network Error'],
      ['a rejection with no message', {}, 'Failed to load child profile'],
    ])('words %s sensibly', async (_name, rejection, expected) => {
      childProfileService.getChildProfile.mockRejectedValue(rejection);
      mount();
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent(expected);
    });

    it('fails when any one of the three requests fails', async () => {
      childProfileService.getAllBadges.mockRejectedValue('Badges are down');
      mount();
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Badges are down');
      expect(screen.queryByText(/Alex the/)).toBeNull();
    });

    it('Try again asks again, shows the placeholder while waiting, then the profile', async () => {
      childProfileService.getChildProfile.mockRejectedValueOnce('Network Error');
      mount();
      await flush();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      const retry = deferred();
      childProfileService.getChildProfile.mockReturnValue(retry.promise);
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await flush();
      await tick(SKELETON_DELAY_MS);

      expect(childProfileService.getChildProfile).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(placeholder()).toBeInTheDocument();

      await act(async () => retry.resolve({ data: profile() }));
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('shows the message again when Try again fails again', async () => {
      childProfileService.getChildProfile.mockRejectedValue('Network Error');
      mount();
      await flush();

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
      expect(childProfileService.getChildProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('without a child in the address', () => {
    it('draws nothing and asks for nothing', async () => {
      render(
        <Provider store={newStore()}>
          <MemoryRouter initialEntries={['/profile']}>
            <ChildProfile />
          </MemoryRouter>
        </Provider>
      );
      await flush();
      await tick(SKELETON_DELAY_MS * 2);

      expect(childProfileService.getChildProfile).not.toHaveBeenCalled();
      expect(placeholder()).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('uses the childId it is given when there is none in the address', async () => {
      render(
        <Provider store={newStore()}>
          <MemoryRouter initialEntries={['/profile']}>
            <ChildProfile childId="kid9" />
          </MemoryRouter>
        </Provider>
      );
      await flush();

      expect(childProfileService.getChildProfile).toHaveBeenCalledWith('kid9');
      expect(screen.getByText('Alex the Rising Star!')).toBeInTheDocument();
    });
  });
});
