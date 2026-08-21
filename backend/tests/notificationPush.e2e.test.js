/**
 * Phase 3 e2e: register parent tokens → send → invalid token pruned for next send.
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
        if (query.invalid?.$ne === true && row.invalid) return false;
        return true;
      });
      return { lean: async () => rows };
    }),
    create: jest.fn(async (payload) => {
      const row = mockAsDoc({ _id: `tok-${mockStore.size + 1}`, invalid: false, ...payload });
      mockStore.set(row.token, row);
      return row;
    }),
  },
}));

jest.mock('../services/notificationPush.client', () => ({
  sendExpoPushMessages: jest.fn(),
}));

const { sendExpoPushMessages } = require('../services/notificationPush.client');
const { registerDevicePushToken, listActiveTokensForUser } = require('../services/devicePushToken.services');
const { deliverPush } = require('../services/notificationPush.services');

const parentId = 'parent-e2e';

describe('Notification push e2e (Phase 3)', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('registers parent devices, sends both, marks the dead token, and skips it next time', async () => {
    await registerDevicePushToken({
      userId: parentId,
      platform: 'ios',
      token: 'ExponentPushToken[dead]',
    });
    await registerDevicePushToken({
      userId: parentId,
      platform: 'android',
      token: 'ExponentPushToken[live]',
    });

    sendExpoPushMessages.mockResolvedValueOnce([
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
    ]);

    const first = await deliverPush({
      userId: parentId,
      childId: 'child-1',
      title: 'New Book',
      message: 'Hazel is ready',
      destination: { kind: 'book', contentId: 'cms-22' },
      campaignId: 'camp-e2e',
    });

    expect(first.status).toBe('sent');
    expect(first.payload.data.destinationKind).toBe('book');
    expect(mockStore.get('ExponentPushToken[dead]').invalid).toBe(true);
    expect(await listActiveTokensForUser(parentId)).toEqual([
      expect.objectContaining({ token: 'ExponentPushToken[live]' }),
    ]);

    sendExpoPushMessages.mockResolvedValueOnce([{ status: 'ok' }]);
    const second = await deliverPush({
      userId: parentId,
      title: 'New Book',
      message: 'Hazel is ready',
      destination: { kind: 'book', contentId: 'cms-22' },
      campaignId: 'camp-e2e',
    });

    expect(second.status).toBe('sent');
    expect(sendExpoPushMessages.mock.calls[1][0]).toHaveLength(1);
    expect(sendExpoPushMessages.mock.calls[1][0][0].to).toBe('ExponentPushToken[live]');
  });
});
