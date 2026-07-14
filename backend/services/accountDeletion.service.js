const crypto = require('crypto');
const {
  User,
  ChildProfile,
  ChildStats,
  Progress,
  BookReading,
  AudioAssignmentProgress,
  ChantProgress,
  StarEarning,
  CourseProgress,
  VideoWatch,
  KidsWallPost,
  StarCamEvent,
  ContactSupport,
  PasswordResetToken,
  Media,
  GoogleIntegration,
} = require('../models');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const s3Service = require('./s3.service');
const mailService = require('./mail');
const { cancelSubscription } = require('./stripe.services');

const CONFIRM_TEXT = 'DELETE';
const DELETION_ESTIMATED_DAYS = Math.max(
  1,
  parseInt(process.env.ACCOUNT_DELETION_DAYS || '30', 10)
);
const DELETION_PROCESSING_STALE_MINUTES = Math.max(
  5,
  parseInt(process.env.DELETION_PROCESSING_STALE_MINUTES || '60', 10)
);

function getProcessingStaleCutoff() {
  return new Date(Date.now() - DELETION_PROCESSING_STALE_MINUTES * 60 * 1000);
}

function getEstimatedCompletionDate(fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + DELETION_ESTIMATED_DAYS);
  return date;
}

function assertConfirmText(confirmText) {
  if (String(confirmText || '').trim().toUpperCase() !== CONFIRM_TEXT) {
    throw new Error(`Please type ${CONFIRM_TEXT} to confirm deletion`);
  }
}

async function verifyParentPassword(userId, password) {
  if (!password) {
    throw new Error('Password is required to confirm deletion');
  }
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found');
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new Error('Password is incorrect');
  }
  return user;
}

async function findPendingRequest({ userId, childId, type }) {
  const query = {
    userId,
    type,
    status: { $in: ['pending', 'processing'] },
  };
  if (childId) {
    query.childId = childId;
  }
  return AccountDeletionRequest.findOne(query);
}

async function sendDeletionRequestedEmail({ to, type, childDisplayName, estimatedDays }) {
  try {
    await mailService.sendDeletionRequested({
      to,
      type,
      childDisplayName,
      estimatedDays,
    });
  } catch (error) {
    console.error('[AccountDeletion] Failed to send requested email:', error.message);
  }
}

async function sendDeletionCompletedEmail({ to, type, childDisplayName }) {
  try {
    await mailService.sendDeletionCompleted({
      to,
      type,
      childDisplayName,
    });
  } catch (error) {
    console.error('[AccountDeletion] Failed to send completed email:', error.message);
  }
}

/**
 * Attempt Stripe subscription cancellation when parent deletes account.
 */
async function handleSubscriptionOnAccountDeletion(user) {
  const notes = [];

  if (
    user.stripeSubscriptionId &&
    String(user.stripeSubscriptionId).startsWith('sub_') &&
    user.subscriptionStatus === 'active'
  ) {
    try {
      await cancelSubscription(user.stripeSubscriptionId);
      user.subscriptionStatus = 'canceled';
      user.planKidsLimit = null;
      notes.push('Stripe subscription set to cancel at period end.');
    } catch (error) {
      notes.push(`Stripe subscription cancel failed: ${error.message}. Admin follow-up required.`);
    }
  } else if (user.paymentProvider === 'stripe' && user.subscriptionStatus === 'active') {
    user.subscriptionStatus = 'canceled';
    user.planKidsLimit = null;
    notes.push('Stripe Family Plan access revoked (one-time purchase; no recurring subscription to cancel).');
  } else if (user.paymentProvider === 'pagseguro') {
    notes.push(
      'PagSeguro Family Plan access revoked. Paid access ends immediately; transaction records may be retained for legal/tax requirements.'
    );
    user.subscriptionStatus = 'canceled';
    user.planKidsLimit = null;
  } else if (user.paymentProvider === 'paypal') {
    notes.push(
      'PayPal Family Plan access revoked. Paid access ends immediately; transaction records may be retained for legal/tax requirements.'
    );
    user.subscriptionStatus = 'canceled';
    user.planKidsLimit = null;
  } else if (user.subscriptionStatus === 'active') {
    user.subscriptionStatus = 'canceled';
    user.planKidsLimit = null;
    notes.push('Subscription access revoked.');
  }

  return notes.join(' ');
}

async function deleteS3KeyBestEffort(keyOrUrl) {
  if (!keyOrUrl || typeof keyOrUrl !== 'string') return;
  const trimmed = keyOrUrl.trim();
  if (!trimmed) return;

  const key = trimmed.startsWith('http')
    ? s3Service.getS3KeyFromUrl(trimmed)
    : trimmed;

  if (key) {
    await s3Service.deleteByKey(key).catch(() => null);
  }
}

async function collectChildMediaRecords(childId) {
  const mediaIds = new Set();

  const audioProgress = await AudioAssignmentProgress.find({ child: childId }).select('recordedAudio').lean();
  audioProgress.forEach((row) => {
    if (row.recordedAudio) mediaIds.add(String(row.recordedAudio));
  });

  const chantProgress = await ChantProgress.find({ child: childId }).select('recordedAudio').lean();
  chantProgress.forEach((row) => {
    if (row.recordedAudio) mediaIds.add(String(row.recordedAudio));
  });

  const wallPosts = await KidsWallPost.find({ child: childId }).select('images videos').lean();
  wallPosts.forEach((post) => {
    (post.images || []).forEach((id) => mediaIds.add(String(id)));
    (post.videos || []).forEach((id) => mediaIds.add(String(id)));
  });

  const mediaDocs =
    mediaIds.size > 0
      ? await Media.find({ _id: { $in: [...mediaIds] } }).select('_id filePath url').lean()
      : [];

  return mediaDocs;
}

/**
 * Hard-delete all child-linked Mongo records and S3 media.
 */
async function purgeChildData(childId) {
  const child = await ChildProfile.findById(childId).lean();
  if (!child) {
    throw new Error('Child profile not found');
  }

  const mediaDocs = await collectChildMediaRecords(childId);
  let s3Deleted = 0;

  for (const media of mediaDocs) {
    await deleteS3KeyBestEffort(media.filePath || media.url);
    s3Deleted += 1;
  }

  await deleteS3KeyBestEffort(child.avatar);

  const mediaIds = mediaDocs.map((m) => m._id);

  await Promise.all([
    AudioAssignmentProgress.deleteMany({ child: childId }),
    ChantProgress.deleteMany({ child: childId }),
    BookReading.deleteMany({ child: childId }),
    Progress.deleteMany({ child: childId }),
    CourseProgress.deleteMany({ child: childId }),
    VideoWatch.deleteMany({ child: childId }),
    StarEarning.deleteMany({ child: childId }),
    ChildStats.deleteMany({ child: childId }),
    KidsWallPost.deleteMany({ child: childId }),
    StarCamEvent.deleteMany({ child: childId }),
    mediaIds.length ? Media.deleteMany({ _id: { $in: mediaIds } }) : Promise.resolve(),
    ChildProfile.deleteOne({ _id: childId }),
  ]);

  return {
    childId: String(childId),
    displayName: child.displayName,
    mediaFilesRemoved: s3Deleted,
    avatarRemoved: Boolean(child.avatar),
  };
}

/**
 * Anonymize parent account while retaining statutory billing fields when present.
 */
async function purgeParentAccount(userId, requestId) {
  const user = await User.findById(userId).select(
    '+password +taxId +stripeCustomerId +stripeSubscriptionId +paypalPayerId +paypalCaptureId +pagseguroCheckoutId +pagseguroChargeId'
  );

  if (!user) {
    throw new Error('User not found');
  }

  const retainedForLegal = {
    taxId: user.taxId || null,
    paymentProvider: user.paymentProvider || null,
    stripeCustomerId: user.stripeCustomerId || null,
    stripeSubscriptionId: user.stripeSubscriptionId || null,
    paypalPayerId: user.paypalPayerId || null,
    paypalCaptureId: user.paypalCaptureId || null,
    pagseguroCheckoutId: user.pagseguroCheckoutId || null,
    pagseguroChargeId: user.pagseguroChargeId || null,
  };

  const anonymizedEmail = `deleted+${requestId}@deleted.riseup.kids`;
  const randomPassword = crypto.randomBytes(32).toString('hex');

  user.name = 'Deleted User';
  user.email = anonymizedEmail;
  user.password = randomPassword;
  user.isActive = false;
  user.subscriptionStatus = 'canceled';
  user.planKidsLimit = null;
  user.planRegion = null;
  user.lastLogin = null;

  await Promise.all([
    ContactSupport.deleteMany({ user: userId }),
    PasswordResetToken.deleteMany({ userId }),
    StarCamEvent.deleteMany({ parent: userId }),
    GoogleIntegration.deleteMany({ user: userId }),
  ]);

  await user.save();

  return {
    userId: String(userId),
    anonymizedEmail,
    retainedForLegal,
    googleIntegrationRemoved: true,
  };
}

/**
 * Reset deletion requests stuck in processing (e.g. after server crash).
 */
async function recoverStaleProcessingRequests() {
  const cutoff = getProcessingStaleCutoff();

  const result = await AccountDeletionRequest.updateMany(
    {
      status: 'processing',
      $or: [
        { processingStartedAt: { $lte: cutoff } },
        { processingStartedAt: null, updatedAt: { $lte: cutoff } },
      ],
    },
    {
      $set: {
        status: 'pending',
        processingStartedAt: null,
        errorMessage: null,
      },
    }
  );

  return result.modifiedCount || 0;
}

/**
 * Child deletion requests are superseded when the parent deletes their whole account.
 */
async function supersedeChildDeletionRequests(parentId, parentRequestId) {
  const now = new Date();

  const result = await AccountDeletionRequest.updateMany(
    {
      userId: parentId,
      type: 'child_profile',
      status: { $in: ['pending', 'processing', 'failed'] },
    },
    {
      $set: {
        status: 'cancelled',
        completedAt: now,
        processingStartedAt: null,
        errorMessage: null,
        purgeSummary: {
          superseded: true,
          reason: 'Included in parent account deletion',
          parentAccountRequestId: String(parentRequestId),
        },
      },
    }
  );

  return result.modifiedCount || 0;
}

/**
 * Parent initiates child profile deletion — access revoked immediately.
 */
async function requestChildProfileDeletion(parentId, childId, { password, confirmText, requesterIp }) {
  assertConfirmText(confirmText);
  await verifyParentPassword(parentId, password);

  const child = await ChildProfile.findOne({ _id: childId, parent: parentId });
  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }

  const existing = await findPendingRequest({
    userId: parentId,
    childId,
    type: 'child_profile',
  });
  if (existing) {
    throw new Error('A deletion request for this child profile is already in progress');
  }

  child.isActive = false;
  await child.save();

  const scheduledPurgeAt = getEstimatedCompletionDate();
  const request = await AccountDeletionRequest.create({
    type: 'child_profile',
    userId: parentId,
    childId,
    status: 'pending',
    scheduledPurgeAt,
    requesterIp: requesterIp || null,
  });

  const parent = await User.findById(parentId).select('email name').lean();
  if (parent?.email) {
    await sendDeletionRequestedEmail({
      to: parent.email,
      type: 'child_profile',
      childDisplayName: child.displayName,
      estimatedDays: DELETION_ESTIMATED_DAYS,
    });
  }

  return {
    requestId: request._id,
    type: request.type,
    childId,
    displayName: child.displayName,
    accessRevoked: true,
    estimatedCompletionDays: DELETION_ESTIMATED_DAYS,
    estimatedCompletionDate: scheduledPurgeAt,
    message: `This child's profile access has been revoked. Data will be permanently deleted within ${DELETION_ESTIMATED_DAYS} days. You will receive a confirmation email when deletion is complete.`,
  };
}

/**
 * Parent initiates account deletion — login revoked immediately for parent and children.
 */
async function requestParentAccountDeletion(parentId, { password, confirmText, requesterIp }) {
  assertConfirmText(confirmText);

  const user = await verifyParentPassword(parentId, password);
  if (user.role !== 'parent') {
    throw new Error('Only parent accounts can use self-service account deletion');
  }

  const existing = await findPendingRequest({
    userId: parentId,
    type: 'parent_account',
  });
  if (existing) {
    throw new Error('An account deletion request is already in progress');
  }

  const subscriptionNotes = await handleSubscriptionOnAccountDeletion(user);

  await ChildProfile.updateMany({ parent: parentId }, { isActive: false });

  user.isActive = false;
  await user.save();

  const scheduledPurgeAt = getEstimatedCompletionDate();
  const request = await AccountDeletionRequest.create({
    type: 'parent_account',
    userId: parentId,
    status: 'pending',
    scheduledPurgeAt,
    requesterIp: requesterIp || null,
    subscriptionNotes,
  });

  await supersedeChildDeletionRequests(parentId, request._id);

  await sendDeletionRequestedEmail({
    to: user.email,
    type: 'parent_account',
    estimatedDays: DELETION_ESTIMATED_DAYS,
  });

  return {
    requestId: request._id,
    type: request.type,
    accessRevoked: true,
    estimatedCompletionDays: DELETION_ESTIMATED_DAYS,
    estimatedCompletionDate: scheduledPurgeAt,
    subscriptionNotes,
    message: `Your account access has been revoked. Personal data will be permanently deleted within ${DELETION_ESTIMATED_DAYS} days. Billing records required by law may be retained separately. You will receive a confirmation email when deletion is complete.`,
  };
}

/**
 * Admin/script: execute pending deletion request (Mongo + S3 purge).
 */
async function executeDeletionRequest(requestId) {
  const existing = await AccountDeletionRequest.findById(requestId);
  if (!existing) {
    throw new Error('Deletion request not found');
  }
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    return { request: existing, alreadyCompleted: true };
  }

  const request = await AccountDeletionRequest.findOneAndUpdate(
    {
      _id: requestId,
      status: { $in: ['pending', 'failed'] },
    },
    {
      $set: {
        status: 'processing',
        processingStartedAt: new Date(),
        errorMessage: null,
      },
    },
    { new: true }
  );

  if (!request) {
    const current = await AccountDeletionRequest.findById(requestId);
    if (current?.status === 'processing') {
      throw new Error('Deletion request is already being processed');
    }
    throw new Error('Deletion request is not in a runnable state');
  }

  const userBeforePurge = await User.findById(request.userId).select('email').lean();
  let notifyEmail = userBeforePurge?.email || null;
  let childDisplayName = null;

  try {
    let purgeSummary = {};

    if (request.type === 'child_profile') {
      if (!request.childId) {
        throw new Error('Child deletion request is missing childId');
      }
      const child = await ChildProfile.findById(request.childId).select('displayName').lean();
      childDisplayName = child?.displayName || null;
      try {
        purgeSummary = await purgeChildData(request.childId);
      } catch (error) {
        if (error.message === 'Child profile not found') {
          purgeSummary = {
            alreadyRemoved: true,
            childId: String(request.childId),
          };
        } else {
          throw error;
        }
      }
    } else if (request.type === 'parent_account') {
      const childIds = await ChildProfile.find({ parent: request.userId }).distinct('_id');
      const childResults = [];
      for (const childId of childIds) {
        try {
          childResults.push(await purgeChildData(childId));
        } catch (error) {
          if (error.message === 'Child profile not found') {
            childResults.push({ alreadyRemoved: true, childId: String(childId) });
          } else {
            throw error;
          }
        }
      }
      const parentResult = await purgeParentAccount(request.userId, request._id);
      purgeSummary = { children: childResults, parent: parentResult };
    } else {
      throw new Error(`Unsupported deletion type: ${request.type}`);
    }

    request.status = 'completed';
    request.completedAt = new Date();
    request.processingStartedAt = null;
    request.purgeSummary = purgeSummary;
    request.errorMessage = null;
    await request.save();

    if (notifyEmail && !notifyEmail.startsWith('deleted+')) {
      await sendDeletionCompletedEmail({
        to: notifyEmail,
        type: request.type,
        childDisplayName,
      });
    }

    return { request, purgeSummary };
  } catch (error) {
    request.status = 'failed';
    request.processingStartedAt = null;
    request.errorMessage = error.message || 'Deletion failed';
    await request.save();
    throw error;
  }
}

async function listDeletionRequests({ status, limit = 50 } = {}) {
  const query = {};
  if (status) query.status = status;

  const requests = await AccountDeletionRequest.find(query)
    .sort({ requestedAt: -1 })
    .limit(Math.min(limit, 200))
    .populate('userId', 'name email')
    .populate('childId', 'displayName')
    .lean();

  return requests;
}

async function executeAllPendingRequests({ dueOnly = true } = {}) {
  await recoverStaleProcessingRequests();

  const query = { status: 'pending' };

  if (dueOnly) {
    query.scheduledPurgeAt = { $lte: new Date() };
  }

  const pending = await AccountDeletionRequest.find(query).sort({ requestedAt: 1 });
  const results = [];

  for (const request of pending) {
    try {
      const result = await executeDeletionRequest(request._id);
      results.push({ requestId: String(request._id), success: true, result });
    } catch (error) {
      results.push({
        requestId: String(request._id),
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

module.exports = {
  CONFIRM_TEXT,
  DELETION_ESTIMATED_DAYS,
  DELETION_PROCESSING_STALE_MINUTES,
  requestChildProfileDeletion,
  requestParentAccountDeletion,
  executeDeletionRequest,
  executeAllPendingRequests,
  recoverStaleProcessingRequests,
  supersedeChildDeletionRequests,
  listDeletionRequests,
  purgeChildData,
  purgeParentAccount,
};
