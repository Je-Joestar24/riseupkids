import api from '../api/axios';

const BASE_PATH = '/admin/cms-books';

export const CMS_BOOK_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const normalizeBookStatus = (status, fallback = CMS_BOOK_STATUS.DRAFT) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === CMS_BOOK_STATUS.PUBLISHED) return CMS_BOOK_STATUS.PUBLISHED;
  if (value === CMS_BOOK_STATUS.ARCHIVED) return CMS_BOOK_STATUS.ARCHIVED;
  if (value === CMS_BOOK_STATUS.DRAFT) return CMS_BOOK_STATUS.DRAFT;
  return fallback;
};

export const getCmsBookStatusLabel = (status) => {
  const normalized = normalizeBookStatus(status);
  if (normalized === CMS_BOOK_STATUS.PUBLISHED) return 'Published';
  if (normalized === CMS_BOOK_STATUS.ARCHIVED) return 'Archived';
  return 'Draft';
};

export const getCmsBookStatusChipColor = (status) => {
  const normalized = normalizeBookStatus(status);
  if (normalized === CMS_BOOK_STATUS.PUBLISHED) return 'success';
  if (normalized === CMS_BOOK_STATUS.ARCHIVED) return 'default';
  return 'warning';
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const HYDRATED_BOOK_FIELDS = [
  'coverImageMediaId',
  'coverImageMedia',
  'coverImageUrl',
  'introBackgroundMusicMediaId',
  'introBackgroundMusicMedia',
  'introBackgroundMusicUrl',
];

const HYDRATED_PAGE_MEDIA_FIELDS = [
  'imageMedia',
  'audioMedia',
  'videoMedia',
  'instructionAudioMedia',
  'backgroundImageMedia',
  'guideImageMedia',
  'guideImageMedias',
  'imageUrl',
  'audioUrl',
  'videoUrl',
  'backgroundImageUrl',
];

const sanitizePageMedia = (media = {}) => {
  if (!media || typeof media !== 'object') return media;
  const safe = { ...media };
  HYDRATED_PAGE_MEDIA_FIELDS.forEach((key) => {
    delete safe[key];
  });
  return safe;
};

const sanitizePagePayload = (page = {}) => {
  if (!page || typeof page !== 'object') return page;
  const safe = { ...page };
  delete safe.introBackgroundMusicUrl;
  if (safe.media) {
    safe.media = sanitizePageMedia(safe.media);
  }
  if (Array.isArray(safe.interaction?.options)) {
    safe.interaction = {
      ...safe.interaction,
      options: safe.interaction.options.map((option) => {
        const nextOption = { ...option };
        delete nextOption.imageMedia;
        delete nextOption.audioMedia;
        delete nextOption.imageUrl;
        delete nextOption.audioUrl;
        return nextOption;
      }),
    };
  }
  if (Array.isArray(safe.interaction?.dropZones)) {
    safe.interaction = {
      ...safe.interaction,
      dropZones: safe.interaction.dropZones.map((zone) => {
        const nextZone = { ...zone };
        delete nextZone.audioMedia;
        delete nextZone.audioUrl;
        return nextZone;
      }),
    };
  }
  return safe;
};

const sanitizePayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return {};
  const safe = { ...payload };
  delete safe._id;
  delete safe.createdAt;
  delete safe.updatedAt;
  delete safe.createdBy;
  delete safe.updatedBy;
  HYDRATED_BOOK_FIELDS.forEach((key) => {
    delete safe[key];
  });
  if (Array.isArray(safe.pages)) {
    safe.pages = safe.pages.map(sanitizePagePayload);
  }
  return safe;
};

const toSafeUrl = (value) => (typeof value === 'string' ? value.trim() : '');

export const getCoverPageFromBook = (book) => {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  return (
    pages.find((page) => page?.type === 'cover' && Number(page?.order) === 1) ||
    pages.find((page) => page?.type === 'cover') ||
    null
  );
};

/** Optional intro background music URL from admin API (cover `media.audioMedia`). */
export const resolveIntroBackgroundMusicUrl = (bookOrPage) => {
  if (!bookOrPage) return '';

  if (Array.isArray(bookOrPage.pages)) {
    const fromBook = toSafeUrl(bookOrPage.introBackgroundMusicUrl);
    if (fromBook) return fromBook;
    return resolveIntroBackgroundMusicUrl(getCoverPageFromBook(bookOrPage));
  }

  const page = bookOrPage;
  const media = page?.media || {};
  return (
    toSafeUrl(page.introBackgroundMusicUrl) ||
    toSafeUrl(media.audioMedia?.url) ||
    toSafeUrl(media.audioMedia?.cloudUrl) ||
    toSafeUrl(media.audioUrl) ||
    ''
  );
};

export const normalizeCmsBookFromApi = (book) => {
  if (!book || typeof book !== 'object') return book;

  const cover = getCoverPageFromBook(book);
  const introBackgroundMusicUrl = resolveIntroBackgroundMusicUrl(book);
  const introBackgroundMusicMediaId =
    book.introBackgroundMusicMediaId ||
    cover?.media?.audioMediaId ||
    cover?.media?.audioMedia?.id ||
    cover?.media?.audioMedia?._id ||
    null;

  const pages = Array.isArray(book.pages)
    ? book.pages.map((page) => {
      if (page?.type !== 'cover') return page;
      const url = resolveIntroBackgroundMusicUrl(page);
      if (!url) return page;
      return { ...page, introBackgroundMusicUrl: url };
    })
    : book.pages;

  return {
    ...book,
    status: normalizeBookStatus(book.status),
    pages,
    introBackgroundMusicMediaId: introBackgroundMusicMediaId || null,
    introBackgroundMusicUrl: introBackgroundMusicUrl || null,
  };
};

const cmsBookAdminService = {
  listBooks: async (params = {}) => {
    try {
      const response = await api.get(BASE_PATH, { params });
      const data = response.data;
      if (data?.success && Array.isArray(data?.data?.items)) {
        return {
          ...data,
          data: {
            ...data.data,
            items: data.data.items.map(normalizeCmsBookFromApi),
          },
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load CMS books');
    }
  },

  getBookById: async (bookId) => {
    try {
      const response = await api.get(`${BASE_PATH}/${bookId}`);
      const data = response.data;
      if (data?.success && data?.data) {
        return {
          ...data,
          data: normalizeCmsBookFromApi(data.data),
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load CMS book');
    }
  },

  createBook: async (payload) => {
    try {
      const response = await api.post(BASE_PATH, sanitizePayload(payload));
      const data = response.data;
      if (data?.success && data?.data) {
        return {
          ...data,
          data: normalizeCmsBookFromApi(data.data),
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to create CMS book');
    }
  },

  /**
   * Upload CMS book media. Audio uploads may return `duration` and `trimMeta`
   * when server-side silence trim is applied.
   */
  uploadBookMedia: async ({ file, mediaType, title, description }) => {
    try {
      if (!file) throw new Error('File is required');
      const formData = new FormData();
      formData.append('file', file);
      if (mediaType) formData.append('mediaType', mediaType);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      const response = await api.post(`${BASE_PATH}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to upload CMS book media');
    }
  },

  updateBook: async (bookId, payload) => {
    try {
      const response = await api.put(`${BASE_PATH}/${bookId}`, sanitizePayload(payload));
      const data = response.data;
      if (data?.success && data?.data) {
        return {
          ...data,
          data: normalizeCmsBookFromApi(data.data),
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to update CMS book');
    }
  },

  publishBook: async (bookId) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${bookId}/publish`);
      const data = response.data;
      if (data?.success && data?.data) {
        return {
          ...data,
          data: normalizeCmsBookFromApi(data.data),
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to publish CMS book');
    }
  },

  unpublishBook: async (bookId) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${bookId}/unpublish`);
      const data = response.data;
      if (data?.success && data?.data) {
        return {
          ...data,
          data: normalizeCmsBookFromApi(data.data),
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to unpublish CMS book');
    }
  },

  archiveBook: async (bookId) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${bookId}/archive`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to archive CMS book');
    }
  },

  deleteBook: async (bookId) => {
    try {
      const response = await api.delete(`${BASE_PATH}/${bookId}`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to delete CMS book');
    }
  },
};

export default cmsBookAdminService;
