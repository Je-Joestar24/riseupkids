import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearCmsBookPlayerError,
  clearCurrentPlayableCmsBook,
  fetchPlayableCmsBookById,
  fetchPlayableCmsBooks,
  resetCmsBookPlayerState,
  selectCmsBookPlayer,
  setCmsBookPlayerFilters,
} from '../store/slices/cmsBookPlayerSlice';
import { showNotification } from '../store/slices/uiSlice';

const useCmsBookPlayer = () => {
  const dispatch = useDispatch();
  const state = useSelector(selectCmsBookPlayer);

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

  const resetState = useCallback(() => {
    dispatch(resetCmsBookPlayerState());
  }, [dispatch]);

  return useMemo(
    () => ({
      ...state,
      loadPlayableBooks,
      loadPlayableBookById,
      updateFilters,
      clearError,
      clearCurrentBook,
      resetState,
    }),
    [
      state,
      loadPlayableBooks,
      loadPlayableBookById,
      updateFilters,
      clearError,
      clearCurrentBook,
      resetState,
    ]
  );
};

export default useCmsBookPlayer;
