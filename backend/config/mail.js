/**
 * Mail configuration (Laravel-style).
 * Reads ENV and exports a single config object for the mail service.
 */
const driver = (process.env.MAIL_DRIVER || 'log').toLowerCase();
const env = (process.env.NODE_ENV || 'development').toLowerCase();
const isProdLike = env === 'production' || env === 'staging';
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

if (isProdLike) {
  if (driver === 'log') {
    throw new Error('Invalid mail configuration: MAIL_DRIVER=log is not allowed in production/staging.');
  }

  if (driver === 'smtp') {
    const missing = [];
    if (!smtp.host) missing.push('SMTP_HOST');
    if (!smtp.port) missing.push('SMTP_PORT');
    if (!smtp.user) missing.push('SMTP_USER');
    if (!smtp.password) missing.push('SMTP_PASSWORD');
    if (missing.length > 0) {
      throw new Error(`Invalid mail configuration: missing ${missing.join(', ')}`);
    }
  }
}

module.exports = {
  driver,
  from,
  sendmail,
  smtp,
};
