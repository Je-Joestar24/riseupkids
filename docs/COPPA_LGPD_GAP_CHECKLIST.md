# COPPA / LGPD gap checklist

Chunk 7. Status as of 2026-09-11. Owner and due date columns are for the client to fill in —
these are policy/process decisions, not code.

## Closed this chunk

| Gap | Status | Notes |
|---|---|---|
| Kids Wall consent was auto-granted, not a parent action (RUK-SEC-006) | **Closed** | Opt-in by default; explicit parent action required; see `docs/CHILD_DATA_PRIVACY.md` |
| Cross-family Kids Wall feed had no consent scoping and honored a client-supplied approval filter | **Closed** | Feed now hard-scoped to currently-consented children, approved posts only |
| Account/child deletion missed push tokens, notification receipts, and some orphaned media (RUK-SEC-026) | **Closed** | See `docs/CHILD_DATA_PRIVACY.md` |
| Third-party sharing (Google Vision) undisclosed or payload not minimized | **Closed** | Already minimal (label detection only, not stored); already disclosed in the privacy policy |

## Open — needs a client / legal decision

| Gap | Why it matters | Suggested owner |
|---|---|---|
| **Consent strength** — the current Kids Wall consent action is "parent logs into their own dashboard, reads a disclosure, checks a box." COPPA's "verifiable parental consent" bar for disclosing a child's information/image to other users can call for a stronger mechanism (e.g. re-entering a password, a signed form, or a payment-method check) depending on legal risk tolerance. | Determines whether the current fix is sufficient long-term or needs a stronger verification step. | Client / legal |
| **Kids Wall access-control review** — Kids Wall's per-post ownership check only runs for the `parent` role; other authenticated roles (teacher, content_creator) reach the same routes without an explicit ownership check today (mirrors a broader authorization gap tracked under the IDOR/audit-logging chunk). | Same class of exposure as the feed bug, via a different door. | Engineering (tracked separately) |
| **Data minimization review of the global feed's existence** — the product intentionally shows approved Kids Wall posts across families (per the current privacy policy). Confirm this cross-family model is still the intended design, versus limiting visibility to a parent's own children or an opt-in "public" toggle per post. | A product/privacy-policy decision, not just a security one. | Client |
| **Retention policy for Kids Wall posts and consent history** — no explicit "how long is a Kids Wall post kept if never deleted by the parent" policy exists beyond "until account deletion." | Worth a stated retention period for completeness. | Client |
| **Moderator access logging** — admin/teacher approve/reject actions on Kids Wall posts, and any direct view of child PII, are not currently audit-logged. | Feeds the general audit-logging chunk. | Engineering (tracked separately) |

## Privacy-policy change requests

None required immediately — the current privacy policy's Kids Wall section already matches the
fixed behavior (opt-in, reviewed before appearing to other families, display name + age only).
If the "consent strength" item above leads to a stronger verification step, the policy's consent
language should be revisited at that time.
