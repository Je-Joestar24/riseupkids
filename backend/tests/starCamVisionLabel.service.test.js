jest.mock('../models', () => ({
  StarCamVisionLabel: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const { StarCamVisionLabel } = require('../models');
const {
  searchLabels,
  listRecentCustomLabels,
  createCustomLabel,
  getLabelBySearchKey,
  incrementUsageCount,
  rankSearchResults,
  listLabelsForAdmin,
  setLabelAvailability,
  bulkSetLabelAvailability,
} = require('../services/starCamVisionLabel.service');

function mockFindOneChain(result) {
  return {
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(result),
    }),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function mockFindOneAndUpdateChain(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

describe('starCamVisionLabel.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searchLabels returns empty results when query is too short', async () => {
    const result = await searchLabels({ query: 'a' });
    expect(result.results).toEqual([]);
    expect(StarCamVisionLabel.find).not.toHaveBeenCalled();
  });

  it('searchLabels ranks exact matches before contains matches', async () => {
    StarCamVisionLabel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { labelId: '/m/bookcase', displayName: 'Bookcase', searchKey: 'bookcase', source: 'oidv7' },
        { labelId: '/m/book', displayName: 'Book', searchKey: 'book', source: 'oidv7', isChildFriendly: true },
        { labelId: 'custom:story_book', displayName: 'Story Book', searchKey: 'story book', source: 'custom' },
      ]),
    });

    const result = await searchLabels({ query: 'book', limit: 10 });
    expect(result.results[0].displayName).toBe('Book');
    expect(result.results.map((r) => r.displayName)).toEqual(['Book', 'Bookcase', 'Story Book']);
  });

  it('listRecentCustomLabels returns custom labels sorted by query', async () => {
    StarCamVisionLabel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          labelId: 'custom:plush_bear',
          displayName: 'Plush Bear',
          searchKey: 'plush bear',
          source: 'custom',
          defaultTerms: ['plush bear'],
        },
      ]),
    });

    const result = await listRecentCustomLabels({ limit: 5 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].source).toBe('custom');
  });

  it('createCustomLabel rejects duplicate searchKey', async () => {
    StarCamVisionLabel.findOne.mockReturnValue(
      mockFindOneChain({ _id: 'x', labelId: 'custom:apple', source: 'custom' })
    );

    await expect(createCustomLabel({ displayName: 'Apple' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'A label with this name already exists',
    });
  });

  it('createCustomLabel persists a custom label', async () => {
    StarCamVisionLabel.findOne
      .mockReturnValueOnce(mockFindOneChain(null))
      .mockReturnValueOnce(mockFindOneChain(null));
    StarCamVisionLabel.create.mockResolvedValue({
      toObject: () => ({
        labelId: 'custom:plush_bear',
        displayName: 'Plush Bear',
        searchKey: 'plush bear',
        source: 'custom',
        isChildFriendly: true,
        defaultTerms: ['plush bear', 'teddy'],
        usageCount: 0,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const result = await createCustomLabel({
      displayName: 'Plush Bear',
      defaultTerms: ['teddy', 'plush bear'],
      createdBy: '507f1f77bcf86cd799439011',
    });

    expect(result.labelId).toBe('custom:plush_bear');
    expect(result.source).toBe('custom');
    expect(result.defaultTerms).toEqual(expect.arrayContaining(['plush bear', 'teddy']));
    expect(StarCamVisionLabel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isAvailableForMissions: true,
      })
    );
  });

  it('searchLabels filters to mission-available labels by default', async () => {
    StarCamVisionLabel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    await searchLabels({ query: 'book', limit: 10 });

    expect(StarCamVisionLabel.find).toHaveBeenCalledWith(
      expect.objectContaining({ isAvailableForMissions: true })
    );
  });

  it('listLabelsForAdmin returns paginated labels', async () => {
    StarCamVisionLabel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          labelId: 'custom:book',
          displayName: 'Book',
          searchKey: 'book',
          source: 'custom',
          isAvailableForMissions: true,
        },
      ]),
    });
    StarCamVisionLabel.countDocuments.mockResolvedValue(1);

    const result = await listLabelsForAdmin({ page: 1, limit: 25 });
    expect(result.total).toBe(1);
    expect(result.items[0].isAvailableForMissions).toBe(true);
  });

  it('bulkSetLabelAvailability updates many labels', async () => {
    StarCamVisionLabel.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });

    const result = await bulkSetLabelAvailability({
      labelIds: ['custom:book', 'custom:chair'],
      isAvailableForMissions: true,
    });

    expect(result.modified).toBe(2);
    expect(StarCamVisionLabel.updateMany).toHaveBeenCalled();
  });

  it('getLabelBySearchKey returns null for empty key', async () => {
    const result = await getLabelBySearchKey('   ');
    expect(result).toBeNull();
    expect(StarCamVisionLabel.findOne).not.toHaveBeenCalled();
  });

  it('incrementUsageCount increments usage count', async () => {
    StarCamVisionLabel.findOneAndUpdate.mockReturnValue(
      mockFindOneAndUpdateChain({
        labelId: '/m/0c9ph5',
        displayName: 'Apple',
        searchKey: 'apple',
        source: 'oidv7',
        usageCount: 3,
        defaultTerms: [],
        isChildFriendly: false,
      })
    );

    const result = await incrementUsageCount('/m/0c9ph5');
    expect(result.usageCount).toBe(3);
    expect(StarCamVisionLabel.findOneAndUpdate).toHaveBeenCalledWith(
      { labelId: '/m/0c9ph5', isActive: true },
      { $inc: { usageCount: 1 } },
      { new: true }
    );
  });

  it('rankSearchResults boosts custom labels on ties', () => {
    const ranked = rankSearchResults(
      [
        { displayName: 'Book', searchKey: 'book', source: 'oidv7' },
        { displayName: 'Book Copy', searchKey: 'book copy', source: 'custom' },
      ],
      'book'
    );
    expect(ranked[0].source).toBe('oidv7');
    expect(ranked[0].searchKey).toBe('book');
  });
});
