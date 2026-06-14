# ENTITLE-01 — Access gates must exclude test-mode subscription rows

OWNER: codex (queued — picks up after `/app` Maya session persistence, ahead of WEBHOOK-01 per Sandra 2026-06-13) → flip to `codex (implementing)` on pickup

> Created 2026-06-13 by Claude (Cowork). Lane: Claude wrote this spec; Codex implements
> on a `codex/` branch. This touches the LOCKED Admin Data Contract (member-truth) — read
> the "Hard rules" section before changing any query.

## Why this exists

Several access gates decide "does this user have access" by reading the `subscriptions`
table with `status = 'active'` but **without excluding `is_test_mode` rows**. A Stripe
*test-mode* event (`event.livemode = false`) writes a row with `is_test_mode = TRUE`
(`app/api/webhooks/stripe/route.ts:288`). On 2026-06-11, 26 test-mode "active" membership
rows were found in production. Any gate that doesn't filter test mode will grant real,
paid-tier access (and unlimited credits) to those rows.

This violates the locked rule: **member/access truth comes only from `subscriptions` rows
verified against Stripe, with test mode excluded.** (CLAUDE.md → Admin Data Contract #3.)

The good news: the canonical gates already do this right. We are making the rest match,
then cleaning the stale rows.

## The two halves of this task

1. **Code:** make every access gate exclude test-mode rows (ideally via one shared helper).
2. **Data:** audit the stale test-mode rows in prod and neutralize them safely (verified
   against Stripe — never a blind delete).

---

## Part 1 — Code: close the test-mode leaks

> The file:line references below are from a 2026-06-13 read-only audit. Line numbers
> drift — **confirm each site against current code before editing.** The pattern to hunt
> is: a `subscriptions` read with `status = 'active'` (or `ANY(...)`) that has NO
> `is_test_mode` exclusion.

### Confirmed-correct gates (reference pattern — do NOT change, copy their filter)
- `lib/academy-entitlements.ts` → `hasActiveStudioMembership()` — uses
  `AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)`.
- `lib/trial/suite-trial.ts` → `getSuiteAccess()` — `AND (is_test_mode = FALSE OR is_test_mode IS NULL)`.
- `lib/subscription.ts` → `getUserSubscription()` / `pickPreferredSubscription({ liveOnly })`
  — filters test rows when `NODE_ENV === 'production'`. (Gates that go through this are safe.)

### Leak sites to fix (confirm, then add the test-mode exclusion)
| File | Function | Problem | Fix |
|---|---|---|---|
| `lib/credits.ts` | `hasUnlimitedCredits()` | `SELECT ... FROM subscriptions WHERE status='active'` — no test filter | Exclude test mode. Also consider the same grace/period logic as `hasActiveStudioMembership`. |
| `lib/upgrade-detection.ts` | `getActiveSubscription()` | same unfiltered `status='active'` read | Exclude test mode (or route through the shared helper). |
| `lib/academy-entitlements.ts` | `getExplicitEntitlements()` **fallback branch** (the `catch` UNION that reads `subscriptions`) | fallback grants one-time product access from `subscriptions` rows with no test filter | Add test-mode exclusion to the `subscriptions` SELECT inside the fallback UNION. |
| `app/api/credits/grant-free-welcome/route.ts` | free-welcome eligibility | counts `subscriptions` active rows without test filter — a test row wrongly *blocks* free credits | Exclude test mode. |
| `app/api/app-v3/account/route.ts` | account/plan display | returns a test subscription as the user's plan in the UI | Exclude test mode. |
| `app/api/cron/reconcile-credits/route.ts` | member credit grants | grants credits to `status='active'` members without test filter | Exclude test mode. |

> Codex: also `grep` for other unfiltered reads before declaring done —
> `rg "FROM subscriptions" -n` then check each hit for an `is_test_mode` guard. Treat any
> gate-style read (access / credits / plan / entitlement) without the guard as in-scope.

### Preferred implementation: one canonical helper
Rather than scatter the same `AND (is_test_mode ...)` across N queries, add a single
shared SQL fragment / helper used by every gate, e.g. a `liveSubscriptionsFilter()` or a
`getLiveActiveSubscription(userId)` in `lib/subscription.ts`. Acceptance is the same either
way, but the consolidated version is what prevents the *next* leak. If full consolidation is
too large for one safe change, ship the per-site filters now and leave a follow-up note.

### Env-mode nuance (don't break local/dev)
The correct gates only enforce live-mode when `NODE_ENV === 'production'` so that local/test
environments can still exercise test-mode subscriptions. Match that behavior — do **not**
hard-exclude test rows in all environments, or you'll break dev. Mirror the
`enforceLiveMode = process.env.NODE_ENV === "production"` pattern already in
`hasActiveStudioMembership()`.

---

## Part 2 — Data: neutralize the stale test-mode rows

1. **Audit first (read-only).** Count and inspect before touching anything:
   ```sql
   SELECT id, user_id, product_type, status, is_test_mode, stripe_subscription_id,
          current_period_end, created_at
   FROM subscriptions
   WHERE COALESCE(is_test_mode, false) = true
     AND status IN ('active','trialing');
   ```
   Expect ~26 membership rows (re-verify the live count — it may have changed since 2026-06-11).
2. **Cross-check against Stripe.** For each row, confirm via the live Stripe API that the
   `stripe_subscription_id` is a test-mode object (or has no live counterpart). **Never
   delete a row that maps to a real live Stripe subscription.** Money/member truth is locked.
3. **Neutralize, don't necessarily delete.** Preferred: mark the rows so they can never gate
   access (e.g. set `status` to an inactive value, or rely solely on the new test-mode
   exclusion so they're inert). A hard delete is acceptable only after the Stripe cross-check
   proves the row is test-only and orphaned. Write the cleanup as a reviewable script under
   `scripts/`, not an ad-hoc query.
4. **Identify affected users.** List any user_ids that were granted access/credits purely
   from a test row, so Sandra can decide on any follow-up (most are likely Sandra's own test
   accounts — confirm, don't assume).

---

## Acceptance criteria

- [ ] Every gate-style `subscriptions` read excludes test-mode rows in production, matching
      the `hasActiveStudioMembership` pattern (or routes through the shared helper).
- [ ] `grep`/`rg "FROM subscriptions"` shows no remaining unguarded gate read.
- [ ] Local/dev still works (test-mode not hard-excluded outside production).
- [ ] The ~26 stale rows are audited against Stripe and neutralized via a reviewable
      `scripts/` file; no row mapping to a live Stripe sub was deleted.
- [ ] Member experience for real paying users is unchanged (no one loses access).
- [ ] Tests: add coverage proving a test-mode `active` row grants NO access /
      NO unlimited credits in production mode, while a live `active` row still does.

## Hard rules (locked — do not break)

- Money and member counts come only from `stripe_payments` (succeeded/paid, test excluded)
  or the live Stripe API. Do not derive access from `analytics_events` or
  `checkout_attribution`.
- Never delete or overwrite a `subscriptions` row that maps to a live Stripe subscription.
  When the DB and Stripe disagree, surface it — don't silently "fix" by deleting.
- Zero behavior change for real paying members. The only behavior change allowed is:
  test-mode rows stop granting access.

## Related finding (fold in or flag to WEBHOOK-01)

A 2026-06-13 funnel audit found the Basil-shape fix is only half-applied: the lifecycle
handlers (`lib/payments/lifecycle/*`) correctly read `subscription.items.data[0].current_period_*`
with a legacy fallback, but ~8 inline blocks still in `app/api/webhooks/stripe/route.ts`
(around lines 1659, 1686, 1926, 2062, 2089) read the legacy-only `current_period_start/end`,
which are `undefined` on apiVersion `2026-01-28.clover`. Result: a NEW member's
`current_period_end` is written NULL at signup (self-heals at the next renewal invoice).
This matters to ENTITLE-01 because the membership grace-period gate
(`hasActiveStudioMembership`) trusts `current_period_end > NOW()`. Replace those 8 reads
with the existing `getSubscriptionPeriod()` helper, or delete the redundant inline blocks.
Zero-behavior-change discipline applies (this is live-money code).

## Out of scope
- Refactoring the whole entitlement system into one function (only consolidate the
  test-mode filter; a full canonical `hasEntitlement(userId, productId)` rewrite is a
  separate, larger spec).
- `/app` member Maya files (Codex is on `/app` persistence separately — keep lanes clean).
