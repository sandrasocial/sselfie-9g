# OpenClaw Protocol — How Claude Works With the Agent Team

*Last updated: 2026-03-13*

---

## What is OpenClaw?

OpenClaw is Sandra's local AI agent system. It runs agents on her machine and provides mobile-first control through North. Claude (in Cowork/Cursor) is the desktop strategy and deep-work layer for planning, review, and implementation coordination.

## When To Use Claude vs North

| When | Use | Why |
|------|-----|-----|
| Mobile, quick check, morning brief, fast approvals | **North via Telegram/OpenClaw** | Always-on; no computer required |
| Planning, deep strategy, code review, spec writing | **Claude via Cursor** | Full repo context and file-level control |
| Urgent issue triage | **Either** (Claude preferred for code changes) | North diagnoses quickly; Claude executes fixes safely |

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
Claude (Cowork/Cursor) — desktop strategy + deep work
    ↓ validates & directs
North (COO agent)
    ↓ spawns & manages
    ├── operator         (Stripe + Resend + audience ops)
    ├── builder          (specs + deploy checks + Codex handoff)
    └── stella/codex     (implementation)
```

**North's model:** configured via OpenRouter profile in current runtime
**All active agents:** same `~/stella/` workspace

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
- ✅ Verify numbers live in Stripe/Resend/Neon before trusting any output
- ✅ Ask North to save reports to `~/stella/ACTIVE/reports/` for traceability
- ✅ Tell North to add/update tasks in `~/stella/ACTIVE/tasks/` (or add a task file there)
- ✅ Use `SHARED_MEMORY.md` for handoffs/blockers only (via sync_shared_memory.sh or submit_handoff_to_north.sh); not for business truth

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
| North returns wrong counts | Mixed sources or stale assumptions | Cross-check live Stripe/Resend/Neon and refresh `NORTH_ACTIVE.md` |
| 60s timeout on long tasks | Response too verbose | Ask for summary only, check file output |
| North creates competing strategy docs | Hasn't read Codex spec | Send corrective message, point to spec |
| North flips Resend/Neon counts | Treats list size as app-user size | Keep distinction explicit: Resend audience includes legacy migrated contacts; Neon is app-user dataset |
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
├── ACTIVE/tasks/          ← Active task list (check before adding tasks)
├── ACTIVE/reports/        ← Execution reports and evidence
├── NORTH_ACTIVE.md        ← Compact runtime snapshot (refreshed from live + ACTIVE)
├── SHARED_MEMORY.md       ← Handoff log only (not business truth)
├── PIVOT-LOG-*.md         ← Strategic decision log
├── reports/               ← Audit reports
└── drafts/                ← Copy drafts
```

---

## Improving North's Reliability

**If North is being unreliable, tell her to:**
1. Respond in bullet points only (reduces verbosity + timeouts)
2. Save detailed output to a file, return only the summary
3. Re-read `NORTH_ACTIVE.md` and `CLAUDE.md` and confirm she understands current strategy (SHARED_MEMORY is handoff-only)

Example corrective message:
```
"North - from now on keep terminal responses under 150 words. Save detailed reports to ~/stella/reports/ and give me a 3-bullet summary in terminal. Confirm you understand."
```
