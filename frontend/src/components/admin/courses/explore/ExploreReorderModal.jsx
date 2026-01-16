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
  Avatar,
  Chip,
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
import { useExplore } from '../../../../hooks/exploreHook';

/**
 * Sortable Explore Item Component
 */
const SortableExploreItem = ({ item, getCoverImageUrl, getVideoTypeLabel }) => {
  const theme = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: itemIsDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: itemIsDragging ? 0.5 : 1,
  };

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
      
      {/* Cover Image */}
      {item.coverImage ? (
        <Avatar
          src={getCoverImageUrl(item.coverImage)}
          alt={item.title}
          variant="rounded"
          sx={{
            width: 64,
            height: 64,
            borderRadius: '8px',
            flexShrink: 0,
          }}
        />
      ) : (
        <Avatar
          variant="rounded"
          sx={{
            width: 64,
            height: 64,
            borderRadius: '8px',
            backgroundColor: theme.palette.custom.bgSecondary,
            color: theme.palette.orange.main,
            flexShrink: 0,
          }}
        >
          {item.videoType ? getVideoTypeLabel(item.videoType).charAt(0) : 'V'}
        </Avatar>
      )}
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 0.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </Typography>
          {item.videoType && (
            <Chip
              label={getVideoTypeLabel(item.videoType)}
              size="small"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 500,
                fontSize: '0.75rem',
                height: 20,
                flexShrink: 0,
              }}
            />
          )}
        </Box>
        {item.description && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
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
      </Box>
      
      {/* Order Number */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 40,
          height: 40,
          borderRadius: '8px',
          backgroundColor: theme.palette.primary.light + '20',
          color: theme.palette.primary.main,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          fontSize: '1rem',
          flexShrink: 0,
        }}
      >
        {item.order !== undefined ? item.order + 1 : '-'}
      </Box>
    </Paper>
  );
};

/**
 * Explore Reorder Modal Component
 * 
 * Modal for reordering Explore content with drag-and-drop functionality
 * Reordering is video type-specific - all items must belong to the same videoType
 */
const ExploreReorderModal = ({ open, onClose, content: initialContent = [], videoType }) => {
  const theme = useTheme();
  const { reorderExploreContentData, getCoverImageUrl, getVideoTypeLabel } = useExplore();
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const hasLoadedRef = useRef(false);

  // Initialize items when modal opens
  useEffect(() => {
    if (open && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      // Validate that all items have the same videoType as the prop
      if (initialContent && initialContent.length > 0) {
        // Filter to only include items matching the videoType (safety check)
        const filteredContent = initialContent.filter(item => item.videoType === videoType);
        
        // Sort by order field (ascending), then by createdAt (descending) as fallback
        const sorted = [...filteredContent].sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            if (a.order !== b.order) {
              return a.order - b.order;
            }
          }
          // If order is same or undefined, sort by createdAt (newest first)
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        setItems(sorted);
      } else {
        setItems([]);
      }
    } else if (!open) {
      // Reset when modal closes
      hasLoadedRef.current = false;
      setItems([]);
      setActiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, videoType]); // Depend on open and videoType

  const sensors = useSensors(
    useSensor(PointerSensor),
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

    if (active.id !== over?.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item._id === active.id);
        const newIndex = currentItems.findIndex((item) => item._id === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (items.length === 0 || !videoType) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      // Extract content IDs from items in current order
      const contentIds = items.map((item) => item._id);
      
      // Call reorder function with contentIds and videoType
      // Note: reorderExploreContentData already refreshes the content list
      await reorderExploreContentData(contentIds, videoType);
      
      onClose();
    } catch (error) {
      console.error('Error reordering explore content:', error);
      // Error notification is handled by the hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original order
    if (initialContent && initialContent.length > 0) {
      const filteredContent = initialContent.filter(item => item.videoType === videoType);
      const sorted = [...filteredContent].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setItems(sorted);
    }
    onClose();
  };

  const activeItem = activeId ? items.find((item) => item._id === activeId) : null;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
          fontFamily: 'Quicksand, sans-serif',
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
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1.5rem',
              color: theme.palette.text.primary,
            }}
          >
            Reorder Explore Content
          </Typography>
          {videoType && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
                marginTop: 0.5,
              }}
            >
              Video Type: {getVideoTypeLabel(videoType)}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={handleCancel}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: `${theme.palette.error.main}20`,
              color: theme.palette.error.main,
            },
          }}
          aria-label="Close modal"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3, overflowY: 'auto' }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginBottom: 2,
          }}
        >
          Drag and drop items to reorder them. Click "Save Order" when done.
        </Typography>

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', padding: 4 }}>
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              No content to reorder
            </Typography>
            {videoType && (
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.text.muted,
                  marginTop: 1,
                }}
              >
                No items found for video type: {getVideoTypeLabel(videoType)}
              </Typography>
            )}
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item._id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1.5}>
                {items.map((item) => (
                  <SortableExploreItem
                    key={item._id}
                    item={item}
                    getCoverImageUrl={getCoverImageUrl}
                    getVideoTypeLabel={getVideoTypeLabel}
                  />
                ))}
              </Stack>
            </SortableContext>
            <DragOverlay>
              {activeItem ? (
                <Paper
                  sx={{
                    padding: 2,
                    borderRadius: '12px',
                    backgroundColor: theme.palette.background.paper,
                    border: `2px solid ${theme.palette.primary.main}`,
                    boxShadow: theme.shadows[8],
                    opacity: 0.9,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    width: '100%',
                  }}
                >
                  <DragIndicatorIcon sx={{ color: theme.palette.primary.main }} />
                  {activeItem.coverImage ? (
                    <Avatar
                      src={getCoverImageUrl(activeItem.coverImage)}
                      alt={activeItem.title}
                      variant="rounded"
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '8px',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '8px',
                        backgroundColor: theme.palette.custom.bgSecondary,
                        color: theme.palette.orange.main,
                        flexShrink: 0,
                      }}
                    >
                      {activeItem.videoType ? getVideoTypeLabel(activeItem.videoType).charAt(0) : 'V'}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                        fontSize: '1rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activeItem.title}
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
          gap: 2,
        }}
      >
        <Button
          onClick={handleCancel}
          disabled={isSaving}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            paddingX: 3,
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.custom.bgTertiary,
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving || items.length === 0 || !videoType}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            paddingX: 3,
            backgroundColor: theme.palette.orange.main,
            color: theme.palette.textCustom.inverse,
            '&:hover': {
              backgroundColor: theme.palette.orange.dark,
            },
            '&:disabled': {
              backgroundColor: theme.palette.action.disabledBackground,
              color: theme.palette.action.disabled,
            },
          }}
        >
          {isSaving ? (
            <>
              <CircularProgress size={20} sx={{ marginRight: 1, color: theme.palette.textCustom.inverse }} />
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

export default ExploreReorderModal;
