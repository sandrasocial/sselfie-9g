# Brand Engine Setup Guide (For Sandra)

**Goal:** Get your Brand Engine generating real weekly briefs and daily plans using AI.

**What you'll do:** Import a scenario into Make.com, connect it to OpenAI, and click "Run once" to see magic happen!

**Time needed:** 30 minutes

---

## What You Need

Before we start, gather these:

1. ✅ **Make.com account** (you have this - I see the screenshot!)
2. ⬜ **OpenAI API key** (we'll get this together)
3. ⬜ **Your app URL** (your SSELFIE app URL)

---

## Step 1: Get Your OpenAI API Key (5 mins)

### Why do we need this?
OpenAI is the AI that will read your Brand Brain and generate content in YOUR voice. You're paying OpenAI directly, not us.

### How to get it:

1. **Go to:** https://platform.openai.com/api-keys
2. **Log in** (or create account if you don't have one)
3. **Click:** "Create new secret key"
4. **Name it:** "SSELFIE Brand Engine"
5. **Copy the key** - it looks like: `sk-proj-abc123xyz...`
6. **Save it somewhere safe** - you'll paste it into Make.com in a moment

### How much will it cost?
- About **$0.50-1.00 per weekly run**
- We'll use GPT-4o (the good one)
- You only pay when you run it
- First run might use ~$0.50

**Tip:** Add $10 to your OpenAI account to start. That's 10-20 weekly runs!

---

## Step 2: Import the Brand Engine Scenario (10 mins)

### What's a scenario?
Think of it as a recipe. It tells Make.com: "Get the Brand Brain → Send to OpenAI → Generate weekly brief → Email me the results"

### How to import:

1. **In Make.com, click** "Create a new scenario" (or "Scenarios" in left menu)

2. **Click the three dots** (⋯) in the top right

3. **Select** "Import Blueprint"

4. **Copy this JSON** and paste it into Make.com:

```json
{
  "name": "Brand Engine - Weekly Planning (Manual)",
  "flow": [
    {
      "id": 1,
      "module": "http:ActionSendData",
      "version": 6,
      "parameters": {
        "handleErrors": false
      },
      "mapper": {
        "url": "{{1.YOUR_APP_URL}}/api/brand-engine/brand-brain",
        "method": "get",
        "headers": [],
        "qs": [],
        "bodyType": "raw",
        "parseResponse": true,
        "timeout": 300
      },
      "metadata": {
        "designer": {
          "x": 0,
          "y": 0
        },
        "restore": {},
        "expect": [
          {
            "name": "url",
            "type": "url",
            "label": "URL",
            "required": true
          },
          {
            "name": "method",
            "type": "select",
            "label": "Method",
            "required": true,
            "validate": {
              "enum": ["get", "post", "put", "patch", "delete"]
            }
          }
        ]
      }
    },
    {
      "id": 2,
      "module": "openai:CreateChatCompletion",
      "version": 1,
      "parameters": {},
      "mapper": {
        "model": "gpt-4o",
        "messages": [
          {
            "role": "system",
            "content": "You are the Brand Reasoner for SSELFIE - the strategic brain that acts like a celebrity's social media director.\n\nYour role is to analyze the brand data and create a weekly content brief.\n\nBRAND MISSION: {{1.data.identity.mission}}\n\nCORE VALUES: {{join(1.data.identity.coreValues; \", \")}}\n\nVOICE: {{1.data.voice.toneDescription}}\n\nBANNED WORDS: {{join(1.data.voice.bannedWords; \", \")}}\n\nCURRENT FOCUS: {{1.data.currentFocus.priorityGoal}}\n\nCONTENT PILLARS:\n{{1.data.contentStrategy.contentPillars[].name}} - {{1.data.contentStrategy.contentPillars[].description}}\n\nOUTPUT FORMAT:\nCreate a weekly brief with:\n1. What matters this week (3 priorities)\n2. Content calendar (5-7 posts)\n3. Key reminders\n\nKeep it simple and actionable."
          },
          {
            "role": "user",
            "content": "Generate my weekly content brief for this week. Today is {{formatDate(now; \"dddd, MMMM D, YYYY\")}}.\n\nTime budget: {{1.data.currentFocus.timeBudget}}\n\nWhat to focus on: {{1.data.currentFocus.priorityGoal}}"
          }
        ],
        "temperature": 0.7,
        "max_tokens": 2000
      },
      "metadata": {
        "designer": {
          "x": 300,
          "y": 0
        }
      }
    },
    {
      "id": 3,
      "module": "gateway:CustomWebHook",
      "version": 1,
      "parameters": {},
      "mapper": {
        "status": "200",
        "body": "{{2.choices[].message.content}}"
      },
      "metadata": {
        "designer": {
          "x": 600,
          "y": 0
        }
      }
    }
  ]
}
```

5. **Click** "Save"

6. **Rename it** to something you'll remember: "Brand Engine - Weekly Planning"

---

## Step 3: Connect OpenAI (3 mins)

### Now we tell Make.com how to talk to OpenAI:

1. **Click on the OpenAI module** (the second box in your scenario)

2. **Click** "Create a connection"

3. **Name it:** "SSELFIE OpenAI"

4. **Paste your OpenAI API key** (from Step 1)

5. **Click** "Save"

**That's it!** Make.com can now talk to OpenAI.

---

## Step 4: Set Your Variables (2 mins)

### What are variables?
Think of them as settings that all your scenarios can use. Like your app URL.

### How to set them:

1. **Click** "Organization settings" (you're already there in your screenshot!)

2. **Click** "Variables" (you're there too!)

3. **Click** "Add variable"

4. **Add this variable:**
   - **Name:** `YOUR_APP_URL`
   - **Value:** 
     - If testing locally: `http://localhost:3000`
     - If on Vercel: `https://your-app.vercel.app`
   - **Type:** Text

5. **Click** "Save"

---

## Step 5: Run Your First Weekly Brief! (5 mins)

### This is the exciting part! 🎉

1. **Go back to your scenario** (Brand Engine - Weekly Planning)

2. **Click** "Run once" (bottom left of the scenario)

3. **Watch the magic happen:**
   - First box (HTTP): Gets your Brand Brain data
   - Second box (OpenAI): Sends it to AI
   - Third box: Returns the result

4. **Wait about 10-30 seconds**

5. **Click on the last module** to see the output

6. **You'll see:** A complete weekly brief generated by AI, following YOUR brand rules!

---

## What You'll Get (Example Output)

```
SSELFIE WEEKLY BRIEF
Week of January 27, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT MATTERS THIS WEEK

1. PRIORITY: Brand Engine Launch Content
   → Reason: Current focus is closing 1-2 pilot clients
   → Action: Share case study posts and demo walkthrough
   
2. PRIORITY: Decision Fatigue Messaging
   → Reason: This message is performing 2x better in saves
   → Action: Lead with decision fatigue in all hooks
   
3. PRIORITY: Consistency Over Intensity
   → Reason: Counter New Year pressure
   → Action: Show up, don't perform

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTENT CALENDAR

Monday (Identity + Confidence)
→ Reel: Why consistency beats motivation
→ Hook: "I used to think I needed more motivation. I didn't."
→ CTA: Comment 'ENGINE' to apply
→ Timing: 12pm

Tuesday (Systems + AI)
→ Carousel: How the Brand Engine solves decision fatigue
→ Hook: "When life gets heavy, your brand disappears with it..."
→ CTA: Comment 'ENGINE' to apply
→ Timing: 10am

Wednesday (Visibility + Personal Brand)
→ Reel: What to post when you feel invisible
→ Hook: "You don't need a plan for 30 days. You need one for TODAY."
→ CTA: Comment 'SELFIE' for FREE Selfie Brand Blueprint
→ Timing: 1pm

Thursday (Stories)
→ BTS: My Brand Engine setup walkthrough
→ Poll: "Would you want this?"
→ Timing: Throughout day

Friday (Identity + Confidence)
→ Carousel: 5 signs you're ready to rebuild your brand
→ Hook: "If you're waiting to feel ready, you'll wait forever."
→ CTA: Comment 'STUDIO' for link
→ Timing: 11am

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY REMINDERS

→ Respond to DMs within 2 hours
→ Review competitor activity Friday
→ Track which posts mention decision fatigue
→ Time budget: 10-15 hours this week

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**This is YOUR plan, generated by AI, following YOUR brand rules!**

---

## Step 6: Save Your Weekly Brief (2 mins)

### Option A: Copy/Paste (Simple)
1. Click on the output
2. Copy the text
3. Paste into your notes/Notion/wherever you plan

### Option B: Auto-email (Fancy)
1. Add an "Email" module after OpenAI
2. Set it to email you the results
3. Every run sends you an email

**I recommend Option A for now** - keep it simple!

---

## Step 7: Run It Weekly (Manual)

### Every Sunday evening:

1. Open Make.com
2. Go to your "Brand Engine - Weekly Planning" scenario
3. Click "Run once"
4. Wait 30 seconds
5. Copy the weekly brief
6. Use it to plan your week!

**That's it!** No cron jobs, no automation, just click when you want a new brief.

---

## Troubleshooting

### "Connection failed"
- Check your OpenAI API key is correct
- Make sure you have credits in your OpenAI account

### "URL not found"
- Check your `YOUR_APP_URL` variable
- Make sure your app is running (locally or on Vercel)

### "Output is weird"
- The AI is following your Brand Brain
- You can adjust the system prompt later
- First few runs might need tweaking

### "It's too expensive"
- Use GPT-4o-mini instead (cheaper, still good)
- Each run should be $0.30-0.50 max
- You only pay when you click "Run once"

---

## What's Next?

### Once you're comfortable:

1. **Daily Planning:** Create a second scenario for daily briefs
2. **Voice & Copy:** Add caption draft generation
3. **Automation:** Set it to run automatically on Sunday evenings
4. **Real Data:** Connect Instagram Insights for performance tracking

**But for now:** Just run the weekly brief manually and see how it works!

---

## Quick Reference

**To run weekly brief:**
1. Open Make.com
2. Click "Brand Engine - Weekly Planning" scenario
3. Click "Run once"
4. Copy the output

**Cost per run:** ~$0.50

**Time per run:** 30 seconds

**What you get:** 
- Weekly priorities
- Content calendar
- Daily posting plan
- All in YOUR voice

---

## Questions?

**"Will it sound like me?"**
→ Yes! It uses YOUR Brand Brain with your voice rules, banned words, and example lines.

**"Can I edit the output?"**
→ Absolutely! The AI gives you a draft. You edit/approve.

**"What if I don't like it?"**
→ Run it again! Each run costs $0.50. Try different days, different questions.

**"Do I need the other 5 agents?"**
→ Not yet! Start with weekly briefs. Add others when you're ready.

**"Can I test without OpenAI?"**
→ You need OpenAI for the AI generation. But $10 gets you 20 runs to test!

---

## Success Checklist

Before your first run, make sure:

- [ ] OpenAI account created
- [ ] API key copied and saved
- [ ] Make.com scenario imported
- [ ] OpenAI connection created in Make.com
- [ ] YOUR_APP_URL variable set
- [ ] $10 added to OpenAI account
- [ ] You're ready to click "Run once"!

---

**You're ready! Let's generate your first AI-powered weekly brief! 🎉**
