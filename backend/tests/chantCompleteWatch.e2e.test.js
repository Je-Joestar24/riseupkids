/**
 * Watch-only chant completion (JSON) + idempotent already-completed.
 * @jest-environment node
 */

jest.mock('../services/badgeAward.service', () => ({
  awardBadgeForChant: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/scheduleBadgeUpdate.util', () => ({
  scheduleBadgeUpdate: jest.fn(),
}));

jest.mock('../models', () => ({
  Chant: { findById: jest.fn() },
  ChildProfile: { findById: jest.fn(), findOne: jest.fn() },
  ChantProgress: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
  ChildStats: { getOrCreate: jest.fn() },
  StarEarning: { findOne: jest.fn(), create: jest.fn() },
  Media: { create: jest.fn() },
}));

const models = require('../models');
const chantProgressService = require('../services/chantProgress.services');
const { scheduleBadgeUpdate } = require('../utils/scheduleBadgeUpdate.util');

function mockPopulateChain(result) {
  const lean = jest.fn().mockResolvedValue(result);
  const populate2 = jest.fn().mockReturnValue({ lean });
  const populate1 = jest.fn().mockReturnValue({ populate: populate2, lean });
  return { populate: populate1, lean };
}

describe('chantProgress.completeChant — watch-only', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Chant.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'chant1',
          title: 'Hello Chant',
          starsAwarded: 10,
        }),
      }),
    });
    models.ChildProfile.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'child1', displayName: 'Kid' }),
      }),
    });
  });

  it('completes a new chant via JSON (no recorded file) and awards stars once', async () => {
    const progressDoc = {
      _id: 'prog1',
      status: 'in_progress',
      starsAwarded: false,
      starsEarned: 0,
      save: jest.fn().mockResolvedValue(true),
    };
    models.ChantProgress.findOne.mockResolvedValue(progressDoc);
    models.StarEarning.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    models.StarEarning.create.mockResolvedValue({});
    models.ChildStats.getOrCreate.mockResolvedValue({
      addStars: jest.fn().mockResolvedValue(undefined),
    });

    const completed = {
      _id: 'prog1',
      status: 'completed',
      starsEarned: 10,
      starsAwarded: true,
    };
    models.ChantProgress.findById.mockReturnValue(mockPopulateChain(completed));

    const result = await chantProgressService.completeChant({
      childId: 'child1',
      chantId: 'chant1',
      uploadedByUserId: 'parent1',
      recordedAudioFile: undefined,
      timeSpent: 0,
      metadata: { completionType: 'watch' },
    });

    expect(progressDoc.status).toBe('completed');
    expect(progressDoc.save).toHaveBeenCalled();
    expect(models.StarEarning.create).toHaveBeenCalled();
    expect(scheduleBadgeUpdate).toHaveBeenCalledWith('child1');
    expect(result.status).toBe('completed');
    expect(result.starsEarned).toBe(10);
  });

  it('returns existing progress without re-awarding when already completed', async () => {
    const progressDoc = {
      _id: 'prog1',
      status: 'completed',
      starsAwarded: true,
      starsEarned: 10,
      save: jest.fn(),
    };
    models.ChantProgress.findOne.mockResolvedValue(progressDoc);

    const completed = {
      _id: 'prog1',
      status: 'completed',
      starsEarned: 10,
      starsAwarded: true,
    };
    models.ChantProgress.findById.mockReturnValue(mockPopulateChain(completed));

    const result = await chantProgressService.completeChant({
      childId: 'child1',
      chantId: 'chant1',
      uploadedByUserId: 'parent1',
      recordedAudioFile: undefined,
      timeSpent: 0,
      metadata: { completionType: 'watch' },
    });

    expect(progressDoc.save).not.toHaveBeenCalled();
    expect(models.StarEarning.create).not.toHaveBeenCalled();
    expect(scheduleBadgeUpdate).not.toHaveBeenCalled();
    expect(result.status).toBe('completed');
  });
});
