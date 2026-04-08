# MAYA PRO MODE: STEP-BY-STEP IMPLEMENTATION PROMPTS
## Copy-Paste Ready Prompts for Each Task

**Status:** 📋 READY TO USE  
**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX

---

## 🎯 HOW TO USE THIS FILE

1. **Copy one prompt at a time**
2. **Paste it to AI assistant**
3. **Wait for completion and verification**
4. **Move to next prompt**
5. **Check off in checklist as you go**

**DO NOT:** Send multiple prompts at once. One at a time ensures focus and accuracy.

---

## 📋 PHASE 1: CLEANUP & SEPARATION

### **STEP 1.1: File Structure Creation**

#### **Task 1.1.1: Create Components Directory**
```
Create the new Pro Mode components directory structure.

Create directory: components/sselfie/pro-mode/
Create directory: components/sselfie/pro-mode/hooks/

Create placeholder files:
- components/sselfie/pro-mode/ProModeChat.tsx (empty placeholder)
- components/sselfie/pro-mode/ProModeHeader.tsx (empty placeholder)
- components/sselfie/pro-mode/ProModeInput.tsx (empty placeholder)
- components/sselfie/pro-mode/ImageLibraryModal.tsx (empty placeholder)
- components/sselfie/pro-mode/ImageUploadFlow.tsx (empty placeholder)
- components/sselfie/pro-mode/ConceptCardPro.tsx (empty placeholder)
- components/sselfie/pro-mode/hooks/useImageLibrary.ts (empty placeholder)
- components/sselfie/pro-mode/hooks/useProModeChat.ts (empty placeholder)
- components/sselfie/pro-mode/hooks/useConceptGeneration.ts (empty placeholder)

Each file should have: export default function ComponentName() { return null; }

Mark: Task 1.1.1 complete in checklist
```

#### **Task 1.1.2: Create API Routes Directory**
```
Create the new Pro Mode API routes directory structure.

Create directory: app/api/maya/pro/
Create directory: app/api/maya/pro/library/

Create placeholder files:
- app/api/maya/pro/chat/route.ts (empty placeholder with NextResponse)
- app/api/maya/pro/generate-concepts/route.ts (empty placeholder with NextResponse)
- app/api/maya/pro/library/get/route.ts (empty placeholder with NextResponse)
- app/api/maya/pro/library/update/route.ts (empty placeholder with NextResponse)
- app/api/maya/pro/library/clear/route.ts (empty placeholder with NextResponse)
- app/api/maya/pro/generate-image/route.ts (empty placeholder with NextResponse)

Each file should have basic Next.js route structure with POST handler returning empty JSON.

Mark: Task 1.1.2 complete in checklist
```

#### **Task 1.1.3: Create Lib Directory**
```
Create the new Pro Mode lib directory structure.

Create directory: lib/maya/pro/

Create placeholder files:
- lib/maya/pro/personality.ts (empty placeholder)
- lib/maya/pro/system-prompts.ts (empty placeholder)
- lib/maya/pro/category-system.ts (empty placeholder)
- lib/maya/pro/prompt-builder.ts (empty placeholder)
- lib/maya/pro/types.ts (empty placeholder)
- lib/maya/pro/design-system.ts (empty placeholder)

Each file should have basic export structure.

Mark: Task 1.1.3 complete in checklist
```

---

### **STEP 1.2: Remove Dead Code**

#### **Task 1.2.1: Remove workbench-strip.tsx**
```
Task 1.2.1: Remove workbench-strip.tsx and all its imports.

File to delete: components/studio-pro/workbench-strip.tsx

Also remove from maya-chat-screen.tsx:
- Line 35: import WorkbenchStrip
- All usages of WorkbenchStrip component
- All workbench-related state variables (check lines 202-238)

Before removing:
1. Search codebase for all imports/usages of workbench-strip
2. Verify it's only used in Pro Mode (not Classic Mode)
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors
3. Verify no console errors

Mark: Task 1.2.1 complete in checklist
```

#### **Task 1.2.2: Remove workbench-input-strip.tsx**
```
Task 1.2.2: Remove workbench-input-strip.tsx and all its imports.

File to delete: components/studio-pro/workbench-input-strip.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.2 complete in checklist
```

#### **Task 1.2.3: Remove workbench-prompt-box.tsx**
```
Task 1.2.3: Remove workbench-prompt-box.tsx and all its imports.

File to delete: components/studio-pro/workbench-prompt-box.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.3 complete in checklist
```

#### **Task 1.2.4: Remove workbench-result-card.tsx**
```
Task 1.2.4: Remove workbench-result-card.tsx and all its imports.

File to delete: components/studio-pro/workbench-result-card.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.4 complete in checklist
```

#### **Task 1.2.5: Remove workbench-guide-column.tsx**
```
Task 1.2.5: Remove workbench-guide-column.tsx and all its imports.

File to delete: components/studio-pro/workbench-guide-column.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.5 complete in checklist
```

#### **Task 1.2.6: Remove multi-prompt-box.tsx**
```
Task 1.2.6: Remove multi-prompt-box.tsx and all its imports.

File to delete: components/studio-pro/multi-prompt-box.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.6 complete in checklist
```

#### **Task 1.2.7: Remove multi-prompt-workbench.tsx**
```
Task 1.2.7: Remove multi-prompt-workbench.tsx and all its imports.

File to delete: components/studio-pro/multi-prompt-workbench.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.7 complete in checklist
```

#### **Task 1.2.8: Remove carousel-workbench.tsx**
```
Task 1.2.8: Remove carousel-workbench.tsx and all its imports.

File to delete: components/studio-pro/carousel-workbench.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.8 complete in checklist
```

#### **Task 1.2.9: Remove pro-mode-wrapper.tsx**
```
Task 1.2.9: Remove pro-mode-wrapper.tsx and all its imports.

File to delete: components/studio-pro/pro-mode-wrapper.tsx

Also remove from maya-chat-screen.tsx:
- Line 34: import ProModeWrapper
- All usages of ProModeWrapper component

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.9 complete in checklist
```

#### **Task 1.2.10: Remove pro-entry-flow.tsx**
```
Task 1.2.10: Remove pro-entry-flow.tsx and all its imports.

File to delete: components/studio-pro/pro-entry-flow.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.10 complete in checklist
```

#### **Task 1.2.11: Remove onboarding-flow.tsx**
```
Task 1.2.11: Remove onboarding-flow.tsx and all its imports.

File to delete: components/studio-pro/onboarding-flow.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.11 complete in checklist
```

#### **Task 1.2.12: Remove pro-dashboard.tsx**
```
Task 1.2.12: Remove pro-dashboard.tsx and all its imports.

File to delete: components/studio-pro/pro-dashboard.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.12 complete in checklist
```

#### **Task 1.2.13: Remove edit-reuse-workflow.tsx**
```
Task 1.2.13: Remove edit-reuse-workflow.tsx and all its imports.

File to delete: components/studio-pro/workflows/edit-reuse-workflow.tsx

Before removing:
1. Search codebase for all imports/usages
2. Verify it's only used in Pro Mode
3. List all places that need cleanup

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.13 complete in checklist
```

#### **Task 1.2.14: Clean maya-chat-screen.tsx - Remove Workbench State**
```
Task 1.2.14: Remove all workbench-related state from maya-chat-screen.tsx.

File: components/sselfie/maya-chat-screen.tsx

Remove these state variables:
- isWorkbenchExpanded (check lines 202-210)
- workbenchImageCount (check line 212)
- workbenchPrompt (check line 215)
- workbenchPrompts (check line 228)
- workbenchGuide (check line 231)

Also remove:
- isWorkbenchModeEnabled import (line 38)
- All conditional rendering based on isWorkbenchModeEnabled()
- All workbench-related useEffect hooks

Before removing:
1. List all workbench state variables found
2. List all workbench-related code blocks
3. Verify none are used in Classic Mode

After removing:
1. Test Classic Mode concept generation
2. Test Classic Mode chat
3. Verify no TypeScript errors
4. Verify no console errors

Mark: Task 1.2.14 complete in checklist
```

#### **Task 1.2.15: Clean maya-chat-screen.tsx - Remove Workflow State**
```
Task 1.2.15: Remove all workflow-related state from maya-chat-screen.tsx.

File: components/sselfie/maya-chat-screen.tsx

Remove these state variables:
- isWorkflowChat (check line 200)
- All workflow-related conditional rendering
- All workflow trigger handling (check lines 3746-3757)
- All workflow chat UI (check lines 2952-3044)

Before removing:
1. List all workflow state variables found
2. List all workflow-related code blocks
3. Verify none are used in Classic Mode

After removing:
1. Test Classic Mode concept generation
2. Test Classic Mode chat
3. Verify no TypeScript errors
4. Verify no console errors

Mark: Task 1.2.15 complete in checklist
```

#### **Task 1.2.16: Clean maya-chat-screen.tsx - Remove Old Upload Module State**
```
Task 1.2.16: Remove old upload module state from maya-chat-screen.tsx.

File: components/sselfie/maya-chat-screen.tsx

Remove these state variables:
- processedConceptMessagesRef (check line 163)
- carouselSlides (check line 225)
- promptSuggestions (check line 221)
- showManualUploadModule (check line 143)
- uploadModuleKey (check line 144)
- manualUploadCategory (check line 145)
- conceptGenerationImages (check lines 118-125)
- lastCategoryContext (check lines 128-140)

Also remove:
- loadPersistedUploadState function (check lines 102-115)
- All related useEffect hooks

Before removing:
1. List all old upload module state found
2. Verify none are used in Classic Mode
3. Check if any are used in current Pro Mode

After removing:
1. Test Classic Mode concept generation
2. Test Classic Mode chat
3. Verify no TypeScript errors

Mark: Task 1.2.16 complete in checklist
```

#### **Task 1.2.17: Clean pro-personality.ts - Remove Workbench References**
```
Task 1.2.17: Remove all workbench mode references from pro-personality.ts.

File: lib/maya/pro-personality.ts

Remove:
- All references to workbench mode (check lines 164, 257, 491)
- All [GENERATE_PROMPTS] trigger references (workbench only)
- All [SHOW_IMAGE_UPLOAD_MODULE] references (disabled)
- All workbench mode instructions

Keep:
- Clean personality (warm + sophisticated)
- [GENERATE_CONCEPTS] trigger guidance
- Category/brand expertise display
- Response format guidelines

Before removing:
1. List all workbench references found
2. Verify what to keep vs remove

After removing:
1. Verify file still exports correctly
2. Verify no syntax errors

Mark: Task 1.2.17 complete in checklist
```

#### **Task 1.2.18: Clean pro-personality.ts - Remove Workflow References**
```
Task 1.2.18: Remove all workflow guidance from pro-personality.ts.

File: lib/maya/pro-personality.ts

Remove:
- Workflow guidance sections (check lines 313-328, 411-428)
- All workflow-related instructions
- Generic SaaS language

Keep:
- Clean personality
- [GENERATE_CONCEPTS] guidance
- Category/brand expertise
- Professional language

Before removing:
1. List all workflow sections found
2. Verify what to keep

After removing:
1. Verify file still exports correctly
2. Verify no syntax errors

Mark: Task 1.2.18 complete in checklist
```

#### **Task 1.2.19: Clean generate-concepts route - Remove Workbench Detection**
```
Task 1.2.19: Remove workbench mode detection from generate-concepts route.

File: app/api/maya/generate-concepts/route.ts

Remove:
- Any workbench mode detection logic
- Workbench-specific conditional branches

Simplify:
- Keep Classic mode = Flux prompts (30-45 words)
- Keep Pro mode = Universal prompts + category system
- Clear separation between Classic and Pro

Before removing:
1. Search for workbench-related code
2. List all workbench detection found

After removing:
1. Test Classic Mode concept generation
2. Verify no TypeScript errors

Mark: Task 1.2.19 complete in checklist
```

#### **Task 1.2.20: Clean chat route - Remove Workbench Detection**
```
Task 1.2.20: Remove workbench mode detection from chat route.

File: app/api/maya/chat/route.ts

Remove:
- isWorkbenchMode detection (check line 544)
- Workbench-specific conditional logic
- Workbench mode personality selection

Simplify:
- Keep Classic mode chat flow
- Keep Pro mode chat flow (simplified)
- Clear personality selection

Before removing:
1. List all workbench detection found
2. Verify Classic Mode flow is preserved

After removing:
1. Test Classic Mode chat
2. Verify no TypeScript errors

Mark: Task 1.2.20 complete in checklist
```

#### **Task 1.2.21: Clean chat route - Remove Workflow Guidance**
```
Task 1.2.21: Remove workflow guidance from chat route.

File: app/api/maya/chat/route.ts

Remove:
- getWorkflowGuidance function (check lines 15-51)
- activeWorkflow detection (check line 525)
- Workflow-specific personality additions

Keep:
- Classic mode chat flow
- Pro mode chat flow
- Basic personality selection

Before removing:
1. List all workflow guidance found
2. Verify Classic Mode is not affected

After removing:
1. Test Classic Mode chat
2. Verify no TypeScript errors

Mark: Task 1.2.21 complete in checklist
```

---

### **STEP 1.3: Database Setup**

#### **Task 1.3.1: Create user_image_libraries Table Migration**
```
Task 1.3.1: Create migration file for user_image_libraries table.

Create file: scripts/migrations/XX-create-user-image-libraries.sql

Table structure:
- id SERIAL PRIMARY KEY
- user_id UUID NOT NULL REFERENCES users(id)
- selfies JSONB DEFAULT '[]'
- products JSONB DEFAULT '[]'
- people JSONB DEFAULT '[]'
- vibes JSONB DEFAULT '[]'
- current_intent TEXT
- created_at TIMESTAMP DEFAULT NOW()
- updated_at TIMESTAMP DEFAULT NOW()

Also create:
- Index on user_id
- Trigger for updated_at

Mark: Task 1.3.1 complete in checklist
```

#### **Task 1.3.2: Create pro_mode_sessions Table Migration**
```
Task 1.3.2: Create migration file for pro_mode_sessions table.

Create file: scripts/migrations/XX-create-pro-mode-sessions.sql

Table structure:
- id SERIAL PRIMARY KEY
- user_id UUID NOT NULL REFERENCES users(id)
- chat_id INTEGER REFERENCES maya_chats(id)
- library_snapshot JSONB
- concepts_generated INTEGER DEFAULT 0
- images_generated INTEGER DEFAULT 0
- created_at TIMESTAMP DEFAULT NOW()

Also create:
- Index on user_id
- Index on chat_id

Mark: Task 1.3.2 complete in checklist
```

---

## 🎨 PHASE 2: SOPHISTICATED UX IMPLEMENTATION

### **STEP 2.1: Design System**

#### **Task 2.1.1: Create Design System File**
```
Task 2.1.1: Create the design system file with all tokens.

File: lib/maya/pro/design-system.ts

Include:
- Typography tokens (Canela, Hatton, Inter with sizes/weights)
- Color tokens (Stone palette with warm cream)
- Spacing tokens
- Border radius tokens
- Layout principles
- UILabels object (NO emojis - "Selfies • 3" format)
- ButtonLabels object (NO emojis - "Begin Setup" format)

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 2.1

Mark: Task 2.1.1 complete in checklist
```

---

### **STEP 2.2: Image Upload Flow**

#### **Task 2.2.1: Create ImageUploadFlow Component - Step 1 Welcome**
```
Task 2.2.1: Create ImageUploadFlow component with Step 1 (Welcome screen).

File: components/sselfie/pro-mode/ImageUploadFlow.tsx

Step 1 Welcome Screen:
- "Studio Pro Mode" (Canela, 32px, Stone 900)
- "Let's gather your images to begin" (Hatton, 18px, Stone 700)
- Body text explaining process (Inter Light, 14px, Stone 600)
- "[ Begin Setup ]" button (Inter Medium, 14px, tracking 0.5px)
- Professional, editorial feel
- NO emojis in UI

Reference: Vision document - MOMENT 2: IMAGE LIBRARY SETUP

Mark: Task 2.2.1 complete in checklist
```

#### **Task 2.2.2: Create ImageUploadFlow Component - Step 2 Selfies**
```
Task 2.2.2: Add Step 2 (Selfies - Required) to ImageUploadFlow.

File: components/sselfie/pro-mode/ImageUploadFlow.tsx

Step 2 Selfies:
- "Selfies" header (no emoji)
- "Required" label
- Description: "Front-facing photos for face and features"
- "[ Choose from Gallery ]" and "[ Upload New ]" buttons
- Clean, professional interface
- Elegant dividing lines (stone-200/60)

Reference: Vision document - Step 2 structure

Mark: Task 2.2.2 complete in checklist
```

#### **Task 2.2.3: Create ImageUploadFlow Component - Step 3 Optional Categories**
```
Task 2.2.3: Add Step 3 (Products, People, Vibes - Optional) to ImageUploadFlow.

File: components/sselfie/pro-mode/ImageUploadFlow.tsx

Step 3 Optional Categories:
- Products section with "Optional" label
- People section with "Optional" label
- Vibes & Inspiration section with "Optional" label
- Each with descriptions and upload buttons
- Elegant dividing lines between sections
- Professional labels throughout

Reference: Vision document - Step 3 structure

Mark: Task 2.2.3 complete in checklist
```

#### **Task 2.2.4: Create ImageUploadFlow Component - Step 4 Intent**
```
Task 2.2.4: Add Step 4 (Intent Description) to ImageUploadFlow.

File: components/sselfie/pro-mode/ImageUploadFlow.tsx

Step 4 Intent:
- "What would you like to create with these images?"
- Text input for intent description
- "[ Continue ]" button
- Navigation between steps
- Validation

Reference: Vision document - Step 4 structure

Mark: Task 2.2.4 complete in checklist
```

#### **Task 2.2.5: Create ImageUploadFlow Component - After State**
```
Task 2.2.5: Add "After Images Added" state to ImageUploadFlow.

File: components/sselfie/pro-mode/ImageUploadFlow.tsx

After State:
- Show "Selfies • 3" with "[ Manage ]" button
- Show image thumbnails
- Show "Products • 2" with "[ Manage ]" button
- Show "Vibes • 2" with "[ Manage ]" button
- Display current intent
- "[ Start Creating ]" button
- Clean, elegant layout

Reference: Vision document - After images added section

Mark: Task 2.2.5 complete in checklist
```

---

### **STEP 2.3: Creative Workspace**

#### **Task 2.3.1: Create ProModeHeader Component**
```
Task 2.3.1: Create ProModeHeader component.

File: components/sselfie/pro-mode/ProModeHeader.tsx

Features:
- "Studio Pro" title (Hatton, 16px)
- "Library • 7 images" display (Inter Regular, 13px)
- "[ Manage ]" dropdown button
- Credits display
- Professional, minimal design
- NO emojis

Reference: Vision document - Top Navigation section

Mark: Task 2.3.1 complete in checklist
```

#### **Task 2.3.2: Create ProModeInput Component**
```
Task 2.3.2: Create ProModeInput component.

File: components/sselfie/pro-mode/ProModeInput.tsx

Features:
- Clean text input (NO emoji placeholders)
- Image icon button
- Send button
- "[ Manage Library ]" text button
- Professional styling
- Uses design system tokens

Reference: Vision document - Chat Interface section

Mark: Task 2.3.2 complete in checklist
```

#### **Task 2.3.3: Create ProModeChat Component Structure**
```
Task 2.3.3: Create ProModeChat component structure.

File: components/sselfie/pro-mode/ProModeChat.tsx

Structure:
- ProModeHeader at top
- Concept cards rendering area (sophisticated)
- ProModeInput at bottom
- Message rendering (Maya chat with emojis allowed)
- Professional layout
- Uses design system

Reference: Vision document - Creative Workspace section

Mark: Task 2.3.3 complete in checklist
```

---

### **STEP 2.4: Concept Cards (Sophisticated)**

#### **Task 2.4.1: Create ConceptCardPro Component**
```
Task 2.4.1: Create ConceptCardPro component with editorial quality design.

File: components/sselfie/pro-mode/ConceptCardPro.tsx

Design:
- Title: Hatton serif (e.g., "Morning Ritual Glow")
- Description: Inter Light (2-3 sentences)
- Elegant dividing line (stone-200/60)
- "Images Linked • 3" label (NO emoji)
- Shows which images: "Selfie 1 • Rhode Peptide Treatment • Beach Scene 1"
- "Category" section: "Beauty & Skincare"
- "Aesthetic" section: "Coastal wellness, clean beauty, morning ritual"
- "[ View Prompt ]" and "[ Generate ]" buttons (NO emojis)

Reference: Vision document - Concept Cards section

Mark: Task 2.4.1 complete in checklist
```

#### **Task 2.4.2: Create View Prompt Modal**
```
Task 2.4.2: Create View Prompt modal for ConceptCardPro.

File: components/sselfie/pro-mode/ConceptCardPro.tsx (add modal)

Modal shows:
- Full 250-500 word prompt
- Category, template, brand references
- Professional photography language
- Real brand names (CHANEL headband, Alo leggings)
- Specific styling details
- Technical photography specifications
- Editorial quality throughout
- "[ Edit Prompt ]" and "[ Close ]" buttons

Reference: Vision document - View Prompt Modal section

Mark: Task 2.4.2 complete in checklist
```

---

### **STEP 2.5: Library Management**

#### **Task 2.5.1: Create ImageLibraryModal Component**
```
Task 2.5.1: Create ImageLibraryModal component.

File: components/sselfie/pro-mode/ImageLibraryModal.tsx

Features:
- Sophisticated modal design
- Categories with counts: "Selfies • 3" (NO emojis)
- Image grid display
- "[ Manage ]" buttons (no icons unless necessary)
- "Current Intent" display
- "[ Start Fresh Project ]" option with confirmation
- Clean, editorial feel
- Uses design system

Reference: Vision document - Library Management section

Mark: Task 2.5.1 complete in checklist
```

---

## ⚙️ PHASE 3: LOGIC & INTEGRATION

### **STEP 3.1: Category System**

#### **Task 3.1.1: Create Category System File**
```
Task 3.1.1: Create category system with 6 categories.

File: lib/maya/pro/category-system.ts

Categories:
1. WELLNESS - Alo Yoga, Lululemon, Outdoor Voices
2. LUXURY - CHANEL, Dior, Bottega Veneta, The Row
3. LIFESTYLE - Glossier, Free People, Jenni Kayne
4. FASHION - Reformation, Everlane, Aritzia, Toteme
5. TRAVEL - Airport scenes, vacation mode, jet-set
6. BEAUTY - Rhode, Glossier, The Ordinary

Include:
- detectCategory() function
- getCategoryPrompts() function
- Brand detection logic

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.1

Mark: Task 3.1.1 complete in checklist
```

---

### **STEP 3.2: Prompt Building**

#### **Task 3.2.1: Create Prompt Builder File**
```
Task 3.2.1: Create prompt builder for Pro Mode.

File: lib/maya/pro/prompt-builder.ts

Functions:
- buildProModePrompt() - Main function (250-500 words)
- buildOutfitSection() - With real brand names
- buildPoseSection()
- buildLightingSection()
- buildSettingSection()
- buildMoodSection()
- buildAestheticDescription()

Requirements:
- Real brand names (CHANEL headband, Alo leggings)
- Professional photography language
- 250-500 words
- Specific sections (Outfit, Pose, Lighting, Setting, Mood)
- NO generic "stylish outfit"

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.2

Mark: Task 3.2.1 complete in checklist
```

---

### **STEP 3.3: State Management**

#### **Task 3.3.1: Create useImageLibrary Hook**
```
Task 3.3.1: Create useImageLibrary hook.

File: components/sselfie/pro-mode/hooks/useImageLibrary.ts

Features:
- Centralized image library state
- loadLibrary() - Load from database
- saveLibrary() - Save to database + localStorage
- addImages() - Add images to category
- removeImages() - Remove images
- clearLibrary() - Clear all
- updateIntent() - Update intent description
- getTotalImageCount() - Helper function
- Database persistence
- localStorage sync

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.3

Mark: Task 3.3.1 complete in checklist
```

#### **Task 3.3.2: Create useProModeChat Hook**
```
Task 3.3.2: Create useProModeChat hook.

File: components/sselfie/pro-mode/hooks/useProModeChat.ts

Features:
- Chat state management
- Integration with Pro Mode API
- Handle [GENERATE_CONCEPTS] trigger
- Message handling
- Error handling

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.3

Mark: Task 3.3.2 complete in checklist
```

#### **Task 3.3.3: Create useConceptGeneration Hook**
```
Task 3.3.3: Create useConceptGeneration hook.

File: components/sselfie/pro-mode/hooks/useConceptGeneration.ts

Features:
- Concept generation logic
- Integration with category system
- Integration with prompt builder
- Image linking logic
- Error handling

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.3

Mark: Task 3.3.3 complete in checklist
```

---

### **STEP 3.4: API Integration**

#### **Task 3.4.1: Implement Pro Mode Chat API Route**
```
Task 3.4.1: Implement Pro Mode chat API route.

File: app/api/maya/pro/chat/route.ts

Features:
- Pro Mode chat only
- Use Pro personality
- Handle concept generation triggers
- Error handling
- Credit checking

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.4

Mark: Task 3.4.1 complete in checklist
```

#### **Task 3.4.2: Implement Pro Mode Generate Concepts API Route**
```
Task 3.4.2: Implement Pro Mode generate concepts API route.

File: app/api/maya/pro/generate-concepts/route.ts

Features:
- Pro mode only
- Category detection
- Universal Prompts integration
- Prompt builder integration
- Image linking to prompts
- Return concepts with full prompts

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.4

Mark: Task 3.4.2 complete in checklist
```

#### **Task 3.4.3: Implement Library Get API Route**
```
Task 3.4.3: Implement library get API route.

File: app/api/maya/pro/library/get/route.ts

Features:
- Get user's image library
- Return selfies, products, people, vibes
- Return current intent
- Error handling

Mark: Task 3.4.3 complete in checklist
```

#### **Task 3.4.4: Implement Library Update API Route**
```
Task 3.4.4: Implement library update API route.

File: app/api/maya/pro/library/update/route.ts

Features:
- Update image library
- Handle image additions/removals
- Update intent
- Database persistence
- Error handling

Mark: Task 3.4.4 complete in checklist
```

#### **Task 3.4.5: Implement Library Clear API Route**
```
Task 3.4.5: Implement library clear API route.

File: app/api/maya/pro/library/clear/route.ts

Features:
- Clear all images and intent
- Reset library to empty state
- Database update
- Error handling

Mark: Task 3.4.5 complete in checklist
```

#### **Task 3.4.6: Implement Pro Mode Generate Image API Route**
```
Task 3.4.6: Implement Pro Mode generate image API route.

File: app/api/maya/pro/generate-image/route.ts

Features:
- Use Nano Banana Pro
- Use full 250-500 word prompts
- Image generation
- Credit deduction
- Error handling

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.4

Mark: Task 3.4.6 complete in checklist
```

---

### **STEP 3.5: Chat Flow Logic**

#### **Task 3.5.1: Create Chat Flow Logic File**
```
Task 3.5.1: Create chat flow logic file.

File: lib/maya/pro/chat-logic.ts

Functions:
- handleProModeMessage() - Main handler
- isConceptRequest() - Detect concept requests
- isLibraryUpdate() - Detect library updates
- isPivotRequest() - Detect category pivots
- buildMayaResponse() - Build Maya's response
- buildConversationalResponse() - Build chat response

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.5

Mark: Task 3.5.1 complete in checklist
```

---

### **STEP 3.6: Maya's Expertise Display**

#### **Task 3.6.1: Implement Maya's Expertise Display**
```
Task 3.6.1: Implement Maya's expertise display in chat.

When user asks "What can you create?":
- Show all 6 categories with descriptions
- Show brand databases for each category
- Show template library counts
- Show strategic recommendations based on user's library

When generating concepts:
- Show category selected
- Show template used
- Show brand database references
- Show images being linked
- Show specific styling details

Reference: docs/MAYA-PRO-MODE-CLEANUP-PLAN.md STEP 3.6

Mark: Task 3.6.1 complete in checklist
```

---

## ✅ FINAL TESTING

#### **Task FINAL.1: Test Classic Mode**
```
Task FINAL.1: Comprehensive Classic Mode testing.

Test:
- Classic Mode concept generation
- Classic Mode image generation (Flux)
- Classic Mode chat flow
- Verify Classic Mode unchanged
- No console errors
- No TypeScript errors

Mark: Task FINAL.1 complete in checklist
```

#### **Task FINAL.2: Test Pro Mode End-to-End**
```
Task FINAL.2: Comprehensive Pro Mode end-to-end testing.

Test:
- Image upload flow (4 steps)
- Library management
- Concept generation
- Image generation (Nano Banana Pro)
- Category detection
- Brand detection
- Prompt building (250-500 words)
- Maya expertise display
- Pivoting between categories
- Adding images mid-flow
- Start Fresh functionality

Mark: Task FINAL.2 complete in checklist
```

#### **Task FINAL.3: Verify UI/UX**
```
Task FINAL.3: Verify UI/UX matches vision.

Verify:
- NO emojis in UI elements
- Elegant typography (Canela, Hatton, Inter)
- Sophisticated color palette
- Professional, editorial feel
- Clean, minimal design
- Responsive design (mobile, tablet, desktop)

Mark: Task FINAL.3 complete in checklist
```

---

## 📝 USAGE INSTRUCTIONS

1. **Copy one prompt at a time**
2. **Paste to AI assistant**
3. **Wait for completion report**
4. **Verify results**
5. **Check off in checklist**
6. **Move to next prompt**

**DO NOT send multiple prompts at once!**

---

## ✅ PROGRESS TRACKING

**Total Tasks:** 50+ tasks across 3 phases

**Current Status:** Ready to start

**Next Task:** Task 1.1.1 - Create Components Directory

---

**Ready to begin? Start with Task 1.1.1! 🚀**
