import { useCallback, useMemo, useState } from 'react';
import { CONTENT_TYPES } from '../services/contentService';

/**
 * Can the given content item be tested as HTML5? (Book with packageType 'html5')
 */
export const canTestHtml5 = (contentType, item) => {
  if (!contentType || !item) return false;
  if (contentType !== CONTENT_TYPES.BOOK) return false;
  return item?.packageType === 'html5' && !!item?.html5PackageId;
};

/**
 * useHtml5 / useAdminHtml5Hook
 *
 * Admin/Teacher: open and control the HTML5 test modal for books with packageType 'html5'.
 * Use alongside useAdminScormHook: show "Test HTML5" for HTML5 books, "Test SCORM" for SCORM content.
 */
export function useHtml5() {
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState(null);

  const openTestHtml5 = useCallback((item, contentTypeOverride) => {
    const resolvedType =
      contentTypeOverride || item?._contentType || item?.contentType || CONTENT_TYPES.BOOK;
    if (!canTestHtml5(resolvedType, item)) return;
    setSelection({
      contentId: item?._id,
      contentType: resolvedType,
      contentTitle: item?.title || 'HTML5 Content',
      html5PackageId: item?.html5PackageId ?? null,
      html5EntryPoint: item?.html5EntryPoint || 'index.html',
      item,
    });
    setIsOpen(true);
  }, []);

  const closeTestHtml5 = useCallback(() => {
    setIsOpen(false);
    setSelection(null);
  }, []);

  const canTestSelected = useMemo(() => {
    if (!selection) return false;
    return canTestHtml5(selection.contentType, selection.item);
  }, [selection]);

  const modalProps = useMemo(
    () => ({
      open: isOpen && !!selection?.contentId && !!selection?.html5PackageId && canTestSelected,
      onClose: closeTestHtml5,
      contentId: selection?.contentId ?? null,
      contentTitle: selection?.contentTitle || 'HTML5 Content',
      html5PackageId: selection?.html5PackageId ?? null,
      html5EntryPoint: selection?.html5EntryPoint || 'index.html',
    }),
    [isOpen, selection, canTestSelected, closeTestHtml5]
  );

  return {
    isOpen,
    selection,
    openTestHtml5,
    closeTestHtml5,
    canTestHtml5,
    modalProps,
  };
}

export default useHtml5;
