# AI Operations Execution Board (Brand Engine Monetization + Reliability)

## Window

- Start: 2026-02-13
- End: 2026-02-26 (14-day execution cycle)
- Final decision authority: Sandra
- Implementation lane: Codex
- Strategy/offer/design lane: Claude app
- Orchestration lane: Stella-Ops (Clawdbot production profile)
- Sandbox lane: North-Lab (experiments only, no production writes)

## Mission for this cycle

1. Generate cash quickly through Brand Engine launch execution.
2. Protect product reliability while launch volume increases.
3. Lock an operating model where agents assist but do not create governance risk.
4. Capture brand voice consistency from Sandra's `MyNotes` into reusable agent rules.

## Success criteria (must be true by day 14)

1. Cash outcome:
   - At least one paid Brand Engine offer live (cohort and/or VIP).
   - Daily revenue tracking visible in admin and automation outputs.
2. Reliability outcome:
   - Cron success >= 98% over rolling 7 days.
   - Email campaign failures < 2% for active sends.
3. Data trust outcome:
   - Key admin dashboard metrics are within 3% of source of truth (Stripe + DB).
4. Agent governance outcome:
   - Stella-Ops and North-Lab are clearly separated with documented permissions.
5. Voice system outcome:
   - `MyNotes` voice/style signals are codified into a usable agent style system with QA gates.

## Strategy lanes (what we execute)

### Lane A: Monetization Engine (cash-first)

1. Offer architecture (cohort + VIP + continuity path).
2. Lead capture and qualification flow.
3. Checkout and onboarding automation.
4. Launch reporting: applications, calls booked, close rate, cash collected.

### Lane B: Reliability + Data Trust (do not break live app)

1. Generation reconciliation and stuck job control.
2. Email queue stability and failure reduction.
3. Billing linkage integrity and dashboard accuracy.
4. Incident triage with daily decision-ready summaries.

### Lane C: Brand Voice Intelligence

1. Ingest `MyNotes` and identify canonical voice/style rules.
2. Build brand voice rulebook and approved examples library.
3. Add QA scoring gate before publish/send actions.
4. Start in draft-and-approve mode before autonomous sending.

## Day-by-day plan

| Day | Date | Focus | Owner | Exit criteria |
| --- | --- | --- | --- | --- |
| 1 | 2026-02-13 | Baseline + launch architecture lock | Codex + Sandra | Offer structure, KPIs, and top priorities approved |
| 2 | 2026-02-14 | `MyNotes` intake + voice system mapping | Sandra + Codex + Claude | Intake complete and canonical voice profile drafted |
| 3 | 2026-02-15 | Lead pipeline implementation | Codex | Lead intake + tagging + tracking data path live |
| 4 | 2026-02-16 | Qualification and follow-up automations | Codex + Stella-Ops | Auto-priority queue and follow-up cadence live |
| 5 | 2026-02-17 | Checkout + onboarding automation | Codex | Cohort/VIP checkout and onboarding flow verified |
| 6 | 2026-02-18 | Reliability hardening pass A | Codex | No new P1 cron/email incidents in 24h |
| 7 | 2026-02-19 | Launch content assembly + QA gates | Claude + Codex | Voice QA rubric active and content in approved draft set |
| 8 | 2026-02-20 | Soft launch (warm audience + list) | Sandra + Stella-Ops | First launch wave executed with tracking |
| 9 | 2026-02-21 | Conversion optimization pass 1 | Codex + Claude | Funnel dropoff diagnosis and 1 fix shipped |
| 10 | 2026-02-22 | Reliability hardening pass B | Codex | Metrics trust check within 3% variance |
| 11 | 2026-02-23 | Command center consolidation | Codex | One dashboard workflow for launch + reliability |
| 12 | 2026-02-24 | Dry-run day (agent + human operations) | All | No unresolved P1 incident > 4h |
| 13 | 2026-02-25 | Documentation + handoff | Codex | Runbooks and owner matrix complete |
| 14 | 2026-02-26 | Executive review + next cycle decisions | Sandra | Keep/Kill/Scale decisions made |

## Responsibility matrix

| Domain | Sandra | Codex | Claude | Stella-Ops | North-Lab |
| --- | --- | --- | --- | --- | --- |
| Offer/pricing final decisions | A | C | R | I | I |
| Product code changes | I | A/R | I | I | X |
| Launch copy drafts | A | C | R | I | I |
| Automation scheduling/monitoring | I | C | I | A/R | I |
| Reliability triage and fixes | I | A/R | I | C | X |
| Voice/style source-of-truth approval | A/R | C | C | I | I |

Legend: A = Accountable, R = Responsible, C = Consulted, I = Informed, X = Not allowed

## Rules to avoid gaps and over-engineering

1. Max three active priorities at a time.
2. No broad refactor unless Sandra explicitly requests it.
3. Every change must include:
   - objective,
   - owner,
   - KPI,
   - rollback path,
   - evidence file path.
4. High-impact outbound actions remain approval-gated until quality is proven.
5. Lab agent (North-Lab) never writes to production systems.

## Cadence and checkpoints

1. 09:00 Europe/Oslo:
   - Stella-Ops morning brief (`top 3 priorities`, `risks`, `required Sandra decisions`).
2. 12:00 Europe/Oslo:
   - Sandra decision checkpoint (`approve`, `defer`, or `reject`).
3. 17:00 Europe/Oslo:
   - End-of-day review (`done`, `blocked`, `tomorrow plan`).

## Tracking system location

- Master tracker: `docs/AI_PROGRESS_TRACKER.md`
- Voice/style intake: `docs/MYNOTES_VOICE_STYLE_INTAKE.md`
- Daily evidence logs: `output/automation/*.md`

## Immediate prerequisite from Sandra

Complete the `MyNotes` intake checklist so agents can align to your true voice before copy automation is enabled.
