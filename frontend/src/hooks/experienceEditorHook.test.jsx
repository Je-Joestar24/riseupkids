/**
 * The editor hook on its own (the page above it is covered end to end): what it reports after a save, a double
 * try, and a failure.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../services/experienceEditorService', () => ({
  default: { getExperience: vi.fn(), createExperience: vi.fn(), updateExperience: vi.fn() },
}));

import experienceEditorService from '../services/experienceEditorService';
import { ExperienceApiError } from '../services/experienceAdminService';
import uiReducer from '../store/slices/uiSlice';
import useExperienceEditor from './experienceEditorHook';

const LINK = 'https://iframe.mediadelivery.net/embed/1/v1';
const wrapper = ({ children }) => <Provider store={configureStore({ reducer: { ui: uiReducer } })}>{children}</Provider>;
const render = (uuid) => renderHook(() => useExperienceEditor(uuid), { wrapper });
const fill = (hook) => act(() => hook.result.current.dispatch({ type: 'set-field', name: 'title', value: 'Smoothie' }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('a new experience', () => {
  it('starts clean, and typing makes it unsaved', () => {
    const hook = render();
    expect(hook.result.current.dirty).toBe(false);
    fill(hook);
    expect(hook.result.current.dirty).toBe(true);
  });

  it('after a successful save there is nothing unsaved, so nothing asks about leaving', async () => {
    experienceEditorService.createExperience.mockResolvedValue({ experience: { uuid: 'u', title: 'Smoothie' } });
    const hook = render();
    fill(hook);
    let result;
    await act(async () => {
      result = await hook.result.current.save();
    });
    expect(result).toMatchObject({ ok: true });
    expect(hook.result.current.dirty).toBe(false);
    expect(hook.result.current.saving).toBe(false);
  });

  it('typing again after a save is unsaved again', async () => {
    experienceEditorService.createExperience.mockResolvedValue({ experience: { uuid: 'u', title: 'Smoothie' } });
    const hook = render();
    fill(hook);
    await act(async () => {
      await hook.result.current.save();
    });
    act(() => hook.result.current.dispatch({ type: 'set-field', name: 'title', value: 'More' }));
    expect(hook.result.current.dirty).toBe(true);
  });

  it('a failed save is still unsaved', async () => {
    experienceEditorService.createExperience.mockRejectedValue(new ExperienceApiError('Broken.', { status: 500 }));
    const hook = render();
    fill(hook);
    await act(async () => {
      await hook.result.current.save();
    });
    expect(hook.result.current.dirty).toBe(true);
    expect(hook.result.current.banner).toMatchObject({ kind: 'error', message: 'Broken.' });
  });

  it('an invalid form is not sent, and says why', async () => {
    const hook = render();
    let result;
    await act(async () => {
      result = await hook.result.current.save();
    });
    expect(result).toEqual({ ok: false, reason: 'invalid' });
    expect(experienceEditorService.createExperience).not.toHaveBeenCalled();
    expect(hook.result.current.errors.title).toBe('Title is required.');
  });

  it('a second save while the first is still working is turned away, and only one request is made', async () => {
    let finish;
    experienceEditorService.createExperience.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const hook = render();
    fill(hook);
    let first;
    let second;
    await act(async () => {
      first = hook.result.current.save();
      second = await hook.result.current.save();
    });
    expect(second).toEqual({ ok: false, reason: 'busy' });
    expect(experienceEditorService.createExperience).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ experience: { uuid: 'u', title: 'Smoothie' } });
      await first;
    });
    expect(hook.result.current.saving).toBe(false);
  });

  it('can save again after the first finished', async () => {
    experienceEditorService.createExperience.mockResolvedValue({ experience: { uuid: 'u', title: 'Smoothie' } });
    const hook = render();
    fill(hook);
    await act(async () => {
      await hook.result.current.save();
    });
    await act(async () => {
      await hook.result.current.save();
    });
    expect(experienceEditorService.createExperience).toHaveBeenCalledTimes(2);
  });
});

describe('an experience being edited', () => {
  const saved = {
    uuid: 'u-1',
    title: 'Saved',
    description: '',
    isPublished: false,
    coverImage: null,
    videos: [{ id: 'a'.repeat(24), title: 'One', embedUrl: LINK, position: 1 }],
    printable: { image: null, link: '', file: null, fileName: '', button: 'Print here' },
    updatedAt: '2026-11-10T10:00:00.000Z',
  };

  it('loads it, and nothing is unsaved until something changes', async () => {
    experienceEditorService.getExperience.mockResolvedValue(saved);
    const hook = render('u-1');
    expect(hook.result.current.status).toBe('loading');
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(experienceEditorService.getExperience).toHaveBeenCalledWith('u-1');
    expect(hook.result.current.form.title).toBe('Saved');
    expect(hook.result.current.dirty).toBe(false);
  });

  it('sends what it loaded so someone else’s change is noticed, and after saving there is nothing unsaved', async () => {
    experienceEditorService.getExperience.mockResolvedValue(saved);
    experienceEditorService.updateExperience.mockResolvedValue({ experience: { ...saved, title: 'Changed' } });
    const hook = render('u-1');
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    act(() => hook.result.current.dispatch({ type: 'set-field', name: 'title', value: 'Changed' }));
    expect(hook.result.current.dirty).toBe(true);
    await act(async () => {
      await hook.result.current.save();
    });
    const [uuid, body] = experienceEditorService.updateExperience.mock.calls[0];
    expect(uuid).toBe('u-1');
    expect(body.get('expectedUpdatedAt')).toBe('2026-11-10T10:00:00.000Z');
    expect(hook.result.current.dirty).toBe(false);
  });

  it('a click on a button never reaches the loader as its "still current?" check (reload takes no arguments)', async () => {
    experienceEditorService.getExperience.mockResolvedValue(saved);
    const hook = render('u-1');
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await act(async () => {
      hook.result.current.reload({ type: 'click' });
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(experienceEditorService.getExperience).toHaveBeenCalledTimes(2);
  });

  it('an answer that arrives after the page was closed changes nothing', async () => {
    let finish;
    experienceEditorService.getExperience.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const hook = render('u-1');
    hook.unmount();
    await act(async () => finish(saved));
    expect(hook.result.current.status).toBe('loading');
  });
});
