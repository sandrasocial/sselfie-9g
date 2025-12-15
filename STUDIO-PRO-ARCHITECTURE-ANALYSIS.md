# STUDIO PRO ARCHITECTURE ANALYSIS
## Current State Report (No Implementation)

**Date:** 2025-01-XX  
**Purpose:** Complete architecture map of Studio Pro implementation to guide simplification to "workbench" UX

---

## A) MODE SEPARATION / SAFETY

### How Classic vs Pro Mode is Determined

**Frontend Detection:**
- **File:** `components/sselfie/maya-chat-screen.tsx` (lines 82-88)
- **State:** `studioProMode` boolean stored in `localStorage` as `'mayaStudioProMode'`
- **Toggle:** Header button in chat screen (line 2207-2219)
- **Default:** `false` (Classic mode)

**Backend Detection:**
- **File:** `app/api/maya/chat/route.ts` (lines 476-488)
- **Three detection methods:**
  1. Header: `req.headers.get("x-studio-pro-mode") === "true"`
  2. Intent detection: `detectStudioProIntent(lastMessageText)` (from `lib/maya/studio-pro-system-prompt.ts`)
  3. Workflow trigger: `[WORKFLOW_START: {workflowType}]` pattern in message
- **System prompt selection:** Line 488 - `isStudioProMode ? MAYA_PRO_SYSTEM_PROMPT : MAYA_SYSTEM_PROMPT`

### Shared Code Paths Between Classic and Pro

**⚠️ CRITICAL SHARED PATHS:**

1. **Chat Route** (`app/api/maya/chat/route.ts`)
   - **Shared:** Entire route handler
   - **Conditional:** System prompt selection (line 488)
   - **Risk:** Pro intent detection could affect Classic if header is accidentally set

2. **Maya Chat Screen** (`components/sselfie/maya-chat-screen.tsx`)
   - **Shared:** Message rendering, chat UI, concept cards
   - **Conditional:** Pro mode UI overlay (lines 2099-2151), Pro controls strip (lines 2251-2296)
   - **Risk:** Pro state could leak into Classic message rendering

3. **Concept Card Component** (`components/sselfie/concept-card.tsx`)
   - **Shared:** Component used for both modes
   - **Conditional:** `studioProMode` prop (line 18) changes generation endpoint
   - **Risk:** If prop is accidentally true, Classic concepts would use Pro generation

4. **Credit System** (`lib/credits.ts`)
   - **Shared:** All credit operations
   - **Safe:** No mode-specific logic

5. **User Context** (`lib/maya/get-user-context.ts`)
   - **Shared:** User data fetching
   - **Conditional:** Includes brand assets for Pro (line 31)
   - **Risk:** Low - only affects context, not generation

### Classic Generation Route Confirmation

**✅ CONFIRMED: Classic uses Flux Prompt Builder**

- **Route:** `app/api/maya/generate-image/route.ts`
- **Prompt Builder:** `lib/maya/flux-prompt-builder.ts` (FluxPromptBuilder.generateFluxPrompt)
- **Trigger Words:** Preserved in line 83 of flux-prompt-builder.ts: `components.trigger` (userTriggerToken)
- **Model:** User's trained LoRA model via Replicate (not nano-banana)
- **No Pro imports:** Does NOT import `nano-banana-prompt-builder.ts`

**Classic Flow:**
1. User sends message → `app/api/maya/chat/route.ts`
2. Maya generates concept → Concept card appears
3. User clicks "Create Photo" → `app/api/maya/generate-image/route.ts`
4. FluxPromptBuilder generates prompt with trigger word
5. Replicate generates with user's LoRA model

### Pro Generation Confirmation

**✅ CONFIRMED: Pro uses Nano Banana Prompt Builder**

- **Route:** `app/api/maya/generate-studio-pro/route.ts`
- **Prompt Builder:** `lib/maya/nano-banana-prompt-builder.ts` (buildNanoBananaPrompt function)
- **Model:** `google/nano-banana-pro` via Replicate (line 91 in `lib/nano-banana-client.ts`)
- **No Trigger Words:** Nano Banana uses natural language, no LoRA/trigger words

**Pro Flow:**
1. User toggles Pro mode → `studioProMode = true`
2. User sends message → Header `x-studio-pro-mode: true` sent
3. Maya suggests Pro mode → User generates
4. `app/api/maya/generate-studio-pro/route.ts` called
5. `buildNanoBananaPrompt()` generates natural language prompt
6. `generateWithNanoBanana()` calls Replicate with `google/nano-banana-pro`

### Risks: Places Where Pro Changes Could Affect Classic

**🔴 HIGH RISK:**
1. **Concept Card Component** (`components/sselfie/concept-card.tsx`)
   - Line 134: Checks `studioProMode` prop to choose endpoint
   - **Risk:** If prop accidentally true, Classic concepts use Pro generation
   - **Mitigation:** Ensure prop is explicitly false for Classic

2. **Chat Route Intent Detection** (`app/api/maya/chat/route.ts`)
   - Lines 476-488: Intent detection could misclassify Classic requests
   - **Risk:** Classic messages with Pro keywords could switch to Pro system prompt
   - **Mitigation:** Header check should be primary, intent secondary

3. **Maya Chat Screen State** (`components/sselfie/maya-chat-screen.tsx`)
   - Line 172: Header sent with every request based on `studioProMode` state
   - **Risk:** If state persists incorrectly, Classic requests get Pro header
   - **Mitigation:** Clear state on mode switch, validate localStorage

**🟡 MEDIUM RISK:**
4. **Message Rendering** (`components/sselfie/maya-chat-screen.tsx` lines 2958-3000)
   - Studio Pro result rendering mixed with Classic message parts
   - **Risk:** Pro message parts could render in Classic mode
   - **Mitigation:** Check `studioProMode` before rendering Pro parts

5. **User Context Loading** (`lib/maya/get-user-context.ts`)
   - Brand assets loaded for Pro mode
   - **Risk:** Unnecessary data loading in Classic (performance only)

---

## B) FRONTEND INVENTORY (STUDIO PRO)

### Entry Flow Components

**File:** `components/studio-pro/pro-entry-flow.tsx`
- **Purpose:** Initial Pro mode entry selection screen
- **User selects:** `'just-me' | 'me-product' | 'editing' | 'full-brand'`
- **Saves to:** `user_pro_setup.entry_selection` via `/api/studio-pro/setup` POST

### Onboarding Components

**File:** `components/studio-pro/onboarding-flow.tsx`
- **Purpose:** Multi-step onboarding after entry selection
- **Steps:**
  1. Avatar image upload (minimum 3, max 8)
  2. Brand assets upload (optional)
  3. Brand kit creation (colors, fonts, tone)
- **APIs called:**
  - `/api/studio-pro/avatar` (POST) - Upload avatar images
  - `/api/studio-pro/brand-assets` (POST) - Upload brand assets
  - `/api/studio-pro/brand-kits` (POST) - Create brand kit
  - `/api/studio-pro/setup` (POST) - Unlock Pro features
- **Completion:** Sets `user_pro_setup.pro_features_unlocked = true`

### Dashboard/Quick Actions Components

**File:** `components/studio-pro/pro-dashboard.tsx`
- **Purpose:** Main Pro mode dashboard with quick action cards
- **Quick Actions:**
  - Create carousel (5 credits)
  - Create reel cover (5 credits)
  - UGC product photo (5 credits)
  - Edit / Reuse & Adapt (3 credits)
  - Quote graphic (3 credits)
  - Product mockup (5 credits)
- **Props:** `onActionClick(workflowType: string)`
- **Data Loaded:**
  - Avatar images count
  - Brand kit (default)
  - Recent assets (TODO - not implemented)

### Workflow Components

**Existing Workflows:**

1. **Edit/Reuse Workflow**
   - **File:** `components/studio-pro/workflows/edit-reuse-workflow.tsx`
   - **Status:** ✅ Complete
   - **Purpose:** Form-based workflow for editing/reusing existing images
   - **Features:**
     - Select base image from gallery
     - Edit instructions input
     - Resolution selector (1K/2K/4K)
     - Calls `/api/studio-pro/generate/edit-reuse`

2. **Carousel Workflow**
   - **File:** NOT FOUND (chat-based, no component)
   - **Status:** ⚠️ Chat-based only
   - **Trigger:** `[WORKFLOW_START: carousel]` message pattern
   - **API:** `/api/studio-pro/generate/carousel`

3. **Reel Cover Workflow**
   - **File:** NOT FOUND (chat-based, no component)
   - **Status:** ⚠️ Chat-based only
   - **Trigger:** `[WORKFLOW_START: reel-cover]` message pattern
   - **API:** `/api/studio-pro/generate/reel-cover`

4. **Other Workflows (UGC, Quote, Mockup, etc.)**
   - **File:** NOT FOUND
   - **Status:** ❌ Not implemented
   - **Note:** Only prompt builder modes exist, no UI workflows

**Incomplete Workflows:**
- UGC product workflow (no component)
- Quote graphic workflow (no component)
- Product mockup workflow (no component)
- Transformation workflow (no component)
- Educational workflow (no component)

### Maya Chat Screen Component

**File:** `components/sselfie/maya-chat-screen.tsx`
- **Total Lines:** 3,287
- **Pro Mode Integration:**

**Pro Mode State (lines 82-112):**
- `studioProMode` - boolean from localStorage
- `uploadedImages` - array of base/product images (persisted in localStorage)
- `galleryImages` - loaded from `/api/gallery/images`
- `isGeneratingStudioPro` - generation status
- `isWorkflowChat` - tracks if in workflow chat mode

**Pro Mode UI Rendering (lines 2099-2151):**
- When `studioProMode && !isWorkflowChat`: Shows `ProModeWrapper` component
- Pro mode header with exit button
- Hides normal chat UI

**Pro Controls Strip (lines 2251-2296):**
- Shows when `studioProMode && !isWorkflowChat`
- Image picker from gallery
- Upload product images button
- Image count display (X / 14 images)
- Clear images button

**Pro Image Management (lines 1740-1766):**
- `handleProductUpload()` - uploads to `/api/studio-pro/avatar` or stores locally
- `clearStudioProImages()` - clears uploaded images
- Images stored in `uploadedImages` state and localStorage

**Pro Generation Functions (lines 1766-1904):**
- `generateStudioProContent()` - calls `/api/maya/generate-studio-pro`
- `pollStudioProStatus()` - polls `/api/maya/check-studio-pro` every 5 seconds
- Adds result to chat messages as `studio-pro-result` part type

### Message Schema / Rendering

**Message Structure:**
- Uses Vercel AI SDK `useChat` hook
- Messages have `parts` array
- Part types:
  - `text` - regular text
  - `tool-generateConcepts` - concept cards
  - `tool-generateVideo` - video cards
  - `studio-pro-result` - Studio Pro generation result (lines 2958-3000)

**Studio Pro Result Rendering (lines 2958-3000):**
```typescript
if (part.type === "studio-pro-result") {
  const output = part.output
  if (output.state === "ready" && output.imageUrl) {
    // Render image preview with download button
  }
  if (output.state === "processing") {
    // Render loading spinner
  }
}
```

**Message Parts Schema:**
- `studio-pro-result` part:
  ```typescript
  {
    type: 'studio-pro-result',
    output: {
      state: 'ready' | 'processing',
      imageUrl?: string
    }
  }
  ```

### Client-Side Exception Source

**Potential Exception Sources:**

1. **localStorage Access** (lines 83-104)
   - `typeof window !== 'undefined'` check exists
   - **Risk:** SSR hydration mismatch if localStorage differs

2. **Gallery Fetch** (lines 350-375)
   - Fetches `/api/gallery/images` when Pro mode enabled
   - **Risk:** API error not caught could crash component

3. **Status Polling** (lines 1837-1904)
   - `pollStudioProStatus()` uses setTimeout recursion
   - **Risk:** Memory leak if component unmounts during polling
   - **Risk:** No cleanup on unmount

4. **Image Upload** (lines 1740-1760)
   - File upload handling
   - **Risk:** Large files could cause memory issues

---

## C) BACKEND INVENTORY (STUDIO PRO)

### Database Tables

**Migration File:** `scripts/migrations/12-studio-pro-tables.sql`

**Tables:**

1. **`user_avatar_images`**
   - **Purpose:** Persistent identity images for Nano Banana Pro
   - **Schema:**
     - `id` (SERIAL PRIMARY KEY)
     - `user_id` (TEXT, FK to users)
     - `image_url` (TEXT)
     - `image_type` (TEXT: 'selfie' | 'lifestyle' | 'mirror' | 'casual' | 'professional')
     - `is_active` (BOOLEAN, default true)
     - `display_order` (INTEGER, default 0)
     - `uploaded_at` (TIMESTAMP)
   - **Constraints:** Minimum 3, maximum 8 (enforced in app, not DB)

2. **`brand_assets`**
   - **Purpose:** Product images, logos, packaging for Pro workflows
   - **Schema:**
     - `id` (SERIAL PRIMARY KEY)
     - `user_id` (TEXT, FK to users)
     - `asset_type` (TEXT: 'product' | 'logo' | 'packaging' | 'lifestyle')
     - `image_url` (TEXT)
     - `name` (TEXT)
     - `description` (TEXT)
     - `brand_kit_id` (INTEGER, FK to brand_kits)
     - `is_active` (BOOLEAN, default true)
     - `uploaded_at` (TIMESTAMP)

3. **`brand_kits`**
   - **Purpose:** Brand styling preferences (colors, fonts, tone)
   - **Schema:**
     - `id` (SERIAL PRIMARY KEY)
     - `user_id` (TEXT, FK to users)
     - `name` (TEXT)
     - `primary_color` (TEXT)
     - `secondary_color` (TEXT)
     - `accent_color` (TEXT)
     - `font_style` (TEXT)
     - `brand_tone` (TEXT: 'bold' | 'soft' | 'minimalist' | 'luxury' | 'casual' | 'professional')
     - `is_default` (BOOLEAN, default false)
     - `created_at` (TIMESTAMP)
   - **Constraint:** One default kit per user (unique index)

4. **`user_pro_preferences`**
   - **Purpose:** Learned preferences from Pro usage
   - **Schema:**
     - `user_id` (TEXT PRIMARY KEY, FK to users)
     - `preferred_tone` (TEXT)
     - `preferred_style` (TEXT)
     - `preferred_layouts` (TEXT[])
     - `last_used_workflows` (TEXT[])
     - `updated_at` (TIMESTAMP)
   - **Status:** ⚠️ Table exists but not actively used

5. **`pro_workflows`**
   - **Purpose:** Tracks active Pro workflows
   - **Schema:**
     - `id` (SERIAL PRIMARY KEY)
     - `user_id` (TEXT, FK to users)
     - `workflow_type` (TEXT: 'carousel' | 'reel-cover' | 'ugc-product' | 'edit-image' | 'change-outfit' | 'remove-object' | 'quote-graphic' | 'product-mockup' | 'reuse-adapt')
     - `status` (TEXT: 'setup' | 'in-progress' | 'completed' | 'cancelled')
     - `context` (JSONB, default '{}')
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

6. **`pro_generations`**
   - **Purpose:** Pro generations with revision tracking
   - **Schema:**
     - `id` (SERIAL PRIMARY KEY)
     - `user_id` (TEXT, FK to users)
     - `workflow_id` (INTEGER, FK to pro_workflows, nullable)
     - `parent_generation_id` (INTEGER, FK to pro_generations, nullable - for edits/variants)
     - `generation_type` (TEXT)
     - `image_urls` (TEXT[] - array of URLs)
     - `edit_instruction` (TEXT)
     - `prompt_used` (TEXT)
     - `settings` (JSONB, default '{}')
     - `created_at` (TIMESTAMP)
   - **Note:** `parent_generation_id = NULL` means original, non-null means edit/variant

7. **`user_pro_setup`**
   - **Purpose:** Tracks Pro onboarding completion
   - **Schema:**
     - `user_id` (TEXT PRIMARY KEY, FK to users)
     - `has_completed_avatar_setup` (BOOLEAN, default false)
     - `has_completed_brand_setup` (BOOLEAN, default false)
     - `onboarding_completed_at` (TIMESTAMP, nullable)
     - `pro_features_unlocked` (BOOLEAN, default false)
     - `entry_selection` (TEXT: 'just-me' | 'me-product' | 'editing' | 'full-brand')
     - `updated_at` (TIMESTAMP)

**Also Used:**
- **`ai_images`** - Shared table for all generations (Classic + Pro)
  - Pro generations saved with `source = 'studio_pro'` (line 232 in generate-studio-pro/route.ts)
  - `category` field stores mode (e.g., 'brand-scene', 'carousel-slides')

### API Routes

#### Avatar Management
**File:** `app/api/studio-pro/avatar/route.ts`
- **GET:** Fetch user's avatar images
- **POST:** Upload avatar images (single or multiple)
- **DELETE:** Delete avatar image by ID
- **PUT:** Update avatar image order

#### Brand Assets
**File:** `app/api/studio-pro/brand-assets/route.ts`
- **GET:** Fetch user's brand assets
- **POST:** Upload brand asset
- **DELETE:** Delete brand asset by ID

#### Brand Kits
**File:** `app/api/studio-pro/brand-kits/route.ts`
- **GET:** Fetch user's brand kits
- **POST:** Create brand kit
- **PUT:** Update brand kit
- **DELETE:** Delete brand kit

#### Setup Status
**File:** `app/api/studio-pro/setup/route.ts`
- **GET:** Get user's Pro setup status
  - Returns: setup record, avatar count, brand assets count, brand kits count, `canUsePro` boolean
- **POST:** Update setup
  - Body: `{ entrySelection?: string, unlockPro?: boolean }`

#### Workflows
**File:** `app/api/studio-pro/workflows/route.ts`
- **GET:** Fetch user's workflows (filtered by status)
- **POST:** Create new workflow
- **PUT:** Update workflow

#### Generations
**File:** `app/api/studio-pro/generations/route.ts`
- **GET:** Fetch user's Pro generations
  - Query params: `limit` (default 30), `workflowType` (optional filter)
  - Returns: Generations with workflow info joined

#### Generation Routes

1. **Generic Studio Pro Generation**
   - **File:** `app/api/maya/generate-studio-pro/route.ts`
   - **Method:** POST
   - **Body:**
     ```typescript
     {
       mode: StudioProMode,
       userRequest: string,
       inputImages: NanoBananaInputImages,
       resolution?: "1K" | "2K" | "4K",
       aspectRatio?: string
     }
     ```
   - **Returns:** `{ predictionId, status, sceneDescription, creditsDeducted }`
   - **Saves to:** `ai_images` table with `source = 'studio_pro'`

2. **Carousel Generation**
   - **File:** `app/api/studio-pro/generate/carousel/route.ts`
   - **Method:** POST
   - **Body:**
     ```typescript
     {
       topic: string,
       slideCount: number (3-10),
       slideTexts?: string[]
     }
     ```
   - **Process:** Generates each slide sequentially, saves to `pro_generations`
   - **Credits:** 5 per slide

3. **Reel Cover Generation**
   - **File:** `app/api/studio-pro/generate/reel-cover/route.ts`
   - **Method:** POST
   - **Body:**
     ```typescript
     {
       title: string,
       textOverlay?: string,
       workflowId?: number
     }
     ```
   - **Saves to:** `pro_generations` table

4. **Edit/Reuse Generation**
   - **File:** `app/api/studio-pro/generate/edit-reuse/route.ts`
   - **Method:** POST
   - **Body:**
     ```typescript
     {
       baseImageUrl: string,
       editInstruction: string,
       resolution?: "1K" | "2K" | "4K",
       aspectRatio?: string,
       workflowId?: number
     }
     ```
   - **Saves to:** `pro_generations` and `pro_workflows` tables

#### Status Check
**File:** `app/api/maya/check-studio-pro/route.ts`
- **Method:** GET
- **Query:** `predictionId`
- **Returns:** Prediction status from Replicate
- **Updates:** `ai_images` table when completed/failed
- **Uploads:** Result to Vercel Blob for permanence

### Single Source of Truth for Pro User Setup Status

**✅ CONFIRMED: `user_pro_setup` table**

**File:** `app/api/studio-pro/setup/route.ts` (GET endpoint)

**Status Check Logic:**
1. Query `user_pro_setup` table for user
2. Count active avatar images (must be >= 3)
3. Count brand assets (optional)
4. Count brand kits (optional)
5. Return `canUsePro: avatarCount >= 3`

**Key Fields:**
- `pro_features_unlocked` - Boolean flag for Pro access
- `has_completed_avatar_setup` - Avatar upload complete
- `has_completed_brand_setup` - Brand assets complete
- `entry_selection` - User's entry point choice

**Usage:**
- `ProModeWrapper` checks on mount (line 29)
- Determines which view to show (entry/onboarding/dashboard)

---

## D) GENERATION PIPELINE

### Where Replicate Call Happens

**File:** `lib/nano-banana-client.ts`

**Function:** `generateWithNanoBanana(input: NanoBananaInput)`
- **Lines:** 30-132
- **Model:** `"google/nano-banana-pro"` (line 91)
- **Replicate Client:** `getReplicateClient()` from `@/lib/replicate-client`

**Called From:**
1. `app/api/maya/generate-studio-pro/route.ts` (line 153)
2. `app/api/studio-pro/generate/carousel/route.ts` (line 211)
3. `app/api/studio-pro/generate/reel-cover/route.ts` (line 186)
4. `app/api/studio-pro/generate/edit-reuse/route.ts` (line 271)

### Model Configuration

**Model:** `google/nano-banana-pro`
- **Configured in:** `lib/nano-banana-client.ts` line 91
- **Input Parameters:**
  - `prompt` (string) - Natural language prompt
  - `image_input` (string[]) - Up to 14 image URLs
  - `aspect_ratio` ("1:1" | "9:16" | "16:9" | "4:3" | "3:4" | string)
  - `resolution` ("1K" | "2K" | "4K")
  - `output_format` ("jpg" | "png")
  - `safety_filter_level` ("block_only_high" | "block_medium_and_above" | "block_low_and_above")

**No LoRA/Trigger Words:**
- Nano Banana Pro does NOT use user's trained LoRA model
- No trigger words needed
- Uses natural language prompts only

### Request Payload Shape

**Generic Generation** (`/api/maya/generate-studio-pro`):
```typescript
{
  mode: "brand-scene" | "text-overlay" | "transformation" | "educational" | "carousel-slides" | "reel-cover" | "product-mockup" | "ugc-product" | "quote-graphic" | "edit-image" | "change-outfit" | "remove-object" | "reuse-adapt",
  userRequest: string, // User's natural language request
  inputImages: {
    baseImages: Array<{ url: string, type: 'user-photo' | 'reference-photo', description?: string }>,
    productImages?: Array<{ url: string, label: string, brandName?: string }>,
    brandAssets?: Array<{ url: string, label?: string, type?: 'logo' | 'packaging' | 'product' | 'lifestyle' | 'other' }>,
    textElements?: Array<{ text: string, style: 'headline' | 'body' | 'quote' | 'caption', language?: string }>
  },
  resolution?: "1K" | "2K" | "4K", // Default: "2K"
  aspectRatio?: string // Default: "1:1"
}
```

**Carousel Generation** (`/api/studio-pro/generate/carousel`):
```typescript
{
  topic: string,
  slideCount: number, // 3-10
  slideTexts?: string[] // Optional text for each slide
}
```

**Reel Cover** (`/api/studio-pro/generate/reel-cover`):
```typescript
{
  title: string,
  textOverlay?: string,
  workflowId?: number
}
```

**Edit/Reuse** (`/api/studio-pro/generate/edit-reuse`):
```typescript
{
  baseImageUrl: string,
  editInstruction: string,
  resolution?: "1K" | "2K" | "4K",
  aspectRatio?: string,
  workflowId?: number
}
```

### How Images Are Selected/Passed

**Avatar Images (Base Images):**
- **Source:** `user_avatar_images` table
- **Selection:** Active images ordered by `display_order`, `uploaded_at` (limit 5)
- **Used in:** Carousel, reel-cover, edit-reuse routes
- **Query:** Lines 66-72 in carousel route, similar in others

**Product Images:**
- **Source:** `brand_assets` table OR user uploads
- **Selection:** Filtered by `asset_type = 'product'` and `is_active = true`
- **Passed as:** `inputImages.productImages` array

**Gallery Images:**
- **Source:** `ai_images` table (all user's previous generations)
- **API:** `/api/gallery/images`
- **Used in:** Edit/reuse workflow for selecting base image

**Uploaded Images:**
- **Frontend:** Stored in `uploadedImages` state (maya-chat-screen.tsx line 89)
- **Persisted:** localStorage as `'mayaStudioProImages'`
- **Types:** `'base' | 'product'` with optional `label` and `source: 'gallery' | 'upload'`

**Image Collection Flow:**
1. User uploads/selects images in Pro mode UI
2. Images stored in `uploadedImages` state
3. On generation, images passed as `inputImages` to API
4. API collects avatar images from DB + uploaded images
5. Combined into `image_input` array (max 14) for Nano Banana

### Polling Implementation

**Where Polling Happens:**
- **Frontend:** `components/sselfie/maya-chat-screen.tsx` (lines 1837-1904)
- **Function:** `pollStudioProStatus(predictionId: string)`

**Polling Logic:**
- **Max Attempts:** 60 (5 minutes total)
- **Interval:** 5 seconds between checks
- **Endpoint:** `/api/maya/check-studio-pro?predictionId={id}`
- **Status Check:** Uses `checkNanoBananaPrediction()` from `lib/nano-banana-client.ts`

**Status Storage:**
- **Database:** `ai_images` table
  - `generation_status`: 'processing' | 'completed' | 'failed'
  - Updated by `/api/maya/check-studio-pro` route (lines 70-88)

**Polling Flow:**
1. Generation starts → `predictionId` returned
2. Frontend calls `pollStudioProStatus(predictionId)`
3. Every 5 seconds: GET `/api/maya/check-studio-pro?predictionId={id}`
4. Backend checks Replicate prediction status
5. If `succeeded`: Upload to Vercel Blob, update `ai_images` table
6. Frontend receives status, updates chat message with result
7. Polling stops when `succeeded` or `failed`

**⚠️ RISK:** No cleanup on component unmount - could cause memory leak

### Output Handling

**Where Results Are Saved:**

1. **`ai_images` Table** (Primary)
   - **File:** `app/api/maya/generate-studio-pro/route.ts` (lines 214-236)
   - **Fields:**
     - `user_id`
     - `image_url` (empty initially, filled when complete)
     - `prompt` (user's request)
     - `generated_prompt` (optimized prompt from builder)
     - `prediction_id`
     - `generation_status` ('processing' initially)
     - `source` ('studio_pro')
     - `category` (mode, e.g., 'brand-scene')
   - **Updated:** By `/api/maya/check-studio-pro` when generation completes (lines 70-77)

2. **`pro_generations` Table** (Workflow-specific)
   - **File:** Used by carousel, reel-cover, edit-reuse routes
   - **Fields:**
     - `image_urls` (TEXT[] - array of URLs)
     - `prompt_used`
     - `workflow_id` (links to pro_workflows)
     - `parent_generation_id` (for edits/variants)

3. **Vercel Blob Storage**
   - **File:** `app/api/maya/check-studio-pro/route.ts` (lines 46-67)
   - **Path:** `studio-pro/{userId}/{predictionId}-{timestamp}.png`
   - **Purpose:** Permanent storage (Replicate URLs are temporary)

**Where Results Are Returned to UI:**

1. **Status Check Endpoint** (`/api/maya/check-studio-pro`)
   - Returns: `{ predictionId, status, output: imageUrl }`
   - Called by polling function

2. **Chat Message Update**
   - **File:** `components/sselfie/maya-chat-screen.tsx` (lines 1857-1878)
   - **Method:** Updates last assistant message with `studio-pro-result` part
   - **Part Structure:**
     ```typescript
     {
       type: 'studio-pro-result',
       output: {
         state: 'ready',
         imageUrl: string
       }
     }
     ```

**How Results Show Up in Chat:**

1. Generation starts → Loading message appears
2. Polling begins → Status checked every 5 seconds
3. When complete → Message updated with result part
4. **Rendering:** Lines 2958-3000 in maya-chat-screen.tsx
   - Checks `part.type === "studio-pro-result"`
   - Renders image preview with download button
   - Shows "Studio Pro" badge

**Result Display:**
- Image preview (aspect-square, rounded)
- "Studio Pro" label
- Download button (opens image in new tab)

---

## E) GAPS VS NEW "WORKBENCH" UX

### What We KEEP (Good Reusable Parts)

1. **Nano Banana Client** (`lib/nano-banana-client.ts`)
   - **Keep because:** Core generation logic is solid, well-tested
   - **Reuse:** `generateWithNanoBanana()`, `checkNanoBananaPrediction()`, credit cost functions

2. **Prompt Builder** (`lib/maya/nano-banana-prompt-builder.ts`)
   - **Keep because:** Intelligent prompt optimization logic
   - **Refactor:** Simplify to workbench mode (remove workflow complexity)

3. **Database Tables**
   - **Keep:** `user_avatar_images`, `brand_assets`, `brand_kits` (for persistent inputs)
   - **Keep:** `ai_images` table (shared with Classic)
   - **Deprecate:** `pro_workflows`, `pro_generations` (over-engineered for workbench)

4. **Avatar/Brand Asset APIs**
   - **Keep:** `/api/studio-pro/avatar`, `/api/studio-pro/brand-assets`, `/api/studio-pro/brand-kits`
   - **Reason:** Needed for persistent input boxes

5. **Status Check Endpoint**
   - **Keep:** `/api/maya/check-studio-pro`
   - **Reason:** Polling mechanism works well

6. **Credit System Integration**
   - **Keep:** Credit deduction/refund logic
   - **Reason:** Already working correctly

### What We DEPRECATE/REMOVE (Over-Engineered Parts)

1. **Onboarding Flow** (`components/studio-pro/onboarding-flow.tsx`)
   - **Remove because:** Workbench doesn't need multi-step onboarding
   - **Replace with:** Simple "upload 3+ images" check

2. **Pro Dashboard** (`components/studio-pro/pro-dashboard.tsx`)
   - **Remove because:** Workbench doesn't need quick action cards
   - **Replace with:** Simple workbench UI in chat

3. **Pro Entry Flow** (`components/studio-pro/pro-entry-flow.tsx`)
   - **Remove because:** Entry selection not needed for workbench
   - **Replace with:** Direct toggle to Pro mode

4. **Pro Mode Wrapper** (`components/studio-pro/pro-mode-wrapper.tsx`)
   - **Remove because:** Orchestrates onboarding/dashboard/workflows
   - **Replace with:** Simple workbench UI in chat screen

5. **Workflow Components**
   - **Remove:** `components/studio-pro/workflows/edit-reuse-workflow.tsx`
   - **Remove:** All workflow-specific generation routes (carousel, reel-cover, edit-reuse)
   - **Reason:** Workbench uses single generation endpoint with user-selected mode

6. **Workflow Tables**
   - **Deprecate:** `pro_workflows` table (not needed for workbench)
   - **Deprecate:** `pro_generations` table (use `ai_images` only)
   - **Keep for migration:** Don't delete, but stop using

7. **Workflow APIs**
   - **Remove:** `/api/studio-pro/workflows` (not needed)
   - **Remove:** `/api/studio-pro/generate/carousel`
   - **Remove:** `/api/studio-pro/generate/reel-cover`
   - **Remove:** `/api/studio-pro/generate/edit-reuse`
   - **Keep:** Single `/api/maya/generate-studio-pro` endpoint

8. **Setup Status Complexity**
   - **Simplify:** `user_pro_setup` table - only need `pro_features_unlocked` and avatar count
   - **Remove:** Entry selection, brand setup flags (not needed)

9. **Pro System Prompt Complexity**
   - **Simplify:** `lib/maya/studio-pro-system-prompt.ts`
   - **Remove:** Workflow guidance, mode-specific instructions
   - **Keep:** Basic Pro capabilities explanation

### What We REFACTOR (Keep But Simplify)

1. **Maya Chat Screen Pro UI** (`components/sselfie/maya-chat-screen.tsx`)
   - **Refactor because:** Current Pro UI is complex (onboarding, dashboard, workflows)
   - **New:** Simple workbench with:
     - Persistent input boxes (3 image slots)
     - Prompt input box
     - Generate button
     - Results in chat

2. **Prompt Builder** (`lib/maya/nano-banana-prompt-builder.ts`)
   - **Refactor because:** Currently workflow-driven with complex mode logic
   - **Simplify:** Accept user prompt + selected images, return optimized prompt
   - **Remove:** Workflow mode detection, complex scene composition logic

3. **Generation Endpoint** (`app/api/maya/generate-studio-pro/route.ts`)
   - **Refactor because:** Currently expects workflow mode
   - **Simplify:** Accept prompt + images, build prompt, generate
   - **Remove:** Mode-specific logic (let prompt builder handle it)

4. **Pro Mode Toggle**
   - **Refactor because:** Currently shows full Pro UI overlay
   - **New:** Toggle shows/hides workbench strip in chat

5. **Image Selection UI**
   - **Refactor because:** Currently complex gallery selector + upload
   - **Simplify:** 3 persistent input boxes (Box1, Box2, Box3) with:
     - Click to select from gallery
     - Drag-drop upload
     - Clear button
     - Image preview thumbnail

### What We BUILD NEW (Minimal)

1. **Persistent Input Strip Component**
   - **File:** `components/studio-pro/workbench-input-strip.tsx`
   - **Features:**
     - 3 image input boxes (Box1, Box2, Box3)
     - Each box: thumbnail + select/clear buttons
     - Gallery selector modal (reuse existing)
     - Upload handler (reuse existing)
   - **State:** Persisted in localStorage (like current `uploadedImages`)

2. **Prompt Box Component**
   - **File:** `components/studio-pro/workbench-prompt-box.tsx`
   - **Features:**
     - Textarea for user prompt
     - "Generate" button
     - Disabled state when no images selected
   - **Integration:** Sends to `/api/maya/generate-studio-pro` with selected images

3. **Chat Message Format for Maya Prompt Suggestions**
   - **New Part Type:** `maya-prompt-suggestions`
   - **Structure:**
     ```typescript
     {
       type: 'maya-prompt-suggestions',
       suggestions: Array<{
         label: string,
         prompt: string,
         copyable: true
       }>
     }
     ```
   - **Rendering:** Show 1-3 prompt cards with copy button
   - **Source:** Maya suggests prompts in chat, user copies to prompt box

4. **Result Preview in Chat**
   - **Reuse:** Existing `studio-pro-result` part type
   - **Enhancement:** Add "Use in Box1/Box2/Box3" buttons for reuse
   - **Display:** Image preview with download + reuse options

5. **Simplified Pro Mode UI**
   - **Location:** `components/sselfie/maya-chat-screen.tsx`
   - **New Layout:**
     ```
     [Chat Messages]
     [Workbench Input Strip - 3 boxes]
     [Prompt Box + Generate Button]
     ```
   - **Toggle:** Show/hide workbench strip (don't replace entire UI)

---

## F) PROPOSED MAPPING (NO CODE YET)

### Clean Folder/File Layout for Simplified Pro Workbench

```
components/
  studio-pro/
    workbench-input-strip.tsx          # NEW: 3 persistent image boxes
    workbench-prompt-box.tsx            # NEW: Prompt input + generate button
    workbench-result-card.tsx            # NEW: Result display with reuse buttons
    # REMOVE: onboarding-flow.tsx
    # REMOVE: pro-dashboard.tsx
    # REMOVE: pro-entry-flow.tsx
    # REMOVE: pro-mode-wrapper.tsx
    # REMOVE: workflows/edit-reuse-workflow.tsx
    # KEEP: pro-asset-gallery.tsx (for selecting from gallery)

app/api/
  studio-pro/
    avatar/route.ts                     # KEEP: Image upload/management
    brand-assets/route.ts               # KEEP: Brand asset management
    brand-kits/route.ts                # KEEP: Brand kit management
    setup/route.ts                     # SIMPLIFY: Remove entry selection logic
    generations/route.ts                # KEEP: Fetch user's Pro generations
    # REMOVE: workflows/route.ts
    # REMOVE: generate/carousel/route.ts
    # REMOVE: generate/reel-cover/route.ts
    # REMOVE: generate/edit-reuse/route.ts

  maya/
    generate-studio-pro/route.ts        # REFACTOR: Simplify to accept prompt + images
    check-studio-pro/route.ts           # KEEP: Status polling

lib/
  maya/
    nano-banana-prompt-builder.ts       # REFACTOR: Simplify mode logic
    studio-pro-system-prompt.ts         # SIMPLIFY: Remove workflow guidance
    # KEEP: flux-prompt-builder.ts (Classic mode, no changes)

  nano-banana-client.ts                # KEEP: Core generation logic
```

### Component Integration Points

**Maya Chat Screen Integration:**
- **File:** `components/sselfie/maya-chat-screen.tsx`
- **Changes:**
  1. Remove Pro mode overlay (lines 2099-2151)
  2. Add workbench strip below chat (conditional on `studioProMode`)
  3. Keep Pro mode toggle in header
  4. Keep message rendering (add prompt suggestions part type)

**Chat Message Flow:**
1. User toggles Pro mode → Workbench strip appears
2. User selects images in Box1/Box2/Box3
3. User asks Maya for prompt suggestions → Maya responds with `maya-prompt-suggestions` part
4. User copies prompt to prompt box
5. User clicks Generate → Calls `/api/maya/generate-studio-pro`
6. Result appears in chat as `studio-pro-result` part
7. User can reuse result in input boxes

### Classic Mode Safety

**Guarantees:**
1. **Flux Prompt Builder:** Never imported by Pro routes
2. **Trigger Words:** Only used in Classic generation (`app/api/maya/generate-image/route.ts`)
3. **Mode Detection:** Header-based (`x-studio-pro-mode`) is primary, intent is secondary
4. **Component Props:** Explicitly pass `studioProMode={false}` for Classic concept cards
5. **State Isolation:** Pro state (`uploadedImages`) only used when `studioProMode === true`

---

## TOP 5 RISKS

1. **🔴 Concept Card Mode Leak**
   - **Risk:** `studioProMode` prop accidentally true in Classic mode
   - **Impact:** Classic concepts use Pro generation (wrong model, wrong prompt style)
   - **Mitigation:** Explicit prop validation, default to false

2. **🔴 Chat Route Intent Misclassification**
   - **Risk:** Classic messages with Pro keywords trigger Pro system prompt
   - **Impact:** Wrong personality, wrong capabilities shown
   - **Mitigation:** Header check must be primary, intent only if header missing

3. **🟡 Polling Memory Leak**
   - **Risk:** `pollStudioProStatus()` continues after component unmount
   - **Impact:** Memory leak, unnecessary API calls
   - **Mitigation:** Add cleanup in useEffect return, use AbortController

4. **🟡 localStorage Hydration Mismatch**
   - **Risk:** SSR renders with default state, client loads from localStorage
   - **Impact:** Flash of wrong UI, potential errors
   - **Mitigation:** Use `useEffect` for localStorage access, show loading state

5. **🟡 Pro State Persistence**
   - **Risk:** `studioProMode` state persists incorrectly after logout/login
   - **Impact:** User sees Pro UI when they shouldn't
   - **Mitigation:** Clear Pro state on logout, validate on mount

---

## TOP 5 QUICK WINS

1. **✅ Simplify Pro Mode Toggle**
   - **Current:** Full UI overlay replacement
   - **Change:** Show/hide workbench strip in chat
   - **Effort:** Low (modify maya-chat-screen.tsx conditional rendering)
   - **Impact:** Immediate UX improvement

2. **✅ Remove Onboarding Complexity**
   - **Current:** Multi-step onboarding flow
   - **Change:** Simple "upload 3 images" check
   - **Effort:** Low (remove onboarding-flow.tsx, simplify setup check)
   - **Impact:** Faster Pro mode entry

3. **✅ Consolidate Generation Endpoints**
   - **Current:** 4 separate generation routes (carousel, reel-cover, edit-reuse, generic)
   - **Change:** Single `/api/maya/generate-studio-pro` endpoint
   - **Effort:** Medium (refactor routes, update frontend calls)
   - **Impact:** Simpler architecture, easier maintenance

4. **✅ Simplify Prompt Builder**
   - **Current:** Complex workflow mode detection and scene composition
   - **Change:** Accept user prompt + images, return optimized prompt
   - **Effort:** Medium (refactor buildNanoBananaPrompt function)
   - **Impact:** More flexible, easier to extend

5. **✅ Add Prompt Suggestions in Chat**
   - **Current:** Maya suggests in text, user must copy manually
   - **Change:** Maya sends `maya-prompt-suggestions` part with copyable prompts
   - **Effort:** Low (add part type, render component)
   - **Impact:** Better UX, clearer workflow

---

## SUMMARY

**Current State:**
- Over-engineered with workflows, onboarding, dashboards
- Complex mode detection and routing
- Multiple generation endpoints for different workflows
- Heavy UI components (onboarding, dashboard, workflow forms)

**Target State (Workbench):**
- Simple chat + workbench strip
- 3 persistent image input boxes
- Prompt box with generate button
- Maya suggests prompts in chat (copyable)
- Results appear in chat, reusable in input boxes
- Single generation endpoint

**Key Separations:**
- ✅ Classic uses Flux prompt builder + trigger words
- ✅ Pro uses Nano Banana prompt builder (no trigger words)
- ✅ Routes are separate (no shared generation logic)
- ⚠️ Chat route is shared (needs careful mode detection)

**Migration Path:**
1. Build new workbench components
2. Simplify generation endpoint
3. Refactor prompt builder
4. Update chat screen to show workbench strip
5. Remove old workflow components
6. Test Classic mode isolation

---

**END OF REPORT**


