# Vault Maya Takeover Status

Date: 2026-07-30

This is the current control record. It replaces the status claims in the older launch
pack and the first remediation hand-off.

## The simple answer

Vault Maya remediation is **built on a branch, not released**.

- Production is untouched by this remediation.
- B1-B10 are implemented on `codex/vault-maya-remediation-takeover`.
- Targeted Vault checks pass: 42 tests, 0 failures. Type-check and the production
  build pass.
- The complete sequential suite passes: 392 test files and 1,832 tests, with 0
  failures and 6 intentional skips.
- The branch is based on current `origin/main` at `f7b92f47`.
- No launch email has been sent.
- No founder countdown is running. The price flip has no default date and starts only
  when `VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT` is deliberately set.
- B11, the genuine vault-only lifecycle, is not complete because there has not yet been
  a real $19 purchase through the remediated production journey.

## Decisions already encoded

1. Tap-to-create is Vault Maya v1. No chat or inspiration-image promise.
2. A signed-in SUITE member cannot buy Vault Maya again.
3. Access precedence is SUITE member, active bundle pass, active trial, Vault Maya.
4. Unused monthly credits expire at refresh. Purchased top-ups do not.
5. No generation-speed promise returns until at least 20 real generations are measured.
6. The $19 founder period lasts seven complete days from the actual public launch.
7. Vault-only customers can open Stripe billing and cancel from their studio.
8. Customers can delete stored face selfies themselves; created photos are separate.

## Built and verified locally

| Blocker | Current state |
|---|---|
| B1 billing | Portal route accepts the Vault studio return path; behavior test creates the correct Stripe portal session |
| B2 entitlement | Seven precedence/downgrade fixtures pass |
| B3 duplicate purchase | Checkout page and server action fail closed for signed-in access-check errors; member behavior test passes |
| B4 selfie ownership | Stored identity URLs are checked against the authenticated account; foreign URL behavior test passes |
| B5 unsupported claims | Chat, inspiration-image and speed claims are pinned out of customer surfaces |
| B6 credit disclosure | Offer FAQ and both welcome variants disclose monthly expiry and top-up permanence |
| B7 pricing | Missing current price fails checkout; invalid timestamp fails loudly; unset timestamp means no clock |
| B8 deletion | Blob deletion must succeed before database rows are removed; failure is visible and retryable |
| B9 welcome/return | Welcome variants and Vault studio return route are wired |
| B10 measurement | Seven activation events are wired; photo-saved records only after a successful download |

## Not approved or complete yet

- Merging and deploying the remediation to production.
- The exact customer-facing copy changed by this remediation.
- Any launch email, subject line, segment, schedule or send.
- The public launch timestamp and seven-day price-flip timestamp.
- B11 real-customer lifecycle proof.
- Reintroducing any speed claim.

## One clean sequence from here

1. Sandra approves the exact copy and a QA deployment.
2. Merge to `main`, push, confirm Vercel Ready for the exact SHA, and verify desktop/mobile.
3. Sandra or the lifecycle reviewer completes one genuine $19 purchase with a fresh
   vault-only email.
4. Verify payment, subscription, 30-credit grant, welcome email, Vault access, one-credit
   generation, foreign-selfie 403, selfie deletion, billing portal cancellation, access
   through period end, and activation events.
5. Run renewal/idempotency with a Stripe test clock.
6. Only after the lifecycle is green: set the real seven-day timestamp, approve launch
   copy and sends, and open publicly.
