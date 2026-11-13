/**
 * The replay reward against a real in-memory MongoDB: 2 stars per replay, at most 5 per book or video and child,
 * never twice for one moment, kept apart per child and per content, and added to the child's total.
 */
const mongoose = require('mongoose');

jest.mock('../services/badgeCheck.service', () => ({ updateBadges: jest.fn().mockResolvedValue(undefined) }));

const { StarEarning, ChildStats } = require('../models');
const { awardReplayStars } = require('../services/contentReplayStars.service');

jest.setTimeout(60000);

let mongod;
const CHILD = new mongoose.Types.ObjectId();
const OTHER_CHILD = new mongoose.Types.ObjectId();
const BOOK = new mongoose.Types.ObjectId();
const OTHER_BOOK = new mongoose.Types.ObjectId();
const VIDEO = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
});

beforeEach(async () => {
  await StarEarning.deleteMany({});
  await ChildStats.deleteMany({});
});

const book = (overrides = {}) => ({ childId: CHILD, sourceType: 'book', contentId: BOOK, contentType: 'Book', title: 'Story', ...overrides });
const video = (overrides = {}) => ({ childId: CHILD, sourceType: 'video', contentId: VIDEO, contentType: 'Media', title: 'Song', ...overrides });

/** Moves every recorded replay back in time, so the next one is not "the same moment". */
const ageReplays = () => StarEarning.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 60000) } });
const total = async (childId = CHILD) => (await ChildStats.findOne({ child: childId }))?.totalStars || 0;
const earnings = (filter = {}) => StarEarning.find({ child: CHILD, ...filter }).sort({ createdAt: 1 });

describe('a replay', () => {
  it('pays 2 stars, records it as replay number 1 of 5 and adds it to the total', async () => {
    const result = await awardReplayStars(book());
    expect(result).toMatchObject({ stars: 2, replayNumber: 1, replaysLeft: 4, maxReplays: 5, skipped: null, totalStars: 2 });
    expect(await total()).toBe(2);
    const [earning] = await earnings();
    expect(earning.stars).toBe(2);
    expect(earning.source.type).toBe('book');
    expect(String(earning.source.contentId)).toBe(String(BOOK));
    expect(earning.source.contentType).toBe('Book');
    expect(earning.source.metadata).toMatchObject({ replay: true, replayNumber: 1, maxReplays: 5, title: 'Story' });
    expect(earning.description).toMatch(/replay 1 of 5/);
  });

  it('works the same for a video (source video, content type Media)', async () => {
    const result = await awardReplayStars(video());
    expect(result).toMatchObject({ stars: 2, replayNumber: 1 });
    const [earning] = await earnings();
    expect(earning.source.type).toBe('video');
    expect(earning.source.contentType).toBe('Media');
  });

  it('adds to the stars the child already has', async () => {
    const stats = await ChildStats.getOrCreate(CHILD);
    await stats.addStars(40);
    const result = await awardReplayStars(book());
    expect(result.totalStars).toBe(42);
    expect(await total()).toBe(42);
  });
});

describe('the limit: 5 replays, 10 stars', () => {
  it('pays five times in a row, then nothing, and the total never passes 10', async () => {
    const paid = [];
    for (let i = 1; i <= 8; i += 1) {
      const result = await awardReplayStars(book());
      paid.push(result.stars);
      await ageReplays();
    }
    expect(paid).toEqual([2, 2, 2, 2, 2, 0, 0, 0]);
    expect(await total()).toBe(10);
    expect(await earnings({ 'source.type': 'book' })).toHaveLength(5);
  });

  it('numbers them 1 to 5 and counts the replays left down to 0', async () => {
    const lefts = [];
    for (let i = 1; i <= 5; i += 1) {
      const result = await awardReplayStars(book());
      expect(result.replayNumber).toBe(i);
      lefts.push(result.replaysLeft);
      await ageReplays();
    }
    expect(lefts).toEqual([4, 3, 2, 1, 0]);
  });

  it('after the limit it says so (skipped: max), pays 0 and does not touch the total', async () => {
    for (let i = 0; i < 5; i += 1) {
      await awardReplayStars(book());
      await ageReplays();
    }
    const result = await awardReplayStars(book());
    expect(result).toMatchObject({ stars: 0, replaysLeft: 0, skipped: 'max', totalStars: null });
    expect(await total()).toBe(10);
  });
});

describe('never twice for one moment', () => {
  it('a second submission within 5 seconds pays nothing (skipped: duplicate)', async () => {
    await awardReplayStars(book());
    const again = await awardReplayStars(book());
    expect(again).toMatchObject({ stars: 0, skipped: 'duplicate', replayNumber: 1, replaysLeft: 4 });
    expect(await total()).toBe(2);
    expect(await earnings()).toHaveLength(1);
  });

  it('a submission after the window pays again', async () => {
    await awardReplayStars(book());
    await ageReplays();
    const again = await awardReplayStars(book());
    expect(again).toMatchObject({ stars: 2, replayNumber: 2 });
    expect(await total()).toBe(4);
  });

  it('a replay number that is already recorded is not paid a second time', async () => {
    await StarEarning.create({
      child: CHILD,
      stars: 2,
      source: { type: 'book', contentId: BOOK, contentType: 'Book', metadata: { replay: true, replayNumber: 2 } },
      createdAt: new Date(Date.now() - 60000),
    });
    // one paid replay is on record (number 2, with no number 1): the next one would also be number 2
    const result = await awardReplayStars(book());
    expect(result).toMatchObject({ stars: 0, skipped: 'duplicate' });
    expect(await total()).toBe(0);
  });
});

describe('kept apart', () => {
  it('each child has their own five replays', async () => {
    for (let i = 0; i < 5; i += 1) {
      await awardReplayStars(book());
      await ageReplays();
    }
    const other = await awardReplayStars(book({ childId: OTHER_CHILD }));
    expect(other).toMatchObject({ stars: 2, replayNumber: 1 });
    expect(await total(OTHER_CHILD)).toBe(2);
    expect(await total(CHILD)).toBe(10);
  });

  it('each book has its own five replays', async () => {
    for (let i = 0; i < 5; i += 1) {
      await awardReplayStars(book());
      await ageReplays();
    }
    const other = await awardReplayStars(book({ contentId: OTHER_BOOK }));
    expect(other).toMatchObject({ stars: 2, replayNumber: 1 });
  });

  it('a book and a video are counted separately, even with the same id', async () => {
    for (let i = 0; i < 5; i += 1) {
      await awardReplayStars(book({ contentId: VIDEO }));
      await ageReplays();
    }
    const result = await awardReplayStars(video());
    expect(result).toMatchObject({ stars: 2, replayNumber: 1 });
  });

  it('the first-time stars a child earned for the same book are not counted as replays', async () => {
    await StarEarning.create({
      child: CHILD,
      stars: 10,
      source: { type: 'book', contentId: BOOK, contentType: 'Book', metadata: { readingNumber: 1 } },
    });
    const result = await awardReplayStars(book());
    expect(result).toMatchObject({ stars: 2, replayNumber: 1 });
  });
});
