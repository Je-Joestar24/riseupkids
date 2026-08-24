const { wallTimeToUtc } = require('../utils/notificationTimezone.util');
const {
  FALLBACK_TIMEZONE,
  EARLIEST_WORLD_ZONE,
  isInQuietHours,
  nextQuietHoursEnd,
  resolveRecipientTimezone,
  resolveDeliveryDecision,
  earliestWorldwideSendAt,
} = require('../utils/notificationTiming.util');

describe('notification delivery timing', () => {
  it('uses America/Sao_Paulo when the user has no timezone yet', () => {
    expect(resolveRecipientTimezone(null)).toBe(FALLBACK_TIMEZONE);
    expect(resolveRecipientTimezone('')).toBe(FALLBACK_TIMEZONE);
    expect(resolveRecipientTimezone('Not/AZone')).toBe(FALLBACK_TIMEZONE);
  });

  it('does not infer timezone from language', () => {
    expect(resolveRecipientTimezone('pt')).toBe(FALLBACK_TIMEZONE);
    expect(resolveRecipientTimezone('es')).toBe(FALLBACK_TIMEZONE);
    expect(resolveRecipientTimezone('Europe/Madrid')).toBe('Europe/Madrid');
  });

  it('delivers recipient local time at 16:00 in each family zone', () => {
    const campaign = {
      timingMode: 'recipient_local',
      quietHourBehavior: 'defer',
      sendLocalDate: '2026-08-20',
      sendLocalTime: '16:00',
    };

    const brazil = resolveDeliveryDecision({
      campaign,
      timezone: 'America/Sao_Paulo',
      now: new Date('2026-08-20T18:59:00.000Z'),
      trigger: 'scheduled',
    });
    const spain = resolveDeliveryDecision({
      campaign,
      timezone: 'Europe/Madrid',
      now: new Date('2026-08-20T13:59:00.000Z'),
      trigger: 'scheduled',
    });

    expect(brazil.action).toBe('wait');
    expect(spain.action).toBe('wait');
    expect(
      resolveDeliveryDecision({
        campaign,
        timezone: 'America/Sao_Paulo',
        now: new Date('2026-08-20T19:00:00.000Z'),
        trigger: 'scheduled',
      }).action
    ).toBe('send');
    expect(
      resolveDeliveryDecision({
        campaign,
        timezone: 'Europe/Madrid',
        now: new Date('2026-08-20T14:00:00.000Z'),
        trigger: 'scheduled',
      }).action
    ).toBe('send');
  });

  it('same-moment campaigns share one UTC instant', () => {
    const sendAt = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '12:00',
      timezone: 'America/Sao_Paulo',
    });
    const campaign = {
      timingMode: 'same_moment',
      quietHourBehavior: 'defer',
      sendAt,
    };

    expect(
      resolveDeliveryDecision({
        campaign,
        timezone: 'America/Sao_Paulo',
        now: sendAt,
        trigger: 'scheduled',
      }).action
    ).toBe('send');
    expect(
      resolveDeliveryDecision({
        campaign,
        timezone: 'Europe/Madrid',
        now: sendAt,
        trigger: 'scheduled',
      }).action
    ).toBe('send');
  });

  it('defers a normal notification from quiet hours until 07:00 local', () => {
    const now = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '22:00',
      timezone: 'America/Sao_Paulo',
    });
    expect(isInQuietHours(now, 'America/Sao_Paulo')).toBe(true);

    const decision = resolveDeliveryDecision({
      campaign: { timingMode: 'same_moment', quietHourBehavior: 'defer', sendAt: now },
      timezone: 'America/Sao_Paulo',
      now,
      trigger: 'send_now',
    });

    expect(decision.action).toBe('defer');
    expect(decision.reason).toBe('quiet_hours_defer');
    expect(decision.sendAt.toISOString()).toBe(
      nextQuietHoursEnd(now, 'America/Sao_Paulo').toISOString()
    );
    expect(decision.sendAt.toISOString()).toBe(
      wallTimeToUtc({
        sendDate: '2026-08-21',
        sendTime: '07:00',
        timezone: 'America/Sao_Paulo',
      }).toISOString()
    );
  });

  it('expires a time-sensitive notification instead of delivering at 07:00', () => {
    const now = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '22:00',
      timezone: 'America/Sao_Paulo',
    });
    const decision = resolveDeliveryDecision({
      campaign: { timingMode: 'same_moment', quietHourBehavior: 'expire', sendAt: now },
      timezone: 'America/Sao_Paulo',
      now,
      trigger: 'send_now',
    });

    expect(decision.action).toBe('expire');
    expect(decision.reason).toBe('quiet_hours_expire');
  });

  it('expires when deferring to 07:00 would pass the expiration', () => {
    const now = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '22:00',
      timezone: 'America/Sao_Paulo',
    });
    const expiresAt = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '23:30',
      timezone: 'America/Sao_Paulo',
    });
    const decision = resolveDeliveryDecision({
      campaign: {
        timingMode: 'same_moment',
        quietHourBehavior: 'defer',
        sendAt: now,
        expiresAt,
      },
      timezone: 'America/Sao_Paulo',
      now,
      trigger: 'send_now',
    });

    expect(decision.action).toBe('expire');
    expect(decision.reason).toBe('expired');
  });

  it('accounts for daylight saving when converting a New York wall clock', () => {
    const winter = wallTimeToUtc({
      sendDate: '2026-01-15',
      sendTime: '09:00',
      timezone: 'America/New_York',
    });
    const summer = wallTimeToUtc({
      sendDate: '2026-07-15',
      sendTime: '09:00',
      timezone: 'America/New_York',
    });

    expect(winter.toISOString()).toBe('2026-01-15T14:00:00.000Z');
    expect(summer.toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });

  it('starts recipient-local processing at the earliest worldwide wall-clock instant', () => {
    const sendAt = earliestWorldwideSendAt({ sendDate: '2026-08-20', sendTime: '16:00' });
    const kiritimati = wallTimeToUtc({
      sendDate: '2026-08-20',
      sendTime: '16:00',
      timezone: EARLIEST_WORLD_ZONE,
    });
    expect(sendAt.toISOString()).toBe(kiritimati.toISOString());
  });
});
