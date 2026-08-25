jest.mock('../models', () => ({
  User: {
    find: jest.fn(),
    findById: jest.fn(),
  },
  ChildProfile: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

const { User, ChildProfile } = require('../models');
const { listCampaignRecipients } = require('../services/notificationAudience.services');

describe('notification audience test targeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ChildProfile.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
  });

  it('resolves a child profile id to the parent user for Send test', async () => {
    User.findById.mockImplementation((id) => ({
      select: () => ({
        lean: async () =>
          String(id) === 'parent-1'
            ? {
                _id: 'parent-1',
                role: 'parent',
                timezone: 'Asia/Manila',
                preferredLanguage: 'en',
              }
            : null,
      }),
    }));
    ChildProfile.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: '6a31751b683876d2c4907595', parent: 'parent-1' }),
      }),
    });
    ChildProfile.find.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: '6a31751b683876d2c4907595', parent: 'parent-1' }],
      }),
    });

    const recipients = await listCampaignRecipients('all', {
      testUserId: '6a31751b683876d2c4907595',
    });

    expect(recipients[0].userId).toBe('parent-1');
    expect(recipients[0].timezone).toBe('Asia/Manila');
  });
});
