const { Course, CourseProgress, ChildProfile } = require('../models');

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
 * Verifies prerequisites are completed if course is sequential
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Access information with accessible flag and reason
 */
const checkCourseAccess = async (childId, courseId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  // If course is not sequential or has no prerequisites, it's accessible
  if (!course.isSequential || !course.prerequisites || course.prerequisites.length === 0) {
    return { accessible: true, reason: null, course };
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
    };
  }

  return { accessible: true, reason: null, course };
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

      // Determine current status
      let currentStatus = 'not_started';
      if (progress) {
        currentStatus = progress.status;
      } else if (!accessCheck.accessible) {
        currentStatus = 'locked';
      }

      return {
        course: course.toObject(),
        progress: progress ? progress.toObject() : null,
        status: currentStatus,
        accessible: accessCheck.accessible,
        missingPrerequisites: accessCheck.missingCourses || [],
        progressPercentage: progress ? progress.progressPercentage : 0,
      };
    })
  );

  // Enforce 1-course limit: only 1 course can be in "in_progress" or "not_started" at a time
  // Keep completed courses as-is, but limit active courses
  // Lock courses beyond the first 1 (in order) that are in progress/not_started
  // If no course is in progress and there are accessible locked courses, unlock the next one
  const MAX_IN_PROGRESS = 1;
  let inProgressCount = 0;
  const coursesToLock = []; // Track courses that need to be locked in the database
  let courseToUnlock = null; // Track the next course that should be unlocked and set to in_progress

  // First pass: count current in-progress courses and find if we need to unlock one
  const currentInProgress = coursesWithProgress.filter(
    (item) => item.status === 'in_progress' || item.status === 'not_started'
  );

  // If no course is in progress, find the first accessible locked course and unlock it
  if (currentInProgress.length === 0) {
    for (const item of coursesWithProgress) {
      if (item.status === 'locked' && item.accessible && item.status !== 'completed') {
        // This is the next course that should be unlocked and started
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

  // Second pass: enforce the limit and update statuses
  coursesWithProgress = coursesWithProgress.map((item) => {
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

    // Keep completed courses as-is
    if (item.status === 'completed') {
      return item;
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
        { _id: courseToUnlock.progressId },
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

  // Update database records for courses that need to be locked
  if (coursesToLock.length > 0) {
    await CourseProgress.updateMany(
      { _id: { $in: coursesToLock } },
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
 * @param {String} contentType - Content type ('activity', 'book', 'video', 'audioAssignment')
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
    // Check if we can unlock this course
    const currentInProgressCount = await countInProgressCourses(childId);
    const MAX_IN_PROGRESS = 1;

    if (currentInProgressCount >= MAX_IN_PROGRESS) {
      throw new Error('Maximum 1 course in progress. Complete the current course before starting another.');
    }

    // Unlock and start the course
    progress.status = 'in_progress';
    if (!progress.startedAt) {
      progress.startedAt = new Date();
    }
    await progress.save();
  }

  // Mark content as completed (with step)
  progress.markContentCompleted(contentId, contentType, step, course);
  await progress.save();

  // Check if all content is completed
  const totalContent = course.contents.length;
  const completedContent = progress.contentProgress.filter(
    (item) => item.status === 'completed'
  ).length;

  if (completedContent === totalContent && progress.status !== 'completed') {
    progress.status = 'completed';
    progress.completedAt = new Date();
    await progress.save();

    // Unlock next course in sequence (if any)
    await unlockNextCourse(childId, courseId);
  }

  return progress;
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

  // Find the next accessible course after the completed one
  for (let i = completedIndex + 1; i < allCourses.length; i++) {
    const nextCourse = allCourses[i];

    // Check if we've reached the limit (should be 0 since we just completed one)
    const currentCount = await countInProgressCourses(childId);
    if (currentCount >= MAX_IN_PROGRESS) {
      break; // Stop unlocking, limit reached
    }

    // Check if course is accessible (prerequisites met)
    const accessCheck = await checkCourseAccess(childId, nextCourse._id);

    if (accessCheck.accessible) {
      // Get or create progress and set it to "in_progress" (not "not_started")
      let progress = await CourseProgress.findOne({
        child: childId,
        course: nextCourse._id,
      });

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

module.exports = {
  checkCourseAccess,
  checkStepAccess,
  getOrCreateCourseProgress,
  getChildCourses,
  updateContentProgress,
  unlockNextCourse,
  markCourseCompleted,
  getCourseProgress,
};

