# Caption Generation Flow Analysis

## Current State

### When User Clicks "Create Captions" Button

**Location:** `components/feed-planner/feed-posts-list.tsx` (lines 32-48)

**Current Behavior:**
```typescript
onClick={() => {
  // Navigate to Maya Feed tab with "Create captions" prompt
  window.location.href = "/studio#maya/feed"
  // Small delay to ensure tab is loaded, then trigger prompt
  setTimeout(() => {
    // The prompt will be sent via quick prompt click or user can type it
  }, 500)
}}
```

**Problem:** The button just navigates to Maya Chat Feed tab - it doesn't actually generate captions automatically.

---

## Available API Endpoints

### 1. `/api/feed/[feedId]/generate-captions` (POST)
**Location:** `app/api/feed/[feedId]/generate-captions/route.ts`

**What it does:**
- Generates captions for ALL posts in a feed
- Uses `generateInstagramCaption()` from `lib/feed-planner/caption-writer.ts`
- Uses updated 2025 human-sounding research (Maya's voice, Anti-AI formula)
- Does NOT save to database - returns captions as array for preview/approval
- Uses Claude Sonnet 4 with `INSTAGRAM_STRATEGIST_SYSTEM_PROMPT`

**Flow:**
1. Fetches all posts for the feed
2. Gets brand profile from `user_personal_brand`
3. Gets research data from `content_research` (if available)
4. Loops through each post and generates caption using:
   - Post position, shot type, purpose, emotional tone
   - Brand profile (business type, vibe, voice, target audience)
   - Previous captions (for variety)
   - Research data (trending hooks, hashtags, insights)
5. Returns array of captions with post IDs

**AI Model:** Claude Sonnet 4
**System Prompt:** `INSTAGRAM_STRATEGIST_SYSTEM_PROMPT` (updated with 2025 research)
**Temperature:** 0.9 (high creativity)

---

### 2. `/api/feed/[feedId]/regenerate-caption` (POST)
**Location:** `app/api/feed/[feedId]/regenerate-caption/route.ts`

**What it does:**
- Regenerates caption for a SINGLE post
- Uses same `generateInstagramCaption()` function
- Saves directly to database
- Used when user clicks "Enhance with Maya" on individual post

---

## Caption Generation Logic

### `generateInstagramCaption()` Function
**Location:** `lib/feed-planner/caption-writer.ts`

**Uses:**
- System prompt: `INSTAGRAM_STRATEGIST_SYSTEM_PROMPT` (Maya's voice, 2025 research)
- Model: Claude Sonnet 4
- Temperature: 0.9

**Key Features (2025 Updates):**
1. ✅ "Text a Friend" test
2. ✅ Anti-AI Formula:
   - Mixes sentence rhythm (short, long, in between)
   - Uses contractions ("I'm", "you'll", "gonna")
   - Kills AI phrases
   - Adds tiny imperfections
   - Starts with something real
3. ✅ Structure: Hook → Story/Context → One Ask
4. ✅ Maya's voice (warm, friendly, simple everyday language)

**Input Parameters:**
- `postPosition`: Position in feed (1-9)
- `shotType`: Post type (portrait, object, flatlay, etc.)
- `purpose`: Content pillar or purpose
- `emotionalTone`: Warm, confident, etc.
- `brandProfile`: User's brand data
- `targetAudience`: Who the content is for
- `brandVoice`: How the brand communicates
- `contentPillar`: Content category
- `previousCaptions`: Array of previous captions (for variety)
- `researchData`: Market research insights (optional)

**Output:**
- `{ caption: string }` - Ready-to-post caption with hashtags

---

## Current Issues

### 1. "Create Captions" Button Doesn't Generate
- Button navigates to Maya Chat instead of calling API
- Users have to manually ask Maya to create captions
- No direct caption generation from feed planner

### 2. No Direct Save After Generation
- `/api/feed/[feedId]/generate-captions` returns captions but doesn't save
- Need separate endpoint to save captions to database
- Or update endpoint to save directly

---

## Recommended Fix

### Option 1: Update Button to Call API Directly
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
      // Save captions to database
      await saveCaptionsToFeed(data.captions)
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

### Option 2: Update API to Save Directly
- Modify `/api/feed/[feedId]/generate-captions` to save captions to database
- Return success message instead of preview array
- Simpler UX - one click, captions are saved

---

## AI Handling Summary

**Current AI Flow:**
1. User clicks "Create Captions" → Navigates to Maya Chat ❌
2. User asks Maya → Maya uses feed context → Generates captions ✅
3. Captions saved via Maya's feed workflow ✅

**What Should Happen:**
1. User clicks "Create Captions" → Calls `/api/feed/[feedId]/generate-captions` ✅
2. API generates all captions using updated 2025 research ✅
3. Captions saved to database ✅
4. Feed refreshes with new captions ✅

**AI Model:** Claude Sonnet 4
**System Prompt:** Updated with Maya's voice + 2025 human-sounding research
**Quality:** High (temperature 0.9, uses brand profile, research data, previous captions for variety)

