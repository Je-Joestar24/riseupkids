jest.mock('../models', () => ({
  User: {
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  },
}));

const { User } = require('../models');
const { reportUserTimezone } = require('../services/userTimezone.services');

const parentId = '507f1f77bcf86cd799439011';

describe('user timezone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the last-seen device IANA timezone on the parent account', async () => {
    const zone = await reportUserTimezone({ userId: parentId, timezone: 'Europe/Madrid' });

    expect(zone).toBe('Europe/Madrid');
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: parentId },
      expect.objectContaining({
        $set: expect.objectContaining({
          timezone: 'Europe/Madrid',
          timezoneSource: 'device',
        }),
      })
    );
  });

  it('ignores language codes and invalid zones', async () => {
    expect(await reportUserTimezone({ userId: parentId, timezone: 'pt' })).toBeNull();
    expect(await reportUserTimezone({ userId: parentId, timezone: 'es' })).toBeNull();
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});
