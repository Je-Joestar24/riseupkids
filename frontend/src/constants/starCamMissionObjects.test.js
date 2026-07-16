import { describe, expect, it } from 'vitest';

import {
  STARCAM_MAX_OBJECTS,
  STARCAM_MIN_OBJECTS,
  canAddStarCamObject,
  isStarCamMissionPublishReady,
  isStarCamObjectCountInRange,
  starCamObjectCountRangeLabel,
} from './starCamMissionObjects';

describe('starCamMissionObjects constants', () => {
  it('uses 4-7 object range', () => {
    expect(STARCAM_MIN_OBJECTS).toBe(4);
    expect(STARCAM_MAX_OBJECTS).toBe(7);
    expect(starCamObjectCountRangeLabel()).toBe('4-7');
  });

  it('canAddStarCamObject stops at max', () => {
    expect(canAddStarCamObject(6)).toBe(true);
    expect(canAddStarCamObject(7)).toBe(false);
  });

  it('isStarCamMissionPublishReady requires in-range included vocab and scan audio set', () => {
    const vocab = [
      { isIncluded: true, target: 'a', audio: {}, tryAgainAudio: {}, successAudio: {} },
      { isIncluded: true, target: 'b', audio: {}, tryAgainAudio: {}, successAudio: {} },
      { isIncluded: true, target: 'c', audio: {}, tryAgainAudio: {}, successAudio: {} },
      { isIncluded: true, target: 'd', audio: {}, tryAgainAudio: {}, successAudio: {} },
      { isIncluded: false, target: 'e', audio: {}, tryAgainAudio: {}, successAudio: {} },
    ];
    expect(isStarCamMissionPublishReady(vocab, true)).toBe(true);
    expect(isStarCamMissionPublishReady(vocab.slice(0, 3), true)).toBe(false);
  });

  it('isStarCamObjectCountInRange validates mission counts', () => {
    expect(isStarCamObjectCountInRange(4)).toBe(true);
    expect(isStarCamObjectCountInRange(8)).toBe(false);
  });
});
