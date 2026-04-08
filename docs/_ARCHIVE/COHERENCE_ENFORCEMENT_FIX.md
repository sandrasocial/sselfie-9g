# Coherence Enforcement + Nano Banana Prompt Assembly Fix

**Date:** 2026-01-18  
**Status:** ✅ COMPLETE

---

## Problem Statement

Despite the Style Coherence Resolver being implemented, outputs were still producing incoherent results:

- ❌ Defaulting to business objects (laptops, coffee, desks)
- ❌ Using flatlays during athletic/wellness selections
- ❌ Selecting locations unrelated to outfits
- ❌ Producing incoherent scenes despite resolver existing

**Root Causes Identified:**

1. **Coherence resolver NOT mandatory** - Optional usage, old code paths bypassed it
2. **Template objects leaked** - Flatlay frames injected laptops/coffee before fashion context
3. **Multi-scene prompts** - Full-body + flatlay mixed in ONE prompt
4. **Wrong prompt structure** - Violated Nano Banana Pro best practices
5. **No fashion context guardrails** - Athletic selections still received office props

---

## Solution Overview

This was an **assembly + enforcement fix**, NOT a creativity problem. We did NOT:
- ❌ Add more adjectives
- ❌ Lengthen prompts
- ❌ Add more brands
- ❌ Tune Nano Banana parameters
- ❌ Rewrite templates blindly

We DID:
- ✅ Hard-enforce coherence resolver
- ✅ Filter conflicting objects based on fashion context
- ✅ Enforce single-scene prompts
- ✅ Rewrite prompt assembly structure
- ✅ Add athletic/wellness guardrails
- ✅ Add debug visibility

---

## Phase 1: Hard Enforcement (MANDATORY)

### Objective
Make the coherence resolver **non-optional** for all Pro Mode generation.

### Changes

#### 1. Updated `lib/maya/prompt-authority.ts`

**Added enforcement guard:**
```typescript
if (context?.generationMode === 'pro') {
  // CRITICAL: resolvedFashionStyle is MANDATORY for coherence enforcement
  if (!context.resolvedFashionStyle) {
    console.error('[PROMPT-AUTHORITY] ❌ CRITICAL: resolvedFashionStyle is REQUIRED for Pro Mode')
    throw new Error('COHERENCE_RESOLVER_REQUIRED: resolvedFashionStyle must be provided in context')
  }
  
  const nanoBananaInput = await adaptFeedPlannerToNanoBanana({
    // ...
    resolvedFashionStyle: context.resolvedFashionStyle, // MANDATORY
  })
}
```

**Context type updated:**
```typescript
context?: {
  // ...
  resolvedFashionStyle?: string // MANDATORY for Pro Mode - from coherence resolver
}
```

#### 2. Updated `lib/feed-planner/nano-banana-adapter.ts`

**Added validation at entry:**
```typescript
export async function adaptFeedPlannerToNanoBanana(params: AdaptFeedPlannerParams) {
  const { resolvedFashionStyle } = params
  
  // ENFORCE COHERENCE RESOLVER
  if (!resolvedFashionStyle) {
    console.error('[NANO-BANANA-ADAPTER] ❌ CRITICAL: resolvedFashionStyle is REQUIRED')
    throw new Error('COHERENCE_RESOLVER_NOT_CALLED: resolvedFashionStyle is required')
  }
  
  // Continue...
}
```

**Updated params interface:**
```typescript
interface AdaptFeedPlannerParams {
  // ...
  resolvedFashionStyle: string // MANDATORY - from coherence resolver
}
```

#### 3. Updated all call sites in `app/api/feed/[feedId]/generate-single/route.ts`

**Replaced separate calls:**
```typescript
// ❌ OLD (bypassed coherence resolver)
const { category, mood } = await getCategoryAndMood(...)
const fashionStyle = await getFashionStyleForPosition(...)
```

**With unified coherence call:**
```typescript
// ✅ NEW (enforces coherence resolver)
const { getCoherentStyleParameters } = await import("@/lib/feed-planner/generation-helpers")
const {
  category,
  mood,
  fashionStyle: resolvedFashionStyle,
  adaptationApplied
} = await getCoherentStyleParameters(feedLayout, user, post.position, options)

if (adaptationApplied) {
  console.log(`[GENERATE-SINGLE] ⚠️ Fashion style adapted for coherence: ${resolvedFashionStyle}`)
}
```

**Updated 4 call sites:**
1. Paid blueprint users (line ~544)
2. Free users full feeds (line ~611)
3. Membership users (line ~676)
4. Paid blueprint users (no preview) (line ~954)

**Pass resolvedFashionStyle to authority:**
```typescript
const authorityResult = await generateFeedSinglePromptViaAuthority(
  injectedTemplate,
  post.position,
  {
    // ...
    resolvedFashionStyle: resolvedFashionStyle, // MANDATORY: Coherent fashion style
  }
)
```

---

## Phase 2: Template Object Sanitation

### Objective
Filter out conflicting objects (laptop, coffee, desk) based on fashion context.

### Implementation

**Fashion Context Rules Matrix:**

```typescript
const FASHION_CONTEXT_RULES: Record<string, {
  allowedFrameTypes: FrameType[]
  blockedObjects: string[]
  allowedLocations: string[]
}> = {
  // ATHLETIC & WELLNESS CONTEXTS
  'athletic': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup'], // NO flatlays
    blockedObjects: ['laptop', 'coffee', 'desk', 'workspace', 'office', ...],
    allowedLocations: ['gym', 'studio', 'outdoor', 'park', 'wellness', ...]
  },
  'elevated_athleisure': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup'], // NO flatlays
    blockedObjects: ['laptop', 'coffee', 'desk', 'workspace', 'office', ...],
    allowedLocations: ['luxury studio', 'modern gym', 'urban architectural', ...]
  },
  
  // BUSINESS & PROFESSIONAL CONTEXTS (Allow flatlays)
  'business': {
    allowedFrameTypes: ['full_body', 'midshot', 'closeup', 'flatlay'],
    blockedObjects: ['gym equipment', 'yoga mat', 'dumbbells', ...],
    allowedLocations: ['office', 'workspace', 'conference room', ...]
  },
  
  // ... 10 fashion styles total
}
```

**Object Sanitization:**

```typescript
function sanitizeFrameDescription(
  description: string,
  blockedObjects: string[],
  resolvedFashionStyle: string
): string {
  let sanitized = description
  
  // Remove blocked objects
  for (const blockedObject of blockedObjects) {
    const regex = new RegExp(`\\b${blockedObject}\\b`, 'gi')
    if (regex.test(sanitized)) {
      console.log(`[NANO-BANANA-ADAPTER] 🧹 Sanitizing: Removed "${blockedObject}" for ${resolvedFashionStyle}`)
      sanitized = sanitized.replace(regex, '')
    }
  }
  
  return sanitized
}
```

**Frame Type Blocking:**

```typescript
// Check if frame type is allowed for this fashion context
if (!fashionRules.allowedFrameTypes.includes(frameType)) {
  console.warn('[NANO-BANANA-ADAPTER] 🚫 Frame type blocked:', {
    frameType,
    resolvedFashionStyle,
    reason: 'Frame type incompatible with fashion context'
  })
  
  // Skip this frame - return minimal prompt
  return buildFallbackPrompt(...)
}
```

---

## Phase 3: Single-Scene Prompt Rule

### Objective
Enforce ONE SCENE = ONE PROMPT (no multi-scene mixing).

### Implementation

**Frame Type Detection:**

```typescript
function detectFrameType(description: string): FrameType {
  const descLower = description.toLowerCase()
  
  // Flatlay detection
  if (descLower.includes('overhead') || 
      descLower.includes('flatlay') ||
      descLower.includes('desk') ||
      descLower.includes('workspace') ||
      descLower.includes('laptop')) {
    return 'flatlay'
  }
  
  // Close-up detection
  if (descLower.includes('close-up') || descLower.includes('detail')) {
    return 'closeup'
  }
  
  // Full body detection
  if (descLower.includes('full-body') || descLower.includes('walking')) {
    return 'full_body'
  }
  
  return 'midshot'
}
```

**Single Frame Extraction:**

```typescript
// Extract SINGLE frame for this position (no multi-scene)
const frameData = parsed.frames.find(f => f.position === position)

if (!frameData) {
  // Use fallback for missing frame
  return buildFallbackPrompt(...)
}

const frameType = detectFrameType(frameData.description)

// Apply fashion context rules to THIS SINGLE FRAME
const fashionRules = FASHION_CONTEXT_RULES[resolvedFashionStyle] || DEFAULT_FASHION_RULES

// Filter conflicting objects from THIS SINGLE FRAME
let sanitizedDescription = sanitizeFrameDescription(
  frameData.description,
  fashionRules.blockedObjects,
  resolvedFashionStyle
)

// Build prompt for THIS SINGLE FRAME ONLY
const finalPrompt = buildSingleScenePrompt({
  frameDescription: sanitizedDescription,
  resolvedFashionStyle,
  category,
  mood,
  setting: parsed.setting,
  brandKit,
  position,
  frameType
})
```

---

## Phase 4: Proper Nano Banana Structure

### Objective
Rewrite prompt assembly to match Nano Banana Pro best practices.

### MANDATORY STRUCTURE

```typescript
function buildSingleScenePrompt(params): string {
  const parts: string[] = []
  
  // ========================================================================
  // STRUCTURE 1: IDENTITY ANCHOR (FIRST, ONCE ONLY)
  // ========================================================================
  
  parts.push('A realistic photo of the person shown in the reference images')
  
  // ========================================================================
  // STRUCTURE 2: SUBJECT + OUTFIT (CORE SCENE)
  // ========================================================================
  
  let cleanDescription = frameDescription
    .replace(/^shows the subject\s*/i, 'The subject ')
    .replace(/shows\s+/gi, '')
  
  parts.push(cleanDescription)
  
  // ========================================================================
  // STRUCTURE 3: SETTING (ONLY ONE, CLEAR)
  // ========================================================================
  
  if (setting && setting.trim() && frameType !== 'flatlay') {
    parts.push(`The photo is taken in ${setting}`)
  }
  
  // ========================================================================
  // STRUCTURE 4: LIGHTING + MOOD (ATMOSPHERE)
  // ========================================================================
  
  if (mood === 'luxury') {
    parts.push('Dramatic moody lighting with rich shadows')
  } else if (mood === 'minimal') {
    parts.push('Bright airy lighting with clean high-key feel')
  } else {
    parts.push('Natural lighting with soft realistic shadows')
  }
  
  if (category && category !== 'professional') {
    parts.push(categoryAesthetics[category])
  }
  
  // ========================================================================
  // STRUCTURE 5: TECHNICAL SPECS (CAMERA)
  // ========================================================================
  
  parts.push('Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic')
  
  // ========================================================================
  // FINAL ASSEMBLY (Use periods for structure, not commas)
  // ========================================================================
  
  return parts.join('. ').trim()
}
```

**Key Differences from Old Approach:**

| Old (Broken) | New (Fixed) |
|--------------|-------------|
| Multi-scene in one prompt | Single scene only |
| Identity repeated multiple times | Identity ONCE, FIRST |
| Objects before outfit | Outfit first, objects filtered |
| Comma-separated tags | Period-separated sentences |
| 200+ words | 80-130 words |
| System labels mixed in | Natural language only |

---

## Phase 5: Athletic/Wellness Guardrails

### Objective
Enforce location and object compatibility for athletic/wellness contexts.

### Implementation

**Athletic Context Rules:**

```typescript
'athletic': {
  allowedFrameTypes: ['full_body', 'midshot', 'closeup'], // NO flatlays
  blockedObjects: [
    'laptop', 'coffee', 'desk', 'workspace', 'office', 
    'computer', 'notebook', 'journal', 'cup'
  ],
  allowedLocations: [
    'gym', 'studio', 'outdoor', 'park', 'wellness', 
    'fitness', 'architectural', 'urban', 'minimal space'
  ]
}
```

**Elevated Athleisure Context:**

```typescript
'elevated_athleisure': {
  allowedFrameTypes: ['full_body', 'midshot', 'closeup'], // NO flatlays
  blockedObjects: [
    'laptop', 'coffee', 'desk', 'workspace', 'office', 
    'computer', 'notebook', 'journal'
  ],
  allowedLocations: [
    'luxury studio', 'modern gym', 'urban architectural', 
    'rooftop', 'penthouse', 'minimal space'
  ]
}
```

**Street Athletic Context:**

```typescript
'street_athletic': {
  allowedFrameTypes: ['full_body', 'midshot', 'closeup'], // NO flatlays
  blockedObjects: [
    'laptop', 'desk', 'workspace', 'office', 
    'computer', 'notebook', 'journal'
  ],
  allowedLocations: [
    'street', 'urban', 'city', 'architectural', 
    'graffiti wall', 'subway', 'sidewalk'
  ]
}
```

**Enforcement:**

- ❌ Blocks flatlay frames for ALL athletic variants
- ❌ Removes laptop/coffee/desk from frame descriptions
- ❌ Filters office/workspace locations
- ✅ Allows only compatible locations per context
- ✅ Logs all sanitization actions

---

## Phase 6: Debug Visibility

### Objective
Add comprehensive logging to trace prompt assembly and debug issues.

### Implementation

**Prompt Trace Log:**

```typescript
console.log('[NANO-BANANA-ADAPTER] 🔍 PROMPT TRACE:', {
  position,
  frameType,
  resolvedFashionStyle,
  category,
  mood,
  templateKey: `${category}_${mood}`,
  promptLength: finalPrompt.length,
  promptPreview: finalPrompt.substring(0, 150) + '...',
  blockedObjects: fashionRules.blockedObjects.length > 0 ? fashionRules.blockedObjects : 'none'
})
```

**Coherence Enforcement Log:**

```typescript
console.log('[NANO-BANANA-ADAPTER] ✅ Coherence resolver enforced:', {
  position,
  resolvedFashionStyle,
  category,
  mood,
  userId
})
```

**Object Sanitization Log:**

```typescript
console.log(`[NANO-BANANA-ADAPTER] 🧹 Sanitizing: Removed "${blockedObject}" for ${resolvedFashionStyle}`)
```

**Frame Type Blocking Log:**

```typescript
console.warn('[NANO-BANANA-ADAPTER] 🚫 Frame type blocked:', {
  frameType,
  resolvedFashionStyle,
  reason: 'Frame type incompatible with fashion context'
})
```

**Adaptation Log:**

```typescript
if (adaptationApplied) {
  console.log(`[GENERATE-SINGLE] ⚠️ Fashion style adapted for coherence: ${resolvedFashionStyle}`)
}
```

---

## Files Modified

### 1. `lib/feed-planner/nano-banana-adapter.ts`

**Status:** COMPLETE REWRITE (620 lines)

**Changes:**
- Added `resolvedFashionStyle` as MANDATORY parameter
- Added fashion context rules matrix (10 fashion styles)
- Added frame type detection function
- Added object sanitization function
- Rewrote prompt assembly with proper Nano Banana structure
- Added debug logging throughout
- Enforces single-scene prompts
- Filters conflicting objects
- Blocks incompatible frame types

### 2. `lib/maya/prompt-authority.ts`

**Status:** ENFORCEMENT GUARD ADDED

**Changes:**
- Updated context type to include `resolvedFashionStyle`
- Added validation check (throws error if missing in Pro Mode)
- Passes `resolvedFashionStyle` to adapter
- Logs enforcement status

### 3. `app/api/feed/[feedId]/generate-single/route.ts`

**Status:** 4 CALL SITES UPDATED

**Changes:**
- Replaced `getCategoryAndMood()` + `getFashionStyleForPosition()` with `getCoherentStyleParameters()`
- Updated 4 call sites:
  1. Paid blueprint users (line ~544)
  2. Free users full feeds (line ~611)
  3. Membership users (line ~676)
  4. Paid blueprint users (no preview) (line ~954)
- All call sites now pass `resolvedFashionStyle` to authority function
- Added adaptation logging at each call site

---

## Expected Results

### ❌ What Should STOP Happening

1. **No more laptops in athletic shoots**
   - Athletic context blocks: laptop, coffee, desk, workspace, office
   
2. **No more coffee in wellness content**
   - Wellness/active contexts block: coffee, desk, office objects
   
3. **No more flatlays during active outfits**
   - Athletic variants allow only: full_body, midshot, closeup
   
4. **No more business imagery for lifestyle selections**
   - Fashion context determines allowed objects/locations

### ✅ What Should START Happening

1. **Subject-first natural language**
   - Identity anchor → outfit → setting → lighting → camera
   
2. **Single coherent scene per prompt**
   - One frame, one location, one subject focus
   
3. **Fashion context respected**
   - Athletic → gym/studio/outdoor
   - Business → office/workspace
   - Casual → cafe/home/outdoor
   
4. **Automatic coherence enforcement**
   - Resolver runs ALWAYS, no bypasses
   - Adaptations logged and tracked

---

## Validation Checklist

### Pre-Deployment

- [x] Linter errors: ✅ NO ERRORS
- [x] TypeScript compilation: ✅ PASSES
- [x] All call sites updated: ✅ 4/4 UPDATED
- [x] Coherence resolver enforced: ✅ MANDATORY
- [x] Fashion context rules defined: ✅ 10 STYLES
- [x] Debug logging added: ✅ COMPREHENSIVE

### Post-Deployment (Monitor)

- [ ] Check logs for "COHERENCE_RESOLVER_NOT_CALLED" errors (should be NONE)
- [ ] Check logs for object sanitization (should show blocked objects being removed)
- [ ] Check logs for frame type blocking (should block flatlays for athletic)
- [ ] Check logs for fashion style adaptations (should show coherence resolver working)
- [ ] Verify NO laptops/coffee in athletic generations
- [ ] Verify athletic selections use gym/studio/outdoor locations
- [ ] Verify business selections CAN use flatlays/office
- [ ] Verify prompt length: 80-130 words (down from 200+)

---

## Testing Instructions

### Test 1: Athletic + Luxury

**Expected:**
- Fashion style: `athletic` → adapted to `elevated_athleisure`
- NO laptop, coffee, desk in prompt
- NO flatlay frames
- Location: luxury studio / modern gym / urban architectural
- Prompt structure: identity → subject in athleisure → luxury studio → dramatic lighting → iPhone

### Test 2: Business + Minimal

**Expected:**
- Fashion style: `business` → allowed as-is
- Flatlay frames ALLOWED
- Objects: laptop, coffee, desk ALLOWED
- Location: office / workspace / conference room
- Prompt structure: identity → subject in business attire → office → bright lighting → iPhone

### Test 3: Casual + Beige

**Expected:**
- Fashion style: `casual` → allowed as-is
- Flatlay frames ALLOWED (limited)
- Objects: office desk BLOCKED, casual items allowed
- Location: cafe / home / outdoor
- Prompt structure: identity → subject in casual outfit → cafe → soft lighting → iPhone

---

## Troubleshooting

### Issue: Still seeing laptops in athletic shoots

**Check:**
1. Is coherence resolver being called? (Check logs for "Coherence resolver enforced")
2. Is resolvedFashionStyle being passed to authority? (Check logs for "PROMPT TRACE")
3. Is object sanitization running? (Check logs for "Sanitizing: Removed")

**Fix:**
- Verify all 4 call sites in generate-single route are using `getCoherentStyleParameters()`
- Verify `resolvedFashionStyle` is passed in context to `generateFeedSinglePromptViaAuthority()`
- Check that `adaptFeedPlannerToNanoBanana()` receives `resolvedFashionStyle`

### Issue: Coherence resolver not running

**Error:** `COHERENCE_RESOLVER_NOT_CALLED: resolvedFashionStyle is required`

**Cause:** Old code path bypassing coherence resolver

**Fix:**
- Replace `getCategoryAndMood()` + `getFashionStyleForPosition()` with `getCoherentStyleParameters()`
- Ensure `resolvedFashionStyle` is extracted from result
- Pass `resolvedFashionStyle` to authority function

### Issue: Wrong objects still appearing

**Check:**
1. Is fashion context correct? (Check logs for "resolvedFashionStyle")
2. Is object in blockedObjects list? (Check FASHION_CONTEXT_RULES)
3. Is sanitization function running? (Check logs for "Sanitizing")

**Fix:**
- Add missing objects to `blockedObjects` array for that fashion context
- Verify regex matching in `sanitizeFrameDescription()`
- Check that frame description is being sanitized before prompt assembly

---

## Related Documentation

- **Style Coherence Resolver:** `docs/STYLE_COHERENCE_RESOLVER.md`
- **Coherence Resolver Implementation:** `docs/COHERENCE_RESOLVER_IMPLEMENTATION.md`
- **Aesthetic Coherence Audit:** `docs/AESTHETIC_COHERENCE_AUDIT.md`

---

**Status:** ✅ **COMPLETE AND READY FOR DEPLOYMENT**

The coherence resolver is now hard-enforced, template objects are filtered based on fashion context, single-scene prompts are enforced, proper Nano Banana structure is used, athletic/wellness guardrails are in place, and comprehensive debug logging is active.

This is an **assembly + enforcement fix** that addresses the root causes of incoherent outputs without adding more adjectives or rewriting templates.
