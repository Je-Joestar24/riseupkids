/**
 * Chunk 9 — session.services.js: refresh-token issuance, rotation, reuse detection, and
 * revocation. Real MongoDB (mongodb-memory-server), no mocks — this is exactly the kind of
 * security-critical logic where a mocked DB could hide a real bug.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 9)
 */
const mongoose = require('mongoose');
const RefreshToken = require('../models/RefreshToken');
const sessionService = require('../services/session.services');

jest.setTimeout(60000);

let mongod;

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
  await RefreshToken.deleteMany({});
});

const USER_A = new mongoose.Types.ObjectId();
const USER_B = new mongoose.Types.ObjectId();

describe('issueRefreshToken', () => {
  it('stores only a hash of the token, never the plaintext', async () => {
    const { plainToken, doc } = await sessionService.issueRefreshToken(USER_A, { ip: '1.2.3.4' });
    expect(doc.tokenHash).not.toBe(plainToken);
    expect(doc.tokenHash).toBe(sessionService.hashToken(plainToken));

    const fromDb = await RefreshToken.findById(doc._id).lean();
    expect(JSON.stringify(fromDb)).not.toContain(plainToken);
  });

  it('sets an expiry roughly REFRESH_TOKEN_TTL_MS in the future', async () => {
    const { doc } = await sessionService.issueRefreshToken(USER_A);
    const delta = doc.expiresAt.getTime() - Date.now();
    expect(delta).toBeGreaterThan(sessionService.REFRESH_TOKEN_TTL_MS - 5000);
    expect(delta).toBeLessThanOrEqual(sessionService.REFRESH_TOKEN_TTL_MS + 5000);
  });

  it('a user can hold multiple concurrent sessions (different devices)', async () => {
    await sessionService.issueRefreshToken(USER_A, { deviceLabel: 'laptop' });
    await sessionService.issueRefreshToken(USER_A, { deviceLabel: 'phone' });
    const sessions = await sessionService.listActiveSessions(USER_A);
    expect(sessions).toHaveLength(2);
  });
});

describe('rotateRefreshToken', () => {
  it('rotates: old token is revoked and linked to the new one, new token works', async () => {
    const { plainToken } = await sessionService.issueRefreshToken(USER_A);

    const result = await sessionService.rotateRefreshToken(plainToken);
    expect(result.ok).toBe(true);
    expect(result.userId).toBe(String(USER_A));
    expect(result.plainToken).not.toBe(plainToken);

    const oldDoc = await RefreshToken.findOne({ tokenHash: sessionService.hashToken(plainToken) });
    expect(oldDoc.revokedAt).toBeTruthy();
    expect(oldDoc.replacedBy).toBeTruthy();

    const newDoc = await RefreshToken.findOne({ tokenHash: sessionService.hashToken(result.plainToken) });
    expect(newDoc).toBeTruthy();
    expect(newDoc.revokedAt).toBeNull();
    expect(String(oldDoc.replacedBy)).toBe(String(newDoc._id));
  });

  it('returns not_found for an unknown token, without throwing', async () => {
    const result = await sessionService.rotateRefreshToken('not-a-real-token');
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('returns expired for a token past its expiry, and does not rotate it', async () => {
    const { plainToken, doc } = await sessionService.issueRefreshToken(USER_A);
    doc.expiresAt = new Date(Date.now() - 1000);
    await doc.save();

    const result = await sessionService.rotateRefreshToken(plainToken);
    expect(result).toEqual({ ok: false, reason: 'expired' });

    const stillThere = await RefreshToken.findById(doc._id);
    expect(stillThere.revokedAt).toBeNull();
  });

  it('REUSE DETECTION: presenting an already-rotated token again revokes every session for that user', async () => {
    const { plainToken: original } = await sessionService.issueRefreshToken(USER_A);
    const first = await sessionService.rotateRefreshToken(original);
    expect(first.ok).toBe(true);

    // A second, unrelated legitimate session for the same user should also die.
    const { plainToken: otherSession } = await sessionService.issueRefreshToken(USER_A);

    // Now the ORIGINAL (already-rotated) token is presented again — a stolen-token replay.
    const reuse = await sessionService.rotateRefreshToken(original);
    expect(reuse).toEqual({ ok: false, reason: 'reused' });

    // The new token from the first (legitimate) rotation must now be dead too.
    const legitRotated = await sessionService.rotateRefreshToken(first.plainToken);
    expect(legitRotated.ok).toBe(false);

    // And the completely separate concurrent session for the same user is also revoked.
    const otherRotated = await sessionService.rotateRefreshToken(otherSession);
    expect(otherRotated.ok).toBe(false);
  });

  it('reuse detection for user A never touches user B sessions', async () => {
    const { plainToken: aOriginal } = await sessionService.issueRefreshToken(USER_A);
    await sessionService.rotateRefreshToken(aOriginal);
    const { plainToken: bToken } = await sessionService.issueRefreshToken(USER_B);

    await sessionService.rotateRefreshToken(aOriginal); // reuse — should only nuke USER_A

    const bStillWorks = await sessionService.rotateRefreshToken(bToken);
    expect(bStillWorks.ok).toBe(true);
  });
});

describe('revokeRefreshToken (logout)', () => {
  it('revokes exactly the given session', async () => {
    const { plainToken } = await sessionService.issueRefreshToken(USER_A);
    await sessionService.revokeRefreshToken(plainToken);

    const result = await sessionService.rotateRefreshToken(plainToken);
    expect(result.ok).toBe(false);
  });

  it('is a safe no-op for a missing/undefined token (logout must never throw)', async () => {
    await expect(sessionService.revokeRefreshToken(undefined)).resolves.toBeUndefined();
    await expect(sessionService.revokeRefreshToken('bogus')).resolves.toBeUndefined();
  });
});

describe('revokeAllForUser (logout-all / security events)', () => {
  it('revokes every active session for the user, leaves other users untouched', async () => {
    const { plainToken: a1 } = await sessionService.issueRefreshToken(USER_A);
    const { plainToken: a2 } = await sessionService.issueRefreshToken(USER_A);
    const { plainToken: b1 } = await sessionService.issueRefreshToken(USER_B);

    await sessionService.revokeAllForUser(USER_A);

    expect((await sessionService.rotateRefreshToken(a1)).ok).toBe(false);
    expect((await sessionService.rotateRefreshToken(a2)).ok).toBe(false);
    expect((await sessionService.rotateRefreshToken(b1)).ok).toBe(true);
  });
});

describe('listActiveSessions', () => {
  it('excludes revoked and expired sessions', async () => {
    const { doc: active } = await sessionService.issueRefreshToken(USER_A, { deviceLabel: 'active' });
    const { plainToken: toRevoke } = await sessionService.issueRefreshToken(USER_A, { deviceLabel: 'revoked' });
    const { doc: expired } = await sessionService.issueRefreshToken(USER_A, { deviceLabel: 'expired' });

    await sessionService.revokeRefreshToken(toRevoke);
    expired.expiresAt = new Date(Date.now() - 1000);
    await expired.save();

    const sessions = await sessionService.listActiveSessions(USER_A);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(String(active._id));
    expect(sessions[0].deviceLabel).toBe('active');
  });
});

describe('revokeSessionById — ownership enforcement', () => {
  it('parent A cannot revoke parent Bs session by id', async () => {
    const { doc: bSession } = await sessionService.issueRefreshToken(USER_B);

    const revoked = await sessionService.revokeSessionById(USER_A, bSession._id);
    expect(revoked).toBe(false);

    const stillActive = await RefreshToken.findById(bSession._id);
    expect(stillActive.revokedAt).toBeNull();
  });

  it('revokes the caller own session and returns true', async () => {
    const { doc: aSession } = await sessionService.issueRefreshToken(USER_A);

    const revoked = await sessionService.revokeSessionById(USER_A, aSession._id);
    expect(revoked).toBe(true);

    const fromDb = await RefreshToken.findById(aSession._id);
    expect(fromDb.revokedAt).toBeTruthy();
  });

  it('returns false for an unknown session id (no throw)', async () => {
    const revoked = await sessionService.revokeSessionById(USER_A, new mongoose.Types.ObjectId());
    expect(revoked).toBe(false);
  });
});
