# Updated Mongoose Models Documentation

## 📋 New Models Added

### 1. **ChildStats** - Child Learning Statistics
Tracks child's overall learning metrics:
- `totalStars` - Cumulative stars earned
- `currentStreak` - Current day streak
- `longestStreak` - Longest streak achieved
- `lastActivityDate` - Last activity date (for streak calculation)
- `totalBadges` - Total badges earned
- `badges` - Array of badge IDs
- Activity counters (activities, videos, books, audio assignments, lessons, journeys)

**Methods:**
- `addStars(stars)` - Add stars and update streak
- `updateStreak()` - Calculate and update streak based on last activity
- `addBadge(badgeId)` - Add a badge to child's collection
- `getOrCreate(childId)` - Static method to get or create stats

### 2. **Badge** - Badge Definitions
Defines badges that children can earn:
- `name`, `description`, `icon`, `image`
- `category` - streak, completion, milestone, explore, social, special, other
- `criteria` - Type and value for earning badge
- `rarity` - common, uncommon, rare, epic, legendary

### 3. **KidsWallPost** - Social Media Posts
Mini social media platform for children:
- `type` - text, image, video, mixed
- `content`, `title`
- `images`, `videos` - Media references
- `category` - Math, Art, Reading, etc.
- `relatedContent` - Link to lesson/activity/book
- `likes` - Array of child likes with timestamps
- `comments` - Array of comments
- `isApproved` - Parent/admin approval required

### 4. **BookReading** - Book Reading Sessions
Tracks individual book reading sessions (for 5-time requirement):
- `status` - started, in_progress, completed, abandoned
- `progressPercentage`, `currentPage`
- `timeSpent` - Reading duration
- `starsEarned` - Stars for this session
- `audioUsed` - Whether audio narration was used

**Methods:**
- `getCompletedReadingCount(childId, bookId)` - Get count of completed readings
- `isRequirementMet(childId, bookId)` - Check if 5 readings completed

### 5. **AudioAssignment** - Audio Assignments
Separate from regular activities (like "ABC Chant"):
- `title`, `description`, `instructions`
- `referenceAudio` - Example audio
- `starsAwarded` - Stars for completion
- `isStarAssignment` - Special high-value assignments
- `badgeAwarded` - Optional badge
- `lesson`, `journey` - Optional references

### 6. **AudioAssignmentProgress** - Audio Assignment Progress
Tracks child's progress on audio assignments:
- `status` - not_started, in_progress, completed, submitted
- `recordedAudio` - Child's recorded submission
- `starsEarned` - Stars earned
- `timeSpent`, `attempts`

### 7. **StarEarning** - Star Earning History
Tracks individual star earnings for analytics:
- `stars` - Number of stars
- `source` - Type and content reference
- `description` - Reason for earning

### 8. **ExploreContent** - Explore Page Content
Content available in Explore page:
- `type` - video, lesson, activity, book, audio
- `contentRef` - Dynamic reference to content
- `category` - Arts & Crafts, Cooking, Music, etc.
- `starsAwarded` - Stars for completion
- `isFeatured` - Featured content flag

## 📝 Updated Models

### **Journey** - Added Week Structure
- `weekNumber` - Week number (e.g., 1, 2, 3)
- `totalWeeks` - Total weeks in series
- `seriesId` - Series identifier for grouping weeks

### **Book** - Added Reading Requirements
- `requiredReadingCount` - Default 5 (SCORM-like requirement)
- `starsPerReading` - Stars per reading session
- `totalStarsAwarded` - Total stars when requirement met

### **Progress** - Added Stars Tracking
- `starsEarned` - Stars earned for this progress
- `starsAwarded` - Flag to prevent duplicate awards

### **LessonItem** - Added Stars
- `starsAwarded` - Stars for completing this item

### **Activity** - Added Stars and Badges
- `starsAwarded` - Stars for completion
- `badgeAwarded` - Optional badge

### **Media** - Added Stars (for Videos)
- `starsAwarded` - Stars for watching video

### **Lesson** - Added Stars and Badges
- `starsAwarded` - Stars for lesson completion
- `badgeAwarded` - Optional badge

### **ChildProfile** - Added Stats Virtual
- Virtual `stats` - Reference to ChildStats

## 🔗 Model Relationships

### Star & Streak Tracking Flow
```
ChildProfile
  └── ChildStats (one-to-one)
       ├── StarEarning[] (history)
       └── Badge[] (earned badges)

Activity/Lesson/Video/Book Completion
  └── Progress (tracks completion)
       └── Updates ChildStats (adds stars, updates streak)
```

### Book Reading Flow
```
Book (requiredReadingCount: 5)
  └── BookReading[] (reading sessions)
       └── When 5 completed → Award totalStarsAwarded
```

### Audio Assignment Flow
```
AudioAssignment
  └── AudioAssignmentProgress (child's progress)
       └── Updates ChildStats (adds stars)
```

### Kids' Wall Flow
```
ChildProfile
  └── KidsWallPost[] (posts)
       ├── Likes[] (from other children)
       └── Comments[] (from other children)
```

### Explore Content Flow
```
ExploreContent
  └── References: Media/Lesson/Activity/Book/AudioAssignment
       └── Completion → Updates ChildStats (adds stars)
```

## 📊 Key Design Decisions

### 1. Streak Calculation
- Streak updates when child completes ANY activity
- Must complete at least one activity per day
- Streak continues if activity was yesterday
- Streak resets if gap > 1 day

### 2. Stars System
- Stars awarded at multiple levels:
  - LessonItem completion: 10 stars (default)
  - Activity completion: 15 stars (default)
  - Video watch: 10 stars (default)
  - Book reading: 10 stars per reading
  - Audio assignment: 10 stars (default)
  - Lesson completion: 20 stars (default)
- StarEarning tracks history for analytics

### 3. Badges System
- Badges defined in Badge model
- Awarded for milestones (streaks, completions, etc.)
- Stored in ChildStats.badges array
- Can be awarded automatically or manually

### 4. Book Reading (SCORM-like)
- Books must be read 5 times (configurable)
- Each reading tracked in BookReading
- Stars awarded per reading + bonus when requirement met

### 5. Kids' Wall Moderation
- Posts require parent/admin approval (`isApproved`)
- Children can like and comment
- Posts can be linked to specific content

### 6. Week-based Journeys
- Journeys can be organized by weeks
- `seriesId` groups related weeks
- `weekNumber` indicates position in series
- Unlock rules can be based on previous weeks

## 🎯 Usage Examples

### Award Stars on Activity Completion
```javascript
// When child completes an activity
const progress = await Progress.findOneAndUpdate(
  { child: childId, activity: activityId },
  { status: 'completed', starsEarned: activity.starsAwarded },
  { new: true }
);

// Update child stats
const stats = await ChildStats.getOrCreate(childId);
await stats.addStars(activity.starsAwarded);

// Record star earning
await StarEarning.create({
  child: childId,
  stars: activity.starsAwarded,
  source: { type: 'activity', contentId: activityId, contentType: 'Activity' },
  description: `Completed activity: ${activity.title}`
});
```

### Check Book Reading Requirement
```javascript
const isComplete = await BookReading.isRequirementMet(childId, bookId);
if (isComplete) {
  // Award total stars
  const stats = await ChildStats.getOrCreate(childId);
  await stats.addStars(book.totalStarsAwarded);
}
```

### Update Streak
```javascript
// Automatically called when addStars() is called
// Or manually:
const stats = await ChildStats.getOrCreate(childId);
await stats.updateStreak();
```

