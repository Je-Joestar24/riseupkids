/**
 * Schedule badge recomputation without blocking the star-reward API response.
 * Failures are logged only — badges must never delay stars/UI.
 *
 * @param {string} childId
 * @param {{ silent?: boolean }} [options]
 */
function scheduleBadgeUpdate(childId, options = {}) {
  if (!childId) return;

  const silent = options.silent !== undefined ? options.silent : false;

  const run = () => {
    try {
      const badgeCheck = require('../services/badgeCheck.service');
      Promise.resolve(badgeCheck.updateBadges(childId, { silent }))
        .catch((badgeError) => {
          console.error(
            `[scheduleBadgeUpdate] Error checking badges for child ${childId}:`,
            badgeError
          );
        });
    } catch (err) {
      console.error(
        `[scheduleBadgeUpdate] Failed to start badge check for child ${childId}:`,
        err
      );
    }
  };

  if (typeof setImmediate === 'function') {
    setImmediate(run);
  } else {
    setTimeout(run, 0);
  }
}

module.exports = {
  scheduleBadgeUpdate,
};
