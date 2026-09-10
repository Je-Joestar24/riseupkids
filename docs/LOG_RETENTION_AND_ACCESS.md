# Log retention & access policy

Draft — RUK-SEC-010 / Chunk 6. Confirm the numbers and names marked _(confirm)_, then this is the policy.

## What is logged

The backend logs through `backend/config/logger.js` (pino). Every line is JSON in production and
carries the request id (`req.id`) so one request can be traced end to end. A central scrubber masks
sensitive values at any depth before they are written:

- **Secrets** — passwords, tokens (access/refresh/id/webhook/CSRF), JWTs, `Authorization`/`Cookie`
  headers, API keys (`sk_…`, `pk_…`, `whsec_…`), `client_secret`, connection strings with inline
  credentials, OTP / reset codes, card number / CVV, Brazilian CPF / tax id.
- **Child & user PII** — display name, full name, date of birth, phone, address, photo/avatar URLs.
  Email addresses are partially masked (`j***@example.com`).
- **HTTP request logs** omit the query string entirely (reset / verify links carry tokens) and the
  `Authorization` / `Cookie` headers.

Error objects are logged as `{ type, message, code }` with the stack **only outside production**,
and the message and stack are scrubbed.

## Retention

| Log | Hot retention | Then |
|---|---|---|
| Application logs (pm2 / stdout) | **60 days** _(confirm)_ | rotated out and deleted |
| HTTP access logs | **60 days** _(confirm)_ | deleted |
| nginx logs | **30 days** _(confirm)_ | deleted |

Nothing containing personal data is kept beyond the retention window. `pm2` log rotation
(`pm2-logrotate`) enforces this on the server — set `max_size`, `retain`, and `compress`
_(the transport / rotation config lands in Chunk 13)_.

## Access

- Production logs may be read only by: **_(confirm — e.g. the lead developer and the site owner)_**.
- Access is via SSH to the server (key-based, no shared accounts). No log-viewing UI is exposed
  publicly.
- Logs are **not** forwarded to any third-party log service today. If one is added (Chunk 13), it
  must support access control and a matching retention setting, and the data-processing terms must
  be reviewed.

## Alerts

- No alert, dashboard, or notification may include a raw personal-data value. Alerts reference the
  request id and the error type only.

## Enforcement

- `security.yml` fails the build if any `console.*` call is added to `backend/services`,
  `controllers`, `jobs`, or `middleware` — all logging in request-path code must go through the
  scrubbing logger.
- `backend/tests/logging.noSecrets.test.js` drives representative flows and asserts no secret or
  PII value reaches the log output.
