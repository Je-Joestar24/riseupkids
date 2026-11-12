/**
 * The calls the add / edit form makes: load one experience, create one, save one. What is sent and where, what
 * comes back, and how every kind of failure reaches the screen.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';
import experienceEditorService from './experienceEditorService';

const backendError = (status, data) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

beforeEach(() => vi.clearAllMocks());

describe('getExperience', () => {
  it('asks for that experience by its id (made safe for an address) and gives back the experience', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { uuid: 'u 1', title: 'Smoothie', videos: [] } } });
    expect(await experienceEditorService.getExperience('u 1')).toEqual({ uuid: 'u 1', title: 'Smoothie', videos: [] });
    expect(api.get).toHaveBeenCalledWith('/admin/experiences/u%201');
  });

  it('turns a 404 into an error with the code the screen looks for', async () => {
    api.get.mockRejectedValue(backendError(404, { success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' }));
    await expect(experienceEditorService.getExperience('x')).rejects.toMatchObject({
      name: 'ExperienceApiError',
      status: 404,
      code: 'EXPERIENCE_NOT_FOUND',
      message: 'Experience not found.',
    });
  });

  it('says the server could not be reached when it did not answer', async () => {
    api.get.mockRejectedValue(networkError());
    await expect(experienceEditorService.getExperience('x')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });

  it('refuses an answer without an experience in it, instead of letting the screen break on it', async () => {
    api.get.mockResolvedValue({ data: { success: true } });
    await expect(experienceEditorService.getExperience('x')).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
    api.get.mockResolvedValue({ data: { success: true, data: 'text' } });
    await expect(experienceEditorService.getExperience('x')).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('uses its own words for a failure that came with no message', async () => {
    api.get.mockRejectedValue(backendError(500, {}));
    await expect(experienceEditorService.getExperience('x')).rejects.toMatchObject({ status: 500, message: 'Could not load the experience.' });
  });
});

describe('createExperience', () => {
  it('posts the form as multipart to the list address and gives back the new experience and the message', async () => {
    const body = new FormData();
    body.append('title', 'Smoothie');
    api.post.mockResolvedValue({ data: { success: true, message: 'Experience created.', data: { uuid: 'new-1', title: 'Smoothie' } } });
    const result = await experienceEditorService.createExperience(body);
    expect(result).toEqual({ experience: { uuid: 'new-1', title: 'Smoothie' }, message: 'Experience created.' });
    expect(api.post).toHaveBeenCalledWith('/admin/experiences', body, MULTIPART);
  });

  it('carries the field problems of a 400, in order, so each goes next to its field', async () => {
    const errors = [
      { field: 'title', message: 'Title is required.' },
      { field: 'videos[0].embedUrl', message: 'Video link is required.' },
    ];
    api.post.mockRejectedValue(
      backendError(400, { success: false, code: 'VALIDATION_FAILED', message: 'Please fix the highlighted fields.', errors, requestId: 'r-1' })
    );
    await expect(experienceEditorService.createExperience(new FormData())).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      errors,
      requestId: 'r-1',
    });
  });

  it.each([
    [413, 'FILE_TOO_LARGE', 'The picture is too large. The maximum size is 8 MB.'],
    [415, 'UNSUPPORTED_FILE_TYPE', 'Pictures must be JPG, PNG or WebP.'],
    [502, 'IMAGE_UPLOAD_FAILED', 'We could not save the picture. Please try again.'],
    [422, 'PUBLISH_BLOCKED', 'This experience cannot be published yet.'],
  ])('keeps the code and the message of a %i', async (status, code, message) => {
    api.post.mockRejectedValue(backendError(status, { success: false, code, message }));
    await expect(experienceEditorService.createExperience(new FormData())).rejects.toMatchObject({ status, code, message });
  });

  it('says the server could not be reached when it did not answer', async () => {
    api.post.mockRejectedValue(networkError());
    await expect(experienceEditorService.createExperience(new FormData())).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('uses its own words for a failure that came with no message', async () => {
    api.post.mockRejectedValue(backendError(500, null));
    await expect(experienceEditorService.createExperience(new FormData())).rejects.toMatchObject({
      status: 500,
      message: 'Could not create the experience.',
    });
  });

  it('falls back to a message when the answer has none', async () => {
    api.post.mockResolvedValue({ data: { success: true, data: { uuid: 'n' } } });
    expect((await experienceEditorService.createExperience(new FormData())).message).toBe('Experience created.');
  });
});

describe('updateExperience', () => {
  it('puts the form as multipart to that experience and gives back the saved one', async () => {
    const body = new FormData();
    api.put.mockResolvedValue({ data: { success: true, message: 'Experience updated.', data: { uuid: 'u1', title: 'New' } } });
    expect(await experienceEditorService.updateExperience('u1', body)).toEqual({
      experience: { uuid: 'u1', title: 'New' },
      message: 'Experience updated.',
    });
    expect(api.put).toHaveBeenCalledWith('/admin/experiences/u1', body, MULTIPART);
  });

  it('makes the id safe for an address', async () => {
    api.put.mockResolvedValue({ data: { data: {} } });
    await experienceEditorService.updateExperience('a/b', new FormData());
    expect(api.put.mock.calls[0][0]).toBe('/admin/experiences/a%2Fb');
  });

  it('falls back to a message when the answer has none', async () => {
    api.put.mockResolvedValue({ data: { success: true, data: { uuid: 'u' } } });
    expect((await experienceEditorService.updateExperience('u', new FormData())).message).toBe('Experience updated.');
  });

  it.each([
    [409, 'EXPERIENCE_CONFLICT'],
    [404, 'EXPERIENCE_NOT_FOUND'],
    [422, 'PUBLISH_BLOCKED'],
    [400, 'NOTHING_TO_UPDATE'],
  ])('keeps the code of a %i so the screen can answer it', async (status, code) => {
    api.put.mockRejectedValue(backendError(status, { success: false, code, message: 'm' }));
    await expect(experienceEditorService.updateExperience('u', new FormData())).rejects.toMatchObject({ status, code });
  });

  it('uses its own words for a failure that came with no message, and for an unreachable server', async () => {
    api.put.mockRejectedValue(backendError(500, {}));
    await expect(experienceEditorService.updateExperience('u', new FormData())).rejects.toMatchObject({ message: 'Could not save the experience.' });
    api.put.mockRejectedValue(networkError());
    await expect(experienceEditorService.updateExperience('u', new FormData())).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
