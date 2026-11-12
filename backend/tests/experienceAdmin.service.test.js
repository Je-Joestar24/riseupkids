/**
 * The admin Experiences service against a real in-memory MongoDB: creating, listing, editing,
 * publishing, ordering and deleting, and every refusal (validation, not found, conflicts, blocked
 * publishing, storage failures). Only picture storage (S3) is faked.
 */
const mongoose = require('mongoose');

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
}));

const s3 = require('../services/s3.service');
const Experience = require('../models/Experience');
const service = require('../services/experienceAdmin.service');
const { ExperienceError, isValidExperienceUuid } = require('../utils/experienceValidation.util');

jest.setTimeout(60000);

const V1 = 'https://iframe.mediadelivery.net/embed/660084/video-one';
const V2 = 'https://iframe.mediadelivery.net/embed/660084/video-two';
const V3 = 'https://iframe.mediadelivery.net/embed/660084/video-three';
const video = (title, embedUrl) => ({ title, embedUrl });
const USER = new mongoose.Types.ObjectId();
const EDITOR = new mongoose.Types.ObjectId(); // someone other than the creator
const UNKNOWN_UUID = '3b241101-e2bb-4255-8caf-4136c566a962';

let mongod;
let pictureCounter;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Experience.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
});

beforeEach(async () => {
  await Experience.deleteMany({});
  jest.restoreAllMocks();
  jest.clearAllMocks();
  pictureCounter = 0;
  s3.uploadFileFromMulter.mockImplementation(async () => ({ url: `https://cdn.test/experiences/images/${++pictureCounter}.png` }));
  s3.getS3KeyFromUrl.mockImplementation((url) => (String(url).startsWith('https://cdn.test/') ? String(url).slice(17) : null));
  s3.deleteByKey.mockResolvedValue(undefined);
});

const make = (overrides = {}, context = {}) =>
  service.createExperience(
    { title: 'Smoothie', description: 'Make it', videos: [video('Words', V1), video('Story', V2)], ...overrides },
    { userId: USER, ...context }
  );

/** Runs a promise that must fail with an ExperienceError and returns it. */
async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ExperienceError);
    return error;
  }
  throw new Error('expected an ExperienceError but nothing was thrown');
}

const file = (name = 'pic.png') => ({ originalname: name, mimetype: 'image/png', buffer: Buffer.from('x') });

describe('createExperience', () => {
  it('saves a draft with a uuid, the next order number and the creator', async () => {
    const first = await make();
    const second = await make({ title: 'Second' });

    expect(isValidExperienceUuid(first.uuid)).toBe(true);
    expect(first).toMatchObject({ title: 'Smoothie', description: 'Make it', isPublished: false, publishedAt: null, order: 1 });
    expect(second.order).toBe(2);
    expect(first.videos.map((v) => v.title)).toEqual(['Words', 'Story']);
    expect(first.videos.every((v) => /^[0-9a-f]{24}$/.test(v.id))).toBe(true);
    const stored = await Experience.findOne({ uuid: first.uuid });
    expect(String(stored.createdBy)).toBe(String(USER));
  });

  it('never returns the internal database id', async () => {
    const created = await make();
    expect(created._id).toBeUndefined();
    expect(Object.keys(created)).toEqual(
      expect.arrayContaining(['uuid', 'title', 'description', 'coverImage', 'videos', 'printable', 'order', 'isPublished'])
    );
  });

  it('can be created already published when it is complete', async () => {
    const created = await make({ isPublished: true });
    expect(created.isPublished).toBe(true);
    expect(created.publishedAt).toBeInstanceOf(Date);
  });

  it('refuses to publish an experience with no videos, and saves nothing', async () => {
    const error = await failure(make({ videos: [], isPublished: true }));
    expect(error).toMatchObject({ statusCode: 422, code: 'PUBLISH_BLOCKED' });
    expect(error.errors.map((e) => e.field)).toEqual(['videos']);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('refuses bad input with every problem listed, and saves nothing', async () => {
    const error = await failure(
      service.createExperience({ title: '', videos: [video('', 'https://youtube.com/x')], printable: { link: 'https://evil.com/a.pdf' } })
    );
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    expect(error.errors.map((e) => e.field)).toEqual(['title', 'videos[0].title', 'videos[0].embedUrl', 'printable.link']);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('stores the printable with the default button text', async () => {
    const created = await make({ printable: { link: 'https://riseup.kids/downloads/a.pdf' } });
    expect(created.printable).toEqual({ image: null, link: 'https://riseup.kids/downloads/a.pdf', button: 'Print here' });
  });

  it('stores the cover and printable pictures in the experiences folder', async () => {
    const created = await make({}, { files: { coverImage: file('cover.png'), printableImage: file('print.png') } });
    expect(created.coverImage).toBe('https://cdn.test/experiences/images/1.png');
    expect(created.printable.image).toBe('https://cdn.test/experiences/images/2.png');
    expect(s3.uploadFileFromMulter).toHaveBeenCalledWith(expect.objectContaining({ originalname: 'cover.png' }), 'experiences/images');
  });

  it('answers 502 when a picture cannot be stored, and saves nothing', async () => {
    s3.uploadFileFromMulter.mockRejectedValueOnce(new Error('S3 is down: secret-key-detail'));
    const error = await failure(make({}, { files: { coverImage: file() } }));
    expect(error).toMatchObject({ statusCode: 502, code: 'IMAGE_UPLOAD_FAILED' });
    expect(error.message).not.toMatch(/secret|S3/);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('removes the first picture when the second one cannot be stored', async () => {
    s3.uploadFileFromMulter
      .mockResolvedValueOnce({ url: 'https://cdn.test/experiences/images/first.png' })
      .mockRejectedValueOnce(new Error('boom'));
    await failure(make({}, { files: { coverImage: file(), printableImage: file() } }));
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/first.png');
  });

  it('removes the stored pictures when the database save fails', async () => {
    jest.spyOn(Experience, 'create').mockRejectedValueOnce(new Error('db down'));
    await expect(make({}, { files: { coverImage: file() } })).rejects.toThrow('db down');
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/1.png');
  });

  it('a database failure is not an ExperienceError (it goes to the central handler)', async () => {
    jest.spyOn(Experience, 'findOne').mockImplementationOnce(() => {
      throw new Error('db down');
    });
    await expect(make()).rejects.not.toBeInstanceOf(ExperienceError);
  });
});

describe('getExperience', () => {
  it('returns the experience with its videos in order', async () => {
    const created = await make();
    const found = await service.getExperience(created.uuid);
    expect(found).toEqual(created);
  });

  it('a uuid nobody has is "not found"', async () => {
    expect(await failure(service.getExperience(UNKNOWN_UUID))).toMatchObject({ statusCode: 404, code: 'EXPERIENCE_NOT_FOUND' });
  });

  it('a malformed id is "not found" and never reaches the database', async () => {
    const spy = jest.spyOn(Experience, 'findOne');
    for (const bad of ['abc', '507f1f77bcf86cd799439011', '', undefined, null, { $ne: 1 }]) {
      expect(await failure(service.getExperience(bad))).toMatchObject({ statusCode: 404 });
    }
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('listExperiences', () => {
  beforeEach(async () => {
    await make({ title: 'Strawberry Smoothie', isPublished: true });
    await make({ title: 'Banana Bread' });
    await make({ title: 'Cooking (with 100% fun)', isPublished: true });
  });

  it('lists in display order with a summary for each, and no video links', async () => {
    const { items, pagination, counts } = await service.listExperiences();
    expect(items.map((i) => i.title)).toEqual(['Strawberry Smoothie', 'Banana Bread', 'Cooking (with 100% fun)']);
    expect(items[0]).toMatchObject({ videoCount: 2, isPublished: true, order: 1 });
    expect(items[0].videos).toBeUndefined();
    expect(pagination).toEqual({ page: 1, limit: 20, total: 3, pages: 1 });
    expect(counts).toEqual({ all: 3, published: 2, draft: 1 });
  });

  it('filters by status', async () => {
    expect((await service.listExperiences({ status: 'published' })).items.map((i) => i.title)).toEqual([
      'Strawberry Smoothie',
      'Cooking (with 100% fun)',
    ]);
    expect((await service.listExperiences({ status: 'draft' })).items.map((i) => i.title)).toEqual(['Banana Bread']);
  });

  it('the counts for the tabs ignore the filter', async () => {
    expect((await service.listExperiences({ status: 'draft' })).counts).toEqual({ all: 3, published: 2, draft: 1 });
  });

  it('searches the title, ignoring case', async () => {
    expect((await service.listExperiences({ search: 'BANANA' })).items.map((i) => i.title)).toEqual(['Banana Bread']);
    expect((await service.listExperiences({ search: 'nothing here' })).items).toEqual([]);
  });

  it('search text is literal: special characters never act as a pattern', async () => {
    expect((await service.listExperiences({ search: '(with 100%' })).items).toHaveLength(1);
    expect((await service.listExperiences({ search: '.*' })).items).toEqual([]);
    expect((await service.listExperiences({ search: '(' })).items).toHaveLength(1);
  });

  it('pages the results and reports the total', async () => {
    const page1 = await service.listExperiences({ page: 1, limit: 2 });
    const page2 = await service.listExperiences({ page: 2, limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page2.items.map((i) => i.title)).toEqual(['Cooking (with 100% fun)']);
    expect(page1.pagination).toEqual({ page: 1, limit: 2, total: 3, pages: 2 });
  });

  it('a page past the end is empty, not an error', async () => {
    const result = await service.listExperiences({ page: 9, limit: 2 });
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(3);
  });

  it('an empty database gives an empty list with one page', async () => {
    await Experience.deleteMany({});
    const result = await service.listExperiences();
    expect(result).toEqual({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      counts: { all: 0, published: 0, draft: 0 },
    });
  });
});

describe('updateExperience', () => {
  it('changes only the fields that are sent', async () => {
    const created = await make();
    const updated = await service.updateExperience(created.uuid, { description: 'New text' }, { userId: USER });
    expect(updated.description).toBe('New text');
    expect(updated.title).toBe('Smoothie');
    expect(updated.videos).toEqual(created.videos);
    expect(updated.uuid).toBe(created.uuid);
    expect(updated.order).toBe(created.order);
  });

  it('replaces the list of videos and keeps the ids of the rows that were kept', async () => {
    const created = await make();
    const keep = created.videos[1];
    const updated = await service.updateExperience(created.uuid, {
      videos: [{ id: keep.id, title: 'Story (renamed)', embedUrl: V2 }, video('New one', V3)],
    });
    expect(updated.videos.map((v) => v.title)).toEqual(['Story (renamed)', 'New one']);
    expect(updated.videos[0].id).toBe(keep.id);
  });

  it('reordering the videos is saved in that order', async () => {
    const created = await make();
    const reversed = [...created.videos].reverse().map((v) => ({ id: v.id, title: v.title, embedUrl: v.embedUrl }));
    const updated = await service.updateExperience(created.uuid, { videos: reversed });
    expect(updated.videos.map((v) => v.title)).toEqual(['Story', 'Words']);
  });

  it('cannot change the uuid, the order or who created it', async () => {
    const created = await make();
    const updated = await service.updateExperience(created.uuid, {
      title: 'Renamed',
      uuid: UNKNOWN_UUID,
      order: 50,
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(updated).toMatchObject({ uuid: created.uuid, order: created.order, title: 'Renamed' });
    const stored = await Experience.findOne({ uuid: created.uuid });
    expect(String(stored.createdBy)).toBe(String(USER));
  });

  it('refuses an empty change', async () => {
    const created = await make();
    expect(await failure(service.updateExperience(created.uuid, {}))).toMatchObject({ statusCode: 400, code: 'NOTHING_TO_UPDATE' });
  });

  it('refuses bad input and leaves the experience untouched', async () => {
    const created = await make();
    const error = await failure(service.updateExperience(created.uuid, { title: '', videos: [video('x', 'nope')] }));
    expect(error.statusCode).toBe(400);
    expect(await service.getExperience(created.uuid)).toEqual(created);
  });

  it('an unknown or malformed id is "not found"', async () => {
    expect(await failure(service.updateExperience(UNKNOWN_UUID, { title: 'x' }))).toMatchObject({ statusCode: 404 });
    expect(await failure(service.updateExperience('bad', { title: 'x' }))).toMatchObject({ statusCode: 404 });
  });

  it('refuses the edit when someone else saved in the meantime (409), and accepts it when nothing changed', async () => {
    const created = await make();
    const fine = await service.updateExperience(created.uuid, { title: 'A' }, { expectedUpdatedAt: created.updatedAt });
    expect(fine.title).toBe('A');

    // The editor still holds the old timestamp; the experience has moved on.
    const stale = await failure(service.updateExperience(created.uuid, { title: 'B' }, { expectedUpdatedAt: created.updatedAt }));
    expect(stale).toMatchObject({ statusCode: 409, code: 'EXPERIENCE_CONFLICT' });
    expect((await service.getExperience(created.uuid)).title).toBe('A');
  });

  it('an expectedUpdatedAt that is not a date is a validation error', async () => {
    const created = await make();
    const error = await failure(service.updateExperience(created.uuid, { title: 'B' }, { expectedUpdatedAt: 'yesterday' }));
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    expect(error.errors[0].field).toBe('expectedUpdatedAt');
  });

  it('a concurrent change of the video list is a 409, not an overwrite', async () => {
    const created = await make();
    jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(Object.assign(new Error('version'), { name: 'VersionError' }));
    expect(await failure(service.updateExperience(created.uuid, { title: 'B' }))).toMatchObject({ statusCode: 409, code: 'EXPERIENCE_CONFLICT' });
  });

  it('a published experience cannot be left without a video (422) and stays as it was', async () => {
    const created = await make({ isPublished: true });
    const error = await failure(service.updateExperience(created.uuid, { videos: [] }));
    expect(error).toMatchObject({ statusCode: 422, code: 'PUBLISH_BLOCKED' });
    expect(error.message).toMatch(/unpublish/i);
    expect((await service.getExperience(created.uuid)).videos).toHaveLength(2);
  });

  it('a draft may lose its videos', async () => {
    const created = await make();
    expect((await service.updateExperience(created.uuid, { videos: [] })).videos).toEqual([]);
  });

  it('can publish and unpublish through an edit, keeping publishedAt in step', async () => {
    const created = await make();
    const published = await service.updateExperience(created.uuid, { isPublished: true });
    expect(published.isPublished).toBe(true);
    expect(published.publishedAt).toBeInstanceOf(Date);
    const hidden = await service.updateExperience(created.uuid, { isPublished: false });
    expect(hidden).toMatchObject({ isPublished: false, publishedAt: null });
  });

  it('publishing through an edit is blocked while the experience is incomplete', async () => {
    const created = await make({ videos: [] });
    expect(await failure(service.updateExperience(created.uuid, { isPublished: true }))).toMatchObject({ statusCode: 422 });
    expect((await service.getExperience(created.uuid)).isPublished).toBe(false);
  });

  it('replaces the cover picture and deletes the old one only after the save worked', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    expect(created.coverImage).toBe('https://cdn.test/experiences/images/1.png');
    const updated = await service.updateExperience(created.uuid, {}, { files: { coverImage: file() } });
    expect(updated.coverImage).toBe('https://cdn.test/experiences/images/2.png');
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/1.png');
  });

  it('keeps the old cover and removes the new upload when the save fails', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    s3.deleteByKey.mockClear();
    jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(new Error('db down'));
    await expect(service.updateExperience(created.uuid, {}, { files: { coverImage: file() } })).rejects.toThrow('db down');
    expect(s3.deleteByKey).toHaveBeenCalledTimes(1);
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/2.png');
    expect((await service.getExperience(created.uuid)).coverImage).toBe('https://cdn.test/experiences/images/1.png');
  });

  it('removes the cover picture when asked', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    const updated = await service.updateExperience(created.uuid, {}, { removeCoverImage: true });
    expect(updated.coverImage).toBeNull();
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/1.png');
  });

  it('a new picture wins over "remove the picture" in the same request', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    const updated = await service.updateExperience(created.uuid, {}, { files: { coverImage: file() }, removeCoverImage: true });
    expect(updated.coverImage).toBe('https://cdn.test/experiences/images/2.png');
  });

  it('changes the printable picture and link, and removes the picture when asked', async () => {
    const created = await make({ printable: { link: 'https://riseup.kids/a.pdf' } }, { files: { printableImage: file() } });
    const changed = await service.updateExperience(created.uuid, { printable: { link: 'https://riseup.kids/b.pdf', button: 'Print' } });
    expect(changed.printable).toMatchObject({ link: 'https://riseup.kids/b.pdf', button: 'Print', image: created.printable.image });
    const cleared = await service.updateExperience(created.uuid, {}, { removePrintableImage: true });
    expect(cleared.printable.image).toBeNull();
  });

  it('a picture-only change is a valid edit', async () => {
    const created = await make();
    const updated = await service.updateExperience(created.uuid, {}, { files: { coverImage: file() } });
    expect(updated.coverImage).toBe('https://cdn.test/experiences/images/1.png');
  });

  it('a stored picture that cannot be deleted does not fail the edit', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    s3.deleteByKey.mockRejectedValue(new Error('S3 down'));
    await expect(service.updateExperience(created.uuid, {}, { removeCoverImage: true })).resolves.toMatchObject({ coverImage: null });
  });

  it('answers 502 when the new picture cannot be stored, and changes nothing', async () => {
    const created = await make();
    s3.uploadFileFromMulter.mockRejectedValueOnce(new Error('S3 down'));
    expect(await failure(service.updateExperience(created.uuid, { title: 'B' }, { files: { coverImage: file() } }))).toMatchObject({
      statusCode: 502,
      code: 'IMAGE_UPLOAD_FAILED',
    });
    expect((await service.getExperience(created.uuid)).title).toBe('Smoothie');
  });
});

describe('setPublished', () => {
  it('publishes a complete experience and sets publishedAt', async () => {
    const created = await make();
    const { experience, changed } = await service.setPublished(created.uuid, true, { userId: USER });
    expect(changed).toBe(true);
    expect(experience).toMatchObject({ isPublished: true });
    expect(experience.publishedAt).toBeInstanceOf(Date);
  });

  it('asking for the state it already has changes nothing and is not an error', async () => {
    const created = await make({ isPublished: true });
    const again = await service.setPublished(created.uuid, true);
    expect(again.changed).toBe(false);
    expect(again.experience.publishedAt).toEqual(created.publishedAt);
    const draft = await make({ title: 'Draft' });
    expect((await service.setPublished(draft.uuid, false)).changed).toBe(false);
  });

  it('refuses to publish an incomplete experience (422) with the reasons', async () => {
    const created = await make({ videos: [] });
    const error = await failure(service.setPublished(created.uuid, true));
    expect(error).toMatchObject({ statusCode: 422, code: 'PUBLISH_BLOCKED' });
    expect(error.errors).toEqual([{ field: 'videos', message: 'Add at least one video before publishing.' }]);
  });

  it('can always unpublish, and clears publishedAt', async () => {
    const created = await make({ isPublished: true });
    const { experience, changed } = await service.setPublished(created.uuid, false);
    expect(changed).toBe(true);
    expect(experience).toMatchObject({ isPublished: false, publishedAt: null });
  });

  it('an unknown or malformed id is "not found"', async () => {
    expect(await failure(service.setPublished(UNKNOWN_UUID, true))).toMatchObject({ statusCode: 404 });
    expect(await failure(service.setPublished('bad', false))).toMatchObject({ statusCode: 404 });
  });
});

describe('reorderExperiences', () => {
  let a;
  let b;
  let c;
  beforeEach(async () => {
    a = await make({ title: 'A' });
    b = await make({ title: 'B' });
    c = await make({ title: 'C' });
  });
  const titles = async () => (await service.listExperiences()).items.map((i) => i.title);

  it('saves the new order and numbers from 1', async () => {
    const result = await service.reorderExperiences([c.uuid, a.uuid, b.uuid]);
    expect(result).toEqual([
      { uuid: c.uuid, order: 1 },
      { uuid: a.uuid, order: 2 },
      { uuid: b.uuid, order: 3 },
    ]);
    expect(await titles()).toEqual(['C', 'A', 'B']);
  });

  it('moving is not an edit: updatedAt stays, so another open editor does not conflict', async () => {
    await service.reorderExperiences([b.uuid, a.uuid, c.uuid]);
    expect((await service.getExperience(a.uuid)).updatedAt).toEqual(a.updatedAt);
    await expect(service.updateExperience(a.uuid, { title: 'A2' }, { expectedUpdatedAt: a.updatedAt })).resolves.toMatchObject({ title: 'A2' });
  });

  it('refuses a list that is empty or not a list', async () => {
    for (const bad of [[], undefined, null, 'x', { 0: a.uuid }]) {
      expect(await failure(service.reorderExperiences(bad))).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    }
  });

  it('refuses ids that are not uuids, or listed twice, naming the position', async () => {
    const bad = await failure(service.reorderExperiences([a.uuid, 'nope', b.uuid]));
    expect(bad.errors).toEqual([{ field: 'order[1]', message: 'Not a valid experience id.' }]);
    const twice = await failure(service.reorderExperiences([a.uuid, a.uuid, b.uuid]));
    expect(twice.errors).toEqual([{ field: 'order[1]', message: 'This experience is listed twice.' }]);
  });

  it('refuses a list that is missing one (the list changed): 409, nothing saved', async () => {
    const error = await failure(service.reorderExperiences([c.uuid, a.uuid]));
    expect(error).toMatchObject({ statusCode: 409, code: 'REORDER_STALE' });
    expect(await titles()).toEqual(['A', 'B', 'C']);
  });

  it('refuses a list with an experience that does not exist (deleted by someone else): 409', async () => {
    const error = await failure(service.reorderExperiences([a.uuid, b.uuid, UNKNOWN_UUID]));
    expect(error).toMatchObject({ statusCode: 409, code: 'REORDER_STALE' });
    expect(await titles()).toEqual(['A', 'B', 'C']);
  });

  it('refuses a list with an extra one (added by someone else): 409', async () => {
    await make({ title: 'D' });
    expect(await failure(service.reorderExperiences([a.uuid, b.uuid, c.uuid]))).toMatchObject({ statusCode: 409 });
  });

  it('new experiences still go to the end after a reorder', async () => {
    await service.reorderExperiences([c.uuid, b.uuid, a.uuid]);
    const d = await make({ title: 'D' });
    expect(d.order).toBe(4);
    expect(await titles()).toEqual(['C', 'B', 'A', 'D']);
  });
});

describe('deleteExperience', () => {
  it('deletes the experience and its pictures', async () => {
    const created = await make({}, { files: { coverImage: file(), printableImage: file() } });
    const result = await service.deleteExperience(created.uuid);
    expect(result).toEqual({ uuid: created.uuid, title: 'Smoothie' });
    expect(await Experience.countDocuments()).toBe(0);
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/1.png');
    expect(s3.deleteByKey).toHaveBeenCalledWith('experiences/images/2.png');
  });

  it('a second delete is "not found"', async () => {
    const created = await make();
    await service.deleteExperience(created.uuid);
    expect(await failure(service.deleteExperience(created.uuid))).toMatchObject({ statusCode: 404 });
  });

  it('an unknown or malformed id is "not found"', async () => {
    expect(await failure(service.deleteExperience(UNKNOWN_UUID))).toMatchObject({ statusCode: 404 });
    expect(await failure(service.deleteExperience('bad'))).toMatchObject({ statusCode: 404 });
  });

  it('a picture that cannot be deleted does not stop the delete', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    s3.deleteByKey.mockRejectedValue(new Error('S3 down'));
    await expect(service.deleteExperience(created.uuid)).resolves.toMatchObject({ uuid: created.uuid });
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('someone else deleting it at the same moment is "not found", and no pictures are touched', async () => {
    const created = await make({}, { files: { coverImage: file() } });
    jest.spyOn(Experience, 'deleteOne').mockResolvedValueOnce({ deletedCount: 0 });
    expect(await failure(service.deleteExperience(created.uuid))).toMatchObject({ statusCode: 404 });
    expect(s3.deleteByKey).not.toHaveBeenCalled();
  });

  it('leaves the other experiences alone', async () => {
    const a = await make({ title: 'A' });
    await make({ title: 'B' });
    await service.deleteExperience(a.uuid);
    expect((await service.listExperiences()).items.map((i) => i.title)).toEqual(['B']);
  });
});

// ---------------------------------------------------------------- positions of the videos

const V4 = 'https://iframe.mediadelivery.net/embed/660084/video-four';
const FOUR = [video('One', V1), video('Two', V2), video('Three', V3), video('Four', V4)];
const titlesOf = (experience) => experience.videos.map((v) => v.title);
const positionsOf = (experience) => experience.videos.map((v) => v.position);
const idsOf = (experience) => experience.videos.map((v) => v.id);
const byTitle = (experience, title) => experience.videos.find((v) => v.title === title);

describe('video positions', () => {
  it('every video has a position from 1, in the order of the list, on create and on read', async () => {
    const created = await make({ videos: FOUR });
    expect(positionsOf(created)).toEqual([1, 2, 3, 4]);
    expect(positionsOf(await service.getExperience(created.uuid))).toEqual([1, 2, 3, 4]);
  });

  it('sending the list in a new order renumbers it; a position that comes along does not override the list', async () => {
    const created = await make({ videos: FOUR });
    const reversed = [...created.videos].reverse(); // rows still carry their old positions 4,3,2,1
    const updated = await service.updateExperience(created.uuid, { videos: reversed });
    expect(titlesOf(updated)).toEqual(['Four', 'Three', 'Two', 'One']);
    expect(positionsOf(updated)).toEqual([1, 2, 3, 4]);
  });

  it('a video added in the middle renumbers the ones after it', async () => {
    const created = await make({ videos: FOUR });
    const list = created.videos.map(({ id, title, embedUrl }) => ({ id, title, embedUrl }));
    list.splice(1, 0, video('Middle', 'https://iframe.mediadelivery.net/embed/660084/video-middle'));
    const updated = await service.updateExperience(created.uuid, { videos: list });
    expect(titlesOf(updated)).toEqual(['One', 'Middle', 'Two', 'Three', 'Four']);
    expect(positionsOf(updated)).toEqual([1, 2, 3, 4, 5]);
  });

  it('a video removed leaves no gap', async () => {
    const created = await make({ videos: FOUR });
    const without = created.videos.filter((v) => v.title !== 'Two');
    const updated = await service.updateExperience(created.uuid, { videos: without });
    expect(titlesOf(updated)).toEqual(['One', 'Three', 'Four']);
    expect(positionsOf(updated)).toEqual([1, 2, 3]);
  });

  it('a record saved without positions (older data) is read with positions from its list', async () => {
    await Experience.collection.insertOne({
      uuid: UNKNOWN_UUID,
      title: 'Old record',
      videos: [
        { _id: new mongoose.Types.ObjectId(), title: 'A', embedUrl: V1 },
        { _id: new mongoose.Types.ObjectId(), title: 'B', embedUrl: V2 },
      ],
      printable: { link: '', button: 'Print here' },
      order: 1,
      isPublished: false,
    });
    expect(positionsOf(await service.getExperience(UNKNOWN_UUID))).toEqual([1, 2]);
  });
});

describe('reorderVideos', () => {
  let experience;
  beforeEach(async () => {
    experience = await make({ videos: FOUR });
  });
  const order = (...titles) => titles.map((t) => byTitle(experience, t).id);

  it('saves the new order of the videos, numbers them from 1 and keeps each video its id', async () => {
    const updated = await service.reorderVideos(experience.uuid, order('Three', 'One', 'Four', 'Two'));
    expect(titlesOf(updated)).toEqual(['Three', 'One', 'Four', 'Two']);
    expect(positionsOf(updated)).toEqual([1, 2, 3, 4]);
    expect(byTitle(updated, 'One').id).toBe(byTitle(experience, 'One').id);
    expect(titlesOf(await service.getExperience(experience.uuid))).toEqual(['Three', 'One', 'Four', 'Two']);
  });

  it('is an edit: it changes updatedAt and who edited it, and leaves the other fields alone', async () => {
    const updated = await service.reorderVideos(experience.uuid, order('Four', 'Three', 'Two', 'One'), { userId: EDITOR });
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(experience.updatedAt).getTime());
    expect(updated).toMatchObject({ title: experience.title, description: experience.description, order: experience.order });
    expect(String((await Experience.findOne({ uuid: experience.uuid })).updatedBy)).toBe(String(EDITOR));
  });

  it('works on a published experience and leaves it published', async () => {
    const published = await make({ videos: FOUR, isPublished: true });
    const ids = [...published.videos].reverse().map((v) => v.id);
    const updated = await service.reorderVideos(published.uuid, ids);
    expect(updated.isPublished).toBe(true);
    expect(positionsOf(updated)).toEqual([1, 2, 3, 4]);
  });

  it('sending the order it already has is fine', async () => {
    const updated = await service.reorderVideos(experience.uuid, idsOf(experience));
    expect(titlesOf(updated)).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('accepts ids written in capitals', async () => {
    const updated = await service.reorderVideos(experience.uuid, [...idsOf(experience)].reverse().map((id) => id.toUpperCase()));
    expect(titlesOf(updated)).toEqual(['Four', 'Three', 'Two', 'One']);
  });

  it('does not touch the videos of other experiences', async () => {
    const other = await make({ title: 'Other', videos: FOUR });
    await service.reorderVideos(experience.uuid, order('Four', 'Three', 'Two', 'One'));
    expect(titlesOf(await service.getExperience(other.uuid))).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('refuses a list that is empty or not a list', async () => {
    for (const bad of [[], undefined, null, 'x', { 0: 'a' }]) {
      expect(await failure(service.reorderVideos(experience.uuid, bad))).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    }
  });

  it('refuses ids that are not video ids, or listed twice, naming the position', async () => {
    const ids = idsOf(experience);
    const bad = await failure(service.reorderVideos(experience.uuid, [ids[0], 'nope', ids[2], ids[3]]));
    expect(bad.errors).toEqual([{ field: 'order[1]', message: 'Not a valid video id.' }]);
    const twice = await failure(service.reorderVideos(experience.uuid, [ids[0], ids[1], ids[1].toUpperCase(), ids[3]]));
    expect(twice.errors).toEqual([{ field: 'order[2]', message: 'This video is listed twice.' }]);
  });

  it('refuses a list that is missing a video, has an unknown one, or has an extra one: 409, nothing saved', async () => {
    const ids = idsOf(experience);
    const stranger = new mongoose.Types.ObjectId().toString();
    for (const stale of [ids.slice(0, 3), [...ids.slice(0, 3), stranger], [...ids, stranger]]) {
      expect(await failure(service.reorderVideos(experience.uuid, stale))).toMatchObject({ statusCode: 409, code: 'VIDEO_REORDER_STALE' });
    }
    expect(titlesOf(await service.getExperience(experience.uuid))).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('refuses the change when someone else saved in the meantime, and accepts it when nothing changed', async () => {
    const ids = [...idsOf(experience)].reverse();
    await service.updateExperience(experience.uuid, { description: 'Someone else was here' });
    expect(await failure(service.reorderVideos(experience.uuid, ids, { expectedUpdatedAt: experience.updatedAt }))).toMatchObject({
      statusCode: 409,
      code: 'EXPERIENCE_CONFLICT',
    });
    const fresh = await service.getExperience(experience.uuid);
    await expect(service.reorderVideos(experience.uuid, ids, { expectedUpdatedAt: fresh.updatedAt })).resolves.toBeDefined();
  });

  it('an expectedUpdatedAt that is not a date is a validation error', async () => {
    const error = await failure(service.reorderVideos(experience.uuid, idsOf(experience), { expectedUpdatedAt: 'later' }));
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
  });

  it('a change of the video list at the same moment is a 409, not an overwrite', async () => {
    jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(Object.assign(new Error('version'), { name: 'VersionError' }));
    expect(await failure(service.reorderVideos(experience.uuid, idsOf(experience)))).toMatchObject({ statusCode: 409, code: 'EXPERIENCE_CONFLICT' });
  });

  it('an unknown or malformed experience is "not found"', async () => {
    expect(await failure(service.reorderVideos(UNKNOWN_UUID, idsOf(experience)))).toMatchObject({ statusCode: 404, code: 'EXPERIENCE_NOT_FOUND' });
    expect(await failure(service.reorderVideos('bad', idsOf(experience)))).toMatchObject({ statusCode: 404 });
  });

  it('a database failure while saving is not an ExperienceError', async () => {
    jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(new Error('db down'));
    await expect(service.reorderVideos(experience.uuid, idsOf(experience))).rejects.not.toBeInstanceOf(ExperienceError);
  });
});

describe('moveVideo', () => {
  let experience;
  beforeEach(async () => {
    experience = await make({ videos: FOUR });
  });
  const move = (title, position, options) => service.moveVideo(experience.uuid, byTitle(experience, title).id, position, options);

  it('moves a video down; the ones in between shift up', async () => {
    const { experience: moved, changed } = await move('One', 3);
    expect(changed).toBe(true);
    expect(titlesOf(moved)).toEqual(['Two', 'Three', 'One', 'Four']);
    expect(positionsOf(moved)).toEqual([1, 2, 3, 4]);
  });

  it('moves a video up; the ones in between shift down', async () => {
    expect(titlesOf((await move('Four', 2)).experience)).toEqual(['One', 'Four', 'Two', 'Three']);
  });

  it('can move a video to the first and to the last place', async () => {
    expect(titlesOf((await move('Three', 1)).experience)).toEqual(['Three', 'One', 'Two', 'Four']);
    experience = await service.getExperience(experience.uuid);
    expect(titlesOf((await move('Three', 4)).experience)).toEqual(['One', 'Two', 'Four', 'Three']);
  });

  it('swaps two neighbours', async () => {
    expect(titlesOf((await move('Two', 3)).experience)).toEqual(['One', 'Three', 'Two', 'Four']);
  });

  it('keeps every video its id, and saves the change', async () => {
    const { experience: moved } = await move('One', 4);
    expect(byTitle(moved, 'One').id).toBe(byTitle(experience, 'One').id);
    expect(titlesOf(await service.getExperience(experience.uuid))).toEqual(['Two', 'Three', 'Four', 'One']);
  });

  it('is an edit: it changes updatedAt and who edited it', async () => {
    const { experience: moved } = await move('One', 2, { userId: EDITOR });
    expect(new Date(moved.updatedAt).getTime()).toBeGreaterThan(new Date(experience.updatedAt).getTime());
    expect(String((await Experience.findOne({ uuid: experience.uuid })).updatedBy)).toBe(String(EDITOR));
  });

  it('the place it already has changes nothing, not even updatedAt', async () => {
    const { experience: same, changed } = await move('Two', 2);
    expect(changed).toBe(false);
    expect(same.updatedAt).toEqual(experience.updatedAt);
    expect(titlesOf(same)).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it.each([[0], [5], [-1], [1.5], ['2'], [null], [undefined], [NaN]])('refuses the position %p, saying what is allowed', async (position) => {
    const error = await failure(move('One', position));
    expect(error).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    expect(error.errors).toEqual([{ field: 'position', message: 'Position must be a whole number from 1 to 4.' }]);
    expect(titlesOf(await service.getExperience(experience.uuid))).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('a video that is not in this experience is "video not found" (also a malformed id, or one from another experience)', async () => {
    const other = await make({ title: 'Other', videos: [video('Elsewhere', V1)] });
    for (const id of [new mongoose.Types.ObjectId().toString(), 'abc', '123456789abc', '', undefined, other.videos[0].id]) {
      expect(await failure(service.moveVideo(experience.uuid, id, 1))).toMatchObject({ statusCode: 404, code: 'VIDEO_NOT_FOUND' });
    }
  });

  it('with a single video only position 1 exists', async () => {
    const single = await make({ title: 'Single', videos: [video('Only', V1)] });
    const id = single.videos[0].id;
    expect((await service.moveVideo(single.uuid, id, 1)).changed).toBe(false);
    const error = await failure(service.moveVideo(single.uuid, id, 2));
    expect(error.errors[0].message).toBe('Position must be a whole number from 1 to 1.');
  });

  it('an experience with no videos has no video to move', async () => {
    const empty = await make({ title: 'Empty', videos: [] });
    expect(await failure(service.moveVideo(empty.uuid, new mongoose.Types.ObjectId().toString(), 1))).toMatchObject({ code: 'VIDEO_NOT_FOUND' });
  });

  it('refuses the change when someone else saved in the meantime, and accepts it when nothing changed', async () => {
    await service.updateExperience(experience.uuid, { description: 'Someone else was here' });
    expect(await failure(move('One', 2, { expectedUpdatedAt: experience.updatedAt }))).toMatchObject({ statusCode: 409, code: 'EXPERIENCE_CONFLICT' });
    const fresh = await service.getExperience(experience.uuid);
    await expect(service.moveVideo(experience.uuid, byTitle(fresh, 'One').id, 2, { expectedUpdatedAt: fresh.updatedAt })).resolves.toMatchObject({ changed: true });
  });

  it('a change of the video list at the same moment is a 409, not an overwrite', async () => {
    jest.spyOn(Experience.prototype, 'save').mockRejectedValueOnce(Object.assign(new Error('version'), { name: 'VersionError' }));
    expect(await failure(move('One', 2))).toMatchObject({ statusCode: 409, code: 'EXPERIENCE_CONFLICT' });
  });

  it('an unknown or malformed experience is "not found"', async () => {
    expect(await failure(service.moveVideo(UNKNOWN_UUID, new mongoose.Types.ObjectId().toString(), 1))).toMatchObject({ code: 'EXPERIENCE_NOT_FOUND' });
    expect(await failure(service.moveVideo('bad', 'x', 1))).toMatchObject({ statusCode: 404 });
  });
});
