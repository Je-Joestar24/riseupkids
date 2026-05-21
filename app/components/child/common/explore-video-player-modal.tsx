/**
 * Explore video player — routes Bunny embed (WebView) vs uploaded file (expo-av).
 * Use for Explore Replays, video collections, and explore-content screens.
 */

import React, { useMemo } from 'react';

import { BunnyEmbedPlayerModal } from '@/components/child/common/bunny-embed-player-modal';
import {
  VideoPlayerModal,
  type ExploreVideoInput,
  type VideoPlayerModalVideo,
} from '@/components/child/common/video-player-modal';
import { useExplore } from '@/hooks/exploreHook';
import type { ExploreContentItem } from '@/services/exploreService';
import { resolveExploreVideoPlayback } from '@/utils/exploreVideoPlayback';

export interface ExploreVideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  content: ExploreContentItem | null;
  childId: string | null;
  videoType?: string;
  onVideoComplete?: (content: ExploreContentItem) => void;
}

export function ExploreVideoPlayerModal({
  open,
  onClose,
  content,
  childId,
  videoType,
  onVideoComplete,
}: ExploreVideoPlayerModalProps) {
  const { getCoverImageUrl } = useExplore();

  const playback = useMemo(
    () =>
      resolveExploreVideoPlayback(content, (path) => getCoverImageUrl(path)),
    [content, getCoverImageUrl]
  );

  const exploreContentId = content?._id != null ? String(content._id) : null;
  const title = content?.title?.trim() || 'Video';
  const resolvedVideoType = videoType ?? content?.videoType ?? undefined;
  if (playback.mode === 'embed' && playback.url) {
    return (
      <BunnyEmbedPlayerModal
        open={open}
        onClose={onClose}
        embedUrl={playback.url}
        title={title}
        childId={childId}
        exploreContentId={exploreContentId}
        videoType={resolvedVideoType}
        onVideoComplete={() => {
          if (content) onVideoComplete?.(content);
        }}
      />
    );
  }

  const videoForModal: VideoPlayerModalVideo | null = content
    ? ({
        _id: content.videoFile?._id ?? content._id,
        title,
        url: playback.url,
      } as ExploreVideoInput)
    : null;

  return (
    <VideoPlayerModal
      open={open}
      onClose={onClose}
      video={videoForModal}
      childId={childId}
      isExploreVideo
      exploreContentId={exploreContentId}
      videoType={resolvedVideoType}
      onVideoComplete={() => {
        if (content) onVideoComplete?.(content);
      }}
    />
  );
}
