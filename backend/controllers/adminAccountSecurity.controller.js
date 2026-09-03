/**
 * Admin account-security controller (RUK-SEC-007).
 *
 * Lets an admin see which accounts are currently locked out from repeated failed logins,
 * and manually unlock one.
 */
const { unlockAccount, listLockedAccounts } = require('../services/loginLockout.service');

/**
 * @desc    List accounts currently locked by failed-login lockout
 * @route   GET /api/admin/account-security/locked
 * @access  Private (admin)
 */
const getLockedAccounts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    const accounts = await listLockedAccounts(Number.isFinite(limit) ? limit : undefined);
    return res.status(200).json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @desc    Unlock one account (clears failed-attempt count + lock)
 * @route   POST /api/admin/account-security/:userId/unlock
 * @access  Private (admin)
 */
const unlockUserAccount = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const result = await unlockAccount(userId);

    console.log(
      `[Auth:lockout] Admin ${req.user && req.user.email} manually unlocked account ${result.userId} (was locked: ${result.wasLocked})`
    );

    return res.status(200).json({
      success: true,
      message: result.wasLocked ? 'Account unlocked.' : 'Account was not locked; lockout state cleared.',
      data: result,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return next(error);
  }
};

module.exports = { getLockedAccounts, unlockUserAccount };
