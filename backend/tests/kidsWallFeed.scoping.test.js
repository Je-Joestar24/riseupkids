/**
 * RUK-SEC-006 — the cross-family Kids Wall feed (`GET /api/kids-wall/all` ->
 * kidsWallService.getChildPosts(null, ...)) must show only approved posts from children who
 * currently have real, active Kids Wall consent — and a caller must never be able to override
 * that with a query filter (the original bug: `?isApproved=false` leaked pending posts and every
 * family's children regardless of consent).
 *
 * Real in-memory MongoDB — same pattern as tests/auth.lockout.e2e.test.js.
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
const KidsWallPost = require('../models/KidsWallPost');
const { getChildPosts, getConsentedChildIds } = require('../services/kidsWall.service');

async function makeChild(overrides = {}) {
  return ChildProfile.create({
    parent: new mongoose.Types.ObjectId(),
    displayName: 'Child',
    isActive: true,
    ...overrides,
  });
}

async function makePost(childId, overrides = {}) {
  return KidsWallPost.create({
    child: childId,
    type: 'image',
    title: 'A post',
    content: 'Hello',
    isApproved: true,
    isActive: true,
    ...overrides,
  });
}

describe('Kids Wall cross-family feed — consent + approval scoping', () => {
  it('only returns approved posts from children with current, real consent', async () => {
    const consented = await makeChild({ kidsWallEnabled: true, kidsWallConsentAt: new Date() });
    const notConsented = await makeChild(); // schema default: off, no timestamp
    const revoked = await makeChild({ kidsWallEnabled: false, kidsWallConsentAt: new Date() }); // was on, turned off

    await makePost(consented._id, { title: 'from consented child' });
    await makePost(notConsented._id, { title: 'from never-consented child' });
    await makePost(revoked._id, { title: 'from revoked child' });

    const feed = await getChildPosts(null);

    expect(feed).toHaveLength(1);
    expect(feed[0].title).toBe('from consented child');
  });

  it('never returns a pending (unapproved) post, even from a consented child', async () => {
    const consented = await makeChild({ kidsWallEnabled: true, kidsWallConsentAt: new Date() });
    await makePost(consented._id, { title: 'pending', isApproved: false });

    const feed = await getChildPosts(null);
    expect(feed).toHaveLength(0);
  });

  it('ignores a caller-supplied isApproved/isActive override on the cross-family feed', async () => {
    const consented = await makeChild({ kidsWallEnabled: true, kidsWallConsentAt: new Date() });
    await makePost(consented._id, { title: 'pending', isApproved: false });
    await makePost(consented._id, { title: 'inactive', isActive: false });
    await makePost(consented._id, { title: 'visible' });

    // The historical bug: passing isApproved=false / isActive=false as a client would.
    const feed = await getChildPosts(null, { isApproved: false, isActive: false });

    expect(feed).toHaveLength(1);
    expect(feed[0].title).toBe('visible');
  });

  it('a child who never consented never appears, no matter what filters are passed', async () => {
    const notConsented = await makeChild();
    await makePost(notConsented._id);

    const feed = await getChildPosts(null, { isApproved: undefined, isActive: undefined });
    expect(feed).toHaveLength(0);
  });

  it('getConsentedChildIds only includes children with both the flag and a timestamp', async () => {
    const a = await makeChild({ kidsWallEnabled: true, kidsWallConsentAt: new Date() });
    await makeChild({ kidsWallEnabled: true, kidsWallConsentAt: null }); // bug shape: flag true, no timestamp
    await makeChild(); // default off

    const ids = (await getConsentedChildIds()).map(String);
    expect(ids).toEqual([String(a._id)]);
  });

  it('a specific-child fetch (childId provided) is unaffected by the consent filter', async () => {
    // getChildPosts(childId, ...) is reached only after the controller has already verified the
    // requesting parent owns this child, so it intentionally does not re-check consent here.
    const child = await makeChild(); // no consent
    await makePost(child._id, { title: 'own child post' });

    const posts = await getChildPosts(child._id);
    expect(posts).toHaveLength(1);
  });
});
