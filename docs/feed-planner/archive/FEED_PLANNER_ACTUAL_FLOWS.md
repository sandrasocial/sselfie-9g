# FEED PLANNER ACTUAL USER FLOWS

**Based on:** Actual code implementation analysis  
**Date:** January 2025

---

## FREE USER FLOW

### 1. Onboarding
```
User signs up
  ↓
Unified Onboarding Wizard (8 steps)
  - Step 1: Business Type
  - Step 2: Audience Builder
  - Step 3: Story
  - Step 4: Visual Style (selects aesthetic + feed style)
  - Step 5: Selfie Upload
  - Step 6: Optional Details
  - Step 7: Brand Pillars (optional)
  ↓
Data saved to user_personal_brand table
  ↓
Redirected to feed planner
```

### 2. Preview Feed Creation
```
User lands on feed planner
  ↓
No feed exists → Auto-creates preview feed
  OR
User clicks "Create Preview Feed" button
  ↓
POST /api/feed/create-free-example
  ↓
Creates feed_layouts:
  - layout_type: 'preview'
  - status: 'saved'
  - brand_name: "Preview Feed - {date}"
  ↓
Creates feed_posts[0]:
  - position: 1
  - generation_status: 'pending'
  - generation_mode: 'pro'
  - prompt: Template prompt (from user_personal_brand or blueprint_subscribers)
  ↓
Returns feed with 1 post
```

### 3. Preview Image Generation
```
User clicks "Generate" on preview post
  ↓
POST /api/feed/[feedId]/generate-single
  Body: { postId: number }
  ↓
Access Control Check:
  - isFree: true
  - canGenerateImages: false (but has credits)
  - Allows generation if creditBalance > 0
  ↓
Credit Check:
  - Required: 2 credits (Pro Mode, 2K)
  - Deducts before generation
  ↓
Template Extraction:
  - Reads feed_posts[0].prompt (template)
  - OR finds preview feed with layout_type = 'preview'
  - Extracts aesthetic: extractAestheticFromTemplate()
  ↓
Maya Integration:
  - POST /api/maya/generate-feed-prompt
  - Mode: proMode: true
  - Locked aesthetic: passed
  ↓
Maya generates creative variation only
  ↓
Assemble three-part prompt:
  1. Base identity (fixed)
  2. Maya variation + aesthetic context
  3. Assembly + quality modifiers
  ↓
Generate with NanoBanana Pro:
  - Model: google/nano-banana-pro
  - Resolution: 2K
  - Aspect ratio: 9:16
  - Credits: 2
  ↓
Store result:
  - feed_posts.image_url = generated URL
  - feed_posts.generation_status = 'completed'
  - feed_posts.prediction_id = prediction ID
  ↓
User sees generated image
  ↓
Upsell modal shown (after 10 seconds, if credits used >= 2)
```

### 4. Upgrade Flow
```
User clicks "Upgrade" in upsell modal
  ↓
Opens BuyBlueprintModal
  ↓
Stripe checkout
  ↓
Webhook: /api/webhooks/stripe
  ↓
Creates/updates blueprint_subscribers
  ↓
Client-side expansion:
  - Detects paid user
  - Calls POST /api/feed/expand-for-paid
  - Creates positions 2-12
  ↓
User now has full feed (12 posts)
```

---

## PAID BLUEPRINT USER FLOW

### 1. Welcome Wizard (First Time)
```
Paid user lands on feed planner
  ↓
Checks user_personal_brand.feed_planner_welcome_shown
  ↓
If false → Shows WelcomeWizard
  ↓
WelcomeWizard checks for preview feed:
  - GET /api/feed-planner/preview-feed
  - Looks for feed with layout_type = 'preview'
  ↓
If preview feed exists:
  - Shows preview image
  - Options: "Use preview style" or "Choose new style"
  ↓
If "Use preview style":
  - Creates feed with existing template data
  ↓
If "Choose new style":
  - Opens UnifiedOnboardingWizard at step 4 (visual style)
  ↓
Completes wizard
  ↓
Sets feed_planner_welcome_shown = true
```

### 2. Feed Creation
```
User clicks "Create New Feed" button
  ↓
POST /api/feed/create-manual
  Body: { title?: string }
  ↓
Creates feed_layouts:
  - layout_type: 'grid_3x4'
  - status: 'saved'
  - brand_name: title or "My Feed - {date}"
  ↓
Creates 9 empty posts (positions 1-9):
  - post_type: 'user'
  - generation_status: 'pending'
  - All fields NULL
  ↓
Returns feed with 9 posts
```

### 3. Image Generation (Paid)
```
User clicks "Generate" on any post
  ↓
POST /api/feed/[feedId]/generate-single
  Body: { postId: number }
  ↓
Access Control Check:
  - isPaidBlueprint: true
  - canGenerateImages: true
  ↓
Credit Check:
  - Required: 2 credits (Pro Mode, 2K)
  - Deducts before generation
  ↓
Template Selection:
  - If preview feed exists and matches current style:
    - Extract locked aesthetic from preview template
  - Else:
    - Use template from unified wizard
    - OR generate dynamically with Maya
  ↓
Maya Integration:
  - POST /api/maya/generate-feed-prompt
  - Mode: proMode: true
  - Locked aesthetic: passed (if available)
  ↓
Maya generates creative variation
  ↓
Assemble three-part prompt
  ↓
Generate with NanoBanana Pro (2K, 2 credits)
  ↓
Store result in feed_posts
  ↓
User sees generated image
```

### 4. Feed Expansion (If Needed)
```
User has preview feed (1 post)
  ↓
Upgrades to paid
  ↓
Client-side detects:
  - access.isPaidBlueprint: true
  - feed.posts.length === 1
  ↓
Auto-calls POST /api/feed/expand-for-paid
  Body: { feedId: number }
  ↓
Creates positions 2-12
  ↓
User now has 12 posts
```

---

## MEMBERSHIP USER FLOW

### Similar to Paid Blueprint, but:
- **Unlimited feeds:** `maxFeedPlanners: null`
- **200 credits/month:** `SUBSCRIPTION_CREDITS.sselfie_studio_membership`
- **All features:** Gallery access, generation, captions, strategy, bio, highlights

---

## MULTI-FEED FLOW

### Creating Additional Feeds
```
User has existing feed(s)
  ↓
Clicks "Create New Feed" in header
  ↓
POST /api/feed/create-manual
  ↓
Creates new feed_layouts entry
  ↓
Creates 9 empty posts
  ↓
User can switch between feeds
  (UI implementation needs verification)
```

### Feed Switching
```
User has multiple feeds
  ↓
Feed list fetched: GET /api/feed/list
  ↓
Shows all feeds (excludes preview for paid users)
  ↓
User selects feed
  ↓
Navigates to /feed-planner?feedId={feedId}
  ↓
Feed data loaded: GET /api/feed/[feedId]
  ↓
Grid displays selected feed
```

---

## CREDIT USAGE FLOW

### Free User Credits
```
User signs up
  ↓
Gets 2 welcome credits
  ↓
Generates preview image
  ↓
Credits deducted: 2 credits
  ↓
Balance: 0 credits
  ↓
Cannot generate more (needs upgrade)
```

### Paid User Credits
```
User has subscription
  ↓
Credits granted monthly (if membership)
  OR
Purchases credit package (if one-time)
  ↓
Generates images
  ↓
Credits deducted per generation:
  - Pro Mode: 2 credits (2K)
  - Classic Mode: 1 credit
  ↓
Balance decreases
  ↓
Can purchase more if needed
```

---

## TEMPLATE SELECTION FLOW

### Preview Feed Creation
```
User creates preview feed
  ↓
System checks data sources (in order):
  1. user_personal_brand:
     - settings_preference[0] → mood
     - visual_aesthetic[0] → category
  2. blueprint_subscribers (fallback):
     - form_data.vibe → category
     - feed_style → mood
  ↓
Template key: `${category}_${mood}`
  ↓
Loads from: lib/maya/blueprint-photoshoot-templates.ts
  ↓
Validates template: validateBlueprintTemplate()
  ↓
Stores in: feed_posts[0].prompt
```

### Image Generation
```
User generates image
  ↓
System checks for template:
  1. Current post prompt (feed_posts[position].prompt)
  2. Preview feed template (if exists)
  3. Unified wizard template
  ↓
Extracts aesthetic: extractAestheticFromTemplate()
  ↓
Returns LockedAesthetic:
  - vibe, colorGrade, setting, outfit, lightingQuality
  - assembly, baseIdentityPrompt, qualityModifiers
  ↓
Passes to Maya for variation generation
  ↓
Assembles three-part prompt
```

---

## MAYA INTEGRATION FLOW

### Locked Aesthetic Mode
```
User has preview feed with template
  ↓
Generates position 2-9
  ↓
Extract locked aesthetic from template
  ↓
POST /api/maya/generate-feed-prompt
  Body: {
    lockedAesthetic: {
      vibe, colorGrade, setting, outfit, lightingQuality,
      assembly, baseIdentityPrompt, qualityModifiers
    },
    position: number,
    postType: string,
    proMode: true
  }
  ↓
Maya generates ONLY creative variation:
  - Pose, angle, composition, framing
  - NO subject description
  - NO quality keywords
  - NO assembly modifiers
  ↓
System assembles three-part prompt:
  1. baseIdentityPrompt (fixed)
  2. variation + aesthetic context
  3. assembly + qualityModifiers
  ↓
Validates structure (logging)
  ↓
Returns complete prompt
```

---

## ERROR HANDLING FLOWS

### Generation Failure
```
Generation starts
  ↓
Credits deducted
  ↓
Replicate API call
  ↓
Generation fails
  ↓
Error stored: feed_posts.error
  ↓
Status: feed_posts.generation_status = 'failed'
  ↓
User sees error message
  ↓
Can retry (credits already deducted)
  (Refund logic needs verification)
```

### Insufficient Credits
```
User clicks "Generate"
  ↓
Credit check fails
  ↓
Returns 402 Payment Required
  ↓
Error message: "Insufficient credits"
  ↓
Shows credit purchase option
  (Purchase flow needs verification)
```

### Rate Limit
```
User generates multiple images
  ↓
Rate limit check: checkGenerationRateLimit()
  ↓
Limit exceeded
  ↓
Returns 429 Too Many Requests
  ↓
Error message with reset time
  ↓
User must wait
```

---

## DATA PERSISTENCE FLOW

### Wizard Data
```
User completes unified onboarding
  ↓
POST /api/onboarding/unified-onboarding-complete
  ↓
Saves to user_personal_brand:
  - settings_preference: [feedStyle]
  - visual_aesthetic: [aesthetic1, aesthetic2, ...]
  - Other brand fields
  ↓
Data persists in database
  ↓
Used for template selection
```

### Feed Data
```
User creates feed
  ↓
feed_layouts entry created
  ↓
feed_posts entries created
  ↓
User generates images
  ↓
feed_posts.image_url updated
  ↓
feed_posts.generation_status updated
  ↓
All data persists in database
  ↓
Survives page refresh
```

---

## ACTUAL IMPLEMENTATION NOTES

### What Works
- ✅ Preview feed creation (free users)
- ✅ Full feed creation (paid users)
- ✅ Template-based generation
- ✅ Locked aesthetic enforcement
- ✅ Three-part prompt structure
- ✅ Credit deduction
- ✅ Access control

### What Needs Verification
- ⚠️ Feed switcher UI
- ⚠️ Feed renaming UI
- ⚠️ Feed color selection UI
- ⚠️ Credit purchase flow
- ⚠️ Feed deletion
- ⚠️ Credit refunds

### Known Limitations
- Preview feeds remain as `layout_type: 'preview'` after expansion
- Template prompt not copied to new positions during expansion
- Feed limits: Paid blueprint = 3, Membership = unlimited
