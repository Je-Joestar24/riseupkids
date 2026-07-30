import React, { useCallback, useEffect, useState } from 'react';
import { Box, Paper, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDispatch } from 'react-redux';
import { showNotification } from '../../store/slices/uiSlice';
import moduleAccessService from '../../services/moduleAccessService';
import ModuleAccessHeader from '../../components/admin/moduleAccess/ModuleAccessHeader';
import ModuleAccessFilters from '../../components/admin/moduleAccess/ModuleAccessFilters';
import ModuleAccessChildrenTable from '../../components/admin/moduleAccess/ModuleAccessChildrenTable';
import ModuleAccessChildDetailDrawer from '../../components/admin/moduleAccess/ModuleAccessChildDetailDrawer';
import ModuleAccessPagination from '../../components/admin/moduleAccess/ModuleAccessPagination';

/**
 * Admin Module Access — lock/unlock journey modules per child.
 */
const AdminModuleAccess = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', hasOverride: false, page: 1, limit: 10 });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [modules, setModules] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyCourseId, setBusyCourseId] = useState(null);

  const fetchChildren = useCallback(
    async (queryParams = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = { ...filters, ...queryParams };
        const response = await moduleAccessService.listChildren(params);
        setChildren(response.data || []);
        setPagination(
          response.pagination || {
            page: params.page,
            limit: params.limit,
            total: response.data?.length || 0,
            pages: 1,
          }
        );
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Failed to load children';
        setError(message);
        dispatch(showNotification({ message, type: 'error' }));
      } finally {
        setLoading(false);
      }
    },
    [dispatch, filters]
  );

  useEffect(() => {
    fetchChildren();
  }, [filters.page, filters.search, filters.hasOverride, filters.limit]);

  const loadDetail = async (child) => {
    setSelectedChild(child);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const response = await moduleAccessService.getChildDetail(child._id);
      setSelectedChild(response.data?.child || child);
      setModules(response.data?.modules || []);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load modules';
      dispatch(showNotification({ message, type: 'error' }));
    } finally {
      setDetailLoading(false);
    }
  };

  const applyDetailResponse = (response, successMessage) => {
    setSelectedChild(response.data?.child || selectedChild);
    setModules(response.data?.modules || []);
    dispatch(showNotification({ message: successMessage, type: 'success' }));
    fetchChildren();
  };

  const handleUnlock = async (childId, courseId, note) => {
    setBusyCourseId(courseId);
    try {
      const response = await moduleAccessService.unlockModule(childId, courseId, note);
      applyDetailResponse(response, 'Module unlocked');
    } catch (err) {
      dispatch(
        showNotification({
          message: err.response?.data?.message || err.message || 'Unlock failed',
          type: 'error',
        })
      );
    } finally {
      setBusyCourseId(null);
    }
  };

  const handleLock = async (childId, courseId, note) => {
    setBusyCourseId(courseId);
    try {
      const response = await moduleAccessService.lockModule(childId, courseId, note);
      applyDetailResponse(response, 'Module locked');
    } catch (err) {
      dispatch(
        showNotification({
          message: err.response?.data?.message || err.message || 'Lock failed',
          type: 'error',
        })
      );
    } finally {
      setBusyCourseId(null);
    }
  };

  const handleClear = async (childId, courseId, note) => {
    setBusyCourseId(courseId);
    try {
      const response = await moduleAccessService.clearOverride(childId, courseId, note);
      applyDetailResponse(response, 'Override cleared');
    } catch (err) {
      dispatch(
        showNotification({
          message: err.response?.data?.message || err.message || 'Clear failed',
          type: 'error',
        })
      );
    } finally {
      setBusyCourseId(null);
    }
  };

  return (
    <Box>
      <Paper
        sx={{
          padding: 3.5,
          marginBottom: 3,
          marginTop: 2,
          borderRadius: '16px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border?.main || theme.palette.divider}`,
          boxShadow: theme.shadows[2],
        }}
      >
        <ModuleAccessHeader />
        <ModuleAccessFilters
          search={filters.search}
          hasOverride={filters.hasOverride}
          onSearch={(search) => setFilters((prev) => ({ ...prev, search, page: 1 }))}
          onHasOverrideChange={(hasOverride) =>
            setFilters((prev) => ({ ...prev, hasOverride, page: 1 }))
          }
        />
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <ModuleAccessChildrenTable
          rows={children}
          loading={loading}
          onManage={loadDetail}
        />
        <ModuleAccessPagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </Paper>

      <ModuleAccessChildDetailDrawer
        open={drawerOpen}
        child={selectedChild}
        modules={modules}
        loading={detailLoading}
        busyCourseId={busyCourseId}
        onClose={() => setDrawerOpen(false)}
        onUnlock={handleUnlock}
        onLock={handleLock}
        onClearOverride={handleClear}
      />
    </Box>
  );
};

export default AdminModuleAccess;
