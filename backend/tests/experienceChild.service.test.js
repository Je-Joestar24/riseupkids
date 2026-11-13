/**
 * The child side of the Experiences service against a real in-memory MongoDB: what a child may see
 * (published only), in what order, in what shape, and what is never shown.
 */
const mongoose = require('mongoose');

const Experience = require('../models/Experience');
const service = require('../services/experienceChild.service');
const { ExperienceError } = require('../utils/experienceValidation.util');

jest.setTimeout(60000);

const V1 = 'https://iframe.mediadelivery.net/embed/660084/video-one';
const V2 = 'https://iframe.mediadelivery.net/embed/660084/video-two';
const V3 = 'https://iframe.mediadelivery.net/embed/660084/video-three';
const UNKNOWN_UUID = '3b241101-e2bb-4255-8caf-4136c566a962';
const ADMIN = new mongoose.Types.ObjectId();

let mongod;

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
});

const make = (overrides = {}) =>
  Experience.create({
    title: 'Smoothie',
    description: 'Make it',
    videos: [
      { title: 'Words', embedUrl: V1 },
      { title: 'Story', embedUrl: V2 },
    ],
    isPublished: true,
    publishedAt: new Date(),
    createdBy: ADMIN,
    updatedBy: ADMIN,
    ...overrides,
  });

async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ExperienceError);
    return error;
  }
  throw new Error('expected an ExperienceError but nothing was thrown');
}

/** Every key at every depth, so a leak of an admin-only field cannot hide inside a nested object or list. */
function allKeys(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => allKeys(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      found.add(key);
      allKeys(inner, found);
    }
  }
  return found;
}

const ADMIN_ONLY_KEYS = [
  '_id',
  '__v',
  'isPublished',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
  'order',
];

describe('listPublished', () => {
  it('returns nothing when there are no experiences', async () => {
    expect(await service.listPublished()).toEqual([]);
  });

  it('shows only published experiences', async () => {
    await make({ title: 'Shown' });
    await make({ title: 'Hidden draft', isPublished: false, publishedAt: null });
    const list = await service.listPublished();
    expect(list.map((item) => item.title)).toEqual(['Shown']);
  });

  it('returns nothing when everything is a draft', async () => {
    await make({ isPublished: false, publishedAt: null });
    await make({ isPublished: false, publishedAt: null });
    expect(await service.listPublished()).toEqual([]);
  });

  it('gives each card exactly the fields the app needs', async () => {
    const doc = await make({ coverImage: 'https://cdn.test/experiences/images/1.png' });
    const [item] = await service.listPublished();
    expect(item).toEqual({
      uuid: doc.uuid,
      title: 'Smoothie',
      description: 'Make it',
      coverImage: 'https://cdn.test/experiences/images/1.png',
      videoCount: 2,
    });
  });

  it('shows no cover as null and no description as an empty text', async () => {
    await make({ coverImage: undefined, description: undefined });
    const [item] = await service.listPublished();
    expect(item.coverImage).toBeNull();
    expect(item.description).toBe('');
  });

  it('counts the videos, including none', async () => {
    await make({ title: 'Three', videos: [1, 2, 3].map((n) => ({ title: `V${n}`, embedUrl: `${V1}-${n}` })) });
    await make({ title: 'None', videos: [] });
    const byTitle = Object.fromEntries((await service.listPublished()).map((item) => [item.title, item.videoCount]));
    expect(byTitle).toEqual({ Three: 3, None: 0 });
  });

  it('never includes the videos themselves, the printable or any admin-only field', async () => {
    await make({ printable: { link: 'https://riseup.kids/print.pdf', button: 'Print' } });
    const keys = allKeys(await service.listPublished());
    for (const key of ADMIN_ONLY_KEYS) expect(keys.has(key)).toBe(false);
    for (const key of ['videos', 'embedUrl', 'printable', 'link', 'file']) expect(keys.has(key)).toBe(false);
  });

  it('follows the order the admin set', async () => {
    await make({ title: 'Third', order: 3 });
    await make({ title: 'First', order: 1 });
    await make({ title: 'Second', order: 2 });
    expect((await service.listPublished()).map((item) => item.title)).toEqual(['First', 'Second', 'Third']);
  });

  it('puts experiences with the same position oldest first, the same rule as the admin list', async () => {
    const older = await make({ title: 'Older', order: 0 });
    await Experience.updateOne({ _id: older._id }, { $set: { createdAt: new Date('2026-01-01') } });
    const newer = await make({ title: 'Newer', order: 0 });
    await Experience.updateOne({ _id: newer._id }, { $set: { createdAt: new Date('2026-06-01') } });
    expect((await service.listPublished()).map((item) => item.title)).toEqual(['Older', 'Newer']);
  });

  it('leaves a hidden experience out of the order without leaving a gap', async () => {
    await make({ title: 'A', order: 1 });
    await make({ title: 'Draft', order: 2, isPublished: false, publishedAt: null });
    await make({ title: 'C', order: 3 });
    expect((await service.listPublished()).map((item) => item.title)).toEqual(['A', 'C']);
  });

  it('shows an experience again the moment it is published and hides it the moment it is not', async () => {
    const doc = await make({ isPublished: false, publishedAt: null });
    expect(await service.listPublished()).toHaveLength(0);
    await Experience.updateOne({ _id: doc._id }, { $set: { isPublished: true } });
    expect(await service.listPublished()).toHaveLength(1);
    await Experience.updateOne({ _id: doc._id }, { $set: { isPublished: false } });
    expect(await service.listPublished()).toHaveLength(0);
  });

  it('never returns more than the safety limit', async () => {
    const rows = Array.from({ length: service.CHILD_LIST_MAX + 5 }, (_, index) => ({
      title: `E${index}`,
      isPublished: true,
      order: index + 1,
      uuid: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    }));
    await Experience.insertMany(rows);
    const list = await service.listPublished();
    expect(list).toHaveLength(service.CHILD_LIST_MAX);
    expect(list[0].title).toBe('E0');
  });

  it('has a safety limit of 100', () => {
    expect(service.CHILD_LIST_MAX).toBe(100);
  });

  it('copes with an older record that has no description, cover or videos stored at all', async () => {
    await Experience.collection.insertOne({
      uuid: UNKNOWN_UUID,
      title: 'Old record',
      isPublished: true,
      order: 1,
      createdAt: new Date(),
    });
    expect(await service.listPublished()).toStrictEqual([
      { uuid: UNKNOWN_UUID, title: 'Old record', description: '', coverImage: null, videoCount: 0 },
    ]);
  });

  it('asks the database only for the fields the cards use', async () => {
    await make();
    const spy = jest.spyOn(Experience, 'find');
    await service.listPublished();
    expect(spy.mock.results[0].value.projection()).toEqual({
      uuid: 1,
      title: 1,
      description: 1,
      coverImage: 1,
      'videos._id': 1,
    });
    spy.mockRestore();
  });

  it('returns plain data, not database documents', async () => {
    await make();
    const [item] = await service.listPublished();
    expect(item).not.toBeInstanceOf(mongoose.Document);
    expect(JSON.parse(JSON.stringify(item))).toEqual(item);
  });
});

describe('getPublished', () => {
  it('returns the whole experience for the page', async () => {
    const doc = await make({
      coverImage: 'https://cdn.test/experiences/images/1.png',
      printable: {
        image: 'https://cdn.test/experiences/images/2.png',
        link: 'https://riseup.kids/print.pdf',
        button: 'Print here',
      },
    });
    const result = await service.getPublished(doc.uuid);
    expect(result).toEqual({
      uuid: doc.uuid,
      title: 'Smoothie',
      description: 'Make it',
      coverImage: 'https://cdn.test/experiences/images/1.png',
      videos: [
        { id: String(doc.videos[0]._id), title: 'Words', embedUrl: V1, position: 1 },
        { id: String(doc.videos[1]._id), title: 'Story', embedUrl: V2, position: 2 },
      ],
      printable: {
        image: 'https://cdn.test/experiences/images/2.png',
        kind: 'link',
        url: 'https://riseup.kids/print.pdf',
        fileName: '',
        button: 'Print here',
      },
    });
  });

  it('keeps the videos in the order the admin set and numbers them 1, 2, 3', async () => {
    const doc = await make({
      videos: [
        { title: 'C', embedUrl: V3 },
        { title: 'A', embedUrl: V1 },
        { title: 'B', embedUrl: V2 },
      ],
    });
    const result = await service.getPublished(doc.uuid);
    expect(result.videos.map((v) => [v.position, v.title])).toEqual([
      [1, 'C'],
      [2, 'A'],
      [3, 'B'],
    ]);
  });

  it('numbers by the list even when a stored position is wrong or missing (an older record)', async () => {
    const doc = await make();
    await Experience.collection.updateOne(
      { _id: doc._id },
      { $set: { 'videos.0.position': 9 }, $unset: { 'videos.1.position': '' } }
    );
    const result = await service.getPublished(doc.uuid);
    expect(result.videos.map((v) => v.position)).toEqual([1, 2]);
  });

  it('returns an empty list of videos for an experience without videos', async () => {
    const doc = await make({ videos: [] });
    expect((await service.getPublished(doc.uuid)).videos).toEqual([]);
  });

  it('never includes an admin-only field at any depth', async () => {
    const doc = await make({ printable: { file: 'https://cdn.test/experiences/files/a.pdf', fileName: 'a.pdf' } });
    const keys = allKeys(await service.getPublished(doc.uuid));
    for (const key of ADMIN_ONLY_KEYS) expect(keys.has(key)).toBe(false);
  });

  describe('the printable', () => {
    it('is null when nothing was set (the default button text alone is not a printable)', async () => {
      const doc = await make();
      expect((await service.getPublished(doc.uuid)).printable).toBeNull();
    });

    it('opens a link', async () => {
      const doc = await make({ printable: { link: 'https://riseup.kids/print.pdf', button: 'Get it' } });
      expect((await service.getPublished(doc.uuid)).printable).toEqual({
        image: null,
        kind: 'link',
        url: 'https://riseup.kids/print.pdf',
        fileName: '',
        button: 'Get it',
      });
    });

    it('opens an uploaded file and shows its readable name', async () => {
      const doc = await make({
        printable: { file: 'https://cdn.test/experiences/files/abc.pdf', fileName: 'Smoothie sheet.pdf', button: 'Print here' },
      });
      expect((await service.getPublished(doc.uuid)).printable).toEqual({
        image: null,
        kind: 'file',
        url: 'https://cdn.test/experiences/files/abc.pdf',
        fileName: 'Smoothie sheet.pdf',
        button: 'Print here',
      });
    });

    it('with a picture and nothing to open has no kind and no url', async () => {
      const doc = await make({ printable: { image: 'https://cdn.test/experiences/images/2.png' } });
      expect((await service.getPublished(doc.uuid)).printable).toEqual({
        image: 'https://cdn.test/experiences/images/2.png',
        kind: null,
        url: null,
        fileName: '',
        button: 'Print here',
      });
    });

    it('gives the uploaded file when an older record somehow holds both, and never the link', async () => {
      const doc = await make({
        printable: { file: 'https://cdn.test/experiences/files/abc.pdf', fileName: 'a.pdf', link: 'https://riseup.kids/x.pdf' },
      });
      const { printable } = await service.getPublished(doc.uuid);
      expect(printable.kind).toBe('file');
      expect(printable.url).toBe('https://cdn.test/experiences/files/abc.pdf');
      expect(JSON.stringify(printable)).not.toContain('riseup.kids/x.pdf');
    });

    it('does not carry a stale file name when there is no file', async () => {
      const doc = await make({ printable: { link: 'https://riseup.kids/x.pdf', fileName: 'left-over.pdf' } });
      expect((await service.getPublished(doc.uuid)).printable.fileName).toBe('');
    });

    it('copes with a record that has no printable at all', async () => {
      const doc = await make();
      await Experience.collection.updateOne({ _id: doc._id }, { $unset: { printable: '' } });
      expect((await service.getPublished(doc.uuid)).printable).toBeNull();
    });
  });

  describe('what a child must never find', () => {
    it('answers a draft exactly like an unknown experience', async () => {
      const draft = await make({ isPublished: false, publishedAt: null });
      const forDraft = await failure(service.getPublished(draft.uuid));
      const forUnknown = await failure(service.getPublished(UNKNOWN_UUID));
      expect(forDraft.statusCode).toBe(404);
      expect(forDraft.code).toBe('EXPERIENCE_NOT_FOUND');
      expect([forDraft.statusCode, forDraft.code, forDraft.message]).toEqual([
        forUnknown.statusCode,
        forUnknown.code,
        forUnknown.message,
      ]);
    });

    it('answers an unknown id with not found', async () => {
      const error = await failure(service.getPublished(UNKNOWN_UUID));
      expect([error.statusCode, error.code]).toEqual([404, 'EXPERIENCE_NOT_FOUND']);
    });

    it.each([
      ['an empty text', ''],
      ['a number', 5],
      ['undefined', undefined],
      ['null', null],
      ['an object', { $ne: null }],
      ['a list', [UNKNOWN_UUID]],
      ['a database id instead of the public id', '507f1f77bcf86cd799439011'],
      ['a text that is not an id', 'not-an-id'],
      ['a query operator as text', '{"$ne":null}'],
      ['a wildcard', '.*'],
      ['a very long text', 'a'.repeat(5000)],
    ])('answers %s with not found and never reaches the database with it', async (_name, value) => {
      await make();
      const spy = jest.spyOn(Experience, 'findOne');
      const error = await failure(service.getPublished(value));
      expect([error.statusCode, error.code]).toEqual([404, 'EXPERIENCE_NOT_FOUND']);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('does not find an experience by its database id', async () => {
      const doc = await make();
      const error = await failure(service.getPublished(String(doc._id)));
      expect(error.statusCode).toBe(404);
    });

    it('does not mix up two experiences', async () => {
      const first = await make({ title: 'First' });
      const second = await make({ title: 'Second' });
      expect((await service.getPublished(first.uuid)).title).toBe('First');
      expect((await service.getPublished(second.uuid)).title).toBe('Second');
    });

    it('finds the experience again after it is published, and loses it when it is unpublished', async () => {
      const doc = await make({ isPublished: false, publishedAt: null });
      await failure(service.getPublished(doc.uuid));
      await Experience.updateOne({ _id: doc._id }, { $set: { isPublished: true } });
      expect((await service.getPublished(doc.uuid)).uuid).toBe(doc.uuid);
      await Experience.updateOne({ _id: doc._id }, { $set: { isPublished: false } });
      await failure(service.getPublished(doc.uuid));
    });
  });

  it('asks the database only for the fields the page uses', async () => {
    const doc = await make();
    const spy = jest.spyOn(Experience, 'findOne');
    await service.getPublished(doc.uuid);
    expect(spy.mock.results[0].value.projection()).toEqual({
      uuid: 1,
      title: 1,
      description: 1,
      coverImage: 1,
      videos: 1,
      printable: 1,
    });
    expect(spy.mock.calls[0][0]).toEqual({ uuid: doc.uuid, isPublished: true });
    spy.mockRestore();
  });

  it('copes with an older record that has only a title: nothing is undefined, everything has its empty value', async () => {
    await Experience.collection.insertOne({ uuid: UNKNOWN_UUID, title: 'Old record', isPublished: true, order: 1 });
    expect(await service.getPublished(UNKNOWN_UUID)).toStrictEqual({
      uuid: UNKNOWN_UUID,
      title: 'Old record',
      description: '',
      coverImage: null,
      videos: [],
      printable: null,
    });
  });

  it('gives an uploaded file with no stored name an empty name, and no picture as null', async () => {
    await Experience.collection.insertOne({
      uuid: UNKNOWN_UUID,
      title: 'Old record',
      isPublished: true,
      printable: { file: 'https://cdn.test/experiences/files/a.pdf' },
    });
    expect((await service.getPublished(UNKNOWN_UUID)).printable).toStrictEqual({
      image: null,
      kind: 'file',
      url: 'https://cdn.test/experiences/files/a.pdf',
      fileName: '',
      button: '',
    });
  });

  it('lets a database failure through as a plain error (never as a not found)', async () => {
    const spy = jest.spyOn(Experience, 'findOne').mockImplementation(() => {
      throw new Error('database is down');
    });
    await expect(service.getPublished(UNKNOWN_UUID)).rejects.toThrow('database is down');
    await expect(service.getPublished(UNKNOWN_UUID)).rejects.not.toBeInstanceOf(ExperienceError);
    spy.mockRestore();
  });

  it('lets a database failure in the list through as a plain error', async () => {
    const spy = jest.spyOn(Experience, 'find').mockImplementation(() => {
      throw new Error('database is down');
    });
    await expect(service.listPublished()).rejects.toThrow('database is down');
    spy.mockRestore();
  });
});

describe('the shapes on their own', () => {
  it('toPrintable gives null for nothing, undefined and null', () => {
    expect(service.toPrintable(undefined)).toBeNull();
    expect(service.toPrintable(null)).toBeNull();
    expect(service.toPrintable({})).toBeNull();
    expect(service.toPrintable({ image: null, link: '', file: null, button: 'Print here' })).toBeNull();
  });

  it('toChildDetail copes with missing optional fields', () => {
    const detail = service.toChildDetail({ uuid: UNKNOWN_UUID, title: 'T' });
    expect(detail).toEqual({
      uuid: UNKNOWN_UUID,
      title: 'T',
      description: '',
      coverImage: null,
      videos: [],
      printable: null,
    });
  });
});
