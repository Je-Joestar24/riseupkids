# Rise Up Kids - Complete Data Model Design

## 📊 Overview

This document describes the complete backend data model for the Rise Up Kids Learning Management System, including tracking systems for stars, streaks, badges, and all content types.

## 🎯 Core Tracking Systems

### 1. **Stars System**
- **Purpose**: Gamification reward system
- **Storage**: 
  - `ChildStats.totalStars` - Cumulative total
  - `StarEarning` - Individual earning history
- **Award Sources**:
  - LessonItem completion: 10 stars (default)
  - Activity completion: 15 stars (default)
  - Video watch: 10 stars (default)
  - Book reading: 10 stars per reading
  - Audio assignment: 10 stars (default)
  - Lesson completion: 20 stars (default)
  - Explore content: 10 stars (default)
  - Kids' Wall posts/likes: Variable
  - Badge earning: Variable
  - Streak milestones: Variable

### 2. **Streak System**
- **Purpose**: Encourage daily learning
- **Storage**: `ChildStats.currentStreak`, `ChildStats.longestStreak`, `ChildStats.lastActivityDate`
- **Logic**:
  - Streak updates when child completes ANY activity
  - Must complete at least one activity per day
  - Continues if last activity was yesterday
  - Resets if gap > 1 day
  - Tracks longest streak achieved

### 3. **Badges System**
- **Purpose**: Achievement milestones
- **Storage**: 
  - `Badge` - Badge definitions
  - `ChildStats.badges` - Array of earned badge IDs
- **Badge Categories**:
  - `streak` - Streak milestones
  - `completion` - Completion achievements
  - `milestone` - Learning milestones
  - `explore` - Explore content achievements
  - `social` - Kids' Wall achievements
  - `special` - Special events
  - `other` - Other achievements

## 📚 Content Models

### **Journey** (Week-based Courses)
- **Structure**: Journeys organized by weeks
- **Fields**:
  - `weekNumber` - Week position (1, 2, 3, etc.)
  - `totalWeeks` - Total weeks in series
  - `seriesId` - Groups related weeks
- **Unlock Rules**: Based on previous week completion
- **Status**: Completed, To Do, Locked (calculated from Progress)

### **Lesson** (Within Journey/Week)
- **Structure**: Lessons within a journey
- **Fields**:
  - `starsAwarded` - Stars for completion (default: 20)
  - `badgeAwarded` - Optional badge
- **Unlock Rules**: Based on previous lesson completion

### **LessonItem** (Content within Lesson)
- **Types**: video, book, audio, activity, quiz, assignment, text, image
- **Fields**:
  - `starsAwarded` - Stars for completion (default: 10)
- **Completion Rules**: view, complete, score, time

### **Book** (Library - SCORM-like)
- **Requirement**: Must be read 5 times (configurable)
- **Fields**:
  - `requiredReadingCount` - Default: 5
  - `starsPerReading` - Stars per reading (default: 10)
  - `totalStarsAwarded` - Bonus when requirement met (default: 50)
- **Tracking**: `BookReading` model tracks each reading session

### **Media** (Videos/Audio/Images)
- **Types**: image, video, audio
- **Fields**:
  - `starsAwarded` - Stars for watching (default: 10, for videos)
- **Usage**: Referenced by LessonItem, Book, Activity

### **Activity** (Interactive Activities)
- **Types**: drawing, quiz, task, puzzle, matching, writing, other
- **Fields**:
  - `starsAwarded` - Stars for completion (default: 15)
  - `badgeAwarded` - Optional badge
- **Scoring**: Supports maxScore, questions (for quizzes)

### **AudioAssignment** (Separate from Activities)
- **Purpose**: Audio recording assignments (e.g., "ABC Chant")
- **Fields**:
  - `starsAwarded` - Stars for completion (default: 10)
  - `isStarAssignment` - High-value assignments
  - `badgeAwarded` - Optional badge
- **Tracking**: `AudioAssignmentProgress` stores child's recorded audio

### **ExploreContent** (Explore Page)
- **Purpose**: Content accessible outside journeys
- **Types**: video, lesson, activity, book, audio
- **Fields**:
  - `category` - Arts & Crafts, Cooking, Music, etc.
  - `starsAwarded` - Stars for completion (default: 10)
  - `isFeatured` - Featured content flag
- **Dynamic Reference**: Uses `contentRef` and `contentRefModel`

## 🏆 Progress & Tracking Models

### **Progress** (Lesson/LessonItem Progress)
- **Tracks**: Lesson and LessonItem completion
- **Fields**:
  - `status` - not_started, in_progress, completed, skipped
  - `progressPercentage` - 0-100
  - `score`, `maxScore` - For quizzes/activities
  - `timeSpent` - Time in seconds
  - `starsEarned` - Stars for this progress
  - `starsAwarded` - Flag to prevent duplicates
- **Calculates**: Completed, To Do, Locked states

### **BookReading** (Book Reading Sessions)
- **Tracks**: Individual book reading sessions
- **Fields**:
  - `status` - started, in_progress, completed, abandoned
  - `progressPercentage`, `currentPage`
  - `timeSpent` - Reading duration
  - `starsEarned` - Stars for this session
  - `audioUsed` - Whether audio narration was used
- **Methods**:
  - `getCompletedReadingCount()` - Count completed readings
  - `isRequirementMet()` - Check if 5 readings completed

### **AudioAssignmentProgress** (Audio Assignment Progress)
- **Tracks**: Child's progress on audio assignments
- **Fields**:
  - `status` - not_started, in_progress, completed, submitted
  - `recordedAudio` - Child's recorded submission (Media reference)
  - `starsEarned` - Stars earned
  - `timeSpent`, `attempts`

### **ChildStats** (Child Statistics)
- **Purpose**: Centralized stats tracking
- **Fields**:
  - `totalStars` - Cumulative stars
  - `currentStreak` - Current day streak
  - `longestStreak` - Longest streak achieved
  - `lastActivityDate` - For streak calculation
  - `totalBadges` - Total badges count
  - `badges` - Array of badge IDs
  - Activity counters (activities, videos, books, audio, lessons, journeys)
- **Methods**:
  - `addStars(stars)` - Add stars and update streak
  - `updateStreak()` - Calculate streak
  - `addBadge(badgeId)` - Add badge
  - `getOrCreate(childId)` - Static method

### **StarEarning** (Star History)
- **Purpose**: Track individual star earnings for analytics
- **Fields**:
  - `stars` - Number of stars
  - `source` - Type, contentId, contentType, metadata
  - `description` - Reason for earning
- **Use Case**: Analytics, history, debugging

## 🌐 Social Features

### **KidsWallPost** (Social Media Posts)
- **Purpose**: Mini social media platform
- **Types**: text, image, video, mixed
- **Fields**:
  - `content`, `title`
  - `images`, `videos` - Media references
  - `category` - Math, Art, Reading, etc.
  - `relatedContent` - Link to lesson/activity/book
  - `likes` - Array of child likes with timestamps
  - `comments` - Array of comments
  - `isApproved` - Parent/admin approval required
- **Engagement**: Like count, comment count (virtuals)

## 🔗 Model Relationships

### Complete Relationship Map

```
User (Parent)
  └── ChildProfile[]
       ├── ChildStats (one-to-one)
       │    ├── Badge[] (earned badges)
       │    └── StarEarning[] (history)
       ├── Progress[] (lesson progress)
       ├── BookReading[] (book reading sessions)
       ├── AudioAssignmentProgress[] (audio assignments)
       └── KidsWallPost[] (social posts)

Journey (Week-based)
  ├── weekNumber, totalWeeks, seriesId
  └── Lesson[]
       ├── starsAwarded, badgeAwarded
       └── LessonItem[]
            ├── starsAwarded
            └── References: Media, Book, Activity

Book (Library - SCORM-like)
  ├── requiredReadingCount: 5
  ├── starsPerReading: 10
  └── totalStarsAwarded: 50 (when 5 readings complete)

Media (Videos/Audio/Images)
  └── starsAwarded: 10 (for videos)

Activity
  ├── starsAwarded: 15
  └── badgeAwarded (optional)

AudioAssignment
  ├── starsAwarded: 10
  ├── isStarAssignment (high-value)
  └── badgeAwarded (optional)

ExploreContent
  ├── category (Arts & Crafts, Cooking, etc.)
  ├── starsAwarded: 10
  └── Dynamic reference to Media/Lesson/Activity/Book/AudioAssignment
```

## 📈 Data Flow Examples

### Example 1: Child Completes a Lesson

```javascript
// 1. Update Progress
const progress = await Progress.findOneAndUpdate(
  { child: childId, lesson: lessonId },
  { 
    status: 'completed',
    starsEarned: lesson.starsAwarded,
    starsAwarded: true
  }
);

// 2. Update ChildStats
const stats = await ChildStats.getOrCreate(childId);
await stats.addStars(lesson.starsAwarded); // Also updates streak

// 3. Record StarEarning
await StarEarning.create({
  child: childId,
  stars: lesson.starsAwarded,
  source: {
    type: 'lesson',
    contentId: lessonId,
    contentType: 'Lesson'
  },
  description: `Completed lesson: ${lesson.title}`
});

// 4. Award badge if applicable
if (lesson.badgeAwarded) {
  await stats.addBadge(lesson.badgeAwarded);
}
```

### Example 2: Child Reads a Book (5th Time)

```javascript
// 1. Create BookReading session
const reading = await BookReading.create({
  child: childId,
  book: bookId,
  status: 'completed',
  starsEarned: book.starsPerReading
});

// 2. Check if requirement met (5 readings)
const isComplete = await BookReading.isRequirementMet(childId, bookId);

// 3. Update stats
const stats = await ChildStats.getOrCreate(childId);
await stats.addStars(book.starsPerReading);

// 4. If 5th reading, award bonus stars
if (isComplete) {
  await stats.addStars(book.totalStarsAwarded - (book.starsPerReading * 5));
  // Award bonus = totalStarsAwarded - (starsPerReading * 5)
}
```

### Example 3: Child Posts on Kids' Wall

```javascript
// 1. Create post (requires approval)
const post = await KidsWallPost.create({
  child: childId,
  type: 'image',
  content: 'My rainbow painting!',
  images: [imageMediaId],
  category: 'Art',
  isApproved: false // Needs parent/admin approval
});

// 2. After approval, award stars (if configured)
if (post.isApproved) {
  const stats = await ChildStats.getOrCreate(childId);
  await stats.addStars(5); // Example: 5 stars for posting
}
```

### Example 4: Streak Calculation

```javascript
// Automatically called when addStars() is called
// Or manually:
const stats = await ChildStats.getOrCreate(childId);

// Logic:
// - If last activity was yesterday → Continue streak
// - If last activity was > 1 day ago → Reset to 1
// - If first activity ever → Start at 1
// - Update longestStreak if current > longest

await stats.updateStreak();
```

## 🎮 Status Calculation (Completed, To Do, Locked)

### Journey/Lesson Status
```javascript
// For a journey/week:
const completedLessons = await Progress.countDocuments({
  child: childId,
  lesson: { $in: journeyLessons },
  status: 'completed'
});

// Status calculation:
// - Completed: All lessons completed
// - To Do: Some lessons completed
// - Locked: Previous week not completed (if unlockRules require it)
```

### Lesson Status
```javascript
// For a lesson:
const completedItems = await Progress.countDocuments({
  child: childId,
  lesson: lessonId,
  status: 'completed'
});

const totalItems = lesson.lessonItems.length;

// Status:
// - Completed: completedItems === totalItems
// - To Do: completedItems > 0 && completedItems < totalItems
// - Locked: Previous lesson not completed (if unlockRules require it)
```

## 🔐 Data Integrity

### Preventing Duplicate Star Awards
- `Progress.starsAwarded` flag prevents duplicate awards
- Check flag before awarding stars
- Update flag after awarding

### Streak Calculation
- Uses `lastActivityDate` to track last activity
- Compares dates (not timestamps) for day-based calculation
- Handles timezone issues by setting hours to 0

### Book Reading Requirement
- `BookReading.isRequirementMet()` checks completed count
- Only counts `status: 'completed'` readings
- Prevents counting abandoned/in-progress readings

## 📊 Indexes for Performance

### Critical Indexes
- `ChildStats.child` - Unique index
- `Progress.child + lesson` - Compound index
- `BookReading.child + book` - Compound index
- `StarEarning.child + createdAt` - For history queries
- `KidsWallPost.isApproved + createdAt` - For feed queries
- `Journey.seriesId + weekNumber` - For week-based queries

## 🚀 Future Enhancements

### Potential Additions
1. **Leaderboards** - Based on `ChildStats.totalStars`, `currentStreak`
2. **Achievement System** - Automatic badge awarding based on milestones
3. **Parent Dashboard** - Analytics based on `StarEarning` history
4. **Content Recommendations** - Based on child's progress and preferences
5. **Social Features** - Comments, shares, follows on Kids' Wall

