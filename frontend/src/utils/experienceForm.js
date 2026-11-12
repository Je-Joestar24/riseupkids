/**
 * Everything the Experience add / edit form knows that is not on screen: its shape, the rules (the same
 * ones the server applies, so the admin hears about a problem before sending), what is sent, and how the
 * server's answers are put back next to the right field.
 *
 * Pure functions only: no React, no network.
 */

export const LIMITS = Object.freeze({
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
  VIDEO_TITLE_MAX: 200,
  MAX_VIDEOS: 20,
  PRINTABLE_BUTTON_MAX: 60,
  URL_MAX: 2048,
  MAX_IMAGE_BYTES: 8 * 1024 * 1024,
});

export const IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';
const BUNNY_PLAYER_HOST = 'player.mediadelivery.net';
export const BUNNY_LINK_HINT = `https://${BUNNY_IFRAME_HOST}/embed/LIBRARY/VIDEO`;

// ---------------------------------------------------------------- the shape of the form

let keyCounter = 0;
/** A row key that never repeats in this page (the rows of a saved experience use their own id). */
export const nextVideoKey = () => `new-${(keyCounter += 1)}`;

export const emptyVideo = () => ({ key: nextVideoKey(), id: null, title: '', embedUrl: '' });

const emptyPicture = (url = null) => ({ url, file: null, remove: false });

export const emptyForm = () => ({
  title: '',
  description: '',
  isPublished: false,
  videos: [],
  printable: { link: '', button: '' },
  cover: emptyPicture(),
  printableImage: emptyPicture(),
});

/** The form for an experience the server sent (the detail answer). */
export const formFromExperience = (experience) => {
  const source = experience || {};
  const printable = source.printable || {};
  return {
    title: source.title || '',
    description: source.description || '',
    isPublished: Boolean(source.isPublished),
    videos: (source.videos || []).map((video) => ({
      key: video.id,
      id: video.id,
      title: video.title || '',
      embedUrl: video.embedUrl || '',
    })),
    printable: { link: printable.link || '', button: printable.button || '' },
    cover: emptyPicture(source.coverImage || null),
    printableImage: emptyPicture(printable.image || null),
  };
};

/** The picture that is shown: a newly chosen file wins, a removed one shows nothing. */
export const pictureIsShown = (picture) => Boolean(picture.file) || (Boolean(picture.url) && !picture.remove);

// ---------------------------------------------------------------- video links

/**
 * The link of a Bunny video as it will be saved: https, on the iframe host, under /embed/. A link on the
 * "player" host is the same video and is converted.
 * @param {unknown} raw
 * @returns {{ url: string, error: string }} exactly one of the two is empty
 */
export const normalizeBunnyLink = (raw) => {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { url: '', error: 'Video link is required.' };
  const wrong = { url: '', error: `Use a Bunny embed link like ${BUNNY_LINK_HINT}.` };
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return wrong;
  }
  if (parsed.hostname.toLowerCase() === BUNNY_PLAYER_HOST) parsed.hostname = BUNNY_IFRAME_HOST;
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== BUNNY_IFRAME_HOST || !parsed.pathname.toLowerCase().startsWith('/embed/')) {
    return wrong;
  }
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  const url = parsed.toString();
  if (url.length > LIMITS.URL_MAX) return { url: '', error: 'Video link is too long.' };
  return { url, error: '' };
};

// ---------------------------------------------------------------- pictures

/** '' when the file can be used, otherwise the reason. */
export const checkImageFile = (file) => {
  if (!file) return 'Choose a picture.';
  if (!IMAGE_TYPES.includes(file.type)) return 'Pictures must be JPG, PNG or WebP.';
  if (file.size > LIMITS.MAX_IMAGE_BYTES) return 'The picture is too large. The maximum size is 8 MB.';
  return '';
};

// ---------------------------------------------------------------- the rules

const EMPTY_ROWS = Object.freeze({});

/** An errors object with nothing in it. */
export const NO_ERRORS = Object.freeze({ rows: EMPTY_ROWS });

/** What stops an experience from being published. Same reasons as the server gives. */
export const findPublishProblems = (form) => {
  const problems = {};
  if (!form.title.trim()) problems.title = 'Add a title before publishing.';
  if (form.videos.length === 0) problems.videos = 'Add at least one video before publishing.';
  return problems;
};

const printableLinkError = (raw) => {
  const text = raw.trim();
  if (!text) return '';
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return 'Printable link is not a valid link.';
  }
  if (parsed.protocol !== 'https:') return 'Printable link must use https.';
  if (text.length > LIMITS.URL_MAX) return 'Printable link is too long.';
  return '';
};

/**
 * Every problem the form has right now.
 * `{ title?, description?, videos?, 'printable.link'?, 'printable.button'?, rows: { [rowKey]: { title?, embedUrl? } } }`
 */
export const validateForm = (form) => {
  const errors = { rows: {} };

  const title = form.title.trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > LIMITS.TITLE_MAX) errors.title = `Title cannot exceed ${LIMITS.TITLE_MAX} characters.`;

  if (form.description.trim().length > LIMITS.DESCRIPTION_MAX) {
    errors.description = `Description cannot exceed ${LIMITS.DESCRIPTION_MAX} characters.`;
  }

  if (form.videos.length > LIMITS.MAX_VIDEOS) {
    errors.videos = `An experience can have at most ${LIMITS.MAX_VIDEOS} videos.`;
  }
  const seen = new Map();
  form.videos.forEach((video, index) => {
    const row = {};
    const videoTitle = video.title.trim();
    if (!videoTitle) row.title = 'Video title is required.';
    else if (videoTitle.length > LIMITS.VIDEO_TITLE_MAX) row.title = `Video title cannot exceed ${LIMITS.VIDEO_TITLE_MAX} characters.`;

    const { url, error } = normalizeBunnyLink(video.embedUrl);
    if (error) row.embedUrl = error;
    else if (seen.has(url)) row.embedUrl = `This video is already in the list (video ${seen.get(url) + 1}).`;
    else seen.set(url, index);

    if (row.title || row.embedUrl) errors.rows[video.key] = row;
  });

  const linkError = printableLinkError(form.printable.link);
  if (linkError) errors['printable.link'] = linkError;
  if (form.printable.button.trim().length > LIMITS.PRINTABLE_BUTTON_MAX) {
    errors['printable.button'] = `Printable button text cannot exceed ${LIMITS.PRINTABLE_BUTTON_MAX} characters.`;
  }

  // A title is always required, so publishing only adds the videos.
  if (form.isPublished && !errors.videos) {
    const problems = findPublishProblems(form);
    if (problems.videos) errors.videos = problems.videos;
  }
  return errors;
};

/** How many separate things are wrong. */
export const countErrors = (errors) =>
  Object.keys(errors).filter((key) => key !== 'rows').length +
  Object.values(errors.rows || {}).reduce((sum, row) => sum + Object.keys(row).length, 0);

export const hasErrors = (errors) => countErrors(errors) > 0;

/** `a` with `b` laid over it (a field that has an error in both keeps `b`'s, rows are merged field by field). */
export const mergeErrors = (a, b) => {
  if (!b || countErrors(b) === 0) return a;
  if (!a || countErrors(a) === 0) return b;
  const rows = { ...a.rows };
  Object.entries(b.rows || {}).forEach(([key, row]) => {
    rows[key] = { ...rows[key], ...row };
  });
  return { ...a, ...b, rows };
};

/** The ids of the fields that have a problem, in the order they appear on the page. */
export const errorFieldIds = (errors, form) => {
  const ids = [];
  if (errors.title) ids.push('experience-title');
  if (errors.description) ids.push('experience-description');
  form.videos.forEach((video) => {
    const row = errors.rows[video.key];
    if (row && row.title) ids.push(`video-${video.key}-title`);
    if (row && row.embedUrl) ids.push(`video-${video.key}-link`);
  });
  if (errors.videos && form.videos.length === 0) ids.push('experience-add-video');
  if (errors['printable.link']) ids.push('printable-link');
  if (errors['printable.button']) ids.push('printable-button');
  return ids;
};

// ---------------------------------------------------------------- what changed

const pictureSnapshot = (picture) => ({ file: Boolean(picture.file), remove: picture.remove });

const snapshot = (form) =>
  JSON.stringify({
    title: form.title,
    description: form.description,
    isPublished: form.isPublished,
    videos: form.videos.map((video) => [video.id, video.title, video.embedUrl]),
    printable: form.printable,
    cover: pictureSnapshot(form.cover),
    printableImage: pictureSnapshot(form.printableImage),
  });

/** Has the admin changed anything since the form was loaded (or since it was empty)? */
export const isFormDirty = (form, initial) => snapshot(form) !== snapshot(initial);

// ---------------------------------------------------------------- what is sent

/**
 * The multipart body for create (POST) or edit (PUT). The order of the list is the order of the videos; a
 * saved video keeps its id so it stays the same row. `position` is never sent: the server numbers the rows.
 * @param {ReturnType<typeof emptyForm>} form
 * @param {{ expectedUpdatedAt?: string|null }} [options] edit only: what the editor loaded, so a change made
 *   by someone else in the meantime is refused instead of overwritten
 */
export const buildFormData = (form, { expectedUpdatedAt = null } = {}) => {
  const data = new FormData();
  data.append('title', form.title.trim());
  data.append('description', form.description.trim());
  data.append('isPublished', String(form.isPublished));
  data.append(
    'videos',
    JSON.stringify(
      form.videos.map((video) => {
        const row = { title: video.title.trim(), embedUrl: normalizeBunnyLink(video.embedUrl).url || video.embedUrl.trim() };
        if (video.id) row.id = video.id;
        return row;
      })
    )
  );
  data.append('printable', JSON.stringify({ link: form.printable.link.trim(), button: form.printable.button.trim() }));

  if (form.cover.file) data.append('coverImage', form.cover.file);
  else if (form.cover.remove) data.append('removeCoverImage', 'true');
  if (form.printableImage.file) data.append('printableImage', form.printableImage.file);
  else if (form.printableImage.remove) data.append('removePrintableImage', 'true');

  if (expectedUpdatedAt) data.append('expectedUpdatedAt', expectedUpdatedAt);
  return data;
};

// ---------------------------------------------------------------- the server's answers

const ROW_FIELD = /^videos\[(\d+)\](?:\.(title|embedUrl))?$/;

/**
 * Puts the field problems the server named next to their fields.
 * @param {Array<{ field: string, message: string }>} list
 * @param {ReturnType<typeof emptyForm>} form the form that was sent (the row numbers refer to its list)
 * @returns {{ errors: object, other: string[] }} `other` are the messages that belong to no visible field
 */
export const placeServerErrors = (list, form) => {
  const errors = { rows: {} };
  const other = [];
  (Array.isArray(list) ? list : []).forEach(({ field, message }) => {
    if (!message) return;
    if (['title', 'description', 'videos', 'printable.link', 'printable.button'].includes(field)) {
      errors[field] = errors[field] || message;
      return;
    }
    const match = ROW_FIELD.exec(field || '');
    const video = match && form.videos[Number(match[1])];
    if (video) {
      const row = (errors.rows[video.key] = errors.rows[video.key] || {});
      row[match[2] || 'embedUrl'] = row[match[2] || 'embedUrl'] || message;
      return;
    }
    other.push(message);
  });
  return { errors, other };
};
