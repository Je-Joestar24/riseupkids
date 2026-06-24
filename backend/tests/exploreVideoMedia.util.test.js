jest.mock('../models', () => ({
  ExploreContent: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
  Media: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

const { ExploreContent, Media } = require('../models');
const {
  getExploreVideoMediaIds,
  isExploreVideoMediaId,
} = require('../utils/exploreVideoMedia.util');

describe('exploreVideoMedia.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collects videoFile and Media contentRef IDs from all explore video types', async () => {
    ExploreContent.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            videoType: 'replay',
            videoFile: 'explore-replay-1',
            contentRef: 'explore-replay-1',
            contentRefModel: 'Media',
          },
          {
            videoType: 'movement_fitness',
            videoFile: 'explore-movement-1',
            contentRef: 'explore-movement-1',
            contentRefModel: 'Media',
          },
          {
            videoType: 'manners_etiquette',
            videoFile: 'explore-manners-1',
            contentRef: 'lesson-1',
            contentRefModel: 'Lesson',
          },
        ]),
      }),
    });
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: 'tagged-explore-1' }]),
      }),
    });

    const ids = await getExploreVideoMediaIds();

    expect(ids).toEqual(
      expect.arrayContaining([
        'explore-replay-1',
        'explore-movement-1',
        'explore-manners-1',
        'tagged-explore-1',
      ])
    );
    expect(ids).toHaveLength(4);
  });

  it('returns an empty array when no explore videos exist', async () => {
    ExploreContent.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    Media.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const ids = await getExploreVideoMediaIds();
    expect(ids).toEqual([]);
  });

  it('isExploreVideoMediaId returns true for linked explore media', async () => {
    ExploreContent.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'explore-1' }),
      }),
    });
    Media.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(isExploreVideoMediaId('media-1')).resolves.toBe(true);
  });

  it('isExploreVideoMediaId returns true for tagged legacy media', async () => {
    ExploreContent.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    Media.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'media-legacy' }),
      }),
    });

    await expect(isExploreVideoMediaId('media-legacy')).resolves.toBe(true);
  });
});
