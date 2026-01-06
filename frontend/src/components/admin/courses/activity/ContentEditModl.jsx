import React from 'react';
import ActivityEditModal from './ActivityEditModal';
import VideoEditModal from './VideoEditModal';
import BookEditModal from './BooksEditModa';
import AudioEditModal from './AudioEditModal';
import { CONTENT_TYPES } from '../../../../services/contentService';

/**
 * ContentEditModal
 *
 * Unified wrapper that routes to the appropriate edit modal based on content type.
 * Supports: Activities, Books, Videos, Audio Assignments
 */
const ContentEditModal = ({ open, onClose, contentId, contentType = CONTENT_TYPES.ACTIVITY, onSuccess }) => {
  // Route to the appropriate edit modal based on content type
  switch (contentType) {
    case CONTENT_TYPES.ACTIVITY:
      return (
        <ActivityEditModal
          open={open}
          onClose={onClose}
          activityId={contentId}
          contentType={contentType}
          onSuccess={onSuccess}
        />
      );

    case CONTENT_TYPES.VIDEO:
      return (
        <VideoEditModal
          open={open}
          onClose={onClose}
          videoId={contentId}
          onSuccess={onSuccess}
        />
      );

    case CONTENT_TYPES.BOOK:
      return (
        <BookEditModal
          open={open}
          onClose={onClose}
          bookId={contentId}
          onSuccess={onSuccess}
        />
      );

    case CONTENT_TYPES.AUDIO_ASSIGNMENT:
      return (
        <AudioEditModal
          open={open}
          onClose={onClose}
          audioId={contentId}
          onSuccess={onSuccess}
        />
      );

    default:
      console.warn(`Unknown content type: ${contentType}`);
      return null;
  }
};

export default ContentEditModal;


