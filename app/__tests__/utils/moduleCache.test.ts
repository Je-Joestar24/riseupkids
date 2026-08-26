import {
  moduleCacheKey,
  pickModuleDetailsForCourse,
  shouldShowModuleLoading,
} from '@/utils/moduleCache';
import type { ModuleDetailsPayload } from '@/services/moduleService';

function payload(courseId: string): ModuleDetailsPayload {
  return {
    course: { _id: courseId, title: courseId, contents: [] },
    child: { _id: 'child-1' },
    progress: null,
    accessible: true,
    missingPrerequisites: [],
  };
}

describe('moduleCacheKey', () => {
  it('joins child and course ids', () => {
    expect(moduleCacheKey('c1', 'm1')).toBe('c1:m1');
  });
});

describe('shouldShowModuleLoading', () => {
  it('shows loading only when there is no cache', () => {
    expect(shouldShowModuleLoading(false)).toBe(true);
    expect(shouldShowModuleLoading(true)).toBe(false);
  });

  it('never shows loading for a silent refresh', () => {
    expect(shouldShowModuleLoading(false, { silent: true })).toBe(false);
    expect(shouldShowModuleLoading(true, { silent: true })).toBe(false);
  });
});

describe('pickModuleDetailsForCourse', () => {
  const cachedA = payload('course-a');
  const cachedB = payload('course-b');
  const detailsByKey = {
    [moduleCacheKey('child-1', 'course-a')]: cachedA,
    [moduleCacheKey('child-1', 'course-b')]: cachedB,
  };

  it('returns live details when they already match the course', () => {
    const live = payload('course-b');
    expect(
      pickModuleDetailsForCourse(live, detailsByKey, 'child-1', 'course-b')
    ).toBe(live);
  });

  it('uses cache when live details belong to a different course', () => {
    expect(
      pickModuleDetailsForCourse(cachedA, detailsByKey, 'child-1', 'course-b')
    ).toBe(cachedB);
  });

  it('returns null when switching to an uncached course', () => {
    expect(
      pickModuleDetailsForCourse(cachedA, detailsByKey, 'child-1', 'course-c')
    ).toBeNull();
  });
});
