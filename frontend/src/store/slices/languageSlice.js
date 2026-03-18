import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'app_language';

const initialState = {
  current: (() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'pt' || v === 'en' || v === 'es') return v;
      return 'en';
    } catch {
      return 'en';
    }
  })(),
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action) => {
      const next = action.payload;
      state.current = next === 'pt' || next === 'en' || next === 'es' ? next : 'en';
      try {
        localStorage.setItem(STORAGE_KEY, state.current);
      } catch {
        // ignore
      }
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;

