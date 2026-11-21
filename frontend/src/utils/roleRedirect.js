import { creatorLandingPath } from './contentCreatorAccess';

/**
 * Where to send a user after a session is established, based on role. Shared by every login
 * completion path (direct login, admin email-OTP, TOTP/recovery-code login) so they all agree.
 *
 * A content creator lands on her first allowed page (a creator who only has Notifications opens straight on
 * Notifications); one with no area at all lands on /content-creator, which tells her so.
 * @param {string} role
 * @param {{ role?: string, accessAreas?: string[] }} [user] the signed-in user, when known (needed for a creator's list)
 * @returns {string}
 */
export function getRoleRedirectPath(role, user) {
  if (role === 'parent') return '/parents/child';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'content_creator') {
    return creatorLandingPath(user?.role === 'content_creator' ? user : { role }) || '/content-creator';
  }
  return '/';
}

/**
 * Chunk 10: an admin who hasn't enrolled TOTP yet is sent to the mandatory setup screen instead
 * of their normal dashboard, regardless of which login path they completed.
 * @param {{ role?: string }} [user]
 * @param {boolean} [twoFactorEnrollmentRequired]
 * @returns {string}
 */
export function getPostLoginRedirectPath(user, twoFactorEnrollmentRequired) {
  if (user?.role === 'admin' && twoFactorEnrollmentRequired) {
    return '/admin/setup-2fa';
  }
  return getRoleRedirectPath(user?.role, user);
}
