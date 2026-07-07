const {
  buildMissionContentVersion,
  buildStarCamMissionAssetS3Key,
  collectMissionMediaAssets,
  buildMissionMediaManifest,
} = require('../utils/starCamMissionMediaManifest.util');

describe('starCamMissionMediaManifest.util', () => {
  const sampleMission = {
    _id: 'm1',
    missionId: 'reading_01',
    updatedAt: new Date('2026-07-07T10:00:00.000Z'),
    missionImage: { _id: 'img1', url: '/mission.png', type: 'image', updatedAt: new Date('2026-07-01T00:00:00.000Z') },
    missionIntroAudio: { _id: 'aud1', url: '/intro.mp3', type: 'audio', updatedAt: new Date('2026-07-02T00:00:00.000Z') },
    vocab: [
      {
        order: 1,
        image: { _id: 'v1', url: '/book.png', type: 'image', updatedAt: new Date('2026-07-03T00:00:00.000Z') },
        pronunciationVideo: { _id: 'v2', url: '/book.mp4', type: 'video', updatedAt: new Date('2026-07-03T00:00:00.000Z') },
        audio: { _id: 'v3', url: '/book.mp3', type: 'audio', updatedAt: new Date('2026-07-03T00:00:00.000Z') },
      },
    ],
    items: [
      {
        sortOrder: 0,
        questionAudio: { _id: 'h1', url: '/q.mp3', type: 'audio', updatedAt: new Date('2026-07-04T00:00:00.000Z') },
      },
    ],
    rewardImage: { _id: 'r1', url: '/reward.png', type: 'image', updatedAt: new Date('2026-07-05T00:00:00.000Z') },
  };

  it('builds stable content version from mission timestamps', () => {
    expect(buildMissionContentVersion(sampleMission)).toBe('2026-07-07T10:00:00.000Z');
  });

  it('builds deterministic mission-scoped S3 keys', () => {
    expect(buildStarCamMissionAssetS3Key('reading_01', 'start.introAudio', 'intro.mp3')).toBe(
      'starcam/missions/reading_01/start.introAudio.mp3'
    );
  });

  it('collects practice, hunt, and start assets with stable keys', () => {
    const assets = collectMissionMediaAssets(sampleMission);
    const keys = assets.map((a) => a.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'start.missionImage',
        'start.introAudio',
        'practice.vocab[01].image',
        'practice.vocab[01].pronunciationVideo',
        'starCam.item[01].questionAudio',
        'completion.rewardImage',
      ])
    );
    expect(assets.find((a) => a.key === 'start.introAudio')).toMatchObject({
      mediaId: 'aud1',
      url: '/intro.mp3',
    });
  });

  it('builds media manifest payload for child preload clients', () => {
    const manifest = buildMissionMediaManifest(sampleMission);
    expect(manifest).toMatchObject({
      missionId: 'reading_01',
      contentVersion: '2026-07-07T10:00:00.000Z',
      assetCount: expect.any(Number),
    });
    expect(manifest.assets.length).toBeGreaterThan(0);
  });
});
