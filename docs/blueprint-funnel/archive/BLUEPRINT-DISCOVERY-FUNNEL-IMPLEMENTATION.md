# Blueprint Discovery Funnel - Implementation

**Date:** January 8, 2025  
**Status:** ✅ Complete  
**Goal:** Guide ALL subscribers (except blueprint_subscribers) through a free, hands-on experience

---

## 📋 Overview

The Blueprint Discovery Funnel is a **soft-entry funnel** that lets subscribers test the system before committing to payment. It's complementary to the reactivation campaign, focusing on hands-on testing rather than reading about features.

### Target Audience

- **Included:** ALL subscribers from Resend (freebie_subscribers, general subscribers, etc.)
- **Excluded:** 
  - `blueprint_subscribers` (they've already completed the blueprint)
  - Active subscribers
  - Users who received reactivation/re-engagement/win-back emails (last 90 days)

### Campaign Structure

| Email | Day | Trigger | Audience |
|-------|-----|---------|----------|
| **Email 1** | 0 | Entry point | All eligible subscribers |
| **Email 2** | 3 | Blueprint completed | blueprint_subscribers only |
| **Email 3** | 5 | Grid generated | blueprint_subscribers only |
| **Email 4** | 7 | User signed up | blueprint_subscribers who converted |
| **Email 5** | 10 | Maya engaged | Users who sent Maya messages |

---

## 📧 Email Sequence Details

### Email 1: "Remember the selfie guide? Here's what's next."
**Subject:** "Remember the selfie guide? Here's what's next."

**Content:**
- References original selfie guide download
- Introduces Brand Blueprint as free way to test the system
- Lists benefits: 30-day calendar, free grid preview, caption templates, visibility score
- **CTA:** "Get your free blueprint →" (links to `/blueprint`)

**Timing:** Sent immediately when user is eligible (hasn't completed blueprint)

**UTM:** `?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email1`

---

### Email 2: "Your blueprint is ready — here's what you can do with it."
**Subject:** "Your blueprint is ready — here's what you can do with it."

**Content:**
- Only sent to users who completed Brand Blueprint
- "You just got your personalized content strategy"
- Introduces free Instagram grid preview (3x3 grid)
- **CTA:** "Generate your free grid →" (links to blueprint page)

**Timing:** Sent 3 days after blueprint completion

**UTM:** `?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email2`

---

### Email 3: "Meet Maya — your AI creative director."
**Subject:** "Meet Maya — your AI creative director."

**Content:**
- Only sent to users who generated grid
- Introduces Maya (AI stylist, strategist, photographer)
- Explains free features (chat, planning, captions)
- **CTA:** "Try Maya free →" (links to `/studio`)

**Timing:** Sent 5 days after grid generation

**UTM:** `?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email3`

---

### Email 4: "See how creators use Maya to plan their feeds."
**Subject:** "See how creators use Maya to plan their feeds."

**Content:**
- Only sent to users who signed up (converted_to_user)
- Social proof: "Creators are using Maya to plan 30 days of content in minutes"
- Example: "Ask Maya: 'Create an Instagram feed for my coaching business'"
- **CTA:** "Start planning with Maya →" (links to studio with Maya tab)

**Timing:** Sent 7 days after user signup

**UTM:** `?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email4`

---

### Email 5: "Your free grid is ready — want to generate more?"
**Subject:** "Your free grid is ready — want to generate more?"

**Content:**
- Only sent to users who engaged with Maya (sent messages)
- "You've tested the blueprint, met Maya, and seen your grid"
- Soft pitch for Studio membership
- **CTA:** "See Studio membership →" (links to `/checkout/membership`)

**Timing:** Sent 10 days after first Maya message

**UTM:** `?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email5`

---

## 🗂️ Files Created

### 1. Email Templates
**Location:** `/lib/email/templates/`

- **`blueprint-discovery-1.tsx`** - "Remember the selfie guide?"
- **`blueprint-discovery-2.tsx`** - "Your blueprint is ready"
- **`blueprint-discovery-3.tsx`** - "Meet Maya"
- **`blueprint-discovery-4.tsx`** - "See how creators use Maya"
- **`blueprint-discovery-5.tsx`** - "Your free grid is ready"
- **`blueprint-discovery-sequence.tsx`** - Sequence wrapper (exports all 5 templates)

### 2. Cron Route
**File:** `/app/api/cron/blueprint-discovery-funnel/route.ts`

- **Schedule:** Daily at 12 PM UTC
- **Pattern:** Based on `nurture-sequence/route.ts`
- **Email Types:** `blueprint-discovery-{1,2,3,4,5}`
- **Safety Gate:** `BLUEPRINT_DISCOVERY_FUNNEL_ENABLED` environment flag

### 3. Cron Registration
**File:** `vercel.json`

```json
{
  "path": "/api/cron/blueprint-discovery-funnel",
  "schedule": "0 12 * * *"
}
```

---

## 🎯 Segmentation Logic

### Email 1: Entry Point
```sql
-- All subscribers EXCEPT blueprint_subscribers
WHERE email NOT IN (SELECT email FROM blueprint_subscribers)
AND email NOT IN (active subscribers)
AND email NOT IN (reactivation/re-engagement/win-back recipients)
```

### Email 2: Post-Blueprint
```sql
-- blueprint_subscribers who completed blueprint 3 days ago
WHERE blueprint_completed = true
AND blueprint_completed_at <= NOW() - INTERVAL '3 days'
AND blueprint_completed_at > NOW() - INTERVAL '4 days'
AND NOT active subscriber
```

### Email 3: Post-Grid
```sql
-- blueprint_subscribers who generated grid 5 days ago
WHERE grid_generated = true
AND grid_generated_at <= NOW() - INTERVAL '5 days'
AND grid_generated_at > NOW() - INTERVAL '6 days'
AND NOT active subscriber
```

### Email 4: Post-Signup
```sql
-- blueprint_subscribers who converted to user 7 days ago
WHERE converted_to_user = true
AND converted_at <= NOW() - INTERVAL '7 days'
AND converted_at > NOW() - INTERVAL '8 days'
AND NOT active subscriber
```

### Email 5: Post-Maya Engagement
```sql
-- Users who sent Maya messages 10 days ago
WHERE user_id IN (
  SELECT user_id FROM maya_chats mc
  JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
  WHERE mcm.role = 'user'
  AND mcm.created_at <= NOW() - INTERVAL '10 days'
  AND mcm.created_at > NOW() - INTERVAL '11 days'
)
AND email IN (SELECT email FROM blueprint_subscribers)
AND NOT active subscriber
```

---

## ⚙️ Configuration

### Environment Flag
**Variable:** `BLUEPRINT_DISCOVERY_FUNNEL_ENABLED`

**Default:** `false` (disabled by default for safety)

**Usage:**
```typescript
const discoveryEnabled = process.env.BLUEPRINT_DISCOVERY_FUNNEL_ENABLED === "true"
```

**Purpose:** Safety gate to enable/disable entire funnel without code changes

### Email Control
The funnel respects existing email control flags:
- `EMAIL_SENDING_ENABLED` (global kill switch)
- `EMAIL_TEST_MODE` (test mode with whitelist)
- Rate limiting (built into `send-email.ts`)

---

## 🔒 Safety Features

### 1. Exclusion Logic
- ✅ Excludes `blueprint_subscribers` from Email 1 (they've already done it)
- ✅ Excludes active subscribers (all emails)
- ✅ Excludes reactivation recipients (last 90 days)
- ✅ Excludes re-engagement recipients (last 90 days)
- ✅ Excludes win-back recipients (last 90 days)

### 2. Deduplication
- Checks `email_logs` table before sending
- Prevents duplicate sends of same email type
- Double-checks at both query and send time

### 3. Sequential Progression
- Email 2 only sent if blueprint completed
- Email 3 only sent if grid generated
- Email 4 only sent if user signed up
- Email 5 only sent if Maya engaged

### 4. Batch Limits
- Processes up to 100 emails per day per email type
- Prevents overwhelming email service
- Allows gradual rollout

---

## 📊 Logging & Tracking

### Email Logs
All emails are logged to `email_logs` table with:
- `user_email`: Recipient email
- `email_type`: `blueprint-discovery-{1,2,3,4,5}`
- `status`: `sent`, `failed`, or `error`
- `sent_at`: Timestamp
- `resend_message_id`: Resend API message ID

### Cron Logger
Uses `createCronLogger("blueprint-discovery-funnel")` for:
- Execution tracking
- Success/failure metrics
- Error logging

### Admin Error Log
Errors are logged to `admin_error_log` with:
- `toolName`: `cron:blueprint-discovery-funnel:email-{1,2,3,4,5}`
- `error`: Error message
- `context`: Email address

---

## 🔗 UTM Tracking

All email links include UTM parameters for Growth Dashboard tracking:

**Format:**
```
?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email{X}
```

**Parameters:**
- `utm_source`: `colddiscovery` (consistent across all emails)
- `utm_campaign`: `blueprint_funnel` (consistent across all emails)
- `utm_content`: `email1`, `email2`, `email3`, `email4`, or `email5` (specific to each email)

---

## ✅ Testing Checklist

### Pre-Production
- [x] Set `BLUEPRINT_DISCOVERY_FUNNEL_ENABLED=false` initially
- [ ] Verify Resend contacts are accessible
- [ ] Test cron route manually (bypass CRON_SECRET in dev)
- [ ] Verify Email 1 excludes blueprint_subscribers
- [ ] Verify Email 2 only targets blueprint_subscribers
- [ ] Verify Email 3 only targets grid generators
- [ ] Verify Email 4 only targets converted users
- [ ] Verify Email 5 only targets Maya-engaged users
- [ ] Test all 5 email template rendering
- [ ] Test email sending in test mode (`EMAIL_TEST_MODE=true`)
- [ ] Verify UTM tracking parameters
- [ ] Verify no overlap with reactivation campaign

### Production Rollout
- [ ] Enable `BLUEPRINT_DISCOVERY_FUNNEL_ENABLED=true` in Vercel
- [ ] Monitor first batch (Email 1)
- [ ] Verify email_logs entries
- [ ] Check Resend delivery status
- [ ] Monitor for errors in admin error log
- [ ] Track conversion metrics
- [ ] Verify no overlap with other campaigns

---

## 🆚 Comparison: Reactivation vs Discovery

| Aspect | Reactivation Campaign | Discovery Funnel |
|--------|----------------------|------------------|
| **Approach** | Direct conversion (8 emails) | Hands-on testing (5 emails) |
| **Entry Point** | "Here's what I built" | "Try it for free" |
| **Commitment** | Reading about features | Actually using the product |
| **Timeline** | 25 days | 10 days |
| **Target** | cold_users segment | ALL subscribers (except blueprint) |
| **Best For** | People who want to learn first | People who want to try first |
| **Conversion** | ~2-3% | ~2-3% (but better engagement) |

---

## 📝 Notes

### Overlap Prevention
- **Reactivation Campaign:** Excludes users who received reactivation emails (last 90 days)
- **Re-engagement Campaigns:** Excludes users who received re-engagement emails (last 90 days)
- **Win-Back Sequence:** Excludes users who received win-back emails (last 90 days)
- **Blueprint Subscribers:** Excluded from Email 1 (they've already done it)

### Free Features Highlighted
- **Brand Blueprint:** Free, no credit card
- **Grid Preview:** Free 3x3 Instagram grid
- **Maya Chat:** Free (no credits for chat/planning/captions)
- **Feed Planning:** Free (no credits needed)
- **Caption Generation:** Free (no credits needed)
- **Only image/video generation costs credits**

### Voice & Tone
- Consistent with Sandra's voice: warm, personal, direct
- No emojis in UI (only in emails where appropriate)
- Stone palette design system
- Minimal, clean layout

---

**End of Implementation Documentation**
