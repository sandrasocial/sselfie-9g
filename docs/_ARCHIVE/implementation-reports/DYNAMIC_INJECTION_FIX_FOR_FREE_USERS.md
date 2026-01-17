# Dynamic Injection Fix for Free Users

## Problem
The dynamic injection system is not working for free users. When users select vibe and fashion style in the feed style modal, those selections are not being injected into the template prompts. The prompts still contain placeholders like `{{OUTFIT_FULLBODY_1}}`, `{{LOCATION_INDOOR_1}}`, etc.

## Root Cause
In `app/api/feed/[feedId]/generate-single/route.ts`, the free user code path (lines 491-502) gets the template from the library but does NOT inject dynamic content before saving it to the database.

## Solution
Add dynamic injection logic for free users, similar to what's already implemented for paid users.

## Required Changes

### File: `app/api/feed/[feedId]/generate-single/route.ts`

**Location:** Lines 491-502 (inside the `if (access.isFree)` block)

**Current Code:**
```typescript
// Get template prompt from grid library
const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
finalPrompt = getBlueprintPhotoshootPrompt(category, mood)
console.log(`[v0] [GENERATE-SINGLE] [TEMPLATE DEBUG] Final selection: ${category}_${mood} (source: ${sourceUsed})`)
console.log(`[v0] [GENERATE-SINGLE] ✅ Using blueprint template prompt: ${category}_${mood} (${finalPrompt.split(/\s+/).length} words)`)

// Save the template prompt to the database for future use
await sql`
  UPDATE feed_posts
  SET prompt = ${finalPrompt}
  WHERE id = ${postId}
`
```

**Replace With:**
```typescript
// Get template prompt from grid library
const { getBlueprintPhotoshootPrompt, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")
let fullTemplate = getBlueprintPhotoshootPrompt(category, mood)
console.log(`[v0] [GENERATE-SINGLE] [TEMPLATE DEBUG] Final selection: ${category}_${mood} (source: ${sourceUsed})`)
console.log(`[v0] [GENERATE-SINGLE] ✅ Using blueprint template prompt: ${category}_${mood} (${fullTemplate.split(/\s+/).length} words)`)

// Inject dynamic content (outfits, locations, accessories) with rotation
const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
const vibeKey = `${category}_${moodMapped}` // e.g., "luxury_dark_moody", "minimal_light_minimalistic"

// Get user's fashion style from personal brand or default to "business"
const { mapFashionStyleToVibeLibrary } = await import("@/lib/feed-planner/fashion-style-mapper")
let fashionStyle = 'business' // Default fashion style
const personalBrandForStyle = await sql`
  SELECT fashion_style
  FROM user_personal_brand
  WHERE user_id = ${user.id}
  ORDER BY updated_at DESC
  LIMIT 1
` as any[]

if (personalBrandForStyle && personalBrandForStyle.length > 0 && personalBrandForStyle[0].fashion_style) {
  try {
    const style = typeof personalBrandForStyle[0].fashion_style === 'string'
      ? personalBrandForStyle[0].fashion_style
      : (Array.isArray(personalBrandForStyle[0].fashion_style) 
          ? personalBrandForStyle[0].fashion_style[0] 
          : null)
    
    if (style) {
      fashionStyle = mapFashionStyleToVibeLibrary(style)
    }
  } catch (e) {
    console.warn(`[v0] [GENERATE-SINGLE] Failed to parse fashion_style:`, e)
  }
}

// Inject dynamic content with rotation
const { injectDynamicContentWithRotation } = await import("@/lib/feed-planner/dynamic-template-injector")
const injectedTemplate = await injectDynamicContentWithRotation(
  fullTemplate,
  vibeKey,
  fashionStyle,
  user.id.toString()
)

// Use injected template as final prompt
finalPrompt = injectedTemplate
console.log(`[v0] [GENERATE-SINGLE] ✅ Injected dynamic content (vibe: ${vibeKey}, fashion: ${fashionStyle}, ${finalPrompt.split(/\s+/).length} words)`)

// Save the injected prompt to the database for future use
await sql`
  UPDATE feed_posts
  SET prompt = ${finalPrompt}
  WHERE id = ${postId}
`
```

## Testing
After applying this fix:
1. Create a new preview feed as a free user
2. Select a vibe and fashion style in the feed style modal
3. Generate the preview image
4. Verify that the prompt sent to Replicate/NanoBanana contains actual outfit/location values instead of placeholders
5. Check the database to ensure the saved prompt is injected (not raw template)

## Notes
- This fix mirrors the injection logic already implemented for paid users (around line 569-575)
- The injection uses the user's selected fashion style from `user_personal_brand.fashion_style`
- The vibe key is constructed from the category and mood (mapped via `MOOD_MAP`)
- Rotation is handled automatically by `injectDynamicContentWithRotation`
