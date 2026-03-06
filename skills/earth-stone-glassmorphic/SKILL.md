# SKILL: Earth Stone Glassmorphic Design System
## SSELFIE Studio — Canonical Visual Language

**Read this before touching any UI component in this codebase.**

---

## Identity: DRAMATIC GLASSMORPHIC · EARTH STONE PALETTE · EDITORIAL WOW

The aesthetic is: limestone plateau, granite quarry, desert rock formation, concrete brutalism.
NOT: Nordic coastal, misty ocean, blue-tinted sky, warm taupe, amber brown.

---

## The Earth Stone Color System

```
Deep stone black:    #0d0c0b  — near-black, very slightly stone (no cool blue)
Dark stone surface:  #1c1b19  — raw dark stone, like granite at night
Medium stone:        #2e2c29  — concrete / quarry stone mid-tone
Raw stone:           #2a2720  — raw stone surface
Dark granite:        #1a1815  — granite at night
Quarry dust:         #3a3630  — quarry interior

Glass fill:          rgba(175, 170, 162, 0.10) — ultra-transparent, stone-neutral, NO blue tint
Glass fill mid:      rgba(175, 170, 162, 0.18) — modals, elevated panels
Glass fill heavy:    rgba(175, 170, 162, 0.25) — foreground elements
Glass border:        rgba(195, 190, 182, 0.25) — sharp stone edge glow
Glass divider:       rgba(175, 170, 162, 0.12) — subtle separators

Primary text:        #f0ede8  — stone white (neutral off-white, not blue-white)
Secondary text:      #8a8780  — concrete dust grey (neutral, no blue)
Stone accent:        #a8a49c  — limestone grey (icon tints, accents)
Pale stone:          #c8c4bb  — bleached limestone (primary CTAs, key highlights)
```

---

## Typography

```
Display / headings:  Cormorant Garamond, font-light, generous letter-spacing
Body / UI:           Inter, font-medium for labels, font-normal for body
Label style:         Inter 500, 10px, UPPERCASE, 0.5em letter-spacing, color #8a8780
```

---

## The 4-Layer Depth Formula

Every major screen should suggest this layering:

```
Layer 1 (back):   Atmospheric environment — raw stone bg, gradient depths
Layer 2:          GIANT typographic graphic element — huge ghost letters (12% opacity, 40-50vh height)
Layer 3:          Glass panel A — most transparent (8-12% opacity), heavy blur 50px+, can tilt 2-3°
Layer 4:          Glass panel B — slightly more opaque (18-25%), UI details inside
Layer 5 (front):  Crisp UI micro-details, labels, buttons
```

Key: The stone background MUST bleed through the glass. Glass on solid black = flat card, not glassmorphism.

---

## Glass Card Component Pattern

```tsx
// Standard glass panel (most common)
className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl"

// Elevated glass (modals, concept cards)
className="bg-[rgba(175,170,162,0.18)] backdrop-blur-[60px] border border-[rgba(195,190,162,0.30)] rounded-2xl"

// Heavy glass (foreground panels)
className="bg-[rgba(175,170,162,0.25)] backdrop-blur-[70px] border border-[rgba(195,190,182,0.35)] rounded-2xl"
```

Rules:
- Minimum blur: 40px. Preferred: 50-70px
- Always include border (it defines the glass edge)
- Rounded: rounded-2xl (16px) for panels, rounded-full for chips/pills
- Do NOT use solid backgrounds (bg-neutral-900, bg-black, etc.) on the main content

---

## Button Patterns

```tsx
// Primary CTA — bleached limestone (high contrast, readable)
className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"

// Secondary — glass pill
className="bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] text-[#f0ede8] backdrop-blur-sm rounded-full px-5 py-2.5 text-sm hover:bg-[rgba(175,170,162,0.20)] transition-colors"

// Ghost / text button
className="text-[#8a8780] hover:text-[#f0ede8] text-xs uppercase tracking-[0.15em] transition-colors"

// Destructive (rare)
className="bg-[rgba(255,80,80,0.15)] border border-[rgba(255,80,80,0.30)] text-red-300 rounded-full px-5 py-2.5 text-sm"
```

---

## Typography Patterns

```tsx
// Editorial display heading (Cormorant)
<h1 className="font-['Cormorant_Garamond'] font-light text-4xl md:text-6xl text-[#f0ede8] tracking-wide leading-tight">

// Section label (small caps Inter)
<p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">

// Body text
<p className="font-['Inter'] text-sm text-[#f0ede8] leading-relaxed">

// Muted body
<p className="font-['Inter'] text-sm text-[#8a8780] leading-relaxed">

// Ghost giant numeral (editorial background element)
<span className="font-['Cormorant_Garamond'] font-bold text-[20vw] text-[#f0ede8] opacity-[0.06] select-none pointer-events-none absolute">
```

---

## Input / Form Patterns

```tsx
// Glass input
<input className="
  bg-[rgba(175,170,162,0.08)]
  border border-[rgba(195,190,182,0.20)]
  text-[#f0ede8] placeholder-[#8a8780]
  backdrop-blur-sm rounded-xl
  px-4 py-3 text-sm
  focus:outline-none focus:border-[rgba(195,190,182,0.50)]
  transition-colors
" />

// Glass textarea
<textarea className="
  bg-[rgba(175,170,162,0.08)]
  border border-[rgba(195,190,182,0.20)]
  text-[#f0ede8] placeholder-[#8a8780]
  backdrop-blur-sm rounded-xl
  px-4 py-3 text-sm resize-none
  focus:outline-none focus:border-[rgba(195,190,182,0.50)]
" />
```

---

## Instagram Card Upgrade Rules

Instagram cards (photo, reel, carousel, concept cards) keep ALL their React logic, props, hooks, callbacks, and state. Only the visual presentation changes:

| Old | New |
|-----|-----|
| `bg-[#0a0a0a]` / `bg-black` | `bg-[#1c1b19]` |
| `bg-[#111]`, `bg-neutral-900` | `bg-[#2e2c29]` |
| `text-white` | `text-[#f0ede8]` |
| `text-gray-400`, `text-neutral-400` | `text-[#8a8780]` |
| `text-gray-300` | `text-[#a8a49c]` |
| `border-white/10` | `border-[rgba(195,190,182,0.20)]` |
| `bg-white/5` | `bg-[rgba(175,170,162,0.08)]` |
| `bg-white/10` | `bg-[rgba(175,170,162,0.12)]` |
| Card wrapper: no glass border | Add: `border border-[rgba(195,190,182,0.20)]` |
| Action bars | `bg-[rgba(175,170,162,0.10)] backdrop-blur-sm` |

**NEVER change:**
- Props and TypeScript types
- useState, useEffect, hooks
- onClick handlers, generation logic
- API calls or server actions
- Conditional rendering logic

---

## Navigation / Tab Bar

```tsx
// Bottom tab bar (mobile app shell)
<nav className="
  bg-[rgba(175,170,162,0.08)]
  backdrop-blur-[60px]
  border-t border-[rgba(195,190,182,0.15)]
  fixed bottom-0 left-0 right-0
">

// Active tab indicator
className="text-[#f0ede8]" // active
className="text-[#8a8780]" // inactive
```

---

## Dialog / Modal Pattern

```tsx
// Overlay
<div className="fixed inset-0 bg-[#0d0c0b]/80 backdrop-blur-sm" />

// Modal panel
<div className="
  bg-[rgba(175,170,162,0.15)]
  backdrop-blur-[70px]
  border border-[rgba(195,190,182,0.25)]
  rounded-3xl shadow-2xl
  shadow-black/50
">
```

---

## App Body Background

```css
body {
  background-color: #0d0c0b;
  background-image:
    radial-gradient(ellipse at 20% 20%, rgba(42, 39, 32, 0.8) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(26, 24, 21, 0.6) 0%, transparent 50%);
  min-height: 100vh;
}
```

---

## Anti-Patterns (Never Use These)

```
❌ Warm taupe (#a08060, amber-tinted greys) — has brown/amber undertone
❌ Cool blue-grey (#9aa0a8, slate-tinted) — has blue undertone
❌ Pure black (#000000) as surface — too flat, kills glassmorphism
❌ Pure white text (#ffffff) — use #f0ede8 stone white instead
❌ bg-gray-900, bg-neutral-900 as main background — wrong feel
❌ backdrop-blur-sm (4px) as primary blur — too weak
❌ Glass panels on solid black — must have atmospheric bg to bleed through
❌ Warm amber (#c8a070) for CTAs — wrong palette
❌ Blue-white (#e8edf0) for text — wrong palette
```

---

## Atmosphere Words (for generating backgrounds / gradients)

limestone plateau · granite quarry · desert rock formation · concrete brutalism
raw stone surface · travertine floor · quarry interior · concrete warehouse

NOT: Nordic coastal · misty ocean · blue sky · mountain forest
