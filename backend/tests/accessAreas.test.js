/**
 * Content creator access areas (step B1): the shared list and the helpers every other step builds on.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const {
  ACCESS_AREAS,
  ACCESS_AREA_KEYS,
  LEGACY_CREATOR_AREAS,
  ACCESS_ERROR_CODES,
  isKnownArea,
  validateAreas,
  effectiveAreas,
  userHasArea,
  describeAccessAreas,
} = require('../utils/accessAreas');

const creator = (accessAreas) => ({ role: 'content_creator', accessAreas });

describe('the shared list of access areas', () => {
  it('has the seven areas, in the order of the checkboxes and the sidebar', () => {
    expect(ACCESS_AREA_KEYS).toEqual([
      'dashboard',
      'contents',
      'built_in_books',
      'explore',
      'star_cam_missions',
      'notifications',
      'experiences',
    ]);
  });

  it('gives every area a label and a one-line help text, and no two areas share a key', () => {
    ACCESS_AREAS.forEach((area) => {
      expect(typeof area.label).toBe('string');
      expect(area.label.length).toBeGreaterThan(0);
      expect(typeof area.help).toBe('string');
      expect(area.help.length).toBeGreaterThan(0);
    });
    expect(new Set(ACCESS_AREA_KEYS).size).toBe(ACCESS_AREA_KEYS.length);
  });

  it('keeps what creators have today as the legacy set: no Notifications and no Experiences', () => {
    expect(LEGACY_CREATOR_AREAS).toEqual(['dashboard', 'contents', 'built_in_books', 'explore', 'star_cam_missions']);
    expect(LEGACY_CREATOR_AREAS).not.toContain('notifications');
    expect(LEGACY_CREATOR_AREAS).not.toContain('experiences');
    LEGACY_CREATOR_AREAS.forEach((key) => expect(ACCESS_AREA_KEYS).toContain(key));
  });

  it('cannot be changed by accident from outside', () => {
    expect(() => ACCESS_AREA_KEYS.push('x')).toThrow();
    expect(() => LEGACY_CREATOR_AREAS.push('notifications')).toThrow();
    expect(() => {
      'use strict';
      ACCESS_AREAS[0].label = 'Hacked';
    }).toThrow();
  });

  it('describes the areas for the admin form without exposing the shared list itself', () => {
    const described = describeAccessAreas();

    expect(described.map((area) => area.key)).toEqual(ACCESS_AREA_KEYS);
    expect(described.find((area) => area.key === 'notifications')).toEqual(
      expect.objectContaining({ label: 'Notifications', legacy: false })
    );
    expect(described.find((area) => area.key === 'contents').legacy).toBe(true);

    described[0].label = 'Changed';
    expect(describeAccessAreas()[0].label).toBe('Dashboard');
  });
});

describe('isKnownArea', () => {
  it('accepts exactly the known keys', () => {
    ACCESS_AREA_KEYS.forEach((key) => expect(isKnownArea(key)).toBe(true));
  });

  it('refuses everything else, including look-alikes and non-text', () => {
    ['Contents', ' contents', 'contents ', 'content', 'admin', '', 'constructor', '__proto__'].forEach((value) =>
      expect(isKnownArea(value)).toBe(false)
    );
    [undefined, null, 1, true, {}, [], ['contents']].forEach((value) => expect(isKnownArea(value)).toBe(false));
  });
});

describe('validateAreas', () => {
  it('accepts a good list and returns it in the canonical order, without duplicates', () => {
    expect(validateAreas(['notifications', 'dashboard', 'notifications', 'contents'])).toEqual({
      ok: true,
      areas: ['dashboard', 'contents', 'notifications'],
    });
  });

  it('accepts a single area and all of them', () => {
    expect(validateAreas(['notifications'])).toEqual({ ok: true, areas: ['notifications'] });
    expect(validateAreas([...ACCESS_AREA_KEYS].reverse())).toEqual({ ok: true, areas: ACCESS_AREA_KEYS });
  });

  it('does not change the list it was given', () => {
    const sent = ['notifications', 'dashboard'];
    validateAreas(sent);
    expect(sent).toEqual(['notifications', 'dashboard']);
  });

  it('asks for a list when none was sent', () => {
    [undefined, null].forEach((input) => {
      expect(validateAreas(input)).toEqual({
        ok: false,
        code: ACCESS_ERROR_CODES.AREAS_REQUIRED,
        message: 'Choose at least one area.',
      });
    });
  });

  it('refuses an empty list and points to Archive', () => {
    const result = validateAreas([]);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('ACCESS_AREAS_EMPTY');
    expect(result.message).toMatch(/archive/i);
  });

  it('refuses anything that is not a list', () => {
    ['contents', 'notifications', 1, true, {}, { 0: 'contents', length: 1 }].forEach((input) => {
      const result = validateAreas(input);
      expect(result.ok).toBe(false);
      expect(result.code).toBe('ACCESS_AREAS_INVALID');
    });
  });

  it('refuses an unknown area and names it', () => {
    const result = validateAreas(['contents', 'billing']);

    expect(result).toEqual({ ok: false, code: 'ACCESS_AREAS_INVALID', message: 'Unknown area: billing.' });
  });

  it('refuses a list with a non-text item (and does not print it)', () => {
    [[1], [null], [undefined], [{ a: 1 }], [['contents']], [true]].forEach((input) => {
      const result = validateAreas(input);
      expect(result.ok).toBe(false);
      expect(result.code).toBe('ACCESS_AREAS_INVALID');
      expect(result.message).toMatch(/^Unknown area: /);
    });
  });

  it('refuses a list with a hole in it (a sparse list)', () => {
    // eslint-disable-next-line no-sparse-arrays
    const result = validateAreas(['contents', , 'explore']);

    expect(result.ok).toBe(false);
    expect(result.code).toBe('ACCESS_AREAS_INVALID');
  });

  it('refuses one bad item even when the rest is good', () => {
    expect(validateAreas(['dashboard', 'contents', 'Notifications']).ok).toBe(false);
  });

  it('keeps an error message short and printable, whatever was sent', () => {
    const long = validateAreas(['x'.repeat(5000)]);
    const control = validateAreas(['bad\u0000\n\u001b[31mred']);

    expect(long.message.length).toBeLessThan(80);
    expect(long.message).toContain('...');
    expect(control.message).not.toMatch(/[\u0000-\u001f]/);
  });
});

describe('effectiveAreas: what a user can use right now', () => {
  it('gives a creator exactly the saved list', () => {
    expect(effectiveAreas(creator(['notifications']))).toEqual(['notifications']);
    expect(effectiveAreas(creator(['experiences', 'notifications']))).toEqual(['notifications', 'experiences']);
  });

  it('gives a creator with no saved list what they had before: the legacy set', () => {
    expect(effectiveAreas({ role: 'content_creator' })).toEqual(LEGACY_CREATOR_AREAS);
    expect(effectiveAreas(creator(undefined))).toEqual(LEGACY_CREATOR_AREAS);
    expect(effectiveAreas(creator(null))).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('treats the empty list Mongoose gives an unset field the same as "no saved list"', () => {
    expect(effectiveAreas(creator([]))).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('treats a saved value that is not a list as "no saved list"', () => {
    expect(effectiveAreas(creator('notifications'))).toEqual(LEGACY_CREATOR_AREAS);
    expect(effectiveAreas(creator({}))).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('does not add the legacy set to a saved list (a Notifications-only creator has only Notifications)', () => {
    const areas = effectiveAreas(creator(['notifications']));

    expect(areas).not.toContain('contents');
    expect(areas).not.toContain('dashboard');
  });

  it('drops an area that no longer exists, and does not fall back to the legacy set when nothing is left', () => {
    expect(effectiveAreas(creator(['notifications', 'retired_area']))).toEqual(['notifications']);
    expect(effectiveAreas(creator(['retired_area']))).toEqual([]);
  });

  it('puts a saved list in the canonical order and without duplicates', () => {
    expect(effectiveAreas(creator(['explore', 'dashboard', 'explore']))).toEqual(['dashboard', 'explore']);
  });

  it('never limits an admin or a teacher, whatever list they carry', () => {
    expect(effectiveAreas({ role: 'admin' })).toEqual(ACCESS_AREA_KEYS);
    expect(effectiveAreas({ role: 'teacher' })).toEqual(ACCESS_AREA_KEYS);
    expect(effectiveAreas({ role: 'admin', accessAreas: ['notifications'] })).toEqual(ACCESS_AREA_KEYS);
    expect(effectiveAreas({ role: 'teacher', accessAreas: [] })).toEqual(ACCESS_AREA_KEYS);
  });

  it('gives a parent, a child, an unknown role, a missing role and no user nothing', () => {
    expect(effectiveAreas({ role: 'parent', accessAreas: ['notifications'] })).toEqual([]);
    expect(effectiveAreas({ role: 'child' })).toEqual([]);
    expect(effectiveAreas({ role: 'superuser' })).toEqual([]);
    expect(effectiveAreas({})).toEqual([]);
    expect(effectiveAreas(null)).toEqual([]);
    expect(effectiveAreas(undefined)).toEqual([]);
  });

  it('returns a fresh list each time, so a caller cannot change the shared one', () => {
    const first = effectiveAreas({ role: 'admin' });
    first.push('x');
    const legacy = effectiveAreas({ role: 'content_creator' });
    legacy.push('x');

    expect(effectiveAreas({ role: 'admin' })).toEqual(ACCESS_AREA_KEYS);
    expect(effectiveAreas({ role: 'content_creator' })).toEqual(LEGACY_CREATOR_AREAS);
  });

  it('works on a Mongoose-style document that has the list as a plain array property', () => {
    const doc = { role: 'content_creator', accessAreas: ['notifications', 'experiences'], name: 'Pat' };

    expect(effectiveAreas(doc)).toEqual(['notifications', 'experiences']);
  });
});

describe('userHasArea', () => {
  it('is true only for an area the user can use', () => {
    const user = creator(['notifications']);

    expect(userHasArea(user, 'notifications')).toBe(true);
    expect(userHasArea(user, 'contents')).toBe(false);
    expect(userHasArea(user, 'experiences')).toBe(false);
  });

  it('keeps today\'s creators out of Notifications and Experiences, and in everything else they had', () => {
    const legacy = { role: 'content_creator' };

    expect(userHasArea(legacy, 'notifications')).toBe(false);
    expect(userHasArea(legacy, 'experiences')).toBe(false);
    LEGACY_CREATOR_AREAS.forEach((area) => expect(userHasArea(legacy, area)).toBe(true));
  });

  it('is true for every real area for an admin and a teacher', () => {
    ACCESS_AREA_KEYS.forEach((area) => {
      expect(userHasArea({ role: 'admin' }, area)).toBe(true);
      expect(userHasArea({ role: 'teacher' }, area)).toBe(true);
    });
  });

  it('is false for an area that does not exist, even for an admin, and for a parent', () => {
    expect(userHasArea({ role: 'admin' }, 'billing')).toBe(false);
    expect(userHasArea({ role: 'admin' }, undefined)).toBe(false);
    expect(userHasArea({ role: 'parent' }, 'contents')).toBe(false);
    expect(userHasArea(null, 'contents')).toBe(false);
  });
});

describe('error codes', () => {
  it('are the exact strings the web app will read', () => {
    expect(ACCESS_ERROR_CODES).toEqual({
      AREA_REQUIRED: 'ACCESS_AREA_REQUIRED',
      AREAS_REQUIRED: 'ACCESS_AREAS_REQUIRED',
      AREAS_EMPTY: 'ACCESS_AREAS_EMPTY',
      AREAS_INVALID: 'ACCESS_AREAS_INVALID',
      AREAS_NOT_FOR_ROLE: 'ACCESS_AREAS_NOT_FOR_ROLE',
      BULK_INVALID: 'ACCESS_BULK_INVALID',
      CREATOR_NOT_FOUND: 'CONTENT_CREATOR_NOT_FOUND',
    });
  });
});
