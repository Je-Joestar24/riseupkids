/**
 * Mail service facade – single API regardless of driver (log, sendmail, smtp).
 */
const mailConfig = require('../../config/mail');
const { renderResetCode } = require('../../templates/email/resetCode');
const {
  renderDeletionRequested,
  renderDeletionCompleted,
} = require('../../templates/email/deletionEmail');

const logDriver = require('./drivers/log');
const sendmailDriver = require('./drivers/sendmail');
const smtpDriver = require('./drivers/smtp');

function getDriver() {
  switch (mailConfig.driver) {
    case 'sendmail':
      return sendmailDriver(mailConfig);
    case 'smtp':
      return smtpDriver(mailConfig);
    case 'log':
    default:
      return logDriver(mailConfig);
  }
}

let cachedDriver = null;
function driver() {
  if (!cachedDriver) cachedDriver = getDriver();
  return cachedDriver;
}

/**
 * Send an email.
 * @param {Object} options - { to, subject, html?, text?, from?, attachments? }
 * @returns {Promise<{ messageId? }>}
 */
async function send(options) {
  if (!options || !options.to || !options.subject) {
    throw new Error('Mail send requires at least to and subject');
  }
  return driver().send(options);
}

/**
 * Send the reset-code email (template with logo, #62caca lines, Quicksand).
 * Uses CID attachment for the logo so it displays in Gmail/Outlook.
 * @param {{ to: string, code: string }} options
 */
async function sendResetCode(options) {
  const { to, code } = options || {};
  if (!to || !code) {
    throw new Error('sendResetCode requires to and code');
  }
  const { html, text, attachments } = renderResetCode({
    code: String(code).slice(0, 6),
    forEmail: true,
  });
  return send({
    to,
    subject: 'Your Rise Up Kids password reset code',
    html,
    text,
    attachments: attachments || undefined,
  });
}

/**
 * @param {{ to: string, type: 'parent_account'|'child_profile', childDisplayName?: string, estimatedDays: number }} options
 */
async function sendDeletionRequested(options) {
  const { to, type, childDisplayName, estimatedDays } = options || {};
  if (!to || !type) {
    throw new Error('sendDeletionRequested requires to and type');
  }
  const { subject, html, text } = renderDeletionRequested({
    type,
    childDisplayName,
    estimatedDays: estimatedDays || 30,
  });
  return send({ to, subject, html, text });
}

/**
 * @param {{ to: string, type: 'parent_account'|'child_profile', childDisplayName?: string }} options
 */
async function sendDeletionCompleted(options) {
  const { to, type, childDisplayName } = options || {};
  if (!to || !type) {
    throw new Error('sendDeletionCompleted requires to and type');
  }
  const { subject, html, text } = renderDeletionCompleted({ type, childDisplayName });
  return send({ to, subject, html, text });
}

module.exports = {
  send,
  sendResetCode,
  sendDeletionRequested,
  sendDeletionCompleted,
  getDriver,
};
