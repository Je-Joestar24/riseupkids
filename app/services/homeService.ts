import { api } from '@/services/api';

export interface ParentDashboardChildProgressResponse {
  success: boolean;
  data: {
    child?: { _id: string; displayName?: string; name?: string };
    totalStars?: number;
    learningTimeHours?: number;
    courses?: unknown[];
    starSources?: unknown[];
  };
}

export interface UpcomingMeetingsResponse<TMeeting = any> {
  success: boolean;
  data: TMeeting[];
  message?: string;
}

export interface ActiveYouTubeLiveResponse<TLive = any> {
  success: boolean;
  data: TLive | null;
  message?: string;
}

export const homeService = {
  /** Web parity: parent dashboard progress */
  getChildProgress: (childId: string) =>
    api.get<ParentDashboardChildProgressResponse>(`/parent-dashboard/child/${childId}/progress`),

  /** Web parity: upcoming meetings for child/parent */
  getUpcomingMeetings: (limit = 1) =>
    api.get<UpcomingMeetingsResponse>('/meetings/upcoming', { params: { limit } }),

  /** Web parity: active YouTube live (embed-safe; no stream key) */
  getActiveLive: () => api.get<ActiveYouTubeLiveResponse>('/youtube/live/active'),

  /** Web parity helper: guest-mode meet link */
  getGuestModeMeetLink: (meetLink?: string | null) => {
    if (!meetLink) return null;
    try {
      const url = new URL(meetLink);
      url.searchParams.set('authuser', '0');
      url.searchParams.set('hs', '122');
      return url.toString();
    } catch {
      const separator = meetLink.includes('?') ? '&' : '?';
      return `${meetLink}${separator}authuser=0&hs=122`;
    }
  },
};

