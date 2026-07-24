import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { themeColors } from '../../../config/themeColors';
import ChildModuleCards from './ChildModuleCards';
import { useCourseProgress } from '../../../hooks/courseProgressHook';
import { useParams } from 'react-router-dom';
import Html5Player from '../common/html5Player';
import CmsPlayer from '../common/cmsPLayer';
import CmsCompletionDialog from '../common/cmsCompletionDialog';
import useCmsBookPlayer from '../../../hooks/cmsBookPlayer';
import { completeHtml5Book } from '../common/html5CompletionHandler';
import { applyStarRewardFromCompletion } from '../../../utils/childStatsSync';

/**
 * ChildModuleLibrary Component
 * 
 * Library section displaying books from the course in a 3-column grid
 */
const ChildModuleLibrary = ({ books = [], courseProgress = null, onBookClick }) => {
  const { id: childId, courseId } = useParams();
  const dispatch = useDispatch();
  const { getChildBookReadings } = useCourseProgress(childId);
  const [bookReadings, setBookReadings] = useState({}); // Map of bookId -> reading status
  const [loadingReadings, setLoadingReadings] = useState(false);

  const [html5Open, setHtml5Open] = useState(false);
  const [selectedHtml5Book, setSelectedHtml5Book] = useState(null);
  const [cmsOpen, setCmsOpen] = useState(false);
  const [selectedCmsBook, setSelectedCmsBook] = useState(null);
  const [cmsPages, setCmsPages] = useState([]);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [cmsCompletionOpen, setCmsCompletionOpen] = useState(false);
  const [cmsCompletionData, setCmsCompletionData] = useState(null);
  const {
    loadPlayableBookById,
    preloadBookMedia,
    clearPreloadState,
    preloadProgress,
    preloadSummary,
    loading: cmsPlayerLoading,
  } = useCmsBookPlayer();

  const selectedBookId = useMemo(() => {
    if (!selectedHtml5Book) return null;
    return (
      selectedHtml5Book._contentId ||
      selectedHtml5Book._id ||
      selectedHtml5Book.contentId ||
      selectedHtml5Book.id ||
      null
    );
  }, [selectedHtml5Book]);

  const canOpenHtml5 = useCallback((book) => {
    if (!book) return false;
    return book.packageType === 'html5' && !!book.html5PackageId;
  }, []);

  const canOpenCmsBuiltin = useCallback((book) => {
    if (!book) return false;
    return (
      book.packageType === 'builtin'
      && Boolean(
        (typeof book.cmsBookId === 'string' && book.cmsBookId)
        || book.cmsBookId?._id
        || book.cmsBook?._id
      )
    );
  }, []);

  const handleOpenHtml5 = useCallback(
    (book) => {
      if (!canOpenHtml5(book)) return;
      setSelectedHtml5Book(book);
      setHtml5Open(true);
    },
    [canOpenHtml5]
  );

  const handleCloseHtml5 = useCallback(() => {
    setHtml5Open(false);
    setSelectedHtml5Book(null);
  }, []);

  const handleOpenCmsBuiltin = useCallback(async (book) => {
    if (!canOpenCmsBuiltin(book)) return;
    const cmsBookId =
      (typeof book.cmsBookId === 'string' && book.cmsBookId)
      || book.cmsBookId?._id
      || book.cmsBook?._id;
    if (!cmsBookId) return;

    try {
      clearPreloadState();
      const response = await loadPlayableBookById(cmsBookId);
      const playableBook = response?.data || null;
      const playablePages = Array.isArray(playableBook?.pages) ? playableBook.pages : [];
      setSelectedCmsBook(book);
      setCmsPages(playablePages);
      setSessionStartedAt(Date.now());

      const preloadPromise = playablePages.length > 0
        ? preloadBookMedia({ bookId: cmsBookId, pages: playablePages, book: playableBook })
        : null;
      setCmsOpen(true);
      if (preloadPromise) {
        await preloadPromise;
      }
    } catch (error) {
      console.error('Error loading CMS built-in book:', error);
    }
  }, [canOpenCmsBuiltin, clearPreloadState, loadPlayableBookById, preloadBookMedia]);

  const handleCloseCms = useCallback(() => {
    setCmsOpen(false);
    setCmsPages([]);
    setSelectedCmsBook(null);
    setSessionStartedAt(null);
    clearPreloadState();
  }, [clearPreloadState]);

  const handleCmsSessionComplete = useCallback(
    async ({
      score = 0,
      maxScore = 0,
      attemptCount = 0,
      trigger = 'close',
    } = {}) => {
      const bookId = selectedCmsBook?._contentId || selectedCmsBook?._id || selectedCmsBook?.contentId || null;
      if (!courseId || !childId || !bookId) return;

      const elapsedMs = sessionStartedAt ? Math.max(0, Date.now() - sessionStartedAt) : 0;
      const timeSpentSeconds = Math.round(elapsedMs / 1000);
      let completionResponse = null;

      try {
        completionResponse = await completeHtml5Book({
          courseId,
          childId,
          bookId,
          score,
          maxScore: maxScore || null,
          status: 'completed',
          timeSpent: timeSpentSeconds,
          progress: 100,
        });

        // Apply stars + open reward UI before any module refresh work
        const completionData = completionResponse?.data || {};
        const syncedTotalStars = applyStarRewardFromCompletion({
          childId,
          starsToAward: completionData.starsToAward,
          totalStars: completionData.totalStars,
          dispatch,
        });

        if (trigger === 'home') {
          setCmsCompletionData({
            score,
            maxScore,
            attemptCount,
            ...completionData,
            totalStars: syncedTotalStars ?? completionData.totalStars ?? 0,
          });
          setCmsCompletionOpen(true);
        }
      } catch (error) {
        console.error('Error saving CMS book completion:', error);
      } finally {
        // Non-blocking library refresh
        void fetchBookReadings();
      }

      console.log('[CMS Player Result]', {
        score,
        maxScore,
        attemptCount,
        trigger,
      });
    },
    [childId, courseId, selectedCmsBook, sessionStartedAt, dispatch]
  );

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
    <>
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
                  if (canOpenHtml5(book)) {
                    handleOpenHtml5(book);
                  }
                  if (canOpenCmsBuiltin(book)) {
                    handleOpenCmsBuiltin(book);
                  }
                  // Keep external hook if parent still needs it (optional)
                  if (onBookClick) {
                    onBookClick(book);
                  }
                }}
              />
            );
          })}
        </Box>
      </Box>

      <Html5Player
        open={html5Open}
        onClose={handleCloseHtml5}
        courseId={courseId || null}
        childId={childId || null}
        bookId={selectedBookId}
        contentTitle={selectedHtml5Book?.title || 'Book'}
        html5PackageId={selectedHtml5Book?.html5PackageId || null}
        html5EntryPoint={selectedHtml5Book?.html5EntryPoint || 'index.html'}
        onComplete={() => {
          // Refresh reading progress UI after completion attempt
          fetchBookReadings();
        }}
      />
      <CmsPlayer
        open={cmsOpen}
        onClose={handleCloseCms}
        pages={cmsPages}
        isPreloading={Boolean(cmsPlayerLoading?.preload)}
        preloadProgress={preloadProgress}
        preloadSummary={preloadSummary}
        onSessionComplete={handleCmsSessionComplete}
      />
      <CmsCompletionDialog
        open={cmsCompletionOpen}
        onClose={() => {
          setCmsCompletionOpen(false);
          setCmsCompletionData(null);
        }}
        data={cmsCompletionData}
      />
    </>
  );
};

export default ChildModuleLibrary;
