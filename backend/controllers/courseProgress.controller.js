const courseProgressService = require('../services/courseProgress.services');
const { ChildProfile, Book, BookReading, ChildStats, StarEarning, CourseProgress, Course } = require('../models');

/**
 * @desc    Check if child can access a course
 * @route   GET /api/course-progress/:courseId/access/:childId
 * @access  Private (Parent/Admin)
 */
const checkCourseAccess = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const accessInfo = await courseProgressService.checkCourseAccess(childId, courseId);

    res.status(200).json({
      success: true,
      data: accessInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check course access',
    });
  }
};

/**
 * @desc    Get all courses with progress for a child
 * @route   GET /api/course-progress/child/:childId
 * @access  Private (Parent/Admin)
 */
const getChildCourses = async (req, res) => {
  try {
    const { childId } = req.params;
    const queryParams = req.query;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const courses = await courseProgressService.getChildCourses(childId, queryParams);

    res.status(200).json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get child courses',
    });
  }
};

/**
 * @desc    Get course progress for a specific child and course
 * @route   GET /api/course-progress/:courseId/child/:childId
 * @access  Private (Parent/Admin)
 */
const getCourseProgress = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progressInfo = await courseProgressService.getCourseProgress(childId, courseId);

    res.status(200).json({
      success: true,
      data: progressInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get course progress',
    });
  }
};

/**
 * @desc    Update course progress when content is completed
 * @route   PATCH /api/course-progress/:courseId/child/:childId/content
 * @access  Private (Parent/Admin)
 */
const updateContentProgress = async (req, res) => {
  try {
    const { courseId, childId } = req.params;
    const { contentId, contentType } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide contentId and contentType',
      });
    }

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progress = await courseProgressService.updateContentProgress(
      childId,
      courseId,
      contentId,
      contentType
    );

    res.status(200).json({
      success: true,
      message: 'Content progress updated successfully',
      data: progress,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('locked') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update content progress',
    });
  }
};

/**
 * @desc    Mark course as completed manually
 * @route   POST /api/course-progress/:courseId/child/:childId/complete
 * @access  Private (Parent/Admin)
 */
const markCourseCompleted = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progress = await courseProgressService.markCourseCompleted(childId, courseId);

    res.status(200).json({
      success: true,
      message: 'Course marked as completed',
      data: progress,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('locked') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to mark course as completed',
    });
  }
};

/**
 * @desc    Get course details with populated contents for a child
 * @route   GET /api/course-progress/:courseId/child/:childId/details
 * @access  Private (Parent/Admin)
 */
const getCourseDetailsForChild = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const courseDetails = await courseProgressService.getCourseDetailsForChild(childId, courseId);

    res.status(200).json({
      success: true,
      data: courseDetails,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get course details',
    });
  }
};

/**
 * @desc    Submit book reading completion
 * @route   POST /api/course-progress/:courseId/child/:childId/book/:bookId/complete
 * @access  Private (Parent/Admin)
 * 
 * Request body:
 * {
 *   "score": 100,
 *   "maxScore": 100,
 *   "status": "passed",
 *   "timeSpent": 120,
 *   "progress": 100
 * }
 */
const submitBookCompletion = async (req, res) => {
  const requestId = `book-complete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { courseId, childId, bookId } = req.params;
    const { score, maxScore, status, timeSpent, progress: progressPercentage } = req.body;

    console.log(`\n========== [Book Completion] Request ${requestId} - STARTED ==========`);
    console.log(`[Book Completion] Request ${requestId} - Timestamp:`, new Date().toISOString());
    console.log(`[Book Completion] Request ${requestId} - Params:`, { courseId, childId, bookId });
    console.log(`[Book Completion] Request ${requestId} - Body:`, { score, maxScore, status, timeSpent, progress: progressPercentage });

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    // Validate required fields
    if (score === undefined || maxScore === undefined || !status || timeSpent === undefined || progressPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide score, maxScore, status, timeSpent, and progress',
      });
    }

    // Parse values
    const parsedScore = score !== null && score !== undefined ? parseFloat(score) : null;
    const parsedMaxScore = maxScore !== null && maxScore !== undefined ? parseFloat(maxScore) : null;
    const parsedTimeSpent = typeof timeSpent === 'number' ? timeSpent : parseFloat(timeSpent) || 0;
    const parsedProgress = typeof progressPercentage === 'number' ? progressPercentage : parseFloat(progressPercentage) || 0;
    const statusLower = (status || '').toLowerCase();

    console.log(`[Book Completion] Request ${requestId} - Parsed values:`, {
      score: parsedScore,
      maxScore: parsedMaxScore,
      timeSpent: parsedTimeSpent,
      progress: parsedProgress,
      status: statusLower,
    });

    // Validation: Check if completion requirements are met
    const estimatedMinTime = 60; // 60 seconds minimum
    const minProgressRequired = 80; // 80% minimum progress

    const scoreValid = parsedScore !== null && parsedScore > 0;
    const statusValid = statusLower === 'passed' || statusLower === 'completed';
    const maxScoreReached = parsedScore !== null && parsedMaxScore !== null && parsedScore === parsedMaxScore;
    const timeValid = parsedTimeSpent >= estimatedMinTime || maxScoreReached;
    const progressValid = parsedProgress >= minProgressRequired || maxScoreReached;

    const canComplete = (scoreValid || statusValid) && timeValid && progressValid;

    console.log(`[Book Completion] Request ${requestId} - Validation:`, {
      scoreValid,
      statusValid,
      maxScoreReached,
      timeValid,
      progressValid,
      canComplete,
    });

    if (!canComplete) {
      return res.status(400).json({
        success: false,
        canComplete: false,
        message: 'Completion requirements not met. Please spend more time reading the book and ensure you have a valid score or status.',
        data: {
          requirements: {
            score: scoreValid ? '✓' : '✗ Score must be > 0',
            status: statusValid ? '✓' : '✗ Status must be "passed" or "completed"',
            time: timeValid ? '✓' : `✗ Time must be >= ${estimatedMinTime}s (or max score reached)`,
            progress: progressValid ? '✓' : `✗ Progress must be >= ${minProgressRequired}% (or max score reached)`,
          },
          current: {
            score: parsedScore,
            maxScore: parsedMaxScore,
            status: statusLower,
            timeSpent: parsedTimeSpent,
            progress: parsedProgress,
          },
        },
      });
    }

    // Get book and course
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    console.log(`[Book Completion] Request ${requestId} - Book found:`, book.title);
    console.log(`[Book Completion] Request ${requestId} - Course found:`, course.title);

    // Verify book exists in course contents
    const courseContentItem = course.contents.find(
      item => item.contentId.toString() === bookId.toString() &&
              item.contentType === 'book'
    );

    if (!courseContentItem) {
      return res.status(404).json({
        success: false,
        message: 'Book not found in course contents',
      });
    }

    const step = courseContentItem.step;

    // Get or create course progress
    let progress = await CourseProgress.findOne({
      child: childId,
      course: courseId,
    });

    if (!progress) {
      // Create course progress if it doesn't exist
      progress = await CourseProgress.create({
        child: childId,
        course: courseId,
        status: 'in_progress',
        progressPercentage: 0,
        startedAt: new Date(),
      });
      console.log(`[Book Completion] Request ${requestId} - Created new CourseProgress`);
    }

    // Find or create content progress item
    let contentProgressItem = progress.contentProgress.find(
      item => item.contentId.toString() === bookId.toString() &&
              item.contentType === 'book' &&
              item.step === step
    );

    if (!contentProgressItem) {
      // Create new content progress entry if it doesn't exist
      console.log(`[Book Completion] Request ${requestId} - Creating new contentProgress entry for book`);
      progress.contentProgress.push({
        contentId: bookId,
        contentType: 'book',
        step: step,
        status: 'in_progress',
        scormProgress: {
          completion: {},
        },
      });
      contentProgressItem = progress.contentProgress[progress.contentProgress.length - 1];
      await progress.save();
      console.log(`[Book Completion] Request ${requestId} - Created contentProgress entry`);
    }

    // Check current reading count to see if requirement is already met
    // Only skip processing if requirement is met AND stars are already awarded
    const currentReadingCount = await BookReading.getCompletedReadingCount(childId, bookId);
    const requiredReadingCount = book.requiredReadingCount || 5;
    const completion = contentProgressItem.scormProgress?.completion || {};
    
    // If requirement is already met and stars are awarded, return existing data
    // (This prevents unnecessary processing, but still allows new readings to be recorded if needed)
    if (currentReadingCount >= requiredReadingCount && completion.starsAwarded) {
      console.log(`[Book Completion] Request ${requestId} - ✅ Requirement already met (${currentReadingCount}/${requiredReadingCount}) and stars awarded`);
      
      const childStats = await ChildStats.getOrCreate(childId);
      
      return res.json({
        success: true,
        canComplete: true,
        message: 'Book requirement already met',
        data: {
          readingCount: currentReadingCount,
          requiredReadingCount,
          starsAwarded: true,
          starsToAward: 0,
          totalStars: childStats.totalStars,
          requirementMet: true,
          alreadyCompleted: true,
        },
      });
    }

    // Get child stats
    const childStats = await ChildStats.getOrCreate(childId);
    const starsToAward = book.totalStarsAwarded || 50; // Total stars when requirement is met

    console.log(`[Book Completion] Request ${requestId} - Book requirements:`, {
      requiredReadingCount,
      starsToAward,
      currentTotalStars: childStats.totalStars,
    });

    // Check if stars have already been awarded
    const existingEarning = await StarEarning.findOne({
      child: childId,
      'source.type': 'book',
      'source.contentId': bookId,
    });

    const starsAlreadyAwarded = !!existingEarning;
    console.log(`[Book Completion] Request ${requestId} - Stars already awarded:`, starsAlreadyAwarded);

    // Create BookReading record with duplicate prevention (time-based, not flag-based)
    // Similar to videos: check if a reading was created in the last few seconds to prevent rapid duplicates
    console.log(`[Book Completion] Request ${requestId} - 📖 Creating BookReading record...`);
    let readingCount = 0;
    
    try {
      // Check for recent duplicate readings (within last 5 seconds) to prevent rapid duplicate submissions
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const recentReading = await BookReading.findOne({
        child: childId,
        book: bookId,
        status: 'completed',
        completedAt: { $gte: fiveSecondsAgo },
      });

      if (recentReading) {
        // A reading was created very recently - likely a duplicate submission
        console.log(`[Book Completion] Request ${requestId} - ⚠️ DUPLICATE DETECTED - Recent reading found (within 5 seconds)`);
        console.log(`[Book Completion] Request ${requestId} - Recent reading ID:`, recentReading._id.toString());
        console.log(`[Book Completion] Request ${requestId} - Skipping BookReading creation to prevent duplicates`);
        readingCount = await BookReading.getCompletedReadingCount(childId, bookId);
        console.log(`[Book Completion] Request ${requestId} - Using existing reading count:`, readingCount);
      } else {
        // No recent reading found - safe to create new BookReading record
        console.log(`[Book Completion] Request ${requestId} - ✅ No recent duplicate found - creating new BookReading`);

        // Create the BookReading record
        const newReading = await BookReading.create({
          child: childId,
          book: bookId,
          status: 'completed',
          progressPercentage: parsedProgress,
          timeSpent: parsedTimeSpent,
          completedAt: new Date(),
          starsEarned: 0, // Stars are awarded when requirement is met, not per reading
        });

        console.log(`[Book Completion] Request ${requestId} - ✅ BookReading created:`, newReading._id.toString());

        readingCount = await BookReading.getCompletedReadingCount(childId, bookId);
        console.log(`[Book Completion] Request ${requestId} - ✅ New reading count:`, readingCount);
      }
    } catch (bookReadingError) {
      console.error(`[Book Completion] Request ${requestId} - ❌ Error creating BookReading:`, bookReadingError);
      console.error(`[Book Completion] Request ${requestId} - Error stack:`, bookReadingError.stack);
      // Continue even if BookReading creation fails
      try {
        readingCount = await BookReading.getCompletedReadingCount(childId, bookId);
      } catch (err) {
        readingCount = 0;
      }
    }

    // Check if requirement is met and award stars (only once)
    const requirementMet = readingCount >= requiredReadingCount;
    let starsAwardedThisRequest = false;

    if (requirementMet && !starsAlreadyAwarded) {
      console.log(`[Book Completion] Request ${requestId} - ✅ Requirement met (${readingCount}/${requiredReadingCount}) - Awarding stars...`);
      
      try {
        const starEarning = await StarEarning.create({
          child: childId,
          stars: starsToAward,
          source: {
            type: 'book',
            contentId: bookId,
            contentType: 'Book',
            metadata: {
              bookTitle: book.title,
              requiredReadingCount,
              readingCount,
            },
          },
          description: `Earned ${starsToAward} stars for completing "${book.title}" ${requiredReadingCount} times`,
        });

        console.log(`[Book Completion] Request ${requestId} - ✅ StarEarning created:`, starEarning._id.toString());

        // Update ChildStats
        const starsBefore = childStats.totalStars;
        await childStats.addStars(starsToAward);
        await childStats.save();

        // Refresh to get latest totalStars
        const updatedChildStats = await ChildStats.findById(childStats._id);

        console.log(`[Book Completion] Request ${requestId} - ✅ Stars updated:`, {
          before: starsBefore,
          added: starsToAward,
          after: updatedChildStats.totalStars,
        });

        // Check for badges after awarding stars
        try {
          const badgeCheck = require('../services/badgeCheck.service');
          await badgeCheck.updateBadges(childId, { silent: false });
        } catch (badgeError) {
          console.error(`[Book Completion] Error checking badges after star award:`, badgeError);
          // Don't throw - badge checking failure shouldn't block book completion
        }

        // Mark stars as awarded in CourseProgress
        const finalProgress = await CourseProgress.findOne({
          child: childId,
          course: courseId,
        });
        const finalContentProgressItem = finalProgress?.contentProgress.find(
          item => item.contentId.toString() === bookId.toString() &&
                  item.contentType === 'book'
        );

        if (finalContentProgressItem) {
          if (!finalContentProgressItem.scormProgress.completion) {
            finalContentProgressItem.scormProgress.completion = {};
          }
          finalContentProgressItem.scormProgress.completion.starsAwarded = true;
          finalContentProgressItem.scormProgress.completion.starsAwardedAt = new Date();
          await finalProgress.save();
          console.log(`[Book Completion] Request ${requestId} - ✅ Stars awarded flag saved to CourseProgress`);
        }

        starsAwardedThisRequest = true;
        childStats.totalStars = updatedChildStats.totalStars;
      } catch (starError) {
        console.error(`[Book Completion] Request ${requestId} - ❌ Error awarding stars:`, starError);
        // Continue even if star awarding fails
      }
    } else if (requirementMet && starsAlreadyAwarded) {
      console.log(`[Book Completion] Request ${requestId} - Requirement met but stars already awarded`);
    } else {
      console.log(`[Book Completion] Request ${requestId} - Requirement not yet met (${readingCount}/${requiredReadingCount})`);
    }

    // Refresh child stats for response
    const updatedChildStats = await ChildStats.findById(childStats._id);

    console.log(`\n========== [Book Completion] Request ${requestId} - ✅ COMPLETION RECORDED SUCCESSFULLY ==========`);
    console.log(`[Book Completion] Request ${requestId} - Final reading count:`, readingCount);
    console.log(`[Book Completion] Request ${requestId} - Stars awarded:`, starsAwardedThisRequest);
    console.log(`[Book Completion] Request ${requestId} - Total stars:`, updatedChildStats.totalStars);
    console.log(`[Book Completion] Request ${requestId} - ============================================\n`);

    return res.json({
      success: true,
      canComplete: true,
      message: 'Reading completed successfully',
      data: {
        readingCount,
        requiredReadingCount,
        starsAwarded: starsAwardedThisRequest,
        starsToAward: starsAwardedThisRequest ? starsToAward : 0,
        totalStars: updatedChildStats.totalStars,
        requirementMet,
      },
    });
  } catch (error) {
    console.error(`[Book Completion] Request ${requestId} - ❌ Error:`, error);
    console.error(`[Book Completion] Request ${requestId} - Error stack:`, error.stack);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to submit book completion',
    });
  }
};

module.exports = {
  checkCourseAccess,
  getChildCourses,
  getCourseProgress,
  updateContentProgress,
  markCourseCompleted,
  getCourseDetailsForChild,
  submitBookCompletion,
};

