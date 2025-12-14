# Email System Architecture & Review Process

## 🔄 Complete Email Flow

### 1. **AI Creates Campaign** (Admin Agent)
```
You: "Create a welcome back campaign for cold users"
  ↓
Admin Agent (email mode)
  ↓
Uses createEmailCampaignWithTemplate tool
  ↓
AI generates subject + content in your voice
  ↓
Creates campaign in admin_email_campaigns (status: 'draft')
  ↓
Returns campaign ID to you
```

### 2. **You Review Campaign**
```
Go to: /admin/test-campaigns
  ↓
See campaign in list (status: 'draft')
  ↓
Click "View" → See full campaign details
  ↓
Click "Send Test" → Sends to your email (ssa@ssasocial.com)
  ↓
Check your inbox → Review formatting, content, voice
```

### 3. **Test Email Flow**
```
Click "Send Test" button
  ↓
POST /api/admin/email/run-scheduled-campaigns
  Body: { mode: 'test', campaignId: 123 }
  ↓
Executor (run-scheduled-campaigns.ts)
  - Finds campaign by ID
  - Uses template to generate email content
  - Sends ONLY to ADMIN_EMAIL (test mode)
  - Uses sendEmail() → Resend API
  ↓
Resend sends email
  ↓
Email arrives in your inbox
  ↓
Result logged to email_logs table
```

### 4. **Approve & Schedule**
```
If email looks good:
  ↓
Set schedule date/time (or send immediately)
  ↓
Campaign status → 'scheduled'
  ↓
Executor runs automatically (or manually via API)
  ↓
Sends to all recipients in target_audience
```

### 5. **Live Send Flow**
```
POST /api/admin/email/run-scheduled-campaigns
  Body: { mode: 'live', campaignId: 123 }
  ↓
Executor:
  - Resolves recipients from target_audience
  - For each recipient:
    - Generates email using template
    - Calls sendEmail() → Resend API
    - Logs to email_logs
  ↓
Campaign status → 'sent' or 'failed'
```

## 📧 How Resend Integration Works

### Core Function: `lib/email/send-email.ts`

```typescript
sendEmail(options) 
  → Checks rate limits
  → Calls Resend API (resend.emails.send)
  → Retries 3 times on failure
  → Logs to email_logs table
  → Returns { success, messageId, error }
```

### Resend API Call
```typescript
resend.emails.send({
  from: "SSelfie <hello@sselfie.ai>",
  to: ["recipient@example.com"],
  subject: "Email subject",
  html: "<html>...</html>",
  text: "Plain text version",
  tags: [{ name: "campaign", value: "campaign-123" }]
})
```

### What Gets Logged
Every email send is logged to `email_logs` table:
- `user_email` - Recipient
- `email_type` - Type (e.g., 'campaign-123')
- `resend_message_id` - Resend's message ID
- `status` - 'sent', 'failed', 'error'
- `error_message` - Error details if failed
- `sent_at` - Timestamp

## 🔍 How to Review Emails

### Option 1: Test Campaign Page (Recommended)
1. Go to `/admin/test-campaigns`
2. Find your campaign
3. Click "Send Test" → Email sent to `ssa@ssasocial.com`
4. Check your inbox
5. Review formatting, content, voice

### Option 2: Preview Modal
1. Click "View" on campaign
2. See campaign details
3. Click "Send Test Email" in modal
4. Check your inbox

### Option 3: Direct API Test
```bash
curl -X POST http://localhost:3000/api/admin/email/run-scheduled-campaigns \
  -H "Content-Type: application/json" \
  -d '{"mode": "test", "campaignId": 123}'
```

## 🐛 Common Failure Points & Debugging

### 1. **Resend API Key Missing**
**Symptom**: `RESEND_API_KEY is not configured`
**Fix**: Set `RESEND_API_KEY` in environment variables

### 2. **Domain Not Verified**
**Symptom**: `domain is not verified`
**Fix**: Verify `sselfie.ai` domain in Resend dashboard
- Go to https://resend.com/domains
- Add DNS records
- Wait for verification

### 3. **Rate Limits**
**Symptom**: `Rate limit exceeded`
**Fix**: System automatically handles (2 requests/second)
- Check `email_logs` for rate limit errors
- Wait and retry

### 4. **Invalid Email Address**
**Symptom**: `Invalid email address`
**Fix**: 
- Check recipient emails in database
- Validate email format before sending

### 5. **Template Not Found**
**Symptom**: `Template not found` or wrong content
**Fix**:
- Check `campaign_type` matches template name
- Verify template file exists in `lib/email/templates/`
- Check executor logs

### 6. **No Recipients**
**Symptom**: `No recipients found for campaign`
**Fix**:
- Check `target_audience` in campaign
- Verify segment has contacts
- Check Resend audience sync

## 📊 Monitoring & Debugging

### Check Email Logs
```sql
SELECT * FROM email_logs 
WHERE email_type LIKE 'campaign-%'
ORDER BY sent_at DESC
LIMIT 50;
```

### Check Campaign Status
```sql
SELECT id, campaign_name, status, scheduled_for, total_recipients
FROM admin_email_campaigns
ORDER BY created_at DESC;
```

### Check Resend Dashboard
- Go to https://resend.com/emails
- See all sent emails
- Check delivery status
- View opens/clicks

### Server Logs
All email sends log to console:
- `[v0] Sending email via Resend`
- `[v0] Email sent successfully: {messageId}`
- `[v0] Resend error: {error}`

## ✅ Testing Checklist

Before sending live:
1. ✅ Test email received in inbox
2. ✅ Formatting looks correct
3. ✅ Links work
4. ✅ Voice matches your brand
5. ✅ Subject line is compelling
6. ✅ Target audience is correct
7. ✅ Schedule date/time is correct
8. ✅ Resend domain is verified

## 🚀 Live Send Process

1. **Review** campaign in `/admin/test-campaigns`
2. **Test** send to your email
3. **Verify** email looks good
4. **Schedule** or send immediately:
   - Set `scheduled_for` date/time
   - OR call API with `mode: 'live'`
5. **Monitor** in email_logs and Resend dashboard
6. **Check** campaign status updates

## 🔗 Key Files

- `lib/email/send-email.ts` - Core email sending (Resend API)
- `lib/email/run-scheduled-campaigns.ts` - Campaign executor
- `app/api/admin/email/run-scheduled-campaigns/route.ts` - API endpoint
- `lib/email/templates/*.tsx` - Email templates
- `admin_email_campaigns` table - Campaign storage
- `email_logs` table - Send tracking

## 📝 Next Steps

1. AI creates campaign → Draft status
2. You review → Test send
3. You approve → Schedule or send live
4. Executor sends → Logs to email_logs
5. Monitor results → Resend dashboard + email_logs












