import { colors } from '@/config/theme/colors';

export const DECOR_SPIN_DURATION_MULTIPLIER = 2.25;

export function getLeafMotionCycleMs(seed: number) {
  return 9000 + seed * 1000;
}

export type MissionSlotTemplate = {
  leftPct: number;
  topPct: number;
  size: number;
  delayMs: number;
  gradientColors: readonly [string, string, string];
  shadowColor: string;
};

export const MISSION_SLOT_TEMPLATES: MissionSlotTemplate[] = [
  {
    leftPct: 50,
    topPct: 34,
    size: 140,
    delayMs: 0,
    gradientColors: ['#f4a28c', '#f5a98a', '#e98a68'],
    shadowColor: 'rgb(244, 162, 140)',
  },
  {
    leftPct: 42.31,
    topPct: 59,
    size: 130,
    delayMs: 400,
    gradientColors: ['#ffd4b8', '#ffc5a1', '#ffb090'],
    shadowColor: 'rgb(255, 197, 161)',
  },
  {
    leftPct: 50,
    topPct: 82,
    size: 130,
    delayMs: 800,
    gradientColors: ['#f5a98a', '#e98a68', '#d87356'],
    shadowColor: colors.orange,
  },
];
