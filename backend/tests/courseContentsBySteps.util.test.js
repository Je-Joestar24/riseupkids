const { organizeCourseContentsBySteps } = require('../utils/courseContentsBySteps.util');

describe('organizeCourseContentsBySteps', () => {
  it('returns an empty list when there are no contents', () => {
    expect(organizeCourseContentsBySteps(null)).toEqual([]);
    expect(organizeCourseContentsBySteps([])).toEqual([]);
  });

  it('groups by step and content type, sorted by order', () => {
    const contents = [
      { contentId: 'v2', contentType: 'video', step: 1, order: 1 },
      { contentId: 'b1', contentType: 'book', step: 2, order: 0 },
      { contentId: 'v1', contentType: 'video', step: 1, order: 0 },
      { contentId: 'a1', contentType: 'activity', step: 1, order: 0 },
    ];

    const steps = organizeCourseContentsBySteps(contents);
    expect(steps.map((s) => s.step)).toEqual([1, 2]);
    expect(steps[0].groups.video.map((c) => c.contentId)).toEqual(['v1', 'v2']);
    expect(steps[0].groups.activity.map((c) => c.contentId)).toEqual(['a1']);
    expect(steps[1].groups.book.map((c) => c.contentId)).toEqual(['b1']);
  });
});
