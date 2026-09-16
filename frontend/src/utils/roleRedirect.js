/**
 * Where to send a user after a session is established, based on role. Shared by every login
 * completion path (direct login, admin email-OTP, TOTP/recovery-code login) so they all agree.
 * @param {string} role
 * @returns {string}
 */
export function getRoleRedirectPath(role) {
  if (role === 'parent') return '/parents/child';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'content_creator') return '/content-creator/dashboard';
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
  return getRoleRedirectPath(user?.role);
}
