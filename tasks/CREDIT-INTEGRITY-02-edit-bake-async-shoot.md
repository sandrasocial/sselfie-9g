# CREDIT-INTEGRITY-02: finish the credit-integrity net + async photoshoot

Status: Phase A complete and verified 2026-07-15; Phase B superseded by exact-request recovery
Owner: Codex
Background: `docs/audits/MAYA_PIPELINE_CREDIT_INTEGRITY_2026-07-15.md` (read first).
CREDIT-INTEGRITY-01 shipped the requestRef contract, the reconcile cron, lost-response
recovery, and partial-delivery refunds for `app/api/app-v3/maya/generate`.

## Phase A: bring edit, bake-text, and the auto-bake leg into the reconcile net

Same pattern as the generate route (copy it, do not invent a new one):

1. `app/api/app-v3/maya/edit/route.ts` and `app/api/app-v3/maya/bake-text/route.ts`:
   - Create a unique `app-v3-gen-<userId>-<requestId>` request reference before the deduction and
     pass it as the fifth argument to `deductCredits`.
   - Stamp the resulting `ai_images.prediction_id` as `` `${requestRef}-0` ``.
   - Route refunds through a `refundOrAlert` helper (see generate route) with
     `refundRef = requestRef`; no `refundCredits(...).catch(() => {})` may remain.
2. The auto-bake leg inside `app/api/app-v3/maya/generate/route.ts`: give the bake deduction
   its own `app-v3-gen-...` ref, stamp the baked `ai_images` rows with `<ref>-<index>`
   (replacing the `app-v3-auto-bake-<stamp>-<index>` format), and keep the existing
   failed-leg refund keyed on that ref.
3. No reconcile-lib changes needed: `lib/generation/reconcile-app-v3-credits.ts` already
   settles any charge whose `reference_id` starts with `app-v3-gen-`.
4. Extend `tests/app-v3-credit-integrity.test.ts` to pin all three surfaces.

Guard: every deduction whose ref matches `app-v3-gen-%` MUST have its delivered images
stamped with the same ref prefix, or the cron will wrongly refund a delivered charge after
15 minutes. That is the one way to break money with this task. Verify by generating in
preview and checking `credit_transactions` vs `ai_images` before merging.

## Phase B: async full photoshoot (future architectural hardening)

A full shoot holds one HTTP request open 2-4 minutes; mobile drops it routinely. Replace with:

1. POST `format: "photoshoot"` returns `{ shootRef }` immediately after the deduction; the
   generation continues via `waitUntil` (or a queued route) writing images exactly as today.
2. New lightweight status endpoint: given `shootRef`, return
   `{ status: running|done|failed, imageUrls, newBalance }` derived from `ai_images`
   (prediction_id prefix) + `credit_transactions` (the ref) - no new tables.
3. Client: `generatePhotoshootSet` polls every 10-15s, survives reload (persist the pending
   shootRef in the existing workspace-state persistence so resuming shows the running shoot).
4. Keep the reconcile cron unchanged as the safety net.
5. Voice: all member-facing copy short, warm, no m-dashes, no banned likeness phrases.

The live fix now sends a client request id, stamps it onto charge and gallery rows, and recovers
that exact shoot after both lost responses and parsed 5xx responses. The reconcile cron refunds
any missing legs. This closes the customer blocker without changing the generation architecture.
The async design below remains optional future work and still requires a full-suite preview.
