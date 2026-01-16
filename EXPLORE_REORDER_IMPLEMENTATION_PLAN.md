# Explore Content Reorder Implementation Plan

## Overview
Implement reordering functionality for Explore Content, similar to the course reorder feature. This will allow admins to drag and drop Explore content items to change their display order. The order will be stored in the `order` field and used for sorting when fetching content.

**IMPORTANT: Reordering is video type-specific.** Each `videoType` (replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette) has its own independent ordering. For example:
- Replay videos can only be reordered among other replay videos
- Arts & Crafts videos can only be reordered among other arts_crafts videos
- Each video type maintains its own separate order sequence (0, 1, 2, ...)

## Current State
- ✅ `ExploreContent` model already has `order` field (Number, default: 0)
- ✅ `ExploreContent` model already has `videoType` field with enum values
- ✅ Backend services already sort by `order: 1, createdAt: -1` in queries
- ✅ Index exists on `{ type: 1, category: 1, order: 1 }`
- ✅ Index exists on `{ videoType: 1 }` and `{ type: 1, videoType: 1 }`
- ⚠️ Consider adding compound index `{ videoType: 1, order: 1 }` for optimal query performance when filtering by videoType
- ❌ No reorder API endpoint exists
- ❌ No frontend reorder UI exists

## Implementation Phases

### Phase 1: Backend Implementation

#### 1.1 Backend Service (`backend/services/explore.services.js`)

**Function: `reorderExploreContent`**
- **Purpose**: Reorder Explore content items by updating their `order` values within a specific video type
- **Parameters**:
  - `contentIds` (Array): Array of Explore content IDs in the desired order
  - `videoType` (String, **REQUIRED**): The video type to reorder (e.g., 'replay', 'arts_crafts', 'cooking', etc.)
- **Logic**:
  - Validate input (non-empty array, no duplicates, valid videoType)
  - Fetch all ExploreContent documents by IDs
  - Verify all IDs exist
  - **CRITICAL**: Validate that ALL content items belong to the same `videoType` (throw error if mixed types)
  - Assign sequential order values (0, 1, 2, 3, ...) based on array position
  - **IMPORTANT**: Order values are scoped per `videoType` - each video type has independent ordering
  - Use bulk write for efficient updates
  - Return updated content count
- **Error Handling**:
  - Invalid input validation
  - Missing content IDs
  - Duplicate IDs
  - Missing or invalid videoType
  - Mixed video types in contentIds (all must be same videoType)

**Implementation Notes**:
- Use simple sequential ordering (0, 1, 2, ...) per video type
- Order values are independent per video type (replay can have 0,1,2... and arts_crafts can also have 0,1,2...)
- All contentIds MUST belong to the same videoType - this is enforced and validated

#### 1.2 Backend Controller (`backend/controllers/explore.controller.js`)

**Function: `reorderExploreContent`**
- **Route Handler**: `POST /api/explore/reorder`
- **Access**: Private (Admin only)
- **Request Body**:
  ```json
  {
    "contentIds": ["id1", "id2", "id3", ...],
    "videoType": "replay" // REQUIRED - must match all contentIds
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Explore content reordered successfully",
    "data": {
      "updatedCount": 3
    }
  }
  ```
- **Error Handling**: 
  - 400: Missing videoType, invalid videoType, mixed video types in contentIds, empty array, duplicates
  - 404: One or more content IDs not found
  - 500: Server errors

#### 1.3 Backend Routes (`backend/routes/explore.routes.js`)

**Add Route**:
```javascript
router.post('/reorder', protect, reorderExploreContent);
```

**Position**: After the delete route, before type-specific routes

**Documentation**: Add JSDoc comment explaining the reorder endpoint

---

### Phase 2: Frontend Service Layer

#### 2.1 Frontend Service (`frontend/src/services/exploreServices.js`)

**Add Method: `reorderExploreContent`**
- **Purpose**: API abstraction for reordering Explore content within a specific video type
- **Parameters**:
  - `contentIds` (Array): Array of content IDs in desired order (all must be same videoType)
  - `videoType` (String, **REQUIRED**): The video type being reordered
- **Implementation**:
  ```javascript
  reorderExploreContent: async (contentIds, videoType) => {
    try {
      const response = await api.post('/explore/reorder', {
        contentIds,
        videoType,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
  ```
- **Error Handling**: Throw error message for UI display

---

### Phase 3: Frontend State Management

#### 3.1 Redux Slice (`frontend/src/store/slices/exploreSlice.js`)

**Add Async Thunk: `reorderExploreContent`**
- **Action Type**: `'explore/reorderExploreContent'`
- **Implementation**:
  - Call `exploreService.reorderExploreContent(contentIds, videoType)`
  - Return response data
  - Handle errors with `rejectWithValue`

**Add Reducer Cases**:
- **Pending**: Set `loading = true`, clear `error`
- **Fulfilled**: 
  - Set `loading = false`
  - Refresh explore content list (call `fetchAllExploreContent` or update local state)
  - Clear `error`
- **Rejected**: Set `loading = false`, set `error = action.payload`

**Export**: Add to exports

---

### Phase 4: Frontend Hook

#### 4.1 Explore Hook (`frontend/src/hooks/exploreHook.js`)

**Add Function: `reorderExploreContent`**
- **Purpose**: Wrapper function for reordering Explore content within a specific video type
- **Parameters**:
  - `contentIds` (Array): Array of content IDs in desired order (all must be same videoType)
  - `videoType` (String, **REQUIRED**): The video type being reordered
- **Implementation**:
  - Dispatch `reorderExploreContent` thunk with contentIds and videoType
  - Show success notification on success
  - Show error notification on failure
  - Optionally refresh content list after successful reorder
- **Return**: Promise that resolves/rejects

**Memoization**: Use `useCallback` to memoize the function

**Export**: Add to hook return object

---

### Phase 5: Frontend UI Components

#### 5.1 Explore Reorder Modal (`frontend/src/components/admin/courses/explore/ExploreReorderModal.jsx`)

**Purpose**: Modal component for drag-and-drop reordering of Explore content

**Dependencies**:
- `@dnd-kit/core` (DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay)
- `@dnd-kit/sortable` (arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy)
- `@dnd-kit/utilities` (CSS)
- Material-UI components (Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Paper, Stack, CircularProgress, IconButton, Divider)
- Icons: `DragIndicator`, `Close`

**Props**:
- `open` (Boolean): Modal open state
- `onClose` (Function): Close handler
- `content` (Array): Array of Explore content items to reorder (initial order) - **MUST all be same videoType**
- `videoType` (String, **REQUIRED**): The video type being reordered (e.g., 'replay', 'arts_crafts')

**State Management**:
- `items` (Array): Local state for reordered items
- `isSaving` (Boolean): Saving state
- `activeId` (String): Currently dragging item ID
- `hasLoadedRef` (Ref): Prevent duplicate initialization

**Features**:
1. **Initialization**:
   - On modal open, validate that all items in `content` prop have the same `videoType` as the `videoType` prop
   - Filter `content` to only include items matching `videoType` (safety check)
   - Initialize `items` from filtered content
   - Sort by `order` field (ascending), then by `createdAt` (descending) as fallback
   - Use `hasLoadedRef` to prevent re-initialization on re-renders

2. **Drag and Drop**:
   - Use `@dnd-kit` for drag-and-drop functionality
   - Sensors: PointerSensor and KeyboardSensor
   - Handle `onDragStart`: Set `activeId`
   - Handle `onDragEnd`: Update `items` order using `arrayMove`
   - Visual feedback: Show drag overlay with active item

3. **Sortable Item Component**:
   - Create `SortableExploreItem` component
   - Display: Cover image thumbnail (if available), title, video type badge, order number
   - Drag handle: DragIndicator icon on the left
   - Styling: Highlight when dragging (opacity: 0.5)

4. **Save/Cancel**:
   - **Save Button**:
     - Disabled when `isSaving`
     - Extract content IDs from `items` in current order
     - Call `reorderExploreContent` hook function with `contentIds` and `videoType` prop
     - Show loading state during save
     - Close modal on success
     - Refresh parent content list (via callback or refetch)
   - **Cancel Button**:
     - Reset `items` to original `content` order
     - Close modal

5. **UI Design**:
   - Modal: Full-width on mobile, max-width on desktop
   - Header: "Reorder Explore Content" title with close button
   - Content: Scrollable list of sortable items
   - Footer: Cancel and Save buttons
   - Loading: Show CircularProgress when saving

**Styling**:
- Follow existing modal patterns (similar to `CourseOrganizerModal`)
- Use theme colors and spacing
- Responsive design

#### 5.2 Explore Header Update (`frontend/src/components/admin/courses/explore/ExploreHeader.jsx`)

**Add Reorder Button**:
- **Position**: Next to "Add Content" button
- **Icon**: `Reorder` or `Sort` icon from Material-UI
- **Label**: "Reorder"
- **Styling**: Outlined or text button (secondary to "Add Content")
- **Handler**: Opens `ExploreReorderModal`

**State Management**:
- `reorderModalOpen` (Boolean): Control modal visibility
- **REQUIRED**: Must have a `videoType` selected/filtered before opening reorder modal
- Filter `exploreContent` to only items matching the current `videoType`
- Pass filtered content and `videoType` to modal
- Refresh content list after successful reorder

**Implementation**:
```javascript
const { exploreContent, filters } = useExplore();
const [reorderModalOpen, setReorderModalOpen] = useState(false);

// CRITICAL: Only allow reordering when a specific videoType is selected
// Filter content by current videoType (REQUIRED - cannot reorder without videoType)
const contentToReorder = filters.videoType 
  ? exploreContent.filter(item => item.videoType === filters.videoType)
  : [];

// Disable reorder button if no videoType is selected
const canReorder = Boolean(filters.videoType && contentToReorder.length > 0);

const handleReorderSuccess = () => {
  setReorderModalOpen(false);
  fetchExploreContent(); // Refresh list
};
```

---

### Phase 6: Sorting Verification

#### 6.1 Backend Query Sorting

**Verify Current Sorting**:
- ✅ `getAllExploreContent`: Already sorts by `order: 1, createdAt: -1`
- ✅ `getExploreContentByType`: Already sorts by `order: 1, createdAt: -1`
- ✅ Ensure all queries use consistent sorting

**Test Cases**:
- Items with same `order` should sort by `createdAt` (newest first)
- Items with different `order` should sort by `order` (ascending)

#### 6.2 Frontend Display Order

**Verify Components**:
- ✅ `ExploreCards`: Should display items in order received from API (already sorted)
- ✅ `ExploreReplays`: Should display items in order received from API (already sorted)
- ✅ Admin table/list views: Should display in order

---

## Technical Considerations

### Order Value Strategy
- **Simple Sequential**: Use 0, 1, 2, 3, ... (simpler, sufficient for Explore content)
- **Alternative Gap-Based**: Use 10, 20, 30, ... (allows insertions without full reorder, but more complex)
- **Decision**: Use simple sequential (0, 1, 2, ...) for simplicity

### Filtering by Video Type
- **REQUIRED**: Reordering is ALWAYS video type-specific
- Each `videoType` (replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette) has independent ordering
- Order values are scoped per video type (replay can have 0,1,2... and arts_crafts can also have 0,1,2... independently)
- All contentIds in a reorder operation MUST belong to the same videoType
- Backend validates that all items match the provided videoType
- Frontend must filter content by videoType before showing in reorder modal

### Performance
- Use bulk write operations for efficient database updates
- Limit reorder to reasonable number of items (e.g., max 100)
- Consider pagination if reordering large lists

### Error Handling
- Validate all content IDs exist before reordering
- Handle partial failures gracefully
- Provide clear error messages to users

### User Experience
- Show visual feedback during drag (drag overlay)
- Disable save button while saving
- Show success/error notifications
- Auto-refresh content list after successful reorder

---

## File Checklist

### Backend Files
- [ ] `backend/services/explore.services.js` - Add `reorderExploreContent` function
- [ ] `backend/controllers/explore.controller.js` - Add `reorderExploreContent` controller
- [ ] `backend/routes/explore.routes.js` - Add `POST /reorder` route

### Frontend Service Layer
- [ ] `frontend/src/services/exploreServices.js` - Add `reorderExploreContent` method

### Frontend State Management
- [ ] `frontend/src/store/slices/exploreSlice.js` - Add `reorderExploreContent` async thunk and reducer cases

### Frontend Hooks
- [ ] `frontend/src/hooks/exploreHook.js` - Add `reorderExploreContent` function

### Frontend UI Components
- [ ] `frontend/src/components/admin/courses/explore/ExploreReorderModal.jsx` - Create new modal component
- [ ] `frontend/src/components/admin/courses/explore/ExploreHeader.jsx` - Add reorder button and modal integration

---

## Testing Checklist

### Backend Testing
- [ ] Test reorder with valid content IDs of same videoType
- [ ] Test reorder with invalid content IDs (should fail)
- [ ] Test reorder with duplicate IDs (should fail)
- [ ] Test reorder with empty array (should fail)
- [ ] Test reorder with missing videoType (should fail)
- [ ] Test reorder with mixed video types in contentIds (should fail - all must be same type)
- [ ] Test reorder with videoType that doesn't match contentIds (should fail)
- [ ] Test reorder updates order values correctly within video type
- [ ] Test reorder maintains other content fields
- [ ] Test that order values are independent per video type (replay 0,1,2 doesn't affect arts_crafts 0,1,2)

### Frontend Testing
- [ ] Test modal opens/closes correctly
- [ ] Test drag and drop reordering
- [ ] Test save functionality
- [ ] Test cancel functionality
- [ ] Test error handling (network errors, validation errors)
- [ ] Test loading states
- [ ] Test content list refreshes after reorder
- [ ] Test with different video types (replay, arts_crafts, cooking, etc.)
- [ ] Test that reordering one video type doesn't affect other video types
- [ ] Test with empty content list
- [ ] Test that modal only shows items of the selected videoType
- [ ] Test that reorder button is disabled when no videoType is selected

### Integration Testing
- [ ] Test full flow: Open modal → Reorder items → Save → Verify order in list
- [ ] Test order persists after page refresh
- [ ] Test order affects child-facing Explore page display

---

## Implementation Order

1. **Backend Service** (`explore.services.js`) - Implement `reorderExploreContent` function
2. **Backend Controller** (`explore.controller.js`) - Add controller handler
3. **Backend Routes** (`explore.routes.js`) - Add route
4. **Frontend Service** (`exploreServices.js`) - Add API method
5. **Redux Slice** (`exploreSlice.js`) - Add async thunk and reducers
6. **Frontend Hook** (`exploreHook.js`) - Add hook function
7. **Reorder Modal** (`ExploreReorderModal.jsx`) - Create modal component
8. **Header Integration** (`ExploreHeader.jsx`) - Add reorder button and modal

---

## Future Enhancements (Optional)

1. **Bulk Operations**: Select multiple items and move them together
2. **Keyboard Shortcuts**: Arrow keys to move items up/down
3. **Order Preview**: Show order numbers in the main list view
4. **Auto-Save**: Save order automatically on drag end (no save button needed)
5. **Undo/Redo**: Allow undoing reorder operations
6. **Multi-Type Reorder**: Allow reordering across multiple video types in a single operation (if needed)

---

## Notes

- The `order` field already exists in the model and is used for sorting
- Backend queries already sort by `order`, so reordering will automatically affect display order
- **CRITICAL**: Order values are scoped per `videoType` - each video type maintains independent ordering
- Reordering is ALWAYS video type-specific - cannot mix different video types in a single reorder operation
- Backend validates that all contentIds belong to the same videoType before reordering
- Frontend must filter content by videoType before displaying in reorder modal
- Follow the same patterns as `CourseOrganizerModal` for consistency
- Use `@dnd-kit` library (already in project dependencies) for drag-and-drop
- Ensure proper error handling and user feedback throughout
