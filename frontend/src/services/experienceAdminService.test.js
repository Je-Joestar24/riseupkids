/**
 * The admin Experiences service: the addresses it calls, what it sends, how it shapes the answers, and how it
 * turns every kind of failure (a backend refusal, an unreachable server) into an error the screen can use.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';
import experienceAdminService, {
  EXPERIENCE_STATUS,
  ExperienceApiError,
  buildListParams,
  toExperienceApiError,
} from './experienceAdminService';

const backendError = (status, data) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

beforeEach(() => vi.clearAllMocks());

describe('buildListParams', () => {
  it('sends nothing for the defaults, so the address stays short', () => {
    expect(buildListParams({})).toEqual({});
    expect(buildListParams()).toEqual({});
    expect(buildListParams({ status: 'all', search: '', page: 1 })).toEqual({});
  });

  it('sends only what differs', () => {
    expect(buildListParams({ status: 'published', search: 'straw', page: 3, limit: 24 })).toEqual({
      status: 'published',
      search: 'straw',
      page: 3,
      limit: 24,
    });
  });

  it('trims the search and ignores a search of only spaces', () => {
    expect(buildListParams({ search: '  banana  ' })).toEqual({ search: 'banana' });
    expect(buildListParams({ search: '   ' })).toEqual({});
  });

  it('ignores a page or limit that is not a positive whole number', () => {
    expect(buildListParams({ page: 0, limit: 0 })).toEqual({});
    expect(buildListParams({ page: -2, limit: -1 })).toEqual({});
    expect(buildListParams({ page: 1.5, limit: '12' })).toEqual({});
    expect(buildListParams({ page: NaN })).toEqual({});
  });

  it('draft is a status too', () => {
    expect(buildListParams({ status: EXPERIENCE_STATUS.DRAFT })).toEqual({ status: 'draft' });
  });
});

describe('listExperiences', () => {
  it('asks /admin/experiences with the filters and returns the rows, the paging and the counts', async () => {
    api.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ uuid: 'a', title: 'A' }],
        pagination: { page: 2, limit: 12, total: 13, pages: 2 },
        counts: { all: 13, published: 5, draft: 8 },
      },
    });
    const result = await experienceAdminService.listExperiences({ status: 'draft', search: 'a', page: 2, limit: 12 });
    expect(api.get).toHaveBeenCalledWith('/admin/experiences', { params: { status: 'draft', search: 'a', page: 2, limit: 12 } });
    expect(result).toEqual({
      items: [{ uuid: 'a', title: 'A' }],
      pagination: { page: 2, limit: 12, total: 13, pages: 2 },
      counts: { all: 13, published: 5, draft: 8 },
    });
  });

  it('copes with an answer that is missing pieces', async () => {
    api.get.mockResolvedValue({ data: { success: true } });
    expect(await experienceAdminService.listExperiences()).toEqual({
      items: [],
      pagination: { page: 1, limit: 0, total: 0, pages: 1 },
      counts: { all: 0, published: 0, draft: 0 },
    });
    api.get.mockResolvedValue({ data: { data: 'nope', counts: { all: 2 } } });
    const odd = await experienceAdminService.listExperiences();
    expect(odd.items).toEqual([]);
    expect(odd.counts).toEqual({ all: 2, published: 0, draft: 0 });
    api.get.mockResolvedValue({});
    expect((await experienceAdminService.listExperiences()).items).toEqual([]);
  });

  it('turns a refusal into an ExperienceApiError with the status, code and fields', async () => {
    api.get.mockRejectedValue(
      backendError(400, {
        success: false,
        code: 'VALIDATION_FAILED',
        message: 'Please fix the highlighted fields.',
        errors: [{ field: 'page', message: 'Page must be a whole number of 1 or more.' }],
        requestId: 'req-1',
      })
    );
    const error = await experienceAdminService.listExperiences({ page: 0 }).catch((e) => e);
    expect(error).toBeInstanceOf(ExperienceApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', requestId: 'req-1', message: 'Please fix the highlighted fields.' });
    expect(error.errors).toHaveLength(1);
  });

  it('says so plainly when the server cannot be reached', async () => {
    api.get.mockRejectedValue(networkError());
    const error = await experienceAdminService.listExperiences().catch((e) => e);
    expect(error).toMatchObject({ status: null, code: 'NETWORK_ERROR' });
    expect(error.message).toMatch(/could not reach the server/i);
  });
});

describe('publish, unpublish and delete', () => {
  it('publishes with PATCH and returns the experience and the message', async () => {
    api.patch.mockResolvedValue({ data: { success: true, message: 'Experience published.', data: { uuid: 'a', isPublished: true } } });
    const result = await experienceAdminService.publishExperience('a');
    expect(api.patch).toHaveBeenCalledWith('/admin/experiences/a/publish');
    expect(result).toEqual({ experience: { uuid: 'a', isPublished: true }, message: 'Experience published.' });
  });

  it('unpublishes with PATCH', async () => {
    api.patch.mockResolvedValue({ data: { success: true, message: 'Experience unpublished.', data: { uuid: 'a', isPublished: false } } });
    const result = await experienceAdminService.unpublishExperience('a');
    expect(api.patch).toHaveBeenCalledWith('/admin/experiences/a/unpublish');
    expect(result.experience.isPublished).toBe(false);
  });

  it('deletes with DELETE and returns what was deleted', async () => {
    api.delete.mockResolvedValue({ data: { success: true, data: { uuid: 'a', title: 'A' } } });
    expect(await experienceAdminService.deleteExperience('a')).toEqual({ uuid: 'a', title: 'A' });
    expect(api.delete).toHaveBeenCalledWith('/admin/experiences/a');
  });

  it('falls back to the id and a default message when the answer is empty', async () => {
    api.patch.mockResolvedValue({ data: {} });
    expect(await experienceAdminService.publishExperience('a')).toEqual({ experience: undefined, message: 'Experience published.' });
    api.delete.mockResolvedValue({ data: {} });
    expect(await experienceAdminService.deleteExperience('a')).toEqual({ uuid: 'a', title: '' });
  });

  it('puts the id in the address safely', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await experienceAdminService.deleteExperience('a/b?c');
    expect(api.delete).toHaveBeenCalledWith('/admin/experiences/a%2Fb%3Fc');
  });

  it.each([
    ['publishExperience', 'patch', 'Could not publish the experience.'],
    ['unpublishExperience', 'patch', 'Could not unpublish the experience.'],
    ['deleteExperience', 'delete', 'Could not delete the experience.'],
  ])('%s keeps what the backend said (a blocked publish lists its reasons)', async (method, verb) => {
    api[verb].mockRejectedValue(
      backendError(422, {
        success: false,
        code: 'PUBLISH_BLOCKED',
        message: 'This experience cannot be published yet.',
        errors: [{ field: 'videos', message: 'Add at least one video before publishing.' }],
      })
    );
    const error = await experienceAdminService[method]('a').catch((e) => e);
    expect(error).toMatchObject({ status: 422, code: 'PUBLISH_BLOCKED' });
    expect(error.errors[0].message).toBe('Add at least one video before publishing.');
  });

  it.each([
    ['publishExperience', 'patch', 'Could not publish the experience.'],
    ['unpublishExperience', 'patch', 'Could not unpublish the experience.'],
    ['deleteExperience', 'delete', 'Could not delete the experience.'],
  ])('%s uses its own message when the backend gave none', async (method, verb, message) => {
    api[verb].mockRejectedValue(backendError(500, '<html>Bad gateway</html>'));
    const error = await experienceAdminService[method]('a').catch((e) => e);
    expect(error).toMatchObject({ status: 500, message, code: null, errors: [] });
  });
});

describe('toExperienceApiError', () => {
  it('hands an ExperienceApiError back untouched', () => {
    const original = new ExperienceApiError('x', { status: 409, code: 'EXPERIENCE_CONFLICT' });
    expect(toExperienceApiError(original, 'fallback')).toBe(original);
  });

  it('copes with an answer that is not an object, or errors that are not a list', () => {
    expect(toExperienceApiError(backendError(502, null), 'fallback')).toMatchObject({ message: 'fallback', status: 502 });
    expect(toExperienceApiError(backendError(400, { message: 'm', errors: 'oops' }), 'f').errors).toEqual([]);
  });

  it('copes with nothing at all', () => {
    expect(toExperienceApiError(undefined, 'fallback')).toMatchObject({ code: 'NETWORK_ERROR' });
    expect(toExperienceApiError(null, 'fallback')).toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('is an Error, so it can be thrown and caught like one', () => {
    const error = new ExperienceApiError('boom');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ExperienceApiError');
    expect(error).toMatchObject({ status: null, code: null, errors: [], requestId: null });
  });
});
