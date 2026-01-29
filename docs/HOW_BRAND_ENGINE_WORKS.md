# How the Brand Engine Works

**Quick Answer:** Yes, it's currently using **MOCK DATA**. The AI agents are built but not yet activated. Here's how it all works:

---

## Current State: Mock Data (Demonstration Mode)

### What You're Seeing Now

✅ **Working:**
- Complete Brand Brain with YOUR real brand data
- Dashboard UI showing the structure
- API endpoints returning placeholder data
- Database tables created and ready

❌ **Not Active Yet:**
- AI agents generating actual content
- Real trend tracking
- Live competitor monitoring
- Automated weekly/daily briefs

### Why Mock Data?

The Brand Engine is **installed and ready**, but the AI agents need to be connected to:
1. **OpenAI/Anthropic** (for GPT-4 or Claude to generate content)
2. **Make.com** (to orchestrate when agents run)
3. **Your social accounts** (optional - to track real performance)

Think of it like having a Tesla in your garage but not yet connected to the charging station. The car is built, just needs power!

---

## How It Actually Works (When Activated)

### The 3 Data Folders

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  BRAND BRAIN (Already populated with YOUR data)    │
│  • Your mission, voice, offers                      │
│  • Content pillars, CTAs, rules                     │
│  • Current focus and priorities                     │
│                                                     │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  6 AI AGENTS (Built, but not running yet)          │
│  • Each has a system prompt with your brand rules   │
│  • Each knows your voice, audience, banned words    │
│  • Each has specific instructions                   │
│                                                     │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  OUTPUTS (Mock data until agents are active)       │
│  • Weekly briefs                                    │
│  • Daily plans                                      │
│  • Caption drafts                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## The 6 AI Agents (What They Do)

### 1. Brand Reasoner (Your Strategic Brain)
**Job:** Decides what to post and why

**System Prompt Includes:**
- Your full Brand Brain (mission, voice, rules)
- Current signals (trends, competitors, culture)
- Performance data (what's working)

**Outputs:**
- Weekly brief: "Here's what matters this week"
- Daily plan: "Post this today because..."

**Currently:** Built, not running (needs Make.com)

---

### 2. Competitor Intel
**Job:** Tracks what competitors are doing

**System Prompt Includes:**
- Your competitor list
- What to watch for (patterns, messaging, offers)

**Outputs:**
- "Jasmine Star posted 5x about systems this week"
- "Should you adopt/avoid/differentiate?"

**Currently:** Built, not running (needs data source)

---

### 3. Experiment Planner
**Job:** Designs A/B tests

**System Prompt Includes:**
- Your performance history
- Scientific testing principles

**Outputs:**
- "Test: Post at 7am vs 12pm"
- "Metric: Reach within 24 hours"

**Currently:** Built, not running (needs Make.com)

---

### 4. Voice & Copy
**Job:** Writes captions in YOUR voice

**System Prompt Includes:**
- Your voice rules (warm, direct, grounded)
- Your banned words (hustle, reinvention, etc.)
- Your example lines
- Your audience pain points

**Outputs:**
- Caption drafts that sound like YOU
- Hooks, CTAs, story text

**Currently:** Built, with voice check function working

---

### 5. Creative Director
**Job:** Develops content angles

**System Prompt Includes:**
- Your content pillars
- Format recommendations (Reels, carousels, etc.)

**Outputs:**
- "Identity pillar → Reel about rebuilding self-trust"
- Visual concepts and formats

**Currently:** Built, not running (needs Make.com)

---

### 6. Scheduler
**Job:** Repurposing and calendar planning

**System Prompt Includes:**
- Your platform cadence
- Cross-platform strategies
- Time budget constraints

**Outputs:**
- "Turn this Reel into: TikTok + 3 Stories + Email section"
- Weekly calendar with batching strategy

**Currently:** Built, not running (needs Make.com)

---

## How to Activate the AI Agents

### Step 1: Set Up Make.com (15 mins)

1. **Create account** at [make.com](https://make.com) (free tier works)
2. **Import scenarios** from `/lib/brand-engine/automations/make-scenarios.json`
3. **Connect OpenAI:**
   - Get API key from OpenAI
   - Add connection in Make.com
   - Choose GPT-4 model

### Step 2: Configure Variables (5 mins)

In Make.com, set these variables:
- `YOUR_APP_URL` = your app URL (http://localhost:3000 for dev)
- `USER_EMAIL` = your email for notifications
- `OPENAI_API_KEY` = your OpenAI key

### Step 3: Test One Workflow (10 mins)

1. Open "Weekly Planning Engine" scenario
2. Click "Run once" button
3. Watch it:
   - Fetch your Brand Brain data (real!)
   - Call OpenAI with system prompts
   - Generate weekly brief
   - Send you email

**First time:** You'll see REAL AI-generated content!

### Step 4: Schedule Automation

Once tested, enable schedules:
- **Sunday 8pm:** Weekly Planning Engine
- **Daily 7am:** Daily Planning Engine
- **On demand:** Content Creation Pipeline

---

## What Happens When You Run an Agent

### Example: Weekly Planning Engine (Sunday 8pm)

```
1. Make.com wakes up (scheduled trigger)
   ↓
2. Fetches YOUR Brand Brain via API
   GET /api/brand-engine/brand-brain
   → Returns your mission, voice, offers, rules
   ↓
3. Fetches Signals (trends, competitors)
   GET /api/brand-engine/signals
   → Currently mock data (you can add real later)
   ↓
4. Fetches Performance (post metrics)
   GET /api/brand-engine/performance
   → Currently mock data (connect Instagram later)
   ↓
5. Calls OpenAI with BRAND REASONER system prompt
   System: "You are the Brand Reasoner for SSELFIE..."
   + All your brand rules
   + Current signals
   + Performance data
   
   User: "Generate weekly brief for this week"
   ↓
6. OpenAI generates weekly brief
   → Based on YOUR brand rules
   → In YOUR voice
   → With YOUR priorities
   ↓
7. Calls OpenAI with SCHEDULER system prompt
   System: "You are the Scheduler for SSELFIE..."
   User: "Create weekly calendar from this brief"
   ↓
8. Saves results to database
   POST /api/brand-engine/runs
   ↓
9. Emails you the results
   "Your weekly brief is ready!"
```

**Cost:** ~$0.50-1.00 per weekly run with GPT-4

---

## Key Concept: System Prompts

### What Makes This Different From ChatGPT

**ChatGPT (generic):**
```
User: "Write me an Instagram caption"
→ Generic, anyone could write this
```

**Your Brand Engine (configured):**
```
System: You are writing for SSELFIE. 
- Mission: [your mission]
- Voice: [warm, direct, grounded]
- Banned words: [hustle, reinvention, girlboss]
- Audience feels: [invisible, decision fatigue]
- Never: [use pressure language]

User: "Write caption for Identity pillar Reel"
→ Sounds like YOU, follows YOUR rules
```

**The system prompt is 200+ lines of YOUR brand rules that get included with EVERY request.**

This is why it will sound like you - it's instructed to follow your specific voice, avoid your banned words, address your audience's pain points, etc.

---

## Real vs Mock Data Breakdown

| Component | Status | What's Real | What's Mock |
|-----------|--------|-------------|-------------|
| **Brand Brain** | ✅ Real | Your actual brand data | Nothing |
| **System Prompts** | ✅ Real | Your voice rules embedded | Nothing |
| **API Endpoints** | ✅ Working | Endpoints functional | Return placeholder data |
| **Database Tables** | ✅ Created | Schema ready | Empty (no runs yet) |
| **Signals** | ⚠️ Mock | Structure correct | Trend/competitor data |
| **Performance** | ⚠️ Mock | Structure correct | Post metrics |
| **AI Generation** | ❌ Not active | Nothing yet | Everything |
| **Automation** | ❌ Not set up | Nothing yet | Everything |

---

## What You Can Do Right Now (Without Make.com)

### 1. Explore Your Brand Brain
Visit: `/admin/brand-engine/brain`
→ See your complete brand data structured as code

### 2. Test Voice Check
The voice validation function works:
```typescript
import { voiceCheck } from '@/lib/brand-engine'

const result = voiceCheck("Let's hustle and reinvent ourselves!")
// result.passed = false
// result.warnings = ["Contains banned word: hustle", "Contains banned word: reinvent"]
```

### 3. Review System Prompts
Visit: `/admin/brand-engine/agents`
→ See the exact instructions each AI agent will follow

### 4. Test API Endpoints
```bash
curl http://localhost:3000/api/brand-engine/brand-brain
```
→ Returns your real Brand Brain data

---

## Timeline to Go Live

### Phase 1: Quick Test (30 mins)
1. Set up Make.com account
2. Import one scenario
3. Run it manually once
4. **Result:** See AI-generated weekly brief

### Phase 2: Automation (1 hour)
1. Configure all 4 scenarios
2. Test each one
3. Enable schedules
4. **Result:** Automated weekly/daily briefs

### Phase 3: Real Data (Optional, ongoing)
1. Connect Instagram Insights API
2. Add competitor tracking (Phantombuster or manual CSV)
3. Track real trends
4. **Result:** Briefs based on actual performance

---

## FAQ

### Q: Will the AI sound like me?
**A:** Yes, because:
- System prompt includes your voice rules
- Voice check validates output
- Banned words are enforced
- Example lines guide tone

### Q: How much does it cost?
**A:** 
- Make.com: Free tier (1000 operations/month)
- OpenAI: ~$0.50-1/week with GPT-4
- **Total:** ~$2-5/month

### Q: Can I test without Make.com?
**A:** The voice check works now. For AI generation, you need Make.com or similar (n8n, Zapier also work).

### Q: What if the output isn't perfect?
**A:** 
1. Tweak system prompts in `/lib/brand-engine/agents/`
2. Add more example lines to Brand Brain
3. Update voice rules
4. The AI learns from your brand data

### Q: Is my data private?
**A:** Yes:
- Brand Brain stays in YOUR codebase
- Only sent to OpenAI when agents run
- OpenAI doesn't train on API data
- You control everything

---

## Next Steps

1. **Visit the dashboard:** http://localhost:3000/admin/brand-engine
2. **Review your Brand Brain:** Click "Brand Brain" card
3. **Check the setup guide:** See amber notice box on dashboard
4. **Read implementation guide:** `/docs/BRAND_ENGINE_IMPLEMENTATION_GUIDE.md`
5. **Test one agent:** Follow Make.com setup (30 mins)

---

**The Brand Engine is built and ready. It's like having the team hired, but they're waiting for their first day at work (Make.com activation). Once you connect Make.com, they'll start generating real content based on YOUR brand rules!**
