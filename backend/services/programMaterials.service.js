const ChildProfile = require('../models/ChildProfile');
const CourseProgress = require('../models/CourseProgress');
const {
  MAX_STEP,
  AHEAD_STEPS,
  buildStepPdfUrl,
  buildStepPrintables,
  buildFullBundleUrl,
  buildRecipesUrl,
} = require('../config/programMaterials.config');
const Course = require('../models/Course');

function parseObjectIdish(value) {
  if (!value) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function clampStep(step, maxStep) {
  const n = Number(step);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > maxStep) return maxStep;
  return Math.floor(n);
}

/**
 * Returns program materials availability + URLs for a specific child.
 *
 * Unlocking (MVP):
 * - Materials by Step: only currentStep and currentStep+1 are downloadable
 * - Full bundle: always downloadable
 * - Recipes: always downloadable
 */
async function getProgramMaterialsForChild({ parentUserId, childId }) {
  const parentId = parseObjectIdish(parentUserId);
  const cId = parseObjectIdish(childId);

  if (!parentId) {
    const err = new Error('Authentication required.');
    err.statusCode = 401;
    throw err;
  }
  if (!cId) {
    const err = new Error('childId is required.');
    err.statusCode = 400;
    throw err;
  }

  const child = await ChildProfile.findOne({ _id: cId, parent: parentId }).select(
    '_id displayName avatar preferences'
  );
  if (!child) {
    const err = new Error('Child not found or does not belong to you');
    err.statusCode = 403;
    throw err;
  }

  const configuredCourseId = parseObjectIdish(process.env.PROGRAM_MATERIALS_COURSE_ID);

  // If PROGRAM_MATERIALS_COURSE_ID is not set, fall back to the child's most recent
  // CourseProgress record. This keeps MVP unblocked while still using existing data.
  const courseProgressQuery = configuredCourseId
    ? await CourseProgress.findOne({
        child: child._id,
        course: configuredCourseId,
      }).select('course currentStep status progressPercentage contentProgress completedSteps')
    : await CourseProgress.findOne({ child: child._id }).sort({ updatedAt: -1 }).select('course currentStep');

  const courseId = configuredCourseId || (courseProgressQuery?.course ? String(courseProgressQuery.course) : null);

  const course = courseId
    ? await Course.findById(courseId).select('title description contents isPublished isArchived')
    : null;

  const derivedMaxStepFromCourse =
    course?.contents?.length > 0 ? Math.max(...course.contents.map((c) => Number(c.step) || 1)) : null;
  // Prefer the larger of:
  // - configured MAX_STEP (program definition)
  // - derived step count from existing course contents
  // This allows future steps to exist even if the course content is not fully populated yet.
  const maxStep = clampStep(Math.max(MAX_STEP, derivedMaxStepFromCourse || 0), Number.MAX_SAFE_INTEGER);

  const currentStep = clampStep(courseProgressQuery?.currentStep ?? 1, maxStep);
  const unlockThrough = clampStep(currentStep + Math.max(0, AHEAD_STEPS), maxStep);

  // Build a progress lookup map: `${contentType}:${contentId}:${step}` -> { status, completedAt }
  const progressByKey = new Map();
  const contentProgress = courseProgressQuery?.contentProgress || [];
  for (const p of contentProgress) {
    if (!p?.contentId || !p?.contentType || !p?.step) continue;
    const key = `${p.contentType}:${String(p.contentId)}:${Number(p.step)}`;
    progressByKey.set(key, {
      status: p.status || 'not_started',
      completedAt: p.completedAt || null,
    });
  }

  // Build step -> contents mapping (from Course.contents), now including progress.
  const stepToContents = new Map();
  if (course?.contents?.length) {
    for (const item of course.contents) {
      const step = clampStep(item.step ?? 1, maxStep);
      if (!stepToContents.has(step)) stepToContents.set(step, []);
      const contentId = item.contentId ? String(item.contentId) : null;
      const contentType = item.contentType;
      const progressKey = contentId ? `${contentType}:${contentId}:${step}` : null;
      const progress = progressKey ? progressByKey.get(progressKey) : null;
      stepToContents.get(step).push({
        contentId,
        contentType,
        order: item.order ?? 0,
        progressStatus: progress?.status || 'not_started',
        completedAt: progress?.completedAt || null,
      });
    }
    // sort each step's items by order then type (stable for UI)
    for (const [step, items] of stepToContents.entries()) {
      items.sort((a, b) => (a.order - b.order) || String(a.contentType).localeCompare(String(b.contentType)));
      stepToContents.set(step, items);
    }
  }

  // Return a list of all steps, but only "unlock" current..current+ahead
  const steps = [];
  for (let step = 1; step <= maxStep; step += 1) {
    const isUnlocked = step >= currentStep && step <= unlockThrough;
    const contents = stepToContents.get(step) || [];
    const totalCount = contents.length;
    const completedCount = contents.filter((c) => c.progressStatus === 'completed').length;
    const stepPrintables = buildStepPrintables(step).map((printable) => ({
      ...printable,
      fileUrl: isUnlocked ? printable.fileUrl : null,
      isUnlocked,
    }));

    const contentsByType = {
      library: [], // books
      videos: [],
      activities: [],
      audioAssignments: [],
      chants: [],
    };
    for (const item of contents) {
      if (item.contentType === 'book') contentsByType.library.push(item);
      else if (item.contentType === 'video') contentsByType.videos.push(item);
      else if (item.contentType === 'activity') contentsByType.activities.push(item);
      else if (item.contentType === 'audioAssignment') contentsByType.audioAssignments.push(item);
      else if (item.contentType === 'chant') contentsByType.chants.push(item);
    }

    steps.push({
      stepNumber: step,
      title: null, // step titles are not modeled today; keep nullable
      description: null,
      isUnlocked,
      // Back-compat for any consumer still expecting a single fileUrl.
      // We expose the first page URL when unlocked.
      fileUrl: isUnlocked ? stepPrintables[0]?.fileUrl || buildStepPdfUrl(step) : null,
      printables: stepPrintables,
      progress: {
        totalCount,
        completedCount,
        percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      },
      contentsByType,
      // Keep the flat list for flexibility/debugging (UI can ignore this)
      contents,
    });
  }

  return {
    child: {
      id: String(child._id),
      displayName: child.displayName,
      avatar: child.avatar || null,
      language: child.preferences?.language || 'en',
    },
    unlocking: {
      currentStep,
      unlockThrough,
      aheadSteps: AHEAD_STEPS,
      maxStep,
      modules: course
        ? [
            {
              id: String(course._id),
              title: course.title,
              description: course.description || null,
              steps,
            },
          ]
        : [],
    },
    // Back-compat: keep top-level list (frontend can use unlocking.modules[0].steps instead)
    materialsByStep: steps,
    fullBundle: { fileUrl: buildFullBundleUrl() },
    recipes: { fileUrl: buildRecipesUrl() },
    courseProgress: courseProgressQuery
      ? {
          status: courseProgressQuery.status || null,
          progressPercentage: Number.isFinite(courseProgressQuery.progressPercentage)
            ? courseProgressQuery.progressPercentage
            : null,
        }
      : null,
  };
}

module.exports = {
  getProgramMaterialsForChild,
  // export helpers for unit tests (optional)
  _internal: { clampStep },
};

