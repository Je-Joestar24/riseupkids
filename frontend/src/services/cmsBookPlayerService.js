import api from '../api/axios';

const BASE_PATH = '/parent/cms-books';
const MAX_PRELOAD_CONCURRENCY = 4;
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

const collectPageMediaUrls = (page = {}) => {
  const optionOne = page?.interaction?.options?.[0] || {};
  const optionTwo = page?.interaction?.options?.[1] || {};
  const dropZones = Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : [];

  return [
    page.imageUrl,
    page.backgroundImageUrl,
    page.videoUrl,
    page.audioUrl,
    page.introBackgroundMusicUrl,
    page.rewardAudioUrl,
    page?.media?.imageUrl,
    page?.media?.backgroundImageUrl,
    page?.media?.videoUrl,
    page?.media?.audioUrl,
    page?.media?.image?.url,
    page?.media?.backgroundImage?.url,
    page?.media?.video?.url,
    page?.media?.audio?.url,
    page?.media?.imageMedia?.url,
    page?.media?.backgroundImageMedia?.url,
    page?.media?.videoMedia?.url,
    page?.media?.audioMedia?.url,
    page?.media?.guideImageMedia?.url,
    page?.media?.instructionAudioMedia?.url,
    page.optionImageOne,
    page.optionImageTwo,
    optionOne.imageUrl,
    optionOne?.image?.url,
    optionOne?.imageMedia?.url,
    optionOne.audioUrl,
    optionOne?.audio?.url,
    optionOne?.audioMedia?.url,
    optionTwo.imageUrl,
    optionTwo?.image?.url,
    optionTwo?.imageMedia?.url,
    optionTwo.audioUrl,
    optionTwo?.audio?.url,
    optionTwo?.audioMedia?.url,
    ...dropZones.map((zone) => zone?.audioUrl || zone?.audioMedia?.url || ''),
  ]
    .map(toSafeUrl)
    .filter(Boolean);
};

const getUniqueBookMediaUrls = (pages = [], bookMeta = {}) => {
  const fromPages = (pages || []).flatMap((page) => collectPageMediaUrls(page));
  const fromBook = [
    bookMeta.introBackgroundMusicUrl,
    bookMeta.coverImageUrl,
  ]
    .map(toSafeUrl)
    .filter(Boolean);
  return [...new Set([...fromPages, ...fromBook])];
};

const getMediaType = (url = '') => {
  const normalizedUrl = String(url).toLowerCase();

  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/.test(normalizedUrl) || normalizedUrl.includes('/videos/')) {
    return 'video';
  }

  if (/\.(mp3|mpeg|wav|ogg|m4a|aac)(\?|#|$)/.test(normalizedUrl) || normalizedUrl.includes('/audio/')) {
    return 'audio';
  }

  return 'image';
};

const preloadWithMediaElement = (url) =>
  new Promise((resolve, reject) => {
    const mediaType = getMediaType(url);
    const element =
      mediaType === 'audio'
        ? new Audio()
        : document.createElement(mediaType === 'video' ? 'video' : 'img');

    let settled = false;
    const cleanup = () => {
      element.onload = null;
      element.onerror = null;
      element.onloadeddata = null;
      element.oncanplaythrough = null;
      element.src = '';
    };

    const finish = (handler) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler();
    };

    const success = () => finish(resolve);
    const failure = () => finish(() => reject(new Error(`Media request failed for: ${url}`)));

    if (mediaType === 'image') {
      element.decoding = 'async';
      element.loading = 'eager';
      element.onload = success;
      element.onerror = failure;
    } else if (mediaType === 'audio') {
      element.preload = 'auto';
      element.oncanplaythrough = success;
      element.onerror = failure;
    } else {
      element.preload = 'auto';
      element.onloadeddata = success;
      element.onerror = failure;
    }

    element.src = url;

    if (mediaType !== 'image') {
      const playPromise = element.load?.();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
    }
  });

const fetchAndWarmCache = async (url) => {
  await preloadWithMediaElement(url);
};

const preloadMediaUrl = (url) => {
  if (!url) return Promise.resolve();

  if (mediaPreloadCache.has(url)) {
    return mediaPreloadCache.get(url);
  }

  const requestPromise = fetchAndWarmCache(url).catch((error) => {
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

  const workerCount = Math.min(MAX_PRELOAD_CONCURRENCY, total);
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
        introBackgroundMusicUrl:
          bookMeta.introBackgroundMusicUrl || resolveIntroBackgroundMusicUrl({ pages, ...bookMeta }),
        coverImageUrl: bookMeta.coverImageUrl,
      });
      return await preloadUrlsWithConcurrency(urls, onProgress);
    } catch (error) {
      throw getErrorMessage(error, 'Failed to preload book media');
    }
  },
};

export default cmsBookPlayerService;
