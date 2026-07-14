jest.mock('../models/AccountDeletionRequest', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models', () => ({
  User: {
    findById: jest.fn(),
  },
  ChildProfile: {
    updateMany: jest.fn(),
  },
}));

const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const { User, ChildProfile } = require('../models');
const { restoreParent, updateParent, archiveParent } = require('../services/parents.services');

describe('parents.services deletion safeguards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks restore when parent account deletion is pending', async () => {
    User.findById.mockResolvedValue({
      _id: 'parent1',
      role: 'parent',
      isActive: false,
      save: jest.fn(),
    });
    AccountDeletionRequest.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ status: 'pending' }),
        }),
      }),
    });

    await expect(restoreParent('parent1')).rejects.toThrow(
      'This account has a pending deletion request and cannot be restored.'
    );
  });

  it('blocks update reactivation when parent account deletion is pending', async () => {
    const parent = {
      _id: 'parent1',
      role: 'parent',
      isActive: false,
      save: jest.fn(),
    };
    User.findById.mockResolvedValue(parent);
    AccountDeletionRequest.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ status: 'processing' }),
        }),
      }),
    });

    await expect(updateParent('parent1', { isActive: true })).rejects.toThrow(
      'This account has a pending deletion request and cannot be restored.'
    );
    expect(parent.save).not.toHaveBeenCalled();
  });

  it('blocks archive when parent account deletion is pending', async () => {
    User.findById.mockResolvedValue({
      _id: 'parent1',
      role: 'parent',
      isActive: true,
      save: jest.fn(),
    });
    AccountDeletionRequest.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ status: 'pending' }),
      }),
    });

    await expect(archiveParent('parent1')).rejects.toThrow(
      'This parent account has a pending deletion request and cannot be archived.'
    );
    expect(ChildProfile.updateMany).not.toHaveBeenCalled();
  });
});
