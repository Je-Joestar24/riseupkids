/**
 * The child Experience service: the one request, what it returns and how it fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import experienceChildService from './experienceChildService';
import { EXPERIENCE_DETAIL_FAILED_MESSAGE, EXPERIENCE_NOT_FOUND_MESSAGE } from '../utils/experienceChildFormat';

vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const card = (n) => ({ uuid: `uuid-${n}`, title: `Experience ${n}`, description: '', coverImage: null, videoCount: n });

beforeEach(() => vi.clearAllMocks());

describe('getPublishedExperiences', () => {
  it('asks for the list at /experiences, once, with no filter', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });
    await experienceChildService.getPublishedExperiences();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/experiences');
  });

  it('only reads: nothing is sent, changed or deleted', async () => {
    api.get.mockResolvedValue({ data: { data: [card(1)] } });
    await experienceChildService.getPublishedExperiences();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('returns the list exactly as the server sent it, in the same order', async () => {
    const list = [card(3), card(1), card(2)];
    api.get.mockResolvedValue({ data: { success: true, data: list } });
    expect(await experienceChildService.getPublishedExperiences()).toEqual(list);
  });

  it('returns an empty list when there are none (that is not a failure)', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });
    expect(await experienceChildService.getPublishedExperiences()).toEqual([]);
  });

  it('throws the readable message the server sent', async () => {
    api.get.mockRejectedValue({ response: { data: { message: 'Not authorized to access this route.' } }, message: 'Request failed with status code 401' });
    await expect(experienceChildService.getPublishedExperiences()).rejects.toBe('Not authorized to access this route.');
  });

  it('throws the network message when there was no answer', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));
    await expect(experienceChildService.getPublishedExperiences()).rejects.toBe('Network Error');
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an HTML page', '<html>Bad gateway</html>'],
    ['an object instead of a list', { items: [] }],
    ['a body without data', {}],
  ])('treats %s as a failed load, never as "no experiences"', async (_name, body) => {
    api.get.mockResolvedValue({ data: body === undefined ? undefined : typeof body === 'string' ? body : { success: true, data: body } });
    await expect(experienceChildService.getPublishedExperiences()).rejects.toMatch(/could not load the experiences/i);
  });

  it('treats a response with a success flag but no data as a failed load', async () => {
    api.get.mockResolvedValue({ data: { success: true } });
    await expect(experienceChildService.getPublishedExperiences()).rejects.toMatch(/could not load/i);
  });
});

describe('getPublishedExperience (one experience)', () => {
  const detail = (uuid = 'uuid-1') => ({
    uuid,
    title: 'Smoothie',
    description: '',
    coverImage: null,
    videos: [{ id: 'v1', title: 'One', embedUrl: 'https://iframe.mediadelivery.net/embed/1/a', position: 1 }],
    printable: null,
  });

  it('asks for that one experience at /experiences/:uuid, once', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: detail() } });
    await experienceChildService.getPublishedExperience('uuid-1');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/experiences/uuid-1');
  });

  it('encodes the id so it can never change the address', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: detail() } });
    await experienceChildService.getPublishedExperience('a/b?c#d');
    expect(api.get).toHaveBeenCalledWith('/experiences/a%2Fb%3Fc%23d');
  });

  it('only reads: nothing is sent, changed or deleted', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: detail() } });
    await experienceChildService.getPublishedExperience('uuid-1');
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('returns the experience exactly as the server sent it', async () => {
    const data = detail();
    api.get.mockResolvedValue({ data: { success: true, data } });
    expect(await experienceChildService.getPublishedExperience('uuid-1')).toEqual(data);
  });

  it('an experience with no videos is still an experience (not a failure)', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { ...detail(), videos: [] } } });
    expect(await experienceChildService.getPublishedExperience('uuid-1')).toMatchObject({ videos: [] });
  });

  it('a 404 is thrown as the "not available" message, whatever the server wrote', async () => {
    api.get.mockRejectedValue({ response: { status: 404, data: { code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' } }, message: 'x' });
    await expect(experienceChildService.getPublishedExperience('uuid-1')).rejects.toBe(EXPERIENCE_NOT_FOUND_MESSAGE);
  });

  it('any other failure keeps the readable message the server sent (never "not available")', async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { message: 'Something went wrong.' } }, message: 'x' });
    await expect(experienceChildService.getPublishedExperience('uuid-1')).rejects.toBe('Something went wrong.');
  });

  it('a 401 is not "not available" either', async () => {
    api.get.mockRejectedValue({ response: { status: 401, data: { message: 'Not authorized.' } }, message: 'x' });
    await expect(experienceChildService.getPublishedExperience('uuid-1')).rejects.toBe('Not authorized.');
  });

  it('throws the network message when there was no answer', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));
    await expect(experienceChildService.getPublishedExperience('uuid-1')).rejects.toBe('Network Error');
  });

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['an HTML page', '<html>Bad gateway</html>'],
    ['a list instead of an experience', []],
    ['an experience with no list of videos', { uuid: 'u', title: 't' }],
    ['videos that are not a list', { uuid: 'u', title: 't', videos: 'nope' }],
  ])('treats %s as a failed load', async (_name, body) => {
    api.get.mockResolvedValue({ data: body === undefined ? undefined : typeof body === 'string' ? body : { success: true, data: body } });
    await expect(experienceChildService.getPublishedExperience('uuid-1')).rejects.toBe(EXPERIENCE_DETAIL_FAILED_MESSAGE);
  });
});
