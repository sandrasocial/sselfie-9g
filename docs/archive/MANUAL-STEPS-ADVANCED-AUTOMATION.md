# Manual Steps: Advanced Email Automation Setup

## ✅ What's Been Implemented

All automation systems are **fully automated** - minimal manual work required!

---

## 🔧 Required Manual Steps

### Step 1: Run Database Migration (5 minutes)

```bash
npx tsx scripts/setup-advanced-email-automation.ts
```

This creates:
- A/B testing tables
- Segmentation tables
- Re-engagement campaign tables
- Email preview tables
- 9 pre-defined auto-refresh segments

**Expected Output:**
```
✅ Advanced email automation tables created successfully!
📊 Created tables: [list of tables]
🎯 Pre-defined segments created: [list of segments]
```

---

### Step 2: Create Your First Re-Engagement Campaign (10 minutes)

**Option A: Using SQL (Recommended)**

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
  '<html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1>We Miss You!</h1>
      <p>Hi there,</p>
      <p>We noticed you haven''t been around lately. We''d love to have you back!</p>
      <p>Use code <strong>WINBACK10</strong> for $10 off your next purchase.</p>
      <p>This offer expires in 7 days.</p>
      <a href="https://sselfie.ai/studio?code=WINBACK10" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; display: inline-block; margin-top: 20px;">
        Claim Your Discount
      </a>
    </body>
  </html>',
  'We Miss You! Use code WINBACK10 for $10 off. Valid for 7 days. Visit https://sselfie.ai/studio?code=WINBACK10',
  'WINBACK10',
  10,
  30,
  TRUE
);
```

**Option B: Using Admin Dashboard (Future)**

Once admin UI is built, you can create campaigns via the dashboard.

---

### Step 3: Deploy to Vercel (Automatic)

Just push to main branch - cron jobs activate automatically:

- **3 AM UTC**: Segment refresh (`/api/cron/refresh-segments`)
- **12 PM UTC**: Re-engagement campaigns (`/api/cron/reengagement-campaigns`)

---

## ✅ That's It!

Everything else is **fully automated**:

- ✅ Segments refresh daily automatically
- ✅ Re-engagement campaigns send automatically
- ✅ A/B tests track results automatically
- ✅ Winners declared automatically
- ✅ Duplicate sends prevented automatically

---

## 🧪 Testing

### Test Segment Refresh:

```bash
curl -X GET https://sselfie.ai/api/cron/refresh-segments \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Test Re-Engagement:

```bash
curl -X GET https://sselfie.ai/api/cron/reengagement-campaigns \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Check Segment Members:

```sql
SELECT 
  s.segment_name,
  s.member_count,
  s.last_refreshed_at,
  COUNT(sm.user_email) as actual_members
FROM email_segments s
LEFT JOIN email_segment_members sm ON sm.segment_id = s.id
GROUP BY s.id
ORDER BY s.member_count DESC;
```

---

## 📊 Monitoring

### View All Segments:

```sql
SELECT 
  segment_name,
  segment_type,
  member_count,
  last_refreshed_at,
  is_auto_refreshed
FROM email_segments
ORDER BY member_count DESC;
```

### View Re-Engagement Performance:

```sql
SELECT 
  campaign_name,
  total_sent,
  total_opened,
  total_clicked,
  total_converted,
  ROUND(total_converted::numeric / NULLIF(total_sent, 0) * 100, 2) as conversion_rate,
  last_sent_at
FROM reengagement_campaigns
WHERE is_active = TRUE
ORDER BY last_sent_at DESC;
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
GROUP BY t.id
ORDER BY t.created_at DESC;
```

---

## 🎯 Expected Results After Setup

### Segments (Auto-Refreshed Daily):
- **highly_engaged**: ~200-500 members
- **inactive_30d**: ~500-1,000 members
- **inactive_60d**: ~200-500 members
- **never_purchased**: ~2,000-2,500 members
- **blueprint_completers**: ~2,700 members

### Re-Engagement Campaigns:
- Sends automatically to inactive subscribers
- Prevents duplicate sends
- Tracks opens/clicks automatically
- Updates conversion stats

### A/B Tests:
- Automatic audience splitting
- Automatic result tracking
- Automatic winner declaration

---

## 🚀 Next Steps

1. ✅ Run migration script
2. ✅ Create first re-engagement campaign
3. ✅ Deploy to Vercel
4. ✅ Monitor segment refresh (check logs after 3 AM UTC)
5. ✅ Monitor re-engagement sends (check logs after 12 PM UTC)

**Everything else runs automatically!** 🎉
