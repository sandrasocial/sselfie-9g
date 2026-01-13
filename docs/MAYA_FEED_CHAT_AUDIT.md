# MAYA FEED CHAT - COMPREHENSIVE AUDIT

**Date:** January 2025  
**Purpose:** Understand Maya Feed Chat architecture to identify overlaps, conflicts, and reuse opportunities with Blueprint implementation  
**Status:** ✅ Complete Audit

---

## EXECUTIVE SUMMARY

**Maya Feed Chat** is a conversational AI interface where users chat with Maya to create Instagram feed strategies. It's a **separate product** from Blueprint but **shares the same database tables** (`feed_layouts`, `feed_posts`).

**Key Finding:** ✅ **NO CRITICAL CONFLICTS** - Both systems can coexist safely with proper status management.

---

## MAYA FEED CHAT ARCHITECTURE

### Overview

Maya Feed Chat is a conversational flow where:
1. User chats with Maya in "Feed Tab" (`chat_type = "feed-planner"`)
2. Maya generates feed strategy via `[CREATE_FEED_STRATEGY: {...}]` trigger
3. Strategy is validated and saved to `feed_layouts` + `feed_posts`
4. Feeds can be saved to planner (`status: 'saved'`) or kept in chat only (`status: 'chat'`)

### User Flow

```
User opens Maya Chat → Selects "Feed Tab"
  ↓
User: "Create an Instagram feed for my business"
  ↓
Maya analyzes request + brand profile
  ↓
Maya outputs: [CREATE_FEED_STRATEGY: {posts: [...], title: "...", ...}]
  ↓
Component detects trigger → Calls /api/maya/generate-feed
  ↓
API validates strategy → Returns validated strategy
  ↓
Component calls /api/feed-planner/create-from-strategy
  ↓
Feed saved to feed_layouts + feed_posts (status: 'chat' or 'saved')
  ↓
Feed appears in chat as feed card OR in Feed Planner screen
```

---

## DATABASE SCHEMA

### Shared Tables

**Both Maya Feed Chat and Blueprint use:**

1. **`feed_layouts`** - Main feed container
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (TEXT)
   - `title` (VARCHAR)
   - `description` (TEXT)
   - `status` (VARCHAR) - **KEY FIELD**: `'chat'` (chat only) or `'saved'` (in planner)
   - `layout_type` (VARCHAR) - Default: `'grid_3x3'`
   - `brand_vibe`, `business_type`, `color_palette`, etc.

2. **`feed_posts`** - Individual posts
   - `id` (SERIAL PRIMARY KEY)
   - `feed_layout_id` (INTEGER) - References `feed_layouts.id`
   - `user_id` (TEXT)
   - `position` (INTEGER) - **KEY FIELD**: 1-9 for Maya, 1-12 for Blueprint
   - `post_type` (VARCHAR)
   - `image_url` (TEXT)
   - `caption` (TEXT)
   - `prompt` (TEXT)
   - `generation_status` (VARCHAR)
   - `generation_mode` (VARCHAR) - `'classic'` or `'pro'`

3. **`maya_chats`** - Chat sessions (Maya Feed Chat only)
   - `id` (SERIAL PRIMARY KEY)
   - `user_id` (TEXT)
   - `title` (TEXT)
   - `chat_type` (TEXT) - `'feed-planner'` for Feed Tab

4. **`maya_chat_messages`** - Chat messages (Maya Feed Chat only)
   - `id` (SERIAL PRIMARY KEY)
   - `chat_id` (INTEGER)
   - `role` (TEXT) - `'user'` or `'assistant'`
   - `content` (TEXT)
   - `feed_cards` (JSONB) - Stores feed strategy JSON

### Blueprint-Specific Tables

**Blueprint uses (Maya Feed Chat does NOT):**
- `blueprint_subscribers` - Legacy table for free blueprint users
- `user_personal_brand` - Brand profile (shared with Maya)

---

## API ENDPOINTS

### Maya Feed Chat Endpoints

| Endpoint | Purpose | Blueprint Impact |
|----------|---------|------------------|
| `/api/maya/chat` | Main chat API (handles Feed Tab) | ✅ **REUSE** - Can use for Blueprint chat features |
| `/api/maya/generate-feed` | Validates feed strategy JSON (Classic) | ✅ **REUSE** - Already validates 9-post strategies |
| `/api/maya/pro/generate-feed` | Validates feed strategy JSON (Pro) | ✅ **REUSE** - Pro mode validation |
| `/api/feed-planner/create-from-strategy` | Creates feed from strategy | ⚠️ **CONFLICT** - Expects 9 posts, Blueprint needs 12 |
| `/api/maya/feed/list` | Lists feeds for user | ✅ **REUSE** - Works for both systems |
| `/api/maya/feed/[feedId]` | Get/delete feed | ✅ **REUSE** - Works for both systems |
| `/api/maya/feed/save-to-planner` | Save feed to planner | ✅ **REUSE** - Sets status to 'saved' |
| `/api/maya/generate-feed-prompt` | Generate prompt for single post | ✅ **REUSE** - Already used by Blueprint! |

### Blueprint Endpoints

| Endpoint | Purpose | Maya Feed Chat Impact |
|----------|---------|----------------------|
| `/api/feed/create-free-example` | Create free example feed | ✅ **SAFE** - Creates 1 post, status: 'saved' |
| `/api/feed/[feedId]/generate-single` | Generate single image | ✅ **REUSE** - Already works for both! |
| `/api/feed/expand-for-paid` | Expand to paid grid | ⚠️ **CONFLICT** - Creates 9 posts, needs 12 |

---

## COMPONENT ARCHITECTURE

### Maya Feed Chat Components

1. **`components/sselfie/maya/maya-feed-tab.tsx`**
   - Feed Tab UI component
   - Detects `[CREATE_FEED_STRATEGY]` trigger
   - Calls validation API
   - Creates feed card in chat

2. **`components/sselfie/maya/maya-chat-interface.tsx`**
   - Main chat interface
   - Displays feed cards
   - Handles message rendering

### Blueprint Components

1. **`components/feed-planner/feed-single-placeholder.tsx`**
   - Free mode placeholder
   - Shows preview grid
   - Upsell button

2. **`components/feed-planner/feed-grid.tsx`**
   - Paid mode grid (3x3, needs 3x4)
   - Displays posts

**No Component Conflicts:** ✅ Components are separate, no overlap

---

## DATA FORMAT COMPARISON

### Maya Feed Chat Format

```json
{
  "feedTitle": "Instagram Feed",
  "overallVibe": "Luxury minimalist",
  "colorPalette": "Beige, cream, white",
  "posts": [
    {
      "position": 1,
      "postType": "portrait",
      "visualDirection": "Close-up portrait...",
      "caption": "Hook: ... Story: ... Value: ... CTA: ...",
      "prompt": "user42585527, White woman, in sage green silk blouse..."
    }
    // ... 8 more posts (total 9)
  ]
}
```

**Key Characteristics:**
- Exactly 9 posts (positions 1-9)
- `visualDirection` field (not used by Blueprint)
- `caption` included in strategy
- `prompt` may or may not be included
- Status: `'chat'` (default) or `'saved'` (if saved to planner)

### Blueprint Format

```json
{
  "feed_layouts": {
    "id": 123,
    "title": "My Feed",
    "status": "saved",
    "layout_type": "grid_3x4"  // Blueprint uses 3x4
  },
  "feed_posts": [
    {
      "id": 456,
      "position": 1,
      "post_type": "user",
      "prompt": "Create a 3x4 grid...",  // Template prompt for preview
      "generation_status": "completed",
      "image_url": "https://...",
      "generation_mode": "pro"
    }
    // ... 11 more posts (total 12 for paid)
  ]
}
```

**Key Characteristics:**
- 1 post for free mode (position 1)
- 12 posts for paid mode (positions 1-12)
- `prompt` field stores template (for preview) or Maya-generated prompt
- Status: Always `'saved'` (appears in planner)

---

## OVERLAP & CONFLICT ANALYSIS

### ✅ SAFE OVERLAPS (No Conflicts)

| Feature | Maya Feed Chat | Blueprint | Status |
|---------|----------------|-----------|--------|
| **Database Tables** | `feed_layouts`, `feed_posts` | Same tables | ✅ **SAFE** - Status field separates them |
| **Prompt Generation** | `/api/maya/generate-feed-prompt` | Uses same endpoint | ✅ **REUSE** - Already working! |
| **Image Generation** | `/api/feed/[feedId]/generate-single` | Uses same endpoint | ✅ **REUSE** - Already working! |
| **Feed Listing** | `/api/maya/feed/list` | Can use same endpoint | ✅ **REUSE** - Works for both |
| **User Brand Profile** | `user_personal_brand` | Uses same table | ✅ **SAFE** - Shared data |

### ⚠️ POTENTIAL CONFLICTS (Need Mitigation)

| Conflict | Maya Feed Chat | Blueprint | Risk | Mitigation |
|----------|----------------|-----------|------|------------|
| **Position Range** | 1-9 posts | 1-12 posts | 🟡 **MEDIUM** | Update validation to allow 1-12 |
| **Grid Size** | 3x3 (9 posts) | 3x4 (12 posts) | 🟡 **MEDIUM** | Update `layout_type` to support `'grid_3x4'` |
| **Status Field** | `'chat'` or `'saved'` | Always `'saved'` | ✅ **SAFE** | Blueprint always uses `'saved'` |
| **Feed Creation** | `/api/feed-planner/create-from-strategy` expects 9 posts | Needs 12 posts | 🔴 **HIGH** | Update validation or create separate endpoint |
| **Template Prompts** | Uses Maya-generated prompts | Uses template prompts | ✅ **SAFE** - Different fields |

---

## CRITICAL QUESTIONS ANSWERED

### ✅ Q1: Does Maya feed chat already provide Blueprint functionality?

**Answer:** **PARTIALLY**
- ✅ Maya Feed Chat creates feeds with 9 posts (3x3 grid)
- ✅ Maya generates prompts intelligently
- ✅ Maya includes captions in strategy
- ❌ Maya does NOT create 3x4 grid previews (Blueprint's free mode)
- ❌ Maya does NOT use template-based preview generation
- ❌ Maya does NOT have free/paid funnel (Blueprint's core value)

**Conclusion:** Maya Feed Chat is a **conversational feed creation tool**. Blueprint is a **template-based funnel with preview generation**. They serve different use cases.

---

### ✅ Q2: Do they share database tables? Which ones?

**Answer:** **YES - Shared Tables:**
1. ✅ `feed_layouts` - Main feed container
2. ✅ `feed_posts` - Individual posts
3. ✅ `user_personal_brand` - Brand profile (shared data)

**Blueprint-Only Tables:**
- `blueprint_subscribers` - Legacy free blueprint users

**Maya Feed Chat-Only Tables:**
- `maya_chats` - Chat sessions
- `maya_chat_messages` - Chat messages

**Conclusion:** ✅ **SAFE** - Status field (`'chat'` vs `'saved'`) separates feeds. No data conflicts.

---

### ✅ Q3: Do they share API endpoints? Which ones?

**Answer:** **YES - Shared Endpoints:**
1. ✅ `/api/maya/generate-feed-prompt` - **ALREADY USED BY BLUEPRINT!**
2. ✅ `/api/feed/[feedId]/generate-single` - **ALREADY USED BY BLUEPRINT!**
3. ✅ `/api/maya/feed/list` - Can be used by both
4. ✅ `/api/maya/feed/[feedId]` - Can be used by both

**Maya Feed Chat-Only Endpoints:**
- `/api/maya/chat` - Chat API
- `/api/maya/generate-feed` - Strategy validation (9 posts)
- `/api/feed-planner/create-from-strategy` - Feed creation (expects 9 posts)

**Blueprint-Only Endpoints:**
- `/api/feed/create-free-example` - Free mode feed creation
- `/api/feed/expand-for-paid` - Paid mode expansion

**Conclusion:** ✅ **SAFE** - Most endpoints are reusable. Only feed creation endpoints need updates.

---

### ✅ Q4: Will our Blueprint plan break Maya feed chat?

**Answer:** **NO - With Proper Implementation**

**What WON'T Break:**
- ✅ Maya Feed Chat feeds (status: `'chat'` or `'saved'`)
- ✅ Maya's 9-post feed creation
- ✅ Maya's conversational flow
- ✅ Maya's prompt generation

**What NEEDS Updates:**
- ⚠️ `/api/feed-planner/create-from-strategy` - Currently validates 9 posts, needs to support 12
- ⚠️ Position validation - Currently 1-9, needs 1-12
- ⚠️ `layout_type` - Currently `'grid_3x3'`, needs `'grid_3x4'` support

**Conclusion:** ✅ **SAFE** - No breaking changes if we update validation to support both 9 and 12 posts.

---

### ✅ Q5: Should Blueprint replace Maya feed chat?

**Answer:** **NO - They Serve Different Use Cases**

**Maya Feed Chat:**
- Conversational feed creation
- AI-powered strategy generation
- 9-post feeds (3x3)
- Captions included in strategy
- Best for: Users who want AI guidance

**Blueprint:**
- Template-based preview generation
- Free/paid funnel
- 3x4 grid preview (free) + 12 posts (paid)
- Individual image generation
- Best for: Users who want quick previews + full control

**Conclusion:** ✅ **KEEP BOTH** - They complement each other, not replace.

---

### ✅ Q6: Should they be merged into one product?

**Answer:** **NO - Keep Separate, Share Infrastructure**

**Why Keep Separate:**
- Different user journeys (conversational vs template-based)
- Different grid sizes (9 vs 12 posts)
- Different entry points (chat vs planner)
- Different value propositions

**What to Share:**
- ✅ Database tables (with status separation)
- ✅ Prompt generation API (`/api/maya/generate-feed-prompt`)
- ✅ Image generation API (`/api/feed/[feedId]/generate-single`)
- ✅ Feed listing API (`/api/maya/feed/list`)

**Conclusion:** ✅ **SHARE INFRASTRUCTURE, KEEP SEPARATE UX**

---

### ✅ Q7: Can we reuse Maya feed chat's prompt generation?

**Answer:** **YES - ALREADY REUSING!**

**Current State:**
- ✅ Blueprint already uses `/api/maya/generate-feed-prompt` (see `generate-single/route.ts:592`)
- ✅ Maya endpoint accepts `referencePrompt` parameter
- ✅ Can pass preview template as guideline

**Implementation:**
```typescript
// In generate-single/route.ts (Blueprint)
const mayaResponse = await fetch('/api/maya/generate-feed-prompt', {
  method: 'POST',
  body: JSON.stringify({
    postType: 'portrait',
    feedPosition: 5,
    referencePrompt: previewTemplate, // ← Preview template as guideline
    proMode: true,
  })
})
```

**Conclusion:** ✅ **ALREADY WORKING** - No changes needed for prompt generation reuse.

---

### ✅ Q8: Is `/api/maya/generate-feed-prompt` the right endpoint to use?

**Answer:** **YES - Perfect Fit**

**Why It's Right:**
- ✅ Accepts `referencePrompt` parameter (line 26, 137-165)
- ✅ Supports Pro Mode (Nano Banana)
- ✅ Generates unique prompts per position
- ✅ Already used by Blueprint (line 592 in `generate-single/route.ts`)

**How to Use:**
```typescript
// Pass preview template as referencePrompt
const response = await fetch('/api/maya/generate-feed-prompt', {
  method: 'POST',
  body: JSON.stringify({
    postType: post.post_type,
    feedPosition: post.position,
    referencePrompt: feed_posts[0].prompt, // Preview template
    proMode: true,
    brandVibe: feed.brand_vibe,
    colorTheme: feed.color_palette,
  })
})
```

**Conclusion:** ✅ **PERFECT** - This is exactly what we need for Phase 2 (Maya Integration).

---

### ✅ Q9: Does Maya feed chat already do 3x4 grid previews?

**Answer:** **NO**

**Maya Feed Chat:**
- Creates 9-post feeds (3x3 grid)
- No preview generation
- Conversational flow only

**Blueprint:**
- Creates 3x4 grid preview (12 posts in 1 image) - **ALREADY WORKING**
- Template-based generation
- Free mode feature

**Conclusion:** ✅ **NO OVERLAP** - Blueprint's preview generation is unique.

---

### ✅ Q10: Does Maya feed chat already do individual image generation?

**Answer:** **YES - SHARED ENDPOINT**

**Current State:**
- ✅ Both use `/api/feed/[feedId]/generate-single`
- ✅ Endpoint already supports both systems
- ✅ Works for any `feed_posts` record

**Conclusion:** ✅ **ALREADY SHARED** - No conflicts, already working.

---

## MIGRATION RISK ASSESSMENT

### Breaking Changes Analysis

**Will NOT Break:**
1. ✅ Maya Feed Chat feeds (status: `'chat'` or `'saved'`)
2. ✅ Maya's 9-post feed creation
3. ✅ Maya's conversational flow
4. ✅ Existing feed data

**Will Need Updates:**
1. ⚠️ `/api/feed-planner/create-from-strategy` - Update to support 12 posts
2. ⚠️ Position validation - Update to allow 1-12 (currently 1-9)
3. ⚠️ `layout_type` - Add `'grid_3x4'` support

**Fix Time Estimate:**
- Update validation: 1-2 hours
- Test compatibility: 1 hour
- **Total: 2-3 hours**

---

### Data Conflicts Analysis

**Will Blueprint and Maya Feed Chat write conflicting data?**

**Answer:** **NO - Status Field Separates Them**

**How It Works:**
- Maya Feed Chat: `status: 'chat'` (default) or `'saved'` (if saved to planner)
- Blueprint: `status: 'saved'` (always appears in planner)

**Data Separation:**
- ✅ Different status values prevent conflicts
- ✅ Both can write to same tables safely
- ✅ Feed Planner screen filters by `status: 'saved'`
- ✅ Maya Feed Chat shows feeds with `status: 'chat'` or `'saved'`

**Conclusion:** ✅ **NO CONFLICTS** - Status field provides natural separation.

---

### User Impact Analysis

**Users currently using Maya Feed Chat - will they be affected?**

**Answer:** **NO - Zero Impact**

**Why:**
- ✅ Maya Feed Chat uses `status: 'chat'` (default)
- ✅ Blueprint uses `status: 'saved'`
- ✅ Different entry points (chat vs planner)
- ✅ Different grid sizes (9 vs 12 posts)
- ✅ No data migration needed

**Existing Data:**
- ✅ All existing Maya Feed Chat feeds remain intact
- ✅ No migration needed
- ✅ No breaking changes

**Conclusion:** ✅ **ZERO USER IMPACT** - Complete isolation via status field.

---

## REUSABILITY REPORT

### ✅ What Can Be Reused (No Changes)

1. **`/api/maya/generate-feed-prompt`** - ✅ **ALREADY REUSING**
   - Perfect for Blueprint's Phase 2 (Maya Integration)
   - Accepts `referencePrompt` parameter
   - Supports Pro Mode

2. **`/api/feed/[feedId]/generate-single`** - ✅ **ALREADY REUSING**
   - Works for both systems
   - No changes needed

3. **`/api/maya/feed/list`** - ✅ **CAN REUSE**
   - Lists all feeds (both systems)
   - Filters by status if needed

4. **Database Tables** - ✅ **SHARED**
   - `feed_layouts` - Status field separates feeds
   - `feed_posts` - Position 1-12 supported
   - `user_personal_brand` - Shared brand data

### ⚠️ What Needs Modification

1. **`/api/feed-planner/create-from-strategy`** - ⚠️ **NEEDS UPDATE**
   - Currently validates 9 posts
   - Needs to support 12 posts (or create separate endpoint)
   - **Fix Time:** 1-2 hours

2. **Position Validation** - ⚠️ **NEEDS UPDATE**
   - Currently validates 1-9
   - Needs to validate 1-12
   - **Fix Time:** 30 minutes

3. **`layout_type` Field** - ⚠️ **NEEDS UPDATE**
   - Currently supports `'grid_3x3'`
   - Needs to support `'grid_3x4'`
   - **Fix Time:** 30 minutes

### ❌ What's Incompatible

**Nothing!** ✅ All systems are compatible with proper status management.

---

## ARCHITECTURAL RECOMMENDATION

### Option A: Implement Blueprint as Planned (RECOMMENDED) ✅

**Justification:**
- ✅ No breaking changes to Maya Feed Chat
- ✅ Status field provides natural separation
- ✅ Most endpoints already reusable
- ✅ Only 2-3 hours of compatibility updates needed

**Implementation:**
1. Update `/api/feed-planner/create-from-strategy` to support 12 posts
2. Update position validation to allow 1-12
3. Add `'grid_3x4'` to `layout_type` enum
4. Proceed with Blueprint implementation

**Risk Level:** 🟢 **LOW** - Minimal changes, no breaking changes

---

### Option B: Merge Maya Feed Chat and Blueprint

**Justification:**
- ❌ Different user journeys (conversational vs template-based)
- ❌ Different grid sizes (9 vs 12 posts)
- ❌ Different entry points
- ❌ High refactoring cost (20+ hours)

**Risk Level:** 🔴 **HIGH** - Major refactoring, high risk

**Recommendation:** ❌ **DO NOT MERGE** - Keep separate, share infrastructure

---

### Option C: Use Maya Feed Chat Instead of Blueprint

**Justification:**
- ❌ Maya Feed Chat doesn't have preview generation
- ❌ Maya Feed Chat doesn't have free/paid funnel
- ❌ Maya Feed Chat doesn't use templates
- ❌ Different value proposition

**Risk Level:** 🔴 **HIGH** - Loses Blueprint's core value

**Recommendation:** ❌ **DO NOT REPLACE** - Blueprint serves different use case

---

### Option D: Hybrid Approach (RECOMMENDED) ✅

**Justification:**
- ✅ Keep Maya Feed Chat for conversational feed creation
- ✅ Keep Blueprint for template-based preview funnel
- ✅ Share infrastructure (databases, APIs)
- ✅ Minimal compatibility updates (2-3 hours)

**Implementation:**
1. Update validation to support both 9 and 12 posts
2. Add `'grid_3x4'` support
3. Proceed with Blueprint implementation
4. Both systems coexist peacefully

**Risk Level:** 🟢 **LOW** - Best of both worlds

**Recommendation:** ✅ **RECOMMENDED** - Option D (Hybrid)

---

## REVISED IMPLEMENTATION PLAN

### Phase 0: Compatibility Updates (2-3 hours) 🔴 CRITICAL

**Before implementing Blueprint, update shared infrastructure:**

1. **Update `/api/feed-planner/create-from-strategy`** (1-2 hours)
   - Change validation from "exactly 9 posts" to "9 or 12 posts"
   - Support both `'grid_3x3'` and `'grid_3x4'`
   - Test with existing Maya Feed Chat flows

2. **Update Position Validation** (30 minutes)
   - Change from `1-9` to `1-12`
   - Update database constraints if needed
   - Test with existing feeds

3. **Add `'grid_3x4'` Support** (30 minutes)
   - Update `layout_type` enum/validation
   - Update UI components to handle both sizes
   - Test display

**Files to Modify:**
- `app/api/feed-planner/create-from-strategy/route.ts` (line 128-134)
- `app/api/maya/generate-feed/route.ts` (line 104-110)
- `app/api/maya/pro/generate-feed/route.ts` (line 117)
- Database migration (if needed)

**Testing:**
- ✅ Test Maya Feed Chat still creates 9-post feeds
- ✅ Test Blueprint can create 12-post feeds
- ✅ Test both appear in Feed Planner correctly

---

### Phase 1: Credit Upsell Modal (3-4 hours) 🔴 HIGH

**No changes needed** - Proceed as planned.

---

### Phase 2: Maya Integration (6-8 hours) 🔴 HIGH

**Already using correct endpoint!** Just need to:
- Load preview template from `feed_posts[0].prompt`
- Pass as `referencePrompt` to `/api/maya/generate-feed-prompt`
- Use generated prompt for image generation

**Files to Modify:**
- `app/api/feed/[feedId]/generate-single/route.ts` (already has Maya integration code!)

---

### Phase 3: Welcome Wizard (6-8 hours) 🔴 HIGH

**No changes needed** - Proceed as planned.

---

### Phase 4: Grid Extension (3-4 hours) 🟡 MEDIUM

**After Phase 0 compatibility updates:**
- Update `FeedGrid` to 3x4 layout
- Update `expand-for-paid` to create 12 posts
- Test with existing Maya Feed Chat feeds (should still show 3x3)

---

### Phase 5: History Organization (4-6 hours) 🟡 MEDIUM

**No changes needed** - Proceed as planned.

---

## FINAL RECOMMENDATION

### ✅ YES - Implement Blueprint as Planned (With Compatibility Updates)

**Why:**
1. ✅ **No Breaking Changes** - Status field separates feeds
2. ✅ **Minimal Updates** - Only 2-3 hours of compatibility fixes
3. ✅ **Maximum Reuse** - Most endpoints already shared
4. ✅ **Zero User Impact** - Maya Feed Chat users unaffected
5. ✅ **Best of Both Worlds** - Keep both systems, share infrastructure

**Action Items:**
1. **Phase 0** (2-3 hours): Update validation to support 9 and 12 posts
2. **Phase 1-5** (20-27 hours): Proceed with Blueprint implementation
3. **Testing**: Verify both systems work independently

**Total Time:** 22-30 hours (includes compatibility updates)

---

## SUMMARY TABLE

| Question | Answer | Impact |
|----------|--------|--------|
| **Does Maya feed chat provide Blueprint functionality?** | Partially - Different use cases | ✅ No conflict |
| **Do they share database tables?** | Yes - `feed_layouts`, `feed_posts` | ✅ Safe (status separation) |
| **Do they share API endpoints?** | Yes - Prompt & image generation | ✅ Already reusing |
| **Will Blueprint break Maya feed chat?** | No - With compatibility updates | ✅ Safe |
| **Should Blueprint replace Maya feed chat?** | No - Different use cases | ✅ Keep both |
| **Should they be merged?** | No - Keep separate, share infrastructure | ✅ Hybrid approach |
| **Can we reuse prompt generation?** | Yes - Already reusing! | ✅ Perfect |
| **Is `/api/maya/generate-feed-prompt` right?** | Yes - Perfect fit | ✅ Already using |
| **Does Maya do 3x4 previews?** | No - Blueprint unique | ✅ No overlap |
| **Does Maya do individual generation?** | Yes - Shared endpoint | ✅ Already working |

---

**End of Audit**
