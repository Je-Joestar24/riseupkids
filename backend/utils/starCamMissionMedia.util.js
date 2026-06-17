const { StarCamMission } = require('../models');

const MISSION_TOP_LEVEL_VIDEO_FIELDS = ['introVideo', 'missionShortVideo', 'rewardVideo'];

/**
 * Collect Media IDs for videos owned by Star Cam missions (short intro, reward, pronunciation, etc.).
 * These are internal mission assets and must not appear on the general video content page.
 */
async function getStarCamMissionVideoMediaIds() {
  const missions = await StarCamMission.find({})
    .select('introVideo missionShortVideo rewardVideo vocab.pronunciationVideo')
    .lean();

  const ids = new Set();

  for (const mission of missions) {
    for (const field of MISSION_TOP_LEVEL_VIDEO_FIELDS) {
      const id = mission[field];
      if (id) ids.add(String(id));
    }

    if (Array.isArray(mission.vocab)) {
      for (const entry of mission.vocab) {
        if (entry?.pronunciationVideo) ids.add(String(entry.pronunciationVideo));
      }
    }
  }

  return [...ids];
}

module.exports = {
  getStarCamMissionVideoMediaIds,
};
