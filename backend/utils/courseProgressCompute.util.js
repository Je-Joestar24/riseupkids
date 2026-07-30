/**
 * Compute course progress against the course's *current* contents only.
 * Orphaned contentProgress rows (removed videos/books/activities) are ignored
 * so % and completed counts stay correct after CMS edits.
 */

function toIdString(value) {
  if (value == null) return '';
  if (typeof value === 'object' && value._id != null) return String(value._id);
  return String(value);
}

function isContentCompletedInProgress(contentProgress, content) {
  const contentId = toIdString(content.contentId);
  const contentType = content.contentType;
  const step = Number(content.step);
  const list = Array.isArray(contentProgress) ? contentProgress : [];

  const exact = list.find(
    (p) =>
      toIdString(p.contentId) === contentId &&
      p.contentType === contentType &&
      Number(p.step) === step &&
      p.status === 'completed'
  );
  if (exact) return true;

  // Step may have been reassigned after content was completed
  return list.some(
    (p) =>
      toIdString(p.contentId) === contentId &&
      p.contentType === contentType &&
      p.status === 'completed'
  );
}

/**
 * @param {Array} courseContents - course.contents
 * @param {Array} contentProgress - CourseProgress.contentProgress
 * @returns {{ completedContent: number, totalContent: number, progressPercentage: number }}
 */
function computeCourseContentProgress(courseContents, contentProgress) {
  const contents = Array.isArray(courseContents) ? courseContents : [];
  const totalContent = contents.length;

  if (totalContent === 0) {
    return { completedContent: 0, totalContent: 0, progressPercentage: 0 };
  }

  let completedContent = 0;
  for (const content of contents) {
    if (isContentCompletedInProgress(contentProgress, content)) {
      completedContent += 1;
    }
  }

  return {
    completedContent,
    totalContent,
    progressPercentage: Math.round((completedContent / totalContent) * 100),
  };
}

/**
 * Keep only contentProgress entries that still exist on the course
 * (match by contentId + contentType).
 */
function filterContentProgressToCourse(contentProgress, courseContents) {
  const keys = new Set(
    (Array.isArray(courseContents) ? courseContents : []).map(
      (c) => `${toIdString(c.contentId)}:${c.contentType}`
    )
  );
  return (Array.isArray(contentProgress) ? contentProgress : []).filter((p) =>
    keys.has(`${toIdString(p.contentId)}:${p.contentType}`)
  );
}

module.exports = {
  computeCourseContentProgress,
  filterContentProgressToCourse,
  isContentCompletedInProgress,
  toIdString,
};
