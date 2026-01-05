# Caption Generation Implementation Plan

## 📋 Analysis Summary

### Current State

#### 1. **How Caption Writer Works**
**Location:** `lib/feed-planner/caption-writer.ts`

**Input Parameters:**
- `postPosition`: Position in feed (1-9)
- `shotType`: Post type (portrait, object, flatlay, carousel, etc.)
- `purpose`: Content pillar or purpose
- `emotionalTone`: Warm, confident, etc.
- `brandProfile`: User's brand data (business type, vibe, voice, target audience)
- `contentPillar`: Content category
- `previousCaptions`: Array of previous captions (for variety)
- `researchData`: Market research insights (optional)

**What it DOES:**
- ✅ Uses Claude Sonnet 4 with updated 2025 research
- ✅ Uses Maya's voice (warm, friendly, simple everyday language)
- ✅ Implements Anti-AI Formula (mixed rhythm, contractions, no AI phrases)
- ✅ Uses Hook → Story/Context → One Ask structure
- ✅ Tracks previous captions for variety
- ✅ Uses brand profile and research data

**What it DOES NOT:**
- ❌ Does NOT analyze images (no image URLs passed)
- ❌ Does NOT receive image descriptions
- ❌ Does NOT know these are AI-generated images (not explicitly stated)
- ❌ Does NOT analyze mood from images

---

#### 2. **Image Analysis Status**

**Current:** ❌ NO image analysis
- Caption writer receives only metadata (post type, content pillar, purpose)
- No image URLs or vision analysis
- No mood detection from images

**Why this is OK:**
- System prompt says "Focus on the PERSON'S story and insights, not what's visible in the photo"
- This aligns with 2025 research: tell user's story, not describe images
- Images are AI-generated, so describing them would be generic

**Potential Issue:**
- System prompt doesn't explicitly state "These are AI-generated images - don't describe them"
- Could be clearer about avoiding image descriptions

---

#### 3. **AI-Generated Image Awareness**

**Current System Prompt:**
```
"Focus on the PERSON'S story and insights, not what's visible in the photo."
```

**What's Missing:**
- ❌ Doesn't explicitly state these are AI-generated images
- ❌ Doesn't explain why we shouldn't describe them
- ❌ Could be more explicit about telling user's story vs. describing visuals

**Recommendation:**
Add explicit instruction:
```
"CRITICAL: These are AI-generated images for the user's Instagram feed. 
DO NOT describe what's in the image (outfit, location, pose, etc.). 
Instead, tell the USER'S STORY - their journey, insights, lessons, 
transformation, or value they provide. The image is just visual support 
for the story, not the story itself."
```

---

#### 4. **2025 Research Implementation**

**Status:** ✅ FULLY IMPLEMENTED

**What's Included:**
- ✅ "Text a Friend" test
- ✅ Anti-AI Formula:
  - Mixed sentence rhythm
  - Contractions ("I'm", "you'll", "gonna")
  - Kills AI phrases
  - Adds tiny imperfections
  - Starts with something real
- ✅ Hook → Story/Context → One Ask structure
- ✅ Maya's voice (warm, friendly, simple language)
- ✅ Edit checklist

**Location:** `lib/instagram-strategist/personality.ts` and `lib/feed-planner/caption-writer.ts`

---

#### 5. **Caption Display in Post Cards**

**Status:** ✅ DISPLAYS CORRECTLY

**Components:**
1. **FeedPostCard** (`components/feed-planner/feed-post-card.tsx`):
   - ✅ Shows full caption with truncation (100 chars)
   - ✅ "more"/"less" toggle for long captions
   - ✅ Copy caption button
   - ✅ Enhance with Maya button
   - ✅ Edit caption functionality
   - ✅ Length indicator (125-150 chars = optimal)
   - ✅ Hashtag extraction and display
   - ✅ Uses `whitespace-pre-wrap` for line breaks

2. **FeedPostsList** (`components/feed-planner/feed-posts-list.tsx`):
   - ✅ Shows captions in Instagram-style format
   - ✅ Truncation at 150 chars with expand/collapse
   - ✅ Copy and enhance buttons
   - ✅ Proper line break handling

**Issues Found:** None - captions display correctly

---

## 🔍 Issues Identified

### Issue 1: "Create Captions" Button Doesn't Generate
**Current:** Navigates to Maya Chat (`/studio#maya/feed`)
**Should:** Call `/api/feed/[feedId]/generate-captions` and save captions

### Issue 2: API Doesn't Save Captions
**Current:** `/api/feed/[feedId]/generate-captions` returns captions but doesn't save
**Should:** Save captions directly to database

### Issue 3: Missing AI-Generated Image Context
**Current:** System prompt doesn't explicitly state these are AI-generated images
**Should:** Add explicit instruction to avoid describing images

### Issue 4: No Image Analysis (But This is OK)
**Current:** No image URLs or vision analysis
**Status:** ✅ This is correct - we want story, not image descriptions

---

## 📝 Implementation Plan

### Phase 1: Update System Prompt (AI-Generated Image Awareness)

**File:** `lib/instagram-strategist/personality.ts`

**Change:**
Add explicit instruction about AI-generated images:
```
## CRITICAL: AI-Generated Images Context

These captions are for AI-generated images in the user's Instagram feed. 
DO NOT describe what's in the image (outfit, location, pose, styling, etc.). 
Instead, tell the USER'S STORY - their journey, insights, lessons, 
transformation, or value they provide.

The image is visual support for the story, not the story itself. 
Focus on:
- User's personal experiences
- Lessons learned
- Insights and value
- Transformation stories
- Behind-the-scenes moments
- Real talk and vulnerability

NOT on:
- What they're wearing
- Where they are
- How they're posing
- Visual details of the image
```

---

### Phase 2: Update Generate-Captions API to Save Directly

**File:** `app/api/feed/[feedId]/generate-captions/route.ts`

**Changes:**
1. After generating each caption, save it to database:
```typescript
await sql`
  UPDATE feed_posts
  SET caption = ${caption}
  WHERE id = ${post.id}
`
```

2. Return success message instead of preview array
3. Add error handling for partial saves

---

### Phase 3: Update "Create Captions" Button

**File:** `components/feed-planner/feed-posts-list.tsx`

**Changes:**
1. Add state for loading (`isGeneratingCaptions`)
2. Replace navigation with API call:
```typescript
onClick={async () => {
  setIsGeneratingCaptions(true)
  try {
    const response = await fetch(`/api/feed/${feedId}/generate-captions`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json()
    if (data.success) {
      toast({ title: "Captions generated!", description: "All captions have been created." })
      await mutate() // Refresh feed data
    }
  } catch (error) {
    toast({ title: "Error", description: "Failed to generate captions", variant: "destructive" })
  } finally {
    setIsGeneratingCaptions(false)
  }
}}
```

3. Add loading state to button
4. Pass `feedId` and `mutate` function as props

---

### Phase 4: Add Feed ID and Mutate to FeedPostsList

**File:** `components/feed-planner/instagram-feed-view.tsx`

**Changes:**
1. Pass `feedId` to `FeedPostsList`
2. Pass `mutate` function for refreshing data
3. Update `FeedPostsList` props interface

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] System prompt explicitly states AI-generated images context
- [ ] Caption writer doesn't describe images
- [ ] Captions tell user's story, not image details
- [ ] "Create Captions" button calls API directly
- [ ] API saves captions to database
- [ ] Feed refreshes after caption generation
- [ ] Captions display correctly in post cards
- [ ] Line breaks preserved (`\n\n`)
- [ ] Hashtags extracted and displayed
- [ ] Copy functionality works
- [ ] Edit functionality works
- [ ] 2025 research principles applied (Anti-AI formula, Maya's voice)

---

## 🎯 Expected Outcome

**Before:**
1. User clicks "Create Captions" → Navigates to Maya Chat
2. User asks Maya manually → Maya generates captions
3. Captions saved via Maya workflow

**After:**
1. User clicks "Create Captions" → API generates all captions
2. Captions saved directly to database
3. Feed refreshes with new captions
4. Captions tell user's story (not image descriptions)
5. All captions use 2025 human-sounding research

---

## 📊 Files to Modify

1. `lib/instagram-strategist/personality.ts` - Add AI-generated image context
2. `app/api/feed/[feedId]/generate-captions/route.ts` - Save captions to database
3. `components/feed-planner/feed-posts-list.tsx` - Update button to call API
4. `components/feed-planner/instagram-feed-view.tsx` - Pass feedId and mutate

---

## 🚀 Implementation Order

1. **First:** Update system prompt (Phase 1) - ensures captions don't describe images
2. **Second:** Update API to save (Phase 2) - enables direct saving
3. **Third:** Update button (Phase 3) - connects UI to API
4. **Fourth:** Pass props (Phase 4) - enables button functionality

---

## ⚠️ Potential Issues & Solutions

### Issue: Captions might still describe images
**Solution:** Explicit system prompt instruction + test with sample captions

### Issue: API might fail for some posts
**Solution:** Continue with other posts even if one fails (already implemented)

### Issue: Feed might not refresh
**Solution:** Use `mutate()` from SWR to force refresh

### Issue: Button might show loading forever
**Solution:** Proper error handling and finally block to reset loading state

