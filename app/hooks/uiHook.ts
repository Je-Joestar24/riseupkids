/**
 * Rise Up Kids UI Hook
 * Show global dialog
 */

import { useCallback } from 'react';

import { useUiStore } from '@/store/uiStore';

import type { DialogType } from '@/store/uiStore';

export function useUI() {
  const showDialog = useUiStore((s) => s.showDialog);
  const hideDialog = useUiStore((s) => s.hideDialog);

  const showSuccess = useCallback(
    (message: string, onClose?: () => void) => {
      showDialog({ message, type: 'success', onClose });
    },
    [showDialog]
  );

  const showError = useCallback(
    (message: string, onClose?: () => void) => {
      showDialog({ message, type: 'error', onClose, duration: 0 });
    },
    [showDialog]
  );

  const showWarning = useCallback(
    (message: string, onClose?: () => void) => {
      showDialog({ message, type: 'warning', onClose });
    },
    [showDialog]
  );

  const showInfo = useCallback(
    (message: string, onClose?: () => void) => {
      showDialog({ message, type: 'info', onClose });
    },
    [showDialog]
  );

  const show = useCallback(
    (message: string, type: DialogType = 'info', onClose?: () => void) => {
      showDialog({ message, type, onClose });
    },
    [showDialog]
  );

  return {
    showDialog: show,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideDialog,
  };
}
