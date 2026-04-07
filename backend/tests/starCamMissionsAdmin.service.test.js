jest.mock('../models', () => ({
  StarCamMission: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
  Media: {
    findOne: jest.fn(),
  },
  StarCamCategory: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { StarCamMission, Media, StarCamCategory } = require('../models');
const {
  listMissions,
  listCategories,
  createCategory,
  createMission,
  publishMission,
  unpublishMission,
  archiveMission,
} = require('../services/starCamMissionsAdmin.service');

function mockMediaFindOneResult({ type }) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue({ _id: 'm1', type, url: '/x', isActive: true }),
  };
}

function makeDoc(overrides = {}) {
  return {
    _id: 'mission-1',
    status: 'draft',
    missionId: 'nature_01',
    title: 'Nature Hunt 1',
    introText: null,
    missionImage: null,
    introImage: null,
    videoEnabled: false,
    introVideo: null,
    vocab: [],
    items: [],
    rewardImage: null,
    category: null,
    updatedBy: null,
    publishedAt: null,
    archivedAt: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('starCamMissionsAdmin.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    StarCamCategory.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'cat-1', isActive: true }),
    });
  });

  it('lists missions with pagination', async () => {
    StarCamMission.countDocuments.mockResolvedValue(1);
    StarCamMission.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ missionId: 'nature_01' }]),
    });

    const result = await listMissions({ page: 1, limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('creates mission (draft)', async () => {
    StarCamMission.create.mockResolvedValue({
      toObject: () => ({ missionId: 'nature_01', status: 'draft' }),
    });

    const result = await createMission({ userId: 'u1', missionId: 'nature_01', title: 'Nature Hunt 1' });
    expect(result).toMatchObject({ missionId: 'nature_01', status: 'draft' });
    expect(StarCamMission.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'u1', updatedBy: 'u1' }));
  });

  it('auto-generates missionId when not provided', async () => {
    const categoryId = '507f1f77bcf86cd799439011';
    StarCamMission.create.mockResolvedValue({
      toObject: () => ({ missionId: 'reading_20260101010101', status: 'draft' }),
    });
    StarCamCategory.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: categoryId, key: 'reading', isActive: true }),
    });

    const result = await createMission({ userId: 'u1', title: 'Reading Mission', categoryId });
    expect(result.status).toBe('draft');
    expect(StarCamMission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        missionId: expect.stringMatching(/^reading_\d{14}$/),
      })
    );
  });

  it('lists active categories', async () => {
    StarCamCategory.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ key: 'reading' }, { key: 'nature' }]),
    });
    const result = await listCategories();
    expect(result.items).toHaveLength(2);
  });

  it('creates category', async () => {
    StarCamCategory.create.mockResolvedValue({
      toObject: () => ({ key: 'reading', name: 'Reading' }),
    });
    const result = await createCategory({ key: 'reading', name: 'Reading' });
    expect(result).toMatchObject({ key: 'reading' });
  });

  it('rejects publish if vocab/items are not exactly 7', async () => {
    StarCamMission.findById.mockResolvedValue(makeDoc({ vocab: [], items: [] }));

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects publish if videoEnabled is true but introVideo missing', async () => {
    const vocab7 = Array.from({ length: 7 }).map((_, i) => ({
      word: `w${i}`,
      displayText: `Word ${i}`,
      target: `target_${i}`,
      image: `img${i}`,
      audio: `aud${i}`,
      sortOrder: i,
    }));
    const items7 = Array.from({ length: 7 }).map((_, i) => ({ target: `t${i}`, prompt: 'p', success: 's', fail: 'f', sortOrder: i }));
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        category: 'cat-1',
        videoEnabled: true,
        introVideo: null,
        vocab: vocab7,
        items: items7,
      })
    );

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects publish when referenced media type mismatches', async () => {
    const vocab7 = Array.from({ length: 7 }).map((_, i) => ({
      word: `w${i}`,
      displayText: `Word ${i}`,
      target: `target_${i}`,
      image: `img${i}`,
      audio: `aud${i}`,
      sortOrder: i,
    }));
    const items7 = Array.from({ length: 7 }).map((_, i) => ({ target: `t${i}`, prompt: 'p', success: 's', fail: 'f', sortOrder: i }));
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        category: 'cat-1',
        videoEnabled: false,
        vocab: vocab7,
        items: items7,
      })
    );

    // publishMission validates intro/reward + all vocab media in Promise.all.
    // Provide a safe default implementation for all ids, but force introImage mismatch.
    Media.findOne.mockImplementation(({ _id }) => {
      if (_id === 'intro-img') return mockMediaFindOneResult({ type: 'audio' }); // wrong on purpose
      const str = String(_id || '');
      if (str.startsWith('aud')) return mockMediaFindOneResult({ type: 'audio' });
      if (str.startsWith('img')) return mockMediaFindOneResult({ type: 'image' });
      return mockMediaFindOneResult({ type: 'image' });
    });

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('publishes mission when valid', async () => {
    const vocab7 = Array.from({ length: 7 }).map((_, i) => ({
      word: `w${i}`,
      displayText: `Word ${i}`,
      target: `target_${i}`,
      image: `img${i}`,
      audio: `aud${i}`,
      sortOrder: i,
    }));
    const items7 = Array.from({ length: 7 }).map((_, i) => ({ target: `t${i}`, prompt: 'p', success: 's', fail: 'f', sortOrder: i }));
    const doc = makeDoc({
      introText: 'Hello',
      missionImage: 'mission-img',
      introImage: 'intro-img',
      rewardImage: 'reward-img',
      category: 'cat-1',
      videoEnabled: false,
      vocab: vocab7,
      items: items7,
    });
    StarCamCategory.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'cat-1', isActive: true }),
    });

    StarCamMission.findById
      .mockResolvedValueOnce(doc) // initial fetch
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', status: 'published' }),
      });

    // Media checks: mission image, intro image, reward image, then vocab images+audios (14)
    Media.findOne
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })) // missionImage
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })) // introImage
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })); // rewardImage
    for (let i = 0; i < 7; i += 1) {
      Media.findOne.mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })); // vocab image
      Media.findOne.mockReturnValueOnce(mockMediaFindOneResult({ type: 'audio' })); // vocab audio
    }

    const result = await publishMission({ id: 'mission-1', userId: 'u1' });
    expect(doc.status).toBe('published');
    expect(doc.save).toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'published' });
  });

  it('unpublishes mission back to draft', async () => {
    const doc = makeDoc({ status: 'published' });
    StarCamMission.findById
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', status: 'draft' }),
      });

    const result = await unpublishMission({ id: 'mission-1', userId: 'u1' });
    expect(doc.status).toBe('draft');
    expect(doc.save).toHaveBeenCalled();
    expect(result.status).toBe('draft');
  });

  it('archives mission', async () => {
    const doc = makeDoc({ status: 'draft' });
    StarCamMission.findById
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', status: 'archived' }),
      });

    const result = await archiveMission({ id: 'mission-1', userId: 'u1' });
    expect(doc.status).toBe('archived');
    expect(doc.save).toHaveBeenCalled();
    expect(result.status).toBe('archived');
  });

  it('rejects publish when referenced media is missing', async () => {
    const vocab7 = Array.from({ length: 7 }).map((_, i) => ({
      word: `w${i}`,
      displayText: `Word ${i}`,
      target: `target_${i}`,
      image: `img${i}`,
      audio: `aud${i}`,
      sortOrder: i,
    }));
    const items7 = Array.from({ length: 7 }).map((_, i) => ({ target: `t${i}`, prompt: 'p', success: 's', fail: 'f', sortOrder: i }));
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        category: 'cat-1',
        videoEnabled: false,
        vocab: vocab7,
        items: items7,
      })
    );

    // Provide a safe default implementation for all ids, but force introImage missing.
    Media.findOne.mockImplementation(({ _id }) => {
      if (_id === 'intro-img') {
        return {
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue(null),
        };
      }
      const str = String(_id || '');
      if (str.startsWith('aud')) return mockMediaFindOneResult({ type: 'audio' });
      return mockMediaFindOneResult({ type: 'image' });
    });

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects publish when sortOrder is not 0..6 unique', async () => {
    const vocabBad = Array.from({ length: 7 }).map((_, i) => ({
      word: `w${i}`,
      displayText: `Word ${i}`,
      target: `target_${i}`,
      image: `img${i}`,
      audio: `aud${i}`,
      sortOrder: i === 6 ? 5 : i,
    }));
    const items7 = Array.from({ length: 7 }).map((_, i) => ({ target: `t${i}`, prompt: 'p', success: 's', fail: 'f', sortOrder: i }));
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        category: 'cat-1',
        videoEnabled: false,
        vocab: vocabBad,
        items: items7,
      })
    );

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects publish when items sortOrder is not 0..6 unique', async () => {
    const vocab7 = Array.from({ length: 7 }).map((_, i) => ({
      word: `w${i}`,
      displayText: `Word ${i}`,
      target: `target_${i}`,
      image: `img${i}`,
      audio: `aud${i}`,
      sortOrder: i,
    }));
    const itemsBad = Array.from({ length: 7 }).map((_, i) => ({ target: `t${i}`, prompt: 'p', success: 's', fail: 'f', sortOrder: i === 0 ? 1 : i }));
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        category: 'cat-1',
        videoEnabled: false,
        vocab: vocab7,
        items: itemsBad,
      })
    );

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects editing archived mission via publish/unpublish/archive', async () => {
    StarCamMission.findById.mockResolvedValue(makeDoc({ status: 'archived' }));
    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(unpublishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

});

/*
  Notes:
  - We mock chained mongoose calls used in the service:
    Media.findOne(...).select(...).lean()
    StarCamMission.findById(...).populate(...).lean()
*/
