import React, { useEffect, useState, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { themeColors } from '../../config/themeColors';
import useCourseProgress from '../../hooks/courseProgressHook';
import { useAuth } from '../../hooks/userHook';
import ChildModuleHeader from '../../components/child/module/ChildModuleHeader';
import ChildModuleBreadCrumbs from '../../components/child/module/ChildModuleBreadCrumbs';
import ChildModuleProgress from '../../components/child/module/ChildModuleProgress';
import ChildModuleLibrary from '../../components/child/module/ChildModuleLibrary';
import ChildModuleVideos from '../../components/child/module/ChildModuleVideos';
import ChildModuleAudio from '../../components/child/module/ChildModuleAudio';
import ChildModuleChants from '../../components/child/module/ChildModuleChants';
import ChildModuleFooter from '../../components/child/module/ChildModuleFooter';
import ScormPlayer from '../../components/child/common/ScormPlayer';
import VideoPlayerModal from '../../components/child/common/VideoPlayerModal';

/**
 * ChildJourneyModule Page
 * 
 * Course detail page showing step information and course content
 * Route: /child/:id/journey/:courseId
 */
const ChildJourneyModule = ({ childId }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courseDetails, setCourseDetails] = useState(null);
  const [courses, setCourses] = useState([]); // Still need this for step number calculation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { fetchChildCourses, fetchCourseDetailsForChild, getCoverImageUrl } = useCourseProgress(childId);
  const { fetchCurrentUser } = useAuth();
  
  // Modal states
  const [scormOpen, setScormOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState(null);
  
  // Refresh trigger for video watches
  const [videoWatchRefreshTrigger, setVideoWatchRefreshTrigger] = useState(0);
  const videosRef = useRef(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (!childId || !courseId) {
        setError('Child ID and Course ID are required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch all courses first (for step number calculation)
        const allCourses = await fetchChildCourses();
        setCourses(allCourses);

        // Fetch course details with populated contents
        const details = await fetchCourseDetailsForChild(courseId);

        // Check if course is accessible
        if (!details.accessible) {
          setError('This course is locked. Complete previous courses first.');
          setLoading(false);
          return;
        }

        setCourseDetails(details);
      } catch (err) {
        setError(err.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [childId, courseId, fetchChildCourses, fetchCourseDetailsForChild]);

  // Get step number (sequential position based on course order)
  const getStepNumber = () => {
    if (!courses.length) return 1;

    // Find the index of the current course in the courses array
    const courseIndex = courses.findIndex(
      (c) => (c.course?._id === courseId || c.course?.id === courseId)
    );

    // Return sequential position (index + 1)
    return courseIndex >= 0 ? courseIndex + 1 : 1;
  };

  // Get cover image URL
  const coverImageUrl = courseDetails?.course?.coverImage
    ? getCoverImageUrl(courseDetails.course.coverImage)
    : null;

  // Handle back navigation
  const handleBack = () => {
    navigate(`/child/${childId}/journey`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'rgb(212, 230, 227)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '90px',
        }}
      >
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'rgb(212, 230, 227)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '90px',
          padding: { xs: '16px', sm: '32px' },
        }}
      >
        <Typography
          sx={{
            color: themeColors.text,
            fontSize: '18px',
            textAlign: 'center',
          }}
        >
          {error}
        </Typography>
      </Box>
    );
  }

  if (!courseDetails) {
    return null;
  }

  const stepNumber = getStepNumber();
  const course = courseDetails.course;
  const progress = courseDetails.progress;

  // Calculate progress counts
  const calculateProgressCounts = () => {
    if (!course || !course.contents) {
      return {
        totalCount: 0,
        completedCount: 0,
        todoCount: 0,
        lockedCount: 0,
      };
    }

    const courseContents = course.contents || [];
    const totalCount = courseContents.length;

    // Get completed content items (matching both contentId and contentType)
    const completedItems = new Set();
    if (progress?.contentProgress) {
      progress.contentProgress
        .filter((item) => item.status === 'completed')
        .forEach((item) => {
          // Use both contentId and contentType as key (same as Course model)
          const key = `${item.contentId.toString()}-${item.contentType}`;
          completedItems.add(key);
        });
    }

    // Count completed items (matching both contentId and contentType)
    const completedCount = courseContents.filter((content) => {
      // Use _contentId or contentId from populated contents
      const contentId = content._contentId || content._id || content.contentId;
      const contentType = content._contentType || content.contentType;
      const key = `${contentId.toString()}-${contentType}`;
      return completedItems.has(key);
    }).length;

    // To Do = Total - Completed (locked is 0 for now as per requirements)
    const todoCount = totalCount - completedCount;
    const lockedCount = 0; // As per requirements, locked is 0 for now

    return {
      totalCount,
      completedCount,
      todoCount,
      lockedCount,
    };
  };

  const progressCounts = calculateProgressCounts();

  // Extract books from populated course contents
  const getBooks = () => {
    if (!course || !course.contents) {
      return [];
    }

    // Filter books from populated contents (contentType is _contentType in populated data)
    return course.contents.filter(
      (content) => (content._contentType || content.contentType) === 'book'
    );
  };

  // Extract videos from populated course contents
  const getVideos = () => {
    if (!course || !course.contents) {
      return [];
    }

    // Filter videos from populated contents (contentType is _contentType in populated data)
    return course.contents.filter(
      (content) => (content._contentType || content.contentType) === 'video'
    );
  };

  // Extract audio assignments from populated course contents
  const getAudioAssignments = () => {
    if (!course || !course.contents) {
      return [];
    }

    // Filter audio assignments from populated contents (contentType is _contentType in populated data)
    return course.contents.filter(
      (content) => (content._contentType || content.contentType) === 'audioAssignment'
    );
  };

  // Extract chants from populated course contents
  const getChants = () => {
    if (!course || !course.contents) {
      return [];
    }

    // Filter chants from populated contents (contentType is _contentType in populated data)
    return course.contents.filter(
      (content) => (content._contentType || content.contentType) === 'chant'
    );
  };

  const books = getBooks();
  const videos = getVideos();
  const audioAssignments = getAudioAssignments();
  const chants = getChants();

  // Handle book click - Open SCORM player directly
  const handleBookClick = (book) => {
    const bookId = book._id || book._contentId || book.contentId || book.id;
    if (bookId && (book.scormFile || book.scormFileUrl || book.scormFilePath)) {
      setSelectedContent(book);
      setSelectedContentType('book');
      setScormOpen(true);
    } else {
      console.warn('Book does not have SCORM file:', book);
    }
  };

  // Handle video click - Open video player first, then SCORM if available
  const handleVideoClick = (video) => {
    const videoId = video._id || video._contentId || video.contentId || video.id;
    if (videoId) {
      setSelectedContent(video);
      setVideoModalOpen(true);
    }
  };

  // Handle chant click - Open SCORM player directly
  const handleChantClick = (chant) => {
    const chantId = chant._id || chant._contentId || chant.contentId || chant.id;
    if (chantId && (chant.scormFile || chant.scormFileUrl || chant.scormFilePath)) {
      setSelectedContent(chant);
      setSelectedContentType('chant');
      setScormOpen(true);
    } else {
      console.warn('Chant does not have SCORM file:', chant);
    }
  };

  // Handle audio click - Open SCORM player directly (if SCORM exists)
  const handleAudioClick = (audio) => {
    const audioId = audio._id || audio._contentId || audio.contentId || audio.id;
    if (audioId && (audio.scormFile || audio.scormFileUrl || audio.scormFilePath)) {
      setSelectedContent(audio);
      setSelectedContentType('audioAssignment');
      setScormOpen(true);
    } else {
      console.warn('Audio assignment does not have SCORM file:', audio);
    }
  };

  // Handle SCORM completion
  const handleScormComplete = (data) => {
    console.log('SCORM completed:', data);
    // Refresh course details to update progress
    if (courseId) {
      fetchCourseDetailsForChild(courseId)
        .then((details) => {
          setCourseDetails(details);
        })
        .catch((err) => {
          console.error('Failed to refresh course details:', err);
        });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'rgb(212, 230, 227)',
        paddingBottom: '90px', // Space for fixed bottom navigation
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Container with 848px max-width */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '848px',
          backgroundColor: 'transparent',
          padding: { xs: '16px', sm: '0px' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header with Cover Image, Back Button, and Step Badge */}
        <ChildModuleHeader
          stepNumber={stepNumber}
          onBack={handleBack}
          coverImageUrl={coverImageUrl}
          courseTitle={course?.title}
        />

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          paddingX: '32px'
        }}>
          {/* Breadcrumbs */}
          <ChildModuleBreadCrumbs
            stepNumber={stepNumber}
            onJourneyClick={handleBack}
          />

          {/* Progress Component */}
          <ChildModuleProgress
            courseTitle={course?.title}
            courseDescription={course?.description}
            completedCount={progressCounts.completedCount}
            todoCount={progressCounts.todoCount}
            lockedCount={progressCounts.lockedCount}
            totalCount={progressCounts.totalCount}
          />

          {/* Library Component */}
          <ChildModuleLibrary
            books={books}
            courseProgress={courseDetails}
            onBookClick={handleBookClick}
          />

          {/* Videos Component */}
          <ChildModuleVideos
            ref={videosRef}
            videos={videos}
            courseProgress={courseDetails}
            onVideoClick={handleVideoClick}
            childId={childId}
            refreshTrigger={videoWatchRefreshTrigger}
          />

          {/* Chants Component */}
          <ChildModuleChants
            chants={chants}
            courseProgress={courseDetails}
            onChantClick={handleChantClick}
          />

          {/* Audio Assignments Component */}
          <ChildModuleAudio
            audioAssignments={audioAssignments}
            courseProgress={courseDetails}
            onAudioClick={handleAudioClick}
          />

          {/* Footer Component */}
          <ChildModuleFooter />
        </Box>
      </Box>

      {/* SCORM Player Modal */}
      {selectedContent && selectedContentType && (
        <ScormPlayer
          open={scormOpen}
          onClose={() => {
            setScormOpen(false);
            setSelectedContent(null);
            setSelectedContentType(null);
          }}
          contentId={selectedContent._id || selectedContent._contentId || selectedContent.contentId || selectedContent.id}
          contentType={selectedContentType}
          contentTitle={selectedContent.title || 'Interactive Content'}
          onComplete={handleScormComplete}
        />
      )}

      {/* Video Player Modal */}
      {selectedContent && (
        <VideoPlayerModal
          open={videoModalOpen}
          onClose={async () => {
            setVideoModalOpen(false);
            setSelectedContent(null);
            // Refresh course details to update video watch progress
            if (courseId) {
              setTimeout(() => {
                fetchCourseDetailsForChild(courseId).then((details) => {
                  setCourseDetails(details);
                }).catch(console.error);
              }, 500); // Small delay to ensure backend has updated
            }
            // Trigger video watches refresh
            setTimeout(() => {
              setVideoWatchRefreshTrigger(prev => prev + 1);
              // Also call refresh directly via ref
              if (videosRef.current) {
                videosRef.current.refreshWatches();
              }
            }, 800); // Slightly longer delay to ensure backend has updated
            
            // Refresh child profile stats to update total stars in header and awards
            setTimeout(async () => {
              try {
                console.log('[ChildJourneyModule] Refreshing child stats after video modal close...');
                await fetchCurrentUser();
                console.log('[ChildJourneyModule] Child stats refreshed successfully');
                // Force page refresh of child data by triggering a re-render
                window.dispatchEvent(new Event('childStatsUpdated'));
              } catch (error) {
                console.error('[ChildJourneyModule] Error refreshing child stats:', error);
              }
            }, 1500); // Wait for backend to update stats (increased delay to ensure DB update completes)
          }}
          video={selectedContent}
          childId={childId}
          courseId={courseId}
          onVideoComplete={async (video) => {
            console.log('Video completed:', video);
            // Video completion is handled in VideoPlayerModal
            // Watch count and stars are automatically recorded
            // Delay all refreshes to ensure user has seen the completion message
            // Refresh course details to update progress
            if (courseId) {
              setTimeout(() => {
                fetchCourseDetailsForChild(courseId).then((details) => {
                  setCourseDetails(details);
                }).catch(console.error);
              }, 1000); // Delay to ensure user saw the completion message
            }
            // Trigger video watches refresh
            setTimeout(() => {
              setVideoWatchRefreshTrigger(prev => prev + 1);
              // Also call refresh directly via ref
              if (videosRef.current) {
                videosRef.current.refreshWatches();
              }
            }, 1200); // Delay to ensure user saw the completion message
            
            // Refresh child profile stats to update total stars in header and awards
            setTimeout(async () => {
              try {
                console.log('[ChildJourneyModule] Refreshing child stats after video completion...');
                await fetchCurrentUser();
                console.log('[ChildJourneyModule] Child stats refreshed successfully');
                // Force page refresh of child data by triggering a re-render
                window.dispatchEvent(new Event('childStatsUpdated'));
              } catch (error) {
                console.error('[ChildJourneyModule] Error refreshing child stats:', error);
              }
            }, 2000); // Longer delay to ensure user saw the completion message and backend has updated
          }}
        />
      )}
    </Box>
  );
};

export default ChildJourneyModule;
