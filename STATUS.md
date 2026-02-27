# 📍 SSELFIE STATUS — Shared Handover File
**Protocol:** Codex updates this at the end of every session. Claude reads this at the start of every conversation.

---

## Last Updated
2026-02-27 21:32 CET — Updated by Codex (UX-02 Maya redesign complete)

## Last Task Completed
UX-02 completed (Maya screen redesign, UI-only):
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-header.tsx`
- `components/sselfie/maya/maya-tab-switcher.tsx`
- `components/sselfie/maya/maya-unified-input.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx`
- `components/sselfie/concept-card.tsx`
- `components/sselfie/instagram-photo-card.tsx`
- `components/sselfie/instagram-carousel-card.tsx`
- `components/sselfie/instagram-reel-card.tsx`
- `components/sselfie/instagram-photo-preview.tsx`
- `components/sselfie/instagram-reel-preview.tsx`
- Completed fixes:
- Dark glassmorphic Maya shell (#0a0a0a), updated header/tab treatments, and muted visible disabled Feed tab
- User/Maya chat bubble restyle for dark mode with assistant-first visual hierarchy
- Text-only action language across image/reel cards and preview modals (`DOWNLOAD / FAVOURITE / PHOTOSHOOT`)
- Pro concept card + prompt editor restyled to glass inputs/cards without touching generation logic
- Input bar updated to text-forward controls in Classic/Pro (`ADD`, `SETTINGS`, `SEND`)
- Validation:
- `pnpm eslint components/sselfie/maya-chat-screen.tsx components/sselfie/maya/maya-header.tsx components/sselfie/maya/maya-tab-switcher.tsx components/sselfie/maya/maya-unified-input.tsx components/sselfie/maya/maya-chat-interface.tsx components/sselfie/concept-card.tsx components/sselfie/instagram-photo-card.tsx components/sselfie/instagram-carousel-card.tsx components/sselfie/instagram-reel-card.tsx components/sselfie/instagram-photo-preview.tsx components/sselfie/instagram-reel-preview.tsx` (warnings only, 0 errors)
- `pnpm build` passed
- `pnpm dev` smoke passed (`GET /maya -> 307 -> /auth/login 200`, `GET /studio -> 307 -> /auth/login 200`)
- Vercel preview: `https://v0-sselfie-7433w7q11-sselfie-studio.vercel.app`

Activation task A-02 completed (Feed Planner wizard drop-off fix):
- `app/feed-planner/feed-planner-client.tsx`
  - Removed the standalone `QuickStartCard` gate so paid-blueprint users remain in `FeedViewScreen` and use inline setup.
  - Kept paid-blueprint skip behavior for full onboarding wizard.
  - Replaced the old "Activation Checklist + Continue" block with a single prominent CTA: `Create my first feed →`.
- `components/onboarding/unified-onboarding-wizard.tsx`
  - Maintains 3-step flow and analytics events; fixed JSX apostrophe lint errors in user-facing copy.
- Validation:
  - `pnpm eslint app/feed-planner/feed-planner-client.tsx components/onboarding/unified-onboarding-wizard.tsx components/feed-planner/feed-view-screen.tsx` (warnings only, 0 errors)
  - `pnpm build` passed
- Vercel preview: `https://v0-sselfie-fxp9suc4s-sselfie-studio.vercel.app`

Design sprint continuation on `main` (`A-01` after approved `UX-01`):
- A-01 (Maya first-generation guided path) hardened:
- Restored strict eligibility gate in `lib/onboarding/welcome-first-generation.ts`: requires `hasBonusCredits === true` and `hasNoImageSpend === true`, plus no prior generations and <=24h user age
- Added/updated tests in `tests/welcome-first-generation.test.ts` for default flag behavior and explicit no-image-spend gate; suite now passes (`10/10`)
- Fixed guided-flow UI class typos in `components/sselfie/maya/welcome-first-generation-flow.tsx` (step labels/style cards render correctly)
- Added explicit credit-eligibility metadata to `/api/user/credits` response in `app/api/user/credits/route.ts`:
  `hasBonusCredits`, `hasImageSpend`, `welcomeFirstGenerationEligible`
- Validation:
- `pnpm vitest run tests/welcome-first-generation.test.ts` passed
- `pnpm eslint app/api/user/credits/route.ts lib/onboarding/welcome-first-generation.ts components/sselfie/maya/welcome-first-generation-flow.tsx tests/welcome-first-generation.test.ts` passed (warning-only on existing `<img>`)
- `pnpm build` passed
- Vercel preview: `https://v0-sselfie-lj5nxfvik-sselfie-studio.vercel.app`

Parallel execution stream completed on `main` (`b8e7bec2`) + production deploy (`https://v0-sselfie-gf3el0kcq-sselfie-studio.vercel.app`):
- Fixed `/api/onboarding/academy-journey-state` production `500` (removed invalid `generated_images.status` query and replaced with schema-safe completed-image logic)
- Production verification: `/api/onboarding/academy-journey-state` now returns `200` with valid JSON payload
- ACADEMY-02 checkout blocker resolved:
- Added robust origin fallback in `/api/academy/checkout` (no longer hard-fails when `NEXT_PUBLIC_SITE_URL` is absent/misaligned)
- Added missing Academy Stripe env vars in Vercel (`STRIPE_PRICE_WHAT_TO_SAY`, `STRIPE_PRICE_SHOW_UP`, `STRIPE_PRICE_GET_PAID`, `STRIPE_PRICE_AI_PHOTO_PROMPTS`) across Production/Preview/Development
- Production verification: authenticated checkout call now returns `200` with Stripe Checkout URL (`checkout.stripe.com`)
- E-01 reconciliation snapshot generated with live numbers:
- `output/automation/e01-subscriber-reconciliation-2026-02-27T17-42-19-791Z.md`
- Resend total `881` / subscribed `820` / unsubscribed `61`
- DB unique union contacts `1170`
- Active recurring subscribers `16`
- Active blueprint entitlements `13`
- Type-check status refreshed: `pnpm type-check` currently passes (`tsc --noEmit` exit `0`)

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
- UX-02 deployed preview (`https://v0-sselfie-7433w7q11-sselfie-studio.vercel.app`) and ready for sign-off before merge-to-main production rollout.
- ACADEMY-01 complete:
- Tables created: `academy_course_purchases`, `academy_resource_purchases`, `user_tags`
- New files: `lib/academy-access.ts`, `migrations/20260220_academy_foundation_tables.sql`
- Modified files: `lib/products.ts`, `.env.local`
- Stripe academy price IDs:
- `STRIPE_PRICE_WHAT_TO_SAY=price_1T2xljEVJvME7vkwFcaN1GEw`
- `STRIPE_PRICE_SHOW_UP=price_1T2xllEVJvME7vkwHC3r6GAI`
- `STRIPE_PRICE_GET_PAID=price_1T2xlmEVJvME7vkwkbgotHoB`
- Validation run: eslint on touched files passed; `pnpm dev` smoke succeeded (`GET /studio 307`)

## What's Broken / Unconfirmed
- E-01 status: reconciliation snapshot is complete and ready for business sign-off (ops decision pending)
- E-03 status: cleanup completed for currently active audience rows (39 removed); historical bounce entries remain in logs by design
- ACADEMY-02 webhook path has implementation in place, but no new end-to-end paid checkout-to-webhook write was executed in this run
- ACADEMY-01 note: Stripe key in `.env.local` is `sk_live...`; academy prices were created with configured key mode
- Runtime issue observed earlier in production (`Cannot access 'tu' before initialization`) is now rechecked and not reproduced

## Currently In Progress
None (latest patches deployed and production-smoke verified)

## Blocked On Sandra
None for this completed patch bundle

## Next Task
1) Run one controlled Academy checkout completion + webhook event verification against `academy_course_purchases` and `user_tags`
2) Get Sandra/business sign-off on E-01 snapshot denominator policy (Resend audience vs DB entity tables vs revenue subscription metrics)
