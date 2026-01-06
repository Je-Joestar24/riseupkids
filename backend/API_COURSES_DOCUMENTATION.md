# Course/Content Collection API Documentation

## Overview
The Course API allows admins to create and manage content collections (similar to Google Classroom). A course can contain mixed content types: Activities, Books, Videos, and Audio Assignments.

## Base URL
`/api/courses`

## Authentication
All endpoints require:
- JWT token in `Authorization` header: `Bearer <token>`
- Admin role

## Endpoints

### 1. Create Course
**POST** `/api/courses`

**Request (multipart/form-data):**
- `title` (String, required) - Course title
- `description` (String, optional) - Course description
- `isPublished` (Boolean, optional) - Published status (default: false)
- `tags` (JSON String, optional) - Array of tag strings: `["tag1", "tag2"]`
- `coverImage` (File, optional) - Cover image for the course (max 10MB)
- `contents` (JSON String, required) - Array of content items:
  ```json
  [
    {
      "contentId": "507f1f77bcf86cd799439011",
      "contentType": "activity"
    },
    {
      "contentId": "507f1f77bcf86cd799439012",
      "contentType": "book"
    }
  ]
  ```

**Content Types:**
- `activity` - Activity content
- `book` - Book content
- `video` - Video content (Media with SCORM)
- `audioAssignment` - Audio assignment content

**Response:**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "_id": "...",
    "title": "Course Title",
    "description": "Course Description",
    "coverImage": "/uploads/courses/20260106-182017-123456789.jpg",
    "contents": [...],
    "isPublished": false,
    "tags": ["tag1", "tag2"],
    "createdBy": {...},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 2. Get All Courses
**GET** `/api/courses`

**Query Parameters:**
- `isPublished` (Boolean, optional) - Filter by published status
- `search` (String, optional) - Search in title/description
- `page` (Number, optional) - Page number (default: 1)
- `limit` (Number, optional) - Items per page (default: 8)

**Example:**
```
GET /api/courses?isPublished=true&search=math&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Courses retrieved successfully",
  "data": [
    {
      "_id": "...",
      "title": "Course Title",
      "description": "Course Description",
      "coverImage": "/uploads/courses/...",
      "contentCount": 5,
      "isPublished": true,
      "createdBy": {...},
      "createdAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 8,
    "total": 20,
    "pages": 3
  }
}
```

### 3. Get Course By ID
**GET** `/api/courses/:id`

**Response:**
```json
{
  "success": true,
  "message": "Course retrieved successfully",
  "data": {
    "_id": "...",
    "title": "Course Title",
    "description": "Course Description",
    "coverImage": "/uploads/courses/...",
    "contents": [
      {
        "_id": "...",
        "title": "Activity Title",
        "_contentType": "activity",
        "_order": 0,
        "_addedAt": "...",
        "coverImage": "/uploads/...",
        "starsAwarded": 15,
        ...
      },
      {
        "_id": "...",
        "title": "Book Title",
        "_contentType": "book",
        "_order": 1,
        "_addedAt": "...",
        ...
      }
    ],
    "isPublished": true,
    "tags": ["tag1"],
    "createdBy": {...},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 4. Update Course
**PUT** `/api/courses/:id`

**Request (multipart/form-data):**
- `title` (String, optional) - Course title
- `description` (String, optional) - Course description
- `isPublished` (Boolean, optional) - Published status
- `tags` (JSON String, optional) - Array of tag strings
- `coverImage` (File, optional) - New cover image
- `contents` (JSON String, optional) - New contents array for reordering/adding/removing

**Note:** Providing `contents` will replace the entire contents array. Contents are automatically sorted by `order` and duplicates are removed.

**Response:**
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "_id": "...",
    "title": "Updated Title",
    ...
  }
}
```

### 5. Delete Course
**DELETE** `/api/courses/:id`

**Response:**
```json
{
  "success": true,
  "message": "Course deleted successfully",
  "data": {
    "id": "..."
  }
}
```

## Features

### Content Ordering
- Contents are automatically ordered by their `order` field (0, 1, 2, ...)
- When updating contents, provide the new order in the array
- Duplicate content items (same contentId + contentType) are automatically removed

### Content Validation
- All content items are validated to ensure they exist before adding to course
- Invalid content IDs will result in an error

### File Uploads
- Cover images are stored in `/uploads/courses/`
- File names are auto-generated using date/time format: `YYYYMMDD-HHMMSS-random.ext`
- Max file size: 10MB for images

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Please provide a course title"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Only admins can create courses"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Course not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to create course"
}
```

