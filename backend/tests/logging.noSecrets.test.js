/**
 * RUK-SEC-010 / Chunk 6 — nothing sensitive reaches the log output.
 *
 * Captures everything the application logger writes and asserts that, given the shapes of data
 * the real controllers/services log (a user doc, an auth error, a webhook body, a child profile,
 * an axios error carrying a provider response), no secret or PII value appears in the output.
 * @see backend/config/logger.js
 */
const logger = require('../config/logger');

// Fake fixtures assembled at runtime so the source file holds no literal that a scanner
// (GitHub push protection, gitleaks) would flag as a real key.
const FAKE_STRIPE_KEY = ['sk', 'live', 'deadbeefdeadbeefdeadbeef'].join('_');
const FAKE_MONGO_URI = 'mongodb+srv://admin:' + 'realpassword' + '@cluster0.mongodb.net/prod';
const FAKE_JWT =
  'eyJ' + 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + '.' + 'eyJzdWIiOiIxMjM0NTY3ODkwIn0' + '.' +
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const SECRETS = [
  'SUPERSECRETpassword123',
  FAKE_JWT,
  '4111111111111111', // card number
  '123456', // an OTP code value
  'realpassword', // credential inside a connection string
  FAKE_STRIPE_KEY,
  'Timmy Turner', // child full name
  '2016-05-01', // child DOB
];

let writes;
let stdoutSpy;
const prevLevel = logger.level;

beforeEach(() => {
  writes = [];
  stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    writes.push(String(chunk));
    return true;
  });
  logger.level = 'trace'; // the app runs the logger at 'silent' under NODE_ENV=test
});

afterEach(() => {
  stdoutSpy.mockRestore();
  logger.level = prevLevel;
});

const output = () => writes.join('');

function assertClean() {
  const out = output();
  for (const s of SECRETS) {
    expect(out).not.toContain(s);
  }
  // and it did actually log something
  expect(out.length).toBeGreaterThan(0);
}

describe('logging never leaks secrets or PII', () => {
  it('a user document', () => {
    logger.info(
      {
        user: {
          _id: 'u1',
          email: 'parent@example.com',
          password: 'SUPERSECRETpassword123',
          passwordResetToken: 'abc',
          subscriptionStatus: 'active',
          taxId: '12345678900',
        },
      },
      'user updated'
    );
    assertClean();
  });

  it('an auth failure — password stays out even when passed as a field on the error', () => {
    const err = Object.assign(new Error('invalid credentials'), {
      attempted: { password: 'SUPERSECRETpassword123' },
    });
    logger.error({ err, userId: 'u1', password: 'SUPERSECRETpassword123' }, 'login failed');
    assertClean();
  });

  it('a JWT in a header object and interpolated into a message', () => {
    logger.info({ headers: { authorization: `Bearer ${FAKE_JWT}` } }, 'request received');
    logger.warn(`token ${FAKE_JWT} rejected`);
    assertClean();
  });

  it('a payment webhook body and an axios-style provider error', () => {
    logger.info(
      { body: { cardNumber: '4111111111111111', cvv: '999', amountCents: 4990 } },
      'webhook received'
    );
    const axiosErr = Object.assign(new Error('Request failed with status code 400'), {
      response: { status: 400, data: { access_token: FAKE_STRIPE_KEY } },
    });
    logger.error({ err: axiosErr }, 'provider call failed');
    assertClean();
  });

  it('a child profile', () => {
    logger.info(
      { child: { _id: 'c1', displayName: 'Timmy', fullName: 'Timmy Turner', dob: '2016-05-01', age: 8 } },
      'child profile viewed'
    );
    assertClean();
  });

  it('the Mongo connection string in an error', () => {
    logger.error({ err: new Error(`failed to connect to ${FAKE_MONGO_URI}`) }, 'db error');
    assertClean();
  });

  it('an OTP code passed as a field is masked', () => {
    logger.info({ otp: '123456', userId: 'u1' }, 'otp generated');
    const out = output();
    expect(out).not.toContain('123456');
    expect(out).toContain('[Redacted]');
  });
});
