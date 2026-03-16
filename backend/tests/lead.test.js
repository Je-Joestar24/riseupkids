jest.mock('../models/Leads', () => ({
  create: jest.fn(),
}));

jest.mock('../services/flodeskService', () => ({
  submitInvitationToFlodesk: jest.fn(),
}));

const Lead = require('../models/Leads');
const { submitInvitationToFlodesk } = require('../services/flodeskService');
const {
  submitInvitationLead,
  normalizeLanguage,
  normalizeBoolean,
} = require('../services/lead.services');

describe('lead.services – submitInvitationLead (Phase 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes language correctly', () => {
    expect(normalizeLanguage('PT')).toBe('pt');
    expect(normalizeLanguage(' en ')).toBe('en');
    expect(normalizeLanguage('Es')).toBe('es');
    expect(normalizeLanguage('')).toBe('en');
    expect(normalizeLanguage(null)).toBe('en');
    expect(normalizeLanguage('fr')).toBe('en');
  });

  it('normalizes boolean-like consent correctly', () => {
    expect(normalizeBoolean(true)).toBe(true);
    expect(normalizeBoolean(false)).toBe(false);
    expect(normalizeBoolean('true')).toBe(true);
    expect(normalizeBoolean(' 1 ')).toBe(true);
    expect(normalizeBoolean('yes')).toBe(true);
    expect(normalizeBoolean('on')).toBe(true);
    expect(normalizeBoolean('false')).toBe(false);
    expect(normalizeBoolean('0')).toBe(false);
    expect(normalizeBoolean('no')).toBe(false);
    expect(normalizeBoolean('off')).toBe(false);
  });

  it('throws when required fields are missing', async () => {
    await expect(
      submitInvitationLead({})
    ).rejects.toThrow('parentName is required');

    await expect(
      submitInvitationLead({ parentName: 'Test' })
    ).rejects.toThrow('email is required');

    await expect(
      submitInvitationLead({ parentName: 'Test', email: 'test@example.com' })
    ).rejects.toThrow('whatsapp is required');

    await expect(
      submitInvitationLead({
        parentName: 'Test',
        email: 'test@example.com',
        whatsapp: '123',
      })
    ).rejects.toThrow('age is required');
  });

  it('throws when consent is not given', async () => {
    await expect(
      submitInvitationLead({
        parentName: 'Test',
        email: 'test@example.com',
        whatsapp: '123',
        age: '7',
        language: 'en',
        consent: false,
      })
    ).rejects.toThrow('consent is required');
  });

  it('creates a Lead and calls Flodesk with trimmed values', async () => {
    const mockLead = { _id: 'lead123' };
    const flodeskResponse = { id: 'flodesk-abc' };
    Lead.create.mockResolvedValueOnce(mockLead);
    submitInvitationToFlodesk.mockResolvedValueOnce(flodeskResponse);

    const result = await submitInvitationLead({
      parentName: '  Maria Silva  ',
      email: '  MARIA@example.com ',
      whatsapp: '  +5511999999999 ',
      age: 7,
      language: 'PT',
      consent: 'yes',
    });

    expect(Lead.create).toHaveBeenCalledTimes(1);
    expect(Lead.create).toHaveBeenCalledWith({
      parentName: 'Maria Silva',
      email: 'maria@example.com',
      whatsapp: '+5511999999999',
      age: '7',
      language: 'pt',
      consent: true,
    });

    expect(submitInvitationToFlodesk).toHaveBeenCalledTimes(1);
    expect(submitInvitationToFlodesk).toHaveBeenCalledWith({
      parentName: 'Maria Silva',
      email: 'MARIA@example.com',
      whatsapp: '+5511999999999',
      age: '7',
    });

    expect(result).toEqual({
      lead: mockLead,
      flodesk: flodeskResponse,
    });
  });
});

