/**
 * End to end for the Printables page: the real page, header, cards and footer; only the network service
 * is replaced. Covers the first-visit placeholder (after a short delay, never on a repeat visit), a failed
 * refresh staying silent, Retry, which module's printables are chosen, and children never seeing each
 * other's cached list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import programMaterilialsService from '../../services/programMaterilialsService';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import { SKELETON_DELAY_MS } from '../../components/child/common/ChildSkeleton';
import ChildModulePrintables from './ChildModulePrintables';

vi.mock('../../services/programMaterilialsService', () => ({ default: { getByChildId: vi.fn() } }));

const printable = (n, extra = {}) => ({
  id: `p${n}`,
  pageNumber: n,
  title: `Colouring ${n}`,
  description: `Colour page ${n}`,
  coverImage: `https://cdn.example/p${n}.png`,
  fileUrl: `https://cdn.example/p${n}.pdf`,
  ...extra,
});
const materials = (extra = {}) => ({
  modules: [
    { id: 'c1', stepNumber: 1, printables: [printable(1), printable(2)] },
    { id: 'c2', stepNumber: 2, printables: [printable(3, { title: 'Animal mask' })] },
  ],
  ...extra,
});

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
const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const tree = (store, { childId = 'kid1', courseId = 'c1' } = {}) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={[`/child/${childId}/journey/${courseId}/printables`]}>
      <Routes>
        <Route path="/child/:id/journey/:courseId/printables" element={<ChildModulePrintables />} />
        <Route path="/child/:id/journey/:courseId" element={<Where />} />
      </Routes>
    </MemoryRouter>
  </Provider>
);
const mount = (store = newStore(), options) => ({ store, ...render(tree(store, options)) });

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const placeholder = () => screen.queryByRole('status', { name: 'Loading printables' });

describe('Printables page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    programMaterilialsService.getByChildId.mockResolvedValue(materials());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('first visit', () => {
    it('asks for the materials of the child in the address, once', async () => {
      mount();
      await flush();

      expect(programMaterilialsService.getByChildId).toHaveBeenCalledTimes(1);
      expect(programMaterilialsService.getByChildId).toHaveBeenCalledWith('kid1');
    });

    it('shows no placeholder at first, so a quick answer never flashes one', async () => {
      programMaterilialsService.getByChildId.mockReturnValue(deferred().promise);
      mount();
      await flush();

      expect(placeholder()).toBeNull();
      await tick(SKELETON_DELAY_MS - 1);
      expect(placeholder()).toBeNull();
    });

    it('shows the placeholder after the delay, with the page header and footer already in place', async () => {
      programMaterilialsService.getByChildId.mockReturnValue(deferred().promise);
      mount();
      await flush();

      await tick(SKELETON_DELAY_MS);

      expect(placeholder()).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByText('Colouring 1')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('replaces the placeholder with the cards of the course in the address', async () => {
      const gate = deferred();
      programMaterilialsService.getByChildId.mockReturnValue(gate.promise);
      mount();
      await flush();
      await tick(SKELETON_DELAY_MS);

      await act(async () => gate.resolve(materials()));

      expect(placeholder()).toBeNull();
      expect(screen.getByText(/Colouring 1/)).toBeInTheDocument();
      expect(screen.getByText(/Colouring 2/)).toBeInTheDocument();
      expect(screen.queryByText(/Animal mask/)).toBeNull();
    });

    it('chooses the printables of the module that matches the course in the address', async () => {
      mount(newStore(), { courseId: 'c2' });
      await flush();

      expect(screen.getByText(/Animal mask/)).toBeInTheDocument();
      expect(screen.queryByText(/Colouring 1/)).toBeNull();
    });

    it('chooses the module by its step number when no module has the id in the address', async () => {
      mount(newStore(), { courseId: '2' });
      await flush();

      expect(screen.getByText(/Animal mask/)).toBeInTheDocument();
      expect(screen.queryByText(/Colouring 1/)).toBeNull();
    });

    it('falls back to the first module when the course in the address matches nothing', async () => {
      mount(newStore(), { courseId: '99' });
      await flush();

      expect(screen.getByText(/Colouring 1/)).toBeInTheDocument();
      expect(screen.queryByText(/Animal mask/)).toBeNull();
    });

    it('draws nothing but the page frame in the very first frame (no placeholder, no error)', () => {
      const html = renderToString(tree(newStore()));

      expect(html).not.toContain('Loading printables');
      expect(html).not.toContain('role="alert"');
      expect(html).not.toContain('Colouring');
    });

    it('opens a printable\'s file in a new tab with Download, and goes back to the course with Back', async () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      mount();
      await flush();

      fireEvent.click(screen.getByRole('button', { name: 'Download Colouring 1' }));
      expect(open).toHaveBeenCalledWith('https://cdn.example/p1.pdf', '_blank', 'noopener,noreferrer');

      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/journey/c1');
    });
  });

  describe('repeat visit', () => {
    it('draws the last list at once with no placeholder and swaps in the refreshed one', async () => {
      const store = newStore();
      mount(store).unmount();
      await flush();

      const refresh = deferred();
      programMaterilialsService.getByChildId.mockReturnValue(refresh.promise);
      mount(store);
      await flush();

      expect(screen.getByText(/Colouring 1/)).toBeInTheDocument();
      await tick(SKELETON_DELAY_MS * 3);
      expect(placeholder()).toBeNull();

      await act(async () =>
        refresh.resolve({ modules: [{ id: 'c1', stepNumber: 1, printables: [printable(1, { title: 'Colouring NEW' })] }] })
      );
      expect(screen.getByText(/Colouring NEW/)).toBeInTheDocument();
      expect(screen.queryByText(/Colouring 2/)).toBeNull();
    });

    it('stays silent when the refresh fails: the list stays, with no error and no Retry', async () => {
      const store = newStore();
      mount(store).unmount();
      await flush();

      programMaterilialsService.getByChildId.mockRejectedValue('Server is down');
      mount(store);
      await flush();
      await tick(SKELETON_DELAY_MS * 3);

      expect(screen.getByText(/Colouring 1/)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Retry loading printables' })).toBeNull();
    });

    it('never shows one child\'s cached list to another child', async () => {
      const store = newStore();
      mount(store, { childId: 'kid1' }).unmount();
      await flush();

      programMaterilialsService.getByChildId.mockReturnValue(deferred().promise);
      mount(store, { childId: 'kid2' });
      await tick(SKELETON_DELAY_MS);

      expect(screen.queryByText(/Colouring 1/)).toBeNull();
      expect(placeholder()).toBeInTheDocument();
      expect(programMaterilialsService.getByChildId).toHaveBeenLastCalledWith('kid2');
    });

    it('shows a different course of the same cached list at once', async () => {
      const store = newStore();
      mount(store, { courseId: 'c1' }).unmount();
      await flush();

      programMaterilialsService.getByChildId.mockReturnValue(deferred().promise);
      mount(store, { courseId: 'c2' });

      expect(screen.getByText(/Animal mask/)).toBeInTheDocument();
      await flush();
      expect(programMaterilialsService.getByChildId).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the first load fails', () => {
    it('shows the reason and a Retry button instead of the placeholder', async () => {
      programMaterilialsService.getByChildId.mockRejectedValue('Not allowed');
      mount();
      await flush();
      await tick(SKELETON_DELAY_MS);

      expect(screen.getByRole('alert', { name: 'Printable loading error' })).toHaveTextContent('Not allowed');
      expect(screen.getByRole('button', { name: 'Retry loading printables' })).toBeInTheDocument();
      expect(placeholder()).toBeNull();
    });

    it('uses a fixed sentence when the failure carries no text', async () => {
      programMaterilialsService.getByChildId.mockRejectedValue({ status: 500 });
      mount();
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load printables.');
    });

    it('Retry asks again, shows the placeholder while waiting, then the cards', async () => {
      programMaterilialsService.getByChildId.mockRejectedValueOnce('Network Error');
      mount();
      await flush();

      const retry = deferred();
      programMaterilialsService.getByChildId.mockReturnValue(retry.promise);
      fireEvent.click(screen.getByRole('button', { name: 'Retry loading printables' }));
      await flush();
      await tick(SKELETON_DELAY_MS);

      expect(programMaterilialsService.getByChildId).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(placeholder()).toBeInTheDocument();

      await act(async () => retry.resolve(materials()));
      expect(screen.getByText(/Colouring 1/)).toBeInTheDocument();
    });

    it('shows the error again when Retry fails again', async () => {
      programMaterilialsService.getByChildId.mockRejectedValue('Network Error');
      mount();
      await flush();

      fireEvent.click(screen.getByRole('button', { name: 'Retry loading printables' }));
      await flush();

      expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
      expect(programMaterilialsService.getByChildId).toHaveBeenCalledTimes(2);
    });
  });

  describe('without a child in the address', () => {
    it('says so, asks for nothing and offers no Retry', async () => {
      render(
        <Provider store={newStore()}>
          <MemoryRouter initialEntries={['/printables']}>
            <ChildModulePrintables />
          </MemoryRouter>
        </Provider>
      );
      await flush();
      await tick(SKELETON_DELAY_MS * 2);

      expect(screen.getByRole('alert')).toHaveTextContent('Child ID is missing.');
      expect(screen.queryByRole('button', { name: 'Retry loading printables' })).toBeNull();
      expect(placeholder()).toBeNull();
      expect(programMaterilialsService.getByChildId).not.toHaveBeenCalled();
    });
  });

  describe('an empty list', () => {
    it('draws the page with no cards and no placeholder or error', async () => {
      programMaterilialsService.getByChildId.mockResolvedValue({ modules: [] });
      mount();
      await flush();
      await tick(SKELETON_DELAY_MS * 2);

      expect(placeholder()).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Download/ })).toBeNull();
    });
  });
});
