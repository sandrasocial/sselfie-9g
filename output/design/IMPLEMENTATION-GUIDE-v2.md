# Implementation Guide — v2 Maya Chat & Instagram Previews

## Quick Start

1. Open `v2-maya-chat.html` in a browser to view the complete Maya interface
2. Open `v2-instagram-previews.html` to see the three card types
3. Test on mobile (375px width) to verify responsive design
4. Use the tab switcher in Maya to navigate between modes

---

## Integration Workflow

### From Prototype to React Component

These HTML prototypes are **design references** for implementing the actual React components:

```
v2-maya-chat.html
    ├── Inform → maya-chat-screen.tsx (existing)
    ├── Reference → Tab switcher markup
    ├── Reference → Message styling
    └── Reference → Input bar layout

v2-instagram-previews.html
    ├── Inform → instagram-photo-card.tsx (existing)
    ├── Inform → instagram-carousel-card.tsx (existing)
    ├── Inform → instagram-reel-card.tsx (existing)
    └── Reference → CSS styling (all components)
```

### Step 1: Extract CSS Variables

Copy the `:root` section from `v2-maya-chat.html` into your global CSS file:

```css
:root {
    --obsidian: #0a0a0a;
    --porcelain: #ffffff;
    --pearl: #f5f5f5;
    --smoke: #666666;
    --whisper: #e5e5e5;
    --glass-surface: rgba(255, 255, 255, 0.04);
    --glass-border: 1px solid rgba(255, 255, 255, 0.08);
    --glass-elevated: rgba(255, 255, 255, 0.07);
}
```

### Step 2: Update Instagram Card Components

Apply the glass styling to existing components:

```tsx
// instagram-photo-card.tsx
export default function InstagramPhotoCard({ ... }) {
  return (
    <div className="photo-card">
      {/* Apply: background: var(--glass-surface), backdrop-filter: blur(20px), border: var(--glass-border) */}
    </div>
  )
}
```

Target files to update:
- `/components/sselfie/instagram-photo-card.tsx`
- `/components/sselfie/instagram-carousel-card.tsx`
- `/components/sselfie/instagram-reel-card.tsx`

### Step 3: Update Maya Chat Screen

Update tab switcher, header, and input bar styling:

```tsx
// components/sselfie/maya/maya-tab-switcher.tsx
// Update: Active tab underline (border-bottom-color)
// Update: Inactive tab color (--smoke)
// Update: Hover state (color transition)

// components/sselfie/maya/maya-header.tsx
// Update: Title styling (Cormorant Garamond, 32px, 200 weight)
// Update: Credit balance position (right-aligned)

// components/sselfie/maya/maya-unified-input.tsx
// Update: Fixed bottom positioning
// Update: Glass background
// Update: Mode toggle button styling
```

### Step 4: Implement Concept Cards (Pro Tab)

The Pro tab shows concept cards in a 2-column grid:

```tsx
// concept-card.tsx updates:
// 1. Wrap in glass container (--glass-surface, blur, border)
// 2. Add collapsible prompt editor
// 3. Apply category label styling (Inter 9px uppercase)
// 4. Add generate button (glass-elevated style)

const ConceptCard = ({ concept }) => {
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  return (
    <div className="concept-card"> {/* glass styles */}
      <div className="concept-image">
        <div className="concept-overlay">
          <div className="concept-title">{concept.title}</div>
          <div className="concept-category">{concept.category}</div>
        </div>
      </div>
      <div className="concept-body">
        <button onClick={() => setShowPromptEditor(!showPromptEditor)}>
          {showPromptEditor ? 'CLOSE →' : 'EDIT PROMPT →'}
        </button>
        {showPromptEditor && (
          <div className="prompt-editor">
            <textarea value={concept.prompt} />
            <button className="generate-btn">Generate</button>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## CSS Migration Path

### Existing Component Files

1. **maya-chat-screen.tsx** → Update header, tab switcher, layout
2. **instagram-photo-card.tsx** → Apply glass styling, update footer
3. **instagram-carousel-card.tsx** → Apply glass styling, update dots, add "DOWNLOAD ALL"
4. **instagram-reel-card.tsx** → Apply glass styling, update play button styling
5. **concept-card.tsx** → Already complex; add glassmorphic container

### New Hooks to Add

```tsx
// components/sselfie/maya/hooks/use-maya-tabs.ts
export function useMayaTabs() {
  const [activeTab, setActiveTab] = useState<TabName>("classic")

  return {
    activeTab,
    setActiveTab,
    isTabActive: (tab: TabName) => activeTab === tab
  }
}

// components/sselfie/maya/hooks/use-concept-editor.ts
export function useConceptEditor() {
  const [editingId, setEditingId] = useState<string | null>(null)

  return {
    isEditing: (id: string) => editingId === id,
    toggle: (id: string) => setEditingId(editingId === id ? null : id)
  }
}
```

### Tailwind Classes (Optional)

If using Tailwind, define custom utilities:

```css
@layer components {
  .glass-panel {
    @apply rounded-lg border border-white/10 bg-white/5 backdrop-blur-2xl;
  }

  .glass-button {
    @apply rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium uppercase tracking-widest text-gray-400 transition-colors hover:text-white;
  }

  .header-title {
    @apply font-cormorant text-3xl font-light uppercase tracking-tight text-white;
  }
}
```

Then apply:
```tsx
<div className="glass-panel">...</div>
<button className="glass-button">...</button>
```

---

## Typography Setup

### Google Fonts Import

Already included in prototypes. Add to your `_app.tsx` or layout:

```tsx
import { Inter } from 'next/font/google'
import { Cormorant_Garamond } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['200', '300', '400', '500', '600'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ fontFamily: inter.style.fontFamily }}>
      <body>{children}</body>
    </html>
  )
}
```

### CSS Classes

```css
.header-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 32px;
  font-weight: 200;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.label-uppercase {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.5em;
  text-transform: uppercase;
}
```

---

## Component Mapping

### v2-maya-chat.html → React Components

| HTML Section | React File | Updates Needed |
|---|---|---|
| `.header` | `maya-header.tsx` | Style header, add credit display |
| `.tab-switcher` | `maya-tab-switcher.tsx` | Apply glass styling, underline active tab |
| `.chat-area` | `maya-chat-history.tsx` | Update message styling |
| `.instagram-card` | `instagram-photo-card.tsx` | Apply glass panel styling |
| `.concepts-grid` | `maya/maya-concept-cards.tsx` | Create grid layout, add concept cards |
| `.input-bar` | `maya/maya-unified-input.tsx` | Update glass styling, mode toggle |

### v2-instagram-previews.html → React Components

| HTML Section | React File | Updates Needed |
|---|---|---|
| `.photo-card` | `instagram-photo-card.tsx` | Apply glass styling to wrapper |
| `.carousel-card` | `instagram-carousel-card.tsx` | Glass styling, update pagination dots, add "DOWNLOAD ALL" |
| `.reel-card` | `instagram-reel-card.tsx` | Glass styling, update play button, improve footer |

---

## Animation Implementation

### CSS Animations

Copy these keyframes to your global CSS:

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Framer Motion (Alternative)

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  Message content
</motion.div>
```

---

## Testing Checklist

### Visual Testing
- [ ] Dark background (#0a0a0a) on all pages
- [ ] Glass panels visible with blur effect
- [ ] Typography: Cormorant headers, Inter body
- [ ] Colors match palette (5 colors + glass)
- [ ] No icons visible (no lucide, emoji)

### Responsive Testing
- [ ] 375px width: Single-column layout
- [ ] 600px width: 2-column grid (concepts, videos)
- [ ] 1200px width: Full desktop experience
- [ ] Touch targets: 44px minimum height

### Interaction Testing
- [ ] Tab switcher updates active tab
- [ ] Quick prompt pills populate input field
- [ ] Concept card prompts expand/collapse
- [ ] Carousel dots navigate images
- [ ] Pagination dots update carousel indicator
- [ ] Play button interaction on reels

### Performance Testing
- [ ] Page loads in <2s on 4G
- [ ] Scroll smoothness (60 FPS)
- [ ] No layout shift on image load
- [ ] Animation performance (no jank)

---

## Deployment Notes

### File Size
- `v2-maya-chat.html`: 38 KB (uncompressed, no gzip)
- `v2-instagram-previews.html`: 25 KB
- After gzip: ~10 KB each

### Browser Support
- Modern browsers only (Chrome 90+, Safari 14+)
- Requires CSS backdrop-filter support
- No IE11 support (expected for modern app)

### Performance Optimization
1. Lazy load Google Fonts
2. Minify CSS in production
3. Use CSS-in-JS for critical path
4. Implement virtual scrolling for long message lists

---

## Next Steps

1. **Design Review** — Share prototypes with team, gather feedback
2. **CSS Extraction** — Create `/styles/v2-design-system.css` with all variables
3. **Component Updates** — Implement glass styling in 3–5 priority components
4. **Responsive Fixes** — Test on actual devices, adjust breakpoints
5. **Accessibility Audit** — Ensure sufficient color contrast, ARIA labels
6. **Performance Baseline** — Measure before/after metrics

---

## Support & Questions

- **Colors Not Showing?** Verify CSS variables are defined in `:root`
- **Glass Blur Not Working?** Check browser support for `backdrop-filter`
- **Font Not Loading?** Check Google Fonts CDN link, verify network tab
- **Mobile Layout Broken?** Test at exactly 375px width, check media queries
- **Animations Laggy?** Use `will-change: transform`, reduce animation duration

---

**Version:** 2.0
**Last Updated:** February 27, 2026
**Status:** Ready for Implementation
