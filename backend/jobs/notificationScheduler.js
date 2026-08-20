const { NotificationCampaign } = require('../models');
const {
  acquireNotificationSchedulerLock,
  releaseNotificationSchedulerLock,
} = require('../services/notificationSchedulerLock.service');
const { sendCampaignNow } = require('../services/notificationSend.services');

const DEFAULT_INTERVAL_MS = 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;

let intervalHandle = null;
let running = false;

function isNotificationSchedulerEnabled() {
  const flag = process.env.NOTIFICATION_SCHEDULER_ENABLED;
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return process.env.NODE_ENV === 'production';
}

async function findDueCampaigns(now = new Date()) {
  return NotificationCampaign.find({
    status: 'scheduled',
    sendAt: { $lte: now },
  })
    .select('_id sendAt timezone status')
    .lean();
}

async function processDueCampaigns(now = new Date()) {
  const due = await findDueCampaigns(now);
  const results = [];
  for (const campaign of due) {
    try {
      const sent = await sendCampaignNow(campaign._id, campaign.scheduledBy || null);
      results.push({ campaignId: String(campaign._id), success: true, status: sent.status });
    } catch (error) {
      console.error(`[NotificationScheduler] campaign ${campaign._id} failed:`, error.message);
      results.push({
        campaignId: String(campaign._id),
        success: false,
        error: error.message || 'job_failed',
      });
    }
  }
  return results;
}

async function runDueNotifications(now = new Date()) {
  if (running) {
    return { skipped: true, reason: 'already_running' };
  }

  running = true;
  let lockAcquired = false;

  try {
    lockAcquired = await acquireNotificationSchedulerLock();
    if (!lockAcquired) {
      return { skipped: true, reason: 'lock_not_acquired' };
    }

    const results = await processDueCampaigns(now);
    if (results.length > 0) {
      const succeeded = results.filter((row) => row.success).length;
      console.log(
        `[NotificationScheduler] Processed ${results.length} due campaign(s): ${succeeded} succeeded`
      );
    }
    return { skipped: false, results };
  } catch (error) {
    console.error('[NotificationScheduler] Failed:', error.message);
    return { skipped: false, error: error.message };
  } finally {
    if (lockAcquired) {
      await releaseNotificationSchedulerLock().catch(() => null);
    }
    running = false;
  }
}

function startNotificationScheduler() {
  if (!isNotificationSchedulerEnabled()) {
    console.log(
      '[NotificationScheduler] Disabled (set NOTIFICATION_SCHEDULER_ENABLED=true to enable in development)'
    );
    return;
  }

  const intervalMs = Math.max(
    15 * 1000,
    parseInt(process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10)
  );

  setTimeout(() => {
    runDueNotifications();
  }, STARTUP_DELAY_MS);

  intervalHandle = setInterval(() => runDueNotifications(), intervalMs);
  console.log(
    `[NotificationScheduler] Started — checking due campaigns every ${Math.round(intervalMs / 1000)} second(s)`
  );
}

function stopNotificationScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  startNotificationScheduler,
  stopNotificationScheduler,
  runDueNotifications,
  findDueCampaigns,
  isNotificationSchedulerEnabled,
};
