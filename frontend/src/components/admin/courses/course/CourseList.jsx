import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useCourse from '../../../../hooks/courseHook';
import CourseFilters from './CourseFilters';
import CourseHeader from './CourseHeader';
import CoursePagination from './CoursePagination';
import CourseCard from './CourseCard';
import CourseAddModal from './CourseAddModal';

/**
 * CourseList Component
 *
 * Main component for displaying courses/content collections list
 * Includes filters, header, pagination, and course items display
 */
const CourseList = ({ onAddClick }) => {
  const theme = useTheme();
  const { courses, loading, error, fetchCourses, filters, archiveCourseData, unarchiveCourseData } = useCourse();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [courseToArchive, setCourseToArchive] = useState(null);
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
      <CourseHeader onAddClick={onAddClick} />

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
            No courses found
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
              : 'Create your first course collection to get started'}
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
                    setCourseToArchive(course);
                    setArchiveDialogOpen(true);
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

      {/* Archive/Unarchive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '12px',
            fontFamily: 'Quicksand, sans-serif',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
          }}
        >
          {courseToArchive?.isArchived ? 'Restore Course?' : 'Archive Course?'}
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            {courseToArchive?.isArchived
              ? `Are you sure you want to restore "${courseToArchive?.title}"? It will be visible again in the course list.`
              : `Are you sure you want to archive "${courseToArchive?.title}"? It will be hidden from the course list but can be restored later.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setArchiveDialogOpen(false)}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (courseToArchive) {
                try {
                  if (courseToArchive.isArchived) {
                    await unarchiveCourseData(courseToArchive._id);
                  } else {
                    await archiveCourseData(courseToArchive._id);
                  }
                  setArchiveDialogOpen(false);
                  setCourseToArchive(null);
                  // Refresh courses list
                  fetchCourses();
                } catch (error) {
                  console.error('Error archiving/unarchiving course:', error);
                }
              }
            }}
            color={courseToArchive?.isArchived ? 'success' : 'warning'}
            variant="contained"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
            }}
          >
            {courseToArchive?.isArchived ? 'Restore' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>


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

