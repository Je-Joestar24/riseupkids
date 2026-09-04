/**
 * Central error handler.
 *
 * RUK-SEC-011: in production/staging, an unexpected 5xx must NOT leak internal detail
 * (raw DB errors, third-party API responses, stack traces, file paths). Those errors return a
 * generic message plus the request id; the full error is written to the server log under that id.
 * Client-facing 4xx validation messages are kept — they're meant to be shown to users.
 */
const isProdLike = () => ['production', 'staging'].includes((process.env.NODE_ENV || '').toLowerCase());

const errorHandler = (err, req, res, next) => {
  let statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  let message = err.message || 'Server Error';

  // Mongoose-specific errors → safe 4xx
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  const requestId = req && req.id;
  const where = req ? `${req.method} ${req.originalUrl}` : '-';

  // 5xx: full detail (stack, cause) to the log, keyed by the request id. 4xx: one line, no stack.
  if (statusCode >= 500) {
    console.error(`[error] ${requestId || '-'} ${where} -> ${statusCode}`, err);
  } else {
    console.warn(`[warn] ${requestId || '-'} ${where} -> ${statusCode} ${message}`);
  }

  const body = { success: false };

  if (isProdLike() && statusCode >= 500) {
    body.message = 'Something went wrong. Please try again.';
  } else {
    body.message = message;
    if (!isProdLike() && err.stack) body.stack = err.stack;
  }
  if (requestId) body.requestId = requestId;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
