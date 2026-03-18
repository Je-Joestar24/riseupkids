jest.mock('../models/Leads', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../services/flodeskService', () => ({
  submitInvitationToFlodesk: jest.fn(),
}));

const Lead = require('../models/Leads');
const { submitInvitationToFlodesk } = require('../services/flodeskService');
const {
  submitInvitationLead,
  listLeads,
  normalizeLanguage,
  normalizeBoolean,
} = require('../services/lead.services');
const { buildWhatsAppLink } = require('../services/whatsappLinkService');

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

describe('lead.services – listLeads (Phase 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockFindChain(items) {
    const chain = {
      sort: jest.fn(() => chain),
      skip: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      lean: jest.fn(() => Promise.resolve(items)),
    };
    Lead.find.mockReturnValue(chain);
    return chain;
  }

  it('returns paginated results with meta', async () => {
    mockFindChain([{ _id: '1' }, { _id: '2' }]);
    Lead.countDocuments.mockResolvedValueOnce(42);

    const result = await listLeads({ page: 2, limit: 2 });

    expect(Lead.find).toHaveBeenCalledWith({});
    expect(result.items).toHaveLength(2);
    expect(result.meta).toEqual({
      page: 2,
      limit: 2,
      total: 42,
      totalPages: 21,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('applies q search across email/parentName/whatsapp', async () => {
    mockFindChain([]);
    Lead.countDocuments.mockResolvedValueOnce(0);

    await listLeads({ q: 'maria' });

    const filter = Lead.find.mock.calls[0][0];
    expect(filter.$or).toBeDefined();
    expect(filter.$or).toHaveLength(3);
  });

  it('applies language filter (pt/en/es)', async () => {
    mockFindChain([]);
    Lead.countDocuments.mockResolvedValueOnce(0);

    await listLeads({ language: 'PT' });

    expect(Lead.find).toHaveBeenCalledWith({ language: 'pt' });
  });

  it('applies consent filter when provided', async () => {
    mockFindChain([]);
    Lead.countDocuments.mockResolvedValueOnce(0);

    await listLeads({ consent: 'true' });

    expect(Lead.find).toHaveBeenCalledWith({ consent: true });
  });

  it('adds whatsappLink based on lead language + phone', async () => {
    const items = [
      { _id: '1', parentName: 'Maria Silva', whatsapp: '+55 11 99999-9999', language: 'pt' },
      { _id: '2', parentName: 'John Doe', whatsapp: '1 (555) 123-4567', language: 'en' },
      { _id: '3', parentName: 'Ana', whatsapp: '', language: 'es' },
    ];
    mockFindChain(items);
    Lead.countDocuments.mockResolvedValueOnce(3);

    const result = await listLeads({ page: 1, limit: 10 });

    expect(result.items[0].whatsappLink).toBe(
      buildWhatsAppLink({ whatsapp: items[0].whatsapp, parentName: items[0].parentName, language: 'pt' })
    );
    expect(result.items[1].whatsappLink).toBe(
      buildWhatsAppLink({ whatsapp: items[1].whatsapp, parentName: items[1].parentName, language: 'en' })
    );
    expect(result.items[2].whatsappLink).toBeNull();
  });
});

describe('lead.routes – admin protection', () => {
  it('GET / is protected by protect + authorize(admin)', () => {
    const router = require('../routes/lead.routes');

    const layer = router.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.get);
    expect(layer).toBeTruthy();

    // Express stores middlewares in order. authorize('admin') returns an anonymous function.
    expect(layer.route.stack).toHaveLength(3);
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe(''); // authorize('admin') anonymous middleware
    expect(layer.route.stack[2].handle.name).toBe('getLeads');
  });
});

