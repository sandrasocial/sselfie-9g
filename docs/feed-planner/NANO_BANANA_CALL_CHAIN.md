# Nano Banana Pro Call Chain (Visual Trace)

## Current Flow (Feed Planner)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION                                                      │
│ Click "Generate" on Feed Post                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/feed/[feedId]/generate-single/route.ts                 │
│ Line 556: generateFeedSinglePromptViaAuthority()                │
│   ├─ Input: injectedTemplate (full 9-scene template)           │
│   ├─ Input: post.position (1-9)                                │
│   ├─ Input: { userId, feedId, category, mood }                 │
│   └─ Returns: { prompt: string, metadata: {...} }              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/maya/prompt-authority.ts                                    │
│ Line 1127: generateFeedSinglePromptViaAuthority()               │
│   ├─ Fetches BrandKit from database                            │
│   ├─ Line 1185: Calls buildSingleImagePrompt()                 │
│   └─ Returns prompt with metadata                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/feed-planner/build-single-image-prompt.ts                  │
│ Line 285-367: buildSingleImagePrompt()                         │
│                                                                  │
│ ⚠️ WRONG BUILDER FOR NANOBANANA PRO                            │
│                                                                  │
│ Constructs structured prompt with system labels:                │
│   Line 310: promptParts.push(`Scene: ${...}`)                  │
│   Line 311: promptParts.push(`Composition: ${...}`)            │
│   Line 312: promptParts.push(`Location: ${...}`)               │
│   Line 322: promptParts.push(`Critical constraints: ${...}`)   │
│   Line 330: promptParts.push(`Aesthetic direction: ${...}`)    │
│   Line 343: promptParts.push(`Camera approach: ${...}`)        │
│   Line 344: promptParts.push(`Lighting direction: ${...}`)     │
│   Line 348: promptParts.push(`Technical requirements: ${...}`) │
│   Line 352: promptParts.push(`Color grading: ${...}`)          │
│   Line 362: promptParts.push(`Restrictions: ${...}`)           │
│                                                                  │
│ Returns: Space-joined system labels                             │
│ Example: "Scene: X. Composition: Y. Camera approach: Z."        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/feed/[feedId]/generate-single/route.ts                 │
│ Line 568: finalPrompt = authorityResult.prompt                 │
│                                                                  │
│ Line 1248: cleanedPrompt = cleanBlueprintPrompt(finalPrompt)   │
│   └─ Only removes {{placeholders}}, keeps system labels        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/feed/[feedId]/generate-single/route.ts                 │
│ Line 1253: generateWithNanoBanana({ prompt: cleanedPrompt })   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/nano-banana-client.ts                                       │
│ Line 75-110: Add identity anchor if missing                     │
│   ├─ Checks for "Use the uploaded photos..."                   │
│   ├─ Adds "Generate an image of..." if needed                  │
│   └─ finalPrompt = modified prompt                              │
│                                                                  │
│ Line 113: replicateInput.prompt = finalPrompt                  │
│                                                                  │
│ Line 130: replicate.predictions.create()                        │
│   └─ Sends to: google/nano-banana-pro                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ REPLICATE API                                                    │
│ Model: google/nano-banana-pro                                   │
│                                                                  │
│ Receives: Structured prompt with system labels                  │
│ Example:                                                         │
│ "Use the uploaded photos as strict identity reference.          │
│  Scene: Professional woman in modern beige office.              │
│  Composition: Full body portrait, centered.                     │
│  Location: Luxurious hotel lobby with marble walls.             │
│  Critical constraints: Do not change location.                  │
│  Aesthetic direction: Warm editorial photography.               │
│  Camera approach: Medium shot, eye-level.                       │
│  Lighting direction: Soft natural window light.                 │
│  Technical requirements: Sharp focus, natural realism.          │
│  Color grading: Warm tones with beige highlights.               │
│  Restrictions: Avoid studio backdrops."                         │
│                                                                  │
│ ⚠️ Problem: This is a technical spec, not natural language     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Correct Flow (Studio Pro - NOT used by Feed Planner)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION                                                      │
│ Generate from Studio Pro (Maya concept cards)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/api/maya/generate-studio-pro/route.ts                      │
│ Calls: buildNanoBananaPrompt()                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/maya/nano-banana-prompt-builder.ts                         │
│ Line 275: buildNanoBananaPrompt()                              │
│                                                                  │
│ ✅ CORRECT BUILDER FOR NANOBANANA PRO                          │
│                                                                  │
│ Constructs natural language prompt:                             │
│   - No system labels                                            │
│   - Flowing sentences                                           │
│   - 100-150 word target                                         │
│   - Identity anchor always first                                │
│                                                                  │
│ Returns: Natural language photographer brief                    │
│ Example: "Use the uploaded photos as strict identity reference.│
│           Professional woman wearing tailored beige blazer and  │
│           cream turtleneck, standing confidently in modern      │
│           minimalist office with floor-to-ceiling windows.      │
│           Soft natural window light creates warm, editorial     │
│           atmosphere. Shot on iPhone 15 Pro, portrait mode."    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ lib/nano-banana-client.ts                                       │
│ Line 75-110: Add identity anchor if missing                     │
│ Line 113: replicateInput.prompt = finalPrompt                  │
│ Line 130: replicate.predictions.create()                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ REPLICATE API                                                    │
│ Model: google/nano-banana-pro                                   │
│                                                                  │
│ Receives: Natural language prompt                               │
│ ✅ Optimized format for Nanobanana Pro                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Side-by-Side Comparison

### Builder Outputs

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ buildSingleImagePrompt()             │ buildNanoBananaPrompt()              │
│ (Feed Planner - WRONG)               │ (Studio Pro - CORRECT)               │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ Format: System labels                │ Format: Natural language             │
│ Length: 250+ words                   │ Length: 100-150 words                │
│ Style: Technical spec                │ Style: Photographer brief            │
│                                      │                                      │
│ Example:                             │ Example:                             │
│ "Use the uploaded photos as strict   │ "Use the uploaded photos as strict   │
│  identity reference.                 │  identity reference. Professional    │
│  Scene: Professional woman in modern │  woman wearing tailored beige blazer │
│  beige office.                       │  and cream turtleneck, standing      │
│  Composition: Full body portrait,    │  confidently in modern minimalist    │
│  centered.                           │  office with floor-to-ceiling        │
│  Location: Luxurious hotel lobby.    │  windows. Soft natural window light  │
│  Critical constraints: Do not change │  creates warm, editorial atmosphere. │
│  location.                           │  Shot on iPhone 15 Pro, portrait     │
│  Aesthetic direction: Warm editorial.│  mode, authentic photography         │
│  Camera approach: Medium shot.       │  aesthetic with natural skin texture │
│  Lighting direction: Soft window     │  and muted color palette."           │
│  light.                              │                                      │
│  Technical requirements: Sharp focus.│                                      │
│  Color grading: Warm tones.          │                                      │
│  Restrictions: Avoid studio          │                                      │
│  backdrops."                         │                                      │
│                                      │                                      │
│ Labels: 11+                          │ Labels: 0                            │
│ Redundancy: High                     │ Redundancy: Minimal                  │
│ Nanobanana compatibility: ❌         │ Nanobanana compatibility: ✅          │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## Root Cause Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ PROBLEM                                                          │
│                                                                  │
│ Feed Planner uses buildSingleImagePrompt()                      │
│   ↓                                                              │
│ Generates structured prompts with system labels                 │
│   ↓                                                              │
│ Nanobanana Pro receives technical specs instead of natural      │
│ language                                                         │
│   ↓                                                              │
│ Image quality degrades                                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ SOLUTION                                                         │
│                                                                  │
│ Option 1: Use buildNanoBananaPrompt() for Feed Planner         │
│   └─ Requires adapter layer for Feed Planner data model        │
│                                                                  │
│ Option 2: Strip system labels from buildSingleImagePrompt()    │
│   └─ Quick fix but doesn't optimize length/structure           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Involved

### Core Prompt Flow
1. **`app/api/feed/[feedId]/generate-single/route.ts`** - Entry point
2. **`lib/maya/prompt-authority.ts`** - Authority wrapper
3. **`lib/feed-planner/build-single-image-prompt.ts`** - WRONG builder (system labels)
4. **`lib/nano-banana-client.ts`** - Replicate API call

### Correct Builder (Not Used)
5. **`lib/maya/nano-banana-prompt-builder.ts`** - CORRECT builder (natural language)

### Supporting Files
6. **`lib/maya/scene-library.ts`** - Scene specifications
7. **`lib/brand/build-brand-kit.ts`** - Brand profile formatting

---

**Generated:** January 18, 2026  
**Purpose:** Visual trace of prompt flow from user action to Replicate API
