/**
 * The rules and the shape of the Experience form: what is valid (checked against the literal numbers the server
 * uses, not the constants, so a changed limit is noticed), what is sent, and how the server's answers are placed.
 */
import { describe, expect, it } from 'vitest';
import {
  BUNNY_LINK_HINT,
  IMAGE_ACCEPT,
  LIMITS,
  NO_ERRORS,
  buildFormData,
  checkImageFile,
  countErrors,
  emptyForm,
  emptyVideo,
  errorFieldIds,
  findPublishProblems,
  formFromExperience,
  hasErrors,
  isFormDirty,
  mergeErrors,
  nextVideoKey,
  normalizeBunnyLink,
  pictureIsShown,
  placeServerErrors,
  validateForm,
} from './experienceForm';

const LINK = 'https://iframe.mediadelivery.net/embed/123/abc-1';
const LINK_2 = 'https://iframe.mediadelivery.net/embed/123/abc-2';

const video = (overrides = {}) => ({ ...emptyVideo(), title: 'A video', embedUrl: LINK, ...overrides });
const valid = (overrides = {}) => ({ ...emptyForm(), title: 'Smoothie', videos: [video()], ...overrides });
const file = (type = 'image/png', size = 1000, name = 'a.png') => ({ type, size, name });

describe('the limits are the server limits', () => {
  it('has the same numbers as the server', () => {
    expect(LIMITS.TITLE_MAX).toBe(200);
    expect(LIMITS.DESCRIPTION_MAX).toBe(1000);
    expect(LIMITS.VIDEO_TITLE_MAX).toBe(200);
    expect(LIMITS.MAX_VIDEOS).toBe(20);
    expect(LIMITS.PRINTABLE_BUTTON_MAX).toBe(60);
    expect(LIMITS.URL_MAX).toBe(2048);
    expect(LIMITS.MAX_IMAGE_BYTES).toBe(8388608);
  });

  it('offers only the picture types the server accepts', () => {
    expect(IMAGE_ACCEPT).toBe('image/jpeg,image/png,image/webp');
  });
});

describe('a new form', () => {
  it('is empty, a draft, with no pictures', () => {
    expect(emptyForm()).toEqual({
      title: '',
      description: '',
      isPublished: false,
      videos: [],
      printable: { link: '', button: '' },
      cover: { url: null, file: null, remove: false },
      printableImage: { url: null, file: null, remove: false },
    });
  });

  it('every new video row gets a key of its own', () => {
    const keys = new Set([nextVideoKey(), nextVideoKey(), emptyVideo().key, emptyVideo().key]);
    expect(keys.size).toBe(4);
    expect(emptyVideo()).toMatchObject({ id: null, title: '', embedUrl: '' });
  });

  it('every form starts with its own lists (one form never changes another)', () => {
    const a = emptyForm();
    const b = emptyForm();
    a.videos.push(video());
    a.printable.link = 'x';
    expect(b.videos).toHaveLength(0);
    expect(b.printable.link).toBe('');
  });
});

describe('the form of a saved experience', () => {
  const experience = {
    uuid: 'u',
    title: 'Smoothie',
    description: 'Make one',
    isPublished: true,
    coverImage: 'https://cdn/cover.png',
    videos: [
      { id: 'a'.repeat(24), title: 'One', embedUrl: LINK, position: 1 },
      { id: 'b'.repeat(24), title: 'Two', embedUrl: LINK_2, position: 2 },
    ],
    printable: { image: 'https://cdn/p.png', link: 'https://riseup.kids/x.pdf', button: 'Print recipe here' },
  };

  it('carries every field, with each video keeping its id as its key', () => {
    const form = formFromExperience(experience);
    expect(form.title).toBe('Smoothie');
    expect(form.description).toBe('Make one');
    expect(form.isPublished).toBe(true);
    expect(form.videos).toEqual([
      { key: 'a'.repeat(24), id: 'a'.repeat(24), title: 'One', embedUrl: LINK },
      { key: 'b'.repeat(24), id: 'b'.repeat(24), title: 'Two', embedUrl: LINK_2 },
    ]);
    expect(form.printable).toEqual({ link: 'https://riseup.kids/x.pdf', button: 'Print recipe here' });
    expect(form.cover).toEqual({ url: 'https://cdn/cover.png', file: null, remove: false });
    expect(form.printableImage).toEqual({ url: 'https://cdn/p.png', file: null, remove: false });
  });

  it('copes with an experience that has no pictures, printable or description', () => {
    const form = formFromExperience({ title: 'T', videos: [] });
    expect(form.cover.url).toBeNull();
    expect(form.printableImage.url).toBeNull();
    expect(form.printable).toEqual({ link: '', button: '' });
    expect(form.description).toBe('');
    expect(formFromExperience(undefined).title).toBe('');
  });

  it('is not changed until the admin changes something', () => {
    expect(isFormDirty(formFromExperience(experience), formFromExperience(experience))).toBe(false);
  });
});

describe('a picture is shown', () => {
  it('when it is saved, when a new file was chosen, and not when it was removed', () => {
    expect(pictureIsShown({ url: 'u', file: null, remove: false })).toBe(true);
    expect(pictureIsShown({ url: null, file: file(), remove: false })).toBe(true);
    expect(pictureIsShown({ url: 'u', file: null, remove: true })).toBe(false);
    expect(pictureIsShown({ url: null, file: null, remove: false })).toBe(false);
  });
});

describe('Bunny links', () => {
  it.each([
    [LINK, LINK],
    [`  ${LINK}  `, LINK],
    ['https://player.mediadelivery.net/embed/123/abc-1', LINK],
    ['https://PLAYER.mediadelivery.net/embed/123/abc-1?autoplay=false', `${LINK}?autoplay=false`],
    [`${LINK}#top`, LINK],
    ['https://user:pw@iframe.mediadelivery.net/embed/123/abc-1', LINK],
  ])('accepts %s and saves %s', (input, expected) => {
    expect(normalizeBunnyLink(input)).toEqual({ url: expected, error: '' });
  });

  it.each([
    ['', 'Video link is required.'],
    ['   ', 'Video link is required.'],
    [undefined, 'Video link is required.'],
    [null, 'Video link is required.'],
    [42, 'Video link is required.'],
  ])('asks for a link when given %j', (input, message) => {
    expect(normalizeBunnyLink(input)).toEqual({ url: '', error: message });
  });

  it.each([
    'not a link',
    'http://iframe.mediadelivery.net/embed/123/abc-1',
    'https://example.com/embed/123/abc-1',
    'https://iframe.mediadelivery.net.evil.com/embed/123/abc-1',
    'https://iframe.mediadelivery.net/watch/123/abc-1',
    'https://iframe.mediadelivery.net/',
    'https://youtube.com/watch?v=1',
    'javascript:alert(1)',
  ])('refuses %s and says what a Bunny link looks like', (input) => {
    const { url, error } = normalizeBunnyLink(input);
    expect(url).toBe('');
    expect(error).toBe(`Use a Bunny embed link like ${BUNNY_LINK_HINT}.`);
  });

  it('refuses a link that is longer than 2048 characters', () => {
    const long = `${LINK}?x=${'a'.repeat(2048)}`;
    expect(normalizeBunnyLink(long)).toEqual({ url: '', error: 'Video link is too long.' });
    const fits = `${LINK}?x=${'a'.repeat(2048 - LINK.length - 3)}`;
    expect(fits).toHaveLength(2048);
    expect(normalizeBunnyLink(fits).error).toBe('');
  });
});

describe('pictures', () => {
  it.each(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(checkImageFile(file(type))).toBe('');
  });

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', 'text/plain', ''])('refuses %j', (type) => {
    expect(checkImageFile(file(type))).toBe('Pictures must be JPG, PNG or WebP.');
  });

  it('accepts exactly 8 MB and refuses one byte more', () => {
    expect(checkImageFile(file('image/png', 8388608))).toBe('');
    expect(checkImageFile(file('image/png', 8388609))).toBe('The picture is too large. The maximum size is 8 MB.');
  });

  it('asks for a picture when there is none', () => {
    expect(checkImageFile(null)).toBe('Choose a picture.');
    expect(checkImageFile(undefined)).toBe('Choose a picture.');
  });
});

describe('validating the form', () => {
  it('a complete form has nothing wrong', () => {
    const errors = validateForm(valid());
    expect(errors).toEqual({ rows: {} });
    expect(hasErrors(errors)).toBe(false);
    expect(countErrors(errors)).toBe(0);
  });

  it('a draft with nothing but a title is fine (videos are only needed to publish)', () => {
    expect(hasErrors(validateForm({ ...emptyForm(), title: 'Draft' }))).toBe(false);
  });

  describe('title', () => {
    it.each(['', '   ', '\n\t'])('is required: %j', (title) => {
      expect(validateForm(valid({ title })).title).toBe('Title is required.');
    });

    it('takes exactly 200 characters and refuses 201 (spaces around do not count)', () => {
      expect(validateForm(valid({ title: 'a'.repeat(200) })).title).toBeUndefined();
      expect(validateForm(valid({ title: `  ${'a'.repeat(200)}  ` })).title).toBeUndefined();
      expect(validateForm(valid({ title: 'a'.repeat(201) })).title).toBe('Title cannot exceed 200 characters.');
    });
  });

  describe('description', () => {
    it('may be empty', () => {
      expect(validateForm(valid({ description: '' })).description).toBeUndefined();
    });

    it('takes exactly 1000 characters and refuses 1001', () => {
      expect(validateForm(valid({ description: 'a'.repeat(1000) })).description).toBeUndefined();
      expect(validateForm(valid({ description: 'a'.repeat(1001) })).description).toBe('Description cannot exceed 1000 characters.');
    });
  });

  describe('videos', () => {
    it('each needs a title', () => {
      const row = video({ title: '   ' });
      expect(validateForm(valid({ videos: [row] })).rows[row.key]).toEqual({ title: 'Video title is required.' });
    });

    it('a title takes exactly 200 characters and refuses 201', () => {
      const ok = video({ title: 'a'.repeat(200) });
      const long = video({ title: 'a'.repeat(201), embedUrl: LINK_2 });
      const errors = validateForm(valid({ videos: [ok, long] }));
      expect(errors.rows[ok.key]).toBeUndefined();
      expect(errors.rows[long.key]).toEqual({ title: 'Video title cannot exceed 200 characters.' });
    });

    it('each needs a Bunny link, and says what is wrong with it', () => {
      const none = video({ embedUrl: '' });
      const wrong = video({ embedUrl: 'https://example.com/x', title: 'Other' });
      const errors = validateForm(valid({ videos: [none, wrong] }));
      expect(errors.rows[none.key]).toEqual({ embedUrl: 'Video link is required.' });
      expect(errors.rows[wrong.key].embedUrl).toBe(`Use a Bunny embed link like ${BUNNY_LINK_HINT}.`);
    });

    it('a title and a link can both be wrong in one row', () => {
      const row = video({ title: '', embedUrl: '' });
      expect(validateForm(valid({ videos: [row] })).rows[row.key]).toEqual({
        title: 'Video title is required.',
        embedUrl: 'Video link is required.',
      });
    });

    it('the same video twice is refused on the second one, naming the first (a player link is the same video)', () => {
      const first = video({ title: 'One' });
      const second = video({ title: 'Two', embedUrl: 'https://player.mediadelivery.net/embed/123/abc-1' });
      const errors = validateForm(valid({ videos: [first, second] }));
      expect(errors.rows[first.key]).toBeUndefined();
      expect(errors.rows[second.key]).toEqual({ embedUrl: 'This video is already in the list (video 1).' });
    });

    it('allows exactly 20 videos and refuses 21', () => {
      const make = (count) => Array.from({ length: count }, (_, i) => video({ title: `V${i}`, embedUrl: `https://iframe.mediadelivery.net/embed/1/v${i}` }));
      expect(validateForm(valid({ videos: make(20) })).videos).toBeUndefined();
      expect(validateForm(valid({ videos: make(21) })).videos).toBe('An experience can have at most 20 videos.');
    });
  });

  describe('printable', () => {
    it('all of it may be empty', () => {
      const errors = validateForm(valid({ printable: { link: '', button: '' } }));
      expect(errors['printable.link']).toBeUndefined();
      expect(errors['printable.button']).toBeUndefined();
    });

    it('a link must be a link, and https', () => {
      expect(validateForm(valid({ printable: { link: 'not a link', button: '' } }))['printable.link']).toBe('Printable link is not a valid link.');
      expect(validateForm(valid({ printable: { link: 'http://riseup.kids/a.pdf', button: '' } }))['printable.link']).toBe('Printable link must use https.');
      expect(validateForm(valid({ printable: { link: 'https://riseup.kids/a.pdf', button: '' } }))['printable.link']).toBeUndefined();
      expect(validateForm(valid({ printable: { link: '  https://riseup.kids/a.pdf  ', button: '' } }))['printable.link']).toBeUndefined();
    });

    it('a link of only spaces counts as no link', () => {
      expect(validateForm(valid({ printable: { link: '     ', button: '' } }))['printable.link']).toBeUndefined();
    });

    it('a link takes 2048 characters and refuses more', () => {
      const base = 'https://riseup.kids/';
      expect(validateForm(valid({ printable: { link: base + 'a'.repeat(2048 - base.length), button: '' } }))['printable.link']).toBeUndefined();
      expect(validateForm(valid({ printable: { link: base + 'a'.repeat(2049 - base.length), button: '' } }))['printable.link']).toBe('Printable link is too long.');
    });

    it('the button text takes exactly 60 characters and refuses 61', () => {
      expect(validateForm(valid({ printable: { link: '', button: 'a'.repeat(60) } }))['printable.button']).toBeUndefined();
      expect(validateForm(valid({ printable: { link: '', button: 'a'.repeat(61) } }))['printable.button']).toBe(
        'Printable button text cannot exceed 60 characters.'
      );
    });
  });

  describe('publishing', () => {
    it('a published experience needs a video, and the form says so on the video list (the title is always required)', () => {
      const errors = validateForm({ ...emptyForm(), isPublished: true });
      expect(errors.title).toBe('Title is required.');
      expect(errors.videos).toBe('Add at least one video before publishing.');
    });

    it('a published experience with both is fine', () => {
      expect(hasErrors(validateForm(valid({ isPublished: true })))).toBe(false);
    });

    it('too many videos keeps its own message when publishing', () => {
      const many = Array.from({ length: 21 }, (_, i) => video({ title: `V${i}`, embedUrl: `https://iframe.mediadelivery.net/embed/1/v${i}` }));
      expect(validateForm(valid({ isPublished: true, videos: many })).videos).toBe('An experience can have at most 20 videos.');
    });

    it('the same form as a draft is not held back', () => {
      expect(hasErrors(validateForm({ ...emptyForm(), isPublished: false }))).toBe(true); // the title is still required
      expect(validateForm({ ...emptyForm(), title: 'T', isPublished: false }).videos).toBeUndefined();
    });

    it('lists what stops publishing', () => {
      expect(findPublishProblems(emptyForm())).toEqual({
        title: 'Add a title before publishing.',
        videos: 'Add at least one video before publishing.',
      });
      expect(findPublishProblems({ ...emptyForm(), title: '   ', videos: [video()] })).toEqual({ title: 'Add a title before publishing.' });
      expect(findPublishProblems(valid())).toEqual({});
    });
  });

  it('counts every separate problem', () => {
    const a = video({ title: '', embedUrl: '' });
    const errors = validateForm({ ...emptyForm(), title: '', description: 'a'.repeat(1001), videos: [a], printable: { link: 'x', button: '' } });
    // title, description, video title, video link, printable link
    expect(countErrors(errors)).toBe(5);
    expect(hasErrors(errors)).toBe(true);
  });
});

describe('putting errors together', () => {
  it('keeps either side when the other is empty', () => {
    const a = { title: 'x', rows: {} };
    expect(mergeErrors(a, NO_ERRORS)).toBe(a);
    expect(mergeErrors(NO_ERRORS, a)).toBe(a);
    expect(mergeErrors(NO_ERRORS, undefined)).toBe(NO_ERRORS);
  });

  it('lays the second over the first, row by row and field by field', () => {
    const merged = mergeErrors(
      { title: 'form title', rows: { r1: { title: 'form row title' } } },
      { title: 'server title', description: 'server description', rows: { r1: { embedUrl: 'server link' }, r2: { title: 'r2' } } }
    );
    expect(merged.title).toBe('server title');
    expect(merged.description).toBe('server description');
    expect(merged.rows).toEqual({ r1: { title: 'form row title', embedUrl: 'server link' }, r2: { title: 'r2' } });
  });
});

describe('which fields to take the admin to', () => {
  it('lists them in the order they are on the page', () => {
    const a = video({ title: '', embedUrl: '' });
    const b = video({ title: 'B', embedUrl: '', key: 'row-b' });
    const form = { ...emptyForm(), title: '', description: 'a'.repeat(1001), videos: [a, b], printable: { link: 'x', button: 'a'.repeat(61) } };
    expect(errorFieldIds(validateForm(form), form)).toEqual([
      'experience-title',
      'experience-description',
      `video-${a.key}-title`,
      `video-${a.key}-link`,
      'video-row-b-link',
      'printable-link',
      'printable-button',
    ]);
  });

  it('points at the Add video button when the problem is that there are no videos', () => {
    const form = { ...emptyForm(), title: 'T', isPublished: true };
    expect(errorFieldIds(validateForm(form), form)).toEqual(['experience-add-video']);
  });

  it('has nothing to point at when nothing is wrong', () => {
    expect(errorFieldIds(validateForm(valid()), valid())).toEqual([]);
  });
});

describe('what has changed', () => {
  const base = () => formFromExperience({ title: 'T', description: 'D', isPublished: false, coverImage: 'c', videos: [{ id: 'a'.repeat(24), title: 'V', embedUrl: LINK }], printable: { link: '', button: 'Print here', image: null } });

  it.each([
    ['the title', (f) => ({ ...f, title: 'T2' })],
    ['the description', (f) => ({ ...f, description: 'D2' })],
    ['publishing', (f) => ({ ...f, isPublished: true })],
    ['a video title', (f) => ({ ...f, videos: [{ ...f.videos[0], title: 'V2' }] })],
    ['a video link', (f) => ({ ...f, videos: [{ ...f.videos[0], embedUrl: LINK_2 }] })],
    ['an added video', (f) => ({ ...f, videos: [...f.videos, video()] })],
    ['a removed video', (f) => ({ ...f, videos: [] })],
    ['the printable link', (f) => ({ ...f, printable: { ...f.printable, link: 'https://riseup.kids/a.pdf' } })],
    ['the printable button', (f) => ({ ...f, printable: { ...f.printable, button: 'Go' } })],
    ['a new cover', (f) => ({ ...f, cover: { ...f.cover, file: file() } })],
    ['a removed cover', (f) => ({ ...f, cover: { ...f.cover, remove: true } })],
    ['a new printable picture', (f) => ({ ...f, printableImage: { ...f.printableImage, file: file() } })],
    ['a removed printable picture', (f) => ({ ...f, printableImage: { ...f.printableImage, remove: true } })],
  ])('notices %s', (_, change) => {
    expect(isFormDirty(change(base()), base())).toBe(true);
  });

  it('notices videos put in another order', () => {
    const one = { key: 'a'.repeat(24), id: 'a'.repeat(24), title: 'One', embedUrl: LINK };
    const two = { key: 'b'.repeat(24), id: 'b'.repeat(24), title: 'Two', embedUrl: LINK_2 };
    expect(isFormDirty({ ...emptyForm(), videos: [two, one] }, { ...emptyForm(), videos: [one, two] })).toBe(true);
  });

  it('is not fooled by a change that was undone', () => {
    const f = base();
    expect(isFormDirty({ ...f, title: 'changed' }, f)).toBe(true);
    expect(isFormDirty({ ...f, title: 'T' }, f)).toBe(false);
  });
});

describe('what is sent', () => {
  const entries = (data) => Array.from(data.entries());
  const get = (data, name) => data.get(name);

  it('a new experience: the text, the videos in order, the printable, and no id, position or edit fields', () => {
    const form = valid({
      title: '  Smoothie  ',
      description: '  Make one  ',
      isPublished: true,
      videos: [video({ title: ' One ', embedUrl: ` ${LINK} ` }), video({ title: 'Two', embedUrl: 'https://player.mediadelivery.net/embed/123/abc-2' })],
      printable: { link: ' https://riseup.kids/a.pdf ', button: ' Print ' },
    });
    const data = buildFormData(form);
    expect(get(data, 'title')).toBe('Smoothie');
    expect(get(data, 'description')).toBe('Make one');
    expect(get(data, 'isPublished')).toBe('true');
    expect(JSON.parse(get(data, 'videos'))).toEqual([
      { title: 'One', embedUrl: LINK },
      { title: 'Two', embedUrl: LINK_2 },
    ]);
    expect(JSON.parse(get(data, 'printable'))).toEqual({ link: 'https://riseup.kids/a.pdf', button: 'Print' });
    expect(entries(data).map(([name]) => name).sort()).toEqual(['description', 'isPublished', 'printable', 'title', 'videos']);
  });

  it('says false for a draft', () => {
    expect(get(buildFormData(valid({ isPublished: false })), 'isPublished')).toBe('false');
  });

  it('keeps the id of a saved video (so it stays the same row) and never sends a position', () => {
    const id = 'c'.repeat(24);
    const data = buildFormData(valid({ videos: [video({ id, key: id }), video({ embedUrl: LINK_2 })] }));
    const sent = JSON.parse(get(data, 'videos'));
    expect(sent[0]).toEqual({ title: 'A video', embedUrl: LINK, id });
    expect(sent[1]).not.toHaveProperty('id');
    sent.forEach((row) => expect(row).not.toHaveProperty('position'));
  });

  it('sends the order of the list, whatever order the saved ids are in', () => {
    const a = video({ title: 'A', id: 'a'.repeat(24), key: 'a'.repeat(24), embedUrl: LINK });
    const b = video({ title: 'B', id: 'b'.repeat(24), key: 'b'.repeat(24), embedUrl: LINK_2 });
    expect(JSON.parse(get(buildFormData(valid({ videos: [b, a] })), 'videos')).map((row) => row.title)).toEqual(['B', 'A']);
  });

  it('an empty printable is sent empty (it clears one that was saved)', () => {
    expect(JSON.parse(get(buildFormData(valid()), 'printable'))).toEqual({ link: '', button: '' });
  });

  it('sends a chosen cover and printable picture as files, under the names the server reads', () => {
    const cover = new File(['c'], 'cover.png', { type: 'image/png' });
    const printable = new File(['p'], 'print.webp', { type: 'image/webp' });
    const data = buildFormData(valid({ cover: { url: null, file: cover, remove: false }, printableImage: { url: null, file: printable, remove: false } }));
    expect(get(data, 'coverImage')).toBeInstanceOf(File);
    expect(get(data, 'coverImage').name).toBe('cover.png');
    expect(get(data, 'printableImage').name).toBe('print.webp');
    expect(data.has('removeCoverImage')).toBe(false);
    expect(data.has('removePrintableImage')).toBe(false);
  });

  it('asks for a saved picture to be removed', () => {
    const data = buildFormData(valid({ cover: { url: 'c', file: null, remove: true }, printableImage: { url: 'p', file: null, remove: true } }));
    expect(get(data, 'removeCoverImage')).toBe('true');
    expect(get(data, 'removePrintableImage')).toBe('true');
    expect(data.has('coverImage')).toBe(false);
  });

  it('a new picture wins over a removal (it replaces the old one)', () => {
    const cover = new File(['c'], 'cover.png', { type: 'image/png' });
    const data = buildFormData(valid({ cover: { url: 'old', file: cover, remove: true } }));
    expect(data.has('coverImage')).toBe(true);
    expect(data.has('removeCoverImage')).toBe(false);
  });

  it('sends nothing about a picture that did not change', () => {
    const data = buildFormData(valid({ cover: { url: 'c', file: null, remove: false } }));
    expect(data.has('coverImage')).toBe(false);
    expect(data.has('removeCoverImage')).toBe(false);
  });

  it('an edit carries what it loaded, so someone else’s change is noticed; a new one does not', () => {
    expect(get(buildFormData(valid(), { expectedUpdatedAt: '2026-11-10T10:00:00.000Z' }), 'expectedUpdatedAt')).toBe('2026-11-10T10:00:00.000Z');
    expect(buildFormData(valid(), { expectedUpdatedAt: null }).has('expectedUpdatedAt')).toBe(false);
    expect(buildFormData(valid()).has('expectedUpdatedAt')).toBe(false);
  });
});

describe('placing what the server says', () => {
  const a = video({ key: 'row-a' });
  const b = video({ key: 'row-b', embedUrl: LINK_2 });
  const form = valid({ videos: [a, b] });

  it('puts each message next to its own field', () => {
    const { errors, other } = placeServerErrors(
      [
        { field: 'title', message: 'Title is required.' },
        { field: 'description', message: 'Description cannot exceed 1000 characters.' },
        { field: 'videos', message: 'Add at least one video before publishing.' },
        { field: 'videos[0].title', message: 'Video title is required.' },
        { field: 'videos[1].embedUrl', message: 'Video link is required.' },
        { field: 'printable.link', message: 'Printable link must use https.' },
        { field: 'printable.button', message: 'Printable button text cannot exceed 60 characters.' },
      ],
      form
    );
    expect(other).toEqual([]);
    expect(errors.title).toBe('Title is required.');
    expect(errors.description).toBe('Description cannot exceed 1000 characters.');
    expect(errors.videos).toBe('Add at least one video before publishing.');
    expect(errors.rows).toEqual({ 'row-a': { title: 'Video title is required.' }, 'row-b': { embedUrl: 'Video link is required.' } });
    expect(errors['printable.link']).toBe('Printable link must use https.');
    expect(errors['printable.button']).toBe('Printable button text cannot exceed 60 characters.');
  });

  it('a problem with a whole video row goes on its link', () => {
    expect(placeServerErrors([{ field: 'videos[1]', message: 'Video 2 needs a title and a link.' }], form).errors.rows).toEqual({
      'row-b': { embedUrl: 'Video 2 needs a title and a link.' },
    });
  });

  it('keeps the first message when one field has several', () => {
    const { errors } = placeServerErrors([{ field: 'title', message: 'first' }, { field: 'title', message: 'second' }], form);
    expect(errors.title).toBe('first');
  });

  it('keeps the first message when one video field has several', () => {
    const { errors } = placeServerErrors(
      [
        { field: 'videos[0].title', message: 'first' },
        { field: 'videos[0].title', message: 'second' },
        { field: 'videos[1]', message: 'row first' },
        { field: 'videos[1].embedUrl', message: 'row second' },
      ],
      form
    );
    expect(errors.rows).toEqual({ 'row-a': { title: 'first' }, 'row-b': { embedUrl: 'row first' } });
  });

  it('an entry without a message leaves no trace, in any field', () => {
    const { errors, other } = placeServerErrors(
      [{ field: 'title' }, { field: 'description', message: '' }, { field: 'videos[0].title' }, { field: 'videos[1]', message: '' }, { field: 'printable.link' }, { field: 'elsewhere' }],
      form
    );
    expect(Object.keys(errors)).toEqual(['rows']);
    expect(errors.rows).toEqual({});
    expect(other).toEqual([]);
  });

  it('what belongs to no visible field is listed separately', () => {
    const { errors, other } = placeServerErrors(
      [
        { field: 'videos[0].position', message: 'Position must be a whole number of 1 or more.' },
        { field: 'videos[9].title', message: 'A row that is not there.' },
        { field: 'body', message: 'Send the experience as an object.' },
        { field: 'isPublished', message: 'Published must be true or false.' },
      ],
      form
    );
    expect(other).toEqual([
      'Position must be a whole number of 1 or more.',
      'A row that is not there.',
      'Send the experience as an object.',
      'Published must be true or false.',
    ]);
    expect(countErrors(errors)).toBe(0);
  });

  it('ignores an entry without a message, and copes with no list at all', () => {
    expect(placeServerErrors([{ field: 'title' }], form)).toEqual({ errors: { rows: {} }, other: [] });
    expect(placeServerErrors(undefined, form)).toEqual({ errors: { rows: {} }, other: [] });
    expect(placeServerErrors(null, form)).toEqual({ errors: { rows: {} }, other: [] });
  });
});
