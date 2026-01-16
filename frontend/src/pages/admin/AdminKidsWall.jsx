import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import KidsWallHeader from '../../components/admin/kidsWall/KidsWallHeader';
import KidsWallFilters from '../../components/admin/kidsWall/KidsWallFilters';
import KidsWallTableList from '../../components/admin/kidsWall/KidsWallTableList';
import KidsWallPagination from '../../components/admin/kidsWall/KidsWallPagination';
import useKidsWall from '../../hooks/kidsWallHook';

/**
 * AdminKidsWall Page
 *
 * Main page for moderating KidsWall posts
 * Displays posts list with filters, pagination, and moderation functionality
 */
const AdminKidsWall = () => {
  const [searchParams] = useSearchParams();
  const { fetchPosts, updateFilters } = useKidsWall();
  const lastSearchParamsRef = useRef('');

  // Initialize filters from URL params on mount and when URL changes
  useEffect(() => {
    // Ensure hook functions are available
    if (!fetchPosts || !updateFilters) {
      return;
    }

    // Create a string representation of current search params to compare
    const currentParams = searchParams.toString();
    
    // Only proceed if params actually changed (prevents infinite loops)
    if (currentParams === lastSearchParamsRef.current) {
      return;
    }
    
    lastSearchParamsRef.current = currentParams;

    // Default to 'pending' when isApproved is empty
    const isApproved = searchParams.get('isApproved') || 'pending';
    
    const urlFilters = {
      isApproved: isApproved === 'pending' ? 'pending' : isApproved === 'true' ? 'true' : isApproved === 'false' ? 'false' : undefined,
      childName: searchParams.get('childName') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '5', 10),
    };
    
    // Update filters and fetch posts
    updateFilters(urlFilters);
    fetchPosts(urlFilters).catch((error) => {
      console.error('Error fetching posts:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Box
      sx={{
        padding: 3,
        minHeight: '100vh',
        backgroundColor: 'transparent',
      }}
    >
      {/* Header */}
      <KidsWallHeader />

      {/* Filters */}
      <KidsWallFilters />

      {/* Table List */}
      <KidsWallTableList />

      {/* Pagination */}
      <KidsWallPagination />
    </Box>
  );
};

export default AdminKidsWall;
