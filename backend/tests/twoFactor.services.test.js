/**
 * Chunk 10 — TOTP enrollment, verification, and recovery codes. Real MongoDB
 * (mongodb-memory-server), no mocks for the DB layer — this is exactly the kind of
 * security-critical logic where a mocked DB could hide a real bug.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 10)
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const { authenticator } = require('otplib');

process.env.TWO_FACTOR_ENCRYPTION_KEY =
  process.env.TWO_FACTOR_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

const TwoFactorSecret = require('../models/TwoFactorSecret');
const RecoveryCode = require('../models/RecoveryCode');
const twoFactorService = require('../services/twoFactor.services');

jest.setTimeout(60000);

let mongod;
const USER_A = new mongoose.Types.ObjectId();
const USER_B = new mongoose.Types.ObjectId();

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
  await Promise.all([TwoFactorSecret.deleteMany({}), RecoveryCode.deleteMany({})]);
});

describe('startEnrollment', () => {
  it('stores the secret encrypted, never in plaintext', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');

    const doc = await TwoFactorSecret.findOne({ userId: USER_A }).select('+secret').lean();
    expect(doc.secret).not.toBe(secret);
    expect(doc.secret).not.toContain(secret);
    expect(doc.enabled).toBe(false);
  });

  it('returns a scannable otpauth URL and a QR data URL', async () => {
    const { otpauthUrl, qrDataUrl } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(otpauthUrl).toContain('Rise%20Up%20Kids');
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('a second call overwrites the pending secret rather than creating a second row', async () => {
    await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await twoFactorService.startEnrollment(USER_A, 'a@example.com');

    const count = await TwoFactorSecret.countDocuments({ userId: USER_A });
    expect(count).toBe(1);
  });

  it('regression: a stray duplicate call landing AFTER confirmation must not silently re-disable 2FA', async () => {
    // Reproduces the real bug: two setup requests in flight (e.g. a double-mounted setup
    // screen in dev), where the FIRST one's server round trip is slow enough to still be
    // pending when the SECOND one is already confirmed. Before the fix, this second
    // (delayed) startEnrollment() call would overwrite the just-enabled record back to
    // enabled: false with a fresh, unconfirmed secret — bouncing an already-enrolled admin
    // straight back to the setup screen with no way to know why.
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret));
    expect(await twoFactorService.isEnabled(USER_A)).toBe(true);

    await expect(twoFactorService.startEnrollment(USER_A, 'a@example.com')).rejects.toThrow(
      /already enabled/i
    );
    expect(await twoFactorService.isEnabled(USER_A)).toBe(true);
  });
});

describe('confirmEnrollment', () => {
  it('enables 2FA with a valid code and issues 10 recovery codes', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    const code = authenticator.generate(secret);

    const { recoveryCodes } = await twoFactorService.confirmEnrollment(USER_A, code);

    expect(recoveryCodes).toHaveLength(10);
    expect(recoveryCodes[0]).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
    expect(await twoFactorService.isEnabled(USER_A)).toBe(true);
  });

  it('rejects an invalid code and does not enable 2FA', async () => {
    await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await expect(twoFactorService.confirmEnrollment(USER_A, '000000')).rejects.toThrow(
      /invalid verification code/i
    );
    expect(await twoFactorService.isEnabled(USER_A)).toBe(false);
  });

  it('throws when there is no pending enrollment', async () => {
    await expect(twoFactorService.confirmEnrollment(USER_A, '123456')).rejects.toThrow(
      /no two-factor setup/i
    );
  });

  it('throws when 2FA is already enabled', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret));

    await expect(
      twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret))
    ).rejects.toThrow(/already enabled/i);
  });
});

describe('verifyTotp', () => {
  it('accepts a valid live code once enabled', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret));

    expect(await twoFactorService.verifyTotp(USER_A, authenticator.generate(secret))).toBe(true);
  });

  it('rejects a wrong code', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret));

    expect(await twoFactorService.verifyTotp(USER_A, '000000')).toBe(false);
  });

  it('returns false (not an error) for a user with no 2FA enabled at all', async () => {
    expect(await twoFactorService.verifyTotp(USER_A, '123456')).toBe(false);
  });

  it('a code from a PENDING (not yet confirmed) enrollment does not verify a real login', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    // enrollment never confirmed
    expect(await twoFactorService.verifyTotp(USER_A, authenticator.generate(secret))).toBe(false);
  });
});

describe('verifyRecoveryCode', () => {
  async function enrollAndGetCodes(userId) {
    const { secret } = await twoFactorService.startEnrollment(userId, 'x@example.com');
    const { recoveryCodes } = await twoFactorService.confirmEnrollment(userId, authenticator.generate(secret));
    return recoveryCodes;
  }

  it('accepts a valid recovery code, formatted with the dash', async () => {
    const codes = await enrollAndGetCodes(USER_A);
    expect(await twoFactorService.verifyRecoveryCode(USER_A, codes[0])).toBe(true);
  });

  it('accepts the same code with the dash stripped (case-insensitively)', async () => {
    const codes = await enrollAndGetCodes(USER_A);
    const noDash = codes[1].replace('-', '').toLowerCase();
    expect(await twoFactorService.verifyRecoveryCode(USER_A, noDash)).toBe(true);
  });

  it('SINGLE USE: the same code is rejected on a second attempt', async () => {
    const codes = await enrollAndGetCodes(USER_A);
    expect(await twoFactorService.verifyRecoveryCode(USER_A, codes[2])).toBe(true);
    expect(await twoFactorService.verifyRecoveryCode(USER_A, codes[2])).toBe(false);
  });

  it('rejects an unknown code', async () => {
    await enrollAndGetCodes(USER_A);
    expect(await twoFactorService.verifyRecoveryCode(USER_A, 'AAAAA-AAAAA')).toBe(false);
  });

  it('a recovery code for user A does not work for user B', async () => {
    const codesA = await enrollAndGetCodes(USER_A);
    await enrollAndGetCodes(USER_B);
    expect(await twoFactorService.verifyRecoveryCode(USER_B, codesA[0])).toBe(false);
  });
});

describe('regenerateRecoveryCodes', () => {
  it('invalidates the previous batch immediately', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    const { recoveryCodes: firstBatch } = await twoFactorService.confirmEnrollment(
      USER_A,
      authenticator.generate(secret)
    );

    const secondBatch = await twoFactorService.regenerateRecoveryCodes(USER_A);

    expect(secondBatch).toHaveLength(10);
    expect(await twoFactorService.verifyRecoveryCode(USER_A, firstBatch[0])).toBe(false);
    expect(await twoFactorService.verifyRecoveryCode(USER_A, secondBatch[0])).toBe(true);
  });
});

describe('disable', () => {
  it('removes the secret and all recovery codes', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    await twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret));

    await twoFactorService.disable(USER_A);

    expect(await twoFactorService.isEnabled(USER_A)).toBe(false);
    expect(await RecoveryCode.countDocuments({ userId: USER_A })).toBe(0);
  });
});

describe('classifyCode — regression: must not misroute a hex recovery code as TOTP', () => {
  it('classifies a 6-digit TOTP code correctly', () => {
    expect(twoFactorService.classifyCode('123456')).toBe('totp');
    expect(twoFactorService.classifyCode(' 123 456 ')).toBe('totp');
  });

  it('classifies a 10-char hex recovery code correctly, with or without the dash', () => {
    expect(twoFactorService.classifyCode('ABCDE-12345')).toBe('recovery');
    expect(twoFactorService.classifyCode('abcde12345')).toBe('recovery');
  });

  it('REGRESSION: a recovery code whose digits happen to reduce to exactly 6 after stripping letters is still classified as "recovery", never "totp"', () => {
    // These are real generateRecoveryCodePlain()-shaped values discovered to reproduce the bug —
    // stripping non-digits from them leaves exactly 6 digits, which the old (buggy) call sites
    // used as their TOTP/recovery discriminator.
    const knownTrapCodes = ['0967A-FA693', 'C1F83-C081A', '2B2CD-963C8', '51297-CBAE4'];
    for (const code of knownTrapCodes) {
      expect(twoFactorService.classifyCode(code)).toBe('recovery');
    }
  });

  it('STATISTICAL: across 500 freshly generated recovery codes, none are ever classified as totp', () => {
    for (let i = 0; i < 500; i += 1) {
      const plain = crypto.randomBytes(5).toString('hex').toUpperCase();
      const formatted = `${plain.slice(0, 5)}-${plain.slice(5)}`;
      expect(twoFactorService.classifyCode(formatted)).toBe('recovery');
    }
  });

  it('classifies garbage as unknown', () => {
    expect(twoFactorService.classifyCode('')).toBe('unknown');
    expect(twoFactorService.classifyCode('short')).toBe('unknown');
    expect(twoFactorService.classifyCode('way-too-long-to-be-anything-valid')).toBe('unknown');
  });
});

describe('countRemainingRecoveryCodes', () => {
  it('decreases as codes are used', async () => {
    const { secret } = await twoFactorService.startEnrollment(USER_A, 'a@example.com');
    const { recoveryCodes } = await twoFactorService.confirmEnrollment(USER_A, authenticator.generate(secret));

    expect(await twoFactorService.countRemainingRecoveryCodes(USER_A)).toBe(10);
    await twoFactorService.verifyRecoveryCode(USER_A, recoveryCodes[0]);
    expect(await twoFactorService.countRemainingRecoveryCodes(USER_A)).toBe(9);
  });
});
