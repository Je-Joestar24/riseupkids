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
    findById: jest.fn(),
    create: jest.fn(),
  },
}));

const { StarCamMission, Media, StarCamCategory } = require('../models');
const {
  listMissions,
  listCategories,
  createCategory,
  createMission,
  updateMissionItem,
  deleteMissionItem,
  updateMissionVocabularyEntry,
  deleteMissionVocabularyEntry,
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
    missionShortVideo: null,
    vocab: [],
    items: [],
    rewardImage: null,
    rewardAudio: null,
    rewardVideo: null,
    category: null,
    updatedBy: null,
    publishedAt: null,
    archivedAt: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeVocab7(overrides = {}) {
  return Array.from({ length: 7 }).map((_, i) => ({
    word: `w${i}`,
    displayText: `Word ${i}`,
    target: `target_${i}`,
    image: `img${i}`,
    audio: `aud${i}`,
    introAudio: null,
    tryAgainAudio: `tryAud${i}`,
    successAudio: `successAud${i}`,
    sortOrder: i,
    ...(typeof overrides === 'function' ? overrides(i) : overrides),
  }));
}

function makeItems7(overrides = {}) {
  return Array.from({ length: 7 }).map((_, i) => ({
    target: `target_${i}`,
    prompt: `Is this Word ${i}?`,
    questionText: `Is this Word ${i}?`,
    success: 'Yes',
    successText: 'Yes, that is it!',
    fail: 'Try again',
    tryAgainText: "Ow that's not it, let's try again.",
    sortOrder: i,
    ...(typeof overrides === 'function' ? overrides(i) : overrides),
  }));
}

describe('starCamMissionsAdmin.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const categoryLookup = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'cat-1', isActive: true }),
    };
    StarCamCategory.findOne.mockReturnValue(categoryLookup);
    StarCamCategory.findById.mockReturnValue(categoryLookup);
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
    StarCamCategory.findById.mockReturnValue({
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

  it('rejects publish when a scan item does not map to vocabulary audio', async () => {
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        rewardAudio: 'reward-aud',
        rewardVideo: 'reward-vid',
        missionShortVideo: 'short-vid',
        category: 'cat-1',
        videoEnabled: false,
        vocab: makeVocab7(),
        items: makeItems7((i) => (i === 0 ? { target: 'missing_target' } : {})),
      })
    );

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('target must match a vocabulary target'),
    });
  });

  it('rejects publish if videoEnabled is true but introVideo missing', async () => {
    const vocab7 = makeVocab7();
    const items7 = makeItems7();
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        rewardAudio: 'reward-aud',
        rewardVideo: 'reward-vid',
        missionShortVideo: 'short-vid',
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
    const vocab7 = makeVocab7();
    const items7 = makeItems7();
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        rewardAudio: 'reward-aud',
        rewardVideo: 'reward-vid',
        missionShortVideo: 'short-vid',
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
      if (str === 'short-vid' || str === 'reward-vid') return mockMediaFindOneResult({ type: 'video' });
      if (str === 'reward-aud' || str.startsWith('aud') || str.startsWith('tryAud') || str.startsWith('successAud')) {
        return mockMediaFindOneResult({ type: 'audio' });
      }
      if (str.startsWith('img')) return mockMediaFindOneResult({ type: 'image' });
      return mockMediaFindOneResult({ type: 'image' });
    });

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('publishes mission when valid', async () => {
    const vocab7 = makeVocab7();
    const items7 = makeItems7();
    const doc = makeDoc({
      introText: 'Hello',
      missionImage: 'mission-img',
      introImage: 'intro-img',
      rewardImage: 'reward-img',
      rewardAudio: 'reward-aud',
      rewardVideo: 'reward-vid',
      missionShortVideo: 'short-vid',
      category: 'cat-1',
      videoEnabled: false,
      vocab: vocab7,
      items: items7,
    });
    StarCamCategory.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'cat-1', isActive: true }),
    });

    StarCamMission.findById
      .mockResolvedValueOnce(doc) // initial fetch
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', status: 'published' }),
      });

    // Media checks: mission image, intro image, reward image, reward audio, short video, then vocab media (21)
    Media.findOne
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })) // missionImage
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })) // introImage
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })) // rewardImage
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'audio' })) // rewardAudio
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'video' })) // rewardVideo
      .mockReturnValueOnce(mockMediaFindOneResult({ type: 'video' })); // missionShortVideo
    for (let i = 0; i < 7; i += 1) {
      Media.findOne.mockReturnValueOnce(mockMediaFindOneResult({ type: 'image' })); // vocab image
      Media.findOne.mockReturnValueOnce(mockMediaFindOneResult({ type: 'audio' })); // vocab audio
      Media.findOne.mockReturnValueOnce(mockMediaFindOneResult({ type: 'audio' })); // vocab tryAgainAudio
      Media.findOne.mockReturnValueOnce(mockMediaFindOneResult({ type: 'audio' })); // vocab successAudio
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
    const vocab7 = makeVocab7();
    const items7 = makeItems7();
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        rewardAudio: 'reward-aud',
        rewardVideo: 'reward-vid',
        missionShortVideo: 'short-vid',
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
      if (str === 'short-vid' || str === 'reward-vid') return mockMediaFindOneResult({ type: 'video' });
      if (str === 'reward-aud' || str.startsWith('aud') || str.startsWith('tryAud') || str.startsWith('successAud')) {
        return mockMediaFindOneResult({ type: 'audio' });
      }
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
      introAudio: null,
      tryAgainAudio: `tryAud${i}`,
      successAudio: `successAud${i}`,
      sortOrder: i === 6 ? 5 : i,
    }));
    const items7 = makeItems7();
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        rewardAudio: 'reward-aud',
        rewardVideo: 'reward-vid',
        missionShortVideo: 'short-vid',
        category: 'cat-1',
        videoEnabled: false,
        vocab: vocabBad,
        items: items7,
      })
    );

    await expect(publishMission({ id: 'mission-1', userId: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects publish when items sortOrder is not 0..6 unique', async () => {
    const vocab7 = makeVocab7();
    const itemsBad = makeItems7((i) => ({ sortOrder: i === 0 ? 1 : i }));
    StarCamMission.findById.mockResolvedValue(
      makeDoc({
        introText: 'Hello',
        missionImage: 'mission-img',
        introImage: 'intro-img',
        rewardImage: 'reward-img',
        rewardAudio: 'reward-aud',
        rewardVideo: 'reward-vid',
        missionShortVideo: 'short-vid',
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

  it('updates one mission item by sortOrder', async () => {
    const doc = makeDoc({
      status: 'draft',
      items: [
        { target: 'book', prompt: 'Find book', success: 'Nice', fail: 'Try again', sortOrder: 0 },
        { target: 'pen', prompt: 'Find pen', success: 'Great', fail: 'Nope', sortOrder: 1 },
      ],
    });
    StarCamMission.findById
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', items: [{ sortOrder: 0 }, { target: 'marker', sortOrder: 1 }] }),
      });

    const result = await updateMissionItem({
      id: 'mission-1',
      userId: 'u1',
      sortOrder: 1,
      patch: {
        target: 'marker',
        questionText: 'Is this a marker?',
        questionAudio: '507f1f77bcf86cd799439011',
        tryAgainText: 'Ow, that is not a marker.',
        tryAgainAudio: '507f1f77bcf86cd799439012',
        successText: 'That is a marker, yeyy.',
        successAudio: '507f1f77bcf86cd799439013',
      },
    });
    expect(doc.items[1].target).toBe('marker');
    expect(doc.items[1].questionText).toBe('Is this a marker?');
    expect(String(doc.items[1].questionAudio)).toBe('507f1f77bcf86cd799439011');
    expect(doc.items[1].tryAgainText).toBe('Ow, that is not a marker.');
    expect(doc.items[1].successText).toBe('That is a marker, yeyy.');
    expect(doc.save).toHaveBeenCalled();
    expect(result).toMatchObject({ missionId: 'nature_01' });
  });

  it('deletes one mission item by sortOrder and reorders list', async () => {
    const doc = makeDoc({
      status: 'draft',
      items: [
        { target: 'book', prompt: 'Find book', success: 'Nice', fail: 'Try again', sortOrder: 0 },
        { target: 'pen', prompt: 'Find pen', success: 'Great', fail: 'Nope', sortOrder: 1 },
        { target: 'cup', prompt: 'Find cup', success: 'Good', fail: 'Retry', sortOrder: 2 },
      ],
    });
    StarCamMission.findById
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', items: [{ sortOrder: 0 }, { sortOrder: 1 }] }),
      });

    const result = await deleteMissionItem({
      id: 'mission-1',
      userId: 'u1',
      sortOrder: 1,
    });
    expect(doc.items).toHaveLength(2);
    expect(doc.items[0].sortOrder).toBe(0);
    expect(doc.items[1].sortOrder).toBe(1);
    expect(doc.items[1].target).toBe('cup');
    expect(doc.save).toHaveBeenCalled();
    expect(result).toMatchObject({ missionId: 'nature_01' });
  });

  it('rejects deleting mission item when mission is published', async () => {
    StarCamMission.findById.mockResolvedValue(makeDoc({ status: 'published', items: [{ sortOrder: 0 }] }));
    await expect(deleteMissionItem({ id: 'mission-1', userId: 'u1', sortOrder: 0 })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('updates one vocabulary entry text fields by sortOrder', async () => {
    const doc = makeDoc({
      status: 'draft',
      vocab: [
        {
          word: 'book',
          displayText: 'Book',
          target: 'book',
          image: 'img1',
          audio: 'aud1',
          tryAgainAudio: 'try1',
          successAudio: 'success1',
          pronunciationVideo: null,
          sortOrder: 0,
        },
      ],
    });
    StarCamMission.findById
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', vocab: [{ displayText: 'Notebook', target: 'notebook', sortOrder: 0 }] }),
      });

    const result = await updateMissionVocabularyEntry({
      id: 'mission-1',
      userId: 'u1',
      sortOrder: 0,
      displayText: 'Notebook',
      target: 'notebook',
    });
    expect(doc.vocab[0].displayText).toBe('Notebook');
    expect(doc.vocab[0].word).toBe('Notebook');
    expect(doc.vocab[0].target).toBe('notebook');
    expect(doc.save).toHaveBeenCalled();
    expect(result).toMatchObject({ missionId: 'nature_01' });
  });

  it('deletes one vocabulary entry by sortOrder and reorders list', async () => {
    const doc = makeDoc({
      status: 'draft',
      vocab: [
        { word: 'book', displayText: 'Book', target: 'book', image: 'img1', audio: 'aud1', tryAgainAudio: 'try1', successAudio: 'ok1', sortOrder: 0 },
        { word: 'pen', displayText: 'Pen', target: 'pen', image: 'img2', audio: 'aud2', tryAgainAudio: 'try2', successAudio: 'ok2', sortOrder: 1 },
        { word: 'cup', displayText: 'Cup', target: 'cup', image: 'img3', audio: 'aud3', tryAgainAudio: 'try3', successAudio: 'ok3', sortOrder: 2 },
      ],
    });
    StarCamMission.findById
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ missionId: 'nature_01', vocab: [{ sortOrder: 0 }, { sortOrder: 1 }] }),
      });

    const result = await deleteMissionVocabularyEntry({ id: 'mission-1', userId: 'u1', sortOrder: 1 });
    expect(doc.vocab).toHaveLength(2);
    expect(doc.vocab[0].sortOrder).toBe(0);
    expect(doc.vocab[1].sortOrder).toBe(1);
    expect(doc.vocab[1].target).toBe('cup');
    expect(doc.save).toHaveBeenCalled();
    expect(result).toMatchObject({ missionId: 'nature_01' });
  });

});

/*
  Notes:
  - We mock chained mongoose calls used in the service:
    Media.findOne(...).select(...).lean()
    StarCamMission.findById(...).populate(...).lean()
*/
