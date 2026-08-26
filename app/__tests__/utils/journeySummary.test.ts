import { deriveJourneySummary, emptyJourneySummary } from '@/utils/journeySummary';
import type { ChildCourseWithProgress } from '@/services/journeyService';

function course(
  status: ChildCourseWithProgress['status'],
  progressPercentage = 0
): ChildCourseWithProgress {
  return {
    course: { _id: status, title: status },
    progress: null,
    status,
    accessible: status !== 'locked',
    missingPrerequisites: [],
    progressPercentage,
  };
}

describe('deriveJourneySummary', () => {
  it('returns empty summary for no courses', () => {
    expect(deriveJourneySummary([])).toEqual(emptyJourneySummary);
  });

  it('counts statuses and averages progress', () => {
    const summary = deriveJourneySummary([
      course('completed', 100),
      course('in_progress', 50),
      course('not_started', 0),
      course('locked', 0),
    ]);
    expect(summary.totalCourses).toBe(4);
    expect(summary.completedCount).toBe(1);
    expect(summary.inProgressCount).toBe(1);
    expect(summary.notStartedCount).toBe(1);
    expect(summary.lockedCount).toBe(1);
    expect(summary.overallPercentage).toBe(38);
  });
});
