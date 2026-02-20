# 📍 SSELFIE STATUS — Shared Handover File
**Protocol:** Codex updates this at the end of every session. Claude reads this at the start of every conversation.

---

## Last Updated
2026-02-20 18:06 CET — Updated by Codex (UX-02 code complete; deploy blocked)

## Last Task Completed
UX-02 code complete (validation done; deployment blocked)

## Maya Component Audit
- Live header: `components/sselfie/maya/maya-header.tsx`
- Dead headers: `components/sselfie/maya/maya-header-unified.tsx`, `components/sselfie/maya/maya-header-old.tsx` (no imports found)
- Live chat: `components/sselfie/maya-chat-screen.tsx` (rendered by `components/sselfie/sselfie-app.tsx` from `/studio` and `/maya`)
- Dead chat: none from the audited pair; `components/sselfie/maya/maya-chat-interface.tsx` is live as a child rendered inside `maya-chat-screen`
- Notes:
- Main entry path for users is `app/studio/page.tsx` -> `components/sselfie/sselfie-app.tsx` -> `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx` is also imported by `components/sselfie/maya/maya-feed-tab.tsx`

## Feed Planner Audit
- User journey:
- User opens `app/feed-planner/page.tsx` or feed-planner tab in `components/sselfie/sselfie-app.tsx`
- `app/feed-planner/feed-planner-client.tsx` gates by access + onboarding/welcome status and decides whether to show wizard
- After wizard/entry, `components/feed-planner/feed-view-screen.tsx` loads feed (`/api/feed/latest` or `/api/feed/:id`) and routes to `components/feed-planner/instagram-feed-view.tsx`
- In `instagram-feed-view`, user works through tabs (`grid`, `captions/posts`, `strategy`, `pillars`), generates assets, edits bio/captions, manages images, and saves/reorders content
- Distinct modes/views:
- Access tiers: free (`placeholderType=single`), paid blueprint (`grid` with capped planners), membership (`grid`, full access), one-time path currently deprecated in code
- Generation mode toggle for eligible users: `classic` vs `pro` (localStorage-backed `mayaProMode`)
- Visual branches: loading overlay for full-grid generation, single placeholder flow for free/preview feeds
- API routes called (feed-planner surface):
- Access/gating/user profile: `/api/feed-planner/access`, `/api/user/onboarding-status`, `/api/user/info`, `/api/feed-planner/welcome-status`, `/api/user/setup-status`, `/api/profile/personal-brand`, `/api/blueprint/state`, `/api/user/credits`, `/api/images`
- Feed data/create/update: `/api/feed/latest`, `/api/feed/:id`, `/api/feed/list`, `/api/feed/create-manual`, `/api/feed/create-free-example`, `/api/feed/expand-for-paid`, `/api/feed/:id/progress`, `/api/feed/:id/reorder`
- Feed generation/content ops: `/api/feed/:id/generate-single`, `/api/feed/:id/generate-captions`, `/api/feed/:id/enhance-caption`, `/api/feed/:id/regenerate-caption`, `/api/feed/:id/update-caption`, `/api/feed/:id/generate-bio`, `/api/feed/:id/update-bio`, `/api/feed/:id/generate-highlights`, `/api/feed/:id/highlights`, `/api/feed/:id/generate-strategy`, `/api/feed/:id/strategy`, `/api/feed/:id/add-strategy`, `/api/feed/:id/download-bundle`, `/api/feed/:id/update-style`
- Planner/chat bridging: `/api/feed-planner/save-to-planner`, `/api/feed-planner/create-from-strategy`, `/api/feed-planner/queue-all-images`, `/api/feed-planner/v2/variations`, `/api/feed-planner/preview-feed`
- `feed-single-placeholder.tsx` usage:
- Still used and live; rendered in `components/feed-planner/instagram-feed-view.tsx` when preview feed or free single-placeholder flow is active
- `feed-preview-card.tsx` responsibilities and split opportunity:
- Currently mixes persistence restore, SWR polling, unsaved->saved conversion, queue-all generation orchestration, modal/image preview UX, prompt-edit callbacks, and UI rendering
- Clear split opportunity into: data/polling hook, save/generate action hook/service, and presentational card + modal subcomponents
- Clearly unused/dead feed-planner code (no imports found):
- `components/feed-planner/bulk-generation-progress.tsx`
- `components/feed-planner/feed-grid-preview.tsx`
- `components/feed-planner/feed-strategy-panel.tsx`
- `components/feed-planner/strategy-preview.tsx`
- `components/feed-planner/buy-blueprint-modal.tsx` (shadowed by `components/sselfie/buy-blueprint-modal.tsx`)

## What's Confirmed Live in Production
- CLEANUP-01 baseline remains live:
- /api/cron/resolve-pending-payments
- /api/cron/reconcile-credits
- /api/cron/cron-health-check
- /api/cron/reconcile-feed-posts
- /api/cron/reconcile-ai-images
- /api/cron/reconcile-pro-photoshoot-grids
- /api/cron/reconcile-generations
- /api/cron/reconcile-subscriptions
- E-02 status: fixed/verified. `.env.local` and Vercel production both use `RESEND_AUDIENCE_ID=762d7ab8-7a72-40d1-8f26-9ddfcff52e73` (no mismatch found)
- Flodesk + Loops removed. Resend is the only email platform
- [x] Placeholder admin pages deleted
- Root docs archived to `docs/archive/root-cleanup-2026-02-20/` (38 root markdown files moved)
- CLEANUP-02 deployed (`https://v0-sselfie-akfxuzkqn-sselfie-studio.vercel.app`):
- Broken admin links/redirects to deleted pages removed from nav/dashboard/redirect surfaces
- Safe dead API routes deleted: `/api/debug/*`, `/api/test/*`, `/api/testing/*`, `/api/test-sentry-simple`, `/api/stripe/create-test-coupon`, `/api/stripe/test-checkout`, `/api/stripe/cleanup-products`, `/api/sentry-status`
- CLEANUP-03 deployed (`https://v0-sselfie-j6ht8a9p2-sselfie-studio.vercel.app`):
- Deleted confirmed-dead Maya headers: `components/sselfie/maya/maya-header-unified.tsx`, `components/sselfie/maya/maya-header-old.tsx`
- Deleted confirmed-dead feed planner components: `components/feed-planner/bulk-generation-progress.tsx`, `components/feed-planner/feed-grid-preview.tsx`, `components/feed-planner/feed-strategy-panel.tsx`, `components/feed-planner/strategy-preview.tsx`, `components/feed-planner/buy-blueprint-modal.tsx`
- Patched Playwright specs to remove deleted `/api/testing/stripe-mock` dependency by mocking access endpoints at test level (`tests/paid-user-flow.spec.ts`, `tests/complete-blueprint-flow.spec.ts`)
- Split `components/feed-planner/feed-preview-card.tsx` into hooks + extracted modal components; card is now 269 lines
- UX-01 deployed (`https://v0-sselfie-fu8b79v8w-sselfie-studio.vercel.app`):
- Fixed Classic photoshoot confirm modal layering/placement so CTA is visible above fixed input bar on mobile
- Added stable concept IDs + safer concept merge in `/api/maya/update-message` to preserve generated concept images on refresh
- Reduced mobile Maya cramping: dynamic input-bar height via `ResizeObserver`, prompt row collapse after first message, tighter concept card spacing/padding
- Updated concept card UX: user-facing category labels, hidden empty three-dot menu, clearer photoshoot CTA (`Create Full Photoshoot ->`, `6-9 matching photos - ~3 min`)
- Updated Videos tab animate affordance to creation-style overlay (`Sparkles` + `Animate ->`) instead of play affordance
- Updated credits display to whole-number localized format in Maya header/menu
- Added quick-prompt right-fade scroll affordance in `maya-quick-prompts`
- Added `Add to Feed ->` and `Make a Video ->` actions in `components/image-lightbox.tsx`
- UX-02 implemented locally (not deployed yet):
- Files changed: `components/sselfie/maya-chat-screen.tsx`, `components/sselfie/maya/maya-unified-input.tsx`, `components/sselfie/pro-mode/ConceptCardPro.tsx`, `components/sselfie/pro-mode/ImageUploadFlow.tsx`
- Completed fixes:
- Pro empty-state CTA for empty sessions in Pro mode (`Add your reference photos to get started` + `Add Photos`)
- One-time Pro mode tooltip (`sselfie_pro_tooltip_seen` localStorage gate)
- Pro concept description clamp with `See more/See less`
- Pro generate credit label (`Uses 2 credits`)
- Pro input image icon badge (orange dot at 0 images; count badge at 1+)
- Image upload intro copy updated to selfie-only wording; intro CTA renamed to `Add Photos`
- Validation run: targeted eslint on touched files (0 errors; warnings only), `pnpm dev` smoke succeeded (`GET /studio 307`)

## What's Broken / Unconfirmed
- E-01: Subscriber count logic (DB shows 479 vs Resend 3,021) — not yet resolved
- E-03: 1,965 hard bounces in subscriber list — not yet cleaned
- `pnpm type-check` still fails with broad pre-existing repository issues (Next route typing, script typing, and test-runner globals)
- UX-02 production deploy is blocked: `VERCEL_TOKEN` missing/invalid in this shell (`vercel --prod --yes --token $VERCEL_TOKEN` and `vercel --prod --yes` both failed auth)

## Currently In Progress
Nothing — awaiting Vercel token/auth fix for UX-02 deployment

## Blocked On Sandra
- Provide valid Vercel auth (`VERCEL_TOKEN` or refreshed CLI login) so UX-02 can be deployed and URL recorded

## Next Task
Deploy UX-02 after Vercel auth is restored, then record production URL
