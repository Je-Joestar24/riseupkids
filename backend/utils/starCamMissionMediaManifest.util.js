const path = require('path');

function asTrimmed(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
}

function asIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mediaRef(mediaDoc, key, kind = null) {
  if (!mediaDoc?.url) return null;
  return {
    key,
    mediaId: mediaDoc._id ? String(mediaDoc._id) : null,
    url: mediaDoc.url,
    updatedAt: asIsoDate(mediaDoc.updatedAt),
    kind: kind || mediaDoc.type || null,
  };
}

function pushAsset(list, asset) {
  if (!asset?.url) return;
  list.push(asset);
}

/**
 * Stable content version for client cache invalidation (mission publish/edit time).
 */
function buildMissionContentVersion(mission) {
  return (
    asIsoDate(mission?.publishedAt) ||
    asIsoDate(mission?.updatedAt) ||
    asIsoDate(mission?.createdAt) ||
    null
  );
}

function buildStarCamMissionAssetS3Key(missionId, assetKey, originalname) {
  const ext = path.extname(originalname || '').toLowerCase() || '.bin';
  const safeMission = String(missionId || 'mission')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);
  const safeAsset = String(assetKey || 'asset')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 96);
  return `starcam/missions/${safeMission}/${safeAsset}${ext}`;
}

/**
 * Collect every downloadable asset for a published mission with stable keys.
 */
function collectMissionMediaAssets(mission) {
  const assets = [];

  pushAsset(assets, mediaRef(mission.missionImage, 'start.missionImage', 'image'));
  pushAsset(assets, mediaRef(mission.introImage, 'start.introImage', 'image'));
  pushAsset(assets, mediaRef(mission.missionShortVideo, 'start.shortVideo', 'video'));
  pushAsset(assets, mediaRef(mission.missionIntroAudio, 'start.introAudio', 'audio'));
  pushAsset(assets, mediaRef(mission.rewardImage, 'completion.rewardImage', 'image'));
  pushAsset(assets, mediaRef(mission.rewardAudio, 'completion.rewardAudio', 'audio'));
  pushAsset(assets, mediaRef(mission.rewardVideo, 'completion.rewardVideo', 'video'));

  const vocab = Array.isArray(mission.vocab) ? mission.vocab : [];
  vocab
    .slice()
    .sort((a, b) => Number(a?.order ?? a?.sortOrder ?? 0) - Number(b?.order ?? b?.sortOrder ?? 0))
    .forEach((entry, idx) => {
      const n = String(idx + 1).padStart(2, '0');
      const prefix = `practice.vocab[${n}]`;
      pushAsset(assets, mediaRef(entry.image, `${prefix}.image`, 'image'));
      pushAsset(assets, mediaRef(entry.pronunciationVideo, `${prefix}.pronunciationVideo`, 'video'));
      pushAsset(assets, mediaRef(entry.audio, `${prefix}.audio`, 'audio'));
      pushAsset(assets, mediaRef(entry.introAudio, `${prefix}.introAudio`, 'audio'));
      pushAsset(assets, mediaRef(entry.tryAgainAudio, `${prefix}.tryAgainAudio`, 'audio'));
      pushAsset(assets, mediaRef(entry.successAudio, `${prefix}.successAudio`, 'audio'));
    });

  const items = Array.isArray(mission.items) ? mission.items : [];
  items
    .slice()
    .sort((a, b) => Number(a?.order ?? a?.sortOrder ?? 0) - Number(b?.order ?? b?.sortOrder ?? 0))
    .forEach((entry, idx) => {
      const n = String(idx + 1).padStart(2, '0');
      const prefix = `starCam.item[${n}]`;
      pushAsset(assets, mediaRef(entry.questionAudio, `${prefix}.questionAudio`, 'audio'));
      pushAsset(assets, mediaRef(entry.tryAgainAudio, `${prefix}.tryAgainAudio`, 'audio'));
      pushAsset(assets, mediaRef(entry.successAudio, `${prefix}.successAudio`, 'audio'));
    });

  return assets;
}

function buildMissionMediaManifest(mission) {
  const missionId = asTrimmed(mission?.missionId) || String(mission?._id || '');
  const contentVersion = buildMissionContentVersion(mission);
  const assets = collectMissionMediaAssets(mission);

  return {
    missionId,
    contentVersion,
    assetCount: assets.length,
    assets,
  };
}

module.exports = {
  buildMissionContentVersion,
  buildStarCamMissionAssetS3Key,
  collectMissionMediaAssets,
  buildMissionMediaManifest,
  mediaRef,
};
