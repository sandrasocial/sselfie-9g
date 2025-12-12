# Manual Steps Required: Resend Webhook Setup

## ✅ What Has Been Implemented

1. **Resend Webhook Endpoint** (`/api/webhooks/resend/route.ts`)
   - Handles email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained events
   - Updates `email_logs` table with open/click tracking
   - Automatically stops email sequences for spam complaints

2. **Email Analytics Dashboard** (`/app/admin/email-analytics/page.tsx`)
   - Visual dashboard showing campaign performance
   - Open rates, click rates, conversion rates
   - Engagement trends over time
   - Top performing campaigns

3. **Email Analytics API** (`/app/api/admin/email-analytics/route.ts`)
   - Returns comprehensive campaign metrics
   - Revenue attribution
   - Engagement trends

4. **Updated send-email.ts**
   - Now accepts optional `campaignId` parameter
   - Logs campaign_id to email_logs for tracking

---

## 🔧 Manual Steps Required

### Step 1: Configure Resend Webhook

1. **Go to Resend Dashboard:**
   - Visit: https://resend.com/webhooks
   - Or: Settings → Webhooks

2. **Create New Webhook:**
   - Click "Add Webhook" or "Create Webhook"
   - **Endpoint URL:** `https://sselfie.ai/api/webhooks/resend`
   - **Events to Subscribe:**
     - ✅ `email.sent`
     - ✅ `email.delivered`
     - ✅ `email.opened`
     - ✅ `email.clicked`
     - ✅ `email.bounced`
     - ✅ `email.complained`

3. **Save Webhook:**
   - Resend will generate a webhook secret
   - **Copy the webhook secret** (you'll need it for Step 2)

4. **Test Webhook (Optional):**
   - Resend should have a "Test" button
   - Or send a test email and check logs

---

### Step 2: Set Environment Variable

1. **Add to Vercel Environment Variables:**
   - Go to: https://vercel.com/your-project/settings/environment-variables
   - **Variable Name:** `RESEND_WEBHOOK_SECRET`
   - **Value:** (Paste the webhook secret from Step 1)
   - **Environment:** Production (and Preview if you want to test)

2. **Add to Local .env.local (for testing):**
   ```bash
   RESEND_WEBHOOK_SECRET=your_webhook_secret_here
   ```

3. **Redeploy:**
   - After adding the environment variable, redeploy your Vercel project
   - Or wait for next deployment

---

### Step 3: Verify Webhook is Working

1. **Send a Test Email:**
   - Use the admin dashboard or send a campaign
   - Wait a few minutes

2. **Check Email Logs:**
   - Go to `/admin/email-analytics`
   - Check if opens/clicks are being tracked
   - Or query database:
     ```sql
     SELECT * FROM email_logs 
     WHERE opened = true OR clicked = true 
     ORDER BY sent_at DESC 
     LIMIT 10;
     ```

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for: `[v0] [Resend Webhook] Event received`
   - Should see: `[v0] [Resend Webhook] ✅ Marked as opened` or similar

---

### Step 4: Access Analytics Dashboard

1. **Navigate to Dashboard:**
   - Go to: `https://sselfie.ai/admin/email-analytics`
   - Or: Admin Dashboard → Email Analytics (if linked)

2. **View Metrics:**
   - Overall stats (sent, opened, clicked, converted)
   - Campaign performance
   - Engagement trends
   - Top performing campaigns

---

## 🧪 Testing Checklist

- [ ] Webhook endpoint created (`/api/webhooks/resend`)
- [ ] Webhook configured in Resend dashboard
- [ ] `RESEND_WEBHOOK_SECRET` set in Vercel
- [ ] Test email sent
- [ ] Webhook events received (check Vercel logs)
- [ ] `email_logs` table updated with opens/clicks
- [ ] Analytics dashboard shows data
- [ ] Spam complaints stop email sequences

---

## 📊 Expected Results

After setup, you should see:

1. **Email Logs Updated:**
   - `opened = true` when emails are opened
   - `clicked = true` when links are clicked
   - `opened_at` and `clicked_at` timestamps populated

2. **Analytics Dashboard:**
   - Open rates: 20-30% (typical for email campaigns)
   - Click rates: 3-5% (typical)
   - Conversion rates: 1-3% (depends on campaign)

3. **Automatic Sequence Stopping:**
   - Users who mark as spam are automatically removed from sequences
   - `converted_to_user = true` in blueprint_subscribers
   - `converted = true` in welcome_back_sequence

---

## ⚠️ Troubleshooting

### Webhook Not Receiving Events

1. **Check Resend Dashboard:**
   - Verify webhook is active
   - Check webhook delivery logs
   - Look for failed deliveries

2. **Check Vercel Logs:**
   - Look for webhook POST requests
   - Check for errors in logs

3. **Verify URL:**
   - Make sure webhook URL is: `https://sselfie.ai/api/webhooks/resend`
   - Not: `http://` or with trailing slash

### Opens/Clicks Not Tracking

1. **Check email_logs:**
   - Verify `resend_message_id` is populated
   - Check if webhook events are being received

2. **Check Resend:**
   - Some email clients block tracking pixels
   - Opens may not be 100% accurate
   - Clicks are more reliable

3. **Wait a Few Minutes:**
   - Webhook events may be delayed
   - Resend processes events asynchronously

---

## 🎯 Next Steps

After webhook is set up:

1. **Monitor Analytics:**
   - Check dashboard daily
   - Identify best performing campaigns
   - Optimize based on data

2. **A/B Testing:**
   - Test different subject lines
   - Test different CTAs
   - Use analytics to measure results

3. **Segment Optimization:**
   - Identify engaged subscribers
   - Create segments based on engagement
   - Target campaigns to specific segments

---

## ✅ Completion

Once all steps are complete:

- ✅ Webhook receiving events
- ✅ Opens/clicks being tracked
- ✅ Analytics dashboard showing data
- ✅ Email sequences stopping for spam complaints

**You're ready to scale!** 🚀
