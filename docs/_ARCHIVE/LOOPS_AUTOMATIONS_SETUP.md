# Loops Automations Setup Guide

## 🚨 CRITICAL: Required Setup in Loops Dashboard

**IMPORTANT:** The cron jobs add tags to contacts, but **Loops automations must be created in the dashboard** for emails to actually be sent. Without these automations, tags will be added but no emails will be sent.

---

## Step-by-Step Setup Instructions

### 1. Access Loops Dashboard
- Go to: https://app.loops.so/loops
- Log in with your Loops account

### 2. Create Automations for Blueprint Followups

#### Blueprint Day 3 Automation
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Day 3 Followup"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-day-3`
4. **Action:** Add email step
   - **Subject:** "3 Ways to Use Your Blueprint This Week"
   - **Content:** Use template from `lib/email/templates/blueprint-followup-day-3`
   - **Delay:** 0 (sends immediately when tag is added)
5. **Save and Activate**

#### Blueprint Day 7 Automation
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Day 7 Followup"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-day-7`
4. **Action:** Add email step
   - **Subject:** "[Name] went from 5K to 25K followers using this system"
   - **Content:** Use template from `lib/email/templates/blueprint-followup-day-7`
   - **Delay:** 0 (sends immediately when tag is added)
5. **Save and Activate**

#### Blueprint Day 14 Automation
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Day 14 Followup"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-day-14`
4. **Action:** Add email step
   - **Subject:** "Still thinking about it? Here's $10 off 💕"
   - **Content:** Use template from `lib/email/templates/blueprint-followup-day-14`
   - **Delay:** 0 (sends immediately when tag is added)
5. **Save and Activate**

### 3. Create Automations for Blueprint Email Sequence

#### Blueprint Upsell Day 3
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Upsell Day 3"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-upsell-day-3`
4. **Action:** Add email step
   - **Subject:** "Ready for the Next Level?"
   - **Content:** Use template from `lib/email/templates/upsell-freebie-membership`
   - **Delay:** 0
5. **Save and Activate**

#### Blueprint Nurture Day 7
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Nurture Day 7"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-upsell-day-7`
4. **Action:** Add email step
   - **Subject:** "One Week In"
   - **Content:** Use template from `lib/email/templates/nurture-day-7`
   - **Delay:** 0
5. **Save and Activate**

#### Blueprint Upsell Day 10
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Upsell Day 10"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-upsell-day-10`
4. **Action:** Add email step
   - **Subject:** "Ready for the Next Level?"
   - **Content:** Use template from `lib/email/templates/upsell-day-10`
   - **Delay:** 0
5. **Save and Activate**

#### Blueprint Win Back Day 14
1. Click **"Create New Loop"**
2. **Name:** "Blueprint Win Back Day 14"
3. **Trigger:** Select "Tag Added" → Enter tag: `blueprint-upsell-day-14`
4. **Action:** Add email step
   - **Subject:** "We Miss You - Here's Something Special"
   - **Content:** Use template from `lib/email/templates/win-back-offer`
   - **Delay:** 0
5. **Save and Activate**

### 4. Create Automations for Welcome Back Sequence

#### Welcome Back Day 7
1. Click **"Create New Loop"**
2. **Name:** "Welcome Back Day 7"
3. **Trigger:** Select "Tag Added" → Enter tag: `welcome-back-day-7`
4. **Action:** Add email step
   - **Subject:** "One Week In"
   - **Content:** Use template from `lib/email/templates/nurture-day-7`
   - **Delay:** 0
5. **Save and Activate**

#### Welcome Back Day 14
1. Click **"Create New Loop"**
2. **Name:** "Welcome Back Day 14"
3. **Trigger:** Select "Tag Added" → Enter tag: `welcome-back-day-14`
4. **Action:** Add email step
   - **Subject:** "We Miss You - Here's Something Special"
   - **Content:** Use template from `lib/email/templates/win-back-offer`
   - **Offer Code:** WELCOMEBACK15
   - **Delay:** 0
5. **Save and Activate**

### 5. Create Automations for Re-engagement Campaigns

**Note:** Re-engagement campaigns use dynamic tags based on campaign ID.

1. For each campaign in `reengagement_campaigns` table:
   - Click **"Create New Loop"**
   - **Name:** "Re-engagement Campaign {campaign_id}" (e.g., "Re-engagement Campaign 1")
   - **Trigger:** Select "Tag Added" → Enter tag: `reengagement-{campaign_id}` (replace with actual ID)
   - **Action:** Add email step
     - **Subject:** Use `subject_line` from `reengagement_campaigns` table
     - **Content:** Use `body_html` or template from `email_template_type`
     - **Delay:** 0
   - **Save and Activate**

**To find campaign IDs:**
```sql
SELECT id, campaign_name, subject_line 
FROM reengagement_campaigns 
WHERE is_active = true;
```

---

## Testing Automations

### Test a Single Automation
1. Go to Loops dashboard → Contacts
2. Find or create a test contact
3. Manually add the trigger tag (e.g., `blueprint-day-3`)
4. Check if automation runs and email is sent
5. Verify email content matches template

### Test Cron Job → Automation Flow
1. Manually trigger a cron job (or wait for scheduled run)
2. Check cron job logs for "Tagged in Loops" messages
3. Check Loops dashboard → Contacts → Verify tag was added
4. Check Loops dashboard → Automation runs → Verify email was sent
5. Check recipient inbox → Verify email was delivered

---

## Verification Checklist

After setting up all automations, verify:

- [ ] All 9 required automations created
  - [ ] Blueprint Day 3
  - [ ] Blueprint Day 7
  - [ ] Blueprint Day 14
  - [ ] Blueprint Upsell Day 3
  - [ ] Blueprint Nurture Day 7
  - [ ] Blueprint Upsell Day 10
  - [ ] Blueprint Win Back Day 14
  - [ ] Welcome Back Day 7
  - [ ] Welcome Back Day 14
- [ ] All automations are **ACTIVE** (not draft)
- [ ] Trigger tags match exactly (case-sensitive)
- [ ] Email content matches templates
- [ ] Test at least one automation end-to-end
- [ ] Re-engagement automations created for active campaigns

---

## Troubleshooting

### Automation Not Triggering
- **Check:** Tag name matches exactly (case-sensitive)
- **Check:** Automation is ACTIVE (not draft)
- **Check:** Contact exists in Loops
- **Check:** Tag was actually added (check in Loops dashboard → Contacts)

### Email Not Sending
- **Check:** Contact is subscribed in Loops
- **Check:** Automation delay settings
- **Check:** Loops sending limits/quota
- **Check:** Email didn't go to spam

### Wrong Email Content
- **Check:** Template matches what's in codebase
- **Check:** Template variables are populated correctly
- **Update:** Edit automation in Loops dashboard

---

## Notes

- **Tag Format:** Tags are case-sensitive. Use exact tag names: `blueprint-day-3` (not `Blueprint-Day-3`)
- **Delays:** All automations use 0 delay (immediate) since cron jobs handle timing
- **Templates:** Copy HTML from template files in `lib/email/templates/` directory
- **Variables:** Loops supports template variables like `{{firstName}}`, `{{email}}`, etc.
- **Testing:** Always test with a real email address before going live

---

**Last Updated:** December 27, 2024

