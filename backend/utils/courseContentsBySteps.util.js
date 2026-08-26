/**
 * Organize course.contents by step, then by content type.
 * Same shape as Course#getContentsBySteps — works on lean objects too.
 *
 * @param {Array<{ step?: number, contentType?: string, order?: number }>} contents
 * @returns {Array<{ step: number, groups: Record<string, unknown[]> }>}
 */
function organizeCourseContentsBySteps(contents) {
  if (!contents || contents.length === 0) {
    return [];
  }

  const stepsMap = new Map();

  contents.forEach((content) => {
    const step = content.step || 1;

    if (!stepsMap.has(step)) {
      stepsMap.set(step, {
        step,
        groups: {
          book: [],
          activity: [],
          video: [],
          audioAssignment: [],
          chant: [],
        },
      });
    }

    const stepData = stepsMap.get(step);
    if (stepData.groups[content.contentType]) {
      stepData.groups[content.contentType].push(content);
    }
  });

  const stepsArray = Array.from(stepsMap.values()).sort((a, b) => a.step - b.step);

  stepsArray.forEach((stepData) => {
    Object.keys(stepData.groups).forEach((contentType) => {
      stepData.groups[contentType].sort((a, b) => a.order - b.order);
    });
  });

  return stepsArray;
}

module.exports = { organizeCourseContentsBySteps };
