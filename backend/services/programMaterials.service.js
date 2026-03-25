const { ChildProfile, Course, CourseProgress, ProgramPrintable } = require('../models');
const { checkCourseAccess } = require('./courseProgress.services');
const { MAX_STEP, AHEAD_STEPS } = require('../config/programMaterials.config');

function parseObjectIdish(value) {
  if (!value) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function orderCoursesForModules(courses) {
  // Match existing CourseProgress ordering: stepOrder first, then createdAt
  return courses.sort((a, b) => {
    const aOrder = a.stepOrder !== null && a.stepOrder !== undefined;
    const bOrder = b.stepOrder !== null && b.stepOrder !== undefined;
    if (aOrder && bOrder) return a.stepOrder - b.stepOrder;
    if (aOrder && !bOrder) return -1;
    if (!aOrder && bOrder) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
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

  const [fullBundlePrintable, recipesPrintable] = await Promise.all([
    ProgramPrintable.findOne({ type: 'full_bundle', isActive: true }).select('pdfUrl title description coverImage'),
    ProgramPrintable.findOne({ type: 'recipes', isActive: true }).select('pdfUrl title description coverImage'),
  ]);

  // Modules = Courses (the “step” in our terms)
  const courses = await Course.find({ isPublished: true, isArchived: false }).select(
    '_id title description coverImage stepOrder contents createdAt'
  );
  const orderedCourses = orderCoursesForModules(courses);

  const maxStep = Math.max(1, Math.min(orderedCourses.length, Number(MAX_STEP || orderedCourses.length)));
  const modules = orderedCourses.slice(0, maxStep);

  const courseProgresses = await CourseProgress.find({
    child: child._id,
    course: { $in: modules.map((c) => c._id) },
  }).select('course status progressPercentage contentProgress');

  const courseProgressByCourseId = new Map();
  for (const cp of courseProgresses) courseProgressByCourseId.set(String(cp.course), cp);

  const activeModulePrintables = await ProgramPrintable.find({
    type: 'module',
    isActive: true,
    course: { $in: modules.map((c) => c._id) },
  }).select('course title description coverImage pdfUrl updatedAt');

  const printableByCourseId = new Map();
  for (const p of activeModulePrintables) {
    const key = String(p.course);
    // If multiple active records exist, prefer the latest updatedAt
    const existing = printableByCourseId.get(key);
    if (!existing || (p.updatedAt && existing.updatedAt && p.updatedAt > existing.updatedAt)) {
      printableByCourseId.set(key, p);
    }
  }

  // Determine status for each course to find current module index.
  const moduleStates = await Promise.all(
    modules.map(async (course) => {
      const cp = courseProgressByCourseId.get(String(course._id));
      if (cp) return { course, status: cp.status, progress: cp };

      const accessCheck = await checkCourseAccess(child._id, course._id);
      const status = accessCheck.accessible ? 'not_started' : 'locked';
      return { course, status, progress: null };
    })
  );

  let currentIndex = moduleStates.findIndex((m) => m.status === 'in_progress');
  if (currentIndex === -1) currentIndex = moduleStates.findIndex((m) => m.status === 'not_started');
  if (currentIndex === -1) currentIndex = 0;

  const unlockThroughIndex = Math.min(maxStep - 1, currentIndex + Math.max(0, AHEAD_STEPS));
  const currentStep = currentIndex + 1;
  const unlockThrough = unlockThroughIndex + 1;

  const modulesPayload = moduleStates.map((m, idx) => {
    const isUnlocked = idx >= currentIndex && idx <= unlockThroughIndex;

    const printable = printableByCourseId.get(String(m.course._id)) || null;

    const contentProgress = m.progress?.contentProgress || [];
    const progressByContentKey = new Map();
    for (const p of contentProgress) {
      if (!p?.contentId || !p?.contentType) continue;
      const key = `${p.contentType}:${String(p.contentId)}`;
      progressByContentKey.set(key, {
        status: p.status || 'not_started',
        completedAt: p.completedAt || null,
      });
    }

    const contents = m.course.contents || [];
    const contentsByType = {
      library: [],
      videos: [],
      activities: [],
      audioAssignments: [],
      chants: [],
    };

    for (const item of contents) {
      const contentId = item.contentId ? String(item.contentId) : null;
      const contentType = item.contentType;
      const key = contentId ? `${contentType}:${contentId}` : null;
      const prog = key ? progressByContentKey.get(key) : null;

      const payload = {
        contentId,
        contentType,
        order: item.order ?? 0,
        progressStatus: prog?.status || 'not_started',
        completedAt: prog?.completedAt || null,
      };

      if (contentType === 'book') contentsByType.library.push(payload);
      else if (contentType === 'video') contentsByType.videos.push(payload);
      else if (contentType === 'activity') contentsByType.activities.push(payload);
      else if (contentType === 'audioAssignment') contentsByType.audioAssignments.push(payload);
      else if (contentType === 'chant') contentsByType.chants.push(payload);
    }

    const allItems = [
      ...contentsByType.library,
      ...contentsByType.videos,
      ...contentsByType.activities,
      ...contentsByType.audioAssignments,
      ...contentsByType.chants,
    ];
    const totalCount = allItems.length;
    const completedCount = allItems.filter((c) => c.progressStatus === 'completed').length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      stepNumber: idx + 1,
      isUnlocked,
      module: {
        id: String(m.course._id),
        title: printable?.title || m.course.title,
        description: printable?.description || m.course.description || null,
        coverImage: printable?.coverImage || m.course.coverImage || null,
      },
      printable: printable
        ? {
            id: String(printable._id),
            pdfUrl: isUnlocked ? printable.pdfUrl : null,
          }
        : { id: null, pdfUrl: null },
      progress: {
        totalCount,
        completedCount,
        percent,
      },
      contentsByType,
    };
  });

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
      modules: modulesPayload.map((m) => ({
        id: m.module.id,
        stepNumber: m.stepNumber,
        isUnlocked: m.isUnlocked,
        title: m.module.title,
        description: m.module.description,
        coverImage: m.module.coverImage,
        contents: m.contentsByType,
        progress: m.progress,
        printablePdfUrl: m.printable.pdfUrl,
      })),
    },
    // Back-compat for older FE
    materialsByStep: modulesPayload,
    fullBundle: fullBundlePrintable ? { fileUrl: fullBundlePrintable.pdfUrl, title: fullBundlePrintable.title } : { fileUrl: null, title: null },
    recipes: recipesPrintable ? { fileUrl: recipesPrintable.pdfUrl, title: recipesPrintable.title } : { fileUrl: null, title: null },
  };
}

module.exports = {
  getProgramMaterialsForChild,
};

