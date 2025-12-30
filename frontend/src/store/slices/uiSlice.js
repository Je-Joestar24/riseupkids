import { createSlice } from '@reduxjs/toolkit';

/**
 * UI Slice
 * 
 * Manages UI state for notifications and confirmation dialogs
 */

const initialState = {
  // Notification state
  notification: {
    open: false,
    message: '',
    type: 'info', // 'success', 'error', 'warning', 'info', 'loading'
    duration: 4000, // Auto-close duration in ms (0 = don't auto-close)
  },
  // Confirmation dialog state
  confirmationDialog: {
    open: false,
    title: '',
    message: '',
    type: 'warning', // 'warning', 'error', 'info'
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null, // Callback function
    onCancel: null, // Optional cancel callback
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Show notification
    showNotification: (state, action) => {
      state.notification = {
        open: true,
        message: action.payload.message || '',
        type: action.payload.type || 'info',
        duration: action.payload.duration !== undefined ? action.payload.duration : 4000,
      };
    },
    // Hide notification
    hideNotification: (state) => {
      state.notification = {
        ...state.notification,
        open: false,
      };
    },
    // Show confirmation dialog
    showConfirmationDialog: (state, action) => {
      state.confirmationDialog = {
        open: true,
        title: action.payload.title || 'Confirm Action',
        message: action.payload.message || 'Are you sure?',
        type: action.payload.type || 'warning',
        confirmText: action.payload.confirmText || 'Confirm',
        cancelText: action.payload.cancelText || 'Cancel',
        onConfirm: action.payload.onConfirm || null,
        onCancel: action.payload.onCancel || null,
      };
    },
    // Hide confirmation dialog
    hideConfirmationDialog: (state) => {
      state.confirmationDialog = {
        ...state.confirmationDialog,
        open: false,
        onConfirm: null,
        onCancel: null,
      };
    },
    // Clear all UI state
    clearUI: (state) => {
      state.notification = initialState.notification;
      state.confirmationDialog = initialState.confirmationDialog;
    },
  },
});

export const {
  showNotification,
  hideNotification,
  showConfirmationDialog,
  hideConfirmationDialog,
  clearUI,
} = uiSlice.actions;

export default uiSlice.reducer;

