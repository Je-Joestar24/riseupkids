/**
 * Admin Module Access — list children + lock/unlock journey modules per child.
 * @see docs/ADMIN_MODULE_ACCESS_CONTROL_PLAN.md
 */

const mongoose = require('mongoose');
const { ChildProfile, Course, CourseProgress, User } = require('../models');
const {
  checkCourseAccess,
  MODULE_ACCESS_AUTO_KEEP_OPEN_PCT,
  shouldKeepModuleOpenByProgress,
} = require('./courseProgress.services');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sortCourses(courses) {
  return [...courses].sort((a, b) => {
    const aHasOrder = a.stepOrder !== null && a.stepOrder !== undefined;
    const bHasOrder = b.stepOrder !== null && b.stepOrder !== undefined;
    if (aHasOrder && bHasOrder) return a.stepOrder - b.stepOrder;
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

/**
 * Paginated children with progress summary for Module Access list.
 */
async function listChildrenForModuleAccess(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const search = String(queryParams.search || '').trim();
  const hasOverride =
    queryParams.hasOverride === true ||
    queryParams.hasOverride === 'true' ||
    queryParams.hasOverride === '1';

  const filter = { isActive: { $ne: false } };

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const matchingParents = await User.find({
      role: 'parent',
      $or: [{ name: rx }, { email: rx }],
    })
      .select('_id')
      .lean();
    const parentIds = matchingParents.map((p) => p._id);
    filter.$or = [{ displayName: rx }, ...(parentIds.length ? [{ parent: { $in: parentIds } }] : [])];
  }

  if (hasOverride) {
    const overrideChildIds = await CourseProgress.distinct('child', {
      accessOverride: { $in: ['force_unlock', 'force_lock'] },
    });
    filter._id = { $in: overrideChildIds };
  }

  const total = await ChildProfile.countDocuments(filter);
  const children = await ChildProfile.find(filter)
    .select('displayName avatar age isActive parent createdAt')
    .populate('parent', 'name email')
    .sort({ displayName: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const childIds = children.map((c) => c._id);
  const progresses = await CourseProgress.find({ child: { $in: childIds } })
    .select('child course status progressPercentage accessOverride')
    .lean();

  const courses = sortCourses(
    await Course.find({ isPublished: true, isArchived: false })
      .select('title stepOrder')
      .lean()
  );
  const courseById = new Map(courses.map((c) => [String(c._id), c]));

  const byChild = new Map();
  for (const p of progresses) {
    const key = String(p.child);
    if (!byChild.has(key)) byChild.set(key, []);
    byChild.get(key).push(p);
  }

  const data = children.map((child) => {
    const list = byChild.get(String(child._id)) || [];
    let completedCount = 0;
    let lockedCount = 0;
    let activeModule = null;
    let overrideCount = 0;

    for (const p of list) {
      if (p.accessOverride === 'force_unlock' || p.accessOverride === 'force_lock') {
        overrideCount += 1;
      }
      if (p.status === 'completed') completedCount += 1;
      else if (p.status === 'locked' || p.accessOverride === 'force_lock') lockedCount += 1;
      if (
        (p.status === 'in_progress' || p.status === 'not_started') &&
        p.accessOverride !== 'force_lock'
      ) {
        const course = courseById.get(String(p.course));
        if (course && !activeModule) {
          activeModule = {
            courseId: course._id,
            title: course.title,
            stepOrder: course.stepOrder,
            status: p.status,
            progressPercentage: p.progressPercentage || 0,
          };
        }
      }
    }

    return {
      _id: child._id,
      displayName: child.displayName,
      avatar: child.avatar || null,
      age: child.age ?? null,
      isActive: child.isActive !== false,
      parent: child.parent
        ? {
            _id: child.parent._id,
            name: child.parent.name,
            email: child.parent.email,
          }
        : null,
      summary: {
        completedCount,
        lockedCount,
        totalModules: courses.length,
        overrideCount,
        activeModule,
        hasOverrides: overrideCount > 0,
      },
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}

/**
 * Full module list for one child (admin detail).
 */
async function getChildModuleAccessDetail(childId) {
  if (!isValidObjectId(childId)) {
    throw new Error('Invalid child id');
  }

  const child = await ChildProfile.findById(childId)
    .select('displayName avatar age isActive parent')
    .populate('parent', 'name email')
    .lean();
  if (!child) {
    throw new Error('Child not found');
  }

  const courses = sortCourses(
    await Course.find({ isPublished: true, isArchived: false })
      .select('title stepOrder contents isSequential prerequisites isPublished')
      .lean()
  );

  const progresses = await CourseProgress.find({ child: childId }).lean();
  const progressByCourse = new Map(progresses.map((p) => [String(p.course), p]));

  const modules = [];
  for (const course of courses) {
    const progress = progressByCourse.get(String(course._id)) || null;
    const accessCheck = await checkCourseAccess(childId, course._id);
    const accessOverride = (progress && progress.accessOverride) || 'none';

    let status = progress?.status || (accessCheck.accessible ? 'not_started' : 'locked');
    if (accessOverride === 'force_lock' && status !== 'completed') status = 'locked';
    if (accessOverride === 'force_unlock' && status === 'locked') status = 'not_started';

    const totalContent = Array.isArray(course.contents) ? course.contents.length : 0;
    const completedContent = progress?.contentProgress
      ? progress.contentProgress.filter((c) => c.status === 'completed').length
      : 0;

    const isCompleted = status === 'completed';
    const effectivelyLocked = status === 'locked' || accessOverride === 'force_lock';

    modules.push({
      courseId: course._id,
      title: course.title,
      stepOrder: course.stepOrder,
      status,
      progressPercentage: progress?.progressPercentage || 0,
      accessible: accessCheck.accessible,
      accessOverride,
      accessOverrideAt: progress?.accessOverrideAt || null,
      accessOverrideNote: progress?.accessOverrideNote || '',
      completedContent,
      totalContent,
      canLock: !isCompleted && !effectivelyLocked,
      canUnlock: !isCompleted && effectivelyLocked,
      canClearOverride: accessOverride !== 'none' && !isCompleted,
    });
  }

  return {
    child: {
      _id: child._id,
      displayName: child.displayName,
      avatar: child.avatar || null,
      age: child.age ?? null,
      parent: child.parent
        ? {
            _id: child.parent._id,
            name: child.parent.name,
            email: child.parent.email,
          }
        : null,
    },
    modules,
  };
}

async function getOrCreateProgressDoc(childId, courseId) {
  let progress = await CourseProgress.findOne({ child: childId, course: courseId });
  if (!progress) {
    progress = await CourseProgress.create({
      child: childId,
      course: courseId,
      status: 'locked',
      progressPercentage: 0,
    });
  }
  return progress;
}

/**
 * Admin unlock a module for a child (force_unlock).
 */
async function unlockModuleForChild(childId, courseId, adminUserId, note = '') {
  if (!isValidObjectId(childId) || !isValidObjectId(courseId)) {
    throw new Error('Invalid child or course id');
  }

  const child = await ChildProfile.findById(childId).select('_id').lean();
  if (!child) throw new Error('Child not found');

  const course = await Course.findById(courseId).select('_id title isPublished isArchived').lean();
  if (!course || course.isArchived || !course.isPublished) {
    throw new Error('Course not found or not available');
  }

  const progress = await getOrCreateProgressDoc(childId, courseId);
  if (progress.status === 'completed') {
    throw new Error('Completed modules cannot be unlocked');
  }

  progress.accessOverride = 'force_unlock';
  progress.accessOverrideAt = new Date();
  progress.accessOverrideBy = adminUserId || null;
  progress.accessOverrideNote = String(note || '').slice(0, 500);

  if (progress.status === 'locked') {
    progress.status = 'in_progress';
    progress.startedAt = progress.startedAt || new Date();
    progress.currentStep = progress.currentStep || 1;
  }

  await progress.save();

  return getChildModuleAccessDetail(childId);
}

/**
 * Admin lock a module for a child (force_lock). Progress % preserved.
 */
async function lockModuleForChild(childId, courseId, adminUserId, note = '') {
  if (!isValidObjectId(childId) || !isValidObjectId(courseId)) {
    throw new Error('Invalid child or course id');
  }

  const child = await ChildProfile.findById(childId).select('_id').lean();
  if (!child) throw new Error('Child not found');

  const course = await Course.findById(courseId).select('_id isPublished isArchived').lean();
  if (!course || course.isArchived || !course.isPublished) {
    throw new Error('Course not found or not available');
  }

  const progress = await getOrCreateProgressDoc(childId, courseId);
  if (progress.status === 'completed') {
    throw new Error('Completed modules cannot be locked');
  }

  progress.accessOverride = 'force_lock';
  progress.accessOverrideAt = new Date();
  progress.accessOverrideBy = adminUserId || null;
  progress.accessOverrideNote = String(note || '').slice(0, 500);
  progress.status = 'locked';

  await progress.save();

  return getChildModuleAccessDetail(childId);
}

/**
 * Clear admin override and recompute status from automatic rules.
 */
async function clearModuleOverride(childId, courseId, adminUserId, note = '') {
  if (!isValidObjectId(childId) || !isValidObjectId(courseId)) {
    throw new Error('Invalid child or course id');
  }

  const progress = await CourseProgress.findOne({ child: childId, course: courseId });
  if (!progress) {
    throw new Error('No progress record to clear');
  }
  if (progress.status === 'completed') {
    progress.accessOverride = 'none';
    progress.accessOverrideAt = null;
    progress.accessOverrideBy = null;
    progress.accessOverrideNote = '';
    await progress.save();
    return getChildModuleAccessDetail(childId);
  }

  progress.accessOverride = 'none';
  progress.accessOverrideAt = new Date();
  progress.accessOverrideBy = adminUserId || null;
  progress.accessOverrideNote = String(note || '').slice(0, 500);
  await progress.save();

  // Re-check after override is cleared in DB
  const accessCheck = await checkCourseAccess(childId, courseId);
  const pct = typeof progress.progressPercentage === 'number' ? progress.progressPercentage : 0;

  // Already ≥ keep-open threshold: stay playable under automatic rules
  if (shouldKeepModuleOpenByProgress(progress) || pct >= MODULE_ACCESS_AUTO_KEEP_OPEN_PCT) {
    progress.status = 'in_progress';
    if (!progress.startedAt) progress.startedAt = new Date();
  } else if (!accessCheck.accessible) {
    progress.status = 'locked';
  } else if (progress.status === 'locked') {
    progress.status = pct > 0 ? 'in_progress' : 'not_started';
  }

  await progress.save();
  return getChildModuleAccessDetail(childId);
}

module.exports = {
  listChildrenForModuleAccess,
  getChildModuleAccessDetail,
  unlockModuleForChild,
  lockModuleForChild,
  clearModuleOverride,
};
