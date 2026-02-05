/**
 * Module hook entry (re-export).
 * Use: import { useModule } from '@/hooks/moduleService' or from '@/hooks/moduleHook'
 */

export {
  useModule,
  getVideoProgressCircles,
  isVideoCompleted,
  getBookProgressCircles,
  isBookCompleted,
  getChantProgressCircles,
  isChantCompleted,
  getAudioStatus,
} from './moduleHook';
export type {
  UseModuleReturn,
  ModuleProgressSummary,
} from './moduleHook';
