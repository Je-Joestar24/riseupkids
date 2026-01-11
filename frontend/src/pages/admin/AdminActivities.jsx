import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import ContentHeader from '../../components/admin/courses/activity/ContentHeader';
import ContentFilters from '../../components/admin/courses/activity/ContentFilters';
import ContentItems from '../../components/admin/courses/activity/ContentItems';
import ContentPagination from '../../components/admin/courses/activity/ContentPagination';
import ContentAddModal from '../../components/admin/courses/activity/ContentAddModal';
import useContent from '../../hooks/contentHook';
import { CONTENT_TYPES } from '../../services/contentService';

/**
 * AdminActivities Page (Contents)
 * 
 * Main page for managing all content types (activities, books, videos, audio, chants)
 * Supports URL persistence: /admin/courses/contents?type=books
 */
const AdminActivities = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchContents, loading, pagination, filters, setContentTypeFilter } = useContent();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Map URL type parameter to CONTENT_TYPES
  const getContentTypeFromUrl = (typeParam) => {
    const typeMap = {
      'activity': CONTENT_TYPES.ACTIVITY,
      'activities': CONTENT_TYPES.ACTIVITY,
      'book': CONTENT_TYPES.BOOK,
      'books': CONTENT_TYPES.BOOK,
      'video': CONTENT_TYPES.VIDEO,
      'videos': CONTENT_TYPES.VIDEO,
      'audio': CONTENT_TYPES.AUDIO_ASSIGNMENT,
      'audioAssignment': CONTENT_TYPES.AUDIO_ASSIGNMENT,
      'audio-assignment': CONTENT_TYPES.AUDIO_ASSIGNMENT,
      'chant': CONTENT_TYPES.CHANT,
      'chants': CONTENT_TYPES.CHANT,
    };
    return typeMap[typeParam?.toLowerCase()] || CONTENT_TYPES.ACTIVITY;
  };

  // Map CONTENT_TYPES to URL type parameter
  const getUrlTypeFromContentType = (contentType) => {
    const urlMap = {
      [CONTENT_TYPES.ACTIVITY]: 'activities',
      [CONTENT_TYPES.BOOK]: 'books',
      [CONTENT_TYPES.VIDEO]: 'videos',
      [CONTENT_TYPES.AUDIO_ASSIGNMENT]: 'audio',
      [CONTENT_TYPES.CHANT]: 'chants',
    };
    return urlMap[contentType] || 'activities';
  };

  // Initialize content type from URL on mount
  useEffect(() => {
    if (!isInitialized) {
      const urlType = searchParams.get('type');
      if (urlType) {
        const contentType = getContentTypeFromUrl(urlType);
        setContentTypeFilter(contentType);
      }
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch contents (default to activities) on component mount and when filters change
  useEffect(() => {
    if (isInitialized) {
      fetchContents(filters.contentType || CONTENT_TYPES.ACTIVITY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.contentType, filters.isPublished, filters.isArchived, filters.search, filters.page, filters.limit, isInitialized]);

  const handleAddClick = () => {
    setAddModalOpen(true);
  };

  const handleModalClose = () => {
    setAddModalOpen(false);
  };

  const handleContentCreated = () => {
    setAddModalOpen(false);
    fetchContents(filters.contentType || CONTENT_TYPES.ACTIVITY);
  };

  const handleRefresh = () => {
    fetchContents(filters.contentType || CONTENT_TYPES.ACTIVITY);
  };

  return (
    <Box>
      {/* Header Section */}
      <ContentHeader onAddClick={handleAddClick} />

      {/* Filters Section */}
      <ContentFilters />

      {/* Contents List */}
      <ContentItems loading={loading} onRefresh={handleRefresh} />

      {/* Pagination */}
      <ContentPagination />

      {/* Add Content Modal */}
      <ContentAddModal open={addModalOpen} onClose={handleModalClose} onSuccess={handleContentCreated} />
    </Box>
  );
};

export default AdminActivities;

