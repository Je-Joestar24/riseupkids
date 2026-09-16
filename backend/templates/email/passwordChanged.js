/**
 * "Your password was changed" notification email (Chunk 10) — same visual language as the
 * reset-code / login-OTP emails. Sent after every successful password change or reset, whether
 * the user requested it or not — if they didn't, this is their signal something is wrong.
 */
const { getLogoUrl, getLogoSrc, getLogoBuffer, LOGO_CID, LINE_COLOR } = require('./resetCode');

/**
 * @param {{ logoUrl?: string, useInlineLogo?: boolean, forEmail?: boolean }} [options]
 * @returns {{ html: string, text: string, attachments?: Array }}
 */
function renderPasswordChanged(options = {}) {
  const forEmail = options.forEmail === true;
  let logoSrc;
  let attachments;

  if (forEmail) {
    const logo = getLogoBuffer();
    if (logo) {
      logoSrc = `cid:${LOGO_CID}`;
      attachments = [{ filename: 'logo.png', content: logo.buffer, cid: LOGO_CID }];
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
  <title>Your password was changed</title>
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
        <p style="margin:0; font-size:18px; line-height:1.5; color:#2d2d2d; font-weight:600;">
          Your password was changed
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
        <p style="margin:0; font-size:15px; line-height:1.6; color:#4a4a4a; font-weight:500; max-width:420px;">
          The password on your Rise Up Kids account was just changed, and you've been signed out
          everywhere for security. If this was you, no action is needed.
        </p>
        <p style="margin:16px 0 0; font-size:15px; line-height:1.6; color:#4a4a4a; font-weight:500; max-width:420px;">
          If you didn't make this change, please contact support right away.
        </p>
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
    'Your password was changed',
    '',
    "The password on your Rise Up Kids account was just changed, and you've been signed out everywhere for security. If this was you, no action is needed.",
    '',
    "If you didn't make this change, please contact support right away.",
    '',
    '— Rise Up Kids LMS',
    'Passion to learn',
  ].join('\n');

  const result = { html, text };
  if (attachments && attachments.length) result.attachments = attachments;
  return result;
}

module.exports = { renderPasswordChanged };
