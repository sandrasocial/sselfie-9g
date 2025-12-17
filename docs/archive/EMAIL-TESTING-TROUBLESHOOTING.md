# Email Testing Troubleshooting Guide

## Issue: "Email Sent" but Not Received

If the system says the email was sent but you don't receive it, follow these steps:

---

## Step 1: Check Server Logs

**Look for these log messages in your terminal (where Next.js is running):**

### ✅ Success Logs (Email Actually Sent):
```
[v0] Sending email via Resend (attempt 1/3): { to: 'ssa@ssasocial.com', ... }
[v0] Email sent successfully: re_xxxxxxxxxxxxx
[v0] ✓ Sent campaign 123 to ssa@ssasocial.com
```

### ❌ Error Logs (Email Failed):
```
[v0] Resend error (attempt 1): { message: '...' }
[v0] ✗ Failed to send campaign 123 to ssa@ssasocial.com: ...
```

**Action:**
- If you see error logs, note the error message
- If you see success logs but no email, check Step 2

---

## Step 2: Check Email Logs in Database

Run this SQL query in your Neon database:

```sql
SELECT 
  user_email,
  email_type,
  status,
  resend_message_id,
  error_message,
  sent_at
FROM email_logs
WHERE user_email = 'ssa@ssasocial.com'
ORDER BY sent_at DESC
LIMIT 5;
```

### What to Look For:

**✅ Good Signs:**
- `status = 'sent'`
- `resend_message_id` is not NULL (looks like `re_xxxxxxxxxxxxx`)
- `error_message` is NULL

**❌ Bad Signs:**
- `status = 'failed'`
- `error_message` contains error details
- `resend_message_id` is NULL

---

## Step 3: Check Resend Dashboard

1. Go to: https://resend.com/emails
2. Look for recent emails sent to `ssa@ssasocial.com`
3. Check the status:
   - **Delivered** ✅ - Email was sent and delivered
   - **Pending** ⏳ - Email is queued
   - **Bounced** ❌ - Email address is invalid
   - **Failed** ❌ - Sending failed

**If email shows as "Delivered" but you don't have it:**
- Check spam/junk folder
- Check email filters
- Check if email address is correct

---

## Step 4: Verify Environment Variables

Check your `.env.local` file:

```bash
# Required for email sending
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Required for test emails
ADMIN_EMAIL=ssa@ssasocial.com
```

**Verify:**
1. `RESEND_API_KEY` is set and valid
2. `ADMIN_EMAIL` matches your actual email address
3. Restart your Next.js server after changing `.env` files

---

## Step 5: Test Resend API Directly

Create a test file to verify Resend is working:

**Create: `test-resend.js`**

```javascript
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  const { data, error } = await resend.emails.send({
    from: 'SSelfie <hello@sselfie.ai>',
    to: 'ssa@ssasocial.com',
    subject: 'Test Email',
    html: '<p>This is a test email</p>',
    text: 'This is a test email',
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Message ID:', data.id);
  }
}

test();
```

**Run:**
```bash
node test-resend.js
```

**Expected:**
- Should print: `Success! Message ID: re_xxxxxxxxxxxxx`
- Check your inbox for the test email

---

## Step 6: Check Email Address in Resend

1. Go to: https://resend.com/audiences
2. Search for `ssa@ssasocial.com`
3. Check if the contact exists
4. Check contact status:
   - **Active** ✅ - Can receive emails
   - **Unsubscribed** ❌ - Won't receive emails
   - **Bounced** ❌ - Invalid email

**If contact is unsubscribed:**
- Resubscribe the contact in Resend dashboard
- Or remove and re-add the contact

---

## Step 7: Check Campaign Status

Run this SQL query:

```sql
SELECT 
  id,
  campaign_name,
  campaign_type,
  status,
  subject_line,
  body_html IS NOT NULL as has_html,
  body_text IS NOT NULL as has_text,
  created_at
FROM admin_email_campaigns
WHERE id = YOUR_CAMPAIGN_ID;
```

**Check:**
- `status` should be `'draft'` or `'scheduled'` (not `'failed'`)
- `has_html` should be `true`
- `has_text` should be `true`
- `subject_line` should not be empty

---

## Step 8: Test with Browser Console

Open browser console on `/admin/test-campaigns` and run:

```javascript
// Replace 123 with your actual campaign ID
fetch('/api/admin/email/run-scheduled-campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    mode: 'test',
    campaignId: 123
  })
})
.then(r => r.json())
.then(data => {
  console.log('Response:', data);
  if (data.results && data.results[0]) {
    console.log('Campaign Result:', data.results[0]);
    console.log('Status:', data.results[0].status);
    console.log('Errors:', data.results[0].errors);
  }
})
.catch(err => console.error('Error:', err));
```

**Check the response:**
- `success: true` ✅
- `results[0].status: "sent"` ✅
- `results[0].errors: []` ✅

---

## Common Issues & Fixes

### Issue 1: "Invalid API Key"
**Fix:**
- Check `RESEND_API_KEY` in `.env.local`
- Verify key is active in Resend dashboard
- Restart Next.js server

### Issue 2: "Email Address Not Verified"
**Fix:**
- Verify `hello@sselfie.ai` domain in Resend
- Or use a verified sender email

### Issue 3: "Rate Limit Exceeded"
**Fix:**
- Wait a few minutes
- Check Resend dashboard for rate limits
- Reduce email frequency

### Issue 4: "Email in Spam"
**Fix:**
- Check spam/junk folder
- Mark as "Not Spam"
- Add sender to contacts

### Issue 5: "Contact Unsubscribed"
**Fix:**
- Go to Resend dashboard
- Find contact `ssa@ssasocial.com`
- Resubscribe or remove and re-add

---

## Quick Diagnostic: Use Diagnostic Endpoint

**Easiest way to check everything:**

1. Go to: `http://localhost:3000/api/admin/email/diagnose-test`
2. Review the JSON response:
   - Check `recentEmailLogs` - see if emails were actually sent
   - Check `resendStatus` - verify API connection
   - Check `environment` - verify configuration

3. **Send a test email:**
   - Go to: `http://localhost:3000/api/admin/email/diagnose-test?sendTest=true`
   - This sends a simple test email directly via Resend
   - Check your inbox for "[DIAGNOSTIC TEST] Email System Check"

**What to Look For:**

✅ **Good Signs:**
```json
{
  "recentEmailLogs": [
    {
      "status": "sent",
      "resend_message_id": "re_xxxxxxxxxxxxx",
      "error_message": null
    }
  ],
  "resendStatus": {
    "connected": true
  }
}
```

❌ **Bad Signs:**
```json
{
  "recentEmailLogs": [
    {
      "status": "failed",
      "resend_message_id": null,
      "error_message": "Invalid API key"
    }
  ]
}
```

---

## Quick Diagnostic Script (Alternative)

Run this to check everything at once:

```bash
# Check environment variables
echo "RESEND_API_KEY: ${RESEND_API_KEY:0:10}..."
echo "ADMIN_EMAIL: $ADMIN_EMAIL"

# Check if server is running
curl -s http://localhost:3000/api/health || echo "Server not running"

# Check recent email logs (if you have database access)
# Run in Neon SQL editor:
# SELECT * FROM email_logs WHERE user_email = 'ssa@ssasocial.com' ORDER BY sent_at DESC LIMIT 1;
```

---

## Still Not Working?

1. **Check Resend Dashboard** - Most reliable source of truth
2. **Check Server Logs** - Look for actual error messages
3. **Check Database Logs** - See what was recorded
4. **Test with Simple Email** - Use the test-resend.js script above

---

## Next Steps

Once you identify the issue:
1. Fix the root cause (API key, email address, etc.)
2. Retry sending the test email
3. Verify in Resend dashboard
4. Check inbox (including spam)

