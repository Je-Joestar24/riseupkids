#!/usr/bin/env bash
# Local equivalent of the security workflow (RUK-SEC-013 / Chunk 5).
# Runs the same checks CI runs, so they work even with GitHub Actions disabled.
#
#   bash scripts/security-check.sh              # audit + secret scan + SAST
#   bash scripts/security-check.sh --audit-only # just npm audit
#
# Exit non-zero if any check fails. Semgrep and gitleaks are optional — the script
# reports and skips them if they're not installed (install hints printed).

set -u
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
RED=$'\e[31m'; GRN=$'\e[32m'; YEL=$'\e[33m'; RST=$'\e[0m'
fail=0
audit_only=0
[ "${1:-}" = "--audit-only" ] && audit_only=1

WORKSPACES=("backend" "frontend" "app" "riseupkids-sale/web")

# Gate on Critical (matches security.yml). Highs are a tracked backlog in
# DEPENDENCY_AND_SCANNING_SCHEDULE.md — reported here, not a hard failure yet.
echo "== npm audit =="
for ws in "${WORKSPACES[@]}"; do
  [ -f "$ROOT/$ws/package.json" ] || continue
  echo "-- $ws"
  ( cd "$ROOT/$ws" && npm audit ) || true
  ( cd "$ROOT/$ws" && npm audit --audit-level=critical --silent ) \
    || { echo "${RED}   CRITICAL vulnerability in $ws — must fix before deploy${RST}"; fail=1; }
done

if [ "$audit_only" -eq 1 ]; then
  [ "$fail" -eq 0 ] && echo "${GRN}audit clean${RST}" || echo "${RED}audit found issues${RST}"
  exit $fail
fi

echo
echo "== secret scan (gitleaks) =="
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --redact --no-banner -c "$ROOT/.gitleaks.toml" || { echo "${RED}   gitleaks found secrets${RST}"; fail=1; }
else
  echo "${YEL}   gitleaks not installed — https://github.com/gitleaks/gitleaks#installing${RST}"
fi

echo
echo "== static analysis (semgrep) =="
if command -v semgrep >/dev/null 2>&1; then
  semgrep scan --config "$ROOT/.semgrep.yml" --config "p/owasp-top-ten" --config "p/nodejsscan" --error --metrics off \
    || { echo "${RED}   semgrep found issues${RST}"; fail=1; }
else
  echo "${YEL}   semgrep not installed — pip install semgrep${RST}"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "${GRN}security-check passed${RST}"
else
  echo "${RED}security-check found issues — see above${RST}"
fi
exit $fail
