# MAYA PRO MODE: CLEANUP & IMPLEMENTATION PLAN
## Safe Separation, Clean Architecture, Sophisticated UX

**Status:** 📋 ANALYSIS COMPLETE - READY FOR IMPLEMENTATION  
**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX

---

## 🎯 EXECUTIVE SUMMARY

This document provides a complete analysis and implementation plan for cleaning up Maya Pro Mode, separating it from Classic Mode, and implementing a sophisticated UX. The plan is divided into 3 phases with detailed checklists to track progress.

**Key Goals:**
1. ✅ Safely separate Classic Mode from Pro Mode (no breaking changes)
2. ✅ Remove dead code (workbench, workflows, old upload modules)
3. ✅ Create clean file structure for Pro Mode
4. ✅ Implement sophisticated UX (no emojis in UI, elegant design)
5. ✅ Integrate category system and Universal Prompts
6. ✅ Build persistent image library system

---

## 📊 CURRENT STATE ANALYSIS

### **FILE AUDIT RESULTS**

#### **1. maya-chat-screen.tsx (5,321 lines) - BLOATED**
**Location:** `components/sselfie/maya-chat-screen.tsx`

**Current Issues:**
- ❌ 5,321 lines of code (exceeds 3,000 line threshold)
- ❌ Mixes Classic + Pro + Workbench + Workflows
- ❌ Multiple state management systems:
  - `processedConceptMessagesRef` (line 163)
  - `carouselSlides` state (line 225)
  - `workbenchPrompts` state (line 228)
  - `promptSuggestions` state (line 221)
  - `isWorkflowChat` state (line 200)
  - `conceptGenerationImages` state (line 118)
  - `showManualUploadModule` state (line 143)
- ❌ Conditional rendering everywhere:
  - `studioProMode && !isWorkflowChat && !isWorkbenchModeEnabled()` (multiple locations)
  - `isWorkbenchModeEnabled()` checks (line 38, multiple locations)
- ❌ Workbench mode code (lines 4786-4787, 3124-3125, etc.)
- ❌ Workflow chat code (lines 2952-3044, 3746-3757, etc.)
- ❌ Old upload module refs (lines 102-157)

**What to Keep:**
- ✅ Classic mode chat functionality
- ✅ Message rendering
- ✅ Basic state management for Classic
- ✅ Authentication logic
- ✅ Concept card rendering (Classic version)

**What to Remove:**
- ❌ All workbench mode code
- ❌ All workflow chat code (`isWorkflowChat`, workflow triggers)
- ❌ `processedConceptMessagesRef` (not needed in new design)
- ❌ `carouselSlides` state (not in sophisticated UX)
- ❌ `workbenchPrompts` state
- ❌ `promptSuggestions` state
- ❌ Old image upload handling (lines 102-157)
- ❌ `showManualUploadModule` state
- ❌ Workbench strip rendering (line 4786-4787)

#### **2. pro-personality.ts (587 lines) - NEEDS CLEANUP**
**Location:** `lib/maya/pro-personality.ts`

**Current Issues:**
- ❌ References to workbench mode (lines 164, 257, 491)
- ❌ References to `[GENERATE_PROMPTS]` trigger (workbench only)
- ❌ References to `[SHOW_IMAGE_UPLOAD_MODULE]` (disabled)
- ❌ Generic SaaS language in some sections
- ❌ Workflow guidance (lines 313-328, 411-428)

**What to Keep:**
- ✅ Clean personality (warm + sophisticated)
- ✅ `[GENERATE_CONCEPTS]` trigger guidance
- ✅ Category/brand expertise display
- ✅ Response format guidelines

**What to Remove:**
- ❌ Workbench mode instructions (lines 164, 257, 491)
- ❌ Workflow guidance (lines 313-328, 411-428)
- ❌ `[GENERATE_PROMPTS]` references
- ❌ `[SHOW_IMAGE_UPLOAD_MODULE]` references
- ❌ Generic SaaS language

#### **3. generate-concepts/route.ts (4,788 lines) - COMPLEX**
**Location:** `app/api/maya/generate-concepts/route.ts`

**Current Issues:**
- ❌ Handles both Classic and Pro mode in one route
- ❌ Multiple category detection systems:
  - `detectCategoryFromRequest()` (line 106)
  - `detectCategoryForPromptConstructor()` (line 235)
  - `mapCategoryForBrandLibrary()` (line 175)
- ❌ Too many conditional branches
- ❌ Workbench mode detection (if present)
- ❌ Multiple template systems overlap

**What to Keep:**
- ✅ Classic mode = Flux prompts (30-45 words)
- ✅ Pro mode = Universal Prompts + category system
- ✅ Category detection logic (simplified)

**What to Simplify:**
- ✅ Separate Classic vs Pro logic more clearly
- ✅ Remove workbench mode detection
- ✅ Simplify category detection (one system)
- ✅ Clear separation of prompt building

#### **4. chat/route.ts (955 lines) - MODE SWITCHING**
**Location:** `app/api/maya/chat/route.ts`

**Current Issues:**
- ❌ Multiple mode switches:
  - `isStudioProMode` detection (line 543)
  - `isWorkbenchMode` detection (line 544)
  - `activeWorkflow` detection (line 525)
- ❌ Workflow guidance (lines 15-51)
- ❌ Conditional personality selection

**What to Keep:**
- ✅ Classic mode chat flow
- ✅ Pro mode chat flow (simplified)
- ✅ Personality selection logic

**What to Remove:**
- ❌ Workbench mode detection
- ❌ Workflow guidance
- ❌ `activeWorkflow` handling

#### **5. Feature Flags**
**Location:** `lib/feature-flags.ts`

**Current Issues:**
- ❌ `isWorkbenchModeEnabled()` function (line 14)
- ❌ Used throughout codebase (553 matches found)

**Action:**
- ✅ Keep function for now (backward compatibility)
- ✅ Remove all usages in Pro Mode code
- ✅ Deprecate after cleanup

---

## 🚨 SAFETY FIRST: CLASSIC MODE PROTECTION

### **RULE #1: DO NOT TOUCH CLASSIC MODE**

**Classic Mode Must Remain Untouched:**
```
✅ SAFE FILES (Do Not Modify):
- lib/maya/personality.ts (Classic Maya)
- Classic mode concept card generation
- Classic mode image generation (Flux)
- Classic mode chat flow
- Classic mode prompt building (30-45 words)

❌ DANGER ZONE (Modify Carefully):
- maya-chat-screen.tsx (needs splitting)
- app/api/maya/chat/route.ts (needs mode isolation)
- app/api/maya/generate-concepts/route.ts (needs cleanup)
```

### **Protection Strategy:**

**Phase 1: Split Files First, Then Clean**
```
BEFORE cleanup:
1. Create new Pro Mode files
2. Copy relevant code to new files
3. Test Pro Mode works independently
4. THEN remove Pro Mode code from Classic files
```

---

## 📋 3-PHASE IMPLEMENTATION PLAN

---

## **PHASE 1: CLEANUP & SEPARATION** 🧹

### **Goal:** Safely separate Classic from Pro, remove bloat

### **STEP 1.1: File Structure Creation**

**Create New Directory:**
```
components/sselfie/pro-mode/
├── ProModeChat.tsx           (New isolated Pro chat)
├── ProModeHeader.tsx         (Top nav, library counter)
├── ProModeInput.tsx          (Input with manage icons)
├── ImageLibraryModal.tsx     (Sophisticated library UI)
├── ImageUploadFlow.tsx       (4-step wizard)
├── ConceptCardPro.tsx        (Pro version of concept card)
└── hooks/
    ├── useImageLibrary.ts    (Centralized image state)
    ├── useProModeChat.ts     (Chat logic)
    └── useConceptGeneration.ts (Generation logic)
```

**Create New API Routes:**
```
app/api/maya/pro/
├── chat/route.ts             (Pro mode chat only)
├── generate-concepts/route.ts (Pro concept generation)
├── library/
│   ├── get/route.ts          (Get library)
│   ├── update/route.ts       (Update library)
│   └── clear/route.ts        (Start fresh)
└── generate-image/route.ts   (Nano Banana Pro)
```

**Create New Lib Files:**
```
lib/maya/pro/
├── personality.ts            (Clean Pro personality)
├── system-prompts.ts         (Sophisticated prompts)
├── category-system.ts        (6 categories + brands)
├── prompt-builder.ts         (Universal prompt integration)
└── types.ts                  (TypeScript interfaces)
```

### **STEP 1.2: Remove Dead Code**

**Files to Clean:**

**1. maya-chat-screen.tsx**
```
REMOVE:
- ❌ Workbench mode code (feature not in sophisticated UX)
- ❌ Workflow chat code (not in new design)
- ❌ Old upload module refs
- ❌ processedConceptMessagesRef (not needed)
- ❌ carouselSlides state (not in new design)
- ❌ workbenchPrompts state
- ❌ promptSuggestions state
- ❌ Old image upload handling

KEEP:
- ✅ Classic mode chat (untouched)
- ✅ Message rendering
- ✅ Basic state management
- ✅ Authentication logic
```

**2. pro-personality.ts**
```
REMOVE:
- ❌ Workbench mode instructions
- ❌ Workflow guidance
- ❌ [SHOW_IMAGE_UPLOAD_MODULE] references
- ❌ [GENERATE_PROMPTS] trigger
- ❌ Generic SaaS language

KEEP/ADD:
- ✅ Clean personality (warm + sophisticated)
- ✅ [GENERATE_CONCEPTS] only
- ✅ Category/brand expertise display
- ✅ No emojis in UI language
```

**3. generate-concepts/route.ts**
```
REMOVE:
- ❌ Workbench mode detection
- ❌ Old brand detection (too complex)
- ❌ Multiple template systems overlap
- ❌ Too many conditional branches

SIMPLIFY:
- ✅ Classic mode = Flux prompts
- ✅ Pro mode = Universal prompts + category system
- ✅ Clear separation
```

### **STEP 1.3: Database Cleanup**

**New Tables Needed:**
```sql
-- User's persistent image library (Pro mode)
CREATE TABLE user_image_libraries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  selfies JSONB DEFAULT '[]', -- Array of image URLs
  products JSONB DEFAULT '[]',
  people JSONB DEFAULT '[]',
  vibes JSONB DEFAULT '[]',
  current_intent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pro mode session tracking
CREATE TABLE pro_mode_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  chat_id INTEGER REFERENCES maya_chats(id),
  library_snapshot JSONB, -- Snapshot of library at session start
  concepts_generated INTEGER DEFAULT 0,
  images_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## **PHASE 2: SOPHISTICATED UX IMPLEMENTATION** 🎨

### **Goal:** Build the new Pro Mode experience

### **STEP 2.1: Visual Design System**

**Create Design Tokens:**
```typescript
// lib/maya/pro/design-system.ts

export const ProModeDesign = {
  typography: {
    headers: 'Canela, serif', // "Studio Pro Mode"
    subheaders: 'Hatton, serif', // "Morning Ritual Glow"
    body: 'Inter Light, sans-serif', // Clean, readable
    ui: 'Inter Regular, sans-serif', // Clear labels
    data: 'Inter Medium, sans-serif' // Numbers, counts
  },
  
  colors: {
    primary: '#1C1917', // stone-900 - Primary text
    secondary: '#57534E', // stone-600 - Secondary text
    background: '#F5F1ED', // warm cream - Backgrounds
    accent: '#292524', // stone-800 - Accents
    border: 'rgba(231, 229, 228, 0.6)', // stone-200/60 - Borders
    highlights: 'Champagne undertones' // Subtle highlights
  },
  
  spacing: {
    section: '24px',
    card: '16px',
    element: '12px'
  },
  
  borderRadius: {
    card: '12px',
    button: '8px',
    input: '8px'
  },
  
  layout: {
    whiteSpace: 'generous',
    dividers: '1px, stone-200/60',
    shadows: 'barely visible',
    borders: 'only when necessary'
  }
}

// NO EMOJIS IN UI - Professional labels only
export const UILabels = {
  selfies: (count: number) => `Selfies • ${count}`,
  products: (count: number) => `Products • ${count}`,
  people: (count: number) => `People • ${count}`,
  vibes: (count: number) => `Vibes • ${count}`,
  library: (total: number) => `Library • ${total} images`,
  imagesLinked: (count: number) => `Images Linked • ${count}`,
  // All clean, professional, no emojis
}

// Button labels (no emojis)
export const ButtonLabels = {
  beginSetup: 'Begin Setup',
  continue: 'Continue',
  generate: 'Generate',
  addImages: 'Add Images',
  manage: 'Manage',
  viewPrompt: 'View Prompt',
  close: 'Close',
  startCreating: 'Start Creating',
  startFresh: 'Start Fresh Project'
}
```

### **STEP 2.2: Image Upload Flow (4-Step Wizard)**

**Component: ImageUploadFlow.tsx**
```typescript
// 4-step wizard implementation matching vision exactly

// STEP 1: Welcome Screen
// - "Studio Pro Mode" (Canela, 32px, Stone 900)
// - "Let's gather your images to begin" (Hatton, 18px, Stone 700)
// - Body text explaining the process (Inter Light, 14px, Stone 600)
// - "[ Begin Setup ]" button (Inter Medium, 14px, tracking 0.5px)
// - Maya's chat message (warm, with emojis allowed)

// STEP 2: Selfies (Required)
// - "Selfies" header (no emoji)
// - "Required" label
// - Description: "Front-facing photos for face and features"
// - "[ Choose from Gallery ]" and "[ Upload New ]" buttons
// - Clean, professional interface

// STEP 3: Products, People, Vibes (Optional)
// - Each category with "Optional" label
// - Professional descriptions
// - Same button pattern
// - Elegant dividing lines (stone-200/60)

// STEP 4: Intent Description
// - "What would you like to create with these images?"
// - Text input for intent
// - "[ Continue ]" button

interface ImageLibrary {
  selfies: string[]
  products: string[]
  people: string[]
  vibes: string[]
  intent: string
}

// After images added, show:
// - "Selfies • 3" with "[ Manage ]" button
// - Image thumbnails
// - Current Intent displayed
// - "[ Start Creating ]" button
```

### **STEP 2.3: Creative Workspace**

**Component: ProModeChat.tsx**
```typescript
// Top: ProModeHeader (library counter, manage dropdown)
// Middle: Concept cards with sophisticated styling
// Bottom: ProModeInput (clean, no emoji placeholders)

// Maya's chat = emojis allowed
// UI elements = NO emojis
```

### **STEP 2.4: Concept Cards (Editorial Quality)**

**Component: ConceptCardPro.tsx**
```typescript
// Editorial quality concept cards matching vision

// Design:
// - Title: Hatton serif, elegant (e.g., "Morning Ritual Glow")
// - Description: Inter Light, readable (2-3 sentences)
// - Elegant dividing line (stone-200/60)
// - "Images Linked • 3" label (no emoji)
// - Shows which images: "Selfie 1 • Rhode Peptide Treatment • Beach Scene 1"
// - "Category" section: "Beauty & Skincare"
// - "Aesthetic" section: "Coastal wellness, clean beauty, morning ritual"
// - "[ View Prompt ]" and "[ Generate ]" buttons (no emojis)

// View Prompt Modal:
// - Shows full 250-500 word prompt
// - Shows category, template, brand references
// - Professional photography language
// - Real brand names (CHANEL headband, Alo leggings)
// - Specific styling details
// - Technical photography specifications
// - Editorial quality throughout

// Example card structure:
{
  title: "Morning Ritual Glow",
  description: "Sun-drenched morning skincare moment...",
  imagesLinked: ["Selfie 1", "Rhode Peptide Treatment", "Beach Scene 1"],
  category: "Beauty & Skincare",
  aesthetic: "Coastal wellness, clean beauty, morning ritual",
  fullPrompt: "Professional photography. Influencer/Pinterest style portrait..."
}
```

### **STEP 2.5: Library Management**

**Component: ImageLibraryModal.tsx**
```typescript
// Sophisticated modal design
// Categories with counts: "Selfies • 3"
// Manage buttons (no icons unless necessary)
// Current Intent displayed
// Start Fresh option with confirmation
// Clean, editorial feel
```

---

## **PHASE 3: LOGIC & INTEGRATION** ⚙️

### **Goal:** Wire everything together correctly

### **STEP 3.1: Category System Integration**

**File: lib/maya/pro/category-system.ts**
```typescript
export const PRO_MODE_CATEGORIES = {
  WELLNESS: {
    name: 'Wellness',
    brands: ['Alo Yoga', 'Lululemon', 'Outdoor Voices'],
    templates: 8,
    description: 'Athletic wear, meditation, yoga, fitness'
  },
  LUXURY: {
    name: 'Luxury',
    brands: ['CHANEL', 'Dior', 'Bottega Veneta', 'The Row'],
    templates: 9,
    description: 'High fashion, editorial, sophisticated styling'
  },
  LIFESTYLE: {
    name: 'Lifestyle',
    brands: ['Glossier', 'Free People', 'Jenni Kayne'],
    templates: 9,
    description: 'Everyday moments, coastal living, clean aesthetic'
  },
  FASHION: {
    name: 'Fashion',
    brands: ['Reformation', 'Everlane', 'Aritzia', 'Toteme'],
    templates: 10,
    description: 'Street style, editorial, Scandi minimalism'
  },
  TRAVEL: {
    name: 'Travel',
    brands: [],
    templates: 10,
    description: 'Airport scenes, vacation mode, jet-set'
  },
  BEAUTY: {
    name: 'Beauty & Skincare',
    brands: ['Rhode', 'Glossier', 'The Ordinary'],
    templates: 0, // shares lifestyle
    description: 'Routines, product shots, self-care moments'
  }
}

export function detectCategory(
  userRequest: string,
  imageLibrary: ImageLibrary
): CategoryInfo {
  // Smart category detection based on:
  // 1. User request keywords
  // 2. Products in library (Rhode = Beauty, Alo = Wellness)
  // 3. Context clues
}

export function getCategoryPrompts(
  category: string,
  userLibrary: ImageLibrary
): UniversalPrompt[] {
  // Return appropriate Universal Prompts for category
  // Link user's images appropriately
}
```

### **STEP 3.2: Prompt Building (Universal Prompts)**

**File: lib/maya/pro/prompt-builder.ts**
```typescript
export function buildProModePrompt(
  category: string,
  concept: ConceptComponents,
  userImages: ImageLibrary
): string {
  // Use Universal Prompt structure (250-500 words)
  // Include specific brand references
  // Professional photography language
  // Real brand names (CHANEL headband, Alo leggings)
  
  const prompt = `
Professional photography. Influencer/Pinterest style portrait
maintaining exactly the same physical characteristics...

${buildOutfitSection(concept, category)}
${buildPoseSection(concept)}
${buildLightingSection(concept)}
${buildSettingSection(concept)}
${buildMoodSection(concept)}

Aesthetic: ${buildAestheticDescription(category, concept)}
  `
  
  return prompt
}

function buildOutfitSection(concept, category) {
  // Use real brand names based on category
  // Specific items (butter-soft Alo leggings, CHANEL headband)
  // NOT generic "stylish outfit"
}
```

### **STEP 3.3: State Management (Clean)**

**Hook: useImageLibrary.ts**
```typescript
export function useImageLibrary() {
  // Centralized image library state
  // Persistent storage (database + localStorage)
  // Clean API: addImages, removeImages, clearLibrary, updateIntent
  
  const [library, setLibrary] = useState<ImageLibrary>({
    selfies: [],
    products: [],
    people: [],
    vibes: [],
    intent: ''
  })
  
  const loadLibrary = async () => {
    // Load from database
  }
  
  const saveLibrary = async (updates: Partial<ImageLibrary>) => {
    // Save to database + localStorage
    // Sync across devices
  }
  
  return {
    library,
    addImages,
    removeImages,
    clearLibrary,
    updateIntent,
    totalImages: getTotalImageCount(library)
  }
}
```

### **STEP 3.4: API Integration**

**Route: app/api/maya/pro/generate-concepts/route.ts**
```typescript
export async function POST(req: NextRequest) {
  // Clean, focused route
  // Pro mode only
  // Uses category system
  // Returns Universal Prompts
  
  const { userRequest, imageLibrary } = await req.json()
  
  // 1. Detect category
  const category = detectCategory(userRequest, imageLibrary)
  
  // 2. Get appropriate Universal Prompts
  const prompts = getCategoryPrompts(category, imageLibrary)
  
  // 3. Build concepts with user's images
  const concepts = prompts.map(prompt => ({
    title: prompt.title,
    description: prompt.description,
    category: category.name,
    aesthetic: prompt.aesthetic,
    linkedImages: linkImagesToPrompt(prompt, imageLibrary),
    fullPrompt: buildProModePrompt(category, prompt, imageLibrary)
  }))
  
  // 4. Return to frontend
  return NextResponse.json({ concepts })
}
```

### **STEP 3.5: Chat Flow Logic**

**File: lib/maya/pro/chat-logic.ts**
```typescript
export function handleProModeMessage(
  message: string,
  library: ImageLibrary,
  chatHistory: Message[]
): ProModeResponse {
  
  // 1. Detect intent
  if (isConceptRequest(message)) {
    return {
      type: 'generate_concepts',
      mayaResponse: buildMayaResponse(message),
      trigger: '[GENERATE_CONCEPTS]',
      category: detectCategory(message, library)
    }
  }
  
  // 2. Detect library management
  if (isLibraryUpdate(message)) {
    return {
      type: 'update_library',
      action: parseLibraryAction(message)
    }
  }
  
  // 3. Detect navigation
  if (isPivotRequest(message)) {
    return {
      type: 'pivot',
      newCategory: detectNewCategory(message)
    }
  }
  
  // 4. Default conversation
  return {
    type: 'chat',
    mayaResponse: buildConversationalResponse(message)
  }
}
```

### **STEP 3.6: Maya's Expertise Display**

**When User Asks "What can you create?"**

Maya shows:
- All 6 categories with descriptions
- Brand databases for each category
- Template library counts
- Strategic recommendations based on user's library

**When Generating Concepts:**

Maya shows process:
- Category selected
- Template used
- Brand database references
- Images being linked
- Specific styling details

**Example Response:**
```
"Perfect! Creating CHANEL luxury content for you now...

Using:
• Category: LUXURY
• Template: High Fashion Editorial
• Brand Database: CHANEL aesthetic + logo elements
• Your Images: Selfie 2, Designer Bag, Street Style Ref

Generating 3 concepts with:
- CHANEL signature styling
- Logo-loaded accessories
- Editorial flash photography
- Confident, attitude-driven energy

[GENERATE_CONCEPTS] chanel luxury editorial logo fashion"
```

**Transparency Builds Trust:**
- Shows category selection
- Shows template usage
- Shows brand database
- Shows image linking logic
- Shows professional expertise

---

## ✅ SUCCESS CRITERIA

### **Phase 1 Complete When:**
- ✅ Classic mode works perfectly (unchanged)
- ✅ Dead code removed (workbench, workflows)
- ✅ New file structure created
- ✅ Pro mode isolated from Classic

### **Phase 2 Complete When:**
- ✅ Upload flow works (4 steps)
- ✅ NO emojis in any UI elements
- ✅ Elegant, editorial design throughout
- ✅ Library management functional
- ✅ Feels like high-end creative studio

### **Phase 3 Complete When:**
- ✅ Category system working
- ✅ Universal Prompts integrated
- ✅ Maya shows expertise (brands/categories)
- ✅ State persists correctly
- ✅ Full user journey works:
  - Upload images once
  - Create concepts (auto-linked)
  - Generate professional photos
  - Pivot to new category (same images)
  - Add more images mid-flow
  - Start fresh project
- ✅ Classic mode STILL works

---

## 🚨 RISK MITIGATION

### **Backup Strategy:**
1. Create feature branch: `pro-mode-sophisticated`
2. Commit after each phase
3. Test Classic mode after every change
4. Keep rollback points

### **Testing Strategy:**
1. Unit test each component
2. Integration test each phase
3. E2E test complete flow
4. Regression test Classic mode

### **Rollback Plan:**
```
If anything breaks:
1. Git revert to last working commit
2. Identify what broke
3. Fix in isolation
4. Re-apply carefully
```

---

## 📝 NEXT STEPS

1. **Review this plan** with team
2. **Create feature branch** for implementation
3. **Start with Phase 1** (cleanup & separation)
4. **Test Classic mode** after each change
5. **Proceed to Phase 2** (UX implementation)
6. **Complete Phase 3** (logic & integration)
7. **Final testing** and deployment

---

**Ready to start cleanup? Let's begin with PHASE 1! 🚀**
