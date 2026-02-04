/**
 * Journey Service
 *
 * Fetches child journey data: courses with progress for "My Journey" page.
 * Uses the same course-progress API as the web frontend (getChildCourses).
 */

import { api } from '@/services/api';

/** Course document (minimal shape from backend) */
export interface JourneyCourse {
  _id: string;
  title: string;
  description?: string;
  coverImagePath?: string;
  stepOrder?: number;
  isPublished?: boolean;
  isDefault?: boolean;
  contents?: unknown;
  [key: string]: unknown;
}

/** Course progress document (minimal shape from backend) */
export interface JourneyCourseProgress {
  _id: string;
  course: string;
  child: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  currentStep?: number;
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}

/** Single course with its progress and access for the child */
export interface ChildCourseWithProgress {
  course: JourneyCourse;
  progress: JourneyCourseProgress | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  accessible: boolean;
  missingPrerequisites: JourneyCourse[];
  progressPercentage: number;
}

/** API response for GET /course-progress/child/:childId */
export interface GetChildCoursesResponse {
  success: boolean;
  data: ChildCourseWithProgress[];
  count: number;
}

export interface GetChildCoursesParams {
  /** Filter by progress status */
  status?: 'not_started' | 'in_progress' | 'completed' | 'locked';
  /** Only default courses */
  isDefault?: boolean;
}

const journeyService = {
  /**
   * Get all courses with progress for a child (journey list + summary source).
   * Same endpoint as web: GET /course-progress/child/:childId
   */
  getChildCoursesWithProgress: (
    childId: string,
    params?: GetChildCoursesParams
  ): Promise<GetChildCoursesResponse> => {
    const query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.isDefault !== undefined) query.isDefault = String(params.isDefault);
    return api.get<GetChildCoursesResponse>(`/course-progress/child/${childId}`, {
      params: Object.keys(query).length ? query : undefined,
    });
  },
};

export { journeyService };
