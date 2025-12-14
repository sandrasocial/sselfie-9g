# AI-Powered Email Campaigns - Complete Guide

## 🎯 How It Works

### **You Don't Write Emails - AI Does**

1. **You ask AI** (in Admin Agent chat):
   - "Create a welcome back campaign for cold users"
   - "Write a newsletter about our new feature"
   - "Create a nurture sequence for new paid users"

2. **AI creates campaign**:
   - Generates subject line in your voice
   - Creates campaign in database (status: `draft`)
   - Uses your template system automatically
   - Returns campaign ID

3. **You review**:
   - Go to `/admin/test-campaigns`
   - See campaign in list
   - Click "Send Test" → Email sent to your inbox
   - Review formatting, content, voice

4. **You approve & send**:
   - If it looks good → Schedule or send live
   - If it needs changes → Edit in UI or ask AI to regenerate

## 📧 How Resend Sends Emails

### The Flow:
```
Campaign Created (draft)
  ↓
You Test → Executor → sendEmail() → Resend API → Your Inbox
  ↓
You Approve → Schedule → Executor → sendEmail() → Resend API → All Recipients
```

### Resend Integration:
- **API**: `resend.emails.send()` in `lib/email/send-email.ts`
- **Retry Logic**: 3 attempts with exponential backoff
- **Rate Limiting**: Automatic (2 requests/second)
- **Logging**: Every send logged to `email_logs` table
- **Error Handling**: Errors logged, retries on failures

### What Gets Logged:
Every email send is logged to `email_logs`:
- ✅ Success: `status = 'sent'`, `resend_message_id` saved
- ❌ Failure: `status = 'failed'`, `error_message` saved
- 📊 Track: Opens, clicks (via Resend webhooks - future)

## 🔍 How to Review Emails

### Method 1: Test Campaign Page (Recommended)
1. Go to `/admin/test-campaigns`
2. Find your campaign (status: `draft`)
3. Click **"Send Test"** button
4. Check your inbox (`ssa@ssasocial.com`)
5. Review email formatting, content, voice

### Method 2: Preview Modal
1. Click **"View"** on campaign
2. See campaign details
3. Preview generates automatically (for template campaigns)
4. Click **"Send Test Email"** in modal
5. Check your inbox

### Method 3: Direct API
```bash
curl -X POST http://localhost:3000/api/admin/email/run-scheduled-campaigns \
  -H "Content-Type: application/json" \
  -d '{"mode": "test", "campaignId": 123}'
```

## 🐛 Debugging Email Issues

### Check Email Logs
```sql
SELECT * FROM email_logs 
WHERE email_type LIKE 'campaign-%'
ORDER BY sent_at DESC
LIMIT 50;
```

### Check Resend Dashboard
- Go to https://resend.com/emails
- See all sent emails
- Check delivery status
- View error messages

### Common Issues:

1. **"RESEND_API_KEY is not configured"**
   - Fix: Set `RESEND_API_KEY` in environment variables

2. **"Domain not verified"**
   - Fix: Verify `sselfie.ai` in Resend dashboard
   - Add DNS records
   - Wait for verification

3. **"Rate limit exceeded"**
   - Fix: System handles automatically (2 req/sec)
   - Wait and retry

4. **"No recipients found"**
   - Fix: Check `target_audience` in campaign
   - Verify segment has contacts
   - Check Resend audience sync

5. **"Template not found"**
   - Fix: Check `campaign_type` matches template
   - Verify template file exists
   - Check server logs

## 🚀 Complete Workflow

### Step 1: AI Creates Campaign
```
You (in Admin Chat): "Create a welcome back campaign for cold users"
  ↓
Admin Agent (email mode)
  ↓
Uses createEmailCampaignWithTemplate tool
  ↓
AI generates:
  - Campaign name: "Welcome Back - Re-engage Cold Users"
  - Subject: "I've been thinking about you..."
  - Campaign type: "welcome_back_reengagement"
  - Target: "cold_users"
  ↓
Creates campaign in database (status: 'draft')
  ↓
Returns: Campaign ID 123
```

### Step 2: You Review
```
Go to: /admin/test-campaigns
  ↓
See campaign: "Welcome Back - Re-engage Cold Users" (draft)
  ↓
Click "Send Test"
  ↓
POST /api/admin/email/run-scheduled-campaigns
  Body: { mode: 'test', campaignId: 123 }
  ↓
Executor:
  - Finds campaign 123
  - Uses welcome_back_reengagement template
  - Generates email content
  - Sends ONLY to ssa@ssasocial.com
  - Uses sendEmail() → Resend API
  ↓
Email arrives in your inbox
  ↓
Logged to email_logs (status: 'sent')
```

### Step 3: You Approve & Schedule
```
If email looks good:
  ↓
Set schedule date/time (or send immediately)
  ↓
Campaign status → 'scheduled'
  ↓
POST /api/admin/email/run-scheduled-campaigns
  Body: { mode: 'live', campaignId: 123 }
  ↓
Executor:
  - Resolves recipients from 'cold_users' segment
  - For each recipient:
    - Generates email using template
    - Calls sendEmail() → Resend API
    - Logs to email_logs
  ↓
Campaign status → 'sent'
  ↓
All emails delivered via Resend
```

## 📊 Monitoring

### Check Campaign Status
```sql
SELECT id, campaign_name, status, scheduled_for, total_recipients
FROM admin_email_campaigns
ORDER BY created_at DESC;
```

### Check Email Delivery
```sql
SELECT 
  email_type,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM email_logs
WHERE email_type LIKE 'campaign-%'
GROUP BY email_type, status;
```

### Server Logs
Watch terminal for:
- `[v0] Sending email via Resend`
- `[v0] Email sent successfully: {messageId}`
- `[v0] Resend error: {error}`

## ✅ Testing Checklist

Before sending live:
- [ ] Test email received in inbox
- [ ] Formatting looks correct
- [ ] Links work
- [ ] Voice matches your brand
- [ ] Subject line is compelling
- [ ] Target audience is correct
- [ ] Schedule date/time is correct
- [ ] Resend domain is verified

## 🎨 Available Campaign Types

1. **welcome_back_reengagement** - Re-engage cold users
2. **nurture_day_1, nurture_day_3, nurture_day_7** - Nurture sequence
3. **upsell_freebie_to_membership** - Convert blueprint subscribers
4. **upsell_day_10** - Extended upsell
5. **win_back_offer** - Final re-engagement with offer
6. **newsletter** - Weekly/bi-weekly newsletter
7. **beta_testimonial** - Request testimonials

## 🔗 Key Files

- `app/api/admin/agent/chat/route.ts` - Admin Agent with tools
- `lib/email/send-email.ts` - Core email sending (Resend)
- `lib/email/run-scheduled-campaigns.ts` - Campaign executor
- `app/api/admin/email/run-scheduled-campaigns/route.ts` - API endpoint
- `app/api/admin/email/preview-campaign/route.ts` - Preview endpoint
- `lib/email/templates/*.tsx` - Email templates
- `admin_email_campaigns` table - Campaign storage
- `email_logs` table - Send tracking

## 💡 Example: Create Your First Campaign

1. **Open Admin Agent Chat** (`/admin/agent`)
2. **Type**: "Create a welcome back campaign for cold users"
3. **AI responds**: Creates campaign, returns ID
4. **Go to**: `/admin/test-campaigns`
5. **Click**: "Send Test"
6. **Check**: Your inbox (`ssa@ssasocial.com`)
7. **Review**: Email formatting and content
8. **If good**: Schedule or send live
9. **If not**: Ask AI to regenerate or edit manually

## 🎯 Next Steps

1. Test the AI tool in Admin Agent chat
2. Create a test campaign
3. Review the email
4. Send test email
5. Verify it works
6. Then create real campaigns!











