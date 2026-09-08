# Pre-deploy security checklist

There is no automated deploy. Run through this before every manual deploy and paste the ticked
list into the PR or the release note. Takes a few minutes.

## Before you deploy

- [ ] **Tests green** — `test.yml` passed on the commit being deployed (or `npm test` in each
      changed workspace locally).
- [ ] **`npm audit`** — `bash scripts/security-check.sh --audit-only` shows no *new* Critical/High
      vs. the backlog in `DEPENDENCY_AND_SCANNING_SCHEDULE.md`. A new Critical blocks the deploy.
- [ ] **Secret scan** — `security.yml` gitleaks job is green, or `gitleaks detect` locally is clean.
      No secret in the diff (`git log -p origin/master..HEAD | grep -iE 'key|secret|token|password'`).
- [ ] **`.env` diff reviewed** — every new/changed variable on the server is intentional and is in
      `.env.example` (with a placeholder). Run `node backend/scripts/check-env.js` on the server
      after `git pull`, before `pm2 restart`.
- [ ] **DB migrations / scripts** — any `backend/scripts/*` or schema change in this deploy has been
      read and is safe to run against production data. Note the reverse/rollback step.
- [ ] **Rollback command noted** — the previous good commit SHA is written down:
      `git checkout <sha> && npm ci && pm2 restart <app> --update-env`.
- [ ] **Static site (if deploying `frontend/` or the sales site)** — built locally, opened in a
      browser, no CSP violations in the console on the main pages.

## Deploy

**API:** `git pull` → `npm ci` → `node scripts/check-env.js` → `pm2 restart <app> --update-env` →
`pm2 logs <app> --lines 30` (confirm clean boot).

**Static sites:** `npm run build` → sync `dist/` to S3 → CloudFront invalidation.

## After

- [ ] Smoke test the changed area in production (log in, the specific feature, one payment path if
      touched).
- [ ] `pm2 logs` shows no crash loop and no unexpected errors for ~5 minutes.
