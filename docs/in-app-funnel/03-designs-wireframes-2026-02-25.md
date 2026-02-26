# In-App Funnel UI Spec & Wireframes

**Date:** 2026-02-25
**Purpose:** Mobile-first wireframes and component specifications for integrating Academy mini products and funnel next steps into the in-app user journey.

**Audience:** Implementation team (Codex), product, design.

---

## Overview

This document specifies **four key screens** for the in-app funnel integration:

1. **Academy Tab (in-app)** — Product access display and upsell
2. **Post-Purchase In-App Moment** — Modal/banner after Academy checkout
3. **Maya "Suggested Next Step" Card** — Contextual suggestion placement
4. **Maya First-Generation Guided Path** — Onboarding overlay for new users

All wireframes follow SSELFIE design system: mobile-first (375px), Scandinavian luxury aesthetic, Obsidian/Porcelain/Pearl/Smoke/Whisper palette, Cormorant Garamond headers (ultra-light, UPPERCASE), Inter body (300 weight, 1.8 line-height), minimum 48px padding, asymmetric layout.

---

## Screen 1: Academy Tab — "You Have Access" and "Get More" Sections

### Context
Users who purchased Academy mini products on `/academy` should see their products in the in-app Academy tab. Non-members should see the mini-product grid with prices.

### ASCII Wireframe (Mobile, 375px)

```
┌─────────────────────────────────────┐
│                                     │
│   A C A D E M Y                     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  YOU HAVE ACCESS                    │
│                                     │
│  ┌────────────┐  ┌────────────┐     │
│  │ WHAT TO    │  │ SHOW UP    │     │
│  │ SAY        │  │            │     │
│  │            │  │ (Purchased)│     │
│  │ [Product   │  │ ✓          │     │
│  │  Image]    │  │            │     │
│  │            │  │ Start now →│     │
│  │ Start now →│  └────────────┘     │
│  └────────────┘  [scroll right]     │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  GET MORE COURSES & RESOURCES       │
│                                     │
│  ┌────────────┐  ┌────────────┐     │
│  │ AI PHOTO   │  │ CAPTION    │     │
│  │ PROMPT     │  │ PACK       │     │
│  │ PACK       │  │            │     │
│  │ [Preview]  │  │ [Preview]  │     │
│  │ €17        │  │ €27        │     │
│  │ Get it →   │  │ Get it →   │     │
│  └────────────┘  └────────────┘     │
│  [2 more below, scroll]             │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  STUDIO MEMBERSHIP                  │
│  Full access to all courses         │
│  templates, drops & more            │
│                                     │
│  [Upgrade to Studio €97/mo]         │
│                                     │
└─────────────────────────────────────┘
```

### Component Notes

**"You Have Access" Section:**
- **Component to reuse:** `course-card.tsx` with product variant (adapted from existing course card)
- **New:** `product-access-card.tsx` — horizontal scroll card showing:
  - Product image (placeholder: <sandra-image-product-01>)
  - Product name (UPPERCASE, Cormorant, 14px)
  - "You have access" badge (small, Whisper background, Smoke text, 10px)
  - "Start now →" CTA button (minimal, Obsidian text, no background fill)
- **Dimensions:** ~140px wide, 180px tall; horizontal scroll on 2–4 products
- **Badge style:** 8px × 24px, border-radius 2px, padding 4px 8px
- **CTA button:** 12px Inter, 300 weight, Obsidian, underline on hover

**"Get More" Grid:**
- **Component to reuse:** `resource-card.tsx` adapted to show mini-products
- **New:** `mini-product-card.tsx` — 2-column grid card showing:
  - Product image placeholder
  - Product name (Cormorant, 14px, UPPERCASE)
  - Price badge (Smoke text, 12px Inter)
  - "Get it →" CTA (Obsidian, minimal)
- **Dimensions:** 160px wide, 200px tall (2-col grid on 375px)
- **Spacing:** 16px gutter, 48px left/right padding

**Section Heading:**
- "YOU HAVE ACCESS" / "GET MORE" — Cormorant Garamond, 12px, ultra-light, UPPERCASE, letter-spacing +2px, Smoke color
- 48px top padding, 24px bottom padding

### Navigation & Interactions
- "Start now →" on product card → deep link to relevant in-app feature:
  - "What To Say" → Feed Planner (caption planning)
  - "Show Up" → Maya (style/brand positioning)
  - "Get Paid" → Gallery (content monetization, future)
  - "AI Photo Prompt Pack" → Maya Prompts tab
- "Get it →" on mini-product → Navigate to `/academy/products/[productId]`
- Horizontal scroll in "You Have Access" for products 3–4+

---

## Screen 2: Post-Purchase In-App Moment

### Context
User completes Academy checkout on `/academy` and is redirected to `/academy/success`. The success page should show a contextual in-app next step.

### Option A: Bottom-Sheet Modal

```
┌─────────────────────────────────────┐
│                                     │
│  [Existing /academy/success page]   │
│                                     │
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃                               ┃  │
│  ┃  YOU'RE IN                    ┃  │
│  ┃                               ┃  │
│  ┃  ✓ [Checkmark icon]           ┃  │
│  ┃                               ┃  │
│  ┃  WHAT TO SAY                  ┃  │
│  ┃  (Product name, Cormorant)    ┃  │
│  ┃                               ┃  │
│  ┃  ─────────────────────────    ┃  │
│  ┃                               ┃  │
│  ┃  YOUR NEXT STEP               ┃  │
│  ┃  (Section label, 12px, gray)  ┃  │
│  ┃                               ┃  │
│  ┃  [📝 icon]                    ┃  │
│  ┃  Plan Your Captions           ┃  │
│  ┃  Create your first week       ┃  │
│  ┃  in Feed Planner              ┃  │
│  ┃                               ┃  │
│  ┃  [Go to Feed Planner →]       ┃  │
│  ┃  (CTA button, Obsidian)       ┃  │
│  ┃                               ┃  │
│  ┃  ─────────────────────────    ┃  │
│  ┃                               ┃  │
│  ┃  [Browse other products ↓]    ┃  │
│  ┃  (Secondary link, 12px)       ┃  │
│  ┃                               ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                     │
│  [Slide up from bottom]             │
│                                     │
└─────────────────────────────────────┘
```

### Option B: Full-Screen "You're In" Card (Recommended)

```
┌─────────────────────────────────────┐
│                                     │
│       [Background blur/dim]         │
│                                     │
│       ┌─────────────────────────┐   │
│       │                         │   │
│       │  [Dismiss ×]            │   │
│       │                         │   │
│       │  ✓                      │   │
│       │  [Green checkmark]      │   │
│       │                         │   │
│       │  YOU'RE IN              │   │
│       │                         │   │
│       │  WHAT TO SAY            │   │
│       │  [Product name,         │   │
│       │   Cormorant, 18px]      │   │
│       │                         │   │
│       │  ─────────────────────  │   │
│       │                         │   │
│       │  YOUR NEXT STEP         │   │
│       │  [Section label]        │   │
│       │                         │   │
│       │  📝 Plan Your Captions  │   │
│       │  Create your first week │   │
│       │  of captions in Feed    │   │
│       │  Planner                │   │
│       │                         │   │
│       │  [Open Feed Planner →]  │   │
│       │  [Prominent button]     │   │
│       │                         │   │
│       │  ─────────────────────  │   │
│       │                         │   │
│       │  [Back to Academy]      │   │
│       │  [Secondary link]       │   │
│       │                         │   │
│       └─────────────────────────┘   │
│                                     │
│  [Fade in, entrance animation]      │
│                                     │
└─────────────────────────────────────┘
```

### Recommendation
**Option B (full-screen card)** is recommended because:
- Higher visibility; less likely to be dismissed or missed
- Cleaner separation from page content
- More prestigious feel (Scandinavian, editorial)
- Easier to animate ("fade in" or "slide up from bottom")

### Component Notes

**New component:** `post-purchase-next-step-card.tsx`
- **Props:**
  - `productId` (string) — for mapping to next step
  - `productName` (string) — e.g. "What To Say"
  - `icon` (React.ReactNode) — destination icon (e.g. 📝, 🎨, 📸)
  - `headline` (string) — e.g. "Plan Your Captions"
  - `subtext` (string) — e.g. "Create your first week of captions in Feed Planner"
  - `primaryCTA` (string) — button label, e.g. "Go to Feed Planner →"
  - `secondaryCTA` (string) — optional link label, e.g. "Back to Academy"
  - `onPrimaryClick` (fn) — navigate to destination
  - `onSecondaryClick` (fn) — navigate back to Academy or dismiss
  - `onDismiss` (fn) — close modal

- **Styling:**
  - Background: Obsidian (#0a0a0a) with blur overlay
  - Card: Porcelain (#ffffff) with 2px Whisper (#e5e5e5) border
  - Border-radius: 1px (minimal, sharp edges — editorial)
  - Padding: 48px all sides
  - Max width: 320px (centered on mobile)

### Product → Destination Mapping

| Product | Destination | Icon | Copy |
|---------|-------------|------|------|
| What To Say | Feed Planner | 📝 | "Plan Your Captions" / "Create your first week of captions in Feed Planner" |
| Show Up | Maya | 🎨 | "Define Your Style" / "Ask Maya to help you find your signature look" |
| Get Paid | Gallery (future) / Maya | 💰 | "Monetize Your Content" / "See how to turn content into income" |
| AI Photo Prompt Pack | Maya Prompts tab | ✨ | "Explore Prompts" / "Browse AI-powered inspiration in Maya" |

### Animation & Feel
- **Entrance:** Fade in over 300ms, slight scale from 0.95 → 1
- **Timing:** Show modal 500ms after page load (allow success page to render)
- **Dismissibility:** Tap × or secondary button; ESC key; also allow swipe-down on mobile
- **Exit:** Fade out 200ms, scale 1 → 0.95

---

## Screen 3: Maya "Suggested Next Step" Card

### Context
A user who bought an Academy mini product (e.g. "What To Say") opens Maya. Maya should surface a contextual suggestion to use their newly acquired product.

### Option A: First Chat Message (Recommended)

```
┌─────────────────────────────────────┐
│ MAYA                            [⋮] │
├─────────────────────────────────────┤
│                                     │
│  [Maya bubble, light Porcelain]     │
│  ┌──────────────────────────────┐   │
│  │ I see you have What To Say.  │   │
│  │ Want me to help you plan     │   │
│  │ your first week of captions? │   │
│  │                              │   │
│  │ [Let's do it →] [Maybe later]│   │
│  └──────────────────────────────┘   │
│                                     │
│                                     │
│  (User can start typing in input)   │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Ask me anything...              ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Option B: Dismissible Card Above Chat

```
┌─────────────────────────────────────┐
│ MAYA                            [⋮] │
├─────────────────────────────────────┤
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃ [× Dismiss]                 ┃   │
│  ┃                             ┃   │
│  ┃ 📝 NEW: What To Say         ┃   │
│  ┃                             ┃   │
│  ┃ You just got access to      ┃   │
│  ┃ What To Say. Want me to     ┃   │
│  ┃ help you plan your next     ┃   │
│  ┃ week of captions?           ┃   │
│  ┃                             ┃   │
│  ┃ [Let's do it →]             ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                     │
│  [Chat area, empty or history]      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Ask me anything...              ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Recommendation
**Option A (first chat message)** is recommended because:
- Feels conversational and natural
- Aligns with Maya's brand (she "knows" the user)
- No extra UI clutter; suggestion is part of the chat flow
- User can dismiss by ignoring or typing something else
- Easier to implement (no new card component needed)

### Component Notes

**Reuse:** `maya-chat-interface.tsx` renders this as Maya's first system message.

**New (if Option B):** `maya-product-suggestion-card.tsx`
- **Props:**
  - `productName` (string)
  - `suggestedAction` (string)
  - `icon` (ReactNode)
  - `onAccept` (fn) — trigger suggested action
  - `onDismiss` (fn) — close card, don't show again (optional: set user preference)

- **Styling:**
  - Card background: Pearl (#f5f5f5)
  - Border: 1px Whisper (#e5e5e5)
  - Icon: 20px, centered
  - Text: Inter 300, 14px, Obsidian
  - Button: "Let's do it →" — 12px Inter, underline on hover, Obsidian

### Suggested Copy by Product

| Product Tag | First Message Copy |
|--------------|-------------------|
| `bought_what_to_say` | "I see you have What To Say. Want me to help you plan your first week of captions?" |
| `bought_show_up` | "You just got Show Up. Ready to explore your signature style and brand positioning?" |
| `bought_get_paid` | "You have Get Paid. Interested in a strategy to monetize your best content?" |
| `bought_ai_photo_prompt` | "You have the AI Photo Prompt Pack. Want to explore some trending styles?" |

### Integration Points

**Trigger condition:** User opens Maya + `user_tags` includes `bought_[product]` (from Academy purchase webhook)

**Flow:**
1. Check user's `academy_course_purchases` for recent purchases (last 24h)
2. If found, inject product suggestion as first Maya system message
3. User can click "Let's do it →" to:
   - Switch to Feed Planner (for captions/content)
   - Stay in Maya Classic/Pro and ask for styles (for images)
   - Navigate to Prompts tab (for inspiration)
4. Optionally, set flag `has_seen_academy_product_suggestion` to not show again

---

## Screen 4: Maya First-Generation Guided Path

### Context
New user opens Maya with 0 generations and unused bonus credits (e.g. free welcome grant). Show a 3-step onboarding modal to guide them to their first image.

### ASCII Wireframe (Mobile, 375px)

```
┌─────────────────────────────────────┐
│                                     │
│  [Background blur/dim]              │
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃                             ┃   │
│  ┃  YOUR FIRST PHOTO IN        ┃   │
│  ┃  3 STEPS                    ┃   │
│  ┃                             ┃   │
│  ┃  [●] [○] [○]               ┃   │
│  ┃  Progress dots              ┃   │
│  ┃                             ┃   │
│  ┃  ─────────────────────────  ┃   │
│  ┃                             ┃   │
│  ┃  STEP 1: CHOOSE A STYLE     ┃   │
│  ┃                             ┃   │
│  ┃  ┌──────────┐ ┌──────────┐  ┃   │
│  ┃  │ CASUAL   │ │ EDITORIAL│  ┃   │
│  ┃  │ [Photo]  │ │ [Photo]  │  ┃   │
│  ┃  └──────────┘ └──────────┘  ┃   │
│  ┃  ┌──────────┐ ┌──────────┐  ┃   │
│  ┃  │ LUXURY   │ │ LIFESTYLE│  ┃   │
│  ┃  │ [Photo]  │ │ [Photo]  │  ┃   │
│  ┃  └──────────┘ └──────────┘  ┃   │
│  ┃                             ┃   │
│  ┃  [Next →]                   ┃   │
│  ┃                             ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                     │
│  [Can skip or navigate away]        │
│                                     │
└─────────────────────────────────────┘

[SWIPE/NEXT to Step 2]

┌─────────────────────────────────────┐
│                                     │
│  [Background blur/dim]              │
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃                             ┃   │
│  ┃  YOUR FIRST PHOTO IN        ┃   │
│  ┃  3 STEPS                    ┃   │
│  ┃                             ┃   │
│  ┃  [●] [●] [○]               ┃   │
│  ┃  Progress dots              ┃   │
│  ┃                             ┃   │
│  ┃  ─────────────────────────  ┃   │
│  ┃                             ┃   │
│  ┃  STEP 2: PICK YOUR MODE     ┃   │
│  ┃                             ┃   │
│  ┃  ┌─────────────────────────┐ ┃   │
│  ┃  │ CLASSIC                 │ ┃   │
│  ┃  │ Your trained style      │ ┃   │
│  ┃  │ (Fast, simple)          │ ┃   │
│  ┃  │                         │ ┃   │
│  ┃  │ [Selected]              │ ┃   │
│  ┃  └─────────────────────────┘ ┃   │
│  ┃                             ┃   │
│  ┃  ┌─────────────────────────┐ ┃   │
│  ┃  │ PRO                     │ ┃   │
│  ┃  │ With reference images   │ ┃   │
│  ┃  │ (More control)          │ ┃   │
│  ┃  │                         │ ┃   │
│  ┃  │ [Tap to select]         │ ┃   │
│  ┃  └─────────────────────────┘ ┃   │
│  ┃                             ┃   │
│  ┃  [← Back] [Next →]          ┃   │
│  ┃                             ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                     │
└─────────────────────────────────────┘

[SWIPE/NEXT to Step 3]

┌─────────────────────────────────────┐
│                                     │
│  [Background blur/dim]              │
│                                     │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃                             ┃   │
│  ┃  YOUR FIRST PHOTO IN        ┃   │
│  ┃  3 STEPS                    ┃   │
│  ┃                             ┃   │
│  ┃  [●] [●] [●]               ┃   │
│  ┃  Progress dots (complete)   ┃   │
│  ┃                             ┃   │
│  ┃  ─────────────────────────  ┃   │
│  ┃                             ┃   │
│  ┃  STEP 3: GENERATE            ┃   │
│  ┃                             ┃   │
│  ┃  Let's create your first    ┃   │
│  ┃  photo in this style.       ┃   │
│  ┃                             ┃   │
│  ┃  [Image placeholder]        ┃   │
│  ┃  <sandra-first-gen>         ┃   │
│  ┃                             ┃   │
│  ┃  [Generate Now →]           ┃   │
│  ┃  (Primary button)           ┃   │
│  ┃                             ┃   │
│  ┃  [Skip for now]             ┃   │
│  ┃                             ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                     │
│  [Can close or skip]                │
│                                     │
└─────────────────────────────────────┘
```

### Component Notes

**New component:** `maya-first-generation-modal.tsx` (integrates with existing `welcome-first-generation-flow.tsx` or replaces it)

**Props:**
- `onComplete` (fn) — user finishes flow; load Maya chat
- `onSkip` (fn) — user dismisses; load Maya chat anyway
- `userHasTrainedModel` (bool) — show Classic or Pro step

**Step 1: Choose a Style**
- 2×2 grid of style cards (Casual, Editorial, Luxury, Lifestyle)
- Each card: image placeholder, label (Cormorant, 12px, UPPERCASE), subtle border
- Images: `<sandra-style-casual>`, `<sandra-style-editorial>`, `<sandra-style-luxury>`, `<sandra-style-lifestyle>`
- Reuse: Adapt from `maya-styles-carousel.tsx` as a grid instead of carousel
- State: Store selected style in local state

**Step 2: Pick Your Mode**
- Two toggle cards: Classic vs Pro
- Classic: "Your trained style (Fast, simple)"
- Pro: "With reference images (More control)"
- Only show Classic if `userHasTrainedModel === true`; else default to Pro
- Cards: 100% width, padding 16px, border 1px Whisper, selected has Obsidian border
- Reuse: Adapt from `maya-mode-toggle.tsx` as visual cards

**Step 3: Generate**
- Show result of generation or preview image (placeholder: `<sandra-first-gen>`)
- Prominent button: "Generate Now →" (primary CTA)
- Secondary: "Skip for now" (dismisses flow, loads chat)
- Call `/api/maya/generate-image` or `/api/maya/pro/generate-image` on click
- Handle loading state: spinner, "Creating your photo…"
- On success: show image, "Perfect! Your first photo is ready." + button "Create more" or "Go to chat"

### Trigger Condition
- **Gate:** User logs in with `academy_products.length === 0` AND `generation_count === 0` AND `credit_balance > 0`
- **Show once:** Set flag `has_seen_first_gen_flow` after completion to not show again
- **Dismissibility:** User can close modal (×), skip at any step, or complete flow

### Gate & Gate-Out Logic
- **Should show:** New user + zero generations + has bonus/welcome credits
- **Should hide:** User already generated 1+ images, or explicitly dismissed, or no credits
- **Skip option:** Always present on Step 1 and Step 3 (don't force the flow)
- **Post-completion:** Load Maya chat with style preference injected (e.g. "I'll help you create more photos in that casual style")

---

## Design System Summary (Applied to All Screens)

| Element | Specification |
|---------|---------------|
| **Breakpoint** | Mobile-first 375px min-width |
| **Color Palette** | Obsidian (#0a0a0a), Porcelain (#ffffff), Pearl (#f5f5f5), Smoke (#666666), Whisper (#e5e5e5) |
| **Headers** | Cormorant Garamond, ultra-light, UPPERCASE, letter-spacing +2px, tight tracking |
| **Body** | Inter, weight 300, line-height 1.8 |
| **Padding** | Minimum 48px all sides; never cramped |
| **Layout** | Asymmetric; never centered or symmetrical |
| **Images** | Sandra's images only (no stock); use placeholders like `<sandra-product-01>` |
| **Borders** | 1px Whisper or 2px Obsidian; minimal, sharp edges (editorial aesthetic) |
| **CTA Buttons** | Obsidian text, underline on hover, minimal fill (no background unless primary) |
| **Icons** | 20–24px, Obsidian color, centered; simple, monochrome |
| **Cards** | White/Pearl background, 1–2px border, 1px border-radius (sharp) |
| **Spacing** | 16px gutter (between columns), 24px vertical rhythm, 48px sections |

---

## Implementation Priority

### Phase 1 (Immediate: Next 2 weeks)
1. **Academy Tab — "You Have Access" section** (Screen 1)
   - Surfaces purchased products in-app
   - Drives engagement to next step
   - Relies on existing `course-card.tsx` and `resource-card.tsx`
   - Low risk; high visibility

2. **Post-Purchase In-App Modal (Option B)** (Screen 2)
   - Shows immediately after `/academy/success`
   - Deep links user to appropriate in-app feature (Feed Planner, Maya, etc.)
   - Clear, moment of conversion
   - New component but straightforward

### Phase 2 (Follow-up: Weeks 3–4)
3. **Maya "Suggested Next Step" Card (Option A)** (Screen 3)
   - First chat message for Academy buyers
   - Contextual, conversational
   - Minimal new code (reuse chat bubble)
   - Requires user_tags population from Academy webhook (already in place)

4. **Maya First-Generation Guided Path** (Screen 4)
   - Onboarding modal for new users
   - Drives 0% activation → first image
   - Reuses existing components (`welcome-first-generation-flow`, style carousel, mode toggle)
   - Feature flag or A/B test recommended

### Phase 3 (Later: Weeks 5+)
- Polish interactions, animations
- Add analytics events for funnel tracking
- A/B test modal vs in-chat suggestion placement
- Measure first-output activation lift

---

## Notes for Implementation Team

1. **Existing components to leverage:**
   - `course-card.tsx`, `resource-card.tsx` — adapt for products
   - `maya-styles-carousel.tsx` — convert to grid for Step 1
   - `maya-mode-toggle.tsx` — adapt cards for Step 2
   - `welcome-first-generation-flow.tsx` — integrate or replace with new flow
   - `MayaChatScreen` → inject product suggestion as first system message

2. **New components to create:**
   - `product-access-card.tsx` — product card with "Start now" CTA
   - `mini-product-card.tsx` — small product grid card for "Get More"
   - `post-purchase-next-step-card.tsx` — full-screen modal after checkout
   - `maya-product-suggestion-card.tsx` — (optional if using Option B for Screen 3)
   - `maya-first-generation-modal.tsx` — 3-step onboarding

3. **Backend integration:**
   - Ensure `academy_course_purchases` and `user_tags` are populated by Stripe webhook
   - Check user's tag for `bought_[product]` when rendering Academy tab and Maya
   - Populate `has_seen_first_gen_flow` flag after modal completion

4. **Data dependencies:**
   - Academy products: name, image, productId
   - User tags: `bought_what_to_say`, `bought_show_up`, etc.
   - Credit balance and generation count (already available)

5. **Analytics events to track:**
   - `academy_product_card_clicked` (which product, "start now" vs "get it")
   - `post_purchase_modal_shown`, `post_purchase_cta_clicked`, `post_purchase_dismissed`
   - `maya_product_suggestion_shown`, `maya_product_suggestion_accepted`, `maya_product_suggestion_dismissed`
   - `first_gen_flow_started`, `first_gen_flow_completed`, `first_gen_flow_skipped` (per step)
   - `first_output_generated` (cohort tracking)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | Designs and wireframes created by research subagent. Four screens specified: Academy Tab with product access/upsell, Post-Purchase In-App Modal (Option B recommended), Maya Suggested Next Step Card (Option A recommended), Maya First-Generation Guided Path (3-step onboarding). All wireframes follow SSELFIE design system (mobile-first, Scandinavian luxury, Obsidian/Porcelain/Pearl palette, Cormorant/Inter typography, 48px padding, asymmetric layout). Component specs, navigation logic, and implementation notes provided. |
