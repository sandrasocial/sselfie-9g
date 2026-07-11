# Completed Work Snapshot

Verified against code and recent local checks on 2026-06-14.

## Revenue, Checkout, And Entitlements

- Member checkout email capture and recovery are implemented.
- Stripe product name/currency fixes are live: monthly membership uses the EUR price and product
  naming matches SSELFIE SUITE.
- ENTITLE-01 access leak is closed: test-mode active subscription rows no longer grant live access.
- Stripe webhook is split into dispatcher plus product/lifecycle handlers.
- Checkout-session lifecycle extraction is merged.
- Production deploys through `main` only. No direct Vercel deploys.

## Prompt Vault Funnel

- AI prompts nurture sequence is built:
  - day 7 concrete Vault offer
  - day 9 proof email with text-only testimonial
  - day 11 why-now email
  - SUITE trial moved to day 14
- `/ai-prompts/access/[token]` shows "Shot 1 of N" with locked Vault previews.
- Locked preview data sends title/image only, not paid prompt text.
- Free-to-Vault click/view tracking exists.
- After-copy Vault CTA tracking exists.

## App V3 And Maya

- `/app` is the live member app.
- Mobile overflow fixes have landed across the app shell and chat interface.
- Maya chat persistence/session continuity work is live.
- Concept-card image refresh issues were addressed.
- Shoot generation uses `gpt-image-2` in App v3.
- Shoot Studio style anchoring now favors the first inspiration image for outfit, light, mood,
  camera, makeup, accessories, and color grading.
- Generated images can be opened larger before approval.

## Admin Content System

- Shoot Studio generates 6+ shots.
- Multi-selfie upload/select is built.
- Approve/publish pipeline writes DB-backed Vault/freebie/Library/Maya surfaces.
- Vault drop email preview, test-send, dry-run counts, and send workflow are built.
- Admin Maya has content tools, admin memory, and weekly brief context.

## Instagram DM System

- `/admin/ig-inbox` and `/my-inbox` exist.
- Instagram/ManyChat inbound bridge exists.
- Native Instagram manual sends can send even while automated sends stay disabled.
- ManyChat-originated manual sends use ManyChat.
- `MANYCHAT_API_KEY` is now set in Vercel Production.
- Failed admin sends surface the failure reason and keep the typed reply visible.

## CI And Test Reality

- `pnpm lint` currently exits with 0 errors. It still has many warnings, mostly legacy hardcoded
  color and console warnings.
- Focused tests for recent payment, funnel, and IG changes pass.
- `pnpm build` passed during the 2026-06-14 cleanup cycle.

## Archived Specs

The old specs were moved to `tasks/archive/2026-06-14-spec-cleanup/`. They are not active work.
