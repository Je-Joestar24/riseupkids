import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChildProfile } from './useChildProfile';
import childrenService from '../services/childrenService';

vi.mock('../services/childrenService', () => ({
  default: { getChildById: vi.fn() },
}));

describe('useChildProfile — Kids Wall opt-in gate (RUK-SEC-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  async function load(childData) {
    childrenService.getChildById.mockResolvedValue({ data: childData });
    const { result } = renderHook(() => useChildProfile('child1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    return result;
  }

  it('is disabled when kidsWallEnabled is true but there is no consent timestamp', async () => {
    const result = await load({ _id: 'child1', kidsWallEnabled: true, kidsWallConsentAt: null });
    expect(result.current.kidsWallEnabled).toBe(false);
  });

  it('is disabled when kidsWallEnabled is missing entirely', async () => {
    const result = await load({ _id: 'child1' });
    expect(result.current.kidsWallEnabled).toBe(false);
  });

  it('is enabled only when both the flag and a consent timestamp are present', async () => {
    const result = await load({
      _id: 'child1',
      kidsWallEnabled: true,
      kidsWallConsentAt: '2026-01-01T00:00:00Z',
    });
    expect(result.current.kidsWallEnabled).toBe(true);
  });

  it('is disabled when explicitly turned off, even with a stale consent timestamp', async () => {
    const result = await load({
      _id: 'child1',
      kidsWallEnabled: false,
      kidsWallConsentAt: '2026-01-01T00:00:00Z',
    });
    expect(result.current.kidsWallEnabled).toBe(false);
  });
});
