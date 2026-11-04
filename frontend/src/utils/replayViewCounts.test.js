import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadReplayViewCounts } from './replayViewCounts';

const videos = [{ _id: 'r1' }, { _id: 'r2' }];

describe('loadReplayViewCounts', () => {
  let logged;
  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it('reads the child’s own count for every video', async () => {
    const getStatus = vi.fn(async (id) => ({ currentWatchCount: id === 'r1' ? 3 : 7 }));

    const counts = await loadReplayViewCounts({ videos, childId: 'kid1', getStatus });

    expect(counts).toEqual({ r1: 3, r2: 7 });
  });

  it('asks for all of them at the same moment', async () => {
    const getStatus = vi.fn(() => new Promise(() => {}));

    loadReplayViewCounts({ videos, childId: 'kid1', getStatus });

    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it('counts a video that was never watched as 0', async () => {
    const counts = await loadReplayViewCounts({ videos, childId: 'kid1', getStatus: async () => null });

    expect(counts).toEqual({ r1: 0, r2: 0 });
  });

  it('keeps the last known count for a video that cannot be read, and 0 when there is none', async () => {
    const getStatus = vi.fn().mockRejectedValue(new Error('down'));

    const counts = await loadReplayViewCounts({
      videos,
      childId: 'kid1',
      getStatus,
      previousCounts: { r1: 9 },
    });

    expect(counts).toEqual({ r1: 9, r2: 0 });
  });

  it('does not let one failure spoil the others', async () => {
    const getStatus = vi.fn(async (id) => {
      if (id === 'r1') throw new Error('down');
      return { currentWatchCount: 4 };
    });

    const counts = await loadReplayViewCounts({ videos, childId: 'kid1', getStatus, previousCounts: { r1: 2 } });

    expect(counts).toEqual({ r1: 2, r2: 4 });
  });

  it('asks for nothing without a child or a reader', async () => {
    const getStatus = vi.fn();

    expect(await loadReplayViewCounts({ videos, childId: '', getStatus })).toEqual({});
    expect(await loadReplayViewCounts({ videos, childId: 'kid1', getStatus: undefined })).toEqual({});
    expect(getStatus).not.toHaveBeenCalled();
  });
});
