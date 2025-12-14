# Test Campaigns Setup Guide

## ✅ What's Been Created

### 1. New Admin Page: `/admin/test-campaigns`
- **Location**: `app/admin/test-campaigns/page.tsx`
- **Features**:
  - Create new campaigns with all template types
  - Schedule campaigns (date + time)
  - Send test emails
  - View campaign details
  - See all campaigns with status badges

### 2. Updated Email Broadcast Page: `/admin/email-broadcast`
- Now includes both:
  - Email Campaign Manager (existing campaigns)
  - Beta Testimonial Broadcast (existing feature)

### 3. Updated API Route: `/api/admin/agent/email-campaigns`
- Now supports:
  - Template-based campaigns (no Resend broadcast needed)
  - Scheduling (`scheduled_for` field)
  - Target audience (`target_audience` JSONB field)
  - Automatic status setting (draft vs scheduled)

## 📧 Available Campaign Types

1. **Welcome Back Re-engagement** (`welcome_back_reengagement`)
   - Re-engage cold users (30+ days inactive)
   - Template: `welcome-back-reengagement.tsx`

2. **Nurture Day 1** (`nurture_day_1`)
   - First day welcome for new paid users
   - Template: `nurture-day-1.tsx`

3. **Nurture Day 3** (`nurture_day_3`)
   - Check-in after 3 days
   - Template: `nurture-day-3.tsx`

4. **Nurture Day 7** (`nurture_day_7`)
   - Week check-in with soft upsell
   - Template: `nurture-day-7.tsx` (enhanced)

5. **Freebie → Membership Upsell** (`upsell_freebie_to_membership`)
   - Convert blueprint subscribers
   - Template: `upsell-freebie-membership.tsx`

6. **Day 10 Upsell** (`upsell_day_10`)
   - Extended upsell for blueprint subscribers
   - Template: `upsell-day-10.tsx`

7. **Win-Back Offer** (`win_back_offer`)
   - Final re-engagement with offer
   - Template: `win-back-offer.tsx`
   - Supports: discount %, code, expiry (via campaign.metrics)

8. **Newsletter** (`newsletter`)
   - Weekly/bi-weekly newsletter
   - Template: `newsletter-template.tsx`

9. **Beta Testimonial Request** (`beta_testimonial`)
   - Request testimonials from beta users
   - Template: `beta-testimonial-request.tsx`

## 🎯 Target Audiences

- **All Subscribers** - Everyone in your audience
- **Cold Users** - 30+ days inactive
- **Paid Users** - Active paying customers
- **Beta Users** - Beta program members

## 🚀 How to Use

### Step 1: Create a Test Campaign

1. Go to `/admin/test-campaigns`
2. Click "Create New Campaign"
3. Fill in:
   - Campaign Name (e.g., "Welcome Back - January 2025")
   - Campaign Type (select from dropdown)
   - Subject Line (auto-filled, but editable)
   - Target Audience (select segment)
   - Schedule Date & Time (optional)
4. Click "Create Campaign"

### Step 2: Test the Campaign

1. Find your campaign in the list
2. Click "Send Test" button
3. Check your admin email (`ssa@ssasocial.com`)
4. Review the email formatting and content

### Step 3: Schedule or Send Live

**Option A: Schedule for Later**
- When creating, set Schedule Date & Time
- Campaign will be automatically sent by the executor

**Option B: Send Immediately**
- Use the executor API: `POST /api/admin/email/run-scheduled-campaigns`
- Body: `{ mode: "live", campaignId: 123 }`

## 🔧 Technical Details

### Campaign Status Flow
- `draft` → Created but not scheduled
- `scheduled` → Has `scheduled_for` in future
- `sending` → Currently being processed
- `sent` → Successfully completed
- `failed` → Errors occurred

### Template Integration
All templates are automatically integrated into `lib/email/run-scheduled-campaigns.ts`. When a campaign with a template type is executed, the template generates the email content automatically.

### Test Mode
- Sends only to admin email (`ssa@ssasocial.com`)
- Doesn't update campaign status
- Perfect for previewing emails

### Live Mode
- Sends to all recipients in target audience
- Updates campaign status
- Logs all sends to `email_logs`

## 📝 Example: Create Welcome Back Campaign

1. Go to `/admin/test-campaigns`
2. Click "Create New Campaign"
3. Fill in:
   - Name: "Welcome Back - Re-engage Cold Users"
   - Type: "Welcome Back (Re-engagement)"
   - Subject: "I've been thinking about you..."
   - Audience: "Cold Users (30+ days inactive)"
   - Schedule: (optional) Set date/time
4. Click "Create Campaign"
5. Click "Send Test" to preview
6. If it looks good, schedule it or send live

## 🎨 UI Features

- **Status Badges**: Color-coded status indicators
- **Campaign List**: Shows all campaigns with key info
- **Test Results**: Shows success/failure after test send
- **Campaign Details**: Modal with full campaign info
- **Schedule Picker**: Date + time selection

## 🔗 Related Pages

- `/admin/test-campaigns` - Create and test campaigns
- `/admin/email-broadcast` - View all campaigns + beta testimonials
- `/admin/test-audience-sync` - Manage audience segmentation

## ⚠️ Important Notes

1. **Template campaigns** don't need `body_html` - templates generate it
2. **Scheduled campaigns** are processed by the executor automatically
3. **Test mode** always sends to admin email only
4. **Target audience** uses Resend segments for filtering
5. **Rate limits** are respected (2 requests/second)

## 🐛 Troubleshooting

**Campaign not sending?**
- Check campaign status
- Verify target audience has recipients
- Check server logs for errors

**Test email not received?**
- Check spam folder
- Verify admin email is correct
- Check server logs

**Template not working?**
- Verify campaign_type matches template name
- Check template file exists in `lib/email/templates/`
- Review executor logs

## 📚 Next Steps

1. Create your first test campaign
2. Send test email to verify formatting
3. Schedule campaigns for optimal send times
4. Monitor results in campaign list
5. Use insights to improve future campaigns












