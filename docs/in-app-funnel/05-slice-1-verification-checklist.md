# Slice 1 Verification Checklist

**Date:** 2026-02-25  
**Purpose:** Post-implementation QA for Slice 1 (Maya guided path, Academy "You Have Access", post-purchase redirect, Feed Planner wizard). Use this after each deploy or before marking Slice 1 "done."

**Build:** Run `npm run build` — expect exit code 0. (Verified 2026-02-25.)

---

## 1. Maya First-Generation Guided Path (A-01)

| Check | How to verify | Pass |
|-------|----------------|------|
| Gate: bonus credits, no image spend | Log in as user with `credit_transactions.transaction_type = 'bonus'` and no `image` spend. Open Maya → 3-step overlay should appear. | ☐ |
| Step 1: Choose style | Style grid (Casual/Editorial/Luxury/Lifestyle or top prompts) visible; selection advances to step 2. | ☐ |
| Step 2: Classic vs Pro | Mode choice with short copy; Pro path allows upload then "Generate Now"; Classic allows one-tap generate. | ☐ |
| Step 3: Result + Photoshoot CTA | After generation, result screen shows image and prominent "Photoshoot — Create 6–9 photos in this style" button. | ☐ |
| Analytics | In GA4 or analytics client: `first_generation_guided_start` when flow shows; `first_generation_guided_complete` with `mode` when user completes. | ☐ |
| No regression | User who already has image spend does **not** see the overlay when opening Maya. | ☐ |

**Optional:** `FEATURE_NEW_WELCOME_FLOW=true` (or `1`) controls eligibility; if unset, existing 24h + no-generation logic may apply.

---

## 2. Academy "You Have Access" (C-01)

| Check | How to verify | Pass |
|-------|----------------|------|
| My-products fetch | As user with at least one Academy purchase (What To Say, Show Up, Get Paid, AI Photo Prompts), open Studio → Academy tab. "YOU HAVE ACCESS" row appears with correct product cards. | ☐ |
| Card copy | Each card shows headline + sub-text + CTA from `docs/in-app-funnel/02-content-copy-2026-02-25.md` §1. | ☐ |
| Deep links | What To Say → Feed Planner tab; Show Up → Maya tab; Get Paid → Account tab; AI Photo Prompts → Maya with Prompts sub-tab (e.g. `#maya/prompts`). | ☐ |
| Non-Studio + purchases | User without Studio but with Academy purchase sees Academy tab with "You Have Access" + "GET MORE" grid. "Get it →" links to `/academy/products/[id]`. | ☐ |
| Studio gate unchanged | Courses, templates, monthly drops still gated by Studio membership. | ☐ |

---

## 3. Post-Purchase Redirect & Welcome Banner (C-02)

| Check | How to verify | Pass |
|-------|----------------|------|
| Success page next-step card | Complete Academy checkout (or open `/academy/success?product=what_to_say` with session). Product-specific "Your next step" card appears with headline, sub-text, CTA. | ☐ |
| Success CTA deep link | CTA links to `/studio?tab=<tab>&source=academy_purchase&product=<productId>`. Tabs: feed-planner, maya, account. | ☐ |
| In-app welcome banner | Open `/studio?source=academy_purchase&product=what_to_say`. Dismissible banner "Welcome! Let's get started →" appears; CTA switches to correct tab. | ☐ |
| Params cleared after view | After viewing banner and switching tab, refresh or re-open Studio without params → banner does not show again. | ☐ |
| Product coverage | All products in `NEXT_STEP_BY_PRODUCT` (what_to_say, show_up, get_paid, ai_photo_prompts, paid_blueprint) have correct copy and tab. | ☐ |

---

## 4. Feed Planner Wizard Simplification (A-02)

| Check | How to verify | Pass |
|-------|----------------|------|
| Unified wizard: 3 steps | Non–paid-blueprint user sees wizard with "What's your goal?" → "What's your style?" → "You're ready!" and "1 of 3", "2 of 3", "3 of 3". | ☐ |
| Single CTA on final step | Final step shows one prominent "Create my first feed →" button (no multi-item checklist). | ☐ |
| Paid blueprint: skip wizard | Paid blueprint user lands in feed list view; **no** full wizard. | ☐ |
| Paid blueprint: inline card | In feed list placeholder: headline "Set up in 30 seconds", sub-text about 60 credits, single CTA "Create my first feed →". | ☐ |
| Deep link `?createFirstFeed=1` | Open `/feed-planner?createFirstFeed=1` → feed style modal opens (create-first-feed flow). | ☐ |
| Analytics | `wizard_step_1_complete`, `wizard_step_2_complete`, `wizard_step_3_complete`; `wizard_abandoned_at_step_X` on dismiss. | ☐ |

---

## 5. End-to-End Flow

| Check | How to verify | Pass |
|-------|----------------|------|
| Academy purchase → app | Buy (or simulate) Academy product → success page → click "Go to Feed Planner" / "Chat with Maya" etc. → Studio opens with correct tab and welcome banner. | ☐ |
| Academy tab → Maya/Feed Planner | From Academy "You Have Access" card, click "Start in Feed Planner" or "Chat with Maya" → correct tab opens. | ☐ |
| New user → first image | New user with bonus credits opens Maya → guided path → completes generation → sees result + Photoshoot CTA. | ☐ |
| Paid blueprint → first feed | Paid blueprint user opens Feed Planner → sees "Set up in 30 seconds" → "Create my first feed" → feed style modal → create feed. | ☐ |

---

## Quick commands

```bash
# Build
npm run build

# Unit tests (e.g. welcome-first-generation)
npm test -- tests/welcome-first-generation.test.ts
```

---

## References

- **Copy:** `docs/in-app-funnel/02-content-copy-2026-02-25.md`
- **Wireframes:** `docs/in-app-funnel/03-designs-wireframes-2026-02-25.md`
- **Prioritized list:** `docs/in-app-funnel/04-prioritized-list-2026-02-25.md`
- **Codex tasks:** `docs/codex-tasks/RESEARCH-SPRINT-CODEX-TASKS-2026-02-25.md`
