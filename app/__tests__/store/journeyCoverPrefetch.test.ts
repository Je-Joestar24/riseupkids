/**
 * When My Journey's courses arrive, only the covers at the top are fetched ahead of time (all of them
 * at once used to flood a slow server), and they go into the cache the cards read from.
 */
const mockPrefetch = jest.fn();
jest.mock('expo-image', () => ({
  Image: { prefetch: (urls: string[], policy: string) => mockPrefetch(urls, policy) },
}));

jest.mock('@/services/journeyService', () => ({
  journeyService: { getChildCoursesWithProgress: jest.fn() },
}));

import { journeyService } from '@/services/journeyService';
import { useJourneyStore } from '@/store/journeyStore';

const getCourses = journeyService.getChildCoursesWithProgress as jest.Mock;

const item = (n: number, cover: string | null) => ({
  course: { _id: `c${n}`, title: `Course ${n}`, coverImagePath: cover },
  progress: null,
  status: 'not_started',
  accessible: true,
  missingPrerequisites: [],
  progressPercentage: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefetch.mockResolvedValue(true);
  useJourneyStore.setState({ coursesByChildId: {}, loadingByChildId: {}, errorByChildId: {} });
});

describe('My Journey store — cover prefetch', () => {
  it('fetches only the first few covers ahead of time, into the cache the cards read from', async () => {
    const covers = Array.from({ length: 12 }, (_, n) => `https://api.example.com/uploads/c${n}.jpg`);
    getCourses.mockResolvedValue({ success: true, data: covers.map((cover, n) => item(n, cover)) });

    await useJourneyStore.getState().fetchChildCourses('kid1');

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith(covers.slice(0, 4), 'memory-disk');
  });

  it('turns a relative cover path into a full address before fetching it', async () => {
    getCourses.mockResolvedValue({ success: true, data: [item(0, '/uploads/courses/a.png')] });

    await useJourneyStore.getState().fetchChildCourses('kid1');

    const [urls] = mockPrefetch.mock.calls[0];
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/^https?:\/\/.+\/uploads\/courses\/a\.png$/);
  });

  it('skips courses with no cover, and fetches nothing when none has one', async () => {
    getCourses.mockResolvedValue({ success: true, data: [item(0, null), item(1, null)] });

    await useJourneyStore.getState().fetchChildCourses('kid1');

    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('still returns and stores the courses, whatever happens to the prefetch', async () => {
    mockPrefetch.mockRejectedValue(new Error('network down'));
    getCourses.mockResolvedValue({ success: true, data: [item(0, 'https://api.example.com/uploads/a.jpg')] });

    const list = await useJourneyStore.getState().fetchChildCourses('kid1');

    expect(list).toHaveLength(1);
    expect(useJourneyStore.getState().coursesByChildId.kid1).toHaveLength(1);
  });
});
