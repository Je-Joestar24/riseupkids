import { useEffect, useRef } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAccessRefusal } from '../../api/accessRefusal';
import { refreshUserAccess } from '../../store/slices/userSlice';
import { showNotification } from '../../store/slices/uiSlice';
import { pathAfterAccessChange } from '../../utils/contentCreatorAccess';

// A page load can fire several refused requests at once; they are one event for the person.
export const REFUSAL_WINDOW_MS = 3000;

/**
 * "Access removed" for a content creator (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md).
 *
 * When the server refuses a creator because she does not have an area (an admin took it away while she was working),
 * this: tells her in plain words, quietly re-reads what she can use now (so her menu updates), and, only if the page
 * she is on is no longer hers, takes her to her first allowed page.
 *
 * It NEVER signs her out. The session is fine; only one area was closed. Renders nothing. Must sit inside the router.
 */
const AccessRefusalWatcher = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The listener is set up once; it reads where she is at the moment the answer comes back.
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const lastHandledAt = useRef(0);

  useEffect(
    () =>
      onAccessRefusal(async ({ message }) => {
        const now = Date.now();
        if (now - lastHandledAt.current < REFUSAL_WINDOW_MS) return;
        lastHandledAt.current = now;

        dispatch(showNotification({ message, type: 'warning' }));

        // Fresh list if we can get it; if the refresh fails she keeps what the screen already has (still signed in)
        let user = store.getState().user?.user ?? null;
        try {
          const result = await dispatch(refreshUserAccess()).unwrap();
          user = result?.user ?? user;
        } catch {
          // Nothing to undo: a failed refresh changes nothing
        }

        const target = pathAfterAccessChange(user, pathRef.current);
        if (target) navigate(target, { replace: true });
      }),
    [dispatch, navigate, store]
  );

  return null;
};

export default AccessRefusalWatcher;
