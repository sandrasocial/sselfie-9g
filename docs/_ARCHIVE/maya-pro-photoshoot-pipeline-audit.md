# Maya Pro Photoshoot Pipeline - Technical Audit Report

**Date:** 2025-01-XX  
**Purpose:** Document existing Pro Photoshoot pipeline for reuse in Brand Blueprint flow  
**Scope:** `/app/maya/*`, `/app/api/maya/*`, `/lib/maya/*`, `/components/maya/*`, `/components/sselfie/*`

---

## Executive Summary

The Maya Pro Photoshoot pipeline is a **3x3 grid generation system** that creates 9 consistent photo variations from a single reference image. It uses **Nano Banana Pro** (Google's multi-image composition model via Replicate) to generate high-resolution grids (4K) with perfect facial and body consistency across all 9 frames.

**Key Finding:** The pipeline is **fully functional and isolated**, making it ideal for reuse. The Blueprint flow currently uses **FLUX.1 Dev** for single concept images, which is a different use case. There is **no duplication risk** - the Pro Photoshoot pipeline can be safely integrated into Blueprint without conflicts.

---

## 1. Core Pipeline Architecture

### 1.1 Model & Technology Stack

**Primary Model:** `google/nano-banana-pro` (via Replicate)  
**Client Library:** `lib/nano-banana-client.ts`  
**Resolution:** 4K (3 credits per grid)  
**Output Format:** PNG  
**Aspect Ratio:** 1:1 (square, for 3x3 grid)

**Key Files:**
- `lib/nano-banana-client.ts` (lines 1-194)
  - `generateWithNanoBanana()` - Main generation function
  - `checkNanoBananaPrediction()` - Status polling
  - `getStudioProCreditCost()` - Credit calculation (2 credits for 1K/2K/4K)

### 1.2 Pipeline Flow

```
User Action (Concept Card)
  ↓
1. Start Session (`/api/maya/pro/photoshoot/start-session`)
   - Creates `pro_photoshoot_sessions` record
   - Returns `sessionId` and `avatarImages`
  ↓
2. Generate Grid 1 (`/api/maya/pro/photoshoot/generate-grid`)
   - Maya generates custom prompt (via `/api/maya/pro/chat` with `x-pro-photoshoot: true`)
   - Calls `generateWithNanoBanana()` with:
     * Avatar images (user reference photos)
     * Custom prompt from Maya
     * 4K resolution, 1:1 aspect ratio
   - Creates `pro_photoshoot_grids` record
   - Returns `predictionId` and `gridId`
  ↓
3. Poll Grid Status (`/api/maya/pro/photoshoot/check-grid`)
   - Polls Replicate via `checkNanoBananaPrediction()`
   - When complete: Downloads grid image → Uploads to Vercel Blob
   - Splits 3x3 grid into 9 individual frames using Sharp
   - Saves each frame to `pro_photoshoot_frames` and `ai_images` (source: 'pro_photoshoot')
   - Updates grid status to 'completed'
  ↓
4. Generate Additional Grids (2-8)
   - Uses universal prompt (not Maya-generated)
   - Includes ALL previous grids in `image_input` for style consistency
   - Max 14 images in `image_input` (avatars + previous grids)
   - Same 4K generation process
  ↓
5. Create Carousel (`/api/maya/pro/photoshoot/create-carousel`)
   - Reads existing frames from `pro_photoshoot_frames`
   - Returns frame URLs and gallery image IDs for frontend carousel
```

---

## 2. API Endpoints & Functions

### 2.1 Session Management

**File:** `app/api/maya/pro/photoshoot/start-session/route.ts` (lines 1-125)

**Function:** `POST /api/maya/pro/photoshoot/start-session`

**Input:**
```typescript
{
  originalImageId: number,  // ID from ai_images table
  totalGrids?: number,     // Default: 8
  avatarImages?: string[]  // Array of image URLs (optional, auto-derived if missing)
}
```

**Output:**
```typescript
{
  success: true,
  sessionId: number,
  totalGrids: number,
  status: 'active',
  grids: Array<{id, grid_number, generation_status, grid_url}>,
  avatarImages: string[]
}
```

**Key Logic:**
- Checks for existing active session (returns if found)
- Creates new `pro_photoshoot_sessions` record
- Auto-derives `avatarImages` from `originalImageId` if not provided (admin panel fallback)

**Dependencies:**
- `requireAdmin()` - Admin-only feature
- `isProPhotoshootEnabled()` - Feature flag check
- `getDbClient()` - Database access

---

### 2.2 Grid Generation

**File:** `app/api/maya/pro/photoshoot/generate-grid/route.ts` (lines 1-267)

**Function:** `POST /api/maya/pro/photoshoot/generate-grid`

**Input:**
```typescript
{
  originalImageId: number,
  gridNumber: number,        // 1-8
  sessionId: number,
  customPromptData?: {       // For Grid 1 only
    outfit?: string,
    location?: string,
    colorGrade?: string,
    mayaGeneratedPrompt?: string  // Full prompt from Maya
  },
  avatarImages?: string[]    // Array of avatar image URLs
}
```

**Output:**
```typescript
{
  success: true,
  gridId: number,
  predictionId: string,
  status: 'starting' | 'processing',
  creditsDeducted: 3,
  newBalance: number
}
```

**Key Logic:**
- **Grid 1:** Uses Maya-generated prompt (via `getPromptForGrid(1, customPromptData)`)
- **Grids 2-8:** Uses universal prompt (via `getUniversalPrompt()`)
- Builds `image_input` array:
  1. Avatar images (ALWAYS first, for facial consistency)
  2. ALL previous completed grids (for style/outfit/colorgrade consistency)
  3. Handles 14-image limit (keeps all avatars + newest grids if exceeded)
- Deducts 3 credits BEFORE generation
- Calls `generateWithNanoBanana()` with:
  - `prompt`: Custom (Grid 1) or Universal (Grids 2-8)
  - `image_input`: Avatars + previous grids
  - `aspect_ratio`: "1:1"
  - `resolution`: "4K"
  - `output_format`: "png"
  - `safety_filter_level`: "block_only_high"

**Dependencies:**
- `generateWithNanoBanana()` from `lib/nano-banana-client.ts`
- `getPromptForGrid()` / `getUniversalPrompt()` from `lib/maya/pro-photoshoot-prompts.ts`
- `checkCredits()` / `deductCredits()` from `lib/credits.ts`
- `requireAdmin()` / `isProPhotoshootEnabled()`

---

### 2.3 Grid Status Polling

**File:** `app/api/maya/pro/photoshoot/check-grid/route.ts` (lines 1-263)

**Function:** `GET /api/maya/pro/photoshoot/check-grid?predictionId=xxx&gridId=xxx`

**Output (Processing):**
```typescript
{
  success: true,
  status: 'starting' | 'processing'
}
```

**Output (Completed):**
```typescript
{
  success: true,
  status: 'completed',
  gridUrl: string,           // Full 3x3 grid image URL (Vercel Blob)
  frameUrls: string[],       // Array of 9 frame URLs
  galleryImageIds: number[],  // Array of 9 ai_images IDs
  framesCount: 9
}
```

**Key Logic:**
- Polls Replicate via `checkNanoBananaPrediction(predictionId)`
- When `status === "succeeded"`:
  1. Downloads grid image from Replicate output URL
  2. Uploads full grid to Vercel Blob: `pro-photoshoot/grids/{gridId}-full.png`
  3. **Splits grid into 9 frames** using Sharp:
     - `splitGridIntoFrames()` function (lines 13-44)
     - Extracts 3x3 grid into individual frames
  4. Uploads each frame to Vercel Blob: `pro-photoshoot/frames/{gridId}-{frameNumber}.png`
  5. Saves each frame to `ai_images` (source: 'pro_photoshoot', category: 'pro_photoshoot')
  6. Saves frame records to `pro_photoshoot_frames` table
  7. Updates `pro_photoshoot_grids` status to 'completed'
  8. Checks if all grids complete → marks session as 'completed'

**Dependencies:**
- `checkNanoBananaPrediction()` from `lib/nano-banana-client.ts`
- `put()` from `@vercel/blob` - Image storage
- `sharp` - Image processing (grid splitting)
- `getDbClient()` - Database access

---

### 2.4 Carousel Creation

**File:** `app/api/maya/pro/photoshoot/create-carousel/route.ts` (lines 1-145)

**Function:** `POST /api/maya/pro/photoshoot/create-carousel`

**Input:**
```typescript
{
  gridId: number
}
```

**Output:**
```typescript
{
  success: true,
  carouselId: string,        // "grid-{gridId}"
  gridId: number,
  gridNumber: number,
  frames: string[],          // Array of 9 frame URLs
  galleryImageIds: number[], // Array of 9 ai_images IDs
  framesCount: 9
}
```

**Key Logic:**
- **READ-ONLY operation** - Does NOT create frames (frames created by `check-grid`)
- Reads existing frames from `pro_photoshoot_frames` table
- Validates 9 frames exist
- Returns frame URLs and gallery image IDs for frontend carousel component

**Dependencies:**
- `getDbClient()` - Database access
- `requireAdmin()` / `isProPhotoshootEnabled()`

---

### 2.5 Image Lookup

**File:** `app/api/maya/pro/photoshoot/lookup-image/route.ts` (lines 1-75)

**Function:** `GET /api/maya/pro/photoshoot/lookup-image?predictionId=xxx` OR `?imageUrl=xxx`

**Output:**
```typescript
{
  success: true,
  imageId: number  // ID from ai_images table
}
```

**Purpose:** Helper endpoint to find `ai_images.id` from `prediction_id` or `image_url`. Used by frontend to get `originalImageId` for starting Pro Photoshoot sessions.

---

## 3. Prompt System

### 3.1 Prompt Generation

**File:** `lib/maya/pro-photoshoot-prompts.ts` (lines 1-61)

**Functions:**
- `getUniversalPrompt()` - Returns universal prompt for Grids 2-8
- `getPromptForGrid(gridNumber, customPromptData)` - Returns custom prompt for Grid 1 or universal for others
- `getGridName(gridNumber)` - Returns human-readable grid name

**Universal Prompt (Grids 2-8):**
```
Create a totally new 3x3 photo grid featuring the same model shown in nine distinct photographic compositions, maintaining perfect facial and body consistency. Each frame represents a new unique camera perspective: portrait close-up, mid-shot, full-body product shot, macro texture detail, low-angle dynamic pose, high-angle cinematic perspective, wide-angle lifestyle scene, ultra-wide environmental context, and over-the-shoulder narrative shot. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image.
```

**Grid 1 Custom Prompt:**
- If `mayaGeneratedPrompt` provided → uses it directly
- Otherwise → constructs from `outfit`, `location`, `colorGrade` parameters
- Includes base requirements: grid layout, consistency, high-resolution, etc.

---

### 3.2 Maya Integration

**File:** `lib/maya/pro-photoshoot-context.ts` (lines 1-161)

**Function:** `getProPhotoshootContextAddon()`

**Purpose:** Provides Maya with instructions for creating Pro Photoshoot prompts. Used when generating Grid 1 custom prompt.

**Key Instructions:**
- Creates prompts for Nano Banana Pro
- 3x3 grid (9 frames)
- Expression guidance (avoid big smiles, use neutral/soft smile)
- Base prompt requirements (grid layout, consistency, etc.)
- Template structure with examples

**Integration:** Called via `/api/maya/pro/chat` with header `x-pro-photoshoot: true` and `x-chat-type: "pro-photoshoot"`

**Example Usage (from ConceptCardPro.tsx, lines 480-520):**
```typescript
const mayaResponse = await fetch("/api/maya/pro/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-chat-type": "pro-photoshoot",
    "x-pro-photoshoot": "true",
  },
  body: JSON.stringify({
    message: `Create a prompt for a 3x3 Pro Photoshoot grid based on this concept: "${concept.description || concept.title}". ...`,
    chatHistory: [],
  }),
})
```

---

## 4. Frontend Components

### 4.1 Concept Card Integration

**Files:**
- `components/sselfie/concept-card.tsx` (lines 1107-1250) - Classic Mode
- `components/sselfie/pro-mode/ConceptCardPro.tsx` (lines 404-720) - Pro Mode

**Key Functions:**
- `handleCreateProPhotoshoot()` - Initiates Pro Photoshoot session
- `generateGrid(gridNumber, avatarImages, sessionId)` - Generates individual grid
- `generateGrids(count)` - Generates multiple grids (max 3 at once)
- `handleCreateCarousel(gridId, gridNumber)` - Creates carousel from completed grid
- Polling logic for grid status (lines 577-650 in ConceptCardPro.tsx)

**State Management:**
- `proPhotoshootSessionId` - Active session ID
- `proPhotoshootGrids` - Array of grid statuses
- `proPhotoshootCarousel` - Carousel data (frames, gallery IDs)
- `isCreatingProPhotoshoot` - Loading state

---

### 4.2 Pro Photoshoot Panel

**File:** `components/sselfie/pro-photoshoot-panel.tsx` (lines 1-195)

**Purpose:** UI component displaying grid progress and controls

**Props:**
```typescript
{
  sessionId: number,
  grids: Array<{gridNumber, status, gridUrl, predictionId}>,
  onGenerateMore: (count: number) => Promise<void>,
  onCreateCarousel?: (gridId: number, gridNumber: number) => Promise<void>,
  maxGrids: number,  // Default: 8
  isGenerating: boolean,
  creditCost?: number,  // Default: 3
  creatingCarouselForGridId?: number | null
}
```

**Features:**
- Displays 2x4 or 4x2 grid layout (8 grids)
- Shows status: completed, generating, pending, failed
- "Generate More" button (max 3 grids at once)
- "Create Carousel" button for completed grids
- Progress indicator (completed/max grids)

---

## 5. Database Schema

### 5.1 Tables

**File:** `docs/schema.md` (lines 412-447)

**`pro_photoshoot_sessions`:**
- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `original_image_id` (INTEGER, REFERENCES ai_images)
- `total_grids` (INTEGER, DEFAULT 8)
- `session_status` (TEXT) - 'active', 'completed', 'cancelled'
- `created_at`, `updated_at`, `completed_at` (TIMESTAMPTZ)

**`pro_photoshoot_grids`:**
- `id` (SERIAL, PRIMARY KEY)
- `session_id` (INTEGER, REFERENCES pro_photoshoot_sessions)
- `grid_number` (INTEGER) - 1-8
- `prediction_id` (TEXT) - Replicate prediction ID
- `grid_url` (TEXT) - Full 3x3 grid image URL (Vercel Blob)
- `generation_status` (TEXT) - 'pending', 'generating', 'completed', 'failed'
- `prompt` (TEXT) - Prompt used for generation
- `created_at`, `updated_at`, `completed_at` (TIMESTAMPTZ)

**`pro_photoshoot_frames`:**
- `id` (SERIAL, PRIMARY KEY)
- `grid_id` (INTEGER, REFERENCES pro_photoshoot_grids)
- `frame_number` (INTEGER) - 1-9
- `frame_url` (TEXT) - Individual frame image URL (Vercel Blob)
- `gallery_image_id` (INTEGER, REFERENCES ai_images)
- `created_at` (TIMESTAMPTZ)
- **UNIQUE constraint:** `(grid_id, frame_number)` - Prevents duplicates

**`ai_images` (existing table):**
- Frames are saved with:
  - `source`: 'pro_photoshoot'
  - `category`: 'pro_photoshoot'
  - `saved`: true
  - `image_url`: Frame URL (Vercel Blob)

---

## 6. Dependencies & Utilities

### 6.1 Core Dependencies

**`lib/nano-banana-client.ts`** (lines 1-194)
- `generateWithNanoBanana(input)` - Main generation function
- `checkNanoBananaPrediction(predictionId)` - Status polling
- **Model:** `google/nano-banana-pro` (via Replicate)
- **Max Images:** 14 images in `image_input` array
- **Credit Cost:** 2 credits (1K/2K/4K) - **Note:** Pro Photoshoot uses 3 credits (custom pricing)

**`lib/replicate-client.ts`** (lines 1-103)
- `getReplicateClient()` - Singleton Replicate client
- Uses `REPLICATE_API_TOKEN` environment variable

**`lib/credits.ts`**
- `checkCredits(userId, amount)` - Check credit balance
- `deductCredits(userId, amount, type, description)` - Deduct credits

**`lib/admin-feature-flags.ts`**
- `isProPhotoshootEnabled()` - Feature flag check
- `requireAdmin()` - Admin access check

---

### 6.2 Image Processing

**Sharp** (used in `check-grid/route.ts`)
- `splitGridIntoFrames(gridBuffer)` - Splits 3x3 grid into 9 individual frames
- Extracts frames using `sharp().extract()` with calculated coordinates

**Vercel Blob Storage**
- `put()` - Uploads images to Vercel Blob
- Paths:
  - Grids: `pro-photoshoot/grids/{gridId}-full.png`
  - Frames: `pro-photoshoot/frames/{gridId}-{frameNumber}.png`

---

## 7. Call Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: ConceptCardPro.tsx                                    │
│ - User clicks "Create Pro Photoshoot"                           │
│ - Calls handleCreateProPhotoshoot()                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. POST /api/maya/pro/photoshoot/start-session                 │
│    - Input: originalImageId, totalGrids, avatarImages           │
│    - Output: sessionId, avatarImages                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. POST /api/maya/pro/chat (if Grid 1)                        │
│    - Headers: x-pro-photoshoot: true, x-chat-type: pro-photoshoot│
│    - Input: message requesting prompt for Grid 1                │
│    - Output: mayaGeneratedPrompt                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. POST /api/maya/pro/photoshoot/generate-grid                 │
│    - Input: sessionId, gridNumber, customPromptData, avatarImages│
│    - Calls: generateWithNanoBanana()                            │
│    - Output: predictionId, gridId                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Poll: GET /api/maya/pro/photoshoot/check-grid               │
│    - Input: predictionId, gridId                                  │
│    - Polls: checkNanoBananaPrediction(predictionId)            │
│    - When complete: Downloads → Uploads to Blob → Splits frames │
│    - Output: gridUrl, frameUrls, galleryImageIds                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. POST /api/maya/pro/photoshoot/create-carousel (optional)     │
│    - Input: gridId                                              │
│    - Output: frames, galleryImageIds                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Duplication Risk Analysis

### 8.1 Blueprint Flow Comparison

**Blueprint Endpoints:**
- `/api/blueprint/generate-concept-image` - Uses **FLUX.1 Dev** (single image)
- `/api/blueprint/check-image` - Polls FLUX.1 Dev prediction

**Pro Photoshoot Endpoints:**
- `/api/maya/pro/photoshoot/*` - Uses **Nano Banana Pro** (3x3 grid)

**Key Differences:**
1. **Model:** FLUX.1 Dev vs Nano Banana Pro
2. **Output:** Single image vs 3x3 grid (9 frames)
3. **Use Case:** Concept preview vs Full photoshoot session
4. **Credits:** 1 credit (FLUX) vs 3 credits (Nano Banana 4K)
5. **Image Input:** None (Blueprint) vs Avatars + Previous Grids (Pro Photoshoot)

**Conclusion:** **NO DUPLICATION RISK** - Different models, different use cases, different endpoints.

---

### 8.2 Shared Utilities

**Potential Reuse:**
- `lib/nano-banana-client.ts` - ✅ Can be reused (already shared)
- `lib/replicate-client.ts` - ✅ Already shared
- `lib/credits.ts` - ✅ Already shared
- `lib/maya/pro-photoshoot-prompts.ts` - ⚠️ Pro Photoshoot-specific (but can be adapted)

**No Conflicts:**
- Blueprint uses FLUX.1 Dev directly via Replicate
- Pro Photoshoot uses Nano Banana Pro via `nano-banana-client.ts`
- Both use same Replicate client (no conflict)

---

## 9. Integration Plan for Brand Blueprint

### 9.1 Suggested Approach

**Option 1: Direct Reuse (Recommended)**
- Import Pro Photoshoot endpoints into Blueprint flow
- Add "Generate Pro Photoshoot" button to Blueprint concept cards
- Reuse existing `/api/maya/pro/photoshoot/*` endpoints
- **Pros:** Zero duplication, proven pipeline, consistent UX
- **Cons:** Requires admin access (feature flag check)

**Option 2: Extract Shared Module**
- Create `lib/maya/photoshoot.ts` with reusable functions:
  - `generatePhotoshootGrid(prompt, imageInput, options)`
  - `splitGridIntoFrames(gridBuffer)`
  - `createPhotoshootSession(userId, originalImageId)`
- Blueprint and Pro Photoshoot both use shared module
- **Pros:** Centralized logic, easier maintenance
- **Cons:** Requires refactoring existing code

**Option 3: Blueprint-Specific Endpoint**
- Create `/api/blueprint/generate-photoshoot-grid` that wraps Pro Photoshoot logic
- Removes admin requirement for Blueprint users
- **Pros:** Blueprint-specific access control
- **Cons:** Code duplication, maintenance overhead

---

### 9.2 Recommended Implementation

**Step 1: Extract Shared Functions**
- Move `splitGridIntoFrames()` to `lib/maya/photoshoot.ts`
- Move grid generation logic to shared function
- Keep endpoints separate (different access control)

**Step 2: Blueprint Integration**
- Add Pro Photoshoot button to `BlueprintConceptCard` component
- Call `/api/maya/pro/photoshoot/start-session` with concept image
- Reuse existing polling and carousel logic

**Step 3: Access Control**
- Option A: Remove admin requirement for Blueprint users (add user check)
- Option B: Keep admin requirement, add Blueprint-specific endpoint

---

## 10. Key Variables & Configs

### 10.1 Credit Costs

- **Pro Photoshoot Grid (4K):** 3 credits per grid
- **Nano Banana Pro (Standard):** 2 credits (1K/2K/4K)
- **Note:** Pro Photoshoot uses custom pricing (3 credits) despite Nano Banana standard being 2 credits

### 10.2 Image Limits

- **Max Images in `image_input`:** 14 images (Nano Banana Pro limit)
- **Pro Photoshoot Strategy:**
  - Always include all avatar images first
  - Add previous grids (up to 14 total)
  - If exceeded: Keep all avatars + newest grids (exclude oldest)

### 10.3 Grid Configuration

- **Total Grids:** 8 (default, configurable)
- **Frames per Grid:** 9 (3x3 layout)
- **Aspect Ratio:** 1:1 (square)
- **Resolution:** 4K
- **Output Format:** PNG

### 10.4 Generation Settings

```typescript
{
  prompt: string,                    // Custom (Grid 1) or Universal (Grids 2-8)
  image_input: string[],            // Avatars + previous grids (max 14)
  aspect_ratio: "1:1",              // Square for 3x3 grid
  resolution: "4K",                // High resolution
  output_format: "png",             // PNG format
  safety_filter_level: "block_only_high"  // Safety filter
}
```

---

## 11. File Reference Summary

### 11.1 API Routes

| File | Lines | Purpose |
|------|-------|---------|
| `app/api/maya/pro/photoshoot/start-session/route.ts` | 1-125 | Create Pro Photoshoot session |
| `app/api/maya/pro/photoshoot/generate-grid/route.ts` | 1-267 | Generate 3x3 grid |
| `app/api/maya/pro/photoshoot/check-grid/route.ts` | 1-263 | Poll grid status, split frames |
| `app/api/maya/pro/photoshoot/create-carousel/route.ts` | 1-145 | Create carousel from frames |
| `app/api/maya/pro/photoshoot/lookup-image/route.ts` | 1-75 | Find image ID from URL/predictionId |
| `app/api/maya/pro/generate-image/route.ts` | 1-247 | Pro Mode single image generation |
| `app/api/maya/pro/check-generation/route.ts` | 1-314 | Poll Pro Mode image status |

### 11.2 Library Files

| File | Lines | Purpose |
|------|-------|---------|
| `lib/nano-banana-client.ts` | 1-194 | Nano Banana Pro client |
| `lib/maya/pro-photoshoot-prompts.ts` | 1-61 | Prompt generation functions |
| `lib/maya/pro-photoshoot-context.ts` | 1-161 | Maya context addon for prompts |
| `lib/replicate-client.ts` | 1-103 | Replicate client singleton |
| `lib/credits.ts` | - | Credit management |
| `lib/admin-feature-flags.ts` | - | Feature flags & admin checks |

### 11.3 Components

| File | Lines | Purpose |
|------|-------|---------|
| `components/sselfie/pro-mode/ConceptCardPro.tsx` | 404-720 | Pro Mode concept card (Pro Photoshoot handlers) |
| `components/sselfie/concept-card.tsx` | 1107-1250 | Classic Mode concept card (Pro Photoshoot handlers) |
| `components/sselfie/pro-photoshoot-panel.tsx` | 1-195 | Pro Photoshoot UI panel |

### 11.4 Database Tables

| Table | Purpose |
|-------|---------|
| `pro_photoshoot_sessions` | Session records |
| `pro_photoshoot_grids` | Grid records (3x3 images) |
| `pro_photoshoot_frames` | Individual frame records (9 per grid) |
| `ai_images` | Gallery images (frames saved here with source='pro_photoshoot') |

---

## 12. Critical Notes & Gotchas

### 12.1 Image Input Strategy

**CRITICAL:** The Pro Photoshoot pipeline uses a sophisticated image input strategy:
1. **Avatar images ALWAYS first** - Ensures facial consistency
2. **Previous grids added** - Ensures style/outfit/colorgrade consistency
3. **14-image limit handling** - If exceeded, keeps all avatars + newest grids

**Why This Matters:** If you reuse this pipeline, you MUST maintain this order. Changing the order will break consistency.

---

### 12.2 Frame Splitting

**CRITICAL:** Frames are created by `check-grid` endpoint, NOT by `create-carousel`. The `create-carousel` endpoint is READ-ONLY and only reads existing frames.

**Why This Matters:** If you create a new endpoint, you must split frames in the status polling step, not in a separate carousel creation step.

---

### 12.3 Credit Deduction Timing

**CRITICAL:** Credits are deducted BEFORE generation starts (in `generate-grid`), not after completion.

**Why This Matters:** If generation fails, credits are still deducted. This is intentional (prevents abuse).

---

### 12.4 Admin Requirement

**CRITICAL:** All Pro Photoshoot endpoints require admin access (`requireAdmin()`). This is a feature flag, not a technical limitation.

**Why This Matters:** If you want to use this in Blueprint, you'll need to either:
1. Remove admin requirement (add user check instead)
2. Create Blueprint-specific endpoints with different access control

---

### 12.5 Prompt Generation

**CRITICAL:** Grid 1 uses Maya-generated prompt, Grids 2-8 use universal prompt. This is intentional for consistency.

**Why This Matters:** If you want custom prompts for all grids, you'll need to modify the prompt generation logic.

---

## 13. Suggested Refactoring Opportunities

### 13.1 Extract Shared Functions

**Create:** `lib/maya/photoshoot.ts`

**Functions to Extract:**
```typescript
// Grid splitting (currently in check-grid/route.ts)
export async function splitGridIntoFrames(gridBuffer: Buffer): Promise<Buffer[]>

// Grid generation logic (currently in generate-grid/route.ts)
export async function generatePhotoshootGrid(params: {
  prompt: string,
  imageInput: string[],
  aspectRatio: "1:1",
  resolution: "4K",
  outputFormat: "png"
}): Promise<{predictionId: string, status: string}>

// Session creation (currently in start-session/route.ts)
export async function createPhotoshootSession(params: {
  userId: string,
  originalImageId: number,
  totalGrids?: number,
  avatarImages?: string[]
}): Promise<{sessionId: number, avatarImages: string[]}>
```

**Benefits:**
- Reusable across Blueprint and Pro Photoshoot
- Easier testing
- Centralized logic

---

### 13.2 Remove Admin Requirement

**Current:** All endpoints require `requireAdmin()`

**Suggested:** Add user-level access check:
```typescript
// Instead of requireAdmin(), use:
const { user } = await getAuthenticatedUser()
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Benefits:**
- Blueprint users can use Pro Photoshoot
- No need for separate endpoints

---

## 14. Testing Checklist

If integrating Pro Photoshoot into Blueprint, test:

- [ ] Session creation with Blueprint concept image
- [ ] Grid 1 generation with Maya prompt
- [ ] Grids 2-8 generation with universal prompt
- [ ] Frame splitting (9 frames per grid)
- [ ] Image input order (avatars first, then previous grids)
- [ ] 14-image limit handling
- [ ] Credit deduction (3 credits per grid)
- [ ] Carousel creation from frames
- [ ] Error handling (failed generations, missing images)
- [ ] Polling timeout handling

---

## 15. Conclusion

The Maya Pro Photoshoot pipeline is **fully functional, well-structured, and ready for reuse**. It uses Nano Banana Pro to generate 3x3 grids with perfect consistency, and includes sophisticated image input management for style coherence.

**Key Takeaways:**
1. ✅ **No duplication risk** - Blueprint uses FLUX.1 Dev, Pro Photoshoot uses Nano Banana Pro
2. ✅ **Reusable components** - `nano-banana-client.ts`, `replicate-client.ts`, credit system
3. ✅ **Clear separation** - Endpoints are isolated, easy to integrate
4. ⚠️ **Admin requirement** - Needs modification for Blueprint users
5. ✅ **Proven pipeline** - Already working in production

**Recommended Next Steps:**
1. Extract shared functions to `lib/maya/photoshoot.ts`
2. Remove admin requirement (or add user-level check)
3. Integrate into Blueprint concept cards
4. Test thoroughly with Blueprint flow

---

**End of Audit Report**
