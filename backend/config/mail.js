/**
 * Mail configuration (Laravel-style).
 * Reads ENV and exports a single config object for the mail service.
 */
const driver = (process.env.MAIL_DRIVER || 'log').toLowerCase();
const from = {
  address: process.env.MAIL_FROM_ADDRESS || 'noreply@riseup.kids',
  name: process.env.MAIL_FROM_NAME || 'Rise Up Kids LMS',
};

const sendmail = {
  path: process.env.SENDMAIL_PATH || 'sendmail',
};

const smtp = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
};

module.exports = {
  driver,
  from,
  sendmail,
  smtp,
};
