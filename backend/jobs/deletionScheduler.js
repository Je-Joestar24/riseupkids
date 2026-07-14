const accountDeletionService = require('../services/accountDeletion.service');
const {
  acquireDeletionSchedulerLock,
  releaseDeletionSchedulerLock,
} = require('../services/deletionSchedulerLock.service');

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30 * 1000;

let intervalHandle = null;
let running = false;

function isSchedulerEnabled() {
  const flag = process.env.DELETION_SCHEDULER_ENABLED;
  if (flag === 'false' || flag === '0') {
    return false;
  }
  if (flag === 'true' || flag === '1') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

async function runDueDeletions() {
  if (running) {
    return { skipped: true, reason: 'already_running' };
  }

  running = true;
  let lockAcquired = false;

  try {
    lockAcquired = await acquireDeletionSchedulerLock();
    if (!lockAcquired) {
      return { skipped: true, reason: 'lock_not_acquired' };
    }

    const results = await accountDeletionService.executeAllPendingRequests({ dueOnly: true });
    if (results.length > 0) {
      const succeeded = results.filter((row) => row.success).length;
      const failed = results.length - succeeded;
      console.log(
        `[DeletionScheduler] Processed ${results.length} due request(s): ${succeeded} succeeded, ${failed} failed`
      );
    }
    return { skipped: false, results };
  } catch (error) {
    console.error('[DeletionScheduler] Failed:', error.message);
    return { skipped: false, error: error.message };
  } finally {
    if (lockAcquired) {
      await releaseDeletionSchedulerLock().catch(() => null);
    }
    running = false;
  }
}

function startDeletionScheduler() {
  if (!isSchedulerEnabled()) {
    console.log('[DeletionScheduler] Disabled (set DELETION_SCHEDULER_ENABLED=true to enable in development)');
    return;
  }

  const intervalMs = Math.max(
    60 * 1000,
    parseInt(process.env.DELETION_SCHEDULER_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10)
  );

  setTimeout(() => {
    runDueDeletions();
  }, STARTUP_DELAY_MS);

  intervalHandle = setInterval(runDueDeletions, intervalMs);
  console.log(
    `[DeletionScheduler] Started — checking due deletions every ${Math.round(intervalMs / 60000)} minute(s)`
  );
}

function stopDeletionScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startDeletionScheduler,
  stopDeletionScheduler,
  runDueDeletions,
  isSchedulerEnabled,
};
