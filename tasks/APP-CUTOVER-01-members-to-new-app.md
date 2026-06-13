# APP-CUTOVER-01 — Move members from legacy /studio to the new /app

> Status audit 2026-06-13: Partly complete and partly operational. App v3 is live, and
> `app/app/page.tsx` gates member access behind `APP_V3_MEMBERS_ENABLED`. Do not rerun
> this as a branch-merge spec. Remaining work is readiness QA, env verification,
> member comms, and monitoring.

*Spec by Claude (Cowork) 2026-06-10. Sandra's directive: "current members are not able to use
the old app — make everything ready to go." This is the comeback move: ONE app, working e2e.*

## Current state (verified)

- The new /app (app-v3) lives on branch `studio-v3-staging` (MAYA-REBUILD-03 through 17):
  Vault-driven photo engine (gpt-image-2, identity from selfies — NO Flux training needed),
  carousel design systems, streaming previews, selfie persistence, native Account, Memory,
  History, credit integration, habit-email hooks. Staging uses the production DB, so all
  tables (app_v3_chats, user_avatar_images, agent_profiles, user_credits) already exist.
- On production main, /app is ADMIN-ONLY (ssa@ssasocial.com); members bounce to /studio.
- 7 real active members (8th "Smoke User" is a test account — cancel it). 4 use it:
  April, Myriam, Eveliene, Tracy (all have trained Flux models on legacy). 3 never started:
  Kiya, Gina, Rose (rescue emails pending from Sandra).

## The plan (phases, each gated)

### Phase 0 — Sandra's staging sign-off (BLOCKER for everything)
Sandra QAs the staging /app end to end on her phone: photo, reel cover, carousel (new design
systems), story, edit, library, account, memory. She says "staging approved" — nothing
proceeds without it.

### Phase 1 — Merge `studio-v3-staging` → `main`
- Big merge; expect conflicts in CLAUDE.md (doctrine pointer exists on both — identical, keep
  one) and possibly app-v3 files vs the early app-v3 on main (staging wins — it is months ahead).
- Full build + the app-v3 vitest suite green before push.
- /app stays admin-gated through this merge — merging ships code, not access.

### Phase 2 — Progressive access flip
- Find the admin gate (app/app/page.tsx or layout — isAdminEmail check) and replace with:
  admin OR (active `sselfie_studio_membership` AND `APP_V3_MEMBERS_ENABLED=true`).
- Flip env for production only when Phase 3 below is ready.
- Members keep /studio access untouched (legacy link already in /app Account). Nothing is
  taken away — /app is ADDED.

### Phase 3 — Member readiness checklist (verify each, fix what fails)
1. A member (non-admin) can: open /app, upload selfie, generate a photo (credits deduct,
   gallery saves), make a carousel, use Account (plan/credits/billing portal).
2. `isOpenAIImageEnabled()` is on for members in production (check the feature flag source).
3. Rate limits and maxDuration hold for concurrent member generations.
4. The 4 active members' existing galleries: confirm /app Library shows their ai_images
   history (it reads the shared ai_images table — verify the query isn't filtered to
   app-v3-only sources; if it is, widen it so their old work appears).
5. Mobile Safari pass (members are phone-first).

### Phase 4 — Tell the members (Sandra approves copy first)
Short personal email to the 7: "the new SSELFIE is ready — one selfie, your face kept, no
training wait. Your old studio still works at /studio." Draft it in Sandra's voice, doctrine
language (docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md).

### Phase 5 — Watch + decide
- Week 1: generation success rate, credit spend per member, replies. The habit emails
  (already live) point members at /studio today — switch their studioUrl to /app once flipped.
- Then: new-member onboarding lands them in /app directly; /studio becomes legacy-only for
  trained-model users; the legacy retirement follows the Deep Clean Plan §5.2.

## Rollback
`APP_V3_MEMBERS_ENABLED=false` returns members to exactly today's world in one env flip.

## Rules
- Never touch the protected Feed Planner trees (CLAUDE.md).
- WEBHOOK-01 (running separately) must not collide: cutover work touches no payment files.
- Money numbers from stripe_payments only.
