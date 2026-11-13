/**
 * useExperience: what the hook says in each state (the screen relies on these flags being exact).
 */
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('@/services/experienceService', () => {
  class ExperienceNotFoundError extends Error {}
  return {
    experienceService: { getPublished: jest.fn(), getPublishedOne: jest.fn() },
    ExperienceNotFoundError,
    EXPERIENCE_LOAD_FAILED_MESSAGE: 'x',
  };
});

import { useExperience, type UseExperienceReturn } from '@/hooks/experienceHook';
import { experienceService, ExperienceNotFoundError } from '@/services/experienceService';
import { useExperienceStore } from '@/store/experienceStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const getOne = experienceService.getPublishedOne as jest.Mock;
const one = (uuid: string) => ({ uuid, title: `T ${uuid}`, description: '', coverImage: null, videos: [], printable: null });

let latest: UseExperienceReturn;
function Probe({ uuid }: { uuid: string | undefined }) {
  latest = useExperience(uuid);
  return null;
}
const mount = async (uuid: string | undefined) => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe uuid={uuid} />);
  });
  await act(async () => {});
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  useExperienceStore.getState().reset();
});

describe('useExperience', () => {
  it('while the first answer is pending: loading, nothing else', async () => {
    getOne.mockReturnValue(new Promise(() => {}));
    await mount('a');
    expect(latest).toMatchObject({ experience: null, loading: true, error: null, notFound: false });
  });

  it('with an answer: the experience, not loading', async () => {
    getOne.mockResolvedValue(one('a'));
    await mount('a');
    expect(latest).toMatchObject({ loading: false, error: null, notFound: false });
    expect(latest.experience?.uuid).toBe('a');
  });

  it('"not available": notFound, and no longer loading', async () => {
    getOne.mockRejectedValue(new ExperienceNotFoundError());
    await mount('a');
    expect(latest).toMatchObject({ experience: null, loading: false, error: null, notFound: true });
  });

  it('a failure: the message, and no longer loading', async () => {
    getOne.mockRejectedValue(new Error('Server exploded'));
    await mount('a');
    expect(latest).toMatchObject({ experience: null, loading: false, error: 'Server exploded', notFound: false });
  });

  it('with no id: nothing is requested and nothing is loading', async () => {
    await mount(undefined);
    expect(getOne).not.toHaveBeenCalled();
    expect(latest).toMatchObject({ experience: null, loading: false, error: null, notFound: false });
  });

  it('a loaded experience hides a stale message and a stale "not found" flag (the page keeps showing)', async () => {
    getOne.mockResolvedValue(one('a'));
    await mount('a');
    act(() => {
      useExperienceStore.setState({ detailErrors: { a: 'old' }, detailsNotFound: { a: true } });
    });
    expect(latest.experience?.uuid).toBe('a');
    expect(latest.error).toBeNull();
    expect(latest.notFound).toBe(false);
  });

  it('resolves picture paths with the app resolver', async () => {
    getOne.mockResolvedValue(one('a'));
    await mount('a');
    expect(latest.getImageUrl('https://x.test/p.png')).toBe('https://x.test/p.png');
    expect(latest.getImageUrl('/uploads/p.png')).toMatch(/^https?:\/\/.+\/uploads\/p\.png$/);
    expect(latest.getImageUrl(null)).toBeNull();
  });
});
