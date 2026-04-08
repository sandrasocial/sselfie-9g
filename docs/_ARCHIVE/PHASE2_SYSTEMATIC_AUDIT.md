# Phase 2: Systematic Cursor/Claude Audit

**Date:** February 2026  
**Scope:** Routes, pages, components, API routes, documentation vs code, duplicate logic, over-engineering

---

## 2.1 Route & Page Inventory

Scan of `/app` (App Router). No `/pages` directory.

| Route | Has UI content? | Last modified | In nav/linked? | Orphaned? |
|-------|-----------------|--------------|----------------|-----------|
| `/` (app/page.tsx) | Yes (landing/redirect) | 2026-01-14 | Yes (home links) | No |
| `/admin` | Yes (dashboard) | 2026-01-14 | Yes (admin nav) | No |
| `/admin/academy` | Yes | 2025-12-30 | Admin dashboard | No |
| `/admin/agents` | Yes | 2026-01-31 | Admin dashboard | No |
| `/admin/analytics` | Yes | 2026-01-31 | Admin dashboard, links | No |
| `/admin/brand-engine-applications` | Yes | 2026-02-01 | Link from brand-engine | No |
| `/admin/content-templates` | Yes | 2025-12-26 | Admin | No |
| `/admin/credits` | Yes | 2026-01-14 | Admin dashboard | No |
| `/admin/fashion-styles` | Yes | 2026-01-23 | Admin | No |
| `/admin/feed-styles-v2` | Yes | 2026-01-23 | Admin dashboard | No |
| `/admin/feedback` | Yes | 2026-01-11 | Admin dashboard | No |
| `/admin/journal` | Yes | 2026-01-15 | Admin | No |
| `/admin/libraries` | Yes | 2026-01-23 | Admin | No |
| `/admin/login-as-user` | Yes | 2026-01-15 | Admin (internal) | No |
| `/admin/maya-studio` | Yes | 2026-01-14 | Admin dashboard | No |
| `/admin/mission-control` | Yes | 2026-01-31 | Admin dashboard | No |
| `/admin/newsletter-review` | Yes | 2026-02-01 | Admin | No |
| `/admin/project-tracker` | Yes | 2026-02-01 | Admin dashboard, brand-engine-applications | No |
| `/admin/project-tracker/strategy` | Yes | 2026-02-01 | Link from project-tracker | No |
| `/admin/testimonials` | Yes | 2025-12-30 | Admin | No |
| `/apply/brand-engine` | Yes | 2026-02-01 | brand-engine page CTAs | No |
| `/auth/error` | Yes (error UI) | 2025-12-02 | Redirect from setup-password | No |
| `/auth/forgot-password` | Yes | 2026-01-15 | Login page link | No |
| `/auth/login` | Yes | 2025-12-30 | Many links | No |
| `/auth/setup-password` | Yes | 2025-12-30 | Email link | No |
| `/auth/sign-up` | Yes | 2026-01-12 | Login, landing | No |
| `/auth/sign-up-success` | Yes | 2026-01-15 | Post sign-up redirect | No |
| `/bio` | Yes | 2026-01-15 | Footer, blueprint | No |
| `/blueprint` | Yes | 2026-01-12 | Landing, nav | No |
| `/blueprint/paid` | Yes | 2026-01-16 | Post-checkout, emails | No |
| `/brand-engine` | Yes | 2026-02-01 | Apply page, CTAs | No |
| `/checkout` | Yes (universal checkout) | 2026-01-15 | membership/one-time/blueprint redirect | No |
| `/checkout/blueprint` | Yes (then redirect) | 2026-01-16 | Paid blueprint CTA | No |
| `/checkout/cancel` | Yes | 2026-01-15 | Stripe cancel | No |
| `/checkout/credits` | Yes | 2026-02-01 | Landing, credits CTA | No |
| `/checkout/membership` | Redirect to checkout | 2025-12-29 | Membership CTA | No |
| `/checkout/one-time` | Redirect to checkout | 2025-12-29 | One-time CTA | No |
| `/checkout/success` | Yes | 2025-12-02 | Stripe success redirect | No |
| `/checkout-upgrade` | Yes | 2026-01-05 | Legacy? redirect to dashboard | **Possible orphan** |
| `/diagnostics` | Yes | 2026-01-15 | Unknown link source | **Possible orphan** |
| `/feed-planner` | Yes | 2026-01-14 | Studio, landing, post-purchase | No |
| `/feed/[feedId]` | Yes | 2025-12-02 | Feed planner flow | No |
| `/maya` | Yes (studio wrapper) | 2026-01-19 | Studio redirect, nav | No |
| `/paid-blueprint` | Yes | 2026-01-09 | Landing CTA | No |
| `/privacy` | Yes | 2026-01-15 | Footer | No |
| `/prompt-guides` | Yes | 2025-12-26 | Unknown | **Possible orphan** |
| `/prompt-guides/[slug]` | Yes | 2025-12-19 | Prompt guides list | No |
| `/(public)/share-your-story` | Yes | 2025-12-02 | Testimonials section | No |
| `/sentry-example-page` | Yes (dev/test) | 2026-01-15 | Dev only | **Orphan (intentional?)** |
| `/studio` | Yes (main app) | 2026-01-14 | Post-login, nav | No |
| `/terms` | Yes | 2025-12-02 | Footer | No |
| `/whats-new` | Yes | 2026-01-15 | Linked from app | No |
| `/why-studio` | Yes | 2026-01-15 | Landing | No |

**Redirect-only pages:** `/checkout/membership`, `/checkout/one-time` (redirect to `/checkout` with client_secret). `/checkout/blueprint` has UI then redirects to `/checkout` or `/feed-planner`.

**Broken nav:** Admin dashboard links to `/admin/diagnostics/system` and `/admin/diagnostics/errors` but **no such pages exist** under `app/admin/`. Only `app/api/admin/diagnostics/*` exists. Either add `app/admin/diagnostics/system/page.tsx` and `app/admin/diagnostics/errors/page.tsx` or change dashboard links to a single diagnostics page (e.g. `/admin/diagnostics` if you add it).

**Orphan / weak links:**  
- `/checkout-upgrade` — redirects to `/dashboard?upgraded=true`; `/dashboard` may not exist (no app/dashboard/page.tsx in list).  
- `/diagnostics` — has UI; confirm if any nav or link points here.  
- `/prompt-guides` — confirm if linked from nav or marketing.  
- `/sentry-example-page` — dev/test; can stay unlinked.

---

## 2.2 Component Usage Analysis

**Method:** Grep for `@/components/` and `components/` imports (excluding `.backups`). Summary by folder; 0–1 import = candidate for removal or inlining.

### High usage (many imports)

- **`components/ui/*`** — Button, Card, Dialog, Input, etc. Used across app/admin/feed-planner/sselfie.
- **`components/sselfie/sselfie-app.tsx`** — Single entry for studio; 1 import (app/maya/page).
- **`components/sselfie/maya-chat-screen.tsx`** — Used by maya + admin maya-studio.
- **`components/feed-planner/feed-view-screen.tsx`** — Feed planner + blueprint.
- **`components/admin/admin-dashboard.tsx`** — Admin root.
- **`components/admin/admin-nav.tsx`** — Admin layout.
- **`components/credits/*`** — buy-credits-dialog, credit-balance, low-credit-modal, etc., used in sselfie-app and studio flows.
- **`components/blueprint/blueprint-landing.tsx`**, **blueprint-email-capture.tsx**, **blueprint-selfie-upload.tsx**, **blueprint-concept-card.tsx** — Blueprint flow.
- **`components/checkout/success-content.tsx`** — Checkout success page.

### Duplicate component (same name, different folders)

| Name | Locations | Recommendation |
|------|-----------|----------------|
| **BuyBlueprintModal** | `components/sselfie/buy-blueprint-modal.tsx`, `components/feed-planner/buy-blueprint-modal.tsx` | **Consolidate:** Keep `sselfie/buy-blueprint-modal.tsx` (canonical). Feed-planner and free-mode-upsell already import from `@/components/sselfie/buy-blueprint-modal`. Remove or re-export from `feed-planner/buy-blueprint-modal.tsx` to avoid two implementations. |

### 0–1 import (candidates for removal or inlining)

- **`components/image-lightbox.tsx`** — ts-prune reported unused export; confirm if used anywhere.
- **`components/reset-passwords-button.tsx`** — Low usage; confirm necessity.
- **`components/theme-provider.tsx`** — Usually 1 import (layout); keep.
- **`components/academy/lesson-viewer.tsx`** — Used in academy; keep.
- Many **admin/** components (e.g. admin-analytics-panel, admin-notifications, beta-countdown, calendar-card, caption-card, competitor-tracker, content-analyzer, content-calendar-export, email-preview-card, email-preview-modal, gallery-image-selector, growth-dashboard, health-check-dashboard, instagram-*, maya-testing-lab, performance-tracker, segment-selector, semantic-search-panel, system-health-monitor, writing-assistant) — Used by admin pages/dashboard; some may be used only once. Run knip/ts-prune and then decide: keep if roadmap needs them, else inline or remove.
- **`components/feed/instagram-feed-card.tsx`** — Confirm usage (feed views).
- **`components/feed-planner/feed-strategy-panel.tsx`** — Default export; check import count.
- **`components/studio-pro/pro-asset-gallery.tsx`** — Single-use candidate; confirm.
- **`components/UpgradeOrCredits.tsx`** — Used in sselfie-app; keep.

**Action:** Run `npx ts-prune` and `npx knip` (with ignores for backups), then for each component with 0–1 imports either document as intentional (e.g. layout, admin) or plan removal/inline.

---

## 2.3 API Route Audit

**Scope:** `app/api` (141+ route files; some under `.removed-endpoints`). Summary by area.

### Called from frontend (confirmed)

- **Feed planner:** `/api/feed-planner/create-from-strategy`, `/api/feed/[feedId]/*` (add-caption, generate-highlights, add-strategy, etc.), `/api/feed/create-manual`, `/api/feed/create-free-example`, `/api/images/feed`.
- **Maya:** `/api/maya/chat`, `/api/maya/load-chat`, `/api/maya/new-chat`, `/api/maya/chats`, `/api/maya/save-message`, `/api/maya/pro/photoshoot/*` (start-session, generate-grid, check-grid).
- **Admin:** `/api/admin/dashboard/stats`, `/api/admin/diagnostics/errors`, `/api/admin/diagnostics/cron-status`, `/api/admin/tasks`, `/api/admin/tasks/[id]`, `/api/admin/projects`, `/api/admin/populate-high-ticket-tasks`, `/api/admin/mission-control/daily-check`, `/api/admin/mission-control/complete-task`, `/api/admin/email-campaigns/[id]/approve|reject|test|unreject`, `/api/admin/chat-with-agent`, `/api/admin/brand-engine-calendly`, `/api/admin/run-migration`.
- **Checkout / Stripe:** `/api/stripe/create-checkout-session`, `/api/landing/checkout` (or similar); success handled by Stripe redirect.
- **User:** `/api/user/info`, `/api/user/onboarding-status`, `/api/user/setup-status`.
- **Blueprint:** `/api/blueprint/generate-paid`, `/api/blueprint/generate-grid`, `/api/blueprint/generate-concepts` (or subscribe).
- **Testimonials:** `/api/testimonials/published`.
- **Apply:** `/api/apply/brand-engine`.

### Webhooks / external

- **Stripe:** `app/api/webhooks/stripe/route.ts` — payment and subscription events.
- **Resend:** `app/api/webhooks/resend/route.ts` — email events.
- **Gumloop:** `app/api/admin/gumloop-webhook/route.ts` — agent webhooks.

### Cron / internal

- Many under `app/api/cron/*`: send-scheduled-newsletters, send-blueprint-followups, reconcile-credits, resolve-pending-payments, welcome-sequence, nurture-sequence, reactivation-campaigns, reengagement-campaigns, admin-alerts, etc. Called by Vercel cron or similar; not from frontend.

### Possibly unused (frontend not found)

- **`/api/admin/diagnostics/cron-status`** — Called by admin dashboard; **page** `/admin/diagnostics` does not exist (dashboard links to `/admin/diagnostics/system` and `/admin/diagnostics/errors`). So API exists but linked admin pages do not.
- **`/api/studio/*`** (activity, favorites, sessions, generate, generations, stats, generation/[id], session) — Confirm usage from studio UI.
- **`/api/maya/research`**, **`/api/maya/instagram-tips`**, **`/api/maya/feed/*`** — Confirm from Maya/feed features.
- **`/api/settings/*`**, **`/api/check-email-logs`** — Confirm from settings/support.
- **`/api/test-purchase-email`**, **/api/testing/stripe-mock** — Dev/test; can remain.
- **`/api/feature-flags/paid-blueprint`**, **`/api/feature-flags/blueprint-welcome`** — Likely used by paid-blueprint and blueprint welcome flow; confirm.
- **Removed endpoints** under `app/api/.removed-endpoints/*` — Safe to delete when no longer needed.

**Recommendation:** For each route under `app/api`, add a one-line comment “Called from: X” or “Cron” or “Webhook” or “Unused”. Then remove or archive truly unused routes.

---

## 2.4 Documentation vs Reality Check

**Source:** `docs/COMPLETE_USER_JOURNEY_MAP.md` (Free Blueprint, Paid Blueprint, Creator Studio).

### Free Blueprint flow

- **Doc:** Landing `/blueprint` → email capture → brand onboarding wizard (unified-onboarding-wizard) → AI strategy (POST /api/blueprint/generate-concepts) → optional grid (POST /api/blueprint/generate-grid) → results (blueprint-screen) → upsell (Paid Blueprint / Studio / Credits).
- **Code:**  
  - `/blueprint` exists; blueprint-landing, blueprint-email-capture, unified-onboarding-wizard, blueprint-screen exist.  
  - `/api/blueprint/generate-concepts` and `/api/blueprint/generate-grid` exist.  
  - **Match:** Yes. Optional: confirm API paths match exactly (e.g. generate-concepts vs generate-paid).

### Paid Blueprint purchase flow

- **Doc:** Checkout `/checkout/blueprint` → Stripe → webhook `/api/webhooks/stripe` → 60 credits, tag paid-blueprint-buyer → redirect `/checkout/success` → welcome email → `/blueprint/paid?access=…` → POST `/api/blueprint/generate-paid` (30 photos) → delivery email.
- **Code:**  
  - `/checkout/blueprint` redirects to `/checkout?client_secret=…&product_type=paid_blueprint`.  
  - Stripe webhook exists; success redirect and paid blueprint page exist.  
  - **Match:** Yes. Confirm webhook actually grants 60 credits and sets paid_blueprint_purchased.

### Creator Studio membership flow

- **Doc:** `/checkout/membership` → Stripe subscription → customer.subscription.created + invoice.payment_succeeded → 200 credits/month, tag studio-member → `/studio` → brand wizard → tabs (Feed Planner, Maya, Gallery, Academy).
- **Code:**  
  - `/checkout/membership` redirects to `/checkout` with client_secret.  
  - Studio at `/studio` (and `/maya` wrapping SselfieApp) exists; tabs documented in COMPLETE_USER_JOURNEY_MAP.  
  - **Match:** Yes. Confirm webhook grants 200 credits on invoice.payment_succeeded.

### Documented features not found in code (or broken)

- **Admin diagnostics pages:** Doc does not mandate them, but admin dashboard links to `/admin/diagnostics/system` and `/admin/diagnostics/errors`. Those **pages do not exist**; only API routes under `app/api/admin/diagnostics/` exist. **Gap:** Either add these pages or fix dashboard links.

### Code paths not (or barely) mentioned in doc

- **Brand Engine / Apply:** `/brand-engine`, `/apply/brand-engine` — Doc mentions “Brand Engine” in ecosystem; ensure journey map explicitly lists these routes and CTAs.
- **Feed Planner as standalone:** `/feed-planner` as a top-level route (not only under studio) — Doc mentions it; confirm “standalone feed planner” is described.
- **Checkout upgrade:** `/checkout-upgrade` redirects to `/dashboard` — Dashboard route unclear; doc should either describe this flow or mark as legacy/deprecated.
- **Diagnostics:** `/diagnostics` page — If user-facing, add to doc; if not, remove or restrict.

---

## 2.5 Duplicate Logic Detection

### Credit checking

- **`lib/credits.ts`** — `checkCredits`, `getUserCredits`, `hasUnlimitedCredits`, transaction types, DB.
- **`lib/credits-cached.ts`** — `getUserCreditsCached`, `checkCreditsCached`, `getCreditHistory`, `invalidateCreditCache`; uses `lib/credits` for DB.
- **Recommendation:** Keep both: `credits.ts` = source of truth; `credits-cached.ts` = cache layer. Ensure all callers that need fresh balance use non-cached after spend; others use cached. Avoid a third “credit check” helper elsewhere; centralize in these two.

### Auth / session

- **Pattern:** `getSession`, `getUser`, `createClient` (Supabase), Stack Auth, etc. appear in many API routes and a few client components.
- **Recommendation:** One shared pattern for “require auth” in API routes (e.g. `getUserFromRequest()` or middleware). Audit all API routes and replace ad-hoc auth with that helper to avoid drift.

### Stripe

- **Locations:** `app/api/webhooks/stripe`, `app/api/stripe/*` (create-checkout-session, create-portal-session, list-products, etc.), `app/actions/stripe.ts`, `app/actions/landing-checkout.ts`, `lib/stripe/*` (live-metrics, etc.).
- **Recommendation:** Keep webhook and server actions; ensure product/price IDs and session creation live in one config (e.g. `lib/products.ts` or single Stripe module). Consolidate “create checkout session” logic so membership, blueprint, and one-time all go through one path with parameters, not three separate implementations.

### Email sending

- **Resend / Flodesk / Loops:** Doc and code reference Resend + Flodesk; some scripts reference Loops. Multiple “subscriber” and “segment” concepts.
- **Recommendation:** Document which system is canonical for which flow (e.g. Resend for transactional, Flodesk for marketing). Consolidate “send one email” and “add to list” behind a small set of helpers so cron and app code don’t duplicate logic.

---

## 2.6 Over-Engineering Symptoms

### Abstractions used only once

- **Feed-planner `buy-blueprint-modal.tsx`** — Duplicate of sselfie version; remove and use one.
- **`lib/feed-planner-v2/feature-flag`** — Used in feed create routes; if “v2” is now default, consider removing flag and path.
- **Prompt authority / workbench** — If workbench is single use or deprecated, consider inlining or removing.

### Config files that rarely change

- **`lib/feature-flags.ts`** — Only `isWorkbenchModeEnabled()` (env var). Fine as-is.
- **`lib/credits.ts`** — `CREDIT_COSTS`, `SUBSCRIPTION_CREDITS` — Single source of truth; keep.
- **Admin feature flags in DB** (`admin_feature_flags`) — Used for paid blueprint, blueprint welcome, pro photoshoot. Keep; ensure no duplicate “feature flag” implementations (env vs DB vs API).

### Multiple layers of wrappers

- **Studio:** `app/studio/page.tsx` → auth + `<SselfieApp />`. `app/maya/page.tsx` → auth + `<SselfieApp />`. Not excessive.
- **Feed planner:** `app/feed-planner/page.tsx` → `<FeedPlannerClient>` → FeedViewScreen, UnifiedOnboardingWizard, WelcomeWizard. Reasonable.
- **Maya chat:** `maya-chat-screen.tsx` uses `maya-chat-interface.tsx`, `maya-feed-tab.tsx`, etc., with refs and “wrapper” handlers. Acceptable; no need for extra Container/Wrapper components unless they add clarity.

### Feature flags for long-shipped features

- **`isWorkbenchModeEnabled()`** — Used in Maya (studio-pro system prompt). If workbench is the only mode now, remove flag and simplify.
- **`admin_feature_flags` (paid_blueprint_enabled, blueprint_welcome_enabled, pro_photoshoot)** — If these are always on in production, consider removing checks and deleting flag rows; otherwise keep for kill switch.

### Multiple state management solutions

- **No Redux.** React state + Context (e.g. theme, auth from Stack) + SWR for data. No Zustand found in scan. **Verdict:** No over-engineering here; single coherent approach.

---

## Summary of Actions

1. **2.1** — Add `app/admin/diagnostics/page.tsx` (or system/errors subpages) and fix admin dashboard links; or point links to one diagnostics URL. Fix or remove `/checkout-upgrade` → `/dashboard` if dashboard doesn’t exist.
2. **2.2** — Remove duplicate `components/feed-planner/buy-blueprint-modal.tsx`; use `components/sselfie/buy-blueprint-modal.tsx` everywhere. Run knip/ts-prune and trim or document 0–1 import components.
3. **2.3** — Annotate each API route with caller (frontend/cron/webhook); remove or archive unused and `.removed-endpoints`.
4. **2.4** — Align admin diagnostics links with existing pages or add missing pages. Document brand-engine and apply flows and `/feed-planner` in the journey map; clarify or remove checkout-upgrade/dashboard.
5. **2.5** — Centralize auth helper for API routes; single Stripe checkout flow with parameters; single email/subscriber abstraction where possible.
6. **2.6** — Remove feed-planner duplicate BuyBlueprintModal; simplify workbench/paid_blueprint flags if always-on; leave state management as-is.
