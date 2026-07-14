import AsyncStorage from '@react-native-async-storage/async-storage';

import { TERMS_VERSION } from '@/config/legal';

const STORAGE_KEY = '@riseupkids_legalAcceptance';

export interface LegalAcceptanceRecord {
  version: string;
  acceptedAt: string;
}

export const legalAcceptanceService = {
  getRecord: async (): Promise<LegalAcceptanceRecord | null> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LegalAcceptanceRecord;
    } catch {
      return null;
    }
  },

  hasAcceptedCurrentTerms: async (): Promise<boolean> => {
    const record = await legalAcceptanceService.getRecord();
    return record?.version === TERMS_VERSION;
  },

  recordAcceptance: async (): Promise<LegalAcceptanceRecord> => {
    const record: LegalAcceptanceRecord = {
      version: TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  },

  clearAcceptance: async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
