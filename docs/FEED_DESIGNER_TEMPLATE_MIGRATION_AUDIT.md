# Feed Designer Template Migration Audit & Implementation Plan

## 🎯 Objective

Switch **PAID BLUEPRINT** users from Maya AI prompt generation to **template-based prompts** (same as FREE users) for Feed Designer preview grids.

**Rationale**:
- Preview grids are "what's possible" demonstrations, not final content
- Templates guarantee quality consistency and aesthetic coherence
- Reduces Maya API costs significantly
- Faster generation (no AI API calls)
- Maya AI can still be used for individual post generation after purchase

---

## 📊 Current State Audit

### **FREE Users** (✅ Already Using Templates)
**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 284-319)

**Current Flow**:
1. Check if `access.isFree === true`
2. Query `blueprint_subscribers` table for `form_data` and `feed_style`
3. Extract `category` from `form_data.vibe` (luxury, minimal, beige, warm, edgy, professional)
4. Extract `mood` from `feed_style` (luxury, minimal, beige)
5. Call `getBlueprintPhotoshootPrompt(category, mood)` from `lib/maya/blueprint-photoshoot-templates.ts`
6. Use template prompt directly

**Template Source**: `lib/maya/blueprint-photoshoot-templates.ts`
- **Function**: `getBlueprintPhotoshootPrompt(category, mood)`
- **Templates**: 18 pre-built prompts (6 categories × 3 moods)
- **Format**: Pro Mode prompts (50-80 words, natural language, no trigger words)

---

### **PAID BLUEPRINT Users** (❌ Currently Using Maya AI)
**Location**: `app/api/feed/[feedId]/generate-single/route.ts` (Line 320-358)

**Current Flow**:
1. Check if `access.isPaidBlueprint === true` (and not free)
2. Import `buildNanoBananaPrompt` from `lib/maya/nano-banana-prompt-builder.ts`
3. Call Maya AI to generate prompt dynamically
4. Pass: `userId`, `mode`, `userRequest`, `inputImages`, `brandKit`
5. Get `optimizedPrompt` from Maya AI response
6. Save prompt to database

**Maya AI Call**: `lib/maya/nano-banana-prompt-builder.ts`
- **Function**: `buildNanoBananaPrompt()`
- **Cost**: AI API call (Anthropic Claude)
- **Time**: ~2-5 seconds per prompt
- **Variability**: Different prompts each time

---

## 🔍 Data Source Analysis

### **FREE Users Data Source**:
- **Table**: `blueprint_subscribers`
- **Fields**: `form_data.vibe` (category), `feed_style` (mood)
- **Source**: Blueprint wizard (old system)

### **PAID BLUEPRINT Users Data Source** (Need to Verify):
**Option 1**: `blueprint_subscribers` table (same as FREE)
- ✅ If exists: Use same logic as FREE users
- ⚠️ If missing: Need fallback

**Option 2**: `user_personal_brand` table (from unified wizard)
- **Fields**: `settings_preference` (JSONB array, first element = feedStyle)
- **Fields**: `visual_aesthetic` (JSONB array, could map to category)
- **Source**: Unified onboarding wizard

**Recommendation**: Check both sources, prioritize `blueprint_subscribers`, fallback to `user_personal_brand`

---

## 🔄 Files Requiring Changes

### **Primary Changes**:

1. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - **Line 320-358**: Replace Maya AI call with template lookup
   - **Change**: Use same logic as FREE users, with fallback to `user_personal_brand`

2. **`app/api/feed/[feedId]/regenerate-post/route.ts`**
   - **Line 104-133**: Replace Maya AI call with template lookup
   - **Change**: Use templates for regeneration too

### **Files NOT Modified**:

- ✅ `lib/maya/blueprint-photoshoot-templates.ts` - Templates already exist
- ✅ `lib/feed-planner/access-control.ts` - Access control already works
- ✅ `lib/maya/nano-banana-prompt-builder.ts` - Keep for other use cases

---

## 📋 Implementation Plan

### **Phase 1: Code Changes** (Primary)

#### **Step 1.1: Update `generate-single` Route**

**File**: `app/api/feed/[feedId]/generate-single/route.ts`

**Current Code** (Line 320-358):
```typescript
} else {
  // Paid blueprint users: Use Maya prompt builder (same as membership Pro Mode)
  console.log(`[v0] [GENERATE-SINGLE] Paid blueprint user - using Maya prompt builder (Nano Banana)...`)
  const { buildNanoBananaPrompt } = await import("@/lib/maya/nano-banana-prompt-builder")
  
  const promptResult = await buildNanoBananaPrompt({
    userId: user.id.toString(),
    mode: (proModeType as any) || 'brand-scene',
    userRequest: post.content_pillar || post.caption || `Feed post ${post.position} - authentic Instagram-style content`,
    inputImages: {
      baseImages: baseImages,
      productImages: [],
      textElements: post.post_type === 'quote' ? [{
        text: post.caption || '',
        style: 'quote' as const,
      }] : undefined,
    },
    workflowMeta: {
      platformFormat: '4:5', // Instagram portrait format
    },
    brandKit: brandKit ? {
      primaryColor: brandKit.primary_color,
      secondaryColor: brandKit.secondary_color,
      accentColor: brandKit.accent_color,
      fontStyle: brandKit.font_style,
      brandTone: brandKit.brand_tone,
    } : undefined,
  })
  
  finalPrompt = promptResult.optimizedPrompt
  console.log(`[v0] [GENERATE-SINGLE] ✅ Generated Maya prompt for paid blueprint (${finalPrompt.split(/\s+/).length} words)`)
  
  // Save the generated prompt to the database for future use
  await sql`
    UPDATE feed_posts
    SET prompt = ${finalPrompt}
    WHERE id = ${postId}
  `
}
```

**New Code** (Replace with template logic):
```typescript
} else {
  // Paid blueprint users: Use blueprint templates (same as free users)
  console.log(`[v0] [GENERATE-SINGLE] Paid blueprint user - using blueprint template library...`)
  
  // Try blueprint_subscribers first (same as free users)
  let blueprintSubscriber = await sql`
    SELECT form_data, feed_style
    FROM blueprint_subscribers
    WHERE user_id = ${user.id}
    LIMIT 1
  ` as any[]
  
  let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
  let mood: "luxury" | "minimal" | "beige" = "minimal"
  
  if (blueprintSubscriber.length > 0) {
    // Use blueprint_subscribers data (same as free users)
    const formData = blueprintSubscriber[0].form_data || {}
    const feedStyle = blueprintSubscriber[0].feed_style || null
    
    category = (formData.vibe || "professional") as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
    mood = (feedStyle || "minimal") as "luxury" | "minimal" | "beige"
    
    console.log(`[v0] [GENERATE-SINGLE] ✅ Found blueprint_subscribers data: ${category}_${mood}`)
  } else {
    // Fallback: Try user_personal_brand (from unified wizard)
    console.log(`[v0] [GENERATE-SINGLE] ⚠️ No blueprint_subscribers data, checking user_personal_brand...`)
    
    const [personalBrand] = await sql`
      SELECT settings_preference, visual_aesthetic
      FROM user_personal_brand
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    ` as any[]
    
    if (personalBrand) {
      // Extract feedStyle from settings_preference (first element of JSONB array)
      let feedStyle: string | null = null
      if (personalBrand.settings_preference) {
        try {
          const settings = typeof personalBrand.settings_preference === 'string'
            ? JSON.parse(personalBrand.settings_preference)
            : personalBrand.settings_preference
          
          if (Array.isArray(settings) && settings.length > 0) {
            feedStyle = settings[0] // First element is feedStyle
          }
        } catch (e) {
          console.warn(`[v0] [GENERATE-SINGLE] Failed to parse settings_preference:`, e)
        }
      }
      
      // Map feedStyle to mood (same mapping as blueprint_subscribers)
      if (feedStyle) {
        const feedStyleLower = feedStyle.toLowerCase()
        if (feedStyleLower.includes('luxury') || feedStyleLower.includes('dark') || feedStyleLower.includes('moody')) {
          mood = "luxury"
        } else if (feedStyleLower.includes('minimal') || feedStyleLower.includes('light')) {
          mood = "minimal"
        } else if (feedStyleLower.includes('beige')) {
          mood = "beige"
        }
      }
      
      // Extract category from visual_aesthetic (map to category)
      if (personalBrand.visual_aesthetic) {
        try {
          const aesthetics = typeof personalBrand.visual_aesthetic === 'string'
            ? JSON.parse(personalBrand.visual_aesthetic)
            : personalBrand.visual_aesthetic
          
          if (Array.isArray(aesthetics) && aesthetics.length > 0) {
            const aestheticStr = aesthetics.join(' ').toLowerCase()
            
            // Map aesthetic keywords to category
            if (aestheticStr.includes('luxury') || aestheticStr.includes('elegant') || aestheticStr.includes('sophisticated')) {
              category = "luxury"
            } else if (aestheticStr.includes('minimal') || aestheticStr.includes('clean') || aestheticStr.includes('simple')) {
              category = "minimal"
            } else if (aestheticStr.includes('beige') || aestheticStr.includes('neutral') || aestheticStr.includes('warm')) {
              category = "beige"
            } else if (aestheticStr.includes('warm') || aestheticStr.includes('cozy')) {
              category = "warm"
            } else if (aestheticStr.includes('edgy') || aestheticStr.includes('bold') || aestheticStr.includes('urban')) {
              category = "edgy"
            }
            // Default: "professional" (already set)
          }
        } catch (e) {
          console.warn(`[v0] [GENERATE-SINGLE] Failed to parse visual_aesthetic:`, e)
        }
      }
      
      console.log(`[v0] [GENERATE-SINGLE] ✅ Found user_personal_brand data: ${category}_${mood}`)
    } else {
      console.log(`[v0] [GENERATE-SINGLE] ⚠️ No user_personal_brand data found. Using defaults: professional_minimal`)
    }
  }
  
  // Get template prompt from grid library
  const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
  finalPrompt = getBlueprintPhotoshootPrompt(category, mood)
  console.log(`[v0] [GENERATE-SINGLE] ✅ Using blueprint template prompt: ${category}_${mood} (${finalPrompt.split(/\s+/).length} words)`)
  
  // Save the template prompt to the database for future use
  await sql`
    UPDATE feed_posts
    SET prompt = ${finalPrompt}
    WHERE id = ${postId}
  `
}
```

**Changes**:
- ✅ Remove `buildNanoBananaPrompt` import and call
- ✅ Add `blueprint_subscribers` query (same as FREE users)
- ✅ Add fallback to `user_personal_brand` (for unified wizard users)
- ✅ Map `settings_preference` → mood
- ✅ Map `visual_aesthetic` → category
- ✅ Use `getBlueprintPhotoshootPrompt()` instead of Maya AI
- ✅ Add fallback to defaults if both sources missing
- ✅ Keep prompt saving logic (same as before)

---

#### **Step 1.2: Update `regenerate-post` Route**

**File**: `app/api/feed/[feedId]/regenerate-post/route.ts`

**Current Code** (Line 104-133):
```typescript
if (!finalPrompt || finalPrompt.trim().length < 20) {
  // Regenerate prompt using buildNanoBananaPrompt if missing
  console.warn(`[v0] [REGENERATE-POST] ⚠️ Pro Mode post ${postId} missing prompt, regenerating...`)
  const { buildNanoBananaPrompt } = await import("@/lib/maya/nano-banana-prompt-builder")
  // ... Maya AI call ...
  finalPrompt = optimizedPrompt
}
```

**New Code** (Replace with template logic):
```typescript
if (!finalPrompt || finalPrompt.trim().length < 20) {
  // Regenerate prompt using templates if missing
  console.warn(`[v0] [REGENERATE-POST] ⚠️ Pro Mode post ${postId} missing prompt, using template...`)
  
  // Check if user is free or paid blueprint (both use templates)
  const access = await getFeedPlannerAccess(neonUser.id.toString())
  
  if (access.isFree || access.isPaidBlueprint) {
    // Use blueprint templates (same logic as generate-single)
    let blueprintSubscriber = await sql`
      SELECT form_data, feed_style
      FROM blueprint_subscribers
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    ` as any[]
    
    let category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional" = "professional"
    let mood: "luxury" | "minimal" | "beige" = "minimal"
    
    if (blueprintSubscriber.length > 0) {
      const formData = blueprintSubscriber[0].form_data || {}
      const feedStyle = blueprintSubscriber[0].feed_style || null
      category = (formData.vibe || "professional") as any
      mood = (feedStyle || "minimal") as any
    } else {
      // Fallback: Try user_personal_brand
      const [personalBrand] = await sql`
        SELECT settings_preference, visual_aesthetic
        FROM user_personal_brand
        WHERE user_id = ${neonUser.id}
        ORDER BY created_at DESC
        LIMIT 1
      ` as any[]
      
      if (personalBrand) {
        // Extract feedStyle and category (same logic as generate-single)
        // ... (same mapping logic as above) ...
      }
    }
    
    const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
    finalPrompt = getBlueprintPhotoshootPrompt(category, mood)
    console.log(`[v0] [REGENERATE-POST] ✅ Using blueprint template prompt: ${category}_${mood}`)
  } else {
    // Membership users: Keep Maya AI (Classic Mode uses Maya, Pro Mode uses templates if needed)
    // This path should not be hit for Pro Mode regeneration, but keeping for safety
    console.warn(`[v0] [REGENERATE-POST] ⚠️ Membership user Pro Mode regeneration - using default template`)
    const { getBlueprintPhotoshootPrompt } = await import("@/lib/maya/blueprint-photoshoot-templates")
    finalPrompt = getBlueprintPhotoshootPrompt("professional", "minimal")
  }
}
```

**Changes**:
- ✅ Remove `buildNanoBananaPrompt` import and call
- ✅ Add access check to determine if templates should be used
- ✅ Use same template logic as `generate-single` (with fallbacks)
- ✅ Add fallback for missing data

---

### **Phase 2: Data Mapping Logic**

#### **Category Mapping** (from `visual_aesthetic` or `form_data.vibe`):

| Source Value | Mapped Category |
|--------------|----------------|
| "luxury", "elegant", "sophisticated" | `luxury` |
| "minimal", "clean", "simple" | `minimal` |
| "beige", "neutral", "warm" | `beige` |
| "warm", "cozy" | `warm` |
| "edgy", "bold", "urban" | `edgy` |
| Default / Other | `professional` |

#### **Mood Mapping** (from `feed_style` or `settings_preference[0]`):

| Source Value | Mapped Mood |
|--------------|-------------|
| "luxury", "dark", "moody" | `luxury` (→ `dark_moody`) |
| "minimal", "light" | `minimal` (→ `light_minimalistic`) |
| "beige" | `beige` (→ `beige_aesthetic`) |
| Default / Other | `minimal` (→ `light_minimalistic`) |

---

### **Phase 3: Testing Plan**

#### **Step 3.1: Test FREE Users** (Regression)
- ✅ Verify FREE users still use templates correctly
- ✅ Test with different category/mood combinations
- ✅ Test fallback when `blueprint_subscribers` missing

#### **Step 3.2: Test PAID BLUEPRINT Users** (New Behavior)
- ✅ Test with `blueprint_subscribers` data (old wizard users)
- ✅ Test with `user_personal_brand` data (unified wizard users)
- ✅ Test fallback when both sources missing
- ✅ Test with different category/mood combinations
- ✅ Verify prompts are saved to database
- ✅ Verify image generation still works with template prompts

#### **Step 3.3: Test Regeneration**
- ✅ Test regenerating posts for FREE users
- ✅ Test regenerating posts for PAID BLUEPRINT users
- ✅ Verify templates are used for regeneration

#### **Step 3.4: Test MEMBERSHIP Users** (No Change)
- ✅ Verify MEMBERSHIP users still use Maya AI (Classic Mode)
- ✅ Verify MEMBERSHIP users can still use Pro Mode with templates (if needed)

---

## 📝 Code Changes Summary

### **Files to Modify**:

1. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - **Lines 320-358**: Replace Maya AI with template lookup
   - **Lines Changed**: ~80 lines (includes fallback logic)
   - **Complexity**: Medium (needs data source fallback)

2. **`app/api/feed/[feedId]/regenerate-post/route.ts`**
   - **Lines 104-133**: Replace Maya AI with template lookup
   - **Lines Changed**: ~50 lines (includes fallback logic)
   - **Complexity**: Medium (needs data source fallback)

### **Files NOT Modified**:

- ✅ `lib/maya/blueprint-photoshoot-templates.ts` - Templates already exist
- ✅ `lib/feed-planner/access-control.ts` - Access control already works
- ✅ `lib/maya/nano-banana-prompt-builder.ts` - Keep for other use cases

---

## 🎯 Benefits

### **Cost Savings**:
- **Before**: ~2-5 seconds × AI API cost per prompt for PAID BLUEPRINT users
- **After**: Instant template lookup (no API cost)
- **Estimated Savings**: Significant reduction in Anthropic Claude API calls

### **Performance**:
- **Before**: 2-5 seconds per prompt generation
- **After**: <100ms template lookup
- **Speed Improvement**: ~20-50x faster

### **Quality Consistency**:
- **Before**: Variable prompts (AI-generated, different each time)
- **After**: Consistent, tested templates
- **Result**: Predictable quality and aesthetic coherence

### **User Experience**:
- **Before**: Slower generation, variable results
- **After**: Faster generation, consistent preview grids
- **Note**: Maya AI still available for individual post customization after purchase

---

## ⚠️ Edge Cases & Considerations

### **1. Missing `blueprint_subscribers` Data**
**Scenario**: PAID BLUEPRINT user doesn't have `blueprint_subscribers` record

**Solution**: 
- Fallback to `user_personal_brand` (unified wizard data)
- Extract `settings_preference[0]` for mood
- Extract `visual_aesthetic` for category
- Use defaults if both missing

### **2. Missing `user_personal_brand` Data**
**Scenario**: PAID BLUEPRINT user doesn't have either data source

**Solution**:
- Use defaults: `category: "professional"`, `mood: "minimal"`
- Log warning for monitoring
- Template exists for this combination

### **3. Invalid Category/Mood Values**
**Scenario**: Data has unexpected values

**Solution**:
- Validate against allowed values
- Map common variations (e.g., "dark" → "luxury" mood)
- Fallback to defaults if invalid
- Template function will throw error if combination doesn't exist (handled by try/catch)

### **4. Regeneration of Existing Posts**
**Scenario**: User regenerates a post that was created with Maya AI prompt

**Solution**:
- Check if prompt exists and is valid (>20 chars)
- If missing/invalid, use template (new behavior)
- Existing prompts remain unchanged (backward compatible)

### **5. Data Source Priority**
**Priority Order**:
1. `blueprint_subscribers` (old wizard) - highest priority
2. `user_personal_brand` (unified wizard) - fallback
3. Defaults (`professional`, `minimal`) - last resort

---

## 🔄 Migration Strategy

### **Option A: Immediate Switch** (Recommended)
- ✅ Change code immediately
- ✅ All new generations use templates
- ✅ Existing prompts remain unchanged
- ✅ No data migration needed
- ✅ Backward compatible

### **Option B: Gradual Rollout**
- ⚠️ Add feature flag
- ⚠️ Roll out to percentage of users
- ⚠️ Monitor for issues
- ⚠️ Full rollout after validation

**Recommendation**: **Option A** - Templates are already tested (FREE users), low risk, immediate benefits

---

## ✅ Implementation Checklist

### **Pre-Implementation**:
- [ ] Verify `blueprint_subscribers` data exists for some PAID BLUEPRINT users
- [ ] Verify `user_personal_brand` data exists for unified wizard users
- [ ] Review template library completeness (18 templates)
- [ ] Test template function with all category/mood combinations
- [ ] Test data mapping logic (visual_aesthetic → category, settings_preference → mood)

### **Implementation**:
- [ ] Update `app/api/feed/[feedId]/generate-single/route.ts` (Line 320-358)
- [ ] Update `app/api/feed/[feedId]/regenerate-post/route.ts` (Line 104-133)
- [ ] Add error handling for missing data
- [ ] Add logging for template selection and data source used
- [ ] Add fallback logic for both data sources

### **Testing**:
- [ ] Test FREE users (regression)
- [ ] Test PAID BLUEPRINT users with `blueprint_subscribers` data
- [ ] Test PAID BLUEPRINT users with `user_personal_brand` data only
- [ ] Test PAID BLUEPRINT users with no data (defaults)
- [ ] Test MEMBERSHIP users (no change)
- [ ] Test regeneration for all user types
- [ ] Test fallback scenarios (missing data, invalid values)

### **Post-Implementation**:
- [ ] Monitor error logs for template issues
- [ ] Verify API cost reduction
- [ ] Check generation speed improvement
- [ ] Gather user feedback on preview quality
- [ ] Monitor data source usage (blueprint_subscribers vs user_personal_brand)

---

## 📊 Success Metrics

### **Performance**:
- ✅ Prompt generation time: <100ms (from 2-5 seconds)
- ✅ API cost reduction: Measure before/after Anthropic Claude usage

### **Quality**:
- ✅ Preview grid consistency: All posts use same template style
- ✅ User satisfaction: Preview grids match expectations

### **Reliability**:
- ✅ Error rate: <1% (template lookup failures)
- ✅ Fallback success: 100% (defaults always work)
- ✅ Data source coverage: Track which source is used most

---

## 🔮 Future Considerations

### **Template Expansion**:
- Add more category/mood combinations if needed
- Add post-type specific templates (portrait, selfie, close-up)
- Add position-specific templates (different prompts for position 1 vs 9)

### **Hybrid Approach** (Future):
- Templates for preview grids (current plan) ✅
- Maya AI for individual post customization (after purchase) ✅
- Best of both worlds: consistency + customization

### **Data Migration** (Optional):
- If needed, migrate `user_personal_brand` data to `blueprint_subscribers` format
- Or create unified data access layer for both sources

---

*Last Updated: January 2026*
*Implementation Status: Pending Approval*
