# Phase 2 Implementation Plan - Unified Create Experience

**Goal**: Merge Maya and B-Roll into a single "Create" experience with Photos and Videos tabs, sharing context between them.

**Current Status**:
- ✅ Phase 1: Component extraction and mode system simplification (100% complete)
- ❌ Phase 2: Tab structure and B-Roll integration (0%)

**Estimated Time**: 8-12 days

---

## Overview

Phase 2 transforms the Maya screen into a unified creation experience with two tabs:
- **Photos Tab**: Current Maya chat interface (image generation, concepts)
- **Videos Tab**: B-Roll functionality (animate images into videos)

**Key Benefits**:
- Unified creation workflow
- Shared image context between Photos and Videos
- Reduced navigation complexity
- Better user experience

---

## Phase 2.1: Create Tab Structure

### Step 2.1.1: Create Tab Switcher Component

**Goal**: Create a reusable tab switcher component for Photos/Videos tabs

**Implementation**:
```typescript
// components/sselfie/maya/maya-tab-switcher.tsx
interface MayaTabSwitcherProps {
  activeTab: "photos" | "videos"
  onTabChange: (tab: "photos" | "videos") => void
  photosCount?: number // Optional: show count of generated photos
  videosCount?: number // Optional: show count of generated videos
}
```

**Design Requirements**:
- Segmented control style (matches mode toggle)
- Text-based labels: "Photos" and "Videos"
- Active tab highlighted
- Smooth transitions
- Mobile-optimized touch targets
- Consistent with SSELFIE design system

**Files to Create**:
- `components/sselfie/maya/maya-tab-switcher.tsx`

**Estimated Time**: 2-3 hours

---

### Step 2.1.2: Add Tab State to Maya Screen

**Goal**: Add tab state management to MayaChatScreen

**Implementation**:
```typescript
// In maya-chat-screen.tsx
const [activeMayaTab, setActiveMayaTab] = useState<"photos" | "videos">("photos")

// Tab switcher in header or below header
<MayaTabSwitcher
  activeTab={activeMayaTab}
  onTabChange={setActiveMayaTab}
/>
```

**Location**:
- Place tab switcher below the header (or in header if space allows)
- Only show when in Maya screen
- Persist tab selection in localStorage (optional)

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`

**Estimated Time**: 1-2 hours

---

### Step 2.1.3: Conditional Rendering Based on Tab

**Goal**: Show Photos content when "photos" tab active, prepare for Videos tab

**Implementation**:
```typescript
{activeMayaTab === "photos" && (
  // Current Maya chat interface
  <MayaChatInterface ... />
)}

{activeMayaTab === "videos" && (
  // Placeholder for B-Roll integration (Step 2.2)
  <div>Videos tab - Coming soon</div>
)}
```

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`

**Estimated Time**: 1 hour

---

## Phase 2.2: Integrate B-Roll Component

### Step 2.2.1: Extract B-Roll Logic into Reusable Component

**Goal**: Extract B-Roll screen logic into a component that can be embedded in Maya

**Current State**:
- `b-roll-screen.tsx` is a full-screen component with its own header
- Uses SWR for data fetching
- Has video generation, polling, and state management

**Proposed Solution**:
- Create `MayaVideosTab.tsx` component
- Extract B-Roll logic (without header/navigation)
- Make it work as a tab content component
- Preserve all existing functionality

**What to Extract**:
- Image fetching logic (`useSWRInfinite` for b-roll-images)
- Video fetching logic (`useSWR` for videos)
- Video generation logic (`handleAnimate`)
- Video polling logic
- Video state management (generating, progress, errors)
- Image grid rendering
- Video preview modal

**Files to Create**:
- `components/sselfie/maya/maya-videos-tab.tsx`

**Files to Modify**:
- `components/sselfie/b-roll-screen.tsx` - Keep as backup/reference

**Estimated Time**: 4-6 hours

---

### Step 2.2.2: Integrate Videos Tab into Maya Screen

**Goal**: Replace placeholder with actual B-Roll component

**Implementation**:
```typescript
{activeMayaTab === "videos" && (
  <MayaVideosTab
    user={user}
    onCreditsUpdate={setCreditBalance}
    sharedImages={sharedImages} // From Photos tab (Step 2.3)
  />
)}
```

**Props Interface**:
```typescript
interface MayaVideosTabProps {
  user: any
  onCreditsUpdate?: (balance: number) => void
  sharedImages?: Array<{ url: string; id: string }> // Shared from Photos tab
  creditBalance?: number
}
```

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`

**Estimated Time**: 2-3 hours

---

### Step 2.2.3: Remove B-Roll Header Dependencies

**Goal**: Remove header, navigation menu, and standalone screen dependencies

**Changes Needed**:
- Remove header rendering from `MayaVideosTab`
- Remove navigation menu (handled by Maya header)
- Remove standalone screen wrapper
- Ensure component works in tab context

**Files to Modify**:
- `components/sselfie/maya/maya-videos-tab.tsx`

**Estimated Time**: 2-3 hours

---

## Phase 2.3: Share Context Between Tabs

### Step 2.3.1: Create Shared Images Context

**Goal**: Create a context/hook to share images between Photos and Videos tabs

**What to Share**:
- Images generated in Photos tab
- Images from concept cards
- Selected images from gallery
- Image metadata (id, url, prompt, description)

**Implementation Options**:

**Option A: React Context**
```typescript
// components/sselfie/maya/context/maya-images-context.tsx
interface MayaImagesContextValue {
  photosTabImages: Array<MayaImage>
  addPhotoTabImage: (image: MayaImage) => void
  clearPhotosTabImages: () => void
  getSharedImages: () => Array<MayaImage>
}
```

**Option B: Custom Hook**
```typescript
// components/sselfie/maya/hooks/use-maya-shared-images.ts
export function useMayaSharedImages() {
  const [sharedImages, setSharedImages] = useState<Array<MayaImage>>([])
  // ... logic
  return { sharedImages, addImage, clearImages }
}
```

**Recommendation**: Use custom hook (simpler, no context provider needed)

**Files to Create**:
- `components/sselfie/maya/hooks/use-maya-shared-images.ts`

**Estimated Time**: 3-4 hours

---

### Step 2.3.2: Track Images in Photos Tab

**Goal**: Track all images generated/selected in Photos tab

**Where Images Come From**:
1. Concept card generation (from MayaChatInterface)
2. Direct image generation
3. Gallery selection (Pro Mode)
4. Image library selection

**Implementation**:
- Hook into image generation callbacks
- Track images when they're generated
- Store image metadata (id, url, prompt, description, category)
- Persist to localStorage (optional, for refresh persistence)

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx`
- `components/sselfie/maya/maya-concept-cards.tsx`

**Estimated Time**: 4-5 hours

---

### Step 2.3.3: Use Shared Images in Videos Tab

**Goal**: Display shared images in Videos tab, prioritize them

**Implementation**:
- Use shared images hook in `MayaVideosTab`
- Show shared images at the top of the grid
- Merge with B-Roll API images
- Deduplicate (don't show same image twice)
- Visual indicator for shared images (optional)

**Display Strategy**:
1. **Shared Images Section** (from Photos tab) - at top
2. **All B-Roll Images** (from API) - below shared images
3. Clear visual separation between sections

**Files to Modify**:
- `components/sselfie/maya/maya-videos-tab.tsx`

**Estimated Time**: 3-4 hours

---

## Phase 2.4: Update Navigation (Phase 4 Preview)

### Step 2.4.1: Remove B-Roll from Main Navigation

**Goal**: Remove B-Roll tab from main app navigation

**Changes**:
- Remove `{ id: "b-roll", label: "B-Roll", icon: Film }` from tabs array
- Remove B-Roll route handling
- Update navigation menu references

**Files to Modify**:
- `components/sselfie/sselfie-app.tsx`

**Estimated Time**: 1 hour

---

### Step 2.4.2: Update All B-Roll References

**Goal**: Update navigation references to point to Maya Videos tab

**Where References Exist**:
- Navigation menus in other screens
- Deep links/URLs
- Onboarding/tutorials
- Help text

**Implementation**:
- Search for all `"b-roll"` references
- Update to navigate to Maya with `#videos` hash
- Update URL handling to support `#maya/videos`

**Files to Modify**:
- `components/sselfie/gallery-screen.tsx`
- `components/sselfie/profile-screen.tsx`
- `components/sselfie/academy-screen.tsx`
- `components/sselfie/settings-screen.tsx`
- Any other screens with navigation menus

**Estimated Time**: 2-3 hours

---

## Implementation Order

### Week 1: Tab Structure & Integration

**Day 1**:
- Morning: Step 2.1.1 - Create tab switcher component
- Afternoon: Step 2.1.2 - Add tab state to Maya screen

**Day 2**:
- Morning: Step 2.1.3 - Conditional rendering based on tab
- Afternoon: Step 2.2.1 - Extract B-Roll logic (part 1)

**Day 3**:
- Morning: Step 2.2.1 - Extract B-Roll logic (part 2)
- Afternoon: Step 2.2.2 - Integrate Videos tab

**Day 4**:
- Morning: Step 2.2.3 - Remove B-Roll header dependencies
- Afternoon: Testing and bug fixes

### Week 2: Shared Context & Navigation

**Day 1**:
- Morning: Step 2.3.1 - Create shared images hook
- Afternoon: Step 2.3.2 - Track images in Photos tab (part 1)

**Day 2**:
- Morning: Step 2.3.2 - Track images in Photos tab (part 2)
- Afternoon: Step 2.3.3 - Use shared images in Videos tab

**Day 3**:
- Morning: Step 2.4.1 - Remove B-Roll from main navigation
- Afternoon: Step 2.4.2 - Update all B-Roll references

**Day 4**:
- Testing and bug fixes
- Final verification

---

## Success Criteria

### Phase 2.1 Complete When:
- ✅ Tab switcher component created
- ✅ Tab state managed in Maya screen
- ✅ Conditional rendering works correctly
- ✅ Tab selection persists (optional)
- ✅ Mobile-optimized

### Phase 2.2 Complete When:
- ✅ B-Roll logic extracted to reusable component
- ✅ Videos tab integrated into Maya screen
- ✅ All B-Roll functionality preserved
- ✅ No header/navigation dependencies
- ✅ Works correctly in tab context

### Phase 2.3 Complete When:
- ✅ Shared images hook/context created
- ✅ Images tracked in Photos tab
- ✅ Shared images displayed in Videos tab
- ✅ Images deduplicated correctly
- ✅ Visual separation between sections

### Phase 2.4 Complete When:
- ✅ B-Roll removed from main navigation
- ✅ All references updated
- ✅ Deep links work correctly
- ✅ No broken navigation

---

## Technical Considerations

### State Management

**Tab State**:
- Local state in MayaChatScreen (`useState`)
- Optional: Persist to localStorage

**Shared Images**:
- Custom hook (`useMayaSharedImages`)
- Store in component state
- Optional: Persist to localStorage for refresh

### Data Fetching

**Photos Tab**:
- Uses existing Maya chat API
- Concept generation API
- Image generation API

**Videos Tab**:
- `/api/maya/b-roll-images` (infinite scroll)
- `/api/maya/videos` (polling)
- `/api/maya/generate-video`
- `/api/maya/generate-motion-prompt`

### Performance

- Lazy load Videos tab content (only fetch when tab active)
- Memoize shared images list
- Optimize image grid rendering
- Use React.memo for expensive components

### Mobile Optimization

- Tab switcher touch-friendly (min 44px height)
- Responsive image grid
- Optimize video preview modal for mobile
- Test on various screen sizes

---

## Testing Checklist

### Tab Structure
- [ ] Tab switcher renders correctly
- [ ] Tab switching works smoothly
- [ ] Active tab highlighted correctly
- [ ] Mobile touch targets adequate
- [ ] Tab selection persists (if implemented)

### Videos Tab Integration
- [ ] B-Roll component works in tab context
- [ ] All video generation features work
- [ ] Video polling works correctly
- [ ] Image grid displays correctly
- [ ] Video preview modal works
- [ ] No header/navigation conflicts

### Shared Images
- [ ] Images tracked in Photos tab
- [ ] Shared images appear in Videos tab
- [ ] Images deduplicated correctly
- [ ] Visual separation clear
- [ ] Shared images prioritized

### Navigation
- [ ] B-Roll removed from main nav
- [ ] All references updated
- [ ] Deep links work (`#maya/videos`)
- [ ] No broken navigation
- [ ] Back button works correctly

---

## Rollback Plan

If issues arise:
1. Keep `b-roll-screen.tsx` as backup
2. Git commit after each step
3. Can revert to separate screens if needed
4. Test after each step before proceeding

---

## Notes

- **Incremental Approach**: Complete each step before moving to next
- **Test Thoroughly**: Test after each step, not just at the end
- **Preserve Functionality**: Ensure all B-Roll features work in tab context
- **User Experience**: Smooth transitions, clear visual feedback
- **Performance**: Lazy load, optimize rendering
- **Mobile First**: Ensure mobile experience is excellent

---

## Dependencies

- Phase 1 must be complete (component extraction, hooks)
- B-Roll screen must be functional
- Maya screen must be functional
- API endpoints must be working

---

**Ready to start? Begin with Step 2.1.1: Create Tab Switcher Component** 🚀

