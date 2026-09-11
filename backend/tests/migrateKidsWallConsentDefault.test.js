/**
 * RUK-SEC-006 — this script now REVOKES the old auto-granted Kids Wall consent instead of
 * granting it. Real in-memory MongoDB, since the fix relies on a $expr comparison between two
 * document fields (kidsWallConsentAt vs createdAt) that a mocked query can't meaningfully assert.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-006
 */
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

const { ChildProfile } = require('../models');
const { migrateKidsWallConsentDefault } = require('../scripts/migrateKidsWallConsentDefault');

async function makeChild({ consentOffsetMs, ...overrides } = {}) {
  const child = await ChildProfile.create({
    parent: new mongoose.Types.ObjectId(),
    displayName: 'Child',
    isActive: true,
    ...overrides,
  });
  if (consentOffsetMs !== undefined) {
    child.kidsWallConsentAt = new Date(child.createdAt.getTime() + consentOffsetMs);
    await child.save();
  }
  return child;
}

describe('migrateKidsWallConsentDefault (revoke auto-granted consent)', () => {
  it('resets a child whose consent timestamp is essentially the same instant as creation', async () => {
    const auto = await makeChild({ kidsWallEnabled: true, consentOffsetMs: 5 });

    const result = await migrateKidsWallConsentDefault();

    expect(result.matchedCount).toBe(1);
    const after = await ChildProfile.findById(auto._id);
    expect(after.kidsWallEnabled).toBe(false);
    expect(after.kidsWallConsentAt).toBeNull();
    expect(after.kidsWallConsentIp).toBeNull();
  });

  it('leaves a genuine, later parent consent action untouched', async () => {
    const genuine = await makeChild({ kidsWallEnabled: true, consentOffsetMs: 5 * 60 * 1000 }); // 5 min later

    const result = await migrateKidsWallConsentDefault();

    expect(result.matchedCount).toBe(0);
    const after = await ChildProfile.findById(genuine._id);
    expect(after.kidsWallEnabled).toBe(true);
    expect(after.kidsWallConsentAt).not.toBeNull();
  });

  it('leaves a child with no consent grant at all untouched', async () => {
    const neverConsented = await makeChild();

    const result = await migrateKidsWallConsentDefault();

    expect(result.matchedCount).toBe(0);
    const after = await ChildProfile.findById(neverConsented._id);
    expect(after.kidsWallEnabled).toBe(false);
  });

  it('respects a custom auto-grant window', async () => {
    const child = await makeChild({ kidsWallEnabled: true, consentOffsetMs: 30_000 }); // 30s later

    const strict = await migrateKidsWallConsentDefault({ autoGrantWindowMs: 10_000 });
    expect(strict.matchedCount).toBe(0);

    const lenient = await migrateKidsWallConsentDefault({ autoGrantWindowMs: 60_000 });
    expect(lenient.matchedCount).toBe(1);

    const after = await ChildProfile.findById(child._id);
    expect(after.kidsWallEnabled).toBe(false);
  });
});
