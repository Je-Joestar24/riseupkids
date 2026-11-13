/**
 * When does a built-in (CMS) book count as read? Only when the child has got to its LAST page. Closing the book
 * earlier (the X on page 1, say) earns nothing. Same rule as the app (`app/utils/cmsBookReadComplete.ts`) and the
 * server (which refuses a book it was told was closed early).
 */

/** True once the furthest page the child has been on is the last one (a book with no pages never counts). */
export const reachedLastPage = (furthestIndex, totalPages) => totalPages > 0 && furthestIndex >= totalPages - 1;
