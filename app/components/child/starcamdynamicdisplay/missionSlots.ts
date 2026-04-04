import type { MissionSlotTemplate } from './constants';
import { MISSION_SLOT_TEMPLATES } from './constants';
import type { StarCamCategoryPreset } from './types';

export function missionSlotsForPreset(preset: StarCamCategoryPreset): MissionSlotTemplate[] {
  const [a, mid, c] = preset.gradient;
  return MISSION_SLOT_TEMPLATES.map((slot, i) => ({
    ...slot,
    gradientColors: [a, mid, c] as const,
    shadowColor: i === 0 ? a : i === 1 ? mid : c,
  }));
}
