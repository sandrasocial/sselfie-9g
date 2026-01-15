# Feed Planner Position Generation Flow Analysis

## Overview
Complete trace of what happens when users click each position (1-12) in the 12-grid feed.

---

## 🖱️ USER CLICK FLOW

### UI Component
**File:** `components/feed-planner/feed-grid-preview.tsx`

**Click Handler:**
```typescript
const handleGeneratePost = async (postId: number) => {
  // 1. Set loading state
  setGeneratingPostId(postId)
  
  // 2. Call API
  const response = await fetch(`/api/feed/${feedId}/generate-single`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId }),  // ⚠️ Sends postId, NOT position
  })
  
  // 3. Show toast notification
  // 4. Trigger polling via onGenerate callback
}
```

**Key Point:** Sends `postId` (database ID), not `position` (1-12). API must look up position from database.

---

## 🔄 API ENDPOINT FLOW

### Endpoint
**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Request:** `POST /api/feed/{feedId}/generate-single`
**Body:** `{ postId: number }`

### Step-by-Step Flow

#### Step 1: Authentication & Access Check
- Authenticate user
- Check `FeedPlannerAccess` (free vs paid blueprint)
- Check credits (Pro Mode = 2 credits, Classic = 1 credit)
- Check rate limits

#### Step 2: Fetch Post & Feed Data
```typescript
const [post] = await sql`
  SELECT * FROM feed_posts
  WHERE feed_layout_id = ${feedIdInt} AND id = ${postId}
`

const [feedLayout] = await sql`
  SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed, feed_style 
  FROM feed_layouts 
  WHERE id = ${feedIdInt}
`
```

**Key Data Retrieved:**
- `post.position` (1-12)
- `post.prompt` (may be NULL)
- `post.generation_mode` ('pro' or 'classic')
- `feedLayout.feed_style` (per-feed style: "luxury", "minimal", "beige")

#### Step 3: Determine Generation Mode
```typescript
const generationMode = (access.isFree || access.isPaidBlueprint) ? 'pro' : (post.generation_mode || 'classic')
```

**Rules:**
- Free users: Always Pro Mode (NanoBanana Pro)
- Paid blueprint users: Always Pro Mode (NanoBanana Pro)
- Membership users: Classic Mode (custom Flux LoRA)

#### Step 4: Prompt Generation Logic

**Current Prompt Check:**
```typescript
let finalPrompt = post.prompt  // May be NULL

if (!finalPrompt || finalPrompt.trim().length < 20) {
  // Prompt missing - generate based on user type
}
```

---

## 📍 POSITION-SPECIFIC FLOWS

### Position 1 (First Click)

#### For FREE Users:
1. **Check:** `post.prompt` (should be NULL for new feed)
2. **Template Selection:**
   - PRIMARY: `feedLayout.feed_style` → `mood`
   - SECONDARY: `user_personal_brand.settings_preference[0]` → `mood`
   - TERTIARY: `user_personal_brand.visual_aesthetic[0]` → `category`
   - FALLBACK: `blueprint_subscribers` (legacy)
3. **Template Key:** `${category}_${MOOD_MAP[mood]}`
   - Example: `luxury_light_minimalistic`
4. **Get Template:** `BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]`
5. **Store:** Full template prompt in `feed_posts[0].prompt`
6. **Generate:** Uses full template (for 9:16 preview grid image)

**Result:** 
- ✅ Full template stored in position 1
- ✅ Single 9:16 image generated (shows all 9 frames in one grid)

#### For PAID Blueprint Users:
1. **Check:** `post.prompt` (should be NULL for new feed)
2. **Check Position 1 Template:**
   ```typescript
   const [previewPost] = await sql`
     SELECT prompt FROM feed_posts
     WHERE feed_layout_id = ${feedIdInt} AND position = 1
   `
   ```
3. **If Template Exists:**
   - Extract frame 1 using `buildSingleImagePrompt(template, 1)`
   - Structure: Base identity + Frame 1 description + Color grade
4. **If No Template:**
   - Call Maya to generate unique prompt
   - Maya uses `feed_style` + `visual_aesthetic` as reference
   - May use preview feed template if exists and matches style

**Result:**
- ✅ Single high-res image for position 1
- ✅ Template stored in position 1 (if created via "New Feed" with feed_style)

---

### Position 2-9 (Positions 2, 3, 4, 5, 6, 7, 8, 9)

#### For FREE Users:
**⚠️ ISSUE:** Free users should only have 1 post (position 1) for preview feed.
**If they somehow have positions 2-9:**
- Uses same template selection logic as position 1
- Gets full template (not frame-specific)
- **Problem:** Free users shouldn't be able to generate positions 2-9

#### For PAID Blueprint Users:
1. **Check:** `post.prompt` (should be NULL)
2. **Check Position 1 Template:**
   ```typescript
   const [previewPost] = await sql`
     SELECT prompt FROM feed_posts
     WHERE feed_layout_id = ${feedIdInt} AND position = 1
   `
   ```
3. **If Template Exists in Position 1:**
   - ✅ **EXTRACT FRAME:** `buildSingleImagePrompt(previewPost.prompt, post.position)`
   - Structure:
     ```
     Base identity prompt
     Frame {position} description (from template)
     Color grade (from template)
     ```
   - Example for Position 2:
     ```
     Influencer/pinterest style of a woman maintaining exactly the same physical 
     characteristics of the woman in the attached image...
     
     Coffee and designer YSL bag on dark marble table - overhead flatlay, moody lighting
     
     Deep blacks, cool grays, concrete tones, warm skin preserved...
     ```
   - **Saves prompt to database:** `UPDATE feed_posts SET prompt = ${finalPrompt} WHERE id = ${postId}`
4. **If No Template in Position 1:**
   - ❌ **FALLBACK:** Calls Maya to generate unique prompt
   - Maya uses brand profile data
   - **Problem:** No frame extraction possible, inconsistent with template

**Result:**
- ✅ Single high-res image for position 2-9
- ✅ Uses exact frame description from template
- ✅ Consistent color grading across all positions

---

### Position 10-12 (Positions 10, 11, 12)

#### For FREE Users:
**⚠️ ISSUE:** Free users should NOT have positions 10-12.
**If they somehow exist:**
- Same logic as positions 2-9
- **Problem:** Free users shouldn't have 12-grid feeds

#### For PAID Blueprint Users:
1. **Check:** `post.prompt` (should be NULL)
2. **Check Position 1 Template:**
   ```typescript
   const [previewPost] = await sql`
     SELECT prompt FROM feed_posts
     WHERE feed_layout_id = ${feedIdInt} AND position = 1
   `
   ```
3. **If Template Exists:**
   - ❌ **CRITICAL BUG:** `buildSingleImagePrompt()` only supports positions 1-9!
   ```typescript
   if (position < 1 || position > 9) {
     throw new Error(`Position must be between 1 and 9, got ${position}`)
   }
   ```
   - **Result:** Error thrown, generation fails
   - **Fallback:** Calls Maya (if error handling catches it)
4. **If No Template:**
   - Calls Maya to generate unique prompt

**Result:**
- ❌ **BROKEN:** Positions 10-12 cannot extract frames from template
- ⚠️ Falls back to Maya generation (inconsistent with positions 2-9)

---

## 🔍 TEMPLATE STRUCTURE ANALYSIS

### Current Template Format
**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Structure:**
```
Create a 3x3 grid showcasing 9 distinct photographic angles...

Vibe: [description]

Setting: [location]

Outfits: [outfit options]

9 frames:
1. [Frame 1 description]
2. [Frame 2 description]
...
9. [Frame 9 description]

Color grade: [color grading instructions]
```

**Key Finding:**
- ✅ Templates have **9 frames** (positions 1-9)
- ❌ Templates do **NOT** have frames 10, 11, 12
- ❌ `buildSingleImagePrompt()` only supports positions 1-9

---

## 🐛 IDENTIFIED ISSUES

### Issue 1: Positions 10-12 Cannot Extract Frames
**Location:** `lib/feed-planner/build-single-image-prompt.ts` (line 90)

**Problem:**
```typescript
if (position < 1 || position > 9) {
  throw new Error(`Position must be between 1 and 9, got ${position}`)
}
```

**Impact:**
- When user clicks position 10, 11, or 12
- Code tries to extract frame from template
- Error thrown: "Position must be between 1 and 9, got 10"
- Generation fails or falls back to Maya

**Current Behavior:**
- Error is caught in try-catch
- Falls back to Maya generation
- **Inconsistent:** Positions 2-9 use template frames, positions 10-12 use Maya

### Issue 2: Template Only Has 9 Frames
**Location:** `lib/maya/blueprint-photoshoot-templates.ts`

**Problem:**
- All templates define exactly 9 frames
- No templates define frames 10, 11, 12
- 12-grid feed needs 12 frame descriptions

**Impact:**
- Positions 10-12 have no template frame descriptions
- Must rely on Maya generation
- Inconsistent with positions 2-9

### Issue 3: Free Users Can Generate Positions 2-12
**Location:** `app/api/feed/[feedId]/generate-single/route.ts`

**Problem:**
- Free users should only have 1 post (position 1) for preview feed
- But if they somehow have positions 2-12, generation logic doesn't prevent it
- Free users get full template (wrong - should only get preview grid)

---

## ✅ WHAT'S WORKING

### Position 1 (All Users)
- ✅ Free users: Gets full template, generates 9:16 preview grid
- ✅ Paid users: Extracts frame 1 or uses Maya, generates single image

### Positions 2-9 (Paid Blueprint Users)
- ✅ Extracts frame from position 1 template
- ✅ Uses exact frame description
- ✅ Consistent color grading
- ✅ Saves prompt to database for future use

### Template Extraction
- ✅ `buildSingleImagePrompt()` correctly extracts frames 1-9
- ✅ Combines base identity + frame description + color grade
- ✅ Frame descriptions are complete and self-contained

---

## ❌ WHAT'S NOT WORKING

### Positions 10-12 (Paid Blueprint Users)
- ❌ Cannot extract frames (template only has 9 frames)
- ❌ Error thrown, falls back to Maya
- ❌ Inconsistent with positions 2-9

### Template Structure
- ❌ Templates only define 9 frames, not 12
- ❌ No frame descriptions for positions 10-12

### Free User Access
- ⚠️ No explicit prevention of generating positions 2-12
- ⚠️ Should be restricted to position 1 only

---

## 🔧 RECOMMENDED FIXES

### Fix 1: Extend Templates to 12 Frames
**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Change:**
- Update all templates to include frames 10, 11, 12
- Update section header: "9 frames:" → "12 frames:"
- Add frame descriptions for positions 10-12

**Example Addition:**
```
9 frames:
1. [Frame 1]
...
9. [Frame 9]

10. [Frame 10 description - new scene]
11. [Frame 11 description - new scene]
12. [Frame 12 description - new scene]

Color grade: [same color grade]
```

### Fix 2: Update buildSingleImagePrompt to Support 12 Frames
**File:** `lib/feed-planner/build-single-image-prompt.ts`

**Change:**
```typescript
// Update validation
if (position < 1 || position > 12) {
  throw new Error(`Position must be between 1 and 12, got ${position}`)
}

// Update frame parsing to support 12 frames
const framesMatch = templatePrompt.match(/12 frames:([\s\S]+?)(?=Color grade:|$)/i)
// Also support legacy 9 frames format
if (!framesMatch) {
  framesMatch = templatePrompt.match(/9 frames:([\s\S]+?)(?=Color grade:|$)/i)
}

// Update frame validation
if (position >= 1 && position <= 12 && description.length > 0) {
  frames.push({ position, description })
}
```

### Fix 3: Add Free User Position Restriction
**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Add after fetching post:**
```typescript
// Free users can only generate position 1
if (access.isFree && post.position !== 1) {
  return Response.json(
    {
      error: "Position not available",
      details: "Free users can only generate position 1 (preview grid). Upgrade to generate all positions.",
    },
    { status: 403 }
  )
}
```

---

## 📊 FLOW SUMMARY TABLE

| Position | User Type | Template Source | Prompt Type | Status |
|----------|-----------|----------------|-------------|--------|
| **1** | Free | `feed_style` + `visual_aesthetic` | Full template (9 frames) | ✅ Working |
| **1** | Paid | Position 1 template OR Maya | Frame 1 OR Maya prompt | ✅ Working |
| **2-9** | Free | N/A (shouldn't exist) | N/A | ⚠️ Should be blocked |
| **2-9** | Paid | Extract from position 1 template | Frame {position} | ✅ Working |
| **10-12** | Free | N/A (shouldn't exist) | N/A | ⚠️ Should be blocked |
| **10-12** | Paid | ❌ Template only has 9 frames | Maya fallback | ❌ Broken |

---

## 🔄 COMPLETE FLOW DIAGRAM

### Position 1 (Free User)
```
User clicks position 1
  ↓
handleGeneratePost(postId)
  ↓
POST /api/feed/{feedId}/generate-single { postId }
  ↓
Fetch post (position = 1)
  ↓
Check: post.prompt (NULL)
  ↓
Template Selection:
  - feed_style → mood
  - visual_aesthetic → category
  - Template key: ${category}_${MOOD_MAP[mood]}
  ↓
Get: BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]
  ↓
Store: Full template in post.prompt
  ↓
Generate: NanoBanana Pro with full template
  ↓
Result: Single 9:16 image (preview grid showing all 9 frames)
```

### Position 2-9 (Paid Blueprint User)
```
User clicks position 2
  ↓
handleGeneratePost(postId)
  ↓
POST /api/feed/{feedId}/generate-single { postId }
  ↓
Fetch post (position = 2)
  ↓
Check: post.prompt (NULL)
  ↓
Check position 1 template:
  SELECT prompt FROM feed_posts WHERE position = 1
  ↓
Template found: ✅
  ↓
Extract frame 2:
  buildSingleImagePrompt(template, 2)
  ↓
Structure:
  Base identity prompt
  Frame 2 description
  Color grade
  ↓
Store: Frame 2 prompt in post.prompt
  ↓
Generate: NanoBanana Pro with frame 2 prompt
  ↓
Result: Single high-res image (frame 2 scene)
```

### Position 10-12 (Paid Blueprint User) - CURRENTLY BROKEN
```
User clicks position 10
  ↓
handleGeneratePost(postId)
  ↓
POST /api/feed/{feedId}/generate-single { postId }
  ↓
Fetch post (position = 10)
  ↓
Check: post.prompt (NULL)
  ↓
Check position 1 template:
  SELECT prompt FROM feed_posts WHERE position = 1
  ↓
Template found: ✅
  ↓
Extract frame 10:
  buildSingleImagePrompt(template, 10)
  ↓
❌ ERROR: "Position must be between 1 and 9, got 10"
  ↓
Catch error, fallback to Maya
  ↓
Maya generates unique prompt
  ↓
Result: Single high-res image (Maya-generated, inconsistent with template)
```

---

## 🎯 INTENDED BEHAVIOR vs ACTUAL

### Intended Behavior

**Position 1:**
- Free: Preview grid (9:16 image showing all 9 frames)
- Paid: Single image (frame 1 scene)

**Positions 2-12:**
- Paid: Single images (frames 2-12 from template)
- Free: Not available

### Actual Behavior

**Position 1:**
- ✅ Free: Preview grid (working)
- ✅ Paid: Single image (working)

**Positions 2-9:**
- ✅ Paid: Frame extraction (working)
- ⚠️ Free: Should be blocked (not explicitly blocked)

**Positions 10-12:**
- ❌ Paid: Error → Maya fallback (broken)
- ⚠️ Free: Should be blocked (not explicitly blocked)

---

## 📝 SUMMARY

### What Works
1. ✅ Position 1 generation (both free and paid)
2. ✅ Positions 2-9 frame extraction (paid users)
3. ✅ Template parsing and frame extraction (positions 1-9)
4. ✅ Color grade consistency across positions 2-9

### What's Broken
1. ❌ Positions 10-12 cannot extract frames (template only has 9 frames)
2. ❌ `buildSingleImagePrompt()` throws error for positions 10-12
3. ⚠️ Free users not explicitly blocked from positions 2-12

### What Needs Fixing
1. **Extend templates to 12 frames** (add frames 10, 11, 12)
2. **Update `buildSingleImagePrompt()`** to support positions 1-12
3. **Add free user position restriction** (only position 1 allowed)
4. **Update template parsing** to support both 9-frame and 12-frame formats
