/** Default axios timeout for typical API calls (ms). */
export const TIMEOUT = 600000;

/** Explore create/update can include multi‑GB video multipart uploads — allow long slow connections. */
export const EXPLORE_UPLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours