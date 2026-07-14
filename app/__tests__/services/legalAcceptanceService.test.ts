import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/config/legal', () => ({
  TERMS_VERSION: '2026-07-14',
}));

import { legalAcceptanceService } from '@/services/legalAcceptanceService';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('legalAcceptanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when nothing stored', async () => {
    storage.getItem.mockResolvedValue(null);
    await expect(legalAcceptanceService.hasAcceptedCurrentTerms()).resolves.toBe(false);
  });

  it('returns true when stored version matches current terms', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ version: '2026-07-14', acceptedAt: '2026-07-14T00:00:00.000Z' })
    );
    await expect(legalAcceptanceService.hasAcceptedCurrentTerms()).resolves.toBe(true);
  });

  it('returns false when stored version is outdated', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({ version: '2026-01-01', acceptedAt: '2026-01-01T00:00:00.000Z' })
    );
    await expect(legalAcceptanceService.hasAcceptedCurrentTerms()).resolves.toBe(false);
  });

  it('records acceptance with current version', async () => {
    storage.setItem.mockResolvedValue(undefined);

    const record = await legalAcceptanceService.recordAcceptance();

    expect(record.version).toBe('2026-07-14');
    expect(record.acceptedAt).toBeTruthy();
    expect(storage.setItem).toHaveBeenCalledWith(
      '@riseupkids_legalAcceptance',
      expect.stringContaining('"version":"2026-07-14"')
    );
  });
});
