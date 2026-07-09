import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  archiveCmsBook,
  appendCmsBookBuilderPage,
  clearCmsBookAdminError,
  clearCurrentCmsBook,
  createCmsBook,
  deleteCmsBook,
  fetchCmsBookById,
  fetchCmsBooks,
  patchCmsBookBuilderPage,
  publishCmsBook,
  resetCmsBookBuilderDraft,
  resetCmsBookAdminState,
  selectCmsBookAdmin,
  selectCurrentCmsBookIntroBackgroundMusicUrl,
  setCmsBookAdminFilters,
  setCmsBookBuilderPages,
  unpublishCmsBook,
  updateCmsBook,
} from '../store/slices/cmsBookAdminSlice';
import { showNotification } from '../store/slices/uiSlice';
import cmsBookAdminService, {
  CMS_BOOK_STATUS,
  getCoverPageFromBook,
  getCmsBookStatusChipColor,
  getCmsBookStatusLabel,
  normalizeBookStatus,
  resolveIntroBackgroundMusicUrl,
} from '../services/cmsBookAdminService';

const useCmsBookAdmin = () => {
  const dispatch = useDispatch();
  const state = useSelector(selectCmsBookAdmin);
  const currentBookIntroBackgroundMusicUrl = useSelector(
    selectCurrentCmsBookIntroBackgroundMusicUrl
  );

  const runThunk = useCallback(
    async (thunkAction, errorMessage, successConfig = {}) => {
      try {
        const result = await dispatch(thunkAction).unwrap();
        if (successConfig.enabled !== false && successConfig.message) {
          dispatch(showNotification({ message: successConfig.message, type: 'success' }));
        }
        return result;
      } catch (error) {
        dispatch(showNotification({ message: error || errorMessage, type: 'error' }));
        throw error;
      }
    },
    [dispatch]
  );

  const loadBooks = useCallback(
    (params = {}) => runThunk(fetchCmsBooks(params), 'Failed to load CMS books'),
    [runThunk]
  );

  const loadBookById = useCallback(
    (bookId) => runThunk(fetchCmsBookById(bookId), 'Failed to load CMS book'),
    [runThunk]
  );

  const addBook = useCallback(
    (payload, options = {}) =>
      runThunk(createCmsBook(payload), 'Failed to create CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book created successfully',
      }),
    [runThunk]
  );

  const editBook = useCallback(
    (bookId, payload, options = {}) =>
      runThunk(updateCmsBook({ bookId, payload }), 'Failed to update CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book updated successfully',
      }),
    [runThunk]
  );

  const publishBook = useCallback(
    (bookId, options = {}) =>
      runThunk(publishCmsBook(bookId), 'Failed to publish CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book published successfully',
      }),
    [runThunk]
  );

  const createBookAsDraft = useCallback(
    (payload, options = {}) =>
      runThunk(
        createCmsBook({ ...payload, status: CMS_BOOK_STATUS.DRAFT }),
        'Failed to save CMS book draft',
        {
          enabled: options.notifySuccess !== false,
          message: options.successMessage || 'Draft saved successfully',
        }
      ),
    [runThunk]
  );

  const saveBookAsDraft = useCallback(
    (bookId, payload, options = {}) =>
      runThunk(
        updateCmsBook({
          bookId,
          payload: { ...payload, status: CMS_BOOK_STATUS.DRAFT },
        }),
        'Failed to save CMS book draft',
        {
          enabled: options.notifySuccess !== false,
          message: options.successMessage || 'Draft saved successfully',
        }
      ),
    [runThunk]
  );

  const saveAndPublishBook = useCallback(
    async (bookId, payload, options = {}) => {
      await runThunk(updateCmsBook({ bookId, payload }), 'Failed to update CMS book before publish', {
        enabled: false,
      });
      return runThunk(publishCmsBook(bookId), 'Failed to publish CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book published successfully',
      });
    },
    [runThunk]
  );

  const createAndPublishBook = useCallback(
    async (payload, options = {}) => {
      const created = await runThunk(
        createCmsBook({ ...payload, status: CMS_BOOK_STATUS.DRAFT }),
        'Failed to create CMS book',
        { enabled: false }
      );
      const bookId = created?.data?._id || created?.data?.id;
      if (!bookId) throw new Error('Book id missing after create');
      return runThunk(publishCmsBook(bookId), 'Failed to publish CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book published successfully',
      });
    },
    [runThunk]
  );

  const unpublishBook = useCallback(
    (bookId, options = {}) =>
      runThunk(unpublishCmsBook(bookId), 'Failed to unpublish CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book moved to draft',
      }),
    [runThunk]
  );

  const archiveBook = useCallback(
    (bookId, options = {}) =>
      runThunk(archiveCmsBook(bookId), 'Failed to archive CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book archived successfully',
      }),
    [runThunk]
  );

  const removeBook = useCallback(
    (bookId, options = {}) =>
      runThunk(deleteCmsBook(bookId), 'Failed to delete CMS book', {
        enabled: options.notifySuccess !== false,
        message: options.successMessage || 'Book deleted successfully',
      }),
    [runThunk]
  );

  const uploadBookMedia = useCallback(
    async ({ file, mediaType, title, description, preTrimmed = false }) => {
      try {
        return await cmsBookAdminService.uploadBookMedia({
          file,
          mediaType,
          title,
          description,
          preTrimmed,
        });
      } catch (error) {
        dispatch(showNotification({ message: error || 'Failed to upload media', type: 'error' }));
        throw error;
      }
    },
    [dispatch]
  );

  const updateFilters = useCallback(
    (filters) => dispatch(setCmsBookAdminFilters(filters)),
    [dispatch]
  );

  const setBuilderPages = useCallback(
    (pages) => dispatch(setCmsBookBuilderPages(pages)),
    [dispatch]
  );

  const patchBuilderPage = useCallback(
    (pageIndex, patch) => dispatch(patchCmsBookBuilderPage({ pageIndex, patch })),
    [dispatch]
  );

  const appendBuilderPage = useCallback(
    (page) => dispatch(appendCmsBookBuilderPage(page)),
    [dispatch]
  );

  const resetBuilderDraft = useCallback(() => {
    dispatch(resetCmsBookBuilderDraft());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearCmsBookAdminError());
  }, [dispatch]);

  const clearCurrentBook = useCallback(() => {
    dispatch(clearCurrentCmsBook());
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch(resetCmsBookAdminState());
  }, [dispatch]);

  const getIntroBackgroundMusicUrl = useCallback(
    (book) => resolveIntroBackgroundMusicUrl(book || state.currentBook),
    [state.currentBook]
  );

  return useMemo(
    () => ({
      ...state,
      currentBookIntroBackgroundMusicUrl,
      getIntroBackgroundMusicUrl,
      getCoverPageFromBook,
      CMS_BOOK_STATUS,
      normalizeBookStatus,
      getCmsBookStatusLabel,
      getCmsBookStatusChipColor,
      loadBooks,
      loadBookById,
      addBook,
      createBookAsDraft,
      saveBookAsDraft,
      saveAndPublishBook,
      createAndPublishBook,
      editBook,
      publishBook,
      unpublishBook,
      archiveBook,
      removeBook,
      uploadBookMedia,
      updateFilters,
      setBuilderPages,
      patchBuilderPage,
      appendBuilderPage,
      resetBuilderDraft,
      clearError,
      clearCurrentBook,
      resetState,
    }),
    [
      state,
      currentBookIntroBackgroundMusicUrl,
      getIntroBackgroundMusicUrl,
      loadBooks,
      loadBookById,
      addBook,
      createBookAsDraft,
      saveBookAsDraft,
      saveAndPublishBook,
      createAndPublishBook,
      editBook,
      publishBook,
      unpublishBook,
      archiveBook,
      removeBook,
      uploadBookMedia,
      updateFilters,
      setBuilderPages,
      patchBuilderPage,
      appendBuilderPage,
      resetBuilderDraft,
      clearError,
      clearCurrentBook,
      resetState,
    ]
  );
};

export default useCmsBookAdmin;
