import type { StarCamPracticeItem } from '@/services/childStarCamService';
import { pickCachedMediaUri } from '@/services/starCamMissionMedia';

export interface StarCamPracticeSequenceItem {
  targetLabel: string;
  pronunciationVideoUrl: string | null;
  sampleImageUrl: string | null;
}

export function buildStarCamPracticeSequenceItems(
  practiceItems: StarCamPracticeItem[],
  cacheMap: Record<string, string>
): StarCamPracticeSequenceItem[] {
  return (practiceItems || []).map((item) => ({
    targetLabel: item.displayText || item.target || '',
    pronunciationVideoUrl: pickCachedMediaUri(item.pronunciationVideoUrl, cacheMap),
    sampleImageUrl: pickCachedMediaUri(item.imageUrl, cacheMap),
  }));
}
