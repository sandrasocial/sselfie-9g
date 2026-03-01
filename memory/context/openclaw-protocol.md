# OpenClaw Protocol — How Claude Works With the Agent Team

*Last updated: 2026-02-28*

---

## What is OpenClaw?

OpenClaw is Sandra's local AI agent system. It runs agents on her machine. Claude (in Cowork) acts as the **human-facing supervisor** — validating plans, catching errors, and translating Sandra's vision into precise agent tasks.

---

## Command Reference

```bash
# Talk to North
openclaw agent --agent north --local --message "YOUR MESSAGE"

# List all agents
openclaw agents list

# Check agent config
cat ~/.openclaw/agents/north/config.json
```

**⚠️ Timeout rule:** Messages that generate long responses (>500 words from North) often trigger a 60s connection error. Keep instructions focused. If North times out, the task still usually executes — check `~/stella/` for the output file.

---

## Agent Architecture

```
Claude (Cowork) — human-facing supervisor
    ↓ validates & directs
North (COO agent)
    ↓ spawns & manages
    ├── north-content    (content creation)
    ├── north-revenue    (Stripe, pricing, revenue)
    ├── north-audience   (Resend, email, subscribers)
    ├── north-code       (dev, cron, scripts)
    ├── north-email      (email drafts + sends)
    └── north-product    (product decisions)
```

**North's model:** `anthropic/claude-haiku-4-5-20251001`
**All sub-agents:** Same model, same `~/stella/` workspace

---

## MCP Tools Available to North

| Tool set | Count | What it does |
|----------|-------|-------------|
| Stripe | 28 tools | Subscriptions, customers, invoices, prices |
| Neon Postgres | 23 tools | Database queries on SSELFIE app DB |
| Resend | 56 tools | Email sends, audiences, contacts, broadcasts |
| Brave Search | — | Web research |
| Postiz | — | Social media scheduling |
| Google Workspace | — | Docs, Calendar |

---

## Communication Rules (Refined from Experience)

### DO
- ✅ Keep messages under 100 words
- ✅ Give North ONE clear task per message
- ✅ Verify numbers against CLAUDE.md constants before trusting North's output
- ✅ Ask North to save reports to `~/stella/reports/` for traceability
- ✅ Tell North to update `NORTH_TASK_QUEUE.md` when adding/completing tasks
- ✅ Tell North to update `SHARED_MEMORY.md` for decisions ALL agents need to know

### DON'T
- ❌ Don't ask North for multiple things in one message (causes drift)
- ❌ Don't trust subscriber counts without cross-checking against dashboard
- ❌ Don't let North send emails without Sandra's copy approval first
- ❌ Don't let North create new strategy docs — strategy is locked in Codex spec
- ❌ Don't let North spawn sub-agents for strategy research (must be pre-approved)

---

## Known Issues & Fixes

| Issue | Root cause | Fix |
|-------|-----------|-----|
| North returns wrong counts | She queries Neon but confuses tables | Cross-check with CLAUDE.md constants |
| 60s timeout on long tasks | Response too verbose | Ask for summary only, check file output |
| North creates competing strategy docs | Hasn't read Codex spec | Send corrective message, point to spec |
| North flips Resend/Neon counts | Assumes Neon is bigger | Resend (3K) > Neon (603) — that's correct |
| openclaw command not found | Not in PATH for this shell | Try `~/.local/bin/openclaw` or `npx openclaw` |

---

## The Claude → North Handoff Pattern

When Sandra asks Claude to do something that requires North:

1. **Claude validates:** Is this aligned with Codex strategy? Is it safe to execute?
2. **Claude drafts the instruction:** Precise, short, one task at a time
3. **Claude sends via terminal:** `openclaw agent --agent north --local --message "..."`
4. **Claude checks output:** Verify numbers, catch errors, report back to Sandra
5. **Sandra approves anything customer-facing** (emails, copy, pricing changes)
6. **Claude confirms done** and updates CLAUDE.md if needed

---

## North's Key Config Files

```
~/.openclaw/agents/north/
├── BOOTSTRAP.md       ← North reads this on startup
├── agent/             ← Agent definition
├── resources/         ← Shared resources
└── sessions/          ← Session history
```

**North's workspace:**
```
~/stella/
├── NORTH_TASK_QUEUE.md    ← Active tasks
├── SHARED_MEMORY.md       ← All-agent shared context
├── PIVOT-LOG-*.md         ← Strategic decision log
├── reports/               ← Audit reports
└── drafts/                ← Copy drafts
```

---

## Improving North's Reliability

**If North is being unreliable, tell her to:**
1. Respond in bullet points only (reduces verbosity + timeouts)
2. Save detailed output to a file, return only the summary
3. Re-read `SHARED_MEMORY.md` and confirm she understands current strategy

Example corrective message:
```
"North - from now on keep terminal responses under 150 words. Save detailed reports to ~/stella/reports/ and give me a 3-bullet summary in terminal. Confirm you understand."
```
