import { useCallback, useMemo } from 'react';

import { useCmsPlayerStore } from '@/store/cmsPLayerStore';
import type {
  ApiResponse,
  BuiltInBookCompletionPayload,
  CmsPlayableBookDetail,
  CmsPlayableBookSummary,
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
