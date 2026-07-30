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

## 1. Offer page copy — /vault-maya

**Eyebrow:** THE PROMPT VAULT, MADE FOR YOU

**Headline:** Maya makes your vault photos now.

**Subhead:** You know the vault. You copy a prompt, open ChatGPT, upload your selfie,
paste, wait, hope it still looks like you. Maya skips all of that. Upload your selfie
once. Tap a look. Your photo is ready in about 30 seconds — and it's still you.

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

### Non-buyer email draft (intro version — same voice, one extra beat)

**Subject options:**
1. Maya makes the photo now. You just tap.
2. One selfie. Thirty seconds. Still you.
3. My vault shoots, made on you

**Body:**

Hi [name],

Quick story. For months I've been sharing my AI photo prompts — full shoots you paste
into ChatGPT with a selfie. Thousands of women use them. And I kept hearing the same
thing: it works, but some days ChatGPT hands you a stranger with your haircut.

So I built something better.

It's called Vault Maya. You upload your selfie once. Every one of my shoots shows up as
looks you just tap. Thirty seconds later the photo is there. My style. Your face. Still
you.

New drops land every Monday. And you can tell Maya what I should shoot next — your idea
can be the next drop.

30 photos a month. $19/month founder price, this week only. Founders keep $19 for as
long as they stay. Next week it's $29 for new members.

[BUTTON: MAKE MY FIRST PHOTO → https://sselfie.ai/vault-maya?utm_source=email&utm_medium=launch&utm_campaign=vault_maya_launch_list]

One selfie. That's the whole setup.

Sandra

## 2. Launch email draft — to commerce buyers (88 after member exclusion: vault, starter kit, presets, bundle)

**Subject options (pick one):**
1. Maya can make your vault photos now
2. Stop pasting my prompts into ChatGPT
3. Your vault just started working for you

**Body (voice pass 2026-07-30 — matches the live landing page):**

Hi [name],

You bought my prompts. So you know the routine. Copy, open ChatGPT, upload the selfie,
paste, wait. And some days it still hands you a stranger with your haircut.

I built something better.

Vault Maya. You upload your selfie once. Every vault collection shows up as looks you
just tap. Thirty seconds later the photo is there. My style. Your face. Still you.

New drops land every Monday. And you can tell Maya what I should shoot next — your idea
can be the next drop.

30 photos a month. $19/month founder price, this week only. Founders keep $19 for as
long as they stay. Next week it's $29 for new members.

[BUTTON: MAKE MY FIRST PHOTO → https://sselfie.ai/vault-maya?utm_source=email&utm_medium=launch&utm_campaign=vault_maya_launch]

One selfie. That's the whole setup.

Sandra

---

## 3. Copy compliance notes

- No-Fake doctrine: "still you", "your face stays your face", "she frames you" — no
  "no one will know", no face-change promises. Face-comparison phrasing banned per
  copy rule — avoided.
- Truthful urgency only: the $19→$29 rise is real and will be enforced in Stripe on the
  dated switch. No fake scarcity claims.
- No income promises anywhere.
- Sandra Test: short sentences, coffee-table voice, one clear next step (one selfie).

## 4. Open items for Sandra (updated 2026-07-30 after full-list decision)

1. Approve/edit BOTH emails above (buyer version + non-buyer intro version) and pick
   subject lines. Nothing sends before this.
2. Confirm Day 0 (proposal: 2026-07-31). If later, I shift the founder price flip so the
   list gets a real week.
3. Confirm retire gate — now scaled to the full-list launch: after 14 days, <40 paying
   founders or <1/3 back in week two → stop selling, founders keep access. (Old
   buyers-only gate was 15.)
4. DONE: offer page rebuilt in Sandra's voice inside the shared marketing system, live.
5. DONE: studio restyled to app design tokens + voice pass, live.
