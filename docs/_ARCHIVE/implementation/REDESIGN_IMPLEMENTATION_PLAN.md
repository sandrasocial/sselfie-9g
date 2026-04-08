# Maya Screen Redesign - Implementation Plan

## Design Analysis

### Current Issues Solved:
1. ✅ **Header + Tabs Always Visible** - Sticky positioning keeps navigation accessible
2. ✅ **Better Space Utilization** - Cleaner layout, less visual clutter
3. ✅ **New "Prompts" Tab** - Ready-to-use prompts from free guide
4. ✅ **Professional Layout** - Similar to modern apps (Instagram, Pinterest)

### Key Design Elements:

#### 1. **Sticky Header** (Always Visible)
```
┌─────────────────────────────────────────┐
│ SSELFIE    [Classic|Pro]    Credits    │  Sticky
└─────────────────────────────────────────┘
```

#### 2. **Sticky Subtabs** (Always Visible)
```
┌─────────────────────────────────────────┐
│ Photos | Videos | Prompts | Training    │  Sticky
└─────────────────────────────────────────┘
```

#### 3. **Scrollable Content Area**
- Photos tab: Chat interface
- Videos tab: B-Roll interface
- Prompts tab: Prompt gallery (NEW)
- Training tab: Onboarding/training

#### 4. **Bottom Navigation** (Fixed)
- Icons for main app navigation
- Always accessible

## Implementation Plan

### Phase 1: Restructure Header & Tabs Layout

**Changes:**
1. Make header sticky with `position: sticky; top: 0`
2. Move tab switcher below header (separate sticky bar)
3. Update tab structure to include "Prompts" and "Training"
4. Ensure proper z-index layering

**Files to Modify:**
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-tab-switcher.tsx` (update to support 4 tabs)

### Phase 2: Create Prompts Tab Component

**New Component:**
- `components/sselfie/maya/maya-prompts-tab.tsx`

**Features:**
- Grid of prompt cards
- Category filters (Wellness, Luxury, Travel, Fashion, Lifestyle)
- Click prompt → Show concept preview
- "Generate Photo" button
- Image slots for gallery images

**Data Source:**
- Free prompt guide (from Academy or separate API)
- Categorized prompts
- Preview images (optional)

### Phase 3: Integrate Training Tab

**Options:**
1. Link to existing onboarding wizard
2. Embed training flow in tab
3. Show training status/progress

### Phase 4: Update Tab Switcher

**Changes:**
- Support 4 tabs instead of 2
- Horizontal scrollable on mobile
- Active tab indicator (underline)
- Smooth transitions

## Technical Implementation

### Tab State Update

```typescript
const [activeMayaTab, setActiveMayaTab] = useState<"photos" | "videos" | "prompts" | "training">("photos")
```

### Sticky Header Structure

```tsx
<div className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-stone-200/50">
  {/* Header: SSELFIE, Mode Switcher, Credits */}
</div>

<div className="sticky top-[60px] z-40 bg-white border-b border-stone-200/50">
  {/* Tabs: Photos, Videos, Prompts, Training */}
</div>
```

### Prompts Tab Component

```typescript
interface MayaPromptsTabProps {
  user: any
  onSelectPrompt: (prompt: Prompt) => void
  onGenerate: (prompt: Prompt, images: string[]) => void
}

export default function MayaPromptsTab({
  user,
  onSelectPrompt,
  onGenerate,
}: MayaPromptsTabProps) {
  // Fetch prompts from API or static data
  // Render grid of prompt cards
  // Handle category filtering
  // Show concept preview when prompt selected
}
```

## Design Tokens (Matching Example)

### Colors
- Background: `#fafaf9` (stone-50)
- Header: `rgba(255, 255, 255, 0.85)` with backdrop blur
- Border: `rgba(231, 229, 228, 0.6)` (stone-200/60)
- Text Primary: `#1c1917` (stone-950)
- Text Secondary: `#78716c` (stone-600)
- Active: `#1c1917` (stone-950)

### Typography
- Logo: Serif, 18px, letter-spacing 0.35em, uppercase
- Tab Labels: 12px, letter-spacing 0.08em, uppercase, weight 500
- Section Title: Serif, 13px, letter-spacing 0.25em, uppercase
- Prompt Title: Serif, 17px, weight 300

### Spacing
- Header padding: 20px 24px (mobile: 14px 16px)
- Tab padding: 20px 4px (mobile: 18px 8px)
- Content padding: 40px 24px (mobile: 28px 16px)
- Card gap: 24px (mobile: 20px)

### Border Radius
- Cards: 20px (mobile: 18px)
- Buttons: 16px (mobile: 14px)
- Image slots: 16px (mobile: 14px)

## Mobile Optimizations

### Touch Targets
- Tab buttons: min 44px height
- Category filters: min 44px height
- Prompt cards: Full width on mobile
- Bottom nav: min 64px height

### Scrolling
- Horizontal scroll for tabs on mobile
- Horizontal scroll for category filters
- Smooth scroll snap for filters

### Layout
- Single column prompt grid on mobile
- Stacked header elements on very small screens
- Optimized spacing for small screens

## File Structure

```
components/sselfie/maya/
├── maya-header.tsx (updated - sticky)
├── maya-tab-switcher.tsx (updated - 4 tabs)
├── maya-prompts-tab.tsx (new)
├── maya-prompt-card.tsx (new)
├── maya-concept-preview.tsx (new)
└── maya-category-filter.tsx (new)
```

## Data Structure

### Prompt Interface

```typescript
interface Prompt {
  id: string
  title: string
  category: "wellness" | "luxury" | "travel" | "fashion" | "lifestyle"
  description: string
  prompt: string // Full prompt text
  previewImage?: string // Optional preview
  tags: string[]
}
```

### Prompts Data Source

**Option 1: Static JSON**
- `lib/maya/prompts.json`
- Categorized prompts
- Easy to maintain

**Option 2: API Endpoint**
- `/api/maya/prompts`
- Can be dynamic
- Can include user-specific prompts

**Option 3: Academy Integration**
- Pull from existing Academy content
- Reuse existing prompt guide

## Implementation Steps

### Step 1: Update Tab Structure (2 hours)
1. Update `MayaTabSwitcher` to support 4 tabs
2. Add "Prompts" and "Training" tabs
3. Update tab state in `MayaChatScreen`
4. Make header and tabs sticky

### Step 2: Create Prompts Tab (4-6 hours)
1. Create `MayaPromptsTab` component
2. Create `MayaPromptCard` component
3. Create `MayaCategoryFilter` component
4. Create `MayaConceptPreview` component
5. Add prompt data (static or API)

### Step 3: Integrate Training Tab (2 hours)
1. Link to onboarding wizard
2. Or embed training flow
3. Show training status

### Step 4: Styling & Polish (2-3 hours)
1. Match design tokens
2. Add animations/transitions
3. Mobile optimizations
4. Testing

**Total Estimated Time: 10-13 hours**

## Benefits

1. ✅ **Solves Space Issue** - Sticky header/tabs don't scroll away
2. ✅ **Better UX** - Always accessible navigation
3. ✅ **New Feature** - Prompts tab for easy access
4. ✅ **Professional Design** - Modern, clean layout
5. ✅ **Mobile Optimized** - Responsive, touch-friendly
6. ✅ **Extensible** - Easy to add more tabs later

## Next Steps

1. **Review design** - Confirm this matches your vision
2. **Start with Step 1** - Update tab structure
3. **Create Prompts tab** - Build the new feature
4. **Test & iterate** - Refine based on usage

---

**Ready to implement?** This design solves the space issue while adding valuable functionality! 🚀

