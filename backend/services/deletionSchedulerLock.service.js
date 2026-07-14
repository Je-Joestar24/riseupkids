const os = require('os');
const DeletionSchedulerLock = require('../models/DeletionSchedulerLock');

const LOCK_ID = 'deletion-scheduler';

function getDefaultLockTtlMs() {
  return Math.max(
    60 * 1000,
    parseInt(process.env.DELETION_SCHEDULER_LOCK_MS || '300000', 10)
  );
}

function getLockOwner() {
  return `${os.hostname()}:${process.pid}`;
}

/**
 * Try to acquire the cluster-wide deletion scheduler lock.
 * @returns {Promise<boolean>}
 */
async function acquireDeletionSchedulerLock() {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + getDefaultLockTtlMs());
  const lockedBy = getLockOwner();

  const result = await DeletionSchedulerLock.findOneAndUpdate(
    {
      _id: LOCK_ID,
      $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }],
    },
    {
      $set: { lockedUntil, lockedBy },
      $setOnInsert: { _id: LOCK_ID },
    },
    { upsert: true, new: true }
  );

  return Boolean(result && result.lockedBy === lockedBy);
}

async function releaseDeletionSchedulerLock() {
  const lockedBy = getLockOwner();
  await DeletionSchedulerLock.updateOne(
    { _id: LOCK_ID, lockedBy },
    { $set: { lockedUntil: null, lockedBy: null } }
  );
}

module.exports = {
  acquireDeletionSchedulerLock,
  releaseDeletionSchedulerLock,
  getLockOwner,
};
