jest.mock('../models/SchoolProspect', () => ({
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../services/flodeskService', () => ({
  submitSchoolApplicationToFlodesk: jest.fn(),
  getSchoolSegmentId: jest.fn(),
}));

const SchoolProspect = require('../models/SchoolProspect');
const {
  submitSchoolApplicationToFlodesk,
  getSchoolSegmentId,
} = require('../services/flodeskService');
const {
  submitSchoolProspect,
  listSchoolProspects,
  normalizeLanguage,
  normalizeRole,
  normalizeCurrentEnglish,
} = require('../services/schoolProspect.services');
const { buildWhatsAppLink } = require('../services/whatsappLinkService');

const validPayload = {
  schoolName: 'Escola Exemplo',
  cityCountry: 'São Paulo, Brazil',
  role: 'principal',
  whatsapp: '+55 11 98765-4321',
  email: 'contact@school.example',
  studentCount: '250',
  ageGroup: '5-10',
  currentEnglish: 'yes',
  interest: 'We want an immersive English program.',
  language: 'pt',
};

describe('schoolProspect.services – submitSchoolProspect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSchoolSegmentId.mockReturnValue('6a26b4bb6b0d638a5d97ac60');
  });

  it('normalizes language correctly', () => {
    expect(normalizeLanguage('PT')).toBe('pt');
    expect(normalizeLanguage(' en ')).toBe('en');
    expect(normalizeLanguage('Es')).toBe('es');
    expect(normalizeLanguage('')).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
    expect(normalizeLanguage('fr')).toBeNull();
  });

  it('normalizes role correctly', () => {
    expect(normalizeRole('Principal')).toBe('principal');
    expect(normalizeRole('teacher')).toBe('teacher');
    expect(normalizeRole('invalid')).toBeNull();
  });

  it('normalizes currentEnglish correctly', () => {
    expect(normalizeCurrentEnglish('Yes')).toBe('yes');
    expect(normalizeCurrentEnglish('no')).toBe('no');
    expect(normalizeCurrentEnglish('maybe')).toBeNull();
  });

  it('throws when required fields are missing', async () => {
    await expect(submitSchoolProspect({})).rejects.toThrow('schoolName is required');

    await expect(
      submitSchoolProspect({ schoolName: 'Test School' })
    ).rejects.toThrow('cityCountry is required');

    await expect(
      submitSchoolProspect({
        schoolName: 'Test School',
        cityCountry: 'Lisbon',
        role: 'invalid',
        whatsapp: '+351 900 000 000',
        email: 'test@school.example',
        studentCount: '100',
        ageGroup: '5-10',
        currentEnglish: 'yes',
        interest: 'Interested in the program',
        language: 'en',
      })
    ).rejects.toThrow('role is required');
  });

  it('creates prospect and calls Flodesk with trimmed values', async () => {
    const mockProspect = { _id: 'prospect123' };
    const updatedProspect = { _id: 'prospect123', flodeskStatus: 'success' };
    const flodeskResponse = { id: 'flodesk-abc', email: 'contact@school.example' };

    SchoolProspect.create.mockResolvedValueOnce(mockProspect);
    submitSchoolApplicationToFlodesk.mockResolvedValueOnce(flodeskResponse);
    SchoolProspect.findByIdAndUpdate.mockResolvedValueOnce(updatedProspect);

    const result = await submitSchoolProspect({
      ...validPayload,
      schoolName: '  Escola Exemplo  ',
      email: '  CONTACT@school.example ',
      role: 'Principal',
      currentEnglish: 'YES',
      language: 'PT',
    });

    expect(getSchoolSegmentId).toHaveBeenCalledWith('pt');
    expect(SchoolProspect.create).toHaveBeenCalledWith({
      schoolName: 'Escola Exemplo',
      cityCountry: 'São Paulo, Brazil',
      role: 'principal',
      whatsapp: '+55 11 98765-4321',
      email: 'contact@school.example',
      studentCount: '250',
      ageGroup: '5-10',
      currentEnglish: 'yes',
      interest: 'We want an immersive English program.',
      language: 'pt',
      flodeskStatus: 'pending',
      flodeskSegmentId: '6a26b4bb6b0d638a5d97ac60',
    });

    expect(submitSchoolApplicationToFlodesk).toHaveBeenCalledWith({
      schoolName: 'Escola Exemplo',
      cityCountry: 'São Paulo, Brazil',
      role: 'principal',
      whatsapp: '+55 11 98765-4321',
      email: 'CONTACT@school.example',
      studentCount: '250',
      ageGroup: '5-10',
      currentEnglish: 'yes',
      interest: 'We want an immersive English program.',
      language: 'pt',
    });

    expect(SchoolProspect.findByIdAndUpdate).toHaveBeenCalledWith(
      'prospect123',
      {
        flodeskStatus: 'success',
        flodeskSubscriberId: 'flodesk-abc',
        flodeskSegmentId: '6a26b4bb6b0d638a5d97ac60',
        flodeskError: null,
      },
      { new: true }
    );

    expect(result).toEqual({
      prospect: updatedProspect,
      flodesk: flodeskResponse,
    });
  });

  it('marks prospect failed when Flodesk throws', async () => {
    const mockProspect = { _id: 'prospect456' };
    SchoolProspect.create.mockResolvedValueOnce(mockProspect);
    submitSchoolApplicationToFlodesk.mockRejectedValueOnce(new Error('Flodesk down'));
    SchoolProspect.findByIdAndUpdate.mockResolvedValueOnce(null);

    await expect(submitSchoolProspect(validPayload)).rejects.toThrow('Flodesk down');

    expect(SchoolProspect.findByIdAndUpdate).toHaveBeenCalledWith('prospect456', {
      flodeskStatus: 'failed',
      flodeskError: 'Flodesk down',
    });
  });
});

describe('schoolProspect.services – listSchoolProspects', () => {
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
    SchoolProspect.find.mockReturnValue(chain);
    return chain;
  }

  it('returns paginated results with meta', async () => {
    mockFindChain([{ _id: '1' }, { _id: '2' }]);
    SchoolProspect.countDocuments.mockResolvedValueOnce(42);

    const result = await listSchoolProspects({ page: 2, limit: 2 });

    expect(SchoolProspect.find).toHaveBeenCalledWith({});
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

  it('applies q search across school fields', async () => {
    mockFindChain([]);
    SchoolProspect.countDocuments.mockResolvedValueOnce(0);

    await listSchoolProspects({ q: 'academy' });

    const filter = SchoolProspect.find.mock.calls[0][0];
    expect(filter.$or).toBeDefined();
    expect(filter.$or).toHaveLength(5);
  });

  it('applies language and role filters', async () => {
    mockFindChain([]);
    SchoolProspect.countDocuments.mockResolvedValueOnce(0);

    await listSchoolProspects({ language: 'EN', role: 'Principal' });

    expect(SchoolProspect.find).toHaveBeenCalledWith({
      language: 'en',
      role: 'principal',
    });
  });

  it('applies flodeskStatus and cityCountry filters', async () => {
    mockFindChain([]);
    SchoolProspect.countDocuments.mockResolvedValueOnce(0);

    await listSchoolProspects({ flodeskStatus: 'failed', cityCountry: 'Brazil' });

    expect(SchoolProspect.find).toHaveBeenCalledWith({
      flodeskStatus: 'failed',
      cityCountry: { $regex: 'Brazil', $options: 'i' },
    });
  });

  it('adds whatsappLink using schoolName', async () => {
    const items = [
      {
        _id: '1',
        schoolName: 'Escola Modelo',
        whatsapp: '+55 11 99999-9999',
        language: 'pt',
      },
    ];
    mockFindChain(items);
    SchoolProspect.countDocuments.mockResolvedValueOnce(1);

    const result = await listSchoolProspects({ page: 1, limit: 10 });

    expect(result.items[0].whatsappLink).toBe(
      buildWhatsAppLink({
        whatsapp: items[0].whatsapp,
        parentName: items[0].schoolName,
        language: 'pt',
      })
    );
  });
});

describe('schoolProspect.routes – admin protection', () => {
  it('GET / is protected by protect + authorize(admin)', () => {
    const router = require('../routes/schoolProspect.routes');

    const layer = router.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.get);
    expect(layer).toBeTruthy();
    expect(layer.route.stack).toHaveLength(3);
    expect(layer.route.stack[0].handle.name).toBe('protect');
    expect(layer.route.stack[1].handle.name).toBe('');
    expect(layer.route.stack[2].handle.name).toBe('getSchoolProspects');
  });
});
