import { configureStore } from '@reduxjs/toolkit';
import apiReducer from './slices/apiSlice';

export const store = configureStore({
  reducer: {
    api: apiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['api/fetchData/fulfilled'],
      },
    }),
});

// Type exports for TypeScript (if needed in the future)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

