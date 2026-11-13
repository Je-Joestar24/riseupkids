/**
 * The Experience store: first load, quiet refreshes, failures, and one request for two askers.
 */
jest.mock('@/services/experienceService', () => {
  class ExperienceNotFoundError extends Error {}
  return {
    experienceService: { getPublished: jest.fn(), getPublishedOne: jest.fn() },
    ExperienceNotFoundError,
    EXPERIENCE_LOAD_FAILED_MESSAGE: 'We could not load the experiences. Please try again.',
  };
});

import { experienceService, ExperienceNotFoundError } from '@/services/experienceService';
import { useExperienceStore } from '@/store/experienceStore';
import { NETWORK_UNAVAILABLE_MESSAGE } from '@/utils/networkError';

const getPublished = experienceService.getPublished as jest.Mock;
const card = (n: number) => ({
  uuid: `uuid-${n}`,
  title: `Experience ${n}`,
  description: '',
  coverImage: null,
  videoCount: n,
});
const state = () => useExperienceStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  state().reset();
});

describe('first load', () => {
  it('starts empty, not loaded, with no error', () => {
    expect(state()).toMatchObject({ experiences: [], loaded: false, error: null });
  });

  it('keeps the list in the order the server gave and marks it loaded', async () => {
    getPublished.mockResolvedValue([card(3), card(1), card(2)]);
    const result = await state().fetchExperiences();
    expect(result.map((e) => e.uuid)).toEqual(['uuid-3', 'uuid-1', 'uuid-2']);
    expect(state().experiences.map((e) => e.uuid)).toEqual(['uuid-3', 'uuid-1', 'uuid-2']);
    expect(state()).toMatchObject({ loaded: true, error: null });
  });

  it('an empty answer is "loaded, nothing there"', async () => {
    getPublished.mockResolvedValue([]);
    await state().fetchExperiences();
    expect(state()).toMatchObject({ experiences: [], loaded: true, error: null });
  });

  it('a failure with nothing loaded sets a friendly message, stays not loaded, and rejects', async () => {
    getPublished.mockRejectedValue(new Error('Server exploded'));
    await expect(state().fetchExperiences()).rejects.toThrow('Server exploded');
    expect(state()).toMatchObject({ experiences: [], loaded: false, error: 'Server exploded' });
  });

  it('a network failure becomes the no-internet message', async () => {
    getPublished.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
    await expect(state().fetchExperiences()).rejects.toBeDefined();
    expect(state().error).toBe(NETWORK_UNAVAILABLE_MESSAGE);
  });

  it('an unreadable failure still gets a message', async () => {
    getPublished.mockRejectedValue(undefined);
    await expect(state().fetchExperiences()).rejects.toBeUndefined();
    expect(state().error).toBe('Something went wrong. Please try again.');
  });

  it('a retry clears the old message at once and recovers', async () => {
    getPublished.mockRejectedValueOnce(new Error('down'));
    await expect(state().fetchExperiences()).rejects.toThrow();
    expect(state().error).toBe('down');

    let release!: (list: ReturnType<typeof card>[]) => void;
    getPublished.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const pending = state().fetchExperiences();
    expect(state().error).toBeNull();
    release([card(1)]);
    await pending;
    expect(state()).toMatchObject({ loaded: true, error: null });
    expect(state().experiences).toHaveLength(1);
  });
});

describe('later visits', () => {
  it('keep the list while the refresh is under way, then replace it', async () => {
    getPublished.mockResolvedValue([card(1)]);
    await state().fetchExperiences();

    let release!: (list: ReturnType<typeof card>[]) => void;
    getPublished.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const pending = state().fetchExperiences();
    expect(state().experiences).toHaveLength(1);
    expect(state().loaded).toBe(true);

    release([card(1), card(2)]);
    await pending;
    expect(state().experiences.map((e) => e.uuid)).toEqual(['uuid-1', 'uuid-2']);
  });

  it('a failed refresh behind a loaded list stays silent and keeps the list (it still rejects to the caller)', async () => {
    getPublished.mockResolvedValue([card(1)]);
    await state().fetchExperiences();

    getPublished.mockRejectedValue(new Error('down'));
    await expect(state().fetchExperiences()).rejects.toThrow('down');
    expect(state()).toMatchObject({ loaded: true, error: null });
    expect(state().experiences).toHaveLength(1);
  });

  it('an experience the admin removed disappears on the next refresh', async () => {
    getPublished.mockResolvedValue([card(1), card(2)]);
    await state().fetchExperiences();
    getPublished.mockResolvedValue([card(2)]);
    await state().fetchExperiences();
    expect(state().experiences.map((e) => e.uuid)).toEqual(['uuid-2']);
  });

  it('the last experience removed leaves an empty (loaded) list, not the old one', async () => {
    getPublished.mockResolvedValue([card(1)]);
    await state().fetchExperiences();
    getPublished.mockResolvedValue([]);
    await state().fetchExperiences();
    expect(state()).toMatchObject({ experiences: [], loaded: true });
  });
});

describe('requests', () => {
  it('two askers at the same moment share one request', async () => {
    let release!: (list: ReturnType<typeof card>[]) => void;
    getPublished.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const first = state().fetchExperiences();
    const second = state().fetchExperiences();
    expect(getPublished).toHaveBeenCalledTimes(1);
    release([card(1)]);
    await expect(first).resolves.toHaveLength(1);
    await expect(second).resolves.toHaveLength(1);
  });

  it('a request after the first has finished is a new request', async () => {
    getPublished.mockResolvedValue([card(1)]);
    await state().fetchExperiences();
    await state().fetchExperiences();
    expect(getPublished).toHaveBeenCalledTimes(2);
  });

  it('a request after a failed one is a new request (a failure never blocks later asks)', async () => {
    getPublished.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([card(1)]);
    await expect(state().fetchExperiences()).rejects.toThrow();
    await state().fetchExperiences();
    expect(getPublished).toHaveBeenCalledTimes(2);
    expect(state().loaded).toBe(true);
  });

  it('reset forgets the list', async () => {
    getPublished.mockResolvedValue([card(1)]);
    await state().fetchExperiences();
    state().reset();
    expect(state()).toMatchObject({ experiences: [], loaded: false, error: null });
  });
});

describe('one experience', () => {
  const getOne = experienceService.getPublishedOne as jest.Mock;
  const one = (uuid: string, title = `Title ${uuid}`) => ({ uuid, title, description: '', coverImage: null, videos: [], printable: null });

  it('starts with nothing loaded, no message and nothing "not found"', () => {
    expect(state()).toMatchObject({ details: {}, detailErrors: {}, detailsNotFound: {} });
  });

  it('keeps the answer under its own id and returns it', async () => {
    getOne.mockResolvedValue(one('a'));
    await expect(state().fetchExperience('a')).resolves.toMatchObject({ uuid: 'a' });
    expect(getOne).toHaveBeenCalledWith('a');
    expect(state().details.a.title).toBe('Title a');
    expect(state().detailErrors).toEqual({});
  });

  it('keeps each experience apart', async () => {
    getOne.mockImplementation(async (uuid: string) => one(uuid));
    await state().fetchExperience('a');
    await state().fetchExperience('b');
    expect(Object.keys(state().details).sort()).toEqual(['a', 'b']);
  });

  it('does not touch the list', async () => {
    getOne.mockResolvedValue(one('a'));
    await state().fetchExperience('a');
    expect(state()).toMatchObject({ experiences: [], loaded: false, error: null });
    expect(getPublished).not.toHaveBeenCalled();
  });

  it('a failure with nothing loaded for it sets a friendly message for that experience only, and rejects', async () => {
    getOne.mockImplementation(async (uuid: string) => {
      if (uuid === 'bad') throw new Error('Server exploded');
      return one(uuid);
    });
    await state().fetchExperience('good');
    await expect(state().fetchExperience('bad')).rejects.toThrow('Server exploded');
    expect(state().detailErrors).toEqual({ bad: 'Server exploded' });
    expect(state().details.bad).toBeUndefined();
    expect(state().details.good).toBeDefined();
  });

  it('a network failure becomes the no-internet message', async () => {
    getOne.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
    await expect(state().fetchExperience('a')).rejects.toBeDefined();
    expect(state().detailErrors.a).toBe(NETWORK_UNAVAILABLE_MESSAGE);
  });

  it('"not found" is its own flag, with no error message', async () => {
    getOne.mockRejectedValue(new ExperienceNotFoundError());
    await expect(state().fetchExperience('a')).rejects.toBeInstanceOf(ExperienceNotFoundError);
    expect(state().detailsNotFound).toEqual({ a: true });
    expect(state().detailErrors).toEqual({});
  });

  it('a failed refresh behind an experience that is already loaded stays silent and keeps it', async () => {
    getOne.mockResolvedValueOnce(one('a', 'Kept')).mockRejectedValueOnce(new Error('down'));
    await state().fetchExperience('a');
    await expect(state().fetchExperience('a')).rejects.toThrow('down');
    expect(state().details.a.title).toBe('Kept');
    expect(state().detailErrors).toEqual({});
  });

  it('"not found" behind an experience that is already loaded stays silent too', async () => {
    getOne.mockResolvedValueOnce(one('a', 'Kept')).mockRejectedValueOnce(new ExperienceNotFoundError());
    await state().fetchExperience('a');
    await expect(state().fetchExperience('a')).rejects.toBeDefined();
    expect(state().detailsNotFound).toEqual({});
    expect(state().details.a.title).toBe('Kept');
  });

  it('a refresh replaces the answer', async () => {
    getOne.mockResolvedValueOnce(one('a', 'Old')).mockResolvedValueOnce(one('a', 'New'));
    await state().fetchExperience('a');
    await state().fetchExperience('a');
    expect(state().details.a.title).toBe('New');
  });

  it('a retry clears the old message at once, and a success clears it for good', async () => {
    getOne.mockRejectedValueOnce(new Error('down'));
    await expect(state().fetchExperience('a')).rejects.toThrow();
    expect(state().detailErrors.a).toBe('down');

    let release!: (value: unknown) => void;
    getOne.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const retry = state().fetchExperience('a');
    expect(state().detailErrors).toEqual({});
    release(one('a'));
    await retry;
    expect(state().detailErrors).toEqual({});
    expect(state().details.a).toBeDefined();
  });

  it('a retry after "not found" clears that flag, and a later success keeps it cleared', async () => {
    getOne.mockRejectedValueOnce(new ExperienceNotFoundError()).mockResolvedValueOnce(one('a'));
    await expect(state().fetchExperience('a')).rejects.toBeDefined();
    expect(state().detailsNotFound.a).toBe(true);
    await state().fetchExperience('a');
    expect(state().detailsNotFound).toEqual({});
  });

  it('two askers for the same experience at the same moment share one request', async () => {
    let release!: (value: unknown) => void;
    getOne.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const first = state().fetchExperience('a');
    const second = state().fetchExperience('a');
    expect(getOne).toHaveBeenCalledTimes(1);
    release(one('a'));
    await expect(first).resolves.toMatchObject({ uuid: 'a' });
    await expect(second).resolves.toMatchObject({ uuid: 'a' });
  });

  it('two different experiences are two requests', async () => {
    getOne.mockImplementation(async (uuid: string) => one(uuid));
    await Promise.all([state().fetchExperience('a'), state().fetchExperience('b')]);
    expect(getOne).toHaveBeenCalledTimes(2);
  });

  it('a request after the first has finished, or failed, is a new request', async () => {
    getOne.mockRejectedValueOnce(new Error('down')).mockResolvedValue(one('a'));
    await expect(state().fetchExperience('a')).rejects.toThrow();
    await state().fetchExperience('a');
    await state().fetchExperience('a');
    expect(getOne).toHaveBeenCalledTimes(3);
  });

  it('reset forgets every experience, message and flag', async () => {
    getOne.mockResolvedValueOnce(one('a')).mockRejectedValueOnce(new Error('down')).mockRejectedValueOnce(new ExperienceNotFoundError());
    await state().fetchExperience('a');
    await expect(state().fetchExperience('b')).rejects.toThrow();
    await expect(state().fetchExperience('c')).rejects.toBeDefined();
    state().reset();
    expect(state()).toMatchObject({ details: {}, detailErrors: {}, detailsNotFound: {} });
  });
});
