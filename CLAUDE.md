# SSELFIE Operational Memory
*Last updated: 2026-03-02 — Read this at the start of every session*

---

## Me — Sandra (The Selfie Queen)
Founder of SSELFIE Studio. Single mother, Iceland/Norway. 28 active paying customers (15 Studio + 13 Blueprint), 180K+ followers, 3K+ email list. MRR: €1,509. Building AI-powered personal branding platform. 8 months live.

## My Role (Claude in Cowork)
I am the **human-facing layer** between Sandra and the OpenClaw agent team. I:
- Validate agent plans before execution
- Catch inconsistencies and errors before they reach production
- Translate Sandra's requests into precise agent instructions
- Keep all agents synced to the locked Codex strategy

---

## The Agent Team (OpenClaw)

| Agent | Role | Talk to them? |
|-------|------|--------------|
| **North** | COO — orchestrates all sub-agents | YES — primary contact |
| north-content | Content creation | Via North |
| north-revenue | Revenue/Stripe/pricing | Via North |
| north-audience | Email/Resend/subscribers | Via North |
| north-code | Dev tasks, cron jobs, sync scripts | Via North |
| north-email | Email drafts and sends | Via North |
| north-product | Product decisions | Via North |

**Command to talk to North:**
```
openclaw agent --agent north --local --message "YOUR MESSAGE"
```
**⚠️ Keep messages SHORT (under 100 words) — long responses cause 60s timeouts**
**⚠️ North's workspace:** `~/stella/` — all her files live here
**⚠️ List agents:** `openclaw agents list`

---

## Key Files (North's Workspace `~/stella/`)

| File | What it is |
|------|-----------|
| `NORTH_TASK_QUEUE.md` | North's active task list — check before adding tasks |
| `SHARED_MEMORY.md` | What ALL agents read on session start |
| `PIVOT-LOG-2026-02-28.md` | Strategic pivot doc — Website Agent V1 decision |
| `reports/REVENUE-IMPACT-*.md` | Revenue audit findings |
| `reports/EMAIL-HISTORY-AUDIT-*.md` | Email history findings |
| `reports/RESEND-NEON-AUDIT-*.md` | Resend/DB inconsistency audit |
| `drafts/` | Email and content drafts |

**App codebase:** `/sessions/nifty-serene-bardeen/mnt/sselfie-9g/` (= Sandra's selected folder)
**Codex spec:** `docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md`

---

## Current Priority: Website Agent V1 Sprint

| Week | Tasks | Status |
|------|-------|--------|
| W1-A | Security hardening (north-notifier token, bridge auth) | ⏸ Awaiting Sandra go/no-go |
| W1-B | Core agent loop | Pending |
| W1-C | Website read/write | Pending |
| W2-A | Brand voice layer | Pending |
| W2-B | Content generation | Pending |
| W2-C | Dashboard + launch | Pending |

**Locked price:** €27/month standalone
**North must read Codex spec before any agent work**

---

## Technical Constants (Use These — Don't Guess)

| What | Value |
|------|-------|
| Resend Main Audience ID | `3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd` |
| Resend total contacts | 3,082 (2,954 subscribers) |
| Neon DB users | 603 unique emails |
| Active Studio members | 15 Stripe subs (€97/mo) — verified 2026-03-02 |
| Active Blueprint buyers | 13 Blueprint (one-time or ongoing) — verified 2026-03-02 |
| Total active paying | 28 (15 Studio + 13 Blueprint) — verified 2026-03-02 |
| Studio checkout URL | `https://sselfie.ai/checkout/membership` |
| Feed Planner checkout | `https://sselfie.ai/checkout/blueprint` |
| Freebie form URL | `https://sselfie.ai/freebie/brand-strategy` (NEW — replaces Blueprint freebie) |
| Freebie result URL | `https://sselfie.ai/strategy/[token]` |
| Freebie upsell fix | ✅ SHIPPED 2026-03-02 — commit `39bf931` — `?checkout=studio_membership` now correctly redirects to `/checkout/membership` in both `handleLogin` + `handleSignUp` |
| Freebie Resend tag | source: "freebie-strategy" (new leads tagged this — distinct from old Blueprint Freebie segment) |
| Blueprint price ID | `price_1SnlJEEVJvME7vkw1thdr7WK` |
| Stripe portal | Session-based — link to `https://sselfie.ai/studio?tab=settings` |
| Stripe portal config | `bpc_1SRX2wEVJvME7vkwu0rlIgfW` |
| Vercel Blob token | In `.env.local` as `BLOB_READ_WRITE_TOKEN` |
| Supabase URL | `https://rnnqqkidsoojtsmqqbyw.supabase.co` |
| Supabase buckets | EMPTY — use Vercel Blob for file storage |

---

## Resend Segments (Current State)

| Segment | Count | Notes |
|---------|-------|-------|
| Main Audience | 2,965 | ✅ Use for all broadcasts |
| Brand Blueprint Freebie | ~892 | Freebie downloaders |
| Paid users | 93 | ⚠️ MIXED: one-time + beta + Studio members |
| Beta Customers | 73 | Old beta pricing (€47/€79/€99) |
| Cold Users | 0 | Empty — pending cleanup |

**Queued cleanup (Tasks 15-17):** Split 93 paid users → 3 segments: `paid-one-time`, `paid-beta`, `paid-studio-active`. Low priority, after Agent V1 W2-C.

---

## Pricing & Products

| Product | Price | Status | Notes |
|---------|-------|--------|-------|
| Studio membership | €97/mo | ✅ Active | Cancel anytime |
| Feed Planner | See blueprint | ✅ Active | `paid_blueprint` type |
| Mini-products (4) | DEACTIVATED | ❌ | Prices set active=false. Become free workbooks in Academy |
| Website Agent V1 | €27/mo | 🔒 Planned | Standalone, not bundled |

**Mini-product price IDs (deactivated — do not reactivate):**
- What To Say: `price_1T2xljEVJvME7vkwFcaN1GEw`
- Show Up: `price_1T2xllEVJvME7vkwHC3r6GAI`
- Get Paid: `price_1T2xlmEVJvME7vkwkbgotHoB`
- AI Photo Prompts: `price_1T3aR3EVJvME7vkw6pzbZS9m`

---

## Email History

- Studio membership has **NEVER** had a dedicated broadcast before Feb 28, 2026
- Feb 28, 2026: First Studio membership email sent — Broadcast ID `8cacda39-7495-47a6-8505-c6985df7eaeb`
- Feb 28, 2026: Recovery emails sent to 9 members with failed payments
- Mar 02, 2026: SEQ-01 Freebie Nurture approved (5 emails, Day 2/5/9/14/20) — saved `~/stella/drafts/SEQ-FREEBIE-NURTURE-APPROVED-2026-03-02.md` — north-email activating in Resend (upsell fix shipped, no more hold)
- **Always send to Main Audience** (2,965) for full-list broadcasts — NOT smaller segments

---

## Sandra's Preferences

- **Voice:** Text a close friend. Warm, honest, short sentences. Contractions always.
- **Design:** Scandinavian luxury. 5 colors only (#0a0a0a, #ffffff, #f5f5f5, #666666, #e5e5e5). Cormorant Garamond + Inter.
- **Never say:** leverage, synergy, transform, game-changer, skyrocket, unlock your potential
- **Images:** Always Sandra's own. Never stock photos. Ask Sandra for images.
- **Approvals:** Sandra must approve ALL copy before sending. No autonomous sends.
- **Agent guidance:** Claude validates all agent plans before North executes. Catch drift early.

→ Full brand guide: `docs/brand/VOICE_BIBLE.md`, `docs/brand/DO_DONT.md`
→ Skills: `sselfie-voice`, `scandinavian-design`, `instagram-strategy`, `tiktok-strategy`

---

## Protocol: How Claude Guides North

1. **Check North's task queue** (`~/stella/NORTH_TASK_QUEUE.md`) before adding new tasks
2. **Keep messages to North under 100 words** — long replies cause timeouts
3. **Validate numbers** — North has made counting errors before (check against known constants above)
4. **Corrections go via terminal** — don't let wrong info propagate to SHARED_MEMORY.md
5. **Sandra approves strategy** — Claude and North execute, Sandra decides direction
6. **Before any broadcast email:** confirm audience ID, confirm copy is approved, confirm image is hosted

→ Deep context: `memory/context/openclaw-protocol.md`
→ Agent details: `memory/context/agents.md`
