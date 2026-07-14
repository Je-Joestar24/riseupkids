/**
 * Deletion request / completion email templates.
 */

const LINE_COLOR = '#62caca';

function renderDeletionRequested({ type, childDisplayName, estimatedDays }) {
  const isAccount = type === 'parent_account';
  const subject = isAccount
    ? 'Your Rise Up Kids account deletion request'
    : `Child profile deletion request — ${childDisplayName || 'Rise Up Kids'}`;

  const headline = isAccount
    ? 'We received your account deletion request'
    : `We received your request to delete ${childDisplayName || 'this child profile'}`;

  const bodyLines = isAccount
    ? [
        'Your login access has been revoked immediately.',
        `We will permanently delete your account data and all linked child profiles within ${estimatedDays} days.`,
        'Billing or tax records required by law may be retained separately as described in our Privacy Policy.',
      ]
    : [
        'Access to this child profile has been revoked immediately.',
        `We will permanently delete this child\'s data (progress, recordings, Kids Wall photos, and related files) within ${estimatedDays} days.`,
      ];

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Quicksand,Arial,sans-serif;color:#2d2d2d;">
  <h1 style="font-size:22px;margin:0 0 16px;">${headline}</h1>
  ${bodyLines.map((line) => `<p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${line}</p>`).join('')}
  <p style="font-size:16px;line-height:1.6;margin:24px 0 0;">You will receive another email once deletion is complete.</p>
  <div style="height:2px;background:${LINE_COLOR};max-width:200px;margin:24px 0;"></div>
  <p style="font-size:13px;color:#888;margin:0;">Rise Up Kids</p>
</body>
</html>`;

  const text = [headline, '', ...bodyLines, '', 'You will receive another email once deletion is complete.', '', '— Rise Up Kids'].join(
    '\n'
  );

  return { subject, html, text };
}

function renderDeletionCompleted({ type, childDisplayName }) {
  const isAccount = type === 'parent_account';
  const subject = isAccount
    ? 'Your Rise Up Kids account has been deleted'
    : `Child profile deleted — ${childDisplayName || 'Rise Up Kids'}`;

  const headline = isAccount
    ? 'Your account deletion is complete'
    : `${childDisplayName || 'The child profile'} has been permanently deleted`;

  const body = isAccount
    ? 'Your personal data and linked child profiles have been permanently deleted from our systems, except records we are legally required to retain.'
    : 'This child\'s personal data, progress, recordings, and related media have been permanently deleted from our systems.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Quicksand,Arial,sans-serif;color:#2d2d2d;">
  <h1 style="font-size:22px;margin:0 0 16px;">${headline}</h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${body}</p>
  <div style="height:2px;background:${LINE_COLOR};max-width:200px;margin:24px 0;"></div>
  <p style="font-size:13px;color:#888;margin:0;">Rise Up Kids</p>
</body>
</html>`;

  const text = [headline, '', body, '', '— Rise Up Kids'].join('\n');

  return { subject, html, text };
}

module.exports = {
  renderDeletionRequested,
  renderDeletionCompleted,
};
