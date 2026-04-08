# BUILD AGENT 1: CONTENT CREATION AGENT
**Time: 1 hour | Result: Automatic Instagram content every day**

---

## WHAT THIS AGENT WILL DO

Every day at 9 AM:
1. Analyzes your last 30 Instagram posts
2. Sees what performed best
3. Generates 3 content ideas in YOUR voice
4. Writes full captions + hashtags
5. Sends to your Slack for approval
6. You just click ✅ or adjust

**No more staring at blank screen wondering "what do I post today?"**

---

## STEP-BY-STEP BUILD (Follow Exactly)

### **STEP 1: Open Gumloop (2 min)**

1. Go to app.gumloop.com
2. Click "Create New Flow"
3. Name it: "Content Creation Agent - Daily"
4. Click "Create"

---

### **STEP 2: Add Trigger (3 min)**

1. Click the "+" button to add first node
2. Search for: "Schedule"
3. Select: "Schedule Trigger"
4. Configure:
   - **Frequency:** Daily
   - **Time:** 9:00 AM
   - **Timezone:** Your timezone
5. Click "Save"

**What this does:** Runs the agent automatically every morning

---

### **STEP 3: Fetch Instagram Data (5 min)**

1. Click "+" to add next node
2. Search for: "HTTP Request"
3. Select it
4. Configure:
   - **Method:** GET
   - **URL:** We need your Instagram Graph API endpoint

**PAUSE HERE - We need to set up Instagram API access first**

Actually, let's simplify this for now. We'll use a different approach that doesn't require Instagram API setup immediately.

**NEW Step 3: Use Manual Input First**

1. Click "+" to add node
2. Search for: "Manual Input"
3. Select it
4. Configure:
   - **Input Name:** "Recent Posts Summary"
   - **Type:** Text
   - **Description:** "Paste summary of your recent top posts"

**What this does:** For now, you'll paste a quick summary of your recent posts when you want content ideas. We'll automate the Instagram fetch later.

---

### **STEP 4: Add Claude AI (10 min)**

This is the brain of your agent.

1. Click "+" to add node
2. Search for: "Claude" or "Anthropic"
3. Select: "Claude API Call"
4. Configure:

**API Key:**
- You need a Claude API key from console.anthropic.com
- Click "Get API Key" if you don't have one
- Paste it in Gumloop

**Model:**
- Select: "claude-3-5-sonnet-20241022" (latest)

**System Prompt:** (Copy this exactly)
```
You are Sandra's Content Strategist for her Instagram account (@sandra.social).

SANDRA'S BRAND:
- Focus: Selfies, Personal branding, AI tools, Aesthetic branding
- Audience: Women 30-45+, moms, entrepreneurs rebuilding after heartbreak/burnout/identity loss
- Voice: Simple everyday language, authentic, raw, empowering, warm, friendly, human (not AI)
- Mission: Help women become visible again with systems that make showing up simple

SANDRA'S VOICE GUIDELINES:
- Short sentences
- Clear CTAs
- Real > polished
- Use "you" not "we"
- NO m-dashes ever
- No corporate jargon
- No "reinvention", "hustle", "grind", "girlboss"

CONTENT PILLARS (rotate through these):
1. Identity + Confidence (rebuilding after life transitions)
2. Visibility + Personal Brand (without overthinking)
3. Systems + AI (calm brand operations)
4. Selfies/Self-Expression (aesthetic as tool)
5. Build-in-Public (SSELFIE journey)
6. Monetization (visibility → income)

YOUR TASK:
Generate 3 Instagram content ideas for Sandra to post this week.

For EACH idea, provide:
1. Content Pillar (which pillar it falls under)
2. Format (Reel, Carousel, or Static Post)
3. Hook (first line to stop the scroll)
4. Full Caption (100-200 words in Sandra's voice)
5. Hashtags (5-10 relevant tags)
6. CTA (what action to request)
7. Why This Will Work (based on her audience)

Make it SPECIFIC. Use her exact voice. Reference her actual life (rebuilding, SSELFIE journey, helping women).
```

**User Message:** (Use variable from previous step)
```
Here's what's been performing well recently:

{{Recent Posts Summary}}

Based on this, generate 3 new content ideas that will resonate with my audience.
```

**Max Tokens:** 4000

5. Click "Save"

---

### **STEP 5: Format Output (5 min)**

1. Click "+" to add node
2. Search for: "Text Formatter"
3. Select it
4. Configure:
   - **Input:** {{Claude API Response}}
   - **Format:** Markdown
   - **Template:**
```
🎯 DAILY CONTENT IDEAS - {{Today's Date}}

{{Claude API Response}}

---
React with ✅ to approve or 💬 to adjust
```

5. Click "Save"

---

### **STEP 6: Send to Slack (10 min)**

1. Click "+" to add node
2. Search for: "Slack"
3. Select: "Send Slack Message"
4. Configure:

**Connect Slack:**
- Click "Connect Slack"
- Authorize Gumloop to access your workspace
- Select your workspace

**Channel:**
- Create a new channel called: #content-approvals
- Select it in Gumloop

**Message:**
- Use the formatted output from Step 5
- {{Formatted Content Ideas}}

**Options:**
- ✅ Enable threading
- ✅ Enable reactions

5. Click "Save"

---

### **STEP 7: Test It (10 min)**

1. Click "Test Flow" button (top right)
2. When prompted for "Recent Posts Summary", enter:

```
My recent top posts:
- Tutorial on taking iPhone selfies in natural light (841K views, tons of saves)
- Behind-the-scenes of building SSELFIE (high engagement, many comments asking questions)
- Post about rebuilding after heartbreak (deeply personal, lots of DMs saying "this is me")
```

3. Click "Run Test"
4. Wait 30-60 seconds
5. Check your Slack #content-approvals channel

**You should see:** 3 detailed content ideas with captions, hashtags, CTAs

---

### **STEP 8: Activate It (2 min)**

If the test worked:
1. Click "Activate Flow" (top right)
2. Confirm activation
3. Done!

**Now it runs every day at 9 AM automatically.**

---

## WHAT HAPPENS TOMORROW MORNING

**9:00 AM:**
- Agent wakes up
- Asks you to paste recent posts summary (for now)
- Generates 3 content ideas
- Sends to Slack

**9:05 AM:**
- You check Slack
- Review the 3 ideas
- Pick one (or adjust)
- Post it

**Time saved:** 1.5 hours of "what should I post?"

---

## NEXT: AUTOMATE THE INSTAGRAM DATA FETCH

Right now, you manually paste recent posts. Let's automate that.

**Option A: Use Instagram Graph API**
- Requires: Facebook Developer account + Instagram Business account
- Setup time: 30 min
- Result: Fully automatic data fetch

**Option B: Use Apify Instagram Scraper**
- Easier setup (no API needed)
- Costs: ~$5/month
- Result: Fully automatic data fetch

**Option C: Keep it manual for now**
- Paste summary each time (30 seconds)
- Focus on building other agents first
- Automate later

**Which do you want?**

---

## TROUBLESHOOTING

**If Slack message doesn't send:**
- Check Slack connection in Gumloop settings
- Make sure #content-approvals channel exists
- Re-authorize Slack app

**If Claude doesn't respond:**
- Check API key is correct (console.anthropic.com)
- Make sure you have API credits
- Check system prompt has no syntax errors

**If test fails:**
- Check each node is connected (green line between them)
- Click on failed node to see error message
- Send error to me (Claude Cowork) and I'll help

---

## YOUR AGENT IS LIVE! 🎉

You just built your first AI agent.

**Tomorrow morning at 9 AM:**
- It will run automatically
- Generate content ideas
- Send to Slack
- You just approve and post

**Next agents to build:**
- Agent 2: Email Campaign Agent (writes weekly newsletter)
- Agent 4: DM Auto-Responder (handles "SELFIE", "ENGINE" keywords)
- Agent 3: Lead Qualification (finds your hottest leads)

**Ready to build Agent 2?**

Or do you want to test Agent 1 first and make sure it works for you?
