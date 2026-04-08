# PARALLEL EXECUTION GUIDE - Option C
**Code Cleanup + Agent 5 Setup**

---

## ✅ SAFETY COMPLETE
- [x] Backup created: `.backups/admin-cleanup-jan31-2026/` (240 files)
- [x] Ready to start deletions

---

## 🎯 HOW THIS WORKS

We'll alternate between **Track A (Code Cleanup)** and **Track B (Agent 5 Setup)**.

- **Track A takes ~10 minutes per batch** (delete + test build)
- **Track B tasks take ~5-15 minutes each** (Gumloop setup)
- **Total time: 3-4 hours** for everything

**While your build is running** (Track A), you'll work on Agent 5 setup (Track B). Maximum efficiency!

---

## TRACK A: CODE CLEANUP BATCHES

### BATCH 1: Test/Development Pages (Safest - Start Here)
**Time: 10 minutes**

```bash
# Navigate to project
cd /path/to/sselfie-9g-1

# Delete test pages (lowest risk)
rm app/admin/test-campaigns/page.tsx
rm app/admin/test-audience-sync/page.tsx
rm app/admin/test-feed-generation/page.tsx
rm -rf app/admin/maya-testing/
rm app/admin/agent/page.tsx

# Delete test API routes
rm -rf app/api/admin/maya-testing/
rm -rf app/api/admin/test-generation/
rm -rf app/api/admin/feed-test/
rm -rf app/api/admin/audience/test-cron/
rm -rf app/api/admin/audience/test-sync/

# Test build
npm run build
```

**Expected result:** Build succeeds, 0 errors

**If it fails:** Check error message, may need to remove imports from other files

---

### BATCH 2: Diagnostic Duplicates
**Time: 10 minutes**

```bash
# Delete duplicate health/diagnostic pages
rm app/admin/blueprint-health/page.tsx
rm app/admin/cron-health/page.tsx
rm app/admin/prompt-health/page.tsx
rm app/admin/webhook-diagnostics/page.tsx
rm app/admin/diagnostics/cron/page.tsx
rm app/admin/diagnostics/errors/page.tsx

# Delete duplicate diagnostic API routes
rm -rf app/api/admin/blueprint-health/
rm -rf app/api/admin/cron-health/
rm -rf app/api/admin/prompt-health/
rm -rf app/api/admin/webhook-diagnostics/
rm -rf app/api/admin/diagnostics/cron-status/
rm -rf app/api/admin/diagnostics/email-status/
rm -rf app/api/admin/diagnostics/stripe-health/

# Test build
npm run build
```

---

### BATCH 3: Email Management Pages
**Time: 10 minutes**

```bash
# Delete redundant email pages (keeping only /admin/alex and /admin/email-analytics)
rm app/admin/email-broadcast/page.tsx
rm app/admin/email-control/page.tsx
rm app/admin/email-sequences/page.tsx
rm app/admin/email-templates/page.tsx
rm app/admin/launch-email/page.tsx
rm app/admin/test-broadcast/page.tsx

# Delete email API routes (LARGE deletion - be careful)
rm -rf app/api/admin/email/activate-automation/
rm -rf app/api/admin/email/check-automation/
rm -rf app/api/admin/email/create-automation-sequence/
rm -rf app/api/admin/email/create-beta-segment/
rm -rf app/api/admin/email/diagnose-test/
rm -rf app/api/admin/email/get-automation-details/
rm -rf app/api/admin/email/preview-campaign/
rm -rf app/api/admin/email/preview-launch/
rm -rf app/api/admin/email-control/
rm -rf app/api/admin/email-templates/
rm -rf app/api/admin/broadcast/

# Test build
npm run build
```

⚠️ **Warning:** This batch removes a lot of email automation code. If Agent 5 isn't ready yet, you might want to keep some of these temporarily.

---

### BATCH 4: Content & Feed Duplicates
**Time: 10 minutes**

```bash
# Delete content management duplicates
rm app/admin/prompt-guides/page.tsx
rm app/admin/prompt-guide-builder/page.tsx

# Delete feed duplicates (keeping only v2)
rm app/admin/feed-styles/page.tsx
rm app/admin/feed-positions/page.tsx

# Delete API routes
rm -rf app/api/admin/guides/
rm -rf app/api/admin/prompt-guides/
rm -rf app/api/admin/writing-assistant/
rm -rf app/api/admin/feed-styles/

# Test build
npm run build
```

---

### BATCH 5: Half-Finished/Unclear Pages
**Time: 10 minutes**

```bash
# Delete unclear purpose pages
rm app/admin/beta/page.tsx
rm app/admin/conversions/page.tsx
rm app/admin/composition-analytics/page.tsx

# Delete misc fix routes
rm -rf app/api/admin/fix-email-system/
rm -rf app/api/admin/fix-lora/
rm -rf app/api/admin/generate-prompts-with-maya/
rm -rf app/api/admin/generate-variation/

# Test build
npm run build
```

---

### BATCH 6: Update Admin Navigation
**Time: 15 minutes**

After all deletions, you need to update your admin navigation to remove links to deleted pages.

**File to edit:** Find your admin navigation component (likely `components/admin/admin-nav.tsx` or similar)

**Remove these nav items:**
- Email Broadcast
- Email Control
- Email Sequences
- Email Templates
- All test pages
- All duplicate diagnostic pages
- Prompt Guides
- Old feed styles
- Beta/Conversions/Composition Analytics

**Keep these 18 core pages:**
1. Dashboard (`/admin`)
2. Mission Control
3. Growth Dashboard
4. System Diagnostics
5. Alex (AI Assistant)
6. Content Templates
7. Email Analytics
8. Calendar
9. Feedback
10. Academy
11. Login as User
12. Maya Studio
13. Feed Styles V2
14. Fashion Styles
15. Libraries
16. Brand Engine
17. Credits
18. Journal

Test navigation: Click through each remaining link to ensure no 404s.

---

## TRACK B: AGENT 5 SETUP (Email Campaign Automation)

### TASK 1: Set Up Gumloop Account & Integrations (15 min)

**If you don't have Gumloop yet:**
1. Go to https://gumloop.com
2. Sign up with your email
3. Choose a plan (Pro plan recommended - $200/mo)

**Connect integrations:**
1. Click "Integrations" in Gumloop
2. Add these:
   - **Instagram**: Connect your account
   - **Slack**: Connect your workspace
   - **Resend**: Add API key from your `.env` file
   - **Database**: Connect your Neon database (use `DATABASE_URL` from `.env`)

**Create Slack channels:**
1. In Slack, create these new channels:
   - `#email-approvals` - For newsletter drafts
   - `#hot-leads` - For lead reports (later)
   - `#daily-report` - For analytics (later)

---

### TASK 2: Import Your Existing Agents to Gumloop (10 min)

You need to make your 4 existing agents available in Gumloop flows.

**Option A: If agents are already in Gumloop**
- Just note their names, you'll reference them

**Option B: If agents are external**
- In Gumloop, go to "Agents"
- Click "Import Agent"
- Add each of your 4 agents:
  1. Content Writer Agent
  2. Competitor Research Agent
  3. Audience Analyst - Instagram
  4. Content Strategist Agent

---

### TASK 3: Create Agent 5 Flow Structure (20 min)

**In Gumloop:**

1. Click **"Create New Flow"**
2. Name it: **"Weekly Newsletter Generator"**
3. Set trigger: **Schedule - Every Monday at 8:00 AM**

Now add these steps:

**Step 1: Fetch Instagram Posts**
- Node type: "Instagram Integration"
- Action: "Get Recent Media"
- Settings:
  - Time range: Last 7 days
  - Include insights: Yes
  - Fields: `id, caption, like_count, comments_count, media_url, timestamp, insights.engagement`
- Output variable: `recent_posts`

**Step 2: Call Audience Analyst Agent**
- Node type: "AI Agent"
- Agent: Your "Audience Analyst - Instagram"
- Input: `{{recent_posts}}`
- Prompt:
  ```
  Analyze these Instagram posts from the last 7 days.

  Posts data: {{recent_posts}}

  Tell me:
  1. Which content topics got the most engagement?
  2. What patterns do you see in comments/saves?
  3. What does the audience want more of?

  Keep analysis under 150 words, be specific with numbers.
  ```
- Output variable: `audience_insights`

**Step 3: Call Content Strategist Agent**
- Node type: "AI Agent"
- Agent: Your "Content Strategist Agent"
- Input: `{{recent_posts}}` + `{{audience_insights}}`
- Prompt:
  ```
  Based on this week's Instagram performance, recommend:

  Performance data: {{recent_posts}}
  Audience insights: {{audience_insights}}

  What should be the ONE main topic for this week's newsletter?
  Which offer should I pitch? (Options: SELFIE Blueprint, Brand Engine, SSELFIE Studio)

  Return as JSON:
  {
    "topic": "recommended topic",
    "reasoning": "why this topic",
    "offer": "which offer to pitch",
    "cta": "suggested call to action"
  }
  ```
- Output variable: `strategy_rec`

---

### TASK 4: Build Newsletter Generator Step (25 min)

**Step 4: Call Content Writer Agent**
- Node type: "AI Agent"
- Agent: Your "Content Writer Agent"
- Input: All previous outputs
- Prompt (this is the big one):
  ```
  Write Sandra's weekly email newsletter for her Instagram audience.

  CONTEXT:
  Recent Instagram performance: {{recent_posts}}
  What resonated: {{audience_insights}}
  Strategy recommendation: {{strategy_rec}}

  STRUCTURE:
  1. Subject Lines: Create 3 options (45-55 characters each)
     - Make them curiosity-driven
     - Avoid clickbait
     - Reference the topic naturally

  2. Opening (2-3 sentences):
     - Hook based on top performing Instagram content
     - Reference something specific from this week
     - Make it personal and conversational

  3. Body (200-300 words):
     - Expand on the topic from {{strategy_rec.topic}}
     - Share actionable advice or insight
     - Use short paragraphs (2-3 sentences max)
     - Include 1-2 specific examples or tips

  4. Soft Pitch (1-2 sentences):
     - Naturally mention {{strategy_rec.offer}}
     - Don't be salesy, just make it relevant
     - If SELFIE Blueprint → "PS: If you want my free guide to taking professional selfies, just comment SELFIE"
     - If Brand Engine → "If this resonates and you want help building your content system, I have 2 intensive spots open: [link]"
     - If SSELFIE Studio → "Ready to create your own brand photos? Try SSELFIE Studio: [link]"

  5. CTA:
     - Use {{strategy_rec.cta}}
     - Make it clear and simple

  SANDRA'S VOICE:
  - Write like you're texting a friend
  - Short, punchy sentences
  - Use "you" not "we"
  - Be warm, direct, authentic
  - NO m-dashes (—)
  - NO corporate speak
  - NO fluff

  BAD: "We're excited to share this transformative insight with you today!"
  GOOD: "I figured something out this week. Want to hear it?"

  RETURN AS JSON:
  {
    "subject_options": [
      "Subject line option 1",
      "Subject line option 2",
      "Subject line option 3"
    ],
    "body_html": "<html formatted email body>",
    "body_text": "plain text version of body",
    "offer_mentioned": "which offer was pitched",
    "cta": "the call to action used"
  }
  ```
- Output variable: `newsletter_draft`

---

### TASK 5: Create Slack Approval Flow (15 min)

**Step 5: Format Slack Preview**
- Node type: "Text Formatter"
- Template:
  ```
  📧 WEEKLY NEWSLETTER DRAFT - {{current_date}}

  ━━━━━━━━━━━━━━━━━━━━━━━━━

  📌 SUBJECT LINE OPTIONS:
  1️⃣ {{newsletter_draft.subject_options[0]}}
  2️⃣ {{newsletter_draft.subject_options[1]}}
  3️⃣ {{newsletter_draft.subject_options[2]}}

  ━━━━━━━━━━━━━━━━━━━━━━━━━

  👀 PREVIEW (first 150 words):
  {{substring(newsletter_draft.body_text, 0, 150)}}...

  ━━━━━━━━━━━━━━━━━━━━━━━━━

  💡 OFFER: {{newsletter_draft.offer_mentioned}}
  🎯 CTA: {{newsletter_draft.cta}}

  ━━━━━━━━━━━━━━━━━━━━━━━━━

  React ✅ to approve and send
  React 💬 to provide edits

  [Full draft attached below]

  {{newsletter_draft.body_text}}
  ```
- Output variable: `slack_message`

**Step 6: Send to Slack**
- Node type: "Slack Integration"
- Action: "Send Message"
- Channel: `#email-approvals`
- Message: `{{slack_message}}`
- Mention: `@Sandra` (use your Slack user ID)
- Attachments: Include full HTML version

**Step 7: Wait for Reaction**
- Node type: "Slack Wait for Reaction"
- Message: (reference message from Step 6)
- Reactions to wait for: `✅` or `💬`
- Timeout: 4 hours

---

### TASK 6: Send Email if Approved (15 min)

**Step 8: Conditional Branch**
- Node type: "Conditional"
- Condition: `If reaction = ✅`
- Then: Continue to Step 9
- Else: Stop (you'll edit manually)

**Step 9: Send via Resend**
- Node type: "Resend Integration"
- Action: "Send Email"
- Settings:
  - From: `Sandra <ssa@ssasocial.com>`
  - To: Audience ID `3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd` (your all subscribers list)
  - Subject: `{{newsletter_draft.subject_options[0]}}` (uses first option by default)
  - HTML: `{{newsletter_draft.body_html}}`
  - Text: `{{newsletter_draft.body_text}}`
  - Tags: `campaign:weekly-newsletter`, `date:{{current_date}}`
- Output variable: `send_result`

**Step 10: Log Send**
- Node type: "Database Insert"
- Table: `email_campaigns` (or create a new one)
- Data:
  ```json
  {
    "campaign_name": "Weekly Newsletter {{current_date}}",
    "campaign_type": "newsletter",
    "subject_line": "{{newsletter_draft.subject_options[0]}}",
    "status": "sent",
    "sent_at": "{{current_timestamp}}",
    "recipient_count": 3193,
    "resend_email_id": "{{send_result.id}}"
  }
  ```

---

### TASK 7: Wait and Report Results (10 min)

**Step 11: Delay**
- Node type: "Delay"
- Duration: 24 hours

**Step 12: Fetch Email Stats**
- Node type: "Resend Integration"
- Action: "Get Email Stats"
- Email ID: `{{send_result.id}}`
- Output variable: `email_stats`

**Step 13: Report to Slack**
- Node type: "Slack Integration"
- Action: "Send Message"
- Channel: `#email-approvals`
- Message:
  ```
  📊 NEWSLETTER RESULTS - {{current_date}}

  Subject: {{newsletter_draft.subject_options[0]}}

  📧 Sent: 3,193
  📬 Opens: {{email_stats.opens}} ({{email_stats.open_rate}}%)
  🖱️ Clicks: {{email_stats.clicks}} ({{email_stats.click_rate}}%)
  ❌ Bounces: {{email_stats.bounces}}
  🚫 Unsubscribes: {{email_stats.unsubscribes}}

  {{email_stats.open_rate > 30 ? "🎉 Great open rate!" : "💡 Try different subject lines next time"}}
  ```

---

### TASK 8: Test Agent 5 Flow (20 min)

**Before going live, test with dummy data:**

1. In Gumloop, click **"Test Flow"**
2. Use **manual trigger** instead of schedule
3. Provide sample Instagram data (last week's posts)
4. Watch each step execute
5. Check Slack for the draft
6. Review the newsletter quality

**Things to verify:**
- ✅ Instagram data fetches correctly
- ✅ Agents respond with good analysis
- ✅ Newsletter is well-written in Sandra's voice
- ✅ Subject lines are compelling
- ✅ Slack message formats correctly
- ✅ Email would send to right audience

**If something fails:**
- Check agent prompts (too vague?)
- Verify integration connections
- Look at error logs in Gumloop
- Test individual steps

---

### TASK 9: Go Live Next Monday (5 min)

Once you're happy with the test:

1. In Gumloop flow settings:
   - ✅ Enable flow
   - ✅ Set trigger: Monday 8:00 AM
   - ✅ Set timezone: Your local time
2. Save changes
3. Add a calendar reminder to check Slack at 8:30 AM Monday
4. First run: Approve manually to verify everything works
5. After 2-3 successful runs: Let it send automatically (optional enhancement)

---

## TIMING SCHEDULE (3-4 hours total)

**Hour 1:**
- ✅ Safety backup (done)
- Track A: Batch 1 (10 min) → Test build
- Track B: Task 1 - Gumloop setup (15 min) *while build runs*
- Track A: Batch 2 (10 min) → Test build
- Track B: Task 2 - Import agents (10 min) *while build runs*
- Track A: Batch 3 (10 min) → Test build

**Hour 2:**
- Track B: Task 3 - Flow structure (20 min)
- Track A: Batch 4 (10 min) → Test build
- Track B: Task 4 - Newsletter generator (25 min)

**Hour 3:**
- Track A: Batch 5 (10 min) → Test build
- Track B: Task 5 - Slack approval (15 min)
- Track B: Task 6 - Email sending (15 min)
- Track A: Batch 6 - Update navigation (15 min)

**Hour 4:**
- Track B: Task 7 - Results reporting (10 min)
- Track B: Task 8 - Testing (20 min)
- Final verification: Test all remaining admin pages
- Track B: Task 9 - Go live (5 min)
- Celebrate! 🎉

---

## CHECKPOINTS

After each hour, verify:

**After Hour 1:**
- [ ] Batches 1-3 deleted successfully
- [ ] Build passes with no errors
- [ ] Gumloop connected
- [ ] Agents imported

**After Hour 2:**
- [ ] Batches 4-5 deleted
- [ ] Agent 5 flow structure complete
- [ ] Newsletter generator working

**After Hour 3:**
- [ ] All deletions complete
- [ ] Navigation updated
- [ ] Agent 5 fully built

**After Hour 4:**
- [ ] Agent 5 tested successfully
- [ ] Set to go live Monday
- [ ] All admin pages load correctly

---

## TROUBLESHOOTING

### Code Cleanup Issues

**Build fails after deletion:**
1. Read error message carefully
2. Look for import statements referencing deleted files
3. Search codebase: `grep -r "deleted-file-name" .`
4. Remove or update imports
5. Rebuild

**Broken links in admin:**
1. Find navigation component
2. Remove links to deleted pages
3. Test each remaining link

**Need to restore a file:**
```bash
cp .backups/admin-cleanup-jan31-2026/admin/some-page/page.tsx app/admin/some-page/
```

### Agent 5 Issues

**Instagram integration not working:**
- Check API permissions
- Verify access token not expired
- Test integration separately in Gumloop

**Agent responses are bad:**
- Refine prompts with more examples
- Add constraints (word count, format)
- Test agent separately first

**Slack not receiving messages:**
- Verify channel name is exact
- Check Slack integration connected
- Test with simple message first

**Email not sending:**
- Verify Resend API key
- Check audience ID is correct
- Look at Resend dashboard for errors

---

## SUCCESS CRITERIA

You're done when:

✅ **Code Cleanup:**
- 34 pages deleted
- 80+ API routes removed
- Build passes with 0 errors
- 18 core admin pages load correctly
- Navigation updated

✅ **Agent 5:**
- Flow built in Gumloop
- Test run successful
- Slack approval works
- Email sends correctly
- Scheduled for Monday 8 AM

**Expected impact starting next week:**
- 5 hours/week saved on newsletter writing
- Consistent Monday newsletter delivery
- Data-driven content strategy
- Professional, on-brand emails

---

## NEXT STEPS AFTER TODAY

**This Week:**
- Monday: First Agent 5 run - approve manually
- Review newsletter quality
- Tweak prompts if needed

**Next Week:**
- Build Agent 6 (Lead Qualification) - saves 3 hours/day
- Build Agent 9 (Analytics Reporter) - saves 2 hours/day

**Month 1:**
- All 6 agents running
- 32 hours/week saved
- $74,624/month capacity unlocked

---

## QUESTIONS WHILE WORKING?

**Code cleanup stuck?**
- Check the error message
- Search for imports: `grep -r "filename"`
- Restore from backup if needed

**Gumloop confusing?**
- Check docs: https://docs.gumloop.com
- Test each step individually
- Start simple, add complexity

**Agent not working?**
- Review prompt clarity
- Test with manual data first
- Check integration connections

**Need help?**
- Pause and ask specific question
- Include error message
- Show what you tried

---

## LET'S GO! 🚀

**Start with:**
1. Run Batch 1 deletions (Track A)
2. While build is running, start Task 1 in Gumloop (Track B)
3. Alternate back and forth

**Ready? Let's execute!**

---

_Save this document. Follow it step by step. Check off items as you complete them. You've got this! 💪_
