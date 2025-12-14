# Git History Analysis: Reference Image vs. Current Code

## Reference Image Metadata
- **Image URL:** `https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR.png`
- **Created Date:** December 13, 2025, 12:24:21 GMT
- **Image ID:** `5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR`

## Critical Changes on December 12, 2025 (Day Before Reference Image)

### Commit Timeline (December 12, 2025):
1. **e5765b6** (17:23) - "refactor: update prompt settings for improved quality and consistency"
2. **45bf012** (17:49) - "refactor: enhance prompt generation for authenticity and clarity"
3. **d37eb41** (18:23) - "refactor: update lighting descriptions for enhanced realism in prompts"

### Key Changes Made on December 12:

#### 1. **LIGHTING DESCRIPTIONS CHANGED** (d37eb41)

**BEFORE (What was working):**
```typescript
### LIGHTING (3-5 words, keep simple and natural)
**ALWAYS USE (Simple Natural Lighting):**
- ✅ "Soft afternoon sunlight"
- ✅ "Natural window light"
- ✅ "Warm golden hour lighting"
- ✅ "Overcast daylight"
```

**AFTER (What changed):**
```typescript
### LIGHTING (3-6 words, authentic and realistic)
**ALWAYS USE (Authentic Realistic Lighting):**
- ✅ "Uneven natural lighting"
- ✅ "Mixed color temperatures"
- ✅ "Natural window light with shadows"
- ✅ "Overcast daylight, soft shadows"
- ✅ "Ambient lighting, mixed sources"

**NEVER USE (These cause plastic/artificial look):**
- ❌ "Soft afternoon sunlight" (too idealized)
- ❌ "Warm golden hour lighting" (too perfect)
```

**Impact:** Changed from warm, appealing lighting to more realistic but potentially less appealing lighting descriptions.

#### 2. **AUTHENTICITY KEYWORDS ENFORCED** (45bf012)

**BEFORE:**
- Removed "candid moment" and "amateur cellphone photo" during word count trimming
- These keywords were treated as optional

**AFTER:**
- **CRITICAL FIX:** These keywords are now REQUIRED and cannot be removed
- Added logic to ensure "candid photo" or "candid moment" is always present
- Added logic to ensure "amateur cellphone photo" or "cellphone photo" is always present
- These are now protected from removal during word count optimization

**Code Change:**
```typescript
// BEFORE: Removed during trimming
prompt = prompt.replace(/,\s*(candid moment|amateur cellphone photo)/gi, "")

// AFTER: Protected from removal
// DO NOT remove authenticity keywords - they prevent plastic look
// These are now REQUIRED: "candid moment", "candid photo", "amateur cellphone photo", "cellphone photo"
if (!hasCandid && currentWordCount < MAX_WORDS) {
  // Add "candid photo" or "candid moment" before iPhone specs
  prompt = prompt + ", candid photo"
}
```

**Impact:** More authenticity keywords, but may have made prompts longer or more formulaic.

#### 3. **PROMPT SETTINGS STANDARDIZED** (e5765b6)

**Changes:**
- Standardized quality settings across all routes
- Updated guidance scale, inference steps, output formats
- Adjusted word count guidelines to 50-80 words
- Improved handling of extra LoRA parameters

**Impact:** More consistent but potentially less flexible settings.

## Settings in UI Component (maya-chat-screen.tsx)

**Current Default Settings:**
```typescript
const [styleStrength, setStyleStrength] = useState(1.0) // Updated default from 1.05 to 1.0
const [promptAccuracy, setPromptAccuracy] = useState(3.5) // Guidance scale: 2.5-5.0
const [aspectRatio, setAspectRatio] = useState("4:5")
const [realismStrength, setRealismStrength] = useState(0.2) // Extra LoRA scale: 0.0-0.8
```

**Note:** These settings appear unchanged around the reference image date.

## Analysis: What Went Wrong?

### Hypothesis 1: Lighting Changes Made Images Less Appealing
- **Before:** "Soft afternoon sunlight", "Warm golden hour lighting" → Warm, appealing, Instagram-worthy
- **After:** "Uneven natural lighting", "Mixed color temperatures" → More realistic but potentially less appealing
- **Impact:** Images may look more realistic but less polished/Instagram-worthy

### Hypothesis 2: Authenticity Keywords Made Prompts Too Formulaic
- **Before:** Keywords were optional, could be removed if needed
- **After:** Keywords are mandatory, always added even if prompt is long
- **Impact:** Prompts may be longer, more repetitive, or less natural-sounding

### Hypothesis 3: Combination Effect
- The lighting changes + mandatory authenticity keywords may have created a "too realistic, not appealing enough" effect
- Real phone photos are authentic but may not be as polished as desired for Instagram

## Recommendations

### Option 1: Revert Lighting Changes (If Reference Image Was Good)
If the reference image quality was good, consider reverting to the warmer lighting descriptions:
- "Soft afternoon sunlight"
- "Warm golden hour lighting"
- "Natural window light"

### Option 2: Hybrid Approach
Keep realistic lighting but add back some warmth:
- "Natural afternoon light with warm tones"
- "Golden hour lighting with natural shadows"
- "Soft window light with warm color temperature"

### Option 3: Make Authenticity Keywords Optional
Allow the model to decide when to include "candid photo" and "amateur cellphone photo" based on context, rather than always requiring them.

### Option 4: Review Reference Image Prompt
If possible, check what prompt was actually used to generate the reference image to see if it used the old or new lighting descriptions.

## Files Changed on December 12, 2025

1. `lib/maya/flux-prompting-principles.ts` - Lighting descriptions changed
2. `lib/maya/personality.ts` - Updated to reflect new lighting guidelines
3. `app/api/maya/generate-concepts/route.ts` - Authenticity keywords made mandatory
4. `app/api/maya/generate-feed-prompt/route.ts` - Updated lighting terminology
5. `lib/feed-planner/visual-composition-expert.ts` - Updated lighting descriptions

## Next Steps

1. **✅ Check database for actual prompt used** - See `REFERENCE_IMAGE_PROMPT_SEARCH.md` for instructions
   - Search `generated_images` table for ID `5371`
   - Search `ai_images` table for URL containing `5371` or `5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR`
   - Search by date range (Dec 12-14, 2025)
   - Use API route: `/api/debug/find-reference-image?imageId=5371`

2. **Compare prompts** - Once you have the reference prompt, compare with current code output
3. **Test reverting lighting changes** - If reference uses old lighting, try reverting to "soft afternoon sunlight" style
4. **Make authenticity keywords conditional** - If reference doesn't have mandatory keywords, make them optional



