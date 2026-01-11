# Visibility Reset Sprint - Alignment Audit
**Date:** 2025-01-27  
**Objective:** 7-day Visibility Reset sprint focused on emotional safety, clarity, and first-time success  
**Audit Type:** Messaging and UX alignment assessment (not technical readiness)

---

## Executive Summary

**Is the product READY for a 7-day Visibility Reset sprint?**  
⚠️ **YES with risks**

The core product supports users' first wins, but messaging and onboarding create pressure and assume confidence that contradicts the sprint's goal of "you don't need to be brave all at once."

**Top 3 Alignment Risks:**
1. **Landing page creates pressure** - Uses competitive language ("Your competitors are already showing up"), guilt ("Don't let another month go by"), and tool-focused framing ("AI photo strategist", "complete content system")
2. **Onboarding requires too much confidence** - Brand Profile Wizard has 12 steps asking for transformation story, future vision, and brand strategy before first win
3. **Product positioned as "tools" not "support"** - Subscription descriptions focus on features ("complete AI content team") rather than ongoing support for staying visible

---

## 1. ENTRY & FUNNEL ALIGNMENT

### ❌ BLOCKING: Landing Page Pressure Language

**File:** `components/sselfie/landing-page.tsx`

**Issues Found:**

**Line 396-401:** Feature-focused messaging
```tsx
<h3>Never Run Out of Content Again</h3>
<p>Get unlimited photoshoots and video b-roll - so you always have fresh content ready to post. No more stressing about what to post next.</p>
```
**Problem:** Frames as productivity/feature set, not support for showing up. "No more stressing" acknowledges stress but doesn't reduce it - just promises solution.

**Line 427-431:** Professional pressure
```tsx
<h3>Look Professional Without the Price Tag</h3>
<p>Professional-quality photos that actually look like you - without spending $500-2,000 on photoshoots.</p>
```
**Problem:** "Professional-quality" assumes users are focused on appearing professional. Visibility Reset is about showing up authentically, not professional appearance.

**Line 646-651:** Competitive pressure (CRITICAL)
```tsx
<p>Don't let another month go by hiding behind stock photos.</p>
<p>Your competitors are already showing up. Are you?</p>
```
**Problem:** Direct comparison and guilt-inducing language. Contradicts "you don't need to be brave all at once" by implying failure if you don't act now.

**Line 108-111:** Maya introduction (tool framing)
```tsx
messages = [
  "Hi! I'm Maya, your AI photo strategist ✨",
  "I'll help you create stunning professional photos",
  "What kind of photos do you need today?",
]
```
**Problem:** "AI photo strategist" frames Maya as tool/expert. "Stunning professional photos" creates performance pressure. "What do you need today?" assumes user knows what they need (requires confidence).

**Line 370-374:** Content system framing
```tsx
<h2>What You Actually Get</h2>
<p>Not just photos. Your complete content system.</p>
```
**Problem:** "Complete content system" = tool/feature focus, not support for visibility.

### ⚠️ PARTIALLY BLOCKING: Product Description Framing

**File:** `lib/products.ts:64-71`

**Line 65-67:** Creator Studio description
```ts
id: "sselfie_studio_membership",
name: "Creator Studio",
description: "Your complete AI content team for less than one photoshoot.",
```
**Problem:** "Complete AI content team" = tool/feature framing. Doesn't mention ongoing support for staying visible or reducing pressure. Focuses on what you GET, not how it SUPPORTS you.

### ✅ ALIGNED: Success Page Copy

**File:** `components/checkout/success-content.tsx:262-266`

**Line 262-266:** Success message
```tsx
<h1>LET'S GET YOU STARTED</h1>
<p>Just a few quick details and you'll be creating your first AI photos. This takes less than a minute.</p>
```
**Observation:** "Just a few quick details" is reassuring, though "less than a minute" could feel like pressure (even if meant to reassure). Overall tone is supportive.

---

## 2. FIRST 24-HOUR USER EXPERIENCE (CRITICAL)

### ❌ BLOCKING: Onboarding Requires Too Much Confidence

**File:** `components/sselfie/brand-profile-wizard.tsx:104-219`

**Problem:** Brand Profile Wizard has 12 steps requiring decisions about:
- Transformation story (Step 6)
- Future vision (Step 7)
- Ideal audience (Step 8)
- Brand inspiration (Step 12)

**Specific Issues:**

**Line 109-110:** Maya's intro message
```tsx
mayaMessage: "I'm Maya, and I'm here to help you create content that actually looks and sounds like YOU. To do that, I need to understand your unique style, voice, and vision. This will only take a few minutes, and trust me - it's worth it!"
```
**Problem:** "I need to understand your unique style, voice, and vision" assumes user HAS a defined style/voice/vision. "trust me - it's worth it!" creates pressure to complete, even if user feels uncertain.

**Line 149-155:** Current situation question
```tsx
title: "Where are you right now?",
mayaMessage: "Are you building your business foundation? Growing your online presence? Scaling? Understanding where you are helps me create photos that match your current journey.",
```
**Problem:** Requires user to self-categorize and articulate their journey before seeing any value. Users feeling "stuck" or "overwhelmed" may not know how to answer this confidently.

**Line 158-166:** Transformation story
```tsx
title: "What's your story?",
mayaMessage: "Everyone has a story. What brought you here? What transformation are you going through or have you been through? Your story makes your brand authentic and relatable.",
```
**Problem:** "Everyone has a story" is pressure-inducing if user doesn't feel they have a clear story yet. Requires vulnerability and self-awareness before first win.

**Line 168-174:** Future vision
```tsx
title: "Where are you headed?",
mayaMessage: "Dream big! Where do you see yourself and your brand in the future? What impact do you want to make?",
```
**Problem:** "Dream big!" requires confidence and clear vision. Users feeling overwhelmed may not be ready to articulate future vision.

### ⚠️ PARTIALLY BLOCKING: Training Wizard Default Prompts

**File:** `components/sselfie/onboarding-wizard.tsx:503`

**Line 503:** Training intro
```tsx
"Let's train your personal AI model with your selfies. This takes about 5 minutes and you only need to do it once."
```
**Observation:** Reassuring ("only need to do it once"), but assumes user has 10-20 selfies ready. Users who don't have many selfies may feel blocked before starting.

**File:** `components/sselfie/onboarding-wizard.tsx:246-260`

**Line 247-254:** Validation requirements
```tsx
if (uploadedImages.length < 10) {
  alert("Please upload at least 10 images to train your AI model.")
  return
}
if (!selectedGender) {
  alert("Please select your gender so we can train your model accurately.")
  return
}
if (!selectedEthnicity) {
  alert("Please select your ethnicity for accurate representation in generated images.")
  return
}
```
**Problem:** Requires gender and ethnicity selection before any value shown. May cause hesitation or discomfort for some users. Could be optional with defaults.

### ⚠️ NOTED: First-Time User Default State

**File:** `components/sselfie/sselfie-app.tsx:673`

**Line 673:** Default empty state message
```tsx
"Welcome to SSELFIE! 🎉 Purchase credits to start creating your professional selfies"
```
**Problem:** "Professional selfies" assumes professional goal. No path shown for user to get first win without purchasing credits (free blueprint exists but not obvious).

---

## 3. MAYA VOICE & BEHAVIOR ALIGNMENT

### ❌ BLOCKING: Maya Framed as Tool/Expert, Not Support

**File:** `components/sselfie/landing-page.tsx:108-111`

**Landing page Maya intro:**
```tsx
messages = [
  "Hi! I'm Maya, your AI photo strategist ✨",
  "I'll help you create stunning professional photos",
  "What kind of photos do you need today?",
]
```
**Problem:** "AI photo strategist" = expert/tool role. "Stunning professional photos" = performance pressure. "What do you need today?" = assumes user knows (requires confidence).

**File:** `lib/maya/studio-pro-system-prompt.ts:102-200`

**Line 102-200:** System prompt for Studio Pro mode focuses on:
- "Expert knowledge"
- "Leverage capabilities"
- "Professional creative controls"
- "WOW Prompts"
- Technical specifications

**Problem:** Entire system prompt is expert/tool-focused. No language about:
- Normalizing hesitation
- Reducing pressure
- Supporting visibility journey
- "You don't need to know everything"

**Missing:** Maya's system prompt should include:
- Reassuring before instructing
- Normalizing doubt/overwhelm
- Framing as support for showing up, not tool for perfect content

### ⚠️ NOTED: Content Pillar Builder

**File:** `components/sselfie/content-pillar-builder.tsx:76-85`

**Line 76-85:** Maya's intro to content pillars
```tsx
<p>Now let's figure out what you'll actually post about! Content pillars are the main themes you'll create content around. Think of them as your content categories - they keep your feed organized and make it easy to come up with post ideas.</p>
<p>Based on everything you've told me about your brand, I can suggest pillars that will work perfectly for you. Ready?</p>
```
**Problem:** "figure out what you'll actually post about" assumes user doesn't know yet (creates pressure). "work perfectly for you" = perfection pressure. "Ready?" = assumes confidence.

---

## 4. SUBSCRIPTION & CONTINUATION MESSAGING

### ❌ BLOCKING: Subscription Framed as Features, Not Support

**File:** `lib/products.ts:64-71`

**Creator Studio description:**
```ts
id: "sselfie_studio_membership",
name: "Creator Studio",
description: "Your complete AI content team for less than one photoshoot.",
```
**Problem:** "Complete AI content team" = tool/feature focus. No mention of:
- Ongoing support for staying visible
- Reducing pressure to create
- Building momentum instead of perfection
- "You don't rely on motivation anymore"

**Should say something like:** "Monthly support for staying visible. Fresh photos each month so you never feel stuck or behind. Build momentum, not perfection."

### ⚠️ NOTED: Landing Page Subscription Copy

**File:** `components/sselfie/landing-page.tsx:813-827`

**Line 813-827:** Pricing section
```tsx
<p>Professional brand photos every month. Cancel anytime.</p>
<h3>Creator Studio</h3>
<p>Professional brand photos every month. No photographer needed.</p>
```
**Problem:** Repeats "Professional brand photos" (pressure). "Cancel anytime" is good (reduces commitment pressure), but overall framing is feature-focused, not support-focused.

### ⚠️ NOTED: Credit Renewal Email

**File:** `app/api/webhooks/stripe/route.ts:2110-2129`

**Line 2110-2129:** Credit renewal email sends when subscription renews
```tsx
const { generateCreditRenewalEmail } = await import("@/lib/email/templates/credit-renewal")
const emailContent = generateCreditRenewalEmail({
  firstName: userRecord[0].display_name?.split(" ")[0] || undefined,
  creditsGranted: 200,
})
```
**Observation:** Need to check `lib/email/templates/credit-renewal.tsx` for messaging, but renewal emails should reinforce "ongoing support" not "more features."

**Missing:** No evidence found of renewal emails that frame subscription as "support for staying visible" rather than "here are your credits/features."

---

## 5. DOCUMENTATION & SOURCE OF TRUTH

### ❌ BLOCKING: README Contradicts Visibility Reset Positioning

**File:** `README.md:1-50`

**Line 1-8:** Product tagline
```md
# SSELFIE Studio 📸

> **Your personal AI photographer that knows your best angles.**

SSELFIE Studio is the world's first AI-powered personal brand studio. We help women entrepreneurs create professional brand photos every month—no photographer needed. Just AI selfies that look like you, styled for your brand, and ready to use everywhere.
```
**Problem:** "AI-powered personal brand studio" = tool framing. "Professional brand photos" = pressure. No mention of supporting visibility, reducing overwhelm, or "you don't need to be brave all at once."

**Line 22-31:** Product description
```md
SSELFIE Studio gives you **100 professional brand photos every month** for less than the price of a coffee a day ($47/month).

### The 3-Step Flow

1. **TRAIN** → Upload 10–20 selfies to build your personal AI model
2. **STYLE** → Chat with Maya (your AI stylist) to create styled shoots in your brand vibe
3. **GALLERY** → Save 100+ fresh professional images every month into your brand asset library
```
**Problem:** Entire description is feature/process-focused. No emotional support language. "AI stylist" = tool framing. "brand asset library" = professional/business framing.

**Line 18:** Story positioning
```md
I created it for women who feel overwhelmed, stuck, or like they don't see themselves as powerful or beautiful. Women who don't have the time or money for a brand photoshoot but still need professional-looking brand photos. I wanted them to have a way to see themselves in a new light and finally feel confident, proud, and strong enough to build their own personal brands.
```
**Observation:** This paragraph ALIGNS with Visibility Reset positioning (addresses overwhelm, stuckness, need for support). But rest of README contradicts it by focusing on features/tools.

### ⚠️ NOTED: Internal Documentation Gaps

**Missing Files:**
- No `PRODUCT_POSITIONING.md` or `VISIBILITY_RESET.md` documenting the core positioning
- No centralized "voice and tone" guide for Maya
- No "first 24-hour experience" design document

**Impact:** Future development may drift from Visibility Reset positioning without clear documentation.

---

## BLOCKING ISSUES (Must Fix Before Sprint)

### 1. Landing Page Pressure Language

**File:** `components/sselfie/landing-page.tsx:646-651`

**Exact Change Required:**
```tsx
// REMOVE these lines:
<p>Don't let another month go by hiding behind stock photos.</p>
<p>Your competitors are already showing up. Are you?</p>

// REPLACE with Visibility Reset framing:
<p>You don't need to be brave all at once.</p>
<p>Start with one photo. We'll be here for the rest.</p>
```

**File:** `components/sselfie/landing-page.tsx:108-111`

**Exact Change Required:**
```tsx
// CHANGE from:
messages = [
  "Hi! I'm Maya, your AI photo strategist ✨",
  "I'll help you create stunning professional photos",
  "What kind of photos do you need today?",
]

// TO:
messages = [
  "Hi! I'm Maya ✨ I'm here to help you show up online",
  "Let's start small. What feels easy today?",
  "No pressure - just tell me what you're thinking about.",
]
```

### 2. Product Description Tool Framing

**File:** `lib/products.ts:65-67`

**Exact Change Required:**
```ts
// CHANGE from:
name: "Creator Studio",
description: "Your complete AI content team for less than one photoshoot.",

// TO:
name: "Creator Studio",
description: "Monthly support for staying visible. Fresh photos when you need them, without the pressure.",
```

### 3. Brand Profile Wizard Requires Too Much Confidence

**File:** `components/sselfie/brand-profile-wizard.tsx:104-219`

**Problem:** 12-step wizard asks for transformation story, future vision, brand strategy BEFORE first win.

**Options (choose one):**
- **Option A (Recommended):** Make wizard optional. Show simple "Quick Start" path that gets user to first photo in <5 minutes, then offer "Set up your brand profile later" as optional enhancement.
- **Option B:** Reduce to 3-4 essential questions (name, business type, visual aesthetic) and move rest to "optional setup" after first win.

**Required Change:**
Add "Skip for now" option at wizard intro that takes user directly to photo generation with minimal setup.

### 4. README Product Positioning

**File:** `README.md:1-50`

**Exact Change Required:**
Update README to reflect Visibility Reset positioning:

```md
SSELFIE Studio helps women entrepreneurs stay visible online without burning out, overthinking, or pretending to be someone they're not.

**Core belief:** AI is not a mask. AI is support. Images are a bridge, not the destination.

**What we offer:** Monthly support for showing up online. Fresh photos when you need them, so you can build momentum instead of perfection.
```

---

## NON-BLOCKING BUT NOTED MISALIGNMENTS

### 1. Maya System Prompt (Expert/Tool Focus)

**File:** `lib/maya/studio-pro-system-prompt.ts`

**Issue:** Entire system prompt focuses on capabilities, expertise, and technical specifications. No language about:
- Reassuring hesitant users
- Normalizing overwhelm
- Supporting visibility journey (not perfect content)

**Impact:** Maya's responses will sound like expert/tool, not supportive friend. Not blocking because users can still get value, but contradicts sprint positioning.

**Recommendation:** Add to Maya's system prompt:
```
Your role: Support women in showing up online, not creating perfect content. Reassure before instructing. Normalize hesitation and doubt. Frame everything as "you don't need to be brave all at once."
```

### 2. "Professional" Language Throughout

**Files:** Multiple (landing page, product descriptions, onboarding)

**Issue:** Repeated use of "professional" (professional photos, professional brand photos, professional-quality) assumes users want to appear professional.

**Visibility Reset framing:** Users want to show up authentically, not necessarily professionally. "Professional" can feel like pressure to perform.

**Impact:** Not blocking, but creates subtle pressure. Consider using "authentic" or "that look like you" instead.

### 3. Success Page "Less Than a Minute" Copy

**File:** `components/checkout/success-content.tsx:265`

**Line 265:** "This takes less than a minute."

**Issue:** While meant to reassure, "less than a minute" can feel like pressure/urgency.

**Better:** "Take your time. There's no rush."

### 4. Credit System Messaging

**File:** `components/sselfie/sselfie-app.tsx:673`

**Default empty state:** "Purchase credits to start creating your professional selfies"

**Issue:** Assumes user must purchase to get value. Free blueprint exists but not obvious from this message.

**Better:** "Start with your free blueprint, or purchase credits for more photos."

---

## REQUIRED DOCUMENTATION UPDATES

### 1. Create `PRODUCT_POSITIONING.md`

**Location:** Root of repo

**Content Required:**
- Core positioning: "SSELFIE Studio helps women entrepreneurs stay visible online without burning out, overthinking, or pretending to be someone they're not."
- Core belief: "AI is not a mask. AI is support. Images are a bridge, not the destination."
- Voice principles:
  - Reassure before instructing
  - Normalize hesitation and doubt
  - Frame as "you don't need to be brave all at once"
  - Support for showing up, not tool for perfect content
- What NOT to say:
  - ❌ "Professional photos" (pressure)
  - ❌ "AI photo strategist" (tool framing)
  - ❌ "Your competitors are already showing up" (comparison/pressure)
  - ❌ "Complete content system" (feature focus)
- What TO say:
  - ✅ "Show up online" (visibility focus)
  - ✅ "Here to support you" (support framing)
  - ✅ "Start small, we'll be here" (reassuring)
  - ✅ "Monthly support for staying visible" (ongoing support)

### 2. Update `README.md`

**Required Changes:**
- Replace "AI-powered personal brand studio" with "support for staying visible online"
- Replace "professional brand photos" with "photos that look like you"
- Add core positioning section (see above)
- Frame features as "how we support you" not "what you get"

### 3. Create `MAYA_VOICE_GUIDE.md`

**Location:** `docs/MAYA_VOICE_GUIDE.md`

**Content Required:**
- Maya's role: Supportive friend, not expert strategist
- Tone: Reassuring, normalizing, encouraging
- Language to avoid: "professional", "stunning", "perfect", "optimize", "strategy"
- Language to use: "authentic", "that look like you", "easy", "no pressure", "start small"
- Examples of aligned vs. misaligned responses

### 4. Create `FIRST_24_HOURS.md`

**Location:** `docs/FIRST_24_HOURS.md`

**Content Required:**
- Goal: User gets meaningful first win within 24 hours with minimal thinking
- Critical path: Skip complex setup → Quick photo generation → Build confidence
- What to avoid: Asking for transformation story, future vision, brand strategy before first win
- What to offer: Optional "enhance your profile later" after user sees value

---

## EXPLICIT "DO NOT FIX NOW" LIST

### 1. Maya System Prompt Refactor

**File:** `lib/maya/studio-pro-system-prompt.ts`

**Why NOT to fix now:** System prompt refactor would require extensive testing to ensure Maya's responses remain helpful while shifting tone. Risk of breaking existing user flows.

**Action:** Document desired changes, but defer implementation until after sprint validation.

### 2. Landing Page Full Redesign

**File:** `components/sselfie/landing-page.tsx`

**Why NOT to fix now:** Full redesign would require:
- New copy throughout
- Visual design updates
- A/B testing
- Risk of breaking conversion

**Action:** Fix only the critical pressure language (lines 646-651, 108-111), leave rest for post-sprint iteration.

### 3. Onboarding Wizard Full Restructure

**File:** `components/sselfie/brand-profile-wizard.tsx`

**Why NOT to fix now:** Complete restructure would require:
- New user flow design
- Testing first-win path
- Migration logic for existing users

**Action:** Add "Skip for now" option to allow quick start, but don't rebuild entire wizard.

### 4. Email Template Audit

**Files:** `lib/email/templates/*.tsx`

**Why NOT to fix now:** Email templates are numerous and require:
- Content review for each template
- Testing email rendering
- Risk of breaking transactional emails

**Action:** Document needed changes, prioritize welcome email update post-sprint.

### 5. Admin Dashboard Language

**Files:** `app/admin/**/*.tsx`

**Why NOT to fix now:** Admin dashboard is internal tool, not user-facing. Alignment is nice-to-have but not critical for Visibility Reset sprint.

**Action:** Leave as-is.

---

## SUMMARY

**Blocking Issues:** 4
1. Landing page competitive/pressure language (lines 646-651, 108-111)
2. Product description tool framing (`lib/products.ts:65-67`)
3. Brand Profile Wizard requires too much confidence (make optional/skippable)
4. README contradicts positioning (update to Visibility Reset framing)

**Non-Blocking Misalignments:** 4
1. Maya system prompt (expert/tool focus, not support)
2. "Professional" language throughout (subtle pressure)
3. Success page "less than a minute" (subtle urgency)
4. Credit system messaging (assumes purchase required)

**Documentation Needed:** 4 files
1. `PRODUCT_POSITIONING.md` (new)
2. `README.md` (update)
3. `docs/MAYA_VOICE_GUIDE.md` (new)
4. `docs/FIRST_24_HOURS.md` (new)

**Do NOT Fix Now:** 5 areas (documented above)

---

## RECOMMENDATION

**Proceed with sprint after fixing 4 blocking issues.** The core product supports first wins (photo generation works), but messaging creates pressure that contradicts the sprint's goal of reducing anxiety and supporting gradual visibility.

**Priority Order:**
1. Remove competitive/pressure language from landing page (15 min fix)
2. Update Creator Studio product description (5 min fix)
3. Add "Skip for now" to Brand Profile Wizard (30 min fix)
4. Update README positioning (10 min fix)

**Total time to alignment:** ~1 hour of copy changes (no code refactoring needed).

After these fixes, the product will be aligned with Visibility Reset positioning: supportive, low-pressure, focused on first wins rather than perfect strategy.
