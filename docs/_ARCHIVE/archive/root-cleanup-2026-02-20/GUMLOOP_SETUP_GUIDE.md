# 🚀 GUMLOOP EMAIL INTEGRATION - SETUP GUIDE

**Status:** ✅ Code Complete - Ready to Configure & Deploy

---

## 📦 What I Built For You

### ✅ Files Created (9 Files)

1. **`/app/api/admin/gumloop-webhook/route.ts`**
   - Receives AI-generated newsletters from Gumloop
   - Saves to database for your review
   - Auto-schedules for next Monday 9am

2. **`/lib/email/link-library.ts`**
   - Centralized link management
   - Automatic UTM tracking
   - Link validation system

3. **`/lib/email/send-newsletter-broadcast.ts`**
   - Sends approved newsletters via Resend Broadcasts
   - Processes links with tracking
   - Updates database with broadcast ID

4. **`/app/api/cron/send-scheduled-newsletters/route.ts`**
   - New cron job for Gumloop newsletters
   - Runs every 15 minutes
   - Checks for approved newsletters and sends them

5. **`/app/admin/newsletter-review/page.tsx`**
   - Review dashboard (server component)
   - Shows pending, approved, and rejected newsletters
   - Stats overview

6. **`/app/admin/newsletter-review/newsletter-review-client.tsx`**
   - Interactive review interface
   - Preview, approve, reject, send test
   - Real-time updates

7. **`/app/api/admin/email-campaigns/[id]/approve/route.ts`**
   - Approve newsletter endpoint
   - Sets approval_status='approved', status='scheduled'

8. **`/app/api/admin/email-campaigns/[id]/reject/route.ts`**
   - Reject newsletter endpoint
   - Logs rejection reason

9. **`/app/api/admin/email-campaigns/[id]/test/route.ts`**
   - Send test email endpoint
   - Tests before approving

10. **`.env.gumloop-example`**
    - Environment variables template
    - All settings you need to configure

---

## ⚙️ SETUP STEPS (30 minutes)

### Step 1: Add Environment Variables (5 min)

1. **Generate webhook secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to `.env.local`:**
   ```bash
   # Gumloop Integration
   GUMLOOP_WEBHOOK_SECRET=<paste-the-generated-secret>

   # Resend Audience ID (get from Resend dashboard)
   RESEND_AUDIENCE_ID=<your-audience-id>

   # Your existing vars (keep these)
   RESEND_API_KEY=re_your_key
   RESEND_FROM_EMAIL="Sandra @ SSELFIE <hello@sselfie.ai>"
   NEXT_PUBLIC_APP_URL=https://sselfie.ai
   DATABASE_URL=<your-neon-db-url>
   ```

3. **Get Resend Audience ID:**
   - Go to https://resend.com/audience
   - Click "Main Audience"
   - Copy the ID from the URL or settings page
   - Paste into `.env.local`

### Step 2: Deploy to Vercel (5 min)

1. **Commit the new files:**
   ```bash
   git add .
   git commit -m "Add Gumloop email integration"
   git push
   ```

2. **Add environment variables in Vercel:**
   - Go to Vercel project settings
   - Environment Variables
   - Add `GUMLOOP_WEBHOOK_SECRET` and `RESEND_AUDIENCE_ID`
   - Redeploy

3. **Set up the new cron job in `vercel.json`:**

   Open `vercel.json` and add the new cron job to your existing crons:

   ```json
   {
     "crons": [
       {
         "path": "/api/cron/send-scheduled-newsletters",
         "schedule": "*/15 * * * *"
       }
       // ... your existing cron jobs stay here
     ]
   }
   ```

   **IMPORTANT:** Keep all your existing cron jobs:
   - `/api/cron/welcome-sequence`
   - `/api/cron/nurture-sequence`
   - `/api/cron/blueprint-discovery-funnel`
   - etc.

   The new cron is for **Gumloop newsletters only**. Your existing crons handle **automated sequences**.

4. **Redeploy after updating vercel.json**

### Step 3: Configure Gumloop Flow (10 min)

1. **Open your Gumloop flow:**
   https://www.gumloop.com/pipeline?workbook_id=ducD69JPVArQsmnCtPjTsJ

2. **Add voice guidelines to Content Writer agent:**

   Click on "Content Writer Agent" → Edit → Add to system prompt:

   ```
   BRAND VOICE GUIDELINES:
   - Tone: Authentic, empowering, strategic, direct
   - POV: First-person ("I" not "we")
   - Style: Direct, actionable, no fluff
   - Avoid: Corporate jargon, passive voice, excessive adjectives
   - Key phrases: "Here's the truth", "Let me show you", "This changes everything"

   WRITING RULES:
   - Short paragraphs (2-3 sentences max)
   - Bullet points for key takeaways
   - One clear CTA per email
   - Personal stories over generic advice
   - Data-backed insights

   LINK PLACEHOLDERS:
   Use these exact placeholder tags (I'll replace them with tracked links):
   - [link_blueprint]Get Your Blueprint[/link_blueprint]
   - [link_membership]Join Membership[/link_membership]
   - [link_instagram]Follow on Instagram[/link_instagram]
   - [link_preferences]Update Preferences[/link_preferences]
   - [link_unsubscribe]Unsubscribe[/link_unsubscribe]

   EXAMPLE GOOD EMAIL:
   "I analyzed 1,000 Instagram posts this week. Here's what actually works for service-based businesses..."

   EXAMPLE BAD EMAIL:
   "We're excited to share some amazing insights about Instagram best practices..."
   ```

3. **Add HTTP Request step after Content Writer:**

   - Click "+" after Content Writer agent
   - Add "HTTP Request" block
   - Configure:

   **Method:** POST

   **URL:** `https://your-app.vercel.app/api/admin/gumloop-webhook`

   **Headers:**
   ```json
   {
     "Content-Type": "application/json",
     "Authorization": "Bearer YOUR_WEBHOOK_SECRET"
   }
   ```
   *(Replace YOUR_WEBHOOK_SECRET with the actual secret from Step 1)*

   **Body:**
   ```json
   {
     "subject": "{{content_writer.subject}}",
     "body_html": "{{content_writer.body}}",
     "metadata": {
       "campaign_name": "Weekly Newsletter - {{date}}",
       "instagram_insights": "{{audience_analyst.insights}}",
       "strategy": "{{content_strategist.strategy}}"
     }
   }
   ```
   *(Adjust field names based on your actual agent outputs)*

4. **Optional: Add schedule trigger:**
   - Click flow settings
   - Add trigger: "Schedule"
   - Set to: Every Monday at 9:00 AM
   - This makes it fully automatic

5. **Save the flow**

### Step 4: Test End-to-End (10 min)

1. **Run Gumloop flow manually:**
   - Click "Run" in Gumloop
   - Wait for completion
   - Check for success

2. **Check database:**
   ```sql
   SELECT * FROM admin_email_campaigns
   WHERE created_by = 'gumloop-automation'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   Should see a new row with:
   - `status = 'draft'`
   - `approval_status = 'pending'`
   - Your subject line and body

3. **Open review dashboard:**
   - Go to: `https://your-app.vercel.app/admin/newsletter-review`
   - Should see the newsletter pending review

4. **Test the workflow:**
   - Click "Preview" to see the email
   - Enter your email and click "Send Test"
   - Check your inbox
   - Click "Approve & Schedule"
   - Wait up to 15 minutes for cron job to run
   - Check Resend dashboard for broadcast

---

## 📊 HOW IT WORKS (The Full Flow)

```
Monday 9am
   ↓
Gumloop Flow Triggers (automatic)
   ↓
1. Audience Analyst: Analyzes Instagram data
2. Content Strategist: Creates content plan
3. Content Writer: Writes newsletter
   ↓
HTTP Request: Sends to your webhook
   ↓
Your API (/api/admin/gumloop-webhook)
   ↓
Saves to database (status=draft, approval=pending)
   ↓
YOU: Review at /admin/newsletter-review
   ↓
Preview → Send Test → Approve
   ↓
Database updated (status=scheduled, approval=approved)
   ↓
Cron Job (runs every 15 min)
   ↓
Finds approved newsletters ready to send
   ↓
send-newsletter-broadcast.ts
   ↓
- Processes links (adds UTM tracking)
- Validates content
- Creates Resend Broadcast
- Updates database with broadcast_id
   ↓
Resend sends to your audience
   ↓
Webhooks update email_logs (opens, clicks)
   ↓
Track performance in /admin/email-analytics
```

---

## 🔍 MONITORING & MAINTENANCE

### Daily Checks

1. **Review pending newsletters:**
   - Visit `/admin/newsletter-review`
   - Should have 1-2 pending from Gumloop

2. **Check cron job logs:**
   ```bash
   # In Vercel
   Functions → Logs → Filter: send-scheduled-newsletters
   ```

3. **Monitor Resend deliverability:**
   - Resend dashboard → Metrics
   - Should maintain >90% delivery rate

### Weekly Reviews

1. **Newsletter performance:**
   - Open rates (target: >25%)
   - Click rates (target: >3%)
   - Unsubscribe rate (keep <0.5%)

2. **Voice consistency:**
   - Read 1-2 AI-generated newsletters
   - Compare to your best templates
   - Refine Gumloop agent prompts if needed

3. **Link validation:**
   - Spot-check emails for broken links
   - Verify UTM tracking in Google Analytics

### Monthly Optimization

1. **A/B test subject lines:**
   - Try different approaches
   - Track what works best

2. **Review rejected newsletters:**
   - Common issues?
   - Update Gumloop prompts

3. **Segment performance:**
   - Which segments engage most?
   - Adjust targeting

---

## 🆘 TROUBLESHOOTING

### Issue: Gumloop webhook fails

**Check:**
1. Webhook secret matches in both places
2. URL is correct (https://your-domain.vercel.app/api/admin/gumloop-webhook)
3. View Gumloop run logs for error details
4. Check Vercel function logs

**Test webhook manually:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/gumloop-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{
    "subject": "Test Newsletter",
    "body_html": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

Should return: `{"success": true, "campaign": {...}}`

### Issue: Newsletter not sending

**Check:**
1. Is it approved? (`approval_status = 'approved'`)
2. Is it scheduled? (`status = 'scheduled'`)
3. Is scheduled_for in the past? (`scheduled_for <= NOW()`)
4. Check cron job logs in Vercel
5. Verify RESEND_AUDIENCE_ID is set

**Manual send:**
```bash
# Test cron endpoint directly
curl https://your-app.vercel.app/api/cron/send-scheduled-newsletters
```

### Issue: Links not tracked

**Check:**
1. Are placeholders being used? `[link_blueprint]...[/link_blueprint]`
2. Are they being replaced? Check preview in dashboard
3. Are UTM params present? View source of sent email
4. Is campaign_id being passed? Check database

**Test link processing:**
- Send test email to yourself
- View source
- Search for "utm_campaign="
- Should be present on all links

### Issue: Voice doesn't match

**Fix:**
1. Add more examples to Content Writer prompt
2. Emphasize dos/don'ts more clearly
3. Use temperature=0.7 in agent settings (if available)
4. Consider post-processing with another AI step

---

## 📈 SUCCESS METRICS (Track These)

### Week 1 Goals
- ✅ Gumloop → Database working
- ✅ Review dashboard functional
- ✅ 1 test newsletter sent successfully
- ✅ Links properly tracked
- ✅ No broken links

### Month 1 Goals
- ✅ 4 newsletters generated & sent
- ✅ Open rate >25%
- ✅ Click rate >3%
- ✅ Voice consistency >90%
- ✅ Zero manual sending (fully automated)

### Ongoing KPIs
- **Newsletter generation:** 100% automated
- **Delivery rate:** >90%
- **Open rate:** >25%
- **Click rate:** >3%
- **Conversion rate:** >1%
- **Unsubscribe rate:** <0.5%
- **Time saved:** ~2 hours/week

---

## 🎉 WHAT'S NEXT?

### Immediate (This Week)
1. ✅ Complete setup steps above
2. ✅ Test full workflow
3. ✅ Send first automated newsletter

### Short-term (This Month)
1. Monitor and refine voice consistency
2. Optimize subject lines based on open rates
3. A/B test different content approaches
4. Set up Google Analytics goals for email traffic

### Long-term (3+ Months)
1. Add personalization (name, company, etc.)
2. Segment-specific newsletters
3. Automated follow-ups based on engagement
4. Integration with course/product launches

---

## 📚 KEY FILES REFERENCE

### Your Existing Cron Jobs (KEEP THESE)
```
/api/cron/welcome-sequence
/api/cron/nurture-sequence
/api/cron/onboarding-sequence
/api/cron/blueprint-discovery-funnel
/api/cron/reactivation-campaigns
/api/cron/reengagement-campaigns
/api/cron/upsell-campaigns
/api/cron/cold-reeducation-sequence
/api/cron/win-back-sequence
/api/cron/send-blueprint-followups
```

**Purpose:** Automated email sequences triggered by user actions
**Status:** Keep running as-is

### New Gumloop Cron Job (NEW)
```
/api/cron/send-scheduled-newsletters
```

**Purpose:** Send Gumloop-generated weekly newsletters
**Frequency:** Every 15 minutes
**Status:** Add to vercel.json

### Email Infrastructure (UNCHANGED)
```
lib/email/send-email.ts           - Core email sending
lib/email/marketing-template-catalog.ts  - 43 templates
lib/email/segmentation.ts         - Audience segmentation
lib/email/marketing-runner.ts     - Sequence logic
```

**Status:** Keep using for sequences, add newsletter broadcasts

---

## ✅ CHECKLIST

Before going live, verify:

- [ ] Environment variables set in Vercel
- [ ] RESEND_AUDIENCE_ID configured
- [ ] New cron job added to vercel.json
- [ ] Gumloop flow updated with webhook
- [ ] Voice guidelines added to Content Writer
- [ ] Test newsletter sent successfully
- [ ] Links properly tracked (UTM params present)
- [ ] Review dashboard accessible
- [ ] Approve/reject/test functions work
- [ ] First automated newsletter approved & scheduled
- [ ] Monitoring setup (check weekly)

---

## 💡 PRO TIPS

1. **Review before auto-approving:** For the first month, manually review every newsletter. Once confident, you can auto-approve or skip review.

2. **Schedule buffer:** Gumloop generates Monday 9am, you review Monday 9:30am, sends Monday 10am. Gives you time to check.

3. **Voice refinement:** Save your favorite AI-generated emails as examples. Add them to the Content Writer prompt over time.

4. **Link library:** Expand `/lib/email/link-library.ts` as you add new resources, products, or content.

5. **Backup plan:** If Gumloop is down, you can still manually create campaigns in your database or use your existing templates.

6. **Testing:** Always send test emails before approving. Check on mobile and desktop.

---

## 🎯 SUPPORT

If you run into issues:

1. **Check logs:**
   - Gumloop: Flow run history
   - Vercel: Function logs
   - Database: Recent campaigns
   - Resend: Delivery logs

2. **Common fixes:**
   - Redeploy after env var changes
   - Clear cache if dashboard not updating
   - Check Resend API key permissions

3. **Need help?** All the code is well-commented and follows your existing patterns.

---

**You're all set! Follow the setup steps above and you'll have fully automated weekly newsletters powered by AI. 🚀**

**Estimated time to first automated newsletter: 30-45 minutes**
