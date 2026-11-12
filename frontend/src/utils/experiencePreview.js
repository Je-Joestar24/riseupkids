import { normalizeBunnyLink } from './experienceForm';

/**
 * What the preview of an experience shows, worked out from the form (so it works on what has been typed, before
 * anything is saved). The page it draws is the phone app's Experience page (app/components/child/experience/
 * experience-view.tsx): a title band, one band per video, the printable, and a closing message with a button back
 * to home. The phone app shows no footer or copyright line, so neither does the preview.
 */

/** The wording the app's page has around the admin's own content. */
export const PREVIEW_COPY = Object.freeze({
  taglineLine1: 'Your child will be bilingual, naturally.',
  taglineLine2: 'How? By living the English language.',
  untitled: 'Untitled experience',
  noVideos: 'No videos yet',
  noVideosHint: 'Add at least one video to see it here.',
  printablePlaceholder: 'Printable',
  printablePlaceholderHint: 'Picture goes here',
  closingTitle: 'You are learning, one step at a time.',
  closingStars: 'Reach for the stars',
  homeButton: 'Back to home',
  defaultPrintButton: 'Print here',
});

/** The colours of the app's page, in the order its bands alternate. */
export const BAND_COLORS = Object.freeze({
  cream: '#f1ebd4',
  pale: '#d1e2df',
  peach: '#fae6da',
  ink: '#3e7f76',
  orange: '#e98a68',
  accent: '#f2af10',
  primary: '#85c2b9',
});

/**
 * @typedef {{ key: string, title: string, url: string, playable: boolean, band: string }} PreviewVideo
 * @typedef {{ title: string, hasTitle: boolean, description: string, videos: PreviewVideo[], printable: PreviewPrintable|null, published: boolean }} Preview
 * @typedef {{ imageSrc: string|null, button: string, band: string }} PreviewPrintable
 */

/**
 * @param {ReturnType<typeof import('./experienceForm').emptyForm>} form
 * @param {{ printableImageSrc?: string|null }} [options] `printableImageSrc`: the picture to show for the printable
 *   (a chosen file's preview address, or the saved picture's address)
 * @returns {Preview}
 */
export const previewFromForm = (form, { printableImageSrc = null } = {}) => {
  const title = form.title.trim();
  const description = form.description.trim();

  // The title band is cream and the first video band is pale; after that the bands take turns.
  const bands = [BAND_COLORS.pale, BAND_COLORS.cream];
  const videos = form.videos.map((video, index) => {
    const { url } = normalizeBunnyLink(video.embedUrl);
    return {
      key: video.key,
      title: video.title.trim() || `Video ${index + 1}`,
      url,
      playable: Boolean(url),
      band: bands[index % 2],
    };
  });

  // The printable is there when there is something to print or to show; otherwise the page has no such section.
  const link = form.printable.link.trim();
  const hasPrintable = Boolean(link) || Boolean(printableImageSrc);
  const printable = hasPrintable
    ? {
        imageSrc: printableImageSrc,
        button: form.printable.button.trim() || PREVIEW_COPY.defaultPrintButton,
        band: bands[videos.length % 2],
      }
    : null;

  return { title: title || PREVIEW_COPY.untitled, hasTitle: Boolean(title), description, videos, printable, published: form.isPublished };
};
