# Maya Pipeline Credit Integrity Audit + Fix (2026-07-15)

Trigger: Grethe Sagmoen (grethe@grethesagmoen.no, One Selfie bundle buyer) reported "loading
failed" on full photoshoots, ~43 attempts, 24 credits taken (3 x 8) with zero photos shown.
Companion doc for her earlier complaints: `docs/audits/MAYA_PROMPT_HANDOFF_AUDIT_2026-07-15.md`.

## What actually happened (verified in Neon, 2026-07-15)

- Three "app-v3 photoshoot: Full photoshoot" charges of 8 credits at 12:21:38, 12:22:56 and
  12:23:36 UTC (`credit_transactions` 12470-12472).
- All three shoots FINISHED on the server. 24 images, all with URLs, `generation_status
  'completed'`, landed in `ai_images` at 12:24:33, 12:26:05 and 12:26:46 UTC. They are in her
  gallery. She was never told.
- Her client showed the failure ~106 seconds into the first request
  (`suite_maya_recovery_shown reason=exception` at 12:23:27): the mobile connection dropped the
  response while the server kept working. She retried, so each retry was a fresh full charge.
- Her other attempts never reached the charge (no ledger rows), so 24 credits was the full loss.
- Refund issued 2026-07-15 15:32 UTC: +24, ledger id 12484, reference
  `support-refund-photoshoot-loading-failed-2026-07-15`. Balance 160 -> 184.
- Sweep of all members, July: every other photoshoot charge reconciles against stored images
  (pre-July-5 shoots stored as category 'concept', which explains apparent gaps). One real
  partial: Grethe July 10, charged 8, 6 stored - covered by the new partial refund + reconcile.

## Root causes found

1. **Lost response = phantom failure + retry double-charge.** `generatePhotoshootSet` in
   `components/app-v3/maya-concierge.tsx` had no way to distinguish "server said no" from
   "response never arrived". A 2-4 minute request on mobile routinely loses its response. The
   server finishes and saves to the gallery; the client says failed; she pays again to retry.
2. **No charge<->delivery link.** Generation charges carried no `reference_id` and stored
   images carried an unrelated `prediction_id`, so nothing could prove "charged but nothing
   landed" - neither for support nor for automation.
3. **Refund-proof gaps.** All refunds live inside in-request catch blocks. A Vercel kill at
   `maxDuration` (300s), a crash after the deduction, or the route's outer catch left the
   charge standing with no refund and no telemetry. Every `refundCredits(...).catch(() => {})`
   also swallowed refund failures silently.
4. **Partial delivery kept full charge.** An image that reached Blob but failed its gallery
   insert (id null) was invisible to the member with no credit back.

## Fixes shipped (branch `fix/maya-generation-credit-integrity`)

- `app/api/app-v3/maya/generate/route.ts`
  - One `requestRef` (`app-v3-gen-<userId>-<ts>`) now ties the charge
    (`credit_transactions.reference_id`), every stored image (`ai_images.prediction_id` =
    `<ref>-<i>`), and every refund (same ref or `<ref>-partial`) together.
  - `refundOrAlert` wrapper: a failed refund is logged to the admin error log, never swallowed.
  - Partial delivery refunds automatically (`<ref>-partial`) when gallery inserts fail.
- `lib/generation/reconcile-app-v3-credits.ts` (new) + wired into
  `app/api/cron/reconcile-generation-assets` (runs every 5 minutes): settles every app-v3
  generation charge older than 15 minutes: `charged == delivered images + refunds`, refunds the
  shortfall idempotently (`<ref>-reconcile`). This closes every no-catch-possible path: Vercel
  timeout, crash after charge, failed refund write, lost response with retry.
- `components/app-v3/maya-concierge.tsx`
  - On a lost response (no parseable server reply), the card stays in its working state and the
    client polls the gallery for up to 5 minutes; when the set lands it flips to done with the
    real photos (`photoshoot_set_recovered`). Retap stays blocked while recovery runs.
  - If nothing lands, the honest message: photos that finished are in the gallery, credits for
    photos that never arrived come back on their own.
  - A real server error (content policy etc., already refunded in-request) still shows
    immediately as before.
- `tests/app-v3-credit-integrity.test.ts` pins the whole contract.

## Known remaining gaps (follow-up spec for Codex)

- Edit (`app/api/app-v3/maya/edit`), bake (`bake-text`) and the in-generate auto-bake leg still
  charge without a `reference_id`, so the reconcile net does not cover them. Exposure is 1
  credit per ~60s request (vs 6-9 per 3-4 min). Give them the same requestRef pattern.
- The structural fix for 3-4 minute requests on mobile is an async job: return a shoot id
  immediately, client polls status. That removes the lost-response class entirely and should be
  specced as its own task rather than patched further.
- Historical charges (before this deploy) have no reference_id and are invisible to the
  reconcile job by design; anything older is support-audited manually (done for July).
