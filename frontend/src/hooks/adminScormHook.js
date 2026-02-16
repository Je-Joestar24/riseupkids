import { useCallback, useMemo, useState } from 'react';
import { CONTENT_TYPES } from '../services/contentService';

const hasScormAsset = (item) =>
  !!(item?.scormFile || item?.scormFileUrl || item?.scormFilePath);

const canTestScormByType = (contentType, item) => {
  if (!contentType) return false;
  if (contentType === CONTENT_TYPES.ACTIVITY) return true;
  // Book: only SCORM books (not HTML5)
  if (contentType === CONTENT_TYPES.BOOK) return item?.packageType !== 'html5';
  // Video/Chant/AudioAssignment can be SCORM-enabled but optional
  return hasScormAsset(item);
};

/**
 * useAdminScormHook
 *
 * Small UI helper for launching the Admin/Teacher SCORM "Test" modal from cards/menus.
 * Keeps selection + open state centralized.
 */
export default function useAdminScormHook() {
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState(null);

  const openTest = useCallback((item, contentTypeOverride) => {
    const resolvedType =
      contentTypeOverride || item?._contentType || item?.contentType || CONTENT_TYPES.ACTIVITY;

    if (!canTestScormByType(resolvedType, item)) return;

    setSelection({
      contentId: item?._id,
      contentType: resolvedType,
      contentTitle: item?.title || 'SCORM Content',
      item,
    });
    setIsOpen(true);
  }, []);

  const closeTest = useCallback(() => {
    setIsOpen(false);
    setSelection(null);
  }, []);

  const canTestSelected = useMemo(() => {
    if (!selection) return false;
    return canTestScormByType(selection.contentType, selection.item);
  }, [selection]);

  const modalProps = useMemo(() => {
    return {
      open: isOpen && !!selection?.contentId && !!selection?.contentType && canTestSelected,
      onClose: closeTest,
      contentId: selection?.contentId || null,
      contentType: selection?.contentType || null,
      contentTitle: selection?.contentTitle || 'SCORM Content',
    };
  }, [isOpen, selection, canTestSelected, closeTest]);

  return {
    isOpen,
    selection,
    openTest,
    closeTest,
    canTestScormByType,
    modalProps,
  };
}

