/**
 * End to end for the Experience add / edit page: the real page, components, hook, reducer and service, with only
 * the network (axios) replaced by a small fake backend.
 *
 * The fake backend does not make up its own rules: it runs what the form sends through the SERVER'S OWN
 * validation code (backend/utils/experienceValidation.util.js), the same functions the controller uses. So a form
 * that sends something the real server would refuse fails here, and the field problems the page shows are the
 * ones the real server would give.
 *
 * Covers what the admin sees and does: adding an experience (every field, videos, pictures, printable, publishing),
 * editing a saved one, every kind of problem (the form's own, the server's, a lost connection, someone else saving
 * first, the experience deleted meanwhile) and leaving with unsaved work.
 */
import React from 'react';
import { createRequire } from 'node:module';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../../../api/axios';
import theme from '../../../config/theme';
import uiReducer from '../../../store/slices/uiSlice';
import AdminDialogBox from '../../common/AdminDialogBox';
import AdminExperienceEditor from '../../../pages/admin/AdminExperienceEditor';

// The page is big (up to 20 videos, each with two text boxes) and the whole suite runs these in parallel with others.
vi.setConfig({ testTimeout: 30000 });

const nodeRequire = createRequire(import.meta.url);
const server = nodeRequire('../../../../../backend/utils/experienceValidation.util.js');

// ---------------------------------------------------------------- a fake backend that uses the server's own rules

const LINK = (n) => `https://iframe.mediadelivery.net/embed/777/video-${n}`;
const hex = (n) => n.toString(16).padStart(24, '0');
const backendError = (status, data) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
const copy = (value) => JSON.parse(JSON.stringify(value));

let db;
let saves;
let nextId;
let failures;

const saved = (n = 1, overrides = {}) => ({
  uuid: `3f2b8c1e-5d4a-4b7e-8c9d-0a1b2c3d4e${String(n).padStart(2, '0')}`,
  title: `Strawberry ${n}`,
  description: 'Make a smoothie',
  coverImage: 'https://cdn.test/cover.png',
  videos: [1, 2, 3].map((i) => ({ id: hex(n * 10 + i), title: `Video ${i}`, embedUrl: LINK(i), position: i })),
  printable: { image: 'https://cdn.test/print.png', link: 'https://riseup.kids/downloads/recipe.pdf', button: 'Print recipe here' },
  order: n,
  isPublished: false,
  publishedAt: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z',
  ...overrides,
});

/** The way the controller reads a request: text fields, and the videos and printable as JSON text. */
const readInput = (body) => {
  const input = {};
  for (const key of ['title', 'description', 'isPublished']) if (body.has(key)) input[key] = body.get(key);
  for (const key of ['videos', 'printable']) if (body.has(key)) input[key] = JSON.parse(body.get(key));
  return input;
};

const save = (uuid, body) => {
  const isEdit = Boolean(uuid);
  const input = readInput(body);
  const files = { coverImage: body.get('coverImage'), printableImage: body.get('printableImage') };
  const record = { isEdit, input, files, flags: { removeCover: body.get('removeCoverImage'), removePrintable: body.get('removePrintableImage') }, expectedUpdatedAt: body.get('expectedUpdatedAt'), fields: Array.from(body.keys()) };
  saves.push(record);

  const doc = isEdit ? db.find((item) => item.uuid === uuid) : null;
  if (isEdit && !doc) throw backendError(404, { success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' });
  if (isEdit && record.expectedUpdatedAt && record.expectedUpdatedAt !== doc.updatedAt) {
    throw backendError(409, {
      success: false,
      code: 'EXPERIENCE_CONFLICT',
      message: 'Someone else changed this experience while you were editing. Reload it and try again.',
    });
  }

  const { value, errors } = server.validateExperienceInput(input, { partial: isEdit });
  if (errors.length) throw backendError(400, { success: false, code: 'VALIDATION_FAILED', message: 'Please fix the highlighted fields.', errors });

  const next = isEdit
    ? copy(doc)
    : { uuid: `3f2b8c1e-5d4a-4b7e-8c9d-0a1b2c3d4f${String(db.length + 1).padStart(2, '0')}`, description: '', coverImage: null, videos: [], printable: { image: null, link: '', button: 'Print here' }, order: db.length + 1, isPublished: false, publishedAt: null, createdAt: '2026-11-12T08:00:00.000Z' };
  if (value.title !== undefined) next.title = value.title;
  if (value.description !== undefined) next.description = value.description;
  if (value.videos !== undefined) {
    next.videos = value.videos.map((video, index) => {
      nextId += 1;
      return { id: video._id || hex(1000 + nextId), title: video.title, embedUrl: video.embedUrl, position: index + 1 };
    });
  }
  if (value.printable !== undefined) next.printable = { ...next.printable, link: value.printable.link, button: value.printable.button };
  if (value.isPublished !== undefined) next.isPublished = value.isPublished;
  if (next.isPublished) {
    const problems = server.findPublishProblems(next);
    if (problems.length) throw backendError(422, { success: false, code: 'PUBLISH_BLOCKED', message: 'This experience cannot be published yet.', errors: problems });
  }
  if (files.coverImage) next.coverImage = `https://cdn.test/${files.coverImage.name}`;
  else if (record.flags.removeCover === 'true') next.coverImage = null;
  if (files.printableImage) next.printable.image = `https://cdn.test/${files.printableImage.name}`;
  else if (record.flags.removePrintable === 'true') next.printable.image = null;
  next.updatedAt = new Date(Date.parse(isEdit ? doc.updatedAt : '2026-11-12T08:00:00.000Z') + 60000).toISOString();

  if (isEdit) db[db.findIndex((item) => item.uuid === uuid)] = next;
  else db.push(next);
  return { data: { success: true, message: isEdit ? 'Experience updated.' : 'Experience created.', data: copy(next) } };
};

beforeAll(() => {
  configure({ defaultHidden: true });
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});
afterAll(() => configure({ defaultHidden: false }));

beforeEach(() => {
  vi.clearAllMocks();
  db = [saved(1)];
  saves = [];
  nextId = 0;
  failures = { get: null, post: null, put: null };

  api.get.mockImplementation(async (url) => {
    if (failures.get) throw failures.get();
    const uuid = decodeURIComponent(url.split('/')[3]);
    const found = db.find((item) => item.uuid === uuid);
    if (!found) throw backendError(404, { success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' });
    return { data: { success: true, data: copy(found) } };
  });
  api.post.mockImplementation(async (url, body) => {
    if (failures.post) throw failures.post();
    return save(null, body);
  });
  api.put.mockImplementation(async (url, body) => {
    if (failures.put) throw failures.put();
    return save(decodeURIComponent(url.split('/')[3]), body);
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------- the page

const Where = () => <output data-testid="where">{useLocation().pathname}</output>;
const where = () => screen.getByTestId('where').textContent;

const renderEditor = (path = '/admin/experiences/create') => {
  const store = configureStore({ reducer: { ui: uiReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/admin/experiences" element={<main>The list</main>} />
            <Route path="/admin/experiences/create" element={<AdminExperienceEditor />} />
            <Route path="/admin/experiences/:uuid/edit" element={<AdminExperienceEditor />} />
          </Routes>
          <Where />
        </MemoryRouter>
        <AdminDialogBox />
      </ThemeProvider>
    </Provider>
  );
  return { store, user: userEvent.setup() };
};

const editPath = (n = 1) => `/admin/experiences/${saved(n).uuid}/edit`;
const openEdit = async (n = 1) => {
  const result = renderEditor(editPath(n));
  await screen.findByLabelText('Title');
  return result;
};

const notice = (store) => store.getState().ui.notification;
const type = (label, text) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } });
const field = (label) => screen.getByLabelText(label);
const button = (name) => screen.getByRole('button', { name });
const saveStatus = () => within(screen.getByRole('region', { name: 'Save the experience' })).getByRole('status');
const publishedSwitch = () => screen.getByRole('checkbox', { name: 'Published' });
const create = (user) => user.click(button('Create experience'));
const saveChanges = (user) => user.click(button('Save changes'));
const png = (name = 'cover.png', size = 1000, mime = 'image/png') => new File([new Uint8Array(size)], name, { type: mime });
const upload = (user, label, file) => user.upload(screen.getByLabelText(label), file);
const lastSave = () => saves[saves.length - 1];
const sentVideos = () => lastSave().input.videos;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Adds a video row and fills it in. */
const addVideo = async (user, number, title, link) => {
  await user.click(button('Add video'));
  type(`Video ${number} title`, title);
  type(`Video ${number} Bunny link`, link);
};

// ================================================================ adding an experience

describe('adding: the empty form', () => {
  it('shows every part of the form, empty, as a draft', () => {
    renderEditor();
    expect(screen.getByRole('heading', { level: 1, name: 'Add experience' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('');
    expect(field('Description')).toHaveValue('');
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(publishedSwitch()).not.toBeChecked();
    expect(screen.getByText('A draft. Children cannot see it yet.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cover picture' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Printable' })).toBeInTheDocument();
    expect(field('Link to the file')).toHaveValue('');
    expect(field('Button text')).toHaveValue('');
    expect(button('Create experience')).toBeEnabled();
    expect(button('Cancel')).toBeEnabled();
  });

  it('shows how many videos there are of the 20 allowed', () => {
    renderEditor();
    expect(screen.getByText('0 of 20')).toBeInTheDocument();
  });

  it('does not ask the server for anything just to open', () => {
    renderEditor();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('shows no problems before the admin has tried to save', () => {
    renderEditor();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('adding: the details', () => {
  it('counts the characters of the title and the description as they are typed', () => {
    renderEditor();
    type('Title', 'Smoothie');
    expect(screen.getByLabelText('8 of 200 characters')).toHaveTextContent('8 / 200');
    type('Description', 'Make one');
    expect(screen.getByLabelText('8 of 1000 characters')).toHaveTextContent('8 / 1000');
  });

  it('does not count the spaces around the text', () => {
    renderEditor();
    type('Title', '   Smoothie   ');
    expect(screen.getByLabelText('8 of 200 characters')).toBeInTheDocument();
  });

  it('a title is required: saving without one says so, next to the field, and takes the cursor there', async () => {
    const { user } = renderEditor();
    await create(user);
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(field('Title')).toHaveFocus();
    expect(field('Title')).toBeInvalid();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('says how many things need fixing, once', async () => {
    const { user } = renderEditor();
    await create(user);
    expect(screen.getByText(/There is 1 thing to fix before this can be saved\./)).toBeInTheDocument();
    type('Title', 'a'.repeat(201));
    type('Description', 'a'.repeat(1001));
    expect(screen.getByText(/There are 2 things to fix before this can be saved\./)).toBeInTheDocument();
  });

  it('a title of 201 characters is refused, 200 is fine', async () => {
    const { user } = renderEditor();
    type('Title', 'a'.repeat(201));
    await create(user);
    expect(screen.getByText('Title cannot exceed 200 characters.')).toBeInTheDocument();
    type('Title', 'a'.repeat(200));
    expect(screen.queryByText('Title cannot exceed 200 characters.')).not.toBeInTheDocument();
    await create(user);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('a description of 1001 characters is refused, 1000 is fine', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Description', 'a'.repeat(1001));
    await create(user);
    expect(screen.getByText('Description cannot exceed 1000 characters.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    type('Description', 'a'.repeat(1000));
    await create(user);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('once the admin has tried to save, a problem disappears the moment it is fixed (no second try needed)', async () => {
    const { user } = renderEditor();
    await create(user);
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    type('Title', 'Smoothie');
    expect(screen.queryByText('Title is required.')).not.toBeInTheDocument();
    expect(screen.queryByText(/thing to fix/)).not.toBeInTheDocument();
  });
});

describe('adding: saving a draft', () => {
  it('sends the details as the server reads them, and goes back to the list with a message', async () => {
    const { user, store } = renderEditor();
    type('Title', '  Smoothie  ');
    type('Description', 'Make one');
    await create(user);

    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post.mock.calls[0][0]).toBe('/admin/experiences');
    expect(api.post.mock.calls[0][2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
    expect(lastSave().input).toEqual({ title: '  Smoothie  '.trim(), description: 'Make one', isPublished: 'false', videos: [], printable: { link: '', button: '' } });
    expect(lastSave().fields).not.toContain('expectedUpdatedAt');
    expect(notice(store)).toMatchObject({ message: '"Smoothie" was created.', type: 'success', open: true });
    expect(db).toHaveLength(2);
    expect(db[1]).toMatchObject({ title: 'Smoothie', isPublished: false, printable: { button: 'Print here' } });
  });

  it('the experience is created at the end of the list, unpublished', async () => {
    const { user } = renderEditor();
    type('Title', 'Second');
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(db[1]).toMatchObject({ order: 2, isPublished: false });
  });
});

describe('adding: videos', () => {
  it('Add video adds a numbered row and puts the cursor in its title', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    expect(screen.queryByText('No videos yet')).not.toBeInTheDocument();
    expect(field('Video 1 title')).toHaveFocus();
    expect(screen.getByLabelText('Position 1')).toHaveTextContent('1');
    expect(screen.getByText('1 of 20')).toBeInTheDocument();
    await user.click(button('Add video'));
    expect(field('Video 2 title')).toHaveFocus();
    expect(screen.getByLabelText('Position 2')).toHaveTextContent('2');
  });

  it('sends the videos in the order they are shown, with trimmed text, and no id or position', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    await addVideo(user, 1, '  Vocabulary  ', `  ${LINK(1)}  `);
    await addVideo(user, 2, 'The story', LINK(2));
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos()).toEqual([
      { title: 'Vocabulary', embedUrl: LINK(1) },
      { title: 'The story', embedUrl: LINK(2) },
    ]);
    expect(db[1].videos.map((video) => [video.title, video.position])).toEqual([['Vocabulary', 1], ['The story', 2]]);
  });

  it('a link from the Bunny "player" address is the same video: it is shown, and saved, as the embed link', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await user.click(button('Add video'));
    type('Video 1 title', 'One');
    await user.click(field('Video 1 Bunny link'));
    type('Video 1 Bunny link', 'https://player.mediadelivery.net/embed/777/video-1');
    await user.tab(); // leaves the link box
    expect(field('Video 1 Bunny link')).toHaveValue(LINK(1));
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos()[0].embedUrl).toBe(LINK(1));
  });

  it('leaving a link box tidies spaces but leaves a wrong link as the admin typed it', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    await user.click(field('Video 1 Bunny link'));
    type('Video 1 Bunny link', '  https://example.com/x  ');
    await user.tab();
    expect(field('Video 1 Bunny link')).toHaveValue('https://example.com/x');
  });

  it('each video needs a title and a Bunny link: the problems show in that row, and the cursor goes to the first', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await user.click(button('Add video'));
    await create(user);
    expect(screen.getByText('Video title is required.')).toBeInTheDocument();
    expect(screen.getByText('Video link is required.')).toBeInTheDocument();
    expect(field('Video 1 title')).toHaveFocus();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('refuses a link that is not a Bunny embed link, and says what one looks like', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await addVideo(user, 1, 'One', 'https://www.youtube.com/watch?v=abc');
    await create(user);
    expect(screen.getByText('Use a Bunny embed link like https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO.')).toBeInTheDocument();
    expect(field('Video 1 Bunny link')).toBeInvalid();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('refuses the same video twice, naming the first', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await addVideo(user, 1, 'One', LINK(1));
    await addVideo(user, 2, 'Two', LINK(1));
    await create(user);
    expect(screen.getByText('This video is already in the list (video 1).')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('a video title of 201 characters is refused', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await addVideo(user, 1, 'a'.repeat(201), LINK(1));
    await create(user);
    expect(screen.getByText('Video title cannot exceed 200 characters.')).toBeInTheDocument();
  });

  it('a video row problem disappears when it is fixed, and only that one', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await user.click(button('Add video'));
    await create(user);
    type('Video 1 title', 'One');
    expect(screen.queryByText('Video title is required.')).not.toBeInTheDocument();
    expect(screen.getByText('Video link is required.')).toBeInTheDocument();
  });

  it('Remove takes the video out and the ones after it move up a place', async () => {
    const { user } = renderEditor();
    await addVideo(user, 1, 'One', LINK(1));
    await addVideo(user, 2, 'Two', LINK(2));
    await addVideo(user, 3, 'Three', LINK(3));
    await user.click(button('Remove video 2'));
    expect(field('Video 1 title')).toHaveValue('One');
    expect(field('Video 2 title')).toHaveValue('Three');
    expect(screen.queryByLabelText('Video 3 title')).not.toBeInTheDocument();
    expect(screen.getByText('2 of 20')).toBeInTheDocument();
  });

  it('removing the last video shows the empty message again', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    await user.click(button('Remove video 1'));
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
  });

  it('can be moved up and down with the arrows, and the numbers follow', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await addVideo(user, 1, 'One', LINK(1));
    await addVideo(user, 2, 'Two', LINK(2));
    await addVideo(user, 3, 'Three', LINK(3));

    await user.click(button('Move video 3 up'));
    expect([1, 2, 3].map((n) => field(`Video ${n} title`).value)).toEqual(['One', 'Three', 'Two']);
    await user.click(button('Move video 1 down'));
    expect([1, 2, 3].map((n) => field(`Video ${n} title`).value)).toEqual(['Three', 'One', 'Two']);

    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos().map((video) => video.title)).toEqual(['Three', 'One', 'Two']);
    expect(db[1].videos.map((video) => video.position)).toEqual([1, 2, 3]);
  });

  it('the first video cannot go up and the last cannot go down', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    await user.click(button('Add video'));
    expect(button('Move video 1 up')).toBeDisabled();
    expect(button('Move video 1 down')).toBeEnabled();
    expect(button('Move video 2 up')).toBeEnabled();
    expect(button('Move video 2 down')).toBeDisabled();
  });

  it('a video can be dragged: every row has a handle that can be picked up', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    await user.click(button('Add video'));
    const handle = button('Drag to reorder video 1');
    expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
    expect(button('Drag to reorder video 2')).toBeInTheDocument();
  });

  it('stops at 20 videos and says so', async () => {
    const { user } = renderEditor();
    for (let i = 0; i < 20; i += 1) fireEvent.click(button('Add video'));
    expect(screen.getByText('20 of 20')).toBeInTheDocument();
    expect(button('Add video')).toBeDisabled();
    expect(screen.getByText('You have reached the limit of 20 videos.')).toBeInTheDocument();
    await user.click(button('Remove video 20'));
    expect(button('Add video')).toBeEnabled();
    expect(screen.queryByText('You have reached the limit of 20 videos.')).not.toBeInTheDocument();
  });
});

describe('adding: previewing a video', () => {
  it('plays the video in a pop-up, with its title, and closes again', async () => {
    const { user } = renderEditor();
    await addVideo(user, 1, 'Vocabulary', LINK(1));
    await user.click(button('Preview video 1'));
    const dialog = screen.getByRole('dialog', { name: 'Vocabulary' });
    expect(within(dialog).getByTitle('Preview of Vocabulary')).toHaveAttribute('src', LINK(1));
    await user.click(within(dialog).getByRole('button', { name: 'Close preview' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Vocabulary' })).not.toBeInTheDocument());
  });

  it('previews a player link as the embed link it will be saved as', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    type('Video 1 Bunny link', 'https://player.mediadelivery.net/embed/777/video-1');
    await user.click(button('Preview video 1'));
    expect(screen.getByTitle('Preview of Video 1')).toHaveAttribute('src', LINK(1));
  });

  it('cannot preview a video with no link, or a wrong one', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    expect(button('Preview video 1')).toBeDisabled();
    type('Video 1 Bunny link', 'https://example.com/nope');
    expect(button('Preview video 1')).toBeDisabled();
    type('Video 1 Bunny link', LINK(1));
    expect(button('Preview video 1')).toBeEnabled();
  });

  it('opens nothing until asked', () => {
    renderEditor();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('adding: publishing', () => {
  it('turning Published on with nothing to show says what is missing', async () => {
    const { user } = renderEditor();
    await user.click(publishedSwitch());
    expect(publishedSwitch()).toBeChecked();
    expect(screen.getByText('Children can see it under Explore.')).toBeInTheDocument();
    expect(screen.getByText(/To publish it, add a title and at least one video\./)).toBeInTheDocument();
  });

  it('the warning shrinks as things are added, and goes when there is nothing missing', async () => {
    const { user } = renderEditor();
    await user.click(publishedSwitch());
    type('Title', 'T');
    expect(screen.getByText(/To publish it, add at least one video\./)).toBeInTheDocument();
    await addVideo(user, 1, 'One', LINK(1));
    expect(screen.queryByText(/To publish it/)).not.toBeInTheDocument();
  });

  it('there is no warning for a draft', async () => {
    renderEditor();
    expect(screen.queryByText(/To publish it/)).not.toBeInTheDocument();
  });

  it('saving as published with no video is refused on the video list, and the cursor goes to Add video', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await user.click(publishedSwitch());
    await create(user);
    expect(screen.getByText('Add at least one video before publishing.')).toBeInTheDocument();
    expect(button('Add video')).toHaveFocus();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('turning Published off again lets it be saved as a draft', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await user.click(publishedSwitch());
    await create(user);
    expect(screen.getByText('Add at least one video before publishing.')).toBeInTheDocument();
    await user.click(publishedSwitch());
    expect(screen.queryByText('Add at least one video before publishing.')).not.toBeInTheDocument();
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().input.isPublished).toBe('false');
  });

  it('a complete experience is created published', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await addVideo(user, 1, 'One', LINK(1));
    await user.click(publishedSwitch());
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().input.isPublished).toBe('true');
    expect(db[1]).toMatchObject({ isPublished: true });
  });
});

describe('adding: pictures', () => {
  it('shows a chosen cover picture, sends it, and the server keeps it', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await upload(user, 'Cover picture file', png('cover.png'));
    expect(screen.getByAltText('Cover picture preview')).toHaveAttribute('src', 'blob:cover.png');
    expect(within(screen.getByRole('region', { name: 'Cover picture' })).getByRole('button', { name: 'Replace picture' })).toBeInTheDocument();
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().files.coverImage.name).toBe('cover.png');
    expect(db[1].coverImage).toBe('https://cdn.test/cover.png');
  });

  it('a picture of another type is refused with the reason, and nothing is chosen', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Cover picture file'), { target: { files: [png('notes.gif', 100, 'image/gif')] } });
    expect(screen.getByText('Pictures must be JPG, PNG or WebP.')).toBeInTheDocument();
    expect(screen.queryByAltText('Cover picture preview')).not.toBeInTheDocument();
  });

  it('a picture over 8 MB is refused', async () => {
    const { user } = renderEditor();
    await upload(user, 'Cover picture file', png('big.png', 8 * 1024 * 1024 + 1));
    expect(screen.getByText('The picture is too large. The maximum size is 8 MB.')).toBeInTheDocument();
  });

  it('exactly 8 MB is accepted', async () => {
    const { user } = renderEditor();
    await upload(user, 'Cover picture file', png('exact.png', 8 * 1024 * 1024));
    expect(screen.queryByText(/too large/)).not.toBeInTheDocument();
    expect(screen.getByAltText('Cover picture preview')).toBeInTheDocument();
  });

  it('a good picture after a refused one clears the problem', async () => {
    const { user } = renderEditor();
    await upload(user, 'Cover picture file', png('big.png', 8 * 1024 * 1024 + 1));
    await upload(user, 'Cover picture file', png('ok.png'));
    expect(screen.queryByText(/too large/)).not.toBeInTheDocument();
  });

  it('Remove clears a chosen picture, and the same file can be chosen again', async () => {
    const { user } = renderEditor();
    const file = png('cover.png');
    await upload(user, 'Cover picture file', file);
    await user.click(within(screen.getByRole('region', { name: 'Cover picture' })).getByRole('button', { name: 'Remove' }));
    expect(screen.queryByAltText('Cover picture preview')).not.toBeInTheDocument();
    await upload(user, 'Cover picture file', file);
    expect(screen.getByAltText('Cover picture preview')).toBeInTheDocument();
  });

  it('the preview is released from memory when the picture changes', async () => {
    const { user } = renderEditor();
    await upload(user, 'Cover picture file', png('one.png'));
    await upload(user, 'Cover picture file', png('two.png'));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one.png');
  });

  it('the cover and the printable picture are separate', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    await upload(user, 'Printable picture file', png('print.webp', 500, 'image/webp'));
    expect(screen.queryByAltText('Cover picture preview')).not.toBeInTheDocument();
    expect(screen.getByAltText('Printable picture preview')).toBeInTheDocument();
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().files.printableImage.name).toBe('print.webp');
    expect(lastSave().files.coverImage).toBeNull();
    expect(db[1].printable.image).toBe('https://cdn.test/print.webp');
  });
});

describe('adding: the printable', () => {
  it('sends the link and the button text', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Link to the file', 'https://riseup.kids/downloads/recipe.pdf');
    type('Button text', 'Print recipe here');
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().input.printable).toEqual({ link: 'https://riseup.kids/downloads/recipe.pdf', button: 'Print recipe here' });
    expect(db[1].printable).toMatchObject({ link: 'https://riseup.kids/downloads/recipe.pdf', button: 'Print recipe here' });
  });

  it('an empty button text becomes "Print here" on the server', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Link to the file', 'https://riseup.kids/a.pdf');
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(db[1].printable.button).toBe('Print here');
  });

  it('refuses a link that is not a link, and one that is not https', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Link to the file', 'riseup.kids/a.pdf');
    await create(user);
    expect(screen.getByText('Printable link is not a valid link.')).toBeInTheDocument();
    type('Link to the file', 'http://riseup.kids/a.pdf');
    expect(screen.getByText('Printable link must use https.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('a link to another website passes the form but the server refuses it, and says so next to the link', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Link to the file', 'https://example.com/a.pdf');
    await create(user);
    expect(await screen.findByText('Printable link must be a file on our own website (no outside links).')).toBeInTheDocument();
    expect(field('Link to the file')).toBeInvalid();
    expect(field('Title')).toHaveValue('T');
    expect(where()).toBe('/admin/experiences/create');
  });

  it('the button text takes 60 characters and refuses 61', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Button text', 'a'.repeat(61));
    await create(user);
    expect(screen.getByText('Printable button text cannot exceed 60 characters.')).toBeInTheDocument();
    type('Button text', 'a'.repeat(60));
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
  });
});

// ================================================================ what goes wrong while saving

describe('saving: problems', () => {
  it('a server refusal puts every message next to its own field and keeps everything typed', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    await addVideo(user, 1, 'One', LINK(1));
    // The server also refuses what only it knows: a printable on another website.
    type('Link to the file', 'https://example.com/a.pdf');
    await create(user);
    expect(await screen.findByText('Please fix the highlighted fields.')).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Smoothie');
    expect(field('Video 1 title')).toHaveValue('One');
    expect(field('Link to the file')).toHaveFocus();
  });

  it('a server problem goes away when its field is edited', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Link to the file', 'https://example.com/a.pdf');
    await create(user);
    await screen.findByText('Printable link must be a file on our own website (no outside links).');
    type('Link to the file', 'https://riseup.kids/a.pdf');
    expect(screen.queryByText('Printable link must be a file on our own website (no outside links).')).not.toBeInTheDocument();
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
  });

  it('a server error shows a message, keeps the form, and Save can be tried again', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    failures.post = () => backendError(500, { success: false, message: 'Something went wrong.' });
    await create(user);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('The experience was not saved')).toBeInTheDocument();
    expect(within(alert).getByText('Something went wrong.')).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Smoothie');
    expect(where()).toBe('/admin/experiences/create');
    expect(button('Create experience')).toBeEnabled();

    failures.post = null;
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(db).toHaveLength(2);
  });

  it('a lost connection says so, and keeps the form', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    failures.post = networkError;
    await create(user);
    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Smoothie');
  });

  it.each([
    [413, 'FILE_TOO_LARGE', 'The picture is too large. The maximum size is 8 MB.'],
    [415, 'UNSUPPORTED_FILE_TYPE', 'Pictures must be JPG, PNG or WebP.'],
    [502, 'IMAGE_UPLOAD_FAILED', 'We could not save the picture. Please try again.'],
  ])('a %i about a picture shows what the server said', async (status, code, message) => {
    const { user } = renderEditor();
    type('Title', 'T');
    failures.post = () => backendError(status, { success: false, code, message });
    await create(user);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(field('Title')).toHaveValue('T');
  });

  it('the message can be dismissed', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    failures.post = () => backendError(500, { message: 'Broken.' });
    await create(user);
    await screen.findByText('Broken.');
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(screen.queryByText('Broken.')).not.toBeInTheDocument();
  });

  it('a new try clears the last message', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    failures.post = () => backendError(500, { message: 'Broken.' });
    await create(user);
    await screen.findByText('Broken.');
    const pending = deferred();
    failures.post = null;
    api.post.mockImplementationOnce(() => pending.promise);
    await create(user);
    expect(screen.queryByText('Broken.')).not.toBeInTheDocument();
    pending.resolve({ data: { success: true, data: { uuid: 'n', title: 'T' } } });
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
  });
});

describe('saving: while it works', () => {
  it('shows it is saving, blocks everything, and never sends twice', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    const pending = deferred();
    api.post.mockImplementationOnce(() => pending.promise);
    await create(user);

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(saveStatus()).toHaveTextContent('Saving…');
    expect(button('Cancel')).toBeDisabled();
    expect(button('Back to experiences')).toBeDisabled();
    expect(field('Title')).toBeDisabled();
    expect(button('Add video')).toBeDisabled();
    expect(publishedSwitch()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(api.post).toHaveBeenCalledTimes(1);

    pending.resolve({ data: { success: true, message: 'Experience created.', data: { uuid: 'n', title: 'Smoothie' } } });
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('after a failure everything works again', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    const pending = deferred();
    api.post.mockImplementationOnce(() => pending.promise);
    await create(user);
    await screen.findByRole('button', { name: 'Saving…' });
    pending.reject(backendError(500, { message: 'Broken.' }));
    await screen.findByText('Broken.');
    expect(field('Title')).toBeEnabled();
    expect(button('Cancel')).toBeEnabled();
    expect(button('Create experience')).toBeEnabled();
  });
});

// ================================================================ leaving

describe('leaving the page', () => {
  it('Cancel with nothing typed goes straight back to the list', async () => {
    const { user } = renderEditor();
    await user.click(button('Cancel'));
    expect(where()).toBe('/admin/experiences');
  });

  it('the back arrow does the same', async () => {
    const { user } = renderEditor();
    await user.click(button('Back to experiences'));
    expect(where()).toBe('/admin/experiences');
  });

  it('Cancel with unsaved work asks first, and Keep editing keeps everything', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    await user.click(button('Cancel'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Leave without saving?')).toBeInTheDocument();
    expect(within(dialog).getByText('You have unsaved changes. If you leave now, they will be lost.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(where()).toBe('/admin/experiences/create');
    expect(field('Title')).toHaveValue('Smoothie');
  });

  it('Leave goes back to the list and the work is not saved', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    await user.click(button('Cancel'));
    await user.click(await screen.findByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('the back arrow asks too', async () => {
    const { user } = renderEditor();
    await user.click(button('Add video'));
    await user.click(button('Back to experiences'));
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
  });

  it('closing the tab or reloading with unsaved work makes the browser ask; with nothing unsaved it does not', () => {
    renderEditor();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    type('Title', 'Smoothie');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('undoing a change makes it clean again', () => {
    renderEditor();
    type('Title', 'Smoothie');
    type('Title', '');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('stops asking once the page is closed', () => {
    renderEditor();
    type('Title', 'Smoothie');
    cleanup();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('a saved experience is not asked about on the way out', async () => {
    const { user } = renderEditor();
    type('Title', 'Smoothie');
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument();
  });
});

// ================================================================ editing

describe('editing: opening', () => {
  it('shows that it is loading, then the whole experience', async () => {
    const pending = deferred();
    api.get.mockImplementationOnce(() => pending.promise);
    renderEditor(editPath());
    expect(screen.getByRole('status', { name: 'Loading the experience' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Edit experience' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    pending.resolve({ data: { success: true, data: copy(saved(1)) } });
    await screen.findByLabelText('Title');
    expect(screen.queryByRole('status', { name: 'Loading the experience' })).not.toBeInTheDocument();
  });

  it('asks for that experience only', async () => {
    await openEdit();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(`/admin/experiences/${saved(1).uuid}`);
  });

  it('fills in everything: details, videos in their order with their positions, status, pictures and printable', async () => {
    await openEdit();
    expect(field('Title')).toHaveValue('Strawberry 1');
    expect(field('Description')).toHaveValue('Make a smoothie');
    expect([1, 2, 3].map((n) => field(`Video ${n} title`).value)).toEqual(['Video 1', 'Video 2', 'Video 3']);
    expect([1, 2, 3].map((n) => field(`Video ${n} Bunny link`).value)).toEqual([LINK(1), LINK(2), LINK(3)]);
    expect([1, 2, 3].map((n) => screen.getByLabelText(`Position ${n}`).textContent)).toEqual(['1', '2', '3']);
    expect(screen.getByText('3 of 20')).toBeInTheDocument();
    expect(publishedSwitch()).not.toBeChecked();
    expect(screen.getByAltText('Cover picture preview')).toHaveAttribute('src', 'https://cdn.test/cover.png');
    expect(screen.getByAltText('Printable picture preview')).toHaveAttribute('src', 'https://cdn.test/print.png');
    expect(field('Link to the file')).toHaveValue('https://riseup.kids/downloads/recipe.pdf');
    expect(field('Button text')).toHaveValue('Print recipe here');
    expect(screen.getByText('Updated 10 Nov 2026')).toBeInTheDocument();
  });

  it('a published experience shows as published', async () => {
    db = [saved(1, { isPublished: true })];
    await openEdit();
    expect(publishedSwitch()).toBeChecked();
    expect(screen.getByText('Children can see it under Explore.')).toBeInTheDocument();
  });

  it('an experience without a cover, printable or videos opens with empty parts', async () => {
    db = [saved(1, { coverImage: null, videos: [], description: '', printable: { image: null, link: '', button: 'Print here' } })];
    await openEdit();
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(screen.queryByAltText('Cover picture preview')).not.toBeInTheDocument();
    ['Cover picture', 'Printable'].forEach((name) => {
      const region = screen.getByRole('region', { name });
      expect(within(region).getByRole('button', { name: 'Choose picture' })).toBeInTheDocument();
      expect(within(region).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });
    expect(field('Link to the file')).toHaveValue('');
  });

  it('says nothing is changed yet, and Save waits until something is', async () => {
    await openEdit();
    expect(saveStatus()).toHaveTextContent('No changes yet');
    expect(button('Save changes')).toBeDisabled();
    type('Title', 'Strawberry One');
    expect(saveStatus()).toHaveTextContent('You have unsaved changes');
    expect(button('Save changes')).toBeEnabled();
    type('Title', 'Strawberry 1');
    expect(button('Save changes')).toBeDisabled();
  });

  it('an experience that does not exist says so and offers the way back', async () => {
    const { user } = renderEditor('/admin/experiences/3f2b8c1e-5d4a-4b7e-8c9d-000000000000/edit');
    expect(await screen.findByText('This experience no longer exists. It may have been deleted.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Back to experiences' }));
    expect(where()).toBe('/admin/experiences');
  });

  it('a failed load says why, and Retry loads it', async () => {
    failures.get = () => backendError(500, { success: false, message: 'Server is down.' });
    const { user } = renderEditor(editPath());
    expect(await screen.findByText('Server is down.')).toBeInTheDocument();
    failures.get = null;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Title')).toHaveValue('Strawberry 1');
  });

  it('an unreachable server says so', async () => {
    failures.get = networkError;
    renderEditor(editPath());
    expect(await screen.findByText('Could not reach the server. Check your connection and try again.')).toBeInTheDocument();
  });

  it('another experience in the address starts a new form (nothing carries over)', async () => {
    db = [saved(1), saved(2)];
    const store = configureStore({ reducer: { ui: uiReducer } });
    const first = render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[editPath(1)]}>
            <Routes>
              <Route path="/admin/experiences/:uuid/edit" element={<AdminExperienceEditor />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
    await screen.findByLabelText('Title');
    type('Title', 'Typed in the first');
    first.unmount();
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[editPath(2)]}>
            <Routes>
              <Route path="/admin/experiences/:uuid/edit" element={<AdminExperienceEditor />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
    await waitFor(() => expect(field('Title')).toHaveValue('Strawberry 2'));
  });
});

describe('editing: saving', () => {
  it('sends the whole experience with what was loaded, so a change by someone else is noticed', async () => {
    const { user, store } = await openEdit();
    type('Title', 'Strawberry Banana');
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put.mock.calls[0][0]).toBe(`/admin/experiences/${saved(1).uuid}`);
    expect(lastSave().expectedUpdatedAt).toBe('2026-11-10T10:00:00.000Z');
    expect(lastSave().input.title).toBe('Strawberry Banana');
    expect(lastSave().input.description).toBe('Make a smoothie');
    expect(lastSave().input.isPublished).toBe('false');
    expect(lastSave().input.printable).toEqual({ link: 'https://riseup.kids/downloads/recipe.pdf', button: 'Print recipe here' });
    expect(notice(store)).toMatchObject({ message: '"Strawberry Banana" was saved.', type: 'success' });
    expect(db[0].title).toBe('Strawberry Banana');
  });

  it('sends each saved video with its id, in the order shown, and no position', async () => {
    const { user } = await openEdit();
    await user.click(button('Move video 3 up'));
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos()).toEqual([
      { id: hex(11), title: 'Video 1', embedUrl: LINK(1) },
      { id: hex(13), title: 'Video 3', embedUrl: LINK(3) },
      { id: hex(12), title: 'Video 2', embedUrl: LINK(2) },
    ]);
    expect(db[0].videos.map((video) => [video.id, video.position])).toEqual([[hex(11), 1], [hex(13), 2], [hex(12), 3]]);
  });

  it('a video added in the edit has no id and is saved with the rest', async () => {
    const { user } = await openEdit();
    await addVideo(user, 4, 'Fourth', LINK(4));
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos()[3]).toEqual({ title: 'Fourth', embedUrl: LINK(4) });
    expect(sentVideos().slice(0, 3).every((video) => video.id)).toBe(true);
    expect(db[0].videos).toHaveLength(4);
  });

  it('a removed video is left out', async () => {
    const { user } = await openEdit();
    await user.click(button('Remove video 1'));
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos().map((video) => video.title)).toEqual(['Video 2', 'Video 3']);
  });

  it('editing a video’s title or link keeps it the same row (same id)', async () => {
    const { user } = await openEdit();
    type('Video 2 title', 'Second');
    type('Video 2 Bunny link', LINK(9));
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(sentVideos()[1]).toEqual({ id: hex(12), title: 'Second', embedUrl: LINK(9) });
  });

  it('publishing and hiding are sent', async () => {
    const { user } = await openEdit();
    await user.click(publishedSwitch());
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().input.isPublished).toBe('true');
    expect(db[0].isPublished).toBe(true);

    cleanup();
    await openEdit();
    await user.click(publishedSwitch());
    await saveChanges(user);
    await waitFor(() => expect(lastSave().input.isPublished).toBe('false'));
    expect(db[0].isPublished).toBe(false);
  });

  it('a published experience cannot lose its last video: the form refuses before sending', async () => {
    db = [saved(1, { isPublished: true, videos: [{ id: hex(11), title: 'Only', embedUrl: LINK(1), position: 1 }] })];
    const { user } = await openEdit();
    await user.click(button('Remove video 1'));
    await saveChanges(user);
    expect(screen.getByText('Add at least one video before publishing.')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('clearing the printable link and button saves an empty printable', async () => {
    const { user } = await openEdit();
    type('Link to the file', '');
    type('Button text', '');
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().input.printable).toEqual({ link: '', button: '' });
    expect(db[0].printable.link).toBe('');
  });
});

describe('editing: pictures', () => {
  it('Remove on a saved cover asks the server to remove it', async () => {
    const { user } = await openEdit();
    await user.click(within(screen.getByRole('region', { name: 'Cover picture' })).getByRole('button', { name: 'Remove' }));
    expect(screen.queryByAltText('Cover picture preview')).not.toBeInTheDocument();
    expect(button('Save changes')).toBeEnabled();
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().flags.removeCover).toBe('true');
    expect(lastSave().files.coverImage).toBeNull();
    expect(db[0].coverImage).toBeNull();
    expect(db[0].printable.image).toBe('https://cdn.test/print.png');
  });

  it('a new cover replaces the saved one and nothing is removed', async () => {
    const { user } = await openEdit();
    await upload(user, 'Cover picture file', png('fresh.png'));
    expect(screen.getByAltText('Cover picture preview')).toHaveAttribute('src', 'blob:fresh.png');
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().files.coverImage.name).toBe('fresh.png');
    expect(lastSave().flags.removeCover).toBeNull();
    expect(db[0].coverImage).toBe('https://cdn.test/fresh.png');
  });

  it('removing and replacing the printable picture work the same way', async () => {
    const { user } = await openEdit();
    await user.click(within(screen.getByRole('region', { name: 'Printable' })).getByRole('button', { name: 'Remove' }));
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().flags.removePrintable).toBe('true');
    expect(db[0].printable.image).toBeNull();
  });

  it('pictures that did not change are not sent again', async () => {
    const { user } = await openEdit();
    type('Title', 'Other');
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().fields).toEqual(expect.not.arrayContaining(['coverImage', 'printableImage', 'removeCoverImage', 'removePrintableImage']));
  });

  it('a cover address that does not load is shown as a missing picture, not a broken one', async () => {
    await openEdit();
    fireEvent.error(screen.getByAltText('Cover picture preview'));
    expect(screen.getByText('The picture could not be shown')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Cover picture' })).getByRole('button', { name: 'Replace picture' })).toBeInTheDocument();
  });
});

describe('editing: when saving does not work', () => {
  it('someone else saved first: says so and offers both ways out', async () => {
    const { user } = await openEdit();
    type('Title', 'Mine');
    db[0] = { ...db[0], title: 'Theirs', updatedAt: '2026-11-11T09:00:00.000Z' };
    await saveChanges(user);
    expect(await screen.findByText('Someone else saved this experience first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load their version' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save mine anyway' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Mine');
    expect(where()).toBe(editPath());
  });

  it('Load their version replaces the form with theirs and the page works from then on', async () => {
    const { user } = await openEdit();
    type('Title', 'Mine');
    db[0] = { ...db[0], title: 'Theirs', updatedAt: '2026-11-11T09:00:00.000Z' };
    await saveChanges(user);
    await user.click(await screen.findByRole('button', { name: 'Load their version' }));
    await waitFor(() => expect(field('Title')).toHaveValue('Theirs'));
    expect(screen.queryByText('Someone else saved this experience first')).not.toBeInTheDocument();
    expect(button('Save changes')).toBeDisabled();
    type('Title', 'Theirs, edited');
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().expectedUpdatedAt).toBe('2026-11-11T09:00:00.000Z');
    expect(db[0].title).toBe('Theirs, edited');
  });

  it('Save mine anyway saves without the check, replacing their change', async () => {
    const { user, store } = await openEdit();
    type('Title', 'Mine');
    db[0] = { ...db[0], title: 'Theirs', updatedAt: '2026-11-11T09:00:00.000Z' };
    await saveChanges(user);
    await user.click(await screen.findByRole('button', { name: 'Save mine anyway' }));
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(lastSave().fields).not.toContain('expectedUpdatedAt');
    expect(db[0].title).toBe('Mine');
    expect(notice(store).message).toBe('"Mine" was saved.');
  });

  it('the experience was deleted meanwhile: says so, keeps the form, and offers the way back', async () => {
    const { user } = await openEdit();
    type('Title', 'Mine');
    db = [];
    await saveChanges(user);
    expect(await screen.findByText('Experience not found')).toBeInTheDocument();
    expect(screen.getByText('This experience no longer exists. It may have been deleted by someone else.')).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Mine');
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Back to experiences' }));
    expect(where()).toBe('/admin/experiences');
  });

  it('a refusal to publish names what is missing and keeps the form', async () => {
    const { user } = await openEdit();
    await user.click(publishedSwitch());
    // The page's own check passes (there are videos); the server is stricter about a row it cannot read.
    failures.put = () =>
      backendError(422, {
        success: false,
        code: 'PUBLISH_BLOCKED',
        message: 'This experience cannot be published yet.',
        errors: [{ field: 'videos[1]', message: 'Video 2 needs a title and a link.' }],
      });
    await saveChanges(user);
    expect(await screen.findByText('This experience cannot be published yet.')).toBeInTheDocument();
    expect(screen.getByText('Add what is missing, or turn Published off to save it as a draft.')).toBeInTheDocument();
    expect(screen.getByText('Video 2 needs a title and a link.')).toBeInTheDocument();
    expect(publishedSwitch()).toBeChecked();
  });

  it('a server error keeps every change, and Save can be tried again', async () => {
    const { user } = await openEdit();
    type('Title', 'Mine');
    await user.click(button('Remove video 1'));
    failures.put = () => backendError(500, { message: 'Broken.' });
    await saveChanges(user);
    await screen.findByText('Broken.');
    expect(field('Title')).toHaveValue('Mine');
    expect(screen.queryByLabelText('Video 3 title')).not.toBeInTheDocument();
    failures.put = null;
    await saveChanges(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(db[0].videos).toHaveLength(2);
  });

  it('leaving after a failed save still asks, because the work is not saved', async () => {
    const { user } = await openEdit();
    type('Title', 'Mine');
    failures.put = networkError;
    await saveChanges(user);
    await screen.findByText('Could not reach the server. Check your connection and try again.');
    await user.click(button('Cancel'));
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
  });
});

// ================================================================ previewing

describe('previewing: the page as children see it', () => {
  const openPreview = (user) => user.click(button('Preview'));
  const laptop = () => screen.getByRole('region', { name: 'Preview of the experience on a laptop' });

  it('has a Preview button on the add form and on the edit form, and none while loading or when the experience is missing', async () => {
    renderEditor();
    expect(button('Preview')).toBeEnabled();
    cleanup();

    const pending = deferred();
    api.get.mockImplementationOnce(() => pending.promise);
    renderEditor(editPath());
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
    pending.resolve({ data: { success: true, data: copy(saved(1)) } });
    await screen.findByLabelText('Title');
    expect(button('Preview')).toBeInTheDocument();
    cleanup();

    renderEditor('/admin/experiences/3f2b8c1e-5d4a-4b7e-8c9d-000000000000/edit');
    await screen.findByText('This experience no longer exists. It may have been deleted.');
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('shows what is typed right now, before anything is saved, on the laptop first', async () => {
    const { user } = renderEditor();
    type('Title', 'Brand new');
    type('Description', 'Just typed');
    await addVideo(user, 1, 'First clip', LINK(1));
    await openPreview(user);

    expect(screen.getByRole('heading', { level: 1, name: 'Preview' })).toBeInTheDocument();
    const page = within(laptop());
    expect(page.getByRole('heading', { name: 'Brand new' })).toBeInTheDocument();
    expect(page.getByText('Just typed')).toBeInTheDocument();
    expect(page.getByRole('button', { name: 'Play First clip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Laptop preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument(); // the form is out of the way: the preview is the whole page
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('the phone button shows the same page on a phone, and Laptop brings the laptop back', async () => {
    const { user } = renderEditor();
    type('Title', 'Brand new');
    await openPreview(user);
    await user.click(screen.getByRole('button', { name: 'Phone preview' }));
    const phone = screen.getByRole('region', { name: 'Preview of the experience on a phone' });
    expect(within(phone).getByRole('heading', { name: 'Brand new' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Laptop preview' }));
    expect(laptop()).toBeInTheDocument();
  });

  it('has no footer and no copyright line, on either screen', async () => {
    const { user } = await openEdit();
    await openPreview(user);
    expect(document.body.textContent).not.toMatch(/©|copyright/i);
    expect(document.querySelector('footer')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Phone preview' }));
    expect(document.body.textContent).not.toMatch(/©|copyright/i);
  });

  it('shows a saved experience complete: its videos in order, its printable and its picture', async () => {
    const { user } = await openEdit();
    await openPreview(user);
    const page = within(laptop());
    expect(page.getByRole('heading', { name: 'Strawberry 1' })).toBeInTheDocument();
    expect(page.getAllByRole('button', { name: /^Play/ }).map((item) => item.getAttribute('aria-label'))).toEqual(['Play Video 1', 'Play Video 2', 'Play Video 3']);
    expect(page.getByRole('button', { name: 'Print recipe here' })).toBeInTheDocument();
  });

  it('a video can be played from the preview, to check the link', async () => {
    const { user } = await openEdit();
    await openPreview(user);
    await user.click(within(laptop()).getByRole('button', { name: 'Play Video 2' }));
    expect(within(laptop()).getByTitle('Video 2')).toHaveAttribute('src', `${LINK(2)}?autoplay=true`);
  });

  it('Back to editing returns to the form with everything still typed, and nothing was sent', async () => {
    const { user } = renderEditor();
    type('Title', 'Brand new');
    await addVideo(user, 1, 'First clip', LINK(1));
    type('Link to the file', 'https://riseup.kids/a.pdf');
    await openPreview(user);
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));

    expect(field('Title')).toHaveValue('Brand new');
    expect(field('Video 1 title')).toHaveValue('First clip');
    expect(field('Video 1 Bunny link')).toHaveValue(LINK(1));
    expect(field('Link to the file')).toHaveValue('https://riseup.kids/a.pdf');
    expect(screen.queryByRole('heading', { level: 1, name: 'Preview' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('a change made after looking at the preview shows the next time', async () => {
    const { user } = renderEditor();
    type('Title', 'One');
    await openPreview(user);
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    type('Title', 'Two');
    await openPreview(user);
    expect(within(laptop()).getByRole('heading', { name: 'Two' })).toBeInTheDocument();
  });

  it('shows a picture that was chosen but not saved on the printable', async () => {
    const { user } = renderEditor();
    type('Title', 'T');
    type('Link to the file', 'https://riseup.kids/a.pdf');
    await upload(user, 'Printable picture file', png('print.webp', 500, 'image/webp'));
    await openPreview(user);
    expect(within(laptop()).getByAltText('T printable')).toHaveAttribute('src', 'blob:print.webp');
  });

  it('leaving a form with unsaved work still asks while the preview is open', async () => {
    const { user } = renderEditor();
    type('Title', 'Brand new');
    await openPreview(user);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('the preview of an experience with a published switch on says so', async () => {
    db = [saved(1, { isPublished: true })];
    const { user } = await openEdit();
    await openPreview(user);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('can be saved after looking (the form is not lost, Save still works)', async () => {
    const { user } = renderEditor();
    type('Title', 'Looked first');
    await openPreview(user);
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    await create(user);
    await waitFor(() => expect(where()).toBe('/admin/experiences'));
    expect(db[1].title).toBe('Looked first');
  });
});
