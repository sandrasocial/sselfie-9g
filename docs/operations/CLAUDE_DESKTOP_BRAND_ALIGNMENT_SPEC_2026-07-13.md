# Claude Desktop Brand Alignment Spec

Status: One-time attended Claude Desktop maintenance. Not a Codex task. Not a new automation.

Owner: Sandra with Claude Desktop

Run this inside Claude Desktop from `/Users/MD760HA/ACTIVE/sselfie-9g` after the Codex brand release is on `main`.

## Mission

Make every Claude skill, memory, and existing scheduled drafting task load the same live brand law from:

`/Users/MD760HA/ACTIVE/sselfie-9g/docs/brand/SSELFIE_BRAND_CONSTITUTION.md`

Do not copy the Constitution into another file. Use pointers so the repo remains the one source of truth.

Repo-local `.claude/` files are intentionally ignored by Git. Install the tracked templates from `.agents/claude-templates/` into Claude's local working folder. Do not recreate them from memory.

## Safety rules

- Do not send a customer email, publish content, post a Story, charge money, deploy code, or change production data.
- Do not create another scheduled task.
- Keep every outward-facing result as a draft for Sandra.
- Keep exactly the three existing scheduled Cowork tasks.
- If `CLAUDE.md` names an active attended campaign, that campaign owns today's selling message. Do not rotate in a competing offer.

## Work to complete

1. Inventory only these existing scheduled tasks:
   - `daily-email-draft`
   - `daily-story-sequence-draft`
   - `weekly-content-brief-draft`
2. Put the absolute Constitution path first in all three task instructions.
3. Remove the broken `.agents/skills/sselfie-email/SKILL.md` reference from `daily-email-draft`. Point to the live Constitution, detailed voice source, and current email implementation instead.
4. Add campaign precedence to all three tasks: when an active event owns today's selling message, use that event or stop with `active campaign owns today's selling message`.
5. Rewrite `~/.claude/skills/sselfie-brand/SKILL.md` as a small live pointer. Remove old self-contained facts, metrics, prices, routes, children count, audience ages, products, and funnel state.
6. Add the Constitution as the first preflight pointer in:
   - `prompt-my-selfie`
   - `sselfie-stories`
   - `sselfie-community-manager`
   - `sselfie-optimizer`
   - `sselfie-tracker`
7. Add one Claude memory that points to the Constitution. Do not paste its contents into memory.
8. Mark `identity-first-doctrine.md`, `content-grounding-2026-06.md`, and the old Claude-skills authority memory as historical wherever they claim to control current brand law.
9. Update Claude's automation inventory descriptions. The scheduled-task count must remain three.
10. Dry-run `daily-email-draft`, `daily-story-sequence-draft`, and `weekly-content-brief-draft` without sending to customers.
11. Mirror these tracked templates exactly into the local Claude working paths:
   - `.agents/claude-templates/agents/revenue-campaign-director.md` -> `.claude/agents/revenue-campaign-director.md`
   - `.agents/claude-templates/skills/funnel-expert/SKILL.md` -> `.claude/skills/funnel-expert/SKILL.md`
   - `.agents/claude-templates/skills/funnel-expert.md` -> `.claude/skills/funnel-expert.md`
   - `.agents/claude-templates/skills/resend-broadcast/SKILL.md` -> `.claude/skills/resend-broadcast/SKILL.md`
12. Remove any cached customer count from `.claude/settings.json`. Keep its secret-protection hook generic and never commit this local settings file.
13. Load the local repo specialist at `.claude/agents/revenue-campaign-director.md` for future attended campaign audits. It remains read-only and research-first.
14. For the current One Selfie event, use the campaign director once and prepare one founder-only 48-hour Story briefing through the existing Sandra-preview path. Do not build a campaign scheduler.

## Verification

Run:

```bash
rg -n '180K|25.?45|\$27|Identity is the destination|Visibility is the transformation|self-contained.*no repo|\.agents/skills/sselfie-email' \
  ~/.claude/skills/sselfie-* ~/.claude/scheduled-tasks .agents/product-marketing-context.md

pnpm sync:grounding
pnpm check:voice
pnpm audit:context-drift
pnpm exec vitest run tests/brand-constitution-agent-alignment.test.ts tests/content-grounding.test.ts
```

The first command must have no active-authority hits. The four tracked Claude templates must match their local working copies exactly. `pnpm sync:grounding` must leave no diff. There must still be exactly three scheduled Cowork tasks and zero new business automations.

## Completion proof

Return this table to Sandra:

| Artifact | Exact path | Stale risk removed | Constitution loaded | Dry-run result |
|---|---|---|---|---|

Also state:

- the final scheduled-task count;
- every global skill changed;
- every historical memory demoted;
- confirmation that no customer send, post, charge, deploy, or new automation occurred;
- any item Claude could not verify.
