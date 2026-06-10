/**
 * Capture the exact PagBank webhook body bytes (required for SHA256 x-authenticity-token).
 * Must run before any JSON parser. Accepts any Content-Type PagBank may send.
 */

const express = require('express');

const pagseguroRawBodyParser = express.raw({
  type: () => true,
  limit: '2mb',
  verify: (req, _res, buf) => {
    req.pagseguroRawBodyBuffer = buf;
  },
});

function attachPagseguroRawBodyString(req, res, next) {
  const buf = req.pagseguroRawBodyBuffer || (Buffer.isBuffer(req.body) ? req.body : null);

  if (!buf || buf.length === 0) {
    console.error('[PagSeguro Webhook] Empty request body');
    return res.status(400).json({
      success: false,
      message: 'Empty webhook body.',
    });
  }

  req.pagseguroRawBody = buf.toString('utf8');
  req.body = buf;
  next();
}

module.exports = {
  pagseguroRawBodyParser,
  attachPagseguroRawBodyString,
};
