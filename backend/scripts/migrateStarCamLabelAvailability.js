const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { StarCamMission, StarCamVisionLabel } = require('../models');
const { normalizeSearchKey } = require('../utils/oidLabelCsv.util');

dotenv.config();

function collectMissionLabelRefs(mission) {
  const labelIds = new Set();
  const searchKeys = new Set();

  for (const entry of [...(mission.vocab || []), ...(mission.items || [])]) {
    if (entry?.labelId) labelIds.add(String(entry.labelId).trim());
    const targetKey = normalizeSearchKey(entry?.target);
    if (targetKey) searchKeys.add(targetKey);
  }

  return { labelIds, searchKeys };
}

async function migrateStarCamLabelAvailability({ selectAllActive = true } = {}) {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`[StarCamLabelAvailability] Connected: ${conn.connection.host}`);

  const publishedMissions = await StarCamMission.find({ status: 'published' })
    .select('missionId vocab items')
    .lean();

  const labelIds = new Set();
  const searchKeys = new Set();

  for (const mission of publishedMissions) {
    const refs = collectMissionLabelRefs(mission);
    refs.labelIds.forEach((id) => labelIds.add(id));
    refs.searchKeys.forEach((key) => searchKeys.add(key));
  }

  let missionMatched = 0;
  if (labelIds.size > 0) {
    const byId = await StarCamVisionLabel.updateMany(
      { labelId: { $in: Array.from(labelIds) }, isActive: true },
      { $set: { isAvailableForMissions: true } }
    );
    missionMatched += byId.modifiedCount || 0;
  }

  if (searchKeys.size > 0) {
    const byKey = await StarCamVisionLabel.updateMany(
      { searchKey: { $in: Array.from(searchKeys) }, isActive: true },
      { $set: { isAvailableForMissions: true } }
    );
    missionMatched += byKey.modifiedCount || 0;
  }

  let allActiveMatched = 0;
  if (selectAllActive) {
    const allResult = await StarCamVisionLabel.updateMany(
      { isActive: true },
      { $set: { isAvailableForMissions: true } }
    );
    allActiveMatched = allResult.modifiedCount || 0;
  }

  const selectedTotal = await StarCamVisionLabel.countDocuments({
    isActive: true,
    isAvailableForMissions: true,
  });

  console.log(
    `[StarCamLabelAvailability] Published missions scanned: ${publishedMissions.length}, mission refs labelIds=${labelIds.size}, searchKeys=${searchKeys.size}, missionMatchedUpdates=${missionMatched}, allActiveUpdates=${allActiveMatched}, selectedTotal=${selectedTotal}`
  );

  await mongoose.connection.close();

  return {
    publishedMissions: publishedMissions.length,
    missionLabelIds: labelIds.size,
    missionSearchKeys: searchKeys.size,
    missionMatchedUpdates: missionMatched,
    allActiveUpdates: allActiveMatched,
    selectedTotal,
  };
}

if (require.main === module) {
  const selectAllActive = !process.argv.includes('--mission-only');
  migrateStarCamLabelAvailability({ selectAllActive })
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('[StarCamLabelAvailability] Failed:', error);
      await mongoose.connection.close();
      process.exit(1);
    });
}

module.exports = { migrateStarCamLabelAvailability, collectMissionLabelRefs };
