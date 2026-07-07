const {
  getCoverPage,
  getCoverPageTitle,
  resolveCmsBookTitle,
  syncCmsBookTitleFromCoverPage,
  withResolvedCmsBookTitle,
} = require('../utils/cmsBookTitle.util');

describe('cmsBookTitle.util', () => {
  const bookWithMismatchedTitle = {
    title: 'Wrong Document Title',
    pages: [
      {
        pageId: 'cover-1',
        order: 1,
        type: 'cover',
        title: 'Correct Cover Title',
        media: { imageMediaId: 'img-1' },
      },
      {
        pageId: 'content-1',
        order: 2,
        type: 'content',
        title: null,
        media: {},
      },
    ],
  };

  it('finds the first cover page', () => {
    expect(getCoverPage(bookWithMismatchedTitle)).toMatchObject({
      pageId: 'cover-1',
      title: 'Correct Cover Title',
    });
  });

  it('prefers cover page title when resolving book title', () => {
    expect(resolveCmsBookTitle(bookWithMismatchedTitle)).toBe('Correct Cover Title');
  });

  it('falls back to document title when cover page has no title', () => {
    expect(resolveCmsBookTitle({ title: 'Document Title', pages: [] })).toBe('Document Title');
  });

  it('syncs document title from cover page title', () => {
    const payload = {
      title: 'Stale Title',
      pages: bookWithMismatchedTitle.pages,
    };

    syncCmsBookTitleFromCoverPage(payload);

    expect(payload.title).toBe('Correct Cover Title');
    expect(getCoverPageTitle(payload)).toBe('Correct Cover Title');
  });

  it('returns a copy with resolved title for API responses', () => {
    const resolved = withResolvedCmsBookTitle(bookWithMismatchedTitle);

    expect(resolved.title).toBe('Correct Cover Title');
    expect(resolved.pages).toEqual(bookWithMismatchedTitle.pages);
    expect(bookWithMismatchedTitle.title).toBe('Wrong Document Title');
  });
});
