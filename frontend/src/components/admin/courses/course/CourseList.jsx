import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDispatch } from 'react-redux';
import useCourse from '../../../../hooks/courseHook';
import CourseFilters from './CourseFilters';
import CourseHeader from './CourseHeader';
import CoursePagination from './CoursePagination';
import CourseCard from './CourseCard';
import CourseAddModal from './CourseAddModal';
import { showConfirmationDialog } from '../../../../store/slices/uiSlice';

/**
 * CourseList Component
 *
 * Main component for displaying courses/content collections list
 * Includes filters, header, pagination, and course items display
 */
const CourseList = ({ onAddClick, onReorderClick }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { courses, loading, error, fetchCourses, filters, archiveCourseData, unarchiveCourseData, deleteCourseData } = useCourse();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch courses when filters change
  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.isPublished, filters.isArchived, filters.page, filters.limit]);

  return (
    <Box>
      {/* Header */}
      <CourseHeader onAddClick={onAddClick} onReorderClick={onReorderClick} />

      {/* Filters - Always visible */}
      <CourseFilters />

      {/* Error Message */}
      {error && (
        <Paper
          sx={{
            padding: 2,
            marginBottom: 2,
            backgroundColor: theme.palette.error.light,
            color: theme.palette.error.contrastText,
            borderRadius: '8px',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            Error: {error}
          </Typography>
        </Paper>
      )}

      {/* Loading State - Only show when no courses exist */}
      {loading && courses.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Course Items Display */}
      {!loading && courses.length === 0 ? (
        <Paper
          sx={{
            padding: 4,
            textAlign: 'center',
            borderRadius: '12px',
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.border.main}`,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            No modules found
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
              marginTop: 1,
            }}
          >
            {filters.search || filters.isPublished !== undefined
              ? 'Try adjusting your filters'
              : 'Create your first Module to get started'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ position: 'relative' }}>
          {loading && courses.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
                borderRadius: '12px',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <Grid container spacing={3} sx={{ marginTop: 1 }}>
            {courses.map((course) => (
              <Grid item key={course._id} xs={12} sm={6} md={4} lg={3}>
                <CourseCard
                  course={course}
                  onEdit={(course) => {
                    setCourseToEdit(course);
                    setEditModalOpen(true);
                  }}
                  onArchive={(course) => {
                    if (course?.isArchived) {
                      // Keep restore as a direct action for quick recovery
                      unarchiveCourseData(course._id)
                        .then(() => fetchCourses())
                        .catch((error) => console.error('Error unarchiving course:', error));
                      return;
                    }
                    dispatch(
                      showConfirmationDialog({
                        title: 'Archive Course?',
                        message: `Are you sure you want to archive "${course?.title || 'this course'}"? You can restore it later.`,
                        type: 'warning',
                        confirmText: 'Archive',
                        cancelText: 'Cancel',
                        onConfirm: async () => {
                          try {
                            await archiveCourseData(course._id);
                            fetchCourses();
                          } catch (error) {
                            console.error('Error archiving course:', error);
                          }
                        },
                      })
                    );
                  }}
                  onDeletePermanent={(course) => {
                    dispatch(
                      showConfirmationDialog({
                        title: 'Delete Permanently?',
                        message: `This will permanently delete "${course?.title || 'this course'}" and cannot be undone. Continue?`,
                        type: 'error',
                        confirmText: 'Delete',
                        cancelText: 'Cancel',
                        onConfirm: async () => {
                          try {
                            await deleteCourseData(course._id);
                            fetchCourses();
                          } catch (error) {
                            console.error('Error deleting course permanently:', error);
                          }
                        },
                      })
                    );
                  }}
                  onView={(course) => {
                    // TODO: Implement view functionality
                    console.log('View course:', course);
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Edit Course Modal */}
      <CourseAddModal
        open={editModalOpen}
        mode="edit"
        courseId={courseToEdit?._id}
        course={courseToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setCourseToEdit(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setCourseToEdit(null);
          // Refresh courses list
          fetchCourses();
        }}
      />

      {/* Pagination - Always visible */}
      <CoursePagination />
    </Box>
  );
};

export default CourseList;

