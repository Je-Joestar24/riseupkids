const { Course, CourseProgress, ChildProfile, VideoWatch } = require('../models');
const { computeCourseContentProgress } = require('../utils/courseProgressCompute.util');
const { organizeCourseContentsBySteps } = require('../utils/courseContentsBySteps.util');
const { populateCourseContents } = require('../utils/populateCourseContents.util');

/** Once a module reaches this % under automatic rules, keep it open (do not re-lock). */
const MODULE_ACCESS_AUTO_KEEP_OPEN_PCT = 75;

const getProgressOverride = (progress) =>
  (progress && progress.accessOverride) || 'none';

const getProgressPercentage = (progress) => {
  const raw = progress?.progressPercentage;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Automatic access: modules already substantially progressed stay playable
 * even if prerequisites / 1-active rules would otherwise lock them.
 */
const shouldKeepModuleOpenByProgress = (progress) => {
  if (!progress) return false;
  if (progress.status === 'completed') return false;
  if (getProgressOverride(progress) === 'force_lock') return false;
  return getProgressPercentage(progress) >= MODULE_ACCESS_AUTO_KEEP_OPEN_PCT;
};

/**
 * Count courses in "in_progress" or "not_started" status for a child
 * Maximum allowed is 2
 * 
 * @param {String} childId - Child's MongoDB ID
 * @returns {Number} Count of in-progress courses
 */
const countInProgressCourses = async (childId) => {
  const count = await CourseProgress.countDocuments({
    child: childId,
    status: { $in: ['in_progress', 'not_started'] },
  });
  return count;
};

/**
 * Check if a child can access a course
 * Verifies prerequisites are completed if course is sequential.
 * Honors admin accessOverride (force_unlock / force_lock).
 * Keeps modules open automatically once progress >= 75%.
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Access information with accessible flag and reason
 */
const checkCourseAccess = async (childId, courseId, preloaded = {}) => {
  const course = preloaded.course || (await Course.findById(courseId));
  if (!course) {
    throw new Error('Course not found');
  }

  const progress =
    preloaded.progress !== undefined
      ? preloaded.progress
      : await CourseProgress.findOne({ child: childId, course: courseId })
          .select('accessOverride status progressPercentage')
          .lean();
  const override = getProgressOverride(progress);

  if (override === 'force_unlock') {
    return {
      accessible: true,
      reason: 'admin_override',
      course,
      accessOverride: override,
    };
  }

  if (override === 'force_lock') {
    return {
      accessible: false,
      reason: 'admin_locked',
      course,
      accessOverride: override,
    };
  }

  // Substantial progress: keep open under automatic rules (e.g. after Reset automatic)
  if (shouldKeepModuleOpenByProgress(progress)) {
    return {
      accessible: true,
      reason: 'substantial_progress',
      course,
      accessOverride: 'none',
    };
  }

  // If course is not sequential or has no prerequisites, it's accessible
  if (!course.isSequential || !course.prerequisites || course.prerequisites.length === 0) {
    return { accessible: true, reason: null, course, accessOverride: 'none' };
  }

  // Check if all prerequisites are completed
  const prerequisitesProgress = await CourseProgress.find({
    child: childId,
    course: { $in: course.prerequisites },
    status: 'completed',
  });

  if (prerequisitesProgress.length < course.prerequisites.length) {
    const completedPrereqIds = prerequisitesProgress.map((p) => p.course.toString());
    const missing = course.prerequisites.filter(
      (prereqId) => !completedPrereqIds.includes(prereqId.toString())
    );

    // Get missing prerequisite course details
    const missingCourses = await Course.find({ _id: { $in: missing } }).select('title stepOrder');

    return {
      accessible: false,
      reason: 'Prerequisites not completed',
      missingPrerequisites: missing,
      missingCourses,
      course,
      accessOverride: 'none',
    };
  }

  return { accessible: true, reason: null, course, accessOverride: 'none' };
};

/**
 * Get or create course progress for a child
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} CourseProgress document
 */
const getOrCreateCourseProgress = async (childId, courseId) => {
  let progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  });

  if (!progress) {
    // Check access before creating
    const accessCheck = await checkCourseAccess(childId, courseId);
    const initialStatus = accessCheck.accessible ? 'not_started' : 'locked';

    progress = await CourseProgress.create({
      child: childId,
      course: courseId,
      status: initialStatus,
      progressPercentage: 0,
    });
  }

  return progress;
};

/**
 * Get all courses with progress for a child
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {Object} queryParams - Optional query parameters
 * @returns {Array} Array of courses with progress information
 */
const getChildCourses = async (childId, queryParams = {}) => {
  const { status, isDefault } = queryParams;

  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Build course query
  let courseQuery = { isPublished: true, isArchived: false };
  if (isDefault === 'true' || isDefault === true) {
    courseQuery.isDefault = true;
  }

  // Get all accessible courses
  // Sort: courses with stepOrder first (ascending), then courses without stepOrder (by createdAt)
  // This ensures ordered courses appear first, followed by unordered ones
  const courses = await Course.find(courseQuery).sort({ 
    stepOrder: 1, // null values come first in ascending, but we'll handle this
    createdAt: 1 
  });
  
  // Post-process sorting: ensure courses with stepOrder come before those without
  // MongoDB's null handling can vary, so we'll explicitly sort
  courses.sort((a, b) => {
    const aHasOrder = a.stepOrder !== null && a.stepOrder !== undefined;
    const bHasOrder = b.stepOrder !== null && b.stepOrder !== undefined;
    
    if (aHasOrder && bHasOrder) {
      // Both have stepOrder, sort by stepOrder ascending
      return a.stepOrder - b.stepOrder;
    } else if (aHasOrder && !bHasOrder) {
      // a has order, b doesn't - a comes first
      return -1;
    } else if (!aHasOrder && bHasOrder) {
      // b has order, a doesn't - b comes first
      return 1;
    } else {
      // Neither has order, sort by createdAt ascending
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  // Get all progress for this child
  const progressMap = {};
  const allProgress = await CourseProgress.find({ child: childId });
  allProgress.forEach((p) => {
    progressMap[p.course.toString()] = p;
  });

  // Combine courses with progress and check access
  let coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const progress = progressMap[course._id.toString()] || null;
      const accessCheck = await checkCourseAccess(childId, course._id);
      const accessOverride = getProgressOverride(progress);

      // Determine current status
      let currentStatus = 'not_started';
      if (progress) {
        currentStatus = progress.status;
        // Keep force_lock reflected as locked unless completed
        if (accessOverride === 'force_lock' && currentStatus !== 'completed') {
          currentStatus = 'locked';
        }
        // Force unlock: if still locked in DB, surface as not_started for journey UI
        if (accessOverride === 'force_unlock' && currentStatus === 'locked') {
          currentStatus = 'not_started';
        }
      } else if (!accessCheck.accessible) {
        currentStatus = 'locked';
      }

      const livePct = progress
        ? computeCourseContentProgress(course.contents, progress.contentProgress)
            .progressPercentage
        : 0;

      // Persist heal when CMS removed content left stored % stale
      if (progress && progress.progressPercentage !== livePct) {
        progress.updateProgressPercentage(course);
        await progress.save().catch(() => {});
        // Refresh display status after heal (e.g. all remaining content done → completed)
        currentStatus = progress.status;
        if (accessOverride === 'force_lock' && currentStatus !== 'completed') {
          currentStatus = 'locked';
        }
        if (accessOverride === 'force_unlock' && currentStatus === 'locked') {
          currentStatus = 'not_started';
        }
      }

      return {
        course: course.toObject(),
        progress: progress ? progress.toObject() : null,
        status: currentStatus,
        accessible: accessCheck.accessible,
        accessOverride,
        accessReason: accessCheck.reason || null,
        missingPrerequisites: accessCheck.missingCourses || [],
        progressPercentage:
          progress && typeof progress.progressPercentage === 'number'
            ? progress.progressPercentage
            : livePct,
      };
    })
  );

  // Enforce 1-course limit: only 1 course can be in "in_progress" or "not_started" at a time
  // Keep completed courses as-is, but limit active courses
  // Lock courses beyond the first 1 (in order) that are in progress/not_started
  // If no course is in progress and there are accessible locked courses, unlock the next one
  // Admin overrides: never re-lock force_unlock; never auto-unlock force_lock
  const MAX_IN_PROGRESS = 1;
  let inProgressCount = 0;
  const coursesToLock = []; // Track courses that need to be locked in the database
  let courseToUnlock = null; // Track the next course that should be unlocked and set to in_progress

  // First pass: count current in-progress courses and find if we need to unlock one
  const currentInProgress = coursesWithProgress.filter(
    (item) => item.status === 'in_progress' || item.status === 'not_started'
  );

  // If no course is in progress, find the first accessible locked course and unlock it.
  // Admin force_lock is a hard gate: do not skip past it to auto-start later modules
  // (locking the next/first module alone must pause the journey).
  if (currentInProgress.length === 0) {
    for (const item of coursesWithProgress) {
      if (item.status === 'completed') {
        continue;
      }

      if (item.accessOverride === 'force_lock') {
        break;
      }

      if (item.status === 'locked' && item.accessible) {
        courseToUnlock = {
          progressId: item.progress?._id || null,
          courseId: item.course._id,
        };
        break; // Only unlock one course at a time
      }
    }
  }

  // If we're unlocking a course, it counts towards the in-progress limit
  if (courseToUnlock) {
    inProgressCount = 1; // The course we're unlocking will be in_progress
  }

  // Second pass: enforce the limit and update statuses.
  // Once we pass an admin force_lock in journey order, later modules stay closed
  // (unless force_unlock) so locking the next/first module alone pauses progress.
  let blockedByAdminLockGate = false;
  coursesWithProgress = coursesWithProgress.map((item) => {
    const override = item.accessOverride || 'none';

    // Keep completed courses as-is (gate does not apply behind them)
    if (item.status === 'completed') {
      return item;
    }

    // Force-lock stays locked and blocks auto-open of everything after it
    if (override === 'force_lock') {
      blockedByAdminLockGate = true;
      return {
        ...item,
        status: 'locked',
        accessible: false,
      };
    }

    if (blockedByAdminLockGate && override !== 'force_unlock') {
      if (
        item.progress &&
        (item.status === 'in_progress' || item.status === 'not_started')
      ) {
        coursesToLock.push(item.progress._id);
      }
      return {
        ...item,
        status: 'locked',
        accessible: false,
        progress: item.progress
          ? {
              ...item.progress,
              status: 'locked',
            }
          : null,
      };
    }

    // Check if this course should be unlocked and started
    if (courseToUnlock && courseToUnlock.courseId.toString() === item.course._id.toString()) {
      inProgressCount = 1; // Mark that we have an in-progress course
      return {
        ...item,
        status: 'in_progress',
        accessible: true,
        progress: item.progress
          ? {
              ...item.progress,
              status: 'in_progress',
              startedAt: item.progress.startedAt || new Date(),
              currentStep: item.progress.currentStep || 1,
            }
          : {
              status: 'in_progress',
              progressPercentage: 0,
              startedAt: new Date(),
              currentStep: 1,
            },
      };
    }

    // Admin force_unlock: never re-lock under the 1-active rule
    if (override === 'force_unlock') {
      if (item.status === 'in_progress' || item.status === 'not_started') {
        inProgressCount++;
      }
      return {
        ...item,
        accessible: true,
      };
    }

    // Automatic keep-open: ≥75% progress stays playable (not re-locked by 1-active rule)
    if (
      shouldKeepModuleOpenByProgress({
        status: item.status,
        progressPercentage: item.progressPercentage,
        accessOverride: override,
      })
    ) {
      const openStatus =
        item.status === 'locked' || item.status === 'not_started' ? 'in_progress' : item.status;
      if (openStatus === 'in_progress' || openStatus === 'not_started') {
        inProgressCount++;
      }
      return {
        ...item,
        status: openStatus,
        accessible: true,
        progress: item.progress
          ? { ...item.progress, status: openStatus }
          : item.progress,
      };
    }

    // For courses that are "in_progress" or "not_started", enforce the 1-course limit
    if (item.status === 'in_progress' || item.status === 'not_started') {
      if (inProgressCount < MAX_IN_PROGRESS) {
        inProgressCount++;
        // First course should be "in_progress" if it's "not_started" (automatically start it)
        if (item.status === 'not_started' && item.progress) {
          // Update to in_progress in the database
          courseToUnlock = {
            progressId: item.progress._id,
            courseId: item.course._id,
          };
          return {
            ...item,
            status: 'in_progress',
            progress: {
              ...item.progress,
              status: 'in_progress',
              startedAt: item.progress.startedAt || new Date(),
              currentStep: item.progress.currentStep || 1,
            },
          };
        }
        return item; // Keep as unlocked (within limit)
      } else {
        // Lock this course as we've reached the limit
        // Track it for database update
        if (item.progress) {
          coursesToLock.push(item.progress._id);
        }
        return {
          ...item,
          status: 'locked',
          accessible: false,
          progress: item.progress
            ? {
                ...item.progress,
                status: 'locked',
              }
            : null,
        };
      }
    }

    // Already locked courses stay locked
    return item;
  });

  // Update database records for course that needs to be unlocked and started
  if (courseToUnlock) {
    if (courseToUnlock.progressId) {
      await CourseProgress.findOneAndUpdate(
        { _id: courseToUnlock.progressId, accessOverride: { $ne: 'force_lock' } },
        {
          status: 'in_progress',
          startedAt: new Date(),
          currentStep: 1,
        },
        { new: true }
      ).catch((err) => console.error('Error updating progress to in_progress:', err));
    } else {
      // Create new progress entry
      await CourseProgress.create({
        child: childId,
        course: courseToUnlock.courseId,
        status: 'in_progress',
        progressPercentage: 0,
        startedAt: new Date(),
        currentStep: 1,
      }).catch((err) => console.error('Error creating progress entry:', err));
    }
  }

  // Update database records for courses that need to be locked (never force_unlock)
  if (coursesToLock.length > 0) {
    await CourseProgress.updateMany(
      {
        _id: { $in: coursesToLock },
        accessOverride: { $nin: ['force_unlock'] },
      },
      { status: 'locked' }
    ).catch((err) => console.error('Error updating progress status to locked:', err));
  }

  // Filter by status if provided
  if (status) {
    return coursesWithProgress.filter((item) => item.status === status);
  }

  return coursesWithProgress;
};

/**
 * Check if child can access a specific step in a course
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @param {Number} step - Step number to check
 * @returns {Object} Access information
 */
const checkStepAccess = async (childId, courseId, step) => {
  if (step === 1) {
    // First step is always accessible (if course is accessible)
    const courseAccess = await checkCourseAccess(childId, courseId);
    return {
      accessible: courseAccess.accessible,
      reason: courseAccess.accessible ? null : courseAccess.reason,
    };
  }

  // For steps > 1, check if previous step is completed
  const progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  }).populate('course');

  if (!progress) {
    return {
      accessible: false,
      reason: 'Course not started. Complete step 1 first.',
    };
  }

  const course = progress.course || (await Course.findById(courseId));
  if (!course) {
    throw new Error('Course not found');
  }

  // Check if previous step is completed
  const previousStep = step - 1;
  const isPreviousStepCompleted = progress.isStepCompleted(previousStep, course);

  if (!isPreviousStepCompleted) {
    return {
      accessible: false,
      reason: `Step ${previousStep} must be completed before accessing step ${step}`,
    };
  }

  return { accessible: true, reason: null };
};

/**
 * Update course progress when content is completed
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @param {String} contentId - Content item's MongoDB ID
 * @param {String} contentType - Content type ('activity', 'book', 'video', 'audioAssignment', 'chant')
 * @returns {Object} Updated CourseProgress
 */
const updateContentProgress = async (childId, courseId, contentId, contentType) => {
  // Verify course exists and contains this content
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  // Find the content item to get its step
  const contentItem = course.contents.find(
    (item) =>
      item.contentId.toString() === contentId.toString() &&
      item.contentType === contentType
  );

  if (!contentItem) {
    throw new Error('Content not found in course');
  }

  const step = contentItem.step;

  // Check if child can access this step
  const stepAccess = await checkStepAccess(childId, courseId, step);
  if (!stepAccess.accessible) {
    throw new Error(stepAccess.reason || 'Step is locked. Complete previous steps first.');
  }

  // Get or create progress
  let progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  }).populate('course');

  if (!progress) {
    const accessCheck = await checkCourseAccess(childId, courseId);
    if (!accessCheck.accessible) {
      throw new Error('Course is locked. Complete prerequisites first.');
    }

    // Check if we can start a new course (enforce 1-course limit)
    const currentInProgressCount = await countInProgressCourses(childId);
    const MAX_IN_PROGRESS = 1;

    if (currentInProgressCount >= MAX_IN_PROGRESS) {
      throw new Error('Maximum 1 course in progress. Complete the current course before starting another.');
    }

    // Can start this course
    progress = await CourseProgress.create({
      child: childId,
      course: courseId,
      status: 'in_progress',
      progressPercentage: 0,
      startedAt: new Date(),
      currentStep: 1,
    });
    await progress.populate('course');
  } else if (progress.status === 'locked') {
    const accessCheck = await checkCourseAccess(childId, courseId);
    if (!accessCheck.accessible) {
      throw new Error('Course is locked. Complete prerequisites first.');
    }

    // Force-unlocked modules may start even if another course is active
    if (getProgressOverride(progress) !== 'force_unlock') {
      const currentInProgressCount = await countInProgressCourses(childId);
      const MAX_IN_PROGRESS = 1;

      if (currentInProgressCount >= MAX_IN_PROGRESS) {
        throw new Error('Maximum 1 course in progress. Complete the current course before starting another.');
      }
    }

    // Unlock and start the course
    progress.status = 'in_progress';
    if (!progress.startedAt) {
      progress.startedAt = new Date();
    }
    await progress.save();
  }

  // For videos, verify that stars were awarded (required watch count reached) before marking as completed
  if (contentType === 'video') {
    // Check if video has been watched the required number of times
    const videoWatch = await VideoWatch.findOne({
      child: childId,
      video: contentId,
    });

    if (!videoWatch || !videoWatch.starsAwarded) {
      // Video hasn't been watched enough times yet - don't mark as completed
      throw new Error('Video must be watched the required number of times before it can be marked as completed');
    }
  }

  // For books, verify that required reading count is met before marking as completed
  if (contentType === 'book') {
    const BookReading = require('../models/BookReading');
    const Book = require('../models/Book');
    
    // Get book to check required reading count
    const book = await Book.findById(contentId).select('requiredReadingCount');
    if (!book) {
      throw new Error('Book not found');
    }
    
    const requiredReadingCount = book.requiredReadingCount || 5;
    const readingCount = await BookReading.getCompletedReadingCount(childId, contentId);
    
    if (readingCount < requiredReadingCount) {
      // Book hasn't been read enough times yet - don't mark as completed
      throw new Error(`Book must be read ${requiredReadingCount} times before it can be marked as completed. Current reading count: ${readingCount}`);
    }
  }

  // Mark content as completed (with step)
  progress.markContentCompleted(contentId, contentType, step, course);
  await progress.save();

  // Check if all *current* course content is completed (ignore removed orphans)
  const { completedContent, totalContent, progressPercentage } =
    computeCourseContentProgress(course.contents, progress.contentProgress);

  if (
    totalContent > 0 &&
    completedContent === totalContent &&
    progress.status !== 'completed'
  ) {
    progress.status = 'completed';
    progress.progressPercentage = progressPercentage;
    progress.completedAt = new Date();
    // Clear admin override so automatic sequencing continues cleanly
    if (getProgressOverride(progress) !== 'none') {
      progress.accessOverride = 'none';
      progress.accessOverrideAt = null;
      progress.accessOverrideBy = null;
      progress.accessOverrideNote = '';
    }
    await progress.save();

    // Unlock next course in sequence (if any)
    await unlockNextCourse(childId, courseId);
  }

  return progress;
};

/**
 * Mark a content item completed on every published course that includes it.
 * Used when completion happens outside the course content endpoint
 * (e.g. audio assignment approved by teacher).
 *
 * @returns {Promise<Array<{ courseId: string, ok: boolean, error?: string }>>}
 */
const markContentCompletedInContainingCourses = async (
  childId,
  contentId,
  contentType
) => {
  const courses = await Course.find({
    isArchived: { $ne: true },
    contents: {
      $elemMatch: {
        contentId,
        contentType,
      },
    },
  }).select('_id title contents');

  const results = [];
  for (const course of courses) {
    try {
      await updateContentProgress(childId, course._id, contentId, contentType);
      results.push({ courseId: String(course._id), ok: true });
    } catch (err) {
      results.push({
        courseId: String(course._id),
        ok: false,
        error: err?.message || String(err),
      });
    }
  }
  return results;
};

/**
 * Recalculate + persist progressPercentage for every child on a course
 * after CMS adds/removes/reorders module contents.
 *
 * @param {String|Object} courseOrId - Course document or id
 * @returns {Number} Number of progress docs updated
 */
const recalculateProgressForCourse = async (courseOrId) => {
  const course =
    courseOrId && courseOrId.contents
      ? courseOrId
      : await Course.findById(courseOrId);
  if (!course) {
    throw new Error('Course not found');
  }

  const progresses = await CourseProgress.find({ course: course._id });
  let updated = 0;

  for (const progress of progresses) {
    const beforePct = progress.progressPercentage;
    const beforeStatus = progress.status;
    const beforeLen = Array.isArray(progress.contentProgress)
      ? progress.contentProgress.length
      : 0;

    progress.updateProgressPercentage(course);

    const afterLen = Array.isArray(progress.contentProgress)
      ? progress.contentProgress.length
      : 0;
    const changed =
      beforePct !== progress.progressPercentage ||
      beforeStatus !== progress.status ||
      beforeLen !== afterLen;

    if (changed) {
      // If newly completed via content removal, clear overrides and unlock next
      if (progress.status === 'completed' && beforeStatus !== 'completed') {
        if (getProgressOverride(progress) !== 'none') {
          progress.accessOverride = 'none';
          progress.accessOverrideAt = null;
          progress.accessOverrideBy = null;
          progress.accessOverrideNote = '';
        }
      }
      await progress.save();
      updated += 1;

      if (progress.status === 'completed' && beforeStatus !== 'completed') {
        try {
          await unlockNextCourse(progress.child, course._id);
        } catch (_) {
          // Non-fatal: next unlock may fail if sequencing rules block it
        }
      }
    }
  }

  return updated;
};

/**
 * Unlock next course in sequence after completing a course
 * Only unlocks if no courses are in progress (enforces 1-course limit)
 * Automatically sets the next course to "in_progress" instead of "not_started"
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} completedCourseId - Completed course's MongoDB ID
 */
const unlockNextCourse = async (childId, completedCourseId) => {
  // Check how many courses are currently in progress
  const currentInProgressCount = await countInProgressCourses(childId);
  const MAX_IN_PROGRESS = 1;

  // If we already have 1 course in progress, don't unlock more
  if (currentInProgressCount >= MAX_IN_PROGRESS) {
    return; // Cannot unlock more courses, limit reached
  }

  const completedCourse = await Course.findById(completedCourseId);
  if (!completedCourse) {
    return; // Course not found
  }

  // Get all published courses for this child, sorted by stepOrder
  let courseQuery = { isPublished: true, isArchived: false };
  const allCourses = await Course.find(courseQuery).sort({ 
    stepOrder: 1,
    createdAt: 1 
  });

  // Post-process sorting: ensure courses with stepOrder come before those without
  allCourses.sort((a, b) => {
    const aHasOrder = a.stepOrder !== null && a.stepOrder !== undefined;
    const bHasOrder = b.stepOrder !== null && b.stepOrder !== undefined;
    
    if (aHasOrder && bHasOrder) {
      return a.stepOrder - b.stepOrder;
    } else if (aHasOrder && !bHasOrder) {
      return -1;
    } else if (!aHasOrder && bHasOrder) {
      return 1;
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
  });

  // Find the next course after the completed one
  const completedIndex = allCourses.findIndex(
    (c) => c._id.toString() === completedCourseId.toString()
  );

  if (completedIndex === -1) {
    return; // Completed course not found in list
  }

  // Find the next accessible course after the completed one.
  // Admin force_lock is a hard gate — stop here; do not skip to later modules.
  for (let i = completedIndex + 1; i < allCourses.length; i++) {
    const nextCourse = allCourses[i];

    // Check if we've reached the limit (should be 0 since we just completed one)
    const currentCount = await countInProgressCourses(childId);
    if (currentCount >= MAX_IN_PROGRESS) {
      break; // Stop unlocking, limit reached
    }

    let progress = await CourseProgress.findOne({
      child: childId,
      course: nextCourse._id,
    });

    if (progress && getProgressOverride(progress) === 'force_lock') {
      break;
    }

    // Check if course is accessible (prerequisites met / overrides)
    const accessCheck = await checkCourseAccess(childId, nextCourse._id);

    if (
      accessCheck.accessOverride === 'force_lock' ||
      accessCheck.reason === 'admin_locked'
    ) {
      break;
    }

    if (accessCheck.accessible) {
      // Get or create progress and set it to "in_progress" (not "not_started")
      if (!progress) {
        progress = await CourseProgress.create({
          child: childId,
          course: nextCourse._id,
          status: 'in_progress', // Automatically start the next course
          progressPercentage: 0,
          startedAt: new Date(),
          currentStep: 1,
        });
      } else if (progress.status === 'locked') {
        progress.status = 'in_progress'; // Automatically start it
        progress.startedAt = progress.startedAt || new Date();
        progress.currentStep = progress.currentStep || 1;
        await progress.save();
      }

      // Only unlock one course at a time (the next one in sequence)
      break;
    }
  }
};

/**
 * Mark course as completed manually (admin/parent action)
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Updated CourseProgress
 */
const markCourseCompleted = async (childId, courseId) => {
  let progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  });

  if (!progress) {
    const accessCheck = await checkCourseAccess(childId, courseId);
    if (!accessCheck.accessible) {
      throw new Error('Course is locked. Complete prerequisites first.');
    }

    progress = await CourseProgress.create({
      child: childId,
      course: courseId,
      status: 'completed',
      progressPercentage: 100,
      startedAt: new Date(),
      completedAt: new Date(),
    });
  } else {
    progress.status = 'completed';
    progress.progressPercentage = 100;
    progress.completedAt = new Date();
    if (!progress.startedAt) {
      progress.startedAt = new Date();
    }
    await progress.save();
  }

  // Unlock next course
  await unlockNextCourse(childId, courseId);

  return progress;
};

/**
 * Get course progress for a specific child and course
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} CourseProgress with access information
 */
const getCourseProgress = async (childId, courseId) => {
  const progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  })
    .populate('course', 'title description stepOrder isSequential prerequisites')
    .populate('child', 'displayName age');

  const accessCheck = await checkCourseAccess(childId, courseId);

  return {
    progress: progress ? progress.toObject() : null,
    accessible: accessCheck.accessible,
    missingPrerequisites: accessCheck.missingCourses || [],
  };
};

/**
 * Get course details with populated contents for a child
 * Returns course with populated contents (books, videos, activities, audio assignments), child profile, and progress
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Course details with contents, child profile, and progress
 * @throws {Error} If course or child not found
 */
const getCourseDetailsForChild = async (childId, courseId) => {
  const [childProfile, course, existingProgress] = await Promise.all([
    ChildProfile.findById(childId).lean(),
    Course.findOne({
      _id: courseId,
      isArchived: false,
    }).lean(),
    CourseProgress.findOne({
      child: childId,
      course: courseId,
    }).lean(),
  ]);

  if (!childProfile) {
    throw new Error('Child profile not found');
  }

  if (!course) {
    throw new Error('Course not found');
  }

  let progress = existingProgress;

  const [accessCheck, populatedContents] = await Promise.all([
    checkCourseAccess(childId, courseId, { course, progress }),
    populateCourseContents(course.contents),
  ]);

  const contentsBySteps = organizeCourseContentsBySteps(course.contents);

  // Live progress vs current course.contents (ignore orphans from removed CMS items)
  let liveProgress = computeCourseContentProgress(
    course.contents,
    progress?.contentProgress
  );

  if (
    progress &&
    typeof progress.progressPercentage === 'number' &&
    progress.progressPercentage !== liveProgress.progressPercentage
  ) {
    try {
      const progressDoc = await CourseProgress.findById(progress._id);
      if (progressDoc) {
        progressDoc.updateProgressPercentage(course);
        await progressDoc.save();
        progress = progressDoc.toObject();
        liveProgress = computeCourseContentProgress(
          course.contents,
          progress.contentProgress
        );
      }
    } catch (_) {
      // non-fatal — still return live counts
    }
  }

  // Resolve display status for clients (journey cards / module gate)
  let effectiveStatus = progress?.status || (accessCheck.accessible ? 'not_started' : 'locked');
  const accessOverride = getProgressOverride(progress);
  if (accessOverride === 'force_lock' && effectiveStatus !== 'completed') {
    effectiveStatus = 'locked';
  }
  if (accessOverride === 'force_unlock' && effectiveStatus === 'locked') {
    effectiveStatus =
      liveProgress.progressPercentage > 0 ? 'in_progress' : 'not_started';
  }
  if (
    shouldKeepModuleOpenByProgress({
      ...progress,
      progressPercentage: liveProgress.progressPercentage,
    }) &&
    effectiveStatus === 'locked' &&
    accessOverride !== 'force_lock'
  ) {
    effectiveStatus = 'in_progress';
  }
  if (liveProgress.progressPercentage === 100 && effectiveStatus !== 'locked') {
    effectiveStatus = 'completed';
  }

  return {
    course: {
      ...course,
      contents: populatedContents,
      contentsBySteps,
    },
    child: childProfile,
    progress: progress
      ? { ...progress, progressPercentage: liveProgress.progressPercentage }
      : null,
    progressSummary: {
      completedCount: liveProgress.completedContent,
      totalCount: liveProgress.totalContent,
      progressPercentage: liveProgress.progressPercentage,
      todoCount: Math.max(
        0,
        liveProgress.totalContent - liveProgress.completedContent
      ),
      lockedCount: 0,
    },
    status: effectiveStatus,
    accessible: accessCheck.accessible,
    accessOverride,
    accessReason: accessCheck.reason || null,
    missingPrerequisites: accessCheck.missingCourses || [],
  };
};

/**
 * Update SCORM progress for a content item
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @param {String} contentId - Content item's MongoDB ID
 * @param {String} contentType - Content type ('audioAssignment' or 'chant')
 * @param {Object} progressData - SCORM progress data
 * @returns {Object} Updated progress
 */
const updateScormProgress = async (childId, courseId, contentId, contentType, progressData) => {
  // Verify course exists and contains this content
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  // Find the content item to get its step
  const contentItem = course.contents.find(
    (item) =>
      item.contentId.toString() === contentId.toString() &&
      item.contentType === contentType
  );

  if (!contentItem) {
    throw new Error('Content not found in course');
  }

  const step = contentItem.step;

  // Get or create progress
  let progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  });

  if (!progress) {
    progress = await CourseProgress.create({
      child: childId,
      course: courseId,
      status: 'in_progress',
      progressPercentage: 0,
      startedAt: new Date(),
    });
  }

  // Find or create content progress entry
  let contentProgressItem = progress.contentProgress.find(
    (item) =>
      item.contentId.toString() === contentId.toString() &&
      item.contentType === contentType &&
      item.step === step
  );

  if (!contentProgressItem) {
    // Create new content progress entry
    progress.contentProgress.push({
      contentId,
      contentType,
      step,
      status: 'in_progress',
      scormProgress: {},
    });
    contentProgressItem = progress.contentProgress[progress.contentProgress.length - 1];
  }

  // Update SCORM progress data
  if (progressData.lessonStatus) {
    contentProgressItem.scormProgress.lessonStatus = progressData.lessonStatus;
    
    // Update content status based on SCORM lesson status
    // For books, only mark as completed if reading count requirement is met
    if (progressData.lessonStatus === 'completed' || progressData.lessonStatus === 'passed') {
      // For books, verify reading count requirement before marking as completed
      if (contentType === 'book') {
        const BookReading = require('../models/BookReading');
        const Book = require('../models/Book');
        
        // Get book to check required reading count
        const book = await Book.findById(contentId).select('requiredReadingCount');
        if (book) {
          const requiredReadingCount = book.requiredReadingCount || 5;
          const readingCount = await BookReading.getCompletedReadingCount(childId, contentId);
          
          // Only mark as completed if reading count requirement is met
          if (readingCount >= requiredReadingCount) {
            contentProgressItem.status = 'completed';
            contentProgressItem.completedAt = new Date();
          } else {
            // Keep as in_progress until requirement is met
            contentProgressItem.status = 'in_progress';
          }
        } else {
          // Book not found, but still update lesson status
          contentProgressItem.status = 'in_progress';
        }
      } else {
        // For non-book content (audioAssignment, chant), mark as completed normally
        contentProgressItem.status = 'completed';
        contentProgressItem.completedAt = new Date();
      }
    } else if (progressData.lessonStatus === 'incomplete' || progressData.lessonStatus === 'browsed') {
      contentProgressItem.status = 'in_progress';
    }
  }

  if (progressData.score !== undefined) {
    contentProgressItem.scormProgress.score = {
      raw: progressData.score.raw || progressData.score || null,
      max: progressData.scoreMax !== undefined ? progressData.scoreMax : (progressData.score?.max || 100),
      min: progressData.scoreMin !== undefined ? progressData.scoreMin : (progressData.score?.min || 0),
    };
  }

  if (progressData.timeSpent) {
    contentProgressItem.scormProgress.timeSpent = progressData.timeSpent;
  }

  if (progressData.suspendData !== undefined) {
    contentProgressItem.scormProgress.suspendData = progressData.suspendData || '';
  }

  if (progressData.entry) {
    contentProgressItem.scormProgress.entry = progressData.entry;
  }

  if (progressData.exit) {
    contentProgressItem.scormProgress.exit = progressData.exit;
  }

  if (progressData.lessonLocation !== undefined) {
    contentProgressItem.scormProgress.lessonLocation = progressData.lessonLocation;
  }

  if (progressData.lastVideoReached !== undefined) {
    contentProgressItem.scormProgress.lastVideoReached = progressData.lastVideoReached;
  }

  contentProgressItem.scormProgress.lastAccessed = new Date();

  // Update overall course progress
  progress.updateProgressPercentage(course);

  // Check if step is completed
  if (progress.isStepCompleted(step, course)) {
    progress.markStepCompleted(step);
  }

  await progress.save();

  return progress;
};

/**
 * Get SCORM progress for a content item
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @param {String} contentId - Content item's MongoDB ID
 * @param {String} contentType - Content type ('audioAssignment' or 'chant')
 * @returns {Object|null} SCORM progress data or null
 */
const getScormProgress = async (childId, courseId, contentId, contentType) => {
  const progress = await CourseProgress.findOne({
    child: childId,
    course: courseId,
  });

  if (!progress) {
    return null;
  }

  // Find content progress entry
  const contentProgressItem = progress.contentProgress.find(
    (item) =>
      item.contentId.toString() === contentId.toString() &&
      item.contentType === contentType
  );

  if (!contentProgressItem || !contentProgressItem.scormProgress) {
    return null;
  }

  return contentProgressItem.scormProgress;
};

module.exports = {
  checkCourseAccess,
  checkStepAccess,
  getOrCreateCourseProgress,
  getChildCourses,
  updateContentProgress,
  unlockNextCourse,
  markCourseCompleted,
  getCourseProgress,
  getCourseDetailsForChild,
  updateScormProgress,
  getScormProgress,
  recalculateProgressForCourse,
  markContentCompletedInContainingCourses,
  MODULE_ACCESS_AUTO_KEEP_OPEN_PCT,
  shouldKeepModuleOpenByProgress,
};

