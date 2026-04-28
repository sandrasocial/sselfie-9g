# SSELFIE Design System

*Last updated: 2026-04-24 — Supersedes all previous color/component specs*

---

## System Name: SSELFIE Agents

This is the canonical design system for all SSELFIE public-facing surfaces
(landing pages, marketing components, checkout pages). The in-app UI (Maya,
Gallery, Feed Planner, Academy) follows this system for new work.

---

## Core Principle

**Scandinavian luxury press.** Like a beautifully typeset book printed on
cream stock. Depth through letterpress, not glow effects. Space through
restraint, not white emptiness.

---

## Color Palette


| Token          | Hex       | Usage                                       |
| -------------- | --------- | ------------------------------------------- |
| `ink`          | `#0F0D0B` | Primary dark surface, body text on cream    |
| `inkSoft`      | `#1B1713` | Dark panels on ink surfaces                 |
| `inkLift`      | `#241F19` | Raised dark cards, form fields, lesson panels |
| `cream`        | `#EDE9E2` | Primary light surface, primary text on dark |
| `creamWarm`    | `#F4F0E6` | Cards and panels on cream surfaces          |
| `creamDeep`    | `#D9D3C8` | Borders and dividers on cream surfaces      |
| `stone`        | `#C4B5A0` | Secondary text on dark, accents             |
| `onDark`       | `#F4F0E6` | Heading text on dark surfaces               |
| `onDarkSub`    | `#D8CFC0` | Body text on dark surfaces                  |
| `onDarkMuted`  | `#A79B8B` | Eyebrow text, labels on dark                |
| `onCream`      | `#0F0D0B` | Heading text on cream surfaces              |
| `onCreamSub`   | `#3D3830` | Body text on cream surfaces                 |
| `onCreamMuted` | `#7A6F63` | Eyebrow text, labels on cream               |


**Dividers:**

- On dark: `rgba(244,240,230,0.16)`
- On dark, strong/form borders: `rgba(244,240,230,0.26–0.28)`
- On cream: `rgba(15,13,11,0.10)`

**There is no gold accent (#c9a96e).** That is retired. Do not reintroduce it.

**Dark readability rule:** Body copy, prompts, lesson text, form input text, and chat responses on dark surfaces use `onDarkSub`, never `stone` or `onDarkMuted`. `stone` and `onDarkMuted` are reserved for eyebrows, metadata, quiet labels, and decorative numerals. If a user needs to read it as instruction or content, it must be `#D8CFC0` or brighter.

**Course writing surface rule:** When a learner is expected to type, use a cream paper field inside the dark course frame. Reflection boxes, Maya profile answers, and lesson chat composers use `creamWarm` with `ink` text and a subtle ink border. Do not use dark-on-dark fields for long-form learner input.

---

## Typography


| Role              | Family             | Weight | Size                       | Tracking                    |
| ----------------- | ------------------ | ------ | -------------------------- | --------------------------- |
| Display / Hero H1 | Cormorant Garamond | 300    | `clamp(36px, 7vw, 70px)`   | `-0.02em`                   |
| H2 section title  | Cormorant Garamond | 300    | `clamp(28px, 4.5vw, 48px)` | `-0.015em`                  |
| H3 card/item      | Cormorant Garamond | 300    | `clamp(19px, 2.5vw, 26px)` | `0`                         |
| Eyebrow label     | Inter              | 600    | `10px`                     | `0.5em` (always uppercase)  |
| Body              | Inter              | 400    | `15px`                     | `0`                         |
| Body large        | Inter              | 400    | `16px`                     | `0`                         |
| Button            | Inter              | 600    | `10px`                     | `0.22em` (always uppercase) |


**Valid Cormorant Garamond weights:** 300, 400, 500, 600, 700.
**Weight 200 does not exist** — Turbopack will reject it. Use 300 as the minimum.

**Line heights:**

- Display: `1.03`
- H2: `1.07`
- H3: `1.18`
- Body: `1.78`

---

## Letterpress Text Shadows

Applied to ALL headings (h1, h2, h3). Never plain flat text on a surface.

**On dark surfaces:**

```css
text-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5);
```

**On cream surfaces:**

```css
text-shadow: 1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09);
```

Eyebrow labels: no text-shadow.
Body text: no text-shadow. Body text on dark must be 400 weight unless the text is decorative or nonessential.

---

## Paper Texture

Every section gets a fractal-noise SVG overlay. Mounted via `<PaperTexture dark={bool} />`.

SVG filter IDs are defined once in `<SvgPaperDefs />` inside `PublicPageShell`:

- `#sa-noise-dark`
- `#sa-noise-cream`

**On dark surfaces:** `opacity: 0.055`, `mix-blend-mode: screen`
**On cream surfaces:** `opacity: 0.18`, `mix-blend-mode: multiply`

The overlay sits at `z-index: 1`. Content sits at `z-index: 2`.

---

## Border Radius

**Zero everywhere.** No exceptions.

```
border-radius: 0;   /* always */
border-radius: 2px; /* never */
border-radius: 8px; /* never */
border-radius: 50%; /* exception only for circular UI controls, e.g. before/after slider handle */
```

---

## Buttons

**No pill shapes. No border-radius.**

Solid button — on dark surface (cream button):

```css
background: #EDE9E2;
color: #0F0D0B;
border: 1px solid transparent;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 2px 8px rgba(0,0,0,0.5);
padding: 13px 32px;
font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase;
```

Solid button — on cream surface (ink button):

```css
background: #0F0D0B;
color: #EDE9E2;
border: 1px solid transparent;
box-shadow: inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -2px 0 rgba(0,0,0,0.45),
            0 1px 5px rgba(0,0,0,0.25);
```

Ghost button — always transparent, border matches surface:

```css
background: transparent;
border: 1px solid rgba(237,233,226,0.22); /* on dark */
/* or */
border: 1px solid rgba(15,13,11,0.22);   /* on cream */
```

---

## Section Structure

Sections strictly alternate dark / cream. Page always starts with dark (hero).

```
Hero            → dark
Section 2       → cream
Section 3       → dark
Section 4       → cream
...
CTA Close       → dark (always end dark)
Footer          → dark
```

Every section has:

1. `position: relative`, `overflow: hidden`
2. `<PaperTexture dark={bool} />` at z-index 1
3. Content wrapper at `z-index: 2`
4. `padding: 88px 24px` standard sections, `padding: 68px 24px` on mobile

---

## Cards

Dark surface cards:

```css
background: #241F19;   /* inkLift */
border: 1px solid rgba(244,240,230,0.16);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
padding: 28px;
/* zero border-radius */
```

Cream surface cards:

```css
background: #F4F0E6;   /* creamWarm */
border: 1px solid rgba(15,13,11,0.10);
padding: 28px;
/* zero border-radius */
```

**No backdrop-filter/blur on cards.** No glassmorphism.

---

## Images

- Full-bleed hero images: `object-fit: cover`, overlay gradient `C.heroGrad`
- Section images: `aspect-ratio: 4/5`, no border-radius
- Preset grid images: `aspect-ratio: 1/1`, no border-radius
- Before/after slider: `aspect-ratio: 3/4`, no border-radius

Hero gradient:

```css
background: linear-gradient(to bottom,
  rgba(15,13,11,0.22) 0%,
  rgba(15,13,11,0.04) 38%,
  rgba(15,13,11,0.88) 100%);
```

---

## Motion / Scroll Reveal

Elements get `.mf` class for scroll-fade-in:

- Initial: `opacity: 0; transform: translateY(20px)`
- On intersect: `opacity: 1; transform: translateY(0)`
- Transition: `opacity 0.7s ease, transform 0.7s ease`
- IntersectionObserver threshold: `0.08`
- Stagger: `transitionDelay` in 0.05s increments on siblings

## Intro Screen

Public marketing pages use a brief SSELFIE intro on first page view per browser session:

- Dark ink background with paper texture.
- Stacked SSELFIE mark, thin rule, and Studio label.
- Letters rise from blur and fade out.
- Total duration: 3.5 seconds.
- Disabled automatically for `prefers-reduced-motion`.
- Do not add intro screens to authenticated product surfaces unless Sandra explicitly asks.

```css
0% { opacity: 0; transform: translateY(18px); filter: blur(12px); }
35% { opacity: 1; transform: translateY(0); filter: blur(0); }
74% { opacity: 1; transform: translateY(0); filter: blur(0); }
100% { opacity: 0; transform: translateY(-10px); filter: blur(8px); }
```

## Landing Page Direction

Adopt the SSELFIE Agents visual system, translated for SSELFIE Studio:

- Image-led first viewport, preferably full-bleed.
- Editorial, not SaaS: fewer cards, stronger images, more negative space.
- Text overlays live on image gradients when the image has calm negative space.
- Body copy is left-aligned by default.
- Dark sections must pass the readability rule above.
- Section rhythm stays dark / cream / dark / cream, ending dark.
- Sharp corners remain mandatory.

---

## Navigation

Fixed, `z-index: 50`, height `58px`.

- Background: `rgba(15,13,11,0.88)` with `backdrop-filter: blur(16px)`
- Bottom border: `1px solid rgba(237,233,226,0.10)`
- Logo: Cormorant Garamond, `18px`, `0.35em` tracking, uppercase, weight 300
- Links: Inter, `10px`, `0.5em` tracking, uppercase, `onDarkMuted` color
- CTA: solid cream button (standard button spec above)

---

## Copy Rules

- **No m-dashes (—).** Ever. In copy, button labels, or eyebrows.
- Price separators in buttons/eyebrows use a middle dot: `·` (e.g. `"Starter Kit · $37"`)
- Where a dash was breaking a sentence, use a period and start a new sentence instead.
- Where a dash was introducing a list, use a colon.

---

## What Is Retired / Never Use Again


| Element                                             | Reason                      |
| --------------------------------------------------- | --------------------------- |
| Gold accent `#c9a96e`                               | Retired April 2026          |
| `backdrop-filter: blur()` on cards                  | Glassmorphism — retired     |
| `border-radius > 0` on any surface                  | Sharp corners everywhere    |
| Pill-shaped buttons (`border-radius: 100px`)        | Retired                     |
| Gradient text (`background-clip: text`)             | Never — absolute ban        |
| `border-left: Npx solid color` accent stripes       | Never — absolute ban        |
| Weight 200 Cormorant Garamond                       | Doesn't exist — use 300     |
| Dark grey `#0d0c0b` as base                         | Replaced by `#0F0D0B` ink   |
| Pure `#ffffff` white surface                        | Use cream `#EDE9E2` instead |
| Flat sans-serif headings without letterpress shadow | Always apply LP shadow      |


---

## Source of Truth

The canonical implementation lives in:
`components/sselfie/public-marketing.tsx`

All design tokens and components in that file are the reference implementation.
When in doubt, read that file — not this doc.
