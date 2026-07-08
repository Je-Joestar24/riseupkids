import { api } from '@/services/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PlayerMedia {
  id: string;
  type: string | null;
  url: string | null;
  mimeType: string | null;
}

export interface PlayerInteractionOption {
  optionId: string;
  label: string;
  imageMediaId?: string | null;
  audioMediaId?: string | null;
  imageMedia?: PlayerMedia | null;
  audioMedia?: PlayerMedia | null;
}

export interface PlayerInteractionDropZone {
  zoneId: string;
  label: string;
  correctOptionId: string;
}

export interface PlayerInteractionConfig {
  kind: 'drag_2x2' | 'drag_2x1' | null;
  allowRetry?: boolean;
  options?: PlayerInteractionOption[];
  dropZones?: PlayerInteractionDropZone[];
}

export interface PlayerReadingWord {
  w: string;
  start: number;
  end: number;
}

export interface PlayerReading {
  text: string | null;
  durationSec: number | null;
  /** Optional px size for content-page reading text. */
  fontSizePx?: number | null;
  words: PlayerReadingWord[];
}

export interface PlayerPageMedia {
  imageMediaId?: string | null;
  audioMediaId?: string | null;
  videoMediaId?: string | null;
  instructionAudioMediaId?: string | null;
  backgroundImageMediaId?: string | null;
  guideImageMediaId?: string | null;
  guideImageMediaIds?: string[];
  imageMedia?: PlayerMedia | null;
  audioMedia?: PlayerMedia | null;
  videoMedia?: PlayerMedia | null;
  instructionAudioMedia?: PlayerMedia | null;
  backgroundImageMedia?: PlayerMedia | null;
  guideImageMedia?: PlayerMedia | null;
  guideImageMedias?: PlayerMedia[];
}

export interface CmsPlayablePage {
  pageId: string;
  order: number;
  type:
    | 'cover'
    | 'demo'
    | 'activity_demo_video'
    | 'content'
    | 'activity_drag_2x2'
    | 'activity_drag_2x1'
    | 'reward'
    | 'end';
  title: string | null;
  subtitle: string | null;
  media: PlayerPageMedia;
  reading: PlayerReading | null;
  interaction: PlayerInteractionConfig | null;
  navigation: {
    allowBack: boolean;
    allowNext: boolean;
    requireCompletionToNext: boolean;
  };
  scoring: {
    enabled: boolean;
    points: number;
    awardMode: 'once_on_correct';
  };
  /** Set on cover pages after API normalization (optional intro BGM). */
  introBackgroundMusicUrl?: string | null;
  /** Set on reward pages after API normalization (optional celebration audio). */
  rewardAudioUrl?: string | null;
}

export interface CmsPlayableBookSummary {
  id: string;
  title: string;
  description: string | null;
  language: string;
  version: number;
  coverImageMediaId: string | null;
  /** Optional intro/cover background music (from cover page `media.audioMediaId`). */
  introBackgroundMusicMediaId?: string | null;
  totalPages: number;
  updatedAt: string;
}

export interface CmsPlayableBookDetailMeta {
  introBackgroundMusicMediaId?: string | null;
  introBackgroundMusicUrl?: string | null;
}

export interface CmsPlayableBooksResult {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  items: CmsPlayableBookSummary[];
}

export interface CmsPlayableBookDetail extends CmsPlayableBookDetailMeta {
  id: string;
  title: string;
  description: string | null;
  language: string;
  version: number;
  updatedAt?: string | null;
  contentVersion?: string | null;
  mediaManifest?: {
    bookId: string;
    contentVersion: string;
    assets: Array<{
      key: string;
      mediaId: string | null;
      url: string;
      updatedAt: string | null;
      kind: string | null;
    }>;
  } | null;
  pages: CmsPlayablePage[];
}

const toSafeUrl = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** First cover page in book order (intro screen). */
export function getCoverPage(pages: CmsPlayablePage[] | undefined): CmsPlayablePage | null {
  if (!Array.isArray(pages) || !pages.length) return null;
  return (
    pages.find((page) => page.type === 'cover' && page.order === 1) ||
    pages.find((page) => page.type === 'cover') ||
    null
  );
}

/** Resolved URL for optional intro background music (cover `media.audioMedia`). */
export function resolveIntroBackgroundMusicUrl(
  source: CmsPlayableBookDetail | CmsPlayablePage | null | undefined
): string {
  if (!source) return '';

  const bookLevel = 'pages' in source ? source : null;
  if (bookLevel) {
    const fromBook = toSafeUrl(bookLevel.introBackgroundMusicUrl);
    if (fromBook) return fromBook;
    const cover = getCoverPage(bookLevel.pages);
    if (cover) return resolveIntroBackgroundMusicUrl(cover);
    return '';
  }

  const page = source as CmsPlayablePage;
  if (page.type !== 'cover') return '';
  const media = page.media || {};
  return (
    toSafeUrl((page as CmsPlayablePage & { introBackgroundMusicUrl?: string }).introBackgroundMusicUrl) ||
    toSafeUrl(media.audioMedia?.url) ||
    toSafeUrl((media as PlayerPageMedia & { audioUrl?: string }).audioUrl) ||
    ''
  );
}

/** Resolved URL for optional reward celebration audio (reward `media.audioMedia`). */
export function resolveRewardAudioUrl(
  source: CmsPlayablePage | null | undefined
): string {
  if (!source) return '';
  if (source.type !== 'reward' && source.type !== 'end') return '';

  const media = source.media || {};
  return (
    toSafeUrl((source as CmsPlayablePage & { rewardAudioUrl?: string }).rewardAudioUrl) ||
    toSafeUrl(media.audioMedia?.url) ||
    toSafeUrl((media as PlayerPageMedia & { audioUrl?: string }).audioUrl) ||
    ''
  );
}

export function normalizePlayableBookDetail(
  book: CmsPlayableBookDetail | null | undefined
): CmsPlayableBookDetail | null {
  if (!book) return null;

  const cover = getCoverPage(book.pages);
  const introBackgroundMusicUrl = resolveIntroBackgroundMusicUrl(book);
  const introBackgroundMusicMediaId =
    book.introBackgroundMusicMediaId ??
    cover?.media?.audioMediaId ??
    cover?.media?.audioMedia?.id ??
    null;

  const pages = (book.pages || []).map((page) => {
    if (page.type === 'cover') {
      const url = resolveIntroBackgroundMusicUrl(page);
      if (!url) return page;
      return {
        ...page,
        introBackgroundMusicUrl: url,
      } as CmsPlayablePage & { introBackgroundMusicUrl?: string };
    }
    if (page.type === 'reward' || page.type === 'end') {
      const url = resolveRewardAudioUrl(page);
      if (!url) return page;
      return {
        ...page,
        rewardAudioUrl: url,
      } as CmsPlayablePage & { rewardAudioUrl?: string };
    }
    return page;
  });

  return {
    ...book,
    pages,
    introBackgroundMusicMediaId,
    introBackgroundMusicUrl: introBackgroundMusicUrl || null,
    updatedAt: book.updatedAt ?? null,
    contentVersion: book.contentVersion ?? null,
    mediaManifest: book.mediaManifest ?? null,
  };
}

export function normalizePlayableBookSummary(
  item: CmsPlayableBookSummary
): CmsPlayableBookSummary {
  return {
    ...item,
    introBackgroundMusicMediaId: item.introBackgroundMusicMediaId ?? null,
  };
}

/** Remote URLs to preload for a playable book (includes optional intro BGM). */
export function collectPlayableBookMediaUrls(
  book: CmsPlayableBookDetail | null | undefined
): string[] {
  if (!book?.pages?.length) return [];

  const urls = new Set<string>();
  book.pages.forEach((page) => {
    const media = page.media || {};
    [
      media.imageMedia?.url,
      media.audioMedia?.url,
      media.videoMedia?.url,
      media.instructionAudioMedia?.url,
      media.backgroundImageMedia?.url,
      media.guideImageMedia?.url,
      ...(media.guideImageMedias || []).map((item) => item?.url),
      ...(page.interaction?.options || []).flatMap((option) => [
        option.imageMedia?.url,
        option.audioMedia?.url,
      ]),
    ].forEach((url) => {
      const safe = toSafeUrl(url);
      if (safe) urls.add(safe);
    });
  });

  const introBgm = resolveIntroBackgroundMusicUrl(book);
  if (introBgm) urls.add(introBgm);

  book.pages.forEach((page) => {
    const rewardAudio = resolveRewardAudioUrl(page);
    if (rewardAudio) urls.add(rewardAudio);
  });

  return [...urls];
}

export interface BuiltInBookCompletionPayload {
  score: number;
  maxScore: number;
  status: 'not_started' | 'in_progress' | 'completed' | string;
  timeSpent: number;
  progress: number;
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCompletionPayload(
  payload: BuiltInBookCompletionPayload
): BuiltInBookCompletionPayload {
  return {
    ...payload,
    score: Math.max(0, Number(payload.score) || 0),
    maxScore: Math.max(0, Number(payload.maxScore) || 0),
    timeSpent: Math.max(0, Number(payload.timeSpent) || 0),
    progress: clampRange(Number(payload.progress) || 0, 0, 100),
  };
}

async function listPlayableBooksNormalized(
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    language?: string;
  }
): Promise<ApiResponse<CmsPlayableBooksResult>> {
  const response = await api.get<ApiResponse<CmsPlayableBooksResult>>('/parent/cms-books/playable', {
    params,
  });
  if (!response?.success || !response.data?.items) return response;

  return {
    ...response,
    data: {
      ...response.data,
      items: response.data.items.map(normalizePlayableBookSummary),
    },
  };
}

async function getPlayableBookNormalized(
  bookId: string
): Promise<ApiResponse<CmsPlayableBookDetail>> {
  const response = await api.get<ApiResponse<CmsPlayableBookDetail>>(
    `/parent/cms-books/${bookId}/play`
  );
  if (!response?.success || !response.data) return response;

  return {
    ...response,
    data: normalizePlayableBookDetail(response.data) as CmsPlayableBookDetail,
  };
}

export const cmsBooksPlayerService = {
  listPlayableBooks: listPlayableBooksNormalized,

  getPlayableBook: getPlayableBookNormalized,

  submitBuiltInBookCompletion: (
    courseId: string,
    childId: string,
    bookId: string,
    payload: BuiltInBookCompletionPayload
  ): Promise<ApiResponse<unknown>> =>
    api.post<ApiResponse<unknown>>(
      `/course-progress/${courseId}/child/${childId}/book/${bookId}/complete`,
      normalizeCompletionPayload(payload)
    ),
};
