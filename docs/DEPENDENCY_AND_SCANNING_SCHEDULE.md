# Dependency & scanning schedule

**Owner:** _(assign — the person who reviews Dependabot PRs and triages advisories)_

## Cadence

| When | What |
|---|---|
| Weekly (Mondays) | Review the grouped Dependabot PRs. Minor/patch: merge if `test.yml` + `security.yml` are green. Majors: read the changelog, test locally, merge deliberately. |
| Weekly | Skim the `security.yml` scheduled run. Any new Critical → fix within the week. |
| Monthly | `bash scripts/security-check.sh --audit-only` and `npm outdated` in each workspace; re-triage this file's backlog. |
| Immediately | Any **Critical** advisory affecting a runtime dependency — patch and deploy out of band. |

## `npm audit` triage — state after the Chunk 5 pass (2026-09-08)

A non-breaking `npm audit fix` was applied to all four workspaces and every test suite re-run — **zero regressions**. All Critical vulnerabilities were cleared.

| Workspace | Before | After |
|---|---|---|
| backend | 1 critical, 14 high | **0 critical, 2 high** |
| frontend | 0 critical, 10 high | **0 critical, 1 high** |
| app | 2 critical, 23 high | **0 critical, 10 high** |
| sales | 0 critical, 13 high | **0 critical, 0 high** |

### Remaining High — all require a major version bump; each is an accepted risk with a planned fix

| Workspace | Package | Advisory (summary) | Why it's accepted for now | Planned fix |
|---|---|---|---|---|
| backend | `adm-zip` | Crafted ZIP → 4 GB memory allocation (DoS) | Only reachable via an **admin** uploading HTML5 content zips; not an anonymous surface. | Bump to the fixed major next time the content-upload code is touched, or add an uncompressed-size guard. |
| backend | `nodemailer` | CRLF injection via transport `name` / `List-*` header comments | The transport name and headers are **fixed config**, not user input. | Bump to v10 in a dedicated PR with a full mail-send test (password reset, reset-code templates). |
| frontend | `vite` | Dev-server `server.fs` file-read / path issues | Affects `vite dev` only — **not** the production static build that ships. | Bump to Vite 8 with the next frontend dependency refresh; re-run the build + browser smoke test. |
| app | `expo`, `metro`, `@expo/*`, `image-size`, `postcss` (9) | DoS / parser issues in the **bundler and CLI** | Build-time tooling that processes the team's own source, not attacker input; not in the shipped app runtime. | Roll into the planned Expo SDK 57 upgrade (separate effort — SDK majors touch native modules and need device testing). |

Moderates and lows are tracked by Dependabot and cleared as its PRs land.

## Tooling

- **`test.yml`** — all four test suites on every push/PR.
- **`security.yml`** — `npm audit` (fails on Critical), `gitleaks` full-history, `semgrep` (OWASP + Node packs), `dependency-review` on PRs. Also runs weekly on a schedule.
- **`codeql.yml`** — ready; manual-only until GitHub Advanced Security is enabled on the repo.
- **`.github/dependabot.yml`** — weekly, all four `package.json` locations + GitHub Actions. Needs Dependabot switched on in repo settings.
- **`bash scripts/security-check.sh`** — the same audit + gitleaks + semgrep locally.

## Still needs a repo admin (client)

- Turn on Dependabot (Settings → Code security and analysis).
- Branch protection on `master`: require `tests` and `security` green before merge.
- Optionally enable GitHub Advanced Security to activate `codeql.yml`.
