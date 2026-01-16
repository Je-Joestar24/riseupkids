import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import ExploreHeader from '../../components/admin/courses/explore/ExploreHeader';
import ExploreFilters from '../../components/admin/courses/explore/ExploreFilters';
import ExploreCards from '../../components/admin/courses/explore/ExploreCards';
import ExplorePagination from '../../components/admin/courses/explore/ExplorePagination';
import { useExplore } from '../../hooks/exploreHook';

/**
 * AdminExplore Page
 *
 * Main page for managing explore content
 * Displays explore content list with filters, pagination, and management functionality
 */
const AdminExplore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchExploreContent, filters, updateFilters } = useExplore();

  // Initialize filters from URL params on mount and when URL changes
  useEffect(() => {
    // Default to 'replay' when videoType is empty
    const videoType = searchParams.get('videoType') || 'replay';
    
    const urlFilters = {
      type: 'video', // Always video, not tracked in URL
      videoType: videoType, // Default to 'replay' when empty
      search: searchParams.get('search') || undefined,
      isPublished: searchParams.get('isPublished') ? searchParams.get('isPublished') === 'true' : undefined,
      isFeatured: searchParams.get('isFeatured') ? searchParams.get('isFeatured') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '10', 10),
    };
    
    // Only update if filters have actually changed to avoid infinite loops
    const filtersChanged = 
      filters.videoType !== urlFilters.videoType ||
      filters.search !== urlFilters.search ||
      filters.isPublished !== urlFilters.isPublished ||
      filters.isFeatured !== urlFilters.isFeatured ||
      filters.page !== urlFilters.page ||
      filters.limit !== urlFilters.limit;
    
    if (filtersChanged) {
      updateFilters(urlFilters);
      fetchExploreContent(urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch explore content when filters change
  useEffect(() => {
    fetchExploreContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.type,
    filters.videoType,
    filters.isPublished,
    filters.isFeatured,
    filters.page,
    filters.limit,
  ]);

  return (
    <Box
      sx={{
        padding: 3,
        minHeight: '100vh',
        backgroundColor: 'transparent',
      }}
    >
      {/* Header */}
      <ExploreHeader />

      {/* Filters */}
      <ExploreFilters />

      {/* Cards */}
      <ExploreCards />

      {/* Pagination */}
      <ExplorePagination />
    </Box>
  );
};

export default AdminExplore;
