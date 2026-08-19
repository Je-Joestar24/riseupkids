import { describe, expect, it } from 'vitest';
import { buildEmptyForm, campaignToForm, formToPayload } from './useAdminNotifications.js';

const meta = {
  languages: [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'es', name: 'Spanish' },
  ],
  types: [{ value: 'story_time', label: 'Story Time' }],
  destinationKinds: [{ value: 'home', label: 'Home' }],
};

describe('Admin notification form helpers', () => {
  it('builds empty localizations from the language catalog', () => {
    const form = buildEmptyForm(meta);
    expect(Object.keys(form.localizations)).toEqual(['en', 'pt', 'es']);
    expect(form.localizations.en).toMatchObject({ title: '', message: '', imageMediaId: null });
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
});
