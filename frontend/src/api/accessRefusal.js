/**
 * A tiny channel for "a content creator was refused because she does not have this area".
 *
 * The axios layer cannot show a notice or change the page (it has no store and no router, and it must stay that way:
 * it never navigates). So when it sees such a refusal it only announces it here, and one listener inside the app
 * (components/common/AccessRefusalWatcher.jsx) decides what to show and where to go. Nothing here knows about
 * React, redux or the router.
 */

const listeners = new Set();

/**
 * @param {(detail: { message: string, url: string | null }) => void} listener
 * @returns {() => void} stops listening
 */
export const onAccessRefusal = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Tells every listener. One that throws never stops the others, and never breaks the request that was refused. */
export const emitAccessRefusal = (detail) => {
  [...listeners].forEach((listener) => {
    try {
      listener(detail);
    } catch {
      // A listener's own problem must not turn a refusal into a different failure
    }
  });
};
