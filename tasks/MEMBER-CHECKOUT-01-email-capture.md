# MEMBER-CHECKOUT-01 — Membership checkout email capture + payment-moment fixes

*Spec written 2026-06-12 by Claude. Approved by Sandra 2026-06-12 ("Yes please" to email capture spec).*

**Why this exists (verified data, 30 days to 2026-06-12):**
- 42 membership checkout sessions opened (`checkout_attribution`, `product_type='sselfie_studio_membership'`), **0 purchased, 0 with a captured email**.
- Compare Prompt Vault: 465 sessions, 116 with email, and its recovery emails convert. The membership recovery cron (`app/api/cron/membership-checkout-recovery`, hourly) exists but has **nobody to email** because the only email field lives inside Stripe's iframe and we never see it unless payment completes.
- Live smoke test 2026-06-12: the checkout itself WORKS (session creates, embedded Stripe form renders, subscribe button present). The leak is missed recovery + two payment-moment trust problems (Phase B).

**Goal:** every membership checkout visitor leaves an email before seeing the card form, so the existing recovery cron can work. Plus fix what the buyer sees at the moment of payment.

**Hard guardrails (CLAUDE.md, non-negotiable):**
- Money truth = `stripe_payments` + Stripe API only. This task never derives money from analytics.
- All copy: No-Fake doctrine (`docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`), Sandra's voice, NO m-dashes. Sandra approves all copy before merge (drafts in Appendix).
- Payment behavior edits live in `lib/payments/*` modules, never re-inlined into the webhook route. (This task shouldn't need to touch payment handlers at all.)
- Design: Cool Editorial per `docs/SSELFIE_DESIGN_SYSTEM.md`. No new tokens/colors/fonts.

---

## Verified code facts (2026-06-12)

- Membership checkout page: `app/checkout/membership/page.tsx`. When `?interval=` is set it calls `createLandingCheckoutSession(productId, params.promo, undefined, {...attribution})` — note the **third arg (`customerEmail`) is `undefined`**. That's the gap.
- `createLandingCheckoutSession` (`app/actions/landing-checkout.ts`) already accepts `customerEmail` as its 3rd parameter, normalizes it (line ~84), passes it to Stripe as `customer_email` (lines ~201/248), and records it on the `checkout_attribution` row. **No changes needed in this file.**
- Plan picker: `app/checkout/membership/membership-checkout-client.tsx` (monthly/annual toggle, pushes `?interval=...`).
- Reusable email-first step already exists: `components/prompt-vault/prompt-vault-checkout-email-capture.tsx` — fully parameterized (`actionPath`, `eyebrow`, `title`, `copy`, `inputId`, `buttonLabel`), submits GET back to `actionPath` with `checkout_email` + preserved attribution via `buildCheckoutEmailCaptureHiddenParams` / `buildSkipCheckoutEmailCaptureHref` (`lib/revenue-engine/anonymous-checkout-capture.ts`).
- Show/skip logic pattern: `shouldShowPromptVaultCheckoutEmailCapture` in `lib/revenue-engine/anonymous-checkout-capture.ts`; vault page also resolves a known email from the authed Supabase user or lead tables before deciding (see `app/checkout/prompt-vault/page.tsx:117-160`).
- Email hydration fallback already exists in the membership recovery cron (pulls `customer_details.email` from Stripe for `started` sessions) — keep it; it becomes the backstop instead of the only path.
- Recovery cron kill switch: `MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED`.

---

## Phase A — Email-first step on /checkout/membership

1. **Generalize the capture component** only if needed: it already takes props. Move/rename to `components/checkout/checkout-email-capture.tsx` with the vault file re-exporting (zero behavior change for vault), OR import the vault component directly with membership props. Pick the smaller diff.
2. **Membership page flow** (`app/checkout/membership/page.tsx`), mirroring the vault page:
   - Resolve a known email first: authed Supabase user email, else `checkout_email`/`email` URL param (normalize + validate like `normalizeCheckoutEmail`).
   - If `?interval=` is set AND no known email AND `skip_email_capture` !== "1": render the capture step instead of creating the session. Form action posts back to `/checkout/membership` with `interval`, promo, bonus, and all attribution params preserved (use `buildCheckoutEmailCaptureHiddenParams`).
   - When email is known: pass it as the third arg to `createLandingCheckoutSession(productId, params.promo, email, {...})`. Stripe will prefill/lock the email field; `checkout_attribution.user_email` gets set at session creation.
   - Keep the "skip" link (`buildSkipCheckoutEmailCaptureHref`) so nobody is hard-blocked.
3. **Analytics** (behavior only, `analytics_events`): fire `membership_checkout_email_capture_view` and pass-through so the existing `checkout_start` still fires once per real session creation. Do NOT invent any money events.
4. **Lead handling:** captured email goes ONLY into `checkout_attribution.user_email` (via the existing session-creation path). Do not add to Resend audiences here; the recovery cron owns follow-up. No new email sends in this task.
5. **Acceptance:**
   - Visiting `/checkout/membership?interval=month` logged-out shows the email step; submitting continues to the Stripe form with email prefilled.
   - `checkout_attribution` row for the new session has `user_email` set at creation time.
   - Logged-in members/users skip the step entirely (email auto-passed).
   - Skip link still reaches checkout; hydration cron remains as backstop.
   - Vault checkout behavior byte-identical (run its flow once to confirm).
   - `npm run check:voice` passes.

## Phase B — Payment-moment fixes (found in 2026-06-12 live smoke test)

These are what a real buyer sees AFTER clicking "Join the SUITE":

1. **Stripe product display name says "Content Creator Studio".** The page header says "You are joining SSELFIE SUITE", then Stripe's form says "Abonner på Content Creator Studio". Brand mismatch at the most trust-sensitive moment. Fix: rename the Stripe product (`prod_TanGAx1h4bVl4C`, the one behind `price_1SmN2HEVJvME7vkwuhz31FHC`) display name to "SSELFIE SUITE". Dashboard edit or API, no deploy. **Needs Sandra's one-word approval on the exact name.**
2. **Currency mismatch: marketing says €97, Stripe charges $97 USD.** With Stripe adaptive pricing the buyer sees local currency (e.g. "959,19 kr") plus "includes 4% conversion fee" plus "charges will vary based on exchange rates". For a recurring product aimed at European women, "price varies every month" is a conversion killer and contradicts every marketing page. **Sandra must pick ONE:**
   - (a) Charge in EUR: create a €97/mo (and €970/yr) price on the same product, point `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` (and annual env) at the new prices. Existing subscribers stay on their old USD prices untouched.
   - (b) Market in USD: change €97 to $97 across `/join/studio`, `membership-checkout-client.tsx`, emails, and anywhere `check:voice`/grep finds €97.
   - Recommendation: (a) — the audience is EU-heavy and $→local-currency conversion fees read as nickel-and-diming.
3. **Acceptance:** screenshot of the live embedded form shows the approved product name and a stable price in the chosen currency with no conversion-fee disclaimer for the primary audience.

---

## Appendix — capture step copy (Sandra approval needed)

- Eyebrow: `SSELFIE SUITE`
- Title: `Where should I send your access?`
- Copy: `Add your email before checkout so your login and receipt go to the right place. If anything pauses, I can help you pick up where you left off.`
- Button: `Continue to checkout`
- Skip link: `Skip and go straight to payment`
