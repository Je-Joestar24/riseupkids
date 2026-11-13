import { looksLikeBunnyPlaybackEmbedUrl } from './bunnyExploreEmbed';
import { getCoverImageUrl } from './coverImageUrl';

/** "1 video", "3 videos", "No videos yet". */
export function videoCountLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n)) return 'No videos yet';
  const whole = Math.floor(n);
  if (whole <= 0) return 'No videos yet';
  return whole === 1 ? '1 video' : `${whole} videos`;
}

/** Where the list of experiences lives for one child. */
export const experienceListPath = (childId) => `/child/${childId}/explore/experience`;

/** Where one experience lives for one child. */
export const experienceDetailPath = (childId, uuid) => `/child/${childId}/explore/experience/${uuid}`;

/** Where the Explore page lives for one child. */
export const explorePath = (childId) => `/child/${childId}/explore`;

/** The child's home page. */
export const homePath = (childId) => `/child/${childId}/home`;

/**
 * The colours of the page, taken from the phone app's Experience page (and the same as the admin preview): the
 * title band is cream, the video bands take turns between pale and cream, the closing band is peach.
 */
export const EXPERIENCE_COLORS = Object.freeze({
  cream: '#f1ebd4',
  pale: '#d1e2df',
  peach: '#fae6da',
  ink: '#3e7f76',
  orange: '#e98a68',
  accent: '#f2af10',
  primary: '#85c2b9',
});

/** The wording of the page around the admin's own content (the same as the phone app). */
export const EXPERIENCE_COPY = Object.freeze({
  taglineLine1: 'Your child will be bilingual, naturally.',
  taglineLine2: 'How? By living the English language.',
  closingTitle: 'You are learning, one step at a time.',
  closingStars: 'Reach for the stars',
  homeButton: 'Back to home',
  backToList: 'Back to Experiences',
  defaultPrintButton: 'Print here',
  notFoundTitle: 'This experience is not available',
  notFoundText: 'It may have been taken down. Have a look at the other experiences.',
});

/** What the page shows when the server says the experience does not exist (or is no longer published). */
export const EXPERIENCE_NOT_FOUND_MESSAGE = 'This experience is not available any more.';
export const EXPERIENCE_DETAIL_FAILED_MESSAGE = 'We could not load this experience. Please try again.';

/** Only an https address is ever opened from the printable button. */
const isHttpsUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    return new URL(value.trim()).protocol === 'https:';
  } catch {
    return false;
  }
};

/** The embed address with autoplay on, for a video the child has just tapped (the player starts at once). */
export function withAutoplay(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', 'true');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * What the printable's button opens, or null when there is nothing to open (a picture alone has no button).
 * The server says `kind` ('file' or 'link') and `url`; the address is checked once more here.
 */
export function printableAction(printable) {
  if (!printable || !printable.kind || !isHttpsUrl(printable.url)) return null;
  return {
    url: printable.url.trim(),
    kind: printable.kind,
    fileName: printable.fileName || '',
    label: (printable.button || '').trim() || EXPERIENCE_COPY.defaultPrintButton,
  };
}

/**
 * The detail of an experience as the page draws it: the bands in the order they alternate, every video with a
 * title (the server's, or "Video N"), the printable only when there is a picture or something to open.
 *
 * @param {{ title?: string, description?: string, videos?: Array<{ id?: string, title?: string, embedUrl?: string }>, printable?: object|null }} detail
 */
export function toExperienceView(detail) {
  const data = detail || {};
  const bands = [EXPERIENCE_COLORS.pale, EXPERIENCE_COLORS.cream];
  const videos = (Array.isArray(data.videos) ? data.videos : []).map((video, index) => ({
    key: video.id || `video-${index}`,
    title: (video.title || '').trim() || `Video ${index + 1}`,
    url: typeof video.embedUrl === 'string' ? video.embedUrl.trim() : '',
    playable: looksLikeBunnyPlaybackEmbedUrl(video.embedUrl),
    band: bands[index % 2],
  }));

  const action = printableAction(data.printable);
  const imageUrl = data.printable ? getCoverImageUrl(data.printable.image) : null;

  return {
    title: (data.title || '').trim(),
    description: (data.description || '').trim(),
    videos,
    printable: action || imageUrl ? { imageUrl, action, band: bands[videos.length % 2] } : null,
  };
}
