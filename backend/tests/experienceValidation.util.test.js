/**
 * The rules for admin-managed Experiences, on their own (no database, no network): what counts as a
 * Bunny link, what an experience needs before it can be published, which printable links are allowed,
 * and how list filters are read.
 */
const {
  LIMITS,
  DEFAULT_PRINTABLE_BUTTON,
  ExperienceError,
  isValidExperienceUuid,
  isValidVideoId,
  getPrintableHosts,
  normalizeBunnyEmbedUrl,
  validateExperienceInput,
  findPublishProblems,
  parseListQuery,
  escapeRegex,
} = require('../utils/experienceValidation.util');

const GOOD = 'https://iframe.mediadelivery.net/embed/660084/fbf9d1d1-5294-4375-8abf-a1529c31c496';
const OTHER = 'https://iframe.mediadelivery.net/embed/660084/ea5f0749-8fde-43e5-851b-ec9e5af9e12a';
const fields = (result) => result.errors.map((e) => e.field);

describe('normalizeBunnyEmbedUrl', () => {
  it('accepts a Bunny iframe embed link as it is', () => {
    expect(normalizeBunnyEmbedUrl(GOOD)).toBe(GOOD);
  });

  it('turns a player link into the iframe link (same video)', () => {
    expect(normalizeBunnyEmbedUrl('https://player.mediadelivery.net/embed/660084/abc')).toBe(
      'https://iframe.mediadelivery.net/embed/660084/abc'
    );
  });

  it('trims spaces and strips credentials and fragments', () => {
    expect(normalizeBunnyEmbedUrl(`  https://user:pw@iframe.mediadelivery.net/embed/1/2#frag  `)).toBe(
      'https://iframe.mediadelivery.net/embed/1/2'
    );
  });

  it.each([
    ['empty text', ''],
    ['only spaces', '   '],
    ['undefined', undefined],
    ['null', null],
    ['a number', 5],
    ['an object', { url: GOOD }],
    ['not a link', 'hello'],
    ['http instead of https', 'http://iframe.mediadelivery.net/embed/1/2'],
    ['another host', 'https://www.youtube.com/embed/abc'],
    ['a look-alike host', 'https://iframe.mediadelivery.net.evil.com/embed/1/2'],
    ['the wrong path', 'https://iframe.mediadelivery.net/play/1/2'],
    ['too long', `https://iframe.mediadelivery.net/embed/1/${'a'.repeat(2100)}`],
  ])('rejects %s', (_label, value) => {
    expect(() => normalizeBunnyEmbedUrl(value)).toThrow(/video link/i);
  });

  it('the message tells the admin what a good link looks like', () => {
    expect(() => normalizeBunnyEmbedUrl('https://example.com/x')).toThrow(/iframe\.mediadelivery\.net\/embed/);
  });
});

describe('validateExperienceInput — creating', () => {
  it('needs a title', () => {
    expect(fields(validateExperienceInput({}))).toContain('title');
    expect(fields(validateExperienceInput({ title: '   ' }))).toContain('title');
  });

  it('keeps a valid experience, trimmed', () => {
    const { value, errors } = validateExperienceInput({
      title: '  Smoothie  ',
      description: '  Make it  ',
      videos: [{ title: ' Words ', embedUrl: GOOD }],
      isPublished: false,
    });
    expect(errors).toEqual([]);
    expect(value).toEqual({
      title: 'Smoothie',
      description: 'Make it',
      videos: [{ title: 'Words', embedUrl: GOOD }],
      isPublished: false,
    });
  });

  it('a body that is not an object is refused', () => {
    expect(fields(validateExperienceInput(null))).toEqual(['body']);
    expect(fields(validateExperienceInput('text'))).toEqual(['body']);
    expect(fields(validateExperienceInput([]))).toEqual(['body']);
  });

  it('title and description have a maximum length', () => {
    expect(fields(validateExperienceInput({ title: 'a'.repeat(LIMITS.TITLE_MAX + 1) }))).toContain('title');
    expect(validateExperienceInput({ title: 'a'.repeat(LIMITS.TITLE_MAX) }).errors).toEqual([]);
    expect(
      fields(validateExperienceInput({ title: 'ok', description: 'a'.repeat(LIMITS.DESCRIPTION_MAX + 1) }))
    ).toContain('description');
  });

  it('text fields must be text — an object (e.g. a database operator) is never accepted', () => {
    expect(fields(validateExperienceInput({ title: { $gt: '' } }))).toContain('title');
    expect(fields(validateExperienceInput({ title: 'ok', description: { $ne: 1 } }))).toContain('description');
    expect(fields(validateExperienceInput({ title: 123 }))).toContain('title');
  });

  it('the limits are the numbers the admin screen promises (200, 1000, 200, 20, 60), written out', () => {
    const title = (n) => validateExperienceInput({ title: 'a'.repeat(n) }).errors;
    expect(title(200)).toEqual([]);
    expect(fields({ errors: title(201) })).toEqual(['title']);

    const description = (n) => validateExperienceInput({ title: 'ok', description: 'a'.repeat(n) }).errors;
    expect(description(1000)).toEqual([]);
    expect(fields({ errors: description(1001) })).toEqual(['description']);

    const videoTitle = (n) => validateExperienceInput({ title: 'ok', videos: [{ title: 'a'.repeat(n), embedUrl: GOOD }] }).errors;
    expect(videoTitle(200)).toEqual([]);
    expect(fields({ errors: videoTitle(201) })).toEqual(['videos[0].title']);

    const button = (n) => validateExperienceInput({ title: 'ok', printable: { link: '', button: 'a'.repeat(n) } }).errors;
    expect(button(60)).toEqual([]);
    expect(fields({ errors: button(61) })).toEqual(['printable.button']);

    const many = (n) =>
      validateExperienceInput({
        title: 'ok',
        videos: Array.from({ length: n }, (_, i) => ({ title: `v${i}`, embedUrl: `https://iframe.mediadelivery.net/embed/1/${i}` })),
      }).errors;
    expect(many(20)).toEqual([]);
    expect(fields({ errors: many(21) })).toEqual(['videos']);
  });

  it('the list limits are the numbers the screen relies on (default 20, at most 100, search 100 characters)', () => {
    expect(parseListQuery({}).value.limit).toBe(20);
    expect(parseListQuery({ limit: '100' }).value.limit).toBe(100);
    expect(parseListQuery({ limit: '101' }).value.limit).toBe(100);
    expect(parseListQuery({ search: 'a'.repeat(101) }).value.search).toHaveLength(100);
    expect(parseListQuery({ search: 'a'.repeat(100) }).value.search).toHaveLength(100);
  });

  it('a missing description becomes empty, and null is fine', () => {
    expect(validateExperienceInput({ title: 'ok' }).value.description).toBeUndefined();
    expect(validateExperienceInput({ title: 'ok', description: null }).value.description).toBe('');
  });
});

describe('validateExperienceInput — videos', () => {
  const videos = (list) => validateExperienceInput({ title: 'ok', videos: list });

  it('must be a list', () => {
    expect(fields(videos('nope'))).toEqual(['videos']);
    expect(fields(videos({ 0: {} }))).toEqual(['videos']);
  });

  it('an empty list is allowed (a draft can be saved without videos)', () => {
    expect(videos([]).errors).toEqual([]);
  });

  it('allows up to the maximum and refuses more', () => {
    const many = (n) =>
      Array.from({ length: n }, (_, i) => ({ title: `v${i}`, embedUrl: `https://iframe.mediadelivery.net/embed/1/${i}` }));
    expect(videos(many(LIMITS.MAX_VIDEOS)).errors).toEqual([]);
    expect(fields(videos(many(LIMITS.MAX_VIDEOS + 1)))).toEqual(['videos']);
  });

  it('each video needs a title and a Bunny link, and the problem names the row', () => {
    const result = videos([{ title: '', embedUrl: GOOD }, { title: 'Two', embedUrl: 'https://youtube.com/x' }, 'text']);
    expect(fields(result)).toEqual(['videos[0].title', 'videos[1].embedUrl', 'videos[2]']);
  });

  it('refuses the same video twice, and says which row it repeats', () => {
    const result = videos([{ title: 'A', embedUrl: GOOD }, { title: 'B', embedUrl: OTHER }, { title: 'C', embedUrl: GOOD }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('videos[2].embedUrl');
    expect(result.errors[0].message).toMatch(/video 1/);
  });

  it('treats a player link and an iframe link of the same video as the same video', () => {
    const result = videos([
      { title: 'A', embedUrl: 'https://player.mediadelivery.net/embed/660084/x' },
      { title: 'B', embedUrl: 'https://iframe.mediadelivery.net/embed/660084/x' },
    ]);
    expect(fields(result)).toEqual(['videos[1].embedUrl']);
  });

  it('keeps a row id only when it looks like a real id', () => {
    const id = 'a'.repeat(24);
    const { value } = videos([
      { id, title: 'A', embedUrl: GOOD },
      { id: 'not-an-id', title: 'B', embedUrl: OTHER },
    ]);
    expect(value.videos[0]._id).toBe(id);
    expect(value.videos[1]._id).toBeUndefined();
  });

  it('a 12-character text is not taken as a row id (the database would accept it as one)', () => {
    const { value } = videos([{ id: '123456789abc', title: 'A', embedUrl: GOOD }]);
    expect(value.videos[0]._id).toBeUndefined();
  });

  it('a position that comes with a row is checked but never used to move it', () => {
    const { value, errors } = videos([
      { title: 'A', embedUrl: GOOD, position: 2 },
      { title: 'B', embedUrl: OTHER, position: 1 },
    ]);
    expect(errors).toEqual([]);
    expect(value.videos.map((v) => v.title)).toEqual(['A', 'B']); // the order of the list wins
    expect(value.videos.every((v) => v.position === undefined)).toBe(true); // numbered when saved, not as sent
  });

  it.each([[0], [-1], [1.5], ['2'], [true], [{}], [NaN]])('refuses the position %p', (position) => {
    expect(fields(videos([{ title: 'A', embedUrl: GOOD, position }]))).toEqual(['videos[0].position']);
  });

  it('a missing or null position is fine', () => {
    expect(videos([{ title: 'A', embedUrl: GOOD, position: null }, { title: 'B', embedUrl: OTHER }]).errors).toEqual([]);
  });

  it('keeps the order it was given', () => {
    const { value } = videos([{ title: 'Second', embedUrl: OTHER }, { title: 'First', embedUrl: GOOD }]);
    expect(value.videos.map((v) => v.title)).toEqual(['Second', 'First']);
  });
});

describe('validateExperienceInput — printable', () => {
  const printable = (p) => validateExperienceInput({ title: 'ok', printable: p });

  it('accepts a file on our own domain and uses the default button text', () => {
    const { value, errors } = printable({ link: 'https://riseup.kids/downloads/recipe.pdf' });
    expect(errors).toEqual([]);
    expect(value.printable).toEqual({ link: 'https://riseup.kids/downloads/recipe.pdf', button: DEFAULT_PRINTABLE_BUTTON });
  });

  it('accepts the app and www hosts', () => {
    expect(printable({ link: 'https://www.riseup.kids/a.pdf' }).errors).toEqual([]);
    expect(printable({ link: 'https://app.riseup.kids/a.pdf' }).errors).toEqual([]);
  });

  it('strips credentials and fragments from the printable link', () => {
    expect(printable({ link: 'https://user:secret@riseup.kids/a.pdf#page=2' }).value.printable.link).toBe('https://riseup.kids/a.pdf');
  });

  it('an empty link is fine (no printable)', () => {
    expect(printable({ link: '', button: 'Print' }).value.printable).toEqual({ link: '', button: 'Print' });
    expect(printable({}).value.printable).toEqual({ link: '', button: DEFAULT_PRINTABLE_BUTTON });
  });

  it.each([
    ['an outside website', 'https://example.com/a.pdf'],
    ['a social network', 'https://www.facebook.com/riseup'],
    ['a look-alike host', 'https://riseup.kids.evil.com/a.pdf'],
    ['a sub-domain that is not ours', 'https://evil.riseup.kids/a.pdf'],
    ['http', 'http://riseup.kids/a.pdf'],
    ['not a link', 'recipe.pdf'],
    ['a script link', 'javascript:alert(1)'],
  ])('refuses %s', (_label, link) => {
    expect(fields(printable({ link }))).toEqual(['printable.link']);
  });

  it('the link must be text and printable must be an object', () => {
    expect(fields(printable({ link: 5 }))).toEqual(['printable.link']);
    expect(fields(printable('x'))).toEqual(['printable']);
  });

  it('the button text has a maximum length', () => {
    expect(fields(printable({ link: '', button: 'a'.repeat(LIMITS.PRINTABLE_BUTTON_MAX + 1) }))).toEqual(['printable.button']);
  });

  it('the allowed hosts can be changed in the settings', () => {
    const before = process.env.EXPERIENCE_PRINTABLE_HOSTS;
    process.env.EXPERIENCE_PRINTABLE_HOSTS = 'files.example.org, Other.example.org';
    try {
      expect(getPrintableHosts()).toEqual(['files.example.org', 'other.example.org']);
      expect(printable({ link: 'https://files.example.org/a.pdf' }).errors).toEqual([]);
      expect(fields(printable({ link: 'https://riseup.kids/a.pdf' }))).toEqual(['printable.link']);
    } finally {
      if (before === undefined) delete process.env.EXPERIENCE_PRINTABLE_HOSTS;
      else process.env.EXPERIENCE_PRINTABLE_HOSTS = before;
    }
  });
});

describe('validateExperienceInput — published flag and partial edits', () => {
  it('reads true and false, also as text from a form, and refuses anything else', () => {
    expect(validateExperienceInput({ title: 'a', isPublished: true }).value.isPublished).toBe(true);
    expect(validateExperienceInput({ title: 'a', isPublished: 'true' }).value.isPublished).toBe(true);
    expect(validateExperienceInput({ title: 'a', isPublished: 'false' }).value.isPublished).toBe(false);
    expect(fields(validateExperienceInput({ title: 'a', isPublished: 'yes' }))).toEqual(['isPublished']);
    expect(fields(validateExperienceInput({ title: 'a', isPublished: 1 }))).toEqual(['isPublished']);
  });

  it('when editing, only the fields that are sent are checked and returned', () => {
    expect(validateExperienceInput({ description: 'New' }, { partial: true })).toEqual({
      value: { description: 'New' },
      errors: [],
    });
    expect(validateExperienceInput({}, { partial: true })).toEqual({ value: {}, errors: [] });
  });

  it('when editing, a title that is sent must still be real', () => {
    expect(fields(validateExperienceInput({ title: '' }, { partial: true }))).toEqual(['title']);
  });

  it('ignores fields it does not know (nothing else can be set)', () => {
    const { value } = validateExperienceInput({ title: 'a', order: 99, uuid: 'x', createdBy: 'me', publishedAt: 1 });
    expect(value).toEqual({ title: 'a' });
  });
});

describe('findPublishProblems', () => {
  const ok = { title: 'Smoothie', videos: [{ title: 'A', embedUrl: GOOD }] };

  it('a titled experience with a video can be published', () => {
    expect(findPublishProblems(ok)).toEqual([]);
  });

  it('needs a title', () => {
    expect(findPublishProblems({ ...ok, title: ' ' }).map((p) => p.field)).toEqual(['title']);
  });

  it('needs at least one video', () => {
    expect(findPublishProblems({ ...ok, videos: [] }).map((p) => p.field)).toEqual(['videos']);
    expect(findPublishProblems({ title: 'x' }).map((p) => p.field)).toEqual(['videos']);
  });

  it('every video needs a title and a link', () => {
    const problems = findPublishProblems({ ...ok, videos: [ok.videos[0], { title: 'B', embedUrl: '' }, { title: '', embedUrl: GOOD }] });
    expect(problems.map((p) => p.field)).toEqual(['videos[1]', 'videos[2]']);
  });

  it('reports everything at once, and copes with nothing at all', () => {
    expect(findPublishProblems({ title: '', videos: [] }).map((p) => p.field)).toEqual(['title', 'videos']);
    expect(findPublishProblems(null).map((p) => p.field)).toEqual(['title', 'videos']);
  });
});

describe('parseListQuery', () => {
  it('has sensible defaults', () => {
    expect(parseListQuery({})).toEqual({
      value: { status: 'all', search: '', page: 1, limit: LIMITS.PAGE_SIZE_DEFAULT },
      errors: [],
    });
    expect(parseListQuery(undefined).errors).toEqual([]);
  });

  it('reads status, search, page and limit', () => {
    expect(parseListQuery({ status: 'draft', search: ' straw ', page: '3', limit: '5' }).value).toEqual({
      status: 'draft',
      search: 'straw',
      page: 3,
      limit: 5,
    });
  });

  it('refuses an unknown status', () => {
    expect(fields(parseListQuery({ status: 'archived' }))).toEqual(['status']);
    expect(fields(parseListQuery({ status: ['draft'] }))).toEqual(['status']);
  });

  it.each([['0'], ['-1'], ['1.5'], ['abc'], ['']])('refuses page=%s', (page) => {
    expect(fields(parseListQuery({ page }))).toEqual(['page']);
  });

  it('keeps the limit within the maximum and refuses a bad one', () => {
    expect(parseListQuery({ limit: '5000' }).value.limit).toBe(LIMITS.PAGE_SIZE_MAX);
    expect(fields(parseListQuery({ limit: '0' }))).toEqual(['limit']);
    expect(parseListQuery({ limit: 'x' }).value.limit).toBe(LIMITS.PAGE_SIZE_DEFAULT);
  });

  it('search must be text and is cut to a safe length', () => {
    expect(fields(parseListQuery({ search: ['a', 'b'] }))).toEqual(['search']);
    expect(fields(parseListQuery({ search: { $ne: '' } }))).toEqual(['search']);
    expect(parseListQuery({ search: 'a'.repeat(500) }).value.search).toHaveLength(LIMITS.SEARCH_MAX);
  });
});

describe('small helpers', () => {
  it('isValidExperienceUuid accepts only a version 4 uuid', () => {
    expect(isValidExperienceUuid('3b241101-e2bb-4255-8caf-4136c566a962')).toBe(true);
    expect(isValidExperienceUuid('3B241101-E2BB-4255-8CAF-4136C566A962')).toBe(true);
    expect(isValidExperienceUuid('3b241101-e2bb-1255-8caf-4136c566a962')).toBe(false); // version 1
    expect(isValidExperienceUuid('not-a-uuid')).toBe(false);
    expect(isValidExperienceUuid('')).toBe(false);
    expect(isValidExperienceUuid(undefined)).toBe(false);
    expect(isValidExperienceUuid({})).toBe(false);
    expect(isValidExperienceUuid('507f1f77bcf86cd799439011')).toBe(false); // a database id is not a uuid
  });

  it('isValidVideoId accepts only 24 hex characters', () => {
    expect(isValidVideoId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidVideoId('507F1F77BCF86CD799439011')).toBe(true);
    expect(isValidVideoId('123456789abc')).toBe(false); // 12 hex characters: the database would accept it, we do not
    expect(isValidVideoId('507f1f77bcf86cd79943901')).toBe(false); // 23 characters
    expect(isValidVideoId('3b241101-e2bb-4255-8caf-4136c566a962')).toBe(false);
    expect(isValidVideoId('')).toBe(false);
    expect(isValidVideoId(undefined)).toBe(false);
    expect(isValidVideoId({})).toBe(false);
  });

  it('escapeRegex makes search text literal', () => {
    expect(escapeRegex('a.b*c(d)[e]')).toBe('a\\.b\\*c\\(d\\)\\[e\\]');
    expect(new RegExp(escapeRegex('(x+')).test('(x+')).toBe(true);
  });

  it('ExperienceError carries a status, a stable code, a message and field problems', () => {
    const error = new ExperienceError(422, 'PUBLISH_BLOCKED', 'No.', [{ field: 'title', message: 'x' }]);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ statusCode: 422, code: 'PUBLISH_BLOCKED', message: 'No.', name: 'ExperienceError' });
    expect(error.errors).toHaveLength(1);
    expect(new ExperienceError(404, 'X', 'y').errors).toEqual([]);
  });
});
