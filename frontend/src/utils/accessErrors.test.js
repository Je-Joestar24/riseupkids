import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import {
  ACCESS_ERROR_CODES,
  NETWORK_MESSAGE,
  accessErrorMessage,
  errorCodeOf,
  errorStatusOf,
  isAccessAreaRequiredError,
} from './accessErrors';

describe('the codes match the server (contract)', () => {
  const backend = createRequire(import.meta.url)('../../../backend/utils/accessAreas.js');

  it('are exactly the codes the server answers with', () => {
    expect(ACCESS_ERROR_CODES).toEqual(backend.ACCESS_ERROR_CODES);
  });

  it('cannot be changed by accident', () => {
    expect(() => {
      ACCESS_ERROR_CODES.AREA_REQUIRED = 'x';
    }).toThrow();
  });
});

describe('accessErrorMessage', () => {
  it('gives every known code a plain sentence, even when the server sent none', () => {
    Object.values(ACCESS_ERROR_CODES).forEach((code) => {
      const message = accessErrorMessage(code, undefined, 'fallback');
      expect(message).not.toBe('fallback');
      expect(message).not.toContain('ACCESS_');
      expect(message.length).toBeGreaterThan(10);
    });
  });

  it('ignores the server wording for most codes, so the screen never depends on it', () => {
    expect(accessErrorMessage('ACCESS_AREAS_EMPTY', 'some other sentence', 'f')).toMatch(/archive/i);
    expect(accessErrorMessage('ACCESS_AREAS_REQUIRED', 'whatever', 'f')).toBe('Choose at least one area.');
    expect(accessErrorMessage('CONTENT_CREATOR_NOT_FOUND', 'x', 'f')).toMatch(/could not be found/);
    expect(accessErrorMessage('ACCESS_AREAS_NOT_FOR_ROLE', 'x', 'f')).toMatch(/only apply to content creators/);
  });

  it('uses the server sentence where it names the thing that is wrong', () => {
    expect(accessErrorMessage('ACCESS_AREAS_INVALID', 'Unknown area: billing.', 'f')).toBe('Unknown area: billing.');
    expect(accessErrorMessage('ACCESS_AREA_REQUIRED', "You don't have access to Notifications. Ask an admin if you need it.", 'f')).toContain(
      'Notifications'
    );
    expect(accessErrorMessage('ACCESS_BULK_INVALID', 'Choose at most 100 people at a time.', 'f')).toBe('Choose at most 100 people at a time.');
  });

  it('falls back to the general sentence for those when the server sent none or only spaces', () => {
    ['ACCESS_AREAS_INVALID', 'ACCESS_AREA_REQUIRED', 'ACCESS_BULK_INVALID'].forEach((code) => {
      [undefined, null, '', '   ', 5, {}].forEach((message) => {
        expect(accessErrorMessage(code, message, 'f')).not.toBe('f');
        expect(typeof accessErrorMessage(code, message, 'f')).toBe('string');
      });
    });
  });

  it('for a code it does not know, shows the server sentence, else the fallback', () => {
    expect(accessErrorMessage('SOMETHING_NEW', 'Try again later.', 'fallback')).toBe('Try again later.');
    expect(accessErrorMessage('SOMETHING_NEW', '', 'fallback')).toBe('fallback');
    expect(accessErrorMessage(null, undefined, 'fallback')).toBe('fallback');
    expect(accessErrorMessage(undefined, '  ', 'fallback')).toBe('fallback');
    expect(accessErrorMessage(42, 'Hello', 'fallback')).toBe('Hello');
  });

  it('is not fooled by a code that is an inherited property name', () => {
    expect(accessErrorMessage('constructor', undefined, 'fallback')).toBe('fallback');
    expect(accessErrorMessage('toString', undefined, 'fallback')).toBe('fallback');
  });

  it('has a sentence for being offline', () => {
    expect(NETWORK_MESSAGE).toMatch(/Could not reach the server/);
  });
});

describe('errorCodeOf and errorStatusOf', () => {
  it('read an axios error', () => {
    const error = { response: { status: 403, data: { code: 'ACCESS_AREA_REQUIRED' } } };

    expect(errorCodeOf(error)).toBe('ACCESS_AREA_REQUIRED');
    expect(errorStatusOf(error)).toBe(403);
  });

  it('read one of our own API errors', () => {
    const error = Object.assign(new Error('x'), { code: 'ACCESS_AREAS_EMPTY', status: 400 });

    expect(errorCodeOf(error)).toBe('ACCESS_AREAS_EMPTY');
    expect(errorStatusOf(error)).toBe(400);
  });

  it('say null for anything else', () => {
    [undefined, null, 'text', 5, {}, { response: {} }, { response: { data: {} } }, { code: 5, status: 'x' }].forEach((error) => {
      expect(errorCodeOf(error)).toBeNull();
      expect(errorStatusOf(error)).toBeNull();
    });
  });
});

describe('isAccessAreaRequiredError', () => {
  it('is true for a 403 with the access code, from axios or from our own error', () => {
    expect(isAccessAreaRequiredError({ response: { status: 403, data: { code: 'ACCESS_AREA_REQUIRED' } } })).toBe(true);
    expect(isAccessAreaRequiredError(Object.assign(new Error('x'), { status: 403, code: 'ACCESS_AREA_REQUIRED' }))).toBe(true);
  });

  it('is false for every other 403 (a role refusal, or an admin who has not set up two-factor)', () => {
    expect(isAccessAreaRequiredError({ response: { status: 403, data: { message: 'not authorized' } } })).toBe(false);
    expect(isAccessAreaRequiredError({ response: { status: 403, data: { code: 'TWO_FACTOR_ENROLLMENT_REQUIRED' } } })).toBe(false);
  });

  it('is false for a 401, even with that code (a 401 is "signed out", a different thing)', () => {
    expect(isAccessAreaRequiredError({ response: { status: 401, data: { code: 'ACCESS_AREA_REQUIRED' } } })).toBe(false);
  });

  it('is false for the same code on another status, and for nothing', () => {
    expect(isAccessAreaRequiredError({ response: { status: 400, data: { code: 'ACCESS_AREA_REQUIRED' } } })).toBe(false);
    expect(isAccessAreaRequiredError(null)).toBe(false);
    expect(isAccessAreaRequiredError(undefined)).toBe(false);
    expect(isAccessAreaRequiredError(new Error('Network Error'))).toBe(false);
  });
});
