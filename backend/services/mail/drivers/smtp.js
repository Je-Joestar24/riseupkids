/**
 * SMTP mail driver – e.g. Gmail with App Password.
 * Same contract: send({ to, subject, html?, text?, from? })
 */
const nodemailer = require('nodemailer');

function createSmtpDriver(config) {
  const { host, port, secure, user, password } = config.smtp || {};
  const transporter = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port || 587,
    secure: secure === true,
    auth: user && password ? { user, pass: password } : undefined,
  });

  const defaultFrom = config.from
    ? `"${(config.from.name || '').replace(/"/g, '\\"')}" <${config.from.address}>`
    : undefined;

  return {
    async send(options) {
      const { to, subject, html, text, from, attachments } = options;
      const result = await transporter.sendMail({
        from: from || defaultFrom,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: text || (html ? html.replace(/<[^>]+>/g, '') : undefined),
        html: html || undefined,
        attachments: attachments || undefined,
      });
      return { messageId: result.messageId };
    },
  };
}

module.exports = createSmtpDriver;
