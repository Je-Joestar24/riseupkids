/**
 * HTML5 book detection and modal state for child app.
 * Only books with packageType === 'html5' are openable; SCORM is not supported.
 */

import { useCallback, useEffect, useState } from 'react';
import type { PopulatedContentItem } from '@/services/moduleService';
import { getLaunchUrl } from '@/services/html5Service';

export function isHtml5Book(book: PopulatedContentItem | null | undefined): boolean {
  if (!book) return false;
  return (
    (book._contentType === 'book' || (book as { contentType?: string }).contentType === 'book') &&
    (book.packageType === 'html5') &&
    !!book.html5PackageId?.trim()
  );
}

export function isHtml5PlayableContent(content: PopulatedContentItem | null | undefined): boolean {
  if (!content) return false;
  if (isHtml5Book(content)) return true;
  const contentType = content._contentType || (content as { contentType?: string }).contentType;
  const completionType = String(content.completionContentType ?? '').toLowerCase().trim();
  return contentType === 'video' && completionType === 'html5' && !!content.html5PackageId?.trim();
}

export interface UseHtml5LaunchUrlResult {
  launchUrl: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHtml5LaunchUrl(
  packageId: string | null,
  entryPoint?: string | null
): UseHtml5LaunchUrlResult {
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = useCallback(() => {
    if (!packageId?.trim()) {
      setLaunchUrl(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setLaunchUrl(null);
    getLaunchUrl(packageId, entryPoint)
      .then(({ launchUrl: url }) => {
        setLaunchUrl(url);
        setError(null);
      })
      .catch((e) => {
        setLaunchUrl(null);
        setError(e?.message ?? 'Failed to load content');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [packageId, entryPoint]);

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  return { launchUrl, loading, error, refetch: fetchUrl };
}

export interface UseHtml5ModalResult {
  open: boolean;
  selectedBook: PopulatedContentItem | null;
  openModal: (content: PopulatedContentItem) => void;
  closeModal: () => void;
  launchUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function useHtml5Modal(): UseHtml5ModalResult {
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<PopulatedContentItem | null>(null);

  const packageId = selectedBook?.html5PackageId ?? null;
  const entryPoint = selectedBook?.html5EntryPoint ?? null;
  const { launchUrl, loading, error } = useHtml5LaunchUrl(packageId, entryPoint);

  const openModal = useCallback((content: PopulatedContentItem) => {
    if (!isHtml5PlayableContent(content)) return;
    setSelectedBook(content);
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setSelectedBook(null);
  }, []);

  return {
    open,
    selectedBook,
    openModal,
    closeModal,
    launchUrl,
    loading,
    error,
  };
}
