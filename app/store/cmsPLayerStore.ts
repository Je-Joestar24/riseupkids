import { create } from 'zustand';

import {
  cmsBooksPlayerService,
  type BuiltInBookCompletionPayload,
  type CmsPlayableBookDetail,
  type CmsPlayableBookSummary,
} from '@/services/cmsBooksPlayerService';

interface CmsBookPlayerState {
  playableBooks: CmsPlayableBookSummary[];
  selectedBook: CmsPlayableBookDetail | null;
  isLoadingList: boolean;
  isLoadingBook: boolean;
  isSubmittingScore: boolean;
  scoreSubmitted: boolean;
  error: string | null;
}

interface CmsBookPlayerActions {
  fetchPlayableBooks: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    language?: string;
  }) => Promise<CmsPlayableBookSummary[]>;
  fetchPlayableBookById: (bookId: string) => Promise<CmsPlayableBookDetail | null>;
  submitBuiltInBookScore: (
    courseId: string,
    childId: string,
    bookId: string,
    payload: BuiltInBookCompletionPayload
  ) => Promise<boolean>;
  setSelectedBook: (book: CmsPlayableBookDetail | null) => void;
  clearScoreSubmitted: () => void;
  clearError: () => void;
  resetPlayer: () => void;
}

type CmsBookPlayerStore = CmsBookPlayerState & CmsBookPlayerActions;

const initialState: CmsBookPlayerState = {
  playableBooks: [],
  selectedBook: null,
  isLoadingList: false,
  isLoadingBook: false,
  isSubmittingScore: false,
  scoreSubmitted: false,
  error: null,
};

export const useCmsPlayerStore = create<CmsBookPlayerStore>((set) => ({
  ...initialState,

  fetchPlayableBooks: async (params) => {
    set({ isLoadingList: true, error: null });
    try {
      const response = await cmsBooksPlayerService.listPlayableBooks(params);
      const items = response?.success && Array.isArray(response.data?.items)
        ? response.data.items
        : [];
      set({
        playableBooks: items,
        isLoadingList: false,
        error: response?.success ? null : response?.message ?? 'Failed to load playable books',
      });
      return items;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ isLoadingList: false, error: message });
      return [];
    }
  },

  fetchPlayableBookById: async (bookId) => {
    if (!bookId) return null;
    set({ isLoadingBook: true, error: null, scoreSubmitted: false });
    try {
      const response = await cmsBooksPlayerService.getPlayableBook(bookId);
      const book = response?.success ? response.data ?? null : null;
      set({
        selectedBook: book,
        isLoadingBook: false,
        error: response?.success ? null : response?.message ?? 'Failed to load playable book',
      });
      return book;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ isLoadingBook: false, error: message });
      return null;
    }
  },

  submitBuiltInBookScore: async (courseId, childId, bookId, payload) => {
    if (!courseId || !childId || !bookId) return false;
    set({ isSubmittingScore: true, error: null, scoreSubmitted: false });
    try {
      const response = await cmsBooksPlayerService.submitBuiltInBookCompletion(
        courseId,
        childId,
        bookId,
        payload
      );
      const ok = Boolean(response?.success);
      set({
        isSubmittingScore: false,
        scoreSubmitted: ok,
        error: ok ? null : response?.message ?? 'Failed to submit built-in book score',
      });
      return ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({
        isSubmittingScore: false,
        scoreSubmitted: false,
        error: message,
      });
      return false;
    }
  },

  setSelectedBook: (book) => set({ selectedBook: book }),
  clearScoreSubmitted: () => set({ scoreSubmitted: false }),
  clearError: () => set({ error: null }),
  resetPlayer: () => set(initialState),
}));
