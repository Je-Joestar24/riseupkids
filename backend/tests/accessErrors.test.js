/**
 * Content creator access areas (step B3): the typed errors, and the central error handler passing their `code`
 * through to the client.
 * @see docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md
 */
const express = require('express');
const request = require('supertest');
const requestId = require('../middleware/requestId');
const errorHandler = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { ACCESS_AREA_KEYS } = require('../utils/accessAreas');
const {
  AccessError,
  AccessAreaError,
  AccessValidationError,
  ContentCreatorNotFoundError,
  assertValidAreas,
  accessAreasNotForRoleError,
  bulkRequestError,
  isAccessError,
  accessErrorBody,
  respondWithAccessError,
} = require('../utils/accessErrors');

describe('the typed errors', () => {
  it('AccessAreaError is a 403 that names the area in plain words', () => {
    const error = new AccessAreaError('notifications');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AccessError);
    expect(error.name).toBe('AccessAreaError');
    expect(error.statusCode).toBe(403);
    expect(error.publicCode).toBe('ACCESS_AREA_REQUIRED');
    expect(error.area).toBe('notifications');
    expect(error.message).toBe("You don't have access to Notifications. Ask an admin if you need it.");
  });

  it('is never a 401, for any area (a 401 would log the person out)', () => {
    ACCESS_AREA_KEYS.forEach((area) => {
      expect(new AccessAreaError(area).statusCode).toBe(403);
    });
  });

  it('uses the label of the area in the message, for every area', () => {
    expect(new AccessAreaError('star_cam_missions').message).toContain('Star Cam Missions');
    expect(new AccessAreaError('built_in_books').message).toContain('Built-in Books');
    expect(new AccessAreaError('experiences').message).toContain('Experiences');
  });

  it('says "this area" and keeps no area when the area is not a known one', () => {
    ['billing', undefined, null, 5, {}].forEach((area) => {
      const error = new AccessAreaError(area);
      expect(error.statusCode).toBe(403);
      expect(error.area).toBeNull();
      expect(error.message).toBe("You don't have access to this area. Ask an admin if you need it.");
    });
  });

  it('never prints a made-up area name into the message', () => {
    expect(new AccessAreaError('<script>alert(1)</script>').message).not.toContain('script');
  });

  it('AccessValidationError is a 400 with the code it was given', () => {
    const error = new AccessValidationError('ACCESS_AREAS_INVALID', 'Unknown area: billing.');

    expect(error).toBeInstanceOf(AccessError);
    expect(error.statusCode).toBe(400);
    expect(error.publicCode).toBe('ACCESS_AREAS_INVALID');
    expect(error.message).toBe('Unknown area: billing.');
  });

  it('ContentCreatorNotFoundError is a 404 with its own code', () => {
    const error = new ContentCreatorNotFoundError();

    expect(error.statusCode).toBe(404);
    expect(error.publicCode).toBe('CONTENT_CREATOR_NOT_FOUND');
    expect(error.message).toBe('Content creator not found');
  });

  it('has the readymade errors for "not for this role" and a bad bulk request', () => {
    const notForRole = accessAreasNotForRoleError();
    const bulk = bulkRequestError('Choose at most 100 people at a time.');

    expect([notForRole.statusCode, notForRole.publicCode]).toEqual([400, 'ACCESS_AREAS_NOT_FOR_ROLE']);
    expect(notForRole.message).toBe('Access areas only apply to content creators.');
    expect([bulk.statusCode, bulk.publicCode]).toEqual([400, 'ACCESS_BULK_INVALID']);
    expect(bulk.message).toBe('Choose at most 100 people at a time.');
  });

  it('isAccessError recognises exactly these errors', () => {
    expect(isAccessError(new AccessAreaError('explore'))).toBe(true);
    expect(isAccessError(new ContentCreatorNotFoundError())).toBe(true);
    expect(isAccessError(bulkRequestError('x'))).toBe(true);
    expect(isAccessError(new Error('x'))).toBe(false);
    expect(isAccessError(Object.assign(new Error('x'), { statusCode: 403, publicCode: 'ACCESS_AREA_REQUIRED' }))).toBe(false);
    expect(isAccessError(null)).toBe(false);
    expect(isAccessError('ACCESS_AREA_REQUIRED')).toBe(false);
  });
});

describe('assertValidAreas', () => {
  it('returns the clean list: no duplicates, in the usual order', () => {
    expect(assertValidAreas(['notifications', 'dashboard', 'dashboard'])).toEqual(['dashboard', 'notifications']);
  });

  it.each([
    [undefined, 'ACCESS_AREAS_REQUIRED', 'Choose at least one area.'],
    [null, 'ACCESS_AREAS_REQUIRED', 'Choose at least one area.'],
    [[], 'ACCESS_AREAS_EMPTY', 'Choose at least one area. To stop this person using the site, archive them.'],
    ['contents', 'ACCESS_AREAS_INVALID', 'Access areas must be a list.'],
    [['contents', 'billing'], 'ACCESS_AREAS_INVALID', 'Unknown area: billing.'],
    [[1], 'ACCESS_AREAS_INVALID', 'Unknown area: a number value.'],
  ])('throws a 400 for %j with the right code and message', (input, code, message) => {
    let thrown;
    try {
      assertValidAreas(input);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AccessValidationError);
    expect(thrown.statusCode).toBe(400);
    expect(thrown.publicCode).toBe(code);
    expect(thrown.message).toBe(message);
  });

  it('does not change the list it was given', () => {
    const sent = ['notifications', 'dashboard'];
    assertValidAreas(sent);
    expect(sent).toEqual(['notifications', 'dashboard']);
  });
});

describe('accessErrorBody and respondWithAccessError (for controllers that catch their own errors)', () => {
  const fakeRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };

  it('builds the usual { success, message, code } body', () => {
    expect(accessErrorBody(new AccessAreaError('experiences'))).toEqual({
      success: false,
      message: "You don't have access to Experiences. Ask an admin if you need it.",
      code: 'ACCESS_AREA_REQUIRED',
    });
  });

  it('answers an access error with its status and body, and says it did', () => {
    const res = fakeRes();

    expect(respondWithAccessError(res, new ContentCreatorNotFoundError())).toBe(true);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Content creator not found',
      code: 'CONTENT_CREATOR_NOT_FOUND',
    });
  });

  it('leaves any other error alone and says it did not handle it', () => {
    const res = fakeRes();

    expect(respondWithAccessError(res, new Error('boom'))).toBe(false);
    expect(respondWithAccessError(res, undefined)).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('the central error handler and the `code`', () => {
  const NODE_ENV = process.env.NODE_ENV;
  let errSpy;
  let warnSpy;

  beforeEach(() => {
    errSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
    warnSpy.mockRestore();
    process.env.NODE_ENV = NODE_ENV;
  });

  const buildApp = () => {
    const app = express();
    app.use(requestId);
    const failWith = (path, make) => app.get(path, (req, res, next) => next(make()));
    failWith('/no-area', () => new AccessAreaError('notifications'));
    failWith('/bad-list', () => {
      try {
        assertValidAreas(['billing']);
      } catch (error) {
        return error;
      }
      return new Error('should have thrown');
    });
    failWith('/missing', () => new ContentCreatorNotFoundError());
    failWith('/plain-500', () => new Error('DB connection string mongodb://user:pass@host failed'));
    failWith('/plain-400', () => Object.assign(new Error('email is required'), { statusCode: 400 }));
    failWith('/mongo-duplicate', () => Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));
    failWith('/network', () => Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED' }));
    failWith('/lookalike', () => Object.assign(new Error('x'), { statusCode: 403, code: 'ACCESS_AREA_REQUIRED' }));
    failWith('/empty-code', () => Object.assign(new Error('x'), { statusCode: 400, publicCode: '' }));
    failWith('/non-string-code', () => Object.assign(new Error('x'), { statusCode: 400, publicCode: { a: 1 } }));
    app.use(errorHandler);
    return app;
  };

  it('sends a 403 with the code and the friendly message when a creator lacks an area', async () => {
    const res = await request(buildApp()).get('/no-area');

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        code: 'ACCESS_AREA_REQUIRED',
        message: "You don't have access to Notifications. Ask an admin if you need it.",
      })
    );
    expect(res.body.requestId).toBeTruthy();
  });

  it('sends the 400 for a bad list with its code', async () => {
    const res = await request(buildApp()).get('/bad-list');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ACCESS_AREAS_INVALID');
    expect(res.body.message).toBe('Unknown area: billing.');
  });

  it('sends the 404 for a missing creator with its code', async () => {
    const res = await request(buildApp()).get('/missing');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CONTENT_CREATOR_NOT_FOUND');
  });

  it('keeps the code and the message in production too (a 4xx is meant to be shown)', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(buildApp()).get('/no-area');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCESS_AREA_REQUIRED');
    expect(res.body.message).toContain('Notifications');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('adds no code to an ordinary error, and a 500 still hides its detail in production', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request(buildApp()).get('/plain-500');

    expect(res.status).toBe(500);
    expect(res.body).not.toHaveProperty('code');
    expect(res.body.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('mongodb://');
  });

  it('adds no code to an ordinary 4xx either', async () => {
    const res = await request(buildApp()).get('/plain-400');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('email is required');
    expect(res.body).not.toHaveProperty('code');
  });

  it('never sends a library error code (Mongo 11000, ECONNREFUSED) as the code', async () => {
    const duplicate = await request(buildApp()).get('/mongo-duplicate');
    const network = await request(buildApp()).get('/network');

    expect(duplicate.status).toBe(400);
    expect(duplicate.body).not.toHaveProperty('code');
    expect(network.body).not.toHaveProperty('code');
    expect(JSON.stringify(network.body)).not.toContain('ECONNREFUSED');
  });

  it('does not treat a plain `code` property as a public code (only `publicCode` opts in)', async () => {
    const res = await request(buildApp()).get('/lookalike');

    expect(res.body).not.toHaveProperty('code');
  });

  it('ignores an empty or non-text publicCode', async () => {
    const empty = await request(buildApp()).get('/empty-code');
    const odd = await request(buildApp()).get('/non-string-code');

    expect(empty.body).not.toHaveProperty('code');
    expect(odd.body).not.toHaveProperty('code');
  });

  it('writes a refusal to the log as a one-line warning, not an error', async () => {
    await request(buildApp()).get('/no-area');

    expect(warnSpy).toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();
  });
});
