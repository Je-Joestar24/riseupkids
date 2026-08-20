const { wallTimeToUtc, isCampaignDue, assertTimeZone } = require('../utils/notificationTimezone.util');

describe('notification timezone conversion', () => {
  it('stores Sao Paulo wall time as the correct UTC instant (2.2)', () => {
    const sendAt = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '09:00',
      timezone: 'America/Sao_Paulo',
    });

    expect(sendAt.toISOString()).toBe('2026-08-20T12:00:00.000Z');
  });

  it('does not treat 09:00 in Sao Paulo as 09:00 UTC (2.3)', () => {
    const sendAt = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '09:00',
      timezone: 'America/Sao_Paulo',
    });
    const campaign = { status: 'scheduled', sendAt };

    expect(isCampaignDue(campaign, new Date('2026-08-20T09:00:00.000Z'))).toBe(false);
    expect(isCampaignDue(campaign, new Date('2026-08-20T12:00:00.000Z'))).toBe(true);
  });

  it('rejects an invalid timezone', () => {
    expect(() => assertTimeZone('Not/AZone')).toThrow(/Invalid timezone/i);
  });
});
