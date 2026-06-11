# BRIDGE-01 — One-time buyer → SUITE member bridge

*Spec written 2026-06-11 by Claude. Approved scope: docs/audits/SUITE_VALUE_AND_HOME_RESEARCH_2026-06-11.md (Addendums 2+3) + docs/audits/PRODUCT_AUDIT_2026-06-11.md (F8, F9).*

**Goal:** Every one-time buyer has a visible, honest path into the SUITE, and every new member gets a premium first week. Five pieces, built in this order:

| Phase | What | Copy approval needed? |
|-------|------|----------------------|
| A | Real membership welcome emails (new + existing user) + rewire Day 0/2/7 | YES (drafts in Appendix 1) |
| B | `/join/studio` rewrite | YES (draft in Appendix 2) |
| C | "Library" surface in App v3 (products: owned open, locked previews) | Minimal UI labels |
| D | 7-day SUITE trial for Vault/Starter Kit buyers + limited mode in `/app` | YES (trial emails, Appendix 1) |
| E | Trial→paid instrumentation | No |

**Hard guardrails (from CLAUDE.md — non-negotiable):**
- Trial rows must NEVER count as members or MRR. Member counts come from `subscriptions` verified against Stripe (`lib/revenue/single-source.ts`); trials have no Stripe subscription, so they get their own `product_type = 'suite_trial'` — never `'sselfie_studio_membership'`.
- All copy follows the No-Fake doctrine (`docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`). Never "no one will know" / "look rich" / "flawless". Always: AI-assisted, keeps your face, true-to-you.
- No m-dashes anywhere in copy. Sandra's voice: short sentences, contractions, text-a-friend.
- Design: Cool Editorial per `docs/SSELFIE_DESIGN_SYSTEM.md`. No new tokens/colors/fonts.
- All emails through the stone-email wrapper (`lib/email/templates/stone-email.ts`).
- Payment behavior edits go in `lib/payments/handlers/*` / `lib/payments/lifecycle/*` modules, never re-inlined into the webhook route.

---

## Verified code facts (2026-06-11)

- `/app` gate: `app/app/page.tsx:21-71`. Auth via Supabase, membership via `subscriptions WHERE product_type='sselfie_studio_membership' AND status='active'`. Non-members → `/studio`. `APP_V3_MEMBERS_ENABLED` env.
- v3 shell: `components/app-v3/app-v3-shell.tsx` — 4 tabs in `NAV` (lines 25-30): create / library (= photo gallery `GalleryView`) / content / account. Feed Planner + Academy links deliberately omitted (comment in shell).
- Credits: `lib/credits.ts` — `user_credits` + `credit_transactions`, 200/mo granted in `lib/payments/lifecycle/invoice-paid.ts` on `invoice.payment_succeeded`. `deductCredits()` atomic. No trial/expiry concept exists.
- Entitlements: `lib/academy-entitlements.ts` — `academy_products` registry (DB wins over code defaults), `user_entitlements` + fallback to `stripe_payments`/`subscriptions`, `membershipIncluded: true` now set for all one-time products (D3, shipped). `userHasAcademyProductAccess(userId, productId)`, `hasActiveStudioMembership(userId)` (accepts active/trialing/grace).
- Academy data: `academy_courses`/`academy_lessons`/`user_lesson_notes`; home aggregation in `app/academy/_lib/course-library.ts` (`getAcademyHomeState(userId)`). `academy_monthly_drops` exists, 0 drops ever published.
- One-time buyers: rows in `freebie_subscribers` (email + `access_token`), NO `users` row, NO Supabase auth. Vault handler `lib/payments/handlers/prompt-vault.ts`, Starter Kit `lib/payments/handlers/starter-kit.ts` (this one also writes a `subscriptions` row `product_type='starter_kit'`).
- Membership welcome: still INLINE in `app/api/webhooks/stripe/route.ts`. New-user path ~1621-1876 sends `welcome-email.tsx` ("Welcome to SSelfie! Set up your account"). Existing-user path ~1956-2035 sends NOTHING (console log only).
- Onboarding Day 0/2/7: templates `lib/email/templates/onboarding-day-{0,2,7}.tsx` exist; cron `app/api/cron/onboarding-sequence/route.ts` sends via Resend Broadcast segments (`RESEND_SEGMENT_ONBOARDING_DAY_*` env) — effectively unwired (last sends March 2026, 1-4 each).
- `/join/studio`: `app/join/studio/page.tsx` → `StudioPageContent` in `components/sselfie/public-marketing.tsx:1163-1225`. 6 sections, attribution preserved via `usePreservedAttributionHref()`. Reusable: `Section`, `Split`, `CtaClose`, `FCard`, `Btn`, `ty()`.
- SuiteDoor (`components/marketing/suite-door.tsx`) → `/join/studio`; placed on prompt-vault access + ai-prompts access pages. Fires `studio_membership_door_view/click` analytics.

---

## Phase A — Membership welcome emails + onboarding rewire

1. **New template `lib/email/templates/membership-welcome.tsx`** (stone-shell). Two variants via prop:
   - `variant: "new"` — includes password setup CTA (`passwordSetupUrl`).
   - `variant: "existing"` — CTA straight to `https://sselfie.ai/app`.
   Copy: Appendix 1.1 / 1.2. Replaces `welcome-email.tsx` for `product_type='sselfie_studio_membership'` ONLY (other products keep their flows).
2. **Wire both webhook paths.** New-user path: swap `generateWelcomeEmail` → new template + new subject. Existing-user path (the no-email branch): add send + `email_logs` insert (`email_type='membership_welcome'`), idempotent on email_type+user_email within 7 days. While in there, extract membership fulfillment into `lib/payments/handlers/membership.ts` per WEBHOOK-01 architecture (verbatim move, byte-proven, same discipline as the other extractions).
3. **Rewire `app/api/cron/onboarding-sequence/route.ts`**: drop the Resend-segment broadcast mechanism; query members by `subscriptions.created_at` window directly (it already does) and send per-user via `sendEmail()` with `email_logs` idempotency (pattern: any existing cron that does direct sends, e.g. checkout recovery). Refresh Day 0/2/7 copy: Appendix 1.3 (light edits only, existing copy is close).
4. **Acceptance:** test-mode subscribe (new + existing user) produces exactly one membership welcome each, logged in `email_logs`; cron dry-run lists correct Day 0/2/7 recipients; `npm run check:voice` passes; no send to test-mode subscriptions.

## Phase B — `/join/studio` rewrite

Rewrite `StudioPageContent` in place (keep hero structure, keep attribution plumbing, keep component system). Copy: Appendix 2 (v2, Visual Brand Builder). Images from `public/images/ai-prompts/` (88 approved vault collection images; new mockups allowed). Sections: Hero → The pain → Your new Monday → What Maya makes (photoshoots · carousels · reel covers · captions · plan; video tile held until VIDEO-01 ships) → Everything included (D3) → The honest-AI block → Pricing (€97 · cancel anytime · 200 photos a month) → FAQ → CTA close. Remove the "comes after the basics, not before" positioning section (contradicts D3 everything-included; the SUITE is now the front door, not the graduation).

**Acceptance:** all CTAs → `/checkout/membership?interval=month&source=...` with attribution preserved; SuiteDoor placements unchanged; voice check passes; mobile clean; copy approved by Sandra before merge.

## Phase C — "Library" in App v3

1. **Tab rename + new tab** (pending Sandra OK, see Decisions): `NAV` becomes `create / photos / content / library / account` — current `GalleryView` tab relabeled "photos", new "library" tab = products surface.
2. **New `components/app-v3/library-view.tsx`**: editorial tiles, same visual language as the visual front door. Tiles: owned courses (with lesson progress from `user_lesson_notes`), owned one-time products, locked previews of unowned ones (lock + one-line value + upgrade CTA for non-members; for members everything is open per D3), drops section reading `academy_monthly_drops` (empty state: "New drops land here every week" — wiring the weekly drop itself is Content Engine scope, not BRIDGE-01).
3. **New `app/api/app-v3/library/route.ts`**: auth same as other app-v3 routes; data from `getAcademyHomeState(userId)` / `lib/academy-entitlements.ts`. Course/lesson links point at existing `/academy/courses/...` and `/access/...` routes (rebuilt-in-v3 rendering is a later iteration; surfacing comes first).
4. **Account tab**: add a one-line "Your SSELFIE" pointer into the Library tab; remove nothing.

**Acceptance:** member sees ALL products open (D3); a trial/limited user sees owned products open + the rest locked with one upgrade CTA; no regression to create/photos/content tabs.

## Phase D — 7-day trial + limited mode (D4)

**Account claim is the spine** (token buyers have no auth):
1. **Claim flow**: `app/claim/[token]/page.tsx` — looks up `freebie_subscribers.access_token`, creates Supabase auth user + `users` row (reuse the existing `generatePasswordSetupLinkForPurchase` machinery from the membership path), then grants the trial and redirects to `/app`.
2. **Migration** (use `db-migration` skill): `subscriptions` gains nothing; instead trial = new row `product_type='suite_trial'`, `status='active'`, plus new column `trial_ends_at TIMESTAMPTZ` (nullable, only used by suite_trial rows). Index on `(product_type, status)` if missing.
3. **Grant**: in `lib/payments/handlers/prompt-vault.ts` + `starter-kit.ts` after fulfillment: create claim-ready trial (the email invites them to claim). On claim: insert suite_trial row (`trial_ends_at = now()+7d`), grant **20 credits** via `addCredits(userId, 20, 'trial_grant', ...)`. Idempotent: one trial per email, ever (check past suite_trial rows by user/email).
4. **Gate change** in `app/app/page.tsx`: allow `product_type='suite_trial' AND status='active' AND trial_ends_at > now()` → full app, trial badge + days-left in Account tab. Allow EXPIRED trial users and account-holding one-time buyers → **limited mode**: shell renders, Library shows owned products, Create tab shows the visual front door with generation locked behind upgrade CTA (no credits spent, no generation API access — enforce server-side in `app/api/app-v3/maya/generate/route.ts`, not just UI).
5. **Expiry cron** `app/api/cron/suite-trial-expiry/route.ts`: daily; flips overdue suite_trial rows to `status='expired'`; sends day-5 "2 days left" + day-7 "trial ended" emails (Appendix 1.5/1.6), `email_logs` idempotent. Unused trial credits: zero them at expiry (`credit_transactions` entry `trial_expiry`).
6. **Trial emails**: unlock email appended to Vault/Kit delivery flow (Appendix 1.4) for NEW purchases. Backfill broadcast to past Vault/Kit buyers = separate Sandra-approved send via resend-broadcast skill, not in this build.
7. **Admin contract compliance**: `lib/revenue/single-source.ts` and `/admin` member counts must exclude `suite_trial` (verify, add test). Trials appear on `/admin` home as their own line ("trials active / converted"), sourced from `subscriptions` suite_trial rows — no money fields.

**Acceptance:** Vault test purchase → claim → `/app` full access with 20 credits → expiry flips to limited mode and zeroes trial credits → upgrade via `/checkout/membership` converts to real membership and existing-user welcome fires. Member counts on `/admin` unchanged by any number of trials. Generation API rejects expired-trial users server-side.

## Phase E — Instrumentation

- `analytics_events` (behavior only): `trial_claimed`, `trial_first_generation`, `trial_expired`, `trial_upgrade_clicked`. Conversion truth (trial → paid) = join suite_trial rows to later membership rows in `subscriptions` — surfaced on `/admin` home via `lib/admin/home-report.ts`.

---

## Decisions — ANSWERED by Sandra 2026-06-11

1. **Copy: APPROVED** (emails as drafted in Appendix 1). Landing copy direction was then expanded — see note below — so Appendix 2 was rewritten and needs one more look from Sandra.
2. **Tab naming: APPROVED** — gallery tab renamed "photos", new products tab is "library".
3. **Trial credits: APPROVED** — 20 credits.
4. **Landing images: APPROVED** — use `public/images/ai-prompts/` (88 vault collection images, all Sandra-approved vault content). Free to create new mockups where needed.
5. **Backfill: APPROVED** — one broadcast to past Vault/Kit buyers once the trial flow is live (draft via resend-broadcast skill, Sandra approves the send).

**Sandra's added direction for the landing page (2026-06-11):** Maya is more than an image generator — she's a **Visual Brand Builder**: full photoshoots, carousels, reel covers, captions. Copy must use buyer psychology: name her pain points, her desires, and paint the picture of what this does for her. Appendix 2 rewritten accordingly.
⚠️ Honesty note (No-Fake doctrine applies to product claims too): **video is not in App v3 yet** (VIDEO-01 Phase 1 is next after BRIDGE-01). The landing rewrite keeps video out of the core promise until VIDEO-01 ships; the moment it does, add the "bring your photos to life" tile. Don't promise it before it exists.

## Build status

- **Phase A: BUILT 2026-06-11** — `lib/email/templates/membership-welcome.tsx` (new + existing variants, approved copy, exported subjects); webhook new-user path swapped to it for membership, existing-user path now sends the "existing" variant (livemode + paid gated, email_logs idempotent, `email_type='membership_welcome'`); onboarding cron rewired from Resend-segment broadcasts (env vars never set; the 503 was blocking ALL lifecycle emails in that route daily) to direct per-user sends; Day 0/2/7 CTAs → `/app`, Day 2 tap-first rewrite, Day 7 gallery-ownership line.
- **Phase B: BUILT 2026-06-11** — Appendix 2 v2 approved by Sandra ("approved. Proceed Phase B"). `StudioPageContent` rewritten in `components/sselfie/public-marketing.tsx`: Hero (Visual Brand Builder H1, "#how-it-works" anchor secondary) → Pain → New Monday (Split, vault image) → What Maya makes (5 ImgCards, vault images, video tile held for VIDEO-01) → Everything included (D3, 5 FCards + "Buy nothing twice") → Honest block → Pricing (`_pricing` source) → new FAQ (5 items) → CtaClose with body. New `SUITE_IMG` constant (7 vault jpgs from `public/images/ai-prompts/`), new `ImgCard` component, `CtaClose` got optional body prop, old "comes after the basics" section removed, metadata description updated in `app/join/studio/page.tsx`. Verified in browser preview: all sections render, all 7 images 200, all 4 checkout/anchor links correct, zero console errors, tsc clean, no new voice violations (em-dash flags are code comments only).
- Phases C-E: not started, unblocked.

---

# Appendix 1 — Email copy (APPROVED by Sandra 2026-06-11; 1.1-1.3 shipped in Phase A)

## 1.1 Membership welcome (new user)
**Subject:** You're in. Let's make your first photos today
**Eyebrow:** SSELFIE SUITE · **Title:** You're in

> Hey {firstName},
>
> Welcome to the SUITE. I'm so glad you're here.
>
> Here's the one thing to do today: meet Maya. She's your creative director. She already has looks pulled for you. You pick one, she shows you three concepts, and your first photos are done in minutes. No prompts to write. Nothing to figure out.
>
> [Panel — Your membership]
> 200 photos a month · every product I've ever made, included · cancel anytime
>
> [Button: Set your password] → then you land straight in your Studio.
>
> One promise before you start: these photos will look like you. Not a filtered stranger. AI should not erase you. It should frame you.
>
> Sandra

## 1.2 Membership welcome (existing user upgrading)
**Subject:** Your SUITE is open. Maya's ready when you are
**Eyebrow:** SSELFIE SUITE · **Title:** Everything just opened

> Hey {firstName},
>
> You're a member now. That changes what you have access to, so here's the short version:
>
> [Panel — Now included with your membership]
> Maya, your creative director, in the Studio app · 200 photos a month · the Prompt Vault, the Starter Kit, and the Masterclass, all open · everything new I make
>
> The thing I'd do first: open the app and pick a look. Maya shows you three concepts and your first photos are done in minutes.
>
> [Button: Open your Studio] → sselfie.ai/app
>
> Sandra

## 1.3 Day 0/2/7 — keep existing structure, two line edits
- Day 0: keep. Swap CTA target to `/app` (currently points at legacy).
- Day 2: keep, but replace the "quick-win prompt" panel with "pick a look, Maya pulls three concepts" (tap-first, not prompt-first).
- Day 7: keep, add one line: "Your gallery is yours. Everything you've made stays with you."

## 1.4 Trial unlock (appended to Vault/Starter Kit delivery flow)
**Subject:** A gift with your {product}: 7 days inside the SUITE
**Eyebrow:** SSELFIE SUITE · **Title:** Come meet Maya

> Hey {firstName},
>
> Your {product} is in your inbox. This email is something extra.
>
> The prompts you bought work anywhere. But inside my Studio, Maya already knows them by heart. She's a creative director who pulls the looks for you, keeps your face in every photo, and gets smarter the more you use her.
>
> So here's your gift: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.
>
> [Button: Claim your 7 days]
>
> Whatever you make is yours to keep, trial or not.
>
> Sandra

## 1.5 Trial day 5 ("2 days left")
**Subject:** 2 days left with Maya
> Short check-in: your trial ends {date}. If you've made photos you love, the SUITE is €97 a month, cancel anytime, and everything I've made is included. If it's not for you, that's honestly fine. Your photos stay yours either way.
> [Button: Keep your Studio]

## 1.6 Trial ended
**Subject:** Your trial ended. Your photos didn't
> Your 7 days are up, so photo-making is paused. Your gallery, your photos, and everything you own are still yours and still open. When you want Maya back: [Button: Join the SUITE]

---

# Appendix 2 — `/join/studio` rewrite copy (v2, Visual Brand Builder positioning — APPROVED by Sandra 2026-06-11, shipped in Phase B)

*Rewritten 2026-06-11 per Sandra's direction: Maya is a Visual Brand Builder, not an image generator. Pain points named, desires named, picture painted. Video deliberately excluded until VIDEO-01 ships (honesty note above).*

**2.1 Hero (dark, keep structure, image-led from `public/images/ai-prompts/`)**
Eyebrow: SSELFIE SUITE · €97/mo
H1: Your visual brand, built for you.
Body: Maya is the creative director in your pocket. She turns one selfie into full photoshoots, carousels, reel covers, and captions that sound like you. You show up every week. She does the heavy lifting.
CTA: Join SSELFIE SUITE · Secondary: See how it works (anchor)

**2.2 The pain (new section — name what she's living)**
H2: You already know you should be posting. That's not the problem.
Body: The problem is everything behind one post. You need a photo that doesn't look like a phone selfie. Words that don't sound like everyone else. A feed that looks like a brand and not a camera roll. A photographer every month isn't realistic. And the AI tools you've tried made you look like someone else, which is worse than not posting at all.
Closing line: Showing up shouldn't cost you a whole evening. Or your face.

**2.3 Paint the picture (light section — her new Monday)**
H2: Here's your new Monday.
Body: You open the app with your coffee. Maya already has three concepts pulled in your style: the photos, the reel cover, the caption. You tap the one that feels most like you. By the time your coffee's done, this week's content is too. You, looking like the brand you actually are. Every week.

**2.4 What Maya makes (Visual Brand Builder tiles, image-led)**
H2: One selfie in. A visual brand out.
Tiles:
- Full photoshoots — editorial-level photos that keep your face. *(tile copy: "Photoshoots", body: "Editorial photos from one selfie. Recognizably you, in every shot.")*
- Carousels — designed slides people save and share. *(body: "Designed to be saved. Your words, your colors, ready to post.")*
- Reel covers — your words on your photos, on brand. *(body: "Scroll-stopping covers with your hook line on them.")*
- Captions — in your voice, grounded in your brand. *(body: "Sounds like you wrote it on a good day.")*
- A plan — Maya tells you what to post today. *(body: "No more staring at a blank feed. She suggests, you tap.")*
*(+ "Videos" tile lands here the day VIDEO-01 Phase 1 ships — pre-written: "Bring this photo to life. Cinematic motion from a single shot.")*

**2.5 Everything included (D3)**
H2: The SUITE includes every product I've ever made.
Tiles: Maya + 200 photos a month · The Prompt Vault · $27 value · The Starter Kit · $37 value · The Masterclass · $147 value · Every new drop, every week
Line: Buy nothing twice. Members get all of it.

**2.6 The honest block (No-Fake doctrine, dark section)**
H2: These photos will look like you. That's the point.
Body: No filtered stranger. No "perfect" face that isn't yours. Maya works from your real selfies and keeps what makes you recognizable. AI should not erase you. It should frame you.

**2.7 Pricing**
€97/mo · 200 photos a month · everything included · cancel anytime, no forms

**2.8 FAQ (rewrite)**
- "Is this just another AI image generator?" → No. Image tools hand you a picture and leave. Maya builds the whole visual layer of your brand: photoshoots, carousels, reel covers, captions, and a plan for what to post. And she remembers your brand, so it gets easier every week.
- "What makes this different from ChatGPT?" → Same class of engine money can rent. What you can't rent is a creative director who already knows your brand. Maya remembers your style, your colors, what you said no to, and she keeps your face in every photo.
- "Will the photos actually look like me?" → Yes. That's the whole product. Maya works from your reference selfies. If something doesn't feel like you, you tell her and she remembers.
- "Do I need to learn prompts?" → No. You tap. Maya does the prompt work.
- "Can I cancel?" → Anytime, from your account, no forms. Your gallery stays yours.

**2.9 CTA close**
H2: Stop producing your brand alone.
Body: Maya's ready. Your first photoshoot is minutes away.
CTA: Join SSELFIE SUITE · €97/mo
