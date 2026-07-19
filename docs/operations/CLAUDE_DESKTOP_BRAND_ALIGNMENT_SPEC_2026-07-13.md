# Claude Desktop Agent Alignment Contract

Status: **CURRENT LOCAL-SYNC CONTRACT**

Updated: 2026-07-19

Owner: Sandra with Claude Desktop and Codex

This contract keeps Claude's local skills and scheduled drafting tasks aligned with the tracked
SSELFIE authorities. It does not create an automation and it does not authorize a send.

## Current authorities

Use live pointers. Do not copy the Constitution into another file.

1. `/Users/MD760HA/ACTIVE/sselfie-9g/docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
2. `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`
3. `docs/business/SANDRA_AI_TEAM_BRAIN_PACK_2026-07-16.md`
4. `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
5. `docs/brand/SANDRA_VOICE_OS_2026-07-16.md`

Load only the additional product, channel, customer, or evidence source needed for the work.

## Behavior contract

- Claude may think broadly, challenge a current plan, explore a new idea, and recommend one path.
- `Read-only` means no external or live mutation. It does not forbid specific drafts or useful
  recommendations.
- `No new products` means no silent build, price, publish, or launch. It does not forbid exploration.
- Use Sandra's voice naturally. Normal replies do not require a scorecard or formal evidence brief.
- Verify consequential claims. Never invent proof, relationship context, price, deadline, scarcity,
  product behavior, or results.
- Do not send a customer email, publish content, post a Story, charge money, deploy code, or change
  production data without the required authorization.
- Keep every outward-facing result as a draft for Sandra.
- Do not create another scheduled task unless Sandra explicitly requests it.

## Tracked templates and local destinations

Claude's working `.claude/` folder is local and ignored by Git. The tracked templates are canonical.

### Scheduled drafts

- `.agents/claude-templates/scheduled-tasks/daily-email-draft/SKILL.md`
  -> `~/.claude/scheduled-tasks/daily-email-draft/SKILL.md`
- `.agents/claude-templates/scheduled-tasks/daily-story-sequence-draft/SKILL.md`
  -> `~/.claude/scheduled-tasks/daily-story-sequence-draft/SKILL.md`
- `.agents/claude-templates/scheduled-tasks/weekly-content-brief-draft/SKILL.md`
  -> `~/.claude/scheduled-tasks/weekly-content-brief-draft/SKILL.md`

### Claude skills

- `sselfie-brand`
- `prompt-my-selfie`
- `sselfie-stories`
- `sselfie-community-manager`
- `sselfie-optimizer`
- `sselfie-tracker`
- `funnel-expert`
- `resend-broadcast`

Each tracked directory under `.agents/claude-templates/skills/` mirrors to the same name under
`~/.claude/skills/`.

### Claude agents

- `.agents/claude-templates/agents/revenue-campaign-director.md`
  -> `.claude/agents/revenue-campaign-director.md`

## Current scheduled-task inventory

Three ongoing drafting tasks are canonical:

- `daily-email-draft`
- `daily-story-sequence-draft`
- `weekly-content-brief-draft`

One temporary attended monitor, `partnership-reply-watch`, exists locally from 2026-07-17 through
2026-07-21. It brings the current on-disk count to four during that window and must expire after its
final run. It is not copied into the repository because it contains private conversation
identifiers. Do not turn it into a permanent fourth task.

## Verification

Run:

```bash
pnpm sync:grounding
pnpm check:voice
pnpm audit:context-drift
pnpm exec vitest run tests/brand-constitution-agent-alignment.test.ts tests/content-grounding.test.ts tests/agent-operating-contract-alignment.test.ts
```

Confirm that:

- every tracked template matches its local working copy;
- generated grounding is in sync;
- the three ongoing tasks remain and the temporary fourth task has the correct expiry;
- no customer send, post, charge, deploy, production change, or new automation occurred.

## Completion proof

Report the files changed, checks run, current scheduled-task count, temporary expiry if applicable,
and anything that still needs Sandra's outward approval. A detailed score table is optional and
should be used only when it makes a real decision easier.
