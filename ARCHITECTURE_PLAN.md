# Content Management Architecture Plan (MVP)

## Current State Analysis

### Content Types:
1. **Activities** - SCORM file + cover image
2. **Books** - SCORM file + cover image + special logic (5 readings)
3. **Videos** - Playable video + SCORM file + cover image (dual content)
4. **Audio Assignments** - Reference audio + cover image + admin review workflow

### Key Differences:
- **Books**: Unique requirement (must read 5 times, stars per reading)
- **Audio Assignments**: Unique workflow (admin review/approval)
- **Videos**: Dual content (video playback + SCORM interactive)
- **Activities**: Simple SCORM-based content

## Recommended MVP Approach: **Unified Interface + Separate Models**

### Architecture:
```
Frontend:
├── AdminContent (unified page)
│   ├── ContentHeader (with type selector)
│   ├── ContentFilters (search, status, type, archive)
│   ├── ContentItems (unified display, adapts to type)
│   ├── ContentPaginations
│   └── ContentAddModal (type-specific forms)
│
Backend:
├── Activity (model) - SCORM activities
├── Book (model) - SCORM books with reading logic
├── Media (model) - Videos with SCORM support
└── AudioAssignment (model) - Audio with review workflow
```

### Benefits:
✅ **Single admin interface** - One place to manage all content
✅ **Type filtering** - Easy to filter by content type
✅ **Backend separation** - Maintains unique business logic per type
✅ **Scalable** - Easy to add new content types
✅ **Reusable components** - Shared UI with type-specific adaptations

### Implementation Steps:

#### Phase 1: Unified Content Service & Hook
- Create `contentService.js` that aggregates all content types
- Create `contentHook.js` that manages unified state
- Create `contentSlice.js` for Redux state

#### Phase 2: Unified Display Components
- Rename/refactor `ActivityItems` → `ContentItems`
- Add type badges/indicators (Activity, Book, Video, Audio)
- Adapt card display based on content type
- Handle type-specific actions (edit, archive, review)

#### Phase 3: Unified Filters
- Add "Content Type" filter dropdown
- Keep existing filters (status, archive, search)
- Update filter logic to work across all types

#### Phase 4: Type-Specific Modals
- Unified `ContentAddModal` with type selector
- Type-specific forms (Activity, Book, Video, Audio)
- Shared validation and upload logic

### Alternative Approaches (Not Recommended for MVP):

#### Option A: Single "Content" Model
- ❌ Loses type-specific business logic
- ❌ Complex polymorphic queries
- ❌ Harder to maintain

#### Option B: Completely Separate Pages
- ❌ More navigation complexity
- ❌ Duplicate UI code
- ❌ Harder to search across types

## File Structure:

```
frontend/src/
├── pages/admin/
│   └── AdminContent.jsx (renamed from AdminActivities)
│
├── components/admin/content/
│   ├── ContentHeader.jsx
│   ├── ContentFilters.jsx
│   ├── ContentItems.jsx
│   ├── ContentPaginations.jsx
│   ├── ContentAddModal.jsx
│   └── ContentEditModal.jsx
│
├── hooks/
│   └── contentHook.js (unified hook)
│
├── services/
│   └── contentService.js (aggregates all types)
│
└── store/slices/
    └── contentSlice.js (unified Redux slice)

backend/
├── services/
│   ├── activity.services.js (existing)
│   ├── book.services.js (new)
│   ├── video.services.js (new - for Media with SCORM)
│   └── audioAssignment.services.js (new)
│
└── controllers/
    ├── activity.controller.js (existing)
    ├── book.controller.js (new)
    ├── video.controller.js (new)
    └── audioAssignment.controller.js (new)
```

## Content Type Indicators:

### Visual Indicators in Cards:
- **Activity**: "SCORM" badge (blue)
- **Book**: "📚 Book" badge (purple) + reading count indicator
- **Video**: "🎥 Video" badge (red) + "SCORM" badge
- **Audio**: "🎤 Audio" badge (green) + review status

### Type-Specific Features:
- **Books**: Show "5 readings required" indicator
- **Videos**: Show video duration + SCORM indicator
- **Audio**: Show "Pending Review" / "Approved" / "Rejected" status
- **Activities**: Standard SCORM badge

## Migration Strategy:

1. **Keep existing Activity components** (don't break current functionality)
2. **Create new unified components** alongside existing ones
3. **Gradually migrate** Activity → Content
4. **Add new types** (Book, Video, Audio) to unified system
5. **Deprecate old Activity-specific components** once unified is stable

## Next Steps:

1. ✅ Create unified content service/hook/slice
2. ✅ Refactor ActivityItems → ContentItems (backward compatible)
3. ✅ Add type filter to ContentFilters
4. ✅ Create type-specific add modals
5. ✅ Implement Book, Video, Audio APIs
6. ✅ Connect all types to unified interface

