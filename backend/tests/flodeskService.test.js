/**
 * Unit tests for Flodesk Service
 *
 * Tests subscribeToFlodesk with mocked axios. No Express dependency.
 * Run: npm test -- tests/flodeskService.test.js
 */

jest.mock('axios');
const axios = require('axios');
const { subscribeToFlodesk, submitInvitationToFlodesk, splitParentName } = require('../services/flodeskService');

describe('flodeskService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.FLODESK_API_KEY = 'test-api-key';
    process.env.SUBSCRIBED_FORM_ID = '688a6cfd8ba84ca33972c2e9';
    process.env.INVITATION_FORM_ID = '688a7f36506c930c8ea45928';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('subscribeToFlodesk', () => {
    it('sends POST to Flodesk /subscribers with email and segment_ids from env', async () => {
      const subscriber = {
        id: 'sub_123',
        email: 'user@example.com',
        status: 'active',
      };
      axios.post.mockResolvedValueOnce({ data: subscriber });

      const result = await subscribeToFlodesk('user@example.com');

      expect(result).toEqual(subscriber);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.flodesk.com/v1/subscribers',
        {
          email: 'user@example.com',
          segment_ids: ['688a6cfd8ba84ca33972c2e9'],
          double_optin: true,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringMatching(/^Basic /),
            'User-Agent': expect.any(String),
          }),
        })
      );
    });

    it('uses FLODESK_BASE_URL from env when set', async () => {
      process.env.FLODESK_BASE_URL = 'https://custom.flodesk.com/v1';
      axios.post.mockResolvedValueOnce({ data: { id: '1', email: 'a@b.com' } });

      await subscribeToFlodesk('a@b.com');

      expect(axios.post).toHaveBeenCalledWith(
        'https://custom.flodesk.com/v1/subscribers',
        expect.objectContaining({
          email: 'a@b.com',
          segment_ids: ['688a6cfd8ba84ca33972c2e9'],
          double_optin: true,
        }),
        expect.any(Object)
      );
    });

    it('throws when FLODESK_API_KEY is not set', async () => {
      delete process.env.FLODESK_API_KEY;

      await expect(subscribeToFlodesk('a@b.com')).rejects.toThrow(
        'FLODESK_API_KEY environment variable is not set'
      );
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('throws when segment ID is not set', async () => {
      delete process.env.SUBSCRIBED_FORM_ID;
      delete process.env.FLODESK_SEGMENT_ID;

      await expect(subscribeToFlodesk('a@b.com')).rejects.toThrow(
        'SUBSCRIBED_FORM_ID or FLODESK_SEGMENT_ID'
      );
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('throws when email is missing or empty', async () => {
      await expect(subscribeToFlodesk('')).rejects.toThrow('email is required');
      await expect(subscribeToFlodesk(null)).rejects.toThrow('email is required');
      await expect(subscribeToFlodesk(undefined)).rejects.toThrow('email is required');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('throws with clear message when API returns error', async () => {
      const axiosError = new Error('Request failed');
      axiosError.isAxiosError = true;
      axiosError.response = { status: 400, data: { message: 'Invalid email' } };
      axios.post.mockRejectedValueOnce(axiosError);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(subscribeToFlodesk('bad')).rejects.toThrow('Flodesk subscription failed');
      expect(axios.post).toHaveBeenCalled();

      axios.isAxiosError.mockRestore();
    });
  });

  describe('splitParentName', () => {
    it('splits "First Last" into first_name and last_name', () => {
      expect(splitParentName('Jejomar Parrilla')).toEqual({
        first_name: 'Jejomar',
        last_name: 'Parrilla',
      });
    });
    it('splits multiple words: first word = first_name, rest = last_name', () => {
      expect(splitParentName('Mary Jane Watson')).toEqual({
        first_name: 'Mary',
        last_name: 'Jane Watson',
      });
    });
    it('single word: first_name only, last_name empty', () => {
      expect(splitParentName('Madonna')).toEqual({ first_name: 'Madonna', last_name: '' });
    });
    it('handles null/undefined/empty', () => {
      expect(splitParentName(null)).toEqual({ first_name: '', last_name: '' });
      expect(splitParentName(undefined)).toEqual({ first_name: '', last_name: '' });
      expect(splitParentName('')).toEqual({ first_name: '', last_name: '' });
      expect(splitParentName('   ')).toEqual({ first_name: '', last_name: '' });
    });
    it('trims whitespace', () => {
      expect(splitParentName('  John   Doe  ')).toEqual({
        first_name: 'John',
        last_name: 'Doe',
      });
    });
  });

  describe('submitInvitationToFlodesk', () => {
    it('sends POST with first_name, last_name, email, whatsapp, age, segment_ids', async () => {
      const subscriber = {
        id: 'inv_123',
        email: 'parent@example.com',
        first_name: 'Jejomar',
        last_name: 'Parrilla',
        status: 'unconfirmed',
      };
      axios.post.mockResolvedValueOnce({ data: subscriber });

      const result = await submitInvitationToFlodesk({
        parentName: 'Jejomar Parrilla',
        email: 'parent@example.com',
        whatsapp: '+1234567890',
        age: '5',
      });

      expect(result).toEqual(subscriber);
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.flodesk.com/v1/subscribers',
        {
          email: 'parent@example.com',
          first_name: 'Jejomar',
          last_name: 'Parrilla',
          segment_ids: ['688a7f36506c930c8ea45928'],
          double_optin: true,
          custom_fields: { whatsapp: '+1234567890', age: '5' },
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('single-word parentName: last_name empty', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: '1' } });

      await submitInvitationToFlodesk({
        parentName: 'Madonna',
        email: 'm@example.com',
        whatsapp: '123',
        age: '3',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          first_name: 'Madonna',
          last_name: '',
          email: 'm@example.com',
          custom_fields: { whatsapp: '123', age: '3' },
        }),
        expect.any(Object)
      );
    });

    it('throws when email is missing', async () => {
      await expect(
        submitInvitationToFlodesk({
          parentName: 'John Doe',
          email: '',
          whatsapp: '123',
          age: '4',
        })
      ).rejects.toThrow('email is required');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('throws when INVITATION_FORM_ID is not set', async () => {
      delete process.env.INVITATION_FORM_ID;

      await expect(
        submitInvitationToFlodesk({
          parentName: 'John',
          email: 'j@example.com',
          whatsapp: '1',
          age: '5',
        })
      ).rejects.toThrow('INVITATION_FORM_ID');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('omits empty whatsapp/age from custom_fields', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: '1' } });

      await submitInvitationToFlodesk({
        parentName: 'Jane Doe',
        email: 'jane@example.com',
        whatsapp: '',
        age: '',
      });

      const payload = axios.post.mock.calls[0][1];
      expect(payload.custom_fields).toEqual({});
    });
  });
});
