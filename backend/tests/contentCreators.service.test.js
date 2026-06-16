jest.mock('../models', () => ({
  User: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const { User } = require('../models');
const {
  CONTENT_CREATOR_ROLE,
  createContentCreator,
  getContentCreatorById,
  updateContentCreator,
  archiveContentCreator,
} = require('../services/contentCreators.services');

function mockFindByIdResult(value) {
  return {
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(value),
    }),
  };
}

describe('contentCreators.services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a content creator with role content_creator', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'cc-1' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'cc-1',
        name: 'Creator One',
        email: 'creator@example.com',
        role: CONTENT_CREATOR_ROLE,
        isActive: true,
      }),
    });

    const result = await createContentCreator({
      name: 'Creator One',
      email: 'creator@example.com',
      password: 'secret12',
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Creator One',
        email: 'creator@example.com',
        role: CONTENT_CREATOR_ROLE,
        isActive: true,
      })
    );
    expect(result.role).toBe(CONTENT_CREATOR_ROLE);
  });

  it('throws when email already exists', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(
      createContentCreator({
        name: 'Creator One',
        email: 'creator@example.com',
        password: 'secret12',
      })
    ).rejects.toThrow('User already exists with this email');
  });

  it('throws when user is not a content creator', async () => {
    User.findById.mockReturnValue(
      mockFindByIdResult({
        _id: 'user-1',
        role: 'teacher',
      })
    );

    await expect(getContentCreatorById('user-1')).rejects.toThrow('User is not a content creator');
  });

  it('deactivates a content creator via archive', async () => {
    const save = jest.fn().mockResolvedValue(true);
    User.findById
      .mockResolvedValueOnce({
        _id: 'cc-1',
        role: CONTENT_CREATOR_ROLE,
        isActive: true,
        save,
      })
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          _id: 'cc-1',
          role: CONTENT_CREATOR_ROLE,
          isActive: false,
        }),
      });

    const result = await archiveContentCreator('cc-1');

    expect(save).toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });

  it('updates content creator fields', async () => {
    const save = jest.fn().mockResolvedValue(true);
    User.findById
      .mockResolvedValueOnce({
        _id: 'cc-1',
        role: CONTENT_CREATOR_ROLE,
        name: 'Old Name',
        email: 'old@example.com',
        save,
      })
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          _id: 'cc-1',
          role: CONTENT_CREATOR_ROLE,
          name: 'New Name',
          email: 'old@example.com',
        }),
      });

    const result = await updateContentCreator('cc-1', { name: 'New Name' });

    expect(save).toHaveBeenCalled();
    expect(result.name).toBe('New Name');
  });
});
