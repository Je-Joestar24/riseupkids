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
 * Sortable Course Item Component
 */
const SortableCourseItem = ({ course, isDragging }) => {
  const theme = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: itemIsDragging,
  } = useSortable({ id: course._id });

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
          {course.title}
        </Typography>
        {course.description && (
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
            {course.description}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const sortCoursesByOrder = (courseList) => {
  return [...courseList].sort((a, b) => {
    if (a.stepOrder !== null && a.stepOrder !== undefined && b.stepOrder !== null && b.stepOrder !== undefined) {
      return a.stepOrder - b.stepOrder;
    }
    if (a.stepOrder !== null && a.stepOrder !== undefined) return -1;
    if (b.stepOrder !== null && b.stepOrder !== undefined) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * Course Organizer Modal Component
 *
 * Modal for reordering courses with drag-and-drop functionality.
 * Loads all modules via a lightweight API (no pagination).
 */
const CourseOrganizerModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { reorderCoursesData, fetchCoursesForReorder } = useCourse();
  const [courses, setCourses] = useState([]);
  const [originalCourses, setOriginalCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const loadRequestRef = useRef(0);

  useEffect(() => {
    if (!open) {
      loadRequestRef.current += 1;
      setCourses([]);
      setOriginalCourses([]);
      setActiveId(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++loadRequestRef.current;
    setIsLoading(true);

    fetchCoursesForReorder()
      .then((data) => {
        if (requestId !== loadRequestRef.current) return;
        const sorted = sortCoursesByOrder(data);
        setCourses(sorted);
        setOriginalCourses(sorted);
      })
      .catch(() => {
        if (requestId !== loadRequestRef.current) return;
        setCourses([]);
        setOriginalCourses([]);
      })
      .finally(() => {
        if (requestId !== loadRequestRef.current) return;
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      setCourses((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (courses.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const courseIds = courses.map((course) => course._id);
      await reorderCoursesData(courseIds, 0);
      onClose();
    } catch (error) {
      console.error('Error reordering courses:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCourses(originalCourses);
    onClose();
  };

  const activeCourse = activeId ? courses.find((c) => c._id === activeId) : null;

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
          variant="h5"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.5rem',
          }}
        >
          Reorder Modules
        </Typography>
        <IconButton
          onClick={handleCancel}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: `${theme.palette.error.main}20`,
              color: theme.palette.error.main,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginBottom: 2,
          }}
        >
          Drag and drop courses to reorder them. Click "Save Order" when done.
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : courses.length === 0 ? (
          <Box sx={{ textAlign: 'center', padding: 4 }}>
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.text.secondary,
              }}
            >
              No courses to reorder
            </Typography>
          </Box>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={courses.map((c) => c._id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1.5}>
                {courses.map((course) => (
                  <SortableCourseItem key={course._id} course={course} />
                ))}
              </Stack>
            </SortableContext>
            <DragOverlay>
              {activeCourse ? (
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
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }}
                    >
                      {activeCourse.title}
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
          disabled={isSaving || isLoading}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            paddingX: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving || isLoading || courses.length === 0}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            paddingX: 3,
            backgroundColor: theme.palette.orange.main,
            '&:hover': {
              backgroundColor: theme.palette.orange.dark,
            },
          }}
        >
          {isSaving ? (
            <>
              <CircularProgress size={20} sx={{ marginRight: 1 }} />
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

export default CourseOrganizerModal;
