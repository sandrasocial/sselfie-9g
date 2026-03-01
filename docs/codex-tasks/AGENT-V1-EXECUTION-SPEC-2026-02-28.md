# AGENT-V1 Execution Spec (No-Drift)
Date: 2026-02-28
Owner: Sandra + Codex
Status: Ready to execute

## 0) State Summary Template
Context: SSELFIE pivot from low-defensibility workbook mini-products to outcome-first agent features.
Last actions: Cross-audited OpenClaw/ClawdBot setup and SSELFIE codepaths, then validated tests/build.
Files touched: This spec only.
Outstanding issues: Product value gap, drops pipeline not proven end-to-end, bridge/security hardening needed.
Next steps: Execute Week 1 -> Week 2 sequence below without widening scope.

## 1) Verified Baseline (from actual code + runtime)
1. OpenClaw/ClawdBot infra exists and is operational on this Mac (`/Users/MD760HA/.openclaw/openclaw.json`, `/Users/MD760HA/stella/SOUL.md`, `/Users/MD760HA/stella/SHARED_MEMORY.md`).
2. SSELFIE has a bridge runtime (`/Users/MD760HA/sselfie-9g/app/api/stella/bridge/route.ts`, `/Users/MD760HA/sselfie-9g/lib/stella/runtime.ts`).
3. Mini-products currently resolve to workbook-style flows/assets (low outcome delivery).
4. Monthly drops are wired in UI/API but live data currently has no published drop rows.
5. `pnpm vitest run tests/academy-journey.test.ts` passed.
6. `pnpm build` passed.

## 2) Product Decision Lock (for this sprint)
1. Keep existing mini-products available as workbook resources.
2. Build one clear outcome feature first: `Website Agent V1`.
3. Add per-user named agent identity in-app (lightweight, not full autonomous multi-tool ops yet).
4. Do not attempt full OpenClaw clone in this sprint.

## 3) Scope (exact)
### In scope
1. Access/unlock/drops reliability hardening.
2. Per-user agent profile (name + tone + focus + persisted context).
3. Website Agent V1: generate + publish one personal page per user.
4. Basic analytics events for adoption and completion.

### Out of scope
1. Full external tool execution (user-owned Stripe/Resend/Postiz tokens and autonomous actions).
2. Multi-agent marketplace and background autonomous orchestration for end users.
3. Broad refactors of Maya generation or billing systems.

## 4) Week 1 (Days 1-5): Reliability + Foundation
### Slice W1-A: Security and bridge hardening
Goal: Remove fragile/local-only notifier assumptions and hardcoded secret patterns.

Files:
1. `/Users/MD760HA/sselfie-9g/lib/north-notifier.ts`
2. `/Users/MD760HA/sselfie-9g/app/api/stella/bridge/route.ts`
3. `/Users/MD760HA/sselfie-9g/.env.local` (local env only, no committed secrets)
4. `/Users/MD760HA/sselfie-9g/STATUS.md`

Required changes:
1. Replace hardcoded URL/token usage with env-driven config.
2. Fail closed on missing config in production paths where needed.
3. Add structured logs around bridge delivery outcomes.

Tests:
1. New: `/Users/MD760HA/sselfie-9g/tests/stella-bridge-auth.test.ts`
2. New: `/Users/MD760HA/sselfie-9g/tests/north-notifier-config.test.ts`

Acceptance:
1. No hardcoded notifier token in committed source.
2. Bridge rejects invalid/missing tokens with deterministic 401/400 behavior.
3. Build and targeted tests pass.

---

### Slice W1-B: Academy access + unlock + monthly drop click-through audit/fix
Goal: Prove the path end-to-end and fix mismatches between UI state and backend access.

Files:
1. `/Users/MD760HA/sselfie-9g/components/sselfie/maya/membership-home-card.tsx`
2. `/Users/MD760HA/sselfie-9g/components/sselfie/maya-chat-screen.tsx`
3. `/Users/MD760HA/sselfie-9g/components/sselfie/academy-screen.tsx`
4. `/Users/MD760HA/sselfie-9g/app/api/academy/my-products/route.ts`
5. `/Users/MD760HA/sselfie-9g/app/api/academy/monthly-drops/route.ts`
6. `/Users/MD760HA/sselfie-9g/app/api/academy/monthly-drops/[dropId]/download/route.ts`
7. `/Users/MD760HA/sselfie-9g/lib/academy/view-routing.ts`
8. `/Users/MD760HA/sselfie-9g/lib/subscription.ts`
9. `/Users/MD760HA/sselfie-9g/STATUS.md`

Required changes:
1. Ensure membership-home `Explore ->` lands in monthly drops view consistently.
2. Ensure monthly-drop access logic and download tracking are in sync with UI state.
3. Separate live-vs-test entitlement logic where required for production accuracy.

Tests:
1. Extend: `/Users/MD760HA/sselfie-9g/tests/academy-access-gate.test.ts`
2. New: `/Users/MD760HA/sselfie-9g/tests/monthly-drops-clickthrough.test.tsx`
3. New: `/Users/MD760HA/sselfie-9g/tests/subscription-live-filter.test.ts`

Acceptance:
1. Non-members are blocked correctly.
2. Studio members can open monthly drops with no re-locking on refresh.
3. Download tracking endpoint records completion without false denials.

---

### Slice W1-C: Agent profile persistence (named agent per user)
Goal: Give each user an owned named agent identity, persisted in DB and available to Maya.

Files:
1. New migration: `/Users/MD760HA/sselfie-9g/migrations/20260228_add_agent_profiles.sql`
2. New route: `/Users/MD760HA/sselfie-9g/app/api/agent/profile/route.ts`
3. New helper: `/Users/MD760HA/sselfie-9g/lib/agent/profile.ts`
4. Update context builder: `/Users/MD760HA/sselfie-9g/lib/maya/get-user-context.ts`
5. Update hook headers: `/Users/MD760HA/sselfie-9g/components/sselfie/maya/hooks/use-maya-chat.ts`
6. Optional UI entry (minimal): `/Users/MD760HA/sselfie-9g/components/sselfie/maya-chat-screen.tsx`
7. `/Users/MD760HA/sselfie-9g/STATUS.md`

Table contract:
1. `agent_profiles(user_id unique, agent_name, tone, focus_area, context_jsonb, created_at, updated_at)`

Tests:
1. New: `/Users/MD760HA/sselfie-9g/tests/agent-profile-route.test.ts`
2. New: `/Users/MD760HA/sselfie-9g/tests/maya-agent-context.test.ts`

Acceptance:
1. User can set/update agent name.
2. Agent name/context is returned and used in Maya context assembly.
3. No cross-user leakage.

## 5) Week 2 (Days 6-10): Website Agent V1
### Slice W2-A: Generation backend
Goal: Generate one publishable personal page from user context.

Files:
1. New route: `/Users/MD760HA/sselfie-9g/app/api/agent/website/generate/route.ts`
2. New library: `/Users/MD760HA/sselfie-9g/lib/agent/website-generator.ts`
3. New library: `/Users/MD760HA/sselfie-9g/lib/agent/website-context.ts`
4. New migration: `/Users/MD760HA/sselfie-9g/migrations/20260301_add_personal_pages.sql`
5. New helper: `/Users/MD760HA/sselfie-9g/lib/agent/personal-pages.ts`
6. `/Users/MD760HA/sselfie-9g/lib/analytics/events.ts` (add event names only)
7. `/Users/MD760HA/sselfie-9g/app/api/analytics/event/route.ts` (allowlist updates)
8. `/Users/MD760HA/sselfie-9g/STATUS.md`

Table contract:
1. `personal_pages(id, user_id, slug unique, status, page_jsonb, published_html, published_at, created_at, updated_at)`

Tests:
1. New: `/Users/MD760HA/sselfie-9g/tests/website-agent-generate-route.test.ts`
2. New: `/Users/MD760HA/sselfie-9g/tests/personal-pages-store.test.ts`

Acceptance:
1. Generation endpoint returns deterministic payload shape.
2. Persisted row is created/updated idempotently for same user.
3. Analytics events emitted for `website_agent_started` and `website_agent_completed`.

---

### Slice W2-B: Public page route and rendering
Goal: Publish accessible page per user at `/p/[username]`.

Files:
1. New page: `/Users/MD760HA/sselfie-9g/app/p/[username]/page.tsx`
2. New component: `/Users/MD760HA/sselfie-9g/components/agent/personal-page-renderer.tsx`
3. New API route (optional if needed): `/Users/MD760HA/sselfie-9g/app/api/personal-pages/[username]/route.ts`
4. `/Users/MD760HA/sselfie-9g/next.config.mjs` (only if route/caching rules are needed)
5. `/Users/MD760HA/sselfie-9g/STATUS.md`

Tests:
1. New: `/Users/MD760HA/sselfie-9g/tests/personal-page-route.test.tsx`
2. New: `/Users/MD760HA/sselfie-9g/tests/personal-page-access.test.ts`

Acceptance:
1. `GET /p/[username]` renders published content for valid pages.
2. Unpublished/missing pages return controlled not-found behavior.
3. Mobile render is clean at 375px.

---

### Slice W2-C: In-app UX entrypoint
Goal: One-click in-app flow to generate/publish/update page without complexity.

Files:
1. New component: `/Users/MD760HA/sselfie-9g/components/sselfie/agent/website-agent-card.tsx`
2. Update placement host: `/Users/MD760HA/sselfie-9g/components/sselfie/maya-chat-screen.tsx`
3. Optional secondary placement: `/Users/MD760HA/sselfie-9g/components/sselfie/account-screen.tsx`
4. `/Users/MD760HA/sselfie-9g/STATUS.md`

Flow:
1. User sees "Build My Page".
2. Agent asks short guided prompts (or uses existing profile context).
3. Click generate.
4. Returns share URL `/p/[username]`.

Tests:
1. New: `/Users/MD760HA/sselfie-9g/tests/website-agent-card.test.tsx`
2. Extend: `/Users/MD760HA/sselfie-9g/tests/studio-tab-routing.test.ts`

Acceptance:
1. New user can finish from zero to published link in one in-app path.
2. Existing user can regenerate without breaking slug/link.

## 6) Execution commands per slice
1. `pnpm vitest run tests/stella-bridge-auth.test.ts tests/north-notifier-config.test.ts`
2. `pnpm vitest run tests/academy-access-gate.test.ts tests/monthly-drops-clickthrough.test.tsx tests/subscription-live-filter.test.ts`
3. `pnpm vitest run tests/agent-profile-route.test.ts tests/maya-agent-context.test.ts`
4. `pnpm vitest run tests/website-agent-generate-route.test.ts tests/personal-pages-store.test.ts tests/personal-page-route.test.tsx tests/personal-page-access.test.ts tests/website-agent-card.test.tsx`
5. `pnpm eslint [touched files only]`
6. `pnpm build`

## 7) Release gates (must pass before moving forward)
1. Gate R1: Access/unlock/drops passes on production smoke with one member and one non-member account.
2. Gate R2: Agent profile persists across session reload and is reflected in Maya context.
3. Gate R3: Website Agent V1 publishes valid `/p/[username]` page and is re-openable.
4. Gate R4: No hardcoded secrets in repo and bridge auth is deterministic.

## 8) Reporting format after each slice
1. What passed.
2. What failed and why.
3. Exactly what was fixed.
4. Commit SHA(s).
5. Remaining blockers.

## 9) Immediate first task to run now
Execute `Slice W1-A` first, test-first, then update `STATUS.md` with evidence and SHAs before starting `W1-B`.
