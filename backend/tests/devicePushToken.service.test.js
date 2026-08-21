/**
 * Phase 3 device token register / refresh / prune.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

const mockStore = new Map();

function mockAsDoc(row) {
  row.save = jest.fn(async () => row);
  return row;
}

jest.mock('../models', () => ({
  DevicePushToken: {
    findOne: jest.fn(async (query) => {
      const rows = [...mockStore.values()];
      if (query.userId && query.token) {
        return rows.find((row) => String(row.userId) === String(query.userId) && row.token === query.token) || null;
      }
      if (query.token) {
        return rows.find((row) => row.token === query.token) || null;
      }
      return null;
    }),
    find: jest.fn((query) => {
      const rows = [...mockStore.values()].filter((row) => {
        if (query.userId && String(row.userId) !== String(query.userId)) return false;
        if (query.userId?.$in && !query.userId.$in.map(String).includes(String(row.userId))) return false;
        if (query.invalid?.$ne === true && row.invalid) return false;
        return true;
      });
      return {
        lean: async () => rows,
        then: (resolve) => resolve(rows),
      };
    }),
    create: jest.fn(async (payload) => {
      const row = mockAsDoc({ _id: `tok-${mockStore.size + 1}`, invalid: false, ...payload });
      mockStore.set(row.token, row);
      return row;
    }),
    deleteOne: jest.fn(async (query) => {
      const before = mockStore.size;
      for (const [token, row] of mockStore.entries()) {
        if (String(row.userId) === String(query.userId) && row.token === query.token) {
          mockStore.delete(token);
        }
      }
      return { deletedCount: before === mockStore.size ? 0 : 1 };
    }),
    deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
  },
}));

const {
  registerDevicePushToken,
  listActiveTokensForUser,
  markTokenInvalid,
} = require('../services/devicePushToken.services');

const parentId = '507f1f77bcf86cd799439011';

describe('Device push tokens (Phase 3)', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('register token stores userId, platform, and token (3.1)', async () => {
    const row = await registerDevicePushToken({
      userId: parentId,
      platform: 'ios',
      token: 'ExponentPushToken[ios-parent]',
    });

    expect(row.userId).toBe(parentId);
    expect(row.platform).toBe('ios');
    expect(row.token).toBe('ExponentPushToken[ios-parent]');
    expect(row.invalid).toBe(false);
  });

  it('refresh same device updates lastSeen and does not duplicate rows (3.2)', async () => {
    const first = await registerDevicePushToken({
      userId: parentId,
      platform: 'android',
      token: 'ExponentPushToken[same]',
    });
    first.lastSeenAt = new Date('2026-01-01T00:00:00.000Z');

    const second = await registerDevicePushToken({
      userId: parentId,
      platform: 'android',
      token: 'ExponentPushToken[same]',
    });

    expect(second._id).toBe(first._id);
    expect(mockStore.size).toBe(1);
    expect(new Date(second.lastSeenAt).getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00.000Z').getTime());
  });

  it('invalid / expired token is marked and skipped on the next send lookup (3.3)', async () => {
    await registerDevicePushToken({
      userId: parentId,
      platform: 'ios',
      token: 'ExponentPushToken[expired]',
    });

    await markTokenInvalid('ExponentPushToken[expired]', 'invalid_token');
    const active = await listActiveTokensForUser(parentId);

    expect(mockStore.get('ExponentPushToken[expired]').invalid).toBe(true);
    expect(active).toHaveLength(0);
  });
});
