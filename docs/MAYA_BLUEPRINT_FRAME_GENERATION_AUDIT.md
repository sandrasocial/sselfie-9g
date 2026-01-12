# MAYA AI BLUEPRINT FRAME GENERATION - AUDIT & IMPLEMENTATION PLAN

## EXECUTIVE SUMMARY

This document provides a comprehensive audit of Maya's current architecture and proposes an implementation plan for integrating Maya AI to dynamically generate unique photoshoot frame descriptions for Blueprint feature, replacing static templates.

---

## 1. CURRENT MAYA ARCHITECTURE AUDIT

### 1.1 How Maya is Currently Invoked

**Primary Endpoint:**
- **File**: `/app/api/maya/chat/route.ts`
- **Model**: `anthropic/claude-sonnet-4-20250514` via AI SDK's `streamText()`
- **System Prompt**: Built dynamically based on:
  - Chat type (`maya`, `feed-planner`, `pro-photoshoot`, `prompt_builder`)
  - Mode selection (`classic` vs `pro`)
  - User context (brand profile, preferences)
  - Specialized context addons (feed planner, pro photoshoot)

**Key Architecture:**
```typescript
// From app/api/maya/chat/route.ts
result = streamText({
  model: "anthropic/claude-sonnet-4-20250514",
  system: systemPrompt, // Built from multiple sources
  messages: modelMessages, // Converted from UI messages
  maxTokens: 4096,
  temperature: 0.7,
})
```

**System Prompt Construction:**
1. Base Maya personality (`getMayaSystemPrompt(config)`)
2. User context (`getUserContextForMaya(userId)`)
3. Mode-specific adapters (`MAYA_CLASSIC_CONFIG` or `MAYA_PRO_CONFIG`)
4. Specialized context addons (if applicable):
   - Feed Planner: `getFeedPlannerContextAddon()`
   - Pro Photoshoot: `getProPhotoshootContextAddon()`

### 1.2 Structured Content Generation

**Current Pattern: Trigger-Based JSON Output**

Maya uses **text triggers** followed by JSON code blocks:

**Example from Feed Planner:**
```typescript
// Maya returns:
"YES! 😍 I love this energy! Let's create a strategic 9-post Instagram feed...

[CREATE_FEED_STRATEGY]
```json
{
  "feedTitle": "...",
  "posts": [...]
}
```
"
```

**Parsing Logic:**
- **File**: `lib/maya/feed-generation-handler.ts`
- **Function**: `parseFeedStrategy(mayaResponse: string)`
- **Pattern**: Looks for `[CREATE_FEED_STRATEGY]` trigger, extracts JSON from code blocks
- **Validation**: Validates structure, normalizes field names, checks required fields

**Key Finding:**
- ✅ Maya already generates structured JSON output
- ✅ Pattern is well-established (trigger + JSON)
- ✅ Parsing logic exists and is reusable
- ✅ No tool calling needed - just text triggers

### 1.3 Brand Profile Access

**Function**: `getUserContextForMaya(authUserId: string)`
- **File**: `lib/maya/get-user-context.ts`
- **Data Sources**:
  - `user_personal_brand` table (brand profile, visual aesthetic, settings preference)
  - `users` table (gender, ethnicity)
  - `user_models` table (trigger word, physical preferences)
  - `brand_assets` table (brand assets)
  - `maya_personal_memory` table (preferences, feedback patterns)

**How It's Passed:**
- Added to system prompt as context section
- Format: `## USER CONTEXT (BRAND PROFILE / WIZARD)\n${userContext}`
- Maya uses this context to personalize responses

**Key Finding:**
- ✅ Brand profile access already exists
- ✅ Can access `visual_aesthetic` and `settings_preference` (category + mood)
- ✅ No additional database queries needed

### 1.4 Current Generation Flow for Feeds

**Feed Creation Flow:**
1. User creates feed strategy via Maya Chat (Feed Tab)
2. Maya generates strategy with `[CREATE_FEED_STRATEGY]` trigger
3. Strategy parsed and saved via `/api/feed-planner/create-from-strategy`
4. Feed posts created in database (`feed_posts` table)
5. User clicks "Generate" on individual posts
6. `/api/feed/[feedId]/generate-single` called per post
7. Prompt retrieved from `feed_posts.prompt` field
8. Image generated via NanoBanana Pro or FLUX

**Key Finding:**
- ✅ Posts are created **incrementally** (one at a time)
- ✅ Prompts are stored in `feed_posts.prompt` field
- ✅ Generation happens **on-demand** (when user clicks "Generate")

### 1.5 Credit and Access Control

**Access Control:**
- **File**: `lib/feed-planner/access-control.ts`
- **Function**: `getFeedPlannerAccess(userId: string)`
- **Detection**: Checks `hasPaidBlueprint()` and `hasStudioMembership()`
- **Credit Check**: In `generate-single` route before generation

**Key Finding:**
- ✅ User type detection already exists
- ✅ Credit validation happens before generation
- ✅ Can differentiate FREE (9 images) vs PAID (30 images)

---

## 2. ARCHITECTURE PROPOSAL

### 2.1 Recommended Approach: **New API Endpoint + Batch Generation**

**Why This Approach:**
- ✅ Follows existing Maya pattern (dedicated endpoint for specific tasks)
- ✅ Batch generation is more efficient (1 API call vs 9/30 calls)
- ✅ Frames stored before image generation (better UX)
- ✅ Matches existing feed creation flow

### 2.2 New Maya Endpoint

**File**: `/app/api/maya/generate-blueprint-frames/route.ts`

**Purpose**: Generate N frame descriptions (9 for FREE, 30 for PAID) using Maya AI

**Input:**
```typescript
{
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional",
  mood: "luxury" | "minimal" | "beige",
  frameCount: 9 | 30,
  feedId?: number, // Optional - for storing frames
  previousFrames?: string[] // For repetition prevention
}
```

**Output:**
```typescript
{
  success: boolean,
  frames: BlueprintFrame[],
  error?: string
}

interface BlueprintFrame {
  position: number; // 1-9 or 1-30
  shotType: 'full-body' | 'mid-shot' | 'close-up' | 'detail-flatlay' | 'text-graphic';
  description: string; // Full NanoBanana prompt for this frame
  outfit?: string; // Which outfit variation
}
```

**System Prompt Structure:**
```typescript
const systemPrompt = `
${getMayaSystemPrompt(MAYA_PRO_CONFIG)} // Pro Mode config (Blueprint uses Pro Mode)

${getUserContextForMaya(userId)} // Brand profile

${getBlueprintAestheticContext(category, mood)} // Aesthetic guidelines

## YOUR TASK: GENERATE BLUEPRINT PHOTOSHOOT FRAMES

You are generating ${frameCount} unique photoshoot frame descriptions for a Blueprint photoshoot.

AESTHETIC GUIDELINES:
${aestheticGuide.vibe}
${aestheticGuide.setting}
${aestheticGuide.outfits}
${aestheticGuide.shotMix}
${aestheticGuide.colorGrade}
${aestheticGuide.textElement}

REQUIREMENTS:
- Generate ${frameCount} unique frames (no repetition)
- Each frame must be a complete NanoBanana Pro prompt (150-250 words)
- Follow aesthetic guidelines strictly
- Ensure variety in shot types, poses, locations
- ${previousFrames ? `AVOID these previous frames: ${previousFrames.join(', ')}` : ''}

OUTPUT FORMAT:
[GENERATE_BLUEPRINT_FRAMES]
\`\`\`json
{
  "frames": [
    {
      "position": 1,
      "shotType": "full-body",
      "description": "Full NanoBanana prompt...",
      "outfit": "black blazer"
    },
    ...
  ]
}
\`\`\`
`
```

### 2.3 Aesthetic Guidelines Library

**File**: `lib/maya/blueprint-aesthetic-guides.ts`

**Structure:**
```typescript
export interface BlueprintAestheticGuide {
  vibe: string; // Overall mood description
  setting: string; // Location types
  outfits: string; // Wardrobe palette
  shotMix: string; // Frame type distribution (e.g., "3 full-body, 2 close-up, 2 flatlay, 2 detail")
  colorGrade: string; // Post-processing style
  textElement: string; // Street sign/graphic description
}

export function getAestheticGuide(
  category: BlueprintCategory,
  mood: BlueprintMood
): BlueprintAestheticGuide {
  const moodName = MOOD_MAP[mood] // luxury → dark_moody
  const key = `${category}_${moodName}`
  return BLUEPRINT_AESTHETIC_GUIDES[key]
}
```

**Key Finding:**
- ✅ Similar pattern to existing `blueprint-photoshoot-templates.ts`
- ✅ Can reuse mood mapping logic
- ✅ 18 guides needed (6 categories × 3 moods)

### 2.4 Frame Storage Strategy

**Option A: Store in `feed_posts` table (RECOMMENDED)**

**Pros:**
- ✅ No schema changes needed
- ✅ Frames stored with posts (natural relationship)
- ✅ Easy to query and update
- ✅ Matches existing pattern

**Implementation:**
```typescript
// When frames generated, create feed_posts records
for (const frame of frames) {
  await sql`
    INSERT INTO feed_posts (
      feed_layout_id,
      user_id,
      position,
      prompt, // Store frame description here
      post_type,
      generation_status,
      blueprint_category,
      blueprint_mood,
      generation_source
    )
    VALUES (
      ${feedId},
      ${userId},
      ${frame.position},
      ${frame.description},
      ${frame.shotType},
      'pending',
      ${category},
      ${mood},
      'maya'
    )
  `
}
```

**Option B: Separate `blueprint_frames` table**

**Pros:**
- ✅ Cleaner separation of concerns
- ✅ Can store metadata (outfit, variation index)

**Cons:**
- ❌ Requires migration
- ❌ More complex queries
- ❌ Duplication with `feed_posts`

**Recommendation: Option A** - Store in `feed_posts.prompt` field

### 2.5 Timing: When to Generate Frames

**Recommended: At Feed Creation**

**Flow:**
1. User completes unified wizard → category + mood selected
2. User creates Blueprint feed → `feed_layouts` record created
3. **System automatically calls `/api/maya/generate-blueprint-frames`**
4. Frames generated and stored in `feed_posts` table
5. User sees feed with all posts ready to generate
6. User clicks "Generate" → uses stored frame description

**Why This Approach:**
- ✅ Better UX (frames ready immediately)
- ✅ Batch generation (1 API call vs 9/30)
- ✅ Frames persist (can regenerate images without regenerating frames)
- ✅ Matches existing feed creation pattern

**Alternative: On-Demand Generation**
- ❌ Slower (9/30 API calls)
- ❌ Frames not stored (can't regenerate)
- ❌ Worse UX (user waits for each frame)

### 2.6 Repetition Prevention Strategy

**Approach: Pass Previous Frames to Maya**

**Implementation:**
```typescript
// When regenerating, fetch previous frames
const previousFrames = await sql`
  SELECT prompt
  FROM feed_posts
  WHERE feed_layout_id = ${feedId}
  AND generation_source = 'maya'
  ORDER BY position
`

// Pass to Maya as "avoid these" context
const frames = await generateBlueprintFrames({
  category,
  mood,
  frameCount: 30,
  previousFrames: previousFrames.map(p => p.prompt)
})
```

**System Prompt Addition:**
```
${previousFrames ? `
CRITICAL - AVOID REPETITION:
The user has already generated frames with these descriptions. You MUST create NEW, DIFFERENT frames:
${previousFrames.map((f, i) => `${i + 1}. ${f.substring(0, 100)}...`).join('\n')}

Requirements:
- Different outfits, poses, locations, angles
- Same aesthetic guidelines
- Same quality and detail level
- NO repetition of previous frames
` : ''}
```

**Key Finding:**
- ✅ Simple approach (pass previous frames as context)
- ✅ Maya can understand "avoid these" instructions
- ✅ No complex tracking needed

### 2.7 Integration Point

**File**: `/app/api/feed-planner/create-from-strategy/route.ts` (or new Blueprint-specific endpoint)

**Flow:**
```typescript
// 1. Create feed_layouts record
const [feedLayout] = await sql`
  INSERT INTO feed_layouts (...)
  RETURNING id
`

// 2. Check if Blueprint user
const access = await getFeedPlannerAccess(userId)
if (access.isFree || access.isPaidBlueprint) {
  // 3. Get category + mood from user_personal_brand
  const [personalBrand] = await sql`
    SELECT visual_aesthetic, settings_preference
    FROM user_personal_brand
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  
  // 4. Map to category + mood
  const category = extractCategory(personalBrand.visual_aesthetic)
  const mood = extractMood(personalBrand.settings_preference)
  
  // 5. Generate frames via Maya
  const frameCount = access.isFree ? 9 : 30
  const frames = await generateBlueprintFrames({
    category,
    mood,
    frameCount,
    feedId: feedLayout.id
  })
  
  // 6. Store frames in feed_posts
  for (const frame of frames) {
    await sql`
      INSERT INTO feed_posts (
        feed_layout_id,
        user_id,
        position,
        prompt,
        post_type,
        generation_status,
        blueprint_category,
        blueprint_mood,
        generation_source
      )
      VALUES (...)
    `
  }
}
```

---

## 3. ANSWERS TO QUESTIONS

### Q1: Current Maya Architecture

**Answer:**
- **Endpoint**: `/app/api/maya/chat/route.ts` (main chat)
- **Model**: Claude Sonnet 4 via AI SDK `streamText()`
- **System Prompt**: Built dynamically from multiple sources
- **Best Place**: Create new dedicated endpoint `/api/maya/generate-blueprint-frames` (follows pattern of `/api/maya/generate-feed-prompt`)

### Q2: Tool Calling

**Answer:**
- ❌ **Maya does NOT use tool calling**
- ✅ **Maya uses text triggers** (e.g., `[CREATE_FEED_STRATEGY]`, `[GENERATE_CONCEPTS]`)
- ✅ **Recommended**: Use trigger `[GENERATE_BLUEPRINT_FRAMES]` followed by JSON
- ✅ **No new tool needed** - just text trigger pattern

### Q3: Batch vs Individual

**Answer:**
- ✅ **Recommended: Batch generation** (all frames at once)
- **Why**: 
  - More efficient (1 API call vs 9/30)
  - Better UX (frames ready immediately)
  - Easier to ensure variety (Maya sees all frames at once)
  - Matches existing feed creation pattern

### Q4: Storage

**Answer:**
- ✅ **Recommended: Store in `feed_posts.prompt` field**
- **Why**:
  - No schema changes needed (field already exists)
  - Natural relationship (frames are posts)
  - Easy to query and update
  - Matches existing pattern

**Optional Fields to Add:**
- `blueprint_category` (VARCHAR) - for tracking
- `blueprint_mood` (VARCHAR) - for tracking
- `generation_source` (VARCHAR) - 'maya' | 'template' | 'manual'

### Q5: Timing

**Answer:**
- ✅ **Recommended: At feed creation**
- **Why**:
  - Better UX (frames ready immediately)
  - Batch generation (1 API call)
  - Frames persist (can regenerate images)
  - Matches existing feed creation pattern

### Q6: Repetition Prevention

**Answer:**
- ✅ **Recommended: Pass previous frames to Maya as "avoid these" context**
- **Implementation**: Fetch previous `feed_posts.prompt` values, pass to Maya in system prompt
- **Why**: Simple, effective, Maya understands context well

### Q7: Error Recovery

**Answer:**
- ✅ **Retry Logic**: Retry failed Maya calls (max 2 retries)
- ✅ **Fallback**: If Maya fails after retries, use static templates from `blueprint-photoshoot-templates.ts`
- ✅ **Partial Success**: If 5/9 frames generated, store those, log error, allow user to regenerate missing frames

### Q8: Conflicts

**Answer:**
- ✅ **No conflicts identified**
- ✅ Blueprint generation already uses Pro Mode (forced)
- ✅ Maya integration is isolated (new endpoint)
- ✅ Existing flows unaffected

---

## 4. IMPLEMENTATION PLAN

### 4.1 Create Aesthetic Guidelines Library

**File**: `lib/maya/blueprint-aesthetic-guides.ts`

**Tasks:**
- [ ] Define `BlueprintAestheticGuide` interface
- [ ] Create `BLUEPRINT_AESTHETIC_GUIDES` object (18 guides)
- [ ] Export `getAestheticGuide(category, mood)` function
- [ ] Handle mood name mapping (UI → template names)

### 4.2 Create Maya Generation Endpoint

**File**: `/app/api/maya/generate-blueprint-frames/route.ts`

**Tasks:**
- [ ] Authentication and user validation
- [ ] Access control check (Blueprint user)
- [ ] Credit validation (before generation)
- [ ] Fetch aesthetic guide
- [ ] Build Maya system prompt with aesthetic context
- [ ] Call Maya (Claude Sonnet 4)
- [ ] Parse structured response (`[GENERATE_BLUEPRINT_FRAMES]` trigger)
- [ ] Validate frame count and structure
- [ ] Return frames array

### 4.3 Create Frame Generation Function

**File**: `lib/maya/blueprint-frame-generator.ts` (helper)

**Tasks:**
- [ ] Function: `generateBlueprintFrames(params)`
- [ ] Fetch aesthetic guide
- [ ] Build system prompt
- [ ] Call Maya endpoint
- [ ] Parse and validate response
- [ ] Handle errors and retries
- [ ] Return structured frames

### 4.4 Integrate with Feed Creation

**File**: `/app/api/feed-planner/create-from-strategy/route.ts` (or new Blueprint endpoint)

**Tasks:**
- [ ] Detect Blueprint user (FREE or PAID)
- [ ] Extract category + mood from `user_personal_brand`
- [ ] Call `generateBlueprintFrames()`
- [ ] Store frames in `feed_posts` table
- [ ] Set `generation_source = 'maya'`
- [ ] Handle errors (fallback to templates)

### 4.5 Update Generate-Single Route

**File**: `/app/api/feed/[feedId]/generate-single/route.ts`

**Tasks:**
- [ ] Check `generation_source` field
- [ ] If `'maya'`: Use stored frame description from `feed_posts.prompt`
- [ ] If `'template'`: Use existing template logic
- [ ] Pass frame description to NanoBanana Pro

### 4.6 Add Regeneration Logic

**File**: `/app/api/feed/[feedId]/regenerate-post/route.ts`

**Tasks:**
- [ ] Fetch previous frames for this feed
- [ ] Call `generateBlueprintFrames()` with `previousFrames` parameter
- [ ] Update `feed_posts.prompt` with new frame
- [ ] Regenerate image with new prompt

### 4.7 Database Migration (Optional)

**File**: `scripts/migrations/add-blueprint-tracking-fields.sql`

**Tasks:**
- [ ] Add `blueprint_category` (VARCHAR)
- [ ] Add `blueprint_mood` (VARCHAR)
- [ ] Add `generation_source` (VARCHAR) - default 'template'
- [ ] Add indexes for faster lookups

---

## 5. SYSTEM PROMPT STRUCTURE

### 5.1 Base Structure

```typescript
const systemPrompt = `
${getMayaSystemPrompt(MAYA_PRO_CONFIG)} // Pro Mode config

${getUserContextForMaya(userId)} // Brand profile

## BLUEPRINT PHOTOSHOOT FRAME GENERATION

You are generating ${frameCount} unique photoshoot frame descriptions for a Blueprint photoshoot.

AESTHETIC GUIDELINES:
${aestheticGuide.vibe}
${aestheticGuide.setting}
${aestheticGuide.outfits}
${aestheticGuide.shotMix}
${aestheticGuide.colorGrade}
${aestheticGuide.textElement}

REQUIREMENTS:
- Generate ${frameCount} unique frames (no repetition)
- Each frame must be a complete NanoBanana Pro prompt (150-250 words)
- Follow aesthetic guidelines strictly
- Ensure variety in shot types, poses, locations, outfits
- ${previousFrames ? `AVOID these previous frames: ${previousFrames.map(f => f.substring(0, 100)).join('; ')}` : ''}

OUTPUT FORMAT:
[GENERATE_BLUEPRINT_FRAMES]
\`\`\`json
{
  "frames": [
    {
      "position": 1,
      "shotType": "full-body",
      "description": "Full NanoBanana prompt...",
      "outfit": "black blazer"
    }
  ]
}
\`\`\`
`
```

### 5.2 Aesthetic Context Format

Each aesthetic guide provides:
- **Vibe**: Overall mood (e.g., "Dark luxury editorial, all black, moody lighting")
- **Setting**: Location types (e.g., "Urban concrete, modern offices, city streets")
- **Outfits**: Wardrobe palette (e.g., "Black blazers, leather pants, gold jewelry")
- **Shot Mix**: Frame distribution (e.g., "3 full-body, 2 close-up, 2 flatlay, 2 detail")
- **Color Grade**: Post-processing (e.g., "Deep blacks, warm skin, dramatic shadows")
- **Text Element**: Graphic description (e.g., "Sign reading 'ICONIC' on concrete")

---

## 6. ERROR HANDLING & FALLBACKS

### 6.1 Maya API Failure

**Strategy:**
1. **Retry**: Max 2 retries with exponential backoff
2. **Fallback**: Use static templates from `blueprint-photoshoot-templates.ts`
3. **Log**: Log error for monitoring
4. **User Communication**: "Maya generation failed, using template prompts"

### 6.2 Invalid Response Format

**Strategy:**
1. **Validation**: Check JSON structure, frame count, required fields
2. **Retry**: If invalid, retry once
3. **Fallback**: Use templates if retry fails
4. **Log**: Log invalid response for debugging

### 6.3 Partial Success

**Strategy:**
1. **Store Valid Frames**: Save successfully generated frames
2. **Log Missing**: Log which frames failed
3. **Allow Regeneration**: User can regenerate missing frames individually
4. **Fallback**: Use templates for missing frames

### 6.4 Insufficient Credits

**Strategy:**
1. **Check Before Generation**: Validate credits before calling Maya
2. **Error Response**: Return clear error message
3. **No Partial Generation**: Don't generate frames if credits insufficient

---

## 7. TESTING CHECKLIST

### Pre-Implementation
- [x] Audit complete
- [x] Architecture proposed
- [x] No conflicts identified

### Implementation
- [ ] Create aesthetic guides library
- [ ] Create Maya generation endpoint
- [ ] Create frame generation helper
- [ ] Integrate with feed creation
- [ ] Update generate-single route
- [ ] Add regeneration logic
- [ ] Create database migration (optional)

### Post-Implementation Testing
- [ ] Maya generates 9 frames for FREE Blueprint users
- [ ] Maya generates 30 frames for PAID Blueprint users
- [ ] Frames follow aesthetic guidelines correctly
- [ ] Each frame is unique (no repetition within batch)
- [ ] Regeneration produces NEW frames (no repeats)
- [ ] Brand profile personalization works
- [ ] Pro Mode forced, 2 credits per image
- [ ] Frame descriptions work with NanoBanana Pro API
- [ ] Images generate successfully from Maya frames
- [ ] Existing Maya chat functionality unaffected
- [ ] Non-blueprint users unaffected
- [ ] Error handling works (retry, fallback)
- [ ] Partial success handled gracefully

---

## 8. RISKS & MITIGATION

**Risk 1: Maya API costs**
- **Mitigation**: Batch generation (1 call vs 9/30), cache frames, fallback to templates

**Risk 2: Response format inconsistencies**
- **Mitigation**: Robust parsing, validation, retry logic, fallback to templates

**Risk 3: Frame quality variations**
- **Mitigation**: Detailed aesthetic guidelines, validation, user feedback loop

**Risk 4: Performance (30 frames generation time)**
- **Mitigation**: Async generation, show progress, allow partial results

**Risk 5: Repetition despite prevention**
- **Mitigation**: Strong "avoid these" context, validation, user can regenerate

---

## 9. ESTIMATED COMPLEXITY

**Implementation Time**: 4-6 hours

**Files to Create/Modify:**
- New: `lib/maya/blueprint-aesthetic-guides.ts` (2 hours)
- New: `/app/api/maya/generate-blueprint-frames/route.ts` (1.5 hours)
- New: `lib/maya/blueprint-frame-generator.ts` (0.5 hours)
- Modify: Feed creation endpoint (1 hour)
- Modify: `generate-single` route (0.5 hours)
- Modify: `regenerate-post` route (0.5 hours)
- Optional: Database migration (0.5 hours)

**Total**: ~6 hours

---

## 10. NEXT STEPS

1. **Review this audit** with team
2. **Approve architecture** (new endpoint + batch generation)
3. **Provide aesthetic guide data** (18 guides)
4. **Implement aesthetic guides library**
5. **Implement Maya generation endpoint**
6. **Integrate with feed creation**
7. **Test with real users** (FREE and PAID)
8. **Monitor for issues** and iterate

---

**Document Status:** ✅ Complete - Ready for Implementation
**Last Updated:** 2025-01-XX
**Author:** AI Engineering Team
