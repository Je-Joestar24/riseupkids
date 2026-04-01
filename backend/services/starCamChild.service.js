const { ChildProfile, StarCamCategory, StarCamMission } = require('../models');

function asTrimmed(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
}

async function assertChildOwnership(parentUserId, childId) {
  const parentId = asTrimmed(parentUserId);
  const cId = asTrimmed(childId);
  if (!parentId) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }
  if (!cId) {
    const err = new Error('childId is required');
    err.statusCode = 400;
    throw err;
  }
  const child = await ChildProfile.findOne({ _id: cId, parent: parentId }).select('_id parent displayName').lean();
  if (!child) {
    const err = new Error('Child not found or does not belong to you');
    err.statusCode = 403;
    throw err;
  }
  return child;
}

async function getAvailableCategoriesForChild({ parentUserId, childId }) {
  await assertChildOwnership(parentUserId, childId);

  const categories = await StarCamCategory.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1, _id: 1 })
    .lean();

  const items = [];
  for (const category of categories) {
    const publishedCount = await StarCamMission.countDocuments({
      status: 'published',
      category: category._id,
    });
    items.push({
      id: String(category._id),
      key: category.key,
      name: category.name,
      description: category.description || null,
      missionCount: publishedCount,
    });
  }

  return { items };
}

async function getLatestMissionsByCategoryForChild({
  parentUserId,
  childId,
  categoryKey,
  limit = 3,
}) {
  await assertChildOwnership(parentUserId, childId);
  const safeKey = asTrimmed(categoryKey)?.toLowerCase();
  if (!safeKey) {
    const err = new Error('categoryKey is required');
    err.statusCode = 400;
    throw err;
  }

  const category = await StarCamCategory.findOne({ key: safeKey, isActive: true })
    .select('_id key name description')
    .lean();
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 3, 3));
  const missions = await StarCamMission.find({
    status: 'published',
    category: category._id,
  })
    .populate({ path: 'introImage', select: 'url type' })
    .sort({ publishedAt: -1, updatedAt: -1, _id: -1 })
    .limit(safeLimit)
    .lean();

  return {
    category: {
      id: String(category._id),
      key: category.key,
      name: category.name,
      description: category.description || null,
    },
    items: missions.map((m) => ({
      id: String(m._id),
      missionId: m.missionId,
      title: m.title,
      introText: m.introText || '',
      introImageUrl: m.introImage?.url || null,
      vocabCount: Array.isArray(m.vocab) ? m.vocab.length : 0,
      itemCount: Array.isArray(m.items) ? m.items.length : 0,
    })),
    limitApplied: safeLimit,
  };
}

async function getMissionStartFlowForChild({ parentUserId, childId, missionId }) {
  await assertChildOwnership(parentUserId, childId);
  const safeMissionId = asTrimmed(missionId);
  if (!safeMissionId) {
    const err = new Error('missionId is required');
    err.statusCode = 400;
    throw err;
  }

  const mission = await StarCamMission.findOne({
    $or: [{ _id: safeMissionId }, { missionId: safeMissionId }],
    status: 'published',
  })
    .populate({ path: 'category', select: 'key name' })
    .populate({ path: 'introImage', select: 'url type' })
    .populate({ path: 'introVideo', select: 'url type duration' })
    .populate({ path: 'rewardImage', select: 'url type' })
    .populate({ path: 'vocab.image', select: 'url type' })
    .populate({ path: 'vocab.audio', select: 'url type duration' })
    .lean();

  if (!mission) {
    const err = new Error('Mission not found');
    err.statusCode = 404;
    throw err;
  }

  const practiceItems = (mission.vocab || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((v, idx) => ({
      order: idx + 1,
      displayText: v.displayText || v.word || '',
      target: v.target || '',
      imageUrl: v.image?.url || null,
      audioUrl: v.audio?.url || null,
      audioPrompt: `I see a ${String(v.displayText || v.word || '').toLowerCase()}.`,
      aiDetection: {
        enabled: false,
        status: 'pending_integration',
      },
    }));

  const huntItems = (mission.items || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((it, idx) => ({
      order: idx + 1,
      target: it.target,
      prompt: it.prompt,
      success: it.success,
      fail: it.fail,
      showSampleImage: false,
    }));

  return {
    mission: {
      id: String(mission._id),
      missionId: mission.missionId,
      title: mission.title,
      category: {
        key: mission.category?.key || null,
        name: mission.category?.name || null,
      },
    },
    flow: {
      start: {
        promptTitle: 'Start Mission',
        introText: mission.introText || '',
        introImageUrl: mission.introImage?.url || null,
      },
      practice: {
        promptTitle: 'Practice',
        items: practiceItems,
      },
      starCam: {
        promptTitle: 'Find the object',
        aiDetection: {
          enabled: false,
          status: 'pending_integration',
          notes: 'Object detection endpoint and model integration to be added in child runtime phase.',
        },
        items: huntItems,
      },
      completion: {
        promptTitle: 'Congratulations',
        title: mission.rewardTitle || 'Mission Accomplished!',
        subtitle: mission.rewardSubtitle || 'Great job, Explorer!',
        rewardImageUrl: mission.rewardImage?.url || null,
      },
    },
  };
}

module.exports = {
  getAvailableCategoriesForChild,
  getLatestMissionsByCategoryForChild,
  getMissionStartFlowForChild,
};

