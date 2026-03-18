import axios from '../../../api/axios';

/**
 * Complete an HTML5 book attempt for a child inside a module.
 * Mirrors the SCORM "Done" behavior but without countdown/auto-complete.
 *
 * Backend endpoint is shared with SCORM books:
 * POST /course-progress/:courseId/child/:childId/book/:bookId/complete
 */
export async function completeHtml5Book({
  courseId,
  childId,
  bookId,
  score = null,
  maxScore = null,
  status = 'passed',
  timeSpent = 0,
  progress = 100,
  dryRun = false,
} = {}) {
  if (!courseId || !childId || !bookId) {
    throw new Error('courseId, childId, and bookId are required');
  }

  const endpoint = `/course-progress/${courseId}/child/${childId}/book/${bookId}/complete${
    dryRun ? '?dryRun=1' : ''
  }`;
  const payload = {
    score,
    maxScore,
    status,
    timeSpent,
    progress: progress ?? 0,
  };

  const res = await axios.post(endpoint, payload);
  return res?.data;
}

export default { completeHtml5Book };
