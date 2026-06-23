/**
 * CMS built-in book player — shared helpers (parity with web cmsTest/shared.js).
 * All layout percentages are relative to a 1920×1080 logical stage.
 */

import type { CmsPlayablePage, PlayerPageMedia } from '@/services/cmsBooksPlayerService';

export const CMS_DESIGN_WIDTH = 1920;
export const CMS_DESIGN_HEIGHT = 1080;

/** Match web pageFrameSx: 16:9 stage inside the available viewport. */
export function computeStageSize(
  viewportWidth: number,
  viewportHeight: number
): { width: number; height: number } {
  const w = Math.max(0, viewportWidth);
  const h = Math.max(0, viewportHeight);
  const byWidth = (w * CMS_DESIGN_HEIGHT) / CMS_DESIGN_WIDTH;
  const byHeight = (h * CMS_DESIGN_WIDTH) / CMS_DESIGN_HEIGHT;
  const height = Math.min(h, byWidth);
  const width = Math.min(w, byHeight);
  return { width, height };
}

export function resolvePageType(rawType: string | undefined): string {
  if (rawType === 'cover') return 'intro';
  if (rawType === 'activity_demo_video') return 'demo';
  if (rawType === 'activity_drag_2x1' || rawType === 'activity_drag_2x2') return 'interactive';
  /** CMS schema uses `end` for the terminal page; player treats it like `reward` (celebration + home). */
  if (rawType === 'end') return 'reward';
  return rawType ?? '';
}

export function resolveImageUrl(page: CmsPlayablePage | Record<string, unknown>): string {
  const p = page as Record<string, unknown>;
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  return (
    (p.imageUrl as string) ||
    (p.backgroundImageUrl as string) ||
    (media.imageUrl as string) ||
    (media.backgroundImageUrl as string) ||
    (media.image as { url?: string } | undefined)?.url ||
    (media.backgroundImage as { url?: string } | undefined)?.url ||
    media.imageMedia?.url ||
    media.backgroundImageMedia?.url ||
    media.guideImageMedia?.url ||
    ''
  );
}

export function resolveVideoUrl(page: CmsPlayablePage | Record<string, unknown>): string {
  const p = page as Record<string, unknown>;
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  return (
    (p.videoUrl as string) ||
    (media.videoUrl as string) ||
    (media.video as { url?: string } | undefined)?.url ||
    media.videoMedia?.url ||
    ''
  );
}

export function resolveAudioUrl(page: CmsPlayablePage | Record<string, unknown>): string {
  const p = page as Record<string, unknown>;
  const pageType = resolvePageType(p.type as string | undefined);
  if (pageType === 'intro' || pageType === 'reward') {
    return '';
  }
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  return (
    (p.audioUrl as string) ||
    (media.audioUrl as string) ||
    (media.audio as { url?: string } | undefined)?.url ||
    media.audioMedia?.url ||
    media.instructionAudioMedia?.url ||
    ''
  );
}

/** Optional intro/cover background music (cover `media.audioMedia`). */
export function resolveIntroBackgroundMusicUrl(
  page: CmsPlayablePage | Record<string, unknown>
): string {
  const p = page as Record<string, unknown>;
  const pageType = resolvePageType(p.type as string | undefined);
  if (pageType !== 'intro') return '';
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  return (
    (p.introBackgroundMusicUrl as string) ||
    (media.introBackgroundMusicUrl as string) ||
    media.audioMedia?.url ||
    (media.audio as { url?: string } | undefined)?.url ||
    ''
  );
}

/** Optional reward celebration audio (reward `media.audioMedia`). */
export function resolveRewardAudioUrl(
  page: CmsPlayablePage | Record<string, unknown>
): string {
  const p = page as Record<string, unknown>;
  const pageType = resolvePageType(p.type as string | undefined);
  if (pageType !== 'reward') return '';
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  return (
    (p.rewardAudioUrl as string) ||
    (media.rewardAudioUrl as string) ||
    media.audioMedia?.url ||
    (media.audio as { url?: string } | undefined)?.url ||
    ''
  );
}

export function getPlayablePages(pages: CmsPlayablePage[] | undefined): CmsPlayablePage[] {
  if (!Array.isArray(pages)) return [];
  return pages.filter((page) => Boolean(page?.type));
}

const PARALLEL_SIZE_MULTIPLIER = 1.75;

export interface ScaledInteractiveMetrics {
  scale: number;
  cardWidth: number;
  cardHeight: number;
  optionTopOffset: number;
  zoneGap: number;
  dropSnapOffset: number;
  minStartLeft: number;
  parallelBottomOffset: number;
}

export function getScaledInteractiveMetrics(
  stageWidth: number,
  stageHeight: number,
  isSingleLayout: boolean
): ScaledInteractiveMetrics {
  const scale = Math.min(
    stageWidth / CMS_DESIGN_WIDTH,
    stageHeight / CMS_DESIGN_HEIGHT
  );

  const single: ScaledInteractiveMetrics = {
    scale,
    cardWidth: 320 * scale,
    cardHeight: 272 * scale,
    optionTopOffset: 320 * scale,
    zoneGap: 68 * scale,
    dropSnapOffset: 320 * scale,
    minStartLeft: 16 * scale,
    parallelBottomOffset: 112 * scale,
  };

  const parallel: ScaledInteractiveMetrics = {
    scale,
    cardWidth: 180 * PARALLEL_SIZE_MULTIPLIER * scale,
    cardHeight: 136 * PARALLEL_SIZE_MULTIPLIER * scale,
    optionTopOffset: 0,
    zoneGap: 68 * 0.92 * scale,
    dropSnapOffset: 0,
    minStartLeft: 16 * scale,
    parallelBottomOffset: 96 * scale,
  };

  return isSingleLayout ? single : parallel;
}

const CONTENT_READING_FONT_SIZE_MIN = 20;
const CONTENT_READING_FONT_SIZE_MAX = 72;

/** Default content reading size when CMS does not set `reading.fontSizePx`. */
export const DEFAULT_CONTENT_READING_FONT_PX = Math.round(20 * 1.1);

function normalizeReadingFontSizePx(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < CONTENT_READING_FONT_SIZE_MIN || rounded > CONTENT_READING_FONT_SIZE_MAX) {
    return null;
  }
  return rounded;
}

/** Resolves px for content reading display; null = use `DEFAULT_CONTENT_READING_FONT_PX`. */
export function resolveContentReadingFontSizePx(
  page: CmsPlayablePage | Record<string, unknown>
): number {
  const p = page as Record<string, unknown>;
  const reading = p.reading as { fontSizePx?: unknown } | null | undefined;
  const fromReading = normalizeReadingFontSizePx(reading?.fontSizePx);
  if (fromReading != null) return fromReading;
  const fromFlat = normalizeReadingFontSizePx(p.readingFontSizePx);
  if (fromFlat != null) return fromFlat;
  return DEFAULT_CONTENT_READING_FONT_PX;
}

/** Word timings from CMS reading payload (seconds); sorted by `start`. */
export interface NormalizedReadingWord {
  w: string;
  start: number;
  end: number;
}

/**
 * Reads `page.reading.words` or legacy `readingWords`, sorts by start, and optionally
 * scales millisecond timestamps down to seconds when they clearly exceed `reading.durationSec`.
 */
export function extractReadingWordsFromPage(
  page: CmsPlayablePage | Record<string, unknown>
): NormalizedReadingWord[] {
  const p = page as Record<string, unknown>;
  const reading = (p.reading ?? null) as {
    words?: unknown;
    durationSec?: number | null;
  } | null;

  let raw: unknown[] = [];
  if (reading && Array.isArray(reading.words) && reading.words.length) {
    raw = reading.words as unknown[];
  } else {
    const rw = p.readingWords;
    if (Array.isArray(rw) && rw.length) raw = rw as unknown[];
  }

  const parsed: NormalizedReadingWord[] = [];
  for (const item of raw) {
    const row = item as { w?: string; start?: unknown; end?: unknown };
    const w = String(row?.w ?? '').trim();
    const start = Number(row?.start);
    const end = Number(row?.end);
    if (!w || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    parsed.push({ w, start, end });
  }

  if (!parsed.length) return [];

  parsed.sort((a, b) => a.start - b.start);

  const durationSec =
    reading && reading.durationSec != null && Number.isFinite(Number(reading.durationSec))
      ? Number(reading.durationSec)
      : null;
  const lastEnd = parsed[parsed.length - 1].end;

  let scale = 1;
  if (durationSec != null && durationSec > 0 && lastEnd > durationSec * 2) {
    scale = 0.001;
  } else if ((durationSec == null || durationSec <= 0) && lastEnd > 600) {
    scale = 0.001;
  }

  if (scale !== 1) {
    return parsed.map((x) => ({
      w: x.w,
      start: x.start * scale,
      end: x.end * scale,
    }));
  }

  return parsed;
}

/** Active word index from playback time (seconds) and API `start` / `end` windows. */
export function getActiveReadingWordIndex(
  timeSec: number,
  words: NormalizedReadingWord[]
): number {
  if (!words.length || !Number.isFinite(timeSec)) return -1;
  const t = Math.max(0, timeSec);
  for (let i = 0; i < words.length; i++) {
    const { start, end } = words[i];
    const isLast = i === words.length - 1;
    if (t >= start && (isLast ? t <= end + 0.001 : t < end)) {
      return i;
    }
  }
  return -1;
}

/** Bundled CMS control chrome (intro / demo / content / interactive / reward). */
export const cmsLocalUiAssets = {
  introPlayButton: require('@/assets/cms/intro_play_button.png'),
  demoPlayButton: require('@/assets/cms/demo_play_button.png'),
  contentBackButton: require('@/assets/cms/content_back_button.png'),
  contentNextButton: require('@/assets/cms/content_next_button.png'),
  retryButton: require('@/assets/cms/retry_button.png'),
  homeButton: require('@/assets/cms/home.png'),
} as const;

/** Bundled SFX for CMS drag-and-drop feedback (correct vs retry). */
export const cmsInteractiveFeedbackAudio = {
  goodJob: require('@/assets/audio/Good_Job_REAL.mp3'),
  tryAgain: require('@/assets/audio/Try_Again_REAL.mp3'),
} as const;

/** Minimum pause after Good Job SFX starts before advancing the interactive page (app). */
export const CMS_GOOD_JOB_ADVANCE_DELAY_MS = 300;

/** Fallback advance delay when Good Job SFX fails to load (app). */
export const CMS_GOOD_JOB_ADVANCE_FALLBACK_MS = 1000;
