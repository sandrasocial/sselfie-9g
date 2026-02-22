# SSELFIE MASTER BRIEF — All Agents
**Last Updated:** February 20, 2026
**Written by:** Claude Cowork (AI Director)
**Read by:** North, Stella, Codex, all sub-agents

---

## THE BUSINESS RIGHT NOW

Sandra is a solo founder. Single mom of 2 boys. 8 months building SSELFIE.
She has 30 paying members, 180K+ followers, a live app, and a complete product funnel already in code.

**Her goal:** Automated income. Freedom. Time with her boys.
**The current blocker:** The Academy funnel exists in code but has no checkout flow. It cannot accept money yet.

---

## THE FUNNEL (already built — just needs ACADEMY-02)

This is the Maria Wendt model Sandra wants. It's already in `lib/products.ts`:

| Product | Price | Stripe ID | Status |
|---------|-------|-----------|--------|
| What To Say | €17 | `STRIPE_PRICE_WHAT_TO_SAY` | ✅ Live in Stripe |
| Show Up | €27 | `STRIPE_PRICE_SHOW_UP` | ✅ Live in Stripe |
| Get Paid | €47 | `STRIPE_PRICE_GET_PAID` | ✅ Live in Stripe |
| Creator Studio (membership) | €97/month | In products.ts | ✅ Live |
| Brand Engine VIP | High ticket | Discovery call → close | 🔜 Active |

**Upsell chain (coded):**
What To Say → Show Up → Get Paid → Membership → Brand Engine VIP

ManyChat keywords trigger entry: `SAY` / `CONTENT` / `PAID`

---

## IMMEDIATE PRIORITY: ACADEMY-02

**What it is:** Checkout flow + Stripe webhook for the 3 Academy products
**What's done:** Tables created, Stripe prices live, access logic in `lib/academy-access.ts`
**What's needed:** Checkout route, payment confirmation, access grant, post-purchase experience

**This is the task that unblocks revenue. Everything else waits for this.**

See STATUS.md — Codex was about to start ACADEMY-02 before Vercel auth broke.

---

## THE APP: WHAT'S LIVE AND WHAT MATTERS

### Core features (confirmed live):
- Maya AI chat (`/studio`, `/maya`) — main user experience
- Feed Planner — live, full featured for members
- Credits system — working
- Membership billing via Stripe — working
- Academy tables + access logic — just built (Feb 20)
- Cron jobs: payment resolution, credit reconciliation, subscription sync

### Known issues to fix:
- **E-01:** DB shows 479 subscribers vs Resend shows 3,021 — logic mismatch
- **E-03:** 1,965 hard bounces in email list — needs cleaning
- **Vercel deploys:** UX-02 is done locally but NOT deployed (Vercel token expired)
- **Type-check failures:** pre-existing, not blocking production

### Do NOT touch without Sandra's approval:
- Pro Mode components (may be kept for future)
- Feed Planner (still active user journey)
- Admin pages marked "Sandra decides" in DECISIONS.md

---

## SANDRA'S BRAND VOICE (mandatory for all output)

**Tone:** Warm close friend. Never corporate. Never salesy.
**Style:** Short sentences. Conversational. Breathable. Contractions always.
**Voice doc:** `/docs/brand/VOICE_BIBLE.md` — read before any copy task
**DO/DON'T:** `/docs/brand/DO_DONT.md`
**Pillars:** `/docs/brand/MESSAGING_PILLARS.md`

**Forbidden words:** unlock / game-changer / level up / transform / elevate / synergy / robust solution / dear valued customer / leverage / cutting-edge / revolutionary / next level / crushing it / skyrocket

**QA gate before any send:** Voice match + Clarity + Emotional truth + Action clarity + Offer fit. Average ≥ 4.0, no category below 3.

---

## DESIGN SYSTEM (for any visual/HTML output)

**Colors only:** #0a0a0a / #ffffff / #f5f5f5 / #666666 / #e5e5e5
**Fonts only:** Cormorant Garamond (headers, UPPERCASE, weight 200–300) + Inter (body, weight 300)
**Aesthetic:** Scandinavian luxury. Minimal. Vogue editorial. Mobile-first (375px min).
**Layout:** 48px min padding. Asymmetric. Generous white space.

---

## AGENT RESPONSIBILITIES

| Agent | Owns | Never does without Stella/Sandra |
|-------|------|----------------------------------|
| Codex | Code changes, deploys, GitHub | Product direction, pricing changes |
| North | Operations, automation, monitoring, WhatsApp comms | Product decisions |
| Stella | Product, copy, voice, strategy decisions | Technical execution |
| Claude Cowork | Direction, briefing, coordination | Nothing — coordinates only |

**Sandra:** CEO. Makes yes/no decisions on product, pricing, positioning.

---

## THE CONTENT STRATEGY

### Platform priorities:
- **Instagram:** Carousels (save-worthy, 7–10 slides), Reels (3x/week), Stories (daily)
- **TikTok:** 30–90 sec, watch time above all, first 3 seconds critical
- **Email:** Resend only. Check audience targeting before EVERY broadcast.

### Content pillars:
1. Visibility = wealth
2. Your phone is enough (no expensive photoshoot)
3. Financial independence for women
4. Authentic presence over perfection
5. AI levels the playing field

### ManyChat integration:
- Keywords `SAY` / `CONTENT` / `PAID` trigger Academy product DMs
- This is the paid ads → DM → purchase automation Sandra wants

---

## WHAT SANDRA NEEDS FROM AGENTS

She does NOT want to:
- Copy-paste between tools
- Decide what to do every day
- Manage deployments herself
- Write all her own content

She DOES want:
- Morning WhatsApp with her ONE priority
- Tech to just work without her involvement
- Content drafted and ready for her approval
- Revenue coming in while she's with her boys

---

## CURRENT STATUS (Feb 20, 2026)

✅ Agent team configured and aligned
✅ Gateway running
✅ WhatsApp connected
✅ Academy products in Stripe
✅ Academy DB tables created
⏳ ACADEMY-02 (checkout) — next task for Codex
⏳ Vercel auth fix — needed for UX-02 deploy
⚠️ E-01 subscriber count mismatch — monitor
⚠️ E-03 hard bounces — clean before next broadcast
