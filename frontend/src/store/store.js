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
import teacherReducer from './slices/teacherSlice';
import meetingReducer from './slices/meetingSlice';
import youtubeReducer from './slices/youtubeSlice';

export const store = configureStore({
  reducer: {
    api: apiReducer,
    user: userReducer,
    ui: uiReducer,
    parents: parentsReducer,
    teachers: teacherReducer,
    children: childrenReducer,
    activity: activityReducer, // Keep for backward compatibility
    content: contentReducer, // Unified content management
    course: courseReducer, // Course/Content Collection management
    kidsWall: kidsWallReducer, // KidsWall posts management
    explore: exploreReducer, // Explore content management
    meeting: meetingReducer, // Meeting management
    youtube: youtubeReducer, // YouTube Live list/detail/archive/delete
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'api/fetchData/fulfilled',
          'ui/showConfirmationDialog',
          'ui/hideConfirmationDialog',
        ],
        // Callbacks stored in confirmation dialog are intentional; avoid serialization warning
        ignoredPaths: [
          'ui.confirmationDialog.onConfirm',
          'ui.confirmationDialog.onCancel',
        ],
      },
    }),
});

// Type exports for TypeScript (if needed in the future)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

