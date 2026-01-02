# Phase 2 Implementation Plan - Updated with New Tab Structure

**Goal**: Merge Maya and B-Roll into a unified "Create" experience with Photos, Videos, Prompts, and Training tabs, sharing context between them.

**Current Status**:
- ✅ Phase 1: Component extraction and mode system simplification (100% complete)
- ✅ Phase 2.1: Tab structure with sticky header/tabs (100% complete)
- ❌ Phase 2.2: B-Roll integration into Videos tab (0%)
- ❌ Phase 2.3: Prompts tab implementation (0%)
- ❌ Phase 2.4: Shared context between tabs (0%)
- ❌ Phase 2.5: Remove B-Roll from main navigation (0%)

**Estimated Time Remaining**: 12-16 days

---

## Overview

Phase 2 transforms the Maya screen into a unified creation experience with four tabs:
- **Photos Tab**: Current Maya chat interface (image generation, concepts) ✅
- **Videos Tab**: B-Roll functionality (animate images into videos) ⏳
- **Prompts Tab**: Ready-to-use prompts from free guide (NEW) ⏳
- **Training Tab**: Onboarding/training wizard (NEW) ✅

**Key Benefits**:
- Unified creation workflow
- Shared image context between Photos and Videos
- Easy access to ready prompts
- Reduced navigation complexity
- Better user experience
- Sticky header/tabs (always accessible)

---

## ✅ Phase 2.1: Tab Structure (COMPLETE)

### Completed:
- ✅ Created `MayaTabSwitcher` component with 4 tabs
- ✅ Made header and tabs sticky (always visible)
- ✅ Updated tab state to support 4 tabs
- ✅ Added URL hash support for all tabs
- ✅ Added localStorage persistence
- ✅ Created placeholder content for all tabs

### Current Tab Structure:
```
┌─────────────────────────────────┐
│ SSELFIE  [Classic|Pro]  Credits │ ← Sticky Header (z-50)
├─────────────────────────────────┤
│ Photos | Videos | Prompts | Train│ ← Sticky Tabs (z-40)
├─────────────────────────────────┤
│                                 │
│      Scrollable Content         │
│                                 │
└─────────────────────────────────┘
```

---

## Phase 2.2: Integrate B-Roll Component (Videos Tab)

### Step 2.2.1: Extract B-Roll Logic into Reusable Component

**Goal**: Extract B-Roll screen logic into a component that can be embedded in Videos tab

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
    sharedImages={sharedImages} // From Photos tab (Step 2.4)
    creditBalance={creditBalance}
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

## Phase 2.3: Implement Prompts Tab

### Step 2.3.1: Create Prompt Data Structure

**Goal**: Define prompt interface and data source

**Prompt Interface**:
```typescript
interface Prompt {
  id: string
  title: string
  category: "wellness" | "luxury" | "travel" | "fashion" | "lifestyle" | "all"
  description: string
  prompt: string // Full prompt text
  previewImage?: string // Optional preview
  tags: string[]
  author?: string // "Sandra's Favourites" or custom
}
```

**Data Source Options**:
1. **Static JSON** (`lib/maya/prompts.json`) - Easy to maintain
2. **API Endpoint** (`/api/maya/prompts`) - Dynamic, can include user-specific
3. **Academy Integration** - Pull from existing Academy content

**Recommendation**: Start with static JSON, migrate to API later if needed

**Files to Create**:
- `lib/maya/prompts.json` or `lib/maya/prompts.ts`
- `lib/maya/prompt-types.ts`

**Estimated Time**: 2-3 hours

---

### Step 2.3.2: Create Prompt Card Component

**Goal**: Create reusable prompt card matching design example

**Design Requirements**:
- Card with preview image area
- Title (serif font, 17px)
- Category label (uppercase, small)
- Hover effects (lift, shadow)
- Click to show concept preview

**Files to Create**:
- `components/sselfie/maya/maya-prompt-card.tsx`

**Estimated Time**: 3-4 hours

---

### Step 2.3.3: Create Category Filter Component

**Goal**: Horizontal scrollable category filter

**Categories**:
- All
- Wellness
- Luxury
- Travel
- Fashion
- Lifestyle

**Design Requirements**:
- Horizontal scrollable on mobile
- Active category highlighted
- Smooth transitions
- Touch-friendly (min 44px height)

**Files to Create**:
- `components/sselfie/maya/maya-category-filter.tsx`

**Estimated Time**: 2-3 hours

---

### Step 2.3.4: Create Concept Preview Component

**Goal**: Show selected prompt with image slots and generate button

**Features**:
- Display prompt title and description
- Show image slots (up to 4 from gallery)
- "Generate Photo" button
- Helper text showing image count

**Files to Create**:
- `components/sselfie/maya/maya-concept-preview.tsx`

**Estimated Time**: 3-4 hours

---

### Step 2.3.5: Create Prompts Tab Component

**Goal**: Main component combining all prompt components

**Layout**:
```
┌─────────────────────────────────┐
│ Section Header                  │
│ "Sandra's Favourites"           │
│ Subtitle                        │
├─────────────────────────────────┤
│ Category Filter (scrollable)    │
├─────────────────────────────────┤
│ Prompt Cards Grid               │
│ [Card] [Card] [Card]            │
│ [Card] [Card] [Card]            │
├─────────────────────────────────┤
│ Concept Preview (when selected) │
│ - Prompt details                │
│ - Image slots                   │
│ - Generate button               │
└─────────────────────────────────┘
```

**Files to Create**:
- `components/sselfie/maya/maya-prompts-tab.tsx`

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` - Replace placeholder

**Estimated Time**: 4-5 hours

---

## Phase 2.4: Share Context Between Tabs

### Step 2.4.1: Create Shared Images Hook

**Goal**: Create a hook to share images between Photos and Videos tabs

**What to Share**:
- Images generated in Photos tab
- Images from concept cards
- Selected images from gallery
- Image metadata (id, url, prompt, description)

**Implementation**:
```typescript
// components/sselfie/maya/hooks/use-maya-shared-images.ts
export function useMayaSharedImages() {
  const [sharedImages, setSharedImages] = useState<Array<MayaImage>>([])
  
  const addImage = useCallback((image: MayaImage) => {
    setSharedImages(prev => [...prev, image])
  }, [])
  
  const clearImages = useCallback(() => {
    setSharedImages([])
  }, [])
  
  return { sharedImages, addImage, clearImages }
}
```

**Files to Create**:
- `components/sselfie/maya/hooks/use-maya-shared-images.ts`

**Estimated Time**: 3-4 hours

---

### Step 2.4.2: Track Images in Photos Tab

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

### Step 2.4.3: Use Shared Images in Videos Tab

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

## Phase 2.5: Update Navigation

### Step 2.5.1: Remove B-Roll from Main Navigation

**Goal**: Remove B-Roll tab from main app navigation

**Changes**:
- Remove `{ id: "b-roll", label: "B-Roll", icon: Film }` from tabs array
- Remove B-Roll route handling
- Update navigation menu references

**Files to Modify**:
- `components/sselfie/sselfie-app.tsx`

**Estimated Time**: 1 hour

---

### Step 2.5.2: Update All B-Roll References

**Goal**: Update navigation references to point to Maya Videos tab

**Where References Exist**:
- Navigation menus in other screens
- Deep links/URLs
- Onboarding/tutorials
- Help text

**Implementation**:
- Search for all `"b-roll"` references
- Update to navigate to Maya with `#maya/videos` hash
- Update URL handling to support `#maya/videos`

**Files to Modify**:
- `components/sselfie/gallery-screen.tsx`
- `components/sselfie/profile-screen.tsx`
- `components/sselfie/academy-screen.tsx`
- `components/sselfie/settings-screen.tsx`
- Any other screens with navigation menus

**Estimated Time**: 2-3 hours

---

## Implementation Order & Timeline

### Week 1: Videos Tab Integration

**Day 1-2**: Step 2.2.1 - Extract B-Roll Logic
- Morning: Analyze B-Roll component structure
- Afternoon: Extract logic into `MayaVideosTab`

**Day 3**: Step 2.2.2 - Integrate Videos Tab
- Morning: Integrate component into Maya screen
- Afternoon: Testing and bug fixes

**Day 4**: Step 2.2.3 - Remove Dependencies
- Morning: Remove header/navigation dependencies
- Afternoon: Final testing

### Week 2: Prompts Tab Implementation

**Day 1**: Step 2.3.1 - Prompt Data Structure
- Create prompt interface and data source

**Day 2**: Step 2.3.2 - Prompt Card Component
- Create reusable prompt card

**Day 3**: Step 2.3.3 - Category Filter
- Create category filter component

**Day 4**: Step 2.3.4 - Concept Preview
- Create concept preview component

**Day 5**: Step 2.3.5 - Prompts Tab Component
- Combine all components into main tab

### Week 3: Shared Context & Navigation

**Day 1**: Step 2.4.1 - Shared Images Hook
- Create hook for sharing images

**Day 2**: Step 2.4.2 - Track Images in Photos Tab
- Implement image tracking

**Day 3**: Step 2.4.3 - Use Shared Images in Videos Tab
- Display shared images in Videos tab

**Day 4**: Step 2.5.1 & 2.5.2 - Update Navigation
- Remove B-Roll from main nav
- Update all references

**Day 5**: Testing & Polish
- End-to-end testing
- Bug fixes
- Performance optimization

---

## Success Criteria

### Phase 2.2 Complete When:
- ✅ B-Roll logic extracted to reusable component
- ✅ Videos tab integrated into Maya screen
- ✅ All B-Roll functionality preserved
- ✅ No header/navigation dependencies
- ✅ Works correctly in tab context

### Phase 2.3 Complete When:
- ✅ Prompt data structure created
- ✅ Prompt cards render correctly
- ✅ Category filtering works
- ✅ Concept preview shows on selection
- ✅ Generate button triggers photo generation
- ✅ Matches design example

### Phase 2.4 Complete When:
- ✅ Shared images hook created
- ✅ Images tracked in Photos tab
- ✅ Shared images displayed in Videos tab
- ✅ Images deduplicated correctly
- ✅ Visual separation between sections

### Phase 2.5 Complete When:
- ✅ B-Roll removed from main navigation
- ✅ All references updated
- ✅ Deep links work correctly
- ✅ No broken navigation

---

## Next Immediate Steps

### Priority 1: Videos Tab (Week 1)
1. **Extract B-Roll Logic** - Start with `MayaVideosTab` component
2. **Integrate into Maya** - Replace placeholder
3. **Remove Dependencies** - Clean up header/nav

### Priority 2: Prompts Tab (Week 2)
1. **Create Prompt Data** - Define structure and add sample prompts
2. **Build Components** - Card, filter, preview
3. **Integrate Tab** - Combine into main component

### Priority 3: Shared Context (Week 3)
1. **Create Hook** - Shared images hook
2. **Track Images** - In Photos tab
3. **Display in Videos** - Show shared images

---

## Technical Considerations

### State Management

**Tab State**:
- Local state in MayaChatScreen (`useState`)
- Persist to localStorage
- URL hash support

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

**Prompts Tab**:
- Static JSON or API endpoint
- Category filtering (client-side)
- Image selection from gallery

### Performance

- Lazy load tab content (only fetch when tab active)
- Memoize shared images list
- Optimize image grid rendering
- Use React.memo for expensive components
- Virtual scrolling for large prompt lists

### Mobile Optimization

- Tab switcher touch-friendly (min 44px height)
- Responsive image grids
- Optimize video preview modal for mobile
- Horizontal scroll for category filters
- Test on various screen sizes

---

## Testing Checklist

### Videos Tab
- [ ] B-Roll component works in tab context
- [ ] All video generation features work
- [ ] Video polling works correctly
- [ ] Image grid displays correctly
- [ ] Video preview modal works
- [ ] No header/navigation conflicts
- [ ] Shared images appear at top

### Prompts Tab
- [ ] Prompt cards render correctly
- [ ] Category filtering works
- [ ] Concept preview shows on selection
- [ ] Image slots work correctly
- [ ] Generate button triggers generation
- [ ] Mobile layout works
- [ ] Horizontal scroll works

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

## Notes

- **Incremental Approach**: Complete each step before moving to next
- **Test Thoroughly**: Test after each step, not just at the end
- **Preserve Functionality**: Ensure all B-Roll features work in tab context
- **User Experience**: Smooth transitions, clear visual feedback
- **Performance**: Lazy load, optimize rendering
- **Mobile First**: Ensure mobile experience is excellent
- **Design Consistency**: Match design tokens from example

---

## Dependencies

- Phase 1 must be complete (component extraction, hooks) ✅
- Phase 2.1 must be complete (tab structure) ✅
- B-Roll screen must be functional
- Maya screen must be functional
- API endpoints must be working

---

**Ready to start? Begin with Step 2.2.1: Extract B-Roll Logic** 🚀

