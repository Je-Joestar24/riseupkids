import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { prefetchChildModule } from '../store/slices/childModuleSlice';
import { getCoverImageUrl } from '../utils/coverImageUrl';
import { prefetchImages } from '../utils/remoteImage';

/** A mouse must rest on a card this long before it counts as heading for it (not just passing over). */
export const HOVER_INTENT_MS = 120;

/**
 * Starts loading a course (its details and its cover) before the page for it opens, so the page
 * opens already filled. The app does this when a card is pressed. On the web a press lands a moment
 * before the click, and a mouse usually rests on the card before pressing, so both start it.
 *
 * `prefetch(courseItem)` takes an item of the journey list. `startHover(courseItem, event)` only
 * reacts to a mouse, after it has rested on the card; `cancelHover` is for when it leaves.
 */
export default function useCoursePrefetch(childId) {
  const dispatch = useDispatch();
  const hoverTimer = useRef(null);

  const cancelHover = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }, []);

  useEffect(() => cancelHover, [cancelHover]);

  const prefetch = useCallback(
    (courseItem) => {
      const course = courseItem?.course;
      const courseId = course?._id || course?.id;
      if (!childId || !courseId) return;
      dispatch(prefetchChildModule(childId, courseId));
      prefetchImages([getCoverImageUrl(course.coverImage)]);
    },
    [childId, dispatch]
  );

  const startHover = useCallback(
    (courseItem, event) => {
      if (event?.pointerType !== 'mouse') return;
      cancelHover();
      hoverTimer.current = setTimeout(() => prefetch(courseItem), HOVER_INTENT_MS);
    },
    [cancelHover, prefetch]
  );

  return { prefetch, startHover, cancelHover };
}
