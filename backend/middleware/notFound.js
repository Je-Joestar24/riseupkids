/**
 * 404 for any unmatched route. Sets `statusCode` on the error so the central error handler
 * returns a real 404 (previously it fell through to a 500). Message is generic — it does not
 * echo the requested URL back.
 */
const notFound = (req, res, next) => {
  const error = new Error('Not found');
  error.statusCode = 404;
  next(error);
};

module.exports = notFound;
