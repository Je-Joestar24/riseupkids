import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import {
  CREATOR_PAGES,
  CREATOR_AREA_KEYS,
  LEGACY_CREATOR_AREAS,
  isContentCreator,
  creatorAreas,
  hasCreatorArea,
  areaForPath,
  canOpenCreatorPath,
  creatorMenu,
  creatorLandingPath,
  pathAfterAccessChange,
} from './contentCreatorAccess';

const creator = (accessAreas) => ({ role: 'content_creator', accessAreas });

describe('the web list matches the server (contract)', () => {
  // The server's list is the truth. If someone adds, removes or reorders an area on one side only, this fails.
  const backend = createRequire(import.meta.url)('../../../backend/utils/accessAreas.js');

  it('has the same areas in the same order', () => {
    expect(CREATOR_AREA_KEYS).toEqual(backend.ACCESS_AREA_KEYS);
  });

  it('has the same legacy set', () => {
    expect(LEGACY_CREATOR_AREAS).toEqual(backend.LEGACY_CREATOR_AREAS);
  });

  it('gives every area a page under /content-creator with a label', () => {
    expect(CREATOR_PAGES).toHaveLength(backend.ACCESS_AREA_KEYS.length);
    CREATOR_PAGES.forEach((page) => {
      expect(page.path.startsWith('/content-creator/')).toBe(true);
      expect(page.label.length).toBeGreaterThan(0);
    });
  });

  it('cannot be changed by accident from outside', () => {
    expect(() => CREATOR_AREA_KEYS.push('x')).toThrow();
    expect(() => LEGACY_CREATOR_AREAS.push('notifications')).toThrow();
    expect(() => CREATOR_PAGES.push({ key: 'x' })).toThrow();
    expect(() => {
      CREATOR_PAGES[0].path = '/x';
    }).toThrow();
  });
});

describe('creatorAreas', () => {
  it('is the saved list, in sidebar order', () => {
    expect(creatorAreas(creator(['experiences', 'notifications']))).toEqual(['notifications', 'experiences']);
  });

  it('is the legacy set when no list was ever saved (missing, null, empty, or not a list)', () => {
    [undefined, null, [], 'notifications', {}].forEach((value) => {
      expect(creatorAreas(creator(value))).toEqual(LEGACY_CREATOR_AREAS);
    });
    expect(creatorAreas({ role: 'content_creator' })).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('never adds the legacy set to a saved list', () => {
    expect(creatorAreas(creator(['notifications']))).toEqual(['notifications']);
  });

  it('drops areas that no longer exist, and gives nothing (not the legacy set) when none is left', () => {
    expect(creatorAreas(creator(['notifications', 'retired']))).toEqual(['notifications']);
    expect(creatorAreas(creator(['retired']))).toEqual([]);
  });

  it('removes duplicates', () => {
    expect(creatorAreas(creator(['explore', 'explore']))).toEqual(['explore']);
  });

  it('is empty for everyone who is not a content creator, whatever list they carry', () => {
    ['admin', 'teacher', 'parent', 'child', undefined].forEach((role) => {
      expect(creatorAreas({ role, accessAreas: ['notifications'] })).toEqual([]);
    });
    expect(creatorAreas(null)).toEqual([]);
    expect(creatorAreas(undefined)).toEqual([]);
  });

  it('returns a fresh list, so a caller cannot change the shared one', () => {
    creatorAreas({ role: 'content_creator' }).push('x');
    expect(creatorAreas({ role: 'content_creator' })).toEqual(LEGACY_CREATOR_AREAS);
  });
});

describe('isContentCreator and hasCreatorArea', () => {
  it('knows a creator', () => {
    expect(isContentCreator(creator())).toBe(true);
    expect(isContentCreator({ role: 'admin' })).toBe(false);
    expect(isContentCreator(null)).toBe(false);
  });

  it('is true only for an area she has', () => {
    expect(hasCreatorArea(creator(['notifications']), 'notifications')).toBe(true);
    expect(hasCreatorArea(creator(['notifications']), 'contents')).toBe(false);
    expect(hasCreatorArea(creator(['notifications']), 'billing')).toBe(false);
    expect(hasCreatorArea(creator(['notifications']), undefined)).toBe(false);
  });

  it('keeps today\'s creators out of Notifications and Experiences', () => {
    expect(hasCreatorArea({ role: 'content_creator' }, 'notifications')).toBe(false);
    expect(hasCreatorArea({ role: 'content_creator' }, 'experiences')).toBe(false);
    expect(hasCreatorArea({ role: 'content_creator' }, 'contents')).toBe(true);
  });
});

describe('areaForPath', () => {
  it.each([
    ['/content-creator/dashboard', 'dashboard'],
    ['/content-creator/contents', 'contents'],
    ['/content-creator/built-in-books', 'built_in_books'],
    ['/content-creator/built-in-books/create', 'built_in_books'],
    ['/content-creator/built-in-books/abc123/edit', 'built_in_books'],
    ['/content-creator/explore', 'explore'],
    ['/content-creator/star-cam-missions', 'star_cam_missions'],
    ['/content-creator/notifications', 'notifications'],
    ['/content-creator/experiences', 'experiences'],
    ['/content-creator/experiences/create', 'experiences'],
    ['/content-creator/experiences/123e4567-e89b-42d3-a456-426614174000/edit', 'experiences'],
  ])('%s belongs to %s', (path, area) => {
    expect(areaForPath(path)).toBe(area);
  });

  it('ignores a trailing slash, a query and a hash', () => {
    expect(areaForPath('/content-creator/contents/')).toBe('contents');
    expect(areaForPath('/content-creator/dashboard/')).toBe('dashboard');
    expect(areaForPath('/content-creator/dashboard/?x=1')).toBe('dashboard');
    expect(areaForPath('/content-creator/contents?type=books')).toBe('contents');
    expect(areaForPath('/content-creator/explore#top')).toBe('explore');
  });

  it('is null for an address that belongs to no area', () => {
    ['/content-creator', '/content-creator/', '/content-creator/unknown', '/admin/users', '/', '', '/login'].forEach((path) => {
      expect(areaForPath(path)).toBeNull();
    });
  });

  it('does not treat the dashboard as a prefix, nor a look-alike address as an area', () => {
    expect(areaForPath('/content-creator/dashboard/extra')).toBeNull();
    expect(areaForPath('/content-creator/contentsX')).toBeNull();
    expect(areaForPath('/content-creator/explorer')).toBeNull();
    expect(areaForPath('/content-creator/notifications-old')).toBeNull();
  });

  it('is null for anything that is not text', () => {
    [undefined, null, 5, {}, ['/content-creator/contents']].forEach((path) => expect(areaForPath(path)).toBeNull());
  });
});

describe('canOpenCreatorPath', () => {
  it('opens an address in an area she has, create and edit pages included', () => {
    const user = creator(['experiences']);

    expect(canOpenCreatorPath(user, '/content-creator/experiences')).toBe(true);
    expect(canOpenCreatorPath(user, '/content-creator/experiences/create')).toBe(true);
    expect(canOpenCreatorPath(user, '/content-creator/experiences/abc/edit')).toBe(true);
  });

  it('refuses an area she does not have', () => {
    const user = creator(['notifications']);

    expect(canOpenCreatorPath(user, '/content-creator/contents')).toBe(false);
    expect(canOpenCreatorPath(user, '/content-creator/dashboard')).toBe(false);
    expect(canOpenCreatorPath(user, '/content-creator/built-in-books/create')).toBe(false);
  });

  it('refuses an address that belongs to no area, even for a creator with every area', () => {
    const user = creator([...CREATOR_AREA_KEYS]);

    expect(canOpenCreatorPath(user, '/content-creator/unknown')).toBe(false);
    expect(canOpenCreatorPath(user, '/content-creator')).toBe(false);
  });

  it('keeps today\'s creators on exactly what they had', () => {
    const legacy = { role: 'content_creator' };

    ['dashboard', 'contents', 'built-in-books', 'explore', 'star-cam-missions'].forEach((slug) => {
      expect(canOpenCreatorPath(legacy, `/content-creator/${slug}`)).toBe(true);
    });
    expect(canOpenCreatorPath(legacy, '/content-creator/notifications')).toBe(false);
    expect(canOpenCreatorPath(legacy, '/content-creator/experiences')).toBe(false);
  });

  it('is false for someone who is not a creator, or no one', () => {
    expect(canOpenCreatorPath({ role: 'admin' }, '/content-creator/contents')).toBe(false);
    expect(canOpenCreatorPath(null, '/content-creator/contents')).toBe(false);
  });
});

describe('creatorMenu and creatorLandingPath', () => {
  it('shows only the ticked areas, in the usual order', () => {
    expect(creatorMenu(creator(['experiences', 'dashboard', 'notifications'])).map((item) => item.key)).toEqual([
      'dashboard',
      'notifications',
      'experiences',
    ]);
  });

  it('gives a current creator the five items she has today, in today\'s order', () => {
    expect(creatorMenu({ role: 'content_creator' }).map((item) => item.label)).toEqual([
      'Dashboard',
      'My Contents',
      'Built-in Books',
      'Explore',
      'Star Cam Missions',
    ]);
  });

  it('lands a current creator on the Dashboard, as before', () => {
    expect(creatorLandingPath({ role: 'content_creator' })).toBe('/content-creator/dashboard');
  });

  it('lands a Notifications-only creator straight on Notifications', () => {
    expect(creatorLandingPath(creator(['notifications']))).toBe('/content-creator/notifications');
    expect(creatorMenu(creator(['notifications']))).toHaveLength(1);
  });

  it('lands on the first allowed item when there is no Dashboard', () => {
    expect(creatorLandingPath(creator(['experiences', 'explore']))).toBe('/content-creator/explore');
    expect(creatorLandingPath(creator(['experiences']))).toBe('/content-creator/experiences');
  });

  it('has no landing page and an empty menu when she has no area at all', () => {
    expect(creatorLandingPath(creator(['retired']))).toBeNull();
    expect(creatorMenu(creator(['retired']))).toEqual([]);
  });

  it('has no menu for someone who is not a creator', () => {
    expect(creatorMenu({ role: 'admin' })).toEqual([]);
    expect(creatorLandingPath({ role: 'parent' })).toBeNull();
    expect(creatorLandingPath(null)).toBeNull();
  });

  it('the landing page can always be opened (no redirect loop)', () => {
    [['notifications'], ['experiences', 'explore'], ['dashboard'], [...CREATOR_AREA_KEYS], undefined].forEach((list) => {
      const user = creator(list);
      expect(canOpenCreatorPath(user, creatorLandingPath(user))).toBe(true);
    });
  });
});

describe('pathAfterAccessChange (where to send a creator once her access changed)', () => {
  it('sends her to her landing page when the page she is on is no longer hers', () => {
    expect(pathAfterAccessChange(creator(['notifications']), '/content-creator/explore')).toBe('/content-creator/notifications');
    expect(pathAfterAccessChange(creator(['dashboard', 'contents']), '/content-creator/experiences/create')).toBe('/content-creator/dashboard');
  });

  it('leaves her where she is when she can still open it', () => {
    expect(pathAfterAccessChange(creator(['notifications', 'explore']), '/content-creator/explore')).toBeNull();
    expect(pathAfterAccessChange(creator(['experiences']), '/content-creator/experiences/abc/edit')).toBeNull();
  });

  it('leaves her where she is when that already is her landing page (no loop)', () => {
    expect(pathAfterAccessChange(creator(['retired']), '/content-creator/contents')).toBeNull();
  });

  it('moves her off an address that belongs to no area', () => {
    expect(pathAfterAccessChange(creator(['notifications']), '/content-creator/unknown')).toBe('/content-creator/notifications');
    expect(pathAfterAccessChange(creator(['notifications']), '/content-creator')).toBe('/content-creator/notifications');
  });

  it('does not move her when she has no area at all (the screen says so instead)', () => {
    expect(pathAfterAccessChange(creator(['retired']), '/content-creator/explore')).toBeNull();
  });

  it('never moves anyone outside the content creator area of the site', () => {
    ['/login', '/admin/users', '/', '/parents/child', '/content-creators'].forEach((path) => {
      expect(pathAfterAccessChange(creator(['notifications']), path)).toBeNull();
    });
  });

  it('never moves someone who is not a content creator', () => {
    expect(pathAfterAccessChange({ role: 'admin' }, '/content-creator/explore')).toBeNull();
    expect(pathAfterAccessChange({ role: 'parent' }, '/content-creator/explore')).toBeNull();
    expect(pathAfterAccessChange(null, '/content-creator/explore')).toBeNull();
    expect(pathAfterAccessChange(undefined, '/content-creator/explore')).toBeNull();
  });

  it('ignores a trailing slash, a query and a hash on where she is', () => {
    expect(pathAfterAccessChange(creator(['explore']), '/content-creator/explore/?x=1')).toBeNull();
    expect(pathAfterAccessChange(creator(['notifications']), '/content-creator/explore/?x=1')).toBe('/content-creator/notifications');
  });
});
