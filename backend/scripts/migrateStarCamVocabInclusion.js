const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { StarCamMission } = require('../models');

dotenv.config();

async function migrateStarCamVocabInclusion() {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/riseupkids', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`[StarCamVocabInclusion] Connected: ${conn.connection.host}`);

  const missions = await StarCamMission.find({}).select('_id missionId status vocab').lean();
  let missionsUpdated = 0;
  let vocabUpdated = 0;

  for (const mission of missions) {
    const vocab = Array.isArray(mission.vocab) ? mission.vocab : [];
    if (!vocab.length) continue;

    const needsUpdate = vocab.some((entry) => entry.isIncluded === undefined || entry.isIncluded === null);
    if (!needsUpdate) continue;

    const nextVocab = vocab.map((entry) => ({
      ...entry,
      isIncluded: entry.isIncluded === false ? false : true,
    }));

    await StarCamMission.updateOne({ _id: mission._id }, { $set: { vocab: nextVocab } });
    missionsUpdated += 1;
    vocabUpdated += nextVocab.length;
  }

  console.log(
    `[StarCamVocabInclusion] Done. missionsScanned=${missions.length}, missionsUpdated=${missionsUpdated}, vocabEntriesSet=${vocabUpdated}`
  );

  await mongoose.connection.close();

  return { missionsScanned: missions.length, missionsUpdated, vocabEntriesSet: vocabUpdated };
}

if (require.main === module) {
  migrateStarCamVocabInclusion()
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('[StarCamVocabInclusion] Failed:', error);
      await mongoose.connection.close();
      process.exit(1);
    });
}

module.exports = { migrateStarCamVocabInclusion };
