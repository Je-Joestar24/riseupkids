/**
 * Reset code email template – inline styles, Quicksand, #62caca, white background.
 * Renders HTML and plain text for the 6-digit code email.
 * Logo is embedded as base64 so it displays in all email clients (Gmail, Outlook, etc.).
 */

const path = require('path');
const fs = require('fs');

const LINE_COLOR = '#62caca';

/** Possible logo paths (tried in order). Template dir = backend/templates/email */
const LOGO_PATHS = [
  path.join(__dirname, 'assets', 'email_logo.png'),
  path.join(__dirname, '..', '..', 'assets', 'email', 'email_logo.png'),
];

/**
 * Get the public URL for the email logo (used only if inline read fails).
 */
function getLogoUrl() {
  const base = process.env.BACKEND_BASE_URL || process.env.APP_URL || 'http://localhost:5000';
  return `${base.replace(/\/$/, '')}/email-assets/email_logo.png`;
}

/**
 * Get logo as inline base64 data URL (for browser preview).
 */
function getLogoSrc() {
  for (const logoPath of LOGO_PATHS) {
    try {
      if (fs.existsSync(logoPath)) {
        const buffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (_) {
      /* try next path */
    }
  }
  return getLogoUrl();
}

/** Content-ID for inline logo in sent emails (must match img src="cid:...") */
const LOGO_CID = 'logo';

/**
 * Get logo buffer for CID attachment (so Gmail/Outlook display it in sent emails).
 * @returns {{ buffer: Buffer, path: string } | null }
 */
function getLogoBuffer() {
  for (const logoPath of LOGO_PATHS) {
    try {
      if (fs.existsSync(logoPath)) {
        return { buffer: fs.readFileSync(logoPath), path: logoPath };
      }
    } catch (_) {
      /* try next path */
    }
  }
  return null;
}

/**
 * Render reset code email HTML (inline styles for email clients).
 * @param {{ code: string, logoUrl?: string, useInlineLogo?: boolean, forEmail?: boolean }} options
 *   - forEmail: true = use cid:logo + return attachments (for sending); false = use data URL (for preview).
 * @returns {{ html: string, text: string, attachments?: Array }}
 */
function renderResetCode(options) {
  const code = String(options.code || '').replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
  const forEmail = options.forEmail === true;
  let logoSrc;
  let attachments;

  if (forEmail) {
    const logo = getLogoBuffer();
    if (logo) {
      logoSrc = `cid:${LOGO_CID}`;
      attachments = [
        { filename: 'logo.png', content: logo.buffer, cid: LOGO_CID },
      ];
    } else {
      logoSrc = getLogoUrl();
    }
  } else {
    logoSrc = options.logoUrl || (options.useInlineLogo === false ? getLogoUrl() : getLogoSrc());
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your reset code</title>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:'Quicksand', sans-serif; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 24px 24px;">
        <img src="${logoSrc}" alt="Rise Up Kids" width="160" height="160" style="display:block; max-width:160px; height:auto; border:0;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 24px 16px;">
        <p style="margin:0; font-size:16px; line-height:1.5; color:#4a4a4a; font-weight:500;">
          Use this code to reset your password. It expires in 1 minute.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 24px;">
        <div style="height:2px; background-color:${LINE_COLOR}; max-width:200px; margin:0 auto;"></div>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:20px 24px;">
        <p style="margin:0; font-size:42px; font-weight:700; letter-spacing:10px; color:#2d2d2d; font-family:'Quicksand', sans-serif;">
          ${code}
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:8px 24px;">
        <div style="height:2px; background-color:${LINE_COLOR}; max-width:200px; margin:0 auto;"></div>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:32px 24px 24px; border-top:1px solid #eeeeee;">
        <p style="margin:0 0 8px; font-size:13px; color:#888888; font-weight:500;">
          Rise Up Kids LMS
        </p>
        <p style="margin:0; font-size:12px; color:#aaaaaa; font-weight:400;">
          Passion to learn
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    'Use this code to reset your password. It expires in 1 minute.',
    '',
    code,
    '',
    '— Rise Up Kids LMS',
    'Passion to learn',
  ].join('\n');

  const result = { html, text };
  if (attachments && attachments.length) result.attachments = attachments;
  return result;
}

module.exports = {
  renderResetCode,
  getLogoUrl,
  getLogoSrc,
  getLogoBuffer,
  LOGO_CID,
  LINE_COLOR,
};
