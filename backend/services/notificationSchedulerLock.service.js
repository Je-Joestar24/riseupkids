const os = require('os');
const NotificationSchedulerLock = require('../models/NotificationSchedulerLock');

const LOCK_ID = 'notification-scheduler';

function getDefaultLockTtlMs() {
  return Math.max(30 * 1000, parseInt(process.env.NOTIFICATION_SCHEDULER_LOCK_MS || '120000', 10));
}

function getLockOwner() {
  return `${os.hostname()}:${process.pid}`;
}

async function acquireNotificationSchedulerLock() {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + getDefaultLockTtlMs());
  const lockedBy = getLockOwner();

  const result = await NotificationSchedulerLock.findOneAndUpdate(
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

async function releaseNotificationSchedulerLock() {
  const lockedBy = getLockOwner();
  await NotificationSchedulerLock.updateOne(
    { _id: LOCK_ID, lockedBy },
    { $set: { lockedUntil: null, lockedBy: null } }
  );
}

module.exports = {
  acquireNotificationSchedulerLock,
  releaseNotificationSchedulerLock,
  getLockOwner,
};
