# MEMBERSHIP-RECOVERY-NO-DOWNGRADE-01 — Stop offering your highest-intent leads your worst-converting path

## Why

Found 2026-07-12, same diagnosis session as `CHECKOUT-EMAIL-PASSTHROUGH-01`.

`app/api/cron/membership-checkout-recovery/route.ts` finds people who reached the real €97 SUITE
checkout (`checkout_attribution.status='started'`) and abandoned — the single highest-intent group in
the entire funnel, they already decided to pay and got as far as the payment page. The recovery email
(`lib/email/templates/membership-checkout-recovery.ts`, `generateMembershipCheckoutRecoveryEmail`)
currently offers them a **free 7-day trial claim** instead of a way back to the checkout they were
already on (`claimUrl` → `/claim/[token]`, minted by `ensureClaimToken` in the cron).

This is backwards. A live pull on 2026-07-11 found the SUITE trial has converted **zero** paying
members across all 50 trials ever claimed (42 expired, 0 converted — see the
`trial-funnel-zero-conversion-2026-07` finding). This recovery flow takes the warmest leads in the
system and routes them into the one path proven not to close.

OWNER: codex (code + cron logic). Copy below is Sandra-approved, written by Claude — implement it
verbatim, do not rewrite it.

## Scope

1. In `app/api/cron/membership-checkout-recovery/route.ts`, change what the recovery email links to:
   instead of `ensureClaimToken` + a trial `/claim/[token]` URL, build a link back to
   `/checkout/membership?interval=month&source=membership_recovery&utm_source=email&utm_medium=email&utm_campaign=membership_recovery`
   using `buildRevenueEmailLink` with `checkoutEmail: <their email>` set (same pattern as
   `CHECKOUT-EMAIL-PASSTHROUGH-01` — this recovery link needs it even more, since these people were
   never authenticated to begin with). `ensureClaimToken` and the `freebie_subscribers` token minting
   can be removed from this route if nothing else in the file needs it after this change — check
   before deleting.
2. Replace `generateMembershipCheckoutRecoveryEmail`'s copy in
   `lib/email/templates/membership-checkout-recovery.ts` with the text below. Keep the existing
   `renderStoneShell`/`renderStoneButton` structure and the function's `{ firstName, checkoutUrl }`
   shape (rename the `claimUrl` param to `checkoutUrl` to match the new intent).
3. Update the `NOT EXISTS` exclusion in `getCandidates()` (route.ts, currently excludes anyone with an
   active membership OR any `suite_trial` row) — drop the `suite_trial` exclusion clause, since this
   flow no longer grants a trial and there's no farming risk to guard against anymore. Keep the active-
   membership exclusion.
4. The kill switch (`MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED`), idempotency
   (`recovery_email_sent_at` + `email_logs`), and the email-hydration step at the top of the file are
   all unrelated to this change — leave them exactly as they are.

## Copy to implement verbatim

**Subject:** `Still thinking about it?`

**Body (match the existing `renderStoneShell` eyebrow/title/footer slots used today):**

> Hi {firstName},
>
> You were one click from joining SSELFIE SUITE. If something held you back, that's okay. €97 is a
> real decision, not a small one.
>
> [button: Finish joining]
>
> If you want to talk it through first, just reply to this email. I read every one.
>
> Sandra x

`footerLead`: `"Reply if you want to talk it through first."` (or drop the separate footer line
entirely if the reply-invite in the body already covers it — Codex's call, don't duplicate the line).

## Acceptance

- Recovery emails sent after this ships link straight back to `/checkout/membership` with the
  recipient's email pre-filled (verify no email-capture screen shows for these links, same test
  pattern as `CHECKOUT-EMAIL-PASSTHROUGH-01`).
- No trial is granted anywhere in this flow anymore.
- Existing kill switch, idempotency, and hydration logic all still work unchanged.
- `tests/` gets a regression test asserting this route no longer imports/calls `ensureClaimToken` or
  `generateTrialUnlockEmail` (guards against this quietly reverting to the trial-offer pattern later).
