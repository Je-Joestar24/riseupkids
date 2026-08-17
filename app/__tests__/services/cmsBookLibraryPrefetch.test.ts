import {
  findFirstBuiltinCmsBookId,
  __resetCmsBookLibraryPrefetchForTests,
} from '@/services/cmsBookLibraryPrefetch';

describe('cmsBookLibraryPrefetch', () => {
  beforeEach(() => {
    __resetCmsBookLibraryPrefetchForTests();
  });

  it('picks the first builtin CMS book id from the module library', () => {
    expect(
      findFirstBuiltinCmsBookId([
        { packageType: 'html5', cmsBookId: 'html-1' },
        { packageType: 'builtin', cmsBookId: 'cms-22' },
        { packageType: 'builtin', cmsBookId: 'cms-23' },
      ])
    ).toBe('cms-22');
  });

  it('returns null when the library has no builtin books', () => {
    expect(findFirstBuiltinCmsBookId([{ packageType: 'html5', cmsBookId: 'html-1' }])).toBeNull();
    expect(findFirstBuiltinCmsBookId([])).toBeNull();
  });
});
