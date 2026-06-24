jest.mock('../models', () => ({
  Activity: { find: jest.fn() },
  AudioAssignment: { find: jest.fn() },
  Book: { find: jest.fn() },
  Chant: { find: jest.fn() },
  CmsBook: { find: jest.fn() },
  Course: { find: jest.fn() },
  Media: { find: jest.fn(), updateMany: jest.fn() },
}));

jest.mock('../utils/exploreVideoMedia.util', () => ({
  getExploreVideoMediaIds: jest.fn().mockResolvedValue(['explore-1']),
}));

jest.mock('../utils/starCamMissionMedia.util', () => ({
  getStarCamMissionVideoMediaIds: jest.fn().mockResolvedValue(['mission-1']),
}));

const {
  Activity,
  AudioAssignment,
  Book,
  Chant,
  CmsBook,
  Course,
  Media,
} = require('../models');
const { getExploreVideoMediaIds } = require('../utils/exploreVideoMedia.util');
const { getStarCamMissionVideoMediaIds } = require('../utils/starCamMissionMedia.util');
const {
  getInternalVideoMediaIds,
  isCourseVideoMedia,
} = require('../utils/courseVideoMedia.util');

describe('courseVideoMedia.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Activity.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ scormFile: 'activity-scorm-1' }]) }) });
    Book.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ scormFile: 'book-scorm-1' }]) }) });
    Chant.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ instructionVideo: 'chant-video-1', scormFile: 'chant-scorm-1' }]) }) });
    AudioAssignment.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ instructionVideo: 'audio-video-1' }]) }) });
    Media.find.mockImplementation((query) => {
      if (query?.scormFile) {
        return { select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ scormFile: 'video-scorm-child-1' }]) }) };
      }
      return {
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      };
    });
    CmsBook.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { pages: [{ media: { videoMediaId: 'cms-video-1' } }] },
        ]),
      }),
    });
  });

  it('collects internal video media from explore, missions, SCORM, CMS, and instruction videos', async () => {
    const ids = await getInternalVideoMediaIds();

    expect(getExploreVideoMediaIds).toHaveBeenCalled();
    expect(getStarCamMissionVideoMediaIds).toHaveBeenCalled();
    expect(ids).toEqual(
      expect.arrayContaining([
        'explore-1',
        'mission-1',
        'activity-scorm-1',
        'book-scorm-1',
        'chant-video-1',
        'chant-scorm-1',
        'audio-video-1',
        'video-scorm-child-1',
        'cms-video-1',
      ])
    );
  });

  it('isCourseVideoMedia returns true only for tagged course videos', () => {
    expect(isCourseVideoMedia({ tags: ['course-video'] })).toBe(true);
    expect(isCourseVideoMedia({ tags: ['explore-video'] })).toBe(false);
    expect(isCourseVideoMedia({ tags: [] })).toBe(false);
  });
});
