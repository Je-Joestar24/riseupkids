/**
 * Phase 3 Expo push payload, parent-device targeting, and per-token failure isolation.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../services/devicePushToken.services', () => ({
  listActiveTokensForUser: jest.fn(),
  markTokenInvalid: jest.fn(),
}));

jest.mock('../services/notificationPush.client', () => ({
  sendExpoPushMessages: jest.fn(),
}));

const { listActiveTokensForUser, markTokenInvalid } = require('../services/devicePushToken.services');
const { buildPushPayload, deliverPush } = require('../services/notificationPush.services');

const parentId = 'parent-1';

describe('Notification push (Phase 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('push payload includes title, message, and destination (3.4)', () => {
    const payload = buildPushPayload({
      title: 'Story Time is waiting!',
      message: 'A new adventure is ready.',
      destination: { kind: 'book', contentId: 'cms-22' },
      campaignId: 'camp-1',
      childId: 'child-9',
      isTest: false,
    });

    expect(payload.title).toBe('Story Time is waiting!');
    expect(payload.body).toBe('A new adventure is ready.');
    expect(payload.data.destinationKind).toBe('book');
    expect(payload.data.contentId).toBe('cms-22');
    expect(payload.data.campaignId).toBe('camp-1');
    expect(payload.data.childId).toBe('child-9');
    expect(payload.data.isTest).toBe('false');
    expect(payload.channelId).toBe('riseupkids-default');
    expect(payload.priority).toBe('high');
    expect(payload.interruptionLevel).toBe('time-sensitive');
    expect(payload.data).not.toHaveProperty('null');
    expect(Object.values(payload.data).every((value) => typeof value === 'string')).toBe(true);
  });

  it('attaches the campaign image to the Expo payload when one was uploaded', () => {
    const payload = buildPushPayload({
      title: 'Mini Mission',
      message: 'Find 7 objects',
      imageUrl: 'https://cdn.example/mission.png',
    });

    expect(payload.image).toBe('https://cdn.example/mission.png');
    expect(payload.richContent).toEqual({ image: 'https://cdn.example/mission.png' });
  });

  it('falls back to the Play Store app icon when the campaign has no image', () => {
    const previous = process.env.BACKEND_BASE_URL;
    process.env.BACKEND_BASE_URL = 'https://api.riseup.kids';
    try {
      const payload = buildPushPayload({
        title: 'Story Time is waiting!',
        message: 'A new adventure is ready.',
      });

      expect(payload.image).toBe('https://api.riseup.kids/notification-assets/app-icon-1024x1024.png');
      expect(payload.richContent.image).toBe('https://api.riseup.kids/notification-assets/app-icon-1024x1024.png');
    } finally {
      if (previous === undefined) delete process.env.BACKEND_BASE_URL;
      else process.env.BACKEND_BASE_URL = previous;
    }
  });

  it('parent vs children audience resolves to parent devices (3.6)', async () => {
    listActiveTokensForUser.mockResolvedValue([
      { token: 'ExponentPushToken[parent-phone]', platform: 'ios', userId: parentId },
    ]);
    const sendMessages = jest.fn().mockResolvedValue([{ status: 'ok' }]);

    const result = await deliverPush(
      {
        userId: parentId,
        childId: 'child-profile-99',
        title: 'Mini Mission',
        message: 'Find 7 objects',
        destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
        campaignId: 'camp-2',
      },
      { sendMessages }
    );

    expect(listActiveTokensForUser).toHaveBeenCalledWith(parentId);
    expect(listActiveTokensForUser).not.toHaveBeenCalledWith('child-profile-99');
    expect(sendMessages.mock.calls[0][0][0].to).toBe('ExponentPushToken[parent-phone]');
    expect(result.status).toBe('sent');
  });

  it('provider failure on one token does not abort the rest (3.9)', async () => {
    listActiveTokensForUser.mockResolvedValue([
      { token: 'ExponentPushToken[bad]', platform: 'ios', userId: parentId },
      { token: 'ExponentPushToken[good]', platform: 'android', userId: parentId },
    ]);
    const sendMessages = jest.fn().mockResolvedValue([
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok' },
    ]);

    const result = await deliverPush(
      {
        userId: parentId,
        title: 'Live lesson',
        message: 'Starts soon',
        destination: { kind: 'live_lesson', contentId: 'live-1' },
        campaignId: 'camp-3',
      },
      { sendMessages, invalidateToken: markTokenInvalid }
    );

    expect(result.status).toBe('sent');
    expect(result.sentCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(markTokenInvalid).toHaveBeenCalledWith('ExponentPushToken[bad]', 'invalid_token');
    expect(markTokenInvalid).not.toHaveBeenCalledWith('ExponentPushToken[good]', expect.anything());
  });

  it('sends Expo Go and standalone tokens in separate Expo requests', async () => {
    listActiveTokensForUser.mockResolvedValue([
      { token: 'ExponentPushToken[go]', platform: 'ios', userId: parentId, clientKind: 'expo-go' },
      { token: 'ExponentPushToken[apk]', platform: 'android', userId: parentId, clientKind: 'standalone' },
    ]);
    const sendMessages = jest.fn().mockResolvedValue([{ status: 'ok' }]);

    const result = await deliverPush(
      {
        userId: parentId,
        title: 'Story Time',
        message: 'Ready',
        destination: { kind: 'home' },
        campaignId: 'camp-4',
      },
      { sendMessages }
    );

    expect(result.status).toBe('sent');
    expect(sendMessages).toHaveBeenCalledTimes(2);
    expect(sendMessages.mock.calls[0][0]).toHaveLength(1);
    expect(sendMessages.mock.calls[1][0]).toHaveLength(1);
    expect(sendMessages.mock.calls.map((call) => call[0][0].to).sort()).toEqual([
      'ExponentPushToken[apk]',
      'ExponentPushToken[go]',
    ]);
  });

  it('retries mixed-experience batches one token at a time', async () => {
    listActiveTokensForUser.mockResolvedValue([
      { token: 'ExponentPushToken[go]', platform: 'ios', userId: parentId },
      { token: 'ExponentPushToken[apk]', platform: 'android', userId: parentId },
    ]);
    const mixed = Object.assign(new Error('PUSH_TOO_MANY_EXPERIENCE_IDS: mixed experiences'), {
      expoErrors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }],
    });
    const sendMessages = jest
      .fn()
      .mockRejectedValueOnce(mixed)
      .mockResolvedValueOnce([{ status: 'ok' }])
      .mockResolvedValueOnce([{ status: 'ok' }]);

    const result = await deliverPush(
      {
        userId: parentId,
        title: 'Story Time',
        message: 'Ready',
        destination: { kind: 'home' },
        campaignId: 'camp-5',
      },
      { sendMessages }
    );

    expect(result.status).toBe('sent');
    expect(result.sentCount).toBe(2);
    expect(sendMessages).toHaveBeenCalledTimes(3);
    expect(sendMessages.mock.calls[0][0]).toHaveLength(2);
    expect(sendMessages.mock.calls[1][0]).toHaveLength(1);
    expect(sendMessages.mock.calls[2][0]).toHaveLength(1);
  });
});
