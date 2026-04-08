# Pro Photoshoot Implementation Plan

**Date:** January 2025  
**Status:** 📋 Planning Phase  
**Based on:** `PRO_PHOTOSHOOT_CONCEPT_CARD_ANALYSIS.md`

---

## Overview

Implement Pro Photoshoot feature in concept cards (Pro Mode only) with:
- **Step 1:** Base prompt (Grid 1) - Maya creates custom prompt
- **Step 2:** Universal prompt (Grids 2-8) - Angle variety
- **Step 3:** Optional carousel creation from any grid

**Key Requirements:**
- 4K resolution (3 credits per grid)
- Max 3 grids at once
- All previous grids required for style consistency
- Max 14 images limit (exclude oldest if exceeded)
- Reuse avatar images from concept card
- Each card has independent workflow

---

## Phase 1: Maya System Prompt Context (Foundation)

### 1.1 Create Pro Photoshoot Context Addon

**File:** `lib/maya/pro-photoshoot-context.ts` (NEW)

**Tasks:**
- [ ] Create file with `getProPhotoshootContextAddon()` function
- [ ] Add base instructions for Maya
- [ ] Add base prompt template (Grid 1)
- [ ] Add universal prompt (Grids 2-8)
- [ ] Add Pro Tips section
- [ ] Add 3 example prompts (Casual Street, Luxury Editorial, Brand Boutique)
- [ ] Export function (similar to `feed-planner-context.ts`)

**Key Content:**
```typescript
export function getProPhotoshootContextAddon(): string {
  return `
## 🎯 PRO PHOTOSHOOT MODE

[Base instructions]
[Base prompt template]
[Universal prompt]
[Pro tips]
[Examples]
`
}
```

**Dependencies:** None (foundation)

**Estimated Time:** 2-3 hours

---

### 1.2 Add Context to Maya System Prompt

**File:** `app/api/maya/pro/photoshoot/generate-grid/route.ts`

**Tasks:**
- [ ] Import `getProPhotoshootContextAddon`
- [ ] Detect Pro Photoshoot request (check request type/flag)
- [ ] Add context addon to Maya's system prompt when generating Grid 1
- [ ] Ensure context is only added for Pro Photoshoot requests (not regular chat)

**Implementation:**
```typescript
// When generating Grid 1 with Maya prompt creation
if (gridNumber === 1 && useMayaPrompt) {
  const { getProPhotoshootContextAddon } = await import("@/lib/maya/pro-photoshoot-context")
  const proPhotoshootContext = getProPhotoshootContextAddon()
  systemPrompt = proPhotoshootContext + baseSystemPrompt
}
```

**Dependencies:** Phase 1.1

**Estimated Time:** 1 hour

---

## Phase 2: Backend API Updates

### 2.1 Update Generate Grid Route

**File:** `app/api/maya/pro/photoshoot/generate-grid/route.ts`

**Tasks:**
- [ ] Accept `avatarImages` from request (from concept card)
- [ ] Get ALL previous grids for session (REQUIRED)
- [ ] Build `image_input`: avatars + all previous grids
- [ ] Handle 14 image limit (exclude oldest grids if exceeded)
- [ ] Use 4K resolution (not 2K)
- [ ] Deduct 3 credits per grid (4K resolution)
- [ ] Use universal prompt for Grids 2-8
- [ ] Use Maya-created prompt for Grid 1 (if enabled)

**Key Changes:**
```typescript
// Accept avatar images from request
const { avatarImages, gridNumber, sessionId, customPrompt } = await request.json()

// Get ALL previous grids (REQUIRED)
const previousGrids = await sql`
  SELECT grid_image_url, grid_number
  FROM pro_photoshoot_grids
  WHERE session_id = ${sessionId}
    AND generation_status = 'completed'
  ORDER BY grid_number ASC
`

// Build image input
let imageInput = avatarImages.map(img => img.url || img)
previousGrids.forEach(grid => {
  imageInput.push(grid.grid_image_url)
})

// Handle 14 image limit
if (imageInput.length > 14) {
  const avatarCount = avatarImages.length
  const maxGrids = 14 - avatarCount
  const newestGrids = previousGrids.slice(-maxGrids)
  imageInput = [
    ...avatarImages.map(img => img.url || img),
    ...newestGrids.map(grid => grid.grid_image_url)
  ]
}

// Use 4K resolution
await generateWithNanoBanana({
  prompt: gridNumber === 1 ? customPrompt : universalPrompt,
  image_input: imageInput,
  aspect_ratio: '1:1',
  resolution: '4K', // ✅ 4K not 2K
  // ...
})

// Deduct 3 credits (4K)
await deductCredits(user.id, 3, "pro_photoshoot_grid", `Pro Photoshoot Grid ${gridNumber}`)
```

**Dependencies:** None (can work in parallel with Phase 1)

**Estimated Time:** 3-4 hours

---

### 2.2 Update Start Session Route

**File:** `app/api/maya/pro/photoshoot/start-session/route.ts`

**Tasks:**
- [ ] Accept `avatarImages` from request
- [ ] Store avatar images in session (for reference)
- [ ] Ensure `originalImageId` validation
- [ ] Return session with avatar images info

**Key Changes:**
```typescript
const { originalImageId, totalGrids = 8, avatarImages } = await request.json()

// Store avatar images in session metadata
const sessionData = {
  originalImageId,
  totalGrids,
  avatarImages, // Store for reference
  // ...
}
```

**Dependencies:** None

**Estimated Time:** 1 hour

---

### 2.3 Create Carousel API Endpoint

**File:** `app/api/maya/pro/photoshoot/create-carousel/route.ts` (NEW)

**Tasks:**
- [ ] Accept `gridId` from request
- [ ] Get grid image URL from database
- [ ] Download grid image
- [ ] Split into 9 frames using Sharp (3x3 grid)
- [ ] Upload each frame to Vercel Blob
- [ ] Save frames to `ai_images` table
- [ ] Create carousel record (or use existing photoshoot pattern)
- [ ] Return carousel data with frame URLs

**Implementation:**
```typescript
// Similar to check-grid route but for carousel creation
const grid = await sql`SELECT grid_image_url FROM pro_photoshoot_grids WHERE id = ${gridId}`

// Download grid
const gridResponse = await fetch(grid.grid_image_url)
const gridBuffer = await gridResponse.arrayBuffer()

// Split into 9 frames (3x3)
const frames = await splitGridIntoFrames(Buffer.from(gridBuffer))

// Upload and save each frame
const frameUrls = []
for (let i = 0; i < 9; i++) {
  const frameBlob = await put(`pro-photoshoot-frames/${gridId}-${i}.png`, frames[i], {
    access: "public",
    contentType: "image/png",
  })
  frameUrls.push(frameBlob.url)
  
  // Save to ai_images
  await sql`INSERT INTO ai_images (...) VALUES (...)`
}

return NextResponse.json({ carouselId, frames: frameUrls })
```

**Dependencies:** Phase 2.1 (need grid structure)

**Estimated Time:** 3-4 hours

---

## Phase 3: Frontend - Button & Basic UI

### 3.1 Add Pro Photoshoot Button

**File:** `components/sselfie/instagram-photo-card.tsx`

**Tasks:**
- [ ] Add `onCreateProPhotoshoot?: () => void` prop
- [ ] Add `studioProMode?: boolean` prop
- [ ] Add "Create Pro Photoshoot" button (only in Pro Mode)
- [ ] Position button next to Classic Photoshoot button
- [ ] Use same styling as Classic button (for consistency)
- [ ] No confirmation modal (direct start)

**Implementation:**
```typescript
interface InstagramPhotoCardProps {
  // ... existing props
  onCreateProPhotoshoot?: () => void
  studioProMode?: boolean
}

// In component:
{studioProMode && onCreateProPhotoshoot && (
  <button
    onClick={handleCreateProPhotoshoot}
    className="..." // Same styling as Classic button
  >
    Create Pro Photoshoot
  </button>
)}
```

**Dependencies:** None

**Estimated Time:** 1 hour

---

### 3.2 Add Handler in Concept Card

**File:** `components/sselfie/concept-card.tsx`

**Tasks:**
- [ ] Add `handleCreateProPhotoshoot` function
- [ ] Get avatar images from props (`baseImages` or `selfies`)
- [ ] Get `originalImageId` from generated image
- [ ] Call `/api/maya/pro/photoshoot/start-session`
- [ ] Auto-generate Grid 1
- [ ] Store session state
- [ ] Pass handler to `InstagramPhotoCard`

**Implementation:**
```typescript
const handleCreateProPhotoshoot = async () => {
  // Get avatar images from props
  const avatarImages = baseImages || selfies || []
  
  if (avatarImages.length === 0) {
    setError("Please select avatar images first")
    return
  }
  
  // Get original image ID
  const originalImageId = await getImageIdFromUrl(generatedImageUrl)
  
  // Start session
  const response = await fetch('/api/maya/pro/photoshoot/start-session', {
    method: 'POST',
    body: JSON.stringify({
      originalImageId,
      totalGrids: 8,
      avatarImages: avatarImages.map(img => ({ url: img })),
    })
  })
  
  const { sessionId } = await response.json()
  
  // Generate Grid 1
  await generateGrid(1, avatarImages, customPrompt, sessionId)
  
  // Store session
  setProPhotoshootSession({ sessionId, grids: [] })
}
```

**Dependencies:** Phase 3.1

**Estimated Time:** 2-3 hours

---

## Phase 4: Frontend - Grid Generation UI

### 4.1 Add Pro Photoshoot Panel

**File:** `components/sselfie/pro-photoshoot-panel.tsx` (NEW)

**Tasks:**
- [ ] Create panel component
- [ ] Show 8 grid slots (pending/generating/completed)
- [ ] Display grid previews when complete
- [ ] Add "Generate More Grids" button (max 3 at once)
- [ ] Show progress: "Grid X/8"
- [ ] Show credit cost: "3 credits per grid"
- [ ] Reuse existing Pro Mode UI patterns

**Component Structure:**
```typescript
interface ProPhotoshootPanelProps {
  session: {
    sessionId: number
    grids: Array<{
      gridNumber: number
      status: 'pending' | 'generating' | 'completed' | 'failed'
      gridUrl?: string
    }>
  }
  onGenerateMore: (count: number) => Promise<void>
  maxGrids: number
}

export default function ProPhotoshootPanel({ session, onGenerateMore, maxGrids }: ProPhotoshootPanelProps) {
  // Show 8 grid slots
  // Each slot: status + preview when complete
  // "Generate More Grids" button (max 3)
}
```

**Dependencies:** Phase 3.2

**Estimated Time:** 4-5 hours

---

### 4.2 Add Grid Generation Logic

**File:** `components/sselfie/concept-card.tsx`

**Tasks:**
- [ ] Add `generateGrid` function
- [ ] Add `generateGrids` function (max 3 at once)
- [ ] Poll grid status
- [ ] Update session state as grids complete
- [ ] Handle errors gracefully

**Implementation:**
```typescript
const generateGrid = async (gridNumber: number, avatarImages: string[], prompt: string, sessionId: number) => {
  const response = await fetch('/api/maya/pro/photoshoot/generate-grid', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      gridNumber,
      avatarImages: avatarImages.map(url => ({ url })),
      customPrompt: gridNumber === 1 ? prompt : null, // Only Grid 1 uses custom
    })
  })
  
  const { predictionId, gridId } = await response.json()
  
  // Poll for completion
  await pollGridStatus(gridId, predictionId)
}

const generateGrids = async (count: number) => {
  const gridsToGenerate = Math.min(count, 3) // Max 3 at once
  const nextGridNumber = proPhotoshootSession.grids.length + 1
  
  // Generate in parallel (up to 3)
  const promises = Array.from({ length: gridsToGenerate }, (_, i) =>
    generateGrid(nextGridNumber + i, avatarImages, universalPrompt, sessionId)
  )
  
  await Promise.all(promises)
}
```

**Dependencies:** Phase 4.1

**Estimated Time:** 3-4 hours

---

## Phase 5: Frontend - Carousel Feature

### 5.1 Add Create Carousel Button

**File:** `components/sselfie/pro-photoshoot-panel.tsx`

**Tasks:**
- [ ] Add "Create Carousel" button on each completed grid
- [ ] Button appears when grid status is 'completed'
- [ ] Call carousel creation API
- [ ] Show loading state during creation

**Implementation:**
```typescript
const handleCreateCarousel = async (gridId: number) => {
  setIsCreatingCarousel(true)
  
  try {
    const response = await fetch('/api/maya/pro/photoshoot/create-carousel', {
      method: 'POST',
      body: JSON.stringify({ gridId }),
    })
    
    const { carouselId, frames } = await response.json()
    
    // Start polling for frame completion
    await pollCarouselFrames(carouselId, frames)
    
    // Show carousel card
    setCarouselData({ carouselId, frames })
  } catch (error) {
    setError("Failed to create carousel")
  } finally {
    setIsCreatingCarousel(false)
  }
}
```

**Dependencies:** Phase 2.3, Phase 4.1

**Estimated Time:** 2 hours

---

### 5.2 Add Carousel Polling & Display

**File:** `components/sselfie/concept-card.tsx`

**Tasks:**
- [ ] Add carousel polling logic (similar to Classic Photoshoot)
- [ ] Display `InstagramCarouselCard` when carousel ready
- [ ] Pass frames to carousel component
- [ ] Handle carousel state (loading, ready, error)

**Implementation:**
```typescript
const pollCarouselFrames = async (carouselId: number, frames: string[]) => {
  // Poll each frame until all complete
  // Similar to Classic Photoshoot polling
  // Update carousel state as frames complete
}

// Display carousel
{carouselData && (
  <InstagramCarouselCard
    images={carouselData.frames.map((url, i) => ({
      url,
      id: i,
      action: `Frame ${i + 1}`,
    }))}
    title={concept.title}
    description="Pro Photoshoot Carousel"
    category={concept.category}
    // ... other props
  />
)}
```

**Dependencies:** Phase 5.1

**Estimated Time:** 3-4 hours

---

## Phase 6: Universal Prompt Storage

### 6.1 Add Universal Prompt to Prompts File

**File:** `lib/maya/pro-photoshoot-prompts.ts` (UPDATE)

**Tasks:**
- [ ] Add universal prompt constant
- [ ] Export function to get universal prompt
- [ ] Ensure prompt matches exact text from analysis

**Implementation:**
```typescript
export const UNIVERSAL_PROMPT = `Create a totally new 3x3 photo grid featuring the same model shown in nine distinct photographic compositions, maintaining perfect facial and body consistency. Each frame represents a new unique camera perspective: portrait close-up, mid-shot, full-body product shot, macro texture detail, low-angle dynamic pose, high-angle cinematic perspective, wide-angle lifestyle scene, ultra-wide environmental context, and over-the-shoulder narrative shot. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image.`

export function getUniversalPrompt(): string {
  return UNIVERSAL_PROMPT
}
```

**Dependencies:** None

**Estimated Time:** 30 minutes

---

## Phase 7: Testing & Verification

### 7.1 Unit Tests

**Tasks:**
- [ ] Test context addon function
- [ ] Test universal prompt retrieval
- [ ] Test image limit handling (14 images)
- [ ] Test grid splitting logic
- [ ] Test credit deduction (3 credits per grid)

**Estimated Time:** 2-3 hours

---

### 7.2 Integration Tests

**Tasks:**
- [ ] Test full workflow: Button → Session → Grid 1 → Grid 2-4 → Carousel
- [ ] Test with different avatar image counts (3, 5, 7)
- [ ] Test 14 image limit edge case
- [ ] Test error handling (failed generation, network errors)
- [ ] Test credit deduction and balance updates
- [ ] Test carousel creation and polling

**Estimated Time:** 4-5 hours

---

### 7.3 User Acceptance Testing

**Tasks:**
- [ ] Test in Pro Mode only (Classic Mode should not show button)
- [ ] Test with concept cards (different concepts)
- [ ] Test max 3 grids at once
- [ ] Test generating all 8 grids
- [ ] Test carousel creation from different grids
- [ ] Test credit costs (3 credits per grid)
- [ ] Test 4K resolution output
- [ ] Test style consistency across grids

**Estimated Time:** 2-3 hours

---

## Phase 8: Documentation & Cleanup

### 8.1 Update Documentation

**Tasks:**
- [ ] Update API documentation
- [ ] Add Pro Photoshoot to user guide
- [ ] Document credit costs (3 credits per grid)
- [ ] Document 4K resolution requirement
- [ ] Document carousel feature

**Estimated Time:** 2 hours

---

### 8.2 Code Cleanup

**Tasks:**
- [ ] Remove debug logs
- [ ] Add error handling comments
- [ ] Ensure consistent code style
- [ ] Remove unused imports
- [ ] Add TypeScript types where missing

**Estimated Time:** 2 hours

---

## Implementation Order

### Recommended Sequence:

1. **Phase 1** (Maya Context) - Foundation for prompt creation
2. **Phase 6** (Universal Prompt) - Simple, can be done in parallel
3. **Phase 2** (Backend APIs) - Core functionality
4. **Phase 3** (Frontend Button) - User entry point
5. **Phase 4** (Grid UI) - Main feature
6. **Phase 5** (Carousel) - Optional feature
7. **Phase 7** (Testing) - Quality assurance
8. **Phase 8** (Documentation) - Final polish

---

## Dependencies Map

```
Phase 1.1 (Context Addon)
  └─> Phase 1.2 (Add to System Prompt)
      └─> Phase 2.1 (Generate Grid - Maya prompts)

Phase 2.1 (Generate Grid)
  └─> Phase 2.2 (Start Session)
      └─> Phase 2.3 (Create Carousel)

Phase 3.1 (Button)
  └─> Phase 3.2 (Handler)
      └─> Phase 4.1 (Panel)
          └─> Phase 4.2 (Generation Logic)
              └─> Phase 5.1 (Carousel Button)
                  └─> Phase 5.2 (Carousel Display)

Phase 6 (Universal Prompt) - Independent
Phase 7 (Testing) - After all phases
Phase 8 (Documentation) - After all phases
```

---

## Estimated Total Time

- **Phase 1:** 3-4 hours
- **Phase 2:** 7-9 hours
- **Phase 3:** 3-4 hours
- **Phase 4:** 7-9 hours
- **Phase 5:** 5-6 hours
- **Phase 6:** 30 minutes
- **Phase 7:** 8-11 hours
- **Phase 8:** 4 hours

**Total:** ~38-48 hours (5-6 working days)

---

## Risk Areas

1. **14 Image Limit Handling:** Need to test edge cases thoroughly
2. **Maya Prompt Creation:** May need iteration on context addon
3. **Carousel Polling:** Similar to Classic but need to ensure reliability
4. **Credit Deduction:** Ensure 3 credits per grid is correct
5. **4K Resolution:** Verify Nano Banana Pro supports 4K

---

## Success Criteria

✅ Button appears in Pro Mode only  
✅ Grid 1 uses Maya-created custom prompt  
✅ Grids 2-8 use universal prompt  
✅ All grids use avatar images + previous grids  
✅ 14 image limit handled correctly  
✅ 3 credits deducted per grid  
✅ 4K resolution output  
✅ Max 3 grids at once  
✅ Carousel creation works  
✅ Each card has independent workflow  

---

## Notes

- Reuse existing patterns from Classic Photoshoot where possible
- Keep Pro Photoshoot separate from Classic (different workflows)
- Test with admin feature flag first
- Monitor credit costs carefully (3 credits per grid = expensive)
- Ensure 4K resolution doesn't cause performance issues

