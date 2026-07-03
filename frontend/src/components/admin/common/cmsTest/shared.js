export const pageFrameSx = {
  width: 'min(100%, calc(100dvh * 16 / 9))',
  height: 'min(100dvh, calc(100vw * 9 / 16))',
  maxWidth: '100vw',
  maxHeight: '100dvh',
  minHeight: 0,
  aspectRatio: '1920 / 1080',
  borderRadius: '8px',
  overflow: 'hidden',
  border: (theme) => `1px solid ${theme.palette.border.main}`,
  position: 'relative',
  backgroundColor: '#ffffff',
};

export const imageActionButtonSx = {
  border: 'none',
  p: 0,
  m: 0,
  minWidth: 0,
  width: { xs: 116, md: 144 },
  height: { xs: 116, md: 144 },
  borderRadius: 0,
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'transparent',
    opacity: 0.92,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
};

import { BACKEND_BASE_URL } from '../../../../config/constants';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * CMS media often stores `/uploads/...` paths. Preload + `<img>` / `<video>` need absolute URLs
 * when the API origin differs from the Vite dev server or marketing site.
 */
export const resolveCmsAbsoluteMediaUrl = (raw) => {
  if (raw == null) return '';
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed || OBJECT_ID.test(trimmed)) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const base = String(BACKEND_BASE_URL || '').replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (!base) return path;
  return `${base}${path}`;
};

export const resolvePageType = (rawType = '') => {
  if (rawType === 'cover') return 'intro';
  if (rawType === 'activity_demo_video') return 'demo';
  if (rawType === 'activity_drag_2x1' || rawType === 'activity_drag_2x2') return 'interactive';
  if (rawType === 'end') return 'reward';
  return rawType;
};

export const resolveImageUrl = (page = {}) =>
  resolveCmsAbsoluteMediaUrl(
    page.imageUrl
    || page.backgroundImageUrl
    || page?.media?.imageUrl
    || page?.media?.backgroundImageUrl
    || page?.media?.image?.url
    || page?.media?.image?.cloudUrl
    || page?.media?.backgroundImage?.url
    || page?.media?.backgroundImage?.cloudUrl
    || page?.media?.imageMedia?.url
    || page?.media?.imageMedia?.cloudUrl
    || page?.media?.backgroundImageMedia?.url
    || page?.media?.backgroundImageMedia?.cloudUrl
    || page?.media?.guideImageMedia?.url
    || page?.media?.guideImageMedia?.cloudUrl
    || ''
  );

export const resolveVideoUrl = (page = {}) =>
  resolveCmsAbsoluteMediaUrl(
    page.videoUrl
    || page?.media?.videoUrl
    || page?.media?.video?.url
    || page?.media?.video?.cloudUrl
    || page?.media?.videoMedia?.url
    || page?.media?.videoMedia?.cloudUrl
    || ''
  );

export const resolveAudioUrl = (page = {}) => {
  const pageType = resolvePageType(page?.type);
  if (pageType === 'intro' || pageType === 'reward') return '';
  return resolveCmsAbsoluteMediaUrl(
    page.audioUrl
    || page?.media?.audioUrl
    || page?.media?.audio?.url
    || page?.media?.audio?.cloudUrl
    || page?.media?.audioMedia?.url
    || page?.media?.audioMedia?.cloudUrl
    || page?.media?.instructionAudioMedia?.url
    || page?.media?.instructionAudioMedia?.cloudUrl
    || ''
  );
};

const toSafeMediaUrl = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return String(value.url || value.cloudUrl || '').trim();
  }
  return '';
};

export const resolveDropZoneAudioUrl = (zone = {}, index = 0, page = {}) => {
  const pageLevelAudios = [page?.answerAudioOne, page?.answerAudioTwo];
  return resolveCmsAbsoluteMediaUrl(
    toSafeMediaUrl(zone?.audioUrl)
    || toSafeMediaUrl(zone?.audio)
    || toSafeMediaUrl(zone?.audioMedia)
    || toSafeMediaUrl(pageLevelAudios[index])
    || ''
  );
};

/** Optional intro/cover background music (looped on intro screen). */
export const resolveIntroBackgroundMusicUrl = (page = {}) =>
  resolveCmsAbsoluteMediaUrl(
    page.introBackgroundMusicUrl
    || page?.media?.introBackgroundMusicUrl
    || page?.media?.audioMedia?.url
    || page?.media?.audioMedia?.cloudUrl
    || page?.media?.audio?.url
    || page?.media?.audio?.cloudUrl
    || ''
  );

/** Optional reward celebration audio (played once on reward screen). */
export const resolveRewardAudioUrl = (page = {}) => {
  const pageType = resolvePageType(page?.type);
  if (pageType !== 'reward') return '';
  return resolveCmsAbsoluteMediaUrl(
    page.rewardAudioUrl
    || page?.media?.rewardAudioUrl
    || page?.media?.audioMedia?.url
    || page?.media?.audioMedia?.cloudUrl
    || page?.media?.audio?.url
    || page?.media?.audio?.cloudUrl
    || ''
  );
};

export const cmsPageSubtitleWrapSx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: { xs: 2, md: 3 },
  pointerEvents: 'none',
  zIndex: 2,
};

export const cmsPageSubtitleTextSx = {
  fontFamily: 'Quicksand, sans-serif',
  fontWeight: 600,
  color: '#fff',
  textAlign: 'center',
  opacity: 0.95,
  textShadow: '0 1px 6px rgba(0,0,0,0.65)',
};

export {
  CONTENT_READING_FONT_SIZE_PRESETS,
  resolveContentReadingFontSizePx,
} from '../../../../utils/cmsContentReading';
