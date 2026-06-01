import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  resolveIntroBackgroundMusicUrl,
} from '../services/cmsBookPlayerService';
import {
  clearCmsBookPreloadState,
  clearCmsBookPlayerError,
  clearCurrentPlayableCmsBook,
  fetchPlayableCmsBookById,
  fetchPlayableCmsBooks,
  preloadPlayableCmsBookMedia,
  resetCmsBookPlayerState,
  selectCmsBookPlayer,
  selectCurrentPlayableIntroBackgroundMusicUrl,
  setCmsBookPlayerFilters,
} from '../store/slices/cmsBookPlayerSlice';
import { showNotification } from '../store/slices/uiSlice';

const useCmsBookPlayer = () => {
  const dispatch = useDispatch();
  const state = useSelector(selectCmsBookPlayer);
  const currentBookIntroBackgroundMusicUrl = useSelector(
    selectCurrentPlayableIntroBackgroundMusicUrl
  );

  const runThunk = useCallback(
    async (thunkAction, errorMessage) => {
      try {
        return await dispatch(thunkAction).unwrap();
      } catch (error) {
        dispatch(showNotification({ message: error || errorMessage, type: 'error' }));
        throw error;
      }
    },
    [dispatch]
  );

  const loadPlayableBooks = useCallback(
    (params = {}) => runThunk(fetchPlayableCmsBooks(params), 'Failed to load playable books'),
    [runThunk]
  );

  const loadPlayableBookById = useCallback(
    (bookId) => runThunk(fetchPlayableCmsBookById(bookId), 'Failed to load playable book'),
    [runThunk]
  );

  const preloadBookMedia = useCallback(
    ({ bookId, pages, book }) =>
      runThunk(preloadPlayableCmsBookMedia({ bookId, pages, book }), 'Failed to preload playable book media'),
    [runThunk]
  );

  const getIntroBackgroundMusicUrl = useCallback(
    (book) => resolveIntroBackgroundMusicUrl(book || state.currentBook),
    [state.currentBook]
  );

  const updateFilters = useCallback(
    (filters) => dispatch(setCmsBookPlayerFilters(filters)),
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearCmsBookPlayerError());
  }, [dispatch]);

  const clearCurrentBook = useCallback(() => {
    dispatch(clearCurrentPlayableCmsBook());
  }, [dispatch]);

  const clearPreloadState = useCallback(() => {
    dispatch(clearCmsBookPreloadState());
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch(resetCmsBookPlayerState());
  }, [dispatch]);

  return useMemo(
    () => ({
      ...state,
      currentBookIntroBackgroundMusicUrl,
      getIntroBackgroundMusicUrl,
      loadPlayableBooks,
      loadPlayableBookById,
      preloadBookMedia,
      updateFilters,
      clearError,
      clearCurrentBook,
      clearPreloadState,
      resetState,
    }),
    [
      state,
      currentBookIntroBackgroundMusicUrl,
      getIntroBackgroundMusicUrl,
      loadPlayableBooks,
      loadPlayableBookById,
      preloadBookMedia,
      updateFilters,
      clearError,
      clearCurrentBook,
      clearPreloadState,
      resetState,
    ]
  );
};

export default useCmsBookPlayer;
