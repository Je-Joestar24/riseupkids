# Mongoose Models Documentation

This directory contains all Mongoose models for the Rise Up Kids Learning Management System.

## 📋 Model Overview

### Core Models

1. **User** - Authentication and role management (admin, parent, child)
2. **ChildProfile** - Child-specific learning data (separate from auth)
3. **Journey** - Learning journey/curriculum container (optional but recommended)
4. **Lesson** - High-level lesson container
5. **LessonItem** - Reusable content blocks within lessons
6. **Media** - Centralized media handling (images, videos, audio)
7. **Book** - Read-along books with audio and subtitles support
8. **Activity** - Interactive learning activities
9. **Progress** - Child learning progress tracking
10. **Announcement** - Admin communication system

## 🔗 Model Relationships

### User Relationships

```
User (Parent)
  └── ChildProfile (children)
       └── Progress (learning progress)

User (Child)
  └── linkedParent (reference to parent User)
  └── ChildProfile (one-to-one)

User (Admin)
  └── Creates: Lesson, Book, Media, Activity, Announcement
```

### Learning Flow Relationships

```
Journey (optional)
  └── Lesson[]
       └── LessonItem[]
            ├── Media (video, audio, image)
            ├── Book (read-along)
            └── Activity (interactive)

ChildProfile
  └── Progress[]
       ├── Lesson (reference)
       └── LessonItem (reference)
```

### Content Relationships

```
Media
  ├── Referenced by: LessonItem, Book (audio), Activity
  └── Uploaded by: User (Admin)

Book
  ├── audio: Media (reference)
  ├── pages: Array (text + images)
  └── subtitles: Array (timestamps for read-along)

Activity
  ├── media: Media[] (references)
  └── questions: Array (for quiz type)
```

## 📊 Key Design Decisions

### 1. User vs ChildProfile Separation

**Why separate?**
- Parent can manage multiple children
- Child data stays clean and COPPA-compliant
- Easier to add child-specific features later
- Clear separation of authentication vs. learning data

### 2. LessonItem Pattern

**Why LessonItem?**
- One system for all lesson content types
- Easy to add new content types without breaking existing data
- Clean lesson ordering and structure
- Future-proof architecture

### 3. Centralized Media Model

**Why centralized?**
- Single source of truth for all media
- Easy migration to cloud storage (just update `cloudUrl`)
- Consistent metadata (size, duration, mimeType)
- Reusable across lessons, books, activities

### 4. Read-Along Book Support

**How it works:**
- Book has `audio` reference to Media
- `transcriptText` for full text
- `subtitles` array with timestamps for sync
- Supports: read-only, listen-only, read-along modes

### 5. Progress Tracking

**Why separate Progress model?**
- Fast queries for parent dashboards
- Clean analytics and reporting
- Tracks both lesson and lessonItem level
- Supports multiple attempts and scoring

## 🚀 Future Scalability

### Cloud Storage Migration

When moving to Cloudinary/S3:
1. Update `Media` model to use `cloudUrl`
2. Pre-save hook automatically uses `cloudUrl` if available
3. No schema changes needed

### AI Features

Models are ready for:
- Auto-transcription (Book model has `transcriptText` and `subtitles`)
- Analytics (Progress model tracks all needed data)
- Recommendations (tags and metadata fields)

### Mobile Support

All models include:
- Timestamps (createdAt, updatedAt)
- Status fields (isActive, isPublished)
- Metadata fields for additional data

### Stripe Integration

User model includes:
- `stripeCustomerId`
- `subscriptionStatus`
- Ready for subscription-based access control

## 📝 Usage Examples

### Creating a Lesson with Content

```javascript
// 1. Create Media
const video = await Media.create({
  type: 'video',
  filePath: '/uploads/videos/lesson1.mp4',
  uploadedBy: adminId,
  // ... other fields
});

// 2. Create Lesson
const lesson = await Lesson.create({
  title: 'Introduction to Numbers',
  createdBy: adminId,
  // ... other fields
});

// 3. Create LessonItem
const lessonItem = await LessonItem.create({
  lesson: lesson._id,
  type: 'video',
  contentRef: video._id,
  contentRefModel: 'Media',
  order: 1,
  // ... other fields
});
```

### Tracking Progress

```javascript
const progress = await Progress.create({
  child: childProfileId,
  lesson: lessonId,
  lessonItem: lessonItemId,
  status: 'completed',
  progressPercentage: 100,
  score: 85,
  maxScore: 100,
});
```

### Read-Along Book

```javascript
const book = await Book.create({
  title: 'The Little Red Hen',
  pages: [
    { pageNumber: 1, text: 'Once upon a time...' },
    // ... more pages
  ],
  audio: audioMediaId,
  transcriptText: 'Full transcript text...',
  subtitles: [
    { startTime: 0, endTime: 5, text: 'Once upon a time' },
    // ... more subtitles
  ],
});
```

## 🔍 Indexes

All models include strategic indexes for:
- Fast queries by parent/child relationships
- Efficient progress lookups
- Published content filtering
- User role-based queries

## ⚠️ Important Notes

1. **Password Security**: User passwords are hashed using bcrypt (never stored plain)
2. **File Storage**: Currently uses local `filePath`, ready for cloud migration
3. **Soft Deletes**: Use `isActive` and `isPublished` flags instead of hard deletes
4. **Validation**: All required fields have validation and error messages
5. **Timestamps**: All models include `createdAt` and `updatedAt` automatically

