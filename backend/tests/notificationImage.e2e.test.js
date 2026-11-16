/**
 * Notification image, end to end on the server: an admin's campaign with an uploaded picture -> the send flow ->
 * the real push service -> the exact message handed to Expo for every device of the parent.
 *
 * Only the edges are stood in for (the database, the parent's device list, and Expo itself: nothing is ever sent).
 *
 * What a phone needs to show the picture:
 *  - Android: `richContent.image` (an https link) - nothing else.
 *  - iPhone: the same, AND `mutableContent: true`, so iOS runs the app's Notification Service Extension
 *    (app/targets/notification-service), which downloads the picture and attaches it.
 */

jest.mock('../models', () => ({
  NotificationCampaign: { findById: jest.fn(), findOneAndUpdate: jest.fn() },
  NotificationReceipt: { create: jest.fn(), find: jest.fn(), findOneAndUpdate: jest.fn() },
  User: { find: jest.fn() },
  ChildProfile: { find: jest.fn() },
}));

jest.mock('../services/notificationAudience.services', () => ({
  listCampaignRecipients: jest.fn(),
}));

jest.mock('../services/devicePushToken.services', () => ({
  listActiveTokensForUser: jest.fn(),
  markTokenInvalid: jest.fn(),
}));

jest.mock('../services/notificationPush.client', () => ({
  sendExpoPushMessages: jest.fn(),
}));

const { NotificationCampaign, NotificationReceipt } = require('../models');
const { listCampaignRecipients } = require('../services/notificationAudience.services');
const { listActiveTokensForUser } = require('../services/devicePushToken.services');
const { sendExpoPushMessages } = require('../services/notificationPush.client');
const { sendCampaignNow, sendCampaignTest } = require('../services/notificationSend.services');

const adminId = '507f1f77bcf86cd799439011';
const DAYTIME = new Date('2026-08-20T18:00:00.000Z');
const PICTURE = 'https://media.riseup.kids/media/images/notifications/mission.jpg';

const IPHONE = { token: 'ExponentPushToken[iphone]', platform: 'ios', clientKind: 'standalone' };
const ANDROID = { token: 'ExponentPushToken[android]', platform: 'android', clientKind: 'standalone' };

function campaignDoc({ image } = {}) {
  const doc = {
    _id: 'camp-image',
    status: 'draft',
    audience: 'all',
    destination: { kind: 'home', contentId: null },
    fallbackLanguage: 'en',
    localizations: [
      {
        languageCode: 'en',
        title: 'Mini Mission',
        message: 'Find 7 objects',
        // The campaign form stores the uploaded picture as a Media record
        imageMediaId: image ? { _id: 'media-1', url: image, width: 1920, height: 600 } : null,
      },
    ],
    delivery: { targeted: 0, sent: 0, failed: 0, opened: 0 },
    save: jest.fn().mockImplementation(async () => doc),
  };
  return doc;
}

function serveCampaign(doc, claimed = doc) {
  NotificationCampaign.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(doc) });
  NotificationCampaign.findOneAndUpdate.mockReturnValue({ populate: jest.fn().mockResolvedValue(claimed) });
}

const messagesSentToExpo = () => sendExpoPushMessages.mock.calls.flatMap((call) => call[0]);

describe('Notification image: from the campaign to the message Expo receives', () => {
  let savedBase;

  beforeEach(() => {
    jest.clearAllMocks();
    savedBase = process.env.BACKEND_BASE_URL;
    process.env.BACKEND_BASE_URL = 'https://api.riseup.kids';

    listCampaignRecipients.mockResolvedValue([{ userId: 'parent-1', childId: null, preferredLanguage: 'en' }]);
    listActiveTokensForUser.mockResolvedValue([IPHONE, ANDROID]);
    sendExpoPushMessages.mockImplementation(async (messages) => messages.map(() => ({ status: 'ok' })));
    NotificationReceipt.create.mockImplementation(async (payload) => {
      const row = { _id: `receipt-${payload.userId}`, ...payload };
      row.save = jest.fn(async () => row);
      return row;
    });
    NotificationReceipt.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
      limit: jest.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    if (savedBase === undefined) delete process.env.BACKEND_BASE_URL;
    else process.env.BACKEND_BASE_URL = savedBase;
  });

  it('send now: every device gets the uploaded picture, and the push is marked so the iPhone extension runs', async () => {
    const doc = campaignDoc({ image: PICTURE });
    serveCampaign(doc, campaignDoc({ image: PICTURE }));

    const result = await sendCampaignNow('camp-image', adminId, { now: DAYTIME });

    expect(result.status).toBe('sent');
    const messages = messagesSentToExpo();
    expect(messages.map((message) => message.to).sort()).toEqual([ANDROID.token, IPHONE.token].sort());
    messages.forEach((message) => {
      expect(message.title).toBe('Mini Mission');
      expect(message.body).toBe('Find 7 objects');
      expect(message.richContent).toEqual({ image: PICTURE });
      expect(message.mutableContent).toBe(true);
    });
  });

  it('the picture is kept on the receipt, so the in-app history shows the same one', async () => {
    serveCampaign(campaignDoc({ image: PICTURE }), campaignDoc({ image: PICTURE }));

    await sendCampaignNow('camp-image', adminId, { now: DAYTIME });

    expect(NotificationReceipt.create).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: PICTURE }));
  });

  it('the admin "Send test" carries the picture too, so a test on a phone proves the real thing', async () => {
    serveCampaign(campaignDoc({ image: PICTURE }));

    await sendCampaignTest('camp-image', adminId, 'parent-1', { now: DAYTIME });

    const messages = messagesSentToExpo();
    expect(messages).toHaveLength(2);
    messages.forEach((message) => {
      expect(message.richContent).toEqual({ image: PICTURE });
      expect(message.mutableContent).toBe(true);
      expect(message.data.isTest).toBe('true');
    });
  });

  it('Send test can be pressed again and again: each press reaches both the Android and the iPhone', async () => {
    serveCampaign(campaignDoc({ image: PICTURE }));
    // the first test is already on file, as it would be after the admin's first press
    NotificationReceipt.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: 'r-old', userId: 'parent-1', isTest: true, pushResult: 'sent' }]),
      limit: jest.fn().mockResolvedValue([]),
    });

    await sendCampaignTest('camp-image', adminId, 'parent-1', { now: DAYTIME });
    await sendCampaignTest('camp-image', adminId, 'parent-1', { now: DAYTIME });
    await sendCampaignTest('camp-image', adminId, 'parent-1', { now: DAYTIME });

    const messages = messagesSentToExpo();
    expect(messages).toHaveLength(6);
    expect(messages.filter((message) => message.to === ANDROID.token)).toHaveLength(3);
    expect(messages.filter((message) => message.to === IPHONE.token)).toHaveLength(3);
  });

  it('a campaign without a picture sends the app icon instead (still modifiable, so iPhone shows it)', async () => {
    serveCampaign(campaignDoc(), campaignDoc());

    await sendCampaignNow('camp-image', adminId, { now: DAYTIME });

    const messages = messagesSentToExpo();
    expect(messages).toHaveLength(2);
    messages.forEach((message) => {
      expect(message.richContent).toEqual({ image: 'https://api.riseup.kids/notification-assets/app-icon-1024x1024.png' });
      expect(message.mutableContent).toBe(true);
    });
  });

  it('with no picture and no public server address there is nothing to show: a plain push, not a broken link', async () => {
    delete process.env.BACKEND_BASE_URL;
    delete process.env.APP_URL;
    serveCampaign(campaignDoc(), campaignDoc());

    await sendCampaignNow('camp-image', adminId, { now: DAYTIME });

    messagesSentToExpo().forEach((message) => {
      expect(message).not.toHaveProperty('richContent');
      expect(message).not.toHaveProperty('mutableContent');
      expect(message).not.toHaveProperty('image');
    });
  });
});
