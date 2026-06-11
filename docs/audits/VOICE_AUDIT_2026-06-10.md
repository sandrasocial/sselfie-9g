# Voice Audit · 2026-06-10
*User-facing copy audit against: Sandra's voice rules (CLAUDE.md), the No-Fake AI Brand Psychology doctrine (`docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`), and the Studio → SSELFIE SUITE rename.*

**Read-only audit. No app code was changed. All rewrites below are proposals for Sandra's approval.**

Method note: em-dashes hide in three forms in this codebase: the literal `—` character, the `—` escape (`post-activation-upgrade.ts`, `dormant-member-reengagement.ts`), and the `&mdash;` HTML entity (`free-user-day10.ts`, `free-user-day5.ts`, `welcome-first-generation-followup.ts`, `win-back-day7.ts`, `win-back-day14.ts`). Future lint checks must catch all three.

---

## Summary

| Violation type | P0 (money page / live email) | P1 (other customer-facing) | P2 (admin / internal / dead code) | Total |
|---|---|---|---|---|
| Em-dash in customer copy | ~95 instances across 24 email templates + 2 money pages | ~14 instances (member UI, metadata, toasts) | ~15 (dead `landing-page-new.tsx`, placeholders) | ~124 |
| Banned word | 1 ("transform your photo", Starter Kit hero) | 2 ("transform it" FAQ, "game-changer" in live Maya prompt) | 8 ("Game changer" x2 in dead template, "leverage" x5 + 1 in Maya internal prompts) | 11 |
| No-Fake doctrine | 0 | 1 structural gap (Maya voice prompt has no doctrine rules) | 3 (dead carousel caption, image-prompt aesthetics) | 4 |
| Stale naming (Studio → SSELFIE SUITE) | ~25 instances (join page, homepage ladder, checkout, 10 live emails) | ~20 instances (member app UI, auth, academy, bio) | ~12 (footers as company name, admin, dead files) | ~57 |
| Voice / tone | 0 | 1 (Maya feed example response) | 1 (entire `welcome-sequence.ts`, appears dead) | 2 |

Headline: **the No-Fake doctrine is in good shape on live surfaces** (the Prompt Vault funnel and Selfie to Brand Shoot emails actively use "recognizable beats perfect" framing). The big debts are **em-dashes in nearly every email template**, **"Studio" naming everywhere the customer pays or gets billed**, and **Maya's core voice prompt missing the binding language rules**.

---

## P0 findings (money pages + live emails) — with rewrites

### A. Money pages

**A1. `app/checkout/membership/membership-checkout-client.tsx:35`** · stale-naming
> "SSELFIE Studio" (page header on the membership checkout)
Rewrite: `SSELFIE SUITE`

**A2. `app/checkout/membership/membership-checkout-client.tsx:81`** · em-dash
> "per year — {annualMonthly}/mo"
Rewrite: `per year · €80.83/mo`

**A3. `app/prompt-vault/page.tsx:527`** · em-dash
> "The Vault includes the complete shoot direction — the mood, styling, setting, feeling, and full shot sequence."
Rewrite: `The Vault includes the complete shoot direction: the mood, styling, setting, feeling, and full shot sequence.`

**A4. `app/join/studio/page.tsx:5` + `components/sselfie/public-marketing.tsx` `StudioPageContent` (lines 1166-1216)** · stale-naming (~10 instances)
> "Join Studio | SSELFIE" (metadata) · "Studio · €97/mo" (eyebrow) · "Join Studio" (2 CTAs) · "Inside Studio" · "Studio comes after the basics." · "join Studio" · "Join Studio · €97/mo" · FAQ "Who is Studio for?"
Rewrites: `Join SSELFIE SUITE | SSELFIE` · `SSELFIE SUITE · €97/mo` · `Join the SUITE` · `Inside the SUITE` · `The SUITE comes after the basics.` · `Who is the SUITE for?`
Note: keep the `/join/studio` route working. Only the visible copy changes.

**A5. `components/sselfie/public-marketing.tsx` HomePageContent** · stale-naming
- Line 750: path step `{ step: "04", title: "Studio", body: "Create and execute." }` → `title: "SUITE"`
- Line 784: offer ladder card `{ title: "Studio", price: "€97/mo", ... }` → `title: "SSELFIE SUITE"`
- Line 385 + 425 + 456 (nav): "Studio" nav label → `SUITE`
- Lines 675-676 (Masterclass FAQ): "How is this different from Studio?" / "...Studio is the AI layer..." → `How is this different from the SUITE?` / `...the SUITE is the AI layer...`
- Line 1155: secondary CTA "See Studio" → `See the SUITE`

**A6. `components/sselfie/public-marketing.tsx:893`** (Starter Kit hero, money page) · banned-word
> "Before you ask ChatGPT, Gemini, or any AI tool to transform your photo, you need a strong original image."
Rewrite: `Before you ask ChatGPT, Gemini, or any AI tool to restyle your photo, you need a strong original image.` (Also doctrine-stronger: "to build a brand shoot around your photo".)

### B. Live email templates (lifecycle + transactional)

All of these are wired into live crons (`onboarding-sequence`, `win-back-sequence`, `blueprint-followup-sequence`, `nurture-sequence`) or transactional sends (webhooks). Subjects first since they're the highest-visibility strings.

**B1. Subject lines with em-dashes / stale naming:**

| File:line | Current subject | Rewrite |
|---|---|---|
| `onboarding-day-0.tsx:61` | "Welcome to Studio — let's get your first result today" | "Welcome to the SUITE. Let's get your first result today" |
| `onboarding-day-2.tsx:59` | "Your first shoot is waiting — let's make it feel like you" | "Your first shoot is waiting. Let's make it feel like you" |
| `onboarding-day-7.tsx:59` | "You're building your brand beautifully — keep showing up" | "You're building your brand beautifully. Keep showing up" |
| `payment-failed.tsx:16` | "Payment failed — update your card to keep access" | "Payment failed: update your card to keep access" |
| `payment-recovery.tsx:15` | "Quick heads up — your payment didn't go through" | "Quick heads up: your payment didn't go through" |
| `blueprint-followup-day7.tsx:40,72` | "One week in — what's next?" / "One week in — here's what comes next" | "One week in: what's next?" / "One week in: here's what comes next" |
| `academy-product-delivery.ts:184` | "`${copy.eyebrow} — you're in`" | "`${copy.eyebrow}: you're in`" |
| `welcome-first-generation-followup.ts:14` | "your 2 free photos are inside — try one now" | "your 2 free photos are inside. Try one now" |
| `subscription-ending-soon.tsx:16` | "Your Studio access is ending soon" | "Your SUITE access is ending soon" |

**B2. Stale naming in live email bodies (Studio → SSELFIE SUITE):**

| File | Offending text | Rewrite |
|---|---|---|
| `welcome-email.tsx:54,59,79,84,90` | "Open Studio" · "Studio is ready for you now." · eyebrow "Studio Membership" | "Open the SUITE" · "The SUITE is ready for you now." · "SSELFIE SUITE" |
| `win-back-day3.ts:59,128` | "I noticed you cancelled your Studio membership a few days ago." | "I noticed you cancelled your SUITE membership a few days ago." |
| `free-user-day10.ts:84,129` | "Join Studio — €97/month" (button + text) | "Join SSELFIE SUITE · €97/month" |
| `post-activation-upgrade.ts:27,28,31,45,47` | "The Studio gives you 200 credits every month — ..." · "Join Studio — €97/month" · "Studio just keeps it going." | "The SUITE gives you 200 credits every month. That's roughly 100 brand photos." · "Join SSELFIE SUITE · €97/month" · "the SUITE just keeps it going." |
| `dormant-member-reengagement.ts:17,18,33` | "waiting in your Studio." · "You're a Studio member." | "waiting in your SUITE." · "You're a SUITE member." |
| `subscription-ending-soon.tsx:37,45,72` | "Your Studio access is ending soon" · "Your current Studio access..." | "Your SUITE access..." |
| `credit-renewal.tsx:64,115` | "Your credits are waiting in The Studio" | "Your credits are waiting in the SUITE" |
| `blueprint-followup-day7.tsx:25,54` | "Studio gives you the AI that makes showing up feel lighter..." | "The SUITE gives you the AI that makes showing up feel lighter..." |
| `onboarding-day-0.tsx` (body refs) | "Welcome to Studio" framing | "Welcome to the SUITE" |
| `paid-blueprint-delivery.tsx:102,138` | footer "SSELFIE Studio · Fauskevegen 121..." | Sandra to decide: keep "SSELFIE Studio" as legal/company name or move to "SSELFIE" |

**B3. Em-dashes in live email bodies.** Full list (every instance needs the same treatment: period, colon, or middle dot). Counts are customer-visible instances (HTML + text part):

| File | Count | Sample + rewrite |
|---|---|---|
| `win-back-day3.ts` | 9 | "I think I know why — and it's on me, not you." → "I think I know why. And it's on me, not you." · "Not a bot, not a team — me." → "Not a bot, not a team. Me." · "still curious — the door is open" → "still curious: the door is open" |
| `win-back-day7.ts` | 6 | "first brand photo in under 2 minutes — without having to read a tutorial" → "...in under 2 minutes. No tutorial, no settings to figure out." · "Maya now remembers your sessions — so you don't have to..." → "Maya now remembers your sessions, so you don't have to..." |
| `win-back-day14.ts` | 4 | "Real photos, real you — not a stock image" → "Real photos, real you. Not a stock image, not an AI that looks like a stranger." |
| `brand-strategy-paid-delivery.ts` | 7 | List bullets use "—" as the bullet glyph → switch to "·". "Bookmark the link — it's yours to keep forever." → "Bookmark the link. It's yours to keep forever." |
| `paid-blueprint-delivery.tsx` | 6 | "caption framework — all mapped out" → "caption framework, all mapped out". "Step 1 — Open your Feed Planner" → "Step 1: Open your Feed Planner" (steps 2, 3 same). |
| `blueprint-followup-day7.tsx` | 4 | "The Reset gives you the plan — the what to post and when." → "The Reset gives you the plan: the what to post and when." |
| `blueprint-followup-day3.tsx` | 2 | "They pick a theme for the week — one story they want to tell — and let the captions flow" → "They pick a theme for the week, one story they want to tell, and let the captions flow." |
| `academy-product-delivery.ts` | 7 | "the message is unclear — not because the product is wrong" → "the message is unclear, not because the product is wrong." · "Five usable photo ideas — no photographer needed." → "Five usable photo ideas. No photographer needed." |
| `free-user-day5.ts` | 4 | "I wanted to check in — did you get a chance..." → "I wanted to check in. Did you get a chance..." · "If you haven't yet — no judgement" → "If you haven't yet, no judgement." |
| `free-user-day10.ts` | 4 | "If that's something you want — the door's open." → "If that's something you want, the door's open." |
| `payment-recovery.tsx` | 5 | "It happens — cards expire, banks flag things." → "It happens. Cards expire, banks flag things." · "If you've decided to pause for now — no hard feelings" → "...for now, no hard feelings at all." |
| `selfie-guide-day14-maya-bridge.ts` | 4 | Button "Get the Starter Kit — $37" → "Get the Starter Kit · $37" (button labels must never carry em-dashes) |
| `shopify-migration-welcome.tsx` | 6 | "this has been confusing — and that's on me." → "this has been confusing, and that's on me." · Signature "— Sandra" → "Sandra" on its own line (or "· Sandra") |
| `welcome-first-generation-followup.ts` | 3 | "You signed up for SSELFIE — and you've got 2 free photos waiting" → "You signed up for SSELFIE, and you've got 2 free photos waiting." |
| `brand-strategy-setup-notification.ts` | 2 | "don't sit on it too long — the sooner you do it..." → "don't sit on it too long. The sooner you do it, the sooner your strategy is live." |
| `prompt-vault-launch-broadcast.ts` | 3 | Draft (Sandra approval pending anyway): "GET THE VAULT — $27" → "GET THE VAULT · $27" · "Four full editorial photoshoot directions — the mood..." → "...directions: the mood, the styling, the setting..." |
| `post-activation-upgrade.ts` | 3 (`—`) | See B2 row above. |

---

## P1 findings (customer-facing, not money pages) — with rewrites

**Member app UI (Studio naming + em-dashes):**

1. `components/sselfie/sselfie-app.tsx:926` · stale-naming · "Included with Studio membership" → `Included with SSELFIE SUITE`
2. `components/sselfie/sselfie-app.tsx:588` · stale-naming · "Available with Studio membership." → `Available with SSELFIE SUITE.`
3. `components/sselfie/sselfie-app.tsx:1078` · em-dash · "Get credits and let's get it done — it takes under 2 minutes." → `Get credits and let's get it done. It takes under 2 minutes.`
4. `components/sselfie/sselfie-app.tsx:1104` · em-dash + stale-naming · "Get Studio to keep generating — 200 credits every month." → `Get the SUITE to keep generating: 200 credits every month.`
5. `components/credits/zero-credits-upgrade-modal.tsx:96,107` · em-dash + stale-naming · "join Studio when you want..." and button "Join Studio — 200 credits/mo" → `Join SSELFIE SUITE · 200 credits/mo`
6. `components/upgrade/upgrade-modal.tsx:103,126` · em-dash + stale-naming · "{targetCredits} credits a month — that's..." → comma; "Yes, join Studio" → `Yes, join the SUITE`
7. `components/UpgradeOrCredits.tsx:50,96` · stale-naming · "Upgrade to Studio Membership to unlock {feature}..." → `Upgrade to SSELFIE SUITE for {feature} and everything else.`
8. `components/sselfie/maya/maya-training-tab.tsx:172` · stale-naming · "Join Studio for Monthly Credits →" → `Join the SUITE for Monthly Credits →`
9. `components/sselfie/academy-screen.tsx:734,812` · stale-naming · "Monthly drops are part of Studio membership." / "Flatlay packs are included with Studio membership." → `...part of SSELFIE SUITE.` / `...included with SSELFIE SUITE.`
10. `components/sselfie/maya-chat-screen.tsx:2588` · em-dash · toast "Perfect — using your linked selfies" → `Perfect. Using your linked selfies`
11. `components/sselfie/post-purchase-welcome-modal.tsx:13,23` · em-dash · "Tell Maya what to create — she already knows your brand." → `Tell Maya what to create. She already knows your brand.` · "Start with Day 1 — five minutes that will change how you show up..." → `Start with Day 1: five minutes that change how you show up on camera.`
12. `app/auth/sign-up-success/page.tsx:35` · stale-naming · "join Studio when you are ready for Maya" → `join the SUITE when you're ready for Maya` (also: "when you are" → "when you're", contractions rule)
13. `app/layout.tsx:162` · stale-naming · structured data `name: "Studio Membership"` (visible in search results) → `SSELFIE SUITE`
14. `app/bio/page.tsx:158` · stale-naming · "Join SSELFIE Studio" → `Join SSELFIE SUITE`
15. `app/academy/_lib/course-library.ts:391,445` + `app/academy/success/page.tsx:297` · stale-naming · ctaLabel "Join Studio" / "→ Join Studio" → `Join the SUITE`
16. `components/prompt-guides/prompt-guide-page-client.tsx:174,189` · stale-naming · "Get SSELFIE Studio" / "Join Studio" → `Get SSELFIE SUITE` / `Join the SUITE`
17. `components/referrals/referral-dashboard.tsx:60` · stale-naming · "Join SSELFIE Studio" → `Join SSELFIE SUITE`
18. `app/api/training/start/route.ts:76` + `app/api/training/upload-zip/route.ts:145` · stale-naming · error copy "Buy credits or join Studio for monthly credits." → `Buy credits or join the SUITE for monthly credits.`
19. `app/api/studio/generate/route.ts:57` · stale-naming · "requires an active Studio Membership" → `requires an active SSELFIE SUITE membership`
20. `app/selfie-guide/page.tsx:5,9,25` · em-dash · metadata title "Free Guide — Your First Visible Post" → `Free Guide: Your First Visible Post`
21. `app/academy/visibility-plan/[token]/page.tsx:192,246,297,352` · em-dash · section labels "01 — Message" etc. → `01 · Message`
22. `app/academy/access/visibility-suite/page.tsx:416` · em-dash · "— {product.included[0]}, and more." → `· {product.included[0]}, and more.`
23. `app/academy/courses/.../lesson-viewer-client.tsx:599` · em-dash · "✓ Saved — Maya will use this in every session." → `✓ Saved. Maya will use this in every session.`
24. `app/checkout-upgrade` and `components/checkout/success-content.tsx:77` · naming check · "SSELFIE Edit Studio — Starter Pack" → `SSELFIE Edit Studio · Starter Pack` (em-dash; "Edit Studio" is a different product name, naming itself is fine unless Sandra says otherwise)

**Maya engine (shapes live customer-visible chat):**

25. `lib/maya/feed-planner-context.ts:88` · banned-word + voice-tone · Example response Maya is told to imitate: "YES! 😍 ... This is going to be such a game-changer for your personal brand!" — imported by the live `app/api/maya/chat/route.ts`. Rewrite the example: `"Love this. Let's build a ${count}-post feed that matches your edgy, minimalist aesthetic. Here's the plan..."` (no "game-changer", no 😍, calmer energy).
26. `lib/maya/core-personality.ts` (`MAYA_VOICE`) · no-fake gap + em-dash gap · The voice block has warmth rules but **none of the binding language rules**: no em-dash ban, no banned-word list, and none of the No-Fake doctrine framings ("keeps your face", "AI-assisted", never imply viewers are fooled). Only `app/api/app-v3/maya/recommendations/route.ts:119` has the em-dash rule. Proposal: add a short "Language rules (never break)" section to `MAYA_VOICE` mirroring the doctrine: never the long dash, never "leverage / game-changer / skyrocket / transform", never imply anyone is fooled, always "keeps your face / made from you" framing.
27. `components/sselfie/public-marketing.tsx:660` · banned-word · FAQ answer "...before you ask any AI tool to transform it." → `...before you ask any AI tool to restyle it.`

---

## P2 list (admin-only, internal prompts, or dead code — no rewrites needed)

- `lib/email/templates/welcome-sequence.ts` · voice-tone + banned-word + stale-naming · "This is going to change everything. 🚀", "Game changer for engagement" (x2), "XoXo Sandra 💋", "Where Visibility Meets Financial Freedom", "Join SSELFIE Studio". **Appears dead**: registered at `/api/cron/welcome-sequence` in `lib/cron/ownership.ts` but no such route exists in `app/api/cron/`, and no other caller found. Recommend deleting the template (and the stale ownership entry) so this voice never ships by accident.
- `components/sselfie/landing-page-new.tsx` · ~12 em-dashes + Studio naming · not imported anywhere (homepage uses `landing-page-education.tsx`). Dead; candidate for deletion after Dead Code Map review.
- `components/sselfie/maya-styles-carousel.tsx:102` · no-fake ("Luxury lifestyle content done right") · only used by `interactive-pipeline-showcase.tsx`, which itself has no importers. Dead.
- `lib/maya/studio-pro-system-prompt.ts:105,107,151,208,399,917` · "leverage" x6 · internal instructions to Maya, not shown to users, but risks Maya mirroring the word. Low-priority cleanup alongside finding 26.
- `lib/maya/prompt-templates/**` "luxury lifestyle" (~25 hits), `tech-brands.ts:259` "perfect face lighting" · these are image-model prompt aesthetics, not customer copy. Out of copy scope, but worth a doctrine pass when Maya prompt templates are next touched ("luxury lifestyle" as an aesthetic descriptor vs a claim about her).
- `app/admin/**` (e.g. `admin/prompt-vault`, `admin/daily-briefing`) · "TOP VIEWED TRANSFORMATIONS", briefing copy with "transformation" · admin-only, Sandra's own dashboards. "Transformation" as a noun is in Sandra's own vocabulary; no action.
- `components/admin/admin-nav.tsx:33` "SSELFIE STUDIO" · admin-only.
- Footer company lines: "© 2026 SSELFIE Studio" (`public-marketing.tsx:469`, `landing-page-new.tsx:969`, `strategy/[token]:494`, `brand-strategy-landing.tsx:183`, `selfie-guide-paid-landing.tsx:189`, `paid-blueprint-delivery.tsx:102,138`) · "SSELFIE Studio" may remain the legal/company name even after the SUITE product rename. **Needs one decision from Sandra**, then apply everywhere at once.
- `components/app-v3/account-view.tsx:148` · "—" as an empty-credits placeholder glyph · display dash, not prose; acceptable, optionally swap to "·".
- `app/api/access-recovery/route.ts:41` · product label "SSELFIE Studio" in recovery email mapping · update alongside Batch 2.

---

## Appendix: feed-planner (protected — do not edit yet)

Found inside protected dirs (`app/feed-planner`, `app/api/feed*`, `lib/feed-planner`, `components/feed-planner`). Listed for the future Feed Planner cleanup only:

- `components/feed-planner/free-mode-upsell-modal.tsx:89` · stale-naming · "Join Studio" option label.
- `components/feed-planner/feed-single-placeholder.tsx:663` · comment only ("routes to current Studio membership checkout") · no customer impact.
- `app/api/feed/[feedId]/enhance-caption/route.ts:145` · not a violation: it's an instruction to *kill* AI phrases including "game-changer". Doctrine-aligned; keep.
- `lib/maya/feed-generation-handler.ts` · shared, do not touch (per CLAUDE.md).

---

## Batch plan (ordered by customer impact)

**Batch 1 — Money pages (smallest diff, highest traffic).**
Findings A1-A6. Files: `membership-checkout-client.tsx`, `app/prompt-vault/page.tsx`, `app/join/studio/page.tsx`, `components/sselfie/public-marketing.tsx` (Studio naming + 2 banned-word fixes), `app/layout.tsx` structured data. One PR, copy-only, Sandra approves the SUITE strings once and they apply everywhere.

**Batch 2 — Live email templates.**
All B1 subjects first, then B2 naming, then B3 em-dashes. ~20 template files, copy-only. Include `app/api/access-recovery/route.ts:41`. Test by rendering each template (HTML + text part) and grepping the output for `—`, `—`, `&mdash;`, and `Studio `.

**Batch 3 — Member app UI.**
P1 findings 1-24: lock messages, upgrade modals, toasts, academy labels, auth success, metadata titles. Copy-only; no route or logic changes.

**Batch 4 — Maya engine language + dead code.**
(a) Add the binding language rules to `MAYA_VOICE` in `lib/maya/core-personality.ts` and fix the `feed-planner-context.ts:88` example (findings 25-26); sweep "leverage" from `studio-pro-system-prompt.ts`. (b) Delete dead `welcome-sequence.ts` (+ its `lib/cron/ownership.ts` entry), `landing-page-new.tsx`, and `maya-styles-carousel.tsx` + `interactive-pipeline-showcase.tsx` after a Dead Code Map cross-check. (c) Add a CI grep that fails on `—`, `—`, `&mdash;`, "game-changer", "skyrocket", "leverage" in `lib/email/templates` and JSX string literals, so this audit doesn't need repeating by hand.
