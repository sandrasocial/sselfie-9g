# Blueprint Pro Photoshoot - Implementation Plan

**Goal:** Replace FLUX generation with Pro Photoshoot 3x3 grid using selfie uploads and vibe templates.

---

## Implementation Checklist

### Phase 1: Template Library
- [ ] Create `lib/maya/blueprint-photoshoot-templates.ts`
- [ ] Add placeholder structure for 3 vibes (luxury, minimal, beige)
- [ ] Add `getBlueprintPhotoshootPrompt()` function
- [ ] **WAIT: User will provide exact prompts**

### Phase 2: Upload Module
- [ ] Create `components/blueprint/blueprint-selfie-upload.tsx`
- [ ] Create `app/api/blueprint/upload-selfies/route.ts`
- [ ] Test upload functionality (1-3 images)
- [ ] Test image preview and removal

### Phase 3: Generation Endpoint
- [ ] Create `app/api/blueprint/generate-grid/route.ts`
- [ ] Integrate template library
- [ ] Call `generateWithNanoBanana()` with selfie images
- [ ] Return predictionId for polling

### Phase 4: Status Polling
- [ ] Create `app/api/blueprint/check-grid/route.ts` (or reuse existing)
- [ ] Poll Replicate prediction status
- [ ] Download grid when complete
- [ ] Split grid into 9 frames using Sharp
- [ ] Upload frames to Blob
- [ ] Return gridUrl + frameUrls

### Phase 5: UI Integration
- [ ] Add selfie upload step to `app/blueprint/page.tsx`
- [ ] Add `selfieImages` state
- [ ] Update `BlueprintConceptCard` to use Pro Photoshoot
- [ ] Display 3x3 grid instead of single image
- [ ] Add grid display component

### Phase 6: Testing
- [ ] Test selfie upload (1-3 images)
- [ ] Test grid generation for each vibe
- [ ] Test frame splitting (9 frames)
- [ ] Test grid display
- [ ] Test error handling

---

## File Structure

```
lib/maya/
  blueprint-photoshoot-templates.ts    # NEW - Template library (user provides prompts)

components/blueprint/
  blueprint-selfie-upload.tsx          # NEW - Upload component
  blueprint-concept-card.tsx           # MODIFY - Use Pro Photoshoot

app/api/blueprint/
  upload-selfies/
    route.ts                            # NEW - Upload endpoint
  generate-grid/
    route.ts                            # NEW - Generation endpoint
  check-grid/
    route.ts                            # NEW - Status polling endpoint

app/blueprint/
  page.tsx                              # MODIFY - Add selfie upload step
```

---

## Step-by-Step Implementation

### Step 1: Create Template Library Structure

**File:** `lib/maya/blueprint-photoshoot-templates.ts`

```typescript
/**
 * Blueprint Pro Photoshoot Prompt Templates
 * 
 * User will provide exact prompts for each vibe.
 * Each prompt should be a complete Pro Photoshoot prompt that:
 * - Creates a 3x3 grid (9 frames)
 * - Maintains facial/body consistency
 * - Matches the vibe aesthetic (luxury, minimal, beige)
 * - Includes setting, angles, and color grade
 */

export const BLUEPRINT_PHOTOSHOOT_TEMPLATES = {
  luxury: `[USER WILL PROVIDE EXACT PROMPT]`,
  minimal: `[USER WILL PROVIDE EXACT PROMPT]`,
  beige: `[USER WILL PROVIDE EXACT PROMPT]`
} as const

export type BlueprintVibe = keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES

export function getBlueprintPhotoshootPrompt(vibe: BlueprintVibe): string {
  const prompt = BLUEPRINT_PHOTOSHOOT_TEMPLATES[vibe]
  if (!prompt || prompt === `[USER WILL PROVIDE EXACT PROMPT]`) {
    throw new Error(`Prompt template not provided for vibe: ${vibe}`)
  }
  return prompt
}
```

**Status:** ⏳ **WAITING FOR USER PROMPTS**

---

### Step 2: Create Upload Component

**File:** `components/blueprint/blueprint-selfie-upload.tsx`

**Requirements:**
- Accept 1-3 selfie images
- Upload to Vercel Blob via API
- Show preview of uploaded images
- Allow removal of individual images
- Call `onUploadComplete` callback with array of URLs

**Props:**
```typescript
interface BlueprintSelfieUploadProps {
  onUploadComplete: (imageUrls: string[]) => void
  maxImages?: number  // Default: 3
}
```

**State:**
- `uploadedImages: string[]` - Array of image URLs
- `uploading: boolean` - Upload in progress

**Features:**
- Drag & drop or file picker
- Image preview grid (3 columns)
- Remove button on each image
- Upload progress indicator
- File validation (image format, size)

---

### Step 3: Create Upload Endpoint

**File:** `app/api/blueprint/upload-selfies/route.ts`

**Functionality:**
- Accept FormData with multiple files
- Upload each file to Vercel Blob
- Store in `blueprint-selfies/` folder
- Return array of image URLs

**Validation:**
- Max 3 files
- Image format only (jpg, png, webp)
- Max file size: 10MB per image

**Response:**
```typescript
{
  imageUrls: string[]  // Array of Blob URLs
}
```

---

### Step 4: Create Generation Endpoint

**File:** `app/api/blueprint/generate-grid/route.ts`

**Functionality:**
- Accept: `selfieImages`, `vibe`
- Get prompt from template library
- Call `generateWithNanoBanana()` with:
  - `prompt`: From template
  - `image_input`: selfieImages array
  - `aspect_ratio`: "1:1"
  - `resolution`: "2K" (free tier)
  - `output_format`: "png"
  - `safety_filter_level`: "block_only_high"
- Return predictionId

**Input:**
```typescript
{
  selfieImages: string[],  // 1-3 image URLs
  vibe: "luxury" | "minimal" | "beige"
}
```

**Output:**
```typescript
{
  predictionId: string,
  status: "starting" | "processing"
}
```

**Error Handling:**
- Validate selfieImages (1-3 images required)
- Validate vibe (must be one of the 3 options)
- Handle template not found error
- Handle Nano Banana generation errors

---

### Step 5: Create Status Polling Endpoint

**File:** `app/api/blueprint/check-grid/route.ts`

**Functionality:**
- Poll Replicate prediction status
- When complete:
  1. Download grid image from Replicate
  2. Upload full grid to Vercel Blob: `blueprint-photoshoot/grids/{predictionId}-full.png`
  3. Split grid into 9 frames using Sharp
  4. Upload each frame to Blob: `blueprint-photoshoot/frames/{predictionId}-{frameNumber}.png`
  5. Return gridUrl + frameUrls

**Input:**
```typescript
{
  predictionId: string
}
```

**Output (Processing):**
```typescript
{
  status: "starting" | "processing"
}
```

**Output (Complete):**
```typescript
{
  status: "completed",
  gridUrl: string,        // Full 3x3 grid URL
  frameUrls: string[]     // Array of 9 frame URLs
}
```

**Reuse:** Extract `splitGridIntoFrames()` from `app/api/maya/pro/photoshoot/check-grid/route.ts` to shared module if needed.

---

### Step 6: Update Blueprint Page

**File:** `app/blueprint/page.tsx`

**Changes:**
1. Add state:
   ```typescript
   const [selfieImages, setSelfieImages] = useState<string[]>([])
   ```

2. Add selfie upload step (between step 2 and step 3):
   - Show `BlueprintSelfieUpload` component
   - Call `setSelfieImages` on upload complete
   - Make optional but recommended
   - Show preview of uploaded selfies

3. Pass props to concept cards:
   ```typescript
   <BlueprintConceptCard
     concept={concept}
     index={idx}
     selfieImages={selfieImages}
     selectedFeedStyle={selectedFeedStyle}
     onImageGenerated={...}
   />
   ```

---

### Step 7: Update Concept Card

**File:** `components/blueprint/blueprint-concept-card.tsx`

**Changes:**
1. Add props:
   ```typescript
   interface BlueprintConceptCardProps {
     concept: {...}
     index: number
     selfieImages?: string[]        // NEW
     selectedFeedStyle?: string     // NEW
     onImageGenerated?: (imageUrl: string) => void
   }
   ```

2. Replace FLUX generation with Pro Photoshoot:
   ```typescript
   const handleGenerate = async () => {
     // Check selfies uploaded
     if (!selfieImages || selfieImages.length === 0) {
       setError("Please upload 1-3 selfies first")
       return
     }
     
     // Check vibe selected
     if (!selectedFeedStyle) {
       setError("Please select a vibe first")
       return
     }
     
     // Generate grid
     const response = await fetch("/api/blueprint/generate-grid", {
       method: "POST",
       body: JSON.stringify({
         selfieImages,
         vibe: selectedFeedStyle
       })
     })
     
     // Poll status
     pollGridStatus(data.predictionId)
   }
   ```

3. Update polling:
   ```typescript
   const pollGridStatus = async (predictionId: string) => {
     const response = await fetch("/api/blueprint/check-grid", {
       method: "POST",
       body: JSON.stringify({ predictionId })
     })
     
     const data = await response.json()
     
     if (data.status === "completed") {
       // Display 3x3 grid
       setGridUrl(data.gridUrl)
       setFrameUrls(data.frameUrls)
     }
   }
   ```

4. Update display:
   - Show 3x3 grid preview instead of single image
   - Click to expand full grid
   - Show loading state during generation

---

### Step 8: Create Grid Display Component (Optional)

**File:** `components/blueprint/blueprint-photoshoot-grid.tsx`

**Purpose:** Display 3x3 grid in Instagram-style layout

**Props:**
```typescript
interface BlueprintPhotoshootGridProps {
  gridUrl?: string,        // Full grid image
  frameUrls?: string[],    // Array of 9 frame URLs
  isLoading?: boolean
}
```

**Features:**
- 3x3 grid layout
- Click to expand full grid
- Individual frame previews
- Loading skeleton

---

## Dependencies

**Existing (No Changes Needed):**
- `lib/nano-banana-client.ts` - Already exists
- `lib/replicate-client.ts` - Already exists
- `@vercel/blob` - Already installed
- `sharp` - Already installed (used in Pro Photoshoot)

**New Imports Needed:**
- `lib/maya/blueprint-photoshoot-templates.ts` - Template library

---

## Error Handling

### Upload Errors
- File too large → Show error, allow retry
- Invalid format → Show error, allow retry
- Upload failed → Show error, allow retry

### Generation Errors
- No selfies uploaded → Show message, redirect to upload
- No vibe selected → Show message, redirect to selection
- Template not found → Show error, log issue
- Generation failed → Show error, allow retry
- Timeout → Show timeout message, allow retry

### Polling Errors
- Prediction not found → Show error
- Status check failed → Continue polling (retry)
- Frame splitting failed → Show error, log issue

---

## Testing Checklist

### Upload Module
- [ ] Upload 1 selfie
- [ ] Upload 2 selfies
- [ ] Upload 3 selfies
- [ ] Upload 4 selfies (should limit to 3)
- [ ] Remove uploaded selfie
- [ ] Upload invalid format (should reject)
- [ ] Upload file too large (should reject)

### Generation
- [ ] Generate with luxury vibe
- [ ] Generate with minimal vibe
- [ ] Generate with beige vibe
- [ ] Generate without selfies (should error)
- [ ] Generate without vibe (should error)
- [ ] Handle generation timeout
- [ ] Handle generation failure

### Grid Display
- [ ] Display 3x3 grid correctly
- [ ] All 9 frames visible
- [ ] Click to expand full grid
- [ ] Loading state shows correctly
- [ ] Error state shows correctly

---

## Implementation Order

1. **Template Library** (waiting for user prompts)
2. **Upload Module** (can build in parallel)
3. **Generation Endpoint** (needs template library)
4. **Status Polling** (can build in parallel)
5. **UI Integration** (needs all above)

---

## Notes

- **Free Tier:** Using 2K resolution (cheaper, faster)
- **No Credits:** Skip credit check for Blueprint (free tier)
- **Single Grid:** No session management needed
- **No Carousel:** Just display grid directly
- **Template Prompts:** User will provide exact prompts for each vibe

---

**Ready for implementation once user provides prompt templates.**
