import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ChildModuleCards from './ChildModuleCards';

/**
 * ChildModuleLibrary Component
 * 
 * Library section displaying books from the course in a 3-column grid
 */
const ChildModuleLibrary = ({ books = [], courseProgress = null, onBookClick }) => {
  // Get completed book IDs from progress
  const getCompletedBooks = () => {
    const completedBooks = new Set();
    if (courseProgress?.progress?.contentProgress) {
      courseProgress.progress.contentProgress
        .filter((item) => item.contentType === 'book' && item.status === 'completed')
        .forEach((item) => {
          const key = `${item.contentId.toString()}-${item.contentType}`;
          completedBooks.add(key);
        });
    }
    return completedBooks;
  };

  const completedBooks = getCompletedBooks();

  // Calculate progress circles for each book (0-5)
  const getBookProgress = (book) => {
    // Use _contentId or _id from populated book data
    const bookId = book._contentId || book._id || book.contentId;
    if (!bookId) return 0;
    
    // For now, if completed, show all 5 circles filled
    // In the future, this can be based on reading progress (pages read, etc.)
    const key = `${bookId.toString()}-book`;
    if (completedBooks.has(key)) {
      return 5; // All circles filled if completed
    }
    
    // You can implement more granular progress tracking here
    // For example: pages read / total pages * 5
    return 0;
  };

  // Check if book is completed
  const isBookCompleted = (book) => {
    // Use _contentId or _id from populated book data
    const bookId = book._contentId || book._id || book.contentId;
    if (!bookId) return false;
    const key = `${bookId.toString()}-book`;
    return completedBooks.has(key);
  };

  if (!books || books.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          marginTop: '32px',
        }}
      >
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            textAlign: 'center',
            padding: '32px',
          }}
        >
          No books available in this course.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        marginTop: '32px',
      }}
    >
      {/* Section Title */}
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: 600,
          color: themeColors.textInverse,
          marginBottom: '24px',
        }}
      >
        Library
      </Typography>

      {/* Books Grid - 3 columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: '24px',
        }}
      >
        {books.map((book, index) => {
          // Book is already populated with full data from API
          const bookId = book._id || book._contentId || book.contentId || book.id;
          
          return (
            <ChildModuleCards
              key={bookId || index}
              book={book}
              isCompleted={isBookCompleted(book)}
              progressCircles={getBookProgress(book)}
              onCardClick={() => {
                if (onBookClick) {
                  onBookClick(book);
                }
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ChildModuleLibrary;
