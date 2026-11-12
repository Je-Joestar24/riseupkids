/**
 * The admin Experiences list state: filters (any change but the page goes back to page 1), the loading and
 * error states, keeping the old rows while refreshing, ignoring an answer to an older request, and which row
 * is busy.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store as appStore } from '../store';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../../services/experienceAdminService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: { listExperiences: vi.fn(), publishExperience: vi.fn(), unpublishExperience: vi.fn(), deleteExperience: vi.fn() },
  };
});

import service, { ExperienceApiError } from '../../services/experienceAdminService';
import reducer, {
  DEFAULT_PAGE_SIZE,
  clearExperienceFilters,
  deleteExperience,
  fetchExperiences,
  publishExperience,
  resetExperienceAdmin,
  setExperienceFilters,
  unpublishExperience,
} from './experienceAdminSlice';

const makeStore = () => configureStore({ reducer: { experienceAdmin: reducer } });
const stateOf = (store) => store.getState().experienceAdmin;

const page = (titles, extra = {}) => ({
  items: titles.map((title, i) => ({ uuid: `u-${title}`, title, order: i + 1 })),
  pagination: { page: 1, limit: 12, total: titles.length, pages: 1 },
  counts: { all: titles.length, published: 0, draft: titles.length },
  ...extra,
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => vi.clearAllMocks());

describe('the starting state', () => {
  it('has nothing loaded, the default filters and nothing busy', () => {
    const state = reducer(undefined, { type: 'x' });
    expect(state).toMatchObject({
      items: [],
      pagination: null,
      counts: { all: 0, published: 0, draft: 0 },
      filters: { status: 'all', search: '', page: 1, limit: DEFAULT_PAGE_SIZE },
      loaded: false,
      loading: false,
      error: null,
      busy: {},
    });
    expect(DEFAULT_PAGE_SIZE).toBe(12);
  });
});

describe('filters', () => {
  it('any change but the page goes back to page 1', () => {
    let state = reducer(undefined, setExperienceFilters({ page: 3 }));
    expect(state.filters.page).toBe(3);
    state = reducer(state, setExperienceFilters({ search: 'straw' }));
    expect(state.filters).toMatchObject({ search: 'straw', page: 1 });
    state = reducer(state, setExperienceFilters({ page: 2 }));
    state = reducer(state, setExperienceFilters({ status: 'draft' }));
    expect(state.filters).toMatchObject({ status: 'draft', page: 1 });
  });

  it('a change of the page size that also gives the page keeps that page', () => {
    const state = reducer(undefined, setExperienceFilters({ limit: 24, page: 1 }));
    expect(state.filters).toMatchObject({ limit: 24, page: 1 });
  });

  it('repairs a page or size that is not a positive whole number, and a search that is not text', () => {
    const state = reducer(undefined, setExperienceFilters({ page: 0, limit: -5, search: null }));
    expect(state.filters).toEqual({ status: 'all', search: '', page: 1, limit: DEFAULT_PAGE_SIZE });
    expect(reducer(undefined, setExperienceFilters({ page: 2.5 })).filters.page).toBe(1);
  });

  it('clearing the filters keeps the page size the admin chose', () => {
    let state = reducer(undefined, setExperienceFilters({ limit: 48 }));
    state = reducer(state, setExperienceFilters({ search: 'x', status: 'published', page: 4 }));
    state = reducer(state, clearExperienceFilters());
    expect(state.filters).toEqual({ status: 'all', search: '', page: 1, limit: 48 });
  });

  it('resetting forgets everything', () => {
    const state = reducer(reducer(undefined, setExperienceFilters({ search: 'x' })), resetExperienceAdmin());
    expect(state).toEqual(reducer(undefined, { type: 'x' }));
  });
});

describe('loading the list', () => {
  it('is loading while the request is out, then holds the rows, the paging and the counts', async () => {
    const wait = deferred();
    service.listExperiences.mockReturnValue(wait.promise);
    const store = makeStore();
    const request = store.dispatch(fetchExperiences({ page: 1 }));
    expect(stateOf(store)).toMatchObject({ loading: true, loaded: false });

    wait.resolve(page(['A', 'B']));
    await request;
    expect(stateOf(store)).toMatchObject({
      loading: false,
      loaded: true,
      error: null,
      items: [expect.objectContaining({ title: 'A' }), expect.objectContaining({ title: 'B' })],
      pagination: { total: 2 },
      counts: { all: 2, published: 0, draft: 2 },
    });
    expect(service.listExperiences).toHaveBeenCalledWith({ page: 1 });
  });

  it('a failed first load keeps the reason (message, code, status) and stays not loaded', async () => {
    service.listExperiences.mockRejectedValue(new ExperienceApiError('Server is down', { status: 503, code: 'X' }));
    const store = makeStore();
    await store.dispatch(fetchExperiences({}));
    expect(stateOf(store)).toMatchObject({
      loading: false,
      loaded: false,
      items: [],
      error: { message: 'Server is down', status: 503, code: 'X' },
    });
  });

  it('a failure that is not an ExperienceApiError still ends with a usable message', async () => {
    service.listExperiences.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500, data: { message: 'Something went wrong.' } } }));
    const store = makeStore();
    await store.dispatch(fetchExperiences({}));
    expect(stateOf(store).error.message).toBe('Something went wrong.');
  });

  it('a refresh keeps the old rows on screen while it runs and when it fails', async () => {
    service.listExperiences.mockResolvedValueOnce(page(['A']));
    const store = makeStore();
    await store.dispatch(fetchExperiences({}));

    const wait = deferred();
    service.listExperiences.mockReturnValueOnce(wait.promise);
    const refresh = store.dispatch(fetchExperiences({}));
    expect(stateOf(store)).toMatchObject({ loading: true, loaded: true });
    expect(stateOf(store).items).toHaveLength(1);

    wait.reject(new ExperienceApiError('Offline', { code: 'NETWORK_ERROR' }));
    await refresh;
    expect(stateOf(store)).toMatchObject({ loading: false, loaded: true, error: { message: 'Offline' } });
    expect(stateOf(store).items).toHaveLength(1);
  });

  it('a later success clears the error', async () => {
    service.listExperiences.mockRejectedValueOnce(new ExperienceApiError('Offline'));
    const store = makeStore();
    await store.dispatch(fetchExperiences({}));
    service.listExperiences.mockResolvedValueOnce(page(['A']));
    await store.dispatch(fetchExperiences({}));
    expect(stateOf(store)).toMatchObject({ error: null, loaded: true });
  });

  it('an answer to an older request is ignored when a newer one is on its way', async () => {
    const first = deferred();
    const second = deferred();
    service.listExperiences.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const store = makeStore();
    const olderRequest = store.dispatch(fetchExperiences({ search: 's' }));
    const newerRequest = store.dispatch(fetchExperiences({ search: 'st' }));

    second.resolve(page(['Strawberry']));
    await newerRequest;
    first.resolve(page(['Salad', 'Soup', 'Sandwich']));
    await olderRequest;

    expect(stateOf(store).items.map((i) => i.title)).toEqual(['Strawberry']);
    expect(stateOf(store).loading).toBe(false);
  });

  it('an older failure does not replace a newer answer either', async () => {
    const first = deferred();
    const second = deferred();
    service.listExperiences.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const store = makeStore();
    const olderRequest = store.dispatch(fetchExperiences({ search: 's' }));
    const newerRequest = store.dispatch(fetchExperiences({ search: 'st' }));
    second.resolve(page(['Strawberry']));
    await newerRequest;
    first.reject(new ExperienceApiError('Too late'));
    await olderRequest;
    expect(stateOf(store).error).toBeNull();
    expect(stateOf(store).items).toHaveLength(1);
  });
});

describe('row actions', () => {
  it.each([
    ['publishing', publishExperience, 'publishExperience'],
    ['unpublishing', unpublishExperience, 'unpublishExperience'],
    ['deleting', deleteExperience, 'deleteExperience'],
  ])('%s marks that row busy until it finishes', async (kind, thunk, method) => {
    const wait = deferred();
    service[method].mockReturnValue(wait.promise);
    const store = makeStore();
    const action = store.dispatch(thunk('u-1'));
    expect(stateOf(store).busy).toEqual({ 'u-1': kind });
    wait.resolve({});
    await action;
    expect(stateOf(store).busy).toEqual({});
  });

  it.each([
    ['publishExperience', publishExperience],
    ['unpublishExperience', unpublishExperience],
    ['deleteExperience', deleteExperience],
  ])('%s frees the row when it fails, and carries the reason', async (method, thunk) => {
    service[method].mockRejectedValue(new ExperienceApiError('No way', { status: 422, code: 'PUBLISH_BLOCKED', errors: [{ field: 'videos', message: 'm' }] }));
    const store = makeStore();
    const result = await store.dispatch(thunk('u-1'));
    expect(stateOf(store).busy).toEqual({});
    expect(result.payload).toEqual({ message: 'No way', status: 422, code: 'PUBLISH_BLOCKED', errors: [{ field: 'videos', message: 'm' }] });
  });

  it('two rows can be busy at the same time, each on its own', async () => {
    const a = deferred();
    const b = deferred();
    service.deleteExperience.mockReturnValueOnce(a.promise);
    service.publishExperience.mockReturnValueOnce(b.promise);
    const store = makeStore();
    const deleting = store.dispatch(deleteExperience('u-a'));
    const publishing = store.dispatch(publishExperience('u-b'));
    expect(stateOf(store).busy).toEqual({ 'u-a': 'deleting', 'u-b': 'publishing' });
    a.resolve({});
    await deleting;
    expect(stateOf(store).busy).toEqual({ 'u-b': 'publishing' });
    b.resolve({});
    await publishing;
  });

  it('does not change the rows itself: the list is read again afterwards', async () => {
    service.listExperiences.mockResolvedValueOnce(page(['A']));
    const store = makeStore();
    await store.dispatch(fetchExperiences({}));
    service.deleteExperience.mockResolvedValue({ uuid: 'u-A', title: 'A' });
    await store.dispatch(deleteExperience('u-A'));
    expect(stateOf(store).items).toHaveLength(1);
  });
});

describe('the app store', () => {
  it('has the experiences list state registered under experienceAdmin, starting empty', () => {
    const state = appStore.getState().experienceAdmin;
    expect(state).toBeDefined();
    expect(state.items).toEqual([]);
    expect(state.loaded).toBe(false);
    expect(state.filters.limit).toBe(12);
  });
});
