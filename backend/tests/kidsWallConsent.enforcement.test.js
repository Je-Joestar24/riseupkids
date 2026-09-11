/**
 * RUK-SEC-006 — Kids Wall consent, end to end against a real in-memory MongoDB.
 *
 * Proves: a newly created child starts WITHOUT Kids Wall consent (no auto-grant), posting is
 * blocked until a parent takes the explicit consent action, that action records a timestamp +
 * IP, and turning consent back off blocks posting again while keeping the historical record.
 *
 * Uses mongodb-memory-server (real mongod, no external services) — same pattern as
 * tests/auth.lockout.e2e.test.js.
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
const { createChild } = require('../services/children.services');
const {
  assertKidsWallEnabled,
  updateKidsWallConsent,
  hasKidsWallConsent,
  NOT_ENABLED_ERROR,
} = require('../services/kidsWallConsent.service');

const PARENT_ID = new mongoose.Types.ObjectId();

describe('Kids Wall consent — real end-to-end enforcement', () => {
  it('a newly created child has Kids Wall off, with no consent timestamp (no auto-grant)', async () => {
    const child = await createChild(PARENT_ID, { displayName: 'Alex' });

    expect(child.kidsWallEnabled).toBe(false);
    expect(child.kidsWallConsentAt).toBeFalsy();
    expect(hasKidsWallConsent(child)).toBe(false);
  });

  it('posting is blocked until a parent explicitly grants consent', async () => {
    const child = await createChild(PARENT_ID, { displayName: 'Alex' });

    await expect(assertKidsWallEnabled(child._id)).rejects.toThrow(NOT_ENABLED_ERROR);

    const updated = await updateKidsWallConsent(
      child._id,
      PARENT_ID,
      { enabled: true },
      { ip: '203.0.113.42' }
    );
    expect(updated.kidsWallEnabled).toBe(true);
    expect(updated.kidsWallConsentAt).toBeTruthy();

    const stored = await ChildProfile.findById(child._id);
    expect(stored.kidsWallConsentIp).toBe('203.0.113.42');

    // Now posting is allowed.
    await expect(assertKidsWallEnabled(child._id)).resolves.toBeTruthy();
  });

  it('turning consent back off blocks posting again but keeps the historical consent timestamp', async () => {
    const child = await createChild(PARENT_ID, { displayName: 'Alex' });
    await updateKidsWallConsent(child._id, PARENT_ID, { enabled: true }, { ip: '203.0.113.42' });

    const grantedAt = (await ChildProfile.findById(child._id)).kidsWallConsentAt;

    await updateKidsWallConsent(child._id, PARENT_ID, { enabled: false });

    await expect(assertKidsWallEnabled(child._id)).rejects.toThrow(NOT_ENABLED_ERROR);

    const afterRevoke = await ChildProfile.findById(child._id);
    expect(afterRevoke.kidsWallEnabled).toBe(false);
    expect(afterRevoke.kidsWallConsentAt).toEqual(grantedAt); // historical record kept, access still blocked
  });

  it('a parent cannot grant consent for another parent\'s child', async () => {
    const otherParentId = new mongoose.Types.ObjectId();
    const child = await createChild(PARENT_ID, { displayName: 'Alex' });

    await expect(
      updateKidsWallConsent(child._id, otherParentId, { enabled: true })
    ).rejects.toThrow('Child profile not found or does not belong to you');
  });
});
