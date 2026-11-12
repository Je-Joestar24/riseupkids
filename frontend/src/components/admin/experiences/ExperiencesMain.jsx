import React, { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import useExperienceAdmin from '../../../hooks/experienceAdminHook';
import { showConfirmationDialog } from '../../../store/slices/uiSlice';
import { EXPERIENCE_STATUS } from '../../../services/experienceAdminService';
import ExperiencesHeader from './ExperiencesHeader';
import ExperiencesFilters from './ExperiencesFilters';
import ExperiencesList from './ExperiencesList';
import ExperiencesPagination from './ExperiencesPagination';

/**
 * The admin Experiences page: header, search and status filters, the list, and the pagination.
 * It loads the list whenever a filter or the page changes, and asks before deleting.
 */
const ExperiencesMain = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    items,
    pagination,
    counts,
    filters,
    loaded,
    loading,
    error,
    busy,
    loadExperiences,
    reload,
    updateFilters,
    clearFilters,
    setPublished,
    remove,
  } = useExperienceAdmin();

  useEffect(() => {
    loadExperiences(filters);
    // The list is read again when one of these changes, not when the filters object is merely re-made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadExperiences, filters.status, filters.search, filters.page, filters.limit]);

  // A page that no longer exists (the last row of the last page was deleted, or an old bookmark): go to the last real page.
  useEffect(() => {
    if (loaded && !loading && items.length === 0 && pagination && pagination.total > 0 && filters.page > 1) {
      updateFilters({ page: Math.max(1, pagination.pages || 1) });
    }
  }, [loaded, loading, items.length, pagination, filters.page, updateFilters]);

  const handleSearchChange = useCallback((text) => updateFilters({ search: text }), [updateFilters]);
  const handleStatusChange = useCallback((status) => updateFilters({ status }), [updateFilters]);
  const handlePageChange = useCallback((page) => updateFilters({ page }), [updateFilters]);
  const handleLimitChange = useCallback((limit) => updateFilters({ limit, page: 1 }), [updateFilters]);

  const handleAdd = useCallback(() => navigate('/admin/experiences/create'), [navigate]);
  const handleEdit = useCallback((experience) => navigate(`/admin/experiences/${encodeURIComponent(experience.uuid)}/edit`), [navigate]);

  const handleDelete = useCallback(
    (experience) => {
      const title = experience?.title || 'this experience';
      const visibleNote = experience?.isPublished ? ' It is visible to children now, so they will stop seeing it.' : '';
      dispatch(
        showConfirmationDialog({
          title: 'Delete experience?',
          message: `This will permanently delete "${title}" and its pictures.${visibleNote} The videos stay in Bunny.`,
          type: 'error',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          onConfirm: () => remove(experience),
        })
      );
    },
    [dispatch, remove]
  );

  const hasFilters = filters.search !== '' || filters.status !== EXPERIENCE_STATUS.ALL;

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <ExperiencesHeader total={counts.all} loaded={loaded} onAdd={handleAdd} />
      <ExperiencesFilters
        search={filters.search}
        status={filters.status}
        counts={counts}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
      />
      <ExperiencesList
        items={items}
        loaded={loaded}
        loading={loading}
        error={error}
        hasFilters={hasFilters}
        totalExperiences={counts.all}
        busy={busy}
        onRetry={reload}
        onClearFilters={clearFilters}
        onTogglePublished={setPublished}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <ExperiencesPagination pagination={pagination} onPageChange={handlePageChange} onLimitChange={handleLimitChange} />
    </Box>
  );
};

export default ExperiencesMain;
