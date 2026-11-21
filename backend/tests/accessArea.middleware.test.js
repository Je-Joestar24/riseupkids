/**
 * Content creator access areas (step B5): the lock middleware on its own.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const { requireAccessArea, requireAnyAccessArea } = require('../middleware/accessArea');
const { AccessAreaError } = require('../utils/accessErrors');
const { ACCESS_AREA_KEYS, LEGACY_CREATOR_AREAS } = require('../utils/accessAreas');

const run = (middleware, user) => {
  const req = user === undefined ? {} : { user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next, error: next.mock.calls[0]?.[0] };
};

const creator = (accessAreas) => ({ role: 'content_creator', accessAreas });

describe('requireAccessArea: a content creator', () => {
  it('passes with the area', () => {
    const { next, res } = run(requireAccessArea('notifications'), creator(['notifications']));

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('is refused without it, with the 403 access error for that area', () => {
    const { next, error } = run(requireAccessArea('notifications'), creator(['contents', 'explore']));

    expect(next).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(AccessAreaError);
    expect(error.statusCode).toBe(403);
    expect(error.publicCode).toBe('ACCESS_AREA_REQUIRED');
    expect(error.area).toBe('notifications');
    expect(error.message).toContain('Notifications');
  });

  it('is refused with a list that has only other areas, every area against every other', () => {
    ACCESS_AREA_KEYS.forEach((needed) => {
      ACCESS_AREA_KEYS.filter((other) => other !== needed).forEach((other) => {
        expect(run(requireAccessArea(needed), creator([other])).error).toBeInstanceOf(AccessAreaError);
      });
      expect(run(requireAccessArea(needed), creator([needed])).error).toBeUndefined();
    });
  });

  it('with no saved list has what creators had before: the legacy set, and not Notifications or Experiences', () => {
    LEGACY_CREATOR_AREAS.forEach((area) => {
      expect(run(requireAccessArea(area), { role: 'content_creator' }).error).toBeUndefined();
    });
    expect(run(requireAccessArea('notifications'), { role: 'content_creator' }).error).toBeInstanceOf(AccessAreaError);
    expect(run(requireAccessArea('experiences'), { role: 'content_creator' }).error).toBeInstanceOf(AccessAreaError);
  });

  it('with an empty saved list is treated as having no list (the legacy set), not as locked out of everything', () => {
    expect(run(requireAccessArea('contents'), creator([])).error).toBeUndefined();
  });

  it('is never answered with a 401 (that would log her out): the refusal is a 403 error for the error handler', () => {
    const { res, error } = run(requireAccessArea('experiences'), creator(['explore']));

    expect(error.statusCode).toBe(403);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('requireAccessArea: everyone else is not limited by it', () => {
  it.each(['admin', 'teacher', 'parent', 'child'])('%s passes, whatever list is carried', (role) => {
    ACCESS_AREA_KEYS.forEach((area) => {
      const { next, error } = run(requireAccessArea(area), { role, accessAreas: [] });
      expect(error).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  it('an admin passes even when the same stray list says otherwise', () => {
    expect(run(requireAccessArea('notifications'), { role: 'admin', accessAreas: ['explore'] }).error).toBeUndefined();
  });
});

describe('requireAccessArea: no signed-in user', () => {
  it('answers 401 like authorize does, and does not continue', () => {
    const { res, next } = run(requireAccessArea('contents'));

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Not authorized. Please authenticate first.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('also for a null user', () => {
    const { res, next } = run(requireAccessArea('contents'), null);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAnyAccessArea (the few shared reads)', () => {
  const mw = requireAnyAccessArea('built_in_books', 'contents');

  it('passes a creator with either area', () => {
    expect(run(mw, creator(['built_in_books'])).error).toBeUndefined();
    expect(run(mw, creator(['contents'])).error).toBeUndefined();
    expect(run(mw, creator(['contents', 'built_in_books'])).error).toBeUndefined();
  });

  it('refuses a creator with neither, naming the first area', () => {
    const { error } = run(mw, creator(['explore', 'notifications']));

    expect(error).toBeInstanceOf(AccessAreaError);
    expect(error.area).toBe('built_in_books');
  });

  it('lets other roles through', () => {
    expect(run(mw, { role: 'admin' }).error).toBeUndefined();
    expect(run(mw, { role: 'teacher' }).error).toBeUndefined();
  });
});

describe('a typo in a route file stops the server from starting', () => {
  it('throws for an area that does not exist', () => {
    expect(() => requireAccessArea('notification')).toThrow(/unknown access area/);
    expect(() => requireAccessArea('')).toThrow();
    expect(() => requireAccessArea(undefined)).toThrow();
    expect(() => requireAnyAccessArea('contents', 'nope')).toThrow(/unknown access area/);
  });

  it('throws when no area is given at all', () => {
    expect(() => requireAnyAccessArea()).toThrow(/unknown access area/);
  });

  it('does not throw for every real area', () => {
    ACCESS_AREA_KEYS.forEach((area) => expect(() => requireAccessArea(area)).not.toThrow());
  });
});
