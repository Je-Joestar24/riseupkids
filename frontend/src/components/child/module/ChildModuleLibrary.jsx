import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ChildModuleCards from './ChildModuleCards';
import { useCourseProgress } from '../../../hooks/courseProgressHook';
import { useParams } from 'react-router-dom';

/**
 * ChildModuleLibrary Component
 * 
 * Library section displaying books from the course in a 3-column grid
 */
const ChildModuleLibrary = ({ books = [], courseProgress = null, onBookClick }) => {
  const { id: childId } = useParams();
  const { getChildBookReadings } = useCourseProgress(childId);
  const [bookReadings, setBookReadings] = useState({}); // Map of bookId -> reading status
  const [loadingReadings, setLoadingReadings] = useState(false);

  // Fetch book reading statuses for all books
  const fetchBookReadings = async () => {
    if (!childId || !books || books.length === 0) {
      setBookReadings({});
      return;
    }

    setLoadingReadings(true);
    try {
      const readings = await getChildBookReadings();
      
      // Create a map of bookId -> reading status
      // Handle both string and ObjectId formats
      const readingMap = {};
      if (readings && Array.isArray(readings)) {
        readings.forEach((reading) => {
          if (reading.bookId) {
            // Normalize bookId to string for consistent matching
            const normalizedId = String(reading.bookId);
            readingMap[normalizedId] = reading;
          }
        });
      }
      
      setBookReadings(readingMap);
    } catch (error) {
      console.error('Error fetching book readings:', error);
      // Don't show error to user, just use empty map
      setBookReadings({});
    } finally {
      setLoadingReadings(false);
    }
  };

  useEffect(() => {
    fetchBookReadings();
  }, [childId, books?.length]); // Only refetch when childId or number of books changes

  // Refresh readings when courseProgress changes (e.g., after book is read)
  useEffect(() => {
    if (childId && books && books.length > 0) {
      // Small delay to ensure backend has updated
      const timeoutId = setTimeout(() => {
        fetchBookReadings();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [courseProgress]);

  // Calculate progress circles for each book (0-5)
  const getBookProgress = (book) => {
    // Use _contentId or _id from populated book data
    const bookId = book._contentId || book._id || book.contentId;
    if (!bookId) return 0;
    
    // Normalize bookId to string for consistent matching
    const normalizedId = String(bookId);
    
    // Get reading status for this book
    const readingStatus = bookReadings[normalizedId];
    if (!readingStatus) return 0;
    
    // Get current reading count and required reading count
    const currentReadingCount = readingStatus.currentReadingCount || 0;
    const requiredReadingCount = readingStatus.requiredReadingCount || 5; // Default to 5
    
    // Calculate how many circles to fill (max 5)
    // Each circle represents one reading, but cap at 5 circles
    const progressCircles = Math.min(currentReadingCount, 5);
    
    return progressCircles;
  };

  // Check if book is completed (stars awarded = read required count)
  // Use checkbox logic: if all 5 checkboxes are filled, stars were already awarded
  const isBookCompleted = (book) => {
    // Use checkbox logic - if all 5 checkboxes are filled, stars were already awarded
    const progressCircles = getBookProgress(book);
    const normalizedId = book._contentId || book._id || book.contentId;
    
    if (!normalizedId) return false;
    
    // Get reading status to check required reading count
    const readingStatus = bookReadings[String(normalizedId)];
    const requiredReadingCount = readingStatus?.requiredReadingCount || 5;
    
    // If all checkboxes are filled (progressCircles >= requiredReadingCount), stars were already awarded
    if (progressCircles >= requiredReadingCount) {
      return true;
    }
    
    // Fallback: check starsAwarded flag from API
    if (readingStatus && readingStatus.starsAwarded) {
      return true;
    }
    
    return false;
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
