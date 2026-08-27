/**
 * Phase 1 notification campaign service tests.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../models', () => ({
  NotificationCampaign: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
  Media: {
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('../services/s3.service', () => ({
  uploadFileFromMulter: jest.fn(),
}));

const NotificationCampaignSchema = require('../models/NotificationCampaign');
const { NotificationCampaign, Media } = require('../models');
const s3Service = require('../services/s3.service');
const {
  registerNotificationLanguage,
  resetNotificationLanguageCatalog,
  isCatalogLanguage,
} = require('../config/notificationCatalog');
const {
  assertNotificationImageMime,
  readImageDimensions,
} = require('../utils/notificationImage.util');
const {
  createCampaign,
  listCampaigns,
  duplicateCampaign,
  previewCampaign,
  uploadNotificationImage,
} = require('../services/notificationCampaign.services');

const adminId = '507f1f77bcf86cd799439011';

const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

function basePayload(overrides = {}) {
  return {
    internalName: 'Story Time Reminder - August Week 2',
    type: 'story_time',
    audience: 'all',
    destination: { kind: 'story_time' },
    localizations: [
      { languageCode: 'en', title: 'Story Time is waiting!', message: 'A new adventure is ready for you.' },
      { languageCode: 'pt', title: 'A Hora da História espera!', message: 'Uma nova aventura está pronta.' },
      { languageCode: 'es', title: '¡La Hora del Cuento te espera!', message: 'Una nueva aventura está lista.' },
    ],
    ...overrides,
  };
}

function mockCreatedDoc(data) {
  const populated = { ...data, _id: data._id || 'camp-1' };
  return {
    ...populated,
    populate: jest.fn().mockResolvedValue(populated),
  };
}

function mockListChain(docs) {
  const lean = jest.fn().mockResolvedValue(docs);
  const populateCreatedBy = jest.fn().mockReturnValue({ lean });
  const populateLoc = jest.fn().mockReturnValue({ populate: populateCreatedBy });
  const limit = jest.fn().mockReturnValue({ populate: populateLoc });
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  NotificationCampaign.find.mockReturnValue({ sort });
  return { sort, skip, limit };
}

describe('Notification campaign schema', () => {
  it('does not hard-code EN / PT / ES as a localization language enum (1.3)', () => {
    const languagePath = NotificationCampaignSchema.schema
      .path('localizations')
      .schema.path('languageCode');

    expect(languagePath.options.enum).toBeUndefined();
    expect(languagePath.enumValues == null || languagePath.enumValues.length === 0).toBe(true);
    expect(languagePath.instance).toBe('String');
  });

  it('stores title, message, and imageMediaId as separate localization fields (1.4)', () => {
    const locSchema = NotificationCampaignSchema.schema.path('localizations').schema;
    expect(locSchema.path('title')).toBeTruthy();
    expect(locSchema.path('message')).toBeTruthy();
    expect(locSchema.path('imageMediaId')).toBeTruthy();
    expect(locSchema.path('title')).not.toBe(locSchema.path('imageMediaId'));
  });
});

describe('Notification campaign service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationLanguageCatalog();
  });

  it('creates one campaign with EN + PT + ES localizations (1.1)', async () => {
    const payload = basePayload();
    NotificationCampaign.create.mockImplementation(async (doc) => mockCreatedDoc({ ...doc, _id: 'camp-1' }));

    const created = await createCampaign(payload, adminId);

    expect(NotificationCampaign.create).toHaveBeenCalledTimes(1);
    const saved = NotificationCampaign.create.mock.calls[0][0];
    expect(saved.localizations).toHaveLength(3);
    expect(saved.localizations.map((row) => row.languageCode).sort()).toEqual(['en', 'es', 'pt']);
    expect(saved.status).toBe('draft');
    expect(saved.createdBy).toBe(adminId);
    expect(saved.updatedBy).toBe(adminId);
    expect(created.localizations).toHaveLength(3);
  });

  it('accepts a newly registered catalog language without a schema change (1.2)', async () => {
    registerNotificationLanguage({ code: 'fr', name: 'French' });
    expect(isCatalogLanguage('fr')).toBe(true);

    NotificationCampaign.create.mockImplementation(async (doc) => mockCreatedDoc({ ...doc, _id: 'camp-fr' }));

    await createCampaign(
      basePayload({
        localizations: [
          { languageCode: 'en', title: 'Hello', message: 'Welcome' },
          { languageCode: 'fr', title: 'Bonjour', message: 'Bienvenue' },
        ],
      }),
      adminId
    );

    const saved = NotificationCampaign.create.mock.calls[0][0];
    expect(saved.localizations.map((row) => row.languageCode)).toEqual(['en', 'fr']);
  });

  it('rejects a language that is not in the catalog', async () => {
    await expect(
      createCampaign(
        basePayload({
          localizations: [{ languageCode: 'zz', title: 'X', message: 'Y' }],
        }),
        adminId
      )
    ).rejects.toThrow(/not in the platform catalog/i);
    expect(NotificationCampaign.create).not.toHaveBeenCalled();
  });

  it('duplicates a campaign into a new draft without changing the original (1.5)', async () => {
    const original = {
      _id: 'camp-1',
      internalName: 'Story Time Reminder Week 1',
      type: 'story_time',
      audience: 'children',
      destination: { kind: 'book', contentId: 'book-9' },
      fallbackLanguage: 'en',
      localizations: [
        { languageCode: 'en', title: 'A', message: 'B', imageMediaId: 'media-1' },
      ],
      status: 'scheduled',
      sendAt: new Date('2026-08-20T12:00:00.000Z'),
    };
    NotificationCampaign.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(original),
    });
    NotificationCampaign.create.mockImplementation(async (doc) => mockCreatedDoc({ ...doc, _id: 'camp-2' }));

    const copy = await duplicateCampaign('camp-1', adminId);

    expect(copy._id).toBe('camp-2');
    expect(copy._id).not.toBe(original._id);
    const saved = NotificationCampaign.create.mock.calls[0][0];
    expect(saved.status).toBe('draft');
    expect(saved.sendAt).toBeNull();
    expect(saved.type).toBe(original.type);
    expect(saved.audience).toBe(original.audience);
    expect(saved.destination).toEqual(original.destination);
    expect(saved.localizations).toEqual(original.localizations);
    expect(saved.internalName).toBe('Story Time Reminder Week 1 (copy)');
    expect(original.status).toBe('scheduled');
    expect(original.internalName).toBe('Story Time Reminder Week 1');
  });

  it('lists campaigns with pagination and status/type filters (1.7)', async () => {
    const docs = [{ _id: 'a' }, { _id: 'b' }];
    const { skip, limit } = mockListChain(docs);
    NotificationCampaign.countDocuments.mockResolvedValue(25);

    const result = await listCampaigns({ page: 2, limit: 10, status: 'draft', type: 'story_time' });

    expect(NotificationCampaign.find).toHaveBeenCalledWith({ status: 'draft', type: 'story_time' });
    expect(skip).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(docs);
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 25, pages: 3 });
  });

  it('returns a preview payload without sending (1.9)', async () => {
    const campaign = {
      _id: 'camp-1',
      internalName: 'Story Time Reminder',
      type: 'story_time',
      audience: 'all',
      destination: { kind: 'story_time', contentId: null },
      fallbackLanguage: 'en',
      localizations: [
        {
          languageCode: 'en',
          title: 'Story Time is waiting!',
          message: 'A new adventure is ready for you.',
          imageMediaId: {
            _id: 'media-1',
            url: 'https://cdn.example/notice.png',
            width: 1920,
            height: 600,
            mimeType: 'image/png',
          },
        },
      ],
    };
    const secondPopulate = jest.fn().mockResolvedValue(campaign);
    const firstPopulate = jest.fn().mockReturnValue({ populate: secondPopulate });
    NotificationCampaign.findById.mockReturnValue({ populate: firstPopulate });

    const preview = await previewCampaign('camp-1', 'en');

    expect(preview).toMatchObject({
      campaignId: 'camp-1',
      language: 'en',
      title: 'Story Time is waiting!',
      message: 'A new adventure is ready for you.',
      destination: { kind: 'story_time', contentId: null },
      image: {
        url: 'https://cdn.example/notice.png',
        width: 1920,
        height: 600,
      },
    });
    expect(campaign.status).toBeUndefined();
    expect(s3Service.uploadFileFromMulter).not.toHaveBeenCalled();
  });
});

describe('Notification image upload (1.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects types other than JPG, PNG, or WebP', () => {
    expect(() => assertNotificationImageMime('image/gif')).toThrow(/JPG, PNG, or WebP/i);
    expect(() => assertNotificationImageMime('video/mp4')).toThrow(/JPG, PNG, or WebP/i);
  });

  it('reads natural PNG size and stores width/height without cropping', async () => {
    const dims = readImageDimensions(PNG_1X1, 'image/png');
    expect(dims).toEqual({ width: 1, height: 1 });

    s3Service.uploadFileFromMulter.mockResolvedValue({
      url: 'https://cdn.example/media/images/notifications/one.png',
      s3Key: 'media/images/notifications/one.png',
    });
    Media.create.mockImplementation(async (doc) => doc);

    const file = {
      originalname: 'banner.png',
      mimetype: 'image/png',
      buffer: PNG_1X1,
      size: PNG_1X1.length,
    };

    const media = await uploadNotificationImage(file, adminId);

    expect(s3Service.uploadFileFromMulter).toHaveBeenCalledWith(file, 'media/images/notifications');
    expect(media.width).toBe(1);
    expect(media.height).toBe(1);
    expect(media.mimeType).toBe('image/png');
    expect(media.buffer).toBeUndefined();
  });
});
