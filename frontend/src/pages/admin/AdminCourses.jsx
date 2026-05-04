import React, { useState } from 'react';
import { Box } from '@mui/material';
import CourseList from '../../components/admin/courses/course/CourseList';
import CourseAddModal from '../../components/admin/courses/course/CourseAddModal';
import CourseContentDrawer from '../../components/admin/courses/course/CourseContentDrawer';
import CourseOrganizerModal from '../../components/admin/courses/course/CourseOrganizerModal';
import CmsBooksModalTest from '../../components/admin/common/CmsBooksModalTest';
import { useCourse } from '../../hooks/courseHook';
import useCmsBookPlayer from '../../hooks/cmsBookPlayer';
import cmsBookAdminService from '../../services/cmsBookAdminService';
import { BOOK_PACKAGE_TYPES, CONTENT_TYPES } from '../../services/contentService';

/**
 * AdminCourses Page
 *
 * Main page for managing course/content collections
 * Displays course list with filters, pagination, and add functionality
 */
const AdminCourses = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [contentCreatedTrigger, setContentCreatedTrigger] = useState(0);
  const [createdContentData, setCreatedContentData] = useState(null);
  const [cmsTestModalOpen, setCmsTestModalOpen] = useState(false);
  const [cmsTestPages, setCmsTestPages] = useState([]);
  const [cmsTestingBookId, setCmsTestingBookId] = useState('');
  const { contentDrawer, closeDrawer, fetchCourses, filters, courses } = useCourse();
  const {
    loadPlayableBookById,
    preloadBookMedia,
    clearPreloadState,
    preloadProgress,
    preloadSummary,
    loading: cmsPlayerLoading,
  } = useCmsBookPlayer();

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

  const handleReorderClick = () => {
    setReorderModalOpen(true);
  };

  const handleReorderModalClose = () => {
    setReorderModalOpen(false);
  };

  const handleContentCreated = async (createdContent, contentType) => {
    // Increment trigger to notify CourseAddModal that content was created
    // This will cause ContentSelector to refresh
    setContentCreatedTrigger((prev) => prev + 1);
    // Store created content data to pass to CourseAddModal
    if (createdContent) {
      setCreatedContentData({ content: createdContent, contentType });
    }

    // If newly created content is a built-in book, open CMS tester modal right away.
    if (contentType === CONTENT_TYPES.BOOK && createdContent?.packageType === BOOK_PACKAGE_TYPES.BUILTIN) {
      try {
        const cmsBookId =
          (typeof createdContent.cmsBookId === 'string' && createdContent.cmsBookId) ||
          createdContent.cmsBookId?._id;
        if (!cmsBookId) return;
        setCmsTestingBookId(cmsBookId);
        clearPreloadState();
        let pages = [];
        try {
          const playableResponse = await loadPlayableBookById(cmsBookId);
          pages = Array.isArray(playableResponse?.data?.pages) ? playableResponse.data.pages : [];
        } catch (_playableError) {
          // Fallback to admin endpoint when player endpoint is unavailable.
          const response = await cmsBookAdminService.getBookById(cmsBookId);
          pages = Array.isArray(response?.data?.pages) ? response.data.pages : [];
        }

        setCmsTestPages(pages);
        setCmsTestModalOpen(true);
        if (pages.length > 0) {
          await preloadBookMedia({ bookId: cmsBookId, pages });
        }
      } catch (error) {
        console.error('Failed to load built-in CMS book test payload:', error);
      } finally {
        setCmsTestingBookId('');
      }
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
      <CourseList onAddClick={handleAddClick} onReorderClick={handleReorderClick} />
      
      {/* Add Module Modal */}
      <CourseAddModal
        open={addModalOpen}
        onClose={handleAddModalClose}
        onSuccess={handleAddSuccess}
        contentCreatedTrigger={contentCreatedTrigger}
        createdContentData={createdContentData}
        onCreatedContentProcessed={() => setCreatedContentData(null)}
      />

      {/* Reorder Modules Modal */}
      <CourseOrganizerModal
        open={reorderModalOpen}
        onClose={handleReorderModalClose}
        courses={courses}
      />

      {/* Content Creation Drawer - Managed by Redux */}
      <CourseContentDrawer
        open={contentDrawer?.open || false}
        onClose={closeDrawer}
        contentType={contentDrawer?.contentType || null}
        onContentCreated={handleContentCreated}
      />

      <CmsBooksModalTest
        open={cmsTestModalOpen}
        onClose={() => {
          setCmsTestModalOpen(false);
          setCmsTestPages([]);
          setCmsTestingBookId('');
          clearPreloadState();
        }}
        pages={cmsTestPages}
        isPreloading={Boolean(cmsPlayerLoading?.preload)}
        preloadProgress={preloadProgress}
        preloadSummary={preloadSummary}
      />
    </Box>
  );
};

export default AdminCourses;

