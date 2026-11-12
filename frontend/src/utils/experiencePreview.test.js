/**
 * What the preview of an experience shows, worked out from the form.
 */
import { describe, expect, it } from 'vitest';
import { emptyForm, emptyVideo } from './experienceForm';
import { BAND_COLORS, PREVIEW_COPY, previewFromForm } from './experiencePreview';

const LINK = (n) => `https://iframe.mediadelivery.net/embed/1/v${n}`;
const video = (n, overrides = {}) => ({ ...emptyVideo(), title: `Video ${n} name`, embedUrl: LINK(n), ...overrides });
const form = (overrides = {}) => ({ ...emptyForm(), title: 'Smoothie', ...overrides });

describe('the colours are the phone app’s', () => {
  it('has the same values as the app (app/components/child/experience/experience-view.tsx and the theme)', () => {
    expect(BAND_COLORS).toEqual({
      cream: '#f1ebd4',
      pale: '#d1e2df',
      peach: '#fae6da',
      ink: '#3e7f76',
      orange: '#e98a68',
      accent: '#f2af10',
      primary: '#85c2b9',
    });
  });

  it('has the same wording as the app around the admin’s own content, and no footer line', () => {
    expect(PREVIEW_COPY.taglineLine1).toBe('Your child will be bilingual, naturally.');
    expect(PREVIEW_COPY.taglineLine2).toBe('How? By living the English language.');
    expect(PREVIEW_COPY.closingTitle).toBe('You are learning, one step at a time.');
    expect(PREVIEW_COPY.closingStars).toBe('Reach for the stars');
    expect(PREVIEW_COPY.homeButton).toBe('Back to home');
    expect(Object.keys(PREVIEW_COPY).some((key) => /footer|copyright/i.test(key))).toBe(false);
    expect(Object.values(PREVIEW_COPY).some((text) => /©|copyright/i.test(text))).toBe(false);
  });
});

describe('the title and the description', () => {
  it('shows the title as typed, without the spaces around it', () => {
    expect(previewFromForm(form({ title: '  Strawberry  ' }))).toMatchObject({ title: 'Strawberry', hasTitle: true });
  });

  it('an empty title shows a stand-in, marked as not a real title', () => {
    expect(previewFromForm(form({ title: '   ' }))).toMatchObject({ title: 'Untitled experience', hasTitle: false });
  });

  it('carries the description, trimmed; empty when there is none', () => {
    expect(previewFromForm(form({ description: '  Make one  ' })).description).toBe('Make one');
    expect(previewFromForm(form({ description: '   ' })).description).toBe('');
  });

  it('says whether it is published', () => {
    expect(previewFromForm(form({ isPublished: true })).published).toBe(true);
    expect(previewFromForm(form({ isPublished: false })).published).toBe(false);
  });
});

describe('the videos', () => {
  it('has none when there are none', () => {
    expect(previewFromForm(form()).videos).toEqual([]);
  });

  it('keeps the order, uses the title as the label, and plays a good link', () => {
    const [a, b] = [video(1), video(2)];
    const { videos } = previewFromForm(form({ videos: [a, b] }));
    expect(videos.map((item) => [item.key, item.title, item.url, item.playable])).toEqual([
      [a.key, 'Video 1 name', LINK(1), true],
      [b.key, 'Video 2 name', LINK(2), true],
    ]);
  });

  it('a video with no title is called by its number', () => {
    const { videos } = previewFromForm(form({ videos: [video(1), video(2, { title: '   ' })] }));
    expect(videos[1].title).toBe('Video 2');
  });

  it('a player link plays as the embed link', () => {
    const { videos } = previewFromForm(form({ videos: [video(1, { embedUrl: 'https://player.mediadelivery.net/embed/1/v1' })] }));
    expect(videos[0]).toMatchObject({ url: LINK(1), playable: true });
  });

  it('a missing or wrong link is shown but cannot be played', () => {
    const { videos } = previewFromForm(form({ videos: [video(1, { embedUrl: '' }), video(2, { embedUrl: 'https://example.com/x' })] }));
    expect(videos.map((item) => [item.url, item.playable])).toEqual([['', false], ['', false]]);
  });

  it('the bands take turns, starting with the pale one (the title band above is cream)', () => {
    const { videos } = previewFromForm(form({ videos: [video(1), video(2), video(3), video(4)] }));
    expect(videos.map((item) => item.band)).toEqual([BAND_COLORS.pale, BAND_COLORS.cream, BAND_COLORS.pale, BAND_COLORS.cream]);
  });
});

describe('the printable', () => {
  const withPrintable = (printable, videos = [video(1), video(2)], extra = {}) => form({ videos, printable: { link: '', button: '', ...printable }, ...extra });

  it('is not on the page when there is nothing to print and no picture', () => {
    expect(previewFromForm(withPrintable({})).printable).toBeNull();
    expect(previewFromForm(withPrintable({ button: 'Print recipe here' })).printable).toBeNull(); // a button alone prints nothing
  });

  it('is on the page when there is a link, with the button text', () => {
    expect(previewFromForm(withPrintable({ link: 'https://riseup.kids/a.pdf', button: 'Print recipe here' })).printable).toMatchObject({
      imageSrc: null,
      button: 'Print recipe here',
    });
  });

  it('is on the page when there is only a picture', () => {
    expect(previewFromForm(withPrintable({}), { printableImageSrc: 'blob:x' }).printable).toMatchObject({ imageSrc: 'blob:x' });
  });

  it('an empty button text shows "Print here", as the app does', () => {
    expect(previewFromForm(withPrintable({ link: 'https://riseup.kids/a.pdf', button: '   ' })).printable.button).toBe('Print here');
  });

  it('a link of only spaces is not a link', () => {
    expect(previewFromForm(withPrintable({ link: '   ' })).printable).toBeNull();
  });

  it('its band carries on the turns after the last video (two videos: pale, cream, pale; one video: pale, cream)', () => {
    expect(previewFromForm(withPrintable({ link: 'https://riseup.kids/a.pdf' }, [video(1), video(2)])).printable.band).toBe(BAND_COLORS.pale);
    expect(previewFromForm(withPrintable({ link: 'https://riseup.kids/a.pdf' }, [video(1)])).printable.band).toBe(BAND_COLORS.cream);
    expect(previewFromForm(withPrintable({ link: 'https://riseup.kids/a.pdf' }, [])).printable.band).toBe(BAND_COLORS.pale);
  });
});
