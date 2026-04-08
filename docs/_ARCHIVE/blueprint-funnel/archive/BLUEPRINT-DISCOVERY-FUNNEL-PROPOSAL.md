# Brand Blueprint Discovery Funnel - Proposal

**Date:** January 8, 2025  
**Status:** 📋 Proposal - Awaiting Approval  
**Goal:** Guide cold subscribers through a free, hands-on experience before asking for payment

---

## 🎯 Strategy Overview

**The Problem:** The current reactivation campaign (8 emails over 25 days) is a "direct conversion" approach. Some cold subscribers might need a softer entry point.

**The Solution:** Create a parallel "discovery funnel" that lets them:
1. **Test Brand Blueprint** (free, no commitment)
2. **Try Maya** (chat/planning features)
3. **Get a free Instagram grid preview** (see results before buying)

**Target Audience:** Same `cold_users` segment, but this is an **alternative path** for those who prefer hands-on testing over reading about features.

---

## 📧 Proposed Email Sequence (5 emails over 10 days)

### Email 1: "Remember the selfie guide? Here's what's next."
**Day:** 0  
**Subject:** "Remember the selfie guide? Here's what's next."

**Content:**
- Reference original selfie guide download
- "I built something that makes those selfie skills even easier"
- Introduce Brand Blueprint as a free way to test the system
- **CTA:** "Get your free blueprint →" (links to `/blueprint?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email1`)

**Goal:** Drive them to Brand Blueprint signup

---

### Email 2: "Your blueprint is ready — here's what you can do with it."
**Day:** 3  
**Subject:** "Your blueprint is ready — here's what you can do with it."

**Content:**
- Only sent to users who completed Brand Blueprint
- "You just got your personalized content strategy"
- "Now, want to see it in action?"
- Introduce free Instagram grid preview (via blueprint)
- **CTA:** "Generate your free grid →" (links to blueprint page with grid generation)

**Goal:** Get them to generate the free 3x3 grid

---

### Email 3: "Meet Maya — your AI creative director."
**Day:** 5  
**Subject:** "Meet Maya — your AI creative director."

**Content:**
- "You've seen your blueprint. Now meet the AI that makes it happen."
- Explain Maya's role (stylist, strategist, creative partner)
- "You can chat with Maya for free — no credits needed for planning"
- Offer to test Maya's chat features (feed planning, caption ideas)
- **CTA:** "Try Maya free →" (links to `/studio?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email3` with signup prompt)

**Goal:** Get them to sign up and try Maya chat

---

### Email 4: "See how creators use Maya to plan their feeds."
**Day:** 7  
**Subject:** "See how creators use Maya to plan their feeds."

**Content:**
- Social proof: "Creators are using Maya to plan 30 days of content in minutes"
- Show example: "Ask Maya: 'Create an Instagram feed for my coaching business'"
- Explain free features (chat, planning, captions) vs paid (image generation)
- **CTA:** "Start planning with Maya →" (links to studio with Maya tab open)

**Goal:** Increase engagement with Maya

---

### Email 5: "Your free grid is ready — want to generate more?"
**Day:** 10  
**Subject:** "Your free grid is ready — want to generate more?"

**Content:**
- "You've tested the blueprint, met Maya, and seen your grid"
- "Ready to create unlimited brand photos?"
- Soft pitch: "Join Studio to generate as many photos as you need"
- **CTA:** "See Studio membership →" (links to `/checkout/membership?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email5`)

**Goal:** Convert to paid membership

---

## 🔄 Funnel Flow

```
Email 1 (Day 0)
    ↓
Brand Blueprint Signup
    ↓
Email 2 (Day 3) - Only if blueprint completed
    ↓
Generate Free Grid (3x3 preview)
    ↓
Email 3 (Day 5) - Only if grid generated
    ↓
Sign Up & Try Maya Chat
    ↓
Email 4 (Day 7) - Only if signed up
    ↓
Engage with Maya (planning, captions)
    ↓
Email 5 (Day 10) - Only if engaged with Maya
    ↓
Convert to Membership
```

---

## 🎯 Key Features

### 1. **Free Brand Blueprint**
- No credit card required
- Personalized content strategy
- 30-day calendar
- Caption templates
- **Free 3x3 Instagram grid preview** (this is the hook!)

### 2. **Free Maya Chat**
- Chat with Maya (no credits needed)
- Feed planning (no credits needed)
- Caption generation (no credits needed)
- Strategy documents (no credits needed)
- **Only image/video generation costs credits**

### 3. **Free Grid Preview**
- Generated via Brand Blueprint flow
- 9 images in their chosen aesthetic
- Shows them what's possible
- Creates desire for more

---

## 📊 Tracking & Segmentation

### Email Types
- `blueprint-discovery-1` - "Remember the selfie guide?"
- `blueprint-discovery-2` - "Your blueprint is ready"
- `blueprint-discovery-3` - "Meet Maya"
- `blueprint-discovery-4` - "See how creators use Maya"
- `blueprint-discovery-5` - "Your free grid is ready"

### UTM Parameters
```
utm_source=colddiscovery
utm_campaign=blueprint_funnel
utm_content=email{1-5}
```

### Segmentation Logic
- **Email 2:** Only send to users who completed Brand Blueprint (`blueprint_completed = true`)
- **Email 3:** Only send to users who generated grid (`grid.generated = true`)
- **Email 4:** Only send to users who signed up (`converted_to_user = true`)
- **Email 5:** Only send to users who engaged with Maya (chat messages > 0)

---

## 🔒 Safety & Exclusion

### Exclude Users Who:
- Have active subscriptions
- Received reactivation campaign emails (last 90 days)
- Received re-engagement emails (last 90 days)
- Received win-back emails (last 90 days)
- Already converted to users (unless they haven't engaged)

### Overlap Prevention
- This funnel is **complementary** to reactivation campaign
- Users can receive both (different goals)
- Or we can make them mutually exclusive (user preference)

---

## 💡 Implementation Notes

### 1. **Brand Blueprint Integration**
- Blueprint already exists at `/blueprint`
- Grid generation already works
- Just need to track completion for email triggers

### 2. **Maya Free Features**
- Chat: Already free (no credit check for chat)
- Feed Planning: Already free (no credit check for planning)
- Caption Generation: Already free (no credit check for captions)
- **Only image/video generation requires credits**

### 3. **Tracking Requirements**
- Track blueprint completion (`blueprint_completed`)
- Track grid generation (`grid.generated`)
- Track user signup (`converted_to_user`)
- Track Maya engagement (chat messages count)

---

## 📈 Expected Outcomes

### Conversion Funnel
1. **Email 1 → Blueprint Signup:** 30-40% (high, it's free)
2. **Blueprint → Grid Generation:** 60-70% (they're already engaged)
3. **Grid → Maya Signup:** 20-30% (requires account creation)
4. **Maya Signup → Engagement:** 50-60% (they signed up, they'll try it)
5. **Engagement → Membership:** 10-15% (soft conversion)

### Overall Conversion Rate
- **Email 1 → Membership:** ~2-3% (similar to reactivation campaign)
- **But:** Higher engagement, better user experience, lower friction

---

## 🆚 Comparison: Reactivation vs Discovery

| Aspect | Reactivation Campaign | Discovery Funnel |
|--------|----------------------|------------------|
| **Approach** | Direct conversion (8 emails) | Hands-on testing (5 emails) |
| **Entry Point** | "Here's what I built" | "Try it for free" |
| **Commitment** | Reading about features | Actually using the product |
| **Timeline** | 25 days | 10 days |
| **Best For** | People who want to learn first | People who want to try first |
| **Conversion** | ~2-3% | ~2-3% (but better engagement) |

---

## ✅ Next Steps

1. **Approve Strategy:** Confirm this approach aligns with goals
2. **Create Email Templates:** 5 new templates for discovery funnel
3. **Build Cron Route:** `/api/cron/blueprint-discovery-funnel/route.ts`
4. **Add Tracking:** Track blueprint completion, grid generation, Maya engagement
5. **Test Flow:** End-to-end test of entire funnel
6. **Launch:** Enable with `BLUEPRINT_DISCOVERY_FUNNEL_ENABLED=true`

---

## 🤔 Questions to Consider

1. **Overlap:** Should users receive both reactivation AND discovery campaigns, or choose one?
2. **Timing:** Should discovery funnel run in parallel, or after reactivation?
3. **Priority:** Which funnel should take precedence if user qualifies for both?
4. **Free Credits:** Should we grant free credits (like Day 14 reactivation) for discovery signups?
5. **Grid Generation:** Should free grid generation be limited (one-time) or unlimited for blueprint subscribers?

---

**End of Proposal**
