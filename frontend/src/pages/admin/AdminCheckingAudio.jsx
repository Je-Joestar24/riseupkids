import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import audioAssignmentProgressService from '../../services/audioAssignmentProgressService';
import { showNotification } from '../../store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import CheckingAudioHeader from '../../components/admin/checking/CheckingAudioHeader';
import CheckingAudioSearch from '../../components/admin/checking/CheckingAudioSearch';
import CheckingAudioTable from '../../components/admin/checking/CheckingAudioTable';
import CheckingAudioPagination from '../../components/admin/checking/CheckingAudioPagination';

/**
 * AdminCheckingAudio Page
 * 
 * Display submitted audio assignments for admin/teacher review
 * Allows filtering, searching, and pagination
 */
const AdminCheckingAudio = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  // State
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '', // 'submitted', 'approved', 'rejected', or empty for all
    page: 1,
    limit: 10,
  });

  /**
   * Fetch submissions from API
   */
  const fetchSubmissions = async (queryParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        ...filters,
        ...queryParams,
      };

      const response = await audioAssignmentProgressService.listSubmissions(params);

      setSubmissions(response.data || []);
      setPagination(response.pagination || {
        page: params.page,
        limit: params.limit,
        total: response.data?.length || 0,
        pages: Math.ceil((response.data?.length || 0) / params.limit),
      });

      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch submissions';
      setError(errorMessage);
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle search input change
   */
  const handleSearch = (searchValue) => {
    setFilters(prev => ({
      ...prev,
      search: searchValue,
      page: 1, // Reset to first page
    }));
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilter = (status) => {
    setFilters(prev => ({
      ...prev,
      status,
      page: 1,
    }));
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  /**
   * Handle limit change
   */
  const handleLimitChange = (newLimit) => {
    setFilters(prev => ({
      ...prev,
      limit: newLimit,
      page: 1,
    }));
  };

  /**
   * Handle review action (approve/reject)
   */
  const handleReview = async (audioAssignmentId, childId, decision, feedback = '') => {
    try {
      await audioAssignmentProgressService.review(audioAssignmentId, childId, {
        decision,
        feedback,
      });

      dispatch(showNotification({
        message: `Submission ${decision} successfully!`,
        type: 'success',
      }));

      // Refresh submissions
      await fetchSubmissions();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to review submission';
      dispatch(showNotification({
        message: errorMessage,
        type: 'error',
      }));
    }
  };

  /**
   * Effect: Fetch submissions when filters change
   */
  useEffect(() => {
    fetchSubmissions();
  }, [filters]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        p: 3,
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <CheckingAudioHeader />

      {/* Search and Filters */}
      <CheckingAudioSearch
        onSearch={handleSearch}
        onStatusFilterChange={handleStatusFilter}
        currentSearch={filters.search}
        currentStatus={filters.status}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper
        sx={{
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
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
        ) : submissions.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Alert severity="info">
              No audio submissions found. Try adjusting your filters or search terms.
            </Alert>
          </Box>
        ) : (
          <CheckingAudioTable
            submissions={submissions}
            loading={loading}
            onReview={handleReview}
          />
        )}
      </Paper>

      {/* Pagination */}
      {submissions.length > 0 && (
        <CheckingAudioPagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}
    </Box>
  );
};

export default AdminCheckingAudio;
