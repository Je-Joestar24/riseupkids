/**
 * The Experience service: the one request, what it returns and how it fails.
 */
const mockGet = jest.fn();
jest.mock('@/services/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

import {
  EXPERIENCE_DETAIL_FAILED_MESSAGE,
  EXPERIENCE_LOAD_FAILED_MESSAGE,
  ExperienceNotFoundError,
  experienceService,
} from '@/services/experienceService';
import { ApiRequestError } from '@/utils/networkError';

const card = (n: number) => ({
  uuid: `uuid-${n}`,
  title: `Experience ${n}`,
  description: '',
  coverImage: null,
  videoCount: n,
});

beforeEach(() => jest.clearAllMocks());

describe('getPublished', () => {
  it('asks for the list at /experiences, once, with no filter', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    await experienceService.getPublished();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/experiences');
  });

  it('returns the list exactly as the server sent it, in the same order', async () => {
    const list = [card(3), card(1), card(2)];
    mockGet.mockResolvedValue({ success: true, data: list });
    await expect(experienceService.getPublished()).resolves.toEqual(list);
  });

  it('returns an empty list when there are none (that is not a failure)', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    await expect(experienceService.getPublished()).resolves.toEqual([]);
  });

  it('lets a request failure through unchanged (the store turns it into a message)', async () => {
    const failure = new Error('Network Error');
    mockGet.mockRejectedValue(failure);
    await expect(experienceService.getPublished()).rejects.toBe(failure);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an HTML page', '<html>Bad gateway</html>'],
    ['a body without data', { success: true }],
    ['an object instead of a list', { success: true, data: { items: [] } }],
    ['a null list', { success: true, data: null }],
  ])('treats %s as a failed load, never as "no experiences"', async (_name, body) => {
    mockGet.mockResolvedValue(body);
    await expect(experienceService.getPublished()).rejects.toThrow(EXPERIENCE_LOAD_FAILED_MESSAGE);
  });
});

describe('getPublishedOne (one experience)', () => {
  const detail = (uuid = 'uuid-1') => ({
    uuid,
    title: 'Smoothie',
    description: '',
    coverImage: null,
    videos: [{ id: 'v1', title: 'One', embedUrl: 'https://iframe.mediadelivery.net/embed/1/a', position: 1 }],
    printable: null,
  });

  it('asks for that one experience at /experiences/:uuid, once', async () => {
    mockGet.mockResolvedValue({ success: true, data: detail() });
    await experienceService.getPublishedOne('uuid-1');
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/experiences/uuid-1');
  });

  it('encodes the id so it can never change the address', async () => {
    mockGet.mockResolvedValue({ success: true, data: detail() });
    await experienceService.getPublishedOne('a/b?c#d');
    expect(mockGet).toHaveBeenCalledWith('/experiences/a%2Fb%3Fc%23d');
  });

  it('returns the experience exactly as the server sent it', async () => {
    const data = detail();
    mockGet.mockResolvedValue({ success: true, data });
    await expect(experienceService.getPublishedOne('uuid-1')).resolves.toEqual(data);
  });

  it('an experience with no videos is still an experience (not a failure)', async () => {
    mockGet.mockResolvedValue({ success: true, data: { ...detail(), videos: [] } });
    await expect(experienceService.getPublishedOne('uuid-1')).resolves.toMatchObject({ videos: [] });
  });

  it('a 404 is thrown as ExperienceNotFoundError', async () => {
    mockGet.mockRejectedValue(new ApiRequestError('Experience not found.', { status: 404 }));
    await expect(experienceService.getPublishedOne('uuid-1')).rejects.toBeInstanceOf(ExperienceNotFoundError);
  });

  it('a 404 in the plain axios shape is also "not found"', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 }, message: 'Request failed with status code 404' });
    await expect(experienceService.getPublishedOne('uuid-1')).rejects.toBeInstanceOf(ExperienceNotFoundError);
  });

  it.each([[500], [401], [403], [429], [502]])('a %s is not "not found": it goes through unchanged', async (status) => {
    const failure = new ApiRequestError('boom', { status });
    mockGet.mockRejectedValue(failure);
    const error = await experienceService.getPublishedOne('uuid-1').catch((e) => e);
    expect(error).toBe(failure);
    expect(error).not.toBeInstanceOf(ExperienceNotFoundError);
  });

  it('a network failure goes through unchanged', async () => {
    const failure = new Error('Network Error');
    mockGet.mockRejectedValue(failure);
    await expect(experienceService.getPublishedOne('uuid-1')).rejects.toBe(failure);
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an HTML page', '<html>Bad gateway</html>'],
    ['a body without data', { success: true }],
    ['a list instead of an experience', { success: true, data: [] }],
    ['an experience with no list of videos', { success: true, data: { uuid: 'u', title: 't' } }],
    ['videos that are not a list', { success: true, data: { uuid: 'u', title: 't', videos: 'nope' } }],
  ])('treats %s as a failed load', async (_name, body) => {
    mockGet.mockResolvedValue(body);
    await expect(experienceService.getPublishedOne('uuid-1')).rejects.toThrow(EXPERIENCE_DETAIL_FAILED_MESSAGE);
  });
});
