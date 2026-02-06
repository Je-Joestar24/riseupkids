/**
 * Rise Up Kids services
 */

export { api } from './api';
export { authService } from './authService';
export { chantService } from './chantService';
export type { ChantProgress } from './chantService';
export { audioAssignmentService } from './audioAssignmentService';
export type {
  AudioAssignmentProgress,
  ReviewInput,
  ListSubmissionsParams,
} from './audioAssignmentService';
export { videoWatchService } from './videoWatchService';
export type {
  VideoWatchStatus,
  MarkVideoWatchedResult,
} from './videoWatchService';
export { journeyService } from './journeyService';
export { moduleService } from './moduleService';
export { parentChildService } from './parentChildService';
export type {
  ChildProfile,
  ChildPreferences,
  CreateChildInput,
  UpdateChildInput,
  GetAllChildrenParams,
  ApiResponse,
} from './parentChildService';
export type {
  ChildCourseWithProgress,
  GetChildCoursesParams,
  GetChildCoursesResponse,
  JourneyCourse,
  JourneyCourseProgress,
} from './journeyService';
export { CONTENT_TYPES } from './moduleService';
export type {
  ContentType,
  ApiResponse as ModuleApiResponse,
  ModuleDetailsPayload,
  CourseWithContents,
  CourseProgressDoc,
  PopulatedContentItem,
  ContentProgressItem,
  VideoWatchStatus,
  BookReadingStatus,
} from './moduleService';
