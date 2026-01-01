import { configureStore } from '@reduxjs/toolkit';
import apiReducer from './slices/apiSlice';
import userReducer from './slices/userSlice';
import uiReducer from './slices/uiSlice';
import parentsReducer from './slices/parentsSlice';
import childrenReducer from './slices/childrenSlice';

export const store = configureStore({
  reducer: {
    api: apiReducer,
    user: userReducer,
    ui: uiReducer,
    parents: parentsReducer,
    children: childrenReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'api/fetchData/fulfilled',
          'ui/showConfirmationDialog',
          'ui/hideConfirmationDialog',
        ],
      },
    }),
});

// Type exports for TypeScript (if needed in the future)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

