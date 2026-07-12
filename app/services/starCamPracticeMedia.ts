import type { StarCamPracticeItem } from '@/services/childStarCamService';
import { pickCachedMediaUri } from '@/services/starCamMissionMedia';
import { buildStarCamPracticeItemKey } from '@/services/starCamPracticeWatchStorage';

export interface StarCamPracticeSequenceItem {
  itemKey: string;
  targetLabel: string;
  pronunciationVideoUrl: string | null;
  sampleImageUrl: string | null;
}

export function hasPlayablePracticeVideo(
  item: StarCamPracticeSequenceItem | null | undefined
): boolean {
  return Boolean(String(item?.pronunciationVideoUrl ?? '').trim());
}

export function buildStarCamPracticeSequenceItems(
  practiceItems: StarCamPracticeItem[],
  cacheMap: Record<string, string>
): StarCamPracticeSequenceItem[] {
  return (practiceItems || []).map((item, idx) => ({
    itemKey: buildStarCamPracticeItemKey(item.order ?? idx + 1, item.target || item.displayText || `item-${idx + 1}`),
    targetLabel: item.displayText || item.target || '',
    pronunciationVideoUrl: pickCachedMediaUri(item.pronunciationVideoUrl, cacheMap),
    sampleImageUrl: pickCachedMediaUri(item.imageUrl, cacheMap),
  }));
}
