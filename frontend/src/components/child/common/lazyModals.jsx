import React from 'react';
import { lazyModal } from '../../../utils/lazyChunk';
import { ModalFallback } from '../../common/RouteLoading';

/**
 * The child pages' big pop-ups (video player with the book player inside it, interactive content,
 * recordings). They are only needed once a child opens one, so their code is downloaded separately:
 * it is warmed in the background (see useIdlePreload) and, if a tap still beats the download, a
 * spinner appears after a short moment.
 */
const fallback = <ModalFallback />;

export const VideoPlayerModal = lazyModal(() => import('./VideoPlayerModal'), fallback);
export const ScormPlayer = lazyModal(() => import('./ScormPlayer'), fallback);
export const AudioAssignmentRecordingModal = lazyModal(
  () => import('../module/AudioAssignmentRecordingModal'),
  fallback
);
export const ChantRecordingModal = lazyModal(() => import('../module/ChantRecordingModal'), fallback);
// The reader for built-in books
export const CmsPlayer = lazyModal(() => import('./cmsPLayer'), fallback);
