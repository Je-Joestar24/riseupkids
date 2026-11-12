/**
 * Every way the Experience editor's state can change.
 */
import { describe, expect, it } from 'vitest';
import { experienceEditorReducer, initialEditorState } from './experienceEditorReducer';
import { NO_ERRORS, emptyVideo, formFromExperience } from './experienceForm';

const LINK = 'https://iframe.mediadelivery.net/embed/123/abc-1';
const ID_A = 'a'.repeat(24);
const ID_B = 'b'.repeat(24);
const ID_C = 'c'.repeat(24);

const saved = {
  uuid: 'u-1',
  title: 'Smoothie',
  description: 'Make one',
  isPublished: false,
  coverImage: 'https://cdn/cover.png',
  updatedAt: '2026-11-10T10:00:00.000Z',
  videos: [
    { id: ID_A, title: 'One', embedUrl: `${LINK}1` },
    { id: ID_B, title: 'Two', embedUrl: `${LINK}2` },
    { id: ID_C, title: 'Three', embedUrl: `${LINK}3` },
  ],
  printable: { link: '', button: 'Print here', image: 'https://cdn/p.png' },
};

const png = (size = 100) => ({ type: 'image/png', size, name: 'a.png' });
const run = (state, ...actions) => actions.reduce(experienceEditorReducer, state);
const loaded = () => run(initialEditorState({ isEdit: true }), { type: 'loaded', experience: saved });
const titles = (state) => state.form.videos.map((video) => video.title);

describe('starting', () => {
  it('a new experience is ready at once, empty, and not yet submitted', () => {
    const state = initialEditorState({ isEdit: false });
    expect(state.status).toBe('ready');
    expect(state.form.title).toBe('');
    expect(state.submitted).toBe(false);
    expect(state.saving).toBe(false);
    expect(state.banner).toBeNull();
    expect(state.fieldErrors).toBe(NO_ERRORS);
  });

  it('an experience to edit waits to be loaded', () => {
    expect(initialEditorState({ isEdit: true }).status).toBe('loading');
  });

  it('two new pages never share a form', () => {
    expect(initialEditorState({ isEdit: false }).form).not.toBe(initialEditorState({ isEdit: false }).form);
  });
});

describe('loading', () => {
  it('fills the form from the experience and remembers it as the starting point', () => {
    const state = loaded();
    expect(state.status).toBe('ready');
    expect(state.form).toEqual(formFromExperience(saved));
    expect(state.initial).toBe(state.form);
    expect(state.updatedAt).toBe('2026-11-10T10:00:00.000Z');
    expect(state.uuid).toBe('u-1');
  });

  it('loading again (their version) throws away what was typed, the errors and the message', () => {
    let state = run(loaded(), { type: 'set-field', name: 'title', value: 'Mine' }, { type: 'submit' }, {
      type: 'save-failed',
      banner: { kind: 'conflict', message: 'm', reasons: [] },
      fieldErrors: null,
    });
    state = run(state, { type: 'load-start' }, { type: 'loaded', experience: { ...saved, title: 'Theirs', updatedAt: '2026-11-11T10:00:00.000Z' } });
    expect(state.form.title).toBe('Theirs');
    expect(state.banner).toBeNull();
    expect(state.submitted).toBe(false);
    expect(state.updatedAt).toBe('2026-11-11T10:00:00.000Z');
  });

  it('shows the loading state while it waits, then the outcome', () => {
    expect(run(loaded(), { type: 'load-start' }).status).toBe('loading');
    expect(run(initialEditorState({ isEdit: true }), { type: 'load-not-found' }).status).toBe('notFound');
    const failed = run(initialEditorState({ isEdit: true }), { type: 'load-failed', message: 'Could not reach the server.' });
    expect(failed.status).toBe('loadError');
    expect(failed.loadError).toBe('Could not reach the server.');
    expect(run(failed, { type: 'load-start' }).loadError).toBeNull();
  });
});

describe('fields', () => {
  it('changes the title, the description and publishing', () => {
    const state = run(
      loaded(),
      { type: 'set-field', name: 'title', value: 'New title' },
      { type: 'set-field', name: 'description', value: 'New text' },
      { type: 'set-field', name: 'isPublished', value: true }
    );
    expect(state.form).toMatchObject({ title: 'New title', description: 'New text', isPublished: true });
  });

  it('changes the printable link and button without touching the other', () => {
    const state = run(loaded(), { type: 'set-printable', name: 'link', value: 'https://riseup.kids/a.pdf' });
    expect(state.form.printable).toEqual({ source: 'link', link: 'https://riseup.kids/a.pdf', button: 'Print here' });
    expect(run(state, { type: 'set-printable', name: 'button', value: 'Go' }).form.printable).toEqual({
      source: 'link',
      link: 'https://riseup.kids/a.pdf',
      button: 'Go',
    });
  });

  it('does not change the starting point (so unsaved changes can be measured)', () => {
    const start = loaded();
    const state = run(start, { type: 'set-field', name: 'title', value: 'Other' });
    expect(state.initial).toBe(start.initial);
    expect(state.initial.title).toBe('Smoothie');
  });

  it('removes the problem of the field that was edited, and only that one', () => {
    const withErrors = { ...loaded(), fieldErrors: { title: 'T', description: 'D', videos: 'V', 'printable.link': 'L', 'printable.button': 'B', rows: {} } };
    const afterTitle = run(withErrors, { type: 'set-field', name: 'title', value: 'x' });
    expect(afterTitle.fieldErrors).toMatchObject({ description: 'D', videos: 'V', 'printable.link': 'L' });
    expect(afterTitle.fieldErrors.title).toBeUndefined();
    expect(run(withErrors, { type: 'set-printable', name: 'link', value: 'x' }).fieldErrors['printable.link']).toBeUndefined();
    expect(run(withErrors, { type: 'set-printable', name: 'link', value: 'x' }).fieldErrors['printable.button']).toBe('B');
    expect(run(withErrors, { type: 'set-field', name: 'description', value: 'x' }).fieldErrors.description).toBeUndefined();
  });

  it('turning publishing off removes the "needs a title / video" reasons that came with it', () => {
    const withErrors = { ...loaded(), fieldErrors: { title: 'T', videos: 'V', description: 'D', rows: {} } };
    const state = run(withErrors, { type: 'set-field', name: 'isPublished', value: false });
    expect(state.fieldErrors.title).toBeUndefined();
    expect(state.fieldErrors.videos).toBeUndefined();
    expect(state.fieldErrors.description).toBe('D');
  });
});

describe('videos', () => {
  it('adds an empty video at the end and asks for the cursor to go to it', () => {
    const state = run(loaded(), { type: 'add-video' });
    expect(state.form.videos).toHaveLength(4);
    const added = state.form.videos[3];
    expect(added).toMatchObject({ id: null, title: '', embedUrl: '' });
    expect(state.focusKey).toBe(added.key);
    expect(titles(state).slice(0, 3)).toEqual(['One', 'Two', 'Three']);
  });

  it('does not add a 21st video', () => {
    let state = initialEditorState({ isEdit: false });
    for (let i = 0; i < 25; i += 1) state = run(state, { type: 'add-video' });
    expect(state.form.videos).toHaveLength(20);
  });

  it('adding a video clears "add at least one video"', () => {
    const state = run({ ...initialEditorState({ isEdit: false }), fieldErrors: { videos: 'Add one', rows: {} } }, { type: 'add-video' });
    expect(state.fieldErrors.videos).toBeUndefined();
  });

  it('edits only the video with that key, keeping its id', () => {
    const state = run(loaded(), { type: 'update-video', key: ID_B, patch: { title: 'Second' } });
    expect(titles(state)).toEqual(['One', 'Second', 'Three']);
    expect(state.form.videos[1].id).toBe(ID_B);
    expect(state.form.videos[1].embedUrl).toBe(`${LINK}2`);
  });

  it('editing a video clears that field’s problem and keeps the others in its row', () => {
    const base = { ...loaded(), fieldErrors: { rows: { [ID_A]: { title: 'T', embedUrl: 'L' }, [ID_B]: { title: 'other' } } } };
    const state = run(base, { type: 'update-video', key: ID_A, patch: { title: 'x' } });
    expect(state.fieldErrors.rows[ID_A]).toEqual({ embedUrl: 'L' });
    expect(state.fieldErrors.rows[ID_B]).toEqual({ title: 'other' });
    const both = run(state, { type: 'update-video', key: ID_A, patch: { embedUrl: 'x' } });
    expect(both.fieldErrors.rows[ID_A]).toBeUndefined();
  });

  it('removes the video with that key and its problems', () => {
    const base = { ...loaded(), fieldErrors: { videos: 'V', rows: { [ID_B]: { title: 'T' }, [ID_C]: { title: 'C' } } } };
    const state = run(base, { type: 'remove-video', key: ID_B });
    expect(titles(state)).toEqual(['One', 'Three']);
    expect(state.fieldErrors.rows).toEqual({ [ID_C]: { title: 'C' } });
    expect(state.fieldErrors.videos).toBeUndefined();
  });

  it('removing the last video leaves an empty list', () => {
    const state = run(initialEditorState({ isEdit: false }), { type: 'add-video' });
    expect(run(state, { type: 'remove-video', key: state.form.videos[0].key }).form.videos).toEqual([]);
  });

  describe('moving', () => {
    it.each([
      [0, 2, ['Two', 'Three', 'One']],
      [2, 0, ['Three', 'One', 'Two']],
      [0, 1, ['Two', 'One', 'Three']],
      [1, 0, ['Two', 'One', 'Three']],
      [1, 2, ['One', 'Three', 'Two']],
    ])('from %i to %i gives %j', (from, to, expected) => {
      expect(titles(run(loaded(), { type: 'move-video', from, to }))).toEqual(expected);
    });

    it('keeps each video’s id and key with it', () => {
      const state = run(loaded(), { type: 'move-video', from: 0, to: 2 });
      expect(state.form.videos.map((video) => video.id)).toEqual([ID_B, ID_C, ID_A]);
      expect(state.form.videos.map((video) => video.key)).toEqual([ID_B, ID_C, ID_A]);
    });

    it.each([
      [1, 1],
      [-1, 0],
      [0, -1],
      [3, 0],
      [0, 3],
      [5, 9],
    ])('does nothing for %i to %i (nowhere to go)', (from, to) => {
      const start = loaded();
      expect(run(start, { type: 'move-video', from, to })).toBe(start);
    });

    it('a move is a change the admin has to save', () => {
      const start = loaded();
      expect(run(start, { type: 'move-video', from: 0, to: 1 }).form).not.toBe(start.form);
    });
  });
});

describe('pictures', () => {
  it('a good file is kept to be sent, and shows no problem', () => {
    const base = { ...loaded(), fieldErrors: { coverImage: 'Old problem', rows: {} } };
    const state = run(base, { type: 'set-picture', which: 'cover', file: png() });
    expect(state.form.cover.file).toEqual(png());
    expect(state.form.cover.url).toBe('https://cdn/cover.png');
    expect(state.form.cover.remove).toBe(false);
    expect(state.fieldErrors.coverImage).toBeUndefined();
  });

  it('a file of the wrong type or size is refused with the reason, and the old picture stays', () => {
    const start = loaded();
    const wrongType = run(start, { type: 'set-picture', which: 'cover', file: { type: 'application/pdf', size: 10 } });
    expect(wrongType.form.cover).toEqual(start.form.cover);
    expect(wrongType.fieldErrors.coverImage).toBe('Pictures must be JPG, PNG or WebP.');
    const tooBig = run(start, { type: 'set-picture', which: 'printableImage', file: png(8388609) });
    expect(tooBig.form.printableImage).toEqual(start.form.printableImage);
    expect(tooBig.fieldErrors.printableImage).toBe('The picture is too large. The maximum size is 8 MB.');
  });

  it('a refused file leaves the rest of the form as it was', () => {
    const state = run(loaded(), { type: 'set-field', name: 'title', value: 'Mine' }, { type: 'set-picture', which: 'cover', file: png(9999999) });
    expect(state.form.title).toBe('Mine');
  });

  it('removing a saved picture marks it to be removed', () => {
    const state = run(loaded(), { type: 'remove-picture', which: 'cover' });
    expect(state.form.cover).toEqual({ url: 'https://cdn/cover.png', file: null, remove: true });
  });

  it('removing a picture that was only just chosen leaves nothing to remove on the server when it was never saved', () => {
    const base = run(initialEditorState({ isEdit: false }), { type: 'set-picture', which: 'cover', file: png() });
    expect(run(base, { type: 'remove-picture', which: 'cover' }).form.cover).toEqual({ url: null, file: null, remove: false });
  });

  it('removing a replacement of a saved picture removes the saved one too', () => {
    const state = run(loaded(), { type: 'set-picture', which: 'cover', file: png() }, { type: 'remove-picture', which: 'cover' });
    expect(state.form.cover).toEqual({ url: 'https://cdn/cover.png', file: null, remove: true });
  });

  it('choosing a picture after removing one brings it back as a replacement', () => {
    const state = run(loaded(), { type: 'remove-picture', which: 'cover' }, { type: 'set-picture', which: 'cover', file: png() });
    expect(state.form.cover.remove).toBe(false);
    expect(state.form.cover.file).toEqual(png());
  });

  it('the cover and the printable picture are independent', () => {
    const state = run(loaded(), { type: 'remove-picture', which: 'printableImage' });
    expect(state.form.printableImage.remove).toBe(true);
    expect(state.form.cover.remove).toBe(false);
  });

  it('ignores a picture that is neither', () => {
    const start = loaded();
    expect(run(start, { type: 'set-picture', which: 'title', file: png() })).toBe(start);
    expect(run(start, { type: 'remove-picture', which: 'title' })).toBe(start);
  });

  it('removing a picture clears its problem', () => {
    const base = { ...loaded(), fieldErrors: { coverImage: 'x', printableImage: 'y', rows: {} } };
    const state = run(base, { type: 'remove-picture', which: 'cover' });
    expect(state.fieldErrors.coverImage).toBeUndefined();
    expect(state.fieldErrors.printableImage).toBe('y');
  });
});

describe('saving', () => {
  it('trying to save turns the checking on, and clears the last message', () => {
    const state = run({ ...loaded(), banner: { kind: 'error', message: 'm', reasons: [] } }, { type: 'submit' });
    expect(state.submitted).toBe(true);
    expect(state.banner).toBeNull();
  });

  it('saving is shown while it runs', () => {
    expect(run(loaded(), { type: 'save-start' }).saving).toBe(true);
  });

  it('a failed save keeps the form exactly as typed, and shows the message and the field problems', () => {
    const typed = run(loaded(), { type: 'set-field', name: 'title', value: 'Mine' }, { type: 'save-start' });
    const banner = { kind: 'validation', message: 'Please fix the highlighted fields.', reasons: [] };
    const state = run(typed, { type: 'save-failed', banner, fieldErrors: { title: 'Server says no', rows: {} } });
    expect(state.saving).toBe(false);
    expect(state.form).toBe(typed.form);
    expect(state.banner).toBe(banner);
    expect(state.fieldErrors.title).toBe('Server says no');
  });

  it('a failure that names no field keeps the problems that were already marked', () => {
    const base = { ...loaded(), fieldErrors: { coverImage: 'Too big', rows: {} } };
    const state = run(base, { type: 'save-failed', banner: { kind: 'error', message: 'm', reasons: [] }, fieldErrors: null });
    expect(state.fieldErrors.coverImage).toBe('Too big');
  });

  it('a successful save counts as having nothing unsaved and clears every message', () => {
    const state = run(
      { ...loaded(), banner: { kind: 'error', message: 'm', reasons: [] }, fieldErrors: { title: 'x', rows: {} } },
      { type: 'save-start' },
      { type: 'saved' }
    );
    expect(state).toMatchObject({ saving: false, saved: true, banner: null });
    expect(state.fieldErrors).toBe(NO_ERRORS);
  });

  it('a change after saving is unsaved again', () => {
    const state = run(loaded(), { type: 'saved' }, { type: 'set-field', name: 'title', value: 'More' });
    expect(state.saved).toBe(false);
  });

  it('the message can be dismissed', () => {
    const state = run({ ...loaded(), banner: { kind: 'error', message: 'm', reasons: [] } }, { type: 'dismiss-banner' });
    expect(state.banner).toBeNull();
  });
});

describe('unknown actions', () => {
  it('change nothing', () => {
    const start = loaded();
    expect(run(start, { type: 'whatever' })).toBe(start);
  });
});

describe('rows added by the admin are told apart from saved ones', () => {
  it('two new rows have different keys, and a saved row keeps its id', () => {
    const state = run(loaded(), { type: 'add-video' }, { type: 'add-video' });
    const keys = state.form.videos.map((video) => video.key);
    expect(new Set(keys).size).toBe(5);
    expect(state.form.videos[0].key).toBe(ID_A);
    expect(emptyVideo().key).not.toBe(state.form.videos[3].key);
  });
});

describe('the printable: a link or an uploaded file', () => {
  const pdf = (name = 'Recipe.pdf', size = 1000) => ({ name, size, type: 'application/pdf' });
  const withSavedFile = () =>
    run(initialEditorState({ isEdit: true }), {
      type: 'loaded',
      experience: { ...saved, printable: { link: '', file: 'https://cdn/r.pdf', fileName: 'Recipe.pdf', button: 'Print here', image: null } },
    });

  it('opens on the one the saved printable uses', () => {
    expect(withSavedFile().form.printable.source).toBe('file');
    expect(loaded().form.printable.source).toBe('link');
  });

  it('switches between the two, keeping what was typed and what was chosen', () => {
    let state = run(loaded(), { type: 'set-printable', name: 'link', value: 'https://riseup.kids/a.pdf' });
    state = run(state, { type: 'set-printable-source', source: 'file' }, { type: 'set-document', file: pdf() });
    expect(state.form.printable.source).toBe('file');
    state = run(state, { type: 'set-printable-source', source: 'link' });
    expect(state.form.printable).toMatchObject({ source: 'link', link: 'https://riseup.kids/a.pdf' });
    expect(state.form.printableFile.file).toEqual(pdf());
  });

  it('choosing the one that is already chosen changes nothing', () => {
    const start = loaded();
    expect(run(start, { type: 'set-printable-source', source: 'link' })).toBe(start);
  });

  it('switching clears the link problem and the file problem, but not the others', () => {
    const base = { ...loaded(), fieldErrors: { 'printable.link': 'L', printableFile: 'F', 'printable.button': 'B', title: 'T', rows: {} } };
    const state = run(base, { type: 'set-printable-source', source: 'file' });
    expect(state.fieldErrors['printable.link']).toBeUndefined();
    expect(state.fieldErrors.printableFile).toBeUndefined();
    expect(state.fieldErrors['printable.button']).toBe('B');
    expect(state.fieldErrors.title).toBe('T');
  });

  it('a good file is kept to be sent, and any earlier problem goes', () => {
    const base = { ...loaded(), fieldErrors: { printableFile: 'Old', rows: {} } };
    const state = run(base, { type: 'set-document', file: pdf() });
    expect(state.form.printableFile).toEqual({ url: null, name: '', file: pdf(), remove: false });
    expect(state.fieldErrors.printableFile).toBeUndefined();
  });

  it('a file of the wrong kind, an empty one or a too-big one is refused with the reason, and the old file stays', () => {
    const start = withSavedFile();
    const wrong = run(start, { type: 'set-document', file: pdf('notes.txt') });
    expect(wrong.form.printableFile).toEqual(start.form.printableFile);
    expect(wrong.fieldErrors.printableFile).toBe('The printable must be a PDF or a Word document (DOC or DOCX).');
    expect(run(start, { type: 'set-document', file: pdf('a.pdf', 0) }).fieldErrors.printableFile).toBe('That file is empty.');
    expect(run(start, { type: 'set-document', file: pdf('a.pdf', 20 * 1024 * 1024 + 1) }).fieldErrors.printableFile).toBe(
      'The file is too large. The maximum size is 20 MB.'
    );
  });

  it('removing a saved file marks it to be removed and keeps its name to show', () => {
    const state = run(withSavedFile(), { type: 'remove-document' });
    expect(state.form.printableFile).toEqual({ url: 'https://cdn/r.pdf', name: 'Recipe.pdf', file: null, remove: true });
  });

  it('removing a file that was only just chosen leaves nothing to remove on the server', () => {
    const state = run(loaded(), { type: 'set-document', file: pdf() }, { type: 'remove-document' });
    expect(state.form.printableFile).toEqual({ url: null, name: '', file: null, remove: false });
  });

  it('removing a replacement of a saved file removes the saved one too', () => {
    const state = run(withSavedFile(), { type: 'set-document', file: pdf('New.pdf') }, { type: 'remove-document' });
    expect(state.form.printableFile).toMatchObject({ url: 'https://cdn/r.pdf', file: null, remove: true });
  });

  it('choosing a file after removing the saved one brings it back as a replacement', () => {
    const state = run(withSavedFile(), { type: 'remove-document' }, { type: 'set-document', file: pdf('New.pdf') });
    expect(state.form.printableFile).toMatchObject({ file: pdf('New.pdf'), remove: false });
  });

  it('removing clears the file problem', () => {
    const base = { ...withSavedFile(), fieldErrors: { printableFile: 'x', rows: {} } };
    expect(run(base, { type: 'remove-document' }).fieldErrors.printableFile).toBeUndefined();
  });

  it('is part of what has to be saved, and does not move the starting point', () => {
    const start = withSavedFile();
    const state = run(start, { type: 'set-printable-source', source: 'link' });
    expect(state.initial).toBe(start.initial);
    expect(state.saved).toBe(false);
  });
});
