# CHECKOUT-EMAIL-PASSTHROUGH-01 — Stop re-asking already-identified people for their email at checkout

## Why

Found 2026-07-12 while diagnosing why weeks of funnel patching haven't moved revenue. Traced with
real data, not a guess.

`app/checkout/membership/page.tsx` shows a "type your email" capture screen
(`shouldShowCheckoutEmailCapture`) whenever it can't recognize the visitor — no auth session AND no
recoverable email in the URL. That gate exists for a real reason (anonymous checkout traffic is
otherwise unrecoverable) and works correctly when a link carries `checkout_email` in its URL — the
Prompt Vault lifecycle emails do this correctly via `buildRevenueEmailLink({ checkoutEmail: recipientEmail, ... })`
(`lib/email/templates/prompt-vault-checkout-recovery.ts` lines 32, 97, 142).

The three trial-lifecycle emails that link to `/checkout/membership` do NOT do this — they hand-build
the URL as a plain template string and never pass the recipient's own email, even though every one of
these functions already receives `customerEmail` as a parameter:

- `generateTrialDay5Email` — `lib/email/templates/suite-trial.tsx:233`
- `generateTrialCapUpgradeEmail` — `lib/email/templates/suite-trial.tsx:280`
- `generateTrialEndedEmail` — `lib/email/templates/suite-trial.tsx:330`

Result: someone clicks a warm, personal, correctly-delivered email from Sandra (these ARE being sent —
39 trial-ended, 29 no-first-image, 6 trial-cap-upgrade delivered in the last 60 days) and lands on a
checkout page that doesn't recognize them, showing a redundant "enter your email" screen at the exact
moment of peak intent. Real numbers: 15 people clicked through from the trial-day-5 email into
`membership_checkout_email_capture_view` in the last 60 days; only 1 continued to `checkout_start`.
That's a ~93% drop at a screen these people shouldn't even see.

OWNER: codex

## Scope

- In `lib/email/templates/suite-trial.tsx`, change the URL construction in all three functions above
  to use `buildRevenueEmailLink` (already imported/used correctly elsewhere in the codebase — see
  `lib/email/templates/prompt-vault-checkout-recovery.ts` for the exact pattern to mirror), passing
  `checkoutEmail: customerEmail` plus the existing `source`/`utm_*` values each function already sets
  inline. Do not change the visible copy, subject lines, or button labels in any of these three
  emails — this is a URL-construction fix only.
- Do NOT touch `generateTrialUnlockEmail`, `generateTrialDay0Email`, `generateTrialNoFirstImageEmail`,
  or `generateTrialDay3Email` — the first takes an externally-supplied `claimUrl` (used by BRIDGE-01's
  one-time-buyer trial bonus, a different flow, out of scope here) and the other three don't link to
  checkout at all.
- Verify `shouldShowCheckoutEmailCapture` in `lib/revenue-engine/anonymous-checkout-capture.ts` picks
  up `checkout_email` via the existing `normalizeCheckoutEmail(params.checkout_email || params.email)`
  read in `app/checkout/membership/page.tsx:66` — no change needed there, just confirm it works
  end-to-end with a test.

## Acceptance

- All three emails' checkout links include a `checkout_email` query param matching the recipient.
- A test (mirror the pattern in `tests/masterclass-checkout-bridge.test.ts` from the 2026-07-11
  masterclass fix) confirms: given a `checkoutEmail`, `shouldShowCheckoutEmailCapture` returns false
  for a request built from that email's link params.
- No visible copy change in any of the three emails.
