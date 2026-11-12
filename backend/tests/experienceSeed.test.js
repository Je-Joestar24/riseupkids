/**
 * Moving the Strawberry Banana Smoothie experience into the database (scripts/seedSmoothieExperience.js):
 * it is created once, complete and published, with the two production videos in order; running it again
 * changes nothing; and it needs an admin to own it.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Experience = require('../models/Experience');
const User = require('../models/User');
const { seedSmoothieExperience, SMOOTHIE } = require('../scripts/seedSmoothieExperience');
const { findPublishProblems, normalizeBunnyEmbedUrl, validateExperienceInput } = require('../utils/experienceValidation.util');

jest.setTimeout(60000);

let mongod;
const quiet = { info: jest.fn() };

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
});

beforeEach(async () => {
  await Promise.all([Experience.deleteMany({}), User.deleteMany({})]);
  quiet.info.mockClear();
});

const makeAdmin = () => User.create({ name: 'Admin', email: 'seed-admin@example.com', password: 'CorrectHorse42', role: 'admin' });

describe('seedSmoothieExperience', () => {
  it('creates the experience, published, with the two videos in order, owned by the first admin', async () => {
    const admin = await makeAdmin();
    const result = await seedSmoothieExperience({ log: quiet });

    expect(result.created).toBe(true);
    const stored = await Experience.findOne({ uuid: result.uuid });
    expect(stored).toMatchObject({ title: 'Strawberry Banana Smoothie', isPublished: true, order: 1 });
    expect(stored.publishedAt).toBeInstanceOf(Date);
    expect(String(stored.createdBy)).toBe(String(admin._id));
    expect(stored.videos.map((v) => v.title)).toEqual(['Vocabulary, verbs and pronunciation', 'The story']);
    expect(stored.videos.map((v) => v.position)).toEqual([1, 2]);
    expect(stored.printable.link).toBe('https://riseup.kids/downloads/strawberry-banana-smoothie-recipe.pdf');
    expect(stored.printable.button).toBe('Print recipe here');
    expect(stored.coverImage).toBeNull();
  });

  it('is safe to run twice: the second run changes nothing', async () => {
    await makeAdmin();
    const first = await seedSmoothieExperience({ log: quiet });
    const second = await seedSmoothieExperience({ log: quiet });
    expect(second).toEqual({ created: false, uuid: first.uuid });
    expect(await Experience.countDocuments()).toBe(1);
    expect(quiet.info).toHaveBeenLastCalledWith(expect.stringContaining('already exists'));
  });

  it('goes after the experiences that are already there', async () => {
    const admin = await makeAdmin();
    await Experience.create({ title: 'Existing', order: 7, createdBy: admin._id });
    await seedSmoothieExperience({ log: quiet });
    expect((await Experience.findOne({ title: SMOOTHIE.title })).order).toBe(8);
  });

  it('says clearly what to do when there is no admin, and creates nothing', async () => {
    await expect(seedSmoothieExperience({ log: quiet })).rejects.toThrow(/No admin user found/);
    expect(await Experience.countDocuments()).toBe(0);
  });

  it('an owner can be given instead of looking for an admin', async () => {
    const owner = new mongoose.Types.ObjectId();
    const { uuid } = await seedSmoothieExperience({ createdBy: owner, log: quiet });
    expect(String((await Experience.findOne({ uuid })).createdBy)).toBe(String(owner));
  });

  it('what it stores passes the same rules as the admin screen: links, printable and publishing', async () => {
    const { value, errors } = validateExperienceInput({
      title: SMOOTHIE.title,
      videos: SMOOTHIE.videos,
      printable: SMOOTHIE.printable,
      isPublished: true,
    });
    expect(errors).toEqual([]);
    expect(findPublishProblems(value)).toEqual([]);
    for (const v of SMOOTHIE.videos) expect(normalizeBunnyEmbedUrl(v.embedUrl)).toBe(v.embedUrl);
  });

  it('uses the same two videos as the app and the website, so nothing changes for children', () => {
    const appConfig = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'config', 'experiences.ts'), 'utf8');
    for (const v of SMOOTHIE.videos) expect(appConfig).toContain(v.embedUrl);
  });
});
