import api from '../api/axios';
import {
  collectCmsPlayerMediaUrls,
  MAX_CMS_PRELOAD_CONCURRENCY,
  preloadCmsMediaUrl,
} from '../utils/cmsPlayerMedia';
import { resolveIntroBackgroundMusicUrl as resolveIntroFromPage } from '../components/admin/common/cmsTest/shared';

const BASE_PATH = '/parent/cms-books';
const mediaPreloadCache = new Map();

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const toSafeUrl = (value) => (typeof value === 'string' ? value.trim() : '');

export const getCoverPageFromPlayableBook = (book) => {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  return (
    pages.find((page) => page?.type === 'cover' && Number(page?.order) === 1) ||
    pages.find((page) => page?.type === 'cover') ||
    null
  );
};

export const resolveIntroBackgroundMusicUrl = (bookOrPage) => {
  if (!bookOrPage) return '';

  if (Array.isArray(bookOrPage.pages)) {
    const fromBook = toSafeUrl(bookOrPage.introBackgroundMusicUrl);
    if (fromBook) return fromBook;
    return resolveIntroBackgroundMusicUrl(getCoverPageFromPlayableBook(bookOrPage));
  }

  const page = bookOrPage;
  if (page?.type && page.type !== 'cover') return '';

  const media = page?.media || {};
  return (
    toSafeUrl(page.introBackgroundMusicUrl) ||
    toSafeUrl(media.audioMedia?.url) ||
    toSafeUrl(media.audio?.url) ||
    toSafeUrl(media.audioUrl) ||
    ''
  );
};

export const resolveRewardAudioUrl = (bookOrPage) => {
  if (!bookOrPage) return '';

  const page = bookOrPage;
  if (page?.type !== 'reward' && page?.type !== 'end') return '';

  const media = page?.media || {};
  return (
    toSafeUrl(page.rewardAudioUrl) ||
    toSafeUrl(media.audioMedia?.url) ||
    toSafeUrl(media.audio?.url) ||
    toSafeUrl(media.audioUrl) ||
    ''
  );
};

export const normalizePlayableBookFromApi = (book) => {
  if (!book || typeof book !== 'object') return book;

  const cover = getCoverPageFromPlayableBook(book);
  const introBackgroundMusicUrl = resolveIntroBackgroundMusicUrl(book);
  const introBackgroundMusicMediaId =
    book.introBackgroundMusicMediaId ||
    cover?.media?.audioMediaId ||
    cover?.media?.audioMedia?.id ||
    null;

  const pages = Array.isArray(book.pages)
    ? book.pages.map((page) => {
      if (page?.type === 'cover') {
        const url = resolveIntroBackgroundMusicUrl(page);
        if (!url) return page;
        return { ...page, introBackgroundMusicUrl: url };
      }
      if (page?.type === 'reward' || page?.type === 'end') {
        const url = resolveRewardAudioUrl(page);
        if (!url) return page;
        return { ...page, rewardAudioUrl: url };
      }
      return page;
    })
    : book.pages;

  return {
    ...book,
    pages,
    introBackgroundMusicMediaId: introBackgroundMusicMediaId || null,
    introBackgroundMusicUrl: introBackgroundMusicUrl || null,
  };
};

const getUniqueBookMediaUrls = (pages = [], bookMeta = {}) =>
  collectCmsPlayerMediaUrls(pages, bookMeta);

const preloadMediaUrl = (url) => {
  if (!url) return Promise.resolve();

  if (mediaPreloadCache.has(url)) {
    return mediaPreloadCache.get(url);
  }

  const requestPromise = preloadCmsMediaUrl(url).catch((error) => {
    mediaPreloadCache.delete(url);
    throw error;
  });

  mediaPreloadCache.set(url, requestPromise);
  return requestPromise;
};

const preloadUrlsWithConcurrency = async (urls = [], onProgress) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    onProgress?.({ completed: 0, total: 0, progress: 100 });
    return {
      total: 0,
      loaded: 0,
      failed: [],
      progress: 100,
    };
  }

  const total = urls.length;
  let cursor = 0;
  let completed = 0;
  let loaded = 0;
  const failed = [];

  const notify = () => {
    const progress = Math.min(100, Math.round((completed / total) * 100));
    onProgress?.({ completed, total, progress });
  };

  notify();

  const worker = async () => {
    while (cursor < total) {
      const currentIndex = cursor;
      cursor += 1;
      const url = urls[currentIndex];

      try {
        await preloadMediaUrl(url);
        loaded += 1;
      } catch (_error) {
        failed.push(url);
      } finally {
        completed += 1;
        notify();
      }
    }
  };

  const workerCount = Math.min(MAX_CMS_PRELOAD_CONCURRENCY, total);
  await Promise.all(Array.from({ length: workerCount }).map(() => worker()));

  return {
    total,
    loaded,
    failed,
    progress: 100,
  };
};

const cmsBookPlayerService = {
  listPlayableBooks: async (params = {}) => {
    try {
      const response = await api.get(`${BASE_PATH}/playable`, { params });
      const data = response.data;
      if (data?.success && Array.isArray(data?.data?.items)) {
        return {
          ...data,
          data: {
            ...data.data,
            items: data.data.items.map((item) => ({
              ...item,
              introBackgroundMusicMediaId: item.introBackgroundMusicMediaId ?? null,
            })),
          },
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load playable books');
    }
  },

  getPlayableBookById: async (bookId) => {
    try {
      const response = await api.get(`${BASE_PATH}/${bookId}/play`);
      const data = response.data;
      if (data?.success && data?.data) {
        return {
          ...data,
          data: normalizePlayableBookFromApi(data.data),
        };
      }
      return data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load playable book');
    }
  },

  preloadBookMedia: async ({ pages = [], book = null, onProgress } = {}) => {
    try {
      const bookMeta = book || {};
      const urls = getUniqueBookMediaUrls(pages, {
        ...bookMeta,
        introBackgroundMusicUrl:
          bookMeta.introBackgroundMusicUrl || resolveIntroFromPage({ pages, ...bookMeta }),
      });
      return await preloadUrlsWithConcurrency(urls, onProgress);
    } catch (error) {
      throw getErrorMessage(error, 'Failed to preload book media');
    }
  },
};

export default cmsBookPlayerService;
