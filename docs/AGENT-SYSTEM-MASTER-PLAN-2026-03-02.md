# SSELFIE Agent System — Master Plan
**Date:** 2026-03-02 | **Author:** Claude (Cowork)  
**Status:** ACTIVE — execute this top to bottom

---

## The Problem We're Solving

Three agents, three memory files, manual copy-paste handovers, and North trying to be a COO on a Haiku model. Every handover point is a failure point. The system works in theory and breaks in practice.

This plan fixes it permanently.

---

## The New Architecture (3 Clean Tiers)

```
┌─────────────────────────────────────────────────────┐
│  SANDRA  ←→  CLAUDE COWORK (The Brain)              │
│              • Strategy & decisions                  │
│              • Reads codebase directly               │
│              • Writes specs to tasks/                │
│              • Maintains CLAUDE.md (only memory)     │
│              • Talks to you in plain language        │
│              • Controls your Mac directly            │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
               ▼                  ▼
┌──────────────────┐   ┌──────────────────────────────┐
│  NORTH (OpenClaw)│   │  STELLA (Codex Desktop)      │
│  The Hands       │   │  The Builder                 │
│                  │   │                              │
│  24/7 via        │   │  Reads tasks/ in codebase    │
│  Telegram        │   │  Implements code             │
│                  │   │  Pushes commits/PRs          │
│  ONLY used for:  │   │  Reports SHA to Sandra       │
│  • Stripe data   │   │                              │
│  • Neon queries  │   │  No planning                 │
│  • Resend sends  │   │  Pure execution              │
│  • Heartbeat     │   │                              │
│    monitoring    │   │  ← Claude Remote Control     │
│                  │   │    (monitor from phone)      │
│  NOT for:        │   │                              │
│  • Strategy      │   │                              │
│  • Memory mgmt   │   │                              │
│  • File writing  │   │                              │
└──────────────────┘   └──────────────────────────────┘
```

---

## What Gets Retired (Today)

| File | Status | Why |
|------|--------|-----|
| `~/stella/SHARED_MEMORY.md` | ❌ RETIRED | Drifts constantly, North can't maintain it reliably |
| `~/stella/NORTH_TASK_QUEUE.md` | ❌ RETIRED | Claude manages task tracking in CLAUDE.md |
| `~/stella/tasks/codex-*.md` | ❌ RETIRED | Specs go to `/Users/MD760HA/sselfie-9g/tasks/` instead |
| North as "COO" | ❌ RETIRED | North is a data fetcher, not a strategist |

## What Gets Created / Rebuilt (Today)

| What | Where | Purpose |
|------|-------|---------|
| New North BOOTSTRAP.md | `~/.openclaw/agents/north/BOOTSTRAP.md` | Tool-runner role only |
| New HEARTBEAT.md | `~/stella/HEARTBEAT.md` | Daily MRR + weekly metrics to Telegram |
| Stella specs | `/Users/MD760HA/sselfie-9g/tasks/` | No copy-paste gap |
| CLAUDE.md (cleaned) | Codebase root | Single source of truth |

---

## PHASE 1 — Stabilize (Today, March 2)

### 1A. Rebuild North's Role

**New North BOOTSTRAP.md** defines North as:
- A data fetcher that responds to precise queries
- Runs proactive heartbeat checks (Stripe MRR, Resend stats, Vercel errors)
- Sends reports to Sandra's Telegram
- Never writes strategy docs, never manages other agents, never sends emails without Sandra's approval

**Heartbeat schedule:**
- Every morning 8am: Stripe MRR + new signups → Telegram message
- Every Sunday 9am: Weekly email performance (Resend stats) → Telegram
- Whenever Vercel has errors: Alert → Telegram immediately

### 1B. Fix the Stella Handover

**Old:** Claude writes spec to `~/stella/tasks/` → Sandra copies prompt → pastes into Stella → Stella can't find file if path is wrong

**New:** Claude writes spec directly to `/Users/MD760HA/sselfie-9g/tasks/` → Sandra tells Stella one line: `"Read your latest task in /tasks/ and implement it"` → Stella reads it from her own workspace → Done

No copy-paste. No path confusion. One sentence handover.

### 1C. Consolidate Memory

CLAUDE.md becomes the ONLY memory file. It has:
- Live business constants (MRR, member counts, URLs)
- Active task list (replaces NORTH_TASK_QUEUE)
- Agent system notes (replaces SHARED_MEMORY)
- Decision log (replaces PIVOT-LOG files)

I (Claude Cowork) update it after every significant action.

---

## PHASE 2 — Email Automation Engine (This Week)

### Priority order:

**P1 — Freebie Nurture (SEQ-01)** ← Stella is implementing this NOW
- `nurture-sequence` cron rewritten for `freebie_brand_strategies`
- 5 new email templates (N1-N5, Day 2/5/9/14/20)
- Added to vercel.json → runs daily at 10am UTC
- **Impact:** Every freebie lead gets a 20-day nurture automatically

**P2 — Studio Welcome (SEQ-02)** ← Spec needed
- `welcome-sequence` re-enabled for new Studio members
- Day 0/3/7/14/21/28 — 6-email onboarding arc
- **Impact:** Every new €97/mo member gets a proper onboarding journey

**P3 — Win-Back** ← Already live
- `win-back-sequence` is in vercel.json, running daily 10am
- Day 3/7/14 for cancelled members
- **Status:** Monitor via heartbeat, no changes needed

### What runs on autopilot when done:
```
New freebie signup → 20-day nurture → Studio upsell → €97/mo
New Studio member → 6-email welcome → engaged customer
Cancelled member → 3-touch win-back → potential reactivation
```

---

## PHASE 3 — Business Monitoring Dashboard (Week 2)

### North Heartbeat gives Sandra this every day:
```
🌅 SSELFIE MORNING BRIEF — March 3, 2026

💰 MRR: €1,509 (▲0 vs yesterday)
👥 Active members: 15 Studio + 13 Blueprint = 28 total
📧 New freebie leads today: 3
📬 Emails sent yesterday: 47 | Open rate: 41%
✅ Vercel: All systems operational

Action needed: None
```

No dashboards to check. Just wake up and read Telegram.

### Claude Remote Control (Research Preview — Claude Max only)

Anthropic launched this February 25th. You run `/rc` in a Claude Code / Stella session and get a QR code. Scan it from your phone and monitor/continue the session without being at your Mac.

**For you:** When Stella is running a big task (like the email reboot), you scan the QR, watch it from your phone, approve things in real-time. No more waiting at your desk.

**Status:** Available NOW if you have Claude Max. Check at code.claude.com

---

## PHASE 4 — New Products on Autopilot (Week 3+)

This is where it gets powerful. With the system stable:

### Product Creation Loop:
1. You tell me a product idea (30 seconds)
2. I write the full spec (10 minutes)
3. Stella builds it (2-4 hours, you're not at your desk)
4. North monitors launch metrics via heartbeat
5. Freebie → nurture → upsell → automated

### Products queued for this process:
- **Website Agent V1** (€27/mo) — spec is written, needs your YES
- **SEQ-02 Studio Onboarding** — needs spec from me this week
- **Academy monthly drops** — blocked pending published drop in DB

### Potential new products (you decide):
- Content Batch Generator (pay-per-use AI content creation)
- Brand Voice Audit (one-time €47 product, AI-powered)
- Instagram Audit Report (automated PDF output)

---

## PHASE 5 — Scale (Month 2)

When the engine is stable and generating consistent MRR:

- North heartbeat identifies revenue patterns (what converts best)
- I analyze and propose new funnels
- Stella builds them
- You review from Telegram

**Target trajectory:**
- Current: €1,509 MRR / 28 customers
- Month 2 (SEQ-01 live + SEQ-02): €2,200-2,800 MRR (8-12% freebie conversion)
- Month 3 (Website Agent + Academy): €3,500-4,500 MRR
- Month 6 (full automation + new products): €6,000-8,000 MRR

---

## Today's Execution Order

| # | Task | Who | Status |
|---|------|-----|--------|
| 1 | Rewrite North BOOTSTRAP.md | Claude now | 🔄 |
| 2 | Write North HEARTBEAT.md | Claude now | 🔄 |
| 3 | Move email reboot spec to tasks/ | Claude now | 🔄 |
| 4 | Clean + consolidate CLAUDE.md | Claude now | 🔄 |
| 5 | Sandra sends Stella the email reboot | Sandra | ⏳ |
| 6 | Sandra checks Claude Remote Control | Sandra | ⏳ |
| 7 | Resend dashboard cleanup (delete segments) | Sandra (5 min) | ⏳ |
| 8 | Agent V1 go/no-go decision | Sandra | ⏳ |

---

## The One-Line Summary

**Old system:** North plans, Claude supervises, Stella executes, three memory files drift.  
**New system:** Claude plans, North monitors 24/7, Stella executes. One memory file. No drift.
