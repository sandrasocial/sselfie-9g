# Email System Architecture - Complete Explanation

## Overview

Your email system uses **Resend** for email delivery and **Resend Segments** for audience targeting. Here's how everything connects:

---

## 🔄 Part 1: How New Subscribers Are Segmented

### Step 1: User Signs Up or Purchases

When someone subscribes or purchases, they're automatically added to Resend:

**A. Freebie Subscribers** (`/api/freebie/subscribe`)
- Added to Resend audience with tags:
  - `source: "freebie-subscriber"`
  - `status: "lead"`
  - `product: "sselfie-guide"`
  - `journey: "nurture"`

**B. Blueprint Subscribers** (`/api/blueprint/subscribe`)
- Added to Resend audience with tags:
  - `source: "blueprint-subscriber"`
  - `status: "lead"`
  - `product: "sselfie-brand-blueprint"`
  - `journey: "nurture"`

**C. Paying Customers** (`/api/webhooks/stripe`)
- Added to Resend audience with tags:
  - `source: "stripe-checkout"`
  - `status: "customer"`
  - `product: "studio-membership"` or `"one-time-session"`
  - `journey: "onboarding"`
  - `converted: "true"`
- **Also automatically added to Beta Customers segment** (if `RESEND_BETA_SEGMENT_ID` is set)

### Step 2: Periodic Segmentation Sync (Cron Job)

**Daily at 2:00 AM UTC**, a cron job runs (`/api/cron/sync-audience-segments`) that:

1. **Fetches ALL contacts** from Resend audience (2,700+ contacts)
2. **Checks each contact** against your Neon database to identify:
   - **Beta Users**: Active `sselfie_studio_membership` subscriptions (not test mode)
   - **Paid Users**: Active subscriptions OR credit transactions with purchases
   - **Cold Users**: No email activity in last 30 days (from `email_logs` table)
3. **Adds contacts to Resend segments**:
   - `all_subscribers` - Everyone (Segment ID: `3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd`)
   - `beta_users` - Paying customers (Segment ID: `31080fb1-e957-4b41-af72-6f042e4fa869`)
   - `paid_users` - Anyone who paid (Segment ID: `f7ed7f32-b103-400a-a8e8-ddbbe0e4d97b`)
   - `cold_users` - Inactive users (Segment ID: `e515e2d6-1f0e-4a4c-beec-323b8758be61`)

**Important**: The cron job processes contacts in batches of 5 with 5-second delays to respect Resend's rate limits (2 requests/second).

---

## 📧 Part 2: How Emails Are Automatically Sent

### Method 1: Resend Broadcasts (Direct Sending)

When you create a broadcast in Resend (via admin agent or manually):

1. **You specify a segment** (e.g., `cold_users`, `beta_users`)
2. **Resend automatically sends** to all contacts in that segment
3. **No code execution needed** - Resend handles delivery

**Example**: 
- Admin agent creates broadcast targeting `cold_users` segment
- Resend sends to all 500+ contacts in that segment automatically

### Method 2: Scheduled Campaigns (Database-Driven)

For automated nurture sequences and scheduled emails:

1. **Campaign created** in `admin_email_campaigns` table with:
   - `campaign_type`: e.g., `nurture_day_1`, `welcome_back_reengagement`
   - `target_audience`: JSON like `{resend_segment_id: "cold_users"}`
   - `scheduled_for`: Future date/time
   - `status`: `"scheduled"`

2. **Executor runs** (`/api/admin/email/run-scheduled-campaigns`):
   - Finds campaigns where `scheduled_for <= NOW()` and `status = 'scheduled'`
   - Resolves recipients from `target_audience`:
     - If `resend_segment_id` → Queries database for users matching that segment
     - If `all_users: true` → Gets all users from database
     - If `recipients: [...]` → Uses explicit email list
   - Generates email content using templates
   - Sends emails via `sendEmail()` function
   - Updates campaign status to `"sent"` or `"failed"`

**Example Flow**:
```
1. User purchases → Stripe webhook triggers
2. Creates 3 nurture campaigns in admin_email_campaigns:
   - nurture_day_1 (scheduled_for = NOW() + 1 day)
   - nurture_day_3 (scheduled_for = NOW() + 3 days)
   - nurture_day_7 (scheduled_for = NOW() + 7 days)
3. Executor runs daily, finds due campaigns
4. Sends emails to user's email address
```

---

## 🏷️ Part 3: Tags vs Segments

### Tags (Contact-Level Metadata)
- **Stored on individual contacts** in Resend
- **Examples**: `status: "customer"`, `product: "studio-membership"`, `source: "stripe-checkout"`
- **Used for**: Identifying contact properties, filtering in Resend UI
- **Set when**: Contact is created/updated (webhooks, signups)

### Segments (Audience Groups)
- **Groups of contacts** in Resend
- **Examples**: `beta_users`, `cold_users`, `all_subscribers`
- **Used for**: Targeting broadcasts, bulk email sending
- **Updated by**: Cron job (`/api/cron/sync-audience-segments`)

**Key Difference**: 
- **Tags** = Contact properties (what they are)
- **Segments** = Audience groups (who to send to)

---

## 🔗 Part 4: Complete Flow Examples

### Example 1: New Customer Purchase

```
1. Customer completes Stripe checkout
   ↓
2. Stripe webhook fires → /api/webhooks/stripe
   ↓
3. Contact added to Resend with tags:
   - status: "customer"
   - product: "studio-membership"
   ↓
4. Contact added to Beta Customers segment (if RESEND_BETA_SEGMENT_ID set)
   ↓
5. Welcome email sent immediately
   ↓
6. 3 nurture campaigns created in admin_email_campaigns:
   - Day 1, Day 3, Day 7
   ↓
7. Next day: Cron job runs, adds contact to:
   - all_subscribers segment
   - beta_users segment
   - paid_users segment
```

### Example 2: Cold User Re-engagement

```
1. Admin agent creates broadcast targeting "cold_users" segment
   ↓
2. Resend sends to all contacts in cold_users segment
   ↓
3. OR: Campaign created in admin_email_campaigns with:
   - target_audience: {resend_segment_id: "cold_users"}
   - scheduled_for: Future date
   ↓
4. Executor runs, resolves recipients from database
   (finds users with no email_logs in 30 days)
   ↓
5. Sends email using welcome_back_reengagement template
```

---

## ⚙️ Part 5: Configuration

### Environment Variables Needed:

```bash
# Resend API
RESEND_API_KEY=re_xxx
RESEND_AUDIENCE_ID=xxx  # Main audience ID

# Segment IDs (from Resend dashboard)
RESEND_BETA_SEGMENT_ID=31080fb1-e957-4b41-af72-6f042e4fa869
# all_subscribers: 3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd
# beta_users: 31080fb1-e957-4b41-af72-6f042e4fa869
# paid_users: f7ed7f32-b103-400a-a8e8-ddbbe0e4d97b
# cold_users: e515e2d6-1f0e-4a4c-beec-323b8758be61

# Cron Job
CRON_SECRET=your-secret-here
```

### Cron Job Setup:

Configured in `vercel.json`:
- **Runs**: Daily at 2:00 AM UTC
- **Endpoint**: `/api/cron/sync-audience-segments`
- **Protected by**: `CRON_SECRET` header

---

## 📊 Part 6: Current Segmentation Status

Based on your setup:

- **Total Contacts**: 2,700+ in Resend
- **Segments**:
  - `all_subscribers`: Everyone (auto-assigned)
  - `beta_users`: ~100 paying customers
  - `paid_users`: ~100+ (includes one-time purchases)
  - `cold_users`: Users with no email activity in 30 days

**Segmentation happens**:
- **Immediately**: When users purchase (added to beta segment)
- **Daily**: Cron job syncs all contacts to correct segments

---

## 🎯 Part 7: How to Send Emails

### Option 1: Resend Broadcasts (Recommended for One-Offs)
1. Create broadcast in Resend dashboard
2. Select segment (e.g., `cold_users`)
3. Write email, send immediately

### Option 2: Admin Agent (For AI-Generated Emails)
1. Ask agent: "Create a welcome back email for cold users"
2. Agent generates HTML email + JSON
3. Click "Create Broadcast in Resend" button
4. Email created in Resend, ready to send

### Option 3: Scheduled Campaigns (For Automation)
1. Campaign created in `admin_email_campaigns` table
2. Set `scheduled_for` date
3. Executor runs automatically and sends

---

## 🔍 Part 8: Troubleshooting

**Q: Why isn't a user in the right segment?**
- Check if cron job ran (last 24 hours)
- Verify user has correct tags in Resend
- Check database for subscription/purchase records

**Q: Why didn't an email send?**
- Check `email_logs` table for errors
- Verify campaign `status` in `admin_email_campaigns`
- Check Resend dashboard for broadcast status

**Q: How do I manually segment a user?**
- Use `/api/admin/audience/sync-segments` with specific email
- Or add manually in Resend dashboard

---

## Summary

**Segmentation**: 
- Happens automatically on signup/purchase (tags)
- Syncs to segments daily via cron job
- Based on database records (subscriptions, transactions, email logs)

**Email Sending**:
- **Resend Broadcasts**: Direct sending to segments (immediate)
- **Scheduled Campaigns**: Database-driven, template-based (automated)
- **Both use segments** to target the right audience

The system is **hybrid**: Uses Resend segments for targeting, but also queries your database for recipient lists when needed (for scheduled campaigns).




