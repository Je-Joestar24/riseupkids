import { describe, expect, it } from 'vitest';
import { getRoleRedirectPath, getPostLoginRedirectPath } from './roleRedirect';

const creator = (accessAreas) => ({ _id: 'c1', role: 'content_creator', accessAreas });

describe('getRoleRedirectPath', () => {
  it('keeps the same address for every role but the content creator', () => {
    expect(getRoleRedirectPath('parent')).toBe('/parents/child');
    expect(getRoleRedirectPath('admin')).toBe('/admin/dashboard');
    expect(getRoleRedirectPath('teacher')).toBe('/teacher/dashboard');
    expect(getRoleRedirectPath('child')).toBe('/');
    expect(getRoleRedirectPath(undefined)).toBe('/');
  });

  it('opens a creator from before access areas on the Dashboard, as before', () => {
    expect(getRoleRedirectPath('content_creator', { role: 'content_creator' })).toBe('/content-creator/dashboard');
    expect(getRoleRedirectPath('content_creator', creator(undefined))).toBe('/content-creator/dashboard');
  });

  it('opens a creator on her first allowed page', () => {
    expect(getRoleRedirectPath('content_creator', creator(['notifications']))).toBe('/content-creator/notifications');
    expect(getRoleRedirectPath('content_creator', creator(['experiences', 'explore']))).toBe('/content-creator/explore');
    expect(getRoleRedirectPath('content_creator', creator(['dashboard', 'notifications']))).toBe('/content-creator/dashboard');
  });

  it('with only the role (no user known) treats her as a creator with no saved list: the Dashboard', () => {
    expect(getRoleRedirectPath('content_creator')).toBe('/content-creator/dashboard');
  });

  it('ignores a user object that is not a creator\'s', () => {
    expect(getRoleRedirectPath('content_creator', { role: 'admin' })).toBe('/content-creator/dashboard');
  });

  it('opens a creator with no area at all on /content-creator, which tells her so', () => {
    expect(getRoleRedirectPath('content_creator', creator(['retired_area']))).toBe('/content-creator');
  });
});

describe('getPostLoginRedirectPath', () => {
  it('sends a creator to her landing page, whichever way she signed in', () => {
    expect(getPostLoginRedirectPath(creator(['notifications']), false)).toBe('/content-creator/notifications');
    expect(getPostLoginRedirectPath(creator(['dashboard']), null)).toBe('/content-creator/dashboard');
    expect(getPostLoginRedirectPath({ role: 'content_creator' })).toBe('/content-creator/dashboard');
  });

  it('keeps the admin rule: no two-factor yet means the setup screen', () => {
    expect(getPostLoginRedirectPath({ role: 'admin' }, true)).toBe('/admin/setup-2fa');
    expect(getPostLoginRedirectPath({ role: 'admin' }, false)).toBe('/admin/dashboard');
  });

  it('keeps the other roles as they were, and is safe with no user', () => {
    expect(getPostLoginRedirectPath({ role: 'parent' })).toBe('/parents/child');
    expect(getPostLoginRedirectPath({ role: 'teacher' })).toBe('/teacher/dashboard');
    expect(getPostLoginRedirectPath(undefined)).toBe('/');
    expect(getPostLoginRedirectPath(null, true)).toBe('/');
  });
});
