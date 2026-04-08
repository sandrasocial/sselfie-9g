# GUMLOOP AI FLOW BUILDER PROMPTS
**Use these exact prompts in Gumloop to build your automated workflows**

---

## YOUR EXISTING AGENTS

You already have:
1. **Content Writer Agent** - Writes captions, story sequences, carousel copy
2. **Competitor Research Agent** - Monitors similar creators, finds content gaps
3. **Audience Analyst - Instagram** - Studies followers, tracks preferences, opportunities

Now we build FLOWS that connect them together and automate your business.

---

## FLOW 1: DAILY CONTENT CREATION SYSTEM

**Click "Create New Flow" in Gumloop, then paste this into the AI Flow Builder:**

```
Create a daily content creation flow that runs every day at 9 AM.

FLOW STEPS:
1. Trigger: Schedule (Daily at 9:00 AM)

2. Fetch Instagram data:
   - Use Instagram integration to get my last 7 days of posts
   - Get engagement metrics (likes, comments, saves, shares)
   - Identify top 3 performing posts

3. Call my "Audience Analyst - Instagram" agent:
   - Pass the Instagram data
   - Ask: "What content themes are resonating? What does my audience want more of?"
   - Store response as "audience_insights"

4. Call my "Content Writer Agent":
   - Pass the audience insights
   - Pass top performing posts data
   - Prompt: "Based on these insights, create 3 Instagram content ideas for today. Include:
     - Format (Reel, Carousel, or Post)
     - Hook (first line)
     - Full caption (100-200 words)
     - Hashtags (5-10 tags)
     - CTA (call to action)
     Write in Sandra's voice: simple, direct, warm, authentic. No m-dashes."
   - Store response as "content_ideas"

5. Format the output:
   - Create a clean message with:
     * Audience insights summary
     * 3 content ideas with full captions
     * Recommended posting times

6. Send to Slack:
   - Channel: #content-approvals
   - Message: The formatted content ideas
   - Add reactions for approval (✅ or 💬)

7. Wait for approval:
   - If ✅ reaction: Log as approved
   - If 💬 comment: Store feedback for next iteration

INTEGRATIONS NEEDED:
- Instagram (for data fetch)
- Slack (for notifications)
- Schedule trigger (daily 9 AM)
- My existing agents: Audience Analyst, Content Writer

OUTPUT: Daily content ideas sent to Slack for review/approval
```

---

## FLOW 2: WEEKLY COMPETITOR ANALYSIS + CONTENT STRATEGY

**Create another flow, paste this:**

```
Create a weekly strategic planning flow that runs every Sunday at 8 PM.

FLOW STEPS:
1. Trigger: Schedule (Weekly on Sunday at 8:00 PM)

2. Call my "Competitor Research Agent":
   - Prompt: "Analyze my niche (personal branding, AI tools, selfie content for women entrepreneurs).
     Find:
     - What content is trending this week
     - What topics are getting high engagement
     - Content gaps I could fill
     - Unique angles I should take
     Focus on creators targeting women 30-45, moms, entrepreneurs."
   - Store response as "competitor_insights"

3. Fetch my Instagram analytics:
   - Get last 7 days of my posts
   - Calculate engagement rates
   - Identify top content pillar
   - Store as "my_performance"

4. Call my "Audience Analyst - Instagram" agent:
   - Pass my performance data
   - Prompt: "Analyze my audience engagement from this week. What patterns do you see? What are they responding to? What questions are they asking in comments?"
   - Store response as "audience_analysis"

5. Synthesize strategy with "Content Writer Agent":
   - Pass: competitor_insights, my_performance, audience_analysis
   - Prompt: "Create my content strategy for next week. Include:
     - 5 specific post ideas (with formats and topics)
     - Which content pillar to focus on
     - What CTA to use this week (SELFIE, ENGINE, or STUDIO)
     - 3 story sequence ideas
     - Why these will work based on data
     Write as strategic recommendations in Sandra's voice."
   - Store as "weekly_strategy"

6. Format comprehensive report:
   - Section 1: Competitor insights
   - Section 2: Audience analysis
   - Section 3: Weekly content strategy
   - Section 4: Action items for the week

7. Send to Slack:
   - Channel: #weekly-strategy
   - Message: Full strategic report
   - Pin the message

8. Create Google Doc:
   - Title: "Content Strategy - Week of [Date]"
   - Content: Full report
   - Share link in Slack

INTEGRATIONS NEEDED:
- Instagram (analytics)
- Slack (notifications)
- Google Docs (strategic archive)
- Schedule trigger (Sunday 8 PM)
- My existing agents: Competitor Research, Audience Analyst, Content Writer

OUTPUT: Comprehensive weekly strategy report sent to Slack + archived in Google Docs
```

---

## FLOW 3: INSTAGRAM DM AUTO-RESPONDER

**Create another flow, paste this:**

```
Create a real-time Instagram DM auto-responder that handles common keyword requests.

FLOW STEPS:
1. Trigger: Instagram webhook (new DM received)

2. Extract message:
   - Get DM text
   - Get sender username
   - Store as "dm_content" and "sender"

3. Keyword detection:
   - Check if message contains:
     * "SELFIE" or "blueprint" → Route to Path A
     * "ENGINE" or "intensive" → Route to Path B
     * "STUDIO" or "creator" → Route to Path C
     * None of the above → Route to Path D

4A. If keyword = SELFIE:
   - Send automated reply: "Here's your FREE Selfie Brand Blueprint! 📸 [LINK]
     This guide shows you exactly how to take professional iPhone selfies for your brand.
     Questions? Just reply and I'll get back to you."
   - Log interaction in database

4B. If keyword = ENGINE:
   - Send automated reply: "Love that you're interested in the Brand Engine! 🚀
     This is my done-WITH-you AI brand system intensive ($3,500).
     Book a quick call here to see if it's right for you: [CALENDLY LINK]"
   - Flag as high-intent lead in Slack
   - Log interaction

4C. If keyword = STUDIO:
   - Send automated reply: "Ready to start creating? ✨
     SSELFIE Studio lets you generate professional brand photos using AI.
     Start here: [SSELFIE.STUDIO LINK]
     Creator Studio is $97/month or grab a Starter Photoshoot for $49."
   - Log interaction

4D. If no keyword match:
   - Call "Audience Analyst - Instagram" agent:
     - Pass: dm_content, sender info
     - Prompt: "This is a DM from a follower. Analyze:
       - Is this a question I can answer automatically?
       - Is this high-intent (looking to buy)?
       - Is this support-related?
       - Suggested response category"
     - Store as "dm_analysis"

   - If high-intent:
     - Flag for manual response in Slack (#high-priority-dms)
     - Include: Full DM, sender info, analysis

   - If general question:
     - Call "Content Writer Agent":
       - Prompt: "Write a warm, helpful response to this DM in Sandra's voice: [dm_content]"
       - Send automated response
       - Log interaction

   - If support-related:
     - Send to #customer-support channel in Slack
     - Auto-reply: "Thanks for reaching out! I'll get back to you within 24 hours."

5. Log all interactions:
   - Store in database: timestamp, sender, message, response, category
   - Use for analytics

INTEGRATIONS NEEDED:
- Instagram (DM webhook)
- Slack (flagging system)
- Database (interaction logging)
- My existing agents: Audience Analyst, Content Writer

OUTPUT: 80% of DMs handled automatically, 20% flagged for personal response
```

---

## FLOW 4: WEEKLY EMAIL CAMPAIGN GENERATOR

**Create another flow, paste this:**

```
Create a weekly email newsletter automation that runs every Monday at 8 AM.

FLOW STEPS:
1. Trigger: Schedule (Weekly on Monday at 8:00 AM)

2. Fetch best content from last week:
   - Get Instagram posts from last 7 days
   - Sort by engagement
   - Get top performing post
   - Store as "top_post"

3. Call "Audience Analyst - Instagram" agent:
   - Pass: Last week's Instagram engagement data
   - Prompt: "Analyze comments and engagement from this week. What questions are people asking? What resonates most? What should I address in my newsletter?"
   - Store as "audience_needs"

4. Call "Content Writer Agent":
   - Pass: top_post, audience_needs, current offer (SELFIE/ENGINE/STUDIO)
   - Prompt: "Write my weekly email newsletter.

     Structure:
     - Subject line (3 options to choose from)
     - Opening: Reference the top performing post/topic
     - Body: Expand on that topic with actionable advice (200-300 words)
     - Soft pitch: Include relevant offer based on topic
     - CTA: Clear next step

     Style:
     - Sandra's voice: Simple, direct, warm, real
     - No m-dashes
     - Short sentences
     - Use 'you' not 'we'

     Current offers to mention:
     - FREE Selfie Blueprint (comment SELFIE)
     - Brand Engine Intensive ($3,500 - book call)
     - SSELFIE Studio ($97/month or $49 starter)"
   - Store as "email_draft"

5. Format email:
   - Create HTML version
   - Create plain text version
   - Add unsubscribe footer

6. Send to Slack for approval:
   - Channel: #email-approvals
   - Message: "📧 WEEKLY NEWSLETTER DRAFT

     Subject options:
     [Option 1]
     [Option 2]
     [Option 3]

     [Full email body]

     React with ✅ to approve and send, or 💬 to edit"

7. Wait for approval:
   - If ✅ within 2 hours: Send to email list (3,193 subscribers via Resend)
   - If 💬: Hold and wait for edits
   - If no response after 4 hours: Send reminder to Slack

8. After sending:
   - Track metrics (opens, clicks, conversions)
   - Report in Slack 24 hours later

INTEGRATIONS NEEDED:
- Instagram (data fetch)
- Resend (email sending)
- Slack (approval flow)
- Schedule trigger (Monday 8 AM)
- My existing agents: Audience Analyst, Content Writer

OUTPUT: Weekly newsletter written, approved, and sent automatically
```

---

## FLOW 5: LEAD SCORING & QUALIFICATION

**Create another flow, paste this:**

```
Create a daily lead qualification system that identifies your hottest prospects.

FLOW STEPS:
1. Trigger: Schedule (Daily at 10:00 AM)

2. Fetch engagement data from multiple sources:
   - Resend: Email opens/clicks from last 7 days
   - Instagram: Post engagement, story views, DM activity
   - Neon database: SSELFIE usage (free users, credits used, features tried)
   - Store each as separate variables

3. Call "Audience Analyst - Instagram" agent:
   - Pass: All engagement data
   - Prompt: "Score each person based on their behavior. Create a lead score (0-100) for each person based on:

     Email engagement (30 points):
     - Opened 3+ emails in 7 days: 30 pts
     - Opened 1-2 emails: 15 pts
     - Clicked links: +10 pts

     Instagram engagement (30 points):
     - Commented 3+ times: 30 pts
     - Viewed all stories: 20 pts
     - Sent DM asking questions: 25 pts

     SSELFIE usage (20 points):
     - Used 10+ free credits: 20 pts
     - Tried Pro Mode: 15 pts
     - Created feed: 10 pts

     Recency (20 points):
     - Activity in last 24 hours: 20 pts
     - Last 3 days: 10 pts
     - Last 7 days: 5 pts

     Return top 20 leads with scores and why they're qualified."
   - Store as "scored_leads"

4. For each top 20 lead, call "Content Writer Agent":
   - Pass: Individual's behavior/activity
   - Prompt: "Write a personalized Instagram DM for this person.

     Their activity: [specific behaviors]

     Personalize based on what they engaged with.
     Offer relevant next step:
     - If high SSELFIE usage → Invite to Creator Studio
     - If asking questions → Offer Brand Engine intensive
     - If tutorial engagement → Send Blueprint

     Keep it warm, direct, not salesy. Sandra's voice."
   - Store as "personalized_dm_[name]"

5. Create lead report:
   - Format as clean list:
     * Top 20 leads
     * Score for each
     * Why they're qualified
     * Personalized DM (ready to copy/paste)
     * Suggested action

6. Send to Slack:
   - Channel: #hot-leads
   - Message: Full report with all 20 leads
   - Make DMs easy to copy/paste
   - Add quick action buttons

7. Track conversions:
   - Log which leads were contacted
   - Track responses
   - Update lead scores based on outcomes

INTEGRATIONS NEEDED:
- Resend API (email data)
- Instagram API (engagement data)
- Neon database (SSELFIE usage)
- Slack (reporting)
- Schedule trigger (daily 10 AM)
- My existing agents: Audience Analyst, Content Writer

OUTPUT: Daily list of 20 hottest leads with personalized DMs ready to send
```

---

## HOW TO USE THESE PROMPTS

**For each flow:**

1. Go to Gumloop
2. Click "Create New Flow"
3. Look for "AI Flow Builder" or "Generate with AI" button
4. Paste the entire prompt
5. Let Gumloop AI build the flow
6. Review the flow it creates
7. Connect your existing agents where needed
8. Test it
9. Activate it

**The AI should:**
- Understand the flow structure
- Connect your existing agents
- Set up triggers and schedules
- Create the integrations
- Build the complete workflow

**You just:**
- Approve what it creates
- Test to make sure it works
- Activate it

---

## START WITH FLOW 1 (Daily Content Creation)

That's the most valuable one. Build it first, test it, see it work.

Then build the others one by one.

**Which flow do you want to build first?**

Tell me and I'll help you refine the prompt if needed.
