/**
 * CMS built-in book player — shared helpers (parity with web cmsTest/shared.js).
 * All layout percentages are relative to a 1920×1080 logical stage.
 */

import { Platform } from 'react-native';

import { BACKEND_ORIGIN } from '@/config';
import type { CmsPlayablePage, PlayerPageMedia } from '@/services/cmsBooksPlayerService';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * CMS media often stores `/uploads/...` paths (works in web same-origin).
 * React Native Image/Video require absolute http(s) or file:// URIs.
 */
export function resolveCmsAbsoluteMediaUrl(raw: string | null | undefined): string {
  if (raw == null) return '';
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed || OBJECT_ID.test(trimmed)) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const base = BACKEND_ORIGIN.replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function cmsMediaUrl(raw: string | null | undefined): string {
  return resolveCmsAbsoluteMediaUrl(raw);
}

export const CMS_DESIGN_WIDTH = 1920;
export const CMS_DESIGN_HEIGHT = 1080;

/** Match web pageFrameSx: 16:9 stage inside the available viewport. */
export function computeStageSize(
  viewportWidth: number,
  viewportHeight: number
): { width: number; height: number } {
  const w = Math.max(0, viewportWidth);
  const h = Math.max(0, viewportHeight);
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  const byWidth = (w * CMS_DESIGN_HEIGHT) / CMS_DESIGN_WIDTH;
  const byHeight = (h * CMS_DESIGN_WIDTH) / CMS_DESIGN_HEIGHT;
  const height = Math.min(h, byWidth);
  const width = Math.min(w, byHeight);
  return { width, height };
}

/**
 * iOS inset scale for the 16:9 stage (ratio unchanged).
 * Leaves a margin from the home-indicator / gesture edges so drag controls
 * are not flush with the physical bottom of the phone.
 */
export const CMS_IOS_STAGE_FIT_SCALE = 0.9;

export type ComputeCmsPlayerStageSizeOptions = {
  /** Override Platform.OS for tests. */
  platformOs?: string;
  /** Override iOS fit scale (0–1). */
  iosFitScale?: number;
};

/**
 * CMS book player is landscape-locked. Always size the 16:9 stage from a
 * landscape logical viewport, then clamp into the currently visible window so
 * brief flips / oversize safe-area math cannot crop the stage.
 *
 * On iOS the fitted stage is scaled down slightly (still 16:9) so interactive
 * controls clear the home indicator — Android keeps full-bleed fit.
 */
export function computeCmsPlayerStageSize(
  windowWidth: number,
  windowHeight: number,
  options?: ComputeCmsPlayerStageSizeOptions
): { width: number; height: number } {
  const winW = Math.max(0, windowWidth);
  const winH = Math.max(0, windowHeight);
  const landscapeW = Math.max(winW, winH);
  const landscapeH = Math.min(winW, winH);
  const ideal = computeStageSize(landscapeW, landscapeH);
  const fitted =
    ideal.width <= winW + 0.5 && ideal.height <= winH + 0.5
      ? ideal
      : computeStageSize(winW, winH);

  const platformOs = options?.platformOs ?? Platform.OS;
  if (platformOs !== 'ios') {
    return fitted;
  }

  const scale = Math.max(0.5, Math.min(1, options?.iosFitScale ?? CMS_IOS_STAGE_FIT_SCALE));
  return {
    width: fitted.width * scale,
    height: fitted.height * scale,
  };
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
  const raw =
    (p.imageUrl as string) ||
    (p.backgroundImageUrl as string) ||
    (media.imageUrl as string) ||
    (media.backgroundImageUrl as string) ||
    (media.image as { url?: string; cloudUrl?: string } | undefined)?.url ||
    (media.image as { url?: string; cloudUrl?: string } | undefined)?.cloudUrl ||
    (media.backgroundImage as { url?: string; cloudUrl?: string } | undefined)?.url ||
    (media.backgroundImage as { url?: string; cloudUrl?: string } | undefined)?.cloudUrl ||
    media.imageMedia?.url ||
    media.imageMedia?.cloudUrl ||
    media.backgroundImageMedia?.url ||
    media.backgroundImageMedia?.cloudUrl ||
    media.guideImageMedia?.url ||
    media.guideImageMedia?.cloudUrl ||
    '';
  return cmsMediaUrl(raw);
}

export function resolveVideoUrl(page: CmsPlayablePage | Record<string, unknown>): string {
  const p = page as Record<string, unknown>;
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  const videoMedia = media.videoMedia as { url?: string; cloudUrl?: string } | undefined;
  const nestedVideo = media.video as { url?: string; cloudUrl?: string } | undefined;
  const raw =
    (p.videoUrl as string) ||
    (media.videoUrl as string) ||
    nestedVideo?.url ||
    nestedVideo?.cloudUrl ||
    videoMedia?.url ||
    videoMedia?.cloudUrl ||
    '';
  return cmsMediaUrl(raw);
}

export function resolveAudioUrl(page: CmsPlayablePage | Record<string, unknown>): string {
  const p = page as Record<string, unknown>;
  const pageType = resolvePageType(p.type as string | undefined);
  if (pageType === 'intro' || pageType === 'reward') {
    return '';
  }
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  const raw =
    (p.audioUrl as string) ||
    (media.audioUrl as string) ||
    (media.audio as { url?: string; cloudUrl?: string } | undefined)?.url ||
    (media.audio as { url?: string; cloudUrl?: string } | undefined)?.cloudUrl ||
    media.audioMedia?.url ||
    media.audioMedia?.cloudUrl ||
    media.instructionAudioMedia?.url ||
    media.instructionAudioMedia?.cloudUrl ||
    '';
  return cmsMediaUrl(raw);
}

/** Optional intro/cover background music (cover `media.audioMedia`). */
export function resolveIntroBackgroundMusicUrl(
  page: CmsPlayablePage | Record<string, unknown>
): string {
  const p = page as Record<string, unknown>;
  const pageType = resolvePageType(p.type as string | undefined);
  if (pageType !== 'intro') return '';
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  const raw =
    (p.introBackgroundMusicUrl as string) ||
    (media.introBackgroundMusicUrl as string) ||
    media.audioMedia?.url ||
    media.audioMedia?.cloudUrl ||
    (media.audio as { url?: string; cloudUrl?: string } | undefined)?.url ||
    (media.audio as { url?: string; cloudUrl?: string } | undefined)?.cloudUrl ||
    '';
  return cmsMediaUrl(raw);
}

/** Optional reward celebration audio (reward `media.audioMedia`). */
export function resolveRewardAudioUrl(
  page: CmsPlayablePage | Record<string, unknown>
): string {
  const p = page as Record<string, unknown>;
  const pageType = resolvePageType(p.type as string | undefined);
  if (pageType !== 'reward') return '';
  const media = (p.media ?? {}) as PlayerPageMedia & Record<string, unknown>;
  const raw =
    (p.rewardAudioUrl as string) ||
    (media.rewardAudioUrl as string) ||
    media.audioMedia?.url ||
    media.audioMedia?.cloudUrl ||
    (media.audio as { url?: string; cloudUrl?: string } | undefined)?.url ||
    (media.audio as { url?: string; cloudUrl?: string } | undefined)?.cloudUrl ||
    '';
  return cmsMediaUrl(raw);
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

/** Default content reading size when CMS does not set `reading.fontSizePx` (design-space px @ 1920×1080). */
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

/**
 * Stage scale vs CMS design canvas (same basis as interactive metrics).
 * Reading font presets (Small…3XL) are authored in design-space px.
 */
export function getCmsStageScale(stageWidth: number, stageHeight: number): number {
  if (!(stageWidth > 0) || !(stageHeight > 0)) return 1;
  return Math.min(stageWidth / CMS_DESIGN_WIDTH, stageHeight / CMS_DESIGN_HEIGHT);
}

/**
 * Extra readability on smaller mobile stages after design-space scaling.
 * Applied only when scale < 1 so full-size stages stay at authored px.
 */
export const CMS_READING_FONT_MOBILE_BOOST = 1.35;

/**
 * Convert CMS design-space reading font px to device px for the current 16:9 stage.
 * Without this, 2XL (56px) is huge on phones vs laptop web where the stage is much larger.
 */
export function scaleCmsReadingFontSizePx(
  designFontPx: number,
  stageWidth: number,
  stageHeight: number
): number {
  const safeDesign =
    typeof designFontPx === 'number' && Number.isFinite(designFontPx) && designFontPx > 0
      ? designFontPx
      : DEFAULT_CONTENT_READING_FONT_PX;
  const stageScale = getCmsStageScale(stageWidth, stageHeight);
  const effectiveScale =
    stageScale > 0 && stageScale < 1
      ? Math.min(1, stageScale * CMS_READING_FONT_MOBILE_BOOST)
      : stageScale;
  const scaled = safeDesign * effectiveScale;
  return Math.max(10, Math.round(scaled));
}

/** Resolves design-space px for content reading; always returns a number (default if unset). */
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
  lineIndex?: number;
}

export interface ReadingLineGroup {
  lineIndex: number;
  words: NormalizedReadingWord[];
}

export const CMS_READING_LINE_ERASE_MS = 90;

/**
 * Minimum visible window for short CMS timings so phone progress ticks (~20–50ms)
 * and line fade animations cannot skip tiny words/lines entirely.
 */
export const CMS_READING_MIN_WORD_SEC = 0.08;
export const CMS_READING_MIN_LINE_SEC = 0.12;
export const CMS_READING_TIME_EPSILON_SEC = 0.02;

export function normalizeReadingText(text = ''): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function splitReadingLines(text = ''): string[] {
  return normalizeReadingText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function tokenizeLine(line = ''): string[] {
  return String(line)
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function assignLineIndicesToWords(
  words: NormalizedReadingWord[],
  text = ''
): NormalizedReadingWord[] {
  if (!words.length) return [];

  const hasExplicitLineIndex = words.some((word) => Number.isFinite(Number(word.lineIndex)));
  if (hasExplicitLineIndex) {
    return words.map((word) => ({
      ...word,
      lineIndex: Math.max(0, Number(word.lineIndex) || 0),
    }));
  }

  const lineTokenCounts = splitReadingLines(text).map((line) => tokenizeLine(line).length);
  if (!lineTokenCounts.length) {
    return words.map((word) => ({ ...word, lineIndex: 0 }));
  }

  let lineIdx = 0;
  let posInLine = 0;

  return words.map((word) => {
    const lineIndex = Math.min(lineIdx, lineTokenCounts.length - 1);
    posInLine += 1;
    if (lineIdx < lineTokenCounts.length - 1 && posInLine >= lineTokenCounts[lineIdx]) {
      lineIdx += 1;
      posInLine = 0;
    }
    return { ...word, lineIndex };
  });
}

export function groupReadingWordsByLine(
  words: NormalizedReadingWord[],
  text = ''
): ReadingLineGroup[] {
  const withLines = assignLineIndicesToWords(words, text);
  const groups = new Map<number, NormalizedReadingWord[]>();

  withLines.forEach((word) => {
    const lineIndex = Number(word.lineIndex) || 0;
    const bucket = groups.get(lineIndex) ?? [];
    bucket.push(word);
    groups.set(lineIndex, bucket);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([lineIndex, lineWords]) => ({
      lineIndex,
      words: lineWords.sort((a, b) => a.start - b.start),
    }));
}

export function getActiveReadingLineIndex(
  timeSec: number,
  lineGroups: ReadingLineGroup[]
): number {
  if (!lineGroups.length || !Number.isFinite(timeSec)) return -1;
  const t = Math.max(0, timeSec);

  for (let i = 0; i < lineGroups.length; i += 1) {
    const lineWords = lineGroups[i]?.words ?? [];
    if (!lineWords.length) continue;
    const start = lineWords[0].start;
    const rawEnd = lineWords[lineWords.length - 1].end;
    const nextStart = lineGroups[i + 1]?.words?.[0]?.start;
    const end = clampTimingEnd(start, rawEnd, CMS_READING_MIN_LINE_SEC, nextStart);
    if (t + CMS_READING_TIME_EPSILON_SEC >= start && t <= end + CMS_READING_TIME_EPSILON_SEC) {
      return i;
    }
  }

  return -1;
}

/**
 * Line index for the cutted karaoke UI.
 * - During a line window → that line
 * - Between lines → -1 (erase)
 * - After the last line / audio finished → hold the last line (never dump full text)
 */
export function resolveCmsContentDisplayLineIndex(
  timeSec: number,
  lineGroups: ReadingLineGroup[],
  options?: { holdLastAfterEnd?: boolean; audioFinished?: boolean }
): number {
  if (!lineGroups.length || !Number.isFinite(timeSec)) return -1;

  const active = getActiveReadingLineIndex(timeSec, lineGroups);
  if (active >= 0) return active;

  const holdLast = options?.holdLastAfterEnd !== false;
  if (!holdLast) return -1;

  const lastGroup = lineGroups[lineGroups.length - 1];
  const lastWords = lastGroup?.words ?? [];
  if (!lastWords.length) return -1;
  const lastStart = lastWords[0]?.start;
  const lastEndRaw = lastWords[lastWords.length - 1]?.end;
  if (!Number.isFinite(lastStart) || !Number.isFinite(lastEndRaw)) return -1;
  const lastEnd = clampTimingEnd(lastStart, lastEndRaw, CMS_READING_MIN_LINE_SEC);

  if (options?.audioFinished || timeSec > lastEnd + CMS_READING_TIME_EPSILON_SEC) {
    return lineGroups.length - 1;
  }

  return -1;
}

/**
 * Sticky word highlight: latest word whose start has been reached / still in padded window.
 * Short words between progress ticks still highlight instead of being skipped.
 */
export function getActiveReadingWordIndexInLine(
  timeSec: number,
  lineWords: NormalizedReadingWord[]
): number {
  if (!lineWords.length || !Number.isFinite(timeSec)) return -1;
  const t = Math.max(0, timeSec);
  const firstStart = lineWords[0].start;
  if (t + CMS_READING_TIME_EPSILON_SEC < firstStart) return -1;

  let best = 0;
  for (let i = 0; i < lineWords.length; i += 1) {
    const start = lineWords[i].start;
    const rawEnd = lineWords[i].end;
    const nextStart = lineWords[i + 1]?.start;
    const end = clampTimingEnd(start, rawEnd, CMS_READING_MIN_WORD_SEC, nextStart);

    if (t + CMS_READING_TIME_EPSILON_SEC >= start) {
      best = i;
    }
    if (t <= end + CMS_READING_TIME_EPSILON_SEC && t + CMS_READING_TIME_EPSILON_SEC >= start) {
      return i;
    }
    if (typeof nextStart === 'number' && t < nextStart) {
      return best;
    }
  }

  return best;
}

function clampTimingEnd(
  start: number,
  end: number,
  minDurationSec: number,
  nextBoundary?: number
): number {
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeEnd = Number.isFinite(end) ? end : safeStart;
  let effective = Math.max(safeEnd, safeStart + minDurationSec);
  if (typeof nextBoundary === 'number' && Number.isFinite(nextBoundary) && nextBoundary > safeStart) {
    effective = Math.min(effective, Math.max(safeStart, nextBoundary - CMS_READING_TIME_EPSILON_SEC));
  }
  return Math.max(effective, safeStart);
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
    const row = item as { w?: string; start?: unknown; end?: unknown; lineIndex?: unknown };
    const w = String(row?.w ?? '').trim();
    let start = Number(row?.start);
    let end = Number(row?.end);
    const lineIndex = Number.isFinite(Number(row?.lineIndex)) ? Number(row.lineIndex) : undefined;
    if (!w || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    // Zero-length / inverted short timings still need a visible window on mobile.
    if (end <= start) {
      end = start + CMS_READING_MIN_WORD_SEC;
    }
    parsed.push({ w, start, end, lineIndex });
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
  return getActiveReadingWordIndexInLine(timeSec, words);
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
