# STUDIO PRO → WORKBENCH SIMPLIFICATION PLAN
## Step-by-Step Refactor Plan (NO CODE YET)

**Date:** 2025-01-XX  
**Purpose:** Safe migration from workflow-heavy Studio Pro to simple Workbench UX  
**Status:** PLANNING ONLY - NO IMPLEMENTATION

---

## PART 1 — FREEZE & ISOLATE

### Files That MUST NOT Be Modified

#### Classic Mode Generation (CRITICAL - DO NOT TOUCH)

1. **`app/api/maya/generate-image/route.ts`**
   - **Why:** Classic mode generation endpoint
   - **Uses:** FluxPromptBuilder, user's LoRA model, trigger words
   - **Action:** FREEZE - No changes allowed
   - **Guard:** Add comment at top: `// CLASSIC MODE - DO NOT MODIFY FOR PRO REFACTOR`

2. **`lib/maya/flux-prompt-builder.ts`**
   - **Why:** Classic mode prompt generation with trigger words
   - **Uses:** User trigger token, LoRA scale, Instagram aesthetics
   - **Action:** FREEZE - No changes allowed
   - **Guard:** Add comment: `// CLASSIC MODE ONLY - DO NOT IMPORT IN PRO ROUTES`

3. **`app/api/studio/generate/route.ts`**
   - **Why:** Studio screen generation (Classic mode)
   - **Uses:** FluxPromptBuilder, user's trained model
   - **Action:** FREEZE - No changes allowed

4. **`app/api/maya/generate-concepts/route.ts`**
   - **Why:** Concept generation for Classic mode
   - **Uses:** FluxPromptBuilder for concept prompts
   - **Action:** FREEZE - No changes allowed

5. **`app/api/blueprint/generate-concept-image/route.ts`**
   - **Why:** Blueprint concept generation (Classic)
   - **Uses:** FLUX.1 Dev model directly
   - **Action:** FREEZE - No changes allowed

#### Classic Concept Cards (CRITICAL - CAREFUL MODIFICATION)

6. **`components/sselfie/concept-card.tsx`**
   - **Why:** Shared component used by both Classic and Pro
   - **Current:** Line 116 checks `studioProMode` prop to choose endpoint
   - **Action:** MODIFY CAREFULLY - Must preserve Classic behavior
   - **Guard Required:**
     - Ensure `studioProMode` prop defaults to `false`
     - Add explicit check: `if (studioProMode === true)` before Pro logic
     - Add comment: `// CLASSIC MODE: studioProMode must be false or undefined`

#### Credit System (SHARED - NO MODIFICATIONS)

7. **`lib/credits.ts`**
   - **Why:** Shared credit operations (Classic + Pro)
   - **Action:** FREEZE - No mode-specific changes
   - **Note:** Already safe - no mode logic

8. **`lib/credits-cached.ts`**
   - **Why:** Cached credit operations
   - **Action:** FREEZE - No changes

#### Database Tables (SHARED - READ ONLY)

9. **`ai_images` table usage**
   - **Why:** Shared table for Classic and Pro generations
   - **Action:** MODIFY CAREFULLY - Pro writes must not affect Classic reads
   - **Guard:** Ensure `source` field distinguishes Classic vs Pro
   - **Current:** Pro uses `source = 'studio_pro'` (line 232 in generate-studio-pro/route.ts)
   - **Action:** Verify this is consistent, add validation if needed

#### User Context (SHARED - MINIMAL MODIFICATIONS)

10. **`lib/maya/get-user-context.ts`**
    - **Why:** User data fetching for Maya personality
    - **Current:** Line 31 loads brand assets (Pro-specific)
    - **Action:** MODIFY CAREFULLY - Only load brand assets when Pro mode
    - **Guard:** Add mode parameter or check before loading brand assets

### Shared Files Between Classic and Pro

#### High-Risk Shared Files (Require Hard Guards)

1. **`app/api/maya/chat/route.ts`**
   - **Shared:** Entire route handler
   - **Conditional:** System prompt selection (line 488)
   - **Risk Level:** 🔴 HIGH
   - **Hard Guards Required:**
     - Header check (`x-studio-pro-mode`) MUST be primary
     - Intent detection (`detectStudioProIntent`) MUST be secondary
     - Add validation: If header is missing or false, force Classic mode
     - Add logging: Log mode detection decision for debugging

2. **`components/sselfie/maya-chat-screen.tsx`**
   - **Shared:** Message rendering, chat UI, concept cards
   - **Conditional:** Pro mode UI overlay, Pro controls strip
   - **Risk Level:** 🔴 HIGH
   - **Hard Guards Required:**
     - `studioProMode` state must be explicitly boolean (never undefined)
     - Header sent only when `studioProMode === true`
     - Message rendering: Check `studioProMode` before rendering Pro parts
     - Add validation: `if (studioProMode !== true && studioProMode !== false) { setStudioProMode(false) }`

3. **`components/sselfie/concept-card.tsx`**
   - **Shared:** Component used by both modes
   - **Conditional:** `studioProMode` prop changes generation endpoint
   - **Risk Level:** 🔴 HIGH
   - **Hard Guards Required:**
     - Prop default: `studioProMode = false` (line 18)
     - Explicit check: `if (studioProMode === true)` before Pro logic
     - Add validation: Log warning if prop is undefined
     - Add comment: `// CLASSIC MODE DEFAULT - Only use Pro if explicitly true`

#### Medium-Risk Shared Files

4. **`lib/maya/get-user-context.ts`**
   - **Shared:** User data fetching
   - **Conditional:** Brand assets loading (line 31)
   - **Risk Level:** 🟡 MEDIUM
   - **Guards Required:**
     - Only load brand assets when explicitly requested (add parameter)
     - Don't load in Classic mode (performance optimization)

5. **`lib/maya/personality.ts`**
   - **Shared:** Maya personality definitions
   - **Conditional:** None (safe)
   - **Risk Level:** 🟢 LOW
   - **Action:** No guards needed

### Guarantees for Classic Safety

#### Guarantee 1: Import Isolation
- **Rule:** Pro routes MUST NOT import `flux-prompt-builder.ts`
- **Enforcement:** Add ESLint rule or TypeScript path restriction
- **Files to Check:**
  - `app/api/maya/generate-studio-pro/route.ts` ✅ (already safe)
  - `app/api/studio-pro/generate/*/route.ts` ✅ (already safe)
  - `lib/maya/nano-banana-prompt-builder.ts` ✅ (already safe)

#### Guarantee 2: Header-Based Mode Detection
- **Rule:** Header `x-studio-pro-mode` is the single source of truth
- **Enforcement:** In `app/api/maya/chat/route.ts`:
  ```typescript
  // PRIMARY: Header check (most reliable)
  const hasStudioProHeader = req.headers.get("x-studio-pro-mode") === "true"
  
  // SECONDARY: Intent detection (only if header missing)
  const studioProIntent = hasStudioProHeader ? { isStudioPro: true } : detectStudioProIntent(lastMessageText)
  
  // FINAL: Use header if present, otherwise intent
  const isStudioProMode = hasStudioProHeader || (studioProIntent.isStudioPro && !hasStudioProHeader)
  ```

#### Guarantee 3: Component Prop Validation
- **Rule:** `studioProMode` prop must be explicitly boolean
- **Enforcement:** In `components/sselfie/concept-card.tsx`:
  ```typescript
  // Normalize prop to boolean
  const isProMode = studioProMode === true
  
  // Use isProMode (never raw prop) for conditionals
  if (isProMode) {
    // Pro logic
  } else {
    // Classic logic (default)
  }
  ```

#### Guarantee 4: State Isolation
- **Rule:** Pro state (`uploadedImages`, `studioProMode`) only used when mode is active
- **Enforcement:** In `components/sselfie/maya-chat-screen.tsx`:
  ```typescript
  // Only send Pro header when explicitly in Pro mode
  const headers = {
    "x-studio-pro-mode": studioProMode === true ? "true" : "false"
  }
  
  // Only render Pro UI when mode is true
  {studioProMode === true && <ProWorkbench />}
  ```

#### Guarantee 5: Database Source Field
- **Rule:** All Pro generations must have `source = 'studio_pro'`
- **Enforcement:** In `app/api/maya/generate-studio-pro/route.ts`:
  ```typescript
  // Always set source for Pro
  source: 'studio_pro' // Hard-coded, never variable
  ```

### Hard Guards to Add

1. **TypeScript Type Guard**
   - **File:** `lib/maya/type-guards.ts` (NEW)
   - **Purpose:** Validate mode flags
   - **Function:**
     ```typescript
     export function isStudioProMode(mode: unknown): mode is boolean {
       return mode === true || mode === false
     }
     ```

2. **Runtime Validation**
   - **File:** `app/api/maya/chat/route.ts`
   - **Location:** Before system prompt selection
   - **Code:**
     ```typescript
     // Validate mode detection
     if (typeof isStudioProMode !== 'boolean') {
       console.error('[SAFETY] Invalid mode detected, defaulting to Classic')
       isStudioProMode = false
     }
     ```

3. **Component Prop Validation**
   - **File:** `components/sselfie/concept-card.tsx`
   - **Location:** Component start
   - **Code:**
     ```typescript
     // Validate prop
     if (studioProMode !== undefined && studioProMode !== true && studioProMode !== false) {
       console.warn('[SAFETY] Invalid studioProMode prop, defaulting to Classic')
       studioProMode = false
     }
     ```

---

## PART 2 — DEPRECATION MAP (NO DELETIONS YET)

### Component Deprecation Table

| File Path | Current Purpose | Action | Reason |
|-----------|----------------|--------|--------|
| `components/studio-pro/onboarding-flow.tsx` | Multi-step onboarding (avatar, brand assets, brand kit) | **DEPRECATE** | Workbench doesn't need onboarding - simple image upload check |
| `components/studio-pro/pro-dashboard.tsx` | Quick action cards (carousel, reel-cover, etc.) | **DEPRECATE** | Workbench doesn't need dashboard - actions in chat |
| `components/studio-pro/pro-entry-flow.tsx` | Entry selection screen (just-me, me-product, editing, full-brand) | **DEPRECATE** | Workbench doesn't need entry selection - direct toggle |
| `components/studio-pro/pro-mode-wrapper.tsx` | Orchestrates onboarding → dashboard → workflows | **DEPRECATE** | Workbench is simpler - no orchestration needed |
| `components/studio-pro/workflows/edit-reuse-workflow.tsx` | Form-based edit/reuse workflow | **DEPRECATE** | Workbench uses chat + prompt box instead |
| `components/studio-pro/pro-asset-gallery.tsx` | Gallery view of Pro generations | **KEEP** | Reuse for image selection in workbench boxes |
| `components/sselfie/maya-chat-screen.tsx` | Chat screen with Pro mode overlay | **REFACTOR** | Replace overlay with workbench strip |

### API Route Deprecation Table

| File Path | Current Purpose | Action | Reason |
|-----------|----------------|--------|--------|
| `app/api/studio-pro/setup/route.ts` | Setup status, entry selection, unlock Pro | **SIMPLIFY** | Remove entry selection logic, keep status check |
| `app/api/studio-pro/workflows/route.ts` | CRUD for pro_workflows table | **DEPRECATE** | Workbench doesn't use workflows |
| `app/api/studio-pro/generate/carousel/route.ts` | Carousel slide generation | **DEPRECATE** | Use single `/api/maya/generate-studio-pro` instead |
| `app/api/studio-pro/generate/reel-cover/route.ts` | Reel cover generation | **DEPRECATE** | Use single `/api/maya/generate-studio-pro` instead |
| `app/api/studio-pro/generate/edit-reuse/route.ts` | Edit/reuse generation | **DEPRECATE** | Use single `/api/maya/generate-studio-pro` instead |
| `app/api/maya/generate-studio-pro/route.ts` | Generic Studio Pro generation | **REFACTOR** | Simplify to accept prompt + images, remove mode complexity |
| `app/api/maya/check-studio-pro/route.ts` | Status polling for Pro generations | **KEEP** | Still needed for polling |
| `app/api/studio-pro/avatar/route.ts` | Avatar image management | **KEEP** | Needed for persistent input boxes |
| `app/api/studio-pro/brand-assets/route.ts` | Brand asset management | **KEEP** | Needed for product images in boxes |
| `app/api/studio-pro/brand-kits/route.ts` | Brand kit management | **KEEP** | Needed for prompt context |
| `app/api/studio-pro/generations/route.ts` | Fetch Pro generations | **KEEP** | Needed for gallery selection |

### Library File Deprecation Table

| File Path | Current Purpose | Action | Reason |
|-----------|----------------|--------|--------|
| `lib/maya/nano-banana-prompt-builder.ts` | Complex workflow-based prompt building | **REFACTOR** | Simplify to accept user prompt + images, return optimized prompt |
| `lib/maya/studio-pro-system-prompt.ts` | Pro system prompt with workflow guidance | **SIMPLIFY** | Remove workflow instructions, keep basic Pro capabilities |
| `lib/nano-banana-client.ts` | Nano Banana Pro API client | **KEEP** | Core generation logic, well-tested |

### Database Table Deprecation Table

| Table Name | Current Purpose | Action | Reason |
|------------|----------------|--------|--------|
| `user_avatar_images` | Persistent identity images | **KEEP** | Needed for persistent input boxes |
| `brand_assets` | Product images, logos | **KEEP** | Needed for product images in boxes |
| `brand_kits` | Brand styling preferences | **KEEP** | Needed for prompt context |
| `user_pro_setup` | Onboarding completion tracking | **SIMPLIFY** | Remove entry_selection, keep pro_features_unlocked |
| `user_pro_preferences` | Learned preferences | **FREEZE** | Not actively used, leave for future |
| `pro_workflows` | Active workflow tracking | **DEPRECATE** | Workbench doesn't use workflows - leave table intact |
| `pro_generations` | Pro generations with revisions | **DEPRECATE** | Use `ai_images` table only - leave table intact |
| `ai_images` | All generations (Classic + Pro) | **KEEP** | Shared table, must continue using |

### Deprecation Notes

**⚠️ IMPORTANT:**
- **DEPRECATE** means: Stop using in new code, leave files/tables intact
- **DO NOT DELETE** deprecated files/tables until migration is complete
- **DO NOT REMOVE** deprecated routes until all clients migrated
- **MIGRATION PERIOD:** Keep deprecated code for 2-4 weeks after workbench launch

**Migration Strategy:**
1. Build workbench alongside existing Pro UI
2. Feature flag: `ENABLE_WORKBENCH_MODE` (default: false)
3. Users can opt-in to workbench
4. After validation, make workbench default
5. After 2-4 weeks, remove deprecated code

---

## PART 3 — WORKBENCH BUILD PLAN (HIGH LEVEL)

### A) UI LAYER

#### Workbench Location

**File:** `components/sselfie/maya-chat-screen.tsx`

**Current Structure:**
```
[Maya Chat Screen]
  ├── [Header with Pro Toggle]
  ├── [Pro Mode Overlay] ← REMOVE
  │   └── ProModeWrapper
  │       ├── ProEntryFlow
  │       ├── OnboardingFlow
  │       └── ProDashboard
  └── [Chat Messages]
      └── [Pro Controls Strip] ← REFACTOR
```

**New Structure:**
```
[Maya Chat Screen]
  ├── [Header with Pro Toggle]
  ├── [Chat Messages]
  │   └── [Message Parts]
  │       ├── text
  │       ├── tool-generateConcepts
  │       ├── maya-prompt-suggestions ← NEW
  │       └── studio-pro-result
  └── [Workbench Strip] ← NEW (conditional on studioProMode)
      ├── [Image Input Strip]
      │   ├── Box1
      │   ├── Box2
      │   └── Box3
      ├── [Prompt Box]
      │   ├── Textarea
      │   └── Generate Button
      └── [Status Indicator] (optional)
```

#### Component Responsibilities

**1. Image Input Strip Component**
- **File:** `components/studio-pro/workbench-input-strip.tsx` (NEW)
- **Purpose:** Persistent image selection boxes
- **Structure:**
  - 3 input boxes (Box1, Box2, Box3)
  - Each box:
    - Thumbnail preview (if image selected)
    - Click to select from gallery
    - Drag-drop upload
    - Clear button (X)
    - Empty state: "+ Add Image"
  - Image count indicator: "X / 3 images"
- **State Management:**
  - Local state: `selectedImages: Array<{ box: 1|2|3, url: string, type: 'base'|'product' }>`
  - Persisted: localStorage key `'workbench-selected-images'`
  - Sync: On mount, load from localStorage
- **APIs Used:**
  - `/api/gallery/images` - Gallery selection modal
  - `/api/studio-pro/avatar` - Upload new images
- **Reused Components:**
  - Gallery selector modal (from existing Pro UI)
  - Image upload handler (from maya-chat-screen.tsx)

**2. Prompt Box Component**
- **File:** `components/studio-pro/workbench-prompt-box.tsx` (NEW)
- **Purpose:** User prompt input and generation trigger
- **Structure:**
  - Textarea (multi-line, auto-resize)
  - Placeholder: "Paste your prompt here, or ask Maya for suggestions..."
  - Generate button (disabled if no images selected)
  - Character count (optional)
- **State Management:**
  - Local state: `prompt: string`
  - Not persisted (user types fresh each time)
- **Behavior:**
  - Disabled state: No images in any box
  - Loading state: Generation in progress
  - Error state: Show error message
- **API Call:**
  - POST `/api/maya/generate-studio-pro`
  - Body: `{ prompt, inputImages, resolution, aspectRatio }`

**3. Result Preview Card Component**
- **File:** `components/studio-pro/workbench-result-card.tsx` (NEW)
- **Purpose:** Display generation result with reuse options
- **Structure:**
  - Image preview (aspect-square, rounded)
  - "Studio Pro" badge
  - Action buttons:
    - Download
    - Use in Box1
    - Use in Box2
    - Use in Box3
  - Metadata: Resolution, credits used
- **Rendering:**
  - Rendered in chat as `studio-pro-result` part type
  - Reuses existing rendering logic (lines 2958-3000 in maya-chat-screen.tsx)
  - Enhanced with reuse buttons

**4. Workbench Strip Container**
- **File:** `components/studio-pro/workbench-strip.tsx` (NEW)
- **Purpose:** Container for workbench components
- **Structure:**
  - Wraps Image Input Strip + Prompt Box
  - Conditional rendering: Only when `studioProMode === true`
  - Styling: Fixed/sticky at bottom of chat (above input)
- **Integration:**
  - Imported in `maya-chat-screen.tsx`
  - Rendered conditionally: `{studioProMode && <WorkbenchStrip />}`

#### Component Reuse

**Reused from Existing Code:**
1. **Gallery Selector Modal**
   - **Source:** Existing Pro UI (pro-asset-gallery.tsx or similar)
   - **Purpose:** Select images from gallery
   - **Modification:** Minimal - ensure it works with workbench boxes

2. **Image Upload Handler**
   - **Source:** `maya-chat-screen.tsx` (lines 1466-1512)
   - **Purpose:** Handle file uploads
   - **Modification:** Extract to shared utility or reuse directly

3. **Status Polling Logic**
   - **Source:** `maya-chat-screen.tsx` (lines 1837-1904)
   - **Purpose:** Poll generation status
   - **Modification:** Extract to hook or utility function

4. **Result Rendering**
   - **Source:** `maya-chat-screen.tsx` (lines 2958-3000)
   - **Purpose:** Render `studio-pro-result` parts
   - **Modification:** Enhance with reuse buttons

### B) CHAT LAYER

#### New Message Part Types

**1. `maya-prompt-suggestions` Part Type**

**Structure:**
```typescript
{
  type: 'maya-prompt-suggestions',
  suggestions: Array<{
    id: string,
    label: string,        // e.g., "Option 1: Brand Scene"
    prompt: string,       // Full prompt text
    preview?: string      // Optional short preview
  }>
}
```

**Purpose:**
- Maya suggests 1-3 prompts based on user's request
- User can copy any prompt to workbench prompt box
- Encourages user choice and control

**Rendering:**
- **Component:** `components/studio-pro/prompt-suggestion-card.tsx` (NEW)
- **Display:**
  - Card for each suggestion
  - Label (e.g., "Option 1")
  - Prompt text (truncated with "Show more")
  - "Copy to Prompt Box" button
- **Behavior:**
  - Click "Copy" → Fills workbench prompt box
  - Click prompt text → Expands to show full prompt

**When Maya Sends This:**
- User asks: "Create a brand scene with my product"
- Maya responds with text + `maya-prompt-suggestions` part
- User chooses which prompt to use

**2. `studio-pro-result` Part Type (EXISTING - ENHANCE)**

**Current Structure:**
```typescript
{
  type: 'studio-pro-result',
  output: {
    state: 'ready' | 'processing',
    imageUrl?: string
  }
}
```

**Enhanced Structure:**
```typescript
{
  type: 'studio-pro-result',
  output: {
    state: 'ready' | 'processing',
    imageUrl?: string,
    predictionId?: string,
    resolution?: '1K' | '2K' | '4K',
    creditsUsed?: number
  }
}
```

**Enhancement:**
- Add reuse buttons: "Use in Box1", "Use in Box2", "Use in Box3"
- Add metadata display: Resolution, credits
- Keep existing rendering, add new buttons

#### Maya's Behavior in Pro Mode

**Current Behavior (Workflow-Based):**
- Maya detects Pro intent
- Maya suggests workflow (carousel, reel-cover, etc.)
- Maya auto-generates or guides through workflow

**New Behavior (Workbench-Based):**
- Maya detects Pro mode (via header)
- Maya suggests prompts (1-3 options)
- Maya does NOT auto-generate
- Maya encourages user to:
  - Select images in boxes
  - Choose a prompt
  - Click Generate

**System Prompt Changes:**

**Current:** `lib/maya/studio-pro-system-prompt.ts`
- Contains workflow guidance
- Contains mode-specific instructions
- Contains auto-generation triggers

**New:** Simplified Pro system prompt
- Remove: Workflow guidance
- Remove: Auto-generation instructions
- Keep: Basic Pro capabilities explanation
- Add: Prompt suggestion guidance
- Add: Workbench workflow explanation

**Example Maya Response (New):**

```
User: "I want to create a brand scene with my product"

Maya: "Perfect! I can help you create a stunning brand scene. Here are 3 prompt options:

[PROMPT SUGGESTIONS PART]

1. **Lifestyle Integration**
   "Woman in modern kitchen, morning natural light, casually holding [product], authentic brand moment, shot on iPhone 15 Pro"

2. **Professional Studio**
   "Woman in professional setting, holding [product], clean background, studio lighting, brand partnership style"

3. **Outdoor Lifestyle**
   "Woman outdoors, natural setting, [product] integrated naturally, golden hour lighting, authentic UGC style"

Select your images in the boxes below, copy the prompt you like, and click Generate!"
```

**Key Differences:**
- Maya suggests, doesn't generate
- User has full control
- Prompts are copyable
- Clear workflow: Select → Copy → Generate

### C) API LAYER

#### Single Endpoint Design

**Endpoint:** `POST /api/maya/generate-studio-pro`

**Current Request Shape:**
```typescript
{
  mode: StudioProMode,              // 'brand-scene' | 'text-overlay' | etc.
  userRequest: string,              // User's natural language request
  inputImages: NanoBananaInputImages,
  resolution?: "1K" | "2K" | "4K",
  aspectRatio?: string
}
```

**New Request Shape (Simplified):**
```typescript
{
  prompt: string,                   // User's prompt (from prompt box)
  inputImages: {
    baseImages: Array<{ url: string, type: 'user-photo' | 'reference-photo' }>,
    productImages?: Array<{ url: string, label: string }>,
    brandAssets?: Array<{ url: string, label?: string }>
  },
  resolution?: "1K" | "2K" | "4K",  // Default: "2K"
  aspectRatio?: string               // Default: "1:1"
}
```

**Key Changes:**
- Remove: `mode` field (prompt builder infers from prompt)
- Remove: `userRequest` field (use `prompt` directly)
- Simplify: `inputImages` structure (remove complex typing)
- Keep: Resolution and aspect ratio

**Response Shape (Unchanged):**
```typescript
{
  success: boolean,
  predictionId: string,
  status: "starting" | "processing",
  creditsDeducted: number
}
```

#### Logic Movement

**What Moves OUT of Workflows:**

1. **Mode Detection Logic**
   - **Current:** In workflow routes (carousel, reel-cover, etc.)
   - **New:** In prompt builder (infers from prompt text)
   - **File:** `lib/maya/nano-banana-prompt-builder.ts`

2. **Workflow-Specific Prompt Building**
   - **Current:** Each workflow route builds its own prompt
   - **New:** Single prompt builder handles all modes
   - **File:** `lib/maya/nano-banana-prompt-builder.ts`

3. **Workflow State Management**
   - **Current:** `pro_workflows` table tracks workflow state
   - **New:** No workflow state needed (stateless generation)
   - **Action:** Stop using `pro_workflows` table

**What Moves INTO Prompt Builder:**

1. **Mode Inference**
   - **Current:** Explicit `mode` parameter
   - **New:** Infer from prompt text (e.g., "carousel" → carousel mode)
   - **Logic:** Simple keyword matching or AI classification

2. **Scene Composition Intelligence**
   - **Current:** Mode-specific scene composition
   - **New:** Generic scene composition based on prompt
   - **Logic:** Keep existing scene composition, make it mode-agnostic

**What Moves INTO Chat Guidance:**

1. **Workflow Instructions**
   - **Current:** In system prompt (workflow-specific)
   - **New:** In Maya's chat responses (contextual)
   - **Example:** "For carousels, I suggest creating 5-7 slides..."

2. **Mode Suggestions**
   - **Current:** Auto-detected in backend
   - **New:** Maya suggests in chat
   - **Example:** "This sounds like a brand scene - want me to suggest prompts?"

#### Routes to Deprecate

**After Migration Complete:**

1. **`/api/studio-pro/generate/carousel`**
   - **Deprecate:** After workbench launch
   - **Timeline:** 2-4 weeks after launch
   - **Action:** Return 410 Gone with migration message

2. **`/api/studio-pro/generate/reel-cover`**
   - **Deprecate:** After workbench launch
   - **Timeline:** 2-4 weeks after launch
   - **Action:** Return 410 Gone with migration message

3. **`/api/studio-pro/generate/edit-reuse`**
   - **Deprecate:** After workbench launch
   - **Timeline:** 2-4 weeks after launch
   - **Action:** Return 410 Gone with migration message

4. **`/api/studio-pro/workflows`**
   - **Deprecate:** After workbench launch
   - **Timeline:** 2-4 weeks after launch
   - **Action:** Return 410 Gone with migration message

**Keep Active:**

1. **`/api/maya/generate-studio-pro`** - Main generation endpoint
2. **`/api/maya/check-studio-pro`** - Status polling
3. **`/api/studio-pro/avatar`** - Image management
4. **`/api/studio-pro/brand-assets`** - Asset management
5. **`/api/studio-pro/brand-kits`** - Brand kit management
6. **`/api/studio-pro/generations`** - Gallery fetching
7. **`/api/studio-pro/setup`** - Status check (simplified)

---

## PART 4 — PROMPT BUILDER STRATEGY

### Recommended Approach: HYBRID (Option C)

**Rationale:**
- **Template-based (A):** Too rigid, doesn't adapt to user intent
- **Fully dynamic (B):** Too unpredictable, may lose quality
- **Hybrid (C):** Best of both - structure + flexibility

### Hybrid Strategy Breakdown

#### Where Maya Stops (Chat Layer)

**Maya's Role:**
1. **Understands User Intent**
   - User says: "Create a brand scene with my product"
   - Maya infers: Brand scene mode, needs product image

2. **Suggests Prompts (1-3 Options)**
   - Maya generates prompts using her knowledge
   - Prompts are complete, ready to use
   - User can copy any prompt

3. **Provides Context**
   - Explains what each prompt will create
   - Suggests which images to use
   - Guides user workflow

**Maya Does NOT:**
- Auto-generate (user must click Generate)
- Modify prompts after user copies (user owns the prompt)
- Infer mode from prompt (that's builder's job)

#### Where User Takes Control (Workbench Layer)

**User's Role:**
1. **Selects Images**
   - Chooses 1-3 images in input boxes
   - Can mix base images + product images
   - Can clear and reselect

2. **Chooses/Creates Prompt**
   - Copies Maya's suggestion OR
   - Writes own prompt OR
   - Edits Maya's suggestion

3. **Triggers Generation**
   - Clicks Generate button
   - Waits for result
   - Can reuse result in boxes

**User Owns:**
- Image selection
- Final prompt text
- Generation decision

#### Where Builder Transforms (API Layer)

**Prompt Builder's Role:**
1. **Accepts User Input**
   - User's prompt (from prompt box)
   - Selected images (from input boxes)
   - Resolution/aspect ratio (from UI)

2. **Infers Mode (If Needed)**
   - Analyzes prompt text for keywords
   - Examples:
     - "carousel" → carousel-slides mode
     - "reel cover" → reel-cover mode
     - "add text" → text-overlay mode
   - **Fallback:** Generic mode if unclear

3. **Enhances Prompt**
   - Adds scene composition intelligence
   - Incorporates brand kit context
   - Optimizes for Nano Banana Pro
   - Maintains user's intent

4. **Returns Optimized Prompt**
   - Natural language (no trigger words)
   - 40-100 words (sweet spot)
   - Includes image context
   - Ready for Nano Banana Pro

**Builder Does NOT:**
- Invent new intent (respects user's prompt)
- Change core meaning (enhances, doesn't replace)
- Add trigger words (Nano Banana doesn't use them)

### Implementation Details

#### Prompt Builder Function Signature

**Current:**
```typescript
buildNanoBananaPrompt({
  userId: string,
  mode: StudioProMode,        // Explicit mode
  userRequest: string,        // User's request
  inputImages: NanoBananaInputImages
})
```

**New:**
```typescript
buildNanoBananaPrompt({
  userId: string,
  prompt: string,             // User's prompt (from prompt box)
  inputImages: {
    baseImages: Array<{ url: string, type: 'user-photo' | 'reference-photo' }>,
    productImages?: Array<{ url: string, label: string }>,
    brandAssets?: Array<{ url: string, label?: string }>
  },
  resolution?: "1K" | "2K" | "4K",
  aspectRatio?: string
}): {
  optimizedPrompt: string,    // Final prompt for Nano Banana
  inferredMode?: string,       // Optional: for logging
  sceneDescription?: string    // Optional: for credits description
}
```

#### Mode Inference Logic

**Simple Keyword Matching:**
```typescript
function inferMode(prompt: string): StudioProMode | 'generic' {
  const lower = prompt.toLowerCase()
  
  if (lower.includes('carousel') || lower.includes('slide')) return 'carousel-slides'
  if (lower.includes('reel cover') || lower.includes('thumbnail')) return 'reel-cover'
  if (lower.includes('add text') || lower.includes('text overlay')) return 'text-overlay'
  if (lower.includes('product') && lower.includes('brand')) return 'brand-scene'
  if (lower.includes('edit') || lower.includes('change')) return 'edit-image'
  
  return 'generic' // Fallback
}
```

**Note:** Mode inference is optional - builder can work in generic mode if unclear.

#### Prompt Enhancement Steps

1. **Parse User Prompt**
   - Extract key elements: subject, action, style, context

2. **Load Context**
   - User's brand kit (colors, fonts, tone)
   - User's avatar images (for consistency)
   - Product images (if provided)

3. **Apply Scene Composition**
   - Add lighting, composition, style hints
   - Maintain user's core intent
   - Optimize for Nano Banana Pro

4. **Return Enhanced Prompt**
   - Natural language
   - 40-100 words
   - Ready for generation

### Example Flow

**User Action:**
1. Selects 2 images in Box1 and Box2
2. Copies Maya's suggested prompt: "Woman in modern kitchen, morning light, holding product"
3. Clicks Generate

**Builder Action:**
1. Receives: `{ prompt: "Woman in modern kitchen...", inputImages: [...] }`
2. Infers: `mode = 'brand-scene'` (from "holding product")
3. Loads: Brand kit (stone tones, minimalist)
4. Enhances: "Woman in modern minimalist kitchen, morning natural window light streaming in, casually holding [product name], authentic brand moment, warm stone-toned aesthetic, shot on iPhone 15 Pro portrait mode, shallow depth of field, candid lifestyle photography"
5. Returns: Enhanced prompt to generation endpoint

**Result:**
- User's intent preserved
- Enhanced with context
- Optimized for Nano Banana Pro
- Natural language (no trigger words)

---

## PART 5 — MIGRATION ORDER (VERY IMPORTANT)

### Phase 1: Foundation (No Breaking Changes)

**Goal:** Build workbench components without affecting existing Pro UI

**Steps:**

1. **Create Workbench Components (NEW)**
   - `components/studio-pro/workbench-input-strip.tsx`
   - `components/studio-pro/workbench-prompt-box.tsx`
   - `components/studio-pro/workbench-result-card.tsx`
   - `components/studio-pro/workbench-strip.tsx`
   - `components/studio-pro/prompt-suggestion-card.tsx`
   - **Testing:** Render in isolation, no integration yet

2. **Add Feature Flag**
   - **File:** `lib/feature-flags.ts` (or env var)
   - **Flag:** `ENABLE_WORKBENCH_MODE` (default: false)
   - **Usage:** Check flag before showing workbench

3. **Refactor Prompt Builder (CAREFUL)**
   - **File:** `lib/maya/nano-banana-prompt-builder.ts`
   - **Action:** Add new function signature, keep old one
   - **Pattern:** `buildNanoBananaPromptV2()` alongside existing function
   - **Testing:** Test new function in isolation

4. **Simplify Generation Endpoint (CAREFUL)**
   - **File:** `app/api/maya/generate-studio-pro/route.ts`
   - **Action:** Add new request handler, keep old one
   - **Pattern:** Check for new request shape, fallback to old
   - **Testing:** Test both request shapes

5. **Add Prompt Suggestions Part Type**
   - **File:** `components/sselfie/maya-chat-screen.tsx`
   - **Action:** Add rendering for `maya-prompt-suggestions` part
   - **Testing:** Test with mock data

**Classic Mode Testing After Phase 1:**
- ✅ Verify Classic generation still works
- ✅ Verify concept cards still work
- ✅ Verify no Pro UI appears in Classic mode
- ✅ Verify header is not sent in Classic mode

### Phase 2: Integration (Behind Feature Flag)

**Goal:** Integrate workbench into chat screen, hidden behind flag

**Steps:**

1. **Integrate Workbench Strip**
   - **File:** `components/sselfie/maya-chat-screen.tsx`
   - **Action:** Add workbench strip, conditional on flag + `studioProMode`
   - **Pattern:** `{ENABLE_WORKBENCH_MODE && studioProMode && <WorkbenchStrip />}`
   - **Testing:** Toggle flag, verify workbench appears/disappears

2. **Update Chat System Prompt**
   - **File:** `lib/maya/studio-pro-system-prompt.ts`
   - **Action:** Add workbench guidance (behind flag check)
   - **Pattern:** If flag enabled, use workbench prompt; else use workflow prompt
   - **Testing:** Verify Maya suggests prompts correctly

3. **Connect Prompt Box to Generation**
   - **File:** `components/studio-pro/workbench-prompt-box.tsx`
   - **Action:** Call `/api/maya/generate-studio-pro` with new request shape
   - **Testing:** Verify generation works from prompt box

4. **Connect Result Reuse**
   - **File:** `components/studio-pro/workbench-result-card.tsx`
   - **Action:** Add "Use in Box" buttons, update input strip state
   - **Testing:** Verify result can be reused in boxes

5. **Add Hard Guards**
   - **Files:** All shared files
   - **Action:** Add type guards, validation, logging
   - **Testing:** Verify guards catch invalid states

**Classic Mode Testing After Phase 2:**
- ✅ Verify Classic mode unaffected by flag
- ✅ Verify workbench only appears when flag + Pro mode
- ✅ Verify Classic generation still works
- ✅ Verify no Pro headers sent in Classic mode

### Phase 3: Soft Launch (Opt-In)

**Goal:** Enable workbench for beta users, keep old UI for others

**Steps:**

1. **Add User Preference**
   - **Database:** Add `prefers_workbench_mode` to `user_pro_setup` table
   - **API:** Update `/api/studio-pro/setup` to handle preference
   - **UI:** Add toggle in Pro settings (if exists)

2. **Enable for Beta Users**
   - **Action:** Set `prefers_workbench_mode = true` for beta users
   - **Logic:** Check preference + feature flag
   - **Pattern:** `{ENABLE_WORKBENCH_MODE && (userPrefersWorkbench || isBetaUser) && studioProMode && <WorkbenchStrip />}`

3. **Monitor Usage**
   - **Metrics:** Track workbench usage, generation success rate
   - **Feedback:** Collect user feedback
   - **Timeline:** 1-2 weeks

**Classic Mode Testing After Phase 3:**
- ✅ Verify Classic mode unaffected
- ✅ Verify beta users see workbench
- ✅ Verify non-beta users see old UI
- ✅ Verify no regressions

### Phase 4: Default Switch (Gradual)

**Goal:** Make workbench default, keep old UI as fallback

**Steps:**

1. **Update Default Logic**
   - **Action:** Default to workbench if feature flag enabled
   - **Pattern:** `{ENABLE_WORKBENCH_MODE && studioProMode && <WorkbenchStrip />} else {<OldProUI />}`
   - **Testing:** Verify workbench is default

2. **Add Migration Path**
   - **Action:** Show banner: "New Pro Workbench available! [Try it] [Keep old UI]"
   - **Logic:** User can opt-out to old UI
   - **Testing:** Verify opt-out works

3. **Monitor Adoption**
   - **Metrics:** Track adoption rate, issues
   - **Timeline:** 1-2 weeks

**Classic Mode Testing After Phase 4:**
- ✅ Verify Classic mode unaffected
- ✅ Verify workbench is default
- ✅ Verify opt-out to old UI works
- ✅ Verify no regressions

### Phase 5: Cleanup (After Validation)

**Goal:** Remove deprecated code after 2-4 weeks

**Steps:**

1. **Remove Deprecated Components**
   - **Files:**
     - `components/studio-pro/onboarding-flow.tsx`
     - `components/studio-pro/pro-dashboard.tsx`
     - `components/studio-pro/pro-entry-flow.tsx`
     - `components/studio-pro/pro-mode-wrapper.tsx`
     - `components/studio-pro/workflows/edit-reuse-workflow.tsx`
   - **Timeline:** 2-4 weeks after Phase 4

2. **Remove Deprecated Routes**
   - **Files:**
     - `app/api/studio-pro/generate/carousel/route.ts`
     - `app/api/studio-pro/generate/reel-cover/route.ts`
     - `app/api/studio-pro/generate/edit-reuse/route.ts`
     - `app/api/studio-pro/workflows/route.ts`
   - **Action:** Return 410 Gone with migration message
   - **Timeline:** 2-4 weeks after Phase 4

3. **Clean Up Prompt Builder**
   - **File:** `lib/maya/nano-banana-prompt-builder.ts`
   - **Action:** Remove old function, keep new one
   - **Timeline:** 2-4 weeks after Phase 4

4. **Update Database (Optional)**
   - **Action:** Mark `pro_workflows` and `pro_generations` tables as deprecated
   - **Note:** Don't delete tables, just stop using them
   - **Timeline:** 2-4 weeks after Phase 4

**Classic Mode Testing After Phase 5:**
- ✅ Verify Classic mode unaffected
- ✅ Verify workbench still works
- ✅ Verify no broken imports
- ✅ Verify no regressions

### Testing Checklist Per Phase

**After Each Phase:**
- [ ] Classic mode generation works
- [ ] Classic concept cards work
- [ ] No Pro UI appears in Classic mode
- [ ] No Pro headers sent in Classic mode
- [ ] Flux prompt builder not imported in Pro routes
- [ ] Trigger words preserved in Classic
- [ ] Credit system works for both modes
- [ ] `ai_images` table writes correctly (source field)

---

## GO / NO-GO CHECKLIST

### Pre-Implementation Checklist

**Code Safety:**
- [ ] All Classic mode files identified and frozen
- [ ] Hard guards added to shared files
- [ ] Type guards implemented
- [ ] Runtime validation added
- [ ] Import isolation verified (ESLint/TypeScript)

**Architecture:**
- [ ] Workbench components designed
- [ ] API endpoint simplified
- [ ] Prompt builder strategy defined
- [ ] Migration order planned
- [ ] Feature flag system ready

**Testing:**
- [ ] Classic mode test suite ready
- [ ] Pro mode test cases defined
- [ ] Integration test plan created
- [ ] Rollback plan documented

**Documentation:**
- [ ] Refactor plan reviewed
- [ ] Risks identified and mitigated
- [ ] Team alignment on approach
- [ ] User communication plan ready

### Go Criteria

**✅ GO if:**
- All checklist items complete
- Classic mode safety guaranteed
- Feature flag system ready
- Rollback plan documented
- Team aligned on approach

**❌ NO-GO if:**
- Any Classic mode files at risk
- Hard guards not implemented
- Feature flag system not ready
- Testing plan incomplete
- Team not aligned

---

## TOP 3 RISKS AFTER SIMPLIFICATION

### Risk 1: Prompt Quality Degradation

**Risk:** Simplified prompt builder may produce lower quality prompts than workflow-specific builders

**Mitigation:**
- Keep scene composition intelligence
- Test prompt quality before launch
- Allow user to edit prompts
- Monitor generation success rate

**Detection:**
- Track generation success rate
- Collect user feedback
- Compare prompt quality metrics

### Risk 2: User Confusion (Workflow → Workbench)

**Risk:** Users familiar with workflows may be confused by workbench UX

**Mitigation:**
- Clear onboarding/tooltips
- Migration banner with explanation
- Keep old UI as opt-out option
- Provide help documentation

**Detection:**
- Track support tickets
- Monitor user drop-off
- Collect user feedback

### Risk 3: Missing Workflow Features

**Risk:** Some workflow-specific features may be lost in simplification

**Mitigation:**
- Audit all workflow features
- Map features to workbench equivalents
- Document feature parity
- Add missing features if critical

**Detection:**
- Feature parity audit
- User feedback on missing features
- Support ticket analysis

---

## TOP 3 UX WINS USERS WILL FEEL IMMEDIATELY

### Win 1: Simpler, Faster Workflow

**Before:** Onboarding → Dashboard → Workflow Selection → Form → Generation

**After:** Toggle Pro → Select Images → Paste Prompt → Generate

**Impact:**
- **Time Saved:** 2-3 minutes per generation
- **Steps Reduced:** 5-7 steps → 3 steps
- **Cognitive Load:** Lower (no workflow selection)

**User Feeling:** "This is so much faster and easier!"

### Win 2: Full Control Over Prompts

**Before:** Maya auto-generates or guides through workflow forms

**After:** Maya suggests prompts, user chooses and can edit

**Impact:**
- **Control:** User owns the prompt
- **Flexibility:** Can edit Maya's suggestions
- **Learning:** Users learn what makes good prompts

**User Feeling:** "I have full control - I can tweak exactly what I want!"

### Win 3: Persistent Image Selection

**Before:** Re-select images for each generation

**After:** Images stay in boxes, can reuse results

**Impact:**
- **Efficiency:** No re-selection needed
- **Iteration:** Easy to iterate on same images
- **Reuse:** Generated images can go back into boxes

**User Feeling:** "My images stay put - I can iterate quickly!"

---

## UNKNOWNS / CLARIFICATIONS NEEDED

1. **Feature Flag System**
   - **Unknown:** Does project have existing feature flag system?
   - **Action:** Check for existing feature flag implementation
   - **Fallback:** Use environment variable

2. **User Preference Storage**
   - **Unknown:** Where to store `prefers_workbench_mode`?
   - **Options:** `user_pro_setup` table, user profile, localStorage
   - **Recommendation:** `user_pro_setup` table (persistent)

3. **Beta User Identification**
   - **Unknown:** How to identify beta users?
   - **Options:** Database flag, user group, manual list
   - **Action:** Confirm with team

4. **Migration Timeline**
   - **Unknown:** Exact timeline for each phase
   - **Recommendation:** 1-2 weeks per phase, 2-4 weeks for cleanup
   - **Action:** Confirm with team

5. **Deprecated Code Removal**
   - **Unknown:** When is it safe to remove deprecated code?
   - **Recommendation:** 2-4 weeks after default switch
   - **Action:** Confirm with team

---

## END OF PLAN

**Status:** Ready for review and approval

**Next Steps:**
1. Review plan with team
2. Address unknowns/clarifications
3. Get approval to proceed
4. Begin Phase 1 implementation

**Remember:**
- No code changes until plan approved
- Classic mode safety is priority #1
- Feature flag enables safe rollout
- Gradual migration reduces risk


