/**
 * Experience Store (App)
 *
 * Zustand store for the published experiences (child/parent, read only): the list of cards, and each
 * experience's own page once it has been opened.
 *
 * Stale-while-revalidate: once something has been loaded it is shown at once on every later visit and
 * replaced quietly when the refresh answers. Only the very first load shows a placeholder, and a refresh
 * that fails behind content that is already on screen changes nothing (no error).
 */

import { create } from 'zustand';

import { experienceService, ExperienceNotFoundError } from '@/services/experienceService';
import type { ExperienceCardData, ExperienceDetailData } from '@/services/experienceService';
import { toFriendlyLoadError } from '@/utils/networkError';

export interface ExperienceState {
  experiences: ExperienceCardData[];
  /** True once a list (even an empty one) has been received. */
  loaded: boolean;
  /** Only set while nothing has been loaded. */
  error: string | null;
  /** Experiences that have been opened, by their public id. */
  details: Record<string, ExperienceDetailData>;
  /** Why an experience could not be loaded; only set while that experience has nothing loaded. */
  detailErrors: Record<string, string>;
  /** Experiences the server says do not exist (or are not published); only set while nothing is loaded for them. */
  detailsNotFound: Record<string, true>;
}

export interface ExperienceActions {
  /** Loads (or quietly refreshes) the list. Rejects on failure; the state already says what to show. */
  fetchExperiences: () => Promise<ExperienceCardData[]>;
  /** Loads (or quietly refreshes) one experience. Rejects on failure; the state already says what to show. */
  fetchExperience: (uuid: string) => Promise<ExperienceDetailData>;
  reset: () => void;
}

const initialState: ExperienceState = {
  experiences: [],
  loaded: false,
  error: null,
  details: {},
  detailErrors: {},
  detailsNotFound: {},
};

// Two screens asking at the same moment share one request.
let inflight: Promise<ExperienceCardData[]> | null = null;
const inflightDetails = new Map<string, Promise<ExperienceDetailData>>();

/** `record` without `key` (a new object, so the screens that watch it redraw). */
function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

export const useExperienceStore = create<ExperienceState & ExperienceActions>((set, get) => ({
  ...initialState,

  fetchExperiences: () => {
    if (inflight) return inflight;

    // A retry clears the old message at once (the screen shows its placeholder while the new request is under way).
    set({ error: null });

    const request = experienceService
      .getPublished()
      .then((experiences) => {
        set({ experiences, loaded: true, error: null });
        return experiences;
      })
      .catch((error: unknown) => {
        // Behind a list that is already on screen a failed refresh stays silent.
        if (!get().loaded) set({ error: toFriendlyLoadError(error) });
        throw error;
      })
      .finally(() => {
        inflight = null;
      });

    inflight = request;
    return request;
  },

  fetchExperience: (uuid) => {
    const running = inflightDetails.get(uuid);
    if (running) return running;

    // A retry clears the old message at once (the screen shows its placeholder while the new request is under way).
    set((state) => ({
      detailErrors: without(state.detailErrors, uuid),
      detailsNotFound: without(state.detailsNotFound, uuid),
    }));

    const request = experienceService
      .getPublishedOne(uuid)
      .then((detail) => {
        set((state) => ({
          details: { ...state.details, [uuid]: detail },
          detailErrors: without(state.detailErrors, uuid),
          detailsNotFound: without(state.detailsNotFound, uuid),
        }));
        return detail;
      })
      .catch((error: unknown) => {
        // Behind an experience that is already on screen a failed refresh stays silent.
        if (!get().details[uuid]) {
          if (error instanceof ExperienceNotFoundError) {
            set((state) => ({ detailsNotFound: { ...state.detailsNotFound, [uuid]: true as const } }));
          } else {
            set((state) => ({ detailErrors: { ...state.detailErrors, [uuid]: toFriendlyLoadError(error) } }));
          }
        }
        throw error;
      })
      .finally(() => {
        inflightDetails.delete(uuid);
      });

    inflightDetails.set(uuid, request);
    return request;
  },

  reset: () => {
    inflight = null;
    inflightDetails.clear();
    set({ ...initialState });
  },
}));
