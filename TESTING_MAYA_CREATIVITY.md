# Testing Maya's Creativity - Verification Guide

**Purpose:** Verify that Maya's creativity has been fully restored after cleanup  
**Branch:** `unlock-maya-creativity`  
**Last Updated:** December 2024

---

## Environment Setup

### Pre-Test Checklist

Before running tests, verify:

- [ ] All cleanup commits applied to branch
- [ ] No TypeScript compilation errors
- [ ] Application runs successfully in development environment
- [ ] Can access Maya chat interface
- [ ] Pro Mode is available and functional
- [ ] Concept generation endpoints are accessible
- [ ] Console logs visible for debugging

### Test Environment

- **Branch:** `unlock-maya-creativity`
- **Mode:** Pro Mode (luxury influencer focus)
- **Environment:** Development
- **Browser:** Chrome/Safari (latest)
- **Console:** Open for log verification

### Key Files to Monitor

Watch these files for generation logs:
- `app/api/maya/generate-concepts/route.ts` (Classic Mode)
- `app/api/maya/pro/generate-concepts/route.ts` (Pro Mode)
- Console logs: `[AI-GENERATION]` tags (should see these, NOT `[COMPOSITION]`)

---

## Test Suite

### Test 1: Basic Variety (Default Behavior)

**Goal:** Verify Maya creates diverse concepts naturally without forced constraints

**Test Steps:**
1. Open Maya in Pro Mode
2. Send request: `"create 6 luxury fashion concepts"`
3. Wait for generation to complete
4. Review all 6 generated concepts
5. Check console logs for generation method

**Expected Results:**

✅ **Concept Diversity:**
- 6 different outfits (different brands, styles, colors, silhouettes)
- 6 different locations (cafe, street, rooftop, interior, etc.)
- Variety in poses (standing, sitting, walking, leaning, etc.)
- Different angles and framing
- Variety in lighting (golden hour, soft diffused, natural window light, etc.)

✅ **Creative Quality:**
- Each concept feels unique and compelling
- Concepts are visually distinct from each other
- No boring or repetitive concepts
- Concepts feel fresh and creative

✅ **Console Logs:**
- Should see: `[AI-GENERATION] Generating 6 concepts using Maya's AI`
- Should see: `[AI-GENERATION] ✅ Generated 6 concepts using Maya's AI`
- Should **NOT** see: `[COMPOSITION]` tags
- Should **NOT** see: `CompositionBuilder.composePrompt()`
- Should **NOT** see: `DiversityEngine.isDiverseEnough()`

**Red Flags:**

❌ **Diversity Issues:**
- Same outfit repeated in multiple concepts
- Same location repeated in multiple concepts
- Repetitive poses (all "standing", all "sitting", all "walking")
- Generic descriptions that could apply to any concept

❌ **Generation Method:**
- Console shows `[COMPOSITION]` messages
- Console shows component-based assembly
- Concepts feel templated or assembled

**Success Criteria:**
- ✅ All 6 concepts are visually distinct
- ✅ Natural variety in all aspects (outfits, locations, poses)
- ✅ AI generation confirmed in logs
- ✅ Concepts feel creative and fresh

---

### Test 2: Consistency Mode (When Requested)

**Goal:** Verify consistency works via system prompt guidance, not post-processing

**Test Steps:**
1. Enable consistency mode in settings (`consistencyMode: 'consistent'`)
2. Send request: `"create 6 concepts for video editing - I want consistent outfit and location"`
3. Wait for generation
4. Review all 6 concepts
5. Verify outfit and location consistency

**Expected Results:**

✅ **Consistency:**
- **SAME** outfit across all 6 concepts (same brands, colors, style)
- **SAME** location/setting across all 6 concepts
- **SAME** lighting and mood across all 6 concepts
- **DIFFERENT** poses in each concept (standing, sitting, walking, leaning, etc.)
- **DIFFERENT** angles and camera framing
- **DIFFERENT** expressions and moments

✅ **Feels Like:**
- "One photoshoot, different shots"
- Professional editorial shoot
- Video editing ready (consistent character/setting)

✅ **Console Logs:**
- Should see consistency guidance in system prompt
- Should **NOT** see post-processing regeneration
- Should **NOT** see: `[COMPOSITION] Regenerating concepts 2-6`

**Red Flags:**

❌ **Inconsistency Issues:**
- Different outfits across concepts (should be same)
- Different locations across concepts (should be same)
- Different lighting/mood (should be consistent)

❌ **No Variety:**
- Same pose repeated (should vary poses)
- Same angle repeated (should vary angles)

**Success Criteria:**
- ✅ Outfit and location consistent across all 6
- ✅ Poses and angles vary naturally
- ✅ No post-processing in logs
- ✅ Feels like one cohesive photoshoot

---

### Test 3: Brand Understanding (Natural, Not Forced)

**Goal:** Verify Maya understands luxury brands without rigid templates

**Test Steps:**
1. Send request: `"Alo Yoga wellness lifestyle content"`
2. Review generated concepts
3. Check if brand aesthetic is present naturally
4. Verify NO forced brand mentions

**Expected Results:**

✅ **Brand Aesthetic (Natural):**
- Premium athleisure aesthetic
- Natural movement and authentic moments
- Soft, natural lighting
- Wellness lifestyle vibe (yoga studios, outdoor spaces, minimalist interiors)
- Neutral tones (beige, cream, white, earth tones, soft pastels)
- Aspirational yet accessible feel

✅ **Not Forced:**
- Brand aesthetic present but not explicitly forced
- NO "MANDATORY: You MUST include Alo Yoga" language in prompts
- Natural integration of brand vibes
- Concepts feel inspired, not templated

✅ **Variety:**
- Different Alo-style outfits
- Different wellness settings
- Natural diversity within brand aesthetic

**Red Flags:**

❌ **Forced/Templated:**
- Generic "MANDATORY Alo Yoga" mentions in every prompt
- All concepts look identical (templated)
- Missing the premium wellness aesthetic
- Generic gym/fitness vibe (not Alo's aspirational wellness)

**Success Criteria:**
- ✅ Brand aesthetic naturally integrated
- ✅ Premium wellness lifestyle vibe present
- ✅ NO forced brand mentions
- ✅ Concepts feel inspired, not templated

---

### Test 4: 2026 Trends Knowledge

**Goal:** Verify Maya understands current luxury influencer trends

**Test Steps:**
1. Send request: `"quiet luxury editorial"`
2. Review generated concepts
3. Verify understanding of quiet luxury trend

**Expected Results:

✅ **Quiet Luxury Aesthetic:**
- The Row aesthetic (expensive fabrics, minimal branding)
- Sophisticated, understated elegance
- Neutral color palette (black, cream, camel, navy, grey)
- Monochromatic or minimal color schemes
- Architectural spaces or minimal settings
- Clean, modern, European aesthetic

✅ **2026 Trend Understanding:**
- Current luxury influencer aesthetic (not outdated)
- Understands quiet luxury vs. loud luxury
- Sophisticated without being flashy

✅ **Variety:**
- Different quiet luxury outfits
- Different minimal/architectural settings
- Natural diversity within trend

**Red Flags:**

❌ **Wrong Aesthetic:**
- Loud branding or logos (opposite of quiet luxury)
- Maximalist style (opposite of quiet luxury)
- Flashy or ostentatious
- Missing expensive fabric references
- Generic luxury (not quiet luxury specifically)

**Success Criteria:**
- ✅ Quiet luxury aesthetic clearly present
- ✅ Sophisticated and understated
- ✅ Shows understanding of 2026 trends
- ✅ Natural integration, not forced

---

### Test 5: Natural Diversity Within Theme

**Goal:** Verify Maya creates variety within a cohesive theme

**Test Steps:**
1. Send request: `"coffee run moments"`
2. Review all 6 concepts
3. Verify theme consistency with execution diversity

**Expected Results:**

✅ **Theme Consistency:**
- ALL concepts related to coffee/cafe theme
- Cohesive narrative around coffee moments
- Related settings (various cafes, streets with coffee, etc.)

✅ **Execution Diversity:**
- DIFFERENT outfits for each concept (casual, athleisure, street style, etc.)
- DIFFERENT cafe settings (minimalist, Parisian, modern, cozy, etc.)
- Variety in moments (walking with coffee, sitting at cafe, waiting in line, etc.)
- Different times of day (morning, afternoon, golden hour)
- Different moods (relaxed, energetic, contemplative)

✅ **Natural Variety:**
- Theme is cohesive but execution is diverse
- Each concept feels fresh and unique
- No boring repetition

**Red Flags:**

❌ **Theme Issues:**
- Random unrelated concepts (gym, beach, party - not coffee related)
- Missing thematic consistency

❌ **Variety Issues:**
- Same outfit repeated (different outfits needed)
- Same cafe repeated (different settings needed)
- Same moment repeated (variety in moments needed)

**Success Criteria:**
- ✅ All concepts clearly coffee/cafe themed
- ✅ Different outfits, settings, moments
- ✅ Cohesive theme with diverse execution
- ✅ Natural variety, not forced

---

## Comparison Testing

### Before vs After

Test the **SAME prompt** to see the difference before and after cleanup:

**Test Prompt:** `"luxury lifestyle content"`

**Before Cleanup (Expected Issues):**

❌ **Problems to Look For:**
- Same outfit repeated across concepts
- Component-based assembly (concepts feel generic/templated)
- Forced "MANDATORY" brand mentions
- Boring, repetitive concepts
- Post-processing messages in console
- Concepts look assembled, not generated

**After Cleanup (Expected Improvements):**

✅ **Improvements to Verify:**
- Different outfits, locations, moments
- AI-generated creativity (concepts feel unique)
- Natural brand usage (aesthetic present, not forced)
- Fresh, unique concepts
- Direct AI generation in console
- Concepts feel creative and diverse

**How to Test:**
1. Note: You may not have "before" state if testing on cleanup branch
2. Compare to previous production behavior if possible
3. Look for indicators of old system (composition logs, etc.)
4. Verify new system is active (AI generation logs)

---

## Performance Testing

### Response Time

**Goal:** Verify generation is faster without post-processing

**Test Steps:**
1. Send request: `"create 6 luxury fashion concepts"`
2. Start timer when request sent
3. Stop timer when concepts appear
4. Repeat 3-5 times
5. Calculate average response time

**Expected Results:**

✅ **Performance Improvement:**
- Generation should be **FASTER** (no post-processing)
- Before cleanup: ~8-12 seconds (with composition system, post-processing)
- After cleanup: ~6-8 seconds (direct AI generation, no post-processing)
- Approximately **25-40% faster**

✅ **Consistency:**
- Response times are consistent
- No significant outliers
- Smooth user experience

**Metrics to Track:**
- Average response time
- P95 response time (95th percentile)
- P99 response time (99th percentile)
- Timeout rate (should be 0%)

**Success Criteria:**
- ✅ Faster than before (if comparing)
- ✅ Under 10 seconds for most requests
- ✅ Consistent performance

---

## Edge Case Testing

### Edge Case 1: Empty/Vague Request

**Request:** `"create concepts"`

**Expected Behavior:**
- Maya asks for clarification OR
- Maya creates general luxury lifestyle content
- Concepts are still diverse and creative
- Maya doesn't break or error

**Success Criteria:**
- ✅ Handles gracefully (no errors)
- ✅ Either asks for clarification or creates general content
- ✅ Concepts are still creative and diverse

---

### Edge Case 2: Specific Brand + Specific Setting

**Request:** `"The Row outfit at rooftop terrace"`

**Expected Results:**
- Uses The Row aesthetic (quiet luxury, expensive fabrics)
- Uses rooftop terrace setting
- Creates variety in poses/angles/moments
- Natural brand integration (not forced)
- Consistent setting with diverse execution

**Success Criteria:**
- ✅ Brand aesthetic naturally integrated
- ✅ Setting consistent
- ✅ Variety in poses/moments
- ✅ Creative and compelling

---

### Edge Case 3: Multiple Brands

**Request:** `"mix Alo athleisure with Toteme tailoring"`

**Expected Results:**
- Understands both brand aesthetics
- Creates hybrid aesthetic
- Natural integration of both brands
- Diverse concepts showing the hybrid style

**Success Criteria:**
- ✅ Both brand aesthetics present
- ✅ Hybrid style works naturally
- ✅ Concepts are creative
- ✅ Not forced or templated

---

### Edge Case 4: Trend Request

**Request:** `"mob wife glamour aesthetic"`

**Expected Results:**
- Understands mob wife trend (maximalist glamour, bold presence)
- Creates concepts matching the aesthetic
- Natural trend integration
- Diverse within the trend

**Success Criteria:**
- ✅ Trend clearly understood
- ✅ Aesthetic matches trend
- ✅ Natural integration
- ✅ Creative and diverse

---

### Edge Case 5: Consistency + Specific Request

**Request:** `"create consistent concepts for video - Alo Yoga workout"`  
**Settings:** `consistencyMode: 'consistent'`

**Expected Results:**
- Same Alo outfit across all 6
- Same workout setting/location
- Different poses/movements
- Alo aesthetic naturally integrated
- Video-ready consistency

**Success Criteria:**
- ✅ Consistency maintained (outfit + setting)
- ✅ Brand aesthetic naturally present
- ✅ Variety in poses
- ✅ Video-ready

---

## Console Log Verification

### What to Look For (Good Signs)

✅ **AI Generation Logs:**
```
[v0] [AI-GENERATION] Generating 6 concepts using Maya's AI generation
[v0] Generated concept text (first 300 chars): ...
[v0] [AI-GENERATION] ✅ Generated 6 concepts using Maya's AI
```

✅ **Personality Logs:**
```
Using enhanced personality for Studio Pro Mode
```

✅ **Consistency Guidance (if enabled):**
```
Consistency mode: consistent - same outfit/location, vary poses
```

---

### What to Watch For (Red Flags)

❌ **Old System Indicators:**
```
[v0] [COMPOSITION] Database has X components - using composition system
[v0] [COMPOSITION] Generating concepts using composition system
[v0] [COMPOSITION] Rejected (diversity check failed)
[v0] [COMPOSITION] Falling back to AI
```

❌ **Post-Processing:**
```
[v0] Regenerating concepts 2-6 for consistency
[v0] Creating variations from concept #1
```

❌ **Template System:**
```
[v0] Loading templates for category
[v0] MANDATORY: You MUST include the brand name
```

---

## Success Criteria Summary

### Cleanup is Successful If:

✅ **All Main Tests Pass:**
- Test 1: Basic Variety ✅
- Test 2: Consistency Mode ✅
- Test 3: Brand Understanding ✅
- Test 4: 2026 Trends Knowledge ✅
- Test 5: Natural Diversity ✅

✅ **Quality Indicators:**
- Concepts feel creative and fresh
- No boring repetition
- Natural variety (not forced)
- Maya shows understanding of brands/trends
- Generation is faster
- No post-processing in logs

✅ **No Negative Indicators:**
- ❌ Same outfit/location repeated (unless consistency mode)
- ❌ Composition system logs
- ❌ Post-processing regeneration
- ❌ Forced template mentions
- ❌ Boring or generic concepts

---

## Testing Checklist

Use this checklist when running tests:

### Pre-Test
- [ ] Environment set up correctly
- [ ] All cleanup commits applied
- [ ] Console logs visible
- [ ] Ready to generate concepts

### Test Execution
- [ ] Test 1: Basic Variety
- [ ] Test 2: Consistency Mode
- [ ] Test 3: Brand Understanding
- [ ] Test 4: 2026 Trends Knowledge
- [ ] Test 5: Natural Diversity
- [ ] Edge Cases (optional)
- [ ] Performance Testing (optional)

### Verification
- [ ] All tests passed
- [ ] Console logs show AI generation (not composition)
- [ ] Concepts are creative and diverse
- [ ] No red flags detected
- [ ] Performance is acceptable

---

## Reporting Issues

If you find issues during testing:

### Report Template

**Test:** [Test number and name]  
**Request:** [Exact request sent]  
**Expected:** [What should have happened]  
**Actual:** [What actually happened]  
**Console Logs:** [Relevant log excerpts]  
**Screenshots:** [If applicable]  
**Severity:** [High/Medium/Low]

### Common Issues

1. **Still seeing composition logs:** Old code may still be active
2. **Boring/repetitive concepts:** Diversity not working
3. **Forced brand mentions:** Template system still active
4. **Slow generation:** Performance issue
5. **Consistency not working:** System prompt not applied

---

## Conclusion

This testing guide helps verify that Maya's creativity has been fully restored. All tests should pass, and Maya should generate creative, diverse concepts using her AI intelligence - not component assembly or template systems.

**Key Takeaway:** Maya should feel creative, intelligent, and free to generate amazing concepts. If concepts feel templated, assembled, or boring, something is wrong.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Branch:** `unlock-maya-creativity`

