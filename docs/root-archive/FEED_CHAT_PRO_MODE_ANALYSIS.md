# Feed Chat Pro Mode Issue - Analysis

## Problem
When users are in Maya feed chat with Pro Mode enabled (via toggle in unified header), Maya is creating prompts as if she's in Classic Mode instead of Pro Mode (Nano Banana prompts).

## Root Cause

The `/api/maya/generate-feed-prompt` route does NOT check for the `x-studio-pro-mode` header, so it always uses FLUX (Classic Mode) prompting principles, even when users have Pro Mode enabled.

## Comparison

### Main Maya Chat API (`/api/maya/chat/route.ts`)
✅ **CORRECTLY handles Pro Mode:**
- Line 665: Reads `x-studio-pro-mode` header
- Line 680: Determines `isStudioProMode` 
- Line 722: Uses `MAYA_PRO_SYSTEM_PROMPT` when Pro Mode, `MAYA_SYSTEM_PROMPT` when Classic Mode
- Line 708: For Feed Planner, uses `getFeedPlannerContextAddon(userSelectedMode)` which respects Pro Mode

### Feed Prompt Generation API (`/api/maya/generate-feed-prompt/route.ts`)
❌ **MISSING Pro Mode detection:**
- Line 158: Always uses `getFluxPromptingPrinciples()` (Classic Mode only)
- Line 168: System prompt says "generating a FLUX prompt" (Classic Mode only)
- No check for `x-studio-pro-mode` header
- No conditional logic for Pro Mode vs Classic Mode

## Differences: FLUX (Classic) vs Nano Banana (Pro)

### FLUX Prompting (Classic Mode):
- 30-60 words optimal
- MUST start with trigger word
- iPhone/candid photo aesthetic
- Uses trigger word for LoRA activation
- System prompt: `getFluxPromptingPrinciples()`

### Nano Banana Prompting (Pro Mode):
- 50-80 words (natural language)
- NO trigger words
- Professional photography aesthetic
- Uses reference images instead of LoRA
- System prompt: `getNanoBananaPromptingPrinciples()`

## Solution

Update `/api/maya/generate-feed-prompt/route.ts` to:
1. Check for `x-studio-pro-mode` header (like Maya chat API does)
2. If Pro Mode: Use `getNanoBananaPromptingPrinciples()` instead of `getFluxPromptingPrinciples()`
3. Update system prompt to reflect Pro Mode vs Classic Mode
4. Remove trigger word requirement for Pro Mode prompts
5. Adjust prompt length guidance (50-80 words for Pro, 30-60 for Classic)

## Files to Update

1. `app/api/maya/generate-feed-prompt/route.ts` - Add Pro Mode detection and conditional prompting

