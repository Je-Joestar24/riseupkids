/**
 * End to end for the admin Experiences page: the real page, components, hook, Redux state and service, with only
 * the network (axios) replaced by a small fake backend that filters, searches, pages, publishes and deletes the
 * way the real one does and refuses the way it refuses.
 *
 * Covers what the admin sees and can do: the list and its cards, search, the status tabs, paging, every empty and
 * error state, publishing and hiding, deleting after a confirmation, and what happens when the server (or another
 * admin) gets in the way.
 */
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../../api/axios', () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../../../api/axios';
import theme from '../../../config/theme';
import experienceAdminReducer from '../../../store/slices/experienceAdminSlice';
import uiReducer from '../../../store/slices/uiSlice';
import AdminDialogBox from '../../common/AdminDialogBox';
import ExperiencesMain from './ExperiencesMain';

// ---------------------------------------------------------------- a fake backend

let db;
let listCalls;
let failures;

const backendError = (status, data) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
const notFound = () => backendError(404, { success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' });

const make = (n, overrides = {}) => ({
  uuid: `uuid-${n}`,
  title: `Experience ${n}`,
  description: `About experience ${n}`,
  coverImage: null,
  videoCount: 2,
  order: n,
  isPublished: false,
  publishedAt: null,
  updatedAt: '2026-11-10T10:00:00.000Z',
  ...overrides,
});

const seed = (count, overrides = () => ({})) => {
  db = Array.from({ length: count }, (_, i) => make(i + 1, overrides(i + 1)));
};

const copy = (value) => JSON.parse(JSON.stringify(value));

const listAnswer = (params = {}) => {
  let rows = [...db].sort((a, b) => a.order - b.order);
  if (params.status === 'published') rows = rows.filter((r) => r.isPublished);
  if (params.status === 'draft') rows = rows.filter((r) => !r.isPublished);
  if (params.search) rows = rows.filter((r) => r.title.toLowerCase().includes(params.search.toLowerCase()));
  const page = params.page || 1;
  const limit = params.limit || 20;
  const published = db.filter((r) => r.isPublished).length;
  return {
    data: {
      success: true,
      data: copy(rows.slice((page - 1) * limit, page * limit)),
      pagination: { page, limit, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / limit)) },
      counts: { all: db.length, published, draft: db.length - published },
    },
  };
};

const find = (url) => {
  const uuid = decodeURIComponent(url.split('/')[3]);
  return db.find((r) => r.uuid === uuid);
};

// While a pop-up (the delete question, or the notification) is open, MUI hides the rest of the page from screen
// readers, exactly as it should. The tests still need to look at the page behind it, so queries include hidden elements.
beforeAll(() => configure({ defaultHidden: true }));
afterAll(() => configure({ defaultHidden: false }));

beforeEach(() => {
  vi.clearAllMocks();
  listCalls = [];
  failures = { list: null, patch: null, delete: null };
  seed(3);

  api.get.mockImplementation(async (url, config) => {
    listCalls.push(config.params);
    if (failures.list) throw failures.list();
    return listAnswer(config.params);
  });
  api.patch.mockImplementation(async (url) => {
    if (failures.patch) throw failures.patch();
    const item = find(url);
    if (!item) throw notFound();
    const publish = url.endsWith('/publish');
    if (publish && item.videoCount === 0) {
      throw backendError(422, {
        success: false,
        code: 'PUBLISH_BLOCKED',
        message: 'This experience cannot be published yet.',
        errors: [{ field: 'videos', message: 'Add at least one video before publishing.' }],
      });
    }
    item.isPublished = publish;
    item.publishedAt = publish ? '2026-11-11T09:00:00.000Z' : null;
    return { data: { success: true, message: publish ? 'Experience published.' : 'Experience unpublished.', data: copy(item) } };
  });
  api.delete.mockImplementation(async (url) => {
    if (failures.delete) throw failures.delete();
    const item = find(url);
    if (!item) throw notFound();
    db = db.filter((r) => r !== item);
    return { data: { success: true, message: 'Experience deleted.', data: { uuid: item.uuid, title: item.title } } };
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------- the page

/** Shows where the router is, so a test can see which page a button leads to. */
const Where = () => <output data-testid="where">{useLocation().pathname}</output>;
const where = () => screen.getByTestId('where').textContent;

const renderPage = () => {
  const store = configureStore({ reducer: { experienceAdmin: experienceAdminReducer, ui: uiReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/admin/experiences']}>
          <ExperiencesMain />
          <Where />
        </MemoryRouter>
        <AdminDialogBox />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const titles = () => screen.queryAllByRole('article').map((card) => within(card).getByRole('heading').textContent);
const card = (title) => screen.getByRole('article', { name: title });
const notice = (store) => store.getState().ui.notification;
const shown = async () => screen.findAllByRole('article');
const lastList = () => listCalls[listCalls.length - 1];

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('the list', () => {
  it('loads the experiences, with the page size, and shows them in order', async () => {
    renderPage();
    await shown();
    expect(titles()).toEqual(['Experience 1', 'Experience 2', 'Experience 3']);
    expect(listCalls).toHaveLength(1);
    expect(listCalls[0]).toEqual({ limit: 12 });
  });

  it('shows a placeholder while the first load is on its way', async () => {
    const wait = deferred();
    api.get.mockImplementationOnce(() => wait.promise);
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading experiences' })).toBeInTheDocument();
    expect(screen.queryByText(/no experiences/i)).not.toBeInTheDocument();
    wait.resolve(listAnswer({ limit: 12 }));
    await shown();
    expect(screen.queryByRole('status', { name: 'Loading experiences' })).not.toBeInTheDocument();
  });

  it('the header names the page and counts everything, not only this page', async () => {
    seed(30);
    renderPage();
    await shown();
    expect(screen.getByRole('heading', { level: 1, name: 'Experiences' })).toBeInTheDocument();
    expect(screen.getByText('Total: 30 experiences')).toBeInTheDocument();
    expect(titles()).toHaveLength(12);
  });

  it('says "1 experience" for one', async () => {
    seed(1);
    renderPage();
    await shown();
    expect(screen.getByText('Total: 1 experience')).toBeInTheDocument();
  });

  it('each card shows its position, title, description, number of videos and status', async () => {
    seed(3, (n) => ({ videoCount: [0, 1, 4][n - 1], isPublished: n === 2, description: n === 3 ? '' : `About experience ${n}` }));
    renderPage();
    await shown();

    const first = within(card('Experience 1'));
    expect(first.getByText('#1')).toBeInTheDocument();
    expect(first.getByText('About experience 1')).toBeInTheDocument();
    expect(first.getByText('No videos')).toBeInTheDocument();
    expect(first.getByText('Draft')).toBeInTheDocument();

    const second = within(card('Experience 2'));
    expect(second.getByText('1 video')).toBeInTheDocument();
    expect(second.getByText('Published')).toBeInTheDocument();
    expect(second.getByText('Visible to children')).toBeInTheDocument();

    const third = within(card('Experience 3'));
    expect(third.getByText('4 videos')).toBeInTheDocument();
    expect(third.getByText('No description')).toBeInTheDocument();
    expect(third.getByText('Hidden')).toBeInTheDocument();
    expect(third.getByText('#3')).toBeInTheDocument();
  });

  it('shows when it was last changed', async () => {
    renderPage();
    await shown();
    expect(within(card('Experience 1')).getByText('Updated 10 Nov 2026')).toBeInTheDocument();
  });

  it('shows the cover picture, and a placeholder when there is none or it cannot be loaded', async () => {
    seed(2, (n) => ({ coverImage: n === 1 ? 'https://cdn.example/cover.png' : null }));
    renderPage();
    await shown();

    const picture = within(card('Experience 1')).getByRole('img', { name: 'Experience 1 cover' });
    expect(picture).toHaveAttribute('src', 'https://cdn.example/cover.png');
    expect(within(card('Experience 2')).getByText('No cover picture')).toBeInTheDocument();

    fireEvent.error(picture);
    expect(within(card('Experience 1')).getByText('No cover picture')).toBeInTheDocument();
    expect(within(card('Experience 1')).queryByRole('img', { name: 'Experience 1 cover' })).not.toBeInTheDocument();
  });

  it('a long title or description is kept inside its card (it is cut, not pushed out)', async () => {
    seed(1, () => ({ title: 'W'.repeat(180), description: 'x'.repeat(900) }));
    renderPage();
    await shown();
    const heading = screen.getByRole('heading', { level: 3 });
    expect(getComputedStyle(heading).overflow).toBe('hidden');
  });

  it('Add opens the add form', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    expect(where()).toBe('/admin/experiences');
    await user.click(screen.getByRole('button', { name: 'Add experience' }));
    expect(where()).toBe('/admin/experiences/create');
  });

  it('Edit opens the edit form of that experience', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Edit Experience 2' }));
    expect(where()).toBe('/admin/experiences/uuid-2/edit');
  });

  it('an experience that is being published, hidden or deleted cannot be opened for editing meanwhile', async () => {
    const user = userEvent.setup();
    const wait = deferred();
    api.patch.mockImplementationOnce(() => wait.promise);
    renderPage();
    await shown();
    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 1' }));
    expect(screen.getByRole('button', { name: 'Edit Experience 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Experience 2' })).toBeEnabled();
    wait.resolve({ data: { success: true, message: 'Experience published.', data: { uuid: 'uuid-1', title: 'Experience 1' } } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Experience 1' })).toBeEnabled());
  });
});

describe('search', () => {
  it('asks only after a pause in typing, once, with the text trimmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    const before = listCalls.length;

    await user.type(screen.getByLabelText('Search experiences'), '  exp  ');
    expect(listCalls).toHaveLength(before); // not on every key
    await waitFor(() => expect(lastList()).toEqual({ search: 'exp', limit: 12 }));
    expect(listCalls).toHaveLength(before + 1);
  });

  it('waits 300 ms before asking', async () => {
    vi.useFakeTimers();
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const before = listCalls.length;
    fireEvent.change(screen.getByLabelText('Search experiences'), { target: { value: 'two' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(listCalls).toHaveLength(before);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(lastList()).toMatchObject({ search: 'two' });
  });

  it('shows only the matching experiences, ignoring case', async () => {
    seed(12, (n) => ({ title: n % 4 === 0 ? `Banana ${n}` : `Strawberry ${n}` }));
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.type(screen.getByLabelText('Search experiences'), 'BANANA');
    await waitFor(() => expect(titles()).toEqual(['Banana 4', 'Banana 8', 'Banana 12']));
    expect(screen.getByText('Showing 1 to 3 of 3 experiences')).toBeInTheDocument();
  });

  it('a new search goes back to page 1', async () => {
    seed(30, (n) => ({ title: `Smoothie ${n}` }));
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    await waitFor(() => expect(lastList()).toMatchObject({ page: 3 }));

    await user.type(screen.getByLabelText('Search experiences'), 'Smoothie');
    await waitFor(() => expect(lastList()).toEqual({ search: 'Smoothie', limit: 12 })); // no page: page 1
  });

  it('the clear button empties the box and shows everything again', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.type(screen.getByLabelText('Search experiences'), 'Experience 2');
    await waitFor(() => expect(titles()).toEqual(['Experience 2']));

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByLabelText('Search experiences')).toHaveValue('');
    await waitFor(() => expect(titles()).toHaveLength(3));
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('keeps the search to 100 characters', async () => {
    renderPage();
    await shown();
    expect(screen.getByLabelText('Search experiences')).toHaveAttribute('maxlength', '100');
  });

  it('the answer of an older search never replaces a newer one', async () => {
    const slow = deferred();
    renderPage();
    await shown();
    api.get.mockImplementationOnce((url, config) => {
      listCalls.push(config.params);
      return slow.promise;
    }); // the first search is slow...
    const user = userEvent.setup();
    const box = screen.getByLabelText('Search experiences');
    await user.type(box, 'Experience 1');
    await waitFor(() => expect(lastList()).toMatchObject({ search: 'Experience 1' }));

    await user.clear(box);
    await user.type(box, 'Experience 3'); // ...the second one is quick
    await waitFor(() => expect(titles()).toEqual(['Experience 3']));

    slow.resolve(listAnswer({ search: 'Experience 1', limit: 12 })); // the slow one finally arrives
    await act(async () => {});
    expect(titles()).toEqual(['Experience 3']);
  });
});

describe('the status tabs', () => {
  beforeEach(() => seed(5, (n) => ({ isPublished: n <= 2 })));

  it('show how many are in each, and not only on this page', async () => {
    renderPage();
    await shown();
    expect(screen.getByRole('tab', { name: 'All (5)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Published (2)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Drafts (3)' })).toBeInTheDocument();
  });

  it('Published shows the published ones, Drafts the others, All everything', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();

    await user.click(screen.getByRole('tab', { name: 'Published (2)' }));
    await waitFor(() => expect(titles()).toEqual(['Experience 1', 'Experience 2']));
    expect(lastList()).toEqual({ status: 'published', limit: 12 });
    expect(screen.getByRole('tab', { name: 'Published (2)' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Drafts (3)' }));
    await waitFor(() => expect(titles()).toEqual(['Experience 3', 'Experience 4', 'Experience 5']));

    await user.click(screen.getByRole('tab', { name: 'All (5)' }));
    await waitFor(() => expect(titles()).toHaveLength(5));
    expect(lastList()).toEqual({ limit: 12 });
  });

  it('the counts do not change with the tab or the search', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('tab', { name: 'Drafts (3)' }));
    await user.type(screen.getByLabelText('Search experiences'), 'Experience 5');
    await waitFor(() => expect(titles()).toEqual(['Experience 5']));
    expect(screen.getByRole('tab', { name: 'All (5)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Published (2)' })).toBeInTheDocument();
  });

  it('a tab goes back to page 1', async () => {
    seed(30, (n) => ({ isPublished: true }));
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(lastList()).toMatchObject({ page: 2 }));
    await user.click(screen.getByRole('tab', { name: 'Published (30)' }));
    await waitFor(() => expect(lastList()).toEqual({ status: 'published', limit: 12 }));
  });
});

describe('paging', () => {
  beforeEach(() => seed(30));

  it('shows the range and the page buttons', async () => {
    renderPage();
    await shown();
    expect(screen.getByText('Showing 1 to 12 of 30 experiences')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'page 1' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Go to page 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to page 4' })).not.toBeInTheDocument();
  });

  it('goes to another page and shows its rows and range', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    await waitFor(() => expect(titles()[0]).toBe('Experience 25'));
    expect(titles()).toHaveLength(6);
    expect(screen.getByText('Showing 25 to 30 of 30 experiences')).toBeInTheDocument();
    expect(lastList()).toEqual({ page: 3, limit: 12 });
  });

  it('changing the rows per page asks for that size and goes back to page 1', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(lastList()).toMatchObject({ page: 2 }));

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '24' }));
    await waitFor(() => expect(lastList()).toEqual({ limit: 24 }));
    await waitFor(() => expect(titles()).toHaveLength(24));
    expect(screen.getByText('Showing 1 to 24 of 30 experiences')).toBeInTheDocument();
  });

  it('offers 8, 12, 24 and 48 rows', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['8', '12', '24', '48']);
  });

  it('is not shown when there is nothing to page', async () => {
    seed(0);
    renderPage();
    await screen.findByText('No experiences yet');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('a page that no longer exists (others deleted rows meanwhile) goes to the last real page', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    await waitFor(() => expect(titles()).toHaveLength(6));

    db = db.filter((r) => r.order <= 12); // other admins deleted the last 18
    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 25' })); // 404 -> the list is read again
    await waitFor(() => expect(titles()).toHaveLength(12));
    expect(titles()[0]).toBe('Experience 1');
    expect(screen.getByText('Showing 1 to 12 of 12 experiences')).toBeInTheDocument();
  });
});

describe('when there is nothing to show', () => {
  it('says there are no experiences yet when none exist', async () => {
    seed(0);
    renderPage();
    expect(await screen.findByText('No experiences yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.getByText('Total: 0 experiences')).toBeInTheDocument();
  });

  it('says nothing matches a search, and Clear filters brings everything back', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.type(screen.getByLabelText('Search experiences'), 'zzz');
    expect(await screen.findByText('No experiences match')).toBeInTheDocument();
    expect(screen.queryByText('No experiences yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(titles()).toHaveLength(3));
    expect(screen.getByLabelText('Search experiences')).toHaveValue('');
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('says nothing matches a status too, and Clear filters resets it', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('tab', { name: 'Published (0)' }));
    expect(await screen.findByText('No experiences match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(titles()).toHaveLength(3));
  });
});

describe('when loading fails', () => {
  it('a first load that fails shows the reason and a Retry that works', async () => {
    failures.list = () => backendError(500, { success: false, message: 'Something went wrong. Please try again.' });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading experiences' })).not.toBeInTheDocument();

    failures.list = null;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await shown();
    expect(titles()).toHaveLength(3);
    expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
  });

  it('an unreachable server is explained plainly', async () => {
    failures.list = networkError;
    renderPage();
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it('a refresh that fails keeps the rows, warns they may be out of date, and Retry works', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();

    failures.list = () => backendError(503, { success: false, message: 'Try again in a moment.' });
    await user.click(screen.getByRole('tab', { name: 'All (3)' })); // same tab: no request
    await user.type(screen.getByLabelText('Search experiences'), 'Experience');
    expect(await screen.findByText(/Try again in a moment\./)).toBeInTheDocument();
    expect(screen.getByText(/may be out of date/)).toBeInTheDocument();
    expect(titles()).toHaveLength(3);

    failures.list = null;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText(/may be out of date/)).not.toBeInTheDocument());
  });

  it('shows a thin progress bar over the rows while they refresh', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    const wait = deferred();
    api.get.mockImplementationOnce(() => wait.promise);
    await user.type(screen.getByLabelText('Search experiences'), 'Experience');
    expect(await screen.findByRole('progressbar', { name: 'Refreshing the list' })).toBeInTheDocument();
    expect(titles()).toHaveLength(3); // the old rows stay
    wait.resolve(listAnswer({ search: 'Experience', limit: 12 }));
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Refreshing the list' })).not.toBeInTheDocument());
  });
});

describe('publishing and hiding', () => {
  it('publishing makes it visible to children, tells the admin, and refreshes the list and the counts', async () => {
    const user = userEvent.setup();
    const store = renderPage();
    await shown();

    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 2' }));
    await waitFor(() => expect(within(card('Experience 2')).getByText('Published')).toBeInTheDocument());
    expect(api.patch).toHaveBeenCalledWith('/admin/experiences/uuid-2/publish');
    expect(notice(store)).toMatchObject({ type: 'success', message: '"Experience 2" is now visible to children.' });
    expect(screen.getByRole('tab', { name: 'Published (1)' })).toBeInTheDocument();
    expect(within(card('Experience 2')).getByText('Visible to children')).toBeInTheDocument();
  });

  it('hiding it again says so', async () => {
    seed(3, (n) => ({ isPublished: n === 1 }));
    const user = userEvent.setup();
    const store = renderPage();
    await shown();

    await user.click(screen.getByRole('checkbox', { name: 'Unpublish Experience 1' }));
    await waitFor(() => expect(within(card('Experience 1')).getByText('Draft')).toBeInTheDocument());
    expect(api.patch).toHaveBeenCalledWith('/admin/experiences/uuid-1/unpublish');
    expect(notice(store)).toMatchObject({ type: 'success', message: '"Experience 1" is now hidden from children.' });
    expect(screen.getByRole('tab', { name: 'Published (0)' })).toBeInTheDocument();
  });

  it('on the Published tab, hiding one removes it from the list', async () => {
    seed(3, () => ({ isPublished: true }));
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('tab', { name: 'Published (3)' }));
    await waitFor(() => expect(titles()).toHaveLength(3));

    await user.click(screen.getByRole('checkbox', { name: 'Unpublish Experience 2' }));
    await waitFor(() => expect(titles()).toEqual(['Experience 1', 'Experience 3']));
  });

  it('an experience that cannot be published yet stays a draft, with the reasons', async () => {
    seed(2, (n) => ({ videoCount: n === 1 ? 0 : 2 }));
    const user = userEvent.setup();
    const store = renderPage();
    await shown();

    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 1' }));
    await waitFor(() => expect(notice(store).open).toBe(true));
    expect(notice(store)).toMatchObject({
      type: 'warning',
      message: 'This experience cannot be published yet. Add at least one video before publishing.',
    });
    expect(within(card('Experience 1')).getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Publish Experience 1' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Publish Experience 1' })).toBeEnabled();
  });

  it('while it is working the switch is disabled and says so, so it cannot be tapped twice', async () => {
    const wait = deferred();
    const user = userEvent.setup();
    renderPage();
    await shown();
    api.patch.mockImplementationOnce(() => wait.promise);

    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 1' }));
    expect(await within(card('Experience 1')).findByText('Publishing…')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Publish Experience 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Experience 1' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Publish Experience 2' })).toBeEnabled(); // other rows are free

    wait.resolve({ data: { success: true, data: {} } });
    await waitFor(() => expect(screen.queryByText('Publishing…')).not.toBeInTheDocument());
  });

  it('one that was deleted by someone else meanwhile: the list refreshes and the admin is told', async () => {
    const user = userEvent.setup();
    const store = renderPage();
    await shown();
    db = db.filter((r) => r.uuid !== 'uuid-2'); // another admin deleted it

    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 2' }));
    await waitFor(() => expect(titles()).toEqual(['Experience 1', 'Experience 3']));
    expect(notice(store)).toMatchObject({ type: 'warning' });
    expect(notice(store).message).toMatch(/no longer exists/i);
  });

  it('any other failure is reported with the backend message, and the row stays as it was', async () => {
    failures.patch = () => backendError(500, { success: false, message: 'Something went wrong. Please try again.' });
    const user = userEvent.setup();
    const store = renderPage();
    await shown();

    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 1' }));
    await waitFor(() => expect(notice(store).open).toBe(true));
    expect(notice(store)).toMatchObject({ type: 'error', message: 'Something went wrong. Please try again.' });
    expect(within(card('Experience 1')).getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Publish Experience 1' })).toBeEnabled();
  });

  it('an unreachable server while publishing is explained', async () => {
    failures.patch = networkError;
    const user = userEvent.setup();
    const store = renderPage();
    await shown();
    await user.click(screen.getByRole('checkbox', { name: 'Publish Experience 1' }));
    await waitFor(() => expect(notice(store).open).toBe(true));
    expect(notice(store).message).toMatch(/could not reach the server/i);
  });
});

describe('deleting', () => {
  const askToDelete = async (user, title) => {
    await user.click(screen.getByRole('button', { name: `Delete ${title}` }));
    return screen.findByRole('dialog');
  };

  it('asks first, naming the experience and what will happen', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 2');
    expect(within(dialog).getByText('Delete experience?')).toBeInTheDocument();
    expect(within(dialog).getByText(/permanently delete "Experience 2" and its pictures/)).toBeInTheDocument();
    expect(within(dialog).getByText(/videos stay in Bunny/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/visible to children now/)).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('warns that children will lose a published experience', async () => {
    seed(2, (n) => ({ isPublished: n === 1 }));
    const user = userEvent.setup();
    renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 1');
    expect(within(dialog).getByText(/It is visible to children now, so they will stop seeing it/)).toBeInTheDocument();
  });

  it('Cancel deletes nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 2');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.delete).not.toHaveBeenCalled();
    expect(titles()).toHaveLength(3);
  });

  it('confirming deletes it, tells the admin, and refreshes the list and the counts', async () => {
    const user = userEvent.setup();
    const store = renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 2');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(titles()).toEqual(['Experience 1', 'Experience 3']));
    expect(api.delete).toHaveBeenCalledWith('/admin/experiences/uuid-2');
    expect(notice(store)).toMatchObject({ type: 'success', message: '"Experience 2" was deleted.' });
    expect(screen.getByRole('tab', { name: 'All (2)' })).toBeInTheDocument();
    expect(screen.getByText('Total: 2 experiences')).toBeInTheDocument();
  });

  it('while it is deleting the row says so and cannot be used', async () => {
    const wait = deferred();
    const user = userEvent.setup();
    renderPage();
    await shown();
    api.delete.mockImplementationOnce(() => wait.promise);
    const dialog = await askToDelete(user, 'Experience 1');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(card('Experience 1')).findByText('Deleting…')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Publish Experience 1' })).toBeDisabled();
    wait.resolve({ data: { success: true, data: { uuid: 'uuid-1', title: 'Experience 1' } } });
    db = db.filter((r) => r.uuid !== 'uuid-1');
    await waitFor(() => expect(titles()).toEqual(['Experience 2', 'Experience 3']));
  });

  it('deleting the last experience on a page goes back to the page before', async () => {
    seed(13);
    const user = userEvent.setup();
    renderPage();
    await shown();
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }));
    await waitFor(() => expect(titles()).toEqual(['Experience 13']));

    const dialog = await askToDelete(user, 'Experience 13');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(titles()).toHaveLength(12));
    expect(titles()[0]).toBe('Experience 1');
    expect(screen.getByText('Showing 1 to 12 of 12 experiences')).toBeInTheDocument();
  });

  it('deleting the last experience of all shows the empty message', async () => {
    seed(1);
    const user = userEvent.setup();
    renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 1');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No experiences yet')).toBeInTheDocument();
  });

  it('one that someone else already deleted counts as deleted: the admin is told, the list refreshes', async () => {
    const user = userEvent.setup();
    const store = renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 2');
    db = db.filter((r) => r.uuid !== 'uuid-2'); // gone before the admin confirmed
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(titles()).toEqual(['Experience 1', 'Experience 3']));
    expect(notice(store)).toMatchObject({ type: 'warning', message: '"Experience 2" was already deleted. The list was refreshed.' });
  });

  it('a failure keeps the experience, frees the row and says why', async () => {
    failures.delete = () => backendError(500, { success: false, message: 'Something went wrong. Please try again.' });
    const user = userEvent.setup();
    const store = renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 2');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(notice(store).type).toBe('error'));
    expect(notice(store).message).toBe('Something went wrong. Please try again.');
    expect(titles()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Delete Experience 2' })).toBeEnabled();
  });

  it('an unreachable server while deleting keeps the experience and explains', async () => {
    failures.delete = networkError;
    const user = userEvent.setup();
    const store = renderPage();
    await shown();
    const dialog = await askToDelete(user, 'Experience 2');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(notice(store).type).toBe('error'));
    expect(notice(store).message).toMatch(/could not reach the server/i);
    expect(titles()).toHaveLength(3);
  });

  it('refreshes with the filters as they are now, not as they were when the delete began', async () => {
    seed(5, (n) => ({ title: n <= 2 ? `Banana ${n}` : `Strawberry ${n}` }));
    const wait = deferred();
    const user = userEvent.setup();
    renderPage();
    await shown();
    api.delete.mockImplementationOnce(() => wait.promise);
    const dialog = await askToDelete(user, 'Banana 1');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await user.type(screen.getByLabelText('Search experiences'), 'Strawberry'); // searches while the delete is on its way
    await waitFor(() => expect(titles()).toEqual(['Strawberry 3', 'Strawberry 4', 'Strawberry 5']));

    db = db.filter((r) => r.uuid !== 'uuid-1');
    wait.resolve({ data: { success: true, data: { uuid: 'uuid-1', title: 'Banana 1' } } });
    await waitFor(() => expect(lastList()).toEqual({ search: 'Strawberry', limit: 12 }));
    expect(titles()).toEqual(['Strawberry 3', 'Strawberry 4', 'Strawberry 5']);
  });
});

describe('coming back to the page', () => {
  it('shows the rows it already has while it refreshes (no empty flash)', async () => {
    const store = configureStore({ reducer: { experienceAdmin: experienceAdminReducer, ui: uiReducer } });
    const tree = (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <ExperiencesMain />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
    const first = render(tree);
    await shown();
    first.unmount();

    const wait = deferred();
    api.get.mockImplementationOnce(() => wait.promise);
    render(tree);
    expect(titles()).toHaveLength(3); // straight away
    expect(screen.queryByRole('status', { name: 'Loading experiences' })).not.toBeInTheDocument();
    wait.resolve(listAnswer({ limit: 12 }));
    await act(async () => {});
  });
});
