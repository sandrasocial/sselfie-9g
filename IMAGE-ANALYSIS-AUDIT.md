# Image Analysis Audit - Maya Motion Prompt Generation

## Issue Found: 🔴 CRITICAL

**Problem:** The B-roll screen was NOT passing `imageUrl` to the motion prompt API, so Claude was never analyzing the actual images.

## Root Cause

In `components/sselfie/b-roll-screen.tsx`, the `handleAnimate` function was calling `/api/maya/generate-motion-prompt` without including the `imageUrl` in the request body.

**Before (Broken):**
```typescript
body: JSON.stringify({
  fluxPrompt,
  description,
  category,
  // ❌ imageUrl was missing!
}),
```

**After (Fixed):**
```typescript
body: JSON.stringify({
  fluxPrompt,
  description,
  category,
  imageUrl, // ✅ Now included
}),
```

## Impact

- **Before Fix:** Claude was generating motion prompts from text descriptions only, without seeing the actual image
- **After Fix:** Claude will now analyze the actual image to understand:
  - Exact body position and pose
  - Hand/arm positions
  - Environment and context
  - Motion constraints
  - Objects present
  - Natural interaction opportunities

## How Claude Vision Works

1. **Image Format:** Claude accepts:
   - Public HTTP/HTTPS URLs (e.g., Vercel Blob Storage URLs)
   - Data URLs (base64 encoded)
   - The Vercel AI SDK handles the image transmission

2. **Vision Analysis:** Claude Sonnet 4 analyzes:
   - Body position (sitting, standing, etc.)
   - Hand/arm positions
   - Head & gaze direction
   - Environment (indoor/outdoor, location)
   - Objects present
   - Mood and atmosphere
   - Motion constraints

3. **Prompt Structure:** The vision prompt asks Claude to:
   - Analyze the image in detail
   - Match motion to the exact pose
   - Suggest natural, physically possible movements
   - Avoid conflicting movements

## Verification

The fix includes enhanced logging to verify:
- ✅ Image URL is being received
- ✅ Image URL format is valid
- ✅ Claude vision analysis is being called
- ✅ Motion prompt is generated from image analysis

## Comparison

**concept-card.tsx** (Working correctly):
- ✅ Passes `imageUrl: generatedImageUrl` to the API

**b-roll-screen.tsx** (Was broken, now fixed):
- ✅ Now passes `imageUrl` to the API

## Expected Behavior After Fix

1. User clicks "Animate" on an image in B-roll screen
2. `imageUrl` is sent to `/api/maya/generate-motion-prompt`
3. Claude Sonnet 4 receives the image URL
4. Claude analyzes the image for pose, environment, objects, etc.
5. Claude generates a motion prompt that matches the actual image
6. Motion prompt is used for WAN-2.5 video generation

## Testing

To verify the fix is working:
1. Check server logs for: `"✅ Using Claude vision analysis for pose-accurate motion"`
2. Check server logs for: `"📸 Image will be analyzed by Claude Sonnet 4"`
3. Check server logs for: `"✅ Claude vision analysis complete"`
4. Verify motion prompts are more accurate and match the image poses

