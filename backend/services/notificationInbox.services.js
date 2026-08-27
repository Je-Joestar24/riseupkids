const { NotificationReceipt } = require('../models');
const { recordInboxOpens } = require('./notificationAnalytics.services');

const INBOX_HIDDEN_RESULTS = new Set(['expired']);

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parsePage(query) {
  const page = Number.parseInt(query?.page, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseLimit(query) {
  const limit = Number.parseInt(query?.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) return 20;
  return Math.min(limit, 100);
}

function inboxFilter(userId) {
  return {
    userId,
    isTest: { $ne: true },
    pushResult: { $nin: [...INBOX_HIDDEN_RESULTS] },
  };
}

function asId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

function serializeInboxItem(row) {
  const readAt = row.readAt || null;
  return {
    _id: String(row._id),
    title: row.title,
    message: row.message,
    imageUrl: row.imageUrl || null,
    createdAt: row.createdAt,
    readAt,
    isUnread: !readAt,
    childId: asId(row.childId),
    destination: {
      kind: row.destination?.kind || null,
      contentId: row.destination?.contentId || null,
    },
  };
}

async function listInbox(userId, query = {}) {
  if (!userId) throw httpError('A parent user is required', 401);
  const page = parsePage(query);
  const limit = parseLimit(query);
  const filter = inboxFilter(userId);

  const [total, rows] = await Promise.all([
    NotificationReceipt.countDocuments(filter),
    NotificationReceipt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    data: rows.map(serializeInboxItem),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getUnreadCount(userId) {
  if (!userId) throw httpError('A parent user is required', 401);
  const unreadCount = await NotificationReceipt.countDocuments({
    ...inboxFilter(userId),
    readAt: null,
  });
  return { unreadCount };
}

async function markInboxItemRead(userId, receiptId, now = new Date()) {
  if (!userId) throw httpError('A parent user is required', 401);
  const row = await NotificationReceipt.findById(receiptId);
  if (!row || row.isTest) {
    throw httpError('Notification not found', 404);
  }
  if (String(row.userId) !== String(userId)) {
    throw httpError('You cannot open another family\'s notification', 403);
  }
  if (INBOX_HIDDEN_RESULTS.has(row.pushResult)) {
    throw httpError('Notification not found', 404);
  }
  if (!row.readAt) {
    row.readAt = now;
    await row.save();
    await recordInboxOpens([row]);
  }
  return serializeInboxItem(row.toObject ? row.toObject() : row);
}

async function markAllInboxRead(userId, now = new Date()) {
  if (!userId) throw httpError('A parent user is required', 401);
  const unread = await NotificationReceipt.find({
    ...inboxFilter(userId),
    readAt: null,
  })
    .select('_id campaign isTest')
    .lean();
  const result = await NotificationReceipt.updateMany(
    { ...inboxFilter(userId), readAt: null },
    { $set: { readAt: now } }
  );
  await recordInboxOpens(unread);
  return {
    updated: result.modifiedCount || result.nModified || unread.length,
    unreadCount: 0,
  };
}

module.exports = {
  listInbox,
  getUnreadCount,
  markInboxItemRead,
  markAllInboxRead,
  serializeInboxItem,
  inboxFilter,
};
