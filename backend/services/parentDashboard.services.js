const mongoose = require('mongoose');
const ChildProfile = require('../models/ChildProfile');
const ChildStats = require('../models/ChildStats');
const CourseProgress = require('../models/CourseProgress');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const StarEarning = require('../models/StarEarning');
const Media = require('../models/Media');
const Book = require('../models/Book');
const ExploreContent = require('../models/ExploreContent');
const Activity = require('../models/Activity');
const Lesson = require('../models/Lesson');
const AudioAssignment = require('../models/AudioAssignment');

/**
 * Get child progress summary for parent dashboard
 * 
 * @param {String} childId - Child's MongoDB ID
 * @returns {Object} Child progress data including total stars, learning time, and top courses
 */
const getChildProgress = async (childId) => {
  console.log(`[ParentDashboard] Fetching progress for childId: ${childId}`);
  
  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Get child stats for total stars
  let childStats = await ChildStats.findOne({ child: childId });
  if (!childStats) {
    // Create stats if doesn't exist
    childStats = await ChildStats.create({
      child: childId,
      totalStars: 0,
    });
  }

  // Calculate total learning time (in seconds) from Progress model
  const progressRecords = await Progress.find({ child: childId });
  const totalTimeSpentSeconds = progressRecords.reduce((sum, record) => {
    return sum + (record.timeSpent || 0);
  }, 0);

  // Convert seconds to hours (rounded to 1 decimal)
  const learningTimeHours = Math.round((totalTimeSpentSeconds / 3600) * 10) / 10;

  // Get top 4 newest courses with progress
  // Get all courses with progress, sorted by most recent activity
  const courseProgresses = await CourseProgress.find({ child: childId })
    .populate({
      path: 'course',
      select: 'title description stepOrder contents',
    })
    .sort({ updatedAt: -1 })
    .limit(4);

  // Format courses with progress data
  const courses = await Promise.all(
    courseProgresses.map(async (cp) => {
      const course = cp.course;
      if (!course) return null;

      // Calculate completed items count from contentProgress
      const completedCount = cp.contentProgress
        ? cp.contentProgress.filter((item) => item.status === 'completed').length
        : 0;

      // Get total content items from course contents array
      const totalCount = course.contents && Array.isArray(course.contents) 
        ? course.contents.length 
        : 0;

      return {
        _id: course._id,
        title: course.title || 'Untitled Course',
        progressPercentage: cp.progressPercentage || 0,
        status: cp.status || 'not_started',
        completedCount,
        totalCount,
        updatedAt: cp.updatedAt,
      };
    })
  );

  // Filter out null courses and ensure we have exactly 4 (or less)
  const topCourses = courses.filter((c) => c !== null).slice(0, 4);

  // Get star sources as individual items with titles
  let starSources = [];
  try {
    // Try querying with childId as-is first
    let starEarnings = await StarEarning.find({ child: childId })
      .sort({ createdAt: -1 }) // Most recent first
      .lean();
    
    // If no results, try converting to ObjectId
    if (starEarnings.length === 0 && mongoose.Types.ObjectId.isValid(childId)) {
      const childObjectId = new mongoose.Types.ObjectId(childId);
      starEarnings = await StarEarning.find({ child: childObjectId })
        .sort({ createdAt: -1 })
        .lean();
    }
    
    console.log(`[ParentDashboard] Found ${starEarnings.length} star earnings for child ${childId}`);
    
    // Extract title from metadata, description, or populated content
    const extractTitle = async (earning) => {
      const metadata = earning.source?.metadata || {};
      const description = earning.description || '';
      const contentType = earning.source?.contentType;
      const contentId = earning.source?.contentId;
      
      // Try metadata fields first
      if (metadata.exploreContentTitle) return metadata.exploreContentTitle;
      if (metadata.videoTitle) return metadata.videoTitle;
      if (metadata.bookTitle) return metadata.bookTitle;
      if (metadata.activityTitle) return metadata.activityTitle;
      if (metadata.lessonTitle) return metadata.lessonTitle;
      
      // Try to fetch from actual content if contentId exists
      if (contentId && contentType) {
        try {
          let content = null;
          switch (contentType) {
            case 'Media':
              content = await Media.findById(contentId).select('title').lean();
              if (content?.title) return content.title;
              break;
            case 'Book':
              content = await Book.findById(contentId).select('title').lean();
              if (content?.title) return content.title;
              break;
            case 'ExploreContent':
              content = await ExploreContent.findById(contentId).select('title').lean();
              if (content?.title) return content.title;
              break;
            case 'Activity':
              content = await Activity.findById(contentId).select('title').lean();
              if (content?.title) return content.title;
              break;
            case 'Lesson':
              content = await Lesson.findById(contentId).select('title').lean();
              if (content?.title) return content.title;
              break;
            case 'AudioAssignment':
              content = await AudioAssignment.findById(contentId).select('title').lean();
              if (content?.title) return content.title;
              break;
          }
        } catch (err) {
          console.error(`[ParentDashboard] Error fetching content title for ${contentType}:${contentId}`, err);
        }
      }
      
      // Try to extract from description (format: "Earned X stars for watching 'Title'")
      if (description) {
        const match = description.match(/"([^"]+)"/);
        if (match && match[1]) return match[1];
        
        // Alternative pattern: "for watching Title"
        const altMatch = description.match(/for\s+(?:watching|reading|completing)\s+["']?([^"']+)["']?/i);
        if (altMatch && altMatch[1]) return altMatch[1];
      }
      
      // Fallback: format source type
      const formatSourceType = (type) => {
        const typeMap = {
          'video': 'Video',
          'explore_video': 'Explore Video',
          'book': 'Book',
          'lesson': 'Lesson',
          'lesson_item': 'Lesson Item',
          'activity': 'Activity',
          'audio_assignment': 'Audio Assignment',
          'explore_content': 'Explore Content',
          'kids_wall_post': 'Kids Wall Post',
          'kids_wall_like': 'Kids Wall Like',
          'badge': 'Badge',
          'streak': 'Streak',
          'milestone': 'Milestone',
          'other': 'Other',
        };
        return typeMap[type] || 'Other';
      };
      
      return formatSourceType(earning.source?.type || 'other');
    };

    // Format source type label
    const getSourceTypeLabel = (type) => {
      const typeMap = {
        'video': 'Course Video',
        'explore_video': 'Explore Video',
        'book': 'Book',
        'lesson': 'Lesson',
        'lesson_item': 'Lesson Item',
        'activity': 'Activity',
        'audio_assignment': 'Audio Assignment',
        'explore_content': 'Explore Content',
        'kids_wall_post': 'Kids Wall Post',
        'kids_wall_like': 'Kids Wall Like',
        'badge': 'Badge',
        'streak': 'Streak',
        'milestone': 'Milestone',
        'other': 'Other',
      };
      return typeMap[type] || 'Other';
    };

    // Map earnings to individual items with titles (with async title extraction)
    starSources = await Promise.all(
      starEarnings.map(async (earning) => {
        return {
          _id: earning._id,
          title: await extractTitle(earning),
          sourceType: earning.source?.type || 'other',
          sourceTypeLabel: getSourceTypeLabel(earning.source?.type || 'other'),
          stars: earning.stars || 0,
          createdAt: earning.createdAt,
          description: earning.description,
        };
      })
    );
    
    console.log(`[ParentDashboard] Processed ${starSources.length} star earning items`);
  } catch (error) {
    console.error('[ParentDashboard] Error fetching star sources:', error);
    // Return empty array on error
    starSources = [];
  }

  return {
    child: {
      _id: child._id,
      displayName: child.displayName,
      name: child.name,
    },
    totalStars: childStats.totalStars || 0,
    learningTimeHours: learningTimeHours || 0,
    courses: topCourses,
    starSources: starSources,
  };
};

module.exports = {
  getChildProgress,
};
