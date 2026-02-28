# SSELFIE Studio App Secondary Screens — Design Audit Report

**Date:** February 27, 2026
**Scope:** Academy Screen, Feed Planner Screen, Profile Screen
**Target:** Redesign from SaaS light aesthetic to luxury editorial/glassmorphic dark theme

---

## Executive Summary

All three screens currently exhibit:
- **Light white/stone-50 backgrounds** — SaaS standard, not premium
- **Icon-heavy Lucide components** — clutters interface, breaks editorial simplicity
- **Standard card shadows and borders** — lacks sophisticated glass effect
- **Cramped grid/list layouts** — insufficient breathing room
- **Missing editorial hierarchy** — typography is functional, not aspirational
- **No dark mode** — critical for luxury/premium positioning

**Redesign Goal:** Transform into dark, atmospheric, editorial-first experience with glassmorphic components, minimal iconography, and cinematic breathing room.

---

## SCREEN 1: ACADEMY SCREEN

### Current State
**File:** `components/sselfie/academy-screen.tsx`

**Problems:**
1. **Visual Hierarchy:** Large hero banner (good), but info cards below are white-on-white, cramped
2. **Mini-Product Cards** (`mini-product-card.tsx`):
   - 160×200px white cards with borders
   - Centered 14px Cormorant headers (good font choice but wrong treatment)
   - 12px price text in Smoke color
   - "Get it →" CTA as underline
   - Issue: Looks like standard e-commerce, not editorial luxury
3. **Product Access Cards** (`product-access-card.tsx`):
   - 140×180px white horizontal scroll cards
   - "You have access" badge
   - Same underline CTA
   - Issue: No visual distinction for "owned" products; feels like a list, not a feature showcase
4. **Section Headers:**
   - "YOU HAVE ACCESS" — 12px Inter, tracking 0.2em, Smoke color
   - "GET MORE COURSES & RESOURCES" — same treatment
   - Issue: Too small, not enough visual weight for section breaks
5. **Navigation:**
   - Hamburger menu with icon buttons (Home, Aperture, MessageCircle, Grid, User, Settings, LogOut)
   - Issue: Lucide icons + standard menu — not editorial

### Products to Display (4 items)
```
1. What To Say — €17 — "Find Your Message In One Hour"
2. Show Up — €27 — "Create Content That Actually Converts"
3. Get Paid — €47 — "Build Your Revenue System"
4. AI Photo Prompt Pack — €17 — "Pro Photos From Your Phone"
```

### Required Changes

**Component Level:**
- Mini-product cards: Convert to glass panels (24px padding, blur effect)
  - Remove border, use glass surface with subtle border
  - Increase to 240x280px for better breathing room
  - Product name: 18px Cormorant 300 UPPERCASE
  - Description: 14px Inter 300, light gray
  - Price: 16px Cormorant 200 UPPERCASE
  - CTA: 12px Inter 500 UPPERCASE, minimal
  - Owned state: Different glass tint

- Product access cards: Glass treatment
  - Larger: 260x320px
  - Remove horizontal scroll, use 2-column editorial grid

- Section headers: Increase to 16px Inter 500 UPPERCASE

- Navigation: Remove all Lucide icons, text-based menu only

**Layout:**
- Academy overview: Dark background (#0a0a0a)
- Cards grid: 2 columns on mobile, 2-3 on desktop with 32px gap
- Overall: Minimum 48px padding (desktop), 24px (mobile)

---

## SCREEN 2: FEED PLANNER SCREEN

### Current State
**Files:**
- `components/feed-planner/instagram-feed-view.tsx`
- `components/feed-planner/feed-preview-card.tsx`

**Problems:**
1. **Overall Structure:**
   - White background (#ffffff)
   - Centered max-width grid
   - Standard card shadows
   - Issue: Looks like Instagram, not SSELFIE premium tool

2. **Feed Grid:** 3x3 grid of posts, functional but not editorial

3. **Caption Editor:** Standard textarea, not integrated editorially

4. **Tabs:** Standard tabbed interface

### Required Changes

**Visual Treatment:**
- Background: Change to dark (#0a0a0a)
- Feed hero: Full-bleed top with avatar, name (40px Cormorant), bio (18px Inter)
- Feed grid: Glass panel container with 20px blur
- Caption editor: Glass panel with large textarea (18px Inter 300)
- Tabs: Text-based with underline indicator only
- CTAs: Minimal, text-link style

**Layout:**
- Maximum width: Allow breathing room with padding
- Spacing: 48px padding desktop, 24px mobile
- Images as focal points, not UI elements

---

## SCREEN 3: PROFILE SCREEN

### Current State
**File:** `components/sselfie/profile-screen.tsx`

**Problems:**
1. **Hero Section:**
   - Avatar 32-40 sizes, white border
   - Name as serif (good) but treatment lacks editorial weight
   - Bio as too-small text
   - Issue: Lacks editorial presence

2. **Stats Section:**
   - Grid of 2 stats
   - Issue: Stats should feel like editorial callouts

3. **Best Work Section:**
   - 3-column grid with placeholder camera icons
   - Issue: Grid looks generic, not curated portfolio

4. **Navigation:** Same icon-heavy menu

### Required Changes

**Visual Structure:**
- Background: #0a0a0a throughout
- Hero: Full-bleed dark gradient (60vh), 180px avatar
- Name: 48px+ Cormorant 200 UPPERCASE
- Bio: 18px Inter 300, editorial width
- Stats: 64px+ numbers, 12px labels, positioned as editorial callouts
- Best Work: 3-column grid, no icons, subtle numbering
- Navigation: Text-based, no icons

---

## DESIGN SYSTEM CHECKLIST

### Colors
- All backgrounds: #0a0a0a (Obsidian)
- Primary text: #ffffff (Porcelain)
- Secondary text: #f5f5f5 (Pearl)
- Captions: #666666 (Smoke)
- Borders: #e5e5e5 at subtle opacity

### Glass Effect
- Apply to all cards: blur(20px); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)
- Remove all standard box-shadows

### Typography
- Headers: Cormorant Garamond 200-300 UPPERCASE
- Body: Inter 300 (min 16px)
- Labels: Inter 500 UPPERCASE 10-12px letter-spacing 0.5em

### Remove
- All Lucide icons
- White/light backgrounds
- Standard card shadows
- Icon-based navigation
