import { configureStore } from '@reduxjs/toolkit';
import apiReducer from './slices/apiSlice';
import userReducer from './slices/userSlice';
import uiReducer from './slices/uiSlice';
import parentsReducer from './slices/parentsSlice';
import childrenReducer from './slices/childrenSlice';
import activityReducer from './slices/activtySlice';
import contentReducer from './slices/contentSlice';
import courseReducer from './slices/courseSlice';
import kidsWallReducer from './slices/kidsWallSlice';
import exploreReducer from './slices/exploreSlice';

export const store = configureStore({
  reducer: {
    api: apiReducer,
    user: userReducer,
    ui: uiReducer,
    parents: parentsReducer,
    children: childrenReducer,
    activity: activityReducer, // Keep for backward compatibility
    content: contentReducer, // Unified content management
    course: courseReducer, // Course/Content Collection management
    kidsWall: kidsWallReducer, // KidsWall posts management
    explore: exploreReducer, // Explore content management
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

