import React, { useState } from 'react';
import { Box } from '@mui/material';
import CourseList from '../../components/admin/courses/course/CourseList';
import CourseAddModal from '../../components/admin/courses/course/CourseAddModal';
import CourseContentDrawer from '../../components/admin/courses/course/CourseContentDrawer';
import { useCourse } from '../../hooks/courseHook';

/**
 * AdminCourses Page
 *
 * Main page for managing course/content collections
 * Displays course list with filters, pagination, and add functionality
 */
const AdminCourses = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [contentCreatedTrigger, setContentCreatedTrigger] = useState(0);
  const [createdContentData, setCreatedContentData] = useState(null);
  const { contentDrawer, closeDrawer, fetchCourses, filters } = useCourse();

  const handleAddClick = () => {
    setAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setAddModalOpen(false);
  };

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    // Refresh course list
    fetchCourses(filters);
  };

  const handleContentCreated = (createdContent, contentType) => {
    // Increment trigger to notify CourseAddModal that content was created
    // This will cause ContentSelector to refresh
    setContentCreatedTrigger((prev) => prev + 1);
    // Store created content data to pass to CourseAddModal
    if (createdContent) {
      setCreatedContentData({ content: createdContent, contentType });
    }
  };

  return (
    <Box
      sx={{
        padding: 3,
        minHeight: '100vh',
        backgroundColor: 'transparent',
      }}
    >
      <CourseList onAddClick={handleAddClick} />
      
      {/* Add Course Modal */}
      <CourseAddModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddSuccess}
        contentCreatedTrigger={contentCreatedTrigger}
        createdContentData={createdContentData}
        onCreatedContentProcessed={() => setCreatedContentData(null)}
      />

      {/* Content Creation Drawer - Managed by Redux */}
      <CourseContentDrawer
        open={contentDrawer?.open || false}
        onClose={closeDrawer}
        contentType={contentDrawer?.contentType || null}
        onContentCreated={handleContentCreated}
      />
    </Box>
  );
};

export default AdminCourses;

