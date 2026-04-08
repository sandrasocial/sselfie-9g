# Email Activation & Testing Guide

## 🚀 Quick Start (5 Minutes)

### Fastest Way to Test:

1. **Navigate to Test Campaigns Page**
   - Go to: `http://localhost:3000/admin/test-campaigns`
   - (Or: `/admin/test-campaigns` if already on site)

2. **Create a Test Campaign**
   - Click **"Create Campaign"** button (top right)
   - Fill in the form:
     - **Campaign Name**: "Test Welcome Back"
     - **Campaign Type**: Select "Welcome Back (Re-engagement)"
     - **Subject Line**: "I've been thinking about you..."
     - **Target Audience**: Select "Cold Users"
     - **Scheduled For**: Leave empty (we'll send test immediately)
   - Click **"Create Campaign"**

3. **Send Test Email**
   - Find your campaign in the list below
   - Click the **"Send Test"** button (next to the campaign)
   - Wait for alert: "Test email sent! Check your inbox."

4. **Verify Email Received**
   - Check your inbox: `ssa@ssasocial.com`
   - Open the email
   - **Hover over the CTA button/link** to see the URL
   - Verify it includes:
     - `utm_source=email`
     - `utm_medium=email`
     - `utm_campaign=...`
     - `campaign_id=...`
     - `campaign_type=...`

5. **Test the Link**
   - Click the link in the email
   - Verify you're redirected to `/studio` with all parameters preserved
   - Check browser address bar for tracking parameters

**✅ Done! Your email tracking is working.**

### What You Should See:

**In Email:**
- Subject: "I've been thinking about you..."
- CTA Button: "See What's New"
- Link URL (when hovering): 
  ```
  https://sselfie.ai/studio?utm_source=email&utm_medium=email&utm_campaign=test-welcome-back&utm_content=cta_button&campaign_id=123&campaign_type=welcome_back_reengagement
  ```

**In Browser (after clicking):**
- URL should preserve all tracking parameters
- Should redirect to `/studio` page

---

## Step-by-Step Instructions to Activate and Test Email Campaigns

---

## Part 1: Testing Email Campaigns (Safe Testing)

### Step 1: Access Admin Agent Chat

1. Navigate to: `http://localhost:3000/admin/agent` (or your production URL)
2. Make sure you're logged in as admin (`ssa@ssasocial.com`)

### Step 2: Create a Test Campaign via Admin Agent

**Option A: Ask the Agent to Create a Campaign**

Type in the chat:
```
Create a welcome back re-engagement email campaign for cold users
```

The agent will:
- Generate email content
- Create campaigns for ALL 4 segments automatically
- Save them as drafts in the database

**Option B: Create Campaign Manually**

1. Navigate to: `http://localhost:3000/admin/test-campaigns`
2. Fill in the form:
   - **Campaign Name**: "Test Welcome Back - Cold Users"
   - **Campaign Type**: Select "welcome_back_reengagement"
   - **Subject Line**: "I've been thinking about you..."
   - **Preview Text**: (optional)
   - **Scheduled For**: Leave empty (or set future date)
   - Click **"Create Campaign"**

### Step 3: Send Test Email (TEST Mode)

**Method 1: Via Admin UI**

1. Go to: `http://localhost:3000/admin/test-campaigns`
2. Find your test campaign in the list
3. Click **"Send Test Email"** button
4. This sends ONLY to your admin email (`ssa@ssasocial.com`)

**Method 2: Via API (curl)**

```bash
curl -X POST http://localhost:3000/api/admin/email/run-scheduled-campaigns \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "mode": "test",
    "campaignId": YOUR_CAMPAIGN_ID
  }'
```

**Method 3: Via API (Browser Console)**

Open browser console on any admin page and run:

```javascript
fetch('/api/admin/email/run-scheduled-campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    mode: 'test',
    campaignId: YOUR_CAMPAIGN_ID  // Replace with actual campaign ID
  })
})
.then(r => r.json())
.then(console.log)
```

### Step 4: Verify Test Email Received

1. Check your inbox: `ssa@ssasocial.com`
2. Open the email
3. **Verify the link structure**:
   - Hover over the CTA button/link
   - Check the URL includes:
     - `utm_source=email`
     - `utm_medium=email`
     - `utm_campaign=...`
     - `campaign_id=...`
     - `campaign_type=...`

**Example of correct link:**
```
https://sselfie.ai/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=welcome-back-reengagement&utm_content=cta_button&campaign_id=123&campaign_type=welcome_back_reengagement
```

### Step 5: Test Link Click (Without Purchasing)

1. Click the link in the test email
2. Verify you're redirected to: `/studio?checkout=studio_membership&...`
3. Check browser console for any errors
4. **Check URL parameters are preserved**:
   - Open browser DevTools → Network tab
   - Look for requests with `campaign_id` parameter

---

## Part 2: Testing Conversion Tracking

### Step 6: Complete a Test Purchase

**Important**: Use Stripe test mode for this!

1. Click the tracked link from your test email
2. You should land on: `/studio?checkout=studio_membership&campaign_id=...`
3. Complete the checkout process (use Stripe test card: `4242 4242 4242 4242`)
4. Complete the purchase

### Step 7: Verify Conversion Attribution

**Check 1: Stripe Webhook Logs**

1. Check your server logs (terminal where Next.js is running)
2. Look for:
   ```
   [v0] ✅ Attributed conversion to campaign 123 for ssa@ssasocial.com
   ```

**Check 2: Database - Campaign Metrics**

Run this SQL query in your Neon database:

```sql
SELECT 
  id,
  campaign_name,
  campaign_type,
  total_recipients,
  total_converted,
  status,
  created_at
FROM admin_email_campaigns
WHERE id = YOUR_CAMPAIGN_ID;
```

**Expected Result:**
- `total_converted` should be `1` (or increment if multiple tests)

**Check 3: Email Logs**

```sql
SELECT 
  user_email,
  email_type,
  status,
  sent_at
FROM email_logs
WHERE user_email = 'ssa@ssasocial.com'
  AND email_type LIKE '%campaign%'
ORDER BY sent_at DESC
LIMIT 10;
```

**Expected Result:**
- Should see entry with `email_type = 'campaign_conversion'`
- Status should be `'converted'`

---

## Part 3: Activating Campaigns for Real Users

### Step 8: Create Production Campaigns

**Via Admin Agent:**

```
Create a welcome back re-engagement email campaign for all segments. Schedule it to send tomorrow at 10am.
```

The agent will create 4 campaigns (one per segment) and schedule them.

**Or Manually:**

1. Go to: `http://localhost:3000/admin/test-campaigns`
2. Create campaign
3. Set **Scheduled For** date/time
4. Campaign status will be `'scheduled'`

### Step 9: Preview Campaign Before Sending

1. Go to: `http://localhost:3000/admin/test-campaigns`
2. Click on a campaign to view details
3. Click **"Preview Email"** button
4. Review the email content and links
5. Verify tracking parameters in preview

### Step 10: Send Test to Admin Email First

**Before sending to real users, always test:**

1. Click **"Send Test Email"** on the campaign
2. Verify email received
3. Verify links work
4. Verify tracking parameters present

### Step 11: Activate Campaign (LIVE Mode)

**Option A: Scheduled Send**

1. Set `scheduled_for` date/time in the future
2. Campaign will be picked up by executor automatically
3. Or trigger manually via cron/API

**Option B: Manual Send (Immediate)**

**Via API:**

```bash
curl -X POST http://localhost:3000/api/admin/email/run-scheduled-campaigns \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "mode": "live",
    "campaignId": YOUR_CAMPAIGN_ID
  }'
```

**Via Browser Console:**

```javascript
fetch('/api/admin/email/run-scheduled-campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    mode: 'live',
    campaignId: YOUR_CAMPAIGN_ID
  })
})
.then(r => r.json())
.then(console.log)
```

**⚠️ WARNING**: `mode: "live"` sends to REAL users. Only use after thorough testing!

---

## Part 4: Monitoring Campaign Performance

### Step 12: Check Campaign Metrics

**View in Database:**

```sql
SELECT 
  id,
  campaign_name,
  campaign_type,
  status,
  total_recipients,
  total_converted,
  scheduled_for,
  created_at,
  updated_at
FROM admin_email_campaigns
WHERE status IN ('sending', 'sent')
ORDER BY created_at DESC;
```

### Step 13: Check Email Logs

```sql
SELECT 
  user_email,
  email_type,
  status,
  resend_message_id,
  sent_at
FROM email_logs
WHERE email_type LIKE '%campaign%'
ORDER BY sent_at DESC
LIMIT 50;
```

### Step 14: Check Conversion Attribution

```sql
SELECT 
  e.user_email,
  e.email_type,
  e.status,
  e.sent_at,
  c.campaign_name,
  c.campaign_type
FROM email_logs e
LEFT JOIN admin_email_campaigns c ON e.email_type = CONCAT('campaign-', c.id::text)
WHERE e.status = 'converted'
ORDER BY e.sent_at DESC;
```

---

## Part 5: Troubleshooting

### Issue: Links Don't Have Tracking Parameters

**Check:**
1. Is `campaignId` being passed to template?
2. Check `lib/email/run-scheduled-campaigns.ts` - verify `campaign.id` is passed
3. Check template - verify it uses `generateTrackedCheckoutLink()`

**Fix:**
- Ensure campaign was created with proper `id` and `campaign_name`
- Check template imports `generateTrackedCheckoutLink` correctly

### Issue: Conversion Not Attributed

**Check:**
1. Does Stripe session metadata include `campaign_id`?
2. Check webhook logs for: `"Metadata:"` - should show `campaign_id`
3. Check if webhook handler is running (look for `✅ Attributed conversion` log)

**Fix:**
- Ensure `campaign_id` is in URL when user clicks
- Ensure checkout session captures `campaign_id` from URL
- Verify webhook handler checks for `campaign_id` in metadata

### Issue: Test Email Not Received

**Check:**
1. Is `ADMIN_EMAIL` environment variable set?
2. Check Resend API key is valid
3. Check server logs for errors
4. Check spam folder

**Fix:**
- Set `ADMIN_EMAIL=ssa@ssasocial.com` in `.env`
- Verify Resend API key in environment variables
- Check Resend dashboard for delivery status

### Issue: Campaign Status Not Updating

**Check:**
1. Is executor running?
2. Check campaign `scheduled_for` date is in the past
3. Check campaign `status` is `'scheduled'`

**Fix:**
- Manually trigger executor via API
- Update `scheduled_for` to current time
- Ensure campaign status is `'scheduled'` not `'draft'`

---

## Quick Reference: API Endpoints

### Get Campaign List
```bash
GET /api/admin/email/run-scheduled-campaigns
```

### Send Test Email
```bash
POST /api/admin/email/run-scheduled-campaigns
{
  "mode": "test",
  "campaignId": 123
}
```

### Send Live Campaign
```bash
POST /api/admin/email/run-scheduled-campaigns
{
  "mode": "live",
  "campaignId": 123
}
```

### Preview Campaign
```bash
GET /api/admin/email/preview-campaign?campaignId=123&email=ssa@ssasocial.com
```

---

## Testing Checklist

Before sending to real users:

- [ ] Test email received in admin inbox
- [ ] Links include UTM parameters
- [ ] Links include `campaign_id`
- [ ] Click link works (redirects correctly)
- [ ] Test purchase completes successfully
- [ ] Conversion attributed in database (`total_converted` increments)
- [ ] Conversion logged in `email_logs`
- [ ] Campaign status updates correctly
- [ ] No errors in server logs
- [ ] Email renders correctly on mobile
- [ ] All links work (not just CTA)

---

## Safety Tips

1. **Always test first** - Use `mode: "test"` before `mode: "live"`
2. **Start small** - Test with 1-2 campaigns before bulk sending
3. **Monitor closely** - Watch server logs during first live send
4. **Check metrics** - Verify conversions are being tracked
5. **Have rollback plan** - Know how to stop campaigns if needed

---

## Next Steps After Testing

1. **Set up scheduled sends** - Use `scheduled_for` for automated campaigns
2. **Monitor performance** - Check conversion rates per campaign
3. **Optimize** - A/B test subject lines, CTAs, send times
4. **Scale** - Once confident, create campaigns for all segments automatically

---

## Need Help?

- Check server logs: Look for `[v0]` prefixed messages
- Check database: Query `admin_email_campaigns` and `email_logs`
- Check Resend dashboard: View delivery status and opens/clicks
- Check Stripe webhooks: View webhook delivery logs

