import { useCallback, useMemo } from 'react';

import { useCmsPlayerStore, selectSelectedBookIntroBackgroundMusicUrl } from '@/store/cmsPLayerStore';
import {
  collectPlayableBookMediaUrls,
  getCoverPage,
  resolveIntroBackgroundMusicUrl,
  type ApiResponse,
  type BuiltInBookCompletionPayload,
  type CmsPlayableBookDetail,
  type CmsPlayableBookSummary,
} from '@/services/cmsBooksPlayerService';

export interface UseCmsBookPlayerOptions {
  childId: string | null;
  courseId: string | null;
}

export interface UseCmsBookPlayerReturn {
  playableBooks: CmsPlayableBookSummary[];
  selectedBook: CmsPlayableBookDetail | null;
  isLoadingList: boolean;
  isLoadingBook: boolean;
  isSubmittingScore: boolean;
  scoreSubmitted: boolean;
  error: string | null;
  /** Resolved intro/cover background music URL for the loaded book (empty when none). */
  selectedBookIntroBackgroundMusicUrl: string;
  getIntroBackgroundMusicUrl: (
    source?: CmsPlayableBookDetail | CmsPlayableBookSummary | null
  ) => string;
  getPlayableBookMediaUrls: (book?: CmsPlayableBookDetail | null) => string[];
  getCoverPage: typeof getCoverPage;
  fetchPlayableBooks: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    language?: string;
  }) => Promise<CmsPlayableBookSummary[]>;
  openBook: (bookId: string) => Promise<CmsPlayableBookDetail | null>;
  submitScore: (
    bookId: string,
    payload: BuiltInBookCompletionPayload
  ) => Promise<ApiResponse<unknown>>;
  setSelectedBook: (book: CmsPlayableBookDetail | null) => void;
  clearScoreSubmitted: () => void;
  clearError: () => void;
  resetPlayer: () => void;
}

export function useCmsBookPlayer({
  childId,
  courseId,
}: UseCmsBookPlayerOptions): UseCmsBookPlayerReturn {
  const playableBooks = useCmsPlayerStore((s) => s.playableBooks);
  const selectedBook = useCmsPlayerStore((s) => s.selectedBook);
  const isLoadingList = useCmsPlayerStore((s) => s.isLoadingList);
  const isLoadingBook = useCmsPlayerStore((s) => s.isLoadingBook);
  const isSubmittingScore = useCmsPlayerStore((s) => s.isSubmittingScore);
  const scoreSubmitted = useCmsPlayerStore((s) => s.scoreSubmitted);
  const error = useCmsPlayerStore((s) => s.error);

  const fetchPlayableBooksAction = useCmsPlayerStore((s) => s.fetchPlayableBooks);
  const fetchPlayableBookByIdAction = useCmsPlayerStore((s) => s.fetchPlayableBookById);
  const submitBuiltInBookScoreAction = useCmsPlayerStore((s) => s.submitBuiltInBookScore);
  const setSelectedBook = useCmsPlayerStore((s) => s.setSelectedBook);
  const clearScoreSubmitted = useCmsPlayerStore((s) => s.clearScoreSubmitted);
  const clearError = useCmsPlayerStore((s) => s.clearError);
  const resetPlayer = useCmsPlayerStore((s) => s.resetPlayer);

  const selectedBookIntroBackgroundMusicUrl = useMemo(
    () => selectSelectedBookIntroBackgroundMusicUrl(selectedBook),
    [selectedBook]
  );

  const getIntroBackgroundMusicUrl = useCallback(
    (source?: CmsPlayableBookDetail | CmsPlayableBookSummary | null) => {
      if (!source) return '';
      if ('pages' in source && Array.isArray(source.pages)) {
        return resolveIntroBackgroundMusicUrl(source);
      }
      return '';
    },
    []
  );

  const getPlayableBookMediaUrls = useCallback(
    (book?: CmsPlayableBookDetail | null) => collectPlayableBookMediaUrls(book ?? selectedBook),
    [selectedBook]
  );

  const openBook = useCallback(
    (bookId: string) => fetchPlayableBookByIdAction(bookId),
    [fetchPlayableBookByIdAction]
  );

  const submitScore = useCallback(
    (bookId: string, payload: BuiltInBookCompletionPayload) => {
      if (!childId || !courseId) {
        return Promise.resolve<ApiResponse<unknown>>({
          success: false,
          message: 'Missing child or course',
        });
      }
      return submitBuiltInBookScoreAction(courseId, childId, bookId, payload);
    },
    [childId, courseId, submitBuiltInBookScoreAction]
  );

  return useMemo(
    () => ({
      playableBooks,
      selectedBook,
      isLoadingList,
      isLoadingBook,
      isSubmittingScore,
      scoreSubmitted,
      error,
      selectedBookIntroBackgroundMusicUrl,
      getIntroBackgroundMusicUrl,
      getPlayableBookMediaUrls,
      getCoverPage,
      fetchPlayableBooks: fetchPlayableBooksAction,
      openBook,
      submitScore,
      setSelectedBook,
      clearScoreSubmitted,
      clearError,
      resetPlayer,
    }),
    [
      playableBooks,
      selectedBook,
      isLoadingList,
      isLoadingBook,
      isSubmittingScore,
      scoreSubmitted,
      error,
      selectedBookIntroBackgroundMusicUrl,
      getIntroBackgroundMusicUrl,
      getPlayableBookMediaUrls,
      fetchPlayableBooksAction,
      openBook,
      submitScore,
      setSelectedBook,
      clearScoreSubmitted,
      clearError,
      resetPlayer,
    ]
  );
}
