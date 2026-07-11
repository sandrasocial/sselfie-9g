# TRIAL-FRONTDOOR-01 — Trial activation: drop the password wall + single-action first screen + see the funnel

**Owner:** Codex (code). Copy below is Sandra-voiced and pre-approved in this spec; Sandra gives final OK in chat before merge per the no-autonomous-sends rule (this ships UI/analytics, no email sends, so it can merge once copy reads right to her).

**Relationship to TRIAL-ACTIVATION-01:** This spec **supersedes the in-app + claim portions** of `tasks/TRIAL-ACTIVATION-01-first-image.md` (its Fix 3 "Step 1 caption" and the claim flow). TRIAL-ACTIVATION-01's **email work (Fix 1 day-0 rewrite, Fix 2 no-image nudge, Fix 3b upload helper) stays valid and separate** — do not undo it. Where the two overlap (the in-app first-run step), THIS spec wins: the faint "Step 1: add one selfie" caption is replaced by a single full-bleed action.

---

## Problem

A customer-activation audit (live Neon DB + code read, 2026-06-19) found the whole trial funnel leaks before Maya. **16 trial users claimed; only 4 ever uploaded a selfie; all 4 who uploaded then generated images.** Activation is binary on the selfie: everyone who uploads activates, and ~75% of the loss is entirely in claim → first-selfie-upload. Two mechanical causes: (1) claiming the trial forces a Supabase password-setup screen before `/app`, so she hits a chore right after paying; (2) the trial's first screen shows ~5 competing start options with no single dominant action, and the selfie upload is a small text button buried two taps deep inside Maya's drawer. We also can't *see* this funnel — the one event that would show the selfie step (`activation_selfie_uploaded`) is defined but dead in v3.

**Corrections to the briefing (verified against code):**
- There is **no `legacy_migrated` flag anywhere** in `lib/`, `app/`, or `components/` (grep clean). Cohort tagging uses the real access level from `getSuiteAccess` only: `member` / `trial` / `limited` (plus `admin` for the admin email, and `none` which bounces to `/studio`). Do **not** invent a legacy-migrated property.
- The claim redirect is a Supabase **recovery (magic) link** whose `redirectTo` currently points at `/auth/setup-password?next=/app` (via `generatePasswordSetupLinkForPurchase(userId, email, "/app")` in `lib/payments/shared.ts`). The link itself authenticates her — the only problem is it lands on the password page first. The events `suite_home_viewed` and `first_action_selected` do **not** exist in the contract yet; they must be added.

---

## Work Item A — Single-action trial front door (no selfie yet)

**Files / symbols:**
- `components/app-v3/visual-front-door.tsx` → `VisualFrontDoor` (prop already exists: `showTrialFirstRunStep`).
- `components/app-v3/app-v3-shell.tsx` → already passes `showTrialFirstRunStep={accessLevel === "trial" && !trialHasGeneratedImages}` into `<VisualFrontDoor>`. No shell change needed beyond what's noted in Item C.
- Reuse the existing `useConcierge().openWithAesthetic` + `MAYA_BLANK` already imported in this file, and the existing hidden face-upload affordance pattern (`handleUpload(slot: "face")`) in `components/app-v3/maya-concierge.tsx`.

**Current behavior:** When `showTrialFirstRunStep` is true, the component renders one faint left-border caption ("Step 1: add one selfie so Maya keeps your face.") and then the full busy layout underneath: a "Start blank" hero, an "Add one selfie" tile, a "Pick a format" / trained-model tile, a 5-card "What are we making?" format row, and the full Vault-look masonry grid. Five+ competing actions; Maya only appears after she taps something; the actual selfie upload lives inside Maya's drawer.

**Desired behavior:** When `showTrialFirstRunStep` is true (trial, zero generated images), the front door collapses to **ONE full-bleed action in Maya's voice** and hides everything else (the hero/tiles block, the format row, and the Vault masonry grid). Render a single dominant card (reuse/extend the existing `LookbookAction` styling, full width, `tall`) with:
- eyebrow: `SSELFIE SUITE`
- title/body = the hero copy below (Maya speaking)
- one button labelled **"Add my selfie"** whose click opens Maya pre-committed to the photo format AND immediately opens the native file picker for the face slot, so tapping "Add my selfie" goes straight to choosing a photo — not into a drawer where she has to hunt for a second button.
  - Implementation: `openWithAesthetic(MAYA_BLANK, { format: "photo", seed: "I want to start with one selfie and make my first photo." })`, then trigger the face file input. Simplest reliable wiring: have the trial hero button set a one-shot "auto-open face upload" intent that `MayaConcierge` reads on open and calls `fileInput.current?.click()` once (guard so it fires a single time per open). If a cross-component trigger is awkward, an acceptable fallback is opening Maya with the `setupOpen` state forced open and the "Add your selfie" affordance as the only visible primary action — but the bar to clear is: **after one tap she is choosing a selfie, not reading a grid.**
- Once a selfie exists OR the trial has generated images, `showTrialFirstRunStep` is false and the **normal full front door renders unchanged** (do not alter it).

**Copy (use verbatim):**
- Hero title/body (Maya's voice): `Hi, I'm Maya. Let's make your first photo. Add one clear selfie and I'll keep your real face, then build the rest around you.`
- Button: `Add my selfie`

No new colors/fonts/tokens. No m-dashes. No-Fake compliant ("keep your real face", never "perfect/flawless/no one will know").

**Acceptance:**
- A trial member with **no selfie and zero images** sees exactly ONE primary action ("Add my selfie") and the hero line above — the format row and Vault masonry are not rendered in this state.
- Tapping "Add my selfie" leads directly to selecting a photo (file picker / Maya's face-upload), not to a screen of options.
- A trial member **with a selfie** (or with generated images) sees the normal, unchanged front door (hero + format row + masonry).
- Members (`full`) and limited users are unaffected (`showTrialFirstRunStep` already false for them).

---

## Work Item B — Remove the password detour from the claim flow

**Files / symbols:**
- `app/claim/[token]/page.tsx` (`ClaimTrialPage`) — the `generatePasswordSetupLinkForPurchase(userId, subscriber.email, "/app")` call near the end, whose result becomes `destination` before `redirect(destination)`.
- `lib/payments/shared.ts` → `generatePasswordSetupLinkForPurchase` (recovery link generator; its `redirectTo` builds `/auth/setup-password?next=<next>`).
- Confirm path that establishes the session: `app/auth/confirm/route.ts` (`verifyOtp` then redirect to `next`).

**Current behavior:** After granting the trial, the claim page generates a Supabase **recovery** link with `redirectTo = /auth/setup-password?next=/app`. The user clicks from email, the recovery OTP is verified (she's now authenticated), but she lands on **set-password first** and only reaches `/app` after completing it. That password chore sits exactly at the "did I just waste money / will this be work?" moment.

**Desired behavior:** A freshly-claimed trial lands **authenticated directly in `/app`**, with **no password step in the path.** Keep using the recovery/magic link to establish the session (she came from email with no cookie), but point its post-verify destination straight at `/app` instead of the setup-password page. Concretely, give the claim flow a way to generate the session link with the confirm `next` = `/app` (e.g. a `redirectTo` of `/auth/confirm?...&next=/app`, or a small `nextAfterSetup`-style param that skips the setup-password wrapper for the claim case). **Set-password is deferred, not deleted:** `password_setup_complete` stays `false`, and the user can set a password later from Account. Do **not** change behavior for any other caller of `generatePasswordSetupLinkForPurchase` (Stripe fulfillment handlers still want their existing setup-password landing) — branch by an explicit option/argument for the claim case rather than changing the shared default.

**Acceptance:**
- Opening a valid claim link for a brand-new trial user lands on `/app` **authenticated**, with no `/auth/setup-password` stop in the redirect chain.
- Reloading the claim link is still safe/idempotent (grant is one-per-user; no duplicate day-0 email).
- Other consumers of `generatePasswordSetupLinkForPurchase` (Stripe handlers) are byte-for-byte unchanged in behavior.
- A claimed trial can still set a password later from Account (existing recovery/forgot-password path intact).

---

## Work Item C — Wire the 3 activation events (so we can SEE this funnel next time)

**Files / symbols:**
- `lib/analytics/event-contract.ts` → `ALLOWED_ANALYTICS_EVENTS` (the allow-list gate; unknown events are dropped by `logAnalyticsEvent`).
- `lib/analytics/events.ts` → `logAnalyticsEvent` (server-only insert into `analytics_events`).
- `components/app-v3/maya-concierge.tsx` → `handleUpload`, the `slot === "face"` branch (the real activation moment).
- `components/app-v3/visual-front-door.tsx` → the start-option click handlers (hero tiles, format row, Vault tiles, and the new trial "Add my selfie" action).
- `app/app/page.tsx` → already resolves the cohort via `getSuiteAccess` (`member`/`trial`/`limited`) + admin; pass the resolved `accessLevel` down so client events can tag it. `components/app-v3/app-v3-shell.tsx` already receives `accessLevel` and renders `VisualFrontDoor` — thread `accessLevel` into the front door so its events carry the cohort.

**Current behavior:** `activation_selfie_uploaded` is in the contract but **dead in v3** (last fired by the retired flow). There is no entry event for the trial home and no event for which start option was tapped, so the claim→upload funnel is invisible.

**Desired behavior — add/wire three events, each fired client-side via a POST to the existing analytics endpoint (or the existing client logger used elsewhere in app-v3; do not import the `server-only` `events.ts` into a client component). Each event carries a `cohort` property resolved from access level (`"member" | "trial" | "limited" | "admin"`):**

1. **`suite_home_viewed`** — fires once when the `/app` create/front-door view mounts. Properties: `{ cohort, hasSelfie: boolean, section: "create" }`.
2. **`first_action_selected`** — fires when the user taps any start option on the front door. Properties: `{ cohort, action }` where `action` is one of: `"add_selfie"` (the trial single action AND the "Add one selfie" tile), `"start_blank"`, `"pick_format"`, `"format_<format>"` (e.g. `format_photoshoot`), `"vault_look"`, `"use_trained_model"`.
3. **`activation_selfie_uploaded`** — **re-activate the existing contract entry** by firing it from `handleUpload`'s `slot === "face"` success branch in `maya-concierge.tsx` (after the upload returns a URL). Properties: `{ cohort, source: "front_door" | "maya_drawer" }`.

Add the two new names (`suite_home_viewed`, `first_action_selected`) to `ALLOWED_ANALYTICS_EVENTS` with a short BRIDGE/SUITE-style comment. Keep `activation_selfie_uploaded` where it is. Events are behavior-only — they never touch money (Admin Data Contract rule 4). Fire-and-forget; never block or break the upload/UI if logging fails (the logger already fails open).

**Acceptance:**
- `suite_home_viewed` fires once per create-view mount with the correct `cohort`.
- `first_action_selected` fires on every start-option tap with a correct `action` value and `cohort`.
- `activation_selfie_uploaded` fires on a successful face-slot upload (both from the trial single action and from inside Maya), with `cohort` + `source`.
- All three appear in `analytics_events`; none appear in any money/admin revenue path.

---

## Non-goals (do NOT touch)

- Do **not** change the looks/Vault grid, the format row, or Maya chat for users who already have a selfie. Those render unchanged the moment `showTrialFirstRunStep` is false.
- Do **not** change pricing, credits, trial length, or the selfie hard-gate (the selfie is what keeps her face — the No-Fake promise; keep it required).
- Do **not** break or reroute the legacy `/studio` path, the `?legacy=1` trained-model entry, or the `none` → `/studio` bounce.
- Do **not** invent a `legacy_migrated` cohort flag (it doesn't exist).
- Do **not** alter the Stripe-handler callers of `generatePasswordSetupLinkForPurchase`.
- Do **not** send any email here; the day-0 email + no-image nudge live in TRIAL-ACTIVATION-01.

---

## Test / verification checklist

1. **Trial, no selfie:** front door shows ONE "Add my selfie" action + the Maya hero line; no format row, no masonry. Tapping it goes straight to picking a photo.
2. **Trial, has selfie (or has generated images):** normal full front door renders (hero + format row + masonry), unchanged from today.
3. **Member / limited / admin:** front door unchanged (single-action state never shows for them).
4. **Claim flow:** a valid claim link for a new trial lands authenticated on `/app` with no `/auth/setup-password` step in the redirect chain; reload is still idempotent (no second day-0 email).
5. **Set-password deferred:** the claimed user can still set a password later from Account.
6. **Events fire with correct cohort:** `suite_home_viewed` (once on mount), `first_action_selected` (on each tap, correct `action`), `activation_selfie_uploaded` (on face upload). Confirm rows in `analytics_events` carry `cohort` and that the two new names pass `isAllowedAnalyticsEventName`.
7. **No regressions:** lint clean, focused tests for the touched components/handlers pass, no money path reads these events.

## Rollback

Pure UI + analytics + one redirect-target change; no schema migration, no money path. Rollback = revert the branch (or, for Item A alone, revert the `showTrialFirstRunStep` single-action block to restore the faint caption + full grid). Item B rollback = restore the `"/app"` → setup-password `redirectTo`. The new event names are additive and harmless if left in the contract.
