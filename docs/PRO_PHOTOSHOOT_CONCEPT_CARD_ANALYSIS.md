# Pro Photoshoot Workflow - Analysis (FINAL CORRECTED VERSION)

**Date:** January 2025  
**Status:** 📋 Analysis Only (No Implementation)

---

## ✅ CORRECT WORKFLOW

Pro Photoshoot is **concept card-driven**, similar to Classic Photoshoot, but with different workflow:

1. **User generates image from concept card** (existing flow)
2. **"Create Pro Photoshoot" button appears** in Instagram preview (after generation)
3. **Uses same avatar images** already selected in concept card (from image upload modal)
4. **Each concept card has its own photoshoot workflow** (independent sessions)
5. **Max 3 grids at once** (same as concept cards generation pattern)
6. **Previous grids ARE REQUIRED** (not optional) for style/outfit/colorgrade consistency
7. **Max 14 images limit** - if reached, exclude oldest grids (keep newest)
8. **Users can create as many grids as they want** (max 8 per card, but not required)

---

## Correct Workflow Understanding

### How Pro Photoshoot Should Work

**Entry Point:**
- **Concept card** → Generate image → Instagram preview → **"Create Pro Photoshoot" button**
- **Same location as Classic Photoshoot** (for consistency)
- **Only in Pro Mode** (`studioProMode={true}`)

**Image Selection:**
- **Uses same avatar images** already selected in concept card
- **From image upload modal** (same logic as concept cards Pro)
- **No need to re-select** - uses existing selection

**Generation Pattern:**
- **Max 3 grids at once** (like concept cards)
- **Each grid in different style/location/colorgrade**
- **User can generate more grids** (up to 8 total per card)
- **Each card has independent workflow** (separate sessions)

**Prompt Structure:**
- **Grid 1 (Step 1):** Base prompt - Maya creates custom prompt with outfit/location/colorgrade (from concept card context)
- **Grids 2-8 (Step 2):** Universal prompt - Same prompt for all subsequent grids (angle variety, maintaining style consistency)
- **Optional Step 3:** Cropping/Carousel - Create carousel from any grid (9 frames = 9 slides)

**Generation Flow:**
1. User clicks "Create Pro Photoshoot" → Creates session
2. Generates Grid 1 (with custom styling from concept)
3. User can generate more grids (up to 3 at once, max 8 total)
4. Each new grid uses: avatar images + ALL previous grids (for style consistency)
5. If 14 images reached → exclude oldest grids (keep newest)

---

## Current State Analysis

### Concept Card Image Selection

**Location:** `components/sselfie/concept-card.tsx`

**How it works:**
- Concept cards receive image props: `baseImages`, `selfies`, `products`, `styleRefs`
- Images come from **image upload modal** (user selects before generating)
- In Pro Mode, users select images via `ImageUploadFlow` component
- Selected images are passed to concept card as props
- Same images are used for concept generation

**Image Selection Flow:**
1. User opens concept card
2. User clicks "Upload Images" or selects from gallery
3. `ImageUploadFlow` modal opens
4. User selects images (selfies, products, style refs)
5. Images stored in state: `uploadedImages`
6. Images passed to concept card as props
7. Concept card uses these images for generation

**For Pro Photoshoot:**
- **Use same images** already selected in concept card
- **No need to re-select** - reuse existing selection
- **Same styling/logic** as concept cards Pro

### Instagram Photo Card

**Location:** `components/sselfie/instagram-photo-card.tsx`

**Current Classic Photoshoot Button:**
- Appears after image is generated
- Button: "Create Photoshoot in This Style"
- Calls `onCreatePhotoshoot` prop
- Shows confirmation modal

**For Pro Photoshoot:**
- **Add "Create Pro Photoshoot" button** in same location
- **Only show in Pro Mode** (`studioProMode={true}`)
- **Same styling** as Classic button (for consistency)
- **No confirmation modal** (direct start, like concept cards)

---

## Data Available from Concept Card

### Concept Object Structure

From `components/sselfie/types.ts` and concept-card usage:

```typescript
interface ConceptData {
  title: string           // e.g., "Casual Street Style"
  description: string    // e.g., "Relaxed urban outfit with..."
  category: string       // e.g., "lifestyle", "street-style"
  prompt?: string        // Full Maya-generated prompt (Pro Mode)
  referenceImageUrl?: string  // Reference image if provided
}
```

### Context Extraction Strategy

**What Maya needs to extract from concept card:**

1. **Outfit/Style Information:**
   - Source: `concept.title` + `concept.description` + `concept.prompt`
   - Example: "Casual Street Style" + "Relaxed urban outfit with oversized blazer..."
   - Can parse outfit details from the prompt text

2. **Location/Setting:**
   - Source: `concept.description` or `concept.prompt`
   - Example: "walking through SoHo", "cozy home setting"

3. **Color Grade/Aesthetic:**
   - Source: `concept.description` or `concept.category`
   - Example: "muted tones", "warm lighting", "dark moody"

4. **Original Image:**
   - Source: `generatedImageUrl` (the generated concept image)
   - This becomes the `originalImageId` for Pro Photoshoot session

---

## Correct User Experience Workflow

### Step-by-Step Flow

1. **User Generates Image from Concept Card** (existing flow)
   - User selects images via upload modal (avatar images)
   - User clicks "Generate" on concept card
   - Image appears in Instagram preview

2. **"Create Pro Photoshoot" Button Appears**
   - Button appears in `InstagramPhotoCard` (after image generated)
   - **Same location as Classic Photoshoot** (for consistency)
   - **Only visible in Pro Mode** (`studioProMode={true}`)
   - Button: "Create Pro Photoshoot" or "8-Grid Photoshoot"

3. **User Clicks Button** (starts workflow)
   - No confirmation modal (direct start)
   - Creates Pro Photoshoot session
   - Uses **same avatar images** from concept card (no re-selection needed)

---

## STEP 1: Base Prompt (Grid 1)

4. **Grid 1 Generation** (automatic)
   - Backend: Uses avatar images from concept card
   - Backend: Maya creates custom prompt (outfit/location/colorgrade from concept)
   - Backend: Generates 3x3 grid with Nano Banana Pro (4K resolution)
   - Preview appears in concept card (or separate panel)
   - **Credit cost:** 3 credits (4K resolution)

**Base Prompt Structure:**
- Maya creates custom prompt using Pro Photoshoot context addon
- Includes outfit, location, color grade from concept card
- Uses template with 9 distinct angles
- Always includes base requirements (grid layout, consistency, etc.)

---

## STEP 2: Universal Prompt (Grids 2-8)

5. **User Can Generate More Grids** (up to 3 at once)
   - Button: "Generate More Grids" (max 3 at once)
   - User can generate Grids 2-4, then 5-7, then 8
   - **If user wants more grids in base grid style:** Repeat Step 2 prompt

6. **Subsequent Grids** (REQUIRED: include previous grids)
   - Backend: Uses avatar images (ALWAYS)
   - Backend: **Includes ALL previous grids** as reference (for style consistency)
   - Backend: Uses **universal prompt** (angle variety)
   - **If 14 images reached:** Exclude oldest grids (keep newest)
   - **Credit cost:** 3 credits per grid (4K resolution)

**Universal Prompt (for Grids 2-8):**
```
Create a totally new 3x3 photo grid featuring the same model shown in nine distinct photographic compositions, maintaining perfect facial and body consistency. Each frame represents a new unique camera perspective: portrait close-up, mid-shot, full-body product shot, macro texture detail, low-angle dynamic pose, high-angle cinematic perspective, wide-angle lifestyle scene, ultra-wide environmental context, and over-the-shoulder narrative shot. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image.
```

**Note:** If user wants more grids in the base grid style (same outfit/location/colorgrade), repeat Step 2 prompt for additional grids.

---

## STEP 3: Cropping/Carousel (Optional)

7. **Create Carousel from Grid** (optional feature)
   - Button appears on each generated grid: **"Create Carousel"**
   - User clicks button → Starts carousel creation process
   - **Same logic as Classic Photoshoot carousel:**
     - Polling starts automatically
     - Adds all 9 frames from grid to carousel preview card
     - Each frame becomes one slide in the carousel
   - **Preview:** Carousel card with one image per slide
   - User can swipe through slides (like Instagram carousel)
   - **Component:** Reuse `InstagramCarouselCard` (same as Classic Photoshoot)

**Carousel Flow:**
1. User clicks "Create Carousel" on a grid
2. Backend: Splits grid into 9 individual frames (if not already split)
3. Backend: Saves frames to `ai_images` table
4. Frontend: Polling starts (checks frame generation status)
5. Frontend: As frames complete, adds to carousel preview card
6. Frontend: Shows `InstagramCarouselCard` with all 9 slides
7. User can swipe through slides, view full size, save, etc.

**Carousel Features:**
- Swipe navigation (left/right)
- Slide indicators (dots showing current slide)
- Full-screen view
- Save to gallery
- Delete carousel
- Same UI/UX as Classic Photoshoot carousel

---

## Additional Workflow Details

8. **Image Limit Handling** (max 14 images)
   - Avatar images: ~3-5 images
   - Previous grids: Up to 8 grids (1 image each)
   - **Total possible:** 3-5 avatars + 8 grids = 11-13 images ✅
   - **If exceeds 14:** Remove oldest grids, keep newest

9. **Completion** (flexible)
   - User can stop at any point (doesn't need all 8 grids)
   - Each grid: 9 frames = 72 frames total (if all 8 grids)
   - Frames auto-saved to gallery
   - Show progress: "Grid X/8" or "X frames created"
   - Each grid can optionally become a carousel

---

## Image Input Strategy (CRITICAL)

### ✅ CORRECT Approach

**Grid 1 Generation:**
```typescript
// Use avatar images from concept card (already selected)
const avatarImages = conceptCardProps.baseImages || conceptCardProps.selfies
// OR: Get from concept card state (same images used for concept generation)

// ALWAYS use avatar images for facial consistency
const imageInput = avatarImages.map(img => img.url || img)

// Generate Grid 1 with custom prompt
await generateWithNanoBanana({
  prompt: customPrompt, // Outfit/location/colorgrade from concept
  image_input: imageInput, // ✅ Avatar images
  aspect_ratio: '1:1',
  resolution: '4K', // ✅ 4K resolution (3 credits per grid)
})
```

**Grid 2+ Generation (REQUIRED: include previous grids):**
```typescript
// ALWAYS use avatar images (from concept card)
const avatarImages = conceptCardProps.baseImages || conceptCardProps.selfies
const imageInput = avatarImages.map(img => img.url || img)

// ✅ REQUIRED: Add ALL previous grids (for style consistency)
const previousGrids = await getPreviousGrids(sessionId) // Get all completed grids
previousGrids.forEach(grid => {
  imageInput.push(grid.gridUrl) // Add each previous grid
})

// ✅ Handle 14 image limit: If exceeds, remove oldest grids
if (imageInput.length > 14) {
  // Keep: avatar images (first 3-5) + newest grids
  const avatarCount = avatarImages.length
  const maxGrids = 14 - avatarCount
  const newestGrids = previousGrids.slice(-maxGrids) // Keep newest
  
  imageInput = [
    ...avatarImages.map(img => img.url || img), // Avatar images first
    ...newestGrids.map(grid => grid.gridUrl) // Newest grids only
  ]
}

// Generate with universal prompt
await generateWithNanoBanana({
  prompt: universalPrompt, // Angle variety
  image_input: imageInput, // ✅ Avatar images + previous grids
  aspect_ratio: '1:1',
  resolution: '4K', // ✅ 4K resolution (3 credits per grid)
})
```

**Why This Works:**
- **Avatar images (first 3-5):** Primary reference for facial features, skin tone, hair, body type
- **Previous grids (REQUIRED):** Style reference (outfit, location, color grade consistency)
- **Nano Banana Pro behavior:** First 3-5 images = identity, additional images = style
- **Result:** Perfect facial consistency + style consistency across all grids

### Image Limit Handling

**Max 14 Images in Nano Banana Pro:**
- Avatar images: 3-5 images (always included)
- Previous grids: Up to 8 grids (1 image each)
- **Total possible:** 3-5 + 8 = 11-13 images ✅ (within limit)

**If Exceeds 14 (edge case):**
- Keep: All avatar images (3-5)
- Keep: Newest grids (up to 14 - avatarCount)
- Remove: Oldest grids (exclude from end)

**Example:**
```typescript
// Avatar images: 5
// Previous grids: 10 (Grids 1-10, but we only allow 8 max)
// Total: 15 images (exceeds 14)

// Solution: Keep 5 avatars + 9 newest grids = 14 images
imageInput = [
  ...avatarImages,      // 5 images
  ...previousGrids.slice(-9) // 9 newest grids
]
```

---

## Maya's Context Extraction

### What Maya Needs to Know

**From Conversation:**
- Outfit preferences: "black leather jacket", "casual street style", "elegant evening wear"
- Location: "SoHo", "cozy home", "urban rooftop", "beach"
- Color grade: "warm golden tones", "muted desaturated", "dark moody"
- Style: "editorial", "lifestyle", "fashion", "minimalist"

**Maya's Prompt Creation:**
- Maya uses her fashion expertise (Claude AI)
- Maya creates natural language prompt (not keyword soup)
- Maya fills in outfit/location/colorGrade in Grid 1 template
- Maya ensures consistency across all 9 angles

**Example Maya Response:**
```
I'll create a Pro Photoshoot with:
- Outfit: Black leather jacket, white t-shirt, dark jeans, black boots
- Location: Urban rooftop at golden hour
- Color Grade: Warm golden tones with soft shadows

Generating Grid 1...
```

**Then Maya calls tool:**
```typescript
{
  type: "tool-generateProPhotoshootGrid",
  gridNumber: 1,
  customPrompt: "Create a 3x3 photo grid... Outfit: Black leather jacket... Location: Urban rooftop...",
  originalImageId: null // No original image needed - uses avatars
}
```

---

## Technical Implementation Points

### 1. Button in Instagram Photo Card

**File:** `components/sselfie/instagram-photo-card.tsx`

**Add Pro Photoshoot button:**
```typescript
// After Classic Photoshoot button (line 305-324)
{onCreatePhotoshoot && (
  <button onClick={handleCreatePhotoshoot}>
    Create Photoshoot in This Style
  </button>
)}

// Add Pro Photoshoot button (only in Pro Mode)
{studioProMode && onCreateProPhotoshoot && (
  <button onClick={handleCreateProPhotoshoot}>
    Create Pro Photoshoot
  </button>
)}
```

**Props needed:**
- `onCreateProPhotoshoot?: () => void` - Handler from concept card
- `studioProMode?: boolean` - Pro Mode flag

### 2. Concept Card Integration

**File:** `components/sselfie/concept-card.tsx`

**Add Pro Photoshoot handler:**
```typescript
const handleCreateProPhotoshoot = async () => {
  // Get avatar images from props (already selected)
  const avatarImages = baseImages || selfies || []
  
  // Get original image ID (from generated image)
  const originalImageId = await getImageIdFromUrl(generatedImageUrl)
  
  // Start session
  const response = await fetch('/api/maya/pro/photoshoot/start-session', {
    method: 'POST',
    body: JSON.stringify({
      originalImageId,
      totalGrids: 8,
      avatarImages, // Pass selected images
    })
  })
  
  // Generate Grid 1 (automatic)
  await generateGrid(1, avatarImages, customPrompt)
  
  // Show progress UI
  setProPhotoshootSession({ sessionId, grids: [...] })
}
```

### 3. Backend API Route Updates

**File:** `app/api/maya/pro/photoshoot/generate-grid/route.ts`

**Key changes:**
```typescript
// ✅ Use avatar images from request (concept card selection)
const { avatarImages, gridNumber, sessionId } = await request.json()

// ✅ Get ALL previous grids (REQUIRED for style consistency)
const previousGrids = await sql`
  SELECT grid_image_url, grid_number
  FROM pro_photoshoot_grids
  WHERE session_id = ${sessionId}
    AND generation_status = 'completed'
  ORDER BY grid_number ASC
`

// ✅ Build image input: avatars + previous grids
let imageInput = avatarImages.map(img => img.url || img)

// ✅ REQUIRED: Add ALL previous grids
previousGrids.forEach(grid => {
  imageInput.push(grid.grid_image_url)
})

// ✅ Handle 14 image limit
if (imageInput.length > 14) {
  const avatarCount = avatarImages.length
  const maxGrids = 14 - avatarCount
  const newestGrids = previousGrids.slice(-maxGrids)
  
  imageInput = [
    ...avatarImages.map(img => img.url || img),
    ...newestGrids.map(grid => grid.grid_image_url)
  ]
}

// ✅ Generate with correct prompt
const prompt = gridNumber === 1 
  ? customPrompt // From concept
  : universalPrompt // From prompts file

await generateWithNanoBanana({
  prompt,
  image_input: imageInput, // ✅ Avatar images + previous grids
  aspect_ratio: '1:1',
  resolution: '4K', // ✅ 4K resolution (3 credits per grid)
})
```

### 4. Progress UI in Concept Card

**File:** `components/sselfie/concept-card.tsx`

**Add Pro Photoshoot panel:**
```typescript
const [proPhotoshootSession, setProPhotoshootSession] = useState<{
  sessionId: number | null
  grids: Array<{ gridNumber: number; status: string; gridUrl?: string }>
} | null>(null)

// Show panel after Grid 1 generated
{proPhotoshootSession && (
  <ProPhotoshootPanel
    session={proPhotoshootSession}
    onGenerateMore={(count) => generateGrids(count)} // Max 3 at once
    maxGrids={8}
  />
)}
```

### 5. Generation Pattern (Max 3 at Once)

**File:** `components/sselfie/concept-card.tsx`

**Generate multiple grids:**
```typescript
const generateGrids = async (count: number) => {
  // Max 3 at once
  const gridsToGenerate = Math.min(count, 3)
  const nextGridNumber = proPhotoshootSession.grids.length + 1
  
  // Generate in parallel (up to 3)
  const promises = Array.from({ length: gridsToGenerate }, (_, i) =>
    generateGrid(nextGridNumber + i, avatarImages, universalPrompt)
  )
  
  await Promise.all(promises)
}
```

---

## Comparison: Classic vs Pro Photoshoot

| Aspect | Classic Photoshoot | Pro Photoshoot |
|--------|-------------------|----------------|
| **Entry Point** | Concept card button (after image generated) | Concept card button (after image generated) |
| **Trigger** | User clicks "Create Photoshoot in This Style" | User clicks "Create Pro Photoshoot" (Pro Mode only) |
| **Confirmation** | Yes (modal: "Create Carousel?") | No (direct start, like concept cards) |
| **Prompt Source** | Exact prompt from concept generation | Concept card context (outfit/location/colorGrade from concept) |
| **API Endpoint** | `/api/maya/create-photoshoot` | `/api/maya/pro/photoshoot/start-session` + `generate-grid` |
| **Output** | 6-9 single images | 8 grids (3x3 each) = 72 frames |
| **Generation** | Flux LoRA (Classic Mode) | NanoBanana Pro (4K resolution) |
| **Image Input** | Hero image (concept image) | Avatar images (ALWAYS) + ALL previous grids (style consistency) |
| **Context Source** | `heroPrompt`, `heroImageUrl`, `heroSeed` | Concept card context (outfit/location/colorGrade from concept) |
| **Resolution** | Standard (varies) | **4K** (3 credits per grid) |
| **Credit Cost** | Per image (varies) | **3 credits per grid** (24 credits for all 8 grids) |
| **Progress UI** | 2x2 or 3x3 grid of single images in concept card | Grid previews in concept card, "Generate More Grids" button |
| **Final Display** | `InstagramCarouselCard` in concept card | Grid previews in concept card + individual frames in gallery |

---

## Key Differences in Workflow

### Classic Photoshoot
1. **Trigger:** Concept card button (after image generated)
2. **Uses:** Hero image (the generated concept image)
3. **Uses:** Hero prompt (the exact prompt used to generate the image)
4. **Uses:** Hero seed (for consistency)
5. **Maya generates:** Pose variations (6-9 different poses)
6. **Output:** Each image is a **single photo** (not a grid)
7. **Display:** Carousel card in concept card

### Pro Photoshoot
1. **Trigger:** Concept card button (after image generated, Pro Mode only)
2. **Uses:** Avatar images from concept card (already selected, no re-selection)
3. **Uses:** Custom prompt for Grid 1 (outfit/location/colorGrade from concept), universal prompts for Grids 2-8
4. **Uses:** ALL previous grids as reference (REQUIRED for style consistency)
5. **Output:** Each grid is **3x3 = 9 frames** (not single images)
6. **Total:** **72 frames** (8 grids × 9 frames, if all generated)
7. **Resolution:** **4K** (higher quality than 2K)
8. **Credit Cost:** **3 credits per grid** (24 credits for all 8 grids)
9. **Display:** Grid previews in concept card, frames in gallery
10. **Interactive:** User can generate up to 3 grids at once (max 8 total per card)

---

## Maya's System Prompt Context for Pro Photoshoot

### Feature Flag / Context Addon Pattern

**Similar to Feed Planner:**
- Feed Planner uses `getFeedPlannerContextAddon()` to add extra context to Maya's system prompt
- Pro Photoshoot should use `getProPhotoshootContextAddon()` for the same pattern
- Add context when user is creating Pro Photoshoot grids (detect via feature flag or request type)

**Implementation Pattern:**
```typescript
// In app/api/maya/chat/route.ts or generate-grid route
if (isProPhotoshootRequest) {
  const { getProPhotoshootContextAddon } = await import("@/lib/maya/pro-photoshoot-context")
  systemPrompt = getProPhotoshootContextAddon() + unifiedSystemPrompt
}
```

**Feature Flag:**
- Check if request is for Pro Photoshoot grid generation
- Add context addon to system prompt (separate from main system prompt)
- Keep Pro Photoshoot instructions isolated (like feed planner)

---

## Pro Photoshoot Context Addon Instructions

### Base Instructions for Maya

**When user requests Pro Photoshoot grid creation, Maya should:**

1. **Create prompts for Nano Banana Pro** to create 9 new angles of the reference image framed into a 3x3 grid
2. **Take into account** the details provided by the user concerning the type of new shots they want
3. **Do not say "please"** - output only the full ready-to-use prompt for Nano Banana Pro
4. **Always include** these base requirements in every prompt:
   - "The grid layout is clean and symmetrical with subtle separation lines"
   - "Each photo is realistically lit and color-graded for a cohesive visual set"
   - "The model's identity, outfit, and environment remain consistent across all shots"
   - "Emphasizing photographic diversity and visual storytelling coherence"
   - "High-resolution, photorealistic style"
   - "The angle must be different from the reference image"
   - "Maintain a strict perfect facial and body consistency"

### Base Prompt Template (Grid 1)

**For concept cards Pro - Grid 1:**
```
Create a prompt for Nano Banana Pro to create 9 new angles of the reference image framed into a 3x3 grid. Take into account the details provided by the user concerning the type of new shots She/he wants. Output only the full ready-to-use prompt for Nano Banana Pro for concept cards pro.
```

**Full Template Structure:**
```
Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: [SPECIFIC LOCATION/VENUE NAME], [OUTFIT DESCRIPTION], [LIGHTING/TIME OF DAY].

Angles include:
- Close-up portrait [WITH WHAT BACKGROUND/DETAIL]
- Full body [DOING WHAT/WHERE IN SPACE]
- Side profile [DOING WHAT ACTION]
- Over-shoulder [VIEWING WHAT]
- Waist-up/mid-shot [WITH WHAT PROP/POSITION]
- Environmental portrait [SHOWING WHAT CONTEXT]
- Candid moment [DOING WHAT ACTION]
- Dynamic movement [WHAT TYPE OF MOVEMENT]
- Elevated perspective [FROM WHERE/SHOWING WHAT]

Color grade: [DESCRIBE COLOR TONE/MOOD], [AESTHETIC DESCRIPTION].
```

### Pro Tips for Best Results

**For best results:**
- Start with high-quality base image (good lighting, clear subject)
- Keep environments thematically related (all travel, all urban, etc.)
- Maintain consistent time of day across variations
- Use specific location names for better AI understanding
- Color-grade final outputs for maximum cohesion

**Environment themes that work well:**
- Luxury travel destinations
- Urban city diversity (Tokyo, NYC, Paris, Dubai)
- Nature contrasts (beach, mountain, desert, jungle)
- Seasonal variations (winter, summer, fall, spring same location)
- Time-of-day progression (dawn, noon, golden hour, night)

### Example Prompts

**Example 1: Casual Street Style**
```
Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Melrose Avenue sidewalk cafe, Los Angeles, black cropped baby tee with high-waisted black bike shorts, oversized beige shacket unbuttoned, white Puma Speedcat sneakers, gold hoop earrings, bright California morning sun.

Angles include:
- Close-up portrait holding iced coffee against pastel wall
- Full body walking on palm tree-lined sidewalk
- Side profile sitting on outdoor cafe chair
- Over-shoulder browsing phone at table
- Mid-shot adjusting sunglasses on head
- Environmental portrait with LA street backdrop
- Candid sipping coffee with natural smile
- Walking casually toward camera on sidewalk
- Elevated outdoor seating area view from above

Color grade: Warm sun-kissed aesthetic with peachy skin tones, soft beige and cream neutrals, bright white highlights, clean fresh L.A. influencer style with natural brightness and airy feel.
```

**Example 2: Luxury Editorial**
```
Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Luxury Manhattan penthouse with dark marble floors, long black cashmere coat over black turtleneck bodysuit with high-waisted tailored black trousers, black pointed-toe heels, oversized sunglasses, gold statement jewelry, moody evening interior lighting with dramatic shadows.

Angles include:
- Close-up portrait with dramatic side lighting
- Full body walking through marble hallway
- Side profile adjusting sunglasses by window
- Over-shoulder gazing at city skyline
- Waist-up leaning against dark wall
- Environmental portrait with luxe interior backdrop
- Candid confident expression with cigarette aesthetic
- Dynamic walking shot in dramatic lighting
- Elevated staircase perspective looking down

Color grade: Dark and moody cinematic aesthetic with deep blacks, rich charcoal grays, dramatic high-contrast shadows, mysterious low-key lighting, desaturated with selective warm skin tones, luxury noir Instagram vibe with bold dramatic presence.
```

**Example 3: Brand Boutique**
```
Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: CHANEL boutique on Rodeo Drive, Beverly Hills, cropped black blazer with golden CHANEL buttons over beige headband with interlaced CC logo, high-waisted pants and needle heels, quilted black leather CHANEL bag, oversized cat-eye sunglasses, straight sleek hair behind ears with visible pearl earrings, iced latte in hand, natural California sunlight.

Angles include:
- Close-up portrait with sideways glance over sunglasses
- Full body walking confidently past boutique facade
- Side profile mid-stride with natural movement
- Over-shoulder viewing Rodeo Drive street scene
- Waist-up holding CHANEL bag and iced latte
- Environmental portrait with boutique signage elegantly blurred
- Candid spontaneous half-smile moment
- Dynamic walking captured with clean defined shadows
- Elevated boutique upper floor perspective looking down

Color grade: Contemporary luxury lifestyle aesthetic with clean California light, defined shadows on body, preserved skin texture with visible pores, realistic fabric details, natural iPhone-style spontaneity, confident urban attitude without staged appearance.
```

### Maya's Context Extraction

**Maya extracts from concept card:**
- Outfit details from concept title/description
- Location from concept description or prompt
- Color grade from concept category or aesthetic
- Style preferences from user's brand profile

**Maya creates:**
- **Outfit description:** Specific pieces, colors, accessories (from concept)
- **Location description:** Exact location with environmental details (from concept)
- **Color grade:** Lighting mood, color palette, aesthetic feel (from concept)
- **9 distinct angles:** Based on template, customized to setting

---

## UI/UX Considerations

### Button Design

**Option 1: Replace Classic Button**
- In Pro Mode: Show "Create Pro Photoshoot" instead of "Create Photoshoot"
- Simpler, one button per mode

**Option 2: Show Both Buttons**
- Classic: "Create Photoshoot" (6-9 images)
- Pro: "Create Pro Photoshoot" (72 frames)
- More choice, but might be confusing

**Option 3: Conditional Button**
- Pro Mode: "Create Pro Photoshoot"
- Classic Mode: "Create Photoshoot"
- Same location, different behavior

**Recommendation:** Option 1 or 3 (one button, mode-aware)

### Progress Display

**During Generation:**
- Show 8 grid slots (like admin panel)
- Each slot: pending → generating → completed
- When grid completes: Show 3x3 grid preview thumbnail
- Click to expand: View full grid or individual frames

**After Completion:**
- Show summary: "72 frames created!"
- Link to gallery: "View in Gallery"
- Option to download all frames

---

## Implementation Checklist (When Ready)

### Frontend Changes

- [ ] Add "Create Pro Photoshoot" button to `InstagramPhotoCard` (Pro Mode only)
- [ ] Add `onCreateProPhotoshoot` prop to `InstagramPhotoCard`
- [ ] Add Pro Photoshoot handler in `ConceptCard` component
- [ ] Add Pro Photoshoot panel/progress UI in concept card
- [ ] Add "Generate More Grids" button (max 3 at once)
- [ ] Reuse avatar images from concept card (no re-selection)
- [ ] Add "Create Carousel" button on each generated grid (Step 3 - optional)
- [ ] Implement carousel creation flow (polling, frame splitting, carousel preview)
- [ ] Reuse `InstagramCarouselCard` component (same as Classic Photoshoot)

### Backend Changes

- [ ] Create `lib/maya/pro-photoshoot-context.ts` with `getProPhotoshootContextAddon()` function
- [ ] Add feature flag/request detection for Pro Photoshoot context (similar to feed planner)
- [ ] Add context addon to Maya's system prompt when generating Pro Photoshoot grids
- [ ] Update `generate-grid` route to accept avatar images from request
- [ ] **REQUIRED:** Include ALL previous grids in `image_input` (not optional)
- [ ] Add 14 image limit handling (exclude oldest grids if exceeded)
- [ ] Extract outfit/location/colorgrade from concept card context
- [ ] Ensure proper credit handling: **3 credits per grid** (4K resolution)
- [ ] Deduct credits before generation (admin bypass for testing)

### Image Strategy (CRITICAL)

- [ ] Verify avatar images come from concept card props (already selected)
- [ ] Verify avatar images are ALWAYS first in `image_input` array
- [ ] **REQUIRED:** Verify ALL previous grids are included (for style consistency)
- [ ] Add 14 image limit logic (keep avatars + newest grids)
- [ ] Test style consistency across all grids

### Generation Pattern

- [ ] Implement max 3 grids at once (like concept cards)
- [ ] Allow user to generate more grids (up to 8 total)
- [ ] Each card has independent workflow (separate sessions)
- [ ] Show progress: "Grid X/8" or "X frames created"
- [ ] Store universal prompt in prompts file for Grids 2-8

### Carousel Feature (Step 3 - Optional)

- [ ] Add "Create Carousel" button on each generated grid
- [ ] Implement carousel creation API endpoint (split grid into 9 frames)
- [ ] Add polling logic (same as Classic Photoshoot)
- [ ] Save frames to `ai_images` table
- [ ] Display `InstagramCarouselCard` with 9 slides
- [ ] Reuse existing carousel component and logic

---

## Questions to Resolve

1. **Maya Tool Integration:**
   - Should Maya auto-generate Grid 1 when user requests photoshoot?
   - Or should Maya ask for outfit/location preferences first?

2. **Grid Generation Flow:**
   - Auto-generate Grid 1, then user clicks for Grids 2-8?
   - Or user clicks for each grid (including Grid 1)?

3. **Previous Grid as Reference:**
   - Should previous grid be added to `image_input` for Grids 2-8?
   - Or rely only on avatar images + prompts for variety?

4. **Credit Handling:**
   - **3 credits per grid** (because 4K resolution)
   - Charge per grid: 8 grids × 3 credits = 24 credits (if all 8 grids)
   - Users can generate fewer grids (flexible)

5. **Session Persistence:**
   - Should session persist if user navigates away?
   - Or start fresh each time?

---

## Summary

**Current Implementation Status:**
- ✅ Backend API routes exist (`/api/maya/pro/photoshoot/*`)
- ✅ Database tables created
- ✅ Admin panel exists (for testing)
- ✅ Avatar images system exists
- ❌ Maya tool integration missing
- ❌ Chat preview rendering missing
- ❌ Quick prompt addition missing
- ❌ Image strategy needs verification (ALWAYS use avatars)

**What Needs to Be Done:**
1. **Maya Integration:**
   - Add `generateProPhotoshootGrid` tool to Maya
   - Add "Create Pro Photoshoot" quick prompt
   - Update Maya system prompt for photoshoot context

2. **Backend Verification:**
   - Ensure `generate-grid` ALWAYS uses avatar images
   - Add optional previous grid as style reference
   - Test quality consistency

3. **Chat UI:**
   - Render grid previews in chat
   - Add "Generate Next Grid" button
   - Show progress (Grid X/8)

4. **Prompt System:**
   - Create Grid 1 template
   - Test Maya's prompt creation
   - Verify universal prompts for Grids 2-8

**Key Insights:**
1. **Concept card integration** - Same location as Classic Photoshoot button
2. **Uses same avatar images** - From concept card selection (no re-selection)
3. **ALWAYS use avatar images** - For facial consistency (never skip)
4. **REQUIRED: Include previous grids** - For style/outfit/colorgrade consistency
5. **Max 3 grids at once** - Same pattern as concept cards generation
6. **Each card independent** - Separate workflow per concept card
7. **14 image limit** - Exclude oldest grids if exceeded (keep newest)

**Critical Requirements:**
- ✅ Avatar images MUST be used for every grid generation (from concept card)
- ✅ **ALL previous grids MUST be included** (for style consistency)
- ✅ Max 14 images: If exceeded, exclude oldest grids (keep avatars + newest)
- ✅ Max 3 grids at once (like concept cards)
- ✅ Users can create as many grids as they want (max 8 per card, not required)
- ✅ **4K resolution** (not 2K) - higher quality output
- ✅ **3 credits per grid** (because 4K resolution) - total: 24 credits for all 8 grids

---

## Prompt Structure Details

### Grid 1 Custom Prompt (Maya Creates)

**Template Structure:**
```
Create a 3x3 photo grid featuring the same model in nine distinct camera angles and compositions, maintaining perfect facial and body consistency across all frames.

**Styling (consistent across all 9 shots):**
Outfit: [Maya fills: specific pieces, colors, accessories]
Location: [Maya fills: exact location with environmental details]
Color Grade: [Maya fills: lighting mood, color palette, aesthetic feel]

**Camera angles (9 unique perspectives):**
1. Straight-on portrait, eye level, direct gaze to camera
2. Three-quarter turn, body 45 degrees, face toward lens
3. Profile view, side angle 90 degrees, silhouette emphasis
4. Over-shoulder perspective, intimate storytelling angle
5. Full body shot, standing straight-on, confident stance
6. Medium shot from high angle, looking up toward camera
7. Close-up from low angle, looking down, dramatic perspective
8. Candid moment, natural movement, authentic energy
9. Environmental portrait, wider frame showing location context

The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.
```

**Maya's Role:**
- Maya fills in `[Outfit]`, `[Location]`, `[Color Grade]` based on conversation
- Maya uses her fashion expertise to create detailed descriptions
- Maya ensures consistency across all 9 angles

### Grids 2-8 Universal Prompt (Step 2)

**Universal Prompt (same for all Grids 2-8):**
```
Create a totally new 3x3 photo grid featuring the same model shown in nine distinct photographic compositions, maintaining perfect facial and body consistency. Each frame represents a new unique camera perspective: portrait close-up, mid-shot, full-body product shot, macro texture detail, low-angle dynamic pose, high-angle cinematic perspective, wide-angle lifestyle scene, ultra-wide environmental context, and over-the-shoulder narrative shot. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image.
```

**Usage:**
- **Grids 2-8:** Use this universal prompt for all subsequent grids
- **If user wants more grids in base grid style:** Repeat Step 2 prompt (use same universal prompt)
- **Styling consistency:** Outfit/location/colorGrade maintained from Grid 1 via previous grid references in `image_input`

**Why Universal:**
- Grids 2-8 focus on angle variety, not styling changes
- Styling (outfit/location/colorGrade) stays consistent from Grid 1
- Prompts create different camera perspectives, not different outfits
- Previous grids in `image_input` ensure style consistency

### Non-Negotiable Elements

**Maya MUST include:**
- ✅ "maintaining perfect facial and body consistency"
- ✅ "The angle must be different from the reference image"
- ✅ "3x3 photo grid" structure
- ✅ "9 distinct camera angles/compositions"
- ✅ "High-resolution, photorealistic style"

**Maya uses her expertise for:**
- Outfit details (specific pieces, colors, accessories)
- Location description (environmental details, context)
- Color grade (lighting mood, color palette, aesthetic)
- Camera angle variety (9 unique perspectives)

---

## Generation Flow with Image Strategy

### Grid 1 Generation

**Input:**
```typescript
image_input: [
  avatar1.jpg,  // ✅ From concept card (already selected)
  avatar2.jpg,  // ✅ From concept card
  avatar3.jpg,  // ✅ From concept card
  // ... up to 5 avatar images (same as concept generation)
]

prompt: "Create a 3x3 photo grid... Outfit: [from concept]... Location: [from concept]... Color Grade: [from concept]..."
```

**Result:**
- 3x3 grid with 9 frames
- Perfect facial consistency (from avatars)
- Styling from concept (outfit/location/colorGrade)
- Preview shown in concept card or panel

### Grid 2 Generation

**Input:**
```typescript
image_input: [
  avatar1.jpg,  // ✅ ALWAYS first (identity)
  avatar2.jpg,  // ✅ ALWAYS second (identity)
  avatar3.jpg,  // ✅ ALWAYS third (identity)
  grid1Url,     // ✅ REQUIRED: Style reference (outfit/location/colorgrade)
]

prompt: "Create a totally new 3x3 photo grid... [universal prompt - angle variety]"
```

**Result:**
- 3x3 grid with 9 NEW angles
- Same facial consistency (from avatars)
- Same styling (from Grid 1 as reference) ✅
- Different camera perspectives (from prompt)

### Grid 3 Generation

**Input:**
```typescript
image_input: [
  avatar1.jpg,  // ✅ ALWAYS first (identity)
  avatar2.jpg,  // ✅ ALWAYS second (identity)
  avatar3.jpg,  // ✅ ALWAYS third (identity)
  grid1Url,     // ✅ REQUIRED: Style reference
  grid2Url,     // ✅ REQUIRED: Style reference
]

prompt: "Create a totally new 3x3 photo grid... [universal prompt]"
```

### Grids 4-8 Generation

**Same pattern:**
- ✅ Avatar images ALWAYS first (identity)
- ✅ ALL previous grids REQUIRED (style consistency)
- ✅ Universal prompt (angle variety)
- ✅ If 14 images reached: Exclude oldest grids

### Why This Works

**Nano Banana Pro Behavior:**
- First 3-5 images in `image_input`: Primary identity reference (avatars)
- Additional images (6-14): Style, pose, compositional reference (previous grids)
- Prompts: Create variety in angles, not identity or style

**Style Consistency:**
- Grid 1: Style from concept prompt
- Grid 2: Style from Grid 1 reference ✅
- Grid 3: Style from Grid 1+2 references ✅
- ... Grid 8: Style from all previous grids ✅

**Facial Consistency:**
- All grids: 100% quality (from avatars) ✅
- Avatars always included (never excluded)

