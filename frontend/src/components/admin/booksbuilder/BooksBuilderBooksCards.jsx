import React from 'react';
import { Box, CircularProgress, Grid, Paper, Typography } from '@mui/material';
import BooksBuilderCard from './BooksBuilderCard';
import { useAuth } from '../../../hooks/userHook';
import { canManageContent } from '../../../utils/contentOwnership';

const BooksBuilderBooksCards = ({
  books = [],
  loading = false,
  onTestBook,
  onEditBook,
  onDeleteBook,
  testingBookId = '',
  editingBookId = '',
  deletingBookId = '',
}) => {
  const { user } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!books.length) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
        <Typography variant="h6" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
          No built-in books found
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'Quicksand, sans-serif', color: 'text.secondary', mt: 1 }}>
          Once books are created, they will appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {books.map((book) => (
        <Grid key={book._id} item xs={12} sm={6} md={4} lg={3}>
          <BooksBuilderCard
            book={book}
            onTest={onTestBook}
            onEdit={onEditBook}
            onDelete={onDeleteBook}
            canManage={canManageContent(book, user)}
            isTesting={Boolean(testingBookId && (book?._id === testingBookId || book?.id === testingBookId))}
            isEditing={Boolean(editingBookId && (book?._id === editingBookId || book?.id === editingBookId))}
            isDeleting={Boolean(deletingBookId && (book?._id === deletingBookId || book?.id === deletingBookId))}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default BooksBuilderBooksCards;
