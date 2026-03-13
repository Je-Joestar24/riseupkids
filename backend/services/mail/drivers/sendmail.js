/**
 * Sendmail mail driver – uses system sendmail binary (no SMTP keys).
 * Same contract: send({ to, subject, html?, text?, from? })
 */
const nodemailer = require('nodemailer');

function createSendmailDriver(config) {
  const path = (config.sendmail && config.sendmail.path) || 'sendmail';
  const transporter = nodemailer.createTransport({
    sendmail: true,
    path,
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

module.exports = createSendmailDriver;
