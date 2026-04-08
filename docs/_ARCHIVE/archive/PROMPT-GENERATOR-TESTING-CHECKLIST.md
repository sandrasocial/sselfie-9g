# Prompt Generator Testing & Validation Checklist

## 🎯 Overview

This document provides a comprehensive testing checklist for the Prompt Generator system integrated into Maya's Studio Pro workbench mode.

---

## 📋 Functionality Tests

### 1. Workbench Image Analysis
- [ ] **Test:** Workbench images are correctly analyzed
  - [ ] Upload 1 user LoRA image → Analysis detects `containsPerson: true`
  - [ ] Upload 1 product image → Analysis detects `containsProduct: true`
  - [ ] Upload 2 images (user + product) → Both detected correctly
  - [ ] Upload 4 images → All analyzed and positions tracked
  - [ ] Upload inspiration image → Analysis detects style/mood
  - [ ] Empty workbench → Handles gracefully (no errors)

### 2. Content Type Detection
- [ ] **Test:** Content type detection works for all scenarios
  - [ ] User says "create carousel" → Detects `carousel_cover`, `carousel_content`
  - [ ] User says "educational infographic" → Detects `carousel_infographic`
  - [ ] User says "morning routine UGC" → Detects `ugc_morning_routine`
  - [ ] User says "coffee shop work" → Detects `ugc_coffee_shop`
  - [ ] User says "product unboxing" → Detects `ugc_unboxing`
  - [ ] User says "brand partnership skincare" → Detects `brand_skincare`
  - [ ] User says "fashion collaboration" → Detects `brand_fashion`
  - [ ] User says "tech product" → Detects `brand_tech`
  - [ ] User says "reel cover tutorial" → Detects `reel_tutorial`
  - [ ] User says "transformation reel" → Detects `reel_transformation`
  - [ ] User says "day in the life" → Detects `reel_lifestyle`
  - [ ] User says "educational reel" → Detects `reel_educational`
  - [ ] Ambiguous intent → Falls back to image-based inference

### 3. Template Selection
- [ ] **Test:** Templates are selected appropriately
  - [ ] Carousel content type → Selects `CAROUSEL_COVER_SLIDE`, `CAROUSEL_CONTENT_SLIDE`
  - [ ] UGC content type → Selects appropriate UGC template
  - [ ] Product content type → Selects `PRODUCT_LIFESTYLE_MOCKUP` or `PRODUCT_FLAT_LAY`
  - [ ] Brand partnership → Selects brand-specific template
  - [ ] Reel cover → Selects reel cover template
  - [ ] Multiple content types → Selects multiple templates
  - [ ] No matching templates → Handles gracefully

### 4. Prompt Generation
- [ ] **Test:** Generated prompts include all required components
  - [ ] Character consistency instructions present (when user image exists)
  - [ ] Detailed subject description included
  - [ ] Clear action/pose specified
  - [ ] Specific environment described
  - [ ] Composition details (aspect ratio, shot type, framing)
  - [ ] Visual style and mood specified
  - [ ] Lighting setup described
  - [ ] Technical specs (lens, aperture, resolution)
  - [ ] Text space reserved (when needed)
  - [ ] Final use case specified

### 5. Character Consistency
- [ ] **Test:** Prompts maintain character consistency instructions
  - [ ] User image present → Prompt includes "Keep facial features EXACTLY identical to Image 1"
  - [ ] Multiple slides → Each slide references same character
  - [ ] Carousel series → Consistency maintained across all slides
  - [ ] No user image → No character consistency instructions (correct)

### 6. Capability Detection
- [ ] **Test:** NanoBanana Pro capabilities are correctly identified
  - [ ] Text overlay in prompt → `text_rendering` capability detected
  - [ ] Multiple images referenced → `multi_image_composition` detected
  - [ ] Character consistency mentioned → `character_consistency` detected
  - [ ] Google Search mentioned → `real_time_data` detected
  - [ ] Technical specs (lens, aperture) → `professional_controls` detected
  - [ ] Infographic/educational → `educational_excellence` detected
  - [ ] Multiple capabilities → All detected correctly

### 7. Suggestion Ranking
- [ ] **Test:** Suggestions are ranked sensibly
  - [ ] Highest confidence suggestions appear first
  - [ ] Main variations ranked before alternate variations
  - [ ] More capabilities = higher rank (when confidence equal)
  - [ ] Ranking is consistent across multiple requests

### 8. Copy to Clipboard
- [ ] **Test:** Copy to clipboard works
  - [ ] Click "COPY" button → Prompt copied to clipboard
  - [ ] Copied prompt matches suggestion exactly
  - [ ] Visual feedback shows "COPIED" state
  - [ ] Feedback disappears after 2 seconds
  - [ ] Works on mobile devices

### 9. Use in Workbench
- [ ] **Test:** Use in Workbench auto-fills prompt box
  - [ ] Click "USE IN WORKBENCH" → Prompt appears in workbench prompt box
  - [ ] Workbench auto-expands if collapsed
  - [ ] Custom event dispatched correctly
  - [ ] Prompt box updates immediately
  - [ ] Works when workbench is already expanded
  - [ ] Works when workbench is collapsed

---

## ✨ Prompt Quality Tests

### 10. Carousel Prompts
- [ ] **Test:** Carousel prompts maintain consistency across slides
  - [ ] Slide 1 (cover) → Includes hook and text space
  - [ ] Slide 2-4 (content) → References "same person", "consistent styling"
  - [ ] Slide 5 (CTA) → Maintains color palette from cover
  - [ ] All slides → Same technical specs (lens, aperture)
  - [ ] All slides → Same visual style mentioned
  - [ ] Text overlays → Sophisticated typography (not generic)

### 11. UGC Prompts
- [ ] **Test:** UGC prompts include authenticity markers
  - [ ] Morning routine → Includes "iPhone selfie aesthetic"
  - [ ] Coffee shop → Includes "authentic imperfections"
  - [ ] Unboxing → Includes "natural home setting"
  - [ ] All UGC → Includes "realistic", "not overly staged"
  - [ ] All UGC → Includes camera quality details

### 12. Product Mockup Prompts
- [ ] **Test:** Product mockup prompts integrate products naturally
  - [ ] Lifestyle mockup → Product "naturally integrated, not forced"
  - [ ] Flat lay → Product as focal point with supporting props
  - [ ] On-person → Product placement clearly specified
  - [ ] All product prompts → Product details accurately described
  - [ ] All product prompts → Brand aesthetic matching mentioned

### 13. Brand Partnership Prompts
- [ ] **Test:** Brand partnership prompts match brand aesthetics
  - [ ] Skincare → "Clean beauty, minimalist luxury" aesthetic
  - [ ] Fashion → "Editorial street style" aesthetic
  - [ ] Tech → "Premium lifestyle" aesthetic
  - [ ] All brand prompts → Color palette extracted from references
  - [ ] All brand prompts → Brand alignment mentioned

### 14. Reel Cover Prompts
- [ ] **Test:** Reel cover prompts optimize for engagement
  - [ ] Educational → "Engaging expression", "direct eye contact"
  - [ ] Transformation → "Clear visual payoff"
  - [ ] Lifestyle → "Relatable aspiration" mood
  - [ ] Tutorial → "Action frozen at most interesting moment"
  - [ ] All reel covers → Text space for thumbnail visibility
  - [ ] All reel covers → 9:16 vertical format specified

### 15. Technical Details
- [ ] **Test:** All prompts specify technical details
  - [ ] Lens specified (85mm, 50mm, etc.)
  - [ ] Aperture specified (f/2.0, f/2.8, etc.)
  - [ ] Resolution specified (2K, 4K)
  - [ ] Lighting direction and quality specified
  - [ ] Camera angle specified when relevant

### 16. Text Space
- [ ] **Test:** Text space is reserved when needed
  - [ ] Carousel cover → "Top 30% reserved for headline"
  - [ ] Reel cover → "Top 25% reserved for title"
  - [ ] Story graphic → "Upper third with breathing room"
  - [ ] Infographic → Text placement clearly specified
  - [ ] Non-text content → No text space mentioned (correct)

### 17. Prompt Length
- [ ] **Test:** Prompts are under 500 words (NanoBanana Pro limit)
  - [ ] All generated prompts → Under 500 words
  - [ ] Average prompt length → 100-300 words (optimal)
  - [ ] Longest prompt → Still under 500 words
  - [ ] Prompt length validation → Works correctly

---

## 🎨 User Experience Tests

### 18. Performance
- [ ] **Test:** Suggestions appear within 2 seconds
  - [ ] API response time → Under 2 seconds
  - [ ] Loading state → Shows skeleton while generating
  - [ ] Error handling → Shows friendly error message
  - [ ] Network timeout → Handles gracefully

### 19. Mobile Responsiveness
- [ ] **Test:** UI is responsive on mobile
  - [ ] Cards display correctly on mobile (< 375px width)
  - [ ] Buttons are touch-friendly (min 44px height)
  - [ ] Text is readable without zooming
  - [ ] Cards stack vertically on mobile
  - [ ] No horizontal scrolling required

### 20. Visual Design
- [ ] **Test:** Cards are visually appealing and clear
  - [ ] Matches SSELFIE design system (stone palette)
  - [ ] No emojis or decorative icons
  - [ ] Clean borders and spacing
  - [ ] Typography is clear and readable
  - [ ] Hover states work correctly
  - [ ] Loading skeletons match card layout

### 21. Capability Badges
- [ ] **Test:** Capability badges are informative
  - [ ] Badges show correct capability names
  - [ ] Badges are visually distinct
  - [ ] Multiple badges display correctly
  - [ ] Badges help users understand prompt features
  - [ ] No badges shown when no capabilities detected (correct)

### 22. User Understanding
- [ ] **Test:** Users understand which prompt to choose
  - [ ] Prompt names are descriptive
  - [ ] Descriptions explain what each prompt creates
  - [ ] Confidence scores help users choose
  - [ ] Use cases listed help users decide
  - [ ] Preview text shows enough context

### 23. Action Feedback
- [ ] **Test:** Copy/Use actions provide clear feedback
  - [ ] Copy button → Shows "COPIED" with check icon
  - [ ] Use in Workbench → Workbench expands and prompt appears
  - [ ] Visual feedback is immediate
  - [ ] Feedback is clear and noticeable
  - [ ] No confusion about what happened

---

## 📊 Success Metrics

### Technical Metrics

#### Prompt Generation Latency
- [ ] **Target:** < 2 seconds
- [ ] **Measurement:** Time from API call to suggestions displayed
- [ ] **Test:** Measure 10 requests, average should be < 2s
- [ ] **P95:** 95% of requests complete in < 2.5s

#### Template Matching Accuracy
- [ ] **Target:** > 90%
- [ ] **Measurement:** % of cases where correct template is selected
- [ ] **Test:** 20 test scenarios, 18+ should match correctly
- [ ] **Edge cases:** Ambiguous intents handled gracefully

#### User Selection Rate
- [ ] **Target:** > 70% users select suggestion vs. writing own
- [ ] **Measurement:** % of generations using suggested prompts
- [ ] **Test:** Track over 100 generations
- [ ] **Baseline:** Compare to manual prompt writing

### Quality Metrics

#### Generated Images Meet User Intent
- [ ] **Target:** > 85%
- [ ] **Measurement:** User confirms image matches what they wanted
- [ ] **Test:** Survey users after generation
- [ ] **Follow-up:** Track improvement over time

#### First-Try Success Rate
- [ ] **Target:** > 75%
- [ ] **Measurement:** % of users satisfied with first generated image
- [ ] **Test:** Track user satisfaction on first generation
- [ ] **Improvement:** Iterate on prompt quality based on feedback

#### User Satisfaction
- [ ] **Target:** > 4.5/5
- [ ] **Measurement:** User rating of prompt suggestions
- [ ] **Test:** In-app survey after using suggestions
- [ ] **Feedback:** Collect qualitative feedback

### Engagement Metrics

#### Multiple Suggestions Tried
- [ ] **Target:** Users try 2+ suggestions per session
- [ ] **Measurement:** Average suggestions used per user
- [ ] **Test:** Track usage over 1 week
- [ ] **Goal:** Users explore variations

#### Variations Explored
- [ ] **Target:** Users try different variations
- [ ] **Measurement:** % of users who try multiple variations
- [ ] **Test:** Track variation selection
- [ ] **Insight:** Which variations are most popular?

#### Learning Curve
- [ ] **Target:** Time to first successful generation < 5 minutes
- [ ] **Measurement:** Time from first suggestion to successful generation
- [ ] **Test:** Track new user onboarding
- [ ] **Improvement:** Optimize onboarding flow

---

## 🧪 Test Scenarios

### Scenario 1: New User - First Carousel
1. User opens workbench
2. Uploads 1 user photo
3. Asks: "Create a carousel about morning routines"
4. **Expected:** 3 suggestions for carousel cover/content
5. **Verify:** All include character consistency, text space, technical details

### Scenario 2: Brand Partnership
1. User uploads user photo + product image
2. Asks: "Create brand content with this skincare product"
3. **Expected:** Suggestions for skincare brand partnership
4. **Verify:** Product integrated naturally, brand aesthetic matched

### Scenario 3: Reel Cover with Text
1. User uploads user photo
2. Asks: "Create reel cover saying '5 Productivity Tips'"
3. **Expected:** Reel cover suggestions with sophisticated text overlay
4. **Verify:** Text broken into parts, Instagram fonts specified

### Scenario 4: Educational Infographic
1. User uploads style reference
2. Asks: "Create infographic about Instagram algorithm"
3. **Expected:** Infographic template with real-time data capability
4. **Verify:** Text rendering capability detected, layout specified

### Scenario 5: Multiple Variations
1. User uploads user photo
2. Asks: "Create lifestyle content"
3. **Expected:** Multiple template variations (UGC, lifestyle, etc.)
4. **Verify:** Variations ranked by confidence, all valid

---

## 🐛 Known Issues & Edge Cases

### Edge Cases to Test
- [ ] Empty workbench (no images)
- [ ] Maximum images (4 images)
- [ ] Very long user intent (> 500 characters)
- [ ] Ambiguous intent ("create something")
- [ ] Intent with typos
- [ ] Multiple content types in one request
- [ ] Rapid successive requests
- [ ] Network failure during generation
- [ ] API timeout
- [ ] Invalid image URLs

### Error Handling
- [ ] API errors → User-friendly error message
- [ ] Network errors → Retry option or clear error
- [ ] Invalid responses → Graceful degradation
- [ ] Missing data → Defaults applied correctly

---

## ✅ Sign-Off Checklist

### Development Team
- [ ] All functionality tests passed
- [ ] All prompt quality tests passed
- [ ] All UX tests passed
- [ ] Performance targets met
- [ ] Error handling verified

### QA Team
- [ ] Full regression test completed
- [ ] Edge cases tested
- [ ] Mobile testing completed
- [ ] Cross-browser testing completed

### Product Team
- [ ] Success metrics baseline established
- [ ] User testing completed
- [ ] Feedback incorporated
- [ ] Documentation updated

---

## 📝 Notes

- **Test Environment:** Use staging environment with test data
- **Test Users:** Create test accounts with various image types
- **Monitoring:** Set up analytics to track metrics automatically
- **Feedback Loop:** Collect user feedback continuously
- **Iteration:** Update prompts based on generation results

---

**Last Updated:** [Date]
**Version:** 1.0
**Status:** Ready for Testing



