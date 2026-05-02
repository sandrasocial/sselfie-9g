# SSELFIE Design And Voice System

*Last updated: 2026-05-02. This is the active source of truth for SSELFIE Studio design, voice, and future product UI.*

---

## Product Identity

SSELFIE is not a real estate product. SSELFIE is for women building personal brands from their phone, their story, and their everyday life.

**One-line positioning:**

> I help women start making money online by turning their phone, story, and everyday life into a personal brand they can actually build from.

SSELFIE should feel like a soft luxury personal brand studio: feminine, editorial, honest, grounded, and easy to use.

The product should never feel like a generic SaaS dashboard, a coaching funnel, or a cold AI tool.

---

## Design North Star

**Cool editorial app. Soft luxury product. Recognition-based voice.**

The current SSELFIE workbook style is the visual foundation: white, pearl, black, and stone-gray palettes; Cormorant display type; Inter UI type; generous spacing; rounded product surfaces; and a calm premium feeling.

Borrow from the SSELFIE Agents style guide only where it elevates this product:

- Keep: letterpress depth, tactile texture, editorial layouts, visual-first hierarchy, restrained animation, quiet confidence.
- Do not copy: real estate positioning, zero-radius UI everywhere, overly strict sharp-corner rules, cold commercial language.

---

## Core Visual Principles

1. **Workbook palette first.** Use white, pearl, black, smoke, whisper, and stone-gray neutrals as the base.
2. **Rounded product UI stays.** Cards, modals, buttons, inputs, dropdowns, and chat surfaces keep soft rounded corners.
3. **Photos are editorial.** Photos, generated images, thumbnails, and gallery grids should feel image-led and may use sharper or minimal radius treatment.
4. **Letterpress adds luxury.** Headings and major surface labels should feel pressed into the page, not flat or techy.
5. **Less glass, more material.** Avoid random glassmorphism. Use pearl surfaces, inset shadows, subtle borders, and texture.
6. **One system across products.** Workbooks, Maya, Gallery, Feed Planner, Academy, Account, onboarding, checkout, and modals must share the same color, type, spacing, and component language.

---

## Color System

These tokens are the base for all new work. Prefer CSS variables and design tokens over hardcoded hex values.

| Token | Hex | Usage |
| --- | --- | --- |
| `obsidian` | `#0A0A0A` | Primary dark surface, primary text on light |
| `porcelain` | `#FFFFFF` | Clean white surfaces and text on dark |
| `pearl` | `#F5F5F5` | Secondary backgrounds, workbook panels, soft card fills |
| `smoke` | `#666666` | Body text, captions, secondary copy |
| `whisper` | `#E5E5E5` | Borders, dividers, subtle separators |
| `stone` | `#8A8780` | Muted labels, metadata, quiet UI text |
| `stoneDark` | `#2C2B29` | Dark gray text and panels when pure black is too strong |
| `stoneSoft` | `#D4D1CC` | Soft gray borders and quiet fills |

**Rules:**

- White is allowed when it matches the workbook look. Use it intentionally, not as a default SaaS blank space.
- Pearl is the preferred soft surface for workbook-style panels and light app sections.
- Black and stone-gray create the premium contrast.
- Warm cream tokens from older public-page work are legacy unless Sandra explicitly approves them for a specific surface.
- Gold accent `#c9a96e` is retired. Do not reintroduce it.
- Do not add new colors without Sandra's approval.
- Body copy on dark must use white or a high-contrast cool gray. Muted stone-gray is for labels only.
- Course and workbook writing fields use white or pearl surfaces with black text.

---

## Typography

| Role | Family | Weight | Notes |
| --- | --- | --- | --- |
| Display and page headings | Cormorant Garamond | 300 to 500 | Elegant, editorial, never overly heavy |
| Body, UI, buttons, labels | Inter | 400 to 600 | Clean, readable, simple |

**Rules:**

- Keep Cormorant Garamond and Inter. Do not add new font families.
- Weight 200 does not exist for Cormorant in this project. Use 300 minimum.
- Headings can be sentence case or title case when it feels more human. They do not need to be all caps.
- Eyebrows and button labels can be uppercase with generous tracking.
- Body text should be easy to read and never too faint.
- Avoid decorative font experiments. Consistency is the luxury.

**Recommended scale:**

- Hero headline: `clamp(36px, 7vw, 70px)`
- Section title: `clamp(28px, 4.5vw, 48px)`
- Card title: `clamp(19px, 2.5vw, 26px)`
- Body: `15px` to `16px`
- Eyebrow: `10px`, uppercase, `0.24em` to `0.36em` tracking
- Button: `10px` to `11px`, uppercase, `0.18em` to `0.24em` tracking

---

## Letterpress

Letterpress is part of the SSELFIE premium feeling. Use it on major headings, hero copy, workbook titles, premium product surfaces, and selected navigation or logo treatments.

Do not overuse it on body copy, helper text, long paragraphs, or every tiny UI label.

**On dark surfaces:**

```css
text-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5);
```

**On light surfaces:**

```css
text-shadow: 1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(10,10,10,0.08);
```

---

## Texture And Surface Depth

SSELFIE should feel tactile and material, not flat.

Use subtle texture on major public sections, workbook pages, premium product pages, and large app surfaces where it adds material depth.

**On dark surfaces:** subtle screen texture, low opacity.

**On white or pearl surfaces:** subtle multiply texture, slightly higher opacity.

Use inset shadows, quiet borders, and pearl surfaces before heavy drop shadows.

Avoid:

- Random glass panels
- Cold translucent cards
- Heavy floating shadows
- Random warm cream surfaces that do not match the workbook palette
- Large flat gray areas

---

## Radius System

Rounded UI is part of SSELFIE's app feel. Do not apply the zero-radius rule from the Agents guide to this project.

| Surface | Radius |
| --- | --- |
| Buttons | `6px` to `12px` |
| Small chips and badges | `6px` to `10px` |
| Cards and panels | `16px` to `28px` |
| Modals and drawers | `20px` to `32px` |
| Inputs and textareas | `12px` to `20px` |
| Avatars and status dots | `50%` |
| Photos, thumbnails, gallery images | `0px` to `8px`, unless a specific product card needs softness |

Photos should feel editorial and image-led. Avoid overly pill-shaped or bubbly image masks.

---

## Buttons

Buttons should feel confident, clean, and tactile.

**Primary on white or pearl:**

```css
background: #0A0A0A;
color: #FFFFFF;
border: 1px solid transparent;
border-radius: 8px;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.35), 0 8px 24px rgba(10,10,10,0.18);
```

**Primary on dark:**

```css
background: #FFFFFF;
color: #0A0A0A;
border: 1px solid transparent;
border-radius: 8px;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.80), inset 0 -2px 0 rgba(0,0,0,0.12), 0 4px 18px rgba(0,0,0,0.28);
```

**Secondary:**

```css
background: transparent;
border: 1px solid #E5E5E5;
color: #666666;
border-radius: 8px;
```

Rules:

- One clear primary action per section or modal.
- Keep labels short.
- Avoid gradients on buttons.
- Avoid pill buttons unless a legacy app pattern requires it temporarily.

---

## Cards, Modals, And Forms

Cards and modals should be rounded, cool, clean, and quiet.

**Light card:**

```css
background: #F5F5F5;
border: 1px solid #E5E5E5;
border-radius: 20px;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 12px rgba(0,0,0,0.05);
```

**Dark card:**

```css
background: #0A0A0A;
border: 1px solid rgba(229,229,229,0.14);
border-radius: 20px;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
```

**Form fields:**

- Label above field. Do not rely on placeholder as label.
- White or pearl writing surfaces for workbooks, lessons, reflections, and Maya profile inputs.
- Dark-on-dark fields are only for short utility inputs, never long writing.
- Error states use a border and text below the field. Do not use aggressive modals for simple validation.

---

## Images And Visual Hierarchy

Images carry emotion. Text explains what the image makes the user feel.

Rules:

- Use image-led layouts on public pages, product pages, and feature introductions.
- Prefer full-bleed or edge-to-edge imagery when possible.
- Use dark gradients for text overlays on images.
- Text on images should be left-aligned and placed in the lower third.
- Gallery images, generated photos, thumbnails, and feed previews should feel clean and editorial.
- Avoid stock-looking images, overly bright HDR edits, and generic SaaS illustration energy.

Recommended ratios:

- Hero: full viewport or `16 / 9`
- Product or feature image: `4 / 5`
- Gallery thumbnail: `1 / 1`, `4 / 5`, or native output ratio
- Feed preview: match Instagram grid logic

---

## Layout

SSELFIE layouts should feel editorial, spacious, and guided.

Rules:

- Mobile first.
- Use generous negative space.
- Prefer left-aligned body text.
- Use centered text sparingly for short statements or empty states.
- One dominant idea per section.
- Avoid cluttered dashboard density.
- Public pages can use stronger asymmetry and image-led hero sections.
- App screens should stay clear, calm, and easy for non-technical users.

Public pages should borrow the best of the Agents style guide: image-first sections, tactile material depth, letterpress headings, scroll reveal, and strong black / white / pearl rhythm.

Authenticated app screens should borrow the feeling, not blindly copy the layout. Maya, Gallery, Feed Planner, Academy, Account, and modals still need product clarity.

---

## Motion

Motion should feel calm, subtle, and physical.

Use:

- Fade in with slight upward movement
- `opacity: 0` to `1`
- `translateY(16px)` to `0`
- Image hover zoom: `scale(1.02)` to `1.03`
- Duration: `200ms` to `700ms`, depending on surface

Avoid:

- Bounce
- Elastic easing
- Loud looping animation
- Slide-ins from every direction
- Motion that makes the app feel busy

Public marketing intro screens may use the SSELFIE letter reveal pattern. Do not add intro screens to authenticated product surfaces unless Sandra explicitly asks.

---

## Navigation

Navigation should stay calm, minimal, and easy to understand.

Rules:

- Fixed app navigation is allowed.
- Keep labels short.
- Active states should be clear but not loud.
- Dropdowns should close on outside click, Escape, and item selection.
- Do not add permanent second rows unless the screen truly needs them.
- App navigation can be rounded because it is product UI.

---

## Voice North Star

SSELFIE is recognition-based, not motivational.

People should read the copy and think:

> Wait. That is exactly how I feel.

**One-line voice:**

> I say the things women feel but do not say out loud, while I am still living through it myself.

Voice:

- Honest
- Grounded
- Self-aware
- Simple everyday language

Tone:

- Calm
- Reflective
- Direct

Style:

- Short sentences
- Minimal fluff
- One idea per line when writing emotional or public-facing copy
- Every line should feel real

Feeling:

- Like a late-night truth you did not plan to say
- Like a conversation, not a caption

---

## Voice Rules

SSELFIE is not a coach voice. It is a woman telling the truth in real time while still becoming.

Write like:

- A thought you did not plan to say
- A message sent at 2am
- A calm truth
- Something a woman recognizes before she can explain it

Do not write like:

- A speech
- A lesson
- A performance
- A SaaS company
- An Instagram coach

Never use:

- "Unlock your potential"
- "Step into your power"
- "Level up"
- "This is your sign"
- "Transform your life"
- "Game-changer"
- "AI-powered solution"

If it sounds like Instagram coaching, cut it.

---

## Copy Structure

Use this hidden structure for public copy, emails, Maya suggestions, product pages, and workbook prompts when appropriate:

1. Hook: something real, slightly uncomfortable.
2. Recognition: a truth people feel but do not say.
3. Shift: what changed.
4. Identity: who she is becoming.
5. Open loop: she is still in it.

Example:

```text
I thought I would have it figured out by now.

I do not.

But I trust myself more than ever.
```

Final filter:

- Does this feel real or performed?
- Would Sandra say this out loud?
- Is this trying to sound smart, or honest?
- Does it create recognition instead of giving a pep talk?

---

## Product Voice By Surface

**Maya:** warm, empowering, practical, direct. Maya can be encouraging, but she should not sound fake or overly motivational.

**Workbooks and Academy:** reflective, grounded, spacious. Ask better questions. Do not lecture.

**Public pages:** confident, visual, outcome-led. Short copy. Images do the emotional work.

**Checkout and account:** clear, calm, trustworthy. No pressure language.

**Errors and empty states:** human, simple, useful. Say what happened and what to do next.

---

## Retired Or Avoid

| Element | Reason |
| --- | --- |
| Real estate positioning | Belongs to the separate Agents project, not SSELFIE Studio |
| Zero-radius UI everywhere | Not the SSELFIE app direction |
| Gold accent `#c9a96e` | Retired |
| Unintentional pure white space | Can feel clinical if not shaped by type, spacing, or imagery |
| Random hardcoded colors | Breaks consistency |
| Heavy glassmorphism | Older app style, use sparingly during migration only |
| Flat headings with no depth | Letterpress is part of the elevated system |
| Overly faint text | Hurts readability |
| Generic SaaS copy | Breaks the emotional truth of SSELFIE |
| Motivational coach language | SSELFIE is recognition-based |

---

## Implementation Source Of Truth

This document is the design and voice source of truth.

Implementation should align in this order:

1. `app/globals.css`: global CSS variables, paper textures, shared utility classes.
2. `lib/design-tokens.ts`: reusable component class tokens.
3. Product components: Maya, Studio, Gallery, Feed Planner, Academy, Account, checkout, modals, and wizards.

When existing code conflicts with this guide, migrate gradually and safely. Do not rewrite whole screens unless Sandra explicitly approves a redesign.

For broad visual cleanup, start with tokens and shared classes before editing individual screens.
