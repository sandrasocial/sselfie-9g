# Vault Maya Launch Pack

Status: BUILD COMPLETE (pending QA + Sandra's copy approval) — the email does not send until
Sandra approves the exact words.

Date: 2026-07-30

## Built and live-ready

- Stripe product `Vault Maya` with founder ($19/mo, price_1TyvCzEVJvME7vkw5U4pbv6H) and
  standard ($29/mo, price_1TyvD0EVJvME7vkwZnQOM44A) prices; env vars set locally + Vercel prod.
- Founder price flips automatically at 2026-08-06 21:59 UTC (VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT).
  Founders keep $19 because Stripe subscriptions stay on the price they started with.
- Checkout: /checkout/vault-maya (email capture → embedded Stripe). Fulfillment: subscription
  row product_type=vault_maya (never studio membership), 30 credits/month on invoice paid,
  top-ups work unchanged, Resend tag vault-maya.
- Access: getSuiteAccess level "vault" → generation allowed, full app NEVER unlocked;
  /app redirects vault members to /vault-maya/studio.
- Studio: /vault-maya/studio — selfie once, every collection (weekly drop featured) as
  tappable looks, ~30s generation via the frozen pipeline (vault prompt = verbatim scene
  foundation), save per photo, next-drop requests to Sandra (vault_maya_drop_requests table),
  SUITE bridge, add-to-home-screen hint.
- Offer page: /vault-maya (price-aware founder/standard). Vault access page shows a launch
  banner. Checkout success routes to the studio.

## v1.1 follow-ups (not blocking launch)

- Dedicated Vault Maya welcome email (buyers currently get Stripe receipt + success page).
- Free-form Maya chat inside the studio (v1 is Maya-voiced tap-to-create + request box).
- Admin digest of next-drop requests (rows are in vault_maya_drop_requests).

Decision record: Sandra approved build + same-day launch (no pre-sell). $19/mo founder price
for one week (founders keep $19 for life), then $29/mo. 30 photos/month, credit top-ups
available. All vault collections included, new drops weekly. Maya scoped to vault
recreations only. Next-drop requests included. Retire gate proposal: after 14 days,
<15 paying founders or <1/3 week-2 return → stop selling, existing founders keep access.

---

## 1. Offer page copy — SUPERSEDED (historical first draft; contains wording Sandra later
banned. The live page at /vault-maya carries her approved rewrite and is the only truth.)

**Eyebrow:** THE PROMPT VAULT, MADE FOR YOU

**Headline:** Maya makes your vault photos now.

**Subhead:** You know the vault. You copy a prompt, open ChatGPT, upload your selfie,
paste, wait, hope it still looks like you. Maya skips all of that. Upload your selfie
once.

**Section — what you get:**
- Every vault collection, ready to tap. No more copy and paste.
- My new drops, every week. You see them first, ready to wear.
- Your selfie, uploaded once. Maya remembers.
- 30 photos a month. Need more? Top up anytime.
- A smart gallery that keeps everything. Save all with one tap.
- Tell me what to create next. Send Maya a message or an inspo image, and I'll make
  the next drop for you.

**Section — why this beats pasting into ChatGPT:**
This is my style, my shoots, my lighting — the looks you bought the vault for, made on
you by the engine I built for it. ChatGPT gives you a photo. Maya gives you my photo,
of you.

**Price block:**
FOUNDER PRICE · $19/month — this week only. Founders keep $19 for as long as they stay.
After [DATE +7 days] it's $29/month. Cancel anytime.

**CTA:** START WITH ONE SELFIE

**Reassurance line:** Your face stays your face. Maya doesn't change you — she frames you.

**Bridge (footer, quiet):** Want Maya to create from your own ideas, plan your feed, and
write your captions? That's SSELFIE SUITE.

[SANDRA: needs 6-12 of your own vault shots for the page — fresh ones from your Stories
folder are ideal. The page shows the looks on YOU.]

---

## 1b. Full-list launch plan (Sandra's call 2026-07-30: entire list except SUITE)

Verified segment counts (Neon, 2026-07-30, deduped across freebie + blueprint + imported
subscribers; Resend broadcast suppression removes unsubscribes on top of these):

- Total unique list: 8,460
- Excluded (active SUITE members + trials + bundle passes): 18
- Buyers segment (gets the buyer email, sent first): 88
- Non-buyer segment (gets the intro email): 8,358

Sequence (Claire Pelletreau coordinated-send pattern, all sends need Sandra's approval):
- Day 0 morning: buyers email to the 88 (script, personal).
- Day 0 afternoon: full-list announce via Resend BROADCAST (unsubscribe link + suppression
  built in — never the per-email script for the big list).
- Day 3: proof send — Sandra's own before/after from this week's drop.
- Day 6: honest close — founder price ends tomorrow, then $29 for new members.
- If approval lands later than Day 0 = 2026-07-31, shift VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT
  so the list gets a real week (one-line change in lib/launch/cash-launch-pricing.ts +
  redeploy).

### Non-buyer email draft (intro version — voice pass 2026-07-30, outcome-first, no
ChatGPT-failure framing, no banned fragments)

**Subject options:**
1. The easiest way to create AI photos that still look like you
2. Add a selfie. Choose a look. Maya does the rest.
3. Meet Vault Maya

**Body:**

Hi [name],

For months I've been sharing my AI photo prompts — full shoots that thousands of women
use to create beautiful, realistic photos of themselves.

But I wanted to make the whole experience even easier. No prompts to copy. No ChatGPT.
Nothing to figure out.

It's called Vault Maya. You add your selfie once. Every one of my looks shows up ready
to create. Tap the one you love, and Maya creates the photo. Still completely you.

New drops land every Monday, and you can request the looks you want to see next.

30 photo creations a month. Founder price: $19/month, this week only. Join now and you
keep $19 for as long as your membership stays active. After that it's $29/month for new
members.

[BUTTON: CREATE MY FIRST PHOTO → https://sselfie.ai/vault-maya?utm_source=email&utm_medium=launch&utm_campaign=vault_maya_launch_list]

If you have questions, just reply — a real person answers. Usually me 🤍

Sandra

## 2. Launch email draft — to commerce buyers (88 after member exclusion: vault, starter kit, presets, bundle)

**Subject options (pick one):**
1. I made the Prompt Vault even easier
2. Your Vault looks, created for you
3. Meet Vault Maya

**Body (voice pass 2026-07-30 — outcome-first, protects the Prompt Vault):**

Hi [name],

You have my prompts, so you know how good the photos can be.

I created the Prompt Vault to give you the exact prompts. But I wanted to make the
whole experience even easier. Now you don't need to copy anything or figure out what to
type. You choose the photo you want, and Maya creates it for you.

You add your selfie once. Every Vault look shows up ready to create. Tap the one you
love, and Maya creates the photo. Still completely you.

New drops land every Monday, and you can request the looks you want to see next.

30 photo creations a month. Founder price: $19/month, this week only. Join now and you
keep $19 for as long as your membership stays active. After that it's $29/month for new
members.

[BUTTON: CREATE YOUR FIRST PHOTO → https://sselfie.ai/vault-maya?utm_source=email&utm_medium=launch&utm_campaign=vault_maya_launch]

And your Prompt Vault isn't going anywhere — it's yours forever. Vault Maya is simply
the easier way to create the same looks.

Sandra

---

## 3. Copy compliance notes (updated 2026-07-30 after Sandra's voice correction)

- Lead with the outcome (beautiful, realistic photos she feels confident posting), never
  the process or the technology.
- Never weaken the Prompt Vault or lead with ChatGPT failure. Vault Maya = the easier way
  to create the looks, not a fix for a bad product.
- Banned fragments: "stranger with your haircut", "my style, your face", "ready to wear",
  "the engine I built", "she frames you", and similar clever copywriting fragments.
- Likeness honesty: "AI can never be perfect every single time, but keeping you
  recognisable is at the heart of everything I've built."
- Truthful urgency only: the $19→$29 rise is real and enforced in Stripe on the dated
  switch. Founder framing always says "for as long as your membership stays active".
- State price + cancellation once per surface, not repeated.
- No income promises anywhere. Support line: a real person answers, usually Sandra.

## 4. Open items for Sandra (updated 2026-07-30 after full-list decision)

1. Approve/edit BOTH emails above (buyer version + non-buyer intro version) and pick
   subject lines. Nothing sends before this.
2. Confirm Day 0 (proposal: 2026-07-31). If later, I shift the founder price flip so the
   list gets a real week.
3. DONE: offer page rebuilt with Sandra's own copy, truth-passed, live counts.
4. DONE: studio restyled + "Your photos" gallery added; welcome email built, unit-tested,
   [TEST] copy sent to Sandra's inbox; checkout + Stripe descriptions truth-passed.

## 5. Measurement plan (replaces the old auto-retire gate, per Sandra 2026-07-30)

No automatic stop. Each funnel stage is read separately, weekly, and retirement is
Sandra's decision only after at least two mature cohorts:

1. **Acquisition** — email opens/clicks → /vault-maya visits → checkout starts
   (analytics events + Stripe sessions). Weak → messaging/traffic work, not retirement.
2. **Checkout conversion** — checkout starts → paid founders (stripe_payments,
   product_type vault_maya). Weak → checkout UX/pricing work.
3. **Activation** — % of founders who add a selfie AND create ≥1 photo within 48h of
   joining (user_avatar_images + ai_images per user). Weak → onboarding email/UX work.
4. **Photo acceptance** — creations per active member, automatic-refund (failure) rate,
   re-creation behavior, and qualitative replies. Weak → likeness QA before anything else.
5. **Retention (cohort-based, not calendar)** — a member counts as week-2 retained if she
   creates ≥1 photo in days 8–14 of HER OWN membership. Renewal rate is only read after a
   cohort passes day 30. No verdicts on immature cohorts.
