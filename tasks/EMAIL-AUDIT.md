# 📧 EMAIL AUDIT — What Currently Exists
**Written:** 2026-02-20 by Claude (AI Director)
**Purpose:** Document exactly what email sequences are in the codebase, what they say, and what needs to change before EMAIL-REBUILD begins.

---

## WHAT EXISTS IN THE CODEBASE RIGHT NOW

### 1. Welcome Sequence (for new PAID members)
**File:** `lib/email/templates/welcome-sequence.ts`
**Triggers:** User completes payment
**Emails:**
- Day 0 — "You're in! Let's get you creating 🚀"
- Day 3 — "Quick check: How's it going? 💪"
- Day 7 — "One week in - you're crushing it! 🎯"
- Day 14 — "Quick check: have you used your credits this week?"
- Day 21 — "Week 3: one quick win for your visibility"
- Day 28 — "Month 1 check-in: stay consistent and keep building"

**Problems found:**
- Written in "Alex's voice" (old AI persona) — not Sandra's voice
- Uses forbidden words: "crushing it", "game-changer", "take your content to the next level"
- Generic corporate language: "scale", "system", "optimize"
- Day 7 CTA says "Join SSELFIE Studio →" — they're ALREADY members. Wrong CTA.
- All CTAs go to /studio (correct for paid users ✅)
- Prices mentioned ($97/month) may be outdated — Sandra needs to confirm
- "Sarah" case study in nurture sequence is made-up fictional story — needs real or removed

---

### 2. Nurture Sequence (for FREE users / freebie downloaders)
**File:** `lib/email/templates/nurture-sequence.ts`
**Triggers:** User downloads freebie (Brand Blueprint)
**Emails:**
- Day 1 — "Your Blueprint is ready! (Plus something better) ✨"
- Day 5 — "How Sarah went from invisible to booked solid 📈"
- Day 10 — "Ready to be SEEN? (Let's make it simple) 💪"

**Problems found:**
- Written in "Alex's voice"
- "Sarah" story is completely fictional — fabricated case study
- "HOURS trying to get content ready" — Sandra's own story, but written generically
- Uses forbidden language: "game changer for engagement", "10+ hours per month"
- Prices mentioned ($97/month, $49 one-time) — Sandra to confirm if still accurate
- Day 10 "50% off" re-engagement discount — is this still valid?
- CTAs correctly go to homepage (not /studio) for non-members ✅

---

### 3. Re-engagement Sequence (for inactive paid users)
**File:** `lib/email/templates/reengagement-sequence.ts`
**Triggers:** User has been inactive 30+ days
**Emails:**
- Day 0 — "Haven't seen you in a while... 👀"
- Day 7 — "You haven't seen what Maya can do now... 🚀"
- Day 14 — "Last call: Come back to Studio (50% off) 💪"

**Problems found:**
- "50% off comeback offer" — Sandra needs to confirm if this is still being offered
- Promo code "COMEBACK50" hardcoded — does this code exist in Stripe?
- "Game changer for engagement" — forbidden
- Generally warmer tone than others, but still not Sandra's voice

---

### 4. First Generation Followup (for new users after first AI photo)
**File:** `lib/email/templates/welcome-first-generation-followup.ts`
**Triggers:** User generates their first image
**Emails:**
- 1 email — "Your brand photo is waiting for you"

**Problems found:**
- Very short, minimal — actually closest to Sandra's voice ✅
- But CTA pushes hard to /checkout/membership when user may already BE a member
- Logic: this is sent to free users who get 1 free generation
- Clean and functional — needs light rewrite only

---

### 5. Brand Engine Broadcast (feb 2026)
**File:** `lib/email/templates/brand-engine-broadcast-feb-2026.ts`
**Purpose:** One-time broadcast for Brand Engine launch
**Status:** Likely the broadcast Sandra wanted to send — NEEDS REVIEW

---

## THE CORE VOICE PROBLEM

Every sequence was written for an AI persona called "Alex" — Sandra's internal AI business assistant. The emails say "XoXo Sandra" but they don't sound like her at all.

**What Sandra's voice actually sounds like (from brand guidelines):**
- Short sentences. Conversational flow.
- "Here's the thing..."
- "Let me be really honest for a second..."
- "And yes — that comes back to money."
- "Wild, right?"
- Warm friend texting you
- Vulnerability and personal stories
- Max 2 sentences per paragraph

**What the emails currently sound like:**
- Long paragraphs with multiple points
- Marketing speak: "scale", "level up", "system", "optimize"
- Corporate enthusiasm: "crushing it", "game-changer"
- Fictional case studies presented as real
- Generic bullet point lists

---

## DECISIONS NEEDED FROM SANDRA BEFORE REBUILD

Sandra needs to answer these before Claude rewrites anything:

1. **Pricing** — Is $97/month still the price? Is the $49 one-time still offered?
2. **"Sarah" story** — Remove the fictional case study entirely, or replace with a real member story?
3. **COMEBACK50 promo** — Is the 50% off comeback offer still being offered? Does the Stripe promo code exist?
4. **Brand Engine broadcast** — Is the Feb 2026 broadcast still relevant? Should it go out now?
5. **Sequence priority** — Which sequence should be rebuilt first? (Recommendation: welcome sequence for paid members, since those are your actual customers)
6. **Day 0 welcome** — What's the ONE thing you want a new member to do in their first hour? (Determines what Day 0 focuses on)
7. **Personal story for nurture Day 1** — Can you give a 2-3 sentence version of your real content struggle before SSELFIE? This replaces the generic "I used to spend HOURS" line.

---

## RECOMMENDED BUILD ORDER

1. **Paid welcome sequence (Days 0, 3, 7)** — Your actual customers. Highest impact.
2. **First generation followup** — Light rewrite. Sends when someone gets their first photo.
3. **Nurture sequence (Days 1, 5, 10)** — For freebie subscribers. Drives conversions.
4. **Re-engagement sequence** — For churned/inactive users. Lower priority.
5. **Brand Engine broadcast** — One-time. Time-sensitive if launch is March 16.
