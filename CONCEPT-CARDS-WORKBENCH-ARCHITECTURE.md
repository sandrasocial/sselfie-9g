# Concept Cards vs Workbench Architecture

## Overview

Studio Pro has two distinct creation paths, each serving different user needs:

1. **Concept Cards** - AI-guided creation (Maya generates prompts)
2. **Workbench** - Manual creation (users write their own prompts)

Both use the same generation endpoint (`/api/maya/generate-studio-pro`) but with different modes and prompt sources.

---

## Concept Cards Flow

### UX Flow
1. User chats with Maya → Maya generates concept cards
2. User adds reference images (upload or gallery) to each concept card
3. User clicks "Create with Studio Pro"
4. System uses Maya's generated prompt + user's images → Generate

### Technical Flow
```
Maya Chat → [GENERATE_CONCEPTS] → concept.prompt (Maya's detailed prompt)
    ↓
Concept Card Component
    ↓
User adds images (upload/gallery)
    ↓
/api/maya/generate-studio-pro
  - mode: "brand-scene"
  - userRequest: concept.prompt (Maya's prompt)
  - inputImages: user-selected images
    ↓
buildNanoBananaPrompt() → buildBrandScenePrompt()
  - Uses Maya's prompt
  - Adds brand context
  - Applies Nano Banana optimization
    ↓
Nano Banana Pro Generation
```

### Key Files
- **Component**: `components/sselfie/concept-card.tsx`
- **Prompt Source**: `concept.prompt` (from Maya's concept generation)
- **Mode**: `"brand-scene"`
- **Prompt Builder**: `buildBrandScenePrompt()` in `lib/maya/nano-banana-prompt-builder.ts`

### Characteristics
- ✅ Uses Maya's AI-generated prompts (optimized, brand-aware)
- ✅ Prompts go through full AI transformation with brand context
- ✅ User only needs to add reference images
- ✅ Perfect for users who don't want to write prompts

---

## Workbench Flow

### UX Flow
1. User writes their own prompt in workbench prompt box
2. User selects images from gallery or uploads
3. User clicks "Generate"
4. System uses user's prompt + selected images → Generate

### Technical Flow
```
Workbench Component
    ↓
User writes prompt (manual)
    ↓
User selects images (upload/gallery)
    ↓
/api/maya/generate-studio-pro
  - mode: "workbench"
  - userRequest: user-written prompt
  - inputImages: user-selected images
    ↓
buildNanoBananaPrompt() → Early return
  - Returns user's prompt directly (no transformation)
  - NO AI modification
  - NO brand context injection
    ↓
Nano Banana Pro Generation
```

### Key Files
- **Components**: 
  - `components/studio-pro/workbench-strip.tsx` (main workbench)
  - `components/studio-pro/carousel-workbench.tsx` (carousel slides)
  - `components/studio-pro/multi-prompt-workbench.tsx` (multiple prompts)
- **Prompt Source**: User-written (from prompt input box)
- **Mode**: `"workbench"`
- **Prompt Builder**: Early return in `buildNanoBananaPrompt()` (line 276-283)

### Characteristics
- ✅ Uses user-written prompts (full control)
- ✅ NO AI transformation (prompt used exactly as written)
- ✅ Perfect for power users who want manual control
- ✅ User has complete creative control

---

## Critical Separation

### Prompt Sources
| Feature | Prompt Source | Mode | AI Transformation |
|---------|--------------|------|-------------------|
| **Concept Cards** | `concept.prompt` (Maya-generated) | `"brand-scene"` | ✅ Yes (full brand context) |
| **Workbench** | User-written (from input) | `"workbench"` | ❌ No (direct use) |

### Code Enforcement

**Concept Cards** (`components/sselfie/concept-card.tsx`):
```typescript
// CRITICAL: Concept cards ALWAYS use Maya's generated prompt (concept.prompt)
const userRequest = concept.prompt || `${concept.title}: ${concept.description}`

body: JSON.stringify({
  mode: "brand-scene", // Concept cards use brand-scene mode (Maya's prompt building)
  userRequest: userRequest, // Maya's generated prompt from concept generation
  // ...
})
```

**Workbench** (`components/studio-pro/workbench-strip.tsx`):
```typescript
// CRITICAL: Workbench ALWAYS uses user-written prompts (no AI transformation)
body: JSON.stringify({
  mode: 'workbench', // Workbench mode: user's prompt used directly (no AI transformation)
  userRequest: prompt, // User-written prompt (NOT Maya-generated)
  // ...
})
```

**Prompt Builder** (`lib/maya/nano-banana-prompt-builder.ts`):
```typescript
// WORKBENCH MODE: User-written prompts (no AI transformation)
if (normalizedMode === 'workbench') {
  // NO AI transformation, NO brand context injection, NO prompt building
  return {
    optimizedPrompt: userRequest.trim(),
    sceneDescription: 'Workbench generation',
  }
}

// BRAND-SCENE MODE: Maya-generated prompts (concept cards)
case 'brand-scene':
  // Concept cards use Maya's generated prompts (from concept.prompt)
  // These prompts go through full AI transformation with brand context
  optimizedPrompt = buildBrandScenePrompt({
    userRequest, // This is Maya's generated prompt from concept generation
    // ...
  })
```

---

## Image Selection

Both flows support the same image selection:
- ✅ Upload from device
- ✅ Select from gallery
- ✅ Up to 4 reference images
- ✅ Same UI components (`ImageGalleryModal`, file upload)

**Implementation**: 
- Concept cards: `components/sselfie/concept-card.tsx` (lines 55-183)
- Workbench: `components/studio-pro/workbench-input-strip.tsx`

---

## No Conflicts

### ✅ Verified Separation
1. **Concept cards** → Always use `mode: "brand-scene"` + `concept.prompt`
2. **Workbench** → Always use `mode: "workbench"` + user-written prompt
3. **Prompt builder** → Handles both modes differently (early return for workbench)
4. **No duplicate paths** → Single endpoint, different modes

### ✅ No Overlap
- Concept cards never use workbench mode
- Workbench never uses Maya's prompts
- Each has distinct code paths
- Clear separation in prompt builder

---

## Summary

**Concept Cards** = AI-guided, easy creation
- Maya generates prompts → User adds images → Generate
- Perfect for users who don't want to write prompts

**Workbench** = Manual control, power users
- User writes prompt → User selects images → Generate
- Perfect for users who want full creative control

Both paths are clean, separate, and serve different user needs! 🎨

