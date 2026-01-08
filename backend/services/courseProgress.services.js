const { Course, CourseProgress, ChildProfile } = require('../models');

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
  const courses = await Course.find(courseQuery).sort({ stepOrder: 1, createdAt: 1 });

  // Get all progress for this child
  const progressMap = {};
  const allProgress = await CourseProgress.find({ child: childId });
  allProgress.forEach((p) => {
    progressMap[p.course.toString()] = p;
  });

  // Combine courses with progress and check access
  const coursesWithProgress = await Promise.all(
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

    progress = await CourseProgress.create({
      child: childId,
      course: courseId,
      status: 'in_progress',
      progressPercentage: 0,
      startedAt: new Date(),
      currentStep: 1,
    });
    await progress.populate('course');
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
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} completedCourseId - Completed course's MongoDB ID
 */
const unlockNextCourse = async (childId, completedCourseId) => {
  const completedCourse = await Course.findById(completedCourseId);
  if (!completedCourse || !completedCourse.stepOrder) {
    return; // No sequential ordering
  }

  // Find courses that have this course as a prerequisite
  const nextCourses = await Course.find({
    isSequential: true,
    prerequisites: completedCourseId,
    isPublished: true,
    isArchived: false,
  });

  // Check if all prerequisites are met for each next course
  for (const nextCourse of nextCourses) {
    const accessCheck = await checkCourseAccess(childId, nextCourse._id);

    if (accessCheck.accessible) {
      // Get or create progress and unlock it
      let progress = await CourseProgress.findOne({
        child: childId,
        course: nextCourse._id,
      });

      if (!progress) {
        progress = await CourseProgress.create({
          child: childId,
          course: nextCourse._id,
          status: 'not_started',
          progressPercentage: 0,
        });
      } else if (progress.status === 'locked') {
        progress.status = 'not_started';
        await progress.save();
      }
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

