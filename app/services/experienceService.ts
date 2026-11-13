/**
 * Experience Service (App) — child/parent facing, read only.
 *
 * The experiences an admin has published, shown under Explore. The server only ever returns published
 * ones, so nothing here filters.
 *
 * - GET /experiences — the cards: uuid, title, description, coverImage, videoCount
 * - GET /experiences/:uuid — one experience: its videos in order and the printable
 */

import { api } from '@/services/api';

/** One video of an experience: `position` is 1..n in the order the admin set. */
export interface ExperienceVideoData {
  id: string;
  title: string;
  embedUrl: string;
  position: number;
}

/**
 * What the printable's button opens. `kind` says what `url` is (an uploaded file or a link); a picture alone has
 * `kind` and `url` null and no button.
 */
export interface ExperiencePrintableData {
  image: string | null;
  kind: 'file' | 'link' | null;
  url: string | null;
  fileName: string;
  button: string;
}

/** One whole experience, for its page. */
export interface ExperienceDetailData {
  uuid: string;
  title: string;
  description: string;
  coverImage: string | null;
  videos: ExperienceVideoData[];
  printable: ExperiencePrintableData | null;
}

export interface ExperienceDetailResponse {
  success: boolean;
  data?: ExperienceDetailData;
  message?: string;
}

/** Thrown when the server says this experience does not exist or is not published (404): there is nothing to try again. */
export class ExperienceNotFoundError extends Error {
  constructor(message = 'This experience is not available any more.') {
    super(message);
    this.name = 'ExperienceNotFoundError';
  }
}

export const EXPERIENCE_DETAIL_FAILED_MESSAGE = 'We could not load this experience. Please try again.';

/** One card of the list (the server sends nothing that belongs to the admin). */
export interface ExperienceCardData {
  uuid: string;
  title: string;
  description: string;
  coverImage: string | null;
  videoCount: number;
}

export interface ExperienceListResponse {
  success: boolean;
  data?: ExperienceCardData[];
  message?: string;
}

export const EXPERIENCE_LOAD_FAILED_MESSAGE = 'We could not load the experiences. Please try again.';

export const experienceService = {
  /** The published experiences, in the order the admin set. */
  getPublished: async (): Promise<ExperienceCardData[]> => {
    const response = await api.get<ExperienceListResponse>('/experiences');
    // Anything but a list (an HTML page from a proxy, for example) is a failed load, not "no experiences".
    if (!response || !Array.isArray(response.data)) {
      throw new Error(EXPERIENCE_LOAD_FAILED_MESSAGE);
    }
    return response.data;
  },

  /**
   * One published experience. A draft, a deleted one and an unknown id all come back as 404, which is thrown as
   * ExperienceNotFoundError so the screen can say "not available" instead of offering Try again.
   */
  getPublishedOne: async (uuid: string): Promise<ExperienceDetailData> => {
    let response: ExperienceDetailResponse;
    try {
      response = await api.get<ExperienceDetailResponse>(`/experiences/${encodeURIComponent(uuid)}`);
    } catch (error) {
      const status =
        (error as { status?: number })?.status ?? (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new ExperienceNotFoundError();
      throw error;
    }
    // Anything but an experience with a list of videos (an HTML page from a proxy, for example) is a failed load.
    const data = response?.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.videos)) {
      throw new Error(EXPERIENCE_DETAIL_FAILED_MESSAGE);
    }
    return data;
  },
};
