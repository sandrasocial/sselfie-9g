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

## Fixes verified

Branches: `fix/maya-generation-credit-integrity` and `codex/maya-credit-integrity-e2e`.

- `app/api/app-v3/maya/generate/route.ts`
  - One `requestRef` (`app-v3-gen-<userId>-<clientRequestId>`) now ties the charge
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
  - Every full shoot sends a client request id that is stamped onto the credit charge and all
    gallery rows. Recovery now polls for that exact shoot, never a different recent shoot.
  - On a lost response or parsed 5xx, the card stays in its working state and checks the gallery;
    when the set lands it flips to done with the real photos (`photoshoot_set_recovered`). Retap
    stays blocked while recovery runs. Partial delivered sets remain visible while missing legs
    are refunded.
  - If nothing lands, the honest message: photos that finished are in the gallery, credits for
    photos that never arrived come back on their own.
  - A real server error (content policy etc., already refunded in-request) still shows
    immediately as before.
- `tests/app-v3-credit-integrity.test.ts` pins the whole contract.

### Full pipeline follow-through

- Edit, standalone text bake, and auto-bake now use the same request-reference, gallery-delivery,
  partial-refund, and admin-alert contract.
- Custom trained-model images now refund idempotently when Replicate cannot start, reports a
  terminal failure, succeeds without an output, or the output cannot reach Blob. Ownership is
  checked before Replicate is queried. Successful gallery rows retain the charge reference for
  reconciliation.
- Motion now uses `refundCredits` instead of `addCredits`, so refunds reduce `total_used` and do
  not inflate `total_purchased`. Failed refunds retry idempotently on later status checks. Missing
  provider output and Blob-delivery failures refund automatically.
- `generated_videos.credit_reference_id` and its partial index were added in production and in the
  repository migration. The five-minute reconcile job now covers regular images, edits, bakes,
  custom-model images, and Motion. A completed Motion is valued at the full 10-credit animation
  charge, preventing the safety net from issuing a false nine-credit refund.
- Completed Motion status checks return the already-delivered video immediately. A repeated poll
  cannot re-fetch the provider output, overwrite the row, or turn a completed video into a failure.
- Reconciliation filters unresolved charges before its row limit. Settled high-volume traffic can
  no longer starve older unresolved charges.

## Remaining architectural hardening

- Full photoshoots still execute within one server function. Exact request-correlated gallery
  recovery removes the customer dead end, and ledger reconciliation prevents retained charges,
  but an async durable job would reduce function-runtime pressure further. It is an architecture
  improvement, not an unresolved credit-loss path.
- Historical charges (before this deploy) have no reference_id and are invisible to the
  reconcile job by design; anything older is support-audited manually (done for July).
