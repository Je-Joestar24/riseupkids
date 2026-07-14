import { describe, expect, it } from 'vitest';
import { getAdminAccountDisplayStatus } from './accountDisplayStatus';

describe('getAdminAccountDisplayStatus', () => {
  it('returns deletion pending for inactive parent with pending request', () => {
    const status = getAdminAccountDisplayStatus({
      isActive: false,
      deletionRequest: { status: 'pending', scheduledPurgeAt: '2026-08-14T00:00:00.000Z' },
    });

    expect(status.label).toBe('Deletion pending');
    expect(status.canRestore).toBe(false);
    expect(status.canArchive).toBe(false);
  });

  it('returns archived for inactive parent without deletion request', () => {
    const status = getAdminAccountDisplayStatus({
      isActive: false,
      deletionRequest: null,
    });

    expect(status.label).toBe('Archived');
    expect(status.canRestore).toBe(true);
  });

  it('returns active for active parent', () => {
    const status = getAdminAccountDisplayStatus({
      isActive: true,
      deletionRequest: null,
    });

    expect(status.label).toBe('Active');
    expect(status.canArchive).toBe(true);
  });
});
