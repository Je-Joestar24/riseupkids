import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragIndicator as DragIndicatorIcon, Close as CloseIcon } from '@mui/icons-material';
import useCourse from '../../../../hooks/courseHook';

/**
 * Sortable Content Item Component
 */
const SortableContentItem = ({ item, contentType, isDragging }) => {
  const theme = useTheme();
  // Use a more reliable ID format: contentId::contentType
  const contentId = item.contentId || item._id;
  const itemId = `${contentId}::${contentType}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: itemIsDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: itemIsDragging ? 0.5 : 1,
  };

  const itemTitle = item.title || 'Untitled';
  // Get step from various possible locations
  const step = item.step !== undefined ? item.step : (item._step !== undefined ? item._step : 1);

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        padding: 2,
        marginBottom: 1.5,
        borderRadius: '12px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: theme.shadows[2],
        },
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          color: theme.palette.text.secondary,
          '&:active': {
            cursor: 'grabbing',
          },
          '&:hover': {
            color: theme.palette.primary.main,
          },
        }}
      >
        <DragIndicatorIcon />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: '1.1rem',
            color: theme.palette.text.primary,
            marginBottom: 0.5,
          }}
        >
          {itemTitle}
        </Typography>
        {item.description && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.description}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            fontSize: '0.75rem',
            marginTop: 0.5,
            display: 'block',
          }}
        >
          Step {step}
        </Typography>
      </Box>
    </Paper>
  );
};

/**
 * Content Type Section Component
 */
const ContentTypeSection = ({ contentType, items, activeId }) => {
  const theme = useTheme();

  const getContentTypeLabel = (type) => {
    const labels = {
      'activity': '🎯 Activities',
      'book': '📚 Books',
      'video': '🎬 Videos',
      'audioAssignment': '🎵 Audio Assignments',
    };
    return labels[type] || type;
  };

  const getContentTypeIcon = (type) => {
    const icons = {
      'activity': '🎯',
      'book': '📚',
      'video': '🎬',
      'audioAssignment': '🎵',
    };
    return icons[type] || '📄';
  };

  // Get unique steps for this type
  const steps = [...new Set(items.map(item => {
    if (item.step !== undefined) return item.step;
    if (item._step !== undefined) return item._step;
    return 1;
  }))].sort((a, b) => a - b);
  const stepLabel = steps.length === 1 ? `Step ${steps[0]}` : `Steps ${steps.join(', ')}`;

  if (items.length === 0) {
    return null;
  }

  // Create item IDs for SortableContext using :: separator
  const itemIds = items.map(item => {
    const contentId = item.contentId || item._id;
    return `${contentId}::${contentType}`;
  });

  return (
    <Box sx={{ marginBottom: 4 }}>
      {/* Content Type Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: '1.25rem',
            color: theme.palette.text.primary,
          }}
        >
          {getContentTypeLabel(contentType)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            fontSize: '0.875rem',
          }}
        >
          ({items.length} {items.length === 1 ? 'item' : 'items'})
        </Typography>
      </Box>

      {/* Step Indicator */}
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          color: theme.palette.text.secondary,
          fontSize: '0.75rem',
          marginBottom: 1.5,
          display: 'block',
        }}
      >
        {stepLabel}
      </Typography>

      {/* Drag and Drop Zone */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {items.map((item) => {
          const contentId = item.contentId || item._id;
          const itemId = `${contentId}::${contentType}`;
          return (
            <SortableContentItem
              key={itemId}
              item={item}
              contentType={contentType}
              isDragging={activeId === itemId}
            />
          );
        })}
      </SortableContext>
    </Box>
  );
};

/**
 * Content Reorder Modal Component
 * 
 * Modal for reordering course contents with drag-and-drop functionality
 * Contents are grouped by type and can only be reordered within the same type
 */
const ContentReorderModal = ({ open, onClose, contents: initialContents = [], onSave: onSaveCallback, courseId = null }) => {
  const theme = useTheme();
  const { reorderCourseContentsData } = useCourse();
  const [contents, setContents] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const hasLoadedRef = useRef(false);

  // Group contents by type
  const groupContentsByType = (contentsList) => {
    const grouped = {
      activity: [],
      book: [],
      video: [],
      audioAssignment: [],
    };

    contentsList.forEach((item) => {
      const contentType = item.contentType || item._contentType;
      if (grouped[contentType]) {
        grouped[contentType].push(item);
      }
    });

    // Sort each group by step, then by order (this maintains the visual order after reordering)
    Object.keys(grouped).forEach((type) => {
      grouped[type].sort((a, b) => {
        const stepA = a.step !== undefined ? a.step : (a._step !== undefined ? a._step : 1);
        const stepB = b.step !== undefined ? b.step : (b._step !== undefined ? b._step : 1);
        if (stepA !== stepB) {
          return stepA - stepB;
        }
        // Sort by order to maintain the reordered sequence
        const orderA = a.order !== undefined ? a.order : (a._order !== undefined ? a._order : 0);
        const orderB = b.order !== undefined ? b.order : (b._order !== undefined ? b._order : 0);
        return orderA - orderB;
      });
    });

    return grouped;
  };

  // Initialize contents when modal opens
  useEffect(() => {
    if (open && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      if (initialContents && initialContents.length > 0) {
        // Ensure all items have step and order properties
        const normalizedContents = initialContents.map((item) => {
          const step = item.step !== undefined ? item.step : (item._step !== undefined ? item._step : 1);
          const order = item.order !== undefined ? item.order : (item._order !== undefined ? item._order : 0);
          return {
            ...item,
            step: step,
            order: order,
          };
        });
        
        // Sort by step, then contentType, then order
        const sorted = normalizedContents.sort((a, b) => {
          if (a.step !== b.step) {
            return a.step - b.step;
          }
          const typeA = a.contentType || a._contentType || '';
          const typeB = b.contentType || b._contentType || '';
          if (typeA !== typeB) {
            return typeA.localeCompare(typeB);
          }
          return a.order - b.order;
        });
        setContents(sorted);
      } else {
        setContents([]);
      }
    } else if (!open) {
      // Reset when modal closes
      hasLoadedRef.current = false;
      setContents([]);
      setActiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Extract contentType from active.id (format: "contentId::contentType")
    const activeParts = active.id.split('::');
    const overParts = over.id.split('::');
    
    if (activeParts.length !== 2 || overParts.length !== 2) {
      console.error('Invalid item ID format:', active.id, over.id);
      return;
    }

    const activeContentType = activeParts[1];
    const overContentType = overParts[1];

    // Only allow reordering within the same type
    if (activeContentType !== overContentType) {
      return; // Invalid drag - different types
    }

    const contentType = activeContentType;
    const activeContentId = activeParts[0];
    const overContentId = overParts[0];

    // Update contents state with new order
    setContents((prevContents) => {
      // Get items of this type from current state
      const typeItems = prevContents
        .filter((item) => (item.contentType || item._contentType) === contentType)
        .sort((a, b) => {
          // Sort by step first, then by order
          const stepA = a.step !== undefined ? a.step : (a._step !== undefined ? a._step : 1);
          const stepB = b.step !== undefined ? b.step : (b._step !== undefined ? b._step : 1);
          if (stepA !== stepB) {
            return stepA - stepB;
          }
          const orderA = a.order !== undefined ? a.order : (a._order !== undefined ? a._order : 0);
          const orderB = b.order !== undefined ? b.order : (b._order !== undefined ? b._order : 0);
          return orderA - orderB;
        });

      // Find indices within the type group
      const activeIndex = typeItems.findIndex(
        (item) => (item.contentId || item._id) === activeContentId
      );
      const overIndex = typeItems.findIndex(
        (item) => (item.contentId || item._id) === overContentId
      );

      if (activeIndex === -1 || overIndex === -1) {
        console.error('Could not find items in type group:', {
          activeIndex,
          overIndex,
          activeContentId,
          overContentId,
          typeItems: typeItems.map(i => ({ id: i.contentId || i._id, order: i.order })),
        });
        return prevContents; // Return unchanged if indices not found
      }

      // Reorder within the type group
      const reorderedTypeItems = arrayMove(typeItems, activeIndex, overIndex);

      // Update order values to reflect the new order (preserve step values)
      // Important: Update order based on the position in the reordered array
      const reorderedWithUpdatedOrder = reorderedTypeItems.map((item, index) => {
        // Get the step value (preserve it)
        const step = item.step !== undefined ? item.step : (item._step !== undefined ? item._step : 1);
        const updatedItem = {
          ...item,
          step: step,
          order: index, // Update order to match new position (0, 1, 2, ...)
        };
        return updatedItem;
      });

      // Debug: Log reordering (remove in production if needed)
      // console.log('Reordering items:', {
      //   contentType,
      //   activeIndex,
      //   overIndex,
      //   before: typeItems.map(i => ({ id: i.contentId || i._id, order: i.order })),
      //   after: reorderedWithUpdatedOrder.map(i => ({ id: i.contentId || i._id, order: i.order })),
      // });

      // Replace items of this type with reordered ones
      const otherContents = prevContents.filter(
        (item) => (item.contentType || item._contentType) !== contentType
      );
      
      // Combine other contents with reordered items (maintain step values, update order)
      const updatedContents = [...otherContents, ...reorderedWithUpdatedOrder];
      
      // Sort the final array by step, then contentType, then order to maintain display order
      return updatedContents.sort((a, b) => {
        const stepA = a.step !== undefined ? a.step : (a._step !== undefined ? a._step : 1);
        const stepB = b.step !== undefined ? b.step : (b._step !== undefined ? b._step : 1);
        if (stepA !== stepB) {
          return stepA - stepB;
        }
        const typeA = a.contentType || a._contentType || '';
        const typeB = b.contentType || b._contentType || '';
        if (typeA !== typeB) {
          return typeA.localeCompare(typeB);
        }
        const orderA = a.order !== undefined ? a.order : (a._order !== undefined ? a._order : 0);
        const orderB = b.order !== undefined ? b.order : (b._order !== undefined ? b._order : 0);
        return orderA - orderB;
      });
    });
  };

  const handleSave = async () => {
    if (contents.length === 0) {
      if (onSaveCallback) {
        onSaveCallback(contents);
      }
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // Group by type and save each type separately
      const grouped = groupContentsByType(contents);
      const typeOrder = ['activity', 'book', 'video', 'audioAssignment'];

      // If courseId exists and we're in edit mode, call API for each type
      if (courseId) {
        for (const contentType of typeOrder) {
          const typeItems = grouped[contentType];
          if (typeItems.length > 0) {
            const contentIds = typeItems.map((item) => item.contentId || item._id);
            await reorderCourseContentsData(courseId, contentType, contentIds);
          }
        }
      }

      // Always update local state via callback
      if (onSaveCallback) {
        onSaveCallback(contents);
      }

      onClose();
    } catch (error) {
      console.error('Error reordering contents:', error);
      // Error notification is handled by the hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original order
    if (initialContents.length > 0) {
      setContents([...initialContents]);
    }
    onClose();
  };

  const groupedContents = groupContentsByType(contents);
  const typeOrder = ['activity', 'book', 'video', 'audioAssignment'];
  const nonEmptyTypes = typeOrder.filter((type) => groupedContents[type].length > 0);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 8, // Valid elevation value (MUI supports up to 24, but theme typically defines up to 8)
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
          zIndex: 1300, // Same as parent modal
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.5rem',
          }}
        >
          Reorder Course Contents
        </Typography>
        <IconButton onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          padding: 3,
          overflowY: 'auto',
        }}
      >
        {contents.length === 0 ? (
          <Box sx={{ textAlign: 'center', padding: 4 }}>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              No contents to reorder
            </Typography>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {nonEmptyTypes.map((contentType) => (
              <ContentTypeSection
                key={contentType}
                contentType={contentType}
                items={groupedContents[contentType]}
                activeId={activeId}
              />
            ))}

            <DragOverlay>
              {activeId ? (
                <Paper
                  sx={{
                    padding: 2,
                    borderRadius: '12px',
                    backgroundColor: theme.palette.background.paper,
                    border: `2px solid ${theme.palette.primary.main}`,
                    boxShadow: theme.shadows[8],
                    opacity: 0.9,
                    transform: 'rotate(5deg)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <DragIndicatorIcon sx={{ color: theme.palette.primary.main }} />
                    <Typography
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                      }}
                    >
                      Dragging...
                    </Typography>
                  </Box>
                </Paper>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Button
          onClick={handleCancel}
          disabled={isSaving}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving || contents.length === 0}
          sx={{
            backgroundColor: theme.palette.orange.main,
            color: theme.palette.textCustom.inverse,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: theme.palette.orange.dark,
            },
          }}
        >
          {isSaving ? (
            <>
              <CircularProgress size={16} sx={{ marginRight: 1 }} />
              Saving...
            </>
          ) : (
            'Save Order'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContentReorderModal;
