# Vault Maya Remediation Handoff

Date: 2026-07-30

Current branch: `codex/vault-maya-remediation-takeover`

Current production base reviewed: `origin/main` at `f7b92f47`

Status: **built, not released, not lifecycle-certified**

Read `VAULT_MAYA_TAKEOVER_STATUS_2026-07-30.md` first. It is the plain-language
authority for what is decided, built, approved, and still open.

## Review diff

```bash
git fetch origin
git diff origin/main...codex/vault-maya-remediation-takeover
```

The branch intentionally contains only Vault Maya remediation, its tests, and its
audit/status records. Unrelated screenshots and daily-email script changes from the
earlier branch were removed before takeover.

## Verification by blocker

| ID | Local evidence | Required live evidence |
|---|---|---|
| B1 | Portal behavior test proves customer and Vault studio return URL | Open portal as the genuine vault-only customer, cancel, return to studio |
| B2 | Seven entitlement precedence fixtures | Confirm Vault remains after any higher temporary entitlement expires |
| B3 | Member block and access-check failure behavior tests | Signed-in SUITE account sees included panel and no Stripe form |
| B4 | Ownership helper behavior tests return foreign references; route returns 403 | Submit another account's stored selfie URL and observe 403 with no charge/generation |
| B5 | Customer-surface copy pins | Review deployed offer, checkout, success, studio and welcome email |
| B6 | Offer/welcome disclosure tests | Verify exact deployed copy |
| B7 | Missing-price, invalid-time and no-clock tests | Confirm intended Stripe price on the genuine checkout |
| B8 | Deletion behavior tests prove blob-first deletion and visible failure | Upload, delete, confirm row absent and blob unavailable |
| B9 | Welcome variants render and Vault return paths are wired | Confirm inbox delivery and logged-out return journey |
| B10 | Event wiring pins; saved event occurs only after successful download | Confirm all expected rows in `analytics_events` for the lifecycle customer |
| B11 | Cannot be completed locally | Genuine $19 purchase plus full lifecycle below |

## B11 order

1. `stripe_payments` contains the successful, live `vault_maya` payment with attribution.
2. `subscriptions` contains the recurring Vault Maya subscription.
3. The invoice grants exactly 30 monthly credits once.
4. The correct welcome email is recorded and delivered.
5. Access resolves to `vault`; `/app` routes the customer to `/vault-maya/studio`.
6. One successful generation deducts exactly one credit.
7. A foreign stored selfie URL returns 403 without a charge or generation.
8. Selfie deletion removes the stored blob and database rows while generated photos remain.
9. Stripe portal cancellation works and access remains through period end.
10. Activation events exist for the same customer.
11. Stripe test-clock renewal grants the next 30 credits exactly once.

## Current local gate

- Vault-targeted checks: 42 passed, 0 failed.
- Type-check: passed.
- `verify:repo`: the active workspace check sees ignored local `.claude` and `.serena`
  folders. The verifier passed from a clean detached worktree, testing repository
  contents without deleting local tooling.
- Complete sequential suite: 392 test files passed, 1,832 tests passed, 0 failed,
  6 intentionally skipped.
- Production build: passed.

## Hard boundaries

- No deploy has been approved or performed.
- No customer email has been approved or sent.
- No public launch date or founder flip timestamp is set.
- No speed claim is approved.
- A human must complete the genuine payment step; code agents do not enter payment details.
