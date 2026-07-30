/**
 * Audio assignment approval must mark course content completed (checkmark / module %).
 */
const mockMarkContentCompletedInContainingCourses = jest.fn().mockResolvedValue([
  { courseId: 'c1', ok: true },
]);

jest.mock('../models', () => ({
  AudioAssignment: { findById: jest.fn() },
  AudioAssignmentProgress: {
    findOne: jest.fn(),
    findById: jest.fn(() => ({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ status: 'approved' }),
    })),
    create: jest.fn(),
  },
  ChildProfile: { findById: jest.fn() },
  ChildStats: { getOrCreate: jest.fn() },
  Media: {},
  StarEarning: { findOne: jest.fn().mockResolvedValue(null) },
}));

jest.mock('../services/s3.service', () => ({}));
jest.mock('../utils/instructionVideoMedia.util', () => ({
  INSTRUCTION_VIDEO_POPULATE_SELECT: 'url',
}));
jest.mock('../utils/scheduleBadgeUpdate.util', () => ({
  scheduleBadgeUpdate: jest.fn(),
}));

jest.mock('../services/courseProgress.services', () => ({
  markContentCompletedInContainingCourses: (...args) =>
    mockMarkContentCompletedInContainingCourses(...args),
}));

const { AudioAssignment, AudioAssignmentProgress, StarEarning } = require('../models');
const {
  reviewAudioAssignmentSubmission,
} = require('../services/audioAssignmentProgress.services');

describe('reviewAudioAssignmentSubmission course sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    StarEarning.findOne.mockResolvedValue({ _id: 'existing' }); // skip star award path
  });

  it('marks audioAssignment completed on containing courses when approved', async () => {
    const progress = {
      recordedAudio: 'media1',
      status: 'submitted',
      starsAwarded: true,
      starsEarned: 10,
      save: jest.fn().mockResolvedValue(undefined),
    };
    AudioAssignmentProgress.findOne.mockResolvedValue(progress);
    AudioAssignment.findById.mockResolvedValue({
      title: 'Say hello',
      starsAwarded: 10,
    });

    await reviewAudioAssignmentSubmission({
      childId: 'child1',
      audioAssignmentId: 'aa1',
      reviewerUserId: 'admin1',
      decision: 'approved',
      feedback: 'Great',
    });

    expect(progress.status).toBe('approved');
    expect(progress.save).toHaveBeenCalled();
    expect(mockMarkContentCompletedInContainingCourses).toHaveBeenCalledWith(
      'child1',
      'aa1',
      'audioAssignment'
    );
  });

  it('does not sync course progress when rejected', async () => {
    const progress = {
      recordedAudio: 'media1',
      status: 'submitted',
      starsAwarded: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    AudioAssignmentProgress.findOne.mockResolvedValue(progress);

    await reviewAudioAssignmentSubmission({
      childId: 'child1',
      audioAssignmentId: 'aa1',
      reviewerUserId: 'admin1',
      decision: 'rejected',
      feedback: 'Try again',
    });

    expect(progress.status).toBe('rejected');
    expect(mockMarkContentCompletedInContainingCourses).not.toHaveBeenCalled();
  });
});
