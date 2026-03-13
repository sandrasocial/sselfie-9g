# SSELFIE Design + Voice Master Guide
# Version 1.0 — 2026-02-28
# Owner: Sandra (SSELFIE) | Maintained by: North + Claude

---

## FOR ALL AGENTS — READ BEFORE TOUCHING ANYTHING

This is the single source of truth for every visual, typographic, copy, and UX decision across the SSELFIE product. Every agent — Codex, north-code, north-content, north-product, or any future agent — must read the relevant section before making any change.

**The rule is simple:** If it's in this guide, follow it exactly. If it's not in this guide, ask before inventing. Never improvise design or copy decisions.

**What this guide governs:**
- Every pixel in the app and marketing site
- Every word in the UI, emails, products, and marketing
- Every component, pattern, and interaction
- Every page from landing to success to settings

**How to use it:**
- Before building any UI → read Part 1 (Design System) + Part 2 (Components)
- Before writing any copy → read Part 3 (Voice + Copy)
- Before auditing any page → read Part 4 (Page Map) + Part 5 (Audit Protocol)
- When in doubt → do less and flag it. Do NOT invent.

---

# PART 1: DESIGN SYSTEM (LOCKED — ZERO DEVIATION ALLOWED)

This design system is final. No new colors, no new fonts, no new weights, no exceptions.

---

## 1.1 Color Palette — EXACTLY 5 COLORS

These are the only 5 colors permitted anywhere in the SSELFIE product.

| Token name | Hex | Use |
|-----------|-----|-----|
| Obsidian | `#0a0a0a` | Primary text, strong headers, CTA backgrounds (light mode) |
| Porcelain | `#ffffff` | Backgrounds (light mode), text on dark |
| Pearl | `#f5f5f5` | Secondary backgrounds, card fills (light mode) |
| Smoke | `#666666` | Body text, captions, secondary labels |
| Whisper | `#e5e5e5` | Borders, dividers, subtle separators |

**For the dark glassmorphic app UI (Studio/Maya), the system uses these as alpha layers:**

| CSS Variable | Value | Use |
|-------------|-------|-----|
| `--bg-base` | `#0b0d10` | App background (only exception to 5-color rule — deep dark base) |
| `--glass-1` | `rgba(255,255,255,0.04)` | Subtlest glass card |
| `--glass-2` | `rgba(255,255,255,0.07)` | Standard glass card |
| `--glass-3` | `rgba(255,255,255,0.10)` | Active / hover glass |
| `--glass-4` | `rgba(255,255,255,0.14)` | Prominent glass card |
| `--border-faint` | `rgba(255,255,255,0.07)` | Subtlest border |
| `--border-subtle` | `rgba(255,255,255,0.12)` | Standard border |
| `--border-medium` | `rgba(255,255,255,0.18)` | Prominent border |
| `--text-1` | `#ffffff` | Primary text |
| `--text-2` | `rgba(255,255,255,0.75)` | Secondary text |
| `--text-3` | `rgba(255,255,255,0.50)` | Tertiary / body text |
| `--text-4` | `rgba(255,255,255,0.30)` | Muted / labels / captions |

**FORBIDDEN:**
- `#333333`, `#999999`, `#ccc`, `#ddd`, any greys not in the palette
- Any blue, red, green, or brand color except the system green for live/active indicators: `#4ade80` (used sparingly, status dots only)
- Gradients (not permitted)
- Shadows with color tints
- Any opacity value not in the defined glass system

---

## 1.2 Typography — EXACTLY 2 FONTS

| Font | Use | Weights | Style | Tracking | Line-height |
|------|-----|---------|-------|----------|-------------|
| Cormorant Garamond | ALL headers, titles, display text | 200, 300 only | UPPERCASE always | `-0.01em` (tight) | `1.0–1.2` (compact) |
| Inter | ALL body, labels, captions, buttons, inputs | 300 (body), 500 (labels/buttons) | Sentence case OR UPPERCASE for labels | Normal (body), `0.2–0.5em` (labels) | `1.8` (body), `1.0` (labels) |

**Rules:**
- Cormorant Garamond: ALWAYS uppercase. NEVER sentence case. NEVER bold (max 300).
- Inter 300: ALWAYS for body copy, placeholders, descriptions, helper text.
- Inter 500: ALWAYS for labels, badges, buttons, uppercase small caps (9–12px).
- NEVER use Inter 400 (regular) — only 300 or 500.
- NEVER use font-size below 9px for labels, 11px for body in any live UI.
- Minimum body size: 14px in app, 16px on landing pages.

**Size scale (use only these):**
```
Display title:  32–48px  Cormorant 200 UPPERCASE
Page title:     24–32px  Cormorant 200 UPPERCASE
Section head:   18–22px  Cormorant 200 UPPERCASE
Card title:     14–18px  Cormorant 200 UPPERCASE
Sub-label:      9–12px   Inter 500 UPPERCASE tracking 0.3–0.5em
Body:           13–16px  Inter 300
Caption:        11–12px  Inter 300
Micro-label:    9–10px   Inter 500 UPPERCASE
```

**FORBIDDEN:**
- Font weights 400, 600, 700, 800, 900
- Italic (not part of the system)
- Any font other than Cormorant Garamond and Inter
- Cormorant in sentence case (MUST be uppercase)
- Decorative or script fonts anywhere

---

## 1.3 Spacing & Layout

**The 8-point grid.** All spacing values are multiples of 8.

| Use | Value |
|-----|-------|
| Page padding (mobile) | `32px` sides minimum |
| Page padding (desktop) | `48–80px` sides |
| Card padding (internal) | `16–24px` |
| Section gaps | `40–64px` |
| Component gaps | `8–16px` |
| Micro gaps (within components) | `4–8px` |

**Layout principles:**
- Mobile-first. Design starts at `375px` width. Must work perfectly at 375.
- Max content width: `680px` for editorial content, `480px` for forms/checkout.
- NEVER center everything. Asymmetric balance. Left-aligned text is default.
- NEVER cram. White space is the luxury. If it feels tight, add space.
- Column layouts over stacked layouts wherever content allows.
- Input fields: full-width on mobile, max `480px` on desktop.

**Border radius scale:**
```
Micro chip / badge:  3–4px
Button:              6–8px
Card:                10–16px
Sheet / modal:       20–24px (top corners only for bottom sheets)
Avatar / circle:     50%
```

---

## 1.4 Glassmorphic Card System (App UI)

Four levels of glass. Use the right level for the right context.

| Level | Background | Border | Use |
|-------|-----------|--------|-----|
| Glass-1 | `rgba(255,255,255,0.04)` | `border-faint` | Subtle containers, background cards, disabled states |
| Glass-2 | `rgba(255,255,255,0.07)` | `border-faint` | Standard cards, list items, secondary containers |
| Glass-3 | `rgba(255,255,255,0.10)` | `border-subtle` | Active/selected cards, featured items, inputs |
| Glass-4 | `rgba(255,255,255,0.14)` | `border-medium` | Primary CTA containers, highlighted states |

**All glass cards use:** `backdrop-filter: blur(20px)` (or `blur(12px)` for lighter cards).

**Card anatomy:**
```
border-radius: 10–16px
border: 1px solid [border token]
background: [glass token]
backdrop-filter: blur(20px)
padding: 16–24px
```

**NEVER:**
- Solid background cards in the dark app UI (use glass)
- Drop shadows (blur does the work)
- Nested glass cards more than 2 levels deep
- Glass-4 for large content areas (too heavy — use glass-2 or glass-3)

---

## 1.5 Motion & Transitions

Simple, elegant, fast.

```
Standard transition:  all 0.15s ease
Slow transition:      all 0.25s ease
Sheet / modal open:   0.2s ease (translateY from bottom)
Fade in:             opacity 0 → 1, 0.15s
```

**FORBIDDEN:**
- Bounce easing
- Spring animations
- Delay > 0.1s on interactive elements
- Multiple simultaneous animations on a single element

---

## 1.6 Photography as Design Element — STRATEGIC USE ONLY

Photography is not decoration. It is depth. Used correctly, Sandra's real images transform a surface from "minimal app" into "editorial brand." Used incorrectly, it looks chaotic and breaks the luxury feel.

**The core rule: photos are layered *beneath* the design system, never placed on top of it.**

---

### WHEN TO USE PHOTO BACKGROUNDS

**✅ HERO SECTIONS** — Every major hero section on marketing pages, the Hub, and feature landing pages should use a photo background. This is the primary statement surface.

```css
/* Hero pattern */
.hero-bg {
  position: relative;
  background-image: url('[sandra-photo.jpg]');
  background-size: cover;
  background-position: center top;
  background-attachment: fixed; /* parallax on desktop */
}

.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(8,8,8,0.97) 0%,
    rgba(8,8,8,0.85) 40%,
    rgba(8,8,8,0.65) 70%,
    rgba(8,8,8,0.90) 100%
  );
  z-index: 1;
}

/* All content inside hero must have z-index: 2 or higher */
.hero-content { position: relative; z-index: 2; }
```

**✅ FEATURED / SPOTLIGHT CARDS** — The single most important card on a page (the "featured" product, the highlighted drop, the pinned post). One photo card per section max.

```css
/* Featured card pattern */
.featured-card {
  position: relative;
  background-image: url('[sandra-photo.jpg]');
  background-size: cover;
  background-position: center;
  overflow: hidden;
  border-radius: 16px;
}

.featured-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(17,17,17,0.97) 0%,
    rgba(17,17,17,0.70) 60%,
    rgba(17,17,17,0.85) 100%
  );
  z-index: 1;
  transition: opacity 0.25s ease;
}

.featured-card:hover::before { opacity: 0.80; } /* Image breathes on hover */

.featured-card-content { position: relative; z-index: 2; }
```

**✅ ARCHIVE / COLLECTION CARDS** — In content grids (products, drops, posts), individual cards can have photo backgrounds. Use to differentiate key items. Not every card — use on items that deserve visual emphasis.

```css
/* Archive card pattern */
.archive-card {
  position: relative;
  background-image: url('[sandra-photo.jpg]');
  background-size: cover;
  background-position: center;
  overflow: hidden;
  border-radius: 12px;
}

.archive-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(8,8,8,0.82);
  transition: opacity 0.25s ease;
  z-index: 1;
}

.archive-card:hover::before { opacity: 0.65; } /* Image breathes on hover */

.archive-card-content { position: relative; z-index: 2; }
```

**✅ MOODBOARD STRIPS** — A horizontal row of photo cells used as a brand statement (not functional content). Each cell is a tight crop with minimal overlay. Used at section breaks or as decorative dividers.

```css
/* Moodboard strip pattern */
.moodboard-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: 180px;
  gap: 2px;
  overflow: hidden;
}

.moodboard-cell {
  position: relative;
  background-size: cover;
  background-position: center;
}

.moodboard-cell::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(8,8,8,0.30);
  transition: opacity 0.25s ease;
}

.moodboard-cell:hover::after { opacity: 0; } /* Full reveal on hover */
```

---

### WHERE NEVER TO USE PHOTO BACKGROUNDS

**❌ FORBIDDEN SURFACES:**
- Standard glass UI cards in the app (Maya, feed planner, settings, gallery)
- Form inputs, text areas, selects
- Navigation bars and sidebars
- Modal backgrounds or sheet backgrounds
- Settings pages, profile pages
- Academy lesson content areas
- Any surface where text legibility is mission-critical and photo adds no brand value
- Checkout or payment surfaces (visual noise at the moment of trust)
- Error states, empty states, loaders

**The test:** Ask — "Does this photo add editorial depth here, or just visual noise?" If you're not sure, do NOT add it.

---

### PHOTO SOURCING RULES — NON-NEGOTIABLE

1. **Sandra's photos ONLY.** Never stock photography. Never AI-generated images. Never photos of other people. Every background image must be Sandra — her face, her space, her brand.

2. **File naming convention for photos used as backgrounds:**
   ```
   img-sandra-[descriptor].jpg
   img-sandra-[descriptor].webp   (preferred — better compression)

   Examples:
   img-sandra-studio.jpg
   img-sandra-night.webp
   img-sandra-black-suit.webp
   img-sandra-icelandic-landscape.webp
   ```

3. **Photo quality:** Minimum 1600px wide for hero use. Minimum 800px wide for cards.

4. **Photo tone:** Prefer photos that are naturally dark, moody, or have strong contrast. Bright/overexposed photos fight the dark overlay system. If a photo is too light, increase overlay opacity accordingly.

5. **Never hardcode absolute paths.** All photos referenced via relative paths from the project root or a `/img/` or `/assets/photos/` directory. Ask Sandra to provide the photo file name before building.

---

### GRADIENT OVERLAY FORMULA REFERENCE

| Surface | Overlay | Hover |
|---------|---------|-------|
| Hero section | `linear-gradient(135deg, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.85) 40%, rgba(8,8,8,0.65) 70%, rgba(8,8,8,0.90) 100%)` | No change (hero never hovers) |
| Featured card | `linear-gradient(135deg, rgba(17,17,17,0.97) 0%, rgba(17,17,17,0.70) 60%, rgba(17,17,17,0.85) 100%)` | Reduce to `0.80` opacity |
| Archive card | `rgba(8,8,8,0.82)` flat | Reduce to `0.65` opacity |
| Moodboard cell | `rgba(8,8,8,0.30)` flat | Remove entirely (`opacity: 0`) |

**Logic behind the formula:** Heroes need maximum legibility (text heavy, full info). Featured cards balance legibility + image feel. Archive cards tease the image. Moodboard cells reveal fully — they're pure visual, no text.

---

### MOBILE ADAPTATION

- `background-attachment: fixed` (parallax) → **remove on mobile** (causes jitter in iOS Safari). Use `background-attachment: scroll` at ≤768px.
- Moodboard strip → reduce to 3 cells on mobile (hide last 2), or collapse to 2-row 2-3 grid.
- Archive cards with photo backgrounds → maintain aspect ratio. Use `aspect-ratio: 4/3` on mobile, `3/2` on desktop.
- Hero `background-position: center top` on desktop → `center 20%` on mobile to favor face/body framing.

```css
@media (max-width: 768px) {
  .hero-bg { background-attachment: scroll; background-position: center 20%; }
  .moodboard-strip { grid-template-columns: repeat(3, 1fr); }
  .moodboard-strip .moodboard-cell:nth-child(n+4) { display: none; }
}
```

---

### AUDIT CHECKLIST — PHOTOGRAPHY

Add these checks to the daily audit protocol (Part 5):

- [ ] **P: Photo is Sandra's image** — never stock photography, never AI-generated
- [ ] **P: Text legibility** — all text over photos passes contrast. White text minimum. Never dark text on a photo card.
- [ ] **P: Overlay present** — every photo background has a pseudo-element overlay. No raw unfiltered photos behind content.
- [ ] **P: Hover works** — photo cards have hover state that reduces overlay opacity
- [ ] **P: Mobile parallax removed** — `background-attachment: fixed` not used on mobile
- [ ] **P: No photo in forbidden zones** — settings, forms, nav, checkout, loaders, modals are photo-free
- [ ] **P: File path is relative** — no hardcoded absolute paths to photo files
- [ ] **P: One featured card per section** — not every card has a photo, just the featured one

---

# PART 2: COMPONENT PATTERNS

Every component has one canonical pattern. Codex must follow these exactly.

---

## 2.1 Buttons

**Three button types only:**

### Primary Button (CTA)
```
Background: var(--text-1) = #ffffff
Text color: #0b0d10 (the app bg — near-black)
Font: Inter 500, 11px, UPPERCASE, letter-spacing 0.2em
Border: none
Border-radius: 8px
Padding: 16px horizontal, 14–16px vertical
Width: full-width on mobile
Hover: opacity 0.9
```
Use for: the ONE main action on any screen. Maximum one per view.

### Secondary Button
```
Background: var(--glass-2)
Text color: var(--text-2)
Font: Inter 500, 10px, UPPERCASE, letter-spacing 0.2em
Border: 1px solid var(--border-subtle)
Border-radius: 8px
Padding: 12px horizontal, 10px vertical
Hover: background var(--glass-3)
```
Use for: secondary actions, alternatives to primary.

### Ghost / Text Button (Skip, cancel, secondary nav)
```
Background: transparent
Text color: var(--text-4)
Font: Inter 300, 10px, letter-spacing 0.15em, UPPERCASE
Border: none
Padding: 10px vertical
Hover: color var(--text-2)
```
Use for: skip links, destructive actions, secondary navigation, "I'll do this later" patterns.

**FORBIDDEN:**
- Colored buttons (no brand-color backgrounds)
- Rounded-pill buttons (`border-radius: 99px`) — not in our system
- Icon-only buttons without accessible labels
- More than one primary button per screen

---

## 2.2 Inputs & Forms

### Text Input
```
Background: rgba(255,255,255,0.06)
Border: 1px solid var(--border-faint)
Border-radius: 8px
Padding: 14px 16px
Font: Inter 300, 14px, color var(--text-2)
Placeholder: Inter 300, 14px, color var(--text-4)
Focus: border var(--border-subtle), background var(--glass-2)
```

### Textarea
Same as text input. Min-height: 80px. Resize: vertical only.

### Form labels
```
Font: Inter 500, 9px, UPPERCASE, letter-spacing 0.3em
Color: var(--text-4)
Margin-bottom: 6px
```

### Input helper text (below field)
```
Font: Inter 300, 11px
Color: var(--text-4)
Margin-top: 4px
```

### Error state
```
Border: 1px solid rgba(239,68,68,0.4)  [only approved red usage]
Helper text color: rgba(239,68,68,0.8)
Error message font: Inter 300, 11px
```

### Select / Dropdown
Same appearance as text input. Custom-styled. No browser default arrow.

---

## 2.3 Tabs & Navigation

### App bottom tab bar
```
Background: rgba(11,13,16,0.95) + backdrop-filter blur(20px)
Border-top: 1px solid var(--border-faint)
Tab labels: Inter 500, 9px, UPPERCASE, letter-spacing 0.2em
Inactive: var(--text-4)
Active: var(--text-1) + 1px white line above tab (not below)
Height: 56px + safe area inset
```

### Mode switcher tabs (e.g. SELFIE / MY MODEL)
```
Row of pills, inline
Active pill: glass-3, border-subtle, text-1
Inactive pill: glass-1, border-faint, text-4
Font: Inter 500, 9px, UPPERCASE, letter-spacing 0.2em
Pill padding: 6px 14px, border-radius: 4px
```

### Section tabs (inside a screen)
```
Underline style
Active: text-1, 1px solid white line below (width: 24px, centered)
Inactive: text-4, no line
Font: Inter 500, 9px, UPPERCASE, letter-spacing 0.2em
Padding: 10px 4px 8px
Border-bottom: 1px solid var(--border-faint) — the full row
```

---

## 2.4 Badges & Labels

### Status badge / chip
```
Background: glass-1 or glass-2
Border: 1px solid border-faint
Border-radius: 3–4px
Padding: 3px 7px
Font: Inter 500, 8–9px, UPPERCASE, letter-spacing 0.2em
Color: text-4
```

### "New" / "Live" badge
```
Background: rgba(74,222,128,0.06)
Border: 1px solid rgba(74,222,128,0.2)
Text: rgba(74,222,128,0.9)  ← ONLY approved use of green
```

### Price badge
```
Font: Cormorant 200, 20–24px, color text-1
Subtext "/ month" or "one time": Inter 300, 11px, text-4
```

### Step indicators (onboarding, wizard)
```
Active: white pill (width 18px, height 5px, border-radius 3px)
Done: small dot (5px), text-4
Upcoming: small dot (5px), border-subtle
```

---

## 2.5 Modals & Bottom Sheets

### Bottom sheet
```
Background: rgba(18,21,26,0.98)
Border-top: 1px solid var(--border-subtle)
Border-radius: 24px 24px 0 0
Padding: 28px 24px 40px (+ safe area bottom)
Handle: 36px wide, 3px tall, border-subtle, centered, margin-bottom 28px
Box-shadow: 0 -40px 80px rgba(0,0,0,0.6)
Backdrop: rgba(11,13,16,0.82) + backdrop-filter blur(8px)
```

### Dialog / Center modal
```
Background: rgba(18,21,26,0.98)
Border: 1px solid var(--border-subtle)
Border-radius: 16px
Padding: 24–32px
Max-width: 380px
Backdrop: rgba(0,0,0,0.7) + blur(4px)
```

### Sheet/modal title
Cormorant 200, 28–32px, UPPERCASE, line-height 1.1

### Sheet/modal body
Inter 300, 14px, text-3, line-height 1.7

---

## 2.6 Loaders & Spinners

### Full-screen loader
```
Background: var(--bg-base)
Center: SSELFIE wordmark (Cormorant 200, 18px, UPPERCASE, letter-spacing 0.3em)
Below: subtle spinner OR pulsing opacity on wordmark
No heavy animations
```

### Inline spinner (within a button or content area)
```
Small: 16px diameter
Color: current text color at 0.5 opacity
Animation: 0.8s linear rotate
```

### Skeleton loader
```
Background: glass-1
Border-radius: 4px (same as content it replaces)
Animation: opacity 0.4–0.7 pulse at 1.5s
NO shimmer gradients — pulse only
```

### Loading state copy (e.g. "Generating your photo")
```
Font: Inter 300, 12px, text-4
Text: present-progressive, never "Please wait..." or "Loading..."
Good: "Generating your photo", "Training your model", "Building your strategy"
Bad: "Please wait...", "Loading...", "Processing..."
```

---

## 2.7 Empty States

Every empty state must do three things:
1. Acknowledge the empty state warmly (no cold "No items found")
2. Tell the user what they'll unlock by filling it
3. Give a clear single action

### Pattern:
```
Icon or illustration: optional, simple, subtle (CSS-drawn or SVG, no third-party icons)
Title: Cormorant 200, 20px, UPPERCASE — e.g. "YOUR GALLERY IS EMPTY"
Body: Inter 300, 13px, text-3 — e.g. "Generate your first photo in Maya to see it here."
CTA: Secondary button or text link
```

**Page-specific empty states:** See Part 4 (Page Audit Map) for each page's exact empty state copy.

---

## 2.8 Error States

### Full-page error
```
Title: Cormorant 200, 24px: "SOMETHING WENT WRONG"
Body: Inter 300, 13px: [plain language description, no tech jargon]
CTA: "Try again" (primary) + "Go back" (ghost)
```

### Inline error (form/API)
```
Small card, glass-1, border-faint
Left border: 2px solid rgba(239,68,68,0.4)
Font: Inter 300, 12px, color rgba(239,68,68,0.8)
Icon: none
```

### Toast / notification
```
Background: glass-3
Border: 1px solid border-subtle
Border-radius: 8px
Padding: 12px 16px
Font: Inter 300, 13px, text-2
Position: top center, 16px from top (app) or bottom center (landing)
Duration: 3s auto-dismiss
Animation: slide down from top (app) or slide up from bottom (landing)
```
Success toast: left border `rgba(74,222,128,0.5)`
Error toast: left border `rgba(239,68,68,0.4)`
Info toast: left border `var(--border-medium)`

---

# PART 3: VOICE + COPY GUIDE

Sandra's voice is the brand. Every word in the product must sound like Sandra texting a close friend.

---

## 3.1 Brand Voice

**The test:** "Would Sandra text this to a friend?"

If yes → approved.
If it sounds like a SaaS product, a corporate email, or a marketing agency → rejected.

**Core characteristics:**
- Short sentences. Never more than 2 sentences per paragraph.
- Contractions always: you're, don't, it's, I'm, you'll, that's
- Warm and direct. Never cold. Never corporate.
- Personal stories where possible. Real emotion.
- Questions to the reader. Direct engagement.
- "And" and "But" to start sentences — conversational rhythm.
- "You" language — never "users", never "clients", never "customers" in UI copy

**Tone calibration by context:**

| Context | Tone | Example |
|---------|------|---------|
| Empty state | Warm invitation | "Your gallery is waiting. Generate your first photo in Maya →" |
| Error message | Calm, not scary | "Something didn't go through. Try that again?" |
| Success state | Genuinely celebratory | "That's you. In seconds." |
| Loading | Present, alive | "Generating your photo..." |
| Upgrade CTA | Honest value, no pressure | "Want even better results? Train your personal model." |
| Onboarding | Guide, not lecture | "Start with the fastest. Upload one selfie." |
| Pricing | Direct, no tricks | "€97/month. Cancel any time." |
| Email | Letter from Sandra | Personal opener, specific value, real CTA |

---

## 3.2 Forbidden Words

NEVER appear anywhere in the product, marketing, or emails.

```
leverage          synergy           cutting-edge
unlock            skyrocket         transform
game-changer      revolutionary     next level
crushing it       hustle            grind
viral             influencer        hacks
disrupt           innovative        solutions
utilize           empower           supercharge
```

**Also forbidden:** Any phrase that sounds like a pitch deck or a SaaS marketing site.

---

## 3.3 Signature Phrases (Use These)

Sandra's voice has these signature phrases. Use them naturally — not in every line, but when they fit.

```
"Let me be really honest for a second..."
"Here's the thing..."
"Wild, right?"
"I know what you're thinking..."
"And yes — that comes back to money."
"You don't need a €1,500 photoshoot."
"Your phone is enough."
"Visibility = wealth."
"Turn one good selfie into a month of content."
"If they can't see you, they can't buy from you."
```

**Terms of endearment (use sparingly, only in warmer contexts like email and long copy):**
Babe, Gorgeous, Love

---

## 3.4 Copy Patterns by Element

### Headlines / Titles (Cormorant, UPPERCASE)
- Short. 2–5 words max.
- Action or declaration.
- No questions (save questions for body copy).
- Examples: `YOUR BRAND STORY`, `WHAT'S YOUR NICHE?`, `TRAIN YOUR MODEL`, `YOUR STUDIO IS READY`

### Body copy (Inter 300, sentence case)
- 1–2 sentences only.
- Start with the benefit, not the feature.
- End with either a question or a natural lead-in to the CTA.
- Example: "Maya builds your brand strategy in seconds — no credits needed. Start with your niche."

### CTAs (buttons, text links)
- Action-first: verb + object. Not "Click here", not "Learn more".
- Arrow suffix on text CTAs: "Generate a photo →", "Start training →"
- Button CTAs: shorter, no arrow: "Upload a selfie", "Build my strategy", "Join Studio"
- Never: "Submit", "Continue", "Proceed", "Click here", "Learn more"

### Labels & chips (Inter 500, UPPERCASE, 9px)
- Noun or very short phrase: `SELFIE MODE`, `100 CREDITS`, `TRAINING AVAILABLE`, `NEW`
- No verbs in labels
- No punctuation in labels

### Error messages
- Plain language. No code, no technical terms.
- Good: "That didn't work. Try again?"
- Bad: "Error 422: Validation failed. Request body is invalid."

### Success messages
- Brief and genuine.
- Good: "Done. Your model is training." / "Saved." / "That's you."
- Bad: "Your request has been processed successfully."

### Pricing copy
- State price clearly. No hidden feels.
- "€97/month" not "Starting at €97"
- "Cancel any time" not "No long-term commitment required"
- "20 credits to train" not "Training requires a credit purchase"

---

## 3.5 Emoji Policy

**In app UI:** ZERO emojis. None. Anywhere. Not in labels, not in prompts, not in empty states, not in CTAs. Numbers (`01`, `02`, `03`) replace any bullet/emoji system.

**In marketing copy (email, social):** Maximum 2–3 per message. Used sparingly to add warmth, never for decoration. Standard Unicode only (no custom emoji).

---

# PART 4: PAGE AUDIT MAP

Every surface of the SSELFIE product. For each: route, purpose, key components, voice requirements, and audit checklist.

---

## 4.A MARKETING / PUBLIC PAGES

---

### PAGE: Homepage
**Route:** `/`
**Component:** `landing-page-new.tsx`
**Purpose:** First impression. Convert visitor to sign-up or mini-product purchase.
**Design ref:** TBD (v3 landing to be designed)

**Key sections:**
1. Hero — SELFIE image + headline + CTA
2. "How it works" — 3 steps
3. Social proof — follower count, testimonials
4. Mini-product row — 4 products with prices
5. Studio membership CTA — with value stack
6. Final CTA

**Voice:**
- Hero headline: Cormorant, punchy declaration. "ONE SELFIE. A MONTH OF CONTENT."
- Sub-headline: Inter 300, conversational. Personal hook.
- CTAs: "Start for free →", "See how it works →"

**Design audit items:**
- [ ] Hero background: dark, obsidian (#0a0a0a) or app glassmorphic
- [ ] All fonts Cormorant + Inter only
- [ ] All colors from the 5-color palette only
- [ ] No gradient backgrounds
- [ ] Mobile breakpoint (375px) renders cleanly
- [ ] CTA button follows primary button spec
- [ ] No emojis in any UI copy

**Copy audit items:**
- [ ] No forbidden words
- [ ] CTAs are action-first (verb + object)
- [ ] Prices stated clearly (€ not $, no "starting at")
- [ ] Voice: warm, personal, direct — not marketing-speak

---

### PAGE: Why Studio
**Route:** `/why-studio`
**Purpose:** Explain Studio membership value vs free. Convert free users to members.

**Key sections:**
1. What's included (credits, MY MODEL mode, Academy, drops)
2. vs free comparison
3. Testimonials
4. Pricing + CTA

**Voice:** Direct comparison. No fluff. "Here's exactly what you get."

**Design audit items:**
- [ ] Comparison table: Whisper borders only
- [ ] Price: Cormorant 200 for the number, Inter 300 for the descriptor
- [ ] No colored checkmarks (use text or subtle icons)

---

### PAGE: Bio
**Route:** `/bio`
**Purpose:** Sandra's personal page / link-in-bio replacement.
**Design:** Ultra-minimal. Just Sandra's face, a few links, and SSELFIE CTA.

---

### PAGE: Share Your Story
**Route:** `/(public)/share-your-story`
**Purpose:** Community / UGC submission page.

---

### PAGE: Brand Engine
**Route:** `/brand-engine`, `/brand-engine/vip`
**Purpose:** Lead generation for Brand Engine product / VIP service.

---

### PAGE: Apply — Brand Engine
**Route:** `/apply/brand-engine`
**Purpose:** Application form for Brand Engine service.

**Design audit:**
- [ ] Form fields follow input spec
- [ ] Labels: Inter 500, 9px, UPPERCASE
- [ ] Submit CTA: primary button spec

---

### PAGE: Prompt Guides
**Route:** `/prompt-guides`, `/prompt-guides/[slug]`
**Purpose:** Free SEO content / lead magnet — AI photo prompt guides.

**Design audit:**
- [ ] Editorial layout (not blog-template)
- [ ] Typography: Cormorant for article titles, Inter 300 for body
- [ ] CTA at end: "Try this in Maya →"

---

### PAGE: Blueprint
**Route:** `/blueprint`, `/blueprint/paid`
**Purpose:** Free/paid brand strategy blueprint product.

---

### PAGE: Privacy + Terms
**Routes:** `/privacy`, `/terms`
**Purpose:** Legal pages. Functional, minimal.
**Voice:** Plain language. No legalese where possible.
**Design:** Minimal. White background, black text, Inter 300. No glassmorphic elements.

---

## 4.B AUTH PAGES

All auth pages: dark background (`#0a0a0a`), centered card, minimal chrome.

---

### PAGE: Login
**Route:** `/auth/login`
**Component:** `app/auth/login/page.tsx`

**Anatomy:**
1. SSELFIE wordmark (Cormorant 200, UPPERCASE, center)
2. Headline: `WELCOME BACK` (Cormorant 200, 28px)
3. Sub: Inter 300, 13px, text-3
4. Email + password inputs (follow input spec)
5. "Forgot password?" — ghost text link
6. Primary CTA: "Sign in"
7. "Don't have an account? Sign up →" — ghost

**Design audit:**
- [ ] Card: glass-2, border-subtle, border-radius 16px, padding 32px
- [ ] No logo other than SSELFIE wordmark
- [ ] Input fields: follow spec (no browser default blue focus ring)
- [ ] Error state: follows error spec (red border, plain language message)
- [ ] "Remember me" if present: Inter 300, 12px, custom checkbox

**Copy audit:**
- [ ] Error: "That email or password isn't right. Try again?" (not "Invalid credentials")
- [ ] CTA: "Sign in" (not "Login" or "Submit")

---

### PAGE: Sign Up
**Route:** `/auth/sign-up`

**Anatomy:**
1. Wordmark
2. Headline: `CREATE YOUR ACCOUNT`
3. Sub: Inter 300, 13px — value hook, not just "Fill in your details"
4. Name, email, password inputs
5. Primary CTA: "Create account"
6. "Already have an account? Sign in →"
7. Terms acceptance: Inter 300, 11px, text-4 — inline, not a checkbox wall

**Copy audit:**
- [ ] Sub-headline includes a value statement (not just "Fill in your details")
- [ ] Error: plain language (see error spec)
- [ ] Terms copy: short and honest

---

### PAGE: Sign Up Success
**Route:** `/auth/sign-up-success`

**Anatomy:**
1. Wordmark
2. Headline: `YOU'RE IN.` (Cormorant 200, 36px)
3. Body: "Check your email to verify your account. Then we'll get you set up."
4. CTA: "Open my email →" (or resend verification)

**Design audit:**
- [ ] Celebratory but not over-the-top — warm, not confetti
- [ ] No emojis

---

### PAGE: Forgot Password
**Route:** `/auth/forgot-password`

**Copy:** "Enter your email. We'll send a reset link."
CTA: "Send reset link"
Success state: "Check your inbox. Link sent to [email]."

---

### PAGE: Setup Password
**Route:** `/auth/setup-password`

**Copy:** "Set your password."
**Fields:** New password, confirm password.
**CTA:** "Set password"

---

### PAGE: Auth Error
**Route:** `/auth/error`

**Copy:** Plain language. "Something went wrong with your sign-in. Try again?"
**CTA:** "Try again →" (links back to login)

---

## 4.C ONBOARDING

---

### FLOW: Brand Profile Wizard
**Component:** `brand-profile-wizard.tsx`
**Trigger:** First time user completes sign-up
**Steps:** Name → Niche → Audience → Tone → Review

**Design spec:**
- Full-screen flow, dark background
- Progress: step dots (follow step indicator spec — pill for active, dot for others)
- Each step: glass-2 card, single question per screen
- Input: full-width, large (Inter 300, 16px, generous padding)
- CTA: "Next →" (primary button, full-width)
- Back: ghost text link, top-left

**Voice:**
- Questions in Sandra's voice: "What do you do?" → "`WHAT'S YOUR BRAND ABOUT?`"
- Sub-copy: conversational. "Don't overthink it. You can change this later."
- Never: "Please provide your niche category"

**Audit items:**
- [ ] One question per screen — never two inputs on same step
- [ ] Skip option on every optional step
- [ ] "You can change this later" on all steps to reduce friction
- [ ] Zero emojis in any prompt copy

---

### FLOW: Unified Onboarding Wizard
**Component:** `onboarding-wizard.tsx` → `components/onboarding/unified-onboarding-wizard.tsx`
**Trigger:** Post sign-up, after brand profile
**Purpose:** Get user to first image (TTFI)

---

### FLOW: Studio Member Onboarding
**Component:** `studio-member-onboarding.tsx` (NEW — UX-08)
**Trigger:** `isMembership && firstTimeProductUser`
**Design ref:** `output/design/v3-studio-onboarding.html` Step 1–3

See UX-08 spec in MASTER-PLAN-2026-02-28.md Section 4, Phase 3.

---

## 4.D APP / STUDIO SCREENS

**Base layout:** All app screens run within `sselfie-app.tsx` and `studio/page.tsx`.
Tab bar: Maya / Feed / Gallery / Academy (+ Profile icon top-right).

---

### SCREEN: Maya — SELFIE Mode
**Component:** `maya-chat-screen.tsx`, `pro-mode/ProModeChat.tsx`, `pro-mode/ImageUploadFlow.tsx`
**Route:** `/studio?tab=maya`

**Key sub-areas:**
- Mode toggle row: `SELFIE` / `MY MODEL` (membership only)
- Chat interface: `maya-chat-interface.tsx`
- Image upload (SELFIE mode): `ImageUploadFlow.tsx`
- Quick prompts: `maya-quick-prompts.tsx`
- Input bar: `maya-unified-input.tsx`

**Empty state (first-time free user):**
```
Card (glass-2, border-faint):
  Cormorant 200 UPPERCASE: "WHAT'S YOUR BRAND STORY?"
  Inter 300 12px text-3: "Maya builds your strategy first — no credits needed."
  Full-width CTA: "Build my brand strategy →"
Divider: "OR" (Inter 500 9px UPPERCASE text-4)
3 numbered prompts: 01 / 02 / 03 (no emojis)
Note: Inter 300 10px text-4: "Images won't look like you yet — Studio members personalise with their selfies"
```

**Empty state (first-time Studio member):**
See UX-02 spec in MASTER-PLAN-2026-02-28.md

**Returning member state:**
See UX-09 spec (membership-home-card.tsx)

**Post-generation conversion card:**
See UX-02 addition in MASTER-PLAN-2026-02-28.md

**Audit items:**
- [ ] Mode toggle: shows only for `isMembership`
- [ ] Mode labels: "SELFIE" and "MY MODEL" (not "Pro" and "Classic")
- [ ] Zero emojis in any prompt copy (use 01/02/03 numbers)
- [ ] Image upload zone: follows input spec
- [ ] Loading state: "Generating your photo..." (not "Loading...")

---

### SCREEN: Maya — MY MODEL Mode
**Component:** `maya-chat-screen.tsx` (Classic tab), `concept-card.tsx`

**Empty state (member, no trained model):**
```
Cormorant 200 UPPERCASE: "TRAIN YOUR PERSONAL MODEL"
Inter 300 13px: "10–15 photos. ~30 minutes. Your model runs forever."
CTA: "Start training →" (switches to Training tab)
```

**Audit items:**
- [ ] Label: "MY MODEL" not "Classic"
- [ ] Concept cards: follow concept-card spec (no rogue colors)

---

### SCREEN: Maya — Training Tab
**Component:** `maya-training-tab.tsx`, `training-screen.tsx`

**Access:** Previously membership-only. NOW: all users with 20+ credits (CONFIRMED).

**States:**
1. No model trained → upload prompt
2. Training in progress → progress indicator + "Training your model..."
3. Model ready → model details + retrain option

**Audit items:**
- [ ] Credits check: show "Training costs 20 credits. [Buy credits →] or [Join Studio →]" if < 20 credits
- [ ] Training in progress: pulsing status dot + Inter 300 copy, no emoji
- [ ] Completion: "Your model is ready." (not "Training complete!")

---

### SCREEN: Maya — Prompts Tab
**Component:** `maya-prompts-tab.tsx`

**States:**
- Locked (no AI Photo Prompts purchase): lock state per UX-10 spec
- Unlocked: full prompt library

**Audit items:**
- [ ] Lock state copy: "UNLOCK 100+ CURATED PROMPTS" with honest CTA "Get it for €17 →"
- [ ] 3 prompts greyed out (opacity-50) as preview
- [ ] No emojis in any prompt copy

---

### SCREEN: Maya — Videos Tab
**Component:** `maya-videos-tab.tsx`

---

### SCREEN: Feed Planner
**Component:** `content-calendar-screen.tsx`, `calendar-week-view.tsx`
**Route:** `/studio?tab=feed` or `/feed-planner`

**Empty state:**
```
Cormorant 200 UPPERCASE: "YOUR FEED IS BLANK"
Inter 300 13px: "You'll need photos first. Generate them in Maya →"
CTA: "Open Maya →" (switches to Maya tab)
```

**Audit items:**
- [ ] Calendar: Whisper borders, no colored event backgrounds (use text-4 through text-1 for hierarchy)
- [ ] Post cards: glass-1 or glass-2 (no solid colors)
- [ ] Empty state uses correct copy (above)

---

### SCREEN: Gallery
**Component:** `gallery-screen.tsx`, `gallery/`
**Route:** `/studio?tab=gallery`

**Empty states:**
- Free user: "Generate your first photo in Maya to see it here →"
- Membership user: "Generate your first photo in Maya →" [switch to Maya tab]

**Audit items:**
- [ ] Image grid: no rogue borders or colored accents
- [ ] Selection state: glass-3 overlay on image (no colored border)
- [ ] Fullscreen modal: follows modal spec
- [ ] Filter row: Inter 500 9px UPPERCASE labels, glass chips

---

### SCREEN: Academy (in-app)
**Component:** `academy-screen.tsx`
**Route:** `/studio?tab=academy`

**Key sections:**
1. Mini-products row (4 products)
2. Monthly drops section
3. Courses/resources

**Product card spec:**
```
glass-2, border-faint, border-radius 12px
Product name: Cormorant 200, 18px, UPPERCASE
Price: Inter 300, 14px, text-3 — "€17 one-time" or "Included"
CTA: "Open →" (owned) / "Get it for €17 →" (not owned)
```

**Audit items:**
- [ ] "Included" label for products owned via membership (not "Purchased" or "Owned")
- [ ] Monthly drop section: hide if no current drop
- [ ] No price in the card title
- [ ] Course cards: follow same pattern as product cards

---

### SCREEN: Profile / Account
**Component:** `profile-screen.tsx`, `account-screen.tsx`
**Route:** `/studio?tab=profile` or within settings

**Sections:**
1. Profile photo + name + brand summary
2. Credits balance
3. Subscription status
4. Settings link
5. Sign out

**Audit items:**
- [ ] Credits: Cormorant 200, 24px for number; "credits" in Inter 300, 12px, text-4
- [ ] Subscription: plain statement "Studio Member · Renews [date]"
- [ ] Danger zone (delete account): ghost text, text-4, at the very bottom

---

### SCREEN: Settings
**Component:** `settings-screen.tsx`

**Sections:** Account, Notifications, Billing, Privacy, Support, Sign out

**Audit items:**
- [ ] Section headers: Inter 500, 9px, UPPERCASE, letter-spacing 0.3em, text-4
- [ ] List items: Inter 300, 14px, text-2 (label), Inter 300, 12px, text-4 (sub-description)
- [ ] Separators: 1px Whisper (`#e5e5e5` on light, `var(--border-faint)` on dark)
- [ ] Destructive actions (sign out, delete): red-tinted text ONLY (not red button)

---

## 4.E CHECKOUT & TRANSACTIONAL

All checkout pages: dark background, single-column, no distractions.

---

### PAGE: Checkout (Membership)
**Route:** `/checkout/membership`

**Anatomy:**
1. "STUDIO MEMBERSHIP" — Cormorant 200, 28px
2. What's included — bullet-free list (inline prose)
3. Price: "€97 / month"
4. Payment form (Stripe Elements)
5. CTA: "Start my Studio →"
6. "Cancel any time. No contracts." — Inter 300, 11px, text-4, center

**Audit items:**
- [ ] Price in Cormorant 200 (number) + Inter 300 (descriptor)
- [ ] Stripe Elements: styled to match input spec (dark background, our border colors)
- [ ] Trust copy: "Cancel any time." always present, always below CTA
- [ ] No urgency manipulation ("Offer expires!", "Only 3 spots!")

---

### PAGE: Checkout (Credits)
**Route:** `/checkout/credits`

**Copy:** "20 credits. Train your personal AI model." / "Buy 50 credits for €X."
**Price:** Clear. No bundles that obscure per-credit cost.

---

### PAGE: Checkout Success
**Route:** `/checkout/success`

**Anatomy:**
1. Wordmark
2. Headline: `YOU'RE IN.` (Cormorant 200, 36px) — OR for credits: `CREDITS ADDED.`
3. Body: warm 1-sentence confirmation
4. CTA: "Open Maya →" or "Start creating →"

**Voice:** Celebratory but grounded. "That's your Studio. Let's get to work."

**Audit items:**
- [ ] No confetti animations — warm, editorial, not party
- [ ] CTA takes user directly to relevant screen (Maya for new member, training for credits purchase)

---

### PAGE: Checkout Cancel
**Route:** `/checkout/cancel`

**Copy:** "Changed your mind? No worries." + "Come back whenever you're ready →"
**No guilt-tripping.** No "Are you sure?" No dark patterns.

---

### PAGE: Academy Product Success
**Route:** `/academy/success`

**Copy:** "Got it. [Product name] is yours." + deep-link to open product in Maya.
**CTA:** "Open [Product name] in Maya →"

---

## 4.F ACADEMY (PUBLIC PAGES)

---

### PAGE: Academy Landing
**Route:** `/academy`
**Component:** `app/academy/page.tsx`
**Design ref:** `output/design/v3-academy.html`

**Key sections:**
1. Header: "ACADEMY" + sub
2. Featured product (What To Say)
3. Product grid (4 mini-products)
4. Studio membership upsell section

**Audit items:**
- [ ] Product cards: follow product card spec (Cormorant title, Inter price, CTA)
- [ ] Price: always shows "€X one-time" or "Included in Studio"
- [ ] No countdown timers

---

### PAGE: Academy Product Page
**Route:** `/academy/products/[productId]`

**Anatomy:**
1. Product name (Cormorant 200, 32px, UPPERCASE)
2. One-line hook (Inter 300, 16px, text-3)
3. What's inside (prose list — no bullets, inline)
4. Who it's for (1 paragraph, Sandra's voice)
5. Price + CTA
6. "Also included in Studio →" link

**Audit items:**
- [ ] "Also included in Studio" always present for membership upsell
- [ ] Price: never "buy now", always "Get [product name] for €X →"
- [ ] No fake scarcity

---

## 4.G ADMIN PAGES

Admin pages are internal tools. Brand aesthetic applies, but less strictly.

**Minimum requirements:**
- Dark background (app theme)
- Cormorant + Inter fonts
- No external UI libraries that clash
- Admin badge: Inter 500, 9px, UPPERCASE, text-4 — always visible in header

**Pages:** Dashboard, Academy management, Analytics, Credits, Marketing/Broadcasts, Agents, Testimonials, Mission Control

---

## 4.H SHARED / ROUTE PAGES

---

### PAGE: What's New
**Route:** `/whats-new`
**Purpose:** Changelog / updates. Builds trust and retention.
**Voice:** Personal. "Here's what's new this month." Not "Release notes v2.4.1"

---

### PAGE: Feed (Public)
**Route:** `/feed/[feedId]`
**Purpose:** Shareable content feed for user's generated images.

---

### PAGE: Diagnostics
**Route:** `/diagnostics`
**Purpose:** Internal health check. Not user-facing.

---

# PART 5: DAILY AUDIT PROTOCOL

How agents check the product every day for inconsistencies.

---

## 5.1 The Four Inconsistency Types

Every issue found during an audit falls into one of these categories:

**Type D — Design token violation**
A color, font, weight, or spacing that's not in the design system.
Examples: `#333333` used instead of `#0a0a0a`, `font-weight: 400`, `border-radius: 99px`

**Type C — Copy/voice violation**
A word, phrase, or pattern that breaks Sandra's voice or uses forbidden words.
Examples: "leverage", "Please wait...", "Invalid credentials", emojis in UI

**Type P — Pattern violation**
A component that deviates from the canonical pattern (wrong button type, wrong card level, wrong input style).
Examples: Solid background card where glass should be used, wrong border on tabs

**Type U — UX spec violation**
A behavior or state that doesn't match the spec in this guide or MASTER-PLAN-2026-02-28.md.
Examples: Mode toggle visible to free users, Training tab shows for users with 0 credits, empty state missing CTA

---

## 5.2 Daily Audit Checklist

Run this every day. Check each area systematically.

### Tier 1 — Check daily (high-traffic, high-stakes)
- [ ] **Maya empty states** — correct text, no emojis, correct CTA
- [ ] **Mode labels** — "SELFIE" and "MY MODEL" everywhere (not "Pro"/"Classic")
- [ ] **Checkout pages** — price, trust copy, CTA text
- [ ] **Login / Sign up** — error states, copy, CTA labels
- [ ] **Post-generation card** — free user vs member versions

### Tier 2 — Check 3x/week
- [ ] **Studio onboarding flow** (new member) — step indicators, copy, CTAs
- [ ] **Returning member home card** — credits display, drops row (only if live)
- [ ] **Academy product pages** — prices, "Included in Studio" link, CTAs
- [ ] **Training tab** — credit check, copy, locked states
- [ ] **Gallery empty states** — correct per user type

### Tier 3 — Check weekly
- [ ] **Homepage / landing** — full font and color audit
- [ ] **Auth pages** — all error states test
- [ ] **Settings screen** — section headers, list items, separators
- [ ] **Feed Planner** — empty state, card styles
- [ ] **Admin pages** — minimum brand requirements

### Tier 4 — Check monthly (full audit)
- [ ] **Every page in Part 4** — complete visual and copy audit
- [ ] **Component library** — any new components added? Do they follow specs?
- [ ] **Email templates** — voice, formatting, CTA text
- [ ] **Loading states** — all spinners, all skeleton loaders
- [ ] **Error states** — all error messages in plain language

---

## 5.3 How to Flag and Log Issues

When an inconsistency is found, create a log entry in the format:

```
DATE: [date]
TYPE: [D / C / P / U]
PAGE/COMPONENT: [route or component filename]
WHAT'S WRONG: [specific description]
WHAT IT SHOULD BE: [exact fix, referencing the spec section]
PRIORITY: [P0 = blocks activation / P1 = visible to most users / P2 = edge case]
ASSIGNED TO: [codex / north-code / north-content]
```

Save log to: `~/stella/reports/audit-log-[date].md`

---

## 5.4 Agent-Specific Audit Workflow

### north-code daily task
```bash
1. For handoff/deploy notes only: ~/stella/SHARED_MEMORY.md; for deploy truth use STATUS.md and NORTH_ACTIVE.md
2. Check Vercel for any build warnings
3. Run visual diff on last 3 merged PRs (git diff HEAD~3 HEAD -- components/)
4. If any Type D/P issues found → write Codex spec immediately, queue it
5. Update audit log
```

### north-content weekly task
```bash
1. Read any new copy added in last 7 days (git log --since="7 days ago" --name-only)
2. Check every new string against Part 3 voice guide
3. If any Type C issues found → write corrected copy to ~/stella/tasks/CONTENT-copyfix-[date].md
4. Flag to north-code if copy lives in a component (needs Codex to update)
```

### north-product per-build task
```
Before delivering any HTML product:
1. Run design-check skill against the full output
2. Verify all 5 colors only
3. Verify Cormorant + Inter only
4. Verify zero emojis
5. Verify all copy passes voice guide
6. Sign off in ~/stella/reports/product-review-[product-name].md
```

---

## 5.5 The Consistency Score

Every weekly audit produces a score. Track this over time.

```
Total issues found: N
  Type D: ___
  Type C: ___
  Type P: ___
  Type U: ___

P0 issues: ___ (must fix before next deploy)
P1 issues: ___ (fix within 48h)
P2 issues: ___ (fix in next sprint)

Consistency score: (total pages audited - pages with issues) / total pages audited × 100
Target: ≥ 90%
```

Save to: `~/stella/reports/consistency-score-[date].md`

---

# APPENDIX: QUICK REFERENCE CARD

For agents who need a fast check before building anything.

---

## Design — 30-second check

```
Colors?     Only: #0a0a0a, #ffffff, #f5f5f5, #666666, #e5e5e5
            App glass: rgba(255,255,255, 0.04/0.07/0.10/0.14)
Fonts?      Cormorant Garamond (headers, UPPERCASE, weight 200-300)
            Inter (body weight 300, labels weight 500)
Spacing?    8-point grid. Min 32px side padding. Never cram.
Cards?      Glass system. Never solid backgrounds in dark app UI.
Buttons?    Primary = white bg, dark text. Secondary = glass. Ghost = transparent.
Radius?     4px chips, 8px buttons, 12-16px cards, 24px sheets.
Emoji?      ZERO in any app UI. Numbers 01/02/03 instead.
```

## Copy — 30-second check

```
Voice?      "Would Sandra text this to a friend?" If no → rewrite.
CTA?        Verb + object. Arrow → on text links. "Sign in" not "Submit".
Errors?     Plain language. "That didn't work. Try again?" not "Error 422".
Loading?    Present tense. "Generating..." not "Please wait..."
Labels?     Inter 500, UPPERCASE, 9px. Noun phrases only.
Forbidden?  leverage, transform, unlock, game-changer, hustle, viral, influencer
Mode names? SELFIE mode (Nano Banana). MY MODEL (trained Flux). NOT Pro/Classic.
```

## UX — 30-second check

```
Empty states?  3 parts: acknowledge + value + single CTA.
Error states?  Never scary. Always recoverable. Always plain language.
Onboarding?    One thing per step. Skip on every optional step.
Membership?    MY MODEL + mode toggle + Training tab + credits + drops.
Free users?    SELFIE mode + welcome credits + mini-product CTAs.
Training?      Open to all. Gate: 20 credits. No membership gate.
Mini-products? ALL included in Studio membership.
Monthly drops? One new product/month. Hidden until first drop is live.
```

---

*Last updated: 2026-02-28*
*Maintained by: North (strategy), Claude (design + voice), north-code (implementation)*
*Source files: output/design/v3-*.html | Decisions: MASTER-PLAN-2026-02-28.md*
