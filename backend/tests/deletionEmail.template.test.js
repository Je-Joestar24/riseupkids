const {
  renderDeletionRequested,
  renderDeletionCompleted,
} = require('../templates/email/deletionEmail');

describe('deletionEmail templates', () => {
  it('renderDeletionRequested builds account deletion subject and body', () => {
    const { subject, html, text } = renderDeletionRequested({
      type: 'parent_account',
      estimatedDays: 30,
    });

    expect(subject).toContain('account deletion request');
    expect(html).toContain('revoked immediately');
    expect(text).toContain('30');
  });

  it('renderDeletionRequested includes child name for child_profile', () => {
    const { subject, html } = renderDeletionRequested({
      type: 'child_profile',
      childDisplayName: 'Alex',
      estimatedDays: 14,
    });

    expect(subject).toContain('Alex');
    expect(html).toContain('Alex');
  });

  it('renderDeletionCompleted builds completion email', () => {
    const { subject, html, text } = renderDeletionCompleted({
      type: 'parent_account',
    });

    expect(subject).toContain('account has been deleted');
    expect(html).toContain('deletion is complete');
    expect(text).toContain('Rise Up Kids');
  });
});
