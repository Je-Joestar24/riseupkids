import { looksLikeBunnyExploreEmbedUrl } from './bunnyExploreEmbed';
import {
  resolveAudioUrl,
  resolveImageUrl,
  resolveIntroBackgroundMusicUrl,
  resolvePageType,
  resolveRewardAudioUrl,
  resolveVideoUrl,
  resolveCmsAbsoluteMediaUrl,
} from '../components/admin/common/cmsTest/shared';

const pushUrl = (set, url) => {
  const absolute = resolveCmsAbsoluteMediaUrl(url);
  if (absolute && !looksLikeBunnyExploreEmbedUrl(absolute)) {
    set.add(absolute);
  }
};

const pushMediaObjectUrl = (set, value) => {
  if (typeof value === 'string') {
    pushUrl(set, value);
    return;
  }
  if (value && typeof value === 'object') {
    pushUrl(set, value.url);
    pushUrl(set, value.cloudUrl);
  }
};

/** Collect every remote URL referenced by playable pages (parity with native app player). */
export const collectCmsPlayerMediaUrls = (pages = [], bookMeta = {}) => {
  const set = new Set();

  (pages || []).forEach((page) => {
    const media = page?.media || {};
    const pageType = resolvePageType(page?.type);

    pushUrl(set, resolveImageUrl(page));
    pushUrl(set, resolveVideoUrl(page));

    if (pageType === 'intro') {
      pushUrl(set, resolveIntroBackgroundMusicUrl(page));
    } else if (pageType === 'demo' || pageType === 'reward') {
      pushUrl(set, resolveVideoUrl(page));
      pushUrl(set, resolveImageUrl(page));
      pushMediaObjectUrl(set, media.videoMedia);
      pushMediaObjectUrl(set, media.backgroundImageMedia);
      if (pageType === 'reward') {
        pushUrl(set, resolveRewardAudioUrl(page));
      }
    } else {
      pushUrl(set, resolveAudioUrl(page));
    }

    (media.guideImageMedias || []).forEach((item) => pushUrl(set, item?.url || item?.cloudUrl));
    pushMediaObjectUrl(set, media.guideImageMedia);

    (media.sceneImageMedias || []).forEach((item) => pushUrl(set, item?.url || item?.cloudUrl));
    pushMediaObjectUrl(set, media.sceneImageMedia);

    pushUrl(set, page.optionImageOne);
    pushUrl(set, page.optionImageTwo);
    pushUrl(set, page.answerAudioOne);
    pushUrl(set, page.answerAudioTwo);

    (page?.interaction?.options || []).forEach((option) => {
      pushMediaObjectUrl(set, option?.imageMedia);
      pushMediaObjectUrl(set, option?.audioMedia);
      pushMediaObjectUrl(set, option?.image);
      pushMediaObjectUrl(set, option?.audio);
      pushUrl(set, option?.imageUrl);
      pushUrl(set, option?.audioUrl);
    });

    (page?.interaction?.dropZones || []).forEach((zone, index) => {
      pushUrl(set, zone?.audioUrl);
      pushMediaObjectUrl(set, zone?.audioMedia);
      pushMediaObjectUrl(set, zone?.audio);
      const pageLevelAudios = [page?.answerAudioOne, page?.answerAudioTwo];
      pushUrl(set, pageLevelAudios[index]);
    });
  });

  pushUrl(set, bookMeta.introBackgroundMusicUrl || resolveIntroBackgroundMusicUrl({ pages, ...bookMeta }));
  pushUrl(set, bookMeta.coverImageUrl);

  return Array.from(set);
};

const PRELOAD_TIMEOUT_MS = 45000;

const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Preload timed out for: ${label}`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const preloadImage = (url) =>
  withTimeout(
    new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      const finish = (ok) => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        ok ? resolve() : reject(new Error(`Image preload failed: ${url}`));
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = url;
    }),
    PRELOAD_TIMEOUT_MS,
    url
  );

const preloadMediaElement = (url) =>
  withTimeout(
    fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
    }).catch(() => undefined),
    PRELOAD_TIMEOUT_MS,
    url
  );

const getMediaKind = (url = '') => {
  const normalized = String(url).toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/.test(normalized) || normalized.includes('/videos/')) {
    return 'video';
  }
  if (/\.(mp3|mpeg|wav|ogg|m4a|aac)(\?|#|$)/.test(normalized) || normalized.includes('/audio/')) {
    return 'audio';
  }
  return 'image';
};

/** Warm browser cache for one absolute media URL. */
export const preloadCmsMediaUrl = async (url) => {
  if (!url) return;
  const kind = getMediaKind(url);
  if (kind === 'image') {
    await preloadImage(url);
    return;
  }
  await preloadMediaElement(url);
};

export const MAX_CMS_PRELOAD_CONCURRENCY = 4;
