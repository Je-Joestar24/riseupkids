import { describe, it, expect } from 'vitest';
import userReducer, {
  loginUser,
  verifyLoginTwoFactorUser,
  bootstrapSession,
  getCurrentUser,
} from './userSlice';

const baseState = {
  user: null,
  token: null,
  childProfiles: null,
  childProfile: null,
  parent: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  twoFactorEnrollmentRequired: null,
};

describe('userSlice — Chunk 10 two-factor / enrollment-required reducers', () => {
  it('loginUser.fulfilled with requiresTwoFactor does NOT authenticate', () => {
    const action = { type: loginUser.fulfilled.type, payload: { requiresTwoFactor: true, email: 'p@example.com' } };
    const state = userReducer(baseState, action);

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('loginUser.fulfilled with a direct session (no 2FA) authenticates and stores the enrollment flag', () => {
    const action = {
      type: loginUser.fulfilled.type,
      payload: { user: { role: 'parent' }, token: 'jwt', twoFactorEnrollmentRequired: null },
    };
    const state = userReducer(baseState, action);

    expect(state.isAuthenticated).toBe(true);
    expect(state.twoFactorEnrollmentRequired).toBeNull();
  });

  it('verifyLoginTwoFactorUser.fulfilled authenticates and threads twoFactorEnrollmentRequired through', () => {
    const action = {
      type: verifyLoginTwoFactorUser.fulfilled.type,
      payload: { user: { role: 'admin' }, token: 'jwt', twoFactorEnrollmentRequired: false },
    };
    const state = userReducer(baseState, action);

    expect(state.isAuthenticated).toBe(true);
    expect(state.user.role).toBe('admin');
    expect(state.twoFactorEnrollmentRequired).toBe(false);
  });

  it('verifyLoginTwoFactorUser.rejected does not authenticate', () => {
    const action = { type: verifyLoginTwoFactorUser.rejected.type, payload: 'Invalid verification code' };
    const state = userReducer({ ...baseState, isAuthenticated: false }, action);

    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid verification code');
  });

  it('bootstrapSession.fulfilled (authenticated) carries the enrollment flag into state', () => {
    const action = {
      type: bootstrapSession.fulfilled.type,
      payload: { authenticated: true, user: { role: 'admin' }, childProfiles: null, twoFactorEnrollmentRequired: true },
    };
    const state = userReducer(baseState, action);

    expect(state.isAuthenticated).toBe(true);
    expect(state.twoFactorEnrollmentRequired).toBe(true);
  });

  it('bootstrapSession.fulfilled (not authenticated) resets the enrollment flag to null', () => {
    const action = { type: bootstrapSession.fulfilled.type, payload: { authenticated: false } };
    const state = userReducer(
      { ...baseState, isAuthenticated: true, twoFactorEnrollmentRequired: true },
      action
    );

    expect(state.isAuthenticated).toBe(false);
    expect(state.twoFactorEnrollmentRequired).toBeNull();
  });

  it('getCurrentUser.fulfilled (re-fetch on /me) updates the enrollment flag — e.g. right after enrolling', () => {
    const action = {
      type: getCurrentUser.fulfilled.type,
      payload: { user: { role: 'admin' }, twoFactorEnrollmentRequired: false },
    };
    const state = userReducer({ ...baseState, twoFactorEnrollmentRequired: true }, action);

    expect(state.twoFactorEnrollmentRequired).toBe(false);
  });
});
