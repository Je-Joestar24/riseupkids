/**
 * In-memory access token store (Chunk 9 — RUK-SEC-012(b)).
 *
 * The access token is held ONLY here — a plain module-level variable, never written to
 * sessionStorage/localStorage. This is the single source of truth api/axios.js reads for the
 * Authorization header. Kept as its own tiny module with no other imports (not even the Redux
 * store) so it can be imported from api/axios.js without any risk of a circular import
 * (store -> userSlice -> authService -> axios -> store).
 *
 * A page reload/new-tab/close-and-reopen always starts with an empty token here — that's the
 * point. The session survives anyway because the httpOnly refresh cookie (invisible to this
 * module, invisible to JS entirely) lets the app silently mint a new access token on boot.
 */
let accessToken = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const clearAccessToken = () => {
  accessToken = null;
};
