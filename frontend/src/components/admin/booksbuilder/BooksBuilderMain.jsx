import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BooksBuilderHeader from './BooksBuilderHeader';
import BooksBuilderBooksCards from './BooksBuilderBooksCards';
import BooksBuilderPagination from './BooksBuilderPagination';
import useCmsBookAdmin from '../../../hooks/cmsBookAdminHook';

const BooksBuilderMain = () => {
  const navigate = useNavigate();
  const { books, pagination, loading, filters, loadBooks, updateFilters } = useCmsBookAdmin();
  const [searchInput, setSearchInput] = useState(filters?.search || '');

  useEffect(() => {
    const timeout = setTimeout(() => {
      if ((filters?.search || '') !== searchInput) {
        updateFilters({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, updateFilters, filters?.search]);

  useEffect(() => {
    loadBooks({
      page: filters.page,
      limit: filters.limit,
      search: filters.search || undefined,
      language: filters.language || undefined,
      includeArchived: false,
    });
  }, [loadBooks, filters.page, filters.limit, filters.search, filters.language]);

  const totalBooks = useMemo(() => pagination?.total || books.length || 0, [pagination?.total, books.length]);

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <BooksBuilderHeader
        totalBooks={totalBooks}
        onBuild={() => navigate('/admin/built-in-books/create')}
      />

      <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
        <TextField
          fullWidth
          size="small"
          label="Search built-in books"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title or description..."
        />
      </Paper>

      <BooksBuilderBooksCards books={books} loading={loading.list} />

      <BooksBuilderPagination
        pagination={pagination}
        onPageChange={(page) => updateFilters({ page })}
        onLimitChange={(limit) => updateFilters({ limit, page: 1 })}
      />
    </Box>
  );
};

export default BooksBuilderMain;
