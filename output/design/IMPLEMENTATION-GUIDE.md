# SSELFIE Studio App Core UI Redesign
## Implementation Guide for Development Team

**Date:** February 27, 2026
**Project Lead:** Design System Architect
**Audience:** Engineering team, Product managers, QA
**Scope:** 3 core screens (Maya Chat, Concept Cards, Gallery)

---

## Quick Start Overview

### What You're Getting
1. **Comprehensive Audit** - Detailed analysis of current design problems
2. **3 Pixel-Perfect HTML Prototypes** - Interactive mockups showing desired end state
3. **Design System Documentation** - Color, typography, spacing specifications
4. **Implementation Roadmap** - Phased approach to build the redesign
5. **This Guide** - Developer-focused implementation instructions

### Key Transformation
**FROM:** Light SaaS aesthetic (white backgrounds, standard cards, icon-heavy)
**TO:** Premium editorial aesthetic (dark #0a0a0a, glassmorphic panels, typography-first)

### Timeline Estimate
- **Phase 1 (Design System):** 2-3 days
- **Phase 2 (Maya Chat):** 5-7 days
- **Phase 3 (Concept Cards):** 4-5 days
- **Phase 4 (Gallery):** 4-5 days
- **Phase 5 (Polish & Testing):** 3-4 days

**Total:** ~3-4 weeks for complete implementation

---

## Core Design Principles

### 1. Dark Cinematic Aesthetic
- All backgrounds: `#0a0a0a` (Obsidian)
- No white/light gray cards or containers
- Glassmorphic overlays for depth perception
- Subtle gradients for atmosphere, not brightness

### 2. Image-First Design
- Photos are the visual heroes
- UI wraps around images, not vice versa
- Full-bleed images (zero border-radius)
- Text overlays minimal and editorial

### 3. Editorial Typography
- Headers: Cormorant Garamond 200-300 light, UPPERCASE or italic
- Body: Inter 300, minimum 16px, line-height 1.8
- Labels: Inter 500 UPPERCASE, letter-spacing 0.5em
- No Geist sans-serif - Inter only for body text

### 4. Glassmorphic Panels
- All interactive surfaces: `rgba(255,255,255,0.04)` background
- Border: `1px solid rgba(255,255,255,0.08)`
- Blur: `backdrop-filter: blur(20px)`
- Hover elevation: Increase opacity to `0.07`, add soft shadow

### 5. Breathing Room
- Minimum padding: 24px mobile, 48px desktop
- Large gaps between sections: 32-48px
- Asymmetric layouts inspired by editorial magazines
- White space is premium, not wasted

---

## Design System Implementation

### Step 1: Update Design Tokens

**File:** `lib/design-tokens.ts`

Add new glass color tokens:

```typescript
export const GlassColors = {
  // Glass panel colors
  panelBackground: 'rgba(255, 255, 255, 0.04)',
  panelBorder: 'rgba(255, 255, 255, 0.08)',
  panelBackgroundHover: 'rgba(255, 255, 255, 0.07)',

  // Glass button/input
  inputBackground: 'rgba(255, 255, 255, 0.04)',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
  inputBackgroundFocus: 'rgba(255, 255, 255, 0.06)',
  inputBorderFocus: 'rgba(255, 255, 255, 0.12)',

  // Blur effects
  blurSmall: 'backdrop-filter: blur(10px)',
  blurMedium: 'backdrop-filter: blur(20px)',
  blurLarge: 'backdrop-filter: blur(30px)',
}

export const DarkColors = {
  background: '#0a0a0a',    // Obsidian
  textPrimary: '#ffffff',    // Porcelain
  textSecondary: '#f5f5f5',  // Pearl
  textTertiary: '#999999',   // Smoke
  textMuted: '#666666',      // Smoke darker
  borderSubtle: '#333333',   // Whisper
}
```

### Step 2: Add Font Imports

**File:** `app/layout.tsx` or `app/globals.css`

Add to head/imports:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@200;300;400;500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

Update `globals.css`:
```css
:root {
  --font-cormorant: 'Cormorant Garamond', serif;
  --font-inter: 'Inter', sans-serif;

  --color-obsidian: #0a0a0a;
  --color-porcelain: #ffffff;
  --color-pearl: #f5f5f5;
  --color-smoke: #666666;
  --color-whisper: #e5e5e5;
}

body {
  background-color: var(--color-obsidian);
  color: var(--color-porcelain);
  font-family: var(--font-inter);
  font-weight: 300;
}
```

### Step 3: Create Glass Component Utilities

**File:** `lib/glass-styles.ts` (new file)

```typescript
export const glassVariants = {
  panel: {
    base: 'bg-white/4 border border-white/8 backdrop-blur-2xl rounded-lg',
    hover: 'hover:bg-white/7 hover:border-white/12 transition-all duration-300',
    elevated: 'shadow-lg shadow-black/30',
  },
  button: {
    glass: 'bg-white/4 border border-white/8 backdrop-blur-xl px-4 py-2 rounded-sm',
    glassHover: 'hover:bg-white/8 hover:border-white/12 hover:shadow-md transition-all',
    glassActive: 'active:scale-95 transition-transform',
  },
  input: {
    glass: 'bg-white/4 border border-white/8 backdrop-blur-xl rounded-sm text-white placeholder-gray-500',
    glassFocus: 'focus:bg-white/6 focus:border-white/12 focus:outline-none transition-all',
  },
}

// Usage in components:
// className={`${glassVariants.panel.base} ${glassVariants.panel.hover}`}
```

---

## Maya Chat Screen Implementation

### File Structure
```
components/sselfie/
├── maya-chat-screen.tsx (REDESIGN)
│   ├── Header (new glassmorphic design)
│   ├── Chat container (dark background)
│   ├── Message bubbles (glass style)
│   ├── Concept cards (floating carousel)
│   ├── Quick prompts (glass scroll)
│   └── Floating input bar (bottom fixed)
├── maya/
│   ├── maya-header-new.tsx (REPLACE)
│   ├── maya-chat-bubbles.tsx (NEW)
│   ├── maya-concept-carousel.tsx (NEW)
│   ├── maya-quick-prompts-glass.tsx (NEW)
│   └── maya-floating-input.tsx (NEW)
```

### Component Updates

#### 1. Header Component
**Replace:** `components/sselfie/maya/maya-header.tsx`

Requirements:
- Dark background with subtle top border
- "MAYA" text: Cormorant 200, 32px, UPPERCASE
- Credit display: Inter 500, 11px, UPPERCASE, letter-spaced
- Glass border-bottom: `1px solid rgba(255,255,255,0.08)`
- NO icons - text labels only

```typescript
export default function MayaHeader() {
  return (
    <div className="px-6 py-6 border-b border-white/8 bg-gradient-to-b from-white/2 to-white/0 backdrop-blur-xl">
      <div className="flex justify-between items-baseline">
        <h1 className="font-cormorant font-200 text-3xl tracking-[-0.01em] uppercase">
          MAYA
        </h1>
        <span className="font-inter text-xs font-500 tracking-wider uppercase text-gray-400">
          AI Creative Partner
        </span>
      </div>
    </div>
  )
}
```

#### 2. Chat Bubbles Component
**New:** `components/sselfie/maya/maya-chat-bubbles.tsx`

Requirements:
- User messages: right-aligned, glass background
- Maya messages: left-aligned, subtle background
- Smooth fade-in animation
- Proper spacing/margins

```typescript
interface ChatBubbleProps {
  message: string
  sender: 'user' | 'maya'
  timestamp?: string
}

export function ChatBubble({ message, sender }: ChatBubbleProps) {
  const isUser = sender === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fadeIn`}>
      <div
        className={`max-w-lg px-5 py-4 rounded ${
          isUser
            ? 'bg-white/4 border border-white/8 backdrop-blur-2xl'
            : 'bg-white/2 border border-white/6'
        } text-sm leading-relaxed`}
      >
        {message}
      </div>
    </div>
  )
}
```

#### 3. Concept Cards Carousel
**New:** `components/sselfie/maya/maya-concept-carousel.tsx`

Requirements:
- Horizontal scrollable container
- Cards: 280px width, 9:16 aspect ratio
- Full-bleed images with gradient overlays
- Text overlays at bottom
- Glass CTA button (appears on hover)
- Smooth scrolling

```typescript
interface ConceptCardCarouselProps {
  concepts: ConceptData[]
  onCardClick: (concept: ConceptData) => void
}

export function ConceptCardCarousel({ concepts, onCardClick }: ConceptCardCarouselProps) {
  return (
    <div className="flex gap-5 overflow-x-auto py-2 px-0 snap-x">
      {concepts.map((concept) => (
        <div
          key={concept.id}
          className="flex-shrink-0 w-[280px] aspect-[9/16] rounded-none bg-gradient-to-br from-amber-900 to-amber-700 relative overflow-hidden group cursor-pointer shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-300"
          onClick={() => onCardClick(concept)}
        >
          {/* Image placeholder - replace with actual img */}
          <div className="w-full h-full bg-gradient-to-br from-amber-900/50 to-amber-600/50" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

          {/* Text content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <p className="font-inter text-xs font-500 tracking-widest uppercase text-gray-300 mb-3">
              {concept.category}
            </p>
            <h3 className="font-cormorant font-200 text-2xl italic text-white mb-4 leading-tight">
              {concept.title}
            </h3>

            {/* CTA Button - hidden until hover */}
            <button className="bg-white/4 border border-white/12 backdrop-blur-xl px-4 py-2 text-xs font-500 tracking-wider uppercase text-white rounded opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white/8">
              Create Photoshoot
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 4. Floating Input Bar
**New:** `components/sselfie/maya/maya-floating-input.tsx`

Requirements:
- Fixed at bottom of screen
- Glass background with gradient top
- Label above input
- White send button
- Safe area padding on mobile

```typescript
export function FloatingInputBar({
  value,
  onChange,
  onSend,
  disabled = false,
}: InputBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-black/70 backdrop-blur-2xl border-t border-white/8 px-6 py-4 pb-8">
      <div className="max-w-3xl mx-auto flex gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <label className="text-xs font-500 tracking-widest uppercase text-gray-600">
            Your Message
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tell Maya what you're envisioning..."
            className="bg-white/4 border border-white/8 backdrop-blur-xl rounded text-white placeholder-gray-500 px-4 py-3 text-sm focus:bg-white/6 focus:border-white/12 focus:outline-none transition-all"
          />
        </div>
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="h-[44px] px-6 bg-white text-black font-500 text-xs tracking-widest uppercase rounded hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
        >
          SEND
        </button>
      </div>
    </div>
  )
}
```

---

## Concept Cards Screen Implementation

### File Structure
```
components/sselfie/
├── concept-card.tsx (REDESIGN)
│   ├── Image container (full-bleed)
│   ├── Gradient overlays
│   ├── Text overlay system
│   ├── Glass CTA button
│   └── Expandable details panel
```

### Component Updates

#### ConceptCard Component Redesign

Key changes from current implementation:

1. **Remove icon-based controls** - all text/labels
2. **Image becomes hero** - full bleed, portrait ratio
3. **Floating glass card** - dark background with frosted effect
4. **Text overlays** - Cormorant title + Inter labels
5. **CTA button** - thin glass style (not filled dark button)

```typescript
interface ConceptCardProps {
  concept: ConceptData
  onGenerate?: () => void
  onCreatePhotoshoot?: () => void
}

export function ConceptCard({
  concept,
  onGenerate,
  onCreatePhotoshoot,
}: ConceptCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="relative aspect-[9/16] rounded-none overflow-hidden cursor-pointer bg-gradient-to-br from-amber-900 to-amber-700 shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-300 group"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Image Container */}
      <div className="w-full h-full">
        {concept.generatedImageUrl ? (
          <img
            src={concept.generatedImageUrl}
            alt={concept.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-900/50 to-amber-700/50" />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity z-15" />

      {/* Text Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
        <p className="font-inter text-xs font-500 tracking-widest uppercase text-gray-300 mb-2">
          {concept.category}
        </p>
        <h3 className="font-cormorant font-200 text-2xl italic text-white mb-4">
          {concept.title}
        </h3>

        {/* CTA Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCreatePhotoshoot?.()
          }}
          className="bg-white/4 border border-white/12 backdrop-blur-xl px-3 py-2 text-xs font-500 tracking-wider uppercase text-white rounded opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all duration-300 hover:bg-white/8 active:scale-95"
        >
          Create Photoshoot
        </button>
      </div>

      {/* Details Panel - Expandable */}
      {expanded && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-30 p-6 flex flex-col justify-end rounded-none">
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          <h4 className="font-cormorant font-300 text-xl text-white mb-4">
            {concept.title} Settings
          </h4>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-500 tracking-wider uppercase text-gray-500">
                Style Strength
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-500 tracking-wider uppercase text-gray-500">
                Prompt Accuracy
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Gallery Screen Implementation

### File Structure
```
components/sselfie/
├── gallery-screen.tsx (REDESIGN)
│   ├── Header with stats
│   ├── Glass filter tabs
│   ├── Editorial masonry grid
│   ├── Image card with overlay
│   └── Top picks carousel
├── gallery/components/
│   ├── gallery-header-redesign.tsx (REPLACE)
│   ├── gallery-filters-glass.tsx (REPLACE)
│   ├── gallery-image-grid-editorial.tsx (REPLACE)
│   └── gallery-top-picks-carousel.tsx (NEW)
```

### Key Component Changes

#### Gallery Header Redesign

```typescript
interface GalleryHeaderProps {
  stats: {
    totalPhotos: number
    totalPhotoshoots: number
    totalVideos: number
  }
  onSort?: () => void
  onSelect?: () => void
}

export function GalleryHeader({ stats, onSort, onSelect }: GalleryHeaderProps) {
  return (
    <div className="flex justify-between items-start gap-6 mb-12">
      <div>
        <h1 className="font-cormorant font-200 text-5xl tracking-[-0.01em] uppercase mb-4">
          GALLERY
        </h1>
        <div className="flex gap-8">
          <div className="flex flex-col gap-1">
            <span className="font-cormorant font-300 text-xl text-white">
              {stats.totalPhotos}
            </span>
            <span className="font-inter text-xs font-500 tracking-wider uppercase text-gray-400">
              Brand Photos
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-cormorant font-300 text-xl text-white">
              {stats.totalPhotoshoots}
            </span>
            <span className="font-inter text-xs font-500 tracking-wider uppercase text-gray-400">
              Photoshoots
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-cormorant font-300 text-xl text-white">
              {stats.totalVideos}
            </span>
            <span className="font-inter text-xs font-500 tracking-wider uppercase text-gray-400">
              Videos
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSelect}
          className="bg-white/4 border border-white/8 backdrop-blur-xl px-4 py-2 text-xs font-500 tracking-wider uppercase text-white rounded hover:bg-white/8 transition-all"
        >
          Select
        </button>
        <button
          onClick={onSort}
          className="bg-white/4 border border-white/8 backdrop-blur-xl px-4 py-2 text-xs font-500 tracking-wider uppercase text-white rounded hover:bg-white/8 transition-all"
        >
          Sort
        </button>
      </div>
    </div>
  )
}
```

#### Gallery Filters (Glass Tabs)

```typescript
export function GalleryFilters({
  activeFilter,
  onFilterChange,
}: GalleryFiltersProps) {
  const filters = [
    'All Photos',
    'Editorial',
    'Lifestyle',
    'Portraits',
    'Favorites',
    'Recent',
  ]

  return (
    <div className="mb-12">
      <span className="block font-inter text-xs font-500 tracking-wider uppercase text-gray-400 mb-3">
        Filter By
      </span>

      <div className="bg-white/2 border border-white/8 backdrop-blur-xl rounded-lg p-3 overflow-x-auto">
        <div className="flex gap-8 whitespace-nowrap">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`pb-2 border-b-2 transition-all ${
                activeFilter === filter
                  ? 'text-white border-white/40'
                  : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              <span className="font-inter text-xs font-500 tracking-wider uppercase">
                {filter}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### Editorial Masonry Grid

CSS for asymmetric layout:

```css
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  grid-auto-rows: auto;
  gap: 1rem;
}

/* Vary aspect ratios for editorial asymmetry */
.image-card:nth-child(3n) {
  aspect-ratio: 1 / 1.4; /* Portrait */
}

.image-card:nth-child(5n) {
  aspect-ratio: 1.2 / 1; /* Landscape */
}

.image-card:nth-child(7n) {
  aspect-ratio: 1 / 1.3; /* Tall portrait */
}

/* Default square if not matched */
.image-card {
  aspect-ratio: 1 / 1;
  min-height: 220px;
}
```

Image card component:

```typescript
export function ImageCard({
  image,
  onView,
  onFavorite,
}: ImageCardProps) {
  return (
    <div className="relative overflow-hidden rounded-none bg-gray-800 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
      <img
        src={image.url}
        alt={image.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10" />

      {/* Text Content - visible on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="font-inter text-xs font-500 tracking-wider uppercase text-gray-300 mb-2">
          {image.category}
        </p>
        <h4 className="font-cormorant font-200 text-lg italic text-white mb-3">
          {image.title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView(image)
          }}
          className="bg-white/4 border border-white/12 backdrop-blur-xl px-3 py-1 text-xs font-500 tracking-wider uppercase text-white rounded hover:bg-white/8 transition-all"
        >
          View
        </button>
      </div>
    </div>
  )
}
```

---

## Testing Checklist

### Visual Testing
- [ ] Dark backgrounds are #0a0a0a (not gray/charcoal)
- [ ] Glass panels have visible blur effect
- [ ] Text is readable on all backgrounds (WCAG AA contrast)
- [ ] Hover states show subtle elevation (not jarring)
- [ ] Images have zero border-radius (sharp editorial crop)
- [ ] Cormorant font loads and displays light weight
- [ ] Inter font loads and displays 300 weight

### Functionality Testing
- [ ] Chat input appears floating at bottom (not buried)
- [ ] Concept cards scroll horizontally (touch/trackpad)
- [ ] Card hover shows CTA button with smooth fade-in
- [ ] Filter tabs show underline active state (not filled)
- [ ] Gallery grid responds asymmetrically (not symmetric)
- [ ] Image overlays appear on hover with gradients
- [ ] All buttons are clickable (no pointer-events issues)

### Mobile Testing (375px)
- [ ] Padding reduces to 16px (comfortable thumb area)
- [ ] Grid columns reduce to 2 (not squished)
- [ ] Floating input bar doesn't overlap content
- [ ] Horizontal scrolls work on touch
- [ ] Text remains readable at small size
- [ ] Tap targets are minimum 44x44px

### Performance Testing
- [ ] Glass blur renders at 60fps (test on iPhone SE/low-end Android)
- [ ] Animations don't cause jank (Chrome DevTools Performance tab)
- [ ] Fonts load without blocking page render
- [ ] Images lazy-load if below fold
- [ ] No memory leaks from repeated scrolls

### Accessibility Testing
- [ ] Keyboard navigation works (Tab key)
- [ ] Focus states visible on all interactive elements
- [ ] Screen reader announces content correctly
- [ ] No color-only information (labels always present)
- [ ] Form inputs have proper labels
- [ ] No keyboard traps

---

## Common Issues & Solutions

### Issue: Glass blur not visible
**Solution:** Check browser support (Chrome 76+, Safari 9+, Edge 79+). Test with `backdrop-filter: blur(10px)` as fallback.

### Issue: Cormorant font not loading
**Solution:** Check Google Fonts link is included before custom CSS. Use `font-display: swap` for faster fallback.

### Issue: Scrolling feels janky
**Solution:** Check for layout shifts. Use `scroll-behavior: smooth` only on intentional scrolls. Profile with Chrome DevTools Performance tab.

### Issue: Text too small on mobile
**Solution:** Implement responsive font sizes. Base size 16px on mobile, 18-24px on desktop. Use `clamp()` for fluid scaling.

### Issue: Icons still visible (old implementation)
**Solution:** Remove lucide imports from components. Use text labels or CSS-drawn shapes. Search codebase for `<Camera />`, `<Send />`, etc.

---

## File Checklist for Implementation

### New Files to Create
- [ ] `components/sselfie/maya/maya-chat-bubbles.tsx`
- [ ] `components/sselfie/maya/maya-concept-carousel.tsx`
- [ ] `components/sselfie/maya/maya-floating-input.tsx`
- [ ] `components/sselfie/gallery/gallery-header-redesign.tsx`
- [ ] `components/sselfie/gallery/gallery-filters-glass.tsx`
- [ ] `components/sselfie/gallery/gallery-image-grid-editorial.tsx`
- [ ] `components/sselfie/gallery/gallery-top-picks-carousel.tsx`
- [ ] `lib/glass-styles.ts`

### Files to Update
- [ ] `lib/design-tokens.ts` (add glass colors)
- [ ] `app/globals.css` (add font imports, CSS variables)
- [ ] `components/sselfie/maya-chat-screen.tsx` (swap old header/input)
- [ ] `components/sselfie/concept-card.tsx` (redesign card layout)
- [ ] `components/sselfie/gallery-screen.tsx` (redesign header/filters/grid)

### Files to Remove
- [ ] Old icon-based header components (if separate files exist)
- [ ] Unused lucide-react imports from affected components

---

## Deployment Strategy

### Stage 1: Feature Flag
```typescript
const ENABLE_NEW_DESIGN = process.env.NEXT_PUBLIC_NEW_DESIGN === 'true'

// In component:
if (ENABLE_NEW_DESIGN) {
  return <NewMayaChatScreen />
} else {
  return <OldMayaChatScreen />
}
```

### Stage 2: Gradual Rollout
1. Deploy with feature flag `false` (old design active)
2. Enable for internal testing (QA, team)
3. Enable for beta users (10% of users)
4. Monitor error tracking & performance metrics
5. Rollout to 50% of users
6. Full rollout to 100%

### Stage 3: Cleanup
1. Remove feature flag code
2. Delete old component files
3. Update any documentation
4. Monitor for any issues

---

## Success Metrics

### Design System
- [ ] 100% of new components use glass design tokens
- [ ] 0 instances of old SaaS colors (#f5f5f5, etc.)
- [ ] All typography is Cormorant + Inter (0 Geist)
- [ ] All padding follows 24px/48px minimum rule

### User Experience
- [ ] Chat feels "premium" and "editorial" in user testing
- [ ] Images are clearly the visual hero (no competing UI)
- [ ] Glassmorphism is noticeable and delightful (not subtle to point of invisible)
- [ ] Concept cards feel like luxury fashion magazine cards
- [ ] Gallery feels like editorial photo curation tool

### Performance
- [ ] Glass blur renders at 60fps on iPhone SE
- [ ] First contentful paint < 2s (no font loading delay)
- [ ] Lighthouse performance score > 75
- [ ] No visual layout shifts (CLS < 0.1)

### Accessibility
- [ ] All text meets WCAG AA contrast (4.5:1)
- [ ] Keyboard navigation works 100%
- [ ] Screen reader announces content correctly
- [ ] All form inputs have labels

---

## Questions?

Refer back to:
1. **audit-app-core-ui.md** - Detailed problem analysis
2. **README.md** - Design system specifications
3. **Prototype HTML files** - Visual reference for end state
4. This guide - Implementation instructions

---

**Version:** 1.0
**Last Updated:** February 27, 2026
**Status:** Ready for Development
