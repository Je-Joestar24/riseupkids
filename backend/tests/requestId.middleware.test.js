/**
 * RUK-SEC-011 — request-id middleware.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-011
 */
const express = require('express');
const request = require('supertest');
const requestId = require('../middleware/requestId');

function app() {
  const a = express();
  a.use(requestId);
  a.get('/x', (req, res) => res.json({ id: req.id }));
  return a;
}

describe('requestId middleware', () => {
  it('generates an id, exposes it on req.id, and echoes it in X-Request-Id', async () => {
    const res = await request(app()).get('/x');
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/); // uuid
    expect(res.headers['x-request-id']).toBe(res.body.id);
  });

  it('trusts a sane inbound X-Request-Id', async () => {
    const res = await request(app()).get('/x').set('X-Request-Id', 'trace-abc123-XYZ');
    expect(res.body.id).toBe('trace-abc123-XYZ');
    expect(res.headers['x-request-id']).toBe('trace-abc123-XYZ');
  });

  it('ignores a junk inbound X-Request-Id and generates a fresh one', async () => {
    const res = await request(app())
      .get('/x')
      .set('X-Request-Id', 'not a valid id <script>');
    expect(res.body.id).not.toBe('not a valid id <script>');
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('ignores an over-long inbound X-Request-Id', async () => {
    const res = await request(app()).get('/x').set('X-Request-Id', 'a'.repeat(200));
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
