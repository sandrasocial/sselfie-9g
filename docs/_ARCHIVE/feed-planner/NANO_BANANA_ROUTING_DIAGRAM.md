# Nano Banana Builder Routing (Fixed)

## New Routing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION                                                      │
│ Click "Generate" on Feed Post                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/feed/[feedId]/generate-single/route.ts                 │
│ Line 217: const generationMode = 'pro'                         │
│   (Feed Planner ALWAYS uses Pro Mode = Nano Banana Pro)        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Line 556: generateFeedSinglePromptViaAuthority()                │
│   └─ Passes: { generationMode: 'pro', ... }                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/maya/prompt-authority.ts                                    │
│ generateFeedSinglePromptViaAuthority()                          │
│                                                                  │
│ ✅ NEW: Builder Selection Logic                                │
│                                                                  │
│ if (context?.generationMode === 'pro') {                       │
│   // PRO MODE: Nano Banana Pro                                 │
│   └─ adaptFeedPlannerToNanoBanana()                            │
│      └─ buildNanoBananaPrompt()                                │
│         └─ Returns: Natural language prompt                    │
│ } else {                                                         │
│   // CLASSIC MODE: Flux LoRA                                   │
│   └─ buildSingleImagePrompt()                                  │
│      └─ Returns: Structured prompt with labels                 │
│ }                                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ PRO MODE PATH (NEW)                                             │
│                                                                  │
│ lib/feed-planner/nano-banana-adapter.ts                        │
│ adaptFeedPlannerToNanoBanana()                                  │
│   ├─ parseTemplateFrames(templatePrompt)                       │
│   ├─ Extract frame for position                                │
│   ├─ buildNaturalLanguageDescription()                         │
│   └─ Returns: { userId, mode: 'brand-scene', userRequest, ... }│
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/maya/nano-banana-prompt-builder.ts                         │
│ buildNanoBananaPrompt()                                         │
│   ├─ Receives natural language userRequest                     │
│   ├─ Routes to brand-scene mode                                │
│   ├─ buildBrandScenePrompt()                                   │
│   │   └─ Light cleaning (remove ** formatting)                 │
│   └─ Returns: { optimizedPrompt, sceneDescription }            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ PROMPT OUTPUT                                                    │
│                                                                  │
│ Natural Language (~100-150 words, no labels)                    │
│                                                                  │
│ Example:                                                         │
│ "Professional woman in tailored beige blazer and cream          │
│  turtleneck, standing confidently with coffee in hand,          │
│  in urban coffee shop with modern minimalist interior,          │
│  with warm confident atmosphere, warm color palette,            │
│  natural lighting with soft shadows, shot on iPhone 15 Pro,    │
│  portrait mode, authentic photography aesthetic"                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/nano-banana-client.ts                                       │
│ generateWithNanoBanana()                                         │
│   ├─ Adds identity anchor if missing                           │
│   ├─ Adds "Generate an image of..." if needed                  │
│   └─ Sends to Replicate: google/nano-banana-pro                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ REPLICATE API                                                    │
│ Model: google/nano-banana-pro                                   │
│                                                                  │
│ Receives: Natural language prompt ✅                            │
│ (No system labels like "Scene:", "Composition:")                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comparison: Before vs After

### BEFORE (Wrong Builder)

```
┌─────────────────────┐
│ Feed Planner        │
│ generationMode=pro  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ generateFeedSinglePrompt...()   │
│                                 │
│ ❌ ALWAYS called:               │
│   buildSingleImagePrompt()      │
│   (Wrong for Nano Banana Pro)   │
└──────────┬──────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ OUTPUT: Structured with labels         │
│                                        │
│ "Scene: ... Composition: ...           │
│  Location: ... Critical constraints:   │
│  ... Aesthetic direction: ...          │
│  Camera approach: ... Lighting: ..."   │
│                                        │
│ 250+ words, 11+ system labels ❌       │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────┐
│ Nano Banana Pro            │
│ Receives technical spec ❌ │
│ Quality degraded           │
└────────────────────────────┘
```

### AFTER (Correct Builder)

```
┌─────────────────────┐
│ Feed Planner        │
│ generationMode=pro  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│ generateFeedSinglePrompt...()   │
│                                 │
│ ✅ NEW: Mode detection          │
│   if (mode === 'pro'):          │
│     → adaptFeedPlannerToNB()    │
│     → buildNanoBananaPrompt()   │
│   else:                         │
│     → buildSingleImagePrompt()  │
└──────────┬──────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ OUTPUT: Natural language                │
│                                        │
│ "Professional woman in tailored beige  │
│  blazer and cream turtleneck, standing │
│  confidently with coffee in hand,      │
│  in urban coffee shop with modern      │
│  minimalist interior, with warm        │
│  atmosphere, warm color palette,       │
│  natural lighting, shot on iPhone..."  │
│                                        │
│ ~100-150 words, zero labels ✅         │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────┐
│ Nano Banana Pro            │
│ Receives natural language ✅│
│ Quality optimized          │
└────────────────────────────┘
```

---

## Adapter Details

```
┌─────────────────────────────────────────────┐
│ adaptFeedPlannerToNanoBanana()              │
│                                             │
│ Input:                                      │
│   - templatePrompt (full 9-scene template) │
│   - position (1-9)                          │
│   - brandKit                                │
│   - userId                                  │
│   - category, mood                          │
│                                             │
│ Processing:                                 │
│   1. parseTemplateFrames(template)         │
│      └─ Extract frames, vibe, setting,     │
│         colorGrade                          │
│                                             │
│   2. Find frame for position               │
│      └─ frames.find(f => f.position ===    │
│         position)                           │
│                                             │
│   3. buildNaturalLanguageDescription()     │
│      ├─ frame.description                  │
│      ├─ + setting (if not duplicate)       │
│      ├─ + vibe as atmosphere               │
│      ├─ + colorGrade as palette            │
│      ├─ + lighting description             │
│      └─ + camera specs                     │
│                                             │
│ Output:                                     │
│   {                                         │
│     userId,                                 │
│     mode: 'brand-scene',                   │
│     userRequest: "Natural language...",    │
│     inputImages: { baseImages: [] },       │
│     brandKit                                │
│   }                                         │
└─────────────────────────────────────────────┘
```

---

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Builder** | `buildSingleImagePrompt()` | `buildNanoBananaPrompt()` |
| **Format** | System labels | Natural language |
| **Length** | 250+ words | 100-150 words |
| **Labels** | 11+ ("Scene:", "Composition:", etc.) | 0 |
| **Structure** | Label: Value pairs | Flowing sentences |
| **Optimization** | Flux LoRA | Nano Banana Pro |
| **Routing** | Hardcoded (always wrong builder) | Dynamic (mode-based) |

---

## Audit Trail

Every prompt generation is logged with:
- `builder: 'build-nano-banana-prompt'` or `'build-single-image-prompt'`
- `mode: 'pro'` or `'classic'`
- `promptLength: number`
- `executionTimeMs: number`

This allows tracking which builder was used and monitoring prompt quality over time.

---

**Generated:** January 18, 2026  
**Purpose:** Visual documentation of corrected routing logic
