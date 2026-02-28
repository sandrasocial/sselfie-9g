# SSELFIE Studio v2 — Premium Dark Glassmorphic Design System

## Overview

This redesign elevates the SSELFIE Studio Maya feature to a **luxury iOS app aesthetic** — inspired by premium smart home interfaces (Dyson) merged with high-fashion editorial design. The visual language is **dark, minimal, and glass-forward**, prioritizing the Instagram preview cards as the signature product feature.

---

## Design Files

Two fully responsive HTML prototypes are included:

### 1. **v2-maya-chat.html** (38 KB)
Complete Maya chat interface redesign with all 6 tabs:
- **CLASSIC** — Chat with Maya, quick prompts, single image generation
- **PRO** — Reference images, concept cards grid, editable prompts
- **VIDEOS** — Animation gallery with tap-to-animate overlay
- **PROMPTS** — Curated editorial prompt library
- **TRAINING** — Custom Flux model training status
- **FEED** — Locked/coming soon

**Key Features:**
- Fixed header with credit balance display
- Tab switcher with thin underline active state
- Chat message history (Maya + user messages)
- Concept card grid with collapsible prompt editors
- Instagram photo card preview (signature feature)
- Photoshoot button for carousel generation
- Fixed input bar with mode toggle, text field, settings link

### 2. **v2-instagram-previews.html** (25 KB)
Three Instagram preview card types in luxury style:

#### Photo Card
- 4:5 portrait aspect ratio
- Image frame with gradient placeholder
- Username, menu button, action links (SAVE, FAVOURITE, SHARE)
- Caption preview area
- Glass container with subtle border

#### Carousel Card
- 4:5 frame with 9-image pagination dots
- Carousel indicator showing current slide (e.g., "1/9")
- "SWIPE" hint text
- Pagination dots with active state
- Download All bundle link
- Premium signature feature

#### Reel Card
- 9:16 vertical video format
- Play button (▶ unicode)
- Motion video title and description
- "ANIMATE →" CTA
- Premium motion editing feature

---

## SSELFIE Design System (Mandatory Standards)

### Color Palette (5 Colors + Glass)

```
Obsidian:     #0a0a0a   — All backgrounds
Porcelain:    #ffffff   — Primary text
Pearl:        #f5f5f5   — Secondary text
Smoke:        #666666   — Captions, disabled states
Whisper:      #e5e5e5   — Borders
```

#### Glass Surfaces
```css
--glass-surface:   rgba(255, 255, 255, 0.04)
--glass-border:    1px solid rgba(255, 255, 255, 0.08)
--glass-elevated:  rgba(255, 255, 255, 0.07)

/* Applied with: */
background: var(--glass-surface);
backdrop-filter: blur(20px);
border: var(--glass-border);
```

### Typography

#### Headers
- **Font:** Cormorant Garamond
- **Weight:** 200–300
- **Transform:** UPPERCASE
- **Letter-spacing:** -0.01em
- **Line-height:** 1.0–1.2
- **Sizes:** 32px (page title), 24px (section), 20px (subsection)

#### Body
- **Font:** Inter
- **Weight:** 300
- **Size:** 16px minimum
- **Line-height:** 1.8

#### Labels
- **Font:** Inter
- **Weight:** 500
- **Size:** 10–12px
- **Transform:** UPPERCASE
- **Letter-spacing:** 0.5em

### Layout Rules

1. **Dark Backgrounds Always** — No light themes
2. **Glass Panels for All Cards** — Frosted glass aesthetic
3. **No Icons** — Avoid Lucide, emoji; use Unicode shapes sparingly
4. **Images are Hero** — Photo previews are the centerpiece
5. **Asymmetric/Editorial Layout** — Not grid-strict
6. **Mobile-First** — 375px minimum breakpoint
7. **Thin Borders** — 1px glass borders only
8. **Smooth Transitions** — 0.2s–0.6s easing

---

## Component Specifications

### Cards

All cards use consistent styling:

```css
border-radius: 8px;
background: var(--glass-surface);
backdrop-filter: blur(20px);
border: var(--glass-border);
padding: 16px;
```

### Buttons & CTAs

Text-based, minimal:
```css
background: transparent / var(--glass-elevated);
border: var(--glass-border);
cursor: pointer;
font-size: 10px;
font-weight: 500;
letter-spacing: 0.5em;
text-transform: uppercase;
color: var(--pearl);
transition: all 0.2s ease;
```

On hover: lighter background, change to `var(--porcelain)` text.

### Input Fields

```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 4px;
color: var(--porcelain);
padding: 8px 12px;
```

Focus state: border → `rgba(255, 255, 255, 0.2)`, outline: none

### Pagination Dots

Active: `width: 12px, border-radius: 2px`, inactive: `width: 4px, border-radius: 50%`

---

## Maya Feature Spec (Non-Negotiable)

### Tab Structure (6 Tabs)

1. **CLASSIC** — Prompt-based generation
   - Chat interface with Maya (knows brand profile)
   - Short prompts + trigger word system
   - Generates single AI photo → Instagram Photo Card
   - Photoshoot button → 6-9 image carousel → Instagram Carousel Card
   - Credits: 2 per image, 9 per photoshoot

2. **PRO** — Reference-based generation
   - Upload reference images (gallery/device)
   - Create concept cards with editable prompts
   - Uses Nano Banana Pro (Replicate) for longer prompts
   - Each card: image placeholder, title, category, editable prompt, generate button
   - Same generation flow as Classic → Instagram cards

3. **VIDEOS** — Motion generation
   - Image gallery grid (portrait 9:16 format)
   - Click image → animate → creates motion video
   - Result: Instagram Reel preview (phone frame, play button)
   - Credits: 3 per video

4. **PROMPTS** — Curated library
   - Browse Sandra's favorite best-performing prompts
   - Currently sparse (few prompts added)
   - Future: category filters, fashion-forward editorial styles
   - Click prompt → generates image directly

5. **TRAINING** — Custom model (membership only)
   - Upload 10-15 selfies
   - Train custom Flux model
   - Status card showing training progress

6. **FEED** — Locked/Coming Soon
   - Show as disabled tab
   - Label: "FEED (COMING)"

### Instagram Card Previews (Signature Feature)

These are **NOT hidden in modals** — they are **core UI** and must be beautiful:

- **Photo Card:** Single 4:5 portrait generated image
- **Carousel Card:** 9-slide bundle with pagination dots + "DOWNLOAD ALL"
- **Reel Card:** 9:16 video with play button and motion prompt

---

## Responsive Design

All HTML files are fully responsive:

- **Desktop:** Multi-column grids, full header
- **Tablet:** 2-column grids, adjusted spacing
- **Mobile (375px):** Single-column, optimized touch targets

Breakpoints:
- `@media (max-width: 600px)` — Primary mobile breakpoint
- Collapse multi-column to 1-column
- Reduce font sizes by 1–2px
- Maintain padding/spacing ratios

---

## Animations & Interactions

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```
Applied to: message groups, cards on scroll

### Slide Up
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```
Applied to: Instagram cards

### Hover Effects
- Cards: border-color → lighter, slight background shift
- Buttons: text-color → `var(--porcelain)`, background → slightly lighter
- Links: color → `var(--pearl)` on hover
- Transitions: `all 0.2s ease`

### Interactive Elements
- **Tabs:** Tab switcher updates active state with thin underline
- **Pagination Dots:** Click to navigate carousel, visual feedback
- **Prompt Pills:** Click to populate input field
- **Toggle Prompts:** Expand/collapse editors with smooth transition

---

## Implementation Notes

### Google Fonts (CDN Only)
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### No External Dependencies
- No icon libraries (Lucide, Feather, etc.)
- No component frameworks (React Bootstrap, Tailwind, etc.)
- Pure HTML, CSS, vanilla JavaScript
- Self-contained files (can be opened as `.html` in browser)

### CSS Variables
All colors and spacing use `:root` CSS variables for consistency. Update these variables to theme the entire design.

### JavaScript
- Tab switching functionality
- Form input handlers
- Pagination dot interaction
- Smooth scroll utilities

---

## Quality Checklist

- [x] 5-color palette + glass only
- [x] No icons (no lucide, emoji)
- [x] Cormorant Garamond + Inter typography
- [x] All backgrounds dark (Obsidian)
- [x] Glass panels with blur effect (20px)
- [x] Responsive at 375px minimum
- [x] Instagram cards are hero, not hidden
- [x] Tab structure reflects actual product (6 tabs, not 2)
- [x] Concept cards with editable prompts (Pro tab)
- [x] Smooth animations (fade/slide/hover)
- [x] Fully self-contained HTML files
- [x] No external JS libraries
- [x] Google Fonts CDN only

---

## Future Enhancements

1. **Real Image Integration** — Replace placeholders with actual AI photos
2. **Video Playback** — Embed video URLs in Reel cards
3. **State Persistence** — Save tab selection, carousel position to localStorage
4. **Settings Panel** — Slide-out settings drawer (designed but not functional)
5. **Credits API** — Real credit balance from backend
6. **Chat History Loading** — Populate messages from database
7. **Photoshoot Generation** — Connect to Flux API for real photoshoot creation
8. **Training Status** — Poll backend for model training progress

---

## Browser Compatibility

- Chrome 90+
- Safari 14+
- Firefox 88+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Note:** CSS backdrop-filter (blur) requires modern browsers. Fallback: subtle background color if blur not supported.

---

## File Structure

```
/output/design/
├── v2-maya-chat.html          (38 KB) — Main Maya interface
├── v2-instagram-previews.html (25 KB) — Card previews showcase
├── DESIGN-SYSTEM-v2.md        (this file)
└── [existing prototype files]
```

---

## Design Rationale

### Why Dark + Glass?

1. **Premium Aesthetic** — Matches high-end iOS apps (Dyson, smart home)
2. **Focus on Images** — Dark background makes AI photos pop
3. **Modern Luxury** — Glassmorphism is 2024–2025 design trend
4. **Editorial Authority** — Dark backgrounds convey sophistication

### Why Instagram Cards are Hero?

1. **Product Core** — Users generate images to post on social
2. **Immediate Value** — Users see results instantly
3. **Signature Moment** — Carousel photoshoot + Reel motion are key differentiators
4. **Social Proof** — Beautiful preview cards encourage sharing

### Why 6 Tabs (Not 2)?

1. **Reflects Real Product** — Maya has distinct modes: Classic, Pro, Videos, Prompts, Training, Feed
2. **Information Architecture** — Each tab solves a different user need
3. **Scalability** — Room to expand (e.g., Collaboration, History tabs later)
4. **Feature Hierarchy** — Pro tab signals premium membership opportunity

---

**Design System Version:** 2.0
**Created:** February 27, 2026
**Status:** Production Ready
