# Header & Tabs UX Improvement Plan

## Problem Statement

**Current Issues:**
1. Header and Photos/Videos tabs scroll away when chat content appears
2. If made fixed, too many fixed elements reduce chat area:
   - Header (~60px)
   - Tab switcher (~50px)
   - Input area (fixed bottom, ~120px)
   - Bottom navigation buttons (~50px)
   - **Total: ~280px of fixed space** (on mobile this is ~40% of screen!)

## Professional App Solutions Analysis

### 1. **Auto-Hide on Scroll (WhatsApp Web, Slack, Discord)**
- Header/tabs stay visible when at top
- Auto-hide when scrolling down (maximize content)
- Auto-show when scrolling up (show navigation)
- **Best for:** Chat-heavy interfaces

### 2. **Compact Unified Header (VS Code, Chrome)**
- Combine header + tabs into one compact bar
- Use icons/compact design
- Save ~30-40px vertical space
- **Best for:** Desktop-first apps

### 3. **Collapsible Header (Gmail, Notion)**
- Header collapses to minimal state when scrolling
- Expands on hover or scroll up
- **Best for:** Content-heavy apps

### 4. **Floating Action Button (FAB) for Input (Mobile Apps)**
- Input area minimizes to FAB when not in use
- Expands when clicked
- **Best for:** Mobile-first experiences

### 5. **Sidebar Navigation (Slack, Discord)**
- Move navigation to sidebar
- Tabs stay at top
- More horizontal space, less vertical clutter
- **Best for:** Desktop apps with multiple views

## Recommended Solution: **Hybrid Approach**

### Phase 1: Auto-Hide Header + Tabs (Quick Win)
**Implementation:**
- Make header + tabs `position: sticky` with `top: 0`
- Add scroll detection to hide/show on scroll direction
- Smooth transitions (200-300ms)
- Keep visible when at top of chat

**Benefits:**
- ✅ Maximizes content area when scrolling
- ✅ Easy access to navigation when needed
- ✅ Professional UX pattern
- ✅ Works on all screen sizes

**Code Pattern:**
```typescript
const [isScrollingDown, setIsScrollingDown] = useState(false)
const [lastScrollY, setLastScrollY] = useState(0)

useEffect(() => {
  const handleScroll = () => {
    const currentScrollY = window.scrollY
    setIsScrollingDown(currentScrollY > lastScrollY && currentScrollY > 100)
    setLastScrollY(currentScrollY)
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [lastScrollY])
```

### Phase 2: Compact Unified Header (Space Optimization)
**Implementation:**
- Merge header and tabs into single compact bar
- Reduce padding/spacing
- Use icons where appropriate
- Save ~40-50px vertical space

**Benefits:**
- ✅ More chat area
- ✅ Cleaner design
- ✅ Still accessible

### Phase 3: Smart Input Area (Advanced)
**Implementation:**
- Input area stays fixed (essential)
- Bottom navigation buttons:
  - Hide when scrolling down
  - Show when scrolling up or at bottom
  - Or: Move to header as icons

**Benefits:**
- ✅ Additional ~50px saved when scrolling
- ✅ Input always accessible
- ✅ Navigation available when needed

## Implementation Plan

### Option A: Auto-Hide (Recommended for MVP)
**Effort:** 2-3 hours
**Impact:** High
**Risk:** Low

**Steps:**
1. Add scroll detection hook
2. Make header + tabs sticky with auto-hide
3. Add smooth transitions
4. Test on mobile/desktop

### Option B: Compact Unified Header
**Effort:** 4-6 hours
**Impact:** High
**Risk:** Medium (design changes)

**Steps:**
1. Redesign header to include tabs
2. Reduce spacing/padding
3. Optimize for mobile
4. Test accessibility

### Option C: Full Hybrid (Best UX)
**Effort:** 6-8 hours
**Impact:** Very High
**Risk:** Medium

**Steps:**
1. Implement auto-hide (Option A)
2. Implement compact header (Option B)
3. Add smart input area behavior
4. Comprehensive testing

## Technical Implementation Details

### Auto-Hide Header Component

```typescript
// hooks/use-scroll-direction.ts
export function useScrollDirection() {
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isAtTop, setIsAtTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY
      const atTop = currentScrollY < 50

      setIsScrollingDown(scrollingDown && !atTop)
      setIsAtTop(atTop)
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return { isScrollingDown, isAtTop }
}
```

### Sticky Header with Auto-Hide

```tsx
const { isScrollingDown, isAtTop } = useScrollDirection()
const shouldShow = !isScrollingDown || isAtTop

<div
  className={`sticky top-0 z-50 transition-transform duration-300 ${
    shouldShow ? 'translate-y-0' : '-translate-y-full'
  }`}
>
  {/* Header + Tabs */}
</div>
```

### Compact Unified Header Design

**Current:**
```
┌─────────────────────────────────┐
│ SSELFIE    Credits  Mode  Menu │  Header (60px)
├─────────────────────────────────┤
│      Photos  |  Videos         │  Tabs (50px)
└─────────────────────────────────┘
```

**Proposed:**
```
┌─────────────────────────────────┐
│ SSELFIE  Photos|Videos  Credits │  Unified (45px)
│           Mode  Menu             │
└─────────────────────────────────┘
```

**Space Saved:** ~15px + better organization

## Mobile Considerations

### Current Mobile Issues:
- Fixed elements take ~40% of screen
- Input area is essential (keep fixed)
- Bottom nav buttons less critical

### Mobile Optimizations:
1. **Header:** Auto-hide on scroll down
2. **Tabs:** Keep visible (essential for navigation)
3. **Input:** Always visible (essential)
4. **Bottom Nav:** Hide when scrolling, show at bottom

### Mobile Layout:
```
┌─────────────────┐
│ Header (hidden) │ ← Auto-hide
├─────────────────┤
│ Photos|Videos   │ ← Always visible
├─────────────────┤
│                 │
│   Chat Content  │ ← Scrollable
│                 │
├─────────────────┤
│ Input Area      │ ← Always visible
│ [New] [History] │ ← Show at bottom
└─────────────────┘
```

## Testing Checklist

- [ ] Header hides on scroll down
- [ ] Header shows on scroll up
- [ ] Header visible at top of page
- [ ] Tabs always accessible
- [ ] Input area always accessible
- [ ] Smooth transitions (no jank)
- [ ] Works on mobile (< 400px width)
- [ ] Works on tablet (400-768px)
- [ ] Works on desktop (> 768px)
- [ ] Touch scrolling works correctly
- [ ] Keyboard navigation works
- [ ] Screen reader accessible

## Recommendation

**Start with Option A (Auto-Hide)** because:
1. ✅ Quick to implement (2-3 hours)
2. ✅ High impact (solves main problem)
3. ✅ Low risk (doesn't change design)
4. ✅ Professional UX pattern
5. ✅ Can be enhanced later with Options B/C

**Then evaluate:**
- If users need more space → Implement Option B (Compact Header)
- If still not enough → Implement Option C (Full Hybrid)

## Next Steps

1. **Create scroll detection hook** (`use-scroll-direction.ts`)
2. **Update header/tabs to use auto-hide**
3. **Test on all screen sizes**
4. **Gather user feedback**
5. **Iterate based on feedback**

---

**Ready to implement?** Start with Option A (Auto-Hide) for quick wins! 🚀

