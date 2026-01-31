# GUMLOOP FLOW BUILD CHECKLIST
**Your visual guide to building all 5 automation flows**

---

## 🎯 BUILD ORDER (Start Here)

Build in this exact order. Don't skip ahead.

```
✅ Flow 1: Daily Content Creation (MOST IMPORTANT)
   ↓
✅ Flow 3: DM Auto-Responder (BIGGEST TIME SAVER)
   ↓
✅ Flow 4: Weekly Email Campaign (REVENUE DRIVER)
   ↓
✅ Flow 5: Lead Scoring (SALES TOOL)
   ↓
✅ Flow 2: Weekly Strategy (BONUS - Build Last)
```

---

## 📋 FLOW 1: DAILY CONTENT CREATION

### Step 1: Create the Flow
- [ ] Go to app.gumloop.com
- [ ] Click "Create New Flow"
- [ ] Look for "AI Flow Builder" or "Generate with AI" button
- [ ] Paste the entire Flow 1 prompt from GUMLOOP_FLOW_PROMPTS.md
- [ ] Click "Generate" or "Create"
- [ ] Wait 30-60 seconds for AI to build the flow

### Step 2: Review What It Built
- [ ] Check that it created these nodes:
  - Schedule trigger (Daily 9 AM)
  - Instagram data fetch node
  - Your "Audience Analyst - Instagram" agent
  - Your "Content Writer Agent"
  - Format output node
  - Slack send node

### Step 3: Connect Integrations
- [ ] **Instagram:** Click the Instagram node → "Connect Account" → Follow OAuth
- [ ] **Slack:** Click Slack node → "Connect Workspace" → Authorize Gumloop
- [ ] **Create Slack Channel:** Go to Slack, create #content-approvals channel

### Step 4: Connect Your Agents
- [ ] Click on "Audience Analyst" node
- [ ] Select your existing "Audience Analyst - Instagram" agent from dropdown
- [ ] Click on "Content Writer" node
- [ ] Select your existing "Content Writer Agent" from dropdown

### Step 5: Test It
- [ ] Click "Test Run" button
- [ ] Watch the flow execute step by step
- [ ] Check your Slack #content-approvals channel
- [ ] You should see: 3 content ideas with captions + hashtags

### Step 6: Activate
- [ ] If test worked → Click "Activate Flow"
- [ ] If test failed → Screenshot the error → Send to me

**✅ SUCCESS:** Flow 1 is live. Tomorrow at 9 AM, you'll get content ideas automatically.

---

## 📋 FLOW 3: DM AUTO-RESPONDER

### Step 1: Create the Flow
- [ ] Click "Create New Flow"
- [ ] Use AI Flow Builder
- [ ] Paste Flow 3 prompt
- [ ] Generate

### Step 2: Set Up Instagram Webhook
**This is the tricky part. Options:**

**Option A: Use Gumloop's Instagram Integration**
- [ ] Add Instagram integration node
- [ ] Select "New DM Received" as trigger
- [ ] Connect your Instagram account

**Option B: Use Manychat (Easier)**
- [ ] Go to manychat.com
- [ ] Connect Instagram
- [ ] Set up automation:
  - Keyword "SELFIE" → Send Blueprint link
  - Keyword "ENGINE" → Send Calendly link
  - Keyword "STUDIO" → Send SSELFIE link
- [ ] Skip Gumloop for this one if too complex

### Step 3: Test Keywords
- [ ] Send yourself a DM with "SELFIE"
- [ ] Check if you get Blueprint link back
- [ ] Test "ENGINE" and "STUDIO" keywords

**✅ SUCCESS:** 80% of DMs handled automatically. You only respond to complex questions.

---

## 📋 FLOW 4: WEEKLY EMAIL CAMPAIGN

### Step 1: Create the Flow
- [ ] Create New Flow
- [ ] Paste Flow 4 prompt
- [ ] Generate

### Step 2: Connect Resend
- [ ] Get Resend API key from resend.com/api-keys
- [ ] In Gumloop, add Resend integration
- [ ] Paste API key
- [ ] Select your email list (3,193 subscribers)

### Step 3: Create Approval Channel
- [ ] Go to Slack
- [ ] Create #email-approvals channel
- [ ] Connect in Gumloop flow

### Step 4: Test It
- [ ] Run test
- [ ] Check Slack for email draft
- [ ] Review the 3 subject line options
- [ ] React with ✅ to approve (don't actually send on first test)

**✅ SUCCESS:** Every Monday 8 AM, you get a newsletter draft in Slack. Approve = auto-send.

---

## 📋 FLOW 5: LEAD SCORING

### Step 1: Create the Flow
- [ ] Create New Flow
- [ ] Paste Flow 5 prompt
- [ ] Generate

### Step 2: Connect Data Sources
- [ ] **Resend API:** For email opens/clicks data
- [ ] **Instagram API:** For engagement data
- [ ] **Neon Database:** For SSELFIE usage data

**If you don't have direct DB access yet:**
- [ ] Simplify to just Resend + Instagram for now
- [ ] Skip SSELFIE usage (add later)

### Step 3: Create Hot Leads Channel
- [ ] Go to Slack
- [ ] Create #hot-leads channel
- [ ] Connect in flow

### Step 4: Test It
- [ ] Run test
- [ ] Check Slack for top 20 leads report
- [ ] Review the personalized DMs it wrote
- [ ] Copy/paste top 5 DMs to send

**✅ SUCCESS:** Every day at 10 AM, you get a list of your hottest leads with ready-to-send DMs.

---

## 📋 FLOW 2: WEEKLY STRATEGY (Build This Last)

### Step 1: Create the Flow
- [ ] Create New Flow
- [ ] Paste Flow 2 prompt
- [ ] Generate

### Step 2: Connect Everything
- [ ] Competitor Research agent
- [ ] Audience Analyst agent
- [ ] Content Writer agent
- [ ] Google Docs integration (for archiving reports)

### Step 3: Test It
- [ ] Run test on Sunday evening
- [ ] Check Slack #weekly-strategy channel
- [ ] Review comprehensive report
- [ ] Check Google Doc was created

**✅ SUCCESS:** Every Sunday 8 PM, you get your strategic plan for the week.

---

## 🔧 TROUBLESHOOTING

### "AI Flow Builder isn't generating the flow correctly"
**Fix:**
1. Make sure you pasted the ENTIRE prompt (including "FLOW STEPS:" section)
2. Try breaking it into smaller pieces
3. Manually add nodes if AI struggles

### "Instagram integration failing"
**Options:**
1. Use Instagram Graph API (requires Facebook Developer account)
2. Use Apify Instagram Scraper (easier, costs ~$5/month)
3. Start with manual input for now, automate later

### "My agents aren't showing up in dropdown"
**Fix:**
1. Go to Gumloop agents page
2. Make sure agents are "Published" (not draft)
3. Refresh the flow builder page
4. Try selecting again

### "Slack messages not sending"
**Fix:**
1. Check Slack connection in Gumloop settings
2. Make sure channels exist (#content-approvals, etc.)
3. Re-authorize Slack app
4. Check channel is public (not private)

### "Flow runs but output is wrong"
**Fix:**
1. Click on the node that's failing
2. Read the error message
3. Check the input data being passed
4. Adjust the prompt to the agent
5. Test again

---

## 📊 SUCCESS METRICS

### After Building Flow 1:
- [ ] You get content ideas at 9 AM daily
- [ ] Ideas are in your voice
- [ ] Include captions + hashtags ready to use
- [ ] Takes 5 min to review instead of 1 hour to create

### After Building Flow 3:
- [ ] DMs with "SELFIE" get Blueprint automatically
- [ ] DMs with "ENGINE" get booking link
- [ ] You only respond to 20% of DMs (the complex ones)
- [ ] Save 1-2 hours/day on DM management

### After Building Flow 4:
- [ ] Weekly newsletter writes itself
- [ ] You just approve and send
- [ ] 3,193 subscribers get consistent emails
- [ ] Save 2-3 hours/week on email writing

### After Building Flow 5:
- [ ] You know exactly who your hottest leads are
- [ ] Personalized DMs ready to copy/paste
- [ ] Focus on top 20 instead of guessing
- [ ] Convert more leads to sales

### After All 5 Flows:
- [ ] 80-90% of operations automated
- [ ] Work 15-20 hours/week instead of 60+
- [ ] Focus on: calls, strategy, content creation
- [ ] Agents handle: writing, scheduling, analytics, DMs

---

## ⏱️ TIME ESTIMATE

**Flow 1:** 30-60 minutes (first one is slowest)
**Flow 3:** 45 minutes (Instagram webhook is tricky)
**Flow 4:** 30 minutes (simpler once you know the system)
**Flow 5:** 45 minutes (multiple data sources)
**Flow 2:** 30 minutes (you'll be a pro by now)

**Total:** 3-4 hours to build all 5 flows

**ROI:** Save 40+ hours/week forever

---

## 🎯 YOUR NEXT ACTION

1. Open app.gumloop.com in one browser tab
2. Open GUMLOOP_FLOW_PROMPTS.md in another tab
3. Copy Flow 1 prompt
4. Paste into AI Flow Builder
5. Follow checklist above
6. Come back and tell me: "Flow 1 is live!" or "I'm stuck on X"

**That's it. Start with Flow 1. Don't overthink it.**

Let's go! 🚀
