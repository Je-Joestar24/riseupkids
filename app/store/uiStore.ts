/**
 * Rise Up Kids UI Store
 * Global dialog state
 */

import { create } from 'zustand';

export type DialogType = 'success' | 'error' | 'warning' | 'info';

interface DialogState {
  open: boolean;
  message: string;
  subtitle?: string;
  type: DialogType;
  onClose?: () => void;
  duration: number;
}

interface UiState {
  dialog: DialogState;
  showDialog: (params: {
    message: string;
    subtitle?: string;
    type?: DialogType;
    onClose?: () => void;
    duration?: number;
  }) => void;
  hideDialog: () => void;
}

const initialDialog: DialogState = {
  open: false,
  message: '',
  type: 'info',
  duration: 4000,
};

const DEFAULT_SUCCESS_SUBTITLE = 'Everyone can see your amazing work now!';

export const useUiStore = create<UiState>((set) => ({
  dialog: initialDialog,

  showDialog: ({ message, subtitle, type = 'info', onClose, duration = 4000 }) => set({
    dialog: {
      open: true,
      message,
      subtitle: subtitle !== undefined ? subtitle : (type === 'success' ? DEFAULT_SUCCESS_SUBTITLE : undefined),
      type,
      onClose,
      duration,
    },
  }),

  hideDialog: () => set((state) => {
    state.dialog.onClose?.();
    return {
      dialog: {
        ...state.dialog,
        open: false,
        onClose: undefined,
      },
    };
  }),
}));
