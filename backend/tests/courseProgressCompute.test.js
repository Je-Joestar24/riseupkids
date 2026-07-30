/**
 * Progress must count only current course.contents — orphans from removed CMS items ignored.
 */
const {
  computeCourseContentProgress,
  filterContentProgressToCourse,
} = require('../utils/courseProgressCompute.util');

describe('computeCourseContentProgress', () => {
  const id = (n) => `507f1f77bcf86cd79943901${n}`;

  it('shows 50% for 2/4 current contents even if stored orphans exist', () => {
    const contents = [
      { contentId: id(1), contentType: 'video', step: 1 },
      { contentId: id(2), contentType: 'book', step: 1 },
      { contentId: id(3), contentType: 'activity', step: 1 },
      { contentId: id(4), contentType: 'video', step: 1 },
    ];
    const contentProgress = [
      { contentId: id(1), contentType: 'video', step: 1, status: 'completed' },
      { contentId: id(2), contentType: 'book', step: 1, status: 'completed' },
      // Orphans from removed content (would inflate old math)
      { contentId: id(8), contentType: 'video', step: 1, status: 'completed' },
      { contentId: id(9), contentType: 'activity', step: 1, status: 'completed' },
    ];

    const live = computeCourseContentProgress(contents, contentProgress);
    expect(live).toEqual({
      completedContent: 2,
      totalContent: 4,
      progressPercentage: 50,
    });
  });

  it('does not keep stale 10% when module shrank after 1/10 completion', () => {
    // Historically: 1 of 10 → 10%. CMS removed 6 items; 1 of remaining 4 still completed → 25%.
    const contents = [
      { contentId: id(1), contentType: 'video', step: 1 },
      { contentId: id(2), contentType: 'book', step: 1 },
      { contentId: id(3), contentType: 'activity', step: 1 },
      { contentId: id(4), contentType: 'video', step: 1 },
    ];
    const contentProgress = [
      { contentId: id(1), contentType: 'video', step: 1, status: 'completed' },
      { contentId: id(7), contentType: 'video', step: 1, status: 'completed' }, // removed
    ];

    expect(computeCourseContentProgress(contents, contentProgress).progressPercentage).toBe(25);
  });

  it('returns 100% when every current item is completed', () => {
    const contents = [
      { contentId: id(1), contentType: 'video', step: 1 },
      { contentId: id(2), contentType: 'book', step: 1 },
    ];
    const contentProgress = [
      { contentId: id(1), contentType: 'video', step: 1, status: 'completed' },
      { contentId: id(2), contentType: 'book', step: 1, status: 'completed' },
    ];
    expect(computeCourseContentProgress(contents, contentProgress).progressPercentage).toBe(100);
  });

  it('matches completed content even if step was reassigned', () => {
    const contents = [{ contentId: id(1), contentType: 'video', step: 2 }];
    const contentProgress = [
      { contentId: id(1), contentType: 'video', step: 1, status: 'completed' },
    ];
    expect(computeCourseContentProgress(contents, contentProgress).completedContent).toBe(1);
  });
});

describe('filterContentProgressToCourse', () => {
  const id = (n) => `507f1f77bcf86cd79943901${n}`;

  it('drops orphaned progress rows for removed content', () => {
    const contents = [{ contentId: id(1), contentType: 'video', step: 1 }];
    const contentProgress = [
      { contentId: id(1), contentType: 'video', step: 1, status: 'completed' },
      { contentId: id(9), contentType: 'book', step: 1, status: 'completed' },
    ];
    const filtered = filterContentProgressToCourse(contentProgress, contents);
    expect(filtered).toHaveLength(1);
    expect(String(filtered[0].contentId)).toBe(id(1));
  });
});
