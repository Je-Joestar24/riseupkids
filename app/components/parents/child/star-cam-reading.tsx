/**
 * Star Cam — Reading category (thin wrapper around the shared mission map).
 */

import {
  StarCamDynamicDisplay,
  STAR_CAM_CATEGORY_PRESETS,
  type StarCamDynamicDisplayProps,
  type StarCamMapMissionItem,
} from '@/components/child/starcamdynamicdisplay';

export type { StarCamMapMissionItem };

export const SAMPLE_READING_MISSIONS = STAR_CAM_CATEGORY_PRESETS.reading.sampleMissions;

export type StarCamReadingProps = Omit<StarCamDynamicDisplayProps, 'categoryKey'>;

export function StarCamReading({ childId, onBack, onMissionPress }: StarCamReadingProps) {
  return (
    <StarCamDynamicDisplay categoryKey="reading" childId={childId} onBack={onBack} onMissionPress={onMissionPress} />
  );
}
