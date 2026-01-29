# SSELFIE Brand Engine Implementation Guide

## Overview

The Brand Engine is your private AI brand operating system - essentially a "celebrity social department" built for one brand. It uses 6 AI agents that work together to:

1. Track what's happening externally (trends, competitors, culture)
2. Analyze what's working internally (your content performance)
3. Make smart decisions about what to post and when
4. Write content in your authentic voice
5. Handle scheduling and repurposing

## Architecture

```
/brand_brain/     = Truth (identity, voice, offers, rules)
/signals/         = External reality (trends, competitors, culture)
/performance/     = Internal reality (insights, tests, results)
```

The **Brand Reasoner** is the "social director" that combines all three data sources to decide what matters and what to post.

## Your Growth 6 Agents

| Agent | Purpose | Schedule |
|-------|---------|----------|
| Brand Reasoner | Strategic brain - decides what to post | Daily 7am + Sunday 8pm |
| Competitor Intel | Tracks competitors and patterns | Daily 6am + Friday report |
| Experiment Planner | Creates 2-3 weekly tests | Sunday 7pm |
| Voice & Copy | Writes captions, hooks, scripts | On demand |
| Creative Director | Content angles and visual concepts | On demand |
| Scheduler | Cross-platform repurposing | Sunday 8pm |

---

## Setup Guide

### Step 1: Deploy the Code

Your Brand Engine code is already in your codebase at:
- `/lib/brand-engine/` - Core logic and agent definitions
- `/app/admin/brand-engine/` - Admin dashboard
- `/app/api/brand-engine/` - API endpoints (to be created)

After your next deployment, visit `/admin/brand-engine` to see your dashboard.

### Step 2: Set Up Make.com Scenarios

1. **Create a Make.com account** at [make.com](https://make.com) if you don't have one
2. **Import the scenarios** from `/lib/brand-engine/automations/make-scenarios.json`
3. **Configure your connections:**
   - OpenAI API key (for GPT-4)
   - Your app URL (for webhooks)
   - Email connection (for notifications)

#### Scenario 1: Weekly Planning Engine
- **Trigger:** Every Sunday at 8pm
- **What it does:**
  1. Gathers all data (Brand Brain, Signals, Performance)
  2. Runs Competitor Intel agent
  3. Runs Brand Reasoner to generate Weekly Brief
  4. Runs Scheduler to create content calendar
  5. Emails you the results

#### Scenario 2: Daily Planning Engine
- **Trigger:** Every day at 7am
- **What it does:**
  1. Gets your current Weekly Brief
  2. Runs Brand Reasoner for today's specific plan
  3. Runs Voice & Copy to draft today's captions
  4. Emails you your morning brief

#### Scenario 3: Content Creation (On Demand)
- **Trigger:** Webhook (manual trigger from dashboard)
- **What it does:**
  1. Runs Creative Director to develop the brief
  2. Runs Voice & Copy to write the content
  3. Voice checks against your rules
  4. Runs Scheduler for repurposing plan

### Step 3: Create the API Endpoints

Create these API routes in `/app/api/brand-engine/`:

```
/api/brand-engine/brand-brain        GET - Returns your brand brain data
/api/brand-engine/signals            GET - Returns current signals data
/api/brand-engine/performance        GET - Returns performance data
/api/brand-engine/competitors        GET - Returns competitor list
/api/brand-engine/runs               POST - Saves engine run results
/api/brand-engine/weekly-brief/current  GET - Returns current week's brief
/api/brand-engine/daily-plans        POST - Saves daily plans
```

### Step 4: Set Up Data Collection

#### Competitor Data (Manual Method)
Until you add automated scraping, use this weekly workflow:

1. Every Friday, spend 15 mins reviewing competitors
2. Open each competitor's profile (5-10 accounts)
3. Note their last 7 days of posts in a spreadsheet:
   - Date | Competitor | Post Type | Description | Engagement | Notes
4. Upload CSV to Make.com or paste into your dashboard

#### Performance Data (Manual Method)
1. Weekly: Export your Instagram Insights
2. Upload to your dashboard or Google Sheet
3. The Analytics agent will analyze patterns

#### Signals Data
- Start with manual notes about trends you notice
- Later: Add Phantombuster or Apify for automated tracking

---

## Weekly Workflow

Here's how to run your Brand Engine each week:

### Sunday Evening (30 mins)
1. Trigger the Weekly Engine run
2. Review the generated Weekly Brief
3. Approve or modify the content calendar
4. Note any experiments to run

### Daily (15 mins)
1. Check your morning email with Today's Plan
2. Review and tweak the draft captions
3. Post according to the schedule
4. Note any learnings for the Performance folder

### Friday (20 mins)
1. Review the week's performance
2. Update competitor observations
3. Log experiment results
4. The engine will use this data for next week

---

## Agent System Prompts

Each agent has a carefully crafted system prompt that enforces your brand rules. These live in:

```
/lib/brand-engine/agents/brand-reasoner.ts
/lib/brand-engine/agents/competitor-intel.ts
/lib/brand-engine/agents/experiment-planner.ts
/lib/brand-engine/agents/voice-copy.ts
/lib/brand-engine/agents/creative-director.ts
/lib/brand-engine/agents/scheduler.ts
```

The prompts include:
- Your brand identity and mission
- Voice rules and banned words
- Audience pain points
- Current focus and priorities
- Content pillars and CTAs

### Customizing for Clients

When onboarding a new Brand Engine client:
1. Create a copy of `/lib/brand-engine/brand-brain/sselfie-brand-brain.ts`
2. Rename to `[client-name]-brand-brain.ts`
3. Update all the brand-specific data
4. Create separate Make.com scenarios for each client

---

## Database Schema (Optional)

If you want to persist engine data in your Neon database, add these tables:

```sql
-- Brand Engine Runs
CREATE TABLE brand_engine_runs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- 'weekly', 'daily', 'on_demand'
  status VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  outputs JSONB,
  approval_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signals (Trends, Competitors, Culture)
CREATE TABLE brand_engine_signals (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  signal_type VARCHAR(20) NOT NULL, -- 'trend', 'competitor', 'culture'
  data JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Performance Data
CREATE TABLE brand_engine_performance (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  post_id VARCHAR(100),
  platform VARCHAR(20),
  metrics JSONB,
  performance VARCHAR(20), -- 'winner', 'average', 'loser'
  posted_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiments
CREATE TABLE brand_engine_experiments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  hypothesis TEXT,
  variable VARCHAR(100),
  control TEXT,
  test TEXT,
  metric VARCHAR(100),
  status VARCHAR(20),
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Troubleshooting

### Agent outputs don't match brand voice
- Check the Brand Brain data is up to date
- Review the Voice & Copy system prompt
- Run the voice check function on outputs

### Make.com scenarios failing
- Verify API endpoints are deployed and accessible
- Check OpenAI API key is valid
- Review Make.com execution logs

### Content calendar doesn't align with strategy
- Update Current Focus in Brand Brain
- Check that Weekly Priorities are current
- Review what's in the "What to Ignore" list

---

## Future Enhancements

### Phase 2 Agents (Add when ready)
- **Signal Scout** - Automated trend watching
- **Analytics Interpreter** - Auto-analyze metrics
- **Culture/News Agent** - Flag relevant moments

### Phase 3 Agents
- **Offer/Monetization Agent** - Keep content tied to sales
- **Editor/Guardian** - Check for voice drift
- **Community/DM Agent** - Draft replies
- **Crisis/PR Agent** - Monitor risk topics

---

## Quick Reference

### Content Pillars
1. **Identity + Confidence** - Rebuilding self-trust
2. **Visibility + Personal Brand** - What to post
3. **Systems + AI** - Solving decision fatigue

### CTAs by Funnel Stage
- **Top:** Comment 'SELFIE' for FREE Selfie Brand Blueprint
- **Mid:** Comment 'STUDIO' for a link to SSELFIE STUDIO
- **Bottom:** Comment 'ENGINE' to apply for the Brand Engine build

### Banned Words
Reinvention, Hustle, Girlboss, Overnight success, Manifest instantly, Corporate jargon

### Voice Check
Before posting, verify:
- Uses simple, everyday language
- Addresses the target audience
- Aligns with core values
- Avoids banned words

---

## Support

For questions about your Brand Engine setup:
1. Check this documentation
2. Review agent logs in Make.com
3. Check the admin dashboard at `/admin/brand-engine`

---

*Version 1.0 | January 2026*
