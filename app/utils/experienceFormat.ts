import type { ExperienceDetailData } from '@/services/experienceService';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

/** "1 video", "3 videos", "No videos yet". */
export function videoCountLabel(count: unknown): string {
  const n = Number(count);
  if (!Number.isFinite(n)) return 'No videos yet';
  const whole = Math.floor(n);
  if (whole <= 0) return 'No videos yet';
  return whole === 1 ? '1 video' : `${whole} videos`;
}

/** Where the list of experiences lives for one child (a sibling of explore, like replays and explore-content). */
export const experienceListRoute = (childId: string): string => `/child/${childId}/explore-experience`;

/**
 * Where one experience lives for one child. A sibling of explore like the list, named explore-experience-detail
 * so the footer keeps "Explore" lit (the path contains /explore and no /experience).
 */
export const experienceDetailRoute = (childId: string, uuid: string): string =>
  `/child/${childId}/explore-experience-detail?uuid=${encodeURIComponent(uuid)}`;

/** Where the Explore screen lives for one child. */
export const exploreRoute = (childId: string): string => `/child/${childId}/explore`;

/** The child's home screen. */
export const homeRoute = (childId: string): string => `/child/${childId}/home`;

/** The wording of the page around the admin's own content (the client's Experience template). */
export const EXPERIENCE_DETAIL_COPY = {
  taglineLine1: 'Your child will be bilingual, naturally.',
  taglineLine2: 'How? By living the English language.',
  closingTitle: 'You are learning, one step at a time.',
  closingStars: 'Reach for the stars',
  homeButton: 'Back to home',
  backToList: 'Back to Experiences',
  defaultPrintButton: 'Print here',
  notFoundTitle: 'This experience is not available',
  notFoundText: 'It may have been taken down. Have a look at the other experiences.',
  seeAll: 'See all experiences',
} as const;

/** Hosts a printable LINK may point at: our own domain only (store rules: no links to outside websites). */
const OWN_DOMAIN_HOSTS = ['riseup.kids', 'www.riseup.kids', 'app.riseup.kids'];

function parseHttps(value: unknown): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export interface PrintableAction {
  url: string;
  kind: 'file' | 'link';
  fileName: string;
  label: string;
}

/**
 * What the printable's button opens, or null when there is nothing to open (a picture alone has no button).
 * An uploaded file is served by our own server, so any https address it has is opened; a link must be an
 * https address on our own domain (the server checks this too; the app checks once more, because the store
 * rules are about what the app opens).
 */
export function printableAction(printable: ExperienceDetailData['printable'] | null | undefined): PrintableAction | null {
  if (!printable || (printable.kind !== 'file' && printable.kind !== 'link')) return null;
  const url = parseHttps(printable.url);
  if (!url) return null;
  if (printable.kind === 'link' && !OWN_DOMAIN_HOSTS.includes(url.hostname.toLowerCase())) return null;
  return {
    url: url.toString(),
    kind: printable.kind,
    fileName: printable.fileName || '',
    label: (printable.button || '').trim() || EXPERIENCE_DETAIL_COPY.defaultPrintButton,
  };
}

export interface ExperienceVideoView {
  key: string;
  title: string;
  url: string;
  playable: boolean;
  /** Bands take turns: pale first, then cream. */
  band: 'pale' | 'cream';
}

export interface ExperienceView {
  title: string;
  description: string;
  videos: ExperienceVideoView[];
  printable: { imageUrl: string | null; action: PrintableAction | null; band: 'pale' | 'cream' } | null;
}

/**
 * One experience as its page draws it: the video bands in order with a title each (the server's, or "Video N"),
 * and the printable only when there is a picture or something safe to open.
 *
 * @param resolveImage turns the server's picture path into an address (the app's usual cover resolver)
 */
export function toExperienceView(
  detail: Partial<ExperienceDetailData> | null | undefined,
  resolveImage: (path: string | null | undefined) => string | null
): ExperienceView {
  const data = detail ?? {};
  const bands = ['pale', 'cream'] as const;
  const videos = (Array.isArray(data.videos) ? data.videos : []).map((video, index) => ({
    key: video.id || `video-${index}`,
    title: (video.title || '').trim() || `Video ${index + 1}`,
    url: typeof video.embedUrl === 'string' ? video.embedUrl.trim() : '',
    playable: looksLikeBunnyExploreEmbedUrl(video.embedUrl),
    band: bands[index % 2],
  }));

  const action = printableAction(data.printable);
  const imageUrl = data.printable ? resolveImage(data.printable.image) : null;

  return {
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    videos,
    printable: action || imageUrl ? { imageUrl, action, band: bands[videos.length % 2] } : null,
  };
}
