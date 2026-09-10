/**
 * Log mail driver – writes email to console (no keys, for development).
 * Same contract as other drivers: send({ to, subject, html?, text?, from? })
 */
const logger = require('../../../config/logger');
function createLogDriver(config) {
  return {
    async send(options) {
      const { to, subject, html, text, from } = options;
      const body = text || html || '(no body)';
      const fromStr = from || (config.from ? `${config.from.name} <${config.from.address}>` : '');
      logger.info('[Mail log driver]', {
        from: fromStr,
        to,
        subject,
        body: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
      });
      return {};
    },
  };
}

module.exports = createLogDriver;
