# Profile / Account — Feature doc

**Purpose:** Single source of truth for how the Profile/Account feature works end-to-end. For agents, North, and product.

---

## 1. Overview

- **Feature name:** Profile / Account (Account tab in app)
- **One-line:** User profile (avatar, name, bio, stats, best work, personal brand), referral dashboard, settings (account info, subscription, notifications, generation preferences, privacy, brand assets, model training/demographics), upgrade CTA, admin link, logout.
- **Entry points:**
  - `/studio?tab=account`
  - In-app: bottom nav “Account” in `SselfieApp`
- **Who can access:** All authenticated users. Admin link visible to all (admin layout then enforces admin email).

---

## 2. User journey (start to finish)

| Step | Screen / action | What user sees / does |
|------|------------------|------------------------|
| 1 | Account tab | Tab switcher: Profile | Settings. |
| 2 | Profile section | Avatar (click → profile image selector), name, bio, “X Member”, stats (Photos, Favorites), Referral dashboard, “Edit Profile”, “Personal Brand” (expandable), “Best Work” (grid, reorder, select from gallery). |
| 3 | Edit Profile | Dialog: name, bio, location, instagram; save → refresh profile. |
| 4 | Best Work | Select photos from gallery; drag to reorder; save → POST `/api/profile/best-work`. |
| 5 | Settings section | Account info (email, membership, member since); Subscription management (Stripe portal) for Studio; Upgrade to Creator Studio CTA for non-Studio; Billing & Invoices; Notifications (email, Maya updates); Generation preferences (auto-save to gallery); Privacy (data for training); Brand Assets; Admin Access (link to `/admin`); Model Training (Retrain model); Model Information (gender, ethnicity, physical preferences) → update demographics; Sign Out. |
| 6 | Upgrade | Upgrade modal (current vs target tier); checkout flow. |
| 7 | Retrain | Retrain model modal; triggers training flow. |

---

## 3. Frontend

- **Routes (pages):** Account is a tab inside `SselfieApp`; no dedicated page.
- **Main component(s):**
  - `components/sselfie/account-screen.tsx` — Profile + Settings tabs, all sections, modals.
  - `components/sselfie/edit-profile-dialog.tsx`, `components/sselfie/best-work-selector.tsx`, `components/sselfie/personal-brand-section.tsx`, `components/sselfie/brand-assets-manager.tsx`, `components/sselfie/retrain-model-modal.tsx`
  - `components/profile-image-selector.tsx`, `components/referrals/referral-dashboard.tsx`, `components/upgrade/upgrade-modal.tsx`
- **Key UI state:** `activeSection` (profile/settings), profile info, stats, best work, user info, subscription info, settings toggles, demographics, modals (edit, profile selector, best work, upgrade, retrain).
- **Navigation:** Tab in SselfieApp; hash `#account`. Admin link → `/admin`.
- **Code paths:** `components/sselfie/account-screen.tsx`, `components/sselfie/edit-profile-dialog.tsx`, `components/sselfie/best-work-selector.tsx`, `components/sselfie/personal-brand-section.tsx`, `components/sselfie/brand-assets-manager.tsx`, `components/sselfie/retrain-model-modal.tsx`, `components/referrals/referral-dashboard.tsx`, `components/upgrade/upgrade-modal.tsx`

---

## 4. Backend

- **API routes:**
  - Profile: `app/api/profile/stats/route.ts`, `app/api/profile/info/route.ts`, `app/api/profile/best-work/route.ts`, `app/api/profile/recent-work/route.ts`
  - User: `app/api/user/info/route.ts`, `app/api/user/credits` (used elsewhere), `app/api/user/update-demographics/route.ts`
  - Settings: `app/api/settings` (POST with key/value)
  - Stripe: `app/api/stripe/create-portal-session/route.ts` (manage subscription)
  - Auth: `app/api/auth/logout`
  - Checkout (upgrade): `app/api/landing/checkout` (server action or API)
- **Server actions:** Possible in checkout/upgrade flows; profile updates are API.
- **Cron / webhooks:** Stripe webhook updates subscription state used here.
- **Code paths:** `app/api/profile/**/*.ts`, `app/api/user/**/*.ts`, `app/api/settings/**/*.ts`, `app/api/stripe/create-portal-session/route.ts`, `lib/credits.ts`

---

## 5. Logic (credits, entitlements, access)

- **Credits:** Shown in app header/nav; not deducted on Account screen. Upgrade and checkout affect subscription and credit grant (cron/webhook).
- **Entitlements / access:** `product_type` and subscription status drive “Studio Member” vs “One-Time Session” vs “Free”; upgrade CTA for non-Studio; Stripe portal for Studio billing.
- **Data flow:** Profile and best work in DB; settings in user/settings table; subscription from Stripe/DB; demographics and physical preferences used by Maya generation.

---

## 6. Code map (for agents)

- **Pages:** (Account is a tab; no standalone page.)
- **Components:** `components/sselfie/account-screen.tsx`, `components/sselfie/edit-profile-dialog.tsx`, `components/sselfie/best-work-selector.tsx`, `components/sselfie/personal-brand-section.tsx`, `components/sselfie/brand-assets-manager.tsx`, `components/sselfie/retrain-model-modal.tsx`, `components/referrals/referral-dashboard.tsx`, `components/upgrade/upgrade-modal.tsx`, `components/profile-image-selector.tsx`
- **API routes:** `app/api/profile/**/*.ts`, `app/api/user/**/*.ts`, `app/api/settings/**/*.ts`, `app/api/stripe/create-portal-session/route.ts`
- **Lib / shared:** `lib/credits.ts`, `lib/analytics` (trackCTAClick)

---

## 7. Current value / pain (research)

**Current value:**
- Single hub for user identity: avatar, name, bio, stats, and best work showcase
- Personal Brand section drives Maya's style personalization—core to product differentiation
- Referral dashboard (low-friction mechanism for viral growth)
- Unified subscription & billing management (Stripe portal integration)
- Model training controls and demographic data that enable accurate Maya generation

**Pain / friction:**
- **Profile incompleteness reduces Maya quality**: Many users leave Personal Brand empty or incomplete, preventing Maya from injecting brand consistency into generations. Without this context, Maya generates without understanding user's style, goals, or visual identity.
- **Studio upgrade is the critical monetization gate**: 17 active Studio members / 547 total users = 3.1% conversion. Profile is where this CTA lives, but messaging is generic. New users do not understand specific value ("Your Maya will know your style").
- **Churn visibility gap**: 24 canceled Studio subscriptions indicate real friction, but at-risk subscribers (past_due: 1) are not surfaced prominently in Profile. Billing failures lack alerts—users may not realize they've been canceled.
- **Referral dashboard under-utilized**: Dashboard exists but low awareness; unclear if users know it's there or how to activate it.
- **Retrain model underused**: Membership users who update appearance/style rarely know when to retrain—no contextual prompts or value communication.
- **Demographics not positioned as valuable**: Model Information section (gender, ethnicity, physical preferences) used by Maya generation but feels like "boring settings" rather than essential brand input.

---

## 8. Opportunities (for rebuild / AI)

**High-impact initiatives:**

1. **Guided "Complete Your Brand Profile" onboarding flow**
   - Entry: New users see a 2-3 step wizard post-signup (or on first Account visit)
   - Steps: (1) Avatar + basic bio, (2) Personal Brand (style, goals, aesthetic), (3) Demographics (used by Maya)
   - Outcome: Higher Personal Brand completion → better Maya generations → faster activation
   - Constraint: Non-breaking; skippable but encouraged

2. **Upgrade CTA with specific, outcome-focused messaging**
   - Current: Generic "Upgrade to Creator Studio" button
   - Target: "Your Maya will know your style, your brand, your goals" (value clarity)
   - Placement: Prominent on Profile tab; optional additional CTA in Settings
   - Data: Emphasize "17 active Studio members create better, faster" or similar social proof
   - Constraint: Stripe flow unchanged; use existing modal

3. **Better "Retrain Your Model" CTA and contextual prompts**
   - Opportunity: After membership user updates demographics or appearance, surface retrain prompt
   - Messaging: "Your look has evolved—retrain your Maya to match" (contextual, not generic)
   - Placement: Modal post-update or prominent badge in Settings/Model Training section
   - Goal: Increase retrain frequency (currently low usage signal)

4. **At-risk subscription alerts in Profile**
   - Issue: past_due: 1, canceled: 24 indicate churn; users may not know they're at risk
   - Solution: Add alert banner if subscription is past_due or recently flagged for renewal failure
   - Placement: Top of Settings section, above Subscription management
   - Action: Link to Stripe portal or brief troubleshooting guide
   - Constraint: Stripe webhook data already available; no new integrations

5. **Referral program amplification**
   - Current: Referral dashboard exists but low awareness
   - Opportunity: (a) Prominent referral CTA on Profile tab (e.g., "Invite friends, earn credits"); (b) Highlight referral rewards in upgrade flow; (c) Show referral status/rewards in Account header
   - Goal: Convert low-awareness into active viral loop
   - Constraint: Existing referral mechanics unchanged

6. **Reframe demographics as "Brand Profile" input, not settings**
   - Current: "Model Information" feels like admin/technical settings
   - Opportunity: Rename section, add copy: "These details help Maya generate images that match YOUR visual identity and aesthetic"
   - Placement: Integrate into Personal Brand section or create unified "Your Brand" tab
   - Goal: Increase completion and perceived value
   - Constraint: Backend data unchanged; UI/UX only

**Constraints:** Design system compliance; no breaking changes to Stripe portal or credit flows; Profile remains read-accessible to all users.

---

## Changelog

| Date       | Change |
|------------|--------|
| 2026-02-25 | Research pass: §7 and §8 filled from funnel/support/friction digests. |
| 2026-02-25 | Initial doc from codebase audit (North). |
