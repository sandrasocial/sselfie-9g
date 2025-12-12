# Advanced Email Automation System - Complete Guide

## 🎯 Overview

This system implements **fully automated** A/B testing, segmentation, re-engagement campaigns, and email previews with minimal manual work.

---

## ✅ What's Been Implemented

### 1. **A/B Testing System** (Fully Automated)
- ✅ Automatic audience splitting (50/50 or custom ratio)
- ✅ Automatic result tracking (opens, clicks, conversions)
- ✅ Automatic winner declaration based on statistical significance
- ✅ Database tables: `email_ab_tests`, `email_ab_test_results`

### 2. **Advanced Segmentation** (Fully Automated)
- ✅ 9 pre-defined auto-refresh segments
- ✅ Automatic daily refresh via cron job
- ✅ Dynamic criteria-based segmentation
- ✅ Database tables: `email_segments`, `email_segment_members`

### 3. **Re-Engagement Campaigns** (Fully Automated)
- ✅ Automatic identification of inactive subscribers
- ✅ Automatic campaign sending based on triggers
- ✅ Prevents duplicate sends
- ✅ Database tables: `reengagement_campaigns`, `reengagement_sends`

### 4. **Email Preview System** (On-Demand)
- ✅ HTML/text preview generation
- ✅ Spam score calculation
- ✅ Rendering issue detection
- ✅ Database table: `email_previews`

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```bash
npx tsx scripts/setup-advanced-email-automation.ts
```

This creates all necessary tables and pre-defined segments.

### Step 2: Verify Cron Jobs

The following cron jobs are automatically configured in `vercel.json`:

- **3 AM UTC**: Refresh all segments (`/api/cron/refresh-segments`)
- **12 PM UTC**: Run re-engagement campaigns (`/api/cron/reengagement-campaigns`)

### Step 3: Deploy

Push to main branch - Vercel will auto-deploy and activate cron jobs.

---

## 📊 How It Works (Fully Automated)

### A/B Testing

**Creating an A/B Test:**

```typescript
import { createABTest, runABTest } from "@/lib/email/ab-testing"

// 1. Create two campaign variants in admin_email_campaigns
// 2. Create A/B test
const test = await createABTest({
  testName: "Subject Line Test - January 2025",
  testType: "subject_line",
  variantA: { campaignId: 10, subjectLine: "Get 50% Off Today!" },
  variantB: { campaignId: 11, subjectLine: "Limited Time: 50% Off" },
  splitRatio: 0.5, // 50/50 split
  minSampleSize: 100, // Need 100 recipients before declaring winner
})

// 3. Run test (automatically splits audience)
const recipients = ["email1@example.com", "email2@example.com", ...]
await runABTest(test.id, recipients)
```

**Automatic Tracking:**
- Resend webhook automatically updates A/B test results
- Opens, clicks, and conversions are tracked automatically
- No manual work needed!

**Declaring Winner:**
```typescript
import { analyzeABTest } from "@/lib/email/ab-testing"

// Automatically analyzes results and declares winner
const analysis = await analyzeABTest(testId)
// Returns: { variantA: {...}, variantB: {...}, winner: "A" | "B" | null }
```

---

### Advanced Segmentation

**Pre-Defined Segments (Auto-Refreshed Daily):**

1. **highly_engaged** - Opened 3+ emails, clicked in last 7 days
2. **moderately_engaged** - Opened 1-2 emails in last 30 days
3. **inactive_30d** - No opens in last 30 days
4. **inactive_60d** - No opens in last 60 days
5. **never_purchased** - Never made a purchase
6. **one_time_buyers** - Made exactly one purchase
7. **repeat_customers** - Made 2+ purchases
8. **blueprint_completers** - Completed brand blueprint
9. **blueprint_non_converted** - Completed blueprint but never purchased

**Using Segments:**

```typescript
import { getSegmentMembers } from "@/lib/email/segmentation"

// Get members of a segment
const members = await getSegmentMembers(segmentId)
// Returns: ["email1@example.com", "email2@example.com", ...]

// Use in campaign targeting
const campaign = {
  target_audience: {
    segment_id: segmentId, // Use segment instead of resend_segment_id
  }
}
```

**Creating Custom Segments:**

```typescript
import { createSegment } from "@/lib/email/segmentation"

const segment = await createSegment(
  "high_value_customers",
  "purchase_history",
  {
    purchase_count: { $gte: 2 }, // 2+ purchases
    last_opened_days: 30, // Active in last 30 days
  },
  "Customers with 2+ purchases who are still engaged",
  true // auto-refresh
)
```

**Automatic Refresh:**
- Cron job runs daily at 3 AM UTC
- All segments with `is_auto_refreshed = TRUE` are updated
- Member counts are automatically recalculated
- **Zero manual work!**

---

### Re-Engagement Campaigns

**Setting Up a Re-Engagement Campaign:**

```sql
INSERT INTO reengagement_campaigns (
  campaign_name,
  trigger_segment_id,
  trigger_condition,
  email_template_type,
  subject_line,
  body_html,
  body_text,
  offer_code,
  offer_amount,
  send_frequency_days,
  is_active
)
VALUES (
  'Win Back Inactive 30d',
  (SELECT id FROM email_segments WHERE segment_name = 'inactive_30d'),
  'inactive_30d',
  'win_back',
  'We Miss You - Here''s $10 Off',
  '<html>...</html>',
  'Plain text version...',
  'WINBACK10',
  10,
  30, -- Check every 30 days
  TRUE
);
```

**How It Works:**
1. Cron job runs daily at 12 PM UTC
2. Checks all active re-engagement campaigns
3. For each campaign:
   - Gets members from trigger segment
   - Filters out users who already received this campaign
   - Sends email to eligible members
   - Tracks sends to prevent duplicates
4. Updates campaign stats automatically

**Fully Automated:**
- No manual sending needed
- Prevents duplicate sends automatically
- Tracks opens/clicks via webhook
- Updates conversion stats automatically

---

### Email Preview System

**Using Email Preview API:**

```typescript
// POST /api/admin/email/preview
const response = await fetch("/api/admin/email/preview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    campaignId: 123,
    html: "<html>...</html>",
    text: "Plain text version...",
    subject: "Email Subject",
  }),
})

const { preview, spamScore, spamIssues, renderingIssues, recommendations } = await response.json()
```

**Returns:**
- `spamScore`: 0-100 (lower is better)
- `spamIssues`: Array of issues found
- `renderingIssues`: Array of rendering problems
- `recommendations`: Suggestions for improvement

**Spam Checks:**
- Excessive capitalization
- Too many links
- Spam keywords
- Missing alt text
- Missing plain text version
- Subject line issues

---

## 🎯 Usage Examples

### Example 1: A/B Test Subject Lines

```typescript
// 1. Create two campaigns with different subject lines
const campaignA = await createCampaign({
  subject_line: "Get 50% Off Today!",
  // ... other fields
})

const campaignB = await createCampaign({
  subject_line: "Limited Time: 50% Off",
  // ... other fields
})

// 2. Create A/B test
const test = await createABTest({
  testName: "Subject Line Test",
  testType: "subject_line",
  variantA: { campaignId: campaignA.id },
  variantB: { campaignId: campaignB.id },
})

// 3. Run test (automatically splits audience)
const recipients = await getSegmentMembers(segmentId)
await runABTest(test.id, recipients)

// 4. After 24-48 hours, analyze results
const results = await analyzeABTest(test.id)
console.log(`Winner: Variant ${results.winner}`)
```

### Example 2: Send to Inactive Subscribers

```typescript
// 1. Get inactive segment (auto-refreshed daily)
const inactiveSegment = await sql`
  SELECT id FROM email_segments WHERE segment_name = 'inactive_30d'
`

// 2. Create campaign targeting this segment
const campaign = await createCampaign({
  target_audience: {
    segment_id: inactiveSegment[0].id,
  },
  // ... other fields
})

// 3. Campaign executor automatically uses segment members
```

### Example 3: Automated Re-Engagement

```sql
-- Create re-engagement campaign (one-time setup)
INSERT INTO reengagement_campaigns (
  campaign_name,
  trigger_segment_id,
  email_template_type,
  subject_line,
  body_html,
  body_text,
  offer_code,
  offer_amount,
  is_active
)
SELECT 
  'Win Back Inactive 60d',
  (SELECT id FROM email_segments WHERE segment_name = 'inactive_60d'),
  'win_back',
  'We Miss You - $15 Off',
  '<html>...</html>',
  'Plain text...',
  'WINBACK15',
  15,
  TRUE;
```

**That's it!** The cron job will automatically:
- Check for inactive subscribers daily
- Send re-engagement emails
- Track results
- Prevent duplicates

---

## 📈 Monitoring & Analytics

### View Segment Stats:

```sql
SELECT 
  segment_name,
  member_count,
  last_refreshed_at,
  is_auto_refreshed
FROM email_segments
ORDER BY member_count DESC;
```

### View A/B Test Results:

```sql
SELECT 
  t.test_name,
  t.status,
  t.winner_variant,
  COUNT(DISTINCT r.recipient_email) FILTER (WHERE r.variant = 'A') as variant_a_sent,
  COUNT(DISTINCT r.recipient_email) FILTER (WHERE r.variant = 'B') as variant_b_sent,
  COUNT(DISTINCT r.recipient_email) FILTER (WHERE r.variant = 'A' AND r.converted = TRUE) as variant_a_converted,
  COUNT(DISTINCT r.recipient_email) FILTER (WHERE r.variant = 'B' AND r.converted = TRUE) as variant_b_converted
FROM email_ab_tests t
LEFT JOIN email_ab_test_results r ON r.test_id = t.id
GROUP BY t.id;
```

### View Re-Engagement Campaign Performance:

```sql
SELECT 
  campaign_name,
  total_sent,
  total_opened,
  total_clicked,
  total_converted,
  ROUND(total_converted::numeric / NULLIF(total_sent, 0) * 100, 2) as conversion_rate
FROM reengagement_campaigns
WHERE is_active = TRUE;
```

---

## 🔧 Manual Steps Required

### 1. Run Migration Script

```bash
npx tsx scripts/setup-advanced-email-automation.ts
```

### 2. Set Up Re-Engagement Campaigns (One-Time)

Create your first re-engagement campaign:

```sql
INSERT INTO reengagement_campaigns (
  campaign_name,
  trigger_segment_id,
  trigger_condition,
  email_template_type,
  subject_line,
  body_html,
  body_text,
  offer_code,
  offer_amount,
  send_frequency_days,
  is_active
)
VALUES (
  'Win Back Inactive 30d',
  (SELECT id FROM email_segments WHERE segment_name = 'inactive_30d'),
  'inactive_30d',
  'win_back',
  'We Miss You - Here''s $10 Off',
  '<html>Your email HTML here</html>',
  'Plain text version here',
  'WINBACK10',
  10,
  30,
  TRUE
);
```

### 3. Deploy to Vercel

Push to main - cron jobs activate automatically.

---

## ✅ What's Fully Automated

- ✅ **Segment Refresh**: Daily at 3 AM UTC
- ✅ **Re-Engagement Sending**: Daily at 12 PM UTC
- ✅ **A/B Test Tracking**: Via Resend webhook
- ✅ **Winner Declaration**: Automatic when sample size reached
- ✅ **Duplicate Prevention**: Automatic for re-engagement
- ✅ **Stats Updates**: Automatic for all campaigns

---

## 🎯 Expected Results

### Segmentation:
- **highly_engaged**: ~200-500 members (top 10-20% of list)
- **inactive_30d**: ~500-1,000 members (20-40% of list)
- **inactive_60d**: ~200-500 members (10-20% of list)

### Re-Engagement:
- **Open Rate**: 15-25% (inactive subscribers)
- **Click Rate**: 2-5%
- **Conversion Rate**: 1-3% (with discount offer)

### A/B Testing:
- **Typical Improvement**: 10-30% better conversion
- **Sample Size Needed**: 100-500 recipients per variant
- **Time to Results**: 24-48 hours

---

## 🚀 Next Steps

1. **Run Migration**: `npx tsx scripts/setup-advanced-email-automation.ts`
2. **Create Re-Engagement Campaign**: Use SQL example above
3. **Deploy**: Push to main branch
4. **Monitor**: Check segment stats and campaign performance daily

**Everything else is automated!** 🎉
