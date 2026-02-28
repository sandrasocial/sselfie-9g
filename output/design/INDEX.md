# SSELFIE Studio — App Secondary Screens Redesign
## Complete Design System & Prototypes

**Project Duration:** February 27, 2026
**Design Scope:** Academy, Feed Planner, Profile Screens
**Aesthetic:** Luxury Editorial + Glassmorphic iOS Design

---

## Quick Navigation

### Documents
1. **[DELIVERABLES-SUMMARY.md](DELIVERABLES-SUMMARY.md)** — Overview of all deliverables, design system, and implementation guide
2. **[audit-app-secondary-screens.md](audit-app-secondary-screens.md)** — Detailed design audit with problems & recommendations

### Interactive Prototypes (Open in Chrome/Safari)
1. **[prototype-academy-app.html](prototype-academy-app.html)** — Academy screen with mini-products & courses
2. **[prototype-feed-planner.html](prototype-feed-planner.html)** — Feed Planner with editor & strategy
3. **[prototype-profile.html](prototype-profile.html)** — Profile with portfolio & brand section

---

## Design Overview

### Aesthetic Direction
Transform SSELFIE from light SaaS interface to luxury editorial dark app:

**Before:** White backgrounds, Lucide icons, cramped layouts, standard cards
**After:** Dark atmospheric (#0a0a0a), glassmorphic effects, editorial typography, breathing room

### Color System (SSELFIE Palette)
```
Obsidian    #0a0a0a  — Primary background
Porcelain   #ffffff  — Primary text
Pearl       #f5f5f5  — Secondary text
Smoke       #666666  — Captions & metadata
Whisper     #e5e5e5  — Subtle borders
```

### Typography (Only 2 Fonts)
```
Cormorant Garamond (Serif)
  - Headers, stat numbers, product names
  - Weights: 200-300
  - Treatment: UPPERCASE, tight tracking

Inter (Sans-Serif)
  - Body text, captions, CTAs
  - Weight: 300 (body), 500 (labels)
  - Size: 16px+ minimum, 1.6-1.8 line-height
```

### Glass Effect (Applied Everywhere)
```css
backdrop-filter: blur(20px);
background: rgba(255, 255, 255, 0.04);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16-20px;

/* Hover State */
background: rgba(255, 255, 255, 0.07);
border-color: rgba(255, 255, 255, 0.12);
```

### No Icons
- All navigation text-based
- All CTAs text links or glass buttons
- No emoji or decorative icons
- Clean, uncluttered interface

---

## Screen Specifications

### ACADEMY SCREEN
**File:** `prototype-academy-app.html`

**Hero Section**
- Height: 50vh (responsive)
- Title: 48-96px Cormorant 200 UPPERCASE
- Subtitle: Editorial text
- Gradient overlay: Dark top to bottom

**Stats Bar**
- 3 glass cards floating below hero
- Each: 24px padding, glass effect
- Label: 10px Inter 500 UPPERCASE
- Value: 32px Cormorant 300 UPPERCASE

**Mini-Product Cards (4 items)**
- Grid: 2 columns mobile, auto 3 columns desktop
- Size: 240×280px per card
- Content: Name (18px Cormorant), Description (14px Inter), Price (16px Cormorant), CTA
- States: Standard glass, Owned (different glass tint with badge)

**Courses Timeline**
- Vertical layout: timeline label + content
- Responsive: Full width mobile, structured desktop
- No list bullets, editorial styling

### FEED PLANNER SCREEN
**File:** `prototype-feed-planner.html`

**Editorial Hero**
- Height: 60vh
- Avatar: 120px circle
- Name: 36-56px Cormorant 200 UPPERCASE
- Bio: 18px Inter 300, max-width 600px
- CTAs: Text links ("Edit Bio", "Create Highlights")

**Tabs**
- Text-based labels only
- Underline indicator (no background)
- Hover state on inactive tabs

**Instagram Grid Preview**
- 3×3 grid in glass frame
- Full-bleed images (no gaps)
- Position numbers top-right corner
- Loading state: Subtle pulse animation

**Caption Editor**
- Glass panel card
- Large textarea (18px Inter 300)
- Action buttons: Copy, Enhance, Generate
- All text-based, no icons

**Strategy Section**
- 2×2 grid of strategy cards
- Each card: Title, description, 3-4 bullet points
- Responsive: 1 column mobile, 2 columns desktop

### PROFILE SCREEN
**File:** `prototype-profile.html`

**Hero Section**
- Height: 70vh
- Avatar: 180px circle (hover shows "Edit")
- Name: 48-72px Cormorant 200 UPPERCASE
- Bio: 18px Inter 300, centered
- Badge: Text-only membership label

**Stats**
- Horizontal layout: 2 stat items
- Numbers: 64-80px Cormorant 200 UPPERCASE
- Labels: 11px Inter 500 UPPERCASE
- Editorial presentation (not metrics)

**Best Work Grid**
- 3 columns desktop, 2 mobile, 1 mobile
- Draggable items with cursor feedback
- Subtle numbering (top-right corner)
- Empty slots: Simple "+" placeholder

**Personal Brand Section**
- Glass card panel
- Collapsible header
- 2-column grid of brand attributes
- Edit option as text link

---

## Responsive Breakpoints

```
Mobile    375px   — 1 column layouts, 24px padding
Tablet    768px   — 2 column layouts, 32px padding
Desktop   1024px+ — 3 column layouts, 48px padding
```

All text scales fluidly with `clamp()` function for readable typography at any size.

---

## Interactive States

### Cards
- Default: Glass effect visible
- Hover: Opacity increases, subtle translateY(-4 to -8px)
- Active: No significant change, prevent confusion
- Focus: Visible focus ring for accessibility

### Buttons & CTAs
- Text links: Hover shows color change + translation
- Glass buttons: Hover shows opacity + border increase + lift
- All transitions: 0.3-0.4s ease

### Forms
- Textarea hover: Glass container background increases
- Focus: Clear focus indicator
- Cursor: Pointer on interactive elements

---

## Performance & Browser Support

### CSS Features
- `backdrop-filter`: Chrome 76+, Safari 9+, iOS 9+
- `clamp()`: All modern browsers
- CSS Grid: All modern browsers
- CSS Variables: All modern browsers

### Testing Recommendations
1. Test on iPhone 12/13 for glass effect
2. Test on low-end Android for performance
3. Verify touch targets (44×44px minimum)
4. Test with slow 3G connection
5. Verify color contrast (WCAG AA minimum)

---

## Implementation Checklist

### Design System
- [ ] Extract color values to CSS variables
- [ ] Create typography scale in component library
- [ ] Build glass effect as reusable class/component
- [ ] Define spacing tokens (gaps, padding)
- [ ] Create hover/transition standards

### Components
- [ ] Build glass card component
- [ ] Build glass button variant
- [ ] Build responsive grid layouts
- [ ] Build tabs component
- [ ] Build form inputs in dark theme

### Pages
- [ ] Convert Academy screen to React/Vue
- [ ] Convert Feed Planner to React/Vue
- [ ] Convert Profile to React/Vue
- [ ] Remove all Lucide icons
- [ ] Test responsiveness at all breakpoints

### QA
- [ ] Visual regression testing
- [ ] Responsive design testing
- [ ] Accessibility testing
- [ ] Performance monitoring
- [ ] Browser compatibility testing

---

## File Structure

```
output/design/
├── INDEX.md                          (this file)
├── DELIVERABLES-SUMMARY.md          (complete overview)
├── audit-app-secondary-screens.md   (design audit)
├── prototype-academy-app.html       (Academy screen)
├── prototype-feed-planner.html      (Feed Planner screen)
└── prototype-profile.html           (Profile screen)
```

---

## How to Use

### For Designers
1. Open each `.html` file in browser
2. Compare with existing design in Figma
3. Note responsive behavior on mobile (DevTools 375px)
4. Check hover states and transitions
5. Review typography sizing and spacing

### For Engineers
1. Extract CSS color, font, and spacing values
2. Reference glass effect implementation
3. Study responsive grid layouts
4. Review interactive state handling
5. Adapt prototypes to component library

### For Product/Stakeholders
1. Open `prototype-*.html` files to see final look
2. Test on mobile and desktop
3. Compare to current light theme
4. Verify brand positioning aligns
5. Approve or request changes

---

## Design Principles

### 1. Editorial First
Large, airy typography with breathing room. Images are focal points, not UI elements.

### 2. Luxury Positioning
Dark atmospheric backgrounds, subtle glass effects, minimal CTAs. Premium feel through restraint.

### 3. Photography-Centric
Images float on dark backgrounds. No white containers. Let imagery breathe.

### 4. Minimal Iconography
Text-based everything. No icons cluttering the interface. Clean, sophisticated.

### 5. Responsive Excellence
Beautiful at 375px mobile to 1440px+ desktop. Mobile-first approach.

### 6. Smooth Interactions
All transitions 0.3-0.4s ease. Hover states subtle but present. No jarring changes.

---

## Support & Questions

### Common Questions

**Q: Why no white backgrounds?**
A: Dark backgrounds create premium, luxury positioning. White is standard SaaS. Dark + glass = editorial luxury.

**Q: Why remove icons?**
A: Icons are UI chrome that clutter editorial flow. Text is clearer, more sophisticated, more accessible.

**Q: Can we use different colors?**
A: No. SSELFIE Palette (5 colors) is required for brand consistency. All colors carefully chosen.

**Q: What about light mode?**
A: Dark is primary. Light mode can be built later if needed, but primary experience is dark.

**Q: Glass effect performance?**
A: Test on real devices. May need to disable on very low-end hardware. Backdrop-filter is widely supported.

---

## Versioning

**Version 1.0** — February 27, 2026
- Initial design system implementation
- 3 screen prototypes (Academy, Feed Planner, Profile)
- Complete audit with recommendations
- Ready for development handoff

---

## Credits

**Design Approach:** Luxury editorial (Vogue aesthetic) + iOS 17 glassmorphism
**Inspiration:** Airy loft dashboards, premium home automation apps, fashion editorial layouts
**Target Users:** Ambitious women creators building personal brands

---

**Status:** Ready for stakeholder review and development handoff
**Last Updated:** February 27, 2026

