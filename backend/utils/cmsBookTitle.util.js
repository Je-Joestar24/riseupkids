/**
 * Built-in CMS books store title on both the document and the cover page.
 * The cover page title is the canonical, user-facing title shown in the player.
 */

function getCoverPage(book) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  return (
    pages.find((page) => page?.type === 'cover' && Number(page?.order) === 1) ||
    pages.find((page) => page?.type === 'cover') ||
    pages.find((page) => Number(page?.order) === 1) ||
    null
  );
}

function getCoverPageTitle(book) {
  const coverPage = getCoverPage(book);
  const coverTitle = String(coverPage?.title || '').trim();
  return coverTitle || null;
}

function resolveCmsBookTitle(book) {
  return getCoverPageTitle(book) || String(book?.title || '').trim();
}

function syncCmsBookTitleFromCoverPage(bookOrPayload) {
  if (!bookOrPayload || typeof bookOrPayload !== 'object') return bookOrPayload;
  const coverTitle = getCoverPageTitle(bookOrPayload);
  if (coverTitle) {
    bookOrPayload.title = coverTitle;
  }
  return bookOrPayload;
}

function withResolvedCmsBookTitle(book) {
  if (!book || typeof book !== 'object') return book;
  const resolvedTitle = resolveCmsBookTitle(book);
  if (resolvedTitle === book.title) return book;
  return { ...book, title: resolvedTitle };
}

module.exports = {
  getCoverPage,
  getCoverPageTitle,
  resolveCmsBookTitle,
  syncCmsBookTitleFromCoverPage,
  withResolvedCmsBookTitle,
};
