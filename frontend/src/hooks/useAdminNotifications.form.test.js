import { describe, expect, it } from 'vitest';
import {
  buildEmptyForm,
  campaignToForm,
  DEFAULT_NOTIFICATION_TIMEZONE,
  describeCampaignSendResult,
  describeTestSendResult,
  formToPayload,
  formToSchedulePayload,
  formatCampaignSchedule,
  isEditableCampaignStatus,
} from './useAdminNotifications.js';

const meta = {
  languages: [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'es', name: 'Spanish' },
  ],
  types: [{ value: 'story_time', label: 'Story Time' }],
  destinationKinds: [{ value: 'home', label: 'Home' }],
  timezones: ['UTC', 'America/Sao_Paulo', 'Europe/Lisbon'],
};

describe('Admin notification form helpers', () => {
  it('builds empty localizations from the language catalog', () => {
    const form = buildEmptyForm(meta);
    expect(Object.keys(form.localizations)).toEqual(['en', 'pt', 'es']);
    expect(form.localizations.en).toMatchObject({ title: '', message: '', imageMediaId: null });
    expect(form.timezone).toBe(DEFAULT_NOTIFICATION_TIMEZONE);
    expect(form.status).toBe('draft');
  });

  it('only sends localizations that have title and message', () => {
    const payload = formToPayload({
      internalName: 'Week 2',
      type: 'story_time',
      audience: 'all',
      destinationKind: 'story_time',
      contentId: '',
      localizations: {
        en: { title: 'Hello', message: 'Ready', imageMediaId: 'media-1' },
        pt: { title: '', message: '', imageMediaId: null },
        es: { title: 'Hola', message: 'Listo', imageMediaId: null },
      },
    });

    expect(payload.localizations).toHaveLength(2);
    expect(payload.localizations.map((row) => row.languageCode)).toEqual(['en', 'es']);
    expect(payload.destination).toEqual({ kind: 'story_time', contentId: null });
  });

  it('maps a campaign back into the form, keeping title, message, and image separate', () => {
    const form = campaignToForm(
      {
        internalName: 'Week 1',
        type: 'story_time',
        audience: 'parents',
        destination: { kind: 'book', contentId: 'book-9' },
        localizations: [
          {
            languageCode: 'en',
            title: 'Story Time is waiting!',
            message: 'A new adventure is ready.',
            imageMediaId: { _id: 'img-1', url: 'https://cdn/x.png', width: 1920, height: 600 },
          },
        ],
      },
      meta
    );

    expect(form.localizations.en.title).toBe('Story Time is waiting!');
    expect(form.localizations.en.message).toBe('A new adventure is ready.');
    expect(form.localizations.en.imageMediaId).toBe('img-1');
    expect(form.destinationKind).toBe('book');
    expect(form.contentId).toBe('book-9');
  });

  it('maps schedule wall-clock fields for reschedule (2.2 / 2.5)', () => {
    const form = campaignToForm(
      {
        internalName: 'Live reminder',
        type: 'live_lesson',
        audience: 'all',
        status: 'scheduled',
        timezone: 'America/Sao_Paulo',
        sendLocalDate: '2026-08-20',
        sendLocalTime: '09:00:00',
        sendAt: '2026-08-20T12:00:00.000Z',
        destination: { kind: 'home' },
        localizations: [{ languageCode: 'en', title: 'Live', message: 'Soon' }],
      },
      meta
    );

    expect(form.status).toBe('scheduled');
    expect(form.sendDate).toBe('2026-08-20');
    expect(form.sendTime).toBe('09:00');
    expect(form.timezone).toBe('America/Sao_Paulo');
    expect(form.timingMode).toBe('recipient_local');
    expect(form.quietHourBehavior).toBe('defer');
    expect(formToSchedulePayload(form)).toEqual({
      sendDate: '2026-08-20',
      sendTime: '09:00',
      timezone: 'America/Sao_Paulo',
      timingMode: 'recipient_local',
      quietHourBehavior: 'defer',
    });
  });

  it('includes same-moment, expire, and optional expiration on the schedule payload', () => {
    expect(
      formToSchedulePayload({
        sendDate: '2026-08-20',
        sendTime: '16:00',
        timezone: 'America/Sao_Paulo',
        timingMode: 'same_moment',
        quietHourBehavior: 'expire',
        expiresDate: '2026-08-20',
        expiresTime: '16:30',
      })
    ).toEqual({
      sendDate: '2026-08-20',
      sendTime: '16:00',
      timezone: 'America/Sao_Paulo',
      timingMode: 'same_moment',
      quietHourBehavior: 'expire',
      expiresDate: '2026-08-20',
      expiresTime: '16:30',
    });
  });

  it('rejects a schedule payload without a local date and time', () => {
    expect(() =>
      formToSchedulePayload({
        sendDate: '',
        sendTime: '',
        timezone: 'UTC',
      })
    ).toThrow(/Send date is required/);
  });

  it('formats scheduled wall-clock time for the table', () => {
    expect(
      formatCampaignSchedule({
        sendLocalDate: '2026-08-20',
        sendLocalTime: '16:00',
        timingMode: 'recipient_local',
      })
    ).toBe('2026-08-20 16:00 (recipient local time)');
  });

  it('allows edit for draft and scheduled, not after send', () => {
    expect(isEditableCampaignStatus('draft')).toBe(true);
    expect(isEditableCampaignStatus('scheduled')).toBe(true);
    expect(isEditableCampaignStatus('sent')).toBe(false);
    expect(isEditableCampaignStatus('cancelled')).toBe(false);
  });

  it('does not treat a skipped send as a successful push', () => {
    expect(
      describeCampaignSendResult({
        status: 'failed',
        lastError: 'no_device_token',
        delivery: { targeted: 2, sent: 0, skipped: 2, failed: 0 },
      })
    ).toEqual({
      type: 'warning',
      message: 'Send finished, but no parent phones are registered for push yet.',
    });
  });

  it('warns when a test send has no registered device', () => {
    expect(
      describeTestSendResult({
        targeted: 1,
        receipts: [{ pushResult: 'skipped', failureReason: 'no_device_token' }],
      })
    ).toMatchObject({ type: 'warning' });
  });
});
