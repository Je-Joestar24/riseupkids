/**
 * Wipe admin notification campaigns and delivery receipts.
 * Keeps parent device push tokens so phones stay registered.
 *
 * Dry-run (counts + latest campaign names):
 *   node scripts/cleanupNotifications.js
 *
 * Delete (requires the exact phrase):
 *   node scripts/cleanupNotifications.js --confirm=DELETE_NOTIFICATIONS
 *
 * Uses backend/.env MONGODB_URI. To clean production, run this on the
 * production host or pass that URI for this one command only.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/database');
const {
  NotificationCampaign,
  NotificationReceipt,
  NotificationSchedulerLock,
  DevicePushToken,
} = require('../models');

const CONFIRM_VALUE = 'DELETE_NOTIFICATIONS';
const SAMPLE_LIMIT = 15;

function parseArgs(argv = process.argv.slice(2)) {
  const confirmArg = argv.find((arg) => arg === '--confirm' || arg.startsWith('--confirm='));
  if (!confirmArg) {
    return { confirm: false, confirmRejected: false };
  }
  if (confirmArg === '--confirm') {
    return { confirm: false, confirmRejected: true };
  }
  return {
    confirm: confirmArg.slice('--confirm='.length) === CONFIRM_VALUE,
    confirmRejected: confirmArg.slice('--confirm='.length) !== CONFIRM_VALUE,
  };
}

function describeMongoTarget(uri) {
  const raw = String(uri || '').trim();
  if (!raw) return '(no MONGODB_URI)';
  try {
    const normalized = raw.replace(/^mongodb\+srv:\/\//i, 'https://').replace(/^mongodb:\/\//i, 'http://');
    const parsed = new URL(normalized);
    const dbName = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    return `${parsed.hostname}${dbName}`;
  } catch {
    return '(unparsed Mongo host)';
  }
}

async function inspectNotificationCleanup() {
  const [campaigns, receipts, testReceipts, tokens, locks] = await Promise.all([
    NotificationCampaign.countDocuments({}),
    NotificationReceipt.countDocuments({}),
    NotificationReceipt.countDocuments({ isTest: true }),
    DevicePushToken.countDocuments({}),
    NotificationSchedulerLock.countDocuments({}),
  ]);
  const samples = await NotificationCampaign.find()
    .select('internalName status createdAt')
    .sort({ createdAt: -1 })
    .limit(SAMPLE_LIMIT)
    .lean();

  return { campaigns, receipts, testReceipts, tokens, locks, samples };
}

async function runNotificationCleanup({ confirm = false } = {}) {
  const preview = await inspectNotificationCleanup();
  if (!confirm) {
    return { dryRun: true, deleted: null, preview };
  }

  const receipts = await NotificationReceipt.deleteMany({});
  const campaigns = await NotificationCampaign.deleteMany({});
  const locks = await NotificationSchedulerLock.deleteMany({});

  return {
    dryRun: false,
    deleted: {
      receipts: receipts.deletedCount || 0,
      campaigns: campaigns.deletedCount || 0,
      schedulerLocks: locks.deletedCount || 0,
    },
    preview,
  };
}

function printPreview(preview) {
  console.log('[CleanupNotifications] Current counts:');
  console.log(`  campaigns=${preview.campaigns}`);
  console.log(`  receipts=${preview.receipts} (tests=${preview.testReceipts})`);
  console.log(`  schedulerLocks=${preview.locks}`);
  console.log(`  devicePushTokens=${preview.tokens} (kept)`);
  if (!preview.samples.length) {
    console.log('  latest campaigns: (none)');
    return;
  }
  console.log(`  latest campaigns (up to ${SAMPLE_LIMIT}):`);
  preview.samples.forEach((row) => {
    const created = row.createdAt ? new Date(row.createdAt).toISOString() : '';
    console.log(`    - ${row.status || 'unknown'} | ${row.internalName || '(unnamed)'} | ${created}`);
  });
}

async function main() {
  const { confirm, confirmRejected } = parseArgs();
  const target = describeMongoTarget(process.env.MONGODB_URI);

  await connectDB();
  console.log(`[CleanupNotifications] Target: ${target}`);

  if (confirmRejected) {
    console.error(
      `[CleanupNotifications] Refusing to delete. Use --confirm=${CONFIRM_VALUE} (dry-run first).`
    );
    await mongoose.connection.close();
    process.exit(1);
  }

  const result = await runNotificationCleanup({ confirm });
  printPreview(result.preview);

  if (result.dryRun) {
    console.log(
      `[CleanupNotifications] Dry-run only. Device tokens are not deleted. To wipe campaigns and receipts: --confirm=${CONFIRM_VALUE}`
    );
  } else {
    console.log(
      `[CleanupNotifications] Deleted campaigns=${result.deleted.campaigns} receipts=${result.deleted.receipts} schedulerLocks=${result.deleted.schedulerLocks}`
    );
  }

  await mongoose.connection.close();
}

module.exports = {
  CONFIRM_VALUE,
  parseArgs,
  describeMongoTarget,
  inspectNotificationCleanup,
  runNotificationCleanup,
};

if (require.main === module) {
  main().catch(async (error) => {
    console.error('[CleanupNotifications] Failed:', error);
    try {
      await mongoose.connection.close();
    } catch (_) {
      /* ignore */
    }
    process.exit(1);
  });
}
